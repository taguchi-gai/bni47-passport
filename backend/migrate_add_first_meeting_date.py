"""new_members テーブルに first_meeting_date カラムを追加するマイグレーション"""
import sys
if sys.stdout.encoding != 'utf-8':
    sys.stdout = open(sys.stdout.fileno(), mode='w', encoding='utf-8', buffering=1)

from sqlalchemy import text
from database import engine

with engine.connect() as conn:
    dialect = engine.dialect.name
    print(f"dialect: {dialect}")

    if dialect == "postgresql":
        conn.execute(text("""
            ALTER TABLE new_members ADD COLUMN IF NOT EXISTS first_meeting_date TIMESTAMP;
        """))
    else:
        # SQLite: IF NOT EXISTS 非対応のため存在チェック
        result = conn.execute(text("PRAGMA table_info(new_members)"))
        cols = [row[1] for row in result]
        if "first_meeting_date" not in cols:
            conn.execute(text("ALTER TABLE new_members ADD COLUMN first_meeting_date DATETIME"))

    conn.commit()
    print("Migration completed.")
