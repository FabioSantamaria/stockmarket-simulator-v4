import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { simulatorAPI } from './api/client';
import SimulationForm from './components/SimulationForm';
import ResultsDisplay from './components/ResultsDisplay';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorAlert from './components/ErrorAlert';
import './styles/main.css';

function App() {
  const [results, setResults] = useState(null);
  const [forecasts, setForecasts] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSimulate = async (params) => {
    setLoading(true);
    setError(null);
    setResults(null);
    setForecasts(null);

    try {
      const response = await simulatorAPI.simulate(params);
      setResults(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'An error occurred during simulation');
      console.error('Simulation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleForecast = async (params, horizonYears, simulations) => {
    setLoading(true);
    setError(null);

    try {
      const response = await simulatorAPI.forecast(params, horizonYears, simulations, true);
      setForecasts(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'An error occurred during forecast');
      console.error('Forecast error:', err);
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
                onForecast={handleForecast}
                loading={loading}
              />
            </div>

            <div className="content-area">
              {loading && <LoadingSpinner />}
              {results && (
                <ResultsDisplay
                  results={results}
                  forecasts={forecasts}
                  onForecast={(params) => handleForecast(params, 10, 1000)}
                />
              )}
              {!loading && !results && (
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
