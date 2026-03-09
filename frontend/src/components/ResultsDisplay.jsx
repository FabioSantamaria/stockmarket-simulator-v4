import React, { useState, useEffect } from 'react';
import PlotChart from './PlotChart';
import MetricsTable from './MetricsTable';
import ForecastChart from './ForecastChart';
import { simulatorAPI } from '../api/client';

function ResultsDisplay({ results, forecasts, onForecast }) {
  const [activeTab, setActiveTab] = useState('nominal');
  const [cpiData, setCpiData] = useState({});
  const [fxData, setFxData] = useState(null);
  const [priceData, setPriceData] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (results) {
      fetchAdditionalData();
    }
  }, [results]);

  const fetchAdditionalData = async () => {
    setLoading(true);
    const params = results.parameters;
    
    try {
      // Extract unique currencies from results
      const tickerCurrencies = {};
      Object.keys(results.results).forEach(ticker => {
        tickerCurrencies[ticker] = results.results[ticker].currency || 'USD';
      });
      
      const uniqueCurrencies = [...new Set(Object.values(tickerCurrencies))];
      
      // Fetch CPI data for all detected currencies
      const cpiPromises = uniqueCurrencies.map(currency => 
        simulatorAPI.getCPIData(currency, params.start_date, params.end_date)
          .then(response => ({ currency, data: response.data?.data || [] }))
          .catch(() => ({ currency, data: [] }))
      );
      
      // Fetch FX data if we have multiple currencies
      let fxData = [];
      if (uniqueCurrencies.length > 1) {
        try {
          const fxResponse = await simulatorAPI.getFXData(params.start_date, params.end_date);
          fxData = fxResponse.data?.data || [];
        } catch (err) {
          console.error('Failed to fetch FX data:', err);
        }
      }
      
      const cpiResults = await Promise.all(cpiPromises);
      const cpiDataMap = {};
      cpiResults.forEach(({ currency, data }) => {
        cpiDataMap[currency] = data;
      });
      
      setCpiData(cpiDataMap);
      setFxData(fxData);

      // Extract closing price data from simulation results
      const prices = {};
      Object.keys(results.results).forEach((ticker) => {
        const timeSeries = results.results[ticker].timeSeries;
        prices[ticker] = timeSeries.map((point) => ({
          date: point.date,
          price: point.close, // Use actual closing price
        }));
      });
      setPriceData(prices);
    } catch (err) {
      console.error('Failed to fetch additional data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!results) return null;

  const { results: simulationResults } = results;
  const tickers = Object.keys(simulationResults);

  // Group tickers by currency dynamically
  const tickersByCurrency = {};
  tickers.forEach(ticker => {
    const currency = simulationResults[ticker].currency || 'USD';
    if (!tickersByCurrency[currency]) {
      tickersByCurrency[currency] = [];
    }
    tickersByCurrency[currency].push(ticker);
  });

  // Helper function to create plot data
  const createPlotData = (tickerList, valueKey = 'value') => {
    return tickerList.map((ticker) => {
      const data = simulationResults[ticker].timeSeries;
      return {
        x: data.map((d) => d.date),
        y: data.map((d) => d[valueKey]),
        name: `${ticker} (${simulationResults[ticker].currency})`,
        type: 'scatter',
        mode: 'lines',
      };
    });
  };

  // Create plot data for each currency
  const nominalPlotData = {};
  const realPlotData = {};
  Object.keys(tickersByCurrency).forEach(currency => {
    nominalPlotData[currency] = createPlotData(tickersByCurrency[currency], 'value');
    realPlotData[currency] = createPlotData(tickersByCurrency[currency], 'valueReal');
  });

  // Invested data (use first ticker)
  const firstTicker = tickers[0];
  const investedData = firstTicker
    ? {
        x: simulationResults[firstTicker].timeSeries.map((d) => d.date),
        y: simulationResults[firstTicker].timeSeries.map((d) => d.invested),
        name: 'Total Invested',
        type: 'scatter',
        mode: 'lines',
        line: { dash: 'dash', color: '#808080' },
      }
    : null;

  // Prepare CPI plot data dynamically
  const cpiPlotData = [];
  Object.keys(cpiData).forEach(currency => {
    if (cpiData[currency] && cpiData[currency].length > 0) {
      cpiPlotData.push({
        x: cpiData[currency].map((d) => d.date),
        y: cpiData[currency].map((d) => d.value),
        name: `${currency} CPI`,
        type: 'scatter',
        mode: 'lines',
      });
    }
  });

  // Prepare FX plot data
  const fxPlotData = fxData && fxData.length > 0 ? [
    {
      x: fxData.map((d) => d.date),
      y: fxData.map((d) => d.rate),
      name: 'EUR/USD',
      type: 'scatter',
      mode: 'lines',
      line: { color: '#10b981' },
    },
  ] : [];

  return (
    <div className="results-display">
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'nominal' ? 'active' : ''}`}
          onClick={() => setActiveTab('nominal')}
        >
          Nominal Growth
        </button>
        <button
          className={`tab ${activeTab === 'real' ? 'active' : ''}`}
          onClick={() => setActiveTab('real')}
        >
          Real Growth
        </button>
        <button
          className={`tab ${activeTab === 'metrics-nominal' ? 'active' : ''}`}
          onClick={() => setActiveTab('metrics-nominal')}
        >
          Metrics (Nominal)
        </button>
        <button
          className={`tab ${activeTab === 'metrics-real' ? 'active' : ''}`}
          onClick={() => setActiveTab('metrics-real')}
        >
          Metrics (Real)
        </button>
        <button
          className={`tab ${activeTab === 'macro' ? 'active' : ''}`}
          onClick={() => setActiveTab('macro')}
        >
          Macro Data
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

      {activeTab === 'nominal' && (
        <div className="tab-content">
          <h2>Nominal Portfolio Growth</h2>
          <p className="chart-description">Unadjusted portfolio values in original currency, including dividend accumulation</p>
          
          {Object.keys(tickersByCurrency).map(currency => (
            <div key={currency} className="currency-section">
              <h3>{currency} Tickers</h3>
              <PlotChart
                data={[...nominalPlotData[currency], ...(investedData && tickersByCurrency[currency].includes(firstTicker) ? [investedData] : [])]}
                layout={{
                  title: `Nominal Portfolio Values (${currency})`,
                  xaxis: { title: 'Date' },
                  yaxis: { title: `Value (${currency})` },
                  hovermode: 'x unified',
                }}
                config={{ responsive: true }}
              />
            </div>
          ))}
        </div>
      )}

      {activeTab === 'real' && (
        <div className="tab-content">
          <h2>Real (Inflation-Adjusted) Growth</h2>
          <p className="chart-description">Portfolio values adjusted for inflation using local CPI and including dividend accumulation</p>
          
          {Object.keys(tickersByCurrency).map(currency => (
            <div key={currency} className="currency-section">
              <h3>{currency} Tickers ({currency} CPI-Adjusted)</h3>
              <PlotChart
                data={[...realPlotData[currency], ...(investedData && tickersByCurrency[currency].includes(firstTicker) ? [investedData] : [])]}
                layout={{
                  title: `Real Portfolio Values (${currency}, CPI-Adjusted)`,
                  xaxis: { title: 'Date' },
                  yaxis: { title: `Value (${currency}, Inflation-Adjusted)` },
                  hovermode: 'x unified',
                }}
                config={{ responsive: true }}
              />
            </div>
          ))}
        </div>
      )}

      {activeTab === 'metrics-nominal' && (
        <div className="tab-content">
          <h2>Investment Metrics (Nominal)</h2>
          
          {Object.keys(tickersByCurrency).map(currency => (
            <div key={currency} className="metrics-section">
              <h3>{currency} Tickers</h3>
              <MetricsTable results={simulationResults} tickers={tickersByCurrency[currency]} />
            </div>
          ))}
        </div>
      )}

      {activeTab === 'metrics-real' && (
        <div className="tab-content">
          <h2>Investment Metrics (Inflation-Adjusted)</h2>
          
          {Object.keys(tickersByCurrency).map(currency => (
            <div key={currency} className="metrics-section">
              <h3>{currency} Tickers (Real Returns)</h3>
              <MetricsTable results={simulationResults} tickers={tickersByCurrency[currency]} real={true} />
            </div>
          ))}
        </div>
      )}

      {activeTab === 'macro' && (
        <div className="tab-content">
          <h2>Macroeconomic Data</h2>
          
          {cpiPlotData.length > 0 && (
            <div className="macro-chart">
              <h3>Consumer Price Index (CPI)</h3>
              <PlotChart
                data={cpiPlotData}
                layout={{
                  title: 'CPI Comparison: US vs Euro Area',
                  xaxis: { title: 'Date' },
                  yaxis: { title: 'CPI Index' },
                  hovermode: 'x unified',
                }}
                config={{ responsive: true }}
              />
            </div>
          )}

          {fxPlotData.length > 0 && (
            <div className="macro-chart">
              <h3>EUR/USD Exchange Rate</h3>
              <PlotChart
                data={fxPlotData}
                layout={{
                  title: 'EUR/USD Exchange Rate Over Time',
                  xaxis: { title: 'Date' },
                  yaxis: { title: 'EUR per USD' },
                  hovermode: 'x unified',
                }}
                config={{ responsive: true }}
              />
            </div>
          )}

          {Object.keys(tickersByCurrency).map(currency => (
            <div key={currency} className="macro-chart">
              <h3>{currency} Index Prices</h3>
              <p className="chart-description">Historical closing prices (price appreciation only, excludes dividends)</p>
              <PlotChart
                data={tickersByCurrency[currency].map((ticker) => ({
                  x: (priceData[ticker] || []).map((d) => d.date),
                  y: (priceData[ticker] || []).map((d) => d.price),
                  name: ticker,
                  type: 'scatter',
                  mode: 'lines',
                }))}
                layout={{
                  title: `Closing Prices - ${currency} Tickers`,
                  xaxis: { title: 'Date' },
                  yaxis: { title: `Price (${currency})` },
                  hovermode: 'x unified',
                }}
                config={{ responsive: true }}
              />
            </div>
          ))}
        </div>
      )}

      {activeTab === 'forecast' && forecasts && (
        <div className="tab-content">
          <h2>Monte Carlo Forecast (Based on Real Returns)</h2>
          <ForecastChart forecasts={forecasts.forecasts} results={simulationResults} />
        </div>
      )}
    </div>
  );
}

export default ResultsDisplay;
