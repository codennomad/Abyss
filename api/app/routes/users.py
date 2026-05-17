from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import hash_password, verify_password
from app.database import get_db
from app.deps import get_current_user
from app.models import User
from app.schemas import AccountUpdate, UserOut

router = APIRouter(prefix="/users", tags=["users"])


@router.patch("/me", response_model=UserOut)
async def update_account(
    body: AccountUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if body.email is None and body.new_password is None:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Nothing to update")

    # Both email change and password change require current password
    if body.current_password is None:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "current_password is required")

    if not verify_password(body.current_password, current_user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Wrong password")

    if body.email is not None and body.email != current_user.email:
        conflict = await db.execute(
            select(User).where(User.email == body.email, User.id != current_user.id)
        )
        if conflict.scalar_one_or_none():
            raise HTTPException(status.HTTP_409_CONFLICT, "Email already in use")
        current_user.email = body.email

    if body.new_password is not None:
        current_user.password_hash = hash_password(body.new_password)

    await db.commit()
    await db.refresh(current_user)
    return current_user
