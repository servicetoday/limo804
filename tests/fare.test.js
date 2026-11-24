import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateFare, journeyFare, totalFares, formatAud, roundFareTotal } from '../lib/fare.js';
import { buildJourneyRoute } from '../lib/journey-route.js';

test('rounds totals up to the next $5 while leaving exact multiples unchanged', () => {
  assert.equal(roundFareTotal(14899), 15000);
  assert.equal(roundFareTotal(15000), 15000);
  assert.equal(roundFareTotal(15001), 15500);
  assert.equal(roundFareTotal(8000), 8000);
});

test('rounding follows GST and tolls, and its tax breakdown reconciles', () => {
  const fare = calculateFare({ distanceMeters: 20000, durationMillis: 1800000, tollCents: 1114, tollStatus: 'included' });
  assert.equal(fare.unroundedTotalCents, 12389);
  assert.equal(fare.totalCents, 12500);
  assert.equal(fare.roundingAdjustmentCents, 111);
  assert.equal(fare.roundingNetCents + fare.roundingGstCents, fare.roundingAdjustmentCents);
  assert.equal(fare.subtotalCents + fare.gstCents, fare.totalCents);
  assert.equal(fare.distanceCents + fare.drivingCents + fare.minimumAdjustmentCents + fare.waitingCents + fare.tollNetCents + fare.roundingNetCents, fare.subtotalCents);
});

test('combined prices equal the sum of rounded journeys without a second round-up', () => {
  const fare = calculateFare({ distanceMeters: 20000, durationMillis: 1800000 });
  const total = totalFares([fare, fare]);
  assert.equal(total.totalCents, 23000);
  assert.equal(total.totalCents, 2 * fare.totalCents);
  assert.equal(total.roundingAdjustmentCents, 2 * fare.roundingAdjustmentCents);
  assert.equal(total.subtotalCents + total.gstCents, total.totalCents);
});

test('charges distance plus driving time and then 10% GST', () => {
  const fare = calculateFare({ distanceMeters: 20000, durationMillis: 1800000 });
  assert.equal(fare.distanceCents, 8000);
  assert.equal(fare.drivingCents, 2250);
  assert.equal(fare.unroundedGstCents, 1025);
  assert.equal(fare.totalCents, 11500);
});

test('the minimum is exactly $80 including GST, rather than $80 plus GST', () => {
  const fare = calculateFare({ distanceMeters: 1000, durationMillis: 120000 });
  assert.equal(fare.totalCents, 8000);
  assert.equal(fare.subtotalCents, 7273);
  assert.equal(fare.gstCents, 727);
  assert.equal(fare.distanceCents + fare.drivingCents + fare.minimumAdjustmentCents, fare.subtotalCents);
});

test('waiting up to and including 30 minutes is free', () => {
  for (const waitingMinutes of [0, 29, 30]) {
    const fare = calculateFare({ distanceMeters: 1000, durationMillis: 120000, waitingMinutes });
    assert.equal(fare.waitingCents, 0);
    assert.equal(fare.totalCents, 8000);
  }
});

test('waiting beyond 30 minutes is added after the minimum and attracts GST', () => {
  const fare = calculateFare({ distanceMeters: 1000, durationMillis: 120000, waitingMinutes: '35' });
  assert.equal(fare.billableWaitingMinutes, 5);
  assert.equal(fare.waitingCents, 375);
  assert.equal(fare.unroundedSubtotalCents, 7648);
  assert.equal(fare.unroundedGstCents, 765);
  assert.equal(fare.totalCents, 8500);
});

test('wait charges are also added to journeys above the minimum', () => {
  const fare = calculateFare({ distanceMeters: 20000, durationMillis: 1800000, waitingMinutes: 45 });
  assert.equal(fare.minimumAdjustmentCents, 0);
  assert.equal(fare.waitingCents, 1125);
  assert.equal(fare.totalCents, 13000);
});

test('fractional kilometres and driving minutes are calculated rather than rounded up', () => {
  const fare = calculateFare({ distanceMeters: 20123, durationMillis: 1830000 });
  assert.equal(fare.distanceCents, 8049);
  assert.equal(fare.drivingCents, 2288);
  assert.equal(fare.subtotalCents + fare.gstCents, fare.totalCents);
});

test('invalid metrics or waiting time cannot produce a price', () => {
  for (const distanceMeters of [undefined, NaN, Infinity, -1]) assert.equal(calculateFare({ distanceMeters, durationMillis: 1000 }), null);
  for (const waitingMinutes of ['', -1, 1.5, 'abc', true, 1441]) assert.equal(calculateFare({ distanceMeters: 1000, durationMillis: 1000, waitingMinutes }), null);
  assert.equal(calculateFare({ distanceMeters: 1000, durationMillis: -1 }), null);
});

test('changing a stop invalidates the previous route price', () => {
  const leg = { pickup: 'Sydney Airport', dropoff: 'Circular Quay', stops: [{ location: 'Mascot' }] };
  leg.routeMetrics = { routeKey: JSON.stringify(buildJourneyRoute(leg.pickup, leg.dropoff, leg.stops)), distanceMeters: 20000, durationMillis: 1800000 };
  assert.equal(journeyFare(leg).totalCents, 11500);
  assert.equal(journeyFare({ ...leg, stops: [{ location: 'Surry Hills' }] }), null);
  assert.equal(journeyFare({ ...leg, dropoff: '' }), null);
});

test('return and multi-trip totals apply a minimum independently to each journey', () => {
  const fare = calculateFare({ distanceMeters: 1000, durationMillis: 120000 });
  assert.equal(totalFares([fare, fare]).totalCents, 16000);
  assert.equal(totalFares([fare, fare, fare]).totalCents, 24000);
  assert.equal(totalFares([fare, null]), null);
  assert.equal(totalFares([]), null);
  const total = totalFares([fare, fare]);
  assert.equal(total.subtotalCents + total.gstCents, total.totalCents);
  assert.equal(formatAud(total.totalCents), '$160.00');
});

test('GST-inclusive tolls are added at face value after the minimum fare', () => {
  const fare = calculateFare({ distanceMeters: 1000, durationMillis: 120000, tollCents: 1114, tollStatus: 'included' });
  assert.equal(fare.totalCents, 9500);
  assert.equal(fare.tollGstCents, 101);
  assert.equal(fare.tollNetCents, 1013);
  assert.equal(fare.subtotalCents + fare.gstCents, fare.totalCents);
});

test('a fare above the minimum adds tolls without charging GST twice', () => {
  const base = calculateFare({ distanceMeters: 20000, durationMillis: 1800000 });
  const fare = calculateFare({ distanceMeters: 20000, durationMillis: 1800000, tollCents: 1114, tollStatus: 'included' });
  assert.equal(fare.unroundedTotalCents, base.unroundedTotalCents + 1114);
  assert.equal(fare.totalCents, 12500);
});

test('combined return and multi-trip fares preserve toll totals and unpriced-toll flags', () => {
  const priced = calculateFare({ distanceMeters: 1000, durationMillis: 120000, tollCents: 1114, tollStatus: 'included' });
  const unpriced = calculateFare({ distanceMeters: 1000, durationMillis: 120000, tollStatus: 'unavailable' });
  const total = totalFares([priced, priced, unpriced]);
  assert.equal(total.tollCents, 2228);
  assert.equal(total.unpricedTollJourneys, 1);
  assert.equal(total.totalCents, 27000);
  assert.equal(total.subtotalCents + total.gstCents, total.totalCents);
});
