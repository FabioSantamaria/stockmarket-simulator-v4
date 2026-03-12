import React from 'react';
import PlotChart from './PlotChart';

function ForecastChart({ forecasts, results }) {
  if (!forecasts) return null;

  const tickers = Object.keys(forecasts);
  const compareDividends = forecasts.compare_dividends || false;
  
  // Create separate plot data for each scenario
  const createScenarioPlotData = (scenarioKey, scenarioName, lineStyle, color) => {
    const plotData = [];

    tickers.forEach((ticker) => {
      const forecast = forecasts[ticker];
      const scenarioData = forecast[scenarioKey];
      
      if (!scenarioData) return;
      
      const dates = scenarioData.map((f) => f.date);
      const medians = scenarioData.map((f) => f.median);
      const p10s = scenarioData.map((f) => f.p10);
      const p90s = scenarioData.map((f) => f.p90);

      // Add historical endpoint as starting point
      let historicalEndDate = null;
      if (results && results[ticker]) {
        const timeSeries = results[ticker].timeSeries;
        if (timeSeries.length > 0) {
          historicalEndDate = timeSeries[timeSeries.length - 1].date;
        }
      }

      // Create line from historical end (baseline 1) to forecast start
      if (historicalEndDate && dates.length > 0) {
        const connectorDates = [historicalEndDate, dates[0]];
        const connectorValues = [1, medians[0]];
        
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

      // Main forecast lines
      plotData.push({
        x: dates,
        y: medians,
        name: `${ticker} Median`,
        type: 'scatter',
        mode: 'lines',
        line: lineStyle,
      });

      plotData.push({
        x: dates,
        y: p10s,
        name: `${ticker} 10th Percentile`,
        type: 'scatter',
        mode: 'lines',
        line: { ...lineStyle, dash: 'dash' },
      });

      plotData.push({
        x: dates,
        y: p90s,
        name: `${ticker} 90th Percentile`,
        type: 'scatter',
        mode: 'lines',
        line: { ...lineStyle, dash: 'dash' },
      });
    });

    return plotData;
  };

  const horizonYears = forecasts[tickers[0]]?.horizonYears || 10;
  const simulations = forecasts[tickers[0]]?.simulations || 1000;

  // If comparing dividends, show two separate charts
  if (compareDividends) {
    const withDividendsData = createScenarioPlotData('forecast', 'With Dividends', { color: '#0066cc' });
    const withoutDividendsData = createScenarioPlotData('forecast_without_dividends', 'Without Dividends', { color: '#ff6b6b', dash: 'dot' });

    return (
      <div>
        <p className="forecast-info">
          Forecast: {horizonYears} years | {simulations.toLocaleString()} simulations | Comparing dividend reinvestment scenarios
        </p>
        
        <div className="forecast-charts">
          <div className="chart-section">
            <h3>With Dividend Reinvestment</h3>
            <PlotChart
              data={withDividendsData}
              layout={{
                title: `Monte Carlo Forecast - With Dividends (${horizonYears} years)`,
                xaxis: { title: 'Date' },
                yaxis: { title: 'Index Value (Base = 1)' },
                hovermode: 'x unified',
              }}
              config={{ responsive: true }}
            />
          </div>
          
          <div className="chart-section">
            <h3>Without Dividend Reinvestment</h3>
            <PlotChart
              data={withoutDividendsData}
              layout={{
                title: `Monte Carlo Forecast - Without Dividends (${horizonYears} years)`,
                xaxis: { title: 'Date' },
                yaxis: { title: 'Index Value (Base = 1)' },
                hovermode: 'x unified',
              }}
              config={{ responsive: true }}
            />
          </div>
        </div>
      </div>
    );
  }

  // Single scenario (original behavior)
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

    // Create line from historical end (baseline 1) to forecast start
    if (historicalEndDate && dates.length > 0) {
      const connectorDates = [historicalEndDate, dates[0]];
      const connectorValues = [1, medians[0]];
      
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

    // Main forecast lines
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
          yaxis: { title: 'Index Value (Base = 1)' },
          hovermode: 'x unified',
        }}
        config={{ responsive: true }}
      />
    </div>
  );
}

export default ForecastChart;
