-- ============================================================
-- PostSocial — Migration v2 — Multi-user
-- ============================================================

-- ── Planos ───────────────────────────────────────────────────
CREATE TABLE plans (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name                VARCHAR(20) NOT NULL UNIQUE,  -- free, pro, business
    display_name        VARCHAR(100) NOT NULL,
    max_posts_per_month INTEGER,                       -- NULL = ilimitado
    max_queues          INTEGER NOT NULL DEFAULT 1,
    max_instagram_accounts INTEGER NOT NULL DEFAULT 1,
    max_team_members    INTEGER NOT NULL DEFAULT 1,
    price_monthly       DECIMAL(10,2) NOT NULL DEFAULT 0,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO plans (name, display_name, max_posts_per_month, max_queues, max_instagram_accounts, max_team_members, price_monthly) VALUES
    ('free',     'Free',     10,   1, 1, 1,  0.00),
    ('pro',      'Pro',      NULL, 5, 3, 1,  16.00),
    ('business', 'Business', NULL, 20, 10, 5, 49.00);

-- ── Utilizadores ─────────────────────────────────────────────
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL,
    full_name       VARCHAR(255),
    plan_id         UUID NOT NULL REFERENCES plans(id),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    is_verified     BOOLEAN NOT NULL DEFAULT FALSE,
    posts_this_month INTEGER NOT NULL DEFAULT 0,
    last_reset_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Ligar tabelas existentes ao utilizador ───────────────────
ALTER TABLE queues    ADD COLUMN user_id UUID REFERENCES users(id);
ALTER TABLE platforms ADD COLUMN user_id UUID REFERENCES users(id);

-- ── Indexes ──────────────────────────────────────────────────
CREATE INDEX idx_users_email   ON users(email);
CREATE INDEX idx_users_plan_id ON users(plan_id);
CREATE INDEX idx_queues_user_id    ON queues(user_id);
CREATE INDEX idx_platforms_user_id ON platforms(user_id);

-- ── Trigger updated_at ───────────────────────────────────────
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
