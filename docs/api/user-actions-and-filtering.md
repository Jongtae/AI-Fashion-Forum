# User Actions & Content Filtering API

API endpoints for logging user actions and filtering content in real-time.

## Endpoints

### POST /api/user/action
### POST /api/engagement/action

Logs a user action (click, view, post, comment, react, etc.).

**Request Body:**
```json
{
  "actorId": "user123",
  "actorType": "user",
  "targetId": "post456",
  "targetType": "post",
  "eventType": "like",
  "metadata": {
    "timestamp": 1234567890
  },
  "source": "web_ui"
}
```

**Response (201 Created):**
```json
{
  "id": "interaction_id",
  "actorId": "user123",
  "actorType": "user",
  "eventType": "like",
  "createdAt": "2025-03-28T10:00:00Z"
}
```

**Parameters:**
- `actorId` (string, required): ID of the actor (user or agent)
- `actorType` (string, required): "user" or "agent"
- `targetId` (string, optional): ID of the target (post, comment, etc.)
- `targetType` (string, optional): Type of target ("post", "comment", "system", etc.)
- `eventType` (string, required): Event type ("like", "comment", "share", "view", etc.)
- `metadata` (object, optional): Additional event metadata
- `source` (string, optional): Source of the event ("web_ui", "api", etc.)

---

### POST /api/moderation/filter

Real-time content filtering. Analyzes input text and returns moderation verdict.

**Request Body:**
```json
{
  "content": "I love this fashion post!",
  "tags": ["fashion", "style"]
}
```

**Response (200 OK):**
```json
{
  "allowed": true,
  "score": 0.125,
  "label": "safe",
  "reasons": [],
  "categories": [],
  "modelVersion": "prototype-v1"
}
```

**With Flagged Content:**
```json
{
  "content": "You are stupid and trash",
  "tags": []
}
```

**Response:**
```json
{
  "allowed": false,
  "score": 0.58,
  "label": "review",
  "reasons": ["harassment:stupid", "harassment:trash"],
  "categories": ["harassment"],
  "modelVersion": "prototype-v1"
}
```

**Parameters:**
- `content` (string, required): Content to filter (max length TBD)
- `tags` (array, optional): Content tags for categorical detection

**Response Fields:**
- `allowed` (boolean): Whether content passes moderation (score < 0.45)
- `score` (number): Moderation score between 0.0 and 1.0 (0 = safe, 1 = severe)
- `label` (string): "safe" or "review"
- `reasons` (array): Matched violation terms and categories
- `categories` (array): Dominant violation categories detected
- `modelVersion` (string): Moderation model version used

**Flagged Categories:**
- `harassment`: Insults, name-calling, personal attacks
- `hate`: Hate speech, discriminatory language
- `sexual`: Explicit sexual content
- `scam`: Fraud, misleading offers, phishing
- `self_harm`: Self-harm, suicide, dangerous behavior

---

## Usage Examples

### Log a like action
```bash
curl -X POST http://localhost:4000/api/user/action \
  -H "Content-Type: application/json" \
  -d '{
    "actorId": "user123",
    "actorType": "user",
    "targetId": "post456",
    "targetType": "post",
    "eventType": "like",
    "source": "web_ui"
  }'
```

### Check content before posting
```bash
curl -X POST http://localhost:4000/api/moderation/filter \
  -H "Content-Type: application/json" \
  -d '{
    "content": "I love this new collection!",
    "tags": ["fashion"]
  }'
```

---

## Data Persistence

### Interactions (User Actions)
Stored in `Interaction` MongoDB collection:
- `actorId`, `actorType`: Actor identifier
- `targetId`, `targetType`: Target of the action
- `eventType`: Type of event
- `metadata`: Additional context
- `createdAt`: Timestamp
- `source`: Event source

### Feedback
For storing user feedback ratings and categories:
- `userId`: User providing feedback
- `targetId`: Target being reviewed
- `targetType`: Type of target
- `category`: Feedback category
- `rating`: Numeric rating (1-5)
- `createdAt`: Timestamp

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "content (string) is required"
}
```

### 500 Internal Server Error
```json
{
  "error": "internal_server_error"
}
```

---

## Testing

Run tests with:
```bash
npm test -- moderation.test.js
```

Tests cover:
- Safe content classification
- Harassment detection
- Hate speech detection
- Self-harm detection
- Scam detection
- Intensity signal boosting (CAPS, punctuation)
- Score normalization
- Multiple category detection
