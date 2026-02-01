"""
Pydantic models for the ML scoring service
"""
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from enum import Enum


class HiringTrend(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    NONE = "none"


class JobPosting(BaseModel):
    """Individual job posting"""
    title: str
    category: Optional[str] = None
    created: Optional[str] = None
    description: Optional[str] = None


class HiringData(BaseModel):
    """Hiring activity data from Adzuna"""
    total_jobs: int = 0
    job_categories: Dict[str, int] = {}
    recent_postings: List[JobPosting] = []
    hiring_trend: HiringTrend = HiringTrend.NONE


class NewsArticle(BaseModel):
    """News article about the company"""
    title: str
    description: Optional[str] = None
    source: Optional[str] = None
    published_at: Optional[str] = None
    url: Optional[str] = None


class Contact(BaseModel):
    """Contact from Hunter.io"""
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    position: Optional[str] = None
    seniority: Optional[str] = None
    department: Optional[str] = None
    confidence: int = 0
    linkedin: Optional[str] = None
    phone: Optional[str] = None


class CompanyData(BaseModel):
    """Input data for company scoring"""
    id: str
    name: str
    company_number: Optional[str] = None
    industry: Optional[str] = None
    size_band: Optional[str] = None
    location: Optional[str] = None
    website: Optional[str] = None
    description: Optional[str] = None
    date_founded: Optional[str] = None
    
    # Hiring data
    hiring: Optional[HiringData] = None
    
    # News data
    news: List[NewsArticle] = []
    
    # Contacts
    contacts: List[Contact] = []
    
    # Tech stack (from scraping)
    tech_stack: List[str] = []
    
    # Raw signals already detected
    detected_signals: List[str] = []


class SignalEvidence(BaseModel):
    """Evidence for a detected signal"""
    signal_type: str
    signal_name: str
    weight: float
    evidence: str
    source: str
    is_positive: bool


class ScoreBreakdown(BaseModel):
    """Breakdown of scoring by category"""
    category: str
    score: float
    max_possible: float
    signals_detected: int
    details: str


class ScoringResult(BaseModel):
    """Complete scoring result with transparency"""
    company_id: str
    company_name: Optional[str] = None
    
    # Overall scores
    overall_score: float  # 0-100
    confidence: float  # 0-1
    rating: str  # "Strong Buy", "Buy", "Hold", "Avoid"
    
    # Detailed breakdowns
    score_breakdown: List[ScoreBreakdown] = []
    
    # Signals detected
    positive_signals: List[SignalEvidence] = []
    red_flags: List[SignalEvidence] = []
    
    # Insights
    top_reasons: List[str] = []
    pain_points: List[str] = []
    recommended_timing: str = "Now"
    outreach_angle: Optional[str] = None
    
    # Hiring intelligence
    hiring_insights: Optional[str] = None
    solutions_they_may_need: List[str] = []
    
    # Error handling
    error: Optional[str] = None
