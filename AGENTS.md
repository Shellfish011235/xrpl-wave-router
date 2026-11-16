# Shellfish agent instructions — mandatory

**Applies to every coding agent and contributor in this repository**, including Claude, Codex, Grok, Copilot and future models.

Before modifying **any** software, tests, configuration, CI, infrastructure, docs, deployments or tools, **read and comply with the full local [SECURITY_CONTRACT.md](SECURITY_CONTRACT.md)**. This is mandatory policy, not optional guidance. If the contract is missing or unreadable, STOP and mark the task BLOCKED.

For each task: establish root cause and authoritative sources of truth; map trust boundaries and impacted invariants; do not trust client/agent-derived financial or execution data without independent validation; never invent evidence or bypass security to fix a bug. Fail closed for new financial risk, preserve independently authorized exposure-reducing paths, approvals, replay/idempotency and durable audit/accounting.

Perform relevant regression, tampering, replay, stale data, concurrency and crash tests. Require an independent security review for sensitive changes. Do not silently change security tests/CI, merge or deploy when checks fail. Produce the contract's evidence-based PASS / FAIL / BLOCKED report; agent confidence is not verification.

Contract/agent-instruction edits themselves are security-sensitive and need independent review. More restrictive applicable instructions win. These files are documentation; actual enforcement requires CI and branch protection.

Repository: `Shellfish011235/xrpl-wave-router`.
