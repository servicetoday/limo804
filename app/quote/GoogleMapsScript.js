'use client';

import Script from 'next/script';

const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
export const hasGoogleMapsKey = Boolean(apiKey);

export default function GoogleMapsScript({ onReady, onError }) {
  if (!apiKey) return null;
  return <Script id="google-address-places" src={`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&v=weekly&language=en&region=AU`} strategy="afterInteractive" onLoad={onReady} onReady={onReady} onError={onError} />;
}
