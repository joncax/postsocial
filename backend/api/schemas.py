from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID

# ── Platforms ────────────────────────────────────────────────
class PlatformResponse(BaseModel):
    id: UUID
    name: str
    display_name: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# ── Story Templates ──────────────────────────────────────────
class StoryTemplateResponse(BaseModel):
    id: UUID
    name: str
    style: str
    config: dict
    is_default: bool
    is_active: bool

    class Config:
        from_attributes = True

# ── Queues ───────────────────────────────────────────────────
class QueueCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    platform_id: UUID
    rules: Optional[dict] = {
        "allowed_days": [1,2,3,4,5],
        "publish_times": ["18:00"],
        "min_interval_hours": 24,
        "max_posts_per_day": 1
    }
    auto_story: bool = True
    story_template_id: Optional[UUID] = None
    action_on_error: str = "pause"

class QueueUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    rules: Optional[dict] = None
    auto_story: Optional[bool] = None
    story_template_id: Optional[UUID] = None
    is_active: Optional[bool] = None
    action_on_error: Optional[str] = None

class QueueResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str]
    platform_id: UUID
    is_active: bool
    action_on_error: str
    rules: dict
    auto_story: bool
    story_template_id: Optional[UUID]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# ── Posts ────────────────────────────────────────────────────
class PostCreate(BaseModel):
    queue_id: UUID
    type: str = "photo"
    caption: Optional[str] = None
    hashtags: Optional[List[str]] = []
    location_id: Optional[str] = None
    location_name: Optional[str] = None
    caption_mode: str = "automatic"
    scheduled_at: Optional[datetime] = None
    notes: Optional[str] = None
    story_template_id: Optional[UUID] = None

class PostUpdate(BaseModel):
    caption: Optional[str] = None
    hashtags: Optional[List[str]] = None
    location_id: Optional[str] = None
    location_name: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    story_template_id: Optional[UUID] = None

class PostResponse(BaseModel):
    id: UUID
    queue_id: UUID
    platform_id: UUID
    type: str
    parent_post_id: Optional[UUID]
    caption: Optional[str]
    hashtags: Optional[List[str]]
    location_name: Optional[str]
    caption_mode: str
    status: str
    scheduled_at: Optional[datetime]
    published_at: Optional[datetime]
    retry_count: int
    platform_post_id: Optional[str]
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# ── Media ────────────────────────────────────────────────────
class MediaResponse(BaseModel):
    id: UUID
    post_id: UUID
    file_name: str
    file_size: Optional[int]
    mime_type: Optional[str]
    width: Optional[int]
    height: Optional[int]
    order_index: int
    is_processed: bool
    created_at: datetime

    class Config:
        from_attributes = True

# ── AI Drafts ────────────────────────────────────────────────
class AIDraftResponse(BaseModel):
    id: UUID
    post_id: UUID
    caption_v1: Optional[str]
    caption_v2: Optional[str]
    caption_v3: Optional[str]
    hashtags_v1: Optional[List[str]]
    hashtags_v2: Optional[List[str]]
    hashtags_v3: Optional[List[str]]
    chosen_version: Optional[int]
    chosen_caption: Optional[str]
    chosen_hashtags: Optional[List[str]]
    created_at: datetime

    class Config:
        from_attributes = True

class AIDraftChoose(BaseModel):
    chosen_version: int = Field(..., ge=1, le=3)
    chosen_caption: Optional[str] = None
    chosen_hashtags: Optional[List[str]] = None

# ── Errors ───────────────────────────────────────────────────
class ErrorResponse(BaseModel):
    id: UUID
    post_id: Optional[UUID]
    queue_id: Optional[UUID]
    category: str
    error_code: Optional[str]
    message: str
    status: str
    retry_count: int
    resolved_at: Optional[datetime]
    resolved_by: Optional[str]
    resolution_note: Optional[str]
    occurred_at: datetime

    class Config:
        from_attributes = True

class ErrorResolve(BaseModel):
    resolution_note: Optional[str] = None
    action: str = Field(..., pattern="^(fix|reschedule|cancel)$")
    scheduled_at: Optional[datetime] = None
