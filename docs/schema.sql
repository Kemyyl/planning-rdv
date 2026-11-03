-- ============================================================
-- Synégo · Planning RDV · Schéma Supabase
-- Exécuter dans Supabase > SQL Editor
-- ============================================================

-- extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── tables ──────────────────────────────────────────────────

CREATE TABLE clients (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom           TEXT NOT NULL,
  prenom        TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  telephone     TEXT,
  date_consentement TIMESTAMPTZ DEFAULT NOW(),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE prestations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom         TEXT NOT NULL,
  description TEXT,
  duree       INTEGER NOT NULL,   -- minutes
  prix        NUMERIC(10,2),
  couleur     TEXT DEFAULT '#6CAED6',
  actif       BOOLEAN DEFAULT TRUE,
  ordre       INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE horaires (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jour        INTEGER NOT NULL CHECK (jour BETWEEN 0 AND 6), -- 0=Lun … 6=Dim
  ouverture   TIME,
  fermeture   TIME,
  actif       BOOLEAN DEFAULT TRUE
);

CREATE TABLE admins (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL UNIQUE,
  mot_de_passe  TEXT NOT NULL,   -- bcrypt
  nom           TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE rendez_vous (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id        UUID REFERENCES clients(id) ON DELETE SET NULL,
  prestation_id    UUID REFERENCES prestations(id) ON DELETE SET NULL,
  debut            TIMESTAMPTZ NOT NULL,
  fin              TIMESTAMPTZ NOT NULL,
  statut           TEXT NOT NULL DEFAULT 'confirme'
                     CHECK (statut IN ('confirme','annule','en_attente')),
  commentaire      TEXT,
  google_event_id  TEXT,
  jeton_annulation TEXT DEFAULT encode(gen_random_bytes(32),'hex'),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tickets (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auteur     TEXT NOT NULL,
  email      TEXT NOT NULL,
  sujet      TEXT NOT NULL,
  message    TEXT NOT NULL,
  statut     TEXT NOT NULL DEFAULT 'ouvert'
               CHECK (statut IN ('ouvert','en_cours','clos')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── index ───────────────────────────────────────────────────

CREATE INDEX idx_rdv_debut    ON rendez_vous(debut);
CREATE INDEX idx_rdv_client   ON rendez_vous(client_id);
CREATE INDEX idx_rdv_statut   ON rendez_vous(statut);
CREATE INDEX idx_cli_email    ON clients(email);

-- ── row level security ──────────────────────────────────────

ALTER TABLE clients      ENABLE ROW LEVEL SECURITY;
ALTER TABLE prestations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE horaires     ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins       ENABLE ROW LEVEL SECURITY;
ALTER TABLE rendez_vous  ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets      ENABLE ROW LEVEL SECURITY;

-- lecture publique : prestations & horaires
CREATE POLICY "public_read_prestations" ON prestations FOR SELECT USING (true);
CREATE POLICY "public_read_horaires"    ON horaires    FOR SELECT USING (true);

-- réservation publique
CREATE POLICY "public_insert_clients"  ON clients     FOR INSERT WITH CHECK (true);
CREATE POLICY "public_read_rdv"        ON rendez_vous FOR SELECT USING (true);
CREATE POLICY "public_insert_rdv"      ON rendez_vous FOR INSERT WITH CHECK (true);
CREATE POLICY "public_update_rdv"      ON rendez_vous FOR UPDATE USING (true);
CREATE POLICY "public_insert_tickets"  ON tickets     FOR INSERT WITH CHECK (true);

-- ── données par défaut ──────────────────────────────────────

INSERT INTO horaires (jour, ouverture, fermeture, actif) VALUES
  (0, '09:00', '18:00', true),
  (1, '09:00', '18:00', true),
  (2, '09:00', '18:00', true),
  (3, '09:00', '18:00', true),
  (4, '09:00', '17:00', true),
  (5, '10:00', '14:00', false),
  (6, NULL, NULL, false);

INSERT INTO prestations (nom, description, duree, prix, couleur, ordre) VALUES
  ('Séance individuelle',  'Accompagnement thérapeutique individuel', 60, 70.00, '#6CAED6', 1),
  ('Bilan initial',        'Première rencontre et évaluation des besoins', 90, 90.00, '#D9C9B4', 2),
  ('Séance de suivi',      'Suivi thérapeutique court', 45, 55.00, '#D0E7F5', 3);
