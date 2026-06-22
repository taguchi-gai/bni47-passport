import os
from dotenv import load_dotenv
load_dotenv()
from services.google_calendar import create_meet_event
from datetime import datetime, timedelta

print("Testing Google Calendar API...")
result = create_meet_event(
    summary="test",
    start_datetime=datetime.now() + timedelta(days=1),
    mentor_name="test mentor",
    mentor_email="taguchi.aix@gmail.com",
    new_member_name="test member",
    new_member_email="taguchishunsuke@gmail.com",
    program_number=1,
)
print("event_id:", result["event_id"])
print("meet_url:", result["meet_url"])
if result["meet_url"] and "dummy" not in result["meet_url"]:
    print("SUCCESS: Google Meet URL generated!")
else:
    print("WARNING: dummy URL returned")
