'use client';

import { useEffect, useRef, useState } from 'react';
import { ExternalLink, MapPin, RotateCw } from 'lucide-react';
import GoogleMapsScript, { hasGoogleMapsKey } from './GoogleMapsScript';
import { buildJourneyRoute, googleMapsRouteUrl, routeEstimate } from '../../lib/journey-route';
import { calculateFare } from '../../lib/fare';
import FareEstimate from './FareEstimate';
import { routeTolls } from '../../lib/route-tolls';

export default function JourneyMap({ pickup, dropoff, stops = [], active = true, title = 'Route preview', onRouteMetrics, waitingMinutes = 0, onWaitingChange, waitingName = 'waitingMinutes' }) {
  const container = useRef(null);
  const map = useRef(null);
  const [ready, setReady] = useState(false);
  const [scriptError, setScriptError] = useState(!hasGoogleMapsKey);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState(null);
  const metricsCallback = useRef(onRouteMetrics);
  const route = buildJourneyRoute(pickup, dropoff, stops);
  const routeKey = JSON.stringify(route);
  const loaded = result?.key === routeKey && result.status === 'loaded';
  const failed = scriptError || (result?.key === routeKey && result.status === 'error');
  const locations = route ? [route.origin, ...route.intermediates.map(point => point.location), route.destination] : [];
  const fare = loaded ? calculateFare({ distanceMeters: result.distanceMeters, durationMillis: result.durationMillis, waitingMinutes, ...result.tolls }) : null;

  useEffect(() => { metricsCallback.current = onRouteMetrics; }, [onRouteMetrics]);
  useEffect(() => {
    metricsCallback.current?.(result?.key === routeKey && result.status === 'loaded'
      ? { routeKey, distanceMeters: result.distanceMeters, durationMillis: result.durationMillis, ...result.tolls }
      : null);
  }, [result, routeKey]);

  useEffect(() => {
    const request = JSON.parse(routeKey);
    if (!ready || !active || !request || scriptError) return;
    setResult({ key: routeKey, status: 'loading' });
    let cancelled = false;
    let polylines = [];
    let markers = [];
    // Address changes, stop reordering and swaps all produce a fresh route.
    const timer = setTimeout(async () => {
      try {
        const [{ Map }, { Route }, { LatLngBounds }] = await Promise.all([
          window.google.maps.importLibrary('maps'),
          window.google.maps.importLibrary('routes'),
          window.google.maps.importLibrary('core'),
        ]);
        if (cancelled) return;
        const { routes } = await Route.computeRoutes(request);
        if (cancelled) return;
        const route = routes?.[0];
        if (!route?.path?.length) throw new Error('No driving route found.');
        if (!map.current) {
          map.current = new Map(container.current, {
            center: { lat: -33.8688, lng: 151.2093 },
            zoom: 11,
            mapId: process.env.NEXT_PUBLIC_GOOGLE_MAP_ID || 'DEMO_MAP_ID',
            mapTypeControl: false,
            streetViewControl: false,
            scrollwheel: false,
            gestureHandling: 'cooperative',
          });
        }
        // Keep markers detached until this request is still the latest one.
        const points = [request.origin, ...request.intermediates.map(point => point.location), request.destination];
        markers = await route.createWaypointAdvancedMarkers((options, { index }) => ({
          ...options,
          title: `${String.fromCharCode(65 + index)}: ${points[index]}`,
        }));
        if (cancelled) return;
        polylines = route.createPolylines();
        polylines.forEach(line => line.setMap(map.current));
        markers.forEach(marker => { marker.map = map.current; });
        const bounds = new LatLngBounds();
        route.path.forEach(point => bounds.extend(point));
        map.current.fitBounds(bounds, 45);
        setResult({ key: routeKey, status: 'loaded', distanceMeters: route.distanceMeters, durationMillis: route.durationMillis, tolls: routeTolls(route), estimate: routeEstimate(route.distanceMeters, route.durationMillis), warnings: route.warnings || [] });
      } catch {
        polylines.forEach(line => line.setMap(null));
        markers.forEach(marker => { marker.map = null; });
        if (!cancelled) setResult({ key: routeKey, status: 'error' });
      }
    }, 700);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      polylines.forEach(line => line.setMap(null));
      markers.forEach(marker => { marker.map = null; });
    };
  }, [routeKey, ready, active, attempt, scriptError]);

  return <section className="journey-map" aria-label={title}>
    <GoogleMapsScript onReady={() => { setReady(true); setScriptError(false); }} onError={() => setScriptError(true)} />
    <div className="journey-map-heading"><span><MapPin size={15} />{title}</span>{route && <a href={googleMapsRouteUrl(route)} target="_blank" rel="noopener noreferrer">Open in Maps<ExternalLink size={12} /></a>}</div>
    <div className={`journey-map-frame${route ? ' has-route' : ''}`} aria-busy={Boolean(route && !loaded && !failed)}>
      <div ref={container} className="journey-map-canvas" style={{ visibility: loaded ? 'visible' : 'hidden' }} role="region" aria-label={`${title}: driving directions`} />
      {!loaded && <div className="journey-map-message" role="status"><MapPin size={22} /><p>{!route ? 'Add pick-up, drop-off and any stops to see your route.' : failed ? 'We couldn’t display this route. Check the addresses or open it in Google Maps.' : 'Updating your route…'}</p>{route && failed && !scriptError && <button type="button" onClick={() => { setResult(null); setAttempt(value => value + 1); }}><RotateCw size={13} />Try again</button>}</div>}
    </div>
    {loaded && <div className="journey-map-details">
      {result.estimate && <p className="journey-map-estimate">{result.estimate}<span>Estimated driving time, excluding time at stops.</span></p>}
      {onWaitingChange && <label className="fare-waiting"><span>Planned waiting (minutes)<small>First 30 minutes free, per journey.</small></span><input name={waitingName} type="number" min="0" max="1440" step="1" required value={waitingMinutes} onChange={event => onWaitingChange(event.target.value)} inputMode="numeric" /></label>}
      <FareEstimate fare={fare} />
      <ol className="journey-map-locations">{locations.map((location, index) => <li key={index}><span>{String.fromCharCode(65 + index)}</span><span><small>{index === 0 ? 'Pick-up' : index === locations.length - 1 ? 'Drop-off' : `Stop ${index}`}</small>{location}</span></li>)}</ol>
      {result.warnings.map((warning, index) => <p key={index} className="journey-map-warning">{warning}</p>)}
    </div>}
  </section>;
}
