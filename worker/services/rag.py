from typing import List, Optional
from uuid import UUID

from sqlalchemy.orm import Session

from services.sql_agent import SQLAgentService
from core.config import settings
from core.logging import logger
from shared.db.repositories.chat import ChatSessionRepository, ChatMessageRepository
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
        context_blocks.append(
            f"[Context {i} | {ch['video_id']} | {ch['start']:.1f}s–{ch['end']:.1f}s]\n"
            f"{ch['text'].strip()}"
        )

    context = "\n\n".join(context_blocks)

    return f"""
You are an assistant answering questions strictly using the provided context.

Rules:
- Use ONLY the information present in the context.
- Do NOT introduce external knowledge.
- If something is not stated in the context, say so explicitly.
- Provide detailed, comprehensive explanations.

Context from this conversation:
{chat_block}

Context from videos:
{context}

Question:
{question}

Answer:
"""


class RAGService:
    def __init__(self, db: Session):
        self.db = db
        self.sql_agent = SQLAgentService(db)
        self.session_repo = ChatSessionRepository(db)
        self.message_repo = ChatMessageRepository(db)

    def ask(
        self,
        question: str,
        session_id: Optional[UUID] = None,
        *,
        top_k: int = 8,
    ) -> dict:
        # Get or create session
        session = self.session_repo.get_or_create(
            question, str(session_id) if session_id else None
        )

        # Check intent
        intent = self._classify_intent(question)

        if intent == "METADATA":
            logger.info("Routing to SQL Agent...")
            answer = self._handle_metadata_query(question)
            sources = []
        else:
            # Get chat context
            chat_context = self.session_repo.get_recent_context(session.id)

            # Retrieve relevant chunks
            chunks = retriever_service.search_hybrid(
                self.db,
                question,
                top_k=top_k,
                vector_weight=settings.rag_vector_weight,
                text_weight=settings.rag_text_weight,
            )

            if not chunks:
                answer = "I couldn't find any relevant information in the video database."
                sources = []
            else:
                prompt = build_prompt(question, chunks, chat_context)
                answer = llm_service.generate(prompt)

                sources = [
                    {
                        "video_id": ch["video_id"],
                        "start": ch["start"],
                        "end": ch["end"],
                        "url": youtube_timestamp_url(ch["video_id"], ch["start"]),
                        "score": ch["score"],
                    }
                    for ch in chunks
                ]

        # Save messages
        self.message_repo.add_message(session.id, "user", question)
        self.message_repo.add_message(session.id, "assistant", answer, sources)

        return {
            "answer": answer,
            "sources": sources,
            "session_id": session.id,
        }

    def _classify_intent(self, question: str) -> str:
        prompt = f"""
        Classify the following user question into one of two categories:
        
        1. METADATA: Questions about the library itself (e.g., "How many videos?", "List all titles").
        2. CONTENT: Questions about topics discussed in the videos.

        Return ONLY the word METADATA or CONTENT.

        Question: {question}
        Category:
        """
        response = llm_service.generate(prompt).strip().upper()
        return "METADATA" if "METADATA" in response else "CONTENT"

    def _handle_metadata_query(self, question: str) -> str:
        return self.sql_agent.handle(question)
