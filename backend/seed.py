"""初期データを投入するスクリプト"""
from database import engine, SessionLocal
import models
import auth as auth_utils

models.Base.metadata.create_all(bind=engine)

PROGRAMS = [
    (1, "役割・アジェンダ・期待・毎週のコミットメント"),
    (2, "BNIの規定（ゲームのルール）、PALMSレポート、メンバー・トラフィックライト・レポート"),
    (3, "略歴シート、スピーカーローテーション、チャプター運営費、更新費用の支払い"),
    (4, "出席、代理出席プログラム"),
    (5, "リファーラルとリードの違い、CEU（チャプター・エデュケーションユニット）"),
    (6, "1to1のやり方とマナー、GAINSシートの交換"),
    (7, "チャプターツール：BNIコネクトのプロフィール、メンバー活動の記録"),
    (8, "ゴールドクラブ・メンバー、ビジターの招待、ビジターの価値"),
    (9, "ビジターホストを1日体験"),
    (10, "トレーニングおよびイベントのカレンダー、オンライン申し込み"),
]

MENTORS = [
    ("月野さやか", "tsukino.sayaka.info@gmail.com", 1),
    ("大庭平八郎", "heihachiro32@gmail.com", 2),
    ("追傍章", "sako@zuantedesign.com", 3),
    ("赤井拓也", "akataku.takuya@gmail.com", 4),
    ("高橋もえ", "mh924gl@gmail.com", 5),
    ("前弥惠", "nimoyae3388@gmail.com", 6),
    ("澤田北斗", "sawada.h.1008@gmail.com", 7),
    ("山崎けい", "office.capybara@gmail.com", 8),
    ("内山智美", "paean.t@gmail.com", 9),
    ("山口正和", "p.needs.yamaguchi@gmail.com", 10),
]

NEW_MEMBERS = [
    ("浅井健一", "k.asai.sunline@gmail.com", ""),
    ("岡田元一", "motokyun@gmail.com", "https://www.facebook.com"),
    ("上垣正博", "nextdoor.uegaki@gmail.com", "https://www.facebook.com"),
    ("林崎寿々", "p.massage.suzu@gmail.com", "https://www.facebook.com"),
    ("原田葉月", "harada.yougetsu@gmail.com", ""),
]

ADMIN = ("田口俊介", "taguchi.aix@gmail.com", "admin123")
NEW_MEMBER_TEST = ("田口俊介（新メンバー）", "taguchishunsuke@gmail.com", "")


def run(db=None):
    close_db = db is None
    if db is None:
        db = SessionLocal()
    try:
        admin_user = db.query(models.User).filter(models.User.email == ADMIN[1]).first()
        if not admin_user:
            admin_user = models.User(
                name=ADMIN[0],
                email=ADMIN[1],
                password_hash=auth_utils.get_password_hash(ADMIN[2]),
                role=models.RoleEnum.admin,
            )
            db.add(admin_user)
            db.flush()
            db.add(models.Mentor(user_id=admin_user.id, program_number=None))
            print(f"Admin created: {ADMIN[0]}")

        for prog_num, title in PROGRAMS:
            prog = db.query(models.Program).filter(
                models.Program.number == prog_num,
                models.Program.term == 12,
            ).first()
            if not prog:
                db.add(models.Program(number=prog_num, title=title, term=12))

        db.flush()

        for name, email, prog_num in MENTORS:
            user = db.query(models.User).filter(models.User.email == email).first()
            if not user:
                user = models.User(name=name, email=email, role=models.RoleEnum.mentor)
                db.add(user)
                db.flush()
                mentor = models.Mentor(user_id=user.id, program_number=prog_num)
                db.add(mentor)
                db.flush()

                prog = db.query(models.Program).filter(
                    models.Program.number == prog_num,
                    models.Program.term == 12,
                ).first()
                if prog:
                    prog.mentor_id = mentor.id

        for name, email, fb_url in NEW_MEMBERS:
            user = db.query(models.User).filter(models.User.email == email).first()
            if not user:
                user = models.User(name=name, email=email, role=models.RoleEnum.new_member)
                db.add(user)
                db.flush()
                db.add(models.NewMember(user_id=user.id, facebook_url=fb_url))

        test_nm = db.query(models.User).filter(models.User.email == NEW_MEMBER_TEST[1]).first()
        if not test_nm:
            test_nm = models.User(
                name=NEW_MEMBER_TEST[0],
                email=NEW_MEMBER_TEST[1],
                password_hash=auth_utils.get_password_hash("member123"),
                role=models.RoleEnum.new_member,
            )
            db.add(test_nm)
            db.flush()
            db.add(models.NewMember(user_id=test_nm.id, facebook_url=NEW_MEMBER_TEST[2]))

        db.commit()
        print("Seed completed.")
    except Exception as e:
        db.rollback()
        print(f"Seed error: {e}")
        raise
    finally:
        if close_db:
            db.close()


if __name__ == "__main__":
    run()
