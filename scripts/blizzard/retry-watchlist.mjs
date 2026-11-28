import {setTimeout as wait} from 'node:timers/promises';
import {CollectionError, runBlizzardCollection} from './collector.mjs';
import {marketById} from '../../lib/blizzard/markets.mjs';

const retryDelay = 15 * 60_000;
const maxAttempts = 3;

function serversFor(markets) {
  const servers = new Set();
  for (const id of markets) {
    const market = marketById(id);
    if (market) servers.add(market.region + ':' + market.ruleset);
  }
  return servers;
}

export async function collectWithRetries(options, {
  collect = runBlizzardCollection, sleep = wait, now = Date.now
} = {}) {
  const {log = () => {}} = options;
  const deferred = new Set();
  let pending;
  let persistentServers;
  let complete = false;
  let nextCheckAt = null;
  let allAttemptsBlocked = true;
  let attempts = 0;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    attempts = attempt;
    log({attempt, maxAttempts, retryMarkets: pending ? [...pending] : null});
    let failedServers;
    try {
      const batch = await collect({...options, retryMarkets: pending, force: Boolean(options.force || pending)});
      if (!pending) nextCheckAt = batch.nextCheckAt;
      allAttemptsBlocked = false;
      const failed = batch.results.filter(result => !result.verifiedReadback);
      failedServers = serversFor(failed.map(result => result.market));
      for (const id of batch.deferredMarkets ?? []) deferred.add(id);
      for (const result of failed) {
        if (result.retryAt > now() + retryDelay) deferred.add(result.market);
      }
      pending = new Set(batch.pendingMarkets.filter(id => !deferred.has(id)));
      complete = batch.summary.complete && deferred.size === 0;
    } catch (error) {
      // A failure before per-house results blocks exactly the requested scope.
      if (pending || options.only) failedServers = serversFor(pending ?? [options.only]);
      log({attempt, complete: false, code: error instanceof CollectionError ? error.code : 'unexpected',
        status: error instanceof CollectionError ? error.status : null});
    }
    if (failedServers) {
      persistentServers = persistentServers === undefined ? failedServers
        : new Set([...persistentServers].filter(server => failedServers.has(server)));
    }
    if (pending?.size === 0 || attempt === maxAttempts) break;
    log({retryAt: new Date(now() + retryDelay).toISOString(), delayMinutes: 15});
    await sleep(retryDelay);
  }

  const persistent = [...(persistentServers ?? [])].sort();
  const alert = attempts === maxAttempts &&
    (persistent.length >= 2 || (allAttemptsBlocked && !options.only));
  log({alert, attempts, complete, persistentServers: persistent,
    pendingMarkets: pending ? [...pending] : null, deferredMarkets: [...deferred]});
  return {alert, summary: {complete}, nextCheckAt,
    ...(options.scope ? {blocked: allAttemptsBlocked && attempts === maxAttempts,
      persistent: attempts === maxAttempts ? persistent : []} : {})};
}
