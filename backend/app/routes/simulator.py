from fastapi import APIRouter, HTTPException, Query
from typing import List, Dict
import pandas as pd
from datetime import datetime

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
                params.inflation_adjusted
            )
            
            # Convert to response models
            time_series = [
                TimeSeriesPoint(
                    date=row['date'],
                    value=row['value'],
                    invested=row['invested'],
                    valueReal=row.get('value_real')
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
    simulations: int = Query(1000, ge=100, le=10000)
) -> dict:
    """
    Run a Monte Carlo forecast based on historical returns.
    """
    try:
        # Fetch market data
        market_data = {}
        ticker_currencies = {}
        
        for ticker in params.tickers:
            market_data[ticker] = MarketDataService.fetch_data(
                ticker, params.start_date, params.end_date
            )
            ticker_currencies[ticker] = MarketDataService.get_ticker_currency(ticker)
        
        # Fetch CPI data
        cpi_data = {}
        currencies = set(ticker_currencies.values())
        for currency in currencies:
            cpi_data[currency] = MarketDataService.fetch_cpi_data(
                currency, params.start_date, params.end_date
            )
        
        # Run forecasts
        forecasts = {}
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
            
            dates, median, p10, p90 = SimulationService.forecast_monte_carlo(
                simulation_df,
                horizon_years,
                simulations,
                params.inflation_adjusted,
                cpi_data.get(currency)
            )
            
            forecast_points = [
                ForecastPoint(date=d, median=m, p10=p, p90=q)
                for d, m, p, q in zip(dates, median, p10, p90)
            ]
            
            forecasts[ticker] = ForecastResult(
                ticker=ticker,
                forecast=forecast_points,
                horizonYears=horizon_years,
                simulations=simulations
            )
        
        return {
            "forecasts": forecasts,
            "parameters": params.dict()
        }
    
    except Exception as e:
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
