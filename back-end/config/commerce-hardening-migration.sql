-- Migration: Production Commerce Hardening (Marketplace + Bot Factory)
-- Run this after supabase-migration.sql

-- --------------------------------------------------------------------------
-- 1) Purchases status enum and integrity constraints
-- --------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'purchase_status') THEN
    CREATE TYPE purchase_status AS ENUM ('pending', 'completed', 'failed');
  END IF;
END;
$$;

ALTER TABLE purchases ADD COLUMN IF NOT EXISTS seller_id BIGINT;

UPDATE purchases p
SET seller_id = mb.seller_id
FROM marketplace_bots mb
WHERE p.marketplace_bot_id = mb.id
  AND p.seller_id IS NULL;

ALTER TABLE purchases ALTER COLUMN seller_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'purchases_seller_id_fkey'
  ) THEN
    ALTER TABLE purchases
      ADD CONSTRAINT purchases_seller_id_fkey
      FOREIGN KEY (seller_id) REFERENCES users(user_id) ON DELETE CASCADE;
  END IF;
END;
$$;

ALTER TABLE purchases ALTER COLUMN status DROP DEFAULT;

ALTER TABLE purchases
  ALTER COLUMN status TYPE purchase_status
  USING (
    CASE
      WHEN status::text IN ('pending', 'completed', 'failed') THEN status::text::purchase_status
      ELSE 'pending'::purchase_status
    END
  );

ALTER TABLE purchases ALTER COLUMN status SET DEFAULT 'pending'::purchase_status;
ALTER TABLE purchases ALTER COLUMN status SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'uq_purchases_buyer_bot'
  ) THEN
    ALTER TABLE purchases
      ADD CONSTRAINT uq_purchases_buyer_bot UNIQUE (buyer_id, marketplace_bot_id);
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_purchases_not_self'
  ) THEN
    ALTER TABLE purchases
      ADD CONSTRAINT chk_purchases_not_self CHECK (buyer_id <> seller_id);
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_marketplace_bots_price_non_negative'
  ) THEN
    ALTER TABLE marketplace_bots
      ADD CONSTRAINT chk_marketplace_bots_price_non_negative CHECK (price >= 0);
  END IF;
END;
$$;

-- --------------------------------------------------------------------------
-- 2) Atomic purchase RPC (transactional)
-- --------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION purchase_marketplace_bot(
  p_buyer_id BIGINT,
  p_marketplace_bot_id BIGINT
)
RETURNS TABLE (
  purchase_id BIGINT,
  buyer_id BIGINT,
  seller_id BIGINT,
  marketplace_bot_id BIGINT,
  amount DECIMAL,
  status purchase_status,
  purchased_at TIMESTAMPTZ,
  total_sales INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_bot marketplace_bots%ROWTYPE;
  v_purchase purchases%ROWTYPE;
  v_total_sales INTEGER;
BEGIN
  SELECT *
  INTO v_bot
  FROM marketplace_bots
  WHERE id = p_marketplace_bot_id
    AND status = 'published'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'LISTING_NOT_FOUND';
  END IF;

  IF v_bot.seller_id = p_buyer_id THEN
    RAISE EXCEPTION 'SELF_PURCHASE_NOT_ALLOWED';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM purchases
    WHERE buyer_id = p_buyer_id
      AND marketplace_bot_id = p_marketplace_bot_id
  ) THEN
    RAISE EXCEPTION 'ALREADY_PURCHASED';
  END IF;

  INSERT INTO purchases (
    buyer_id,
    seller_id,
    marketplace_bot_id,
    amount,
    status
  )
  VALUES (
    p_buyer_id,
    v_bot.seller_id,
    p_marketplace_bot_id,
    v_bot.price,
    'completed'::purchase_status
  )
  RETURNING * INTO v_purchase;

  UPDATE marketplace_bots
  SET total_sales = COALESCE(total_sales, 0) + 1
  WHERE id = p_marketplace_bot_id
  RETURNING total_sales INTO v_total_sales;

  RETURN QUERY
  SELECT
    v_purchase.id,
    v_purchase.buyer_id,
    v_purchase.seller_id,
    v_purchase.marketplace_bot_id,
    v_purchase.amount,
    v_purchase.status,
    v_purchase.purchased_at,
    v_total_sales;
END;
$$;

GRANT EXECUTE ON FUNCTION purchase_marketplace_bot(BIGINT, BIGINT) TO anon, authenticated;

-- --------------------------------------------------------------------------
-- 3) Bot Factory tables (multi-tenant Telegram instances)
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS bot_instances (
  id BIGSERIAL PRIMARY KEY,
  seller_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  telegram_token TEXT NOT NULL,
  config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'uq_bot_instances_seller_token'
  ) THEN
    ALTER TABLE bot_instances
      ADD CONSTRAINT uq_bot_instances_seller_token UNIQUE (seller_id, telegram_token);
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_bot_instances_seller_id ON bot_instances(seller_id);
CREATE INDEX IF NOT EXISTS idx_bot_instances_active ON bot_instances(is_active);

CREATE TABLE IF NOT EXISTS bot_subscribers (
  id BIGSERIAL PRIMARY KEY,
  bot_instance_id BIGINT NOT NULL REFERENCES bot_instances(id) ON DELETE CASCADE,
  telegram_user_id TEXT NOT NULL,
  chat_id TEXT NOT NULL,
  username TEXT,
  first_name TEXT,
  last_name TEXT,
  is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'uq_bot_subscribers_instance_user'
  ) THEN
    ALTER TABLE bot_subscribers
      ADD CONSTRAINT uq_bot_subscribers_instance_user UNIQUE (bot_instance_id, telegram_user_id);
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_bot_subscribers_instance ON bot_subscribers(bot_instance_id);
CREATE INDEX IF NOT EXISTS idx_bot_subscribers_blocked ON bot_subscribers(is_blocked);

ALTER TABLE bot_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_subscribers ENABLE ROW LEVEL SECURITY;

GRANT ALL ON bot_instances TO anon, authenticated;
GRANT ALL ON bot_subscribers TO anon, authenticated;
GRANT ALL ON SEQUENCE bot_instances_id_seq TO anon, authenticated;
GRANT ALL ON SEQUENCE bot_subscribers_id_seq TO anon, authenticated;