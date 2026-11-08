# Mana Mechanica tension updater

A Node program runs at 00:00, 06:00, 12:00 and 18:00 UTC through GitHub Actions. It calls the existing hosted calculation and verifies every market and its 75 item states. It does not publish the website or generate trading advice.

Only updater code is public here. The narrow refresh credential is stored in an encrypted Actions secret. It is never committed, printed or passed in command arguments.

Markets run sequentially, with 20 seconds between them. A lost response is read back before at most one retry. Authentication errors stop the run. Missing observations remain missing and do not close historical episodes. Logs distinguish verified storage, usable observations and source failures.

GitHub cron timing is best effort. Review Actions for actual executions and failures. No language model or ChatGPT subscription allowance is used by these jobs.

Tests: `node --test tests/tensions-updater.mjs`.
