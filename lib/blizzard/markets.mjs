// A physical house is collected once per region. Ruleset labels below are
// external attributions, never inferred from the query ruleset in the URL.
export const MAPPING_VERSION = 'blizzard-houses-20261122-v1';
export const MAPPING_EVIDENCE = 'https://auctionhouse.tk.gg/data/';
export const REGION_CONFIG = Object.freeze({
  eu: {host: 'eu.api.blizzard.com', regionId: 93, locale: 'en_GB', timezone: 'Europe/Paris'},
  us: {host: 'us.api.blizzard.com', regionId: 91, locale: 'en_US', timezone: 'America/Los_Angeles'},
  kr: {host: 'kr.api.blizzard.com', regionId: 92, locale: 'ko_KR', timezone: 'Asia/Seoul'},
  tw: {host: 'tw.api.blizzard.com', regionId: 94, locale: 'zh_TW', timezone: 'Asia/Taipei'},
  cn: {host: null, regionId: null, locale: 'zh_CN', timezone: 'Asia/Shanghai'},
});
const groups = [
  ['normal', [111, 114, 117], 'external_observation'],
  ['pvp', [110, 113, 116], 'inferred'],
  ['rp', [119, 120, 121], 'inferred'],
  ['rppvp', [123, 124, 125], 'inferred'],
];
const factions = ['alliance', 'horde', 'neutral'];
export const markets = Object.freeze(Object.entries(REGION_CONFIG).flatMap(([region, config]) =>
  groups.filter(([ruleset]) => region !== 'tw' || ['normal', 'pvp'].includes(ruleset)).flatMap(([ruleset, ids, evidence]) =>
    factions.map((faction, index) => {
      const available = region !== 'cn' && (!['kr', 'tw'].includes(region) || ['normal', 'pvp'].includes(ruleset));
      const houseId = region === 'cn' ? null : ids[index];
      return Object.freeze({
        id: `forever.${ruleset}.${faction}.${region}`, game: 'forever', provider: 'Blizzard',
        region, ruleset, attributedRuleset: ruleset, faction, houseId, queryRulesetId: 2,
        namespace: `dynamic-forever-${region}`, timezone: config.timezone,
        available, status: available ? 'candidate' : 'unavailable',
        unavailableReason: available ? null : region === 'cn' ? 'regional_client_required' : 'ruleset_not_exposed',
        evidenceStatus: available ? evidence : 'unavailable', mappingStatus: available ? 'externally_attributed' : 'unavailable',
        mappingVersion: MAPPING_VERSION, evidenceUrl: MAPPING_EVIDENCE,
        physicalKey: houseId === null ? null : `blizzard:${region}:${houseId}`,
        sourceUrl: available ? `https://${config.host}/data/wow/ruleset/2/auctions/${houseId}?namespace=dynamic-forever-${region}` : null,
        legacyScopeNote: region === 'kr' ? 'AHledger legacy kr combined Korea and Taiwan; it is not this direct Korean series.' : null,
      });
    })
  )
));
const byId = new Map(markets.map(row => [row.id, row]));
export function marketById(id) { return typeof id === 'string' ? byId.get(id) ?? null : null; }
export function physicalKey(value) {
  const row = typeof value === 'string' ? marketById(value) : value;
  return row?.physicalKey ?? null;
}
export const collectibleMarkets = markets.filter(row => row.available);
