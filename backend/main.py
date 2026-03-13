
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config.settings import settings
from api import queues, posts, errors, platforms, media
from ai import routes as ai_routes

app = FastAPI(
    title="PostSocial API",
    description="API de automação de publicações no Instagram",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registar routers
app.include_router(queues.router)
app.include_router(posts.router)
app.include_router(errors.router)
app.include_router(platforms.router)
app.include_router(media.router)
app.include_router(ai_routes.router)

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
