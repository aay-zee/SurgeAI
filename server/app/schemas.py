from pydantic import BaseModel, EmailStr, field_validator, model_validator
from datetime import datetime
from typing import Optional
from .models import CampaignStatus, Platform, UserRole
from .validations import (
    validate_password_strength,
    validate_email,
    validate_full_name,
    sanitize_input
)

# Authentication schemas
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None
    
    @field_validator('email')
    @classmethod
    def validate_email_field(cls, v: str) -> str:
        """Validate and sanitize email."""
        is_valid, error_msg = validate_email(v)
        if not is_valid:
            raise ValueError(error_msg)
        return sanitize_input(v.lower(), max_length=255)
    
    @field_validator('password')
    @classmethod
    def validate_password_field(cls, v: str) -> str:
        """Validate password strength."""
        is_valid, error_msg = validate_password_strength(v)
        if not is_valid:
            raise ValueError(error_msg)
        return v
    
    @field_validator('full_name')
    @classmethod
    def validate_full_name_field(cls, v: Optional[str]) -> Optional[str]:
        """Validate and sanitize full name."""
        if v:
            is_valid, error_msg = validate_full_name(v)
            if not is_valid:
                raise ValueError(error_msg)
            return sanitize_input(v, max_length=100)
        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: Optional[str]
    role: UserRole
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class TokenRefresh(BaseModel):
    refresh_token: str

class ForgotPassword(BaseModel):
    email: EmailStr
    
    @field_validator('email')
    @classmethod
    def validate_email_field(cls, v: str) -> str:
        """Validate and sanitize email."""
        is_valid, error_msg = validate_email(v)
        if not is_valid:
            raise ValueError(error_msg)
        return sanitize_input(v.lower(), max_length=255)

class ResetPassword(BaseModel):
    token: str
    new_password: str
    
    @field_validator('new_password')
    @classmethod
    def validate_new_password_field(cls, v: str) -> str:
        """Validate new password strength."""
        is_valid, error_msg = validate_password_strength(v)
        if not is_valid:
            raise ValueError(error_msg)
        return v

class PasswordChange(BaseModel):
    current_password: str
    new_password: str
    
    @field_validator('new_password')
    @classmethod
    def validate_new_password_field(cls, v: str) -> str:
        """Validate new password strength."""
        is_valid, error_msg = validate_password_strength(v)
        if not is_valid:
            raise ValueError(error_msg)
        return v
    
    @model_validator(mode='after')
    def validate_passwords_differ(self):
        """Ensure new password is different from current password."""
        if self.current_password == self.new_password:
            raise ValueError("New password must be different from current password")
        return self

# Campaign schemas
class CampaignCreate(BaseModel):
    name: str
    description: str | None = None
    keywords: str #"ai chatbot, customer service, saas" --> just an example so things remain cler

class Campaign(BaseModel):
    id: int
    name: str
    description: str | None
    keywords: str
    status: CampaignStatus
    created_at: datetime
    user_id: int

    class Config:
        from_attributes = True


class ScrapedData(BaseModel):
    id: int
    campaign_id: int
    platform: Platform
    post_id: str | None = None
    post_url: str | None = None
    content: str | None = None
    author: str | None = None
    scraped_at: datetime

    class Config:
        from_attributes = True