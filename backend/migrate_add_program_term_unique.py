"""programs テーブルに (number, term) の一意制約を追加するマイグレーション"""
import sys
if sys.stdout.encoding != 'utf-8':
    sys.stdout = open(sys.stdout.fileno(), mode='w', encoding='utf-8', buffering=1)

from sqlalchemy import text
from database import engine

with engine.connect() as conn:
    dialect = engine.dialect.name
    print(f"dialect: {dialect}")

    if dialect == "postgresql":
        # 既に同名の制約があればスキップ
        exists = conn.execute(text("""
            SELECT 1 FROM pg_constraint WHERE conname = 'uq_program_number_term'
        """)).first()
        if exists:
            print("constraint already exists, skip")
        else:
            conn.execute(text("""
                ALTER TABLE programs ADD CONSTRAINT uq_program_number_term UNIQUE (number, term)
            """))
            print("constraint added")
    else:
        # SQLite は制約の後付けが煩雑なため、ローカル開発では検証のみ行い実施しない
        print("sqlite: skip (制約はモデル定義側でのみ有効)")

    conn.commit()
    print("Migration completed.")
