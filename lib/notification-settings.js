export const adminNotificationEmail = 'admin@limo804.com.au';

export function isSyntheticNotification(quote) {
  return /^DUMMY/i.test(quote.customer_reference || '') || /\.(invalid|test|example)$/i.test(quote.customer_snapshot?.email || '');
}
