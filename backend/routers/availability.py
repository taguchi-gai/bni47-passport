from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime
from typing import List
from database import get_db
import models
import auth as auth_utils

router = APIRouter(prefix="/api/availability", tags=["availability"])


class SlotCreate(BaseModel):
    start_datetime: datetime


class SlotResponse(BaseModel):
    id: int
    start_datetime: datetime
    is_booked: bool

    class Config:
        from_attributes = True


@router.get("/member/{new_member_id}", response_model=List[SlotResponse])
async def get_member_availability(
    new_member_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user),
):
    member = db.query(models.NewMember).filter(models.NewMember.id == new_member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="メンバーが見つかりません")

    slots = (
        db.query(models.AvailabilitySlot)
        .filter(models.AvailabilitySlot.new_member_id == new_member_id)
        .order_by(models.AvailabilitySlot.start_datetime)
        .all()
    )
    return slots


@router.get("/my", response_model=List[SlotResponse])
async def get_my_availability(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user),
):
    if not current_user.new_member:
        raise HTTPException(status_code=400, detail="新メンバーのみ利用できます")

    slots = (
        db.query(models.AvailabilitySlot)
        .filter(models.AvailabilitySlot.new_member_id == current_user.new_member.id)
        .order_by(models.AvailabilitySlot.start_datetime)
        .all()
    )
    return slots


@router.post("/", response_model=SlotResponse)
async def add_slot(
    slot: SlotCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user),
):
    if not current_user.new_member:
        raise HTTPException(status_code=400, detail="新メンバーのみ利用できます")

    existing = (
        db.query(models.AvailabilitySlot)
        .filter(
            models.AvailabilitySlot.new_member_id == current_user.new_member.id,
            models.AvailabilitySlot.start_datetime == slot.start_datetime,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="既に登録済みの時間帯です")

    new_slot = models.AvailabilitySlot(
        new_member_id=current_user.new_member.id,
        start_datetime=slot.start_datetime,
    )
    db.add(new_slot)
    db.commit()
    db.refresh(new_slot)
    return new_slot


@router.post("/bulk")
async def add_slots_bulk(
    slots: List[SlotCreate],
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user),
):
    if not current_user.new_member:
        raise HTTPException(status_code=400, detail="新メンバーのみ利用できます")

    member_id = current_user.new_member.id
    added = 0
    for slot in slots:
        existing = (
            db.query(models.AvailabilitySlot)
            .filter(
                models.AvailabilitySlot.new_member_id == member_id,
                models.AvailabilitySlot.start_datetime == slot.start_datetime,
            )
            .first()
        )
        if not existing:
            db.add(models.AvailabilitySlot(new_member_id=member_id, start_datetime=slot.start_datetime))
            added += 1

    db.commit()
    return {"added": added}


@router.delete("/{slot_id}")
async def delete_slot(
    slot_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user),
):
    slot = db.query(models.AvailabilitySlot).filter(models.AvailabilitySlot.id == slot_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="スロットが見つかりません")

    if current_user.new_member and slot.new_member_id != current_user.new_member.id:
        raise HTTPException(status_code=403, detail="権限がありません")

    if slot.is_booked:
        raise HTTPException(status_code=400, detail="予約済みのため削除できません")

    db.delete(slot)
    db.commit()
    return {"message": "削除しました"}
