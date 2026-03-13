-- ============================================================
-- PostSocial — Schema PostgreSQL v1.0
-- ============================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUM TYPES
-- ============================================================

CREATE TYPE post_status AS ENUM (
    'draft',
    'pending_review',
    'scheduled',
    'publishing',
    'published',
    'error',
    'pending_decision',
    'cancelled'
);

CREATE TYPE post_type AS ENUM (
    'photo',
    'carousel',
    'story'
);

CREATE TYPE error_category AS ENUM (
    'auto_recoverable',
    'user_decision',
    'critical'
);

CREATE TYPE error_status AS ENUM (
    'open',
    'retrying',
    'resolved',
    'cancelled'
);

CREATE TYPE caption_mode AS ENUM (
    'manual',
    'assisted',
    'automatic'
);

CREATE TYPE story_style AS ENUM (
    'blur',
    'blur_border',
    'solid_color',
    'crop'
);

CREATE TYPE queue_action_on_error AS ENUM (
    'pause',
    'continue',
    'skip'
);

-- ============================================================
-- PLATFORMS
-- ============================================================

CREATE TABLE platforms (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(50) NOT NULL UNIQUE,  -- 'instagram', 'tiktok'
    display_name    VARCHAR(100) NOT NULL,
    api_key_enc     TEXT,                          -- chave encriptada
    is_active       BOOLEAN NOT NULL DEFAULT FALSE,
    config          JSONB DEFAULT '{}',            -- configurações extra por plataforma
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Inserir plataformas suportadas
INSERT INTO platforms (name, display_name, is_active) VALUES
    ('instagram', 'Instagram', TRUE),
    ('tiktok',    'TikTok',    FALSE);  -- futuro

-- ============================================================
-- STORY TEMPLATES
-- ============================================================

CREATE TABLE story_templates (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(100) NOT NULL,
    style           story_style NOT NULL,
    config          JSONB DEFAULT '{}',   -- cor de fundo, opacidade do blur, etc.
    preview_path    TEXT,
    is_default      BOOLEAN NOT NULL DEFAULT FALSE,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Templates base
INSERT INTO story_templates (name, style, is_default, config) VALUES
    ('Blur Simples',       'blur',        TRUE,  '{"blur_intensity": 20, "opacity": 0.8}'),
    ('Blur com Moldura',   'blur_border', FALSE, '{"blur_intensity": 20, "border_width": 10, "border_color": "#ffffff"}'),
    ('Cor Sólida',         'solid_color', FALSE, '{"background_color": "#1a1a2e"}'),
    ('Crop Inteligente',   'crop',        FALSE, '{"crop_position": "center"}');

-- ============================================================
-- QUEUES
-- ============================================================

CREATE TABLE queues (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name                VARCHAR(100) NOT NULL,
    description         TEXT,
    platform_id         UUID NOT NULL REFERENCES platforms(id),
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    action_on_error     queue_action_on_error NOT NULL DEFAULT 'pause',

    -- Regras de agendamento (JSONB para flexibilidade futura)
    rules               JSONB NOT NULL DEFAULT '{
        "allowed_days": [1,2,3,4,5],
        "publish_times": ["18:00"],
        "min_interval_hours": 24,
        "max_posts_per_day": 1
    }',

    -- Story automática
    auto_story          BOOLEAN NOT NULL DEFAULT TRUE,
    story_template_id   UUID REFERENCES story_templates(id),

    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- POSTS
-- ============================================================

CREATE TABLE posts (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    queue_id            UUID NOT NULL REFERENCES queues(id),
    platform_id         UUID NOT NULL REFERENCES platforms(id),

    -- Tipo e hierarquia
    type                post_type NOT NULL DEFAULT 'photo',
    parent_post_id      UUID REFERENCES posts(id),  -- se for story, aponta para o post original

    -- Conteúdo
    caption             TEXT,
    hashtags            TEXT[],                      -- array de hashtags sem #
    location_id         VARCHAR(255),                -- ID de localização do Facebook
    location_name       VARCHAR(255),

    -- Caption AI
    caption_mode        caption_mode NOT NULL DEFAULT 'automatic',

    -- Story
    story_style         story_style,
    story_template_id   UUID REFERENCES story_templates(id),

    -- Agendamento
    scheduled_at        TIMESTAMPTZ,
    published_at        TIMESTAMPTZ,

    -- Estado
    status              post_status NOT NULL DEFAULT 'draft',
    retry_count         SMALLINT NOT NULL DEFAULT 0,
    max_retries         SMALLINT NOT NULL DEFAULT 3,

    -- Referência externa (ID do post no Instagram após publicação)
    platform_post_id    VARCHAR(255),

    -- Metadados
    notes               TEXT,                        -- notas internas
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- MEDIA
-- ============================================================

CREATE TABLE media (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id         UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,

    -- Ficheiro
    file_path       TEXT NOT NULL,
    file_name       VARCHAR(255) NOT NULL,
    file_size       INTEGER,                 -- bytes
    mime_type       VARCHAR(50),

    -- Dimensões
    width           INTEGER,
    height          INTEGER,

    -- Versões processadas
    processed_path  TEXT,                    -- caminho após processamento
    story_path      TEXT,                    -- versão adaptada para story (9:16)

    -- Ordem no carrossel
    order_index     SMALLINT NOT NULL DEFAULT 0,

    -- Estado do processamento
    is_processed    BOOLEAN NOT NULL DEFAULT FALSE,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- AI DRAFTS
-- ============================================================

CREATE TABLE ai_drafts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id         UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,

    -- Sugestões geradas pelo Claude
    caption_v1      TEXT,               -- tom casual
    caption_v2      TEXT,               -- tom profissional
    caption_v3      TEXT,               -- foco em hashtags/alcance

    -- Hashtags sugeridas
    hashtags_v1     TEXT[],
    hashtags_v2     TEXT[],
    hashtags_v3     TEXT[],

    -- Escolha do utilizador
    chosen_version  SMALLINT,           -- 1, 2 ou 3
    chosen_caption  TEXT,               -- caption final (pode ser editada)
    chosen_hashtags TEXT[],

    -- Contexto enviado ao Claude
    prompt_used     TEXT,
    tone_requested  VARCHAR(50),

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ERRORS
-- ============================================================

CREATE TABLE errors (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id         UUID REFERENCES posts(id),       -- pode ser NULL para erros gerais
    queue_id        UUID REFERENCES queues(id),

    -- Classificação
    category        error_category NOT NULL,
    error_code      VARCHAR(100),
    message         TEXT NOT NULL,
    stack_trace     TEXT,

    -- Estado
    status          error_status NOT NULL DEFAULT 'open',
    retry_count     SMALLINT NOT NULL DEFAULT 0,

    -- Resolução
    resolved_at     TIMESTAMPTZ,
    resolved_by     VARCHAR(100),        -- 'auto' ou 'user'
    resolution_note TEXT,

    -- Timestamps
    occurred_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE TABLE notifications (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    error_id        UUID REFERENCES errors(id),
    post_id         UUID REFERENCES posts(id),

    -- Tipo e conteúdo
    type            VARCHAR(50) NOT NULL,    -- 'email', 'panel'
    subject         TEXT,
    content         TEXT NOT NULL,

    -- Estado
    sent_at         TIMESTAMPTZ,
    is_sent         BOOLEAN NOT NULL DEFAULT FALSE,
    error_message   TEXT,                    -- erro ao enviar notificação

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

-- Posts
CREATE INDEX idx_posts_queue_id     ON posts(queue_id);
CREATE INDEX idx_posts_status       ON posts(status);
CREATE INDEX idx_posts_scheduled_at ON posts(scheduled_at);
CREATE INDEX idx_posts_platform_id  ON posts(platform_id);
CREATE INDEX idx_posts_parent_id    ON posts(parent_post_id);

-- Media
CREATE INDEX idx_media_post_id      ON media(post_id);

-- Errors
CREATE INDEX idx_errors_post_id     ON errors(post_id);
CREATE INDEX idx_errors_status      ON errors(status);
CREATE INDEX idx_errors_category    ON errors(category);

-- Notifications
CREATE INDEX idx_notifications_post_id  ON notifications(post_id);
CREATE INDEX idx_notifications_is_sent  ON notifications(is_sent);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_platforms_updated_at
    BEFORE UPDATE ON platforms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_queues_updated_at
    BEFORE UPDATE ON queues
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_posts_updated_at
    BEFORE UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_ai_drafts_updated_at
    BEFORE UPDATE ON ai_drafts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_errors_updated_at
    BEFORE UPDATE ON errors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
