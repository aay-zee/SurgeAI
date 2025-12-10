from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta, datetime
from . import models, schemas, crud
from .database import engine, SessionLocal
from .auth import (
    get_current_active_user,
    get_current_admin_user,
    create_access_token,
    create_refresh_token,
    verify_token,
    create_password_reset_token,
    verify_reset_token,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    RESET_TOKEN_EXPIRE_HOURS,
    verify_password,
)
from .services.email_service import send_password_reset_email, send_welcome_email
# Ensure the Celery app (configured with Redis) is loaded before importing tasks
from tasks.celery_worker import celery_app
celery_app.set_default()
from tasks.reddit_scraper import scrape_reddit_for_campaign

#All the db tables are beung created here
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="SurgeAI Backend")

# Allow frontend (Vite dev server) to call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

#we are getting the db session here by using this function
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Authentication endpoints
@app.post("/auth/register", response_model=schemas.Token, status_code=status.HTTP_201_CREATED)
async def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    """Register a new user. All signups are automatically CLIENT role."""
    # Check if user already exists
    db_user = crud.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered"
        )
    
    # Create new user (role defaults to CLIENT in model)
    db_user = crud.create_user(db=db, user=user)
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user"
        )
    
    # Send welcome email (non-blocking)
    try:
        await send_welcome_email(db_user.email, db_user.full_name)
    except Exception as e:
        print(f"Error sending welcome email: {e}")
    
    # Generate tokens with role
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    refresh_token_expires = timedelta(days=7)
    access_token = create_access_token(
        data={"sub": db_user.email, "role": db_user.role.value}, expires_delta=access_token_expires
    )
    refresh_token = create_refresh_token(
        data={"sub": db_user.email, "role": db_user.role.value}, expires_delta=refresh_token_expires
    )
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

@app.post("/auth/login", response_model=schemas.Token, status_code=status.HTTP_200_OK)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Login and get access token."""
    user = crud.authenticate_user(db, email=form_data.username, password=form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive"
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    refresh_token_expires = timedelta(days=7)
    access_token = create_access_token(
        data={"sub": user.email, "role": user.role.value}, expires_delta=access_token_expires
    )
    refresh_token = create_refresh_token(
        data={"sub": user.email, "role": user.role.value}, expires_delta=refresh_token_expires
    )
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

@app.post("/auth/refresh", response_model=schemas.Token, status_code=status.HTTP_200_OK)
def refresh_token(token_data: schemas.TokenRefresh, db: Session = Depends(get_db)):
    """Refresh access token using refresh token."""
    payload = verify_token(token_data.refresh_token, token_type="refresh")
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    email: str = payload.get("sub")
    if email is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    
    user = crud.get_user_by_email(db, email=email)
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )
    
    # Generate new access token with role
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email, "role": user.role.value}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "refresh_token": token_data.refresh_token,  # Return same refresh token
        "token_type": "bearer"
    }

@app.post("/auth/logout", status_code=status.HTTP_200_OK)
def logout(current_user: models.User = Depends(get_current_active_user)):
    """Logout endpoint (client should discard token)."""
    # In a stateless JWT system, logout is handled client-side
    # For enhanced security, you could implement token blacklisting with Redis
    return {"message": "Successfully logged out"}

@app.get("/auth/me", response_model=schemas.UserResponse, status_code=status.HTTP_200_OK)
def get_current_user_info(current_user: models.User = Depends(get_current_active_user)):
    """Get current user information."""
    return current_user

@app.post("/auth/forgot-password", status_code=status.HTTP_200_OK)
async def forgot_password(request: schemas.ForgotPassword, db: Session = Depends(get_db)):
    """Request password reset."""
    user = crud.get_user_by_email(db, email=request.email)
    
    # Don't reveal if email exists for security
    if not user:
        return {"message": "If the email exists, a password reset link has been sent."}
    
    # Generate reset token
    reset_token = create_password_reset_token(user.email)
    expires_at = datetime.utcnow() + timedelta(hours=RESET_TOKEN_EXPIRE_HOURS)
    
    # Store reset token in database
    crud.set_reset_token(db, user, reset_token, expires_at)
    
    # Send reset email
    try:
        await send_password_reset_email(user.email, reset_token)
    except Exception as e:
        print(f"Error sending reset email: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send reset email"
        )
    
    return {"message": "If the email exists, a password reset link has been sent."}

@app.post("/auth/reset-password", status_code=status.HTTP_200_OK)
def reset_password(request: schemas.ResetPassword, db: Session = Depends(get_db)):
    """Reset password using reset token."""
    # Verify reset token
    email = verify_reset_token(request.token)
    if not email:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid or expired reset token"
        )
    
    # Get user
    user = crud.get_user_by_email(db, email=email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check if token is expired (additional check)
    if user.reset_token_expires_at and user.reset_token_expires_at < datetime.utcnow():
        crud.clear_reset_token(db, user)
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="Reset token has expired"
        )
    
    # Check if new password is different from current password
    if verify_password(request.new_password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="New password must be different from current password"
        )
    
    # Update password
    crud.update_user_password(db, user, request.new_password)
    
    # Clear reset token
    crud.clear_reset_token(db, user)
    
    return {"message": "Password has been reset successfully"}

@app.post("/auth/change-password", status_code=status.HTTP_200_OK)
def change_password(
    request: schemas.PasswordChange,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Change password for logged-in user."""
    # Verify current password
    if not crud.authenticate_user(db, current_user.email, request.current_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect current password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Update password
    crud.update_user_password(db, current_user, request.new_password)
    
    return {"message": "Password has been changed successfully"}

# Campaign endpoints (protected)
@app.post("/campaigns/", response_model=schemas.Campaign)
def create_campaign_and_scrape(
    campaign: schemas.CampaignCreate,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Creates a campaign in the database and triggers a background
    scraping task. Requires authentication.
    """
    # Save the campaign to the database associated with current user
    db_campaign = crud.create_campaign(db=db, campaign=campaign, user_id=current_user.id)
    
    # Trigger the Celery background task
    scrape_reddit_for_campaign.delay(db_campaign.id)
    
    return db_campaign

@app.get("/campaigns/{campaign_id}", response_model=schemas.Campaign)
def read_campaign(
    campaign_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Retrieves campaign details and status. Requires authentication.
    User can only access their own campaigns.
    """
    db_campaign = crud.get_campaign(db, campaign_id, user_id=current_user.id)
    if not db_campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found"
        )
    return db_campaign

@app.get("/campaigns/{campaign_id}/scraped-data", response_model=list[schemas.ScrapedData])
def list_scraped_data(
    campaign_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Returns recent scraped data rows for a campaign. Useful for UI polling.
    Requires authentication. User can only access their own campaigns.
    """
    # Verify campaign belongs to user
    campaign = crud.get_campaign(db, campaign_id, user_id=current_user.id)
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found"
        )
    return crud.get_scraped_data_for_campaign(db, campaign_id, limit=200)