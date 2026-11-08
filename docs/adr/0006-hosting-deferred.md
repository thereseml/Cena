# ADR-0006: Backend hosting remains undecided

**Status:** Deferred (explicit product-owner decision, 2026-11-08)

## Context
The owner chose not to select a hosting provider at this stage. A hosting decision is not necessary to define app/backend/database boundaries.

## Decision
- **Do not choose Railway, Render, Supabase Edge Functions, or any other API hosting provider yet.**
- Design the NestJS service to run with environment-based configuration and a reproducible build.
- Keep local development independent of a specific production platform.

## Consequences
- Do not claim a production deployment target, URL, cost, or operational SLA is approved.
- Hosting **must be decided before remote beta deployment** and documented in a superseding ADR.
- Evaluate environment separation, EU/GDPR needs, secrets, connection pooling, logs, backups, uptime, cost and ease of deployment.

## References
- [MVP scope](../mvp-scope.md)
- [Architecture overview](../architecture.md)
