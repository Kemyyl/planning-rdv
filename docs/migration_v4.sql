-- Migration v4 : Visibilité client des prestations
-- Exécuter dans Supabase > SQL Editor

ALTER TABLE prestations
  ADD COLUMN IF NOT EXISTS visible_client BOOLEAN NOT NULL DEFAULT true;
