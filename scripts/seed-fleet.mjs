import mysql from 'mysql2/promise';
import nextEnv from '@next/env';
import { validateFleet } from '../lib/fleet-validation.js';

nextEnv.loadEnvConfig(process.cwd());

const samples = [
  {
    name: 'Executive Sedan', category: 'sedan', passengers: 3, suitcases: 3,
    image: '/images/fleet-sedan.jpg', imageAlt: 'White BMW sedan on a palm-lined road',
    tagline: 'Understated elegance. Effortless travel.',
    description: 'A refined choice for solo travellers, couples and business journeys. Enjoy a comfortable ride to the airport, your next meeting or a special evening in Sydney.',
    details: 'Sample fleet entry with illustrative photography and capacity. Update this vehicle in Fleet Admin to match your actual fleet. Confirm luggage requirements and vehicle availability before booking.',
    features: ['Airport and hotel transfers', 'Corporate and executive travel', 'Private evenings and special occasions'],
    isActive: true, sortOrder: 10,
  },
  {
    name: 'Luxury SUV', category: 'suv', passengers: 6, suitcases: 4,
    image: '/images/fleet-suv.jpg', imageAlt: 'Black Mercedes-Benz SUV on a tree-lined road',
    tagline: 'More room. The same sense of occasion.',
    description: 'Make space for the whole journey. A spacious option for families, small groups and travellers who would like extra room for an airport transfer, day out or special occasion.',
    details: 'Sample fleet entry with illustrative photography and capacity. Update this vehicle in Fleet Admin to match your actual fleet. Seating and luggage space depend on the vehicle configuration; confirm your requirements with the team.',
    features: ['Family airport transfers', 'Small groups travelling together', 'Day trips and special occasions'],
    isActive: true, sortOrder: 20,
  },
].map(validateFleet);

const connection = await mysql.createConnection({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER, password: process.env.DB_PASSWORD || '', database: process.env.DB_NAME });
let locked = false;
try {
  const [locks] = await connection.execute("SELECT GET_LOCK('limo804_seed_fleet', 10) AS acquired");
  if (locks[0].acquired !== 1) throw new Error('Another fleet seed is running. Try again shortly.');
  locked = true;
  await connection.beginTransaction();
  for (const vehicle of samples) {
    const [existing] = await connection.execute('SELECT id FROM fleet WHERE name = ? AND category = ? LIMIT 1', [vehicle.name, vehicle.category]);
    if (existing.length) { console.log(`Skipped existing vehicle: ${vehicle.name}`); continue; }
    await connection.execute('INSERT INTO fleet (name, category, passengers, suitcases, image, image_alt, tagline, description, details, features, is_active, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [vehicle.name, vehicle.category, vehicle.passengers, vehicle.suitcases, vehicle.image, vehicle.imageAlt, vehicle.tagline, vehicle.description, vehicle.details, JSON.stringify(vehicle.features), vehicle.isActive, vehicle.sortOrder]);
    console.log(`Added published sample: ${vehicle.name}`);
  }
  await connection.commit();
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  if (locked) await connection.execute("SELECT RELEASE_LOCK('limo804_seed_fleet')");
  await connection.end();
}
