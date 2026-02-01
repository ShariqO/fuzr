# FUZR ML Scoring Service

A FastAPI-based machine learning scoring service for sales intelligence.

## Setup

```bash
cd python
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## Running the Service

```bash
# Development
uvicorn main:app --reload --port 8000

# Production
uvicorn main:app --host 0.0.0.0 --port 8000
```

## API Endpoints

### Health Check
```
GET /health
```

### Score a Company
```
POST /score
Content-Type: application/json

{
  "id": "company-123",
  "name": "Example Ltd",
  "industry": "Technology",
  "hiring": {
    "total_jobs": 15,
    "job_categories": {"IT Jobs": 8, "Sales Jobs": 4},
    "recent_postings": [{"title": "Senior Developer"}],
    "hiring_trend": "high"
  }
}
```

### Get Available Signals
```
GET /signals
```

## Signal Weights

The scoring system uses CSV files in `data/signals/`:
- `signals.csv` - Hiring and organizational signals
- `red-flags.csv` - Negative indicators
- `buying-intent.csv` - Buying intent patterns

## Scoring Breakdown

| Category | Max Points | Description |
|----------|------------|-------------|
| Hiring Activity | 50 | Job postings, trends, key roles |
| Buying Intent | 50 | Growth signals, executive changes |
| News & Market | 20 | News sentiment analysis |
| Reachability | 10 | Contact quality and availability |
| Red Flags | -50 | Layoffs, turnover, contraction |

## Rating Scale

- **Strong Buy** (75+): Excellent prospect with strong signals
- **Buy** (55-74): Good prospect worth pursuing
- **Hold** (35-54): Monitor for more signals
- **Avoid** (<35 or 3+ red flags): Skip for now
