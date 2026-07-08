"""users テーブルに reset_token, reset_token_expires カラムを追加するマイグレーション"""
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
            ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255);
        """))
        conn.execute(text("""
            ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP;
        """))
    else:
        # SQLite: IF NOT EXISTS 非対応のため存在チェック
        result = conn.execute(text("PRAGMA table_info(users)"))
        cols = [row[1] for row in result]
        if "reset_token" not in cols:
            conn.execute(text("ALTER TABLE users ADD COLUMN reset_token VARCHAR(255)"))
        if "reset_token_expires" not in cols:
            conn.execute(text("ALTER TABLE users ADD COLUMN reset_token_expires DATETIME"))

    conn.commit()
    print("Migration completed.")
