import pandas as pd
import yfinance as yf
from typing import Dict, Optional
from datetime import datetime
import warnings

warnings.filterwarnings('ignore')

class MarketDataService:
    """Service for fetching and processing market data"""
    
    TICKER_CURRENCIES = {
        'SPY': 'USD',
        'URTH': 'USD',
        'FEZ': 'USD',
        '^STOXX50E': 'EUR',
        'QQQ': 'USD',
        'DIA': 'USD'
    }
    
    TICKER_NAMES = {
        'SPY': 'S&P 500 ETF',
        'URTH': 'MSCI World ETF',
        'FEZ': 'EuroStoxx50 ETF',
        '^STOXX50E': 'EuroStoxx50 Index',
        'QQQ': 'NASDAQ-100 ETF',
        'DIA': 'Dow Jones ETF'
    }
    
    CPI_TICKERS = {
        'USD': 'CPIAUCSL',
        'EUR': 'CP0000EZ19M086NEST'
    }
    
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
            cpi_ticker = MarketDataService.CPI_TICKERS.get(currency)
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
    def fetch_fx_data(start: str, end: str) -> Optional[pd.Series]:
        """Fetch EUR/USD exchange rate data"""
        try:
            fx_data = yf.Ticker('EURUSD=X').history(start=start, end=end)
            if fx_data.empty:
                return None
            fx_data = fx_data.tz_localize(None)
            fx_monthly = fx_data.resample('MS').last()['Close']
            return fx_monthly
        except Exception as e:
            print(f"Error fetching FX data: {e}")
            return None
    
    @staticmethod
    def get_ticker_currency(ticker: str) -> str:
        """Get the native currency for a ticker"""
        return MarketDataService.TICKER_CURRENCIES.get(ticker, 'USD')
    
    @staticmethod
    def search_tickers(query: str) -> Dict[str, str]:
        """Search tickers by name or symbol"""
        query = query.upper()
        results = {}
        for ticker, name in MarketDataService.TICKER_NAMES.items():
            if query in ticker or query in name.upper():
                results[ticker] = name
        return results
