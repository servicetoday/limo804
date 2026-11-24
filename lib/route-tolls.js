function pricedTolls(info) {
  const prices = info.estimatedPrices;
  if (!Array.isArray(prices) || !prices.length) return null;
  let total = 0;
  for (const price of prices) {
    if (price.currencyCode !== 'AUD') return null;
    const units = Number(price.units ?? 0);
    const nanos = Number(price.nanos ?? 0);
    if (!Number.isFinite(units) || !Number.isFinite(nanos) || units < 0 || nanos < 0 || nanos >= 1e9) return null;
    total += Math.round(units * 100 + nanos / 1e7);
  }
  return Number.isSafeInteger(total) ? total : null;
}

export function routeTolls(route) {
  const routeInfo = route.travelAdvisory?.tollInfo;
  // The route-level amount already includes all legs. Do not add them twice.
  const infos = routeInfo ? [routeInfo] : (route.legs || []).flatMap(leg => leg.travelAdvisory?.tollInfo ? [leg.travelAdvisory.tollInfo] : []);
  if (!infos.length) return { tollCents: 0, tollStatus: 'none' };
  const amounts = infos.map(pricedTolls);
  if (amounts.some(amount => amount === null)) return { tollCents: 0, tollStatus: 'unavailable' };
  return { tollCents: amounts.reduce((sum, value) => sum + value, 0), tollStatus: 'included' };
}
