ALTER TABLE clients ADD COLUMN IF NOT EXISTS mot_de_passe TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS compte_actif BOOLEAN DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS notes_seance (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rdv_id     UUID REFERENCES rendez_vous(id) ON DELETE CASCADE,
  client_id  UUID REFERENCES clients(id) ON DELETE CASCADE,
  admin_id   UUID REFERENCES admins(id) ON DELETE SET NULL,
  contenu    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notes_client ON notes_seance(client_id);
CREATE INDEX IF NOT EXISTS idx_notes_rdv    ON notes_seance(rdv_id);

ALTER TABLE notes_seance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_notes" ON notes_seance USING (true) WITH CHECK (true);
