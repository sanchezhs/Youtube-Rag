from typing import Generator
from openai import OpenAI

from core.config import settings
from core.logging import logger


class LLMService:
    def __init__(self):
        self.client = OpenAI(api_key=settings.openai_api_key)
        self.model = settings.openai_model

    def generate(
        self,
        prompt: str,
        *,
        system_prompt: str = "You are a helpful assistant.",
        temperature: float = 0.2,
    ) -> str:
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt},
                ],
                temperature=temperature,
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"LLM generation failed: {e}")
            raise

    def generate_stream(
        self,
        prompt: str,
        *,
        system_prompt: str = "You are a helpful assistant.",
        temperature: float = 0.2,
    ) -> Generator[str, None, None]:
        try:
            stream = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt},
                ],
                temperature=temperature,
                stream=True,
            )
            
            for chunk in stream:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content

        except Exception as e:
            logger.error(f"LLM streaming failed: {e}")
            yield " [Error generating response]"


llm_service = LLMService()
