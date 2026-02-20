"""
Configuration settings for WiseBite Backend API
"""
import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    # Application
    APP_NAME = "WiseBite API"
    VERSION = "1.0.0"
    DEBUG = os.getenv("DEBUG", "True") == "True"
    
    # Database
    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./wisebite.db")
    
    # API Keys
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
    ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
    BARCODE_LOOKUP_API_KEY = os.getenv("BARCODE_LOOKUP_API_KEY", "")
    
    # CORS
    CORS_ORIGINS = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8080",
    ]
    
    # AI Models
    RECIPE_MODEL = os.getenv("RECIPE_MODEL", "gpt-4")
    PRODUCE_MODEL = os.getenv("PRODUCE_MODEL", "gpt-4-vision-preview")
    
    # Limits
    MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10MB
    MAX_PANTRY_ITEMS = 1000


settings = Settings()
