"""
Security validations for authentication flow.
"""
import re
from typing import Tuple, Optional


def validate_password_strength(password: str) -> Tuple[bool, str]:
    """
    Validate password strength.
    
    Returns:
        Tuple[bool, str]: (is_valid, error_message)
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    if len(password) > 128:
        return False, "Password must be less than 128 characters"
    if not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one uppercase letter"
    if not re.search(r'[a-z]', password):
        return False, "Password must contain at least one lowercase letter"
    if not re.search(r'\d', password):
        return False, "Password must contain at least one digit"
    if not re.search(r'[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]', password):
        return False, "Password must contain at least one special character"
    return True, ""


def validate_email(email: str) -> Tuple[bool, str]:
    """
    Basic email validation.
    
    Returns:
        Tuple[bool, str]: (is_valid, error_message)
    """
    if not email:
        return False, "Email is required"
    email = email.strip().lower()
    if len(email) > 255:
        return False, "Email is too long"
    return True, ""


def validate_full_name(full_name: Optional[str]) -> Tuple[bool, str]:
    """
    Basic full name validation.
    
    Returns:
        Tuple[bool, str]: (is_valid, error_message)
    """
    if full_name:
        full_name = full_name.strip()
        if len(full_name) > 100:
            return False, "Full name is too long"
        if len(full_name) < 2:
            return False, "Full name must be at least 2 characters long"
        if not re.match(r'^[a-zA-Z\s\-\']+$', full_name):
            return False, "Full name contains invalid characters"
    return True, ""


def sanitize_input(value: str, max_length: Optional[int] = None) -> str:
    """
    Sanitize input by trimming and limiting length.
    
    Args:
        value: Input string to sanitize
        max_length: Maximum allowed length
        
    Returns:
        str: Sanitized string
    """
    if not value:
        return ""
    value = value.strip()
    # Remove null bytes
    value = value.replace('\x00', '')
    if max_length and len(value) > max_length:
        value = value[:max_length]
    return value


def passwords_differ(current_password: str, new_password: str) -> bool:
    """
    Check if new password is different from current password.
    
    Args:
        current_password: Current password hash
        new_password: New password (plain text)
        
    Returns:
        bool: True if passwords are different
    """
    return current_password != new_password

