import React from 'react';
import PlotChart from './PlotChart';

function ForecastChart({ forecasts }) {
  if (!forecasts) return null;

  const tickers = Object.keys(forecasts);
  const plotData = [];

  tickers.forEach((ticker) => {
    const forecast = forecasts[ticker];
    const dates = forecast.forecast.map((f) => f.date);
    const medians = forecast.forecast.map((f) => f.median);
    const p10s = forecast.forecast.map((f) => f.p10);
    const p90s = forecast.forecast.map((f) => f.p90);

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
        Forecast: {horizonYears} years | {simulations.toLocaleString()} simulations
      </p>
      <PlotChart
        data={plotData}
        layout={{
          title: `Monte Carlo Forecast (${horizonYears} years, ${simulations.toLocaleString()} simulations)`,
          xaxis: { title: 'Date' },
          yaxis: { title: 'Value' },
          hovermode: 'x unified',
        }}
        config={{ responsive: true }}
      />
    </div>
  );
}

export default ForecastChart;
