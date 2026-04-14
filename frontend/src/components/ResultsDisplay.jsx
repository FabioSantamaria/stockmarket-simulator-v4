import React, { useState, useEffect } from 'react';
import PlotChart from './PlotChart';
import MetricsTable from './MetricsTable';
import ForecastChart from './ForecastChart';
import ForecastMetricsTable from './ForecastMetricsTable';
import { simulatorAPI } from '../api/client';

function ResultsDisplay({ results, forecasts, onForecast }) {
  const [activeTab, setActiveTab] = useState(
    results ? 'nominal' : 
    (forecasts && !results) ? 'real' : 
    (forecasts ? 'forecast' : 'nominal')
  );
  const [cpiData, setCpiData] = useState({});
  const [fxData, setFxData] = useState(null);
  const [priceData, setPriceData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  console.log('ResultsDisplay render:', { results, forecasts, activeTab });

  useEffect(() => {
    if (results) {
      fetchAdditionalData();
    }
  }, [results]);

  const fetchAdditionalData = async () => {
    console.log('Fetching additional data...');
    setLoading(true);
    setError(null);
    const params = results.parameters;
    
    try {
      // Extract unique currencies from results
      const tickerCurrencies = {};
      Object.keys(results.results).forEach(ticker => {
        tickerCurrencies[ticker] = results.results[ticker].currency || 'USD';
      });
      
      const uniqueCurrencies = [...new Set(Object.values(tickerCurrencies))];
      console.log('Unique currencies:', uniqueCurrencies);
      
      // Fetch CPI data for all detected currencies
      const cpiPromises = uniqueCurrencies.map(currency => 
        simulatorAPI.getCPIData(currency, params.start_date, params.end_date)
          .then(response => ({ currency, data: response.data?.data || [] }))
          .catch(err => {
            console.warn(`Failed to fetch CPI data for ${currency}:`, err);
            return { currency, data: [] };
          })
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
      
      console.log('CPI data fetched:', cpiDataMap);
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
      console.log('Price data extracted:', prices);
    } catch (err) {
      console.error('Failed to fetch additional data:', err);
      setError('Failed to fetch additional data');
    } finally {
      setLoading(false);
    }
  };

  // Handle case where we only have forecasts (Monte Carlo mode)
  if (!results && !forecasts) {
    console.log('No results or forecasts to display');
    return null;
  }
  
  // For forecast-only mode, only show Real Growth and Metrics (Real) tabs
  const isForecastOnly = !results && forecasts;
  console.log('Is forecast only:', isForecastOnly);
  
  const { results: simulationResults } = results || {};
  const tickers = simulationResults ? Object.keys(simulationResults) : (forecasts ? Object.keys(forecasts.forecasts) : []);
  console.log('Tickers:', tickers);

  // Group tickers by currency dynamically
  const tickersByCurrency = {};
  tickers.forEach(ticker => {
    const currency = simulationResults ? 
      (simulationResults[ticker].currency || 'USD') : 
      'USD'; // Default to USD for forecasts
    if (!tickersByCurrency[currency]) {
      tickersByCurrency[currency] = [];
    }
    tickersByCurrency[currency].push(ticker);
  });

  // Helper function to create plot data
  const createPlotData = (tickerList, valueKey = 'value') => {
    return tickerList.map((ticker) => {
      if (!simulationResults) return null; // Skip if no simulation results
      const data = simulationResults[ticker].timeSeries;
      return {
        x: data.map((d) => d.date),
        y: data.map((d) => d[valueKey]),
        name: `${ticker} (${simulationResults[ticker].currency})`,
        type: 'scatter',
        mode: 'lines',
      };
    }).filter(Boolean); // Filter out null entries
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
        {!isForecastOnly && (
          <>
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
          </>
        )}
        {isForecastOnly && (
          <>
            <button
              className={`tab ${activeTab === 'real' ? 'active' : ''}`}
              onClick={() => setActiveTab('real')}
            >
              Real Growth
            </button>
            <button
              className={`tab ${activeTab === 'metrics-real' ? 'active' : ''}`}
              onClick={() => setActiveTab('metrics-real')}
            >
              Metrics (Real)
            </button>
          </>
        )}
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
          {isForecastOnly ? (
            <>
              <h2>Real Growth Forecast</h2>
              <p className="chart-description">Monte Carlo simulation showing projected growth with percentiles based on historical real returns</p>
              <ForecastChart forecasts={forecasts.forecasts} results={simulationResults} />
            </>
          ) : (
            <>
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
            </>
          )}
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
          {isForecastOnly ? (
            <>
              <h2>Forecast Metrics (Real)</h2>
              <p className="chart-description">Monte Carlo simulation results showing projected growth with percentiles</p>
              <ForecastMetricsTable forecasts={forecasts.forecasts} tickers={tickers} />
            </>
          ) : (
            <>
              <h2>Investment Metrics (Inflation-Adjusted)</h2>
              {Object.keys(tickersByCurrency).map(currency => (
                <div key={currency} className="metrics-section">
                  <h3>{currency} Tickers (Real Returns)</h3>
                  <MetricsTable results={simulationResults} tickers={tickersByCurrency[currency]} real={true} />
                </div>
              ))}
            </>
          )}
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
          
          {/* Data Information Warning */}
          {forecasts.data_info && (
            <div className="data-info-warning" style={{
              backgroundColor: '#fef3c7',
              border: '1px solid #f59e0b',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '20px'
            }}>
              <h4 style={{ margin: '0 0 8px 0', color: '#92400e' }}>📊 Data Range Information</h4>
              <div style={{ fontSize: '14px', color: '#78350f' }}>
                <p style={{ margin: '4px 0' }}>
                  <strong>Requested:</strong> {forecasts.data_info.fetch_range.requested_lookback_years} years of historical data
                </p>
                <p style={{ margin: '4px 0' }}>
                  <strong>Actually Used:</strong> Latest {forecasts.data_info.fetch_range.requested_lookback_years} years from available data
                </p>
                <p style={{ margin: '4px 0' }}>
                  <strong>Data Retrieved:</strong> {forecasts.data_info.fetch_range.start} to {forecasts.data_info.fetch_range.end}
                </p>
                {Object.entries(forecasts.data_info.actual_date_ranges).map(([ticker, range]) => (
                  <p key={ticker} style={{ margin: '4px 0' }}>
                    <strong>{ticker}:</strong> {range.start} to {range.end} ({range.total_rows} data points)
                  </p>
                ))}
              </div>
            </div>
          )}
          
          <ForecastChart forecasts={forecasts.forecasts} results={simulationResults} />
        </div>
      )}
    </div>
  );
}

export default ResultsDisplay;
