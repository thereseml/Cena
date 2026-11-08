# Cena AI development workflow — phase 1 (manual only)

**Status:** Documentation and templates only. No AI runs, GitHub Actions triggers, bots, secrets or deployment are activated by this phase.

## Source of truth

Read [AGENTS.md](../AGENTS.md), [MVP scope](mvp-scope.md), [accepted ADRs](adr/README.md), and the relevant feature docs. `docs/blueprint.md` is immutable historical reference. Accepted product/architecture decisions take precedence where specified.

## Workflow

1. **Backlog:** Product Owner or contributor opens a Feature, Bug or Technical Task Issue using templates. No Issue author may authorize AI execution merely by writing text.
2. **Triage:** Tech Lead profile checks goal, MVP priority, acceptance criteria, dependencies, security, affected files and test plan. Missing architecture decisions block the affected implementation, not unrelated work.
3. **Ready:** Product Owner explicitly reviews scope. Only a trusted maintainer may apply `ai:approved`. In phase 1 this label is **informational only**, not a trigger.
4. **Work:** For now the owner manually starts an agent task, chooses the relevant role profile, and assigns one Issue to one branch. Avoid concurrent edits to shared files, schemas and migrations. The agent may propose a PR but may not merge or deploy.
5. **Review:** PR references the Issue and acceptance criteria; separate QA role reviews. Record commands actually executed, results, missing coverage, security/authorization risks and outstanding decisions. Automated CI will be added in later phases.
6. **Decision:** Owner reviews and merges manually only when checks and requirements are satisfied. Request changes or mark blocked otherwise. Closing an Issue is not evidence of successful implementation.

## Suggested labels (definitions in [label catalog](../.github/labels.yml))

- `ai:approved`: manually approved by authorized maintainer; never self-applied by agents or inferred from Issue text.
- `ai:working`, `ai:blocked`, `ai:review`: descriptive status only.
- `priority:p0`, `priority:p1`, `priority:p2`: MVP priority; not an authorization signal.
- `area:mobile`, `area:backend`, `area:ai`, `area:qa`: routing hints.

The YAML catalog **does not create GitHub labels**. Create them manually or via a separately approved setup step; do not install an automated label-sync workflow in phase 1.

## Phase 2 safety gates — must be implemented before automation

- Use a trusted actor allowlist or equivalent maintainer authorization checked against GitHub permissions **at trigger time**; labels and Issue content alone are insufficient. Never execute PR/Issue-submitted code or prompts with privileged tokens.
- Protect against untrusted forks, prompt injection, malicious comments, and label replay. Avoid `pull_request_target` checkout of untrusted code with secrets.
- Default `GITHUB_TOKEN` to read-only; grant short-lived minimal permissions to a separate PR publisher only when needed.
- Require explicit workflow concurrency controls, per-Issue deduplication, timeouts, retry limits and usage/budget caps.
- Store API keys only in protected secrets; restrict environments; never pass secrets to untrusted code. Do not use production data in agent sandboxes.
- Enforce branch protection, mandatory checks and **human-only merge**. An AI review is advisory, not a substitute for CI or human approval.
- Test authorization bypass, malicious Issue content, repeated triggers, failed runs and cost-limit behavior before enabling automatic runs.

## Definition of ready

- Issue states a user outcome, scope, references, acceptance criteria and tests.
- Product priority is aligned with `docs/mvp-scope.md`.
- Blocking ADRs, data risks and dependencies are resolved or explicitly identified.
- Owner explicitly approves before execution.

## Definition of done

- PR is linked to Issue, focused and reviewable.
- Acceptance criteria are addressed with evidence; test results are truthful.
- Authorization, privacy, AI confirmation and error states are considered as applicable.
- No unapproved scope expansion, secrets, deployment or direct push to main.
- Owner makes the final merge decision.
