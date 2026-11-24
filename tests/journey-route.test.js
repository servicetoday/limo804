import test from 'node:test';
import assert from 'node:assert/strict';
import { buildJourneyRoute, googleMapsRouteUrl, routeEstimate } from '../lib/journey-route.js';

test('maps every stop in the customer order without optimizing it away', () => {
  const route = buildJourneyRoute(' Sydney Airport ', 'Circular Quay', [{ location: 'Mascot' }, { location: 'Surry Hills' }]);
  assert.equal(route.origin, 'Sydney Airport');
  assert.equal(route.destination, 'Circular Quay');
  assert.deepEqual(route.intermediates, [{ location: 'Mascot' }, { location: 'Surry Hills' }]);
  assert.equal(route.optimizeWaypointOrder, false);
  assert.equal(route.travelMode, 'DRIVING');
  assert.ok(route.fields.includes('legs'));
  assert.ok(route.fields.includes('travelAdvisory'));
  assert.deepEqual(route.extraComputations, ['TOLLS']);
});

test('waits for every address instead of displaying a route with missing stops', () => {
  assert.equal(buildJourneyRoute('', 'Circular Quay'), null);
  assert.equal(buildJourneyRoute('Sydney Airport', ''), null);
  assert.equal(buildJourneyRoute('Sydney Airport', 'Circular Quay', [{ location: ' ' }]), null);
  assert.deepEqual(buildJourneyRoute('Sydney Airport', 'Circular Quay').intermediates, []);
});

test('route changes and reversed return journeys preserve the right endpoints and stops', () => {
  const stops = [{ location: 'Mascot' }, { location: 'Surry Hills' }];
  const outbound = buildJourneyRoute('Sydney Airport', 'Circular Quay', stops);
  const returning = buildJourneyRoute('Circular Quay', 'Sydney Airport', [...stops].reverse());
  assert.equal(returning.origin, outbound.destination);
  assert.equal(returning.destination, outbound.origin);
  assert.deepEqual(returning.intermediates.map(point => point.location), ['Surry Hills', 'Mascot']);
  assert.notDeepEqual(outbound, buildJourneyRoute('Sydney Airport', 'Circular Quay', stops.slice(1)));
});

test('the Google Maps link includes the same route and safely encodes address punctuation', () => {
  const route = buildJourneyRoute('A & B Hotel, Sydney', 'Circular Quay', [{ location: '100 King St, Sydney' }, { location: 'Surry Hills' }]);
  const url = new URL(googleMapsRouteUrl(route));
  assert.equal(url.origin, 'https://www.google.com');
  assert.equal(url.searchParams.get('origin'), route.origin);
  assert.equal(url.searchParams.get('waypoints'), '100 King St, Sydney|Surry Hills');
  assert.equal(url.searchParams.has('key'), false);
  assert.equal(googleMapsRouteUrl(null), null);
});

test('driving estimates use kilometres and handle trips longer than an hour', () => {
  assert.equal(routeEstimate(15340, 900000), '15.3 km · 15 min');
  assert.equal(routeEstimate(80000, 3660000), '80 km · 1 hr 1 min');
  assert.equal(routeEstimate(undefined, undefined), '');
});
