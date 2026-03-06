# Stock Market Simulator - Full Stack Application

A production-ready web application for simulating stock market investments with historical data analysis, performance metrics, and Monte Carlo forecasting.

## 🎯 Features

- **Historical Analysis**: Simulate investments using 15+ years of historical data from Yahoo Finance
- **Multiple Indices**: Support for major global indices (S&P 500, NASDAQ, Dow Jones, EuroStoxx50, etc.)
- **Investment Simulation**: Model monthly contributions, dividend reinvestment, and inflation adjustments
- **Performance Metrics**: Calculate CAGR, total returns, max drawdown, and real (inflation-adjusted) values
- **Monte Carlo Forecasting**: Generate probabilistic future scenarios based on historical returns
- **Interactive Charts**: Visualize portfolio growth, metrics tables, and forecast distributions
- **Multi-Currency Support**: Handle USD and EUR with appropriate inflation adjustments
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## 📋 Project Structure

```
stockmarket-simulator-v4/
├── backend/                 # Python FastAPI backend
│   ├── app/
│   │   ├── main.py         # FastAPI application
│   │   ├── models/         # Pydantic data models
│   │   ├── routes/         # API routes
│   │   └── services/       # Business logic
│   ├── Dockerfile
│   ├── requirements.txt
│   └── README.md
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── api/            # API client
│   │   ├── styles/         # CSS styling
│   │   └── main.jsx        # React entry point
│   ├── Dockerfile
│   ├── package.json
│   └── README.md
├── docker-compose.yml      # Local development
├── render.yaml             # Render deployment config
└── README.md              # This file
```

## 🚀 Quick Start

### Local Development with Docker Compose

```bash
# Build and start both services
docker-compose up --build

# Backend will be at http://localhost:8000
# Frontend will be at http://localhost:3000
# API docs at http://localhost:8000/docs
```

### Manual Setup

#### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Backend will run at `http://localhost:8000`

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend will run at `http://localhost:3000`

## 🌐 Deployment on Render

### Prerequisites
- Render.com account
- GitHub repository with this code

### Deployment Steps

1. **Connect Repository**
   - Push code to GitHub
   - Sign in to Render.com
   - Create new "Web Service" and select your GitHub repo

2. **Deploy Backend**
   - Select Python 3.11
   - Build Command: `cd backend && pip install -r requirements.txt`
   - Start Command: `cd backend && uvicorn app.main:app --host 0.0.0.0 --port 8000`
   - Add environment variable: `ALLOWED_ORIGINS=<your-frontend-url>`

3. **Deploy Frontend**
   - Create another Web Service for frontend
   - Select Node 20
   - Build Command: `cd frontend && npm install && npm run build`
   - Start Command: `cd frontend && npm install -g serve && serve -s dist -l 3000`
   - Add environment variable: `VITE_API_URL=<your-backend-url>/api`

4. **Configure CORS**
   - Update backend's `ALLOWED_ORIGINS` with your frontend Render URL
   - Update frontend's `VITE_API_URL` with your backend Render URL

## 📊 API Endpoints

### POST /api/simulate
Run a stock market simulation.

**Body:**
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
Generate Monte Carlo forecast.

**Body:** Same as simulate

**Query Parameters:**
- `horizon_years`: Forecast period (1-50, default: 10)
- `simulations`: Number of simulations (100-10000, default: 1000)

### GET /api/tickers
Get available tickers and their currencies.

### GET /health
Health check endpoint.

## 🔧 Environment Variables

### Backend
- `ALLOWED_ORIGINS`: CORS allowed origins (comma-separated URLs)

### Frontend
- `VITE_API_URL`: Backend API base URL

## 📦 Technologies Used

### Backend
- **FastAPI**: Modern Python web framework
- **yfinance**: Yahoo Finance data fetching
- **pandas**: Data analysis and manipulation
- **numpy**: Numerical computations
- **Uvicorn**: ASGI server

### Frontend
- **React 18**: UI library
- **Vite**: Build tool and dev server
- **Plotly.js**: Interactive charts
- **Axios**: HTTP client
- **Lucide React**: Icon library

## 📈 Data Sources

- **Historical Prices & Dividends**: Yahoo Finance (via yfinance)
- **CPI Data**: Federal Reserve Economic Data (FRED)
- **Exchange Rates**: Yahoo Finance

## ⚠️ Disclaimer

This simulator is for educational and planning purposes only. Past performance does not guarantee future results. Actual investment returns may vary significantly based on market conditions, timing, and other factors. Always consult with a financial advisor before making investment decisions.

## 📝 License

MIT License - See LICENSE file for details

## 🤝 Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues for bugs and feature requests.

## 📧 Support

For questions or issues, please check the README files in the `backend` and `frontend` directories for detailed setup instructions.
