export function validateFleet(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid vehicle data.');
  const text = (key, max, required = false) => {
    if (input[key] !== undefined && typeof input[key] !== 'string') throw new Error(`${key} must be text.`);
    const value = (input[key] || '').trim();
    if (required && !value) throw new Error(`${key} is required.`);
    if (value.length > max) throw new Error(`${key} is too long (maximum ${max} characters).`);
    return value;
  };
  const number = (key, min, max) => {
    if (input[key] === '' || input[key] === null || typeof input[key] === 'boolean') throw new Error(`${key} must be a number.`);
    const value = Number(input[key]);
    if (!Number.isInteger(value) || value < min || value > max) throw new Error(`${key} must be between ${min} and ${max}.`);
    return value;
  };
  const name = text('name', 120, true);
  if (!['sedan', 'suv'].includes(input.category)) throw new Error('Choose Sedans or Luxury SUVs.');
  const image = text('image', 1000, true);
  const localImage = /^\/(?:images|uploads\/fleet)\/[a-zA-Z0-9._/-]+$/.test(image) && !image.includes('..') && !image.includes('//');
  let remoteImage = false;
  try { const url = new URL(image); remoteImage = url.protocol === 'https:' && !url.username && !url.password; } catch {}
  if (!localImage && !remoteImage) throw new Error('Use an uploaded image, a /images/ path or an HTTPS image URL.');
  const features = input.features ?? [];
  if (!Array.isArray(features) || features.length > 10 || features.some(item => typeof item !== 'string' || item.trim().length > 160)) throw new Error('Use up to 10 features, each under 160 characters.');
  if (typeof input.isActive !== 'boolean') throw new Error('Published status must be true or false.');
  return { name, category: input.category, passengers: number('passengers', 1, 7), suitcases: number('suitcases', 0, 20), image, imageAlt: text('imageAlt', 200), tagline: text('tagline', 180), description: text('description', 5000, true), details: text('details', 5000), features: features.map(item => item.trim()).filter(Boolean), isActive: input.isActive, sortOrder: number('sortOrder', 0, 9999) };
}
