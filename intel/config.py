"""Model + client config. Per CLAUDE.md: gpt-5 for growth_advisor only, mini elsewhere."""
import os

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

MINI_MODEL = "gpt-5-mini"  # vision pass + collect/extract/market/analyze/chat
GROWTH_MODEL = "gpt-5"  # growth_advisor node only
EMBEDDING_MODEL = "text-embedding-3-small"  # Chroma RAG index


def client() -> OpenAI:
    return OpenAI(api_key=os.environ["OPENAI_API_KEY"])
