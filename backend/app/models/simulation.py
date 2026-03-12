from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class SimulationParams(BaseModel):
    """Parameters for stock market simulation"""
    tickers: List[str] = Field(default=["SPY", "QQQ", "DIA"], description="List of ticker symbols")
    start_date: str = Field(default="2010-01-01", description="Start date in YYYY-MM-DD format")
    end_date: str = Field(default="2025-12-01", description="End date in YYYY-MM-DD format")
    initial_investment: float = Field(default=10000, ge=0, description="Initial lump sum investment")
    monthly_contribution: float = Field(default=0, ge=0, description="Monthly contribution amount")
    reinvest_dividends: bool = Field(default=True, description="Whether to reinvest dividends")
    inflation_adjusted: Optional[bool] = Field(default=False, description="Whether to adjust for inflation")

class MetricsData(BaseModel):
    """Calculated metrics for a ticker"""
    Currency: str
    FinalValue: float
    TotalInvested: float
    CAGR: float
    TotalReturn: float
    MaxDrawdown: float
    FinalValueReal: Optional[float] = None
    CAGRReal: Optional[float] = None
    TotalReturnReal: Optional[float] = None

class TimeSeriesPoint(BaseModel):
    """A single point in time series data"""
    date: datetime
    value: float
    invested: float
    close: Optional[float] = None
    valueReal: Optional[float] = None

class SimulationResult(BaseModel):
    """Complete simulation result for a ticker"""
    ticker: str
    currency: str
    timeSeries: List[TimeSeriesPoint]
    metrics: MetricsData

class SimulationResponse(BaseModel):
    """Response containing all simulation results"""
    results: dict[str, SimulationResult]
    parameters: SimulationParams

class ForecastPoint(BaseModel):
    """A single forecast point"""
    date: datetime
    median: float
    p10: float
    p90: float

class ForecastResult(BaseModel):
    """Complete forecast result for a ticker"""
    ticker: str
    forecast: List[ForecastPoint]
    forecast_without_dividends: Optional[List[ForecastPoint]] = None
    horizonYears: int
    simulations: int
