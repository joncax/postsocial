from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from config.settings import settings
from api import queues, posts, errors, platforms, media
from ai import routes as ai_routes
from scheduler import routes as scheduler_routes
from scheduler.queue_scheduler import start_scheduler, stop_scheduler
from publisher import routes as publisher_routes
from api import user_settings as settings_routes
from auth import routes as auth_routes

@asynccontextmanager
async def lifespan(app: FastAPI):
    start_scheduler()
    yield
    stop_scheduler()

app = FastAPI(
    title="PostSocial API",
    description="API de automacao de publicacoes no Instagram",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

app.include_router(auth_routes.router)
app.include_router(queues.router)
app.include_router(posts.router)
app.include_router(errors.router)
app.include_router(platforms.router)
app.include_router(media.router)
app.include_router(ai_routes.router)
app.include_router(scheduler_routes.router)
app.include_router(publisher_routes.router)
app.include_router(settings_routes.router)

@app.get("/")
async def root():
    return {
        "app": "PostSocial API",
        "version": "1.0.0",
        "env": settings.APP_ENV,
        "status": "running"
    }

@app.get("/health")
async def health():
    return {"status": "ok"}
