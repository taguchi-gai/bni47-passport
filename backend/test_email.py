import asyncio
import os
from dotenv import load_dotenv
load_dotenv()
from services.email_service import send_booking_notification
from datetime import datetime, timedelta

async def main():
    print("Testing Gmail SMTP...")
    dt = datetime.now() + timedelta(days=1)
    await send_booking_notification(
        mentor_name="test mentor",
        mentor_email="taguchi.aix@gmail.com",
        new_member_name="test member",
        new_member_email="taguchi.aix@gmail.com",
        program_number=1,
        program_title="BNIパスポート テスト",
        meeting_datetime=dt.strftime("%Y年%m月%d日 %H:%M"),
        meeting_url="https://meet.google.com/gzu-ebdn-bvb",
    )
    print("SUCCESS: Email sent!")

asyncio.run(main())
