export function validateCustomer(details) {
  for (const [field, label] of [['firstName', 'first name'], ['lastName', 'last name']]) {
    if (!details[field]?.trim()) return { field, message: `Please enter your ${label}.` };
  }
  const digits = (details.mobile || '').replace(/\D/g, '');
  if (!/^[\d\s()+.-]+$/.test(details.mobile || '') || digits.length < 6 || digits.length > 14) return { field: 'mobile', message: 'Please enter a valid mobile number.' };
  const validEmail = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((value || '').trim());
  if (!validEmail(details.email)) return { field: 'email', message: 'Please enter a valid email address.' };
  if (details.someoneElse) {
    if (!details.bookerName?.trim()) return { field: 'bookerName', message: 'Please enter your full name.' };
    if (!validEmail(details.bookerEmail)) return { field: 'bookerEmail', message: 'Please enter your contact email address.' };
  }
  return null;
}
