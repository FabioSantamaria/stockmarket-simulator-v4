import React from 'react';

function MetricsTable({ results }) {
  const tickers = Object.keys(results);

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
          {tickers.map((ticker) => {
            const result = results[ticker];
            const metrics = result.metrics;
            return (
              <tr key={ticker}>
                <td className="ticker-cell">{ticker}</td>
                <td>{metrics.Currency}</td>
                <td>${metrics.TotalInvested.toLocaleString('en-US', { maximumFractionDigits: 2 })}</td>
                <td>${metrics.FinalValue.toLocaleString('en-US', { maximumFractionDigits: 2 })}</td>
                <td className="return-cell">
                  {(metrics.TotalReturn * 100).toFixed(2)}%
                </td>
                <td className="cagr-cell">
                  {(metrics.CAGR * 100).toFixed(2)}%
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
