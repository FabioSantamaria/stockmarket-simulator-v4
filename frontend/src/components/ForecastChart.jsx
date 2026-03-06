import React from 'react';
import PlotChart from './PlotChart';

function ForecastChart({ forecasts, results }) {
  if (!forecasts) return null;

  const tickers = Object.keys(forecasts);
  const plotData = [];

  tickers.forEach((ticker) => {
    const forecast = forecasts[ticker];
    const dates = forecast.forecast.map((f) => f.date);
    const medians = forecast.forecast.map((f) => f.median);
    const p10s = forecast.forecast.map((f) => f.p10);
    const p90s = forecast.forecast.map((f) => f.p90);

    // Add historical endpoint as starting point
    let historicalEndDate = null;
    if (results && results[ticker]) {
      const timeSeries = results[ticker].timeSeries;
      if (timeSeries.length > 0) {
        historicalEndDate = timeSeries[timeSeries.length - 1].date;
      }
    }

    // Create line from historical end (baseline 100) to forecast start
    if (historicalEndDate && dates.length > 0) {
      const connectorDates = [historicalEndDate, dates[0]];
      const connectorValues = [100, medians[0]];
      
      plotData.push({
        x: connectorDates,
        y: connectorValues,
        name: `${ticker} Connection`,
        type: 'scatter',
        mode: 'lines',
        line: { color: '#999999', width: 1, dash: 'dot' },
        showlegend: false,
      });
    }

    plotData.push({
      x: dates,
      y: medians,
      name: `${ticker} Median`,
      type: 'scatter',
      mode: 'lines',
    });

    plotData.push({
      x: dates,
      y: p10s,
      name: `${ticker} 10th Percentile`,
      type: 'scatter',
      mode: 'lines',
      line: { dash: 'dash' },
    });

    plotData.push({
      x: dates,
      y: p90s,
      name: `${ticker} 90th Percentile`,
      type: 'scatter',
      mode: 'lines',
      line: { dash: 'dash' },
    });
  });

  const horizonYears = forecasts[tickers[0]]?.horizonYears || 10;
  const simulations = forecasts[tickers[0]]?.simulations || 1000;

  return (
    <div>
      <p className="forecast-info">
        Forecast: {horizonYears} years | {simulations.toLocaleString()} simulations | Indexed to 100 at forecast start
      </p>
      <PlotChart
        data={plotData}
        layout={{
          title: `Monte Carlo Forecast (${horizonYears} years, ${simulations.toLocaleString()} simulations)`,
          xaxis: { title: 'Date' },
          yaxis: { title: 'Index Value (Base = 100)' },
          hovermode: 'x unified',
        }}
        config={{ responsive: true }}
      />
    </div>
  );
}

export default ForecastChart;
