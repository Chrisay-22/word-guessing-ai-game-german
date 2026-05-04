# API Documentation

REST API reference for the German Wordle Game.

## Base URL

```
Production: https://your-service.run.app
Local:      http://localhost:8080
```

## Authentication

Most endpoints require **no authentication**. Admin endpoints require the `ADMIN_PASSWORD`.

## Response Format

All responses are JSON with appropriate HTTP status codes.

**Success Response**:
```json
{
  "success": true,
  "data": {...}
}
```

**Error Response**:
```json
{
  "error": "Error message description"
}
```

## Endpoints

### Game Management

#### `GET /` 
**Description**: Renders the main game page

**Response**: HTML page

---

#### `GET /api/game_state`
**Description**: Get current game state for the session

**Response**:
```json
{
  "word_length": 5,
  "attempts": [],
  "current_word": "",
  "game_over": false,
  "won": false,
  "keyboard_colors": {},
  "remaining_attempts": 6,
  "username": "Alice"
}
```

**Status Codes**:
- `200 OK`: Game state retrieved

---

#### `POST /api/set_username`
**Description**: Set username for the current session

**Request Body**:
```json
{
  "username": "Alice"
}
```

**Response**:
```json
{
  "success": true,
  "username": "Alice"
}
```

**Or if user already played today**:
```json
{
  "already_played": true,
  "message": "Welcome back! You already played today.",
  "game_state": {...}
}
```

**Status Codes**:
- `200 OK`: Username set successfully
- `400 Bad Request`: Invalid username (empty, too long)

**Validation**:
- Username: 1-20 characters
- Automatically formatted to Title Case

---

#### `POST /api/add_letter_at_position`
**Description**: Add a letter at specific position in current word

**Request Body**:
```json
{
  "letter": "H",
  "position": 0
}
```

**Response**:
```json
{
  "current_word": "H"
}
```

**Status Codes**:
- `200 OK`: Letter added
- `400 Bad Request`: Invalid letter or position

**Validation**:
- Letter: A-Z, Ä, Ö, Ü
- Position: 0 to word_length-1

---

#### `POST /api/remove_letter_at_position`
**Description**: Remove letter at specific position

**Request Body**:
```json
{
  "position": 0
}
```

**Response**:
```json
{
  "current_word": ""
}
```

**Status Codes**:
- `200 OK`: Letter removed
- `400 Bad Request`: Invalid position

---

#### `POST /api/submit_guess`
**Description**: Submit a word guess

**Request Body**:
```json
{
  "guess": "HAUS",
  "override": false
}
```

**Parameters**:
- `guess` (string, required): The guessed word
- `override` (boolean, optional): Skip validation (admin override)

**Response**:
```json
{
  "feedback": [
    {"letter": "H", "status": "correct"},
    {"letter": "A", "status": "present"},
    {"letter": "U", "status": "absent"},
    {"letter": "S", "status": "correct"}
  ],
  "game_over": false,
  "won": false,
  "keyboard_colors": {
    "H": "correct",
    "A": "present",
    "U": "absent",
    "S": "correct"
  },
  "remaining_attempts": 5
}
```

**Feedback Status Values**:
- `correct`: Letter in correct position (green)
- `present`: Letter in word but wrong position (yellow)
- `absent`: Letter not in word (gray)

**Status Codes**:
- `200 OK`: Valid guess processed
- `400 Bad Request`: Invalid word or incomplete guess
- `409 Conflict`: Session reset required (daily word changed)

**Validation**:
- Word length must match target word length
- Word must exist (validated via Vertex AI unless overridden)
- Game must not be over

---

#### `POST /api/finish_game`
**Description**: Mark game as finished and store score

**Request Body**: None (uses session data)

**Response**:
```json
{
  "success": true,
  "score": 4,
  "attempts": 3
}
```

**Status Codes**:
- `200 OK`: Score stored successfully
- `400 Bad Request`: Game not over or username not set

**Scoring System**:
```python
attempts: 1 → score: 6
attempts: 2 → score: 5
attempts: 3 → score: 4
attempts: 4 → score: 3
attempts: 5 → score: 2
attempts: 6 → score: 1
failed:     → score: 0
```

---

### Leaderboard

#### `GET /api/leaderboard`
**Description**: Get today's leaderboard

**Response**:
```json
{
  "leaderboard": [
    {
      "username": "Alice",
      "attempts": 3,
      "score": 4,
      "won": true,
      "timestamp": "2024-01-15T10:30:00"
    },
    {
      "username": "Bob",
      "attempts": 4,
      "score": 3,
      "won": true,
      "timestamp": "2024-01-15T11:45:00"
    }
  ]
}
```

**Sorting**: By score (descending), then by timestamp (ascending)

**Status Codes**:
- `200 OK`: Leaderboard retrieved

---

#### `GET /api/monthly_leaderboard`
**Description**: Get current month's aggregated statistics

**Response**:
```json
{
  "month": "2024-01",
  "leaderboard": [
    {
      "username": "Alice",
      "games_played": 15,
      "total_points": 72,
      "avg_points": 4.8
    },
    {
      "username": "Bob",
      "games_played": 12,
      "total_points": 48,
      "avg_points": 4.0
    }
  ]
}
```

**Status Codes**:
- `200 OK`: Monthly stats retrieved

---

#### `GET /api/player-attempts/<username>`
**Description**: Get detailed attempts for a specific player

**Path Parameters**:
- `username`: Player's username

**Response**:
```json
{
  "success": true,
  "username": "Alice",
  "won": true,
  "attempts": [
    {
      "word": "HAUS",
      "feedback": [
        {"letter": "H", "status": "correct"},
        {"letter": "A", "status": "present"},
        {"letter": "U", "status": "absent"},
        {"letter": "S", "status": "correct"}
      ]
    }
  ]
}
```

**Status Codes**:
- `200 OK`: Attempts retrieved
- `404 Not Found`: Player not found for today

---

### Admin Endpoints

#### `POST /api/admin/reset-daily-word`
**Description**: Generate a new daily word (admin only)

**⚠️ WARNING**: This deletes all scores for the current day!

**Request Body**:
```json
{
  "password": "your-admin-password"
}
```

**Response**:
```json
{
  "success": true,
  "new_word_length": 6,
  "message": "New daily word generated successfully"
}
```

**Status Codes**:
- `200 OK`: New word generated
- `401 Unauthorized`: Incorrect password
- `500 Internal Server Error`: Word generation failed

**Security**:
- Requires correct `ADMIN_PASSWORD`
- Rate-limited by Cloud Run

---

### Utility Endpoints

#### `GET /health`
**Description**: Health check endpoint

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T12:00:00Z"
}
```

**Status Codes**:
- `200 OK`: Service is healthy

---

#### `GET /api/clear-cache`
**Description**: Clear server-side caches

**Response**:
```json
{
  "success": true
}
```

**Status Codes**:
- `200 OK`: Caches cleared

---

## Error Codes

| Status Code | Meaning | Common Causes |
|-------------|---------|---------------|
| `400 Bad Request` | Invalid input | Missing fields, wrong format |
| `401 Unauthorized` | Auth failed | Wrong admin password |
| `404 Not Found` | Resource not found | Invalid endpoint or player |
| `409 Conflict` | State conflict | Session mismatch |
| `429 Too Many Requests` | Rate limited | Too many requests |
| `500 Internal Server Error` | Server error | Vertex AI failure, storage error |
| `503 Service Unavailable` | Service down | GCP outage |

## Rate Limiting

**Cloud Run Default**: ~1000 requests per second per instance

**Vertex AI**: Subject to quotas (typically 60 requests/minute per project)

**Custom Rate Limiting**: Not implemented (can be added with Cloud Armor)

## CORS Policy

**Current**: Same-origin only (no CORS headers)

**To Enable CORS** (add to Flask app):
```python
from flask_cors import CORS
CORS(app, origins=["https://yourdomain.com"])
```

## Webhooks

Not currently supported. Future enhancement for notifications.

## Pagination

Not implemented (all leaderboards returned in full).

**When to Add**:
- More than 100 entries per day
- Performance issues with large datasets

## Caching

### Client-Side
- Static assets: `Cache-Control: public, max-age=3600`
- API responses: No caching headers (always fresh)

### Server-Side
- Daily word: Cached in memory until next day
- Leaderboards: Fetched on-demand from Cloud Storage

## WebSocket Support

Not currently supported. All updates use HTTP polling.

**Auto-Refresh**:
- Leaderboard: Every 10 seconds
- During gameplay: Every 5 seconds

## Versioning

**Current**: No API versioning

**Future**: May introduce `/api/v1/` versioning scheme

## Testing the API

### Using cURL

**Set username**:
```bash
curl -X POST https://your-service.run.app/api/set_username \
  -H "Content-Type: application/json" \
  -d '{"username":"TestUser"}' \
  -c cookies.txt
```

**Submit guess** (requires cookies from previous request):
```bash
curl -X POST https://your-service.run.app/api/submit_guess \
  -H "Content-Type: application/json" \
  -d '{"guess":"HAUS"}' \
  -b cookies.txt
```

**Get leaderboard**:
```bash
curl https://your-service.run.app/api/leaderboard
```

### Using Postman

1. Create new request collection
2. Set environment variable: `base_url = https://your-service.run.app`
3. Import endpoints from this documentation
4. Enable cookie jar for session management

### Using Python

```python
import requests

BASE_URL = "https://your-service.run.app"
session = requests.Session()

# Set username
response = session.post(f"{BASE_URL}/api/set_username", 
                       json={"username": "Alice"})
print(response.json())

# Add letters
session.post(f"{BASE_URL}/api/add_letter_at_position",
            json={"letter": "H", "position": 0})
session.post(f"{BASE_URL}/api/add_letter_at_position",
            json={"letter": "A", "position": 1})
session.post(f"{BASE_URL}/api/add_letter_at_position",
            json={"letter": "U", "position": 2})
session.post(f"{BASE_URL}/api/add_letter_at_position",
            json={"letter": "S", "position": 3})

# Submit guess
response = session.post(f"{BASE_URL}/api/submit_guess",
                       json={"guess": "HAUS"})
print(response.json())

# Get leaderboard
response = session.get(f"{BASE_URL}/api/leaderboard")
print(response.json())
```

## SDK / Client Libraries

**Currently**: No official SDK

**Recommended**: Use standard HTTP client in your language:
- JavaScript: `fetch()` API
- Python: `requests` library
- Java: `HttpClient`
- Go: `net/http`

## API Changelog

### Version 1.0 (Current)
- Initial API release
- Core game endpoints
- Leaderboard functionality
- Admin reset endpoint

### Planned (Future)
- WebSocket support for real-time updates
- Pagination for large leaderboards
- Authentication with OAuth
- API rate limiting headers
- Webhooks for game events

## Support

For API issues:
1. Check response error messages
2. Verify request format matches documentation
3. Check Cloud Run logs for server errors
4. Review [ARCHITECTURE.md](ARCHITECTURE.md) for system design

---

**API Version**: 1.0  
**Last Updated**: 2024  
**Base URL**: `https://your-service.run.app`
