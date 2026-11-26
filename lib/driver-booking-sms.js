import 'server-only';
import { Configuration, SmsApi } from 'clicksend';
import { QuoteError } from './quote-validation.js';
import { driverBookingUrl } from './driver-booking-token.js';

export function driverSmsPhone(raw) {
  let phone = String(raw || '').trim().replace(/[\s().-]/g, '');
  if (/^0[45]\d{8}$/.test(phone)) phone = `+61${phone.slice(1)}`;
  else if (/^4\d{8}$/.test(phone)) phone = `+61${phone}`;
  else if (/^00\d+$/.test(phone)) phone = `+${phone.slice(2)}`;
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) throw new QuoteError('Update the driver phone to a valid international number (for example +61412345678).');
  return phone;
}

export function driverBookingSmsContent(booking, driver, notificationType, quote, bookingUrl) {
  const lines = [`Limo804: Hello ${driver.name}.`];
  if (/^DUMMY/i.test(quote?.customer_reference || '')) lines.push('TEST ONLY - do not dispatch.');
  if (notificationType === 'unassigned') {
    lines.push(`You have been unassigned from booking ${booking.reference}. Do not attend any journeys for this booking.`);
  } else {
    lines.push(`You have been assigned booking ${booking.reference}. Status: ${booking.status}.`);
    lines.push(`View booking details: ${bookingUrl}`);
    if (booking.status === 'pending') lines.push('Pending confirmation. Contact dispatch before proceeding.');
  }
  lines.push('Contact Limo804 dispatch for details.');
  return lines.join('\n');
}

export async function sendDriverBookingSms(booking, driver, notificationType, quote) {
  const recipient = driverSmsPhone(driver.phone);
  if (!process.env.CLICKSEND_USERNAME || !process.env.CLICKSEND_API_KEY) throw new QuoteError('ClickSend is not configured. Set CLICKSEND_USERNAME and CLICKSEND_API_KEY.', 503);
  const api = new SmsApi(new Configuration({ username: process.env.CLICKSEND_USERNAME, password: process.env.CLICKSEND_API_KEY }));
  let bookingUrl;
  if (notificationType === 'assigned') {
    try { bookingUrl = driverBookingUrl(booking); }
    catch { throw new QuoteError('Driver booking link is not configured. Check DRIVER_BOOKING_LINK_SECRET or ADMIN_SESSION_SECRET.', 503); }
  }
  let result;
  try {
    const response = await api.sendSms({ sendSmsRequest: { messages: [{
      source: 'sdk', to: recipient,
      ...(process.env.CLICKSEND_FROM ? { from: process.env.CLICKSEND_FROM } : {}),
      body: driverBookingSmsContent(booking, driver, notificationType, quote, bookingUrl),
      custom_string: `booking-${booking.id}-v${booking.driver_assignment_version}-${notificationType}`,
    }] } }, { timeout: 20000 });
    result = response.data;
  } catch (error) {
    // Do not expose Axios errors: they contain the API credentials and request body.
    if (error.response && error.response.status < 500) throw new QuoteError('ClickSend rejected the SMS. Check the account credentials, credit and sender settings.', 502);
    throw new QuoteError('SMS delivery is uncertain. Check ClickSend SMS history before sending another message.', 502);
  }
  const message = result?.data?.messages?.[0];
  if (result?.response_code !== 'SUCCESS' || message?.status !== 'SUCCESS' || !message.message_id) {
    throw new QuoteError('ClickSend did not confirm the SMS. Check ClickSend SMS history for the result.', 502);
  }
  return { status: 'accepted', recipient, notificationType, messageId: message.message_id };
}
