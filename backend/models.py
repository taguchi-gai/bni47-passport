from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base
import enum


class RoleEnum(str, enum.Enum):
    admin = "admin"
    mentor = "mentor"
    new_member = "new_member"


class MeetingTypeEnum(str, enum.Enum):
    google_meet = "google_meet"
    zoom = "zoom"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=True)
    role = Column(Enum(RoleEnum), nullable=False, default=RoleEnum.new_member)
    is_active = Column(Boolean, default=True)
    reset_token = Column(String(255), nullable=True)
    reset_token_expires = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    mentor = relationship("Mentor", back_populates="user", uselist=False)
    new_member = relationship("NewMember", back_populates="user", uselist=False)


class Mentor(Base):
    __tablename__ = "mentors"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    program_number = Column(Integer, nullable=True)  # 1-10
    zoom_url = Column(String(500), nullable=True)
    preferred_meeting = Column(Enum(MeetingTypeEnum), default=MeetingTypeEnum.google_meet)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="mentor")
    bookings = relationship("Booking", back_populates="mentor")


class NewMember(Base):
    __tablename__ = "new_members"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    facebook_url = Column(String(500), nullable=True)
    program_term = Column(Integer, default=12)  # 期
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="new_member")
    availability_slots = relationship("AvailabilitySlot", back_populates="new_member")
    bookings = relationship("Booking", back_populates="new_member")


class AvailabilitySlot(Base):
    __tablename__ = "availability_slots"

    id = Column(Integer, primary_key=True, index=True)
    new_member_id = Column(Integer, ForeignKey("new_members.id"), nullable=False)
    start_datetime = Column(DateTime, nullable=False)
    is_booked = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    new_member = relationship("NewMember", back_populates="availability_slots")
    booking = relationship("Booking", back_populates="slot", uselist=False)


class Program(Base):
    __tablename__ = "programs"

    id = Column(Integer, primary_key=True, index=True)
    number = Column(Integer, nullable=False)  # 1-10
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    mentor_id = Column(Integer, ForeignKey("mentors.id"), nullable=True)
    term = Column(Integer, default=12)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    mentor = relationship("Mentor")
    bookings = relationship("Booking", back_populates="program")


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    slot_id = Column(Integer, ForeignKey("availability_slots.id"), unique=True, nullable=False)
    mentor_id = Column(Integer, ForeignKey("mentors.id"), nullable=False)
    new_member_id = Column(Integer, ForeignKey("new_members.id"), nullable=False)
    program_id = Column(Integer, ForeignKey("programs.id"), nullable=True)
    meeting_url = Column(String(500), nullable=True)
    meeting_type = Column(Enum(MeetingTypeEnum), default=MeetingTypeEnum.google_meet)
    google_event_id = Column(String(200), nullable=True)
    is_completed = Column(Boolean, default=False)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    slot = relationship("AvailabilitySlot", back_populates="booking")
    mentor = relationship("Mentor", back_populates="bookings")
    new_member = relationship("NewMember", back_populates="bookings")
    program = relationship("Program", back_populates="bookings")
