---
description: Run the project's complete local verification and report evidence
---

Run every required verification step documented in AGENTS.md and
docs/testing/release-gates.md.

Do not fix failures during the first pass.

Report:
- command executed
- exit status
- failing test or diagnostic
- likely cause
- whether the failure predates the current diff

After reporting the complete first pass, fix only failures caused by the
current change, rerun the smallest relevant checks, and finally rerun the
complete verification suite.
