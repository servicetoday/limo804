CREATE TABLE IF NOT EXISTS customers (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  contact_key CHAR(64) NOT NULL UNIQUE,
  first_name VARCHAR(100) NOT NULL DEFAULT '',
  last_name VARCHAR(100) NOT NULL DEFAULT '',
  display_name VARCHAR(201) NOT NULL,
  email VARCHAR(254) NOT NULL,
  country_code VARCHAR(5) NULL,
  mobile VARCHAR(30) NULL,
  created_at DATETIME NOT NULL,
  INDEX idx_customer_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS quotes (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  reference VARCHAR(32) NOT NULL UNIQUE,
  submission_key CHAR(36) NOT NULL UNIQUE,
  request_hash CHAR(64) NOT NULL,
  customer_id INT UNSIGNED NOT NULL,
  passenger_id INT UNSIGNED NOT NULL,
  customer_snapshot JSON NOT NULL,
  passenger_snapshot JSON NOT NULL,
  booking_for_someone_else BOOLEAN NOT NULL DEFAULT FALSE,
  status ENUM('submitted','quoted','accepted','declined','expired','converted') NOT NULL DEFAULT 'submitted',
  service_type ENUM('transfer','hourly') NOT NULL,
  journey_type ENUM('one-way','return','multi-trip') NOT NULL,
  preferred_category ENUM('sedan','suv') NULL,
  preferred_fleet_id INT UNSIGNED NULL,
  vehicle_name_snapshot VARCHAR(120) NULL,
  duration_hours TINYINT UNSIGNED NULL,
  pickup_sign_name VARCHAR(100) NOT NULL DEFAULT '',
  chauffeur_note TEXT NOT NULL,
  customer_reference VARCHAR(100) NOT NULL DEFAULT '',
  voucher_code VARCHAR(100) NOT NULL DEFAULT '',
  flight_itinerary TEXT NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'AUD',
  quoted_total DECIMAL(10,2) NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT fk_quote_customer FOREIGN KEY (customer_id) REFERENCES customers(id),
  CONSTRAINT fk_quote_passenger FOREIGN KEY (passenger_id) REFERENCES customers(id),
  CONSTRAINT fk_quote_fleet FOREIGN KEY (preferred_fleet_id) REFERENCES fleet(id) ON DELETE SET NULL,
  INDEX idx_quote_status_date (status, created_at),
  INDEX idx_quote_customer_date (customer_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS quote_journeys (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  quote_id INT UNSIGNED NOT NULL,
  sequence_number TINYINT UNSIGNED NOT NULL,
  leg_type ENUM('outbound','return','additional') NOT NULL,
  pickup_location VARCHAR(300) NOT NULL,
  dropoff_location VARCHAR(300) NULL,
  pickup_local_date DATE NULL,
  pickup_local_time TIME NULL,
  pickup_at_utc DATETIME NULL,
  timezone VARCHAR(64) NOT NULL DEFAULT 'Australia/Sydney',
  passengers TINYINT UNSIGNED NOT NULL,
  timing_source ENUM('manual','flight') NOT NULL,
  arriving_flight VARCHAR(10) NOT NULL DEFAULT '',
  flight_unknown BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT fk_journey_quote FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE,
  UNIQUE KEY uq_quote_journey_sequence (quote_id, sequence_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS quote_stops (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  journey_id INT UNSIGNED NOT NULL,
  sequence_number TINYINT UNSIGNED NOT NULL,
  location VARCHAR(300) NOT NULL,
  CONSTRAINT fk_stop_journey FOREIGN KEY (journey_id) REFERENCES quote_journeys(id) ON DELETE CASCADE,
  UNIQUE KEY uq_journey_stop_sequence (journey_id, sequence_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS quote_attachments (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  quote_id INT UNSIGNED NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  storage_name VARCHAR(64) NOT NULL UNIQUE,
  mime_type VARCHAR(100) NOT NULL,
  size_bytes INT UNSIGNED NOT NULL,
  sha256 CHAR(64) NOT NULL,
  created_at DATETIME NOT NULL,
  CONSTRAINT fk_attachment_quote FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS quote_status_history (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  quote_id INT UNSIGNED NOT NULL,
  from_status VARCHAR(20) NULL,
  to_status VARCHAR(20) NOT NULL,
  actor VARCHAR(100) NOT NULL,
  note TEXT NOT NULL,
  created_at DATETIME NOT NULL,
  CONSTRAINT fk_history_quote FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE,
  INDEX idx_quote_history (quote_id, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bookings (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  reference VARCHAR(32) NOT NULL UNIQUE,
  quote_id INT UNSIGNED NOT NULL UNIQUE,
  status ENUM('pending','confirmed','cancelled','completed') NOT NULL DEFAULT 'pending',
  total_amount DECIMAL(10,2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'AUD',
  assigned_fleet_id INT UNSIGNED NULL,
  created_at DATETIME NOT NULL,
  confirmed_at DATETIME NULL,
  CONSTRAINT fk_booking_quote FOREIGN KEY (quote_id) REFERENCES quotes(id),
  CONSTRAINT fk_booking_fleet FOREIGN KEY (assigned_fleet_id) REFERENCES fleet(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
