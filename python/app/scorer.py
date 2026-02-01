"""
Company Scorer - ML-based scoring engine using CSV signals
"""
import re
from typing import List, Dict, Any, Optional, Tuple
from app.models import (
    CompanyData, ScoringResult, SignalEvidence, ScoreBreakdown,
    HiringData, HiringTrend, JobPosting, NewsArticle
)
from app.signal_loader import SignalLoader


class CompanyScorer:
    """
    Scores companies based on buying intent signals, red flags, and hiring patterns.
    Uses CSV-defined weights for transparent, explainable scoring.
    """
    
    def __init__(self):
        loader = SignalLoader()
        self.buying_intent_signals = loader.load_buying_intent_signals()
        self.red_flag_signals = loader.load_red_flag_signals()
        self.hiring_signals = loader.load_hiring_signals()
        
        # Maximum possible scores for normalization
        self.max_buying_intent = sum(s['weight'] for s in self.buying_intent_signals)
        self.max_hiring = 50.0  # Cap hiring score
        self.max_news = 20.0   # Cap news score
        self.max_contacts = 10.0  # Cap contacts score
        
        print(f"[Scorer] Loaded {len(self.buying_intent_signals)} buying intent signals")
        print(f"[Scorer] Loaded {len(self.red_flag_signals)} red flag indicators")
        print(f"[Scorer] Loaded {len(self.hiring_signals)} hiring signals")
    
    def score(self, company: CompanyData) -> ScoringResult:
        """
        Score a company and return detailed, transparent results.
        """
        positive_signals: List[SignalEvidence] = []
        red_flags: List[SignalEvidence] = []
        score_breakdown: List[ScoreBreakdown] = []
        
        # 1. Score hiring activity
        hiring_score, hiring_signals_found = self._score_hiring(company)
        positive_signals.extend([s for s in hiring_signals_found if s.is_positive])
        red_flags.extend([s for s in hiring_signals_found if not s.is_positive])
        
        score_breakdown.append(ScoreBreakdown(
            category="Hiring Activity",
            score=max(0, hiring_score),
            max_possible=self.max_hiring,
            signals_detected=len(hiring_signals_found),
            details=self._get_hiring_summary(company.hiring)
        ))
        
        # 2. Score based on buying intent patterns
        intent_score, intent_signals = self._score_buying_intent(company)
        positive_signals.extend([s for s in intent_signals if s.is_positive])
        red_flags.extend([s for s in intent_signals if not s.is_positive])
        
        score_breakdown.append(ScoreBreakdown(
            category="Buying Intent",
            score=max(0, intent_score),
            max_possible=50.0,
            signals_detected=len(intent_signals),
            details=f"{len([s for s in intent_signals if s.is_positive])} positive indicators detected"
        ))
        
        # 3. Score news sentiment
        news_score, news_signals = self._score_news(company)
        positive_signals.extend([s for s in news_signals if s.is_positive])
        red_flags.extend([s for s in news_signals if not s.is_positive])
        
        score_breakdown.append(ScoreBreakdown(
            category="News & Market",
            score=max(0, news_score),
            max_possible=self.max_news,
            signals_detected=len(news_signals),
            details=f"{len(company.news)} recent articles analyzed"
        ))
        
        # 4. Score contact availability
        contact_score = self._score_contacts(company)
        score_breakdown.append(ScoreBreakdown(
            category="Reachability",
            score=contact_score,
            max_possible=self.max_contacts,
            signals_detected=len(company.contacts),
            details=f"{len(company.contacts)} verified contacts found"
        ))
        
        # 5. Calculate red flag penalties
        red_flag_penalty = sum(s.weight for s in red_flags)
        
        # 6. Calculate overall score
        raw_score = hiring_score + intent_score + news_score + contact_score + red_flag_penalty
        
        # Normalize to 0-100
        max_possible = self.max_hiring + 50.0 + self.max_news + self.max_contacts
        overall_score = max(0, min(100, (raw_score / max_possible) * 100))
        
        # Calculate confidence based on data completeness
        confidence = self._calculate_confidence(company)
        
        # Determine rating
        rating = self._get_rating(overall_score, len(red_flags))
        
        # Generate insights
        top_reasons = self._generate_top_reasons(positive_signals)
        pain_points = self._detect_pain_points(company)
        solutions = self._detect_solution_needs(company)
        timing = self._determine_timing(positive_signals, red_flags)
        outreach_angle = self._suggest_outreach_angle(company, positive_signals)
        hiring_insights = self._generate_hiring_insights(company.hiring)
        
        return ScoringResult(
            company_id=company.id,
            company_name=company.name,
            overall_score=round(overall_score, 1),
            confidence=round(confidence, 2),
            rating=rating,
            score_breakdown=score_breakdown,
            positive_signals=positive_signals,
            red_flags=red_flags,
            top_reasons=top_reasons,
            pain_points=pain_points,
            recommended_timing=timing,
            outreach_angle=outreach_angle,
            hiring_insights=hiring_insights,
            solutions_they_may_need=solutions
        )
    
    def _score_hiring(self, company: CompanyData) -> Tuple[float, List[SignalEvidence]]:
        """Score based on hiring activity"""
        signals: List[SignalEvidence] = []
        score = 0.0
        
        if not company.hiring:
            return 0.0, signals
        
        hiring = company.hiring
        
        # High hiring volume is positive
        if hiring.total_jobs >= 20:
            score += 25.0
            signals.append(SignalEvidence(
                signal_type="hiring",
                signal_name="High hiring volume",
                weight=25.0,
                evidence=f"Currently advertising {hiring.total_jobs} open positions",
                source="Adzuna",
                is_positive=True
            ))
        elif hiring.total_jobs >= 10:
            score += 15.0
            signals.append(SignalEvidence(
                signal_type="hiring",
                signal_name="Active hiring",
                weight=15.0,
                evidence=f"Currently advertising {hiring.total_jobs} open positions",
                source="Adzuna",
                is_positive=True
            ))
        elif hiring.total_jobs >= 5:
            score += 8.0
            signals.append(SignalEvidence(
                signal_type="hiring",
                signal_name="Moderate hiring",
                weight=8.0,
                evidence=f"Currently advertising {hiring.total_jobs} open positions",
                source="Adzuna",
                is_positive=True
            ))
        
        # Check for key role categories
        key_categories = ['IT Jobs', 'Engineering Jobs', 'Sales Jobs', 'Marketing Jobs']
        for cat in key_categories:
            count = hiring.job_categories.get(cat, 0)
            if count >= 3:
                score += 8.0
                signals.append(SignalEvidence(
                    signal_type="hiring",
                    signal_name=f"{cat} hiring spike",
                    weight=8.0,
                    evidence=f"Hiring {count} {cat} roles",
                    source="Adzuna",
                    is_positive=True
                ))
        
        # Analyze job titles for signals
        for posting in hiring.recent_postings[:10]:
            title_lower = posting.title.lower() if posting.title else ""
            
            # C-level/VP hiring
            if any(x in title_lower for x in ['cto', 'cfo', 'cmo', 'cro', 'vp ', 'vice president', 'director']):
                score += 12.0
                signals.append(SignalEvidence(
                    signal_type="hiring",
                    signal_name="Executive hiring",
                    weight=12.0,
                    evidence=f"Hiring for: {posting.title}",
                    source="Adzuna",
                    is_positive=True
                ))
                break  # Only count once
            
            # DevOps/Platform roles
            if any(x in title_lower for x in ['devops', 'platform', 'infrastructure', 'sre', 'cloud']):
                score += 8.0
                signals.append(SignalEvidence(
                    signal_type="hiring",
                    signal_name="Infrastructure modernization",
                    weight=8.0,
                    evidence=f"Hiring for: {posting.title}",
                    source="Adzuna",
                    is_positive=True
                ))
                break
            
            # Data roles
            if any(x in title_lower for x in ['data engineer', 'data scientist', 'analytics', 'machine learning']):
                score += 8.0
                signals.append(SignalEvidence(
                    signal_type="hiring",
                    signal_name="Data capability building",
                    weight=8.0,
                    evidence=f"Hiring for: {posting.title}",
                    source="Adzuna",
                    is_positive=True
                ))
                break
        
        return min(score, self.max_hiring), signals
    
    def _score_buying_intent(self, company: CompanyData) -> Tuple[float, List[SignalEvidence]]:
        """Score based on detected buying intent signals"""
        signals: List[SignalEvidence] = []
        score = 0.0
        
        # Use detected signals from the company data
        for detected in company.detected_signals:
            detected_lower = detected.lower()
            
            for intent_signal in self.buying_intent_signals:
                signal_name = intent_signal.get('name', '').lower()
                if any(word in detected_lower for word in signal_name.split()[:3]):
                    weight = intent_signal.get('weight', 10.0)
                    score += weight
                    signals.append(SignalEvidence(
                        signal_type="buying_intent",
                        signal_name=intent_signal.get('name', ''),
                        weight=weight,
                        evidence=detected,
                        source="Signal Detection",
                        is_positive=True
                    ))
                    break
        
        # Check for red flags
        for detected in company.detected_signals:
            detected_lower = detected.lower()
            
            for red_flag in self.red_flag_signals:
                flag_name = red_flag.get('name', '').lower()
                if any(word in detected_lower for word in flag_name.split()[:3]):
                    weight = red_flag.get('weight', -20.0)
                    score += weight  # Negative
                    signals.append(SignalEvidence(
                        signal_type="red_flag",
                        signal_name=red_flag.get('name', ''),
                        weight=abs(weight),
                        evidence=detected,
                        source="Signal Detection",
                        is_positive=False
                    ))
                    break
        
        # Add base score for company attributes
        if company.industry and company.industry.lower() in ['technology', 'financial services', 'healthcare']:
            score += 5.0
        if company.size_band and company.size_band in ['51-200', '201-500', '501-1000']:
            score += 5.0
        
        return score, signals
    
    def _score_news(self, company: CompanyData) -> Tuple[float, List[SignalEvidence]]:
        """Score based on news sentiment"""
        signals: List[SignalEvidence] = []
        score = 0.0
        
        positive_keywords = ['growth', 'funding', 'expansion', 'acquisition', 'launch', 'partnership', 'award']
        negative_keywords = ['layoff', 'lawsuit', 'investigation', 'decline', 'loss', 'restructuring']
        
        for article in company.news[:10]:
            text = f"{article.title} {article.description or ''}".lower()
            
            # Check positive
            for keyword in positive_keywords:
                if keyword in text:
                    score += 3.0
                    signals.append(SignalEvidence(
                        signal_type="news",
                        signal_name=f"Positive news: {keyword}",
                        weight=3.0,
                        evidence=article.title,
                        source=article.source or "NewsAPI",
                        is_positive=True
                    ))
                    break
            
            # Check negative
            for keyword in negative_keywords:
                if keyword in text:
                    score -= 5.0
                    signals.append(SignalEvidence(
                        signal_type="news",
                        signal_name=f"Negative news: {keyword}",
                        weight=5.0,
                        evidence=article.title,
                        source=article.source or "NewsAPI",
                        is_positive=False
                    ))
                    break
        
        return min(max(score, -10), self.max_news), signals
    
    def _score_contacts(self, company: CompanyData) -> float:
        """Score based on contact availability"""
        if not company.contacts:
            return 0.0
        
        score = 0.0
        
        # Score based on number and quality of contacts
        for contact in company.contacts[:5]:
            base = 1.0
            
            # Seniority bonus
            if contact.seniority == 'executive':
                base += 1.5
            elif contact.seniority == 'senior':
                base += 1.0
            
            # High confidence bonus
            if contact.confidence >= 90:
                base += 0.5
            
            # Has position info
            if contact.position:
                base += 0.3
            
            score += base
        
        return min(score, self.max_contacts)
    
    def _calculate_confidence(self, company: CompanyData) -> float:
        """Calculate confidence in the score based on data completeness"""
        checks = [
            company.name is not None,
            company.industry is not None,
            company.hiring is not None and company.hiring.total_jobs > 0,
            len(company.news) > 0,
            len(company.contacts) > 0,
            company.description is not None,
            company.website is not None,
        ]
        return sum(checks) / len(checks)
    
    def _get_rating(self, score: float, red_flag_count: int) -> str:
        """Convert score to a rating"""
        if red_flag_count >= 3:
            return "Avoid"
        if score >= 75:
            return "Strong Buy"
        if score >= 55:
            return "Buy"
        if score >= 35:
            return "Hold"
        return "Avoid"
    
    def _generate_top_reasons(self, positive_signals: List[SignalEvidence]) -> List[str]:
        """Generate top reasons for the score"""
        # Sort by weight and take top 5
        sorted_signals = sorted(positive_signals, key=lambda x: x.weight, reverse=True)
        return [s.evidence for s in sorted_signals[:5]]
    
    def _detect_pain_points(self, company: CompanyData) -> List[str]:
        """Detect likely pain points based on signals"""
        pain_points = []
        
        if company.hiring:
            cats = company.hiring.job_categories
            if cats.get('IT Jobs', 0) >= 3:
                pain_points.append("Technology scaling challenges")
            if cats.get('Sales Jobs', 0) >= 3:
                pain_points.append("Sales pipeline efficiency needs")
            if cats.get('Customer Service Jobs', 0) >= 2:
                pain_points.append("Customer support scaling")
        
        if company.tech_stack:
            if any('legacy' in t.lower() for t in company.tech_stack):
                pain_points.append("Legacy system modernization")
        
        return pain_points[:3]
    
    def _detect_solution_needs(self, company: CompanyData) -> List[str]:
        """Detect what solutions the company may need"""
        solutions = []
        
        if company.hiring:
            for posting in company.hiring.recent_postings[:5]:
                title = posting.title.lower() if posting.title else ""
                if 'devops' in title or 'cloud' in title:
                    solutions.append("Cloud infrastructure / DevOps tools")
                if 'data' in title or 'analytics' in title:
                    solutions.append("Data analytics / BI platforms")
                if 'security' in title:
                    solutions.append("Security and compliance solutions")
                if 'customer success' in title:
                    solutions.append("Customer success / CRM tools")
        
        return list(set(solutions))[:4]
    
    def _determine_timing(self, positive: List[SignalEvidence], negative: List[SignalEvidence]) -> str:
        """Determine recommended outreach timing"""
        if len(negative) >= 2:
            return "Wait - red flags present"
        if len(positive) >= 3:
            return "Now - strong signals"
        if len(positive) >= 1:
            return "Soon - some positive signals"
        return "Monitor - gather more data"
    
    def _suggest_outreach_angle(self, company: CompanyData, signals: List[SignalEvidence]) -> Optional[str]:
        """Suggest an outreach angle based on signals"""
        if not signals:
            return None
        
        top_signal = max(signals, key=lambda x: x.weight)
        
        if 'hiring' in top_signal.signal_type:
            return f"Reference their {top_signal.signal_name.lower()} - they're clearly investing in growth"
        if 'news' in top_signal.signal_type:
            return f"Mention their recent news: {top_signal.evidence[:50]}..."
        
        return f"Lead with: {top_signal.signal_name}"
    
    def _generate_hiring_insights(self, hiring: Optional[HiringData]) -> Optional[str]:
        """Generate hiring insights summary"""
        if not hiring or hiring.total_jobs == 0:
            return None
        
        top_cats = sorted(hiring.job_categories.items(), key=lambda x: x[1], reverse=True)[:3]
        cats_str = ", ".join([f"{cat} ({count})" for cat, count in top_cats])
        
        return f"Active hiring with {hiring.total_jobs} open roles. Top areas: {cats_str}. Trend: {hiring.hiring_trend.value}."
    
    def _get_hiring_summary(self, hiring: Optional[HiringData]) -> str:
        """Get a brief hiring summary"""
        if not hiring:
            return "No hiring data available"
        if hiring.total_jobs == 0:
            return "No active job postings found"
        return f"{hiring.total_jobs} open positions, trend: {hiring.hiring_trend.value}"
