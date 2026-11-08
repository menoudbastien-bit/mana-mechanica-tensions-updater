# Mana Mechanica tension updater

Runs at 00:00, 06:00, 12:00 and 18:00 UTC through GitHub Actions. At each run it reads the current published basket from https://mana-mechanica.com/observatory-catalog.json. It triggers the hosted calculation and verifies every expected item ID for every Forever market. There is no fixed 75-item limit.

Add reviewed items to content/observatory/basket.json in the Site repository and publish the Site. The generated catalogue, server and counters share that definition. Routine additions require no updater edit, secret change or schedule change. Never add fake items to production for tests.

The pre-update snapshot may lack newly added items; the verified post-update snapshot must contain the exact published ID set. Existing episodes, first detections and distinct confirmations are checked for preservation. Missing data stays missing. Removing or replacing existing IDs is deliberately rejected pending a separate history-retention migration.

Only updater code is public here. The narrow refresh credential stays in the existing encrypted Actions secret and is read through stdin. No Site owner credential, prices or editorial hypotheses are supplied by this runner.

Markets run sequentially with 20 seconds between them. Read back before at most one retry after a lost response; authentication errors stop the run. The summary distinguishes saved results, current basket size, usable observations and source failures. A concurrent Site publication can cause an identity mismatch; inspect saved results and let a later run read the new catalogue. Do not weaken identity checks.

GitHub cron is best effort and public scheduled workflows can be disabled after 60 days without repository activity. Review actual Actions runs. No language-model usage allowance is used by these jobs.

Tests: node --test tests/tensions-updater.mjs
