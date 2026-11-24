'use client';

import { useEffect, useRef, useState } from 'react';
import GoogleMapsScript, { hasGoogleMapsKey } from './GoogleMapsScript';
import { createAddressSearch } from '../../lib/address-suggestions';

export default function AddressInput({ id, value, onChange, ...props }) {
  const [ready, setReady] = useState(false);
  const [focused, setFocused] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [active, setActive] = useState(-1);
  const [unavailable, setUnavailable] = useState(!hasGoogleMapsKey);
  const search = useRef(null);
  const request = useRef(0);
  const selected = useRef('');
  const open = focused && suggestions.length > 0;

  useEffect(() => {
    const version = ++request.current;
    if (!value.trim()) search.current?.reset();
    if (!ready || !focused || value.trim().length < 3 || value === selected.current) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const places = await window.google.maps.importLibrary('places');
        if (cancelled) return;
        search.current ||= createAddressSearch(places);
        const results = await search.current.search(value);
        if (cancelled || version !== request.current) return;
        setSuggestions(results);
        setActive(-1);
        setUnavailable(false);
      } catch {
        if (!cancelled && version === request.current) {
          setSuggestions([]);
          setUnavailable(true);
        }
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [value, ready, focused]);

  useEffect(() => () => { request.current++; }, []);

  function select(prediction) {
    request.current++;
    const text = prediction.text.toString();
    selected.current = text;
    onChange({ target: { value: text } });
    setSuggestions([]);
    setActive(-1);
    // Keep the prediction text so hotel/airport names remain in the journey.
    search.current?.select(prediction).catch(() => {});
  }

  function keyDown(event) {
    if (event.key === 'Escape') {
      request.current++;
      setSuggestions([]);
      setActive(-1);
      return;
    }
    if (!open) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setActive(current => event.key === 'ArrowDown'
        ? (current + 1) % suggestions.length
        : (current <= 0 ? suggestions.length - 1 : current - 1));
    } else if (event.key === 'Enter') {
      // Picking a suggestion must not submit the quote form.
      event.preventDefault();
      select(suggestions[active < 0 ? 0 : active]);
    } else if (event.key === 'Tab') {
      setSuggestions([]);
    }
  }

  return <span className="address-autocomplete">
    <GoogleMapsScript onReady={() => setReady(true)} onError={() => setUnavailable(true)} />
    <input {...props} id={id} value={value} autoComplete="off" role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={open ? `${id}-suggestions` : undefined} aria-activedescendant={open && active >= 0 ? `${id}-suggestion-${active}` : undefined} aria-describedby={unavailable ? `${id}-address-status` : undefined}
      onFocus={() => setFocused(true)}
      onBlur={() => { setFocused(false); setSuggestions([]); setActive(-1); }}
      onChange={event => { request.current++; selected.current = ''; setSuggestions([]); setActive(-1); onChange(event); }}
      onKeyDown={keyDown} />
    {open && <span className="address-suggestions">
      <span id={`${id}-suggestions`} role="listbox" aria-label="Suggested addresses">
        {suggestions.map((prediction, index) => <span key={prediction.placeId} id={`${id}-suggestion-${index}`} role="option" aria-selected={index === active} className={`address-suggestion${index === active ? ' active' : ''}`} onMouseDown={event => event.preventDefault()} onClick={event => { event.preventDefault(); select(prediction); }}>
          <strong>{prediction.mainText?.toString() || prediction.text.toString()}</strong>
          {prediction.secondaryText && <span>{prediction.secondaryText.toString()}</span>}
        </span>)}
      </span>
      <span className="address-attribution" translate="no">Google Maps</span>
    </span>}
    {unavailable && <span id={`${id}-address-status`} className="address-status" role="status">Address suggestions unavailable. Please enter your address.</span>}
  </span>;
}
