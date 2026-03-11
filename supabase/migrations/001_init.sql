-- ════════════════════════════════════════════
-- ScriptMate - Initial Schema
-- Run this in Supabase SQL Editor
-- ════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Users ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.users (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  username      TEXT        UNIQUE NOT NULL,
  password_hash TEXT        NOT NULL,
  role          TEXT        NOT NULL DEFAULT 'free', -- 'free' | 'pro' | 'admin'
  credits       INTEGER     NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Transactions ───────────────────────────
CREATE TABLE IF NOT EXISTS public.transactions (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  package_id           TEXT        NOT NULL,
  credits              INTEGER     NOT NULL,
  price_idr            INTEGER     NOT NULL,
  midtrans_order_id    TEXT        UNIQUE,
  midtrans_token       TEXT,
  status               TEXT        NOT NULL DEFAULT 'pending', -- 'pending'|'paid'|'failed'|'expired'
  payment_method       TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  paid_at              TIMESTAMPTZ
);

-- ── Credit Logs ───────────────────────────
CREATE TABLE IF NOT EXISTS public.credit_logs (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  delta      INTEGER     NOT NULL,           -- positive = tambah, negative = pakai
  reason     TEXT        NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Row Level Security (API pakai service key, jadi tidak terblokir) ──
ALTER TABLE public.users        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_logs  ENABLE ROW LEVEL SECURITY;

-- ── Index ─────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_username        ON public.users(username);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id  ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_logs_user_id   ON public.credit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_order_id ON public.transactions(midtrans_order_id);
