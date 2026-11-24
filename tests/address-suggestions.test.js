import test from 'node:test';
import assert from 'node:assert/strict';
import { createAddressSearch } from '../lib/address-suggestions.js';

test('new Places searches reuse their token until a selection or reset', async () => {
  const requests = [];
  const details = [];
  const prediction = { toPlace: () => ({ fetchFields: fields => { details.push(fields); return Promise.resolve(); } }) };
  const search = createAddressSearch({
    AutocompleteSessionToken: class {},
    AutocompleteSuggestion: { fetchAutocompleteSuggestions: async request => {
      requests.push(request);
      return { suggestions: [{ placePrediction: prediction }, {}] };
    } },
  });
  assert.deepEqual(await search.search('Sydney'), [prediction]);
  await search.search('Sydney Airport');
  assert.equal(requests[0].sessionToken, requests[1].sessionToken);
  await search.select(prediction);
  await search.search('Hilton');
  assert.notEqual(requests[1].sessionToken, requests[2].sessionToken);
  assert.deepEqual(details, [{ fields: ['formattedAddress'] }]);
  search.reset();
  await search.search('Mascot');
  assert.notEqual(requests[2].sessionToken, requests[3].sessionToken);
});

test('a key without Places New access falls back and keeps both address searches usable', async () => {
  let newCalls = 0;
  const legacyRequests = [];
  const places = {
    AutocompleteSessionToken: class {},
    AutocompleteSuggestion: { fetchAutocompleteSuggestions: async () => { newCalls++; throw new Error('PERMISSION_DENIED'); } },
    AutocompleteService: class {
      getPlacePredictions(request, callback) {
        legacyRequests.push(request);
        callback([{ place_id: 'syd', description: `${request.input}, NSW, Australia`, structured_formatting: { main_text: request.input, secondary_text: 'NSW, Australia' } }], 'OK');
      }
    },
  };
  const pickup = createAddressSearch(places);
  const dropoff = createAddressSearch(places);
  const results = await pickup.search('Sydney Airport');
  assert.equal(results[0].text, 'Sydney Airport, NSW, Australia');
  assert.equal(results[0].placeId, 'syd');
  await pickup.select(results[0]);
  await pickup.search('Sydney Domestic');
  assert.equal(newCalls, 1);
  assert.equal((await dropoff.search('Hilton'))[0].mainText, 'Hilton');
  assert.equal(newCalls, 2);
  assert.equal(legacyRequests.length, 3);
  assert.deepEqual(legacyRequests[0].componentRestrictions, { country: 'au' });
  assert.equal(legacyRequests[0].sessionToken, undefined);
});

test('legacy search handles no results and reports denied requests', async () => {
  let status = 'ZERO_RESULTS';
  const search = createAddressSearch({ AutocompleteService: class {
    getPlacePredictions(request, callback) { callback(null, status); }
  } });
  assert.deepEqual(await search.search('Unknown'), []);
  status = 'REQUEST_DENIED';
  await assert.rejects(search.search('Sydney'), /REQUEST_DENIED/);
});
