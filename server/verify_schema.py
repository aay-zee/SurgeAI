import sys
import os
from unittest.mock import MagicMock

# Mock env vars to pass validation
os.environ["MAIL_FROM"] = "test@example.com"

# Mock heavy dependencies to avoid installing them just for schema verification
sys.modules["transformers"] = MagicMock()
sys.modules["torch"] = MagicMock()
sys.modules["app.services.email_service"] = MagicMock()

# Add current directory to path so we can import app
sys.path.append(os.getcwd())

try:
    from app.database import engine
    from app import models
    from app.main import app
    print("Successfully imported app and models.")

    print("Attempting to inspect models...")
    # Check for new attribute names to ensure they exist on the classes
    assert hasattr(models.User, 'user_id'), "User model missing user_id"
    assert hasattr(models.User, 'password_hash'), "User model missing password_hash"
    assert hasattr(models.Campaign, 'campaign_id'), "Campaign model missing campaign_id"
    
    print("Verification successful: Models have updated attributes.")
except ImportError as e:
    print(f"Import Error: {e}")
    sys.exit(1)
except AssertionError as e:
    print(f"Schema Error: {e}")
    sys.exit(1)
except Exception as e:
    print(f"Unexpected Error: {e}")
    sys.exit(1)
