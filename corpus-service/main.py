"""
ClipPoems Corpus Service

A FastAPI microservice providing:
- Chinese text tokenization (jieba with custom dictionary)
- Corpus search and recommendation
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers.tokenize import router as tokenize_router
from routers.corpus import router as corpus_router

app = FastAPI(
    title="ClipPoems Corpus Service",
    description="语料分词与检索微服务",
    version="0.1.0",
)

# CORS — allow Next.js dev server and Tauri
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://localhost:3003",
        "http://localhost:3004",
        "http://localhost:3005",
        "tauri://localhost",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(tokenize_router)
app.include_router(corpus_router)


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "corpus-service"}


@app.get("/api/version")
async def version():
    return {"version": "0.1.0"}
