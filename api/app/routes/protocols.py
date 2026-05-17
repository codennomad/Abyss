import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_user
from app.models import LogStatus, Protocol, ProtocolLog, User
from app.schemas import LogCreate, LogOut, ProtocolCreate, ProtocolOut, ProtocolUpdate

router = APIRouter(prefix="/protocols", tags=["protocols"])


def _is_due(frequency_days: int, last_done_at: datetime | None) -> bool:
    if last_done_at is None:
        return True
    cutoff = datetime.now(timezone.utc) - timedelta(days=frequency_days)
    done_aware = last_done_at if last_done_at.tzinfo else last_done_at.replace(tzinfo=timezone.utc)
    return done_aware <= cutoff


@router.get("", response_model=list[ProtocolOut])
async def list_protocols(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Protocol)
        .where(Protocol.user_id == current_user.id)
        .order_by(Protocol.created_at)
    )
    protocols = result.scalars().all()

    # last "done" log per protocol — single query
    last_done_result = await db.execute(
        select(ProtocolLog.protocol_id, func.max(ProtocolLog.logged_at).label("last_at"))
        .where(
            ProtocolLog.user_id == current_user.id,
            ProtocolLog.status == LogStatus.done,
        )
        .group_by(ProtocolLog.protocol_id)
    )
    last_done: dict[uuid.UUID, datetime] = {row[0]: row[1] for row in last_done_result.all()}

    return [
        ProtocolOut(
            id=p.id,
            name=p.name,
            description=p.description,
            category=p.category,
            frequency_days=p.frequency_days,
            xp_reward=p.xp_reward,
            is_active=p.is_active,
            created_at=p.created_at,
            is_due=_is_due(p.frequency_days, last_done.get(p.id)),
            last_logged_at=last_done.get(p.id),
        )
        for p in protocols
    ]


@router.post("", response_model=ProtocolOut, status_code=status.HTTP_201_CREATED)
async def create_protocol(
    body: ProtocolCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    protocol = Protocol(**body.model_dump(), user_id=current_user.id)
    db.add(protocol)
    await db.commit()
    await db.refresh(protocol)
    return ProtocolOut(
        id=protocol.id,
        name=protocol.name,
        description=protocol.description,
        category=protocol.category,
        frequency_days=protocol.frequency_days,
        xp_reward=protocol.xp_reward,
        is_active=protocol.is_active,
        created_at=protocol.created_at,
        is_due=True,
        last_logged_at=None,
    )


@router.patch("/{protocol_id}", response_model=ProtocolOut)
async def update_protocol(
    protocol_id: uuid.UUID,
    body: ProtocolUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Protocol).where(Protocol.id == protocol_id, Protocol.user_id == current_user.id)
    )
    protocol = result.scalar_one_or_none()
    if not protocol:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Protocol not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(protocol, field, value)

    await db.commit()
    await db.refresh(protocol)

    last_done_result = await db.execute(
        select(func.max(ProtocolLog.logged_at))
        .where(ProtocolLog.protocol_id == protocol_id, ProtocolLog.status == LogStatus.done)
    )
    last_done_at = last_done_result.scalar_one_or_none()

    return ProtocolOut(
        id=protocol.id,
        name=protocol.name,
        description=protocol.description,
        category=protocol.category,
        frequency_days=protocol.frequency_days,
        xp_reward=protocol.xp_reward,
        is_active=protocol.is_active,
        created_at=protocol.created_at,
        is_due=_is_due(protocol.frequency_days, last_done_at),
        last_logged_at=last_done_at,
    )


@router.delete("/{protocol_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_protocol(
    protocol_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Protocol).where(Protocol.id == protocol_id, Protocol.user_id == current_user.id)
    )
    protocol = result.scalar_one_or_none()
    if not protocol:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Protocol not found")
    await db.delete(protocol)
    await db.commit()


# ── Logs ──────────────────────────────────────────────────────────────────────

@router.post("/logs", response_model=LogOut, status_code=status.HTTP_201_CREATED)
async def create_log(
    body: LogCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Protocol).where(Protocol.id == body.protocol_id, Protocol.user_id == current_user.id)
    )
    protocol = result.scalar_one_or_none()
    if not protocol:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Protocol not found")

    xp = protocol.xp_reward if body.status == LogStatus.done else 0

    log = ProtocolLog(
        user_id=current_user.id,
        protocol_id=body.protocol_id,
        status=body.status,
        note=body.note,
        xp_earned=xp,
    )
    db.add(log)

    if xp:
        current_user.heat = min(100.0, current_user.heat + xp * 0.1)

    await db.commit()
    await db.refresh(log)

    return LogOut(
        id=log.id,
        protocol_id=log.protocol_id,
        protocol_name=protocol.name,
        status=log.status,
        note=log.note,
        xp_earned=log.xp_earned,
        logged_at=log.logged_at,
    )


@router.get("/logs", response_model=list[LogOut])
async def list_logs(
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ProtocolLog, Protocol.name.label("protocol_name"))
        .join(Protocol, ProtocolLog.protocol_id == Protocol.id)
        .where(ProtocolLog.user_id == current_user.id)
        .order_by(ProtocolLog.logged_at.desc())
        .limit(min(limit, 200))
    )
    rows = result.all()
    return [
        LogOut(
            id=log.id,
            protocol_id=log.protocol_id,
            protocol_name=name,
            status=log.status,
            note=log.note,
            xp_earned=log.xp_earned,
            logged_at=log.logged_at,
        )
        for log, name in rows
    ]
