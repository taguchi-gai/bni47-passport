from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from database import get_db
import models
import auth as auth_utils
from services.google_calendar import create_meet_event, delete_event
from services.email_service import send_booking_notification, send_completion_notification

router = APIRouter(prefix="/api/bookings", tags=["bookings"])


class BookingCreate(BaseModel):
    slot_id: int
    program_id: int


class BookingResponse(BaseModel):
    id: int
    slot_id: int
    mentor_id: int
    new_member_id: int
    program_id: Optional[int]
    meeting_url: Optional[str]
    meeting_type: str
    is_completed: bool
    completed_at: Optional[datetime]
    created_at: datetime
    mentor_name: Optional[str] = None
    new_member_name: Optional[str] = None
    start_datetime: Optional[datetime] = None
    program_number: Optional[int] = None

    class Config:
        from_attributes = True


@router.post("/", response_model=BookingResponse)
async def create_booking(
    req: BookingCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.require_mentor_or_admin),
):
    slot = db.query(models.AvailabilitySlot).filter(models.AvailabilitySlot.id == req.slot_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="スロットが見つかりません")
    if slot.is_booked:
        raise HTTPException(status_code=400, detail="このスロットは既に予約されています")

    program = db.query(models.Program).filter(models.Program.id == req.program_id).first()
    if not program:
        raise HTTPException(status_code=404, detail="プログラムが見つかりません")

    mentor = current_user.mentor
    if not mentor and current_user.role == models.RoleEnum.admin:
        if program.mentor_id:
            mentor = db.query(models.Mentor).filter(models.Mentor.id == program.mentor_id).first()

    if not mentor:
        raise HTTPException(status_code=400, detail="メンター情報が見つかりません")

    new_member = db.query(models.NewMember).filter(models.NewMember.id == slot.new_member_id).first()
    if not new_member:
        raise HTTPException(status_code=404, detail="新メンバーが見つかりません")

    mentor_user = mentor.user
    new_member_user = new_member.user

    meeting_url = ""
    meeting_type = mentor.preferred_meeting
    google_event_id = None

    if mentor.preferred_meeting == models.MeetingTypeEnum.zoom and mentor.zoom_url:
        meeting_url = mentor.zoom_url
        meeting_type = models.MeetingTypeEnum.zoom
    else:
        try:
            result = create_meet_event(
                summary=f"BNI パスポート #{program.number}",
                start_datetime=slot.start_datetime,
                mentor_name=mentor_user.name,
                mentor_email=mentor_user.email,
                new_member_name=new_member_user.name,
                new_member_email=new_member_user.email,
                program_number=program.number,
            )
            meeting_url = result["meet_url"]
            google_event_id = result["event_id"]
            meeting_type = models.MeetingTypeEnum.google_meet
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Google Meet作成失敗: {str(e)}")

    slot.is_booked = True

    booking = models.Booking(
        slot_id=slot.id,
        mentor_id=mentor.id,
        new_member_id=new_member.id,
        program_id=program.id,
        meeting_url=meeting_url,
        meeting_type=meeting_type,
        google_event_id=google_event_id,
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)

    jst_datetime = slot.start_datetime.strftime("%Y年%m月%d日 %H:%M")
    try:
        await send_booking_notification(
            mentor_name=mentor_user.name,
            mentor_email=mentor_user.email,
            new_member_name=new_member_user.name,
            new_member_email=new_member_user.email,
            meeting_datetime=jst_datetime,
            meeting_url=meeting_url,
            program_number=program.number,
            program_title=program.title,
        )
    except Exception as e:
        print(f"Email send error: {e}")

    return BookingResponse(
        id=booking.id,
        slot_id=booking.slot_id,
        mentor_id=booking.mentor_id,
        new_member_id=booking.new_member_id,
        program_id=booking.program_id,
        meeting_url=booking.meeting_url,
        meeting_type=booking.meeting_type.value,
        is_completed=booking.is_completed,
        completed_at=booking.completed_at,
        created_at=booking.created_at,
        mentor_name=mentor_user.name,
        new_member_name=new_member_user.name,
        start_datetime=slot.start_datetime,
        program_number=program.number,
    )


@router.patch("/{booking_id}/complete")
async def complete_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.require_mentor_or_admin),
):
    booking = (
        db.query(models.Booking)
        .options(
            joinedload(models.Booking.mentor).joinedload(models.Mentor.user),
            joinedload(models.Booking.new_member).joinedload(models.NewMember.user),
            joinedload(models.Booking.program),
        )
        .filter(models.Booking.id == booking_id)
        .first()
    )
    if not booking:
        raise HTTPException(status_code=404, detail="予約が見つかりません")

    if current_user.role == models.RoleEnum.mentor:
        if not current_user.mentor or current_user.mentor.id != booking.mentor_id:
            raise HTTPException(status_code=403, detail="この予約を完了にする権限がありません")

    booking.is_completed = True
    booking.completed_at = datetime.utcnow()
    db.commit()

    new_member = booking.new_member
    completed_count = (
        db.query(models.Booking)
        .filter(
            models.Booking.new_member_id == new_member.id,
            models.Booking.is_completed == True,
        )
        .count()
    )

    try:
        await send_completion_notification(
            new_member_name=new_member.user.name,
            new_member_email=new_member.user.email,
            program_number=booking.program.number,
            program_title=booking.program.title,
            mentor_name=booking.mentor.user.name,
            completed_count=completed_count,
            total_count=10,
        )
    except Exception as e:
        print(f"Email send error: {e}")

    return {"message": "完了しました", "completed_at": booking.completed_at}


@router.get("/")
async def list_bookings(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user),
):
    query = db.query(models.Booking).options(
        joinedload(models.Booking.slot),
        joinedload(models.Booking.mentor).joinedload(models.Mentor.user),
        joinedload(models.Booking.new_member).joinedload(models.NewMember.user),
        joinedload(models.Booking.program),
    )

    if current_user.role == models.RoleEnum.mentor and current_user.mentor:
        query = query.filter(models.Booking.mentor_id == current_user.mentor.id)
    elif current_user.role == models.RoleEnum.new_member and current_user.new_member:
        query = query.filter(models.Booking.new_member_id == current_user.new_member.id)

    bookings = query.all()
    result = []
    for b in bookings:
        result.append({
            "id": b.id,
            "slot_id": b.slot_id,
            "mentor_id": b.mentor_id,
            "new_member_id": b.new_member_id,
            "program_id": b.program_id,
            "program_number": b.program.number if b.program else None,
            "program_title": b.program.title if b.program else None,
            "meeting_url": b.meeting_url,
            "meeting_type": b.meeting_type.value,
            "is_completed": b.is_completed,
            "completed_at": b.completed_at,
            "created_at": b.created_at,
            "mentor_name": b.mentor.user.name if b.mentor and b.mentor.user else None,
            "new_member_name": b.new_member.user.name if b.new_member and b.new_member.user else None,
            "start_datetime": b.slot.start_datetime if b.slot else None,
        })
    return result
