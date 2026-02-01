"""
FUZR ML Scoring Service
FastAPI service that provides ML-based company scoring
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import uvicorn

from app.scorer import CompanyScorer
from app.models import CompanyData, ScoringResult

app = FastAPI(
    title="FUZR ML Scoring Service",
    description="Machine learning-based company scoring for sales intelligence",
    version="1.0.0"
)

# CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "https://*.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize scorer on startup
scorer = CompanyScorer()


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "fuzr-ml-scorer"}


@app.post("/score", response_model=ScoringResult)
async def score_company(company: CompanyData) -> ScoringResult:
    """
    Score a company based on signals, hiring activity, and red flags.
    Returns a transparent breakdown of the scoring.
    """
    try:
        result = scorer.score(company)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/batch-score")
async def batch_score_companies(companies: List[CompanyData]) -> List[ScoringResult]:
    """Score multiple companies at once"""
    results = []
    for company in companies:
        try:
            result = scorer.score(company)
            results.append(result)
        except Exception as e:
            results.append(ScoringResult(
                company_id=company.id,
                overall_score=0,
                confidence=0,
                error=str(e)
            ))
    return results


@app.get("/signals")
async def get_available_signals():
    """Get all available signals and their weights"""
    return {
        "buying_intent_signals": scorer.buying_intent_signals,
        "red_flag_signals": scorer.red_flag_signals,
        "hiring_signals": scorer.hiring_signals
    }


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
