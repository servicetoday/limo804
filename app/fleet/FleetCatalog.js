'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Armchair, CarFront, Check, ChevronDown, Luggage } from 'lucide-react';

const categories = [{ id: 'sedan', name: 'Sedans' }, { id: 'suv', name: 'Luxury SUVs' }];

export default function FleetCatalog({ vehicles = [], unavailable = false }) {
  const [category, setCategory] = useState('all');
  const visible = vehicles.filter(vehicle => category === 'all' || category === vehicle.category);
  return <>
    <div className="fleet-catalog-heading"><div><p className="eyebrow">Find your perfect arrival</p><h2>Choose your class of comfort.</h2></div><div className="fleet-filters" role="group" aria-label="Filter fleet categories">{[{ id: 'all', name: 'All vehicles' }, ...categories].map(item => <button key={item.id} type="button" aria-pressed={category === item.id} className={category === item.id ? 'selected' : ''} onClick={() => setCategory(item.id)}>{item.name}</button>)}</div></div>
    <p className="fleet-results" role="status">Showing {visible.length} {visible.length === 1 ? 'vehicle' : 'vehicles'}</p>
    {visible.length === 0 && <div className="public-fleet-empty"><CarFront size={38} /><h3>{unavailable ? 'Our fleet is temporarily unavailable.' : 'Our fleet is being updated.'}</h3><p>{unavailable ? 'Please contact our team for vehicle options.' : 'Contact our team to discuss available vehicles in this category.'}</p><Link className="gold-button" href="/quote">Enquire about a vehicle</Link></div>}
    <div className="fleet-vehicle-grid">{visible.map(vehicle => <article className="fleet-vehicle-card" key={vehicle.id} id={`vehicle-${vehicle.id}`}>
      <div className="fleet-vehicle-photo"><img src={vehicle.image} alt={vehicle.imageAlt || vehicle.name} width={1400} height={933} /><span><CarFront size={15} />{vehicle.category === 'sedan' ? 'Sedans' : 'Luxury SUVs'}</span></div>
      <div className="fleet-vehicle-body"><p className="vehicle-tagline">{vehicle.tagline}</p><h3>{vehicle.name}</h3><div className="vehicle-capacities"><span aria-label={`Up to ${vehicle.passengers} passengers`}><Armchair size={20} strokeWidth={1.6} aria-hidden="true" />Up to {vehicle.passengers}</span><span><Luggage size={20} strokeWidth={1.6} aria-hidden="true" />{vehicle.suitcases} Suitcase{vehicle.suitcases === 1 ? '' : 's'}</span></div><p className="capacity-caption">Share any oversized luggage with our team before booking.</p><p className="vehicle-description">{vehicle.description}</p><ul>{vehicle.features.map(use => <li key={use}><Check size={16} />{use}</li>)}</ul>{vehicle.details && <details className="vehicle-details"><summary>More about this category<ChevronDown size={17} /></summary><p>{vehicle.details}</p></details>}<Link className="gold-button" href={`/quote?vehicle=${vehicle.category}&fleet=${vehicle.id}`}>Request a {vehicle.category === 'sedan' ? 'sedan' : 'luxury SUV'}</Link></div>
    </article>)}</div>
    <p className="fleet-catalog-note">Vehicle availability, luggage requirements and your final vehicle assignment will be confirmed with your quote.</p>
  </>;
}
