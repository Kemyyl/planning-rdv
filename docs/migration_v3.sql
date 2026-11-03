-- Migration v3 : Table devis
-- Exécuter dans Supabase > SQL Editor

CREATE TABLE IF NOT EXISTS devis (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero          TEXT NOT NULL UNIQUE,
  client_prenom   TEXT NOT NULL,
  client_nom      TEXT NOT NULL,
  client_email    TEXT NOT NULL,
  client_id       UUID REFERENCES clients(id) ON DELETE SET NULL,
  prestation_nom  TEXT NOT NULL,
  duree           INTEGER NOT NULL,
  nb_seances      INTEGER NOT NULL,
  prix_par_seance NUMERIC(10,2) NOT NULL,
  total           NUMERIC(10,2) NOT NULL,
  notes           TEXT,
  validite_jours  INTEGER NOT NULL DEFAULT 30,
  validite_date   DATE NOT NULL,
  statut          TEXT NOT NULL DEFAULT 'envoye'
                    CHECK (statut IN ('envoye','accepte','refuse','expire')),
  email_envoye    BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_devis_created ON devis(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_devis_email   ON devis(client_email);

ALTER TABLE devis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_devis" ON devis USING (true) WITH CHECK (true);
