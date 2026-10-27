-- Mise à jour pour les anciens déploiements, en conservant les codes existants.
DROP INDEX IF EXISTS idx_one_valid_voucher_per_prize;
ALTER TABLE claims ADD COLUMN color TEXT NOT NULL DEFAULT '';
ALTER TABLE claims ADD COLUMN email_status TEXT NOT NULL DEFAULT 'pending' CHECK (email_status IN ('pending','sending','sent','failed'));
ALTER TABLE claims ADD COLUMN email_attempted_at INTEGER;
CREATE INDEX IF NOT EXISTS idx_claims_email_status ON claims(email_status);
