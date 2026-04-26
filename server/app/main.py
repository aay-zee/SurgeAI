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
from celery import group, chain
from tasks.reddit_scraper import scrape_reddit_for_campaign
from tasks.hackernews_scraper import scrape_hackernews_for_campaign
from tasks.google_play_scraper import scrape_google_play_for_campaign
from tasks.google_trends_scraper import scrape_google_trends_for_campaign
from tasks.relevance_filter_task import run_relevance_filter
from tasks.nlp_analysis import run_sentiment_for_campaign
from tasks.validation_engine import compute_validation_score

#All the db tables are beung created here
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="SurgeAI Backend")

# Allow frontend to call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Next.js default port
        "http://127.0.0.1:3000",
        "http://localhost:5173",  # Vite (if used)
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    print(f"Validation error: {exc.errors()}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": jsonable_encoder(exc.errors())},
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
        
    # Update last login time
    user.last_login = datetime.utcnow()
    db.commit()
    
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
    if verify_password(request.new_password, user.password_hash):
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
@app.get("/campaigns", response_model=list[schemas.Campaign])
def list_campaigns(
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """List all campaigns for the current user."""
    campaigns = crud.get_all_campaigns(db, user_id=current_user.user_id)
    return campaigns

@app.post("/campaigns", response_model=schemas.Campaign, status_code=status.HTTP_201_CREATED)
def create_campaign_and_scrape(
    campaign: schemas.CampaignCreate,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Creates a campaign in the database and triggers background
    scraping tasks for selected platforms. Requires authentication.
    """
    # Save the campaign to the database associated with current user
    db_campaign = crud.create_campaign(db=db, campaign=campaign, user_id=current_user.user_id)
    
    # Build scraper tasks — Reddit and HackerNews only.
    # Google Play and Google Trends are fetched on-demand by the Intelligence Layer.
    cid = db_campaign.campaign_id
    scraper_tasks = []
    for platform in campaign.platforms:
        if platform == models.Platform.REDDIT:
            scraper_tasks.append(scrape_reddit_for_campaign.si(cid))
        elif platform == models.Platform.HACKER_NEWS:
            scraper_tasks.append(scrape_hackernews_for_campaign.si(cid))

    if scraper_tasks:
        try:
            # Pipeline:
            #   1. Reddit + HackerNews scrapers run in parallel
            #   2. Relevance filter marks off-topic posts as is_relevant=False
            #   3. NLP runs only on relevant posts
            #   4. Validation score is computed from NLP results
            (
                group(*scraper_tasks) |
                run_relevance_filter.si(cid) |
                run_sentiment_for_campaign.si(cid) |
                compute_validation_score.si(cid)
            ).apply_async()
        except Exception as e:
            print(f"Warning: Could not queue scraping pipeline: {e}")
            print("Note: Celery/Redis may not be running. Scraping will not occur.")
        # elif platform == models.Platform.TWITTER:
        #     try:
        #         scrape_twitter_for_campaign.delay(db_campaign.campaign_id)
        #     except Exception as e:
        #         print(f"Warning: Could not queue Twitter scraping task: {e}")
        # elif platform == models.Platform.QUORA:
        #     try:
        #         scrape_quora_for_campaign.delay(db_campaign.campaign_id)
        #     except Exception as e:
        #         print(f"Warning: Could not queue Quora scraping task: {e}")
    
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
    db_campaign = crud.get_campaign(db, campaign_id, user_id=current_user.user_id)
    if not db_campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found"
        )
    return db_campaign

@app.put("/campaigns/{campaign_id}", response_model=schemas.Campaign)
def update_campaign(
    campaign_id: int,
    campaign_update: schemas.CampaignCreate,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update campaign details. User can only update their own campaigns."""
    campaign = crud.get_campaign(db, campaign_id, user_id=current_user.user_id)
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found"
        )
    
    update_data = campaign_update.model_dump(exclude={"keywords"})
    update_data["platforms"] = [p.value for p in campaign_update.platforms]
    
    updated_campaign = crud.update_campaign(db, campaign_id, update_data, current_user.user_id)
    
    # Update keywords if provided
    if campaign_update.keywords:
        # Delete existing keywords
        existing_keywords = crud.get_keywords_by_campaign(db, campaign_id)
        for keyword in existing_keywords:
            crud.delete_keyword(db, keyword.keyword_id)
        
        # Add new keywords
        crud.create_keywords_bulk(db, campaign_id, campaign_update.keywords)
    
    db.refresh(updated_campaign)
    return updated_campaign

@app.delete("/campaigns/{campaign_id}", status_code=status.HTTP_200_OK)
def delete_campaign(
    campaign_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a campaign. User can only delete their own campaigns."""
    success = crud.delete_campaign(db, campaign_id, user_id=current_user.user_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found"
        )
    return {"message": "Campaign deleted successfully"}

@app.get("/campaigns/{campaign_id}/scraped-data", response_model=list[schemas.ScrapedData])
def list_scraped_data(
    campaign_id: int,
    keyword_id: int | None = None,
    platform: models.Platform | None = None,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Returns recent scraped data rows for a campaign.
    Optional filters: keyword_id, platform.
    Requires authentication. User can only access their own campaigns.
    """
    # Verify campaign belongs to user
    campaign = crud.get_campaign(db, campaign_id, user_id=current_user.user_id)
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found"
        )
    return crud.get_scraped_data_for_campaign(
        db, campaign_id, keyword_id=keyword_id, platform=platform, limit=200
    )

# Keyword endpoints
@app.post("/campaigns/{campaign_id}/keywords", response_model=list[schemas.Keyword], status_code=status.HTTP_201_CREATED)
def add_keywords(
    campaign_id: int,
    keywords_data: schemas.KeywordCreateBulk,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Add keywords to a campaign. User can only add to their own campaigns."""
    campaign = crud.get_campaign(db, campaign_id, user_id=current_user.user_id)
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found"
        )
    
    keywords = crud.create_keywords_bulk(db, campaign_id, keywords_data.keywords)
    return keywords

@app.get("/campaigns/{campaign_id}/keywords", response_model=list[schemas.Keyword])
def get_keywords(
    campaign_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all keywords for a campaign."""
    campaign = crud.get_campaign(db, campaign_id, user_id=current_user.user_id)
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found"
        )
    
    return crud.get_keywords_by_campaign(db, campaign_id)

@app.delete("/campaigns/{campaign_id}/keywords/{keyword_id}", status_code=status.HTTP_200_OK)
def delete_keyword(
    campaign_id: int,
    keyword_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a keyword from a campaign."""
    campaign = crud.get_campaign(db, campaign_id, user_id=current_user.user_id)
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found"
        )
    
    keyword = crud.get_keyword(db, keyword_id)
    if not keyword or keyword.campaign_id != campaign_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Keyword not found"
        )
    
    success = crud.delete_keyword(db, keyword_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Keyword not found"
        )
    
    return {"message": "Keyword deleted successfully"}

# Keyword Activity endpoints
@app.get("/campaigns/{campaign_id}/keywords/stats", response_model=list[schemas.KeywordStats])
def get_keywords_stats(
    campaign_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get activity stats for all keywords in a campaign."""
    campaign = crud.get_campaign(db, campaign_id, user_id=current_user.user_id)
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found"
        )
    
    keywords = crud.get_keywords_by_campaign(db, campaign_id)
    stats = []
    for keyword in keywords:
        stat = crud.get_keyword_stats(db, keyword.keyword_id)
        if stat:
            stats.append(stat)
    
    return stats

@app.get("/campaigns/{campaign_id}/keywords/{keyword_id}/activity", response_model=list[schemas.KeywordActivity])
def get_keyword_activity(
    campaign_id: int,
    keyword_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get activity for a specific keyword across all platforms."""
    campaign = crud.get_campaign(db, campaign_id, user_id=current_user.user_id)
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found"
        )
    
    keyword = crud.get_keyword(db, keyword_id)
    if not keyword or keyword.campaign_id != campaign_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Keyword not found"
        )
    
    return crud.get_all_keyword_activities(db, keyword_id)

@app.get("/campaigns/{campaign_id}/keywords/{keyword_id}/activity/{platform}", response_model=schemas.KeywordActivity)
def get_keyword_activity_by_platform(
    campaign_id: int,
    keyword_id: int,
    platform: models.Platform,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get activity for a keyword on a specific platform."""
    campaign = crud.get_campaign(db, campaign_id, user_id=current_user.user_id)
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found"
        )
    
    keyword = crud.get_keyword(db, keyword_id)
    if not keyword or keyword.campaign_id != campaign_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Keyword not found"
        )
    
    activity = crud.get_keyword_activity(db, keyword_id, platform)
    if not activity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Activity not found for this keyword and platform"
        )
    
    return activity

# Keyword Ranking endpoints
@app.get("/campaigns/{campaign_id}/keywords/ranking", response_model=schemas.KeywordRankingResponse)
def get_keyword_rankings(
    campaign_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get ranked keywords for a campaign (all platforms combined)."""
    campaign = crud.get_campaign(db, campaign_id, user_id=current_user.user_id)
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found"
        )
    
    rankings = crud.get_keyword_rankings(db, campaign_id, platform=None)
    
    return {
        "campaign_id": campaign_id,
        "platform": None,
        "keywords": rankings,
        "ranked_at": datetime.utcnow()
    }

@app.get("/campaigns/{campaign_id}/keywords/ranking/{platform}", response_model=schemas.KeywordRankingResponse)
def get_keyword_rankings_by_platform(
    campaign_id: int,
    platform: models.Platform,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get ranked keywords for a campaign filtered by platform."""
    campaign = crud.get_campaign(db, campaign_id, user_id=current_user.user_id)
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found"
        )
    
    rankings = crud.get_keyword_rankings(db, campaign_id, platform=platform)
    
    return {
        "campaign_id": campaign_id,
        "platform": platform,
        "keywords": rankings,
        "ranked_at": datetime.utcnow()
    }

# Posts/Data endpoints
@app.get("/campaigns/{campaign_id}/keywords/{keyword_id}/posts", response_model=list[schemas.ScrapedData])
def get_posts_by_keyword(
    campaign_id: int,
    keyword_id: int,
    platform: models.Platform | None = None,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get posts for a keyword, optionally filtered by platform."""
    campaign = crud.get_campaign(db, campaign_id, user_id=current_user.user_id)
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found"
        )
    
    keyword = crud.get_keyword(db, keyword_id)
    if not keyword or keyword.campaign_id != campaign_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Keyword not found"
        )
    
    
    return crud.get_scraped_data_by_keyword_and_platform(db, keyword_id, platform, limit=200)


@app.get("/campaigns/{campaign_id}/posts", response_model=list[schemas.ScrapedDataWithAnalysis])
def list_posts_with_analysis(
    campaign_id: int, 
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Return posts with nested NLP analysis for a campaign."""
    campaign = crud.get_campaign(db, campaign_id, user_id=current_user.user_id)
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found"
        )
    return crud.get_scraped_data_for_campaign(db, campaign_id, limit=200)


@app.get("/campaigns/{campaign_id}/sentiment-summary")
def sentiment_summary(
    campaign_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Return sentiment counts and percentages for the campaign."""
    campaign = crud.get_campaign(db, campaign_id, user_id=current_user.user_id)
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found"
        )
    return crud.get_campaign_sentiment_summary(db, campaign_id)


@app.get("/campaigns/{campaign_id}/validation-result", response_model=schemas.ValidationResultRead)
def get_validation_result(
    campaign_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Return the latest idea validation score and summary for a campaign."""
    campaign = crud.get_campaign(db, campaign_id, user_id=current_user.user_id)
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found"
        )
    result = crud.get_latest_validation_result(db, campaign_id)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Validation result not yet available. Campaign may still be processing."
        )
    return result


@app.post("/campaigns/{campaign_id}/analyze", status_code=status.HTTP_202_ACCEPTED)
def trigger_analysis(
    campaign_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Re-trigger the NLP analysis + validation pipeline for an existing campaign.
    Useful after adding new keywords or when re-running with a fresh model.
    Skips scraping — only processes any unanalysed posts already in the DB,
    then recomputes the validation score.
    """
    campaign = crud.get_campaign(db, campaign_id, user_id=current_user.user_id)
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found"
        )
    try:
        chain(
            run_sentiment_for_campaign.si(campaign_id),
            compute_validation_score.si(campaign_id),
        ).apply_async()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not queue analysis pipeline: {e}"
        )
    return {"message": "Analysis pipeline triggered", "campaign_id": campaign_id}


# ─────────────────── Intelligence Layer Endpoints ───────────────────

@app.post("/campaigns/{campaign_id}/calculate-validation")
def calculate_validation_scores(
    campaign_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Rule-based 8-dimension validation scoring."""
    campaign = crud.get_campaign(db, campaign_id, user_id=current_user.user_id)
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")

    from .validation_scorer import ValidationScorer
    scorer = ValidationScorer(campaign_id=campaign_id, db=db)
    scores = scorer.calculate_all_scores()

    # Persist to DB so GET /validation-score works
    vs = models.ValidationScore(
        campaign_id=campaign_id,
        market_size=scores.get("market_size", {}).get("score"),
        demand=scores.get("demand", {}).get("score"),
        problem_clarity=scores.get("problem_clarity", {}).get("score"),
        competitor_gap=scores.get("competitor_gap", {}).get("score"),
        technical_feasibility=scores.get("technical_feasibility", {}).get("score"),
        market_growth=scores.get("market_growth", {}).get("score"),
        pain_point_severity=scores.get("pain_point_severity", {}).get("score"),
        monetization_potential=scores.get("monetization_potential", {}).get("score"),
        overall_score=scores.get("overall_score"),
        market_size_reason=scores.get("market_size", {}).get("reason"),
        demand_reason=scores.get("demand", {}).get("reason"),
        problem_clarity_reason=scores.get("problem_clarity", {}).get("reason"),
        competitor_gap_reason=scores.get("competitor_gap", {}).get("reason"),
        technical_feasibility_reason=scores.get("technical_feasibility", {}).get("reason"),
        market_growth_reason=scores.get("market_growth", {}).get("reason"),
        pain_point_severity_reason=scores.get("pain_point_severity", {}).get("reason"),
        monetization_potential_reason=scores.get("monetization_potential", {}).get("reason"),
    )
    crud.create_or_update_validation_score(db, vs)

    return {"scores": scores, "overall_score": scores.get("overall_score", 0)}


@app.get("/campaigns/{campaign_id}/validation-score")
def get_validation_score(
    campaign_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Return the stored 8-dimension ValidationScore for a campaign."""
    campaign = crud.get_campaign(db, campaign_id, user_id=current_user.user_id)
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")

    vs = crud.get_validation_score(db, campaign_id)
    if not vs:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Validation scores not yet calculated.")
    return vs


@app.post("/campaigns/{campaign_id}/llm-validation")
def llm_validation_scoring(
    campaign_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """LLM-powered 8-dimension validation scoring with reasoning."""
    campaign = crud.get_campaign(db, campaign_id, user_id=current_user.user_id)
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")

    from .llm_analyzer import llm_validation_scoring as _llm_score
    scores = _llm_score(campaign_id=campaign_id, db=db)
    return {"scores": scores, "overall_score": scores.get("overall_score", 0)}


@app.post("/campaigns/{campaign_id}/extract-themes")
def extract_themes(
    campaign_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Extract complaint themes from negative posts using LLM."""
    campaign = crud.get_campaign(db, campaign_id, user_id=current_user.user_id)
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")

    from .llm_analyzer import extract_themes_llm
    themes = extract_themes_llm(campaign_id=campaign_id, db=db)
    crud.save_llm_themes(db, campaign_id, themes)
    return {"themes": themes, "theme_count": len(themes)}


@app.post("/campaigns/{campaign_id}/extract-competitor-themes")
def extract_competitor_themes(
    campaign_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """LLM identifies real competitors, fetches Google Play reviews, analyzes strengths/weaknesses."""
    campaign = crud.get_campaign(db, campaign_id, user_id=current_user.user_id)
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")

    from .llm_analyzer import analyze_competitors_llm
    competitor_data = analyze_competitors_llm(campaign_id=campaign_id, db=db)
    crud.save_llm_competitor_analysis(db, campaign_id, competitor_data)
    return {"competitor_apps": competitor_data, "competitor_count": len(competitor_data)}


@app.post("/campaigns/{campaign_id}/calculate-confidence")
def calculate_confidence(
    campaign_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Return a 0-100% confidence score for the validation data quality."""
    campaign = crud.get_campaign(db, campaign_id, user_id=current_user.user_id)
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")

    from .confidence_scorer import ConfidenceScorer
    scorer = ConfidenceScorer(campaign_id=campaign_id, db=db)
    result = scorer.calculate_confidence()
    return result


@app.get("/campaigns/{campaign_id}/market-signals")
def get_market_signals(
    campaign_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Derive market signals from data we actually have:
      - discussion_volume : total posts scraped (proxy for search interest)
      - trend_direction   : rising/stable/falling from GoogleTrendsPoint data
      - buying_intent_pct : % of posts classified as buying intent by BART
      - competitor_saturation : % of low-rated GP reviews (gap in market)
    """
    campaign = crud.get_campaign(db, campaign_id, user_id=current_user.user_id)
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")

    # 1. Discussion volume
    total_posts = db.query(models.ScrapedData).filter(
        models.ScrapedData.campaign_id == campaign_id
    ).count()

    # 2. Trend direction from Google Trends data
    trends = (
        db.query(models.GoogleTrendsPoint)
        .filter(models.GoogleTrendsPoint.campaign_id == campaign_id)
        .order_by(models.GoogleTrendsPoint.trend_date)
        .all()
    )
    trend_direction = None
    if len(trends) >= 10:
        recent = trends[-1].interest
        baseline = sum(t.interest for t in trends[:10]) / 10
        if recent > baseline * 1.1:
            trend_direction = "rising"
        elif recent < baseline * 0.9:
            trend_direction = "falling"
        else:
            trend_direction = "stable"
    elif len(trends) >= 2:
        trend_direction = "rising" if trends[-1].interest > trends[0].interest else (
            "falling" if trends[-1].interest < trends[0].interest else "stable"
        )

    # 3. Buying intent % from NLP analysis
    nlp_rows = (
        db.query(models.NLPAnalysis)
        .join(models.ScrapedData, models.ScrapedData.data_id == models.NLPAnalysis.data_id)
        .filter(models.ScrapedData.campaign_id == campaign_id)
        .all()
    )
    buying_intent_count = sum(1 for r in nlp_rows if r.intent == "buying intent")
    buying_intent_pct = round(buying_intent_count / len(nlp_rows) * 100, 1) if nlp_rows else 0

    # 4. Competitor saturation from Google Play reviews
    gp_data = db.query(models.GooglePlayData).filter(
        models.GooglePlayData.campaign_id == campaign_id
    ).all()
    competitor_saturation = None
    if gp_data:
        low_rated = sum(1 for r in gp_data if r.review_rating and r.review_rating <= 2)
        low_pct = low_rated / len(gp_data) * 100
        competitor_saturation = "low" if low_pct >= 30 else ("medium" if low_pct >= 15 else "high")

    return {
        "discussion_volume": total_posts,
        "trend_direction": trend_direction,
        "buying_intent_pct": buying_intent_pct,
        "competitor_saturation": competitor_saturation,
        "has_trends_data": len(trends) > 0,
        "has_gplay_data": len(gp_data) > 0,
    }


@app.post("/campaigns/{campaign_id}/generate-llm-report")
def generate_llm_report(
    campaign_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Generate a comprehensive written validation report using an LLM."""
    campaign = crud.get_campaign(db, campaign_id, user_id=current_user.user_id)
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")

    from .llm_report import generate_llm_report as _gen_report
    result = _gen_report(campaign_id=campaign_id, db=db)
    return result


@app.post("/campaigns/{campaign_id}/run-trends-scraper", status_code=status.HTTP_202_ACCEPTED)
def run_trends_scraper(
    campaign_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Dispatch the Google Trends scraper Celery task for this campaign.
    Fetches 12-month interest-over-time for each keyword.
    Results appear in /market-signals (trend_direction) once the task completes.
    """
    campaign = crud.get_campaign(db, campaign_id, user_id=current_user.user_id)
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    try:
        scrape_google_trends_for_campaign.delay(campaign_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not queue Google Trends task: {e}"
        )
    return {"message": "Google Trends scraper queued", "campaign_id": campaign_id}


@app.get("/campaigns/{campaign_id}/hackernews-data")
def get_hackernews_data(
    campaign_id: int,
    limit: int = 200,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Return Hacker News posts for a campaign."""
    campaign = crud.get_campaign(db, campaign_id, user_id=current_user.user_id)
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")

    return crud.get_scraped_data_for_campaign(
        db, campaign_id, platform=models.Platform.HACKER_NEWS, limit=limit
    )


@app.get("/campaigns/{campaign_id}/google-play-data")
def get_google_play_data(
    campaign_id: int,
    limit: int = 500,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Return Google Play competitor reviews for a campaign."""
    campaign = crud.get_campaign(db, campaign_id, user_id=current_user.user_id)
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")

    data = db.query(models.GooglePlayData).filter(
        models.GooglePlayData.campaign_id == campaign_id
    ).limit(limit).all()
    return data
