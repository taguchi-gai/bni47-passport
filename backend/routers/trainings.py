from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List
from database import get_db
import models
import auth as auth_utils

router = APIRouter(prefix="/api/trainings", tags=["trainings"])

# トレーニングマスターの初期データ（name, display_order, recommended_days）
DEFAULT_TRAININGS = [
    ("MSP2.0", 1, 30),
    ("アクセラレーター", 2, 90),
    ("ウィークリープレゼン", 3, None),
    ("1to1", 4, None),
    ("リファーラル", 5, None),
    ("メインプレゼン", 6, None),
    ("チャプターディベロップメント", 7, None),
    ("ネットワーキングスキル", 8, None),
    ("MSアドオン", 9, None),
]


class FirstMeetingDateUpdate(BaseModel):
    first_meeting_date: Optional[str] = None  # "YYYY-MM-DD" 形式。None で未設定に戻す


def seed_trainings(db: Session):
    """トレーニングマスターが未投入なら初期データを入れる"""
    for name, order, days in DEFAULT_TRAININGS:
        existing = db.query(models.Training).filter(models.Training.name == name).first()
        if not existing:
            db.add(models.Training(name=name, display_order=order, recommended_days=days))
    db.commit()


def _can_edit_member(current_user: models.User, new_member_id: int) -> bool:
    """メンター・管理者は全員分、新メンバーは自分の分のみ操作できる"""
    if current_user.role in (models.RoleEnum.admin, models.RoleEnum.mentor):
        return True
    return bool(current_user.new_member and current_user.new_member.id == new_member_id)


@router.get("/")
async def list_trainings(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user),
):
    trainings = (
        db.query(models.Training)
        .filter(models.Training.is_active == True)
        .order_by(models.Training.display_order)
        .all()
    )
    return [
        {
            "id": t.id,
            "name": t.name,
            "display_order": t.display_order,
            "recommended_days": t.recommended_days,
        }
        for t in trainings
    ]


@router.get("/records")
async def get_training_records(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user),
):
    """
    トレーニング受講状況を返す。
    新メンバーは自分の分のみ、メンター・管理者は全新メンバー分を取得する。
    """
    trainings = (
        db.query(models.Training)
        .filter(models.Training.is_active == True)
        .order_by(models.Training.display_order)
        .all()
    )

    nm_query = (
        db.query(models.NewMember)
        .join(models.User, models.NewMember.user_id == models.User.id)
        .options(
            joinedload(models.NewMember.user),
            joinedload(models.NewMember.training_records).joinedload(models.TrainingRecord.completed_by),
        )
        .filter(models.User.is_active == True)
        .filter(models.User.role == models.RoleEnum.new_member)
    )

    if current_user.role == models.RoleEnum.new_member:
        if not current_user.new_member:
            raise HTTPException(status_code=400, detail="新メンバー情報がありません")
        nm_query = nm_query.filter(models.NewMember.id == current_user.new_member.id)

    new_members = nm_query.all()

    members_data = []
    for nm in new_members:
        records_map = {}
        for r in nm.training_records:
            records_map[r.training_id] = {
                "is_completed": r.is_completed,
                "completed_at": r.completed_at,
                "completed_by_name": r.completed_by.name if r.completed_by else None,
            }

        completed = sum(1 for r in nm.training_records if r.is_completed)
        members_data.append({
            "id": nm.id,
            "name": nm.user.name,
            "email": nm.user.email,
            "first_meeting_date": nm.first_meeting_date,
            "records": records_map,
            "completed_count": completed,
            "total_count": len(trainings),
        })

    return {
        "trainings": [
            {
                "id": t.id,
                "name": t.name,
                "display_order": t.display_order,
                "recommended_days": t.recommended_days,
            }
            for t in trainings
        ],
        "members": members_data,
    }


@router.patch("/records/{new_member_id}/{training_id}")
async def toggle_training_record(
    new_member_id: int,
    training_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user),
):
    """受講完了チェックの ON/OFF を切り替える"""
    if not _can_edit_member(current_user, new_member_id):
        raise HTTPException(status_code=403, detail="このメンバーのトレーニングを操作する権限がありません")

    new_member = db.query(models.NewMember).filter(models.NewMember.id == new_member_id).first()
    if not new_member:
        raise HTTPException(status_code=404, detail="新メンバーが見つかりません")

    training = db.query(models.Training).filter(models.Training.id == training_id).first()
    if not training:
        raise HTTPException(status_code=404, detail="トレーニングが見つかりません")

    record = (
        db.query(models.TrainingRecord)
        .filter(
            models.TrainingRecord.new_member_id == new_member_id,
            models.TrainingRecord.training_id == training_id,
        )
        .first()
    )

    if not record:
        record = models.TrainingRecord(
            new_member_id=new_member_id,
            training_id=training_id,
            is_completed=True,
            completed_at=datetime.utcnow(),
            completed_by_user_id=current_user.id,
        )
        db.add(record)
    elif record.is_completed:
        record.is_completed = False
        record.completed_at = None
        record.completed_by_user_id = None
    else:
        record.is_completed = True
        record.completed_at = datetime.utcnow()
        record.completed_by_user_id = current_user.id

    db.commit()
    db.refresh(record)

    return {
        "new_member_id": new_member_id,
        "training_id": training_id,
        "is_completed": record.is_completed,
        "completed_at": record.completed_at,
        "completed_by_name": current_user.name if record.is_completed else None,
    }


@router.put("/members/{new_member_id}/first-meeting-date")
async def update_first_meeting_date(
    new_member_id: int,
    req: FirstMeetingDateUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.require_mentor_or_admin),
):
    """初回定例会参加日を設定する（トレーニング推奨期限の起算日）"""
    new_member = db.query(models.NewMember).filter(models.NewMember.id == new_member_id).first()
    if not new_member:
        raise HTTPException(status_code=404, detail="新メンバーが見つかりません")

    if req.first_meeting_date:
        try:
            new_member.first_meeting_date = datetime.strptime(req.first_meeting_date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(status_code=400, detail="日付の形式が正しくありません（YYYY-MM-DD）")
    else:
        new_member.first_meeting_date = None

    db.commit()
    return {
        "new_member_id": new_member_id,
        "first_meeting_date": new_member.first_meeting_date,
    }
