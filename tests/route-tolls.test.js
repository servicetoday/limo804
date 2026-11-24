import test from 'node:test';
import assert from 'node:assert/strict';
import { routeTolls } from '../lib/route-tolls.js';

const info = amount => ({ estimatedPrices: [{ currencyCode: 'AUD', units: Math.floor(amount), nanos: Math.round((amount % 1) * 1e9) }] });

test('uses the aggregate toll once even when every leg also supplies toll prices', () => {
  const result = routeTolls({ travelAdvisory: { tollInfo: info(11.14) }, legs: [{ travelAdvisory: { tollInfo: info(6) } }, { travelAdvisory: { tollInfo: info(5.14) } }] });
  assert.deepEqual(result, { tollCents: 1114, tollStatus: 'included' });
});

test('can sum leg tolls when no aggregate is supplied', () => {
  assert.deepEqual(routeTolls({ legs: [{ travelAdvisory: { tollInfo: info(6) } }, {}, { travelAdvisory: { tollInfo: info(5.14) } }] }), { tollCents: 1114, tollStatus: 'included' });
});

test('distinguishes a toll-free route from a toll whose price is unavailable', () => {
  assert.deepEqual(routeTolls({ legs: [{}] }), { tollCents: 0, tollStatus: 'none' });
  assert.deepEqual(routeTolls({ travelAdvisory: { tollInfo: {} } }), { tollCents: 0, tollStatus: 'unavailable' });
  assert.equal(routeTolls({ legs: [{ travelAdvisory: { tollInfo: info(6) } }, { travelAdvisory: { tollInfo: { estimatedPrices: [] } } }] }).tollStatus, 'unavailable');
});

test('foreign currencies and malformed money are not silently counted as AUD', () => {
  for (const money of [{ currencyCode: 'USD', units: 5 }, { currencyCode: 'AUD', units: -1 }, { currencyCode: 'AUD', units: 'bad' }, { currencyCode: 'AUD', units: 5, nanos: 1e9 }]) {
    assert.equal(routeTolls({ travelAdvisory: { tollInfo: { estimatedPrices: [money] } } }).tollStatus, 'unavailable');
  }
});
