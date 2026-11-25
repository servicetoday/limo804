export class ContactError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

export function validateContactMessage(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new ContactError('Please enter your contact details.');
  if (typeof input.website === 'string' && input.website.trim()) return { spam: true };
  const field = (name, label, max, required = true) => {
    const value = input[name] ?? '';
    if (typeof value !== 'string' || (required && !value.trim()) || value.trim().length > max) throw new ContactError(`Please enter a valid ${label}${required ? '' : ' or leave it blank'}.`);
    return value.trim();
  };
  const name = field('name', 'name', 100);
  const email = field('email', 'email address', 254).toLowerCase();
  const phone = field('phone', 'phone number', 30, false);
  const message = field('message', 'message (up to 5,000 characters)', 5000);
  if (/[\x00-\x1f\x7f]/.test(name) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ContactError('Please enter a valid name and email address.');
  if (phone && (!/^[\d\s()+.-]+$/.test(phone) || phone.replace(/\D/g, '').length < 6 || /[\r\n]/.test(phone))) throw new ContactError('Please enter a valid phone number or leave it blank.');
  if (message.includes('\0')) throw new ContactError('Please enter a valid message.');
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(input.submissionKey || '')) throw new ContactError('Please refresh the page and try again.');
  return { name, email, phone, message, submissionKey: input.submissionKey.toLowerCase() };
}

export function contactEmailContent(contact, reference) {
  const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const lines = ['New message from the LIMO804 contact form', '', `Reference: ${reference}`, `Name: ${contact.name}`, `Email: ${contact.email}`, `Phone: ${contact.phone || 'Not provided'}`, '', 'Message:', contact.message];
  return {
    subject: `LIMO804 website enquiry: ${contact.name}`,
    text: lines.join('\n'),
    html: `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#182637"><h1 style="font-size:22px">New website enquiry</h1><div style="font-size:14px;line-height:1.8">${lines.map(line => escape(line).replace(/\r?\n/g, '<br>')).join('<br>')}</div></body></html>`,
  };
}
