-- Migration v5 : Factures sur les devis
-- Exécuter dans Supabase > SQL Editor

ALTER TABLE devis
  ADD COLUMN IF NOT EXISTS facture_numero TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS facture_date   DATE;
