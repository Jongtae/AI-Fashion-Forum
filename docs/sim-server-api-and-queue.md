# sim-server API and queue

Issue `#114` adds a repository-local async job contract on top of the existing sim-server samples.

## Added contract

- `POST /api/jobs/start`
- `GET /api/jobs/{job_id}`
- `POST /api/jobs/{job_id}/tick`
- `GET /api/jobs/{job_id}/replay`
- `POST /api/jobs/{job_id}/retry`
- `GET /api/openapi-sample`

## Queue behavior

- Jobs are created with queued/running/completed status tracking
- Retry count and `max_retries` are stored on each job
- Tick stepping can happen without requiring a single foreground request to hold the whole run open
- Replay payloads can be fetched separately from status polling

## Local smoke test

```bash
curl -X POST http://localhost:4318/api/jobs/start -H 'content-type: application/json' -d '{"seed":42,"tickCount":8,"label":"demo"}'
```
