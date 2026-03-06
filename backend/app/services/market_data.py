import pandas as pd
import yfinance as yf
from typing import Dict, Optional
from datetime import datetime
import warnings

warnings.filterwarnings('ignore')

TICKER_CURRENCIES = {
    'SPY': 'USD',
    'URTH': 'USD',
    'FEZ': 'USD',
    '^STOXX50E': 'EUR',
    'QQQ': 'USD',
    'DIA': 'USD'
}

CPI_TICKERS = {
    'USD': 'CPIAUCSL',
    'EUR': 'CP0000EZ19M086NEST'
}

class MarketDataService:
    """Service for fetching and processing market data"""
    
    @staticmethod
    def fetch_data(ticker: str, start: str, end: str) -> pd.DataFrame:
        """Fetch historical price and dividend data for a ticker"""
        try:
            data = yf.Ticker(ticker).history(start=start, end=end, actions=True)
            data = data.tz_localize(None)
            monthly = data.resample('MS').agg({
                'Close': 'last',
                'Dividends': 'sum'
            }).fillna(0)
            monthly['DividendYield'] = monthly['Dividends'] / monthly['Close'].replace(0, 1)
            return monthly
        except Exception as e:
            print(f"Error fetching data for {ticker}: {e}")
            return pd.DataFrame()
    
    @staticmethod
    def fetch_cpi_data(currency: str, start: str, end: str) -> Optional[pd.Series]:
        """Fetch CPI data for a currency"""
        try:
            cpi_ticker = CPI_TICKERS.get(currency)
            if not cpi_ticker:
                return None
            
            cpi_url = f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={cpi_ticker}"
            cpi_df = pd.read_csv(cpi_url, index_col=0, parse_dates=True)
            cpi_monthly = cpi_df.resample('MS').last()
            cpi_monthly = cpi_monthly.loc[start:end]
            return cpi_monthly.squeeze() if not cpi_monthly.empty else None
        except Exception as e:
            print(f"Error fetching CPI data for {currency}: {e}")
            return None
    
    @staticmethod
    def get_ticker_currency(ticker: str) -> str:
        """Get the native currency for a ticker"""
        return TICKER_CURRENCIES.get(ticker, 'USD')
