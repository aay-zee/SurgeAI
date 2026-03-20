from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import timedelta, datetime
from . import models, schemas, crud
from .database import engine, SessionLocal, run_migrations
from .validation_scorer import ValidationScorer
from .theme_extractor import ThemeExtractor, CompetitorThemeExtractor
from .confidence_scorer import ConfidenceScorer
from .llm_report import generate_llm_report
from .pipeline import run_validation_pipeline
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
# from .services.email_service import send_password_reset_email, send_welcome_email
# Ensure the Celery app (configured with Redis) is loaded before importing tasks
from tasks.celery_worker import celery_app
celery_app.set_default()
from celery import chain
from tasks.reddit_scraper import scrape_reddit_for_campaign
from tasks.hackernews_scraper import scrape_hackernews_for_campaign
from tasks.product_hunt_scraper import scrape_product_hunt_for_campaign
from tasks.quora_scraper import scrape_quora_for_campaign
from tasks.google_play_scraper import scrape_google_play_for_campaign
from tasks.search_volume_scraper import scrape_search_volume_for_campaign
from tasks.nlp_analysis import run_sentiment_for_campaign
from tasks.google_trends_scraper import scrape_google_trends_for_campaign

# Ensure new enum values are present in existing PostgreSQL databases.
def _ensure_postgres_platform_enum_values() -> None:
    if engine.dialect.name != "postgresql":
        return

    statement = text(
        """
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'platform') THEN
                ALTER TYPE platform ADD VALUE IF NOT EXISTS 'hacker_news';
            END IF;
        END
        $$;
        """
    )

    try:
        with engine.begin() as conn:
            conn.execute(statement)
    except Exception as exc:
        print(f"Warning: Could not update platform enum values automatically: {exc}")


_ensure_postgres_platform_enum_values()

# Initialize database: create tables if they don't exist (never drop)
try:
    print("Initializing database schema...")
    models.Base.metadata.create_all(bind=engine)
    run_migrations()
    print("[OK] Database tables ready")
except Exception as e:
    print(f"[ERROR] Database initialization error: {e}")

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
    # try:
    #     await send_welcome_email(db_user.email, db_user.full_name)
    # except Exception as e:
    #     print(f"Error sending welcome email: {e}")
    
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
    # try:
    #     await send_password_reset_email(user.email, reset_token)
    # except Exception as e:
    #     print(f"Error sending reset email: {e}")
    #     raise HTTPException(
    #         status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
    #         detail="Failed to send reset email"
    #     )
    
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
    # Keep Reddit and Hacker News coupled so both sources feed the same NLP pipeline.
    selected_platform_values = {p.value for p in campaign.platforms}
    if (
        models.CampaignPlatform.REDDIT.value in selected_platform_values
        and models.CampaignPlatform.HACKER_NEWS.value not in selected_platform_values
    ):
        campaign.platforms.append(models.CampaignPlatform.HACKER_NEWS)
        selected_platform_values.add(models.CampaignPlatform.HACKER_NEWS.value)

    # Save the campaign to the database associated with current user
    db_campaign = crud.create_campaign(db=db, campaign=campaign, user_id=current_user.user_id)
    
    # Trigger scrapers for each selected platform
    for platform_value in selected_platform_values:
        if platform_value == models.CampaignPlatform.REDDIT.value:
            # Chain the scraper and NLP analysis
            # Use .si() (immutable signature) for the second task to ignore the result of the scraper
            try:
                chain(
                    scrape_reddit_for_campaign.s(db_campaign.campaign_id),
                    run_sentiment_for_campaign.si(db_campaign.campaign_id)
                ).apply_async()
            except Exception as e:
                print(f"Warning: Could not queue scraping/NLP chain: {e}")
                print("Note: Celery/Redis may not be running. Scraping will not occur.")
        elif platform_value == models.CampaignPlatform.HACKER_NEWS.value:
            try:
                chain(
                    scrape_hackernews_for_campaign.s(db_campaign.campaign_id),
                    run_sentiment_for_campaign.si(db_campaign.campaign_id)
                ).apply_async()
            except Exception as e:
                print(f"Warning: Could not queue Hacker News/NLP chain: {e}")
                print("Note: Celery/Redis may not be running. Hacker News ingestion will not occur.")
        elif platform_value == models.CampaignPlatform.PRODUCT_HUNT.value:
            try:
                chain(
                    scrape_product_hunt_for_campaign.s(db_campaign.campaign_id),
                    run_sentiment_for_campaign.si(db_campaign.campaign_id)
                ).apply_async()
            except Exception as e:
                print(f"Warning: Could not queue Product Hunt/NLP chain: {e}")
                print("Note: Celery/Redis may not be running. Product Hunt ingestion will not occur.")
        elif platform_value == models.CampaignPlatform.QUORA.value:
            try:
                chain(
                    scrape_quora_for_campaign.s(db_campaign.campaign_id),
                    run_sentiment_for_campaign.si(db_campaign.campaign_id)
                ).apply_async()
            except Exception as e:
                print(f"Warning: Could not queue Quora/NLP chain: {e}")
                print("Note: Celery/Redis may not be running. Quora ingestion will not occur.")
        elif platform_value == models.CampaignPlatform.GOOGLE_PLAY.value:
            try:
                chain(
                    scrape_google_play_for_campaign.s(db_campaign.campaign_id),
                    run_sentiment_for_campaign.si(db_campaign.campaign_id)
                ).apply_async()
            except Exception as e:
                print(f"Warning: Could not queue Google Play/NLP chain: {e}")
                print("Note: Celery/Redis may not be running. Google Play ingestion will not occur.")
        elif platform_value == models.CampaignPlatform.SEARCH_VOLUME.value:
            try:
                scrape_search_volume_for_campaign.delay(db_campaign.campaign_id)
            except Exception as e:
                print(f"Warning: Could not queue Search Volume task: {e}")
                print("Note: Celery/Redis may not be running. Search volume ingestion will not occur.")
        elif platform_value == models.CampaignPlatform.GOOGLE_TRENDS.value:
            try:
                scrape_google_trends_for_campaign.delay(db_campaign.campaign_id, campaign.region)
            except Exception as e:
                print(f"Warning: Could not queue Google Trends task: {e}")
                print("Note: Celery/Redis may not be running. Google Trends ingestion will not occur.")
        # TODO: Add Twitter and Quora scrapers when implemented
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


@app.post("/campaigns/{campaign_id}/run-scrapers")
def run_scrapers_sync(
    campaign_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Run scrapers synchronously (without Celery) for testing on Windows.
    This calls each scraper function directly in-process.
    """
    campaign = crud.get_campaign(db, campaign_id, user_id=current_user.user_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    results = {}

    # Run Reddit scraper
    try:
        print(f"[Sync] Running Reddit scraper for campaign {campaign_id}...")
        scrape_reddit_for_campaign(campaign_id)
        results["reddit"] = "success"
    except Exception as e:
        print(f"[Sync] Reddit scraper failed: {e}")
        results["reddit"] = f"error: {str(e)}"

    # Run Hacker News scraper
    try:
        print(f"[Sync] Running Hacker News scraper for campaign {campaign_id}...")
        scrape_hackernews_for_campaign(campaign_id)
        results["hacker_news"] = "success"
    except Exception as e:
        print(f"[Sync] HN scraper failed: {e}")
        results["hacker_news"] = f"error: {str(e)}"

    # Run Product Hunt scraper
    try:
        print(f"[Sync] Running Product Hunt scraper for campaign {campaign_id}...")
        scrape_product_hunt_for_campaign(campaign_id)
        results["product_hunt"] = "success"
    except Exception as e:
        print(f"[Sync] Product Hunt scraper failed: {e}")
        results["product_hunt"] = f"error: {str(e)}"

    # Run Quora scraper
    try:
        print(f"[Sync] Running Quora scraper for campaign {campaign_id}...")
        scrape_quora_for_campaign(campaign_id)
        results["quora"] = "success"
    except Exception as e:
        print(f"[Sync] Quora scraper failed: {e}")
        results["quora"] = f"error: {str(e)}"

    # Run Google Play scraper
    try:
        print(f"[Sync] Running Google Play scraper for campaign {campaign_id}...")
        scrape_google_play_for_campaign(campaign_id)
        results["google_play"] = "success"
    except Exception as e:
        print(f"[Sync] Google Play scraper failed: {e}")
        results["google_play"] = f"error: {str(e)}"

    # Run NLP sentiment analysis
    try:
        print(f"[Sync] Running NLP sentiment analysis for campaign {campaign_id}...")
        run_sentiment_for_campaign(campaign_id)
        results["nlp_sentiment"] = "success"
    except Exception as e:
        print(f"[Sync] NLP analysis failed: {e}")
        results["nlp_sentiment"] = f"error: {str(e)}"

    # Run Search Volume scraper
    try:
        print(f"[Sync] Running Search Volume scraper for campaign {campaign_id}...")
        scrape_search_volume_for_campaign(campaign_id)
        results["search_volume"] = "success"
    except Exception as e:
        print(f"[Sync] Search Volume scraper failed: {e}")
        results["search_volume"] = f"error: {str(e)}"

    # Run Google Trends scraper
    try:
        print(f"[Sync] Running Google Trends scraper for campaign {campaign_id}...")
        scrape_google_trends_for_campaign(campaign_id)
        results["google_trends"] = "success"
    except Exception as e:
        print(f"[Sync] Google Trends scraper failed: {e}")
        results["google_trends"] = f"error: {str(e)}"

    # Update campaign status
    campaign.status = models.CampaignStatus.COMPLETED
    db.commit()

    # Run semantic validation pipeline after all scrapers complete
    try:
        print(f"[Sync] Running semantic validation pipeline for campaign {campaign_id}...")
        pipeline_result = run_validation_pipeline(campaign_id, db)
        results["pipeline"] = pipeline_result.get("status", "completed")
    except Exception as e:
        print(f"[Sync] Semantic pipeline failed: {e}")
        results["pipeline"] = f"error: {str(e)}"

    return {"status": "completed", "campaign_id": campaign_id, "results": results}


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


@app.get("/campaigns/{campaign_id}/reddit-data", response_model=list[schemas.RedditData])
def list_reddit_data(
    campaign_id: int,
    keyword_id: int | None = None,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Return dedicated Reddit rows for a campaign."""
    campaign = crud.get_campaign(db, campaign_id, user_id=current_user.user_id)
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found"
        )

    return crud.get_reddit_data_for_campaign(
        db,
        campaign_id=campaign_id,
        keyword_id=keyword_id,
        limit=500,
    )


@app.get("/campaigns/{campaign_id}/hackernews-data", response_model=list[schemas.HackerNewsData])
def list_hackernews_data(
    campaign_id: int,
    keyword_id: int | None = None,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Return dedicated Hacker News rows for a campaign."""
    campaign = crud.get_campaign(db, campaign_id, user_id=current_user.user_id)
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found"
        )

    return crud.get_hackernews_data_for_campaign(
        db,
        campaign_id=campaign_id,
        keyword_id=keyword_id,
        limit=500,
    )

@app.get("/campaigns/{campaign_id}/product-hunt-data", response_model=list[schemas.ProductHuntData])
def list_product_hunt_data(
    campaign_id: int,
    keyword_id: int | None = None,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Return dedicated Product Hunt rows for a campaign."""
    campaign = crud.get_campaign(db, campaign_id, user_id=current_user.user_id)
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found"
        )

    return crud.get_product_hunt_data_for_campaign(
        db,
        campaign_id=campaign_id,
        keyword_id=keyword_id,
        limit=500,
    )

@app.get("/campaigns/{campaign_id}/quora-data", response_model=list[schemas.QuoraData])
def list_quora_data(
    campaign_id: int,
    keyword_id: int | None = None,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Return dedicated Quora rows for a campaign."""
    campaign = crud.get_campaign(db, campaign_id, user_id=current_user.user_id)
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found"
        )

    return crud.get_quora_data_for_campaign(
        db,
        campaign_id=campaign_id,
        keyword_id=keyword_id,
        limit=500,
    )

@app.get("/campaigns/{campaign_id}/google-play-data", response_model=list[schemas.GooglePlayData])
def list_google_play_data(
    campaign_id: int,
    keyword_id: int | None = None,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Return dedicated Google Play review rows for a campaign."""
    campaign = crud.get_campaign(db, campaign_id, user_id=current_user.user_id)
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found"
        )

    return crud.get_google_play_data_for_campaign(
        db,
        campaign_id=campaign_id,
        keyword_id=keyword_id,
        limit=500,
    )

@app.get("/campaigns/{campaign_id}/search-volume-data", response_model=list[schemas.SearchVolumeData])
def list_search_volume_data(
    campaign_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Return search volume data for a campaign, ordered by monthly volume descending."""
    campaign = crud.get_campaign(db, campaign_id, user_id=current_user.user_id)
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found"
        )

    return crud.get_search_volume_data_for_campaign(
        db,
        campaign_id=campaign_id,
        limit=500,
    )

@app.get("/campaigns/{campaign_id}/validation-score", response_model=schemas.ValidationScore)
def get_validation_score(
    campaign_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get stored validation scores for a campaign."""
    campaign = crud.get_campaign(db, campaign_id, user_id=current_user.user_id)
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found"
        )

    validation_score = crud.get_validation_score_for_campaign(db, campaign_id)
    if not validation_score:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Validation scores not yet calculated. Run POST /calculate-validation first."
        )

    return validation_score

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


# ============ VALIDATION & ANALYSIS ENDPOINTS ============

@app.get("/campaigns/{campaign_id}/report")
def get_comprehensive_report(
    campaign_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get comprehensive report with all campaign data and analysis."""
    campaign = crud.get_campaign(db, campaign_id, user_id=current_user.user_id)
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found"
        )

    try:
        # Get all campaign data
        scraped_data = crud.get_scraped_data_for_campaign(db, campaign_id)
        sentiment = crud.get_campaign_sentiment_summary(db, campaign_id)
        keywords = crud.get_keywords_by_campaign(db, campaign_id)

        # Get validation scores
        validation_scores = {}
        try:
            scorer = ValidationScorer(campaign_id, db)
            validation_scores = scorer.calculate_all_scores()
        except Exception as e:
            print(f"Warning: Could not calculate validation scores: {e}")
            validation_scores = {
                "market_size": {"score": 0, "reason": "Not calculated"},
                "demand": {"score": 0, "reason": "Not calculated"},
                "problem_clarity": {"score": 0, "reason": "Not calculated"},
                "competitor_gap": {"score": 0, "reason": "Not calculated"},
                "technical_feasibility": {"score": 0, "reason": "Not calculated"},
                "market_growth": {"score": 0, "reason": "Not calculated"},
                "pain_point_severity": {"score": 0, "reason": "Not calculated"},
                "monetization_potential": {"score": 0, "reason": "Not calculated"},
                "overall_score": 0,
            }

        # Get confidence score
        confidence = {}
        try:
            conf_scorer = ConfidenceScorer(campaign_id, db)
            confidence = conf_scorer.calculate_confidence()
        except Exception as e:
            print(f"Warning: Could not calculate confidence: {e}")
            confidence = {
                "confidence_score": 0,
                "confidence_percentage": "0%",
                "factors": [],
                "warnings": ["Unable to calculate confidence"]
            }

        # Get themes
        themes = {}
        try:
            extractor = ThemeExtractor(campaign_id=campaign_id, db=db)
            result = extractor.extract_themes()
            themes = result if result else {}
        except Exception as e:
            print(f"Warning: Could not extract themes: {e}")
            themes = {}

        # Get competitor analysis
        competitors = {}
        try:
            comp_extractor = CompetitorThemeExtractor(campaign_id=campaign_id, db=db)
            result = comp_extractor.extract_competitor_themes()
            competitors = result if result else {}
        except Exception as e:
            print(f"Warning: Could not extract competitors: {e}")
            competitors = {}

        # Data summary by platform
        data_summary = {
            "total_data_points": len(scraped_data) if scraped_data else 0,
        }

        if scraped_data:
            platform_counts = {}
            for item in scraped_data:
                platform = item.platform if hasattr(item, 'platform') else 'unknown'
                platform_counts[platform] = platform_counts.get(platform, 0) + 1
            data_summary.update(platform_counts)

        # Market signals from real SearchVolume + GoogleTrends data
        try:
            search_vols = db.query(models.SearchVolumeData).filter(
                models.SearchVolumeData.campaign_id == campaign_id
            ).all()
            trends = db.query(models.GoogleTrendsPoint).filter(
                models.GoogleTrendsPoint.campaign_id == campaign_id
            ).order_by(models.GoogleTrendsPoint.trend_date).all()

            avg_volume = (
                sum(sv.monthly_volume for sv in search_vols) / len(search_vols)
                if search_vols else None
            )
            cpc_values = [sv.cpc for sv in search_vols if sv.cpc]
            avg_cpc = sum(cpc_values) / len(cpc_values) if cpc_values else None

            comp_values = [sv.competition_index for sv in search_vols if sv.competition_index is not None]
            avg_competition = sum(comp_values) / len(comp_values) if comp_values else None

            rising = sum(1 for sv in search_vols if sv.trend_direction == "rising")
            falling = sum(1 for sv in search_vols if sv.trend_direction == "falling")
            if search_vols:
                trend_dir = "rising" if rising > falling else ("falling" if falling > rising else "stable")
            elif len(trends) >= 2:
                trend_dir = "rising" if trends[-1].interest > trends[0].interest else (
                    "falling" if trends[-1].interest < trends[0].interest else "stable"
                )
            else:
                trend_dir = None

            market_signals = {
                "monthly_search_volume": int(avg_volume) if avg_volume is not None else None,
                "search_competition": round(avg_competition / 100, 2) if avg_competition is not None else None,
                "estimated_cpc": round(avg_cpc, 2) if avg_cpc is not None else None,
                "trend_direction": trend_dir,
                "keywords_tracked": len(search_vols),
                "trends_data_points": len(trends),
            }
        except Exception as e:
            print(f"Warning: Could not build market signals: {e}")
            market_signals = {
                "monthly_search_volume": None,
                "search_competition": None,
                "estimated_cpc": None,
                "trend_direction": None,
                "keywords_tracked": 0,
                "trends_data_points": 0,
            }

        # Serialize campaign with keywords as string list
        campaign_dict = {
            "campaign_id": campaign.campaign_id,
            "campaign_name": campaign.campaign_name,
            "description": campaign.description,
            "keywords": [k.keyword for k in campaign.keywords] if campaign.keywords else (
                campaign.keywords_text.split(",") if campaign.keywords_text else []
            ),
            "platforms": campaign.platforms or [],
            "status": campaign.status.value if campaign.status else "pending",
            "created_at": campaign.created_at.isoformat() if campaign.created_at else None,
        }

        return {
            "status": "success",
            "campaign": campaign_dict,
            "validation_scores": validation_scores,
            "confidence": confidence,
            "themes": themes,
            "competitor_analysis": competitors,
            "data_summary": data_summary,
            "market_signals": market_signals,
            "raw_data": {
                "reddit": [],
                "hacker_news": [],
                "product_hunt": [],
                "quora": [],
                "google_play": [],
            },
            "timestamp": datetime.utcnow()
        }
    except Exception as e:
        print(f"Error generating comprehensive report: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate comprehensive report"
        )


@app.post("/campaigns/{campaign_id}/calculate-validation")
def calculate_validation_scores(
    campaign_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Calculate and return validation scores for a campaign."""
    campaign = crud.get_campaign(db, campaign_id, user_id=current_user.user_id)
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found"
        )

    try:
        # Use ValidationScorer to calculate scores
        scorer = ValidationScorer(campaign_id, db)
        scores = scorer.calculate_all_scores()

        # Persist to DB
        vs = models.ValidationScore(
            campaign_id=campaign_id,
            market_size=scores["market_size"]["score"],
            demand=scores["demand"]["score"],
            problem_clarity=scores["problem_clarity"]["score"],
            competitor_gap=scores["competitor_gap"]["score"],
            technical_feasibility=scores["technical_feasibility"]["score"],
            market_growth=scores["market_growth"]["score"],
            pain_point_severity=scores["pain_point_severity"]["score"],
            monetization_potential=scores["monetization_potential"]["score"],
            market_size_reason=scores["market_size"]["reason"],
            demand_reason=scores["demand"]["reason"],
            problem_clarity_reason=scores["problem_clarity"]["reason"],
            competitor_gap_reason=scores["competitor_gap"]["reason"],
            technical_feasibility_reason=scores["technical_feasibility"]["reason"],
            market_growth_reason=scores["market_growth"]["reason"],
            pain_point_severity_reason=scores["pain_point_severity"]["reason"],
            monetization_potential_reason=scores["monetization_potential"]["reason"],
            overall_score=scores.get("overall_score", 0),
        )
        crud.create_or_update_validation_score(db, vs)

        return {
            "scores": scores,
            "overall_score": scores.get("overall_score", 0),
            "created_at": datetime.utcnow()
        }
    except Exception as e:
        print(f"Error calculating validation scores: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to calculate validation scores"
        )


@app.post("/campaigns/{campaign_id}/extract-themes")
def extract_themes(
    campaign_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Extract major themes from campaign data."""
    campaign = crud.get_campaign(db, campaign_id, user_id=current_user.user_id)
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found"
        )

    try:
        # Use ThemeExtractor to extract themes
        extractor = ThemeExtractor(campaign_id=campaign_id, db=db)
        result = extractor.extract_themes()

        return {
            "themes": result,
            "theme_count": len(result) if result else 0,
            "extracted_at": datetime.utcnow()
        }
    except Exception as e:
        print(f"Error extracting themes: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to extract themes"
        )


@app.post("/campaigns/{campaign_id}/extract-competitor-themes")
def extract_competitor_themes(
    campaign_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Extract competitor apps/products mentioned in campaign data."""
    campaign = crud.get_campaign(db, campaign_id, user_id=current_user.user_id)
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found"
        )

    try:
        # Use CompetitorThemeExtractor to extract competitors
        extractor = CompetitorThemeExtractor(campaign_id=campaign_id, db=db)
        result = extractor.extract_competitor_themes()

        return {
            "competitor_apps": result,
            "competitor_count": len(result) if result else 0,
            "extracted_at": datetime.utcnow()
        }
    except Exception as e:
        print(f"Error extracting competitor themes: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to extract competitor themes"
        )


@app.post("/campaigns/{campaign_id}/calculate-confidence")
def calculate_confidence_score(
    campaign_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Calculate confidence score for the validation results."""
    campaign = crud.get_campaign(db, campaign_id, user_id=current_user.user_id)
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found"
        )

    try:
        # Use ConfidenceScorer to calculate confidence
        scorer = ConfidenceScorer(campaign_id, db)
        result = scorer.calculate_confidence()

        return {
            "confidence_score": result.get("confidence_score", 0),
            "confidence_percentage": result.get("confidence_percentage", "0%"),
            "factors": result.get("factors", {}),
            "warnings": result.get("warnings", []),
            "calculated_at": datetime.utcnow()
        }
    except Exception as e:
        print(f"Error calculating confidence score: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to calculate confidence score"
        )


@app.get("/campaigns/{campaign_id}/google-trends", response_model=list[schemas.GoogleTrendsPoint])
def list_google_trends_data(
    campaign_id: int,
    keyword_id: int | None = None,
    region: str | None = None,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Return Google Trends time-series points for a campaign."""
    campaign = crud.get_campaign(db, campaign_id, user_id=current_user.user_id)
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found"
        )

    return crud.get_google_trends_data_for_campaign(
        db,
        campaign_id=campaign_id,
        keyword_id=keyword_id,
        region=region,
        limit=1000,
    )


@app.get("/campaigns/{campaign_id}/analytics")
def get_campaign_analytics(
    campaign_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Return analytics data for campaign: time series, traffic sources, devices."""
    campaign = crud.get_campaign(db, campaign_id, user_id=current_user.user_id)
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found"
        )

    try:
        # Get all scraped data for this campaign
        scraped_data = crud.get_scraped_data_for_campaign(db, campaign_id, limit=1000)

        # Generate time series data (last 10 months)
        time_series = []
        from datetime import timedelta
        base_date = datetime.now()
        for i in range(10):
            month_date = base_date - timedelta(days=30 * (9 - i))
            month_str = month_date.strftime("%Y-%m")

            # Count posts from this month
            month_posts = [d for d in scraped_data if d.scraped_at and d.scraped_at.strftime("%Y-%m") == month_str]
            visitors = len(month_posts) * 100 + (i * 1200)
            conversions = max(1, len(month_posts) // 10) + (i * 70)
            revenue = visitors * 3 + (i * 1600)

            time_series.append({
                "date": month_str,
                "visitors": visitors,
                "conversions": conversions,
                "revenue": revenue
            })

        # Generate traffic sources by platform
        platform_counts = {}
        for data in scraped_data:
            platform = data.platform.value if data.platform else "unknown"
            platform_counts[platform] = platform_counts.get(platform, 0) + 1

        total = sum(platform_counts.values()) or 1
        channel_data = []
        platform_names = {
            "reddit": "Organic Search",
            "hackernews": "Hacker News",
            "producthunt": "Product Hunt",
            "quora": "Quora",
            "googleplay": "Google Play"
        }

        for platform, count in platform_counts.items():
            channel_name = platform_names.get(platform, platform)
            percentage = (count / total) * 100
            channel_data.append({
                "channel": channel_name,
                "visitors": count * 100,
                "percentage": int(percentage)
            })

        # Add synthetic channels if needed
        while len(channel_data) < 5:
            channel_data.append({
                "channel": f"Channel {len(channel_data) + 1}",
                "visitors": 0,
                "percentage": 0
            })

        # Generate device breakdown
        device_data = [
            {"device": "Desktop", "sessions": int(total * 0.54), "percentage": 54},
            {"device": "Mobile", "sessions": int(total * 0.38), "percentage": 38},
            {"device": "Tablet", "sessions": int(total * 0.08), "percentage": 8},
        ]

        return {
            "time_series": time_series,
            "channels": channel_data,
            "devices": device_data,
            "total_visitors": len(scraped_data) * 100,
            "conversion_rate": min(9.2 + (len(scraped_data) / 100), 15.0),
            "total_revenue": len(scraped_data) * 300
        }
    except Exception as e:
        print(f"Error fetching analytics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch analytics data"
        )


@app.get("/campaigns/{campaign_id}/generated-comments")
def get_generated_comments(
    campaign_id: int,
    platform: str | None = None,
    status_filter: str | None = None,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Return AI-generated comments for campaign."""
    campaign = crud.get_campaign(db, campaign_id, user_id=current_user.user_id)
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found"
        )

    try:
        query = db.query(models.GeneratedComment).filter(
            models.GeneratedComment.campaign_id == campaign_id
        )

        if platform:
            query = query.filter(models.GeneratedComment.target_platform.ilike(f"%{platform}%"))

        if status_filter:
            query = query.filter(models.GeneratedComment.status == status_filter)

        comments = query.order_by(models.GeneratedComment.generated_at.desc()).all()

        return [
            {
                "id": c.comment_id,
                "content": c.generated_comment,
                "platform": c.target_platform,
                "status": c.status.value if c.status else "draft",
                "timestamp": c.generated_at.isoformat() if c.generated_at else None,
                "posted_at": c.posted_at.isoformat() if c.posted_at else None
            }
            for c in comments
        ]
    except Exception as e:
        print(f"Error fetching comments: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch generated comments"
        )


@app.get("/campaigns/{campaign_id}/social-feedback")
def get_social_feedback(
    campaign_id: int,
    sentiment_filter: str | None = None,
    platform: str | None = None,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Return scraped data with sentiment analysis (social comments/feedback)."""
    campaign = crud.get_campaign(db, campaign_id, user_id=current_user.user_id)
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found"
        )

    try:
        # Get all scraped data for this campaign with optional filters
        data = crud.get_scraped_data_for_campaign(
            db,
            campaign_id,
            limit=100
        )

        # Filter by platform if provided
        if platform:
            data = [d for d in data if d.platform.value.lower() == platform.lower()]

        result = []
        for item in data:
            sentiment = "neutral"
            if item.analysis:
                sentiment = item.analysis.sentiment_label.value if item.analysis.sentiment_label else "neutral"

            if sentiment_filter and sentiment != sentiment_filter:
                continue

            result.append({
                "id": item.data_id,
                "author": item.author or "Anonymous",
                "content": item.content,
                "platform": item.platform.value if item.platform else "unknown",
                "sentiment": sentiment,
                "engagement": min(item.engagement_score or 0, 100),
                "timestamp": item.scraped_at.isoformat() if item.scraped_at else None,
                "url": item.post_url
            })

        return result
    except Exception as e:
        print(f"Error fetching social feedback: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch social feedback"
        )


@app.post("/campaigns/{campaign_id}/generate-llm-report")
def generate_llm_report_endpoint(
    campaign_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Generate a comprehensive AI validation report using Mistral 7B (via HuggingFace Space)
    or Llama-3-8B (HF Router fallback).
    Covers: shortcomings, user feedback, competitor strengths/weaknesses, recommendations.
    """
    campaign = crud.get_campaign(db, campaign_id, user_id=current_user.user_id)
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found",
        )

    try:
        result = generate_llm_report(campaign_id, db)
        return result
    except Exception as e:
        print(f"Error generating LLM report for campaign {campaign_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate AI report: {str(e)}",
        )


@app.post("/campaigns/{campaign_id}/run-pipeline")
def trigger_semantic_pipeline(
    campaign_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Run the full 6-step semantic validation pipeline for a campaign:
      1. Relevance filtering (embeddings)
      2. Batched LLM sentiment analysis (relevant posts only)
      3. LLM validation scoring (8 dimensions)
      4. LLM theme extraction (complaint themes from negative posts)
      5. LLM competitor analysis (Google Play reviews)
      6. Full narrative report generation

    Tries Celery (async, non-blocking) first.
    Falls back to synchronous execution if Celery/Redis is unavailable.
    """
    campaign = crud.get_campaign(db, campaign_id, user_id=current_user.user_id)
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found",
        )

    # Try Celery — non-blocking, returns immediately
    try:
        from tasks.semantic_analysis import run_semantic_pipeline
        run_semantic_pipeline.delay(campaign_id)
        return {"status": "queued", "campaign_id": campaign_id, "mode": "async"}
    except Exception as e:
        print(f"[Pipeline] Celery unavailable ({e}), running synchronously...")

    # Fallback: run synchronously (blocks until all 6 steps complete)
    try:
        result = run_validation_pipeline(campaign_id, db)
        return result
    except Exception as e:
        print(f"[Pipeline] Sync execution failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Pipeline failed: {str(e)}",
        )
