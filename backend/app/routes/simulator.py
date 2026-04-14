from fastapi import APIRouter, HTTPException, Query
from typing import List, Dict
import pandas as pd
from datetime import datetime, timedelta

from app.models.simulation import (
    SimulationParams, SimulationResponse, SimulationResult, MetricsData, 
    TimeSeriesPoint, ForecastResult, ForecastPoint
)
from app.services.market_data import MarketDataService
from app.services.simulator import SimulationService

router = APIRouter()

@router.post("/simulate")
async def simulate(params: SimulationParams) -> SimulationResponse:
    """
    Run a stock market simulation with the given parameters.
    
    Returns historical portfolio value, metrics, and analysis.
    """
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"Starting simulation for {params.tickers} from {params.start_date} to {params.end_date}")
    
    try:
        # Fetch market data for all tickers
        market_data = {}
        ticker_currencies = {}
        
        for ticker in params.tickers:
            market_data[ticker] = MarketDataService.fetch_data(
                ticker, params.start_date, params.end_date
            )
            ticker_currencies[ticker] = MarketDataService.get_ticker_currency(ticker)
        
        # Fetch CPI data for each currency
        cpi_data = {}
        currencies = set(ticker_currencies.values())
        for currency in currencies:
            cpi_data[currency] = MarketDataService.fetch_cpi_data(
                currency, params.start_date, params.end_date
            )
        
        # Run simulations
        results_dict = {}
        for ticker in params.tickers:
            if market_data[ticker].empty:
                continue
            
            currency = ticker_currencies[ticker]
            simulation_df = SimulationService.simulate_investment(
                ticker,
                market_data[ticker],
                params.initial_investment,
                params.monthly_contribution,
                params.reinvest_dividends,
                currency,
                cpi_data.get(currency)
            )
            
            # Calculate metrics
            metrics_dict = SimulationService.calculate_metrics(
                simulation_df,
                ticker,
                cpi_data.get(currency),
                currency,
                params.inflation_adjusted or False
            )
            
            # Convert to response models
            time_series = [
                TimeSeriesPoint(
                    date=row['date'],
                    value=row['value'],
                    invested=row['invested'],
                    valueReal=row.get('value_real'),
                    close=row.get('close')
                )
                for _, row in simulation_df.iterrows()
            ]
            
            metrics = MetricsData(
                Currency=metrics_dict.get('Currency', currency),
                FinalValue=metrics_dict.get('FinalValue', 0),
                FinalValueReal=metrics_dict.get('FinalValueReal'),
                TotalInvested=metrics_dict.get('TotalInvested', 0),
                CAGR=metrics_dict.get('CAGR', 0),
                CAGRReal=metrics_dict.get('CAGRReal'),
                TotalReturn=metrics_dict.get('TotalReturn', 0),
                TotalReturnReal=metrics_dict.get('TotalReturnReal'),
                MaxDrawdown=metrics_dict.get('MaxDrawdown', 0)
            )
            
            results_dict[ticker] = SimulationResult(
                ticker=ticker,
                currency=currency,
                timeSeries=time_series,
                metrics=metrics
            )
        
        return SimulationResponse(
            results=results_dict,
            parameters=params
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Simulation failed: {str(e)}")

@router.post("/forecast")
async def forecast(
    params: SimulationParams,
    horizon_years: int = Query(10, ge=1, le=50),
    simulations: int = Query(1000, ge=100, le=10000),
    lookback_years: int = Query(10, ge=1, le=50, description="Years of historical data to use for Monte Carlo"),
    compare_dividends: bool = Query(False, description="Compare with/without dividend reinvestment")
) -> dict:
    """
    Run a Monte Carlo forecast based on historical returns.
    
    Args:
        params: Simulation parameters
        horizon_years: Years to forecast into the future
        simulations: Number of Monte Carlo simulations to run
        lookback_years: Years of historical data to use for calculating returns
        compare_dividends: Whether to compare with/without dividend reinvestment
    """
    import time
    import logging
    
    # Configure logging
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger(__name__)
    
    start_time = time.time()
    logger.info(f"Starting Monte Carlo forecast for {params.tickers} with {simulations} simulations, {horizon_years} year horizon, {lookback_years} year lookback")
    logger.info(f"Params received: {params}")
    
    try:
        # Calculate data fetch range - get historical data instead of future data
        # Use today as end_date for Monte Carlo (not the future date from params)
        end_date = datetime.now()
        
        # Fetch lookback_years + buffer years to ensure we have enough data
        buffer_years = 2
        fetch_years = lookback_years + buffer_years
        fetch_start = end_date - timedelta(days=fetch_years * 365.25)
        
        logger.info(f"Fetching data from {fetch_start} to {end_date} for {fetch_years} years total")
        
        # Fetch market data
        market_data = {}
        ticker_currencies = {}
        
        for ticker in params.tickers:
            logger.info(f"Fetching data for {ticker} from {fetch_start} to {end_date}")
            market_data[ticker] = MarketDataService.fetch_data(
                ticker, fetch_start, end_date
            )
            ticker_currencies[ticker] = MarketDataService.get_ticker_currency(ticker)
        
        # Fetch CPI data
        cpi_data = {}
        currencies = set(ticker_currencies.values())
        for currency in currencies:
            try:
                logger.info(f"Fetching CPI data for {currency} from {fetch_start} to {end_date}")
                cpi_data[currency] = MarketDataService.fetch_cpi_data(
                    currency, fetch_start, end_date
                )
            except Exception as e:
                logger.warning(f"Error fetching CPI data for {currency}: {e}")
                # Continue without CPI data if it fails
                cpi_data[currency] = None
        
        # Process data and select latest lookback years from available data
        processed_data = {}
        actual_date_ranges = {}
        
        for ticker, df in market_data.items():
            if df.empty:
                logger.warning(f"No data available for {ticker}")
                continue
            
            # Handle both 'date' and 'Date' column names
            date_col = 'date' if 'date' in df.columns else 'Date'
            if date_col not in df.columns:
                logger.error(f"No date column found for {ticker}. Columns: {df.columns.tolist()}")
                continue
                
            # Rename to standard 'date' if needed
            if date_col != 'date':
                df = df.rename(columns={date_col: 'date'})
                
            # Get the actual date range of available data
            actual_start = df['date'].min()
            actual_end = df['date'].max()
            actual_date_ranges[ticker] = {'start': actual_start, 'end': actual_end, 'total_rows': len(df)}
            
            logger.info(f"Available data for {ticker}: {actual_start} to {actual_end} ({len(df)} rows)")
            
            # Select the latest lookback_years from available data
            if len(df) >= lookback_years * 12:  # Ensure we have enough monthly data points
                # Get the latest lookback_years of data
                cutoff_date = actual_end - timedelta(days=lookback_years * 365.25)
                df_filtered = df[df['date'] >= cutoff_date].copy()
                
                logger.info(f"Limited {ticker} data to {len(df_filtered)} rows from {df_filtered['date'].min()} to {df_filtered['date'].max()} using {lookback_years} year lookback")
            else:
                # Use all available data if we don't have enough for the requested lookback
                df_filtered = df.copy()
                actual_lookback_years = len(df_filtered) / 12  # Convert months to years
                logger.warning(f"Insufficient data for {ticker}. Using all {len(df_filtered)} rows ({actual_lookback_years:.1f} years) instead of {lookback_years} years")
            
            processed_data[ticker] = df_filtered
        
        # Run forecasts for both scenarios if requested
        forecasts = {}
        for ticker in params.tickers:
            if ticker not in processed_data:
                continue
            
            currency = ticker_currencies[ticker]
            
            # Scenario 1: With dividend reinvestment (original behavior)
            forecast_with_dividends = SimulationService.forecast_monte_carlo(
                processed_data[ticker],
                horizon_years=horizon_years,
                simulations=simulations,
                cpi_data=cpi_data.get(currency)
            )
            
            # Scenario 2: Without dividend reinvestment (if compare_dividends is True)
            forecast_without_dividends = None
            if compare_dividends:
                # Create a copy of data without dividends for comparison
                df_no_dividends = processed_data[ticker].copy()
                # Set dividend column to 0 to simulate no reinvestment
                if 'dividend' in df_no_dividends.columns:
                    df_no_dividends['dividend'] = 0
                
                forecast_without_dividends = SimulationService.forecast_monte_carlo(
                    df_no_dividends,
                    horizon_years=horizon_years,
                    simulations=simulations,
                    cpi_data=cpi_data.get(currency)
                )
            
            # Create forecast points
            forecast_points = [
                ForecastPoint(date=date, median=median, p10=p10, p90=p90)
                for date, median, p10, p90 in zip(*forecast_with_dividends)
            ]
            
            forecast_points_without = [
                ForecastPoint(date=date, median=median, p10=p10, p90=p90)
                for date, median, p10, p90 in zip(*forecast_without_dividends)
            ] if forecast_without_dividends else None
            
            forecasts[ticker] = ForecastResult(
                ticker=ticker,
                forecast=forecast_points,
                forecast_without_dividends=forecast_points_without,
                horizonYears=horizon_years,
                simulations=simulations
            )
        
        elapsed_time = time.time() - start_time
        logger.info(f"Monte Carlo forecast completed in {elapsed_time:.2f} seconds")
        
        return {
            "forecasts": forecasts,
            "parameters": params.dict(),
            "compare_dividends": compare_dividends,
            "lookback_years": lookback_years,
            "execution_time_seconds": elapsed_time,
            "data_info": {
                "actual_date_ranges": actual_date_ranges,
                "fetch_range": {
                    "start": fetch_start.strftime("%Y-%m-%d"),
                    "end": end_date.strftime("%Y-%m-%d"),
                    "requested_lookback_years": lookback_years,
                    "buffer_years": buffer_years
                }
            }
        }
    
    except Exception as e:
        import traceback
        logger.error(f"Forecast failed with error: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Forecast failed: {str(e)}")

@router.get("/tickers")
async def get_available_tickers() -> dict:
    """Get list of available tickers"""
    return {
        "tickers": [
            {
                "symbol": ticker,
                "name": MarketDataService.TICKER_NAMES.get(ticker, ticker),
                "currency": MarketDataService.TICKER_CURRENCIES.get(ticker, 'USD')
            }
            for ticker in MarketDataService.TICKER_CURRENCIES.keys()
        ]
    }

@router.get("/search")
async def search_tickers(q: str = Query("", min_length=1, max_length=50)) -> Dict:
    """Search tickers by name or symbol"""
    if not q:
        return {"results": []}
    
    results = MarketDataService.search_tickers(q)
    return {
        "results": [
            {
                "symbol": symbol,
                "name": name,
                "currency": MarketDataService.TICKER_CURRENCIES.get(symbol, 'USD')
            }
            for symbol, name in results.items()
        ]
    }

@router.get("/cpi")
async def get_cpi_data(
    currency: str = Query("USD", regex="^(USD|EUR)$"),
    start_date: str = "2010-01-01",
    end_date: str = "2025-12-01"
) -> dict:
    """Get CPI data for a currency"""
    try:
        cpi_data = MarketDataService.fetch_cpi_data(currency, start_date, end_date)
        if cpi_data is None:
            raise HTTPException(status_code=404, detail=f"CPI data not found for {currency}")
        
        return {
            "currency": currency,
            "data": [
                {"date": date.strftime("%Y-%m-%d"), "value": float(value)}
                for date, value in cpi_data.items()
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch CPI data: {str(e)}")

@router.get("/fx")
async def get_fx_data(
    start_date: str = "2010-01-01",
    end_date: str = "2025-12-01"
) -> dict:
    """Get EUR/USD exchange rate data"""
    try:
        fx_data = MarketDataService.fetch_fx_data(start_date, end_date)
        if fx_data is None:
            raise HTTPException(status_code=404, detail="FX data not found")
        
        return {
            "pair": "EURUSD",
            "data": [
                {"date": date.strftime("%Y-%m-%d"), "rate": float(value)}
                for date, value in fx_data.items()
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch FX data: {str(e)}")

@router.get("/search-tickers")
async def search_tickers(query: str = Query(..., description="Search query for ticker symbols or company names")):
    """
    Search for tickers by symbol or company name.
    
    Returns a list of matching tickers with their descriptions.
    """
    try:
        results = MarketDataService.search_tickers(query)
        return {
            "query": query,
            "results": [
                {"symbol": symbol, "name": name}
                for symbol, name in results.items()
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to search tickers: {str(e)}")
