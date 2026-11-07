# Cena documentation index

Start here when working with Codex, GPT or OpenCode. Read only the documents relevant to your task, plus [AGENTS.md](../AGENTS.md).

**Canonical original:** [blueprint.md](blueprint.md) is preserved verbatim. The focused documents below are reorganized excerpts of that source, not independent product decisions. For general requirements use the original blueprint; for approved private-beta scope, [mvp-scope.md](mvp-scope.md) supersedes conflicting historical P0/P1 priorities. Flag other discrepancies. Section numbers deliberately match the original.

| Task | Read |
| --- | --- |
| **Approved private-beta MVP scope and acceptance criteria** | [mvp-scope.md](mvp-scope.md) (new product-owner decisions) |
| Product vision, decisions, scope and risks | [product.md](product.md) (sections 1, 2, 3, 4, 19, 26, 27) |
| Navigation, journeys, screen requirements and accessibility | [experience.md](experience.md) (sections 5, 7, 17) |
| Warm Minimalism tokens and component rules | [design-system.md](design-system.md) (sections 6) |
| Technical architecture, repository layout and reliability | [architecture.md](architecture.md) (sections 8, 18) |
| Domain entities, data rules and API contracts | [data-and-api.md](data-and-api.md) (sections 9, 10) |
| AI workflows, validation, privacy and security | [ai-and-security.md](ai-and-security.md) (sections 11, 12) |
| Subscriptions, metrics and validation | [business-and-metrics.md](business-and-metrics.md) (sections 13, 14, 23) |
| Roadmap, testing, release criteria and open decisions | [delivery.md](delivery.md) (sections 15, 16, 20, 21, 22, 24, 25) |

## Agent reading order

1. Read [AGENTS.md](../AGENTS.md) for collaboration, safety and PR rules.
2. Read this index and the one or two relevant topic files.
3. Inspect actual code, tests and existing ADRs before implementing.
4. For beta work, read [mvp-scope.md](mvp-scope.md) before choosing P0/P1 priorities.
5. For ambiguous requirements, consult [the original blueprint](blueprint.md) and document unresolved decisions rather than guessing.

## Documentation maintenance

- Keep `blueprint.md` as the historical original; do not silently edit it.
- When product decisions change, propose an explicit decision/ADR and update relevant focused docs after approval.
- Preserve P0/P1/P2 distinctions. The phased roadmap is not permission to silently promote P1 features to P0.
- Technical defaults are proposals until accepted through implementation or an ADR.
