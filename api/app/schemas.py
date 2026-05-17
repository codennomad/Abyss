import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

from app.models import LogStatus, ProtocolCategory


# ── Auth ──────────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=32, pattern=r"^[a-zA-Z0-9_]+$")
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ── User ──────────────────────────────────────────────────────────────────────

class UserOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    username: str
    email: str
    heat: float
    created_at: datetime


class AccountUpdate(BaseModel):
    email: EmailStr | None = None
    current_password: str | None = None
    new_password: str | None = Field(default=None, min_length=8, max_length=128)


# ── Protocol ──────────────────────────────────────────────────────────────────

class ProtocolCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str | None = None
    category: ProtocolCategory
    frequency_days: int = Field(default=1, ge=1, le=365)
    xp_reward: int = Field(default=10, ge=1, le=1000)


class ProtocolUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = None
    category: ProtocolCategory | None = None
    frequency_days: int | None = Field(default=None, ge=1, le=365)
    xp_reward: int | None = Field(default=None, ge=1, le=1000)
    is_active: bool | None = None


class ProtocolOut(BaseModel):
    model_config = {"from_attributes": False}

    id: uuid.UUID
    name: str
    description: str | None
    category: ProtocolCategory
    frequency_days: int
    xp_reward: int
    is_active: bool
    created_at: datetime
    # computed fields — injected by the route
    is_due: bool = False
    last_logged_at: datetime | None = None


# ── Protocol Log ──────────────────────────────────────────────────────────────

class LogCreate(BaseModel):
    protocol_id: uuid.UUID
    status: LogStatus
    note: str | None = Field(default=None, max_length=500)


class LogOut(BaseModel):
    model_config = {"from_attributes": False}

    id: uuid.UUID
    protocol_id: uuid.UUID
    protocol_name: str
    status: LogStatus
    note: str | None
    xp_earned: int
    logged_at: datetime


# ── Metrics ───────────────────────────────────────────────────────────────────

class MetricsOut(BaseModel):
    total_xp: int
    heat: float
    streak_days: int
    completion_rate: float
    logs_by_category: dict[str, int]


class ActivityDay(BaseModel):
    date: str   # ISO date YYYY-MM-DD
    count: int
