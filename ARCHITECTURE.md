# Architecture Documentation

This document provides a comprehensive overview of the German Wordle Game architecture.

## Table of Contents

- [System Overview](#system-overview)
- [Architecture Diagram](#architecture-diagram)
- [Components](#components)
- [Data Flow](#data-flow)
- [Technology Stack](#technology-stack)
- [Design Decisions](#design-decisions)
- [Scalability](#scalability)
- [Security](#security)

## System Overview

The German Wordle Game is a cloud-native web application built on Google Cloud Platform. It uses AI (Vertex AI) to generate and validate German words, maintaining game state in Cloud Storage for persistence.

### Key Characteristics

- **Serverless**: Runs on Cloud Run (no server management)
- **AI-Powered**: Uses Google Gemini for word generation and validation
- **Stateless Backend**: Session stored in Flask sessions with secure cookies
- **Persistent Storage**: Game data stored in Cloud Storage
- **Real-time**: Client-side JavaScript for responsive gameplay
- **Scalable**: Auto-scales from 0 to N instances based on traffic

## Architecture Diagram

```
┌─────────────┐
│   Client    │
│  (Browser)  │
└──────┬──────┘
       │ HTTPS
       ↓
┌─────────────────────────────────────────────┐
│          Cloud Run (Container)              │
│ ┌─────────────────────────────────────────┐ │
│ │        Flask Application                │ │
│ │  ┌───────────┐      ┌──────────────┐   │ │
│ │  │  Routes   │      │   Game       │   │ │
│ │  │  (API)    │◄────►│   Logic      │   │ │
│ │  └───────────┘      └──────┬───────┘   │ │
│ │                             │           │ │
│ │  ┌────────────────────┐    │           │ │
│ │  │  Word Generator    │◄───┘           │ │
│ │  │  (Vertex AI)       │                │ │
│ │  └────────────────────┘                │ │
│ └─────────────────────────────────────────┘ │
└───────┬─────────────────────────┬───────────┘
        │                         │
        │ API Call               │ Read/Write
        ↓                         ↓
┌──────────────────┐    ┌─────────────────────┐
│   Vertex AI      │    │   Cloud Storage     │
│  (Gemini 2.0)    │    │    (Bucket)         │
│                  │    │  • daily_words/     │
│  • Generate Word │    │  • scores/          │
│  • Validate Word │    │  • monthly_stats/   │
└──────────────────┘    └─────────────────────┘
```

## Components

### Frontend (Client-Side)

**Technology**: Vanilla JavaScript (ES6+), HTML5, CSS3

**File**: `static/js/game.js` (2000+ lines)

**Responsibilities**:
- User interface rendering
- Keyboard input handling (physical + on-screen)
- Real-time position prediction
- Leaderboard display
- Modal management

**State Management**:
- `gameState` object stores current game state
- Synchronized with backend via AJAX requests
- LocalStorage for UI preferences (collapsed sections)

**Key Features**:
- **Letter-by-letter input** with cursor navigation
- **Real-time feedback** on letter positions
- **Competitive messaging** (GOAT/Scheißhaufen system)
- **Attempt viewer** to see other players' solutions

### Backend (Server-Side)

**Framework**: Flask 3.0 (Python 3.11)

**File**: `flask_app.py` (600+ lines)

**Responsibilities**:
- Game logic and rules enforcement
- Session management
- API endpoints
- Storage operations
- Vertex AI integration

#### Core Modules

1. **Configuration** (`config.py`)
   - Environment variable loading
   - Configuration validation
   - Environment-specific settings

2. **Word Generator** (`word_generator_vertex.py`)
   - Vertex AI integration
   - Word generation with constraints
   - Word validation
   - Retry logic with backoff

3. **Flask App** (`flask_app.py`)
   - REST API endpoints
   - Game state management
   - Scoring system
   - Leaderboard generation

### AI Layer (Vertex AI)

**Model**: Google Gemini 2.0 Flash (or configured model)

**Capabilities**:
- Generate random German words (4-8 letters)
- Validate word existence in German
- Enforce word constraints (no proper nouns, etc.)

**Implementation**:
```python
model = GenerativeModel(model_name)
response = model.generate_content(prompt)
```

**Rate Limiting**: Implemented with exponential backoff

### Storage Layer (Cloud Storage)

**Bucket Structure**:
```
gs://your-bucket-name/
├── daily_words/
│   └── YYYY-MM-DD.json          # Daily word data
├── scores/
│   └── YYYY-MM-DD.json          # Daily player scores
└── monthly_stats/
    └── YYYY-MM.json             # Monthly aggregated stats
```

**Data Format Example** (`daily_words/2024-01-15.json`):
```json
{
  "word": "HAUS",
  "length": 4,
  "generated_at": "2024-01-15T00:05:23Z"
}
```

**Scores Format** (`scores/2024-01-15.json`):
```json
{
  "scores": [
    {
      "username": "Alice",
      "attempts": 3,
      "score": 4,
      "won": true,
      "timestamp": "2024-01-15T10:30:45Z",
      "attempt_details": [...]
    }
  ]
}
```

## Data Flow

### 1. Game Initialization

```
User opens page
    ↓
Browser loads HTML/CSS/JS
    ↓
JavaScript requests /api/game_state
    ↓
Backend checks daily word exists
    ↓ (if not exists)
Backend calls Vertex AI to generate word
    ↓
Word stored in Cloud Storage
    ↓
Game state returned to client
    ↓
UI renders with word length shown
```

### 2. Word Submission

```
User types word
    ↓
Client: POST /api/submit_guess
    ↓
Backend validates word length
    ↓
Backend: Vertex AI validates word exists
    ↓ (if invalid)
Backend returns error, client offers override
    ↓ (if valid)
Backend calculates feedback (correct/present/absent)
    ↓
Backend updates keyboard colors
    ↓
Backend checks win/loss condition
    ↓ (if game over)
Backend: POST /api/finish_game
    ↓
Score stored in Cloud Storage
    ↓
Leaderboard recalculated
    ↓
Results modal shown to client
```

### 3. Leaderboard Update

```
Client: GET /api/leaderboard
    ↓
Backend fetches scores/YYYY-MM-DD.json
    ↓
Backend sorts by score (descending)
    ↓
Backend calculates rankings
    ↓
JSON response to client
    ↓
Client renders leaderboard table
```

## Technology Stack

### Backend Stack

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| **Language** | Python | 3.11 | Application logic |
| **Framework** | Flask | 3.0 | Web framework |
| **WSGI Server** | Gunicorn | 21.2+ | Production server |
| **Cloud SDK** | google-cloud-aiplatform | Latest | Vertex AI access |
| **Storage** | google-cloud-storage | Latest | Blob storage |
| **Timezone** | pytz | Latest | Timestamp handling |

### Frontend Stack

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| **Language** | JavaScript | ES6+ | Client logic |
| **Styling** | CSS3 | - | UI design |
| **Templating** | Jinja2 | (Flask) | Server-side rendering |

### Infrastructure Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Compute** | Cloud Run | Serverless container hosting |
| **AI** | Vertex AI (Gemini) | Word generation/validation |
| **Storage** | Cloud Storage | Game data persistence |
| **Registry** | Artifact Registry | Docker image storage |
| **IaC** | Terraform | Infrastructure as Code |

## Design Decisions

### 1. **Why Serverless (Cloud Run)?**

**Benefits**:
- **Zero maintenance**: No server management
- **Auto-scaling**: Handles traffic spikes automatically
- **Cost-effective**: Pay only for actual usage
- **Fast deployment**: Deploy in seconds

**Trade-offs**:
- Cold start latency (~1-2 seconds)
- Stateless architecture required

**Decision**: Benefits outweigh trade-offs for this use case.

### 2. **Why Cloud Storage Instead of Database?**

**Rationale**:
- **Simplicity**: JSON files easier for small-scale data
- **Cost**: Almost free for this data volume
- **Versioning**: Built-in with Cloud Storage
- **Portability**: Easy to export/backup

**When to Switch to Database**:
- More than 10,000 daily users
- Need for complex queries
- Real-time analytics requirements

### 3. **Why Vertex AI for Word Generation?**

**Alternatives Considered**:
- Static word list (too predictable)
- Dictionary API (limited validation features)
- Local LLM (resource intensive)

**Why Vertex AI**:
- High-quality German language understanding
- Built-in validation capabilities
- Scalable and reliable
- Pay-per-use pricing

### 4. **Session Management**

**Choice**: Flask sessions with secure cookies

**Why Not Database Sessions**:
- Simpler architecture
- No database required
- Sufficient for this use case

**Security Measures**:
- `SECRET_KEY` for signing
- `httponly` cookies
- `SameSite` policy
- Configurable session lifetime

### 5. **Two-Pass Feedback Algorithm**

**Problem**: Handle duplicate letters correctly (like Wordle)

**Algorithm**:
```python
# Pass 1: Mark exact matches
for i, (guess, target) in enumerate(zip(guess_word, target_word)):
    if guess == target:
        feedback[i] = 'correct'
        target_remaining[target] -= 1

# Pass 2: Mark present letters (only if remaining)
for i, letter in enumerate(guess_word):
    if feedback[i] == 'absent' and target_remaining[letter] > 0:
        feedback[i] = 'present'
        target_remaining[letter] -= 1
```

**Example**: 
- Target: `GROSS`
- Guess: `SOSSS`
- Feedback: `present, correct, absent, correct, correct`

## Scalability

### Current Capacity

- **Users**: 1000+ concurrent users without issues
- **Requests**: ~100 req/s per instance
- **Data**: Handles millions of score entries

### Scaling Strategy

#### Horizontal Scaling (Automatic)

Cloud Run auto-scales based on:
- CPU utilization
- Request concurrency
- Memory usage

**Configuration**:
```yaml
spec:
  containerConcurrency: 80  # Max requests per instance
  autoscaling:
    minScale: 0  # Scale to zero when idle
    maxScale: 10  # Max 10 instances
```

#### Vertical Scaling (Manual)

Adjust resources per instance:
```bash
gcloud run services update german-wordle-game \
  --cpu=2 \
  --memory=1024Mi
```

### Bottlenecks & Solutions

| Bottleneck | Impact | Solution |
|------------|--------|----------|
| Vertex AI rate limits | Word validation slow | Implement caching, increase quota |
| Cloud Storage reads | Leaderboard load slow | Add in-memory caching (Redis) |
| Cold starts | First request slow | Set min instances to 1+ |
| Session size | Cookie overhead | Minimize session data |

## Security

### Authentication & Authorization

**Current**: No authentication for gameplay

**Admin Endpoints**: Password-protected via environment variable

**Future Enhancements**:
- OAuth 2.0 / Google Sign-In
- Firebase Authentication
- Cloud Identity-Aware Proxy (IAP)

### Data Protection

1. **In Transit**: HTTPS enforced by Cloud Run
2. **At Rest**: Cloud Storage default encryption
3. **Secrets**: Environment variables (never in code)
4. **Sessions**: Signed with `SECRET_KEY`

### Input Validation

- **Word length**: Enforced server-side
- **Character set**: German letters only (A-Z, Ä, Ö, Ü)
- **Rate limiting**: Cloud Run default (per-IP)
- **SQL injection**: Not applicable (no SQL database)
- **XSS**: Jinja2 auto-escaping enabled

### Cloud Security

**IAM Best Practices**:
- Dedicated service account for Cloud Run
- Least privilege permissions
- No personal credentials in containers

**Network Security**:
- VPC connector (optional for internal services)
- Cloud Armor (optional for DDoS protection)

## Performance Optimization

### Frontend

- **Minification**: CSS/JS can be minified
- **Caching**: Static assets cached with `Cache-Control`
- **Lazy loading**: Leaderboard loaded asynchronously
- **Debouncing**: Keyboard input debounced

### Backend

- **Connection pooling**: Vertex AI client reused
- **Caching**: Daily word cached in memory
- **Async I/O**: Consider for Cloud Storage operations
- **Compression**: Gzip enabled for responses

### Cost Optimization

**Current Monthly Estimate** (100 daily users):
- Cloud Run: ~$2-5
- Cloud Storage: <$1
- Vertex AI: ~$5-10
- **Total**: ~$10-15/month

**Optimization Tips**:
- Set `maxScale` to control max instances
- Use cheaper Vertex AI model if acceptable
- Clean up old scores (lifecycle policies)
- Monitor with Cloud Billing alerts

## Monitoring & Observability

### Metrics Tracked

1. **Cloud Run Metrics**:
   - Request count
   - Request latency (p50, p95, p99)
   - Error rate
   - Container instances

2. **Custom Metrics** (can be added):
   - Words generated per day
   - Average attempts to solve
   - Vertex AI response time

### Logging

**Structured Logging Example**:
```python
import logging
logger = logging.getLogger(__name__)
logger.info("Game finished", extra={
    "username": username,
    "attempts": attempts,
    "won": won
})
```

**Log Levels**:
- `INFO`: Normal operations
- `WARNING`: Potential issues
- `ERROR`: Failures (Vertex AI errors, etc.)

### Alerts

Recommended alerts:
- Error rate > 5% for 5 minutes
- Latency p95 > 2 seconds
- Vertex AI failures > 10/hour

## Future Enhancements

### Potential Features

1. **Multiplayer Mode**: Real-time head-to-head races
2. **Difficulty Levels**: Easy (4 letters) to Hard (8 letters)
3. **Achievements System**: Badges for milestones
4. **Social Sharing**: Share results on social media
5. **PWA**: Installable progressive web app
6. **Offline Mode**: Play with cached words

### Technical Improvements

1. **Redis Caching**: For leaderboard and daily word
2. **Database Migration**: PostgreSQL/Firestore for complex queries
3. **GraphQL API**: More flexible than REST
4. **WebSocket**: Real-time leaderboard updates
5. **CDN**: CloudFlare for static asset delivery
6. **A/B Testing**: Feature flags with LaunchDarkly

## References

- [Flask Documentation](https://flask.palletsprojects.com/)
- [Cloud Run Best Practices](https://cloud.google.com/run/docs/best-practices)
- [Vertex AI Documentation](https://cloud.google.com/vertex-ai/docs)
- [12-Factor App Methodology](https://12factor.net/)

---

**Last Updated**: 2024
**Version**: 1.0
