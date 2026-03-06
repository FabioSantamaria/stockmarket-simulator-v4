import React from 'react';

function MetricsTable({ results, tickers, real = false }) {
  // Use provided tickers or all tickers
  const tickersToShow = tickers || Object.keys(results);

  return (
    <div className="metrics-table-container">
      <table className="metrics-table">
        <thead>
          <tr>
            <th>Ticker</th>
            <th>Currency</th>
            <th>Total Invested</th>
            <th>Final Value</th>
            <th>Total Return</th>
            <th>CAGR</th>
            <th>Max Drawdown</th>
          </tr>
        </thead>
        <tbody>
          {tickersToShow.map((ticker) => {
            const result = results[ticker];
            const metrics = result.metrics;
            
            // Use real metrics if requested, otherwise use nominal
            const finalValue = real ? metrics.FinalValueReal : metrics.FinalValue;
            const totalReturn = real ? metrics.TotalReturnReal : metrics.TotalReturn;
            const cagr = real ? metrics.CAGRReal : metrics.CAGR;
            
            return (
              <tr key={ticker}>
                <td className="ticker-cell">{ticker}</td>
                <td>{metrics.Currency}</td>
                <td>${metrics.TotalInvested.toLocaleString('en-US', { maximumFractionDigits: 2 })}</td>
                <td>${finalValue.toLocaleString('en-US', { maximumFractionDigits: 2 })}</td>
                <td className="return-cell">
                  {(totalReturn * 100).toFixed(2)}%
                </td>
                <td className="cagr-cell">
                  {(cagr * 100).toFixed(2)}%
                </td>
                <td className="drawdown-cell">
                  {(metrics.MaxDrawdown * 100).toFixed(2)}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default MetricsTable;
