export function buildJourneyRoute(pickup, dropoff, stops = []) {
  const locations = [pickup, ...stops.map(stop => stop.location), dropoff].map(value => (value || '').trim());
  // Do not draw a partial route that silently omits an unfinished stop.
  if (locations.some(location => !location)) return null;
  return {
    origin: locations[0],
    destination: locations.at(-1),
    intermediates: locations.slice(1, -1).map(location => ({ location })),
    travelMode: 'DRIVING',
    optimizeWaypointOrder: false,
    extraComputations: ['TOLLS'],
    fields: ['path', 'legs', 'distanceMeters', 'durationMillis', 'warnings', 'travelAdvisory'],
  };
}

export function googleMapsRouteUrl(route) {
  if (!route) return null;
  const params = new URLSearchParams({ api: '1', origin: route.origin, destination: route.destination, travelmode: 'driving' });
  if (route.intermediates.length) params.set('waypoints', route.intermediates.map(point => point.location).join('|'));
  return `https://www.google.com/maps/dir/?${params}`;
}

export function routeEstimate(distanceMeters, durationMillis) {
  const distance = Number.isFinite(distanceMeters) ? `${(distanceMeters / 1000).toLocaleString('en-AU', { maximumFractionDigits: 1 })} km` : '';
  let duration = '';
  if (Number.isFinite(durationMillis)) {
    const minutes = Math.max(1, Math.ceil(durationMillis / 60000));
    duration = minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} hr${minutes % 60 ? ` ${minutes % 60} min` : ''}`;
  }
  return [distance, duration].filter(Boolean).join(' · ');
}
