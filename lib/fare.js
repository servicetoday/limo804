import { buildJourneyRoute } from './journey-route.js';

export const FARE_RULES = Object.freeze({ perKmCents: 400, perMinuteCents: 75, freeWaitingMinutes: 30, minimumTotalCents: 8000, gstPercent: 10, roundingIncrementCents: 500 });

export function roundFareTotal(cents) {
  if (!Number.isSafeInteger(cents) || cents < 0) throw new RangeError('Fare must be a non-negative number of cents.');
  return Math.ceil(cents / FARE_RULES.roundingIncrementCents) * FARE_RULES.roundingIncrementCents;
}

export function calculateFare({ distanceMeters, durationMillis, waitingMinutes = 0, tollCents = 0, tollStatus = 'none' }) {
  if (!Number.isFinite(distanceMeters) || distanceMeters < 0 || !Number.isFinite(durationMillis) || durationMillis < 0) return null;
  if (waitingMinutes === '' || typeof waitingMinutes === 'boolean') return null;
  const waiting = Number(waitingMinutes);
  if (!Number.isInteger(waiting) || waiting < 0 || waiting > 1440) return null;
  if (!Number.isSafeInteger(tollCents) || tollCents < 0 || !['none', 'included', 'unavailable'].includes(tollStatus)) return null;
  const distanceCents = Math.round(distanceMeters * FARE_RULES.perKmCents / 1000);
  const drivingCents = Math.round(durationMillis * FARE_RULES.perMinuteCents / 60000);
  // $72.73 + $7.27 GST is the $80.00 GST-inclusive minimum.
  const minimumBeforeGst = Math.round(FARE_RULES.minimumTotalCents / 1.1);
  const minimumAdjustmentCents = Math.max(0, minimumBeforeGst - distanceCents - drivingCents);
  const billableWaitingMinutes = Math.max(0, waiting - FARE_RULES.freeWaitingMinutes);
  const waitingCents = billableWaitingMinutes * FARE_RULES.perMinuteCents;
  // Extra waiting is added after applying the minimum driving fare.
  const serviceSubtotalCents = distanceCents + drivingCents + minimumAdjustmentCents + waitingCents;
  // Australian toll amounts are already GST-inclusive: add them at face value.
  const tollGstCents = Math.round(tollCents / 11);
  const tollNetCents = tollCents - tollGstCents;
  const unroundedSubtotalCents = serviceSubtotalCents + tollNetCents;
  const unroundedGstCents = Math.round(serviceSubtotalCents * FARE_RULES.gstPercent / 100) + tollGstCents;
  const unroundedTotalCents = unroundedSubtotalCents + unroundedGstCents;
  const totalCents = roundFareTotal(unroundedTotalCents);
  const roundingAdjustmentCents = totalCents - unroundedTotalCents;
  const roundingGstCents = Math.round(roundingAdjustmentCents / 11);
  const roundingNetCents = roundingAdjustmentCents - roundingGstCents;
  const subtotalCents = unroundedSubtotalCents + roundingNetCents;
  const gstCents = unroundedGstCents + roundingGstCents;
  return { currency: 'AUD', distanceMeters, durationMillis, waitingMinutes: waiting, billableWaitingMinutes, distanceCents, drivingCents, minimumAdjustmentCents, waitingCents, tollCents, tollNetCents, tollGstCents, tollStatus, unpricedTollJourneys: tollStatus === 'unavailable' ? 1 : 0, unroundedSubtotalCents, unroundedGstCents, unroundedTotalCents, roundingAdjustmentCents, roundingNetCents, roundingGstCents, subtotalCents, gstCents, totalCents };
}

export function journeyFare(leg) {
  const route = buildJourneyRoute(leg.pickup, leg.dropoff, leg.stops || []);
  if (!route || !leg.routeMetrics || leg.routeMetrics.routeKey !== JSON.stringify(route)) return null;
  return calculateFare({ ...leg.routeMetrics, waitingMinutes: leg.waitingMinutes ?? 0 });
}

export function totalFares(fares) {
  if (!fares.length || fares.some(fare => !fare)) return null;
  return fares.reduce((total, fare) => ({ currency: 'AUD', subtotalCents: total.subtotalCents + fare.subtotalCents, gstCents: total.gstCents + fare.gstCents, totalCents: total.totalCents + fare.totalCents, tollCents: total.tollCents + fare.tollCents, tollNetCents: total.tollNetCents + fare.tollNetCents, unpricedTollJourneys: total.unpricedTollJourneys + fare.unpricedTollJourneys, roundingNetCents: total.roundingNetCents + fare.roundingNetCents, roundingAdjustmentCents: total.roundingAdjustmentCents + fare.roundingAdjustmentCents }), { currency: 'AUD', subtotalCents: 0, gstCents: 0, totalCents: 0, tollCents: 0, tollNetCents: 0, unpricedTollJourneys: 0, roundingNetCents: 0, roundingAdjustmentCents: 0 });
}

export function formatAud(cents) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(cents / 100);
}
