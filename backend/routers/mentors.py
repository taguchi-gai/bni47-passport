from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel
from typing import Optional
from database import get_db
import models
import auth as auth_utils

router = APIRouter(prefix="/api/mentors", tags=["mentors"])


class MentorSetup(BaseModel):
    zoom_url: Optional[str] = None
    preferred_meeting: Optional[str] = "google_meet"


@router.put("/me/setup")
async def setup_mentor(
    req: MentorSetup,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.require_mentor_or_admin),
):
    mentor = current_user.mentor
    if not mentor:
        raise HTTPException(status_code=400, detail="メンター情報が見つかりません")

    if req.zoom_url is not None:
        mentor.zoom_url = req.zoom_url
    if req.preferred_meeting:
        mentor.preferred_meeting = models.MeetingTypeEnum(req.preferred_meeting)

    db.commit()
    return {"message": "設定を保存しました"}


@router.get("/me")
async def get_my_mentor_info(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.require_mentor_or_admin),
):
    mentor = current_user.mentor
    if not mentor:
        raise HTTPException(status_code=400, detail="メンター情報が見つかりません")

    program = db.query(models.Program).filter(models.Program.mentor_id == mentor.id).first()

    return {
        "id": mentor.id,
        "name": current_user.name,
        "email": current_user.email,
        "program_number": mentor.program_number,
        "zoom_url": mentor.zoom_url,
        "preferred_meeting": mentor.preferred_meeting.value if mentor.preferred_meeting else "google_meet",
        "program": {
            "id": program.id,
            "number": program.number,
            "title": program.title,
        } if program else None,
    }


@router.get("/new-members")
async def get_assigned_new_members(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.require_mentor_or_admin),
):
    """メンターが担当する新メンバーの一覧と空き時間を取得"""
    new_members = (
        db.query(models.NewMember)
        .options(
            joinedload(models.NewMember.user),
            joinedload(models.NewMember.availability_slots),
            joinedload(models.NewMember.bookings).joinedload(models.Booking.program),
        )
        .join(models.User, models.NewMember.user_id == models.User.id)
        .filter(models.User.is_active == True)
        .all()
    )

    result = []
    for nm in new_members:
        mentor = current_user.mentor
        program = None
        if mentor:
            program = db.query(models.Program).filter(models.Program.mentor_id == mentor.id).first()

        already_booked = False
        if program:
            already_booked = any(
                b.program_id == program.id for b in nm.bookings
            )

        available_slots = [
            {
                "id": s.id,
                "start_datetime": s.start_datetime,
                "is_booked": s.is_booked,
            }
            for s in nm.availability_slots
            if not s.is_booked
        ]

        result.append({
            "id": nm.id,
            "name": nm.user.name,
            "email": nm.user.email,
            "facebook_url": nm.facebook_url,
            "already_booked": already_booked,
            "available_slots": sorted(available_slots, key=lambda x: x["start_datetime"]),
        })

    return result
