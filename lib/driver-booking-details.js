import 'server-only';
import { db } from './db';
import { getQuote } from './quotes';
import { QuoteError } from './quote-validation';
import { currentDriverBookingToken, driverBookingTokenId } from './driver-booking-token.js';

export async function getDriverBookingDetails(token) {
  const id = driverBookingTokenId(token);
  if (!id) throw new QuoteError('Booking link is unavailable.', 404);
  const [rows] = await db.execute(`SELECT b.*, d.name AS driver_name, d.vehicle_registration,
    f.name AS vehicle_name FROM bookings b
    JOIN drivers d ON d.id = b.assigned_driver_id
    LEFT JOIN fleet f ON f.id = b.assigned_fleet_id WHERE b.id = ?`, [id]);
  const booking = rows[0];
  if (!currentDriverBookingToken(token, booking)) throw new QuoteError('Booking link is unavailable.', 404);
  const quote = await getQuote(booking.quote_id);
  if (!quote) throw new QuoteError('Booking link is unavailable.', 404);
  // Return only information needed by the driver, never admin history or mail logs.
  return {
    reference: booking.reference, status: booking.status, driverName: booking.driver_name,
    vehicleName: booking.vehicle_name || 'To be arranged', registration: booking.vehicle_registration,
    amount: booking.total_amount, currency: booking.currency,
    passengerName: quote.passenger_snapshot.displayName,
    passengerPhone: [quote.passenger_snapshot.countryCode, quote.passenger_snapshot.mobile].filter(Boolean).join(' '),
    durationHours: quote.duration_hours, pickupSign: quote.pickup_sign_name, chauffeurNote: quote.chauffeur_note,
    isTest: /^DUMMY/i.test(quote.customer_reference || ''),
    journeys: quote.journeys.map(journey => ({
      sequence: journey.sequence_number, pickup: journey.pickup_location, dropoff: journey.dropoff_location,
      date: journey.pickup_local_date, time: journey.pickup_local_time?.slice(0, 5), timezone: journey.timezone,
      passengers: journey.passengers, flight: journey.arriving_flight, flightBased: journey.timing_source === 'flight',
      stops: journey.stops.map(stop => stop.location),
    })),
  };
}
