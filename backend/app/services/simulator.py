import pandas as pd
import numpy as np
from typing import Dict, Tuple, Optional
from datetime import datetime

class SimulationService:
    """Service for running investment simulations"""
    
    @staticmethod
    def simulate_investment(
        ticker: str,
        data: pd.DataFrame,
        initial: float,
        monthly: float,
        reinvest_div: bool,
        currency: str,
        cpi_data: Optional[pd.Series] = None
    ) -> pd.DataFrame:
        """Simulate investment in a ticker"""
        timeline = []
        shares = 0
        cash = 0
        total_invested = 0
        
        for idx, row in data.iterrows():
            # Initial investment at start
            if len(timeline) == 0 and initial > 0:
                shares += initial / row['Close']
                total_invested += initial
            
            # Monthly contribution
            if monthly > 0:
                shares += monthly / row['Close']
                total_invested += monthly
            
            # Dividends
            dividend = shares * row['Close'] * row['DividendYield']
            if reinvest_div:
                shares += dividend / row['Close']
            else:
                cash += dividend
            
            value = shares * row['Close'] + cash
            
            # Calculate real (inflation-adjusted) value
            value_real = value
            if cpi_data is not None:
                try:
                    cpi_start = cpi_data.iloc[0]
                    cpi_at_date = cpi_data.loc[idx] if idx in cpi_data.index else cpi_data[cpi_data.index <= idx].iloc[-1] if len(cpi_data[cpi_data.index <= idx]) > 0 else cpi_start
                    value_real = value * (cpi_start / cpi_at_date)
                except:
                    value_real = value
            
            timeline.append({
                'date': idx,
                'value': value,
                'value_real': value_real,
                'invested': total_invested,
                'close': row['Close']
            })
        
        return pd.DataFrame(timeline)
    
    @staticmethod
    def calculate_metrics(
        df: pd.DataFrame,
        ticker: str,
        cpi_data: Optional[pd.Series],
        ticker_currency: str,
        inflation_adj: bool = False
    ) -> Dict[str, float]:
        """Calculate investment metrics"""
        if len(df) < 2:
            return {}
        
        start_value = df.iloc[0]['value']
        end_value = df.iloc[-1]['value']
        total_invested = df.iloc[-1]['invested']
        start_date = df.iloc[0]['date']
        end_date = df.iloc[-1]['date']
        years = (end_date - start_date).days / 365.25
        
        # Nominal CAGR and return
        nominal_cagr = (end_value / start_value) ** (1 / years) - 1 if start_value > 0 and years > 0 else 0
        nominal_return = (end_value - total_invested) / total_invested if total_invested > 0 else 0
        
        # Real (inflation-adjusted) values
        real_cagr = nominal_cagr
        real_return = nominal_return
        adjusted_end_value = end_value
        
        if inflation_adj and cpi_data is not None:
            cpi_aligned = cpi_data.loc[start_date:end_date]
            if len(cpi_aligned) > 0:
                cpi_start = cpi_aligned.iloc[0]
                cpi_end = cpi_aligned.iloc[-1]
                
                # Real values
                adjusted_end_value = end_value * (cpi_start / cpi_end)
                real_value = end_value
                real_invested = total_invested * (cpi_end / cpi_start)
                real_return = (real_value - real_invested) / real_invested if real_invested > 0 else 0
                real_cagr = (adjusted_end_value / start_value) ** (1 / years) - 1 if start_value > 0 and years > 0 else 0
        
        # Max drawdown
        df_copy = df.copy()
        df_copy['peak'] = df_copy['value'].cummax()
        df_copy['drawdown'] = (df_copy['value'] - df_copy['peak']) / df_copy['peak']
        max_drawdown = df_copy['drawdown'].min()
        
        return {
            'Currency': ticker_currency,
            'FinalValue': float(end_value),
            'FinalValueReal': float(adjusted_end_value),
            'TotalInvested': float(total_invested),
            'CAGR': float(nominal_cagr),
            'CAGRReal': float(real_cagr),
            'TotalReturn': float(nominal_return),
            'TotalReturnReal': float(real_return),
            'MaxDrawdown': float(max_drawdown)
        }
    
    @staticmethod
    def forecast_monte_carlo(
        df: pd.DataFrame,
        horizon_years: int = 10,
        simulations: int = 1000,
        inflation_adjusted: bool = False,
        cpi_data: Optional[pd.Series] = None
    ) -> Tuple[list, list, list, list]:
        """Run Monte Carlo simulation"""
        df_copy = df.copy()
        
        if inflation_adjusted and cpi_data is not None:
            # Calculate real returns
            start_date = df_copy.iloc[0]['date']
            end_date = df_copy.iloc[-1]['date']
            cpi_subset = cpi_data.loc[start_date:end_date]
            if len(cpi_subset) > 0:
                cpi_start = cpi_subset.iloc[0]
                cpi_filled = cpi_subset.reindex(df_copy['date'], method='ffill')
                df_copy['value_real'] = df_copy['value'] * (cpi_start / cpi_filled.values)
            else:
                df_copy['value_real'] = df_copy['value']
        else:
            df_copy['value_real'] = df_copy['value']
        
        df_copy['return'] = df_copy['value_real'].pct_change().fillna(0)
        mu = df_copy['return'].mean()
        sigma = df_copy['return'].std()
        last_val = df_copy['value_real'].iloc[-1]
        
        steps = horizon_years * 12
        paths = np.zeros((steps, simulations))
        
        for i in range(simulations):
            prices = [last_val]
            for _ in range(steps):
                shock = np.random.normal(mu, sigma)
                prices.append(prices[-1] * (1 + shock))
            paths[:, i] = prices[1:]
        
        dates = pd.date_range(
            start=df_copy['date'].iloc[-1] + pd.offsets.MonthBegin(1),
            periods=steps,
            freq='MS'
        )
        
        median = np.median(paths, axis=1)
        p10 = np.percentile(paths, 10, axis=1)
        p90 = np.percentile(paths, 90, axis=1)
        
        return dates, median.tolist(), p10.tolist(), p90.tolist()
