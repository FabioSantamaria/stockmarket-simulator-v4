# Debugging Monte Carlo Simulation Locally

## Prerequisites
- Python 3.11+ 
- Node.js 18+
- Docker (optional)

## Running Backend Locally

### Option 1: Direct Python Development

1. **Navigate to backend directory:**
```bash
cd backend
```

2. **Create and activate virtual environment:**
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS/Linux
python3 -m venv venv
source venv/bin/activate
```

3. **Install dependencies:**
```bash
pip install -r requirements.txt
```

4. **Run the development server:**
```bash
uvicorn app.main:app --reload --log-level debug
```

The API will be available at `http://localhost:8000`

### Option 2: Using Docker (Already Running)

Since you already built and ran the Docker container, you can check logs:

```bash
# View container logs
docker logs 4c55ec8961e6d62d9d5ea4f6f8ba9ba2f2e3438fd2b192db54c0a662b07fc4ce -f

# Or if you want to restart with debug logging
docker stop stock-simulator
docker run -d -p 8000:8000 -e PORT=8000 stock-simulator
```

## Debugging Monte Carlo Issues

### 1. Check API Logs

The backend now includes detailed logging for Monte Carlo simulations. Look for:

```
INFO: Starting Monte Carlo forecast for ['SPY'] with 1000 simulations, 10 year horizon, 10 year lookback
INFO: Fetching data for SPY from 2015-12-01 to 2025-12-01
INFO: Limited Monte Carlo data to X rows from Y rows using 10 year lookback
INFO: Monte Carlo forecast completed in X.XX seconds
```

### 2. Test API Directly

Use curl or Postman to test the forecast endpoint:

```bash
curl -X POST "http://localhost:8000/api/forecast" \
-H "Content-Type: application/json" \
-d '{
  "tickers": ["SPY"],
  "start_date": "2025-12-01",
  "end_date": "2025-12-01",
  "initial_investment": 10000,
  "monthly_contribution": 0,
  "reinvest_dividends": true
}?horizon_years=10&simulations=1000&lookback_years=10'
```

### 3. Common Issues and Solutions

#### Issue: Freezing/Timeout
- **Cause**: Monte Carlo simulations are computationally intensive
- **Solution**: 
  - Reduce number of simulations (try 100-500 instead of 1000+)
  - Reduce lookback years (try 5 years instead of 10+)
  - Check system resources (CPU/RAM)

#### Issue: No Data Available
- **Cause**: Date range issues or ticker data problems
- **Solution**: 
  - Check the backend logs for data fetching errors
  - Try different tickers (SPY, QQQ, DIA are most reliable)
  - Verify date ranges are valid

#### Issue: Memory Issues
- **Cause**: Too many simulations or too much historical data
- **Solution**:
  - Reduce simulations count
  - Reduce lookback years
  - Monitor system memory usage

### 4. Performance Optimization Tips

The time estimation in the frontend uses: `simulations × lookback_years × 0.01` seconds

- **Fast testing**: 100 simulations, 5 years lookback = ~5 seconds
- **Medium**: 500 simulations, 10 years lookback = ~50 seconds  
- **Heavy**: 1000 simulations, 10 years lookback = ~100 seconds

### 5. Browser Console Debugging

Open browser dev tools (F12) and check:
- **Console tab**: Look for the Monte Carlo start/completion messages
- **Network tab**: Check the `/api/forecast` request timing and response
- **Issues**: Any JavaScript errors or failed requests

### 6. Frontend Debugging

The frontend now logs:
```javascript
console.log(`Starting Monte Carlo with ${simulations} simulations, ${horizonYears} year horizon, ${lookbackYears} year lookback`);
console.log(`Monte Carlo completed in ${response.data.execution_time_seconds} seconds`);
```

Check these in the browser console to see actual vs estimated times.

## Monitoring System Resources

While running Monte Carlo simulations, monitor:

```bash
# CPU and Memory usage
htop  # Linux/Mac
Task Manager  # Windows

# Docker container stats
docker stats
```

## Getting Help

If issues persist:

1. Check backend logs for specific error messages
2. Try reducing simulation parameters first
3. Test with a single ticker (SPY) to isolate issues
4. Verify all dependencies are properly installed

The enhanced logging should help identify exactly where the process is getting stuck.
