PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS vouchers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code_hash TEXT NOT NULL UNIQUE,
  prize TEXT NOT NULL CHECK (prize IN ('tshirt','mug','mousepad')),
  created_at INTEGER NOT NULL,
  pending_hash TEXT,
  pending_until INTEGER,
  consumed_at INTEGER,
  revoked_at INTEGER
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_valid_voucher_per_prize
  ON vouchers(prize) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_voucher_pending ON vouchers(pending_hash);
CREATE TABLE IF NOT EXISTS claims (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  voucher_id INTEGER NOT NULL UNIQUE REFERENCES vouchers(id),
  prize TEXT NOT NULL,
  full_name TEXT NOT NULL,
  address1 TEXT NOT NULL,
  address2 TEXT,
  city TEXT NOT NULL,
  zip TEXT NOT NULL,
  state TEXT,
  country_code TEXT NOT NULL,
  company TEXT,
  email TEXT,
  phone TEXT,
  size TEXT,
  created_at INTEGER NOT NULL,
  fulfillment_status TEXT NOT NULL DEFAULT 'pending' CHECK (fulfillment_status IN ('pending','shipped'))
);
CREATE INDEX IF NOT EXISTS idx_claims_created ON claims(created_at);
