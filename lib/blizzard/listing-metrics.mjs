// Pure, read-only metrics for one Blizzard house, snapshot and response kind.
// No identity inference, fetch, archive write or source substitution is performed.
// Quantities expose an exact decimal string; their numeric form is null on overflow.
// weightedMean is an approximation when weightedMeanExact.denominator !== '1'.
const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER);
const positiveSafe = value => Number.isSafeInteger(value) && value > 0;
const owns = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const canonical = value => {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') {
    return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}';
  }
  return JSON.stringify(value);
};
const anomalyKeys = ['missingQuantity', 'invalidQuantity', 'zeroQuantity', 'missingPrice', 'invalidPrice', 'unverifiedAuctionQuantity'];
const newCounter = () => ({ totalAuctions: 0, pricedAuctions: 0, bidOnlyAuctions: 0, knownQuantity: 0n, pricedQuantity: 0n, anomalies: Object.fromEntries(anomalyKeys.map(key => [key, 0])) });
const safeQuantity = value => value <= MAX_SAFE ? Number(value) : null;
const gcd = (left, right) => { while (right) [left, right] = [right, left % right]; return left; };
const fraction = (numerator, denominator) => {
  const divisor = gcd(numerator, denominator);
  return { numerator: (numerator / divisor).toString(), denominator: (denominator / divisor).toString() };
};
const exactMedianNumber = (numerator, denominator) => {
  if (numerator % denominator === 0n) return safeQuantity(numerator / denominator);
  // A half copper is exactly representable only below 2**52.
  return numerator <= MAX_SAFE ? Number(numerator) / Number(denominator) : null;
};
const finalizeCounter = (counter, observed = true) => {
  const completeQuantity = observed && !counter.anomalies.missingQuantity && !counter.anomalies.invalidQuantity;
  return {
    totalAuctions: counter.totalAuctions,
    pricedAuctions: counter.pricedAuctions,
    unpricedAuctions: counter.totalAuctions - counter.pricedAuctions,
    bidOnlyAuctions: counter.bidOnlyAuctions,
    totalQuantity: completeQuantity ? safeQuantity(counter.knownQuantity) : null,
    totalQuantityExact: completeQuantity ? counter.knownQuantity.toString() : null,
    knownQuantity: safeQuantity(counter.knownQuantity),
    knownQuantityExact: counter.knownQuantity.toString(),
    pricedQuantity: safeQuantity(counter.pricedQuantity),
    pricedQuantityExact: counter.pricedQuantity.toString(),
    anomalies: { ...counter.anomalies },
  };
};

export class ListingMetricsError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

export function summarizeListings(rows, { kind, itemIds } = {}) {
  if (!['auction', 'commodity'].includes(kind) || !Array.isArray(rows) || !Array.isArray(itemIds) || itemIds.some(id => !positiveSafe(id)) || new Set(itemIds).size !== itemIds.length) {
    throw new ListingMetricsError('invalid_metrics_input', 'Invalid listing-metrics input');
  }
  const basket = new Map(itemIds.map(id => [id, { id, counter: newCounter(), prices: new Map(), value: 0n, variants: new Set() }]));
  const totals = newCounter(), seen = new Map(), sourceItems = new Set();
  let duplicateRows = 0;
  for (const row of rows) {
    if (!row || typeof row !== 'object' || Array.isArray(row) || !positiveSafe(row.id) || !positiveSafe(row.item?.id)) {
      throw new ListingMetricsError('invalid_listing_identity', 'Invalid listing identity');
    }
    if (seen.has(row.id)) {
      if (canonical(seen.get(row.id)) !== canonical(row)) throw new ListingMetricsError('conflicting_listing_identity', 'Conflicting duplicate listing ID');
      duplicateRows++;
      continue;
    }
    seen.set(row.id, row);
    sourceItems.add(row.item.id);
    const entry = basket.get(row.item.id);
    if (entry) entry.variants.add(canonical(row.item));
    const counters = entry ? [totals, entry.counter] : [totals];
    const addAnomaly = key => { for (const counter of counters) counter.anomalies[key]++; };
    for (const counter of counters) counter.totalAuctions++;

    let quantity = null;
    if (!owns(row, 'quantity') || row.quantity === null) addAnomaly('missingQuantity');
    else if (!Number.isSafeInteger(row.quantity) || row.quantity < 0) addAnomaly('invalidQuantity');
    else {
      quantity = BigInt(row.quantity);
      if (quantity === 0n) addAnomaly('zeroQuantity');
      for (const counter of counters) counter.knownQuantity += quantity;
    }
    const priceKey = kind === 'commodity' ? 'unit_price' : 'buyout';
    const rawPrice = row[priceKey];
    let price = null;
    if (!owns(row, priceKey) || rawPrice === null || rawPrice === 0) addAnomaly('missingPrice');
    else if (!positiveSafe(rawPrice)) addAnomaly('invalidPrice');
    else price = rawPrice;
    if (kind === 'auction' && (rawPrice === null || rawPrice === undefined || rawPrice === 0) && positiveSafe(row.bid)) {
      for (const counter of counters) counter.bidOnlyAuctions++;
    }
    // The observed Forever API uses q=1 for regular auctions. A multi-unit
    // buyout's unit semantics have not been validated: keep stock, withhold price.
    if (kind === 'auction' && quantity !== null && quantity > 1n) {
      addAnomaly('unverifiedAuctionQuantity');
      price = null;
    }
    if (price === null || quantity === null || quantity === 0n) continue;
    for (const counter of counters) {
      counter.pricedAuctions++;
      counter.pricedQuantity += quantity;
    }
    if (entry) {
      entry.prices.set(price, (entry.prices.get(price) || 0n) + quantity);
      entry.value += BigInt(price) * quantity;
    }
  }
  return {
    kind,
    inputRows: rows.length,
    uniqueRows: seen.size,
    duplicateRows,
    distinctSourceItems: sourceItems.size,
    totals: finalizeCounter(totals, rows.length > 0),
    basket: [...basket.values()].map(entry => {
      const { id, counter, prices, value, variants } = entry;
      const observed = counter.totalAuctions > 0;
      const levels = [...prices].sort((left, right) => left[0] - right[0]);
      const count = counter.pricedQuantity;
      let min = null, weightedMedian = null, weightedMedianExact = null, weightedMean = null, weightedMeanExact = null;
      if (count > 0n) {
        min = levels[0][0];
        const lowerPosition = (count + 1n) / 2n, upperPosition = (count + 2n) / 2n;
        let cumulative = 0n, lower = null, upper = null;
        for (const [price, quantity] of levels) {
          cumulative += quantity;
          if (lower === null && cumulative >= lowerPosition) lower = BigInt(price);
          if (cumulative >= upperPosition) { upper = BigInt(price); break; }
        }
        const middleSum = lower + upper;
        weightedMedian = exactMedianNumber(middleSum, 2n);
        weightedMedianExact = fraction(middleSum, 2n);
        weightedMeanExact = fraction(value, count);
        // Compute the integer quotient before converting; sums never lose precision.
        weightedMean = Number(value / count) + Number(value % count) / Number(count);
      }
      const warnings = Object.entries(counter.anomalies).filter(([, count]) => count > 0).map(([key]) => key);
      if (count > 0n && weightedMedian === null) warnings.push('medianNumericPrecision');
      if (counter.knownQuantity > MAX_SAFE || count > MAX_SAFE) warnings.push('quantityNumericPrecision');
      return {
        id,
        observed,
        ...finalizeCounter(counter, observed),
        min,
        weightedMedian,
        weightedMedianExact,
        weightedMean,
        weightedMeanExact,
        weightedMeanIsApproximate: count > 0n && value % count !== 0n,
        variantCount: variants.size,
        warnings,
      };
    }),
  };
}
