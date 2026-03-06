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
      // Fetch CPI data for both currencies
      const [usdCPI, eurCPI, fx] = await Promise.all([
        simulatorAPI.getCPIData('USD', params.start_date, params.end_date),
        simulatorAPI.getCPIData('EUR', params.start_date, params.end_date),
        simulatorAPI.getFXData(params.start_date, params.end_date),
      ]);

      setCpiData({
        USD: usdCPI.data?.data || [],
        EUR: eurCPI.data?.data || [],
      });
      setFxData(fx.data?.data || []);

      // Extract closing price data from simulation results
      const prices = {};
      tickers.forEach((ticker) => {
        const timeSeries = simulationResults[ticker].timeSeries;
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

  // Separate tickers by currency
  const usdTickers = tickers.filter((t) => simulationResults[t].currency === 'USD');
  const eurTickers = tickers.filter((t) => simulationResults[t].currency === 'EUR');

  // Helper function to create plot data
  const createPlotData = (tickerList, valueKey = 'value') => {
    return tickerList.map((ticker) => {
      const data = simulationResults[ticker].timeSeries;
      return {
        x: data.map((d) => d.date),
        y: data.map((d) => d[valueKey]),
        name: ticker,
        type: 'scatter',
        mode: 'lines',
      };
    });
  };

  // Nominal plots by currency
  const nominalUSDData = createPlotData(usdTickers, 'value');
  const nominalEURData = createPlotData(eurTickers, 'value');

  // Real plots by currency
  const realUSDData = createPlotData(usdTickers, 'valueReal');
  const realEURData = createPlotData(eurTickers, 'valueReal');

  // Invested data (use first USD ticker or first ticker)
  const investedTicker = usdTickers.length > 0 ? usdTickers[0] : eurTickers[0];
  const investedData = investedTicker
    ? {
        x: simulationResults[investedTicker].timeSeries.map((d) => d.date),
        y: simulationResults[investedTicker].timeSeries.map((d) => d.invested),
        name: 'Total Invested',
        type: 'scatter',
        mode: 'lines',
        line: { dash: 'dash', color: '#808080' },
      }
    : null;

  // Prepare CPI plot data
  const cpiPlotData = [];
  if (cpiData.USD && cpiData.USD.length > 0) {
    cpiPlotData.push({
      x: cpiData.USD.map((d) => d.date),
      y: cpiData.USD.map((d) => d.value),
      name: 'US CPI',
      type: 'scatter',
      mode: 'lines',
    });
  }
  if (cpiData.EUR && cpiData.EUR.length > 0) {
    cpiPlotData.push({
      x: cpiData.EUR.map((d) => d.date),
      y: cpiData.EUR.map((d) => d.value),
      name: 'Euro Area CPI',
      type: 'scatter',
      mode: 'lines',
    });
  }

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
          <p className="chart-description">Unadjusted portfolio values in original currency</p>
          
          {usdTickers.length > 0 && (
            <div className="currency-section">
              <h3>USD Tickers</h3>
              <PlotChart
                data={[...nominalUSDData, investedData]}
                layout={{
                  title: 'Nominal Portfolio Values (USD)',
                  xaxis: { title: 'Date' },
                  yaxis: { title: 'Value (USD)' },
                  hovermode: 'x unified',
                }}
                config={{ responsive: true }}
              />
            </div>
          )}

          {eurTickers.length > 0 && (
            <div className="currency-section">
              <h3>EUR Tickers</h3>
              <PlotChart
                data={nominalEURData.concat(investedData ? [investedData] : [])}
                layout={{
                  title: 'Nominal Portfolio Values (EUR)',
                  xaxis: { title: 'Date' },
                  yaxis: { title: 'Value (EUR)' },
                  hovermode: 'x unified',
                }}
                config={{ responsive: true }}
              />
            </div>
          )}
        </div>
      )}

      {activeTab === 'real' && (
        <div className="tab-content">
          <h2>Real (Inflation-Adjusted) Growth</h2>
          <p className="chart-description">Portfolio values adjusted for inflation using local CPI</p>
          
          {usdTickers.length > 0 && (
            <div className="currency-section">
              <h3>USD Tickers (US CPI-Adjusted)</h3>
              <PlotChart
                data={[...realUSDData, investedData]}
                layout={{
                  title: 'Real Portfolio Values (USD) - Adjusted for US Inflation',
                  xaxis: { title: 'Date' },
                  yaxis: { title: 'Value (Inflation-Adjusted USD)' },
                  hovermode: 'x unified',
                }}
                config={{ responsive: true }}
              />
            </div>
          )}

          {eurTickers.length > 0 && (
            <div className="currency-section">
              <h3>EUR Tickers (Euro Area CPI-Adjusted)</h3>
              <PlotChart
                data={realEURData.concat(investedData ? [investedData] : [])}
                layout={{
                  title: 'Real Portfolio Values (EUR) - Adjusted for Euro Area Inflation',
                  xaxis: { title: 'Date' },
                  yaxis: { title: 'Value (Inflation-Adjusted EUR)' },
                  hovermode: 'x unified',
                }}
                config={{ responsive: true }}
              />
            </div>
          )}
        </div>
      )}

      {activeTab === 'metrics-nominal' && (
        <div className="tab-content">
          <h2>Investment Metrics (Nominal)</h2>
          
          {usdTickers.length > 0 && (
            <div className="metrics-section">
              <h3>USD Tickers</h3>
              <MetricsTable results={simulationResults} tickers={usdTickers} />
            </div>
          )}

          {eurTickers.length > 0 && (
            <div className="metrics-section">
              <h3>EUR Tickers</h3>
              <MetricsTable results={simulationResults} tickers={eurTickers} />
            </div>
          )}
        </div>
      )}

      {activeTab === 'metrics-real' && (
        <div className="tab-content">
          <h2>Investment Metrics (Inflation-Adjusted)</h2>
          
          {usdTickers.length > 0 && (
            <div className="metrics-section">
              <h3>USD Tickers (Real Returns)</h3>
              <MetricsTable results={simulationResults} tickers={usdTickers} real={true} />
            </div>
          )}

          {eurTickers.length > 0 && (
            <div className="metrics-section">
              <h3>EUR Tickers (Real Returns)</h3>
              <MetricsTable results={simulationResults} tickers={eurTickers} real={true} />
            </div>
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

          {usdTickers.length > 0 && (
            <div className="macro-chart">
              <h3>USD Index Prices</h3>
              <PlotChart
                data={usdTickers.map((ticker) => ({
                  x: (priceData[ticker] || []).map((d) => d.date),
                  y: (priceData[ticker] || []).map((d) => d.price),
                  name: ticker,
                  type: 'scatter',
                  mode: 'lines',
                }))}
                layout={{
                  title: 'Closing Prices - USD Tickers',
                  xaxis: { title: 'Date' },
                  yaxis: { title: 'Price (USD)' },
                  hovermode: 'x unified',
                }}
                config={{ responsive: true }}
              />
            </div>
          )}

          {eurTickers.length > 0 && (
            <div className="macro-chart">
              <h3>EUR Index Prices</h3>
              <PlotChart
                data={eurTickers.map((ticker) => ({
                  x: (priceData[ticker] || []).map((d) => d.date),
                  y: (priceData[ticker] || []).map((d) => d.price),
                  name: ticker,
                  type: 'scatter',
                  mode: 'lines',
                }))}
                layout={{
                  title: 'Closing Prices - EUR Tickers',
                  xaxis: { title: 'Date' },
                  yaxis: { title: 'Price (EUR)' },
                  hovermode: 'x unified',
                }}
                config={{ responsive: true }}
              />
            </div>
          )}
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
