import React from 'react';

function ForecastMetricsTable({ forecasts, tickers }) {
  console.log('ForecastMetricsTable render:', { forecasts, tickers });
  
  if (!forecasts) {
    console.log('No forecasts data provided');
    return null;
  }

  const tickersToShow = tickers || Object.keys(forecasts);
  console.log('Tickers to show:', tickersToShow);

  return (
    <div className="metrics-table-container">
      <table className="metrics-table">
        <thead>
          <tr>
            <th>Ticker</th>
            <th>Horizon (Years)</th>
            <th>Simulations</th>
            <th>Final Median</th>
            <th>10th Percentile</th>
            <th>90th Percentile</th>
            <th>Median Annual Return</th>
          </tr>
        </thead>
        <tbody>
          {tickersToShow.map((ticker) => {
            const forecast = forecasts[ticker];
            const forecastData = forecast.forecast;
            
            if (!forecastData || forecastData.length === 0) return null;
            
            const finalMedian = forecastData[forecastData.length - 1].median;
            const finalP10 = forecastData[forecastData.length - 1].p10;
            const finalP90 = forecastData[forecastData.length - 1].p90;
            const horizonYears = forecast.horizonYears || 10;
            
            // Calculate annualized return from median
            const annualizedReturn = Math.pow(finalMedian, 1/horizonYears) - 1;
            
            return (
              <tr key={ticker}>
                <td className="ticker-cell">{ticker}</td>
                <td>{horizonYears}</td>
                <td>{forecast.simulations?.toLocaleString() || 'N/A'}</td>
                <td>{finalMedian.toFixed(3)}</td>
                <td>{finalP10.toFixed(3)}</td>
                <td>{finalP90.toFixed(3)}</td>
                <td className="cagr-cell">
                  {(annualizedReturn * 100).toFixed(2)}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      
      <div className="metrics-explanation" style={{ marginTop: '16px', fontSize: '14px', color: '#666' }}>
        <p><strong>Note:</strong> Values are indexed to a base of 1.0. Percentiles show the range of possible outcomes:</p>
        <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
          <li><strong>10th Percentile:</strong> Poor outcome (90% of simulations performed better)</li>
          <li><strong>Median:</strong> Most likely outcome (50% of simulations performed better/worse)</li>
          <li><strong>90th Percentile:</strong> Good outcome (only 10% of simulations performed better)</li>
        </ul>
      </div>
    </div>
  );
}

export default ForecastMetricsTable;
