import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeListings } from './blizzard-listing-metrics.mjs';

const commodity = (id, quantity, unit_price, item = { id: 2589 }) => ({ id, item, quantity, unit_price });
const summarize = rows => summarizeListings(rows, { kind: 'commodity', itemIds: [2589] });

test('weighted statistics use listed units and preserve an exact rational mean', () => {
  const result = summarize([commodity(1, 1, 10), commodity(2, 3, 30)]).basket[0];
  assert.equal(result.min, 10);
  assert.equal(result.weightedMedian, 30);
  assert.equal(result.weightedMean, 25);
  assert.deepEqual(result.weightedMeanExact, { numerator: '25', denominator: '1' });
  assert.equal(result.totalQuantity, 4);
  assert.equal(result.pricedAuctions, 2);
  const thirds = summarize([commodity(1, 2, 10), commodity(2, 1, 11)]).basket[0];
  assert.deepEqual(thirds.weightedMeanExact, { numerator: '31', denominator: '3' });
  assert.equal(thirds.weightedMeanIsApproximate, true);
});

test('an even unit count averages both middle unit prices', () => {
  const result = summarize([commodity(1, 1, 10), commodity(2, 1, 21)]).basket[0];
  assert.equal(result.weightedMedian, 15.5);
  assert.deepEqual(result.weightedMedianExact, { numerator: '31', denominator: '2' });
});

test('commodity unit_price is never divided by its quantity', () => {
  const result = summarize([commodity(1, 3, 30)]).basket[0];
  assert.equal(result.min, 30);
  assert.equal(result.weightedMean, 30);
  assert.equal(result.pricedQuantity, 3);
});

test('bid-only stock is retained separately and missing prices never become zero', () => {
  const result = summarizeListings([
    { id: 1, item: { id: 2589 }, quantity: 1, buyout: 20 },
    { id: 2, item: { id: 2589 }, quantity: 1, bid: 10 },
    { id: 3, item: { id: 2589 }, quantity: 1, buyout: 0, bid: 10 },
  ], { kind: 'auction', itemIds: [2589] }).basket[0];
  assert.equal(result.totalQuantity, 3);
  assert.equal(result.pricedQuantity, 1);
  assert.equal(result.bidOnlyAuctions, 2);
  assert.equal(result.min, 20);
  const missing = summarizeListings([{ id: 1, item: { id: 2589 }, quantity: 1, bid: 10 }], { kind: 'auction', itemIds: [2589] }).basket[0];
  assert.equal(missing.min, null);
  assert.equal(missing.weightedMedian, null);
  assert.equal(missing.weightedMeanExact, null);
});

test('zero, unknown, invalid and absent quantities remain distinguishable', () => {
  const zero = summarize([commodity(1, 0, 30)]).basket[0];
  assert.equal(zero.totalQuantity, 0);
  assert.equal(zero.min, null);
  assert.equal(zero.anomalies.zeroQuantity, 1);
  const unknown = summarize([{ id: 1, item: { id: 2589 }, unit_price: 30 }]).basket[0];
  assert.equal(unknown.totalQuantity, null);
  assert.equal(unknown.anomalies.missingQuantity, 1);
  const invalid = summarize([commodity(1, -1, 30)]).basket[0];
  assert.equal(invalid.totalQuantity, null);
  assert.equal(invalid.anomalies.invalidQuantity, 1);
  const absent = summarize([]).basket[0];
  assert.equal(absent.observed, false);
  assert.equal(absent.totalQuantity, null);
  assert.equal(absent.min, null);
});

test('multi-unit regular buyouts retain quantities but withhold unverified prices', () => {
  const result = summarizeListings([{ id: 1, item: { id: 2589 }, quantity: 5, buyout: 100 }], { kind: 'auction', itemIds: [2589] }).basket[0];
  assert.equal(result.totalQuantity, 5);
  assert.equal(result.pricedQuantity, 0);
  assert.equal(result.min, null);
  assert.equal(result.anomalies.unverifiedAuctionQuantity, 1);
  assert.ok(result.warnings.includes('unverifiedAuctionQuantity'));
});

test('identical listing IDs deduplicate irrespective of property order; contradictions throw', () => {
  const first = commodity(1, 2, 30);
  const reordered = { unit_price: 30, quantity: 2, item: { id: 2589 }, id: 1 };
  const result = summarize([first, reordered]);
  assert.equal(result.inputRows, 2);
  assert.equal(result.uniqueRows, 1);
  assert.equal(result.duplicateRows, 1);
  assert.equal(result.basket[0].totalQuantity, 2);
  assert.throws(() => summarize([first, commodity(1, 3, 30)]), /Conflicting duplicate listing ID/);
});

test('safe input integers aggregate with BigInt and serialize without raw BigInts', () => {
  const q = Number.MAX_SAFE_INTEGER;
  const result = summarize([commodity(1, q, q), commodity(2, q, q)]);
  assert.equal(result.basket[0].totalQuantity, null);
  assert.equal(result.basket[0].totalQuantityExact, '18014398509481982');
  assert.equal(result.basket[0].pricedQuantity, null);
  assert.deepEqual(result.basket[0].weightedMeanExact, { numerator: q.toString(), denominator: '1' });
  assert.equal(result.basket[0].weightedMean, q);
  assert.doesNotThrow(() => JSON.stringify(result));
  assert.equal(summarize([commodity(1, q + 1, 30)]).basket[0].anomalies.invalidQuantity, 1);
});

test('variants remain counted while output basket order and source rows are preserved', () => {
  const rows = [commodity(1, 1, 10, { id: 2589, context: 1, bonus_lists: [2] }), commodity(2, 1, 20, { id: 2589, context: 1, bonus_lists: [3] }), commodity(3, 5, 40, { id: 2592 })];
  const original = structuredClone(rows);
  const result = summarizeListings(rows, { kind: 'commodity', itemIds: [2592, 2589, 2770] });
  assert.deepEqual(result.basket.map(item => item.id), [2592, 2589, 2770]);
  assert.equal(result.basket[1].variantCount, 2);
  assert.equal(result.basket[1].weightedMedian, 15);
  assert.equal(result.basket[2].observed, false);
  assert.deepEqual(rows, original);
});

test('invalid identities and duplicate basket IDs are rejected without echoing source data', () => {
  assert.throws(() => summarize([{ id: 1, item: { id: '2589' }, quantity: 1, unit_price: 10 }]), /^Error: Invalid listing identity$/);
  assert.throws(() => summarizeListings([], { kind: 'commodity', itemIds: [2589, 2589] }), /^Error: Invalid listing-metrics input$/);
});
