import {setTimeout as wait} from 'node:timers/promises';
import {collectibleMarkets} from '../../lib/blizzard/markets.mjs';
import {dueAt, runBlizzardCollection} from './collector.mjs';
import {collectWithRetries} from './retry-watchlist.mjs';

const minute = 60_000;
const hour = 60 * minute;
const phases = {eu: [24, 28], us: [32, 36], kr: [43], tw: [48]};

export function hourlyBatches() {
  return Object.entries(phases).flatMap(([region, minutes]) => {
    // Registry order is normal (Alliance first), PvP, RP, then RP-PvP.
    const houses = collectibleMarkets.filter(house => house.region === region);
    return minutes.map((start, i) => ({
      start, region, ids: houses.slice(i * 6, (i + 1) * 6).map(house => house.id)
    }));
  });
}

export async function runHourlyBatches(options, {
  collect = runBlizzardCollection, now = Date.now, sleep = wait
} = {}) {
  const {log = () => {}} = options;
  // The one scheduled wake-up is :17. A queued run starting just after
  // midnight must still drain the elapsed phases of the preceding hour.
  const slotStart = Math.floor((now() - 17 * minute) / hour) * hour;
  const tasks = [];
  let writer = Promise.resolve();

  function enqueue(batch, ids, at, recheckUnchanged = true) {
    tasks.push((async () => {
      const delay = at - now();
      if (delay > 0) await sleep(delay);
      const scope = new Set(ids);
      const batchLog = ({alert: batchAlert, ...row}) =>
        log({...row, ...(batchAlert === undefined ? {} : {batchAlert}),
          region: batch.region, phaseMinute: batch.start, slotStart});
      const outcome = await collectWithRetries({...options, scope, slotStart, log: batchLog}, {
        now, sleep,
        collect(request) {
          // Hold the writer only for network I/O. Retry timers and phase
          // timers never hold the writer, even when a whole batch fails.
          const attempt = writer.then(async () => {
            const result = await collect(request);
            if (!request.retryMarkets && result.upcoming?.length) {
              const pending = result.upcoming;
              enqueue(batch, pending.map(row => row.id), Math.max(...pending.map(row => row.at)), recheckUnchanged);
            }
            if (recheckUnchanged) {
              const checked = now();
              const stale = result.results.filter(row => row.verifiedReadback && row.unchanged &&
                row.sourceTimes?.length && row.sourceTimes.every(feed => feed.at < slotStart));
              if (stale.length) {
                const deadlines = stale.map(row => dueAt({
                  sourceAt: Math.max(...row.sourceTimes.map(feed => feed.at)), lastCheckedAt: checked
                }, checked));
                const next = Math.max(...deadlines);
                if (next < slotStart + hour) enqueue(batch, stale.map(row => row.market), next, false);
              }
            }
            return result;
          });
          writer = attempt.catch(() => {});
          return attempt;
        }
      });
      return outcome;
    })());
  }

  for (const batch of hourlyBatches()) enqueue(batch, batch.ids, slotStart + batch.start * minute);
  const outcomes = [];
  // A collection may discover a later source deadline during its first pass.
  for (let i = 0; i < tasks.length; i++) outcomes.push(await tasks[i]);
  const servers = [...new Set(outcomes.flatMap(row => row.persistent))].sort();
  const complete = outcomes.every(row => row.summary.complete);
  const alert = servers.length >= 2 || outcomes.every(row => row.blocked);
  log({slotStart, complete, alert, persistentServers: servers});
  return {alert, summary: {complete}};
}
