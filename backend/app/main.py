from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from pathlib import Path

from app.routes import simulator

app = FastAPI(
    title="Stock Market Simulator API",
    description="API for simulating stock market investments",
    version="1.0.0"
)

# Configure CORS for frontend access
origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routes
app.include_router(simulator.router, prefix="/api", tags=["simulator"])

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}

@app.get("/")
async def root():
    """API root endpoint"""
    return {
        "message": "Stock Market Simulator API",
        "docs": "/docs",
        "health": "/health"
    }

# Serve static files (frontend) - must be last
static_dir = Path(__file__).parent.parent.parent / "static"
if static_dir.exists():
    app.mount("/", StaticFiles(directory=str(static_dir), html=True), name="frontend")
