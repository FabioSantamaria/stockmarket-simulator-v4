import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { simulatorAPI } from './api/client';
import SimulationForm from './components/SimulationForm';
import ResultsDisplay from './components/ResultsDisplay';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorAlert from './components/ErrorAlert';
import './styles/main.css';

// Add global error handler
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

console.log('App.jsx loaded successfully');

function App() {
  const [results, setResults] = useState(null);
  const [forecasts, setForecasts] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSimulate = async (mode, params, horizonYears, simulations, lookbackYears) => {
    console.log('Starting simulation:', { mode, params, horizonYears, simulations, lookbackYears });
    setLoading(true);
    setError(null);
    setResults(null);
    setForecasts(null);

    try {
      if (mode === 'backtest') {
        console.log('Starting backtest simulation...');
        const response = await simulatorAPI.simulate(params);
        console.log('Backtest response:', response);
        setResults(response.data);
      } else {
        console.log(`Starting Monte Carlo with ${simulations} simulations, ${horizonYears} year horizon, ${lookbackYears} year lookback`);
        const response = await simulatorAPI.forecast(params, horizonYears, simulations, lookbackYears, true);
        console.log(`Monte Carlo completed in ${response.data.execution_time_seconds} seconds`);
        console.log('Monte Carlo response:', response);
        setForecasts(response.data);
      }
    } catch (err) {
      console.error('Simulation error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        config: err.config
      });
      setError(err.response?.data?.detail || err.message || 'An error occurred during simulation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <header className="header">
        <div className="container">
          <h1>📈 Stock Market Simulator</h1>
          <p className="subtitle">Simulate long-term investment returns with historical data</p>
        </div>
      </header>

      <main className="main-content">
        <div className="container">
          {error && <ErrorAlert message={error} />}

          <div className="grid">
            <div className="sidebar">
              <SimulationForm
                onSimulate={handleSimulate}
                loading={loading}
              />
            </div>

            <div className="content-area">
              {loading && <LoadingSpinner />}
              {results && (
                <ResultsDisplay
                  results={results}
                  forecasts={forecasts}
                />
              )}
              {forecasts && !results && (
                <ResultsDisplay
                  results={null}
                  forecasts={forecasts}
                />
              )}
              {!loading && !results && !forecasts && (
                <div className="empty-state">
                  <h2>👋 Welcome to Stock Market Simulator</h2>
                  <p>Configure your simulation parameters on the left and click "Run Simulation" to get started.</p>
                  <div className="features">
                    <div className="feature">
                      <h3>Historical Analysis</h3>
                      <p>Analyze past performance of major indices</p>
                    </div>
                    <div className="feature">
                      <h3>Investment Simulation</h3>
                      <p>Model your investment strategy with monthly contributions</p>
                    </div>
                    <div className="feature">
                      <h3>Monte Carlo Forecasts</h3>
                      <p>Generate probabilistic future scenarios</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="footer">
        <p>Stock Market Simulator v1.0 | Data provided by Yahoo Finance</p>
      </footer>
    </div>
  );
}

export default App;
