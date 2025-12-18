import logging
from services.llm import LLMService

from sqlalchemy.orm import Session
from sqlalchemy import text

class SQLAgentService:
    def __init__(self, db: Session):
        self.db = db
        self.llm = LLMService()
        self.logger = logging.getLogger("SQLAgentService")
        self.schema_context = """
        Tables:
        1. videos (
            video_id STRING,
            channel_id STRING, 
            title STRING, 
            description STRING, 
            published_at TIMESTAMP, 
            audio_path String,
            downloaded BOOLEAN,
            transcribed BOOLEAN,
            duration INTEGER (seconds)
        )
        2. channels (
            id INTEGER,
            name String,
            url String,
            createad_at TIMESTAMP
        )

        3. chat_sessions (
            id UUID,
            createad_at TIMESTAMP
        )

        4. chat_messages (
            id INTEGER,
            sessions_id UUID FK,
            role TEXT,
            content TEXT,
            createad_at TIMESTAMP
        )
        """

    def handle(self, question: str) -> str:
        """Generates SQL, executes it, and summarizes the result."""
        
        # 1. Generate SQL
        sql_query = self._generate_sql(question)
        self.logger.info(f"Generated SQL: {sql_query}")

        # 2. Execute SQL
        try:
            # Safety: Ensure query is a SELECT
            if not sql_query.strip().upper().startswith("SELECT"):
                return "I can only perform read operations (SELECT)."

            result_proxy = self.db.execute(text(sql_query))
            rows = result_proxy.fetchall()
            
            # Get column names
            columns = result_proxy.keys()
            
            # Convert to list of dicts for the LLM to read easily
            data = [dict(zip(columns, row)) for row in rows]
            
            # 3. Summarize Answer
            return self._summarize_results(question, data)

        except Exception as e:
            self.logger.error(f"SQL execution failed: {e}")
            return f"I tried to query the database, but an error occurred: {e}"
        finally:
            self.db.close()

    def _generate_sql(self, question: str) -> str:
        prompt = f"""
        You are a SQL expert. 
        Convert the user's question into a SQL query based on the schema below.
        
        Rules:
        - Return ONLY the raw SQL query. No markdown, no explanation.
        - Use SQLite syntax (or PostgreSQL if that's your DB).
        - Only SELECT statements allowed.
        
        Schema:
        {self.schema_context}

        Question: {question}
        SQL:
        """
        response = self.llm.generate(prompt)
        clean_sql = response.replace("```sql", "").replace("```", "").strip()
        return clean_sql

    def _summarize_results(self, question: str, data: list) -> str:
        if not data:
            return "The database query returned no results."

        # If data is massive, truncate it to avoid hitting token limits
        data_str = str(data[:50]) 
        if len(data) > 50:
            data_str += f"... (and {len(data) - 50} more items)"

        prompt = f"""
        User Question: {question}
        Database Results: {data_str}

        Answer the user's question naturally based on the results above. 
        If it's a list, format it nicely.
        """
        return self.llm.generate(prompt)
