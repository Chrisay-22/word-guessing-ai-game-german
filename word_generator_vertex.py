"""
Word Generator and Validation Module using Vertex AI.
Handles daily word generation, validation, scoring, and leaderboard management.
"""
from typing import Tuple
import re
import json
import time
import os
from datetime import datetime
import pytz
from google.cloud import storage
import vertexai
from vertexai.generative_models import GenerativeModel

# Import configuration
from config import (
    GCP_PROJECT_ID,
    GCP_REGION,
    GCS_BUCKET_NAME,
    VERTEX_AI_MODEL,
    TIMEZONE,
    MAX_ATTEMPTS
)

# Global model instance
model = None


def init_vertexai():
    """Initialize Vertex AI and model."""
    global model
    vertexai.init(project=GCP_PROJECT_ID, location=GCP_REGION)
    model = GenerativeModel(VERTEX_AI_MODEL)
    print(f"✅ Initialized Vertex AI with model {VERTEX_AI_MODEL}")


def get_stored_word(date_str: str) -> Tuple[str, bool]:
    """Try to get the stored word for the given date."""
    storage_client = storage.Client()
    bucket = storage_client.bucket(GCS_BUCKET_NAME)
    blob = bucket.blob(f'words/{date_str}.txt')
    try:
        word = blob.download_as_text().strip()
        return word, True
    except Exception:
        return None, False


def was_word_used_before(word: str) -> bool:
    """Check if the word was used in any previous game."""
    storage_client = storage.Client()
    bucket = storage_client.bucket(GCS_BUCKET_NAME)
    blobs = bucket.list_blobs(prefix='words/')
    
    for blob in blobs:
        try:
            if blob.name.endswith('.txt') and '/' in blob.name:
                stored_word = blob.download_as_text().strip()
                if stored_word.lower() == word.lower():
                    return True
        except Exception:
            continue
    
    return False


def store_word(date_str: str, word: str):
    """Store the word for the given date with atomic race condition protection."""
    storage_client = storage.Client()
    bucket = storage_client.bucket(GCS_BUCKET_NAME)
    blob = bucket.blob(f'words/{date_str}.txt')
    
    max_retries = 3
    for attempt in range(max_retries):
        try:
            # CRITICAL: Use if_generation_match=0 to ensure atomic creation
            blob.upload_from_string(word, if_generation_match=0)
            print(f"✅ Successfully stored word '{word}' for {date_str} atomically")
            add_word_to_used_list(word)
            return
            
        except Exception as e:
            if "precondition" in str(e).lower() or "generation" in str(e).lower():
                print(f"🔄 Word file already exists for {date_str}")
                try:
                    existing_word, exists = get_stored_word(date_str)
                    if exists:
                        print(f"✅ Using existing word for {date_str}: {existing_word}")
                        return
                except Exception:
                    pass
            
            print(f"❌ Failed to store word (attempt {attempt + 1}): {e}")
            if attempt == max_retries - 1:
                raise Exception(f"Could not store word after {max_retries} attempts: {e}")
            time.sleep(1)


def generate_word(date_str: str, length: int = None) -> Tuple[str, bool]:
    """Generate a new word using the LLM with specified or random length."""
    global model
    if model is None:
        init_vertexai()
    
    # Generate random word length if not specified
    if length is None:
        import random
        from config import WORD_LENGTHS
        length = random.randint(WORD_LENGTHS[0], WORD_LENGTHS[1])
    
    used_words = get_used_words()
    used_words_text = ""
    if used_words:
        used_words_text = f"""

Das Wort, das du generierst, DARF KEINESFALLS eines dieser Wörter sein:
{', '.join(used_words[-100:]).upper()}  # Last 100 to avoid token limits

WICHTIG: Generiere KEINESFALLS ein Wort aus der obigen Liste!"""
    
    prompt = f"""Du bist ein Experte für deutsche Rechtschreibung und Wortschatz.

Generiere ein deutsches Wort für Wordle mit EXAKT {length} Buchstaben.{used_words_text}

STRENGE ANFORDERUNGEN:
1. EXAKT {length} Buchstaben (nicht mehr, nicht weniger)
2. Muss korrekt im DUDEN stehen (aktuelle deutsche Rechtschreibung)
3. Kein Eigenname (z.B. nicht "Berlin", "Maria")
4. Keine Abkürzung (z.B. nicht "bzw", "etc")
5. Keine Fremdwörter aus anderen Sprachen
6. Keine veralteten oder dialektalen Wörter
7. Keine Pluralformen (nur Grundform/Singular)
8. Keine konjugierten Verben (nur Infinitiv)
9. Ein alltägliches, bekanntes deutsches Wort
10. Korrekte deutsche Rechtschreibung - keine Tippfehler!

Antworte NUR mit dem korrekten deutschen Wort in Kleinbuchstaben."""
    
    max_attempts = 8
    for attempt in range(max_attempts):
        response = model.generate_content(
            prompt,
            generation_config={
                "temperature": 0.3,
                "max_output_tokens": 10
            }
        )
        
        word = response.text.strip().lower()
        word = word.split('\n')[0].strip()
        word = re.sub(r'[^a-zA-ZäöüßÄÖÜ]', '', word)
        
        valid_chars = (
            word.replace('ä', 'a').replace('ö', 'o')
            .replace('ü', 'u').replace('ß', 's').isalpha()
        )
        
        if len(word) == length and valid_chars:
            if word.lower() not in [w.lower() for w in used_words]:
                if validate_word(word, length):
                    if not was_word_used_before(word):
                        return word, True
    
    raise Exception(f"Failed to generate unique, valid word for {date_str}")


def get_word_and_validate(date_str: str) -> Tuple[str, bool]:
    """Get or generate a word for the given date with retry logic."""
    word, exists = get_stored_word(date_str)
    if exists:
        return word, True
    
    max_retries = 3
    for attempt in range(max_retries):
        try:
            word, success = generate_word(date_str)
            if success:
                store_word(date_str, word)
                stored_word, stored_exists = get_stored_word(date_str)
                if not stored_exists or stored_word.lower() != word.lower():
                    raise Exception(f"Word storage verification failed")
                return word, True
        except Exception as e:
            print(f"❌ Error in get_word_and_validate (attempt {attempt + 1}): {e}")
            if attempt < max_retries - 1:
                time.sleep(2)
    
    return None, False


def generate_daily_word_for_date(date_str: str) -> str:
    """Generate a daily word for a specific date."""
    word, success = get_word_and_validate(date_str)
    if success:
        return word
    raise Exception(f"Failed to generate daily word for {date_str}")


def validate_word(word: str, length: int) -> bool:
    """Validate if a word is a valid German word using Vertex AI."""
    try:
        global model
        if model is None:
            init_vertexai()
        
        forced_words = get_forced_words()
        forced_words_examples = ""
        if forced_words:
            relevant_forced_words = [w for w in forced_words if len(w) == length]
            if relevant_forced_words:
                forced_words_examples = f"""

WICHTIGE PRÄZEDENZFÄLLE - Diese Wörter wurden bereits als KORREKT validiert:
{', '.join(relevant_forced_words[:20]).upper()}  # Limit to avoid token overuse

DIESE WÖRTER SIND DEFINITIV GÜLTIG!"""
        
        prompt = f"""Du bist ein Experte für deutsche Rechtschreibung und den DUDEN.

AUFGABE: Prüfe ob '{word.upper()}' ein gültiges deutsches Wort für Wordle ist.{forced_words_examples}

Zu prüfendes Wort: '{word.upper()}'

AKZEPTANZ-KRITERIEN:
1. Korrekte deutsche Rechtschreibung (steht so im DUDEN)
2. Exakt {length} Buchstaben
3. Deutsches Wort im deutschen Sprachgebrauch
4. Grundform (nicht konjugiert, nicht Plural)

AKZEPTIERE häufige deutsche Wörter:
- Berufe: Pilot, Bauer, Koch, Arzt
- Gegenstände: Audio, Radio, Piano, Video
- Alltägliche Begriffe: Sport, Auto, Hotel, Park

ABLEHNEN nur bei:
- Tippfehlern (z.B. "erwiedern" statt "erwidern")
- Eindeutigen Pluralformen (z.B. "Häuser")
- Konjugierten Verben (z.B. "lief" statt "laufen")
- Eigennamen (z.B. "Peter", "Berlin")

Ist '{word.upper()}' korrekt und gültig?

Antworte nur mit 'JA' oder 'NEIN'."""
        
        response = model.generate_content(
            prompt,
            generation_config={
                "temperature": 0.0,
                "max_output_tokens": 5
            }
        )
        
        answer = response.text.strip().upper()
        return answer == 'JA'
        
    except Exception as e:
        print(f"Error validating word: {e}")
        return False


def calculate_score(attempts: int) -> int:
    """Calculate score based on number of attempts."""
    score_map = {1: 6, 2: 5, 3: 4, 4: 3, 5: 2, 6: 1}
    return score_map.get(attempts, 0)


def store_score(date_str: str, username: str, attempts: int, won: bool, detailed_attempts: list = None):
    """Store a player's score for the day with detailed attempts."""
    if not won:
        attempts = MAX_ATTEMPTS + 1
    
    score = calculate_score(attempts)
    storage_client = storage.Client()
    bucket = storage_client.bucket(GCS_BUCKET_NAME)
    
    existing_blobs = list(bucket.list_blobs(prefix=f'scores/{date_str}/{username}_'))
    if existing_blobs:
        print(f"Score already exists for {username} on {date_str}")
        return
    
    timestamp = int(time.time() * 1000)
    blob = bucket.blob(f'scores/{date_str}/{username}_{timestamp}.txt')
    
    detailed_data = json.dumps(detailed_attempts) if detailed_attempts else "[]"
    score_data = f"{username},{attempts},{score},{won},{timestamp},{detailed_data}"
    blob.upload_from_string(score_data)
    print(f"✅ Stored score for {username}: {score} points")


def get_daily_leaderboard(date_str: str) -> list:
    """Get the leaderboard for a specific date."""
    storage_client = storage.Client()
    bucket = storage_client.bucket(GCS_BUCKET_NAME)
    
    leaderboard = []
    username_scores = {}
    
    blobs = bucket.list_blobs(prefix=f'scores/{date_str}/')
    
    for blob in blobs:
        try:
            data = blob.download_as_text().strip()
            parts = data.split(',')
            
            if len(parts) >= 5:
                username, attempts, score, won, timestamp = parts[:5]
                timestamp = int(timestamp)
                
                detailed_attempts = []
                if len(parts) >= 6:
                    try:
                        detailed_attempts = json.loads(','.join(parts[5:]))
                    except (json.JSONDecodeError, ValueError):
                        pass
                
                entry = {
                    'username': username,
                    'attempts': int(attempts),
                    'score': int(score),
                    'won': won.lower() == 'true',
                    'timestamp': timestamp,
                    'detailed_attempts': detailed_attempts
                }
                
                # Keep worst score per username
                if username not in username_scores or (
                    entry['score'] < username_scores[username]['score'] or
                    (entry['score'] == username_scores[username]['score'] and
                     entry['timestamp'] > username_scores[username]['timestamp'])
                ):
                    username_scores[username] = entry
        except Exception as e:
            print(f"Error parsing score: {e}")
            continue
    
    leaderboard = list(username_scores.values())
    leaderboard.sort(key=lambda x: (-x['score'], x['attempts'], x['timestamp']))
    return leaderboard


def store_forced_word(word: str):
    """Store a word that was forced/approved by user override."""
    try:
        storage_client = storage.Client()
        bucket = storage_client.bucket(GCS_BUCKET_NAME)
        
        forced_words = get_forced_words()
        word_lower = word.lower().strip()
        
        if word_lower not in forced_words:
            forced_words.append(word_lower)
            blob = bucket.blob('forced_words.json')
            blob.upload_from_string(json.dumps(forced_words, ensure_ascii=False))
            print(f"✅ Stored forced word: {word_lower}")
    except Exception as e:
        print(f"Error storing forced word: {e}")


def get_forced_words():
    """Get list of previously forced/approved words."""
    try:
        storage_client = storage.Client()
        bucket = storage_client.bucket(GCS_BUCKET_NAME)
        blob = bucket.blob('forced_words.json')
        
        if blob.exists():
            data = blob.download_as_text()
            return json.loads(data)
        return []
    except Exception as e:
        print(f"Error getting forced words: {e}")
        return []


def get_used_words():
    """Get list of previously used words from GCS bucket."""
    try:
        storage_client = storage.Client()
        bucket = storage_client.bucket(GCS_BUCKET_NAME)
        blob = bucket.blob('used_words.json')
        
        if blob.exists():
            data_text = blob.download_as_text()
            data = json.loads(data_text)
            return data.get('words', [])
        else:
            tz = pytz.timezone(TIMEZONE)
            used_words_data = {
                "description": "List of words that have already been used",
                "created_at": datetime.now(tz).isoformat(),
                "total_words": 0,
                "words": []
            }
            blob.upload_from_string(json.dumps(used_words_data, ensure_ascii=False, indent=2))
            return []
    except Exception as e:
        print(f"Error loading used words: {e}")
        return []


def add_word_to_used_list(word: str):
    """Add a new word to the used_words.json file with race condition protection."""
    max_retries = 5
    for attempt in range(max_retries):
        try:
            storage_client = storage.Client()
            bucket = storage_client.bucket(GCS_BUCKET_NAME)
            blob = bucket.blob('used_words.json')
            
            current_generation = None
            
            try:
                if blob.exists():
                    blob.reload()
                    current_generation = blob.generation
                    data = json.loads(blob.download_as_text())
                else:
                    tz = pytz.timezone(TIMEZONE)
                    data = {
                        "description": "List of words that have already been used",
                        "created_at": datetime.now(tz).isoformat(),
                        "total_words": 0,
                        "words": []
                    }
            except Exception:
                tz = pytz.timezone(TIMEZONE)
                data = {
                    "description": "List of words that have already been used",
                    "created_at": datetime.now(tz).isoformat(),
                    "total_words": 0,
                    "words": []
                }
            
            word_lower = word.lower().strip()
            if word_lower not in data['words']:
                data['words'].append(word_lower)
                data['words'].sort()
                data['total_words'] = len(data['words'])
                tz = pytz.timezone(TIMEZONE)
                data['last_updated'] = datetime.now(tz).isoformat()
                
                json_string = json.dumps(data, ensure_ascii=False, indent=2)
                
                try:
                    if current_generation is not None:
                        blob.upload_from_string(
                            json_string, 
                            content_type='application/json',
                            if_generation_match=current_generation
                        )
                    else:
                        blob.upload_from_string(
                            json_string,
                            content_type='application/json',
                            if_generation_match=0
                        )
                    print(f"✅ Added '{word_lower}' to used words list")
                    return
                except Exception as upload_error:
                    if "precondition" in str(upload_error).lower():
                        time.sleep(0.5)
                        continue
                    raise upload_error
            else:
                return
        except Exception as e:
            print(f"❌ Error updating used words list (attempt {attempt + 1}): {e}")
            if attempt == max_retries - 1:
                return
            time.sleep(1)


def save_game_state(date_str: str, username: str, game_state: dict):
    """Save game state to GCS for persistence across sessions."""
    try:
        storage_client = storage.Client()
        bucket = storage_client.bucket(GCS_BUCKET_NAME)
        
        blob_name = f'game-states/{date_str}/{username}_state.json'
        blob = bucket.blob(blob_name)
        
        game_state['last_updated'] = int(time.time() * 1000)
        state_json = json.dumps(game_state, ensure_ascii=False, indent=2)
        blob.upload_from_string(state_json, content_type='application/json')
        
    except Exception as e:
        print(f"❌ Error saving game state for {username}: {e}")


def load_game_state(date_str: str, username: str) -> dict:
    """Load game state from GCS if it exists."""
    try:
        storage_client = storage.Client()
        bucket = storage_client.bucket(GCS_BUCKET_NAME)
        
        blob_name = f'game-states/{date_str}/{username}_state.json'
        blob = bucket.blob(blob_name)
        
        if blob.exists():
            state_json = blob.download_as_text()
            return json.loads(state_json)
        return None
    except Exception as e:
        print(f"❌ Error loading game state for {username}: {e}")
        return None


def delete_game_state(date_str: str, username: str):
    """Delete game state from GCS (e.g., when game is completed)."""
    try:
        storage_client = storage.Client()
        bucket = storage_client.bucket(GCS_BUCKET_NAME)
        
        blob_name = f'game-states/{date_str}/{username}_state.json'
        blob = bucket.blob(blob_name)
        
        if blob.exists():
            blob.delete()
    except Exception as e:
        print(f"❌ Error deleting game state for {username}: {e}")
