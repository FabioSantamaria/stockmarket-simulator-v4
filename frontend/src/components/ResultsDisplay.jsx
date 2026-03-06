import React, { useState } from 'react';
import PlotChart from './PlotChart';
import MetricsTable from './MetricsTable';
import ForecastChart from './ForecastChart';

function ResultsDisplay({ results, forecasts, onForecast }) {
  const [activeTab, setActiveTab] = useState('overview');

  if (!results) return null;

  const { results: simulationResults } = results;
  const tickers = Object.keys(simulationResults);

  // Prepare data for visualization
  const plotData = tickers.map((ticker) => {
    const data = simulationResults[ticker].timeSeries;
    return {
      x: data.map((d) => d.date),
      y: data.map((d) => d.value),
      name: ticker,
      type: 'scatter',
      mode: 'lines',
    };
  });

  const investedData = {
    x: simulationResults[tickers[0]]?.timeSeries.map((d) => d.date) || [],
    y: simulationResults[tickers[0]]?.timeSeries.map((d) => d.invested) || [],
    name: 'Total Invested',
    type: 'scatter',
    mode: 'lines',
    line: { dash: 'dash', color: '#808080' },
  };

  return (
    <div className="results-display">
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`tab ${activeTab === 'metrics' ? 'active' : ''}`}
          onClick={() => setActiveTab('metrics')}
        >
          Metrics
        </button>
        {forecasts && (
          <button
            className={`tab ${activeTab === 'forecast' ? 'active' : ''}`}
            onClick={() => setActiveTab('forecast')}
          >
            Forecast
          </button>
        )}
      </div>

      {activeTab === 'overview' && (
        <div className="tab-content">
          <h2>Portfolio Growth</h2>
          <PlotChart
            data={[...plotData, investedData]}
            layout={{
              title: 'Nominal Portfolio Value Over Time',
              xaxis: { title: 'Date' },
              yaxis: { title: 'Value (USD)' },
              hovermode: 'x unified',
            }}
            config={{ responsive: true }}
          />
        </div>
      )}

      {activeTab === 'metrics' && (
        <div className="tab-content">
          <h2>Investment Metrics</h2>
          <MetricsTable results={simulationResults} />
        </div>
      )}

      {activeTab === 'forecast' && forecasts && (
        <div className="tab-content">
          <h2>Monte Carlo Forecast</h2>
          <ForecastChart forecasts={forecasts.forecasts} />
        </div>
      )}
    </div>
  );
}

export default ResultsDisplay;
