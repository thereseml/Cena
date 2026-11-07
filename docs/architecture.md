# Cena — Technical architecture, repository layout and reliability

> Extracted from [the original blueprint](blueprint.md), sections 8, 18. Original section numbering retained. [Documentation index](README.md). Follow [AGENTS.md](../AGENTS.md).

# 8. Technical Architecture

## 8.1 Architecture Principles

- Mobile-first.
- TypeScript-first.
- Modular monolith.
- Strong domain boundaries.
- Server-side business logic.
- AI outputs are untrusted input.
- Database is the source of truth.
- User authorization on every protected resource.
- Simple infrastructure before complex infrastructure.

## 8.2 System Overview

```text
                  CENA MOBILE
              React Native / Expo
                       |
                       |
                  HTTPS / REST
                       |
                       v
                  NESTJS API
                       |
       +---------------+---------------+
       |               |               |
       v               v               v
   Domain Logic     AI Service     Auth Service
       |               |               |
       v               v               v
   PostgreSQL       OpenAI API      Supabase Auth
       |
       v
   Inventory
   Recipes
   Meal Plans
   Shopping
   Households

   Additional services:
   - Supabase Storage
   - RevenueCat
   - PostHog
   - Sentry
```

## 8.3 Repository Structure

```text
cena/
├── apps/
│   ├── mobile/
│   │   ├── app/
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   └── product/
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   ├── onboarding/
│   │   │   ├── home/
│   │   │   ├── kitchen/
│   │   │   ├── recipes/
│   │   │   ├── cooking/
│   │   │   ├── planner/
│   │   │   ├── shopping/
│   │   │   └── assistant/
│   │   ├── design-system/
│   │   │   ├── tokens/
│   │   │   └── theme/
│   │   ├── hooks/
│   │   ├── lib/
│   │   └── assets/
│   │
│   └── api/
│       └── src/
│           ├── modules/
│           │   ├── auth/
│           │   ├── households/
│           │   ├── inventory/
│           │   ├── products/
│           │   ├── recipes/
│           │   ├── cooking/
│           │   ├── meal-plans/
│           │   ├── shopping/
│           │   └── ai/
│           ├── common/
│           ├── config/
│           └── database/
│
├── packages/
│   ├── shared-types/
│   ├── validation/
│   ├── api-client/
│   └── config/
│
├── docs/
│   ├── adr/
│   └── api/
│
├── .github/
│   └── workflows/
│
│   └── blueprint.md
├── README.md
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

The structure is a target architecture, not a requirement to create every folder immediately.

## 8.4 Backend Modules

Each domain module should own its:

- Controllers.
- Services.
- Validation.
- Domain rules.
- Data access.
- Tests.

Avoid circular dependencies.

Use explicit interfaces when crossing module boundaries.

---

---

# 18. Performance and Reliability

## Targets

- Fast initial navigation.
- Inventory loading under 2 seconds in typical conditions.
- Common non-AI API requests: target p95 below 500 ms.
- Recognition target under 15 seconds.
- Recipe generation target under 10 seconds.

Targets must be measured using realistic conditions.

## Reliability Requirements

- Handle network failures.
- Prevent duplicate mutations.
- Show retry actions.
- Avoid losing unsaved form input.
- Use safe transaction boundaries.
- Log errors without exposing private information.
- Keep AI failure from blocking manual inventory management.

---
