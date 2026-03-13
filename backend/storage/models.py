from sqlalchemy import (
    Column, String, Boolean, Text, Integer, SmallInteger,
    ARRAY, ForeignKey, TIMESTAMP
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from storage.database import Base

class Platform(Base):
    __tablename__ = "platforms"
    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name         = Column(String(50), nullable=False, unique=True)
    display_name = Column(String(100), nullable=False)
    api_key_enc  = Column(Text)
    is_active    = Column(Boolean, nullable=False, default=False)
    config       = Column(JSONB, default={})
    created_at   = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at   = Column(TIMESTAMP(timezone=True), server_default=func.now())

class StoryTemplate(Base):
    __tablename__ = "story_templates"
    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name         = Column(String(100), nullable=False)
    style        = Column(String(50), nullable=False)
    config       = Column(JSONB, default={})
    preview_path = Column(Text)
    is_default   = Column(Boolean, nullable=False, default=False)
    is_active    = Column(Boolean, nullable=False, default=True)
    created_at   = Column(TIMESTAMP(timezone=True), server_default=func.now())

class Queue(Base):
    __tablename__ = "queues"
    id                = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name              = Column(String(100), nullable=False)
    description       = Column(Text)
    platform_id       = Column(UUID(as_uuid=True), ForeignKey("platforms.id"), nullable=False)
    is_active         = Column(Boolean, nullable=False, default=True)
    action_on_error   = Column(String(20), nullable=False, default="pause")
    rules             = Column(JSONB, nullable=False, default={})
    auto_story        = Column(Boolean, nullable=False, default=True)
    story_template_id = Column(UUID(as_uuid=True), ForeignKey("story_templates.id"))
    created_at        = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at        = Column(TIMESTAMP(timezone=True), server_default=func.now())

    platform = relationship("Platform")
    story_template = relationship("StoryTemplate")
    posts    = relationship("Post", back_populates="queue")

class Post(Base):
    __tablename__ = "posts"
    id                = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    queue_id          = Column(UUID(as_uuid=True), ForeignKey("queues.id"), nullable=False)
    platform_id       = Column(UUID(as_uuid=True), ForeignKey("platforms.id"), nullable=False)
    type              = Column(String(20), nullable=False, default="photo")
    parent_post_id    = Column(UUID(as_uuid=True), ForeignKey("posts.id"))
    caption           = Column(Text)
    hashtags          = Column(ARRAY(Text))
    location_id       = Column(String(255))
    location_name     = Column(String(255))
    caption_mode      = Column(String(20), nullable=False, default="automatic")
    story_style       = Column(String(20))
    story_template_id = Column(UUID(as_uuid=True), ForeignKey("story_templates.id"))
    scheduled_at      = Column(TIMESTAMP(timezone=True))
    published_at      = Column(TIMESTAMP(timezone=True))
    status            = Column(String(30), nullable=False, default="draft")
    retry_count       = Column(SmallInteger, nullable=False, default=0)
    max_retries       = Column(SmallInteger, nullable=False, default=3)
    platform_post_id  = Column(String(255))
    notes             = Column(Text)
    created_at        = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at        = Column(TIMESTAMP(timezone=True), server_default=func.now())

    queue    = relationship("Queue", back_populates="posts")
    platform = relationship("Platform")
    media    = relationship("Media", back_populates="post", cascade="all, delete-orphan")
    ai_draft = relationship("AIDraft", back_populates="post", uselist=False, cascade="all, delete-orphan")
    errors   = relationship("Error", back_populates="post")

class Media(Base):
    __tablename__ = "media"
    id             = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    post_id        = Column(UUID(as_uuid=True), ForeignKey("posts.id", ondelete="CASCADE"), nullable=False)
    file_path      = Column(Text, nullable=False)
    file_name      = Column(String(255), nullable=False)
    file_size      = Column(Integer)
    mime_type      = Column(String(50))
    width          = Column(Integer)
    height         = Column(Integer)
    processed_path = Column(Text)
    story_path     = Column(Text)
    order_index    = Column(SmallInteger, nullable=False, default=0)
    is_processed   = Column(Boolean, nullable=False, default=False)
    created_at     = Column(TIMESTAMP(timezone=True), server_default=func.now())

    post = relationship("Post", back_populates="media")

class AIDraft(Base):
    __tablename__ = "ai_drafts"
    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    post_id         = Column(UUID(as_uuid=True), ForeignKey("posts.id", ondelete="CASCADE"), nullable=False)
    caption_v1      = Column(Text)
    caption_v2      = Column(Text)
    caption_v3      = Column(Text)
    hashtags_v1     = Column(ARRAY(Text))
    hashtags_v2     = Column(ARRAY(Text))
    hashtags_v3     = Column(ARRAY(Text))
    chosen_version  = Column(SmallInteger)
    chosen_caption  = Column(Text)
    chosen_hashtags = Column(ARRAY(Text))
    prompt_used     = Column(Text)
    tone_requested  = Column(String(50))
    created_at      = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at      = Column(TIMESTAMP(timezone=True), server_default=func.now())

    post = relationship("Post", back_populates="ai_draft")

class Error(Base):
    __tablename__ = "errors"
    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    post_id         = Column(UUID(as_uuid=True), ForeignKey("posts.id"))
    queue_id        = Column(UUID(as_uuid=True), ForeignKey("queues.id"))
    category        = Column(String(30), nullable=False)
    error_code      = Column(String(100))
    message         = Column(Text, nullable=False)
    stack_trace     = Column(Text)
    status          = Column(String(20), nullable=False, default="open")
    retry_count     = Column(SmallInteger, nullable=False, default=0)
    resolved_at     = Column(TIMESTAMP(timezone=True))
    resolved_by     = Column(String(100))
    resolution_note = Column(Text)
    occurred_at     = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at      = Column(TIMESTAMP(timezone=True), server_default=func.now())

    post  = relationship("Post", back_populates="errors")

class Notification(Base):
    __tablename__ = "notifications"
    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    error_id      = Column(UUID(as_uuid=True), ForeignKey("errors.id"))
    post_id       = Column(UUID(as_uuid=True), ForeignKey("posts.id"))
    type          = Column(String(50), nullable=False)
    subject       = Column(Text)
    content       = Column(Text, nullable=False)
    sent_at       = Column(TIMESTAMP(timezone=True))
    is_sent       = Column(Boolean, nullable=False, default=False)
    error_message = Column(Text)
    created_at    = Column(TIMESTAMP(timezone=True), server_default=func.now())
