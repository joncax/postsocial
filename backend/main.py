from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config.settings import settings

app = FastAPI(
    title="PostSocial API",
    description="API de automação de publicações no Instagram",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS — permite o frontend comunicar com a API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
