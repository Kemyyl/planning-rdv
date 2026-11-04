-- Migration RGPD : traçabilité du droit à l'oubli
-- Ajoute une colonne pour horodater l'anonymisation d'un client

BEGIN;

ALTER TABLE clients ADD COLUMN IF NOT EXISTS rgpd_oublie_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_clients_rgpd_oublie ON clients(rgpd_oublie_at)
  WHERE rgpd_oublie_at IS NOT NULL;

COMMIT;
