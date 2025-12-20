import time
from typing import List, Literal, Optional
from uuid import UUID

from shared.db.repositories.settings import SettingsRepository
from sqlalchemy.orm import Session
from sqlalchemy import select, text

from db.repositories.chat import ChatSessionRepository, ChatMessageRepository
from shared.db.models import PipelineTask

from services.sql_agent import SQLAgentService
from core.config import settings
from core.logging import logger


from db.repositories.video import VideoRepository
from services.llm import llm_service
from services.retriever import retriever_service


def youtube_timestamp_url(video_id: str, start_seconds: float) -> str:
    return f"https://www.youtube.com/watch?v={video_id}&t={int(start_seconds)}s"


def build_prompt(
    question: str,
    chunks: List[dict],
    chat_context: List,
) -> str:
    chat_block = ""
    if chat_context:
        chat_block = "Conversation so far:\n"
        for msg in chat_context:
            role = "User" if msg.role == "user" else "Assistant"
            chat_block += f"{role}: {msg.content}\n"
        chat_block += "\n"

    context_blocks = []
    for i, ch in enumerate(chunks, start=1):
        block = (
            f"[Context {i} | {ch['video_id']} | "
            f"{ch['start']:.1f}s–{ch['end']:.1f}s]\n"
        )

        if ch.get("summary"):
            block += f"Summary:\n{ch['summary'].strip()}\n\n"

        block += f"Transcript:\n{ch['text'].strip()}"

        context_blocks.append(block)

    context = "\n\n".join(context_blocks)

    return f"""
You are an expert assistant answering questions strictly using the provided video context.

Your goal is to produce answers that are:
- Factually accurate
- Well-structured
- Easy to follow
- Grounded only in the given information

Strict rules:
- Use ONLY the information explicitly present in the context.
- Do NOT introduce external knowledge, assumptions, or general facts.
- If the context does not contain enough information, state this clearly.
- Do NOT merge or confuse information from unrelated fragments.

How to use the context:
- Use the *Summaries* to understand the main idea of each fragment.
- Use the *Transcripts* to extract details, explanations, or exact wording.
- Prefer summaries for high-level reasoning and structure.
- Prefer transcripts for precision and evidence.

Answer structure guidelines:
- Start with a direct, clear answer to the question.
- If the answer is complex, break it into logical sections.
- Use bullet points or numbered lists when appropriate.
- When multiple fragments contribute, synthesize them coherently.
- Avoid redundancy unless it improves clarity.

Conversation context:
{chat_block}

Video context:
{context}

User question:
{question}

Answer:
""".strip()


class RAGService:
    def __init__(self, db: Session):
        self.db           = db
        self.sql_agent    = SQLAgentService(db)
        self.session_repo = ChatSessionRepository(db)
        self.message_repo = ChatMessageRepository(db)
        self.video_repo   = VideoRepository(db)
        self.chat_repo    = ChatSessionRepository(db)
        self.settings     = SettingsRepository(db).get_settings("BACKEND")

    def ask(
        self,
        question: str,
        channel_id: int,
        video_ids: List[str],
        task_id: UUID,
        session_id: Optional[UUID] = None,
        *,
        top_k: int = 8,
    ) -> dict:

        session = self.session_repo.get_or_create(
            question,
            channel_id,
            str(session_id) if session_id else None,
        )

        if video_ids:
            self.chat_repo.upsert_chat_videos(
                chat_id=session.id,
                video_ids=video_ids,
            )

        # Determine intent
        intent = self._classify_intent(question)
        logger.info(f"Intent: {intent}")

        video_ids = self.video_repo.get_chat_video_ids(
            channel_id=channel_id,
            video_ids=video_ids,
        )

        if intent == "METADATA":
            logger.info("Routing to SQL Agent...")
            answer = self._handle_metadata_query(question)
            sources = []

        elif intent == "CONTENT_GLOBAL":
            logger.info("Routing to content global...")
            answer = self.handle_content_global(video_ids=video_ids)
            sources = []

        else:  # CONTENT
            logger.info("Routing to content...")
            query_embedding = self._wait_for_embedding(task_id)

            chat_context = self.session_repo.get_recent_context(session.id)

            chunks = retriever_service.search_hybrid(
                self.db,
                question,
                query_embedding=query_embedding,
                top_k=self.settings["rag_top_k"],
                vector_weight=self.settings["rag_vector_weight"],
                text_weight=self.settings["rag_text_weight"],
                target_index="summary",
                video_ids=video_ids,
            )

            if not chunks:
                answer = "I couldn't find any relevant information in the selected videos."
                sources = []
            else:
                prompt = build_prompt(question, chunks, chat_context)
                answer = llm_service.generate(prompt, system_prompt=prompt, temperature=self.settings["llm_temperature"])
                sources = [ 
                    { 
                        "video_id": ch["video_id"],
                        "start": ch["start"],
                        "end": ch["end"],
                        "url": youtube_timestamp_url(ch["video_id"], ch["start"]), "score": ch["score"], 
                    } 
                    for ch in chunks 
                ]

        # Persist conversation
        self.message_repo.add_message(session.id, "user", question)
        self.message_repo.add_message(session.id, "assistant", answer, sources)

        return {
            "answer": answer,
            "channel_id": channel_id,
            "video_ids": video_ids,
            "sources": sources,
            "session_id": session.id,
        }


    def handle_content_global(
        self,
        video_ids: List[str],
        max_summaries_per_video: int = 20,
    ) -> str:
        rows = self.db.execute(
            text(
                """
                SELECT video_id, chunk_index, summary
                FROM chunks
                WHERE video_id = ANY(:video_ids)
                  AND summary IS NOT NULL
                ORDER BY video_id, chunk_index
                """
            ),
            {"video_ids": video_ids},
        ).fetchall()

        if not rows:
            return (
                "I do not have enough summarized information to extract the main "
                "points from the selected videos."
            )

        summaries = []
        current_video = None
        count = 0

        for r in rows:
            if r.video_id != current_video:
                current_video = r.video_id
                count = 0
                summaries.append(f"\nVideo {r.video_id}:")

            if count < max_summaries_per_video and r.summary.strip():
                summaries.append(f"- {r.summary}")
                count += 1

        summaries_text = "\n".join(summaries)

        prompt = f"""
You are given summarized segments from one or more YouTube videos.

Your task is to identify the main points discussed across the selected videos
and present them as a concise, structured list of bullet points.

Rules:
- Do NOT invent information.
- Base your answer strictly on the provided summaries.
- Group related ideas across videos when appropriate.
- Focus on recurring themes, arguments, and conclusions.

Summaries:
{summaries_text}

Main points:
""".strip()

        return llm_service.generate(prompt).strip()

    def _wait_for_embedding(self, task_id: UUID) -> list[float]:
        timeout = 30
        start_time = time.time()

        while True:
            row = self.db.execute(
                select(PipelineTask.status, PipelineTask.result)
                .where(PipelineTask.id == task_id)
            ).one()

            if row.status == "completed" and row.result:
                return row.result

            if row.status == "failed":
                raise RuntimeError("Embedding task failed in worker.")

            if time.time() - start_time > timeout:
                raise TimeoutError("Timed out waiting for embedding worker.")

            time.sleep(0.2)

    def _classify_intent(self, question: str) -> Literal["METADATA", "CONTENT", "CONTENT_GLOBAL"]:
        prompt = f"""
Classify the following user question into one of the categories:

- METADATA: Questions about the video library itself.
- CONTENT: Questions about specific topics discussed in the videos.
- CONTENT_GLOBAL: Questions asking for summaries, main points, or overviews.

Return ONLY one of: METADATA, CONTENT, CONTENT_GLOBAL.

Question:
{question}

Category:
""".strip()

        response = llm_service.generate(prompt).strip().upper()

        if response in {"METADATA", "CONTENT", "CONTENT_GLOBAL"}:
            return response

        return "CONTENT"

    def _handle_metadata_query(self, question: str) -> str:
        return self.sql_agent.handle(question)

