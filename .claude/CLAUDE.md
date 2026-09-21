\# FleetDash Development Rules



\## Repository



Repository:

Mannsoni8/intership-infotec



Development branch:

mann



NEVER create or use:

mann-daily



\## Project



FleetDash is a high-throughput event-driven fleet telemetry dashboard.



Architecture:



Vehicle telemetry

→ Express ingestion API

→ worker\_threads

→ MongoDB Bucket Pattern

→ Turf.js geospatial rules

→ Redis Pub/Sub

→ Socket.io

→ React telemetry buffer

→ Canvas + requestAnimationFrame



\## Engineering Rules



\- Use strict TypeScript.

\- Never use `any`.

\- Inspect existing code before modifying it.

\- Do not rewrite working code unnecessarily.

\- Do not create fake implementations.

\- Every commit must contain meaningful functionality.

\- Run appropriate tests/typechecks after changes.

\- Keep backend and frontend modular.



\## Git Rules



Always use:



mann



Never create or use:



mann-daily



Use Conventional Commits:



feat: ...

fix: ...

refactor: ...

test: ...

docs: ...

chore: ...



\## SECURITY



NEVER commit or push:



node\_modules/

.env

.env.\*

.env.local

.env.production

.env.development



API keys

MongoDB credentials

Redis credentials

JWT secrets

passwords

tokens

private keys

certificates



Allowed:



.env.example



.env.example must never contain real credentials.



Before every commit:



1\. Run git status.

2\. Inspect changed files.

3\. Inspect git diff.

4\. Check staged files.

5\. Verify no secrets are staged.

6\. Stop immediately if sensitive information is found.



\## Daily Development



For each development session:



1\. Checkout mann.

2\. Pull latest mann.

3\. Inspect recent commits.

4\. Inspect current project state.

5\. Determine the next meaningful task.

6\. Implement exactly one meaningful feature/fix/refactor.

7\. Run relevant checks.

8\. Perform security verification.

9\. Commit using Conventional Commits.

10\. Push to origin/mann.

11\. Record the work in docs/daily-logs/.



Never make an empty/no-op commit.



\## Failure Rules



If tests fail:



Investigate and fix when safely possible.



If the issue cannot safely be fixed:



Do not push broken work.



If GitHub push fails:



Do not claim success.



If secrets are detected:



STOP.



Never expose or commit secrets.

