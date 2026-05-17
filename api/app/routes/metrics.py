from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_user
from app.models import LogStatus, Protocol, ProtocolLog, User
from app.schemas import ActivityDay, MetricsOut, UserOut

router = APIRouter(prefix="/metrics", tags=["metrics"])

HEAT_DECAY_PER_DAY = 6.0   # −6 per inactive day → zeroes in ~17 days


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("", response_model=MetricsOut)
async def get_metrics(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    now = datetime.now(timezone.utc)
    thirty_days_ago = now - timedelta(days=30)

    # ── Heat decay ────────────────────────────────────────────────────────────
    last_done_result = await db.execute(
        select(func.max(ProtocolLog.logged_at)).where(
            ProtocolLog.user_id == current_user.id,
            ProtocolLog.status == LogStatus.done,
        )
    )
    last_done_at: datetime | None = last_done_result.scalar_one_or_none()

    if last_done_at is not None:
        last_done_aware = (
            last_done_at if last_done_at.tzinfo else last_done_at.replace(tzinfo=timezone.utc)
        )
        inactive_days = max(0.0, (now - last_done_aware).total_seconds() / 86400 - 1)
        decayed = current_user.heat - inactive_days * HEAT_DECAY_PER_DAY
        current_user.heat = round(max(0.0, min(100.0, decayed)), 2)
    else:
        current_user.heat = 0.0

    await db.commit()

    # ── Total XP ──────────────────────────────────────────────────────────────
    xp_result = await db.execute(
        select(func.sum(ProtocolLog.xp_earned)).where(
            ProtocolLog.user_id == current_user.id,
            ProtocolLog.status == LogStatus.done,
        )
    )
    total_xp = xp_result.scalar() or 0

    # ── Last 30 days logs ─────────────────────────────────────────────────────
    logs_result = await db.execute(
        select(ProtocolLog).where(
            ProtocolLog.user_id == current_user.id,
            ProtocolLog.logged_at >= thirty_days_ago,
        )
    )
    recent_logs = logs_result.scalars().all()
    done_count = sum(1 for l in recent_logs if l.status == LogStatus.done)
    completion_rate = done_count / len(recent_logs) if recent_logs else 0.0

    # ── XP by category ────────────────────────────────────────────────────────
    cat_result = await db.execute(
        select(Protocol.category, func.sum(ProtocolLog.xp_earned))
        .join(ProtocolLog, ProtocolLog.protocol_id == Protocol.id)
        .where(
            ProtocolLog.user_id == current_user.id,
            ProtocolLog.status == LogStatus.done,
        )
        .group_by(Protocol.category)
    )
    logs_by_category = {row[0].value: int(row[1]) for row in cat_result.all()}

    # ── Streak ────────────────────────────────────────────────────────────────
    streak_days = 0
    day = now.date()
    while True:
        start = datetime.combine(day, datetime.min.time()).replace(tzinfo=timezone.utc)
        end = start + timedelta(days=1)
        day_result = await db.execute(
            select(ProtocolLog.id).where(
                ProtocolLog.user_id == current_user.id,
                ProtocolLog.status == LogStatus.done,
                ProtocolLog.logged_at >= start,
                ProtocolLog.logged_at < end,
            ).limit(1)
        )
        if not day_result.scalar_one_or_none():
            break
        streak_days += 1
        day -= timedelta(days=1)

    return MetricsOut(
        total_xp=int(total_xp),
        heat=current_user.heat,
        streak_days=streak_days,
        completion_rate=round(completion_rate, 4),
        logs_by_category=logs_by_category,
    )


@router.get("/activity", response_model=list[ActivityDay])
async def get_activity(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Returns daily done-log counts for the last 365 days."""
    from datetime import date as date_type
    from sqlalchemy import cast, Date as SADate

    now = datetime.now(timezone.utc)
    since = now - timedelta(days=364)

    result = await db.execute(
        select(
            cast(ProtocolLog.logged_at, SADate).label("day"),
            func.count(ProtocolLog.id).label("cnt"),
        )
        .where(
            ProtocolLog.user_id == current_user.id,
            ProtocolLog.status == LogStatus.done,
            ProtocolLog.logged_at >= since,
        )
        .group_by("day")
    )
    rows = {str(row.day): row.cnt for row in result.all()}

    days: list[ActivityDay] = []
    for i in range(365):
        d = (now - timedelta(days=364 - i)).date()
        days.append(ActivityDay(date=str(d), count=rows.get(str(d), 0)))
    return days
