# ADR-0002: Backend service boundary

**Status:** Accepted (product-owner architecture decision, 2026-11-08)

## Context
The beta has shared households, inventory changes and AI-generated suggestions. Centralizing business rules prevents clients from bypassing confirmations.

## Decision
- Build a **NestJS API** as a **modular monolith**.
- Mobile communicates with protected domain operations via the backend (HTTPS/REST as the blueprint default).
- Keep authorization, validation, inventory mutations, recipe matching and AI orchestration on the server.
- Supabase provides managed services; it is **not** a replacement for the chosen domain API.

## Consequences and guardrails
- Keep modules by domain; no microservices for MVP.
- Never trust household IDs, AI outputs or quantities supplied by the client.
- Manual inventory must still work if AI is unavailable.

## Deferred implementation details
Final endpoint contracts, error taxonomy, request tracing, deployment and auth middleware design.

## References
- [Private beta scope](../mvp-scope.md)
- [Historical architecture](../architecture.md)
- [Original blueprint](../blueprint.md)
