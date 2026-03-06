# Stock Market Simulator Backend

FastAPI-based backend for the stock market simulator application.

## Local Development

### Prerequisites
- Python 3.11+
- pip

### Setup

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### Run Development Server

```bash
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## API Endpoints

### POST /api/simulate
Run a stock market simulation with given parameters.

**Request:**
```json
{
  "tickers": ["SPY", "QQQ", "DIA"],
  "start_date": "2010-01-01",
  "end_date": "2025-12-01",
  "initial_investment": 10000,
  "monthly_contribution": 0,
  "reinvest_dividends": true,
  "inflation_adjusted": true
}
```

### POST /api/forecast
Run Monte Carlo forecast based on historical returns.

**Query Parameters:**
- `horizon_years`: Forecast period in years (1-50, default: 10)
- `simulations`: Number of simulations to run (100-10000, default: 1000)

### GET /api/tickers
Get list of available tickers and their currencies.

## Deployment on Render

The backend is configured for deployment on Render.com with Docker.

See the main README for deployment instructions.
