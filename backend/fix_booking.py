"""原田葉月の#1予約をクリアするスクリプト"""
from database import SessionLocal
import models
from services.google_calendar import delete_event

db = SessionLocal()

try:
    # 原田葉月を取得
    harada = db.query(models.User).filter(models.User.name == "原田葉月").first()
    if not harada:
        print("原田葉月が見つかりません")
    else:
        new_member = db.query(models.NewMember).filter(models.NewMember.user_id == harada.id).first()
        if new_member:
            # プログラム#1の予約を取得
            booking = (
                db.query(models.Booking)
                .filter(
                    models.Booking.new_member_id == new_member.id,
                    models.Booking.program_id == 1,
                )
                .first()
            )
            if booking:
                print(f"削除対象: booking_id={booking.id}")

                # Google Calendar イベント削除
                if booking.google_event_id and booking.google_event_id != "dummy":
                    try:
                        delete_event(booking.google_event_id)
                        print(f"Google Calendar イベント削除完了: {booking.google_event_id}")
                    except Exception as e:
                        print(f"Calendar delete error: {e}")

                # スロットを未予約に戻す
                if booking.slot:
                    booking.slot.is_booked = False
                    print(f"スロットを未予約に戻す: slot_id={booking.slot.id}")

                # 予約を削除
                db.delete(booking)
                db.commit()
                print("✅ 原田葉月の#1予約をクリアしました")
            else:
                print("原田葉月の#1予約が見つかりません")
        else:
            print("原田葉月の新メンバー情報が見つかりません")

except Exception as e:
    db.rollback()
    print(f"エラー: {e}")
    raise
finally:
    db.close()
