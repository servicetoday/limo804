import { QuoteError } from './quote-validation.js';

export const passengerCounts = [1, 2, 3, 4, 5, 6, 7];

export function validatePassengerUpdate(input) {
  const validInteger = value => (typeof value === 'number' || typeof value === 'string') && String(value).trim() !== '' && Number.isSafeInteger(Number(value));
  if (!validInteger(input.journeyId) || Number(input.journeyId) < 1 || Number(input.journeyId) > 4294967295) throw new QuoteError('Invalid journey ID.');
  if (!validInteger(input.passengers) || !passengerCounts.includes(Number(input.passengers))) throw new QuoteError('Choose between 1 and 7 passengers.');
  if (!validInteger(input.previousPassengers) || !passengerCounts.includes(Number(input.previousPassengers))) throw new QuoteError('Refresh the booking before updating the passenger count.');
  return { journeyId: Number(input.journeyId), passengers: Number(input.passengers), previousPassengers: Number(input.previousPassengers) };
}

export function checkPassengerCapacity(passengers, capacity) {
  if (capacity != null && passengers > Number(capacity)) throw new QuoteError(`The selected vehicle only has space for ${capacity} passengers.`);
}
