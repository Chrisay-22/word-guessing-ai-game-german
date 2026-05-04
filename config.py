"""
Configuration management for the German Wordle application.
Loads settings from environment variables with sensible defaults.
"""
import os
from typing import Tuple

# Google Cloud Platform Configuration
GCP_PROJECT_ID = os.environ.get('GCP_PROJECT_ID', 'your-gcp-project-id')
GCP_REGION = os.environ.get('GCP_REGION', 'global')
GCS_BUCKET_NAME = os.environ.get('GCS_BUCKET_NAME', 'your-bucket-name')

# Vertex AI Configuration  
VERTEX_AI_MODEL = os.environ.get('VERTEX_AI_MODEL', 'gemini-2.0-flash-lite-001')

# Game Configuration
WORD_LENGTH_MIN = int(os.environ.get('WORD_LENGTH_MIN', '4'))
WORD_LENGTH_MAX = int(os.environ.get('WORD_LENGTH_MAX', '11'))
WORD_LENGTHS: Tuple[int, int] = (WORD_LENGTH_MIN, WORD_LENGTH_MAX)
MAX_ATTEMPTS = int(os.environ.get('MAX_ATTEMPTS', '6'))

# Application Configuration
TIMEZONE = os.environ.get('TIMEZONE', 'Europe/Berlin')
PORT = int(os.environ.get('PORT', '8080'))
DEBUG = os.environ.get('DEBUG', 'False').lower() == 'true'

# Admin Configuration (uses environment variable for security)
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', '')  # Set this in production

# Leaderboard Cache Configuration
LEADERBOARD_CACHE_TIMEOUT = int(os.environ.get('LEADERBOARD_CACHE_TIMEOUT', '10'))

def validate_config():
    """Validate that required configuration is set."""
    required_vars = {
        'GCP_PROJECT_ID': GCP_PROJECT_ID,
        'GCS_BUCKET_NAME': GCS_BUCKET_NAME,
    }
    
    missing = [key for key, value in required_vars.items() 
               if value.startswith('your-')]
    
    if missing:
        raise ValueError(
            f"Missing required environment variables: {', '.join(missing)}. "
            f"Please set them in your .env file or environment."
        )
