"""
Main Flask Application for German Wordle Game.
Handles routes, game logic, session management, and API endpoints.
"""
from flask import Flask, render_template, request, jsonify, session
import os
import time
import random
from datetime import datetime
import pytz
import uuid
import secrets

# Import configuration
from config import (
    GCP_PROJECT_ID,
    GCS_BUCKET_NAME,
    TIMEZONE,
    MAX_ATTEMPTS,
    WORD_LENGTHS,
    PORT,
    DEBUG,
    ADMIN_PASSWORD,
    LEADERBOARD_CACHE_TIMEOUT,
    validate_config
)

# Import word generator functions
from word_generator_vertex import (
    get_word_and_validate,
    validate_word,
    init_vertexai,
    store_score,
    get_daily_leaderboard,
    calculate_score,
    store_forced_word,
    save_game_state,
    load_game_state,
    delete_game_state,
    generate_daily_word_for_date
)

# Validate configuration before starting
try:
    validate_config()
except ValueError as e:
    print(f"❌ Configuration error: {e}")
    raise SystemExit("Please configure environment variables in .env file")

# Initialize Flask app
app = Flask(__name__)
app.secret_key = secrets.token_hex(16)

# Initialize Vertex AI
try:
    init_vertexai()
    print("✅ Vertex AI initialized successfully" )
except Exception as e:
    print(f"❌ CRITICAL ERROR: Vertex AI initialization failed: {e}")
    raise SystemExit("Vertex AI initialization required")


def ensure_daily_word_exists() -> str:
    """Ensure daily word exists and return it."""
    tz = pytz.timezone(TIMEZONE)
    today = datetime.now(tz).strftime('%Y-%m-%d')
    
    word, success = get_word_and_validate(today)
    if success:
        print(f"✅ Daily word for {today} already exists: {word}")
        return word.lower()
    
    print(f"⚠️ No daily word found for {today}, generating new word...")
    
    # Random delay to avoid race conditions
    sleep_time = random.randint(1, 5)
    print(f"💤 Sleeping {sleep_time} seconds to avoid race conditions...")
    time.sleep(sleep_time)
    
    # Check again after delay
    word, success = get_word_and_validate(today)
    if success:
        print(f"✅ Daily word for {today} was created by another instance: {word}")
        return word.lower()
    
    # Generate the word
    print(f"🔄 Still no word found, this instance will generate it...")
    try:
        generated_word = generate_daily_word_for_date(today)
        print(f"🎯 Generated new word for {today}: {generated_word}")
        
        # Final verification
        final_word, final_success = get_word_and_validate(today)
        if not final_success:
            raise Exception(f"CRITICAL: Generated word for {today} but it's not stored!")
        
        print(f"✅ Successfully ensured daily word for {today}: {final_word}")
        return final_word.lower()
        
    except Exception as e:
        print(f"❌ Error generating daily word: {e}")
        raise Exception(f"Failed to generate word for {today}: {e}")


def get_daily_word() -> str:
    """Get the word of the day."""
    return ensure_daily_word_exists()


def initialize_game():
    """Initialize a new game session."""
    target_word = get_daily_word()
    word_length = len(target_word)
    
    session['game_id'] = str(uuid.uuid4())
    session['word_length'] = word_length
    session['target_word'] = target_word
    session['attempts'] = []
    session['current_word'] = ""
    session['game_over'] = False
    session['won'] = False
    session['keyboard_colors'] = {}
    session['username'] = None
    
    return {
        'word_length': word_length,
        'attempts': [],
        'current_word': "",
        'game_over': False,
        'won': False,
        'keyboard_colors': {},
        'remaining_attempts': MAX_ATTEMPTS,
        'username': None
    }


def validate_and_fix_session():
    """Validate that session has correct daily word and reset if needed."""
    try:
        current_daily_word = get_daily_word()
        session_word = session.get('target_word', '')
        
        if session_word.lower() != current_daily_word.lower():
            print(f"⚠️ Session word mismatch detected! Resetting...")
            username = session.get('username')
            game_data = initialize_game()
            if username:
                session['username'] = username
                game_data['username'] = username
            return True, game_data
            
        return False, None
        
    except Exception as e:
        print(f"❌ Error validating session: {e}")
        game_data = initialize_game()
        return True, game_data


def calculate_feedback(guess: str, target: str) -> list:
    """
    Calculate color feedback for a guess using two-pass algorithm.
    Handles edge cases like repeated letters correctly.
    """
    feedback = []
    target_copy = list(target)
    
    # First pass: exact matches (green)
    for i, (guess_char, target_char) in enumerate(zip(guess, target)):
        if guess_char == target_char:
            feedback.append({'letter': guess_char.upper(), 'status': 'correct'})
            target_copy[i] = None
        else:
            feedback.append({'letter': guess_char.upper(), 'status': None})
    
    # Second pass: misplaced characters (yellow)
    for i, guess_char in enumerate(guess):
        if feedback[i]['status'] is not None:
            continue
        if guess_char in target_copy:
            feedback[i]['status'] = 'present'
            target_copy[target_copy.index(guess_char)] = None
        else:
            feedback[i]['status'] = 'absent'
    
    return feedback


@app.route('/')
def index():
    """Main game page."""
    ensure_daily_word_exists()
    tz = pytz.timezone(TIMEZONE)
    today = datetime.now(tz).strftime('%Y-%m-%d')
    
    if 'game_id' not in session:
        game_state = initialize_game()
    else:
        session_was_reset, reset_game_state = validate_and_fix_session()
        
        if session_was_reset:
            game_state = reset_game_state
        else:
            game_state = {
                'word_length': session.get('word_length', 5),
                'attempts': session.get('attempts', []),
                'current_word': session.get('current_word', ""),
                'game_over': session.get('game_over', False),
                'won': session.get('won', False),
                'keyboard_colors': session.get('keyboard_colors', {}),
                'remaining_attempts': MAX_ATTEMPTS - len(session.get('attempts', [])),
                'username': session.get('username')
            }
            
            # Try to load saved game state
            username = session.get('username')
            if username:
                saved_state = load_game_state(today, username)
                if saved_state and saved_state.get('attempts'):
                    session['attempts'] = saved_state.get('attempts', [])
                    session['game_over'] = saved_state.get('game_over', False)
                    session['won'] = saved_state.get('won', False)
                    session['keyboard_colors'] = saved_state.get('keyboard_colors', {})
                    
                    game_state.update({
                        'attempts': saved_state.get('attempts', []),
                        'game_over': saved_state.get('game_over', False),
                        'won': saved_state.get('won', False),
                        'keyboard_colors': saved_state.get('keyboard_colors', {}),
                        'remaining_attempts': MAX_ATTEMPTS - len(saved_state.get('attempts', []))
                    })
    
    leaderboard = get_daily_leaderboard(today)
    return render_template('game.html', leaderboard=leaderboard, **game_state)


@app.route('/api/submit_guess', methods=['POST'])
def submit_guess():
    """Handle word guess submission."""
    session_was_reset, reset_game_state = validate_and_fix_session()
    if session_was_reset:
        return jsonify({
            'error': 'Session was reset due to word mismatch',
            'reset_required': True,
            'game_state': reset_game_state
        }), 409
    
    data = request.json
    guess = data.get('guess', '').lower()
    override = data.get('override', False)
    
    if not guess or len(guess) != session.get('word_length', 5):
        return jsonify({'error': 'Invalid word length'}), 400
    
    # Validate word (skip if override is True)
    if not override and not validate_word(guess, session['word_length']):
        return jsonify({'error': 'Invalid word'}), 400
    
    # Store forced words
    if override:
        store_forced_word(guess)
    
    # Calculate feedback
    target = session['target_word']
    feedback = calculate_feedback(guess, target)
    
    # Update keyboard colors
    keyboard_colors = session.get('keyboard_colors', {})
    for item in feedback:
        letter = item['letter']
        status = item['status']
        
        if keyboard_colors.get(letter) != 'correct':
            if status == 'correct':
                keyboard_colors[letter] = 'correct'
            elif status == 'present' and keyboard_colors.get(letter) != 'correct':
                keyboard_colors[letter] = 'present'
            elif status == 'absent' and letter not in keyboard_colors:
                keyboard_colors[letter] = 'absent'
    
    session['keyboard_colors'] = keyboard_colors
    
    # Add attempt
    attempts = session.get('attempts', [])
    attempts.append({
        'word': guess.upper(),
        'feedback': feedback
    })
    session['attempts'] = attempts
    
    # Check win condition
    won = guess == target
    game_over = won or len(attempts) >= MAX_ATTEMPTS
    
    session['game_over'] = game_over
    session['won'] = won
    session['current_word'] = ""
    
    # Save game state
    username = session.get('username')
    if username:
        tz = pytz.timezone(TIMEZONE)
        today = datetime.now(tz).strftime('%Y-%m-%d')
        
        game_state_to_save = {
            'attempts': attempts,
            'game_over': game_over,
            'won': won,
            'keyboard_colors': keyboard_colors
        }
        save_game_state(today, username, game_state_to_save)
        
        if game_over:
            delete_game_state(today, username)
    
    return jsonify({
        'feedback': feedback,
        'won': won,
        'game_over': game_over,
        'target_word': target.upper() if game_over else None,
        'remaining_attempts': MAX_ATTEMPTS - len(attempts),
        'keyboard_colors': keyboard_colors
    })


@app.route('/api/add_letter_at_position', methods=['POST'])
def add_letter_at_position():
    """Add a letter at a specific position."""
    data = request.json
    letter = data.get('letter', '').upper()
    position = data.get('position', 0)
    
    current_word = session.get('current_word', '')
    word_length = session.get('word_length', 5)
    
    word_list = list(current_word.ljust(word_length))
    
    if 0 <= position < word_length:
        word_list[position] = letter
        current_word = ''.join(word_list).rstrip(' ')
        session['current_word'] = current_word
    
    return jsonify({'current_word': current_word})


@app.route('/api/remove_letter_at_position', methods=['POST'])
def remove_letter_at_position():
    """Remove letter at a specific position."""
    data = request.json
    position = data.get('position', 0)
    
    current_word = session.get('current_word', '')
    word_length = session.get('word_length', 5)
    
    word_list = list(current_word.ljust(word_length))
    
    if 0 <= position < word_length:
        word_list[position] = ' '
        current_word = ''.join(word_list).rstrip()
        session['current_word'] = current_word
    
    return jsonify({'current_word': current_word})


@app.route('/api/set_username', methods=['POST'])
def set_username():
    """Set the username for the current session."""
    data = request.get_json()
    username = data.get('username', '').strip()
    
    if not username or len(username) > 20:
        return jsonify({'error': 'Username must be 1-20 characters'}), 400
    
    username = username.title()
    
    # Check if username already exists
    tz = pytz.timezone(TIMEZONE)
    today = datetime.now(tz).strftime('%Y-%m-%d')
    leaderboard = get_daily_leaderboard(today)
    existing_names = [entry['username'].lower() for entry in leaderboard]
    
    if username.lower() in existing_names:
        # Load previous game state
        try:
            saved_state = load_game_state(today, username)
            
            if saved_state and saved_state.get('attempts'):
                session['username'] = username
                session['attempts'] = saved_state.get('attempts', [])
                session['game_over'] = saved_state.get('game_over', False)
                session['won'] = saved_state.get('won', False)
                session['keyboard_colors'] = saved_state.get('keyboard_colors', {})
                session['target_word'] = get_daily_word()
                session['word_length'] = len(session['target_word'])
                session['current_word'] = ""
                
                return jsonify({
                    'success': True,
                    'returning_player': True,
                    'attempts': saved_state.get('attempts', []),
                    'won': saved_state.get('won', False),
                    'game_over': saved_state.get('game_over', False),
                    'keyboard_colors': saved_state.get('keyboard_colors', {}),
                    'remaining_attempts': MAX_ATTEMPTS - len(saved_state.get('attempts', []))
                })
            
            # Fallback: Load from scores
            from google.cloud import storage
            import json
            
            storage_client = storage.Client()
            bucket = storage_client.bucket(GCS_BUCKET_NAME)
            blobs = bucket.list_blobs(prefix=f'scores/{today}/')
            
            for blob in blobs:
                if blob.name.endswith('.txt') and username.lower() in blob.name.lower():
                    try:
                        data = blob.download_as_text().strip()
                        parts = data.split(',')
                        
                        if len(parts) >= 6 and parts[0].lower() == username.lower():
                            user_won = parts[3].lower() == 'true'
                            detailed_attempts = json.loads(','.join(parts[5:]))
                            
                            session['username'] = username
                            session['attempts'] = detailed_attempts
                            session['game_over'] = True
                            session['won'] = user_won
                            session['target_word'] = get_daily_word()
                            session['word_length'] = len(session['target_word'])
                            
                            # Calculate keyboard colors
                            keyboard_colors = {}
                            for attempt in detailed_attempts:
                                for letter_info in attempt.get('feedback', []):
                                    letter = letter_info.get('letter', '').lower()
                                    status = letter_info.get('status', 'absent')
                                    
                                    if letter not in keyboard_colors or status == 'correct':
                                        keyboard_colors[letter] = status
                                    elif status == 'present' and keyboard_colors.get(letter) != 'correct':
                                        keyboard_colors[letter] = status
                            
                            session['keyboard_colors'] = keyboard_colors
                            
                            return jsonify({
                                'already_played': True,
                                'username': username,
                                'game_state': {
                                    'word_length': session['word_length'],
                                    'attempts': detailed_attempts,
                                    'game_over': True,
                                    'won': user_won,
                                    'keyboard_colors': keyboard_colors,
                                    'remaining_attempts': 0
                                },
                                'message': f'Willkommen zurück, {username}! Du hast heute bereits gespielt.'
                            })
                    except Exception:
                        continue
        except Exception as e:
            print(f"Error loading previous game state: {e}")
        
        session['username'] = username
        return jsonify({
            'warning': f'Name "{username}" wurde heute schon verwendet.',
            'username': username
        })
    
    session['username'] = username
    return jsonify({'success': True, 'username': username})


# Leaderboard cache
leaderboard_cache = {}
last_bucket_check = {}


def get_cached_leaderboard(today: str):
    """Get leaderboard with caching and change detection."""
    import time
    from google.cloud import storage
    
    current_time = time.time()
    storage_client = storage.Client()
    bucket = storage_client.bucket(GCS_BUCKET_NAME)
    
    try:
        latest_mod_time = 0
        blobs = bucket.list_blobs(prefix=f'scores/{today}/')
        
        for blob in blobs:
            if blob.time_created:
                mod_time = blob.time_created.timestamp()
                latest_mod_time = max(latest_mod_time, mod_time)
        
        cache_key = today
        if (cache_key in leaderboard_cache and 
            cache_key in last_bucket_check and
            latest_mod_time <= last_bucket_check[cache_key] and
            current_time - leaderboard_cache[cache_key]['timestamp'] < LEADERBOARD_CACHE_TIMEOUT):
            return leaderboard_cache[cache_key]['data']
        
        fresh_data = get_daily_leaderboard(today)
        leaderboard_cache[cache_key] = {'data': fresh_data, 'timestamp': current_time}
        last_bucket_check[cache_key] = latest_mod_time
        
        return fresh_data
        
    except Exception as e:
        print(f"Error checking bucket changes: {e}")
        if (today in leaderboard_cache and 
            current_time - leaderboard_cache[today]['timestamp'] < LEADERBOARD_CACHE_TIMEOUT):
            return leaderboard_cache[today]['data']
        
        fresh_data = get_daily_leaderboard(today)
        leaderboard_cache[today] = {'data': fresh_data, 'timestamp': current_time}
        return fresh_data


@app.route('/api/leaderboard')
def get_leaderboard():
    """Get today's leaderboard with caching."""
    tz = pytz.timezone(TIMEZONE)
    today = datetime.now(tz).strftime('%Y-%m-%d')
    
    leaderboard = get_cached_leaderboard(today)
    return jsonify({'leaderboard': leaderboard})


@app.route('/api/finish_game', methods=['POST'])
def finish_game():
    """Store the final score when game is finished."""
    if not session.get('game_over'):
        return jsonify({'error': 'Game not finished'}), 400
    
    username = session.get('username')
    if not username:
        return jsonify({'error': 'Username not set'}), 400
    
    tz = pytz.timezone(TIMEZONE)
    today = datetime.now(tz).strftime('%Y-%m-%d')
    attempts = len(session.get('attempts', []))
    won = session.get('won', False)
    
    try:
        detailed_attempts = session.get('attempts', [])
        store_score(today, username, attempts, won, detailed_attempts)
        score = calculate_score(attempts if won else MAX_ATTEMPTS + 1)
        
        # Force cache clear
        global leaderboard_cache, last_bucket_check
        leaderboard_cache.clear()
        last_bucket_check.clear()
        
        return jsonify({'success': True, 'score': score})
    except Exception as e:
        return jsonify({'error': f'Failed to store score: {e}'}), 500


@app.route('/api/admin/reset-daily-word', methods=['POST'])
def admin_reset_daily_word():
    """Admin endpoint to reset daily word and scores."""
    try:
        data = request.get_json()
        password = data.get('password', '')
        
        if password != ADMIN_PASSWORD:
            return jsonify({'error': 'Invalid password'}), 401
        
        from google.cloud import storage
        
        tz = pytz.timezone(TIMEZONE)
        today = datetime.now(tz).strftime('%Y-%m-%d')
        storage_client = storage.Client()
        bucket = storage_client.bucket(GCS_BUCKET_NAME)
        
        deleted_files = []
        
        # Delete today's word
        word_blob = bucket.blob(f'words/{today}.txt')
        if word_blob.exists():
            word_blob.delete()
            deleted_files.append(f'words/{today}.txt')
        
        # Delete all scores
        score_blobs = bucket.list_blobs(prefix=f'scores/{today}/')
        for blob in score_blobs:
            blob.delete()
            deleted_files.append(blob.name)
        
        # Clear cache
        global leaderboard_cache, last_bucket_check
        leaderboard_cache.clear()
        last_bucket_check.clear()
        session.clear()
        
        return jsonify({
            'success': True,
            'message': f'Reset daily word and scores for {today}',
            'deleted_files': deleted_files
        })
        
    except Exception as e:
        print(f"Error in admin reset: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/player-attempts/<username>')
def get_player_attempts(username):
    """Get detailed attempts for a specific player."""
    try:
        from google.cloud import storage
        import json
        
        tz = pytz.timezone(TIMEZONE)
        today = datetime.now(tz).strftime('%Y-%m-%d')
        storage_client = storage.Client()
        bucket = storage_client.bucket(GCS_BUCKET_NAME)
        
        blobs = bucket.list_blobs(prefix=f'scores/{today}/')
        
        for blob in blobs:
            if blob.name.endswith('.txt') and username in blob.name:
                try:
                    data = blob.download_as_text().strip()
                    parts = data.split(',')
                    
                    if len(parts) >= 6 and parts[0] == username:
                        attempts_count = int(parts[1])
                        score = int(parts[2])
                        won = parts[3].lower() == 'true'
                        timestamp = parts[4]
                        detailed_data = ','.join(parts[5:])
                        
                        try:
                            detailed_attempts = json.loads(detailed_data)
                            return jsonify({
                                'success': True,
                                'username': username,
                                'attempts': detailed_attempts,
                                'won': won,
                                'attempts_count': attempts_count,
                                'score': score,
                                'timestamp': timestamp
                            })
                        except json.JSONDecodeError:
                            return jsonify({
                                'success': True,
                                'username': username,
                                'attempts': [],
                                'won': won,
                                'attempts_count': attempts_count,
                                'score': score,
                                'message': 'Detailed attempts data is corrupted'
                            })
                except (ValueError, IndexError) as e:
                    print(f"Error parsing score file: {e}")
                    continue
        
        return jsonify({'error': 'No detailed attempts found for this player'}), 404
            
    except Exception as e:
        print(f"Error getting player attempts: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/health')
def health_check():
    """Health check endpoint for Cloud Run probes."""
    tz = pytz.timezone(TIMEZONE)
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now(tz).isoformat(),
        'project': GCP_PROJECT_ID
    }), 200


if __name__ == '__main__':
    app.run(debug=DEBUG, host='0.0.0.0', port=PORT)
