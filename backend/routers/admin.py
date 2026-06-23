from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from database import get_db
import models
import auth as auth_utils

router = APIRouter(prefix="/api/admin", tags=["admin"])


class MemberCreate(BaseModel):
    name: str
    email: EmailStr
    facebook_url: str = ""
    role: str = "new_member"


class MemberUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    facebook_url: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None


class ProgramUpdate(BaseModel):
    mentor_id: Optional[int] = None
    title: Optional[str] = None


class MentorUpdate(BaseModel):
    program_number: Optional[int] = None
    zoom_url: Optional[str] = None
    preferred_meeting: Optional[str] = None


@router.get("/dashboard")
async def get_dashboard(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user),
):
    nm_query = db.query(models.NewMember).options(
        joinedload(models.NewMember.user),
        joinedload(models.NewMember.bookings).joinedload(models.Booking.program),
    )
    if current_user.role == models.RoleEnum.new_member:
        if not current_user.new_member:
            raise HTTPException(status_code=400, detail="新メンバー情報がありません")
        nm_query = nm_query.filter(models.NewMember.id == current_user.new_member.id)
    new_members = nm_query.all()

    programs = (
        db.query(models.Program)
        .options(joinedload(models.Program.mentor).joinedload(models.Mentor.user))
        .order_by(models.Program.number)
        .all()
    )

    members_data = []
    for nm in new_members:
        bookings_map = {}
        for b in nm.bookings:
            if b.program:
                bookings_map[b.program.number] = {
                    "booking_id": b.id,
                    "is_completed": b.is_completed,
                    "completed_at": b.completed_at,
                    "start_datetime": b.slot.start_datetime if b.slot else None,
                    "meeting_url": b.meeting_url,
                }

        completed = sum(1 for b in nm.bookings if b.is_completed)
        members_data.append({
            "id": nm.id,
            "user_id": nm.user_id,
            "name": nm.user.name,
            "email": nm.user.email,
            "facebook_url": nm.facebook_url,
            "completed_count": completed,
            "total_count": 10,
            "bookings": bookings_map,
        })

    programs_data = []
    for p in programs:
        programs_data.append({
            "id": p.id,
            "number": p.number,
            "title": p.title,
            "mentor_id": p.mentor_id,
            "mentor_name": p.mentor.user.name if p.mentor and p.mentor.user else None,
        })

    return {"members": members_data, "programs": programs_data}


@router.get("/members")
async def get_members(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.require_admin),
):
    users = db.query(models.User).options(
        joinedload(models.User.new_member),
        joinedload(models.User.mentor),
    ).filter(models.User.is_active == True).all()

    result = []
    for u in users:
        item = {
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "role": u.role.value,
            "is_active": u.is_active,
            "created_at": u.created_at,
        }
        if u.new_member:
            item["facebook_url"] = u.new_member.facebook_url
            item["new_member_id"] = u.new_member.id
        if u.mentor:
            item["mentor_id"] = u.mentor.id
            item["program_number"] = u.mentor.program_number
            item["zoom_url"] = u.mentor.zoom_url
            item["preferred_meeting"] = u.mentor.preferred_meeting.value if u.mentor.preferred_meeting else None
        result.append(item)
    return result


@router.post("/members")
async def create_member(
    req: MemberCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.require_admin),
):
    if db.query(models.User).filter(models.User.email == req.email).first():
        raise HTTPException(status_code=400, detail="このメールアドレスは既に登録されています")

    role = models.RoleEnum(req.role)
    user = models.User(name=req.name, email=req.email, role=role)
    db.add(user)
    db.flush()

    if role == models.RoleEnum.new_member:
        db.add(models.NewMember(user_id=user.id, facebook_url=req.facebook_url))
    elif role in (models.RoleEnum.mentor, models.RoleEnum.admin):
        db.add(models.Mentor(user_id=user.id))

    db.commit()
    db.refresh(user)
    return {"id": user.id, "name": user.name, "email": user.email, "role": user.role.value}


@router.put("/members/{user_id}")
async def update_member(
    user_id: int,
    req: MemberUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.require_admin),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません")

    if req.name is not None:
        user.name = req.name
    if req.email is not None:
        user.email = req.email
    if req.is_active is not None:
        user.is_active = req.is_active
    if req.role is not None:
        user.role = models.RoleEnum(req.role)

    if req.facebook_url is not None and user.new_member:
        user.new_member.facebook_url = req.facebook_url

    db.commit()
    return {"message": "更新しました"}


@router.delete("/members/{user_id}")
async def delete_member(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.require_admin),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません")

    user.is_active = False
    db.commit()
    return {"message": "削除しました"}


@router.get("/programs")
async def get_programs(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.require_mentor_or_admin),
):
    programs = (
        db.query(models.Program)
        .options(joinedload(models.Program.mentor).joinedload(models.Mentor.user))
        .order_by(models.Program.number)
        .all()
    )
    return [
        {
            "id": p.id,
            "number": p.number,
            "title": p.title,
            "mentor_id": p.mentor_id,
            "mentor_name": p.mentor.user.name if p.mentor and p.mentor.user else None,
        }
        for p in programs
    ]


@router.put("/programs/{program_id}")
async def update_program(
    program_id: int,
    req: ProgramUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.require_admin),
):
    program = db.query(models.Program).filter(models.Program.id == program_id).first()
    if not program:
        raise HTTPException(status_code=404, detail="プログラムが見つかりません")

    if req.mentor_id is not None:
        program.mentor_id = req.mentor_id
    if req.title is not None:
        program.title = req.title

    db.commit()
    return {"message": "更新しました"}


@router.put("/mentors/{mentor_id}")
async def update_mentor(
    mentor_id: int,
    req: MentorUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.require_admin),
):
    mentor = db.query(models.Mentor).filter(models.Mentor.id == mentor_id).first()
    if not mentor:
        raise HTTPException(status_code=404, detail="メンターが見つかりません")

    if req.program_number is not None:
        mentor.program_number = req.program_number
    if req.zoom_url is not None:
        mentor.zoom_url = req.zoom_url
    if req.preferred_meeting is not None:
        mentor.preferred_meeting = models.MeetingTypeEnum(req.preferred_meeting)

    db.commit()
    return {"message": "更新しました"}


@router.get("/mentors")
async def get_mentors(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.require_mentor_or_admin),
):
    mentors = (
        db.query(models.Mentor)
        .options(joinedload(models.Mentor.user))
        .join(models.User, models.Mentor.user_id == models.User.id)
        .filter(models.User.is_active == True)
        .all()
    )
    return [
        {
            "id": m.id,
            "user_id": m.user_id,
            "name": m.user.name,
            "email": m.user.email,
            "program_number": m.program_number,
            "zoom_url": m.zoom_url,
            "preferred_meeting": m.preferred_meeting.value if m.preferred_meeting else "google_meet",
        }
        for m in mentors
    ]
