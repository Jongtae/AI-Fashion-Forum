# Content Quality & Moderation Logging Schema

## Overview

This document defines the logging and audit trail schemas for content quality monitoring and moderation decisions.

## 1. Moderation Decision Log

**Collection: `moderationdecisions` (ModerationDecision model)**

Immutable audit trail of all moderation decisions. Every decision is recorded with full context for transparency, bias detection, and appeals.

### Schema Fields

```javascript
{
  // Post reference
  postId: ObjectId,              // Reference to flagged post
  authorId: string,              // User/Agent who created post

  // Decision details
  decisionType: "1" | "2" | "3", // Clear violation | Borderline | Context-dependent
  decision: "approved" | "flagged" | "removed", // Final moderation status
  reason: string,                 // Primary violation category (harassment, hate, sexual, etc.)
  reasoning: string,              // Detailed explanation
  score: number,                  // Moderation score (0.0-1.0)

  // Escalation tracking
  escalated: boolean,             // Whether escalated to operator
  escalationSeverity: "low" | "medium" | "high", // Escalation severity
  escalationNotificationId: string, // Link to notification
  escalationAcknowledgedAt: Date, // When operator acknowledged
  escalationActionTakenAt: Date,  // When escalation was resolved

  // Operator decision
  decidedBy: string,              // "system" or operatorId
  decidedAt: Date,                // Decision timestamp

  // Appeal information
  appealed: boolean,              // Whether post has been appealed
  appealedAt: Date,               // Appeal submission time
  appealReason: string,           // User's appeal explanation
  appealedBy: string,             // userId who appealed
  appealStatus: "pending" | "approved" | "rejected", // Appeal state

  // Appeal review
  appealReviewedBy: string,       // operatorId who reviewed appeal
  appealReviewedAt: Date,         // Appeal review timestamp
  appealDecision: "sustained" | "overturned", // Appeal outcome

  // Metadata & versioning
  context: {
    contentSnapshot: string,      // Original post content (first 500 chars)
    tags: string[]                // Post tags for context
  },
  modelVersion: string,           // Moderation model version

  // System fields
  createdAt: Date,                // Document creation time
  updatedAt: Date                 // Last update time
}
```

### Indexes

```javascript
// Compound indexes for common queries
{
  postId: 1, createdAt: -1           // Find decision for specific post
  authorId: 1, decision: 1, createdAt: -1 // Filter by author/decision
  appealed: 1, appealStatus: 1       // Find pending appeals
  escalated: 1, escalationSeverity: 1 // Find escalations by severity
  decidedAt: -1                      // Time-series queries
}
```

## 2. Action Trace Log

**Collection: `actiontraces` (ActionTrace model)**

Complete activity log of agent/user actions on the forum.

### Schema Fields

```javascript
{
  eventId: string,                // Unique event ID (EV:S01:1:5:action)
  actionId: string,               // Action ID (ACT:S01:0:post)
  agentId: string,                // Agent performing action
  actionType: "silence" | "lurk" | "react" | "comment" | "post",

  tick: number,                   // Tick number in simulation
  round: number,                  // Round/epoch number
  timestamp: Date,                // Action timestamp
  visibility: "stored_only" | "public_lightweight" | "public_visible",
  executionStatus: "success" | "degraded" | "blocked" | "failed",

  targetContentId: string | null, // Post/comment being interacted with
  characterSummary: string | null, // Agent archetype or personality

  metadata: object                // Additional context
}
```

## 3. Logging API Endpoints

### GET /api/logging/events

Query agent behavior events.

**Query Parameters:**
- `agentId`: Filter by specific agent
- `actionType`: Filter by action type
- `round`: Filter by round
- `tick` | `tick_min` | `tick_max`: Filter by tick
- `limit`: Results per page (default 50, max 500)
- `offset`: Pagination offset

**Response:**
```json
{
  "events": [
    {
      "eventId": "EV:S01:1:5:action",
      "actionId": "ACT:S01:5:0:post",
      "agentId": "S01",
      "actionType": "post",
      "tick": 5,
      "round": 1,
      "timestamp": "2026-03-28T10:00:00Z",
      "visibility": "public_visible",
      "executionStatus": "success",
      "targetContentId": null,
      "characterSummary": "fashion_maven"
    }
  ],
  "total": 100,
  "hasMore": true
}
```

### GET /api/logging/content-quality

Query content quality logs (posts & moderation decisions).

**Query Parameters:**
- `authorId`: Filter by post author
- `moderationStatus`: Filter by status (approved | flagged | removed)
- `scoreMin` / `scoreMax`: Filter by moderation score range
- `since`: Filter by creation date >= since
- `until`: Filter by creation date <= until
- `escalated`: Filter by escalation (true | false)
- `appealed`: Filter by appeal status (true | false)
- `limit`: Results per page
- `offset`: Pagination offset

**Response:**
```json
{
  "logs": [
    {
      "postId": "507f1f77bcf86cd799439011",
      "content_preview": "This is a test post...",
      "authorId": "user123",
      "authorType": "user",
      "moderationStatus": "flagged",
      "moderationScore": 0.68,
      "moderationLabel": "review",
      "moderationCategories": ["harassment"],
      "appealed": false,
      "createdAt": "2026-03-28T10:00:00Z"
    }
  ],
  "total": 45,
  "hasMore": false
}
```

## 4. Audit Trail & Statistics Endpoints

### GET /api/operator/audit-log

Get immutable audit trail of all moderation decisions.

**Filters:**
- `decision`: approved | flagged | removed
- `decisionType`: 1 | 2 | 3
- `escalated`: true | false
- `appealed`: true | false
- `since`: ISO date string

**Response:**
```json
{
  "decisions": [
    {
      "id": "507f1f77bcf86cd799439011",
      "postId": "507f1f77bcf86cd799439012",
      "authorId": "user123",
      "decision": "flagged",
      "decisionType": "1",
      "score": 0.72,
      "reason": "harassment",
      "escalated": true,
      "decidedBy": "system",
      "decidedAt": "2026-03-28T10:00:00Z",
      "appealed": false
    }
  ],
  "pagination": {
    "total": 234,
    "limit": 50,
    "offset": 0,
    "hasMore": true
  }
}
```

### GET /api/operator/audit-log/:postId

Get complete audit trail for a specific post (including all appeals).

### GET /api/operator/audit-log/stats

Get moderation statistics with bias detection metrics.

**Response:**
```json
{
  "period": {
    "since": "2026-03-21T00:00:00Z",
    "until": "2026-03-28T23:59:59Z"
  },
  "summary": {
    "totalDecisions": 450,
    "removedCount": 45,
    "removedRate": 10.0,
    "approvedCount": 405,
    "approvalRate": 90.0,
    "flaggedCount": 0,
    "flagRate": 0.0
  },
  "appeals": {
    "totalAppeals": 5,
    "pendingAppeals": 1,
    "overturnedAppeals": 1,
    "overturnRatePercent": 20.0
  },
  "escalations": {
    "escalatedCount": 12,
    "escalationRate": 2.7
  },
  "biasMetrics": [
    {
      "operatorId": "op_001",
      "totalDecisions": 150,
      "removedCount": 30,
      "removedRate": "20.0",
      "appealedCount": 15,
      "appealRate": "10.0",
      "flagged": "NORMAL"
    },
    {
      "operatorId": "op_002",
      "totalDecisions": 120,
      "removedCount": 60,
      "removedRate": "50.0",
      "appealedCount": 65,
      "appealRate": "54.2",
      "flagged": "HIGH_APPEAL_RATE"
    }
  ]
}
```

## 5. Data Retention & Privacy

- **Moderation decisions**: Retained indefinitely for audit compliance
- **Appeal audit trail**: Retained for 2 years minimum
- **Content snapshots**: Stored with decisions for context (first 500 chars only)
- **User identification**: Full userId preserved for appeals and bias tracking

## 6. Bias Detection Thresholds

Operators are flagged if:
- **HIGH_APPEAL_RATE**: > 50% of their decisions are appealed
- **MODERATE_APPEAL_RATE**: 25-50% appeal rate
- **NORMAL**: < 25% appeal rate

These metrics appear in GET /api/operator/audit-log/stats and operator dashboard alerts.

---

**Related Issues:**
- #279: Content quality logs schema & ingestion (this document)
- #280: Moderation API state transitions validation
- #281: Appeal system & operator decision audit trail
- #261-1: Operator dashboard with metrics
