import pandas as pd
import yfinance as yf
import requests
import json
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
        """Search tickers by name or symbol using Yahoo Finance API"""
        try:
            query = query.upper().strip()
            results = {}
            
            # First try Yahoo Finance search for comprehensive results
            try:
                import requests
                import json
                
                # Use Yahoo Finance search API
                url = f"https://query2.finance.yahoo.com/v1/finance/search?q={query}"
                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
                
                response = requests.get(url, headers=headers, timeout=10)
                if response.status_code == 200:
                    data = response.json()
                    if 'quotes' in data and data['quotes']:
                        for item in data['quotes'][:10]:  # Limit to 10 results
                            symbol = item.get('symbol', '')
                            name = item.get('longname') or item.get('shortname', '')
                            if symbol and name:
                                results[symbol] = name
            except Exception as api_error:
                print(f"Yahoo API search failed: {api_error}")
            
            # If Yahoo search failed or returned no results, try direct ticker lookup
            if not results:
                try:
                    ticker_obj = yf.Ticker(query)
                    info = ticker_obj.info
                    if info and 'longName' in info:
                        results[query] = info['longName']
                except Exception as direct_error:
                    print(f"Direct ticker lookup failed: {direct_error}")
            
            # If still no results, use comprehensive offline database
            if not results:
                popular_tickers = {
                    # Tech Stocks
                    'AAPL': 'Apple Inc.',
                    'MSFT': 'Microsoft Corporation',
                    'GOOGL': 'Alphabet Inc.',
                    'AMZN': 'Amazon.com, Inc.',
                    'META': 'Meta Platforms, Inc.',
                    'TSLA': 'Tesla, Inc.',
                    'NVDA': 'NVIDIA Corporation',
                    'AMD': 'Advanced Micro Devices, Inc.',
                    'INTC': 'Intel Corporation',
                    'NFLX': 'Netflix, Inc.',
                    'ADBE': 'Adobe Inc.',
                    'CRM': 'Salesforce, Inc.',
                    
                    # Finance
                    'JPM': 'JPMorgan Chase & Co.',
                    'BAC': 'Bank of America Corporation',
                    'WFC': 'Wells Fargo & Company',
                    'GS': 'The Goldman Sachs Group, Inc.',
                    'MS': 'Morgan Stanley',
                    
                    # Healthcare
                    'JNJ': 'Johnson & Johnson',
                    'UNH': 'UnitedHealth Group Incorporated',
                    'PFE': 'Pfizer Inc.',
                    'ABBV': 'AbbVie Inc.',
                    'TMO': 'Thermo Fisher Scientific Inc.',
                    
                    # Consumer
                    'PG': 'Procter & Gamble Company',
                    'KO': 'The Coca-Cola Company',
                    'PEP': 'PepsiCo, Inc.',
                    'WMT': 'Walmart Inc.',
                    'HD': 'The Home Depot, Inc.',
                    
                    # Energy
                    'XOM': 'Exxon Mobil Corporation',
                    'CVX': 'Chevron Corporation',
                    'COP': 'ConocoPhillips',
                    'SLB': 'Schlumberger Limited',
                    
                    # Industrial
                    'BA': 'The Boeing Company',
                    'CAT': 'Caterpillar Inc.',
                    'GE': 'General Electric Company',
                    'MMM': '3M Company',
                    
                    # Default ETFs (keep these)
                    'SPY': 'S&P 500 ETF',
                    'QQQ': 'NASDAQ-100 ETF',
                    'DIA': 'Dow Jones ETF',
                    'URTH': 'MSCI World ETF',
                    'FEZ': 'EuroStoxx50 ETF',
                    '^STOXX50E': 'EuroStoxx50 Index',
                    
                    # Other popular
                    'BRK-B': 'Berkshire Hathaway Inc.',
                    'V': 'Visa Inc.',
                    'MA': 'Mastercard Incorporated',
                    'DIS': 'The Walt Disney Company',
                    'NKE': 'NIKE, Inc.'
                }
                
                # Search in popular tickers
                for ticker, name in popular_tickers.items():
                    if query in ticker or query in name.upper():
                        results[ticker] = name
            
            return results
            
        except Exception as e:
            print(f"Error searching tickers: {e}")
            # Final fallback to default search
            query = query.upper()
            results = {}
            for ticker, name in MarketDataService.TICKER_NAMES.items():
                if query in ticker or query in name.upper():
                    results[ticker] = name
            return results
