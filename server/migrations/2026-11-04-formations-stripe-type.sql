-- ==============================================================================
-- Migration 2026-11-04 : LMS formations + Stripe paiement + type prestation
-- ==============================================================================
-- Idempotent : tu peux relancer ce script sans casser une base déjà partiellement
-- migrée. Chaque bloc teste l'existence avant de créer / modifier.
-- ==============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. TABLE : formations
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS formations (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titre          text NOT NULL,
  slug           text NOT NULL UNIQUE,
  description    text,
  prix           numeric(10, 2) NOT NULL DEFAULT 0,
  image_url      text,
  duree_heures   numeric(5, 2),
  is_published   boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_formations_slug ON formations(slug);
CREATE INDEX IF NOT EXISTS idx_formations_published ON formations(is_published) WHERE is_published = true;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. TABLE : formation_modules
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS formation_modules (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  formation_id    uuid NOT NULL REFERENCES formations(id) ON DELETE CASCADE,
  titre           text NOT NULL,
  ordre           integer NOT NULL DEFAULT 1,
  contenu         text,
  video_url       text,
  duree_minutes   integer,
  is_free         boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_formation_modules_formation ON formation_modules(formation_id);
CREATE INDEX IF NOT EXISTS idx_formation_modules_order ON formation_modules(formation_id, ordre);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. TABLE : formation_achats
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS formation_achats (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  formation_id             uuid NOT NULL REFERENCES formations(id) ON DELETE CASCADE,
  client_id                bigint REFERENCES clients(id) ON DELETE SET NULL,
  client_email             text NOT NULL,
  stripe_session_id        text,
  stripe_payment_intent    text,
  paid_at                  timestamptz,
  created_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_formation_achats_formation ON formation_achats(formation_id);
CREATE INDEX IF NOT EXISTS idx_formation_achats_client ON formation_achats(client_id);
CREATE INDEX IF NOT EXISTS idx_formation_achats_email ON formation_achats(client_email);
CREATE INDEX IF NOT EXISTS idx_formation_achats_session ON formation_achats(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_formation_achats_paid ON formation_achats(paid_at) WHERE paid_at IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. TABLE : formation_progres
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS formation_progres (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  formation_id   uuid NOT NULL REFERENCES formations(id) ON DELETE CASCADE,
  module_id      uuid NOT NULL REFERENCES formation_modules(id) ON DELETE CASCADE,
  client_id      bigint NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  termine        boolean NOT NULL DEFAULT false,
  termine_at     timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT formation_progres_module_client_unique UNIQUE (module_id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_formation_progres_formation_client ON formation_progres(formation_id, client_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. TABLE devis : ajouter colonnes Stripe + nb_echeances + paid_at
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE devis ADD COLUMN IF NOT EXISTS stripe_session_id       text;
ALTER TABLE devis ADD COLUMN IF NOT EXISTS stripe_payment_intent   text;
ALTER TABLE devis ADD COLUMN IF NOT EXISTS paid_at                 timestamptz;
ALTER TABLE devis ADD COLUMN IF NOT EXISTS nb_echeances            integer;

CREATE INDEX IF NOT EXISTS idx_devis_stripe_session ON devis(stripe_session_id) WHERE stripe_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_devis_paid ON devis(paid_at) WHERE paid_at IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. TABLE devis : élargir la contrainte statut pour inclure 'paye'
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE devis DROP CONSTRAINT IF EXISTS devis_statut_check;
ALTER TABLE devis ADD CONSTRAINT devis_statut_check
  CHECK (statut IN ('envoye', 'accepte', 'refuse', 'expire', 'paye'));

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. TABLE prestations : ajouter colonne type
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE prestations ADD COLUMN IF NOT EXISTS type text;

ALTER TABLE prestations DROP CONSTRAINT IF EXISTS prestations_type_check;
ALTER TABLE prestations ADD CONSTRAINT prestations_type_check
  CHECK (type IS NULL OR type IN ('coaching', 'seminaire', 'autre'));

-- Rétro-compat : les prestations existantes sans type → 'coaching' par défaut
UPDATE prestations SET type = 'coaching' WHERE type IS NULL;

COMMIT;

-- ==============================================================================
-- Vérifications post-migration (à exécuter séparément pour contrôler)
-- ==============================================================================
-- SELECT table_name FROM information_schema.tables
--   WHERE table_schema = 'public'
--     AND table_name IN ('formations','formation_modules','formation_achats','formation_progres');
--
-- SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'devis'
--     AND column_name IN ('stripe_session_id','stripe_payment_intent','paid_at','nb_echeances');
--
-- SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
--   WHERE conname IN ('devis_statut_check','prestations_type_check');
