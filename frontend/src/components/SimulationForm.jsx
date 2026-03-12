import React, { useState, useEffect } from 'react';
import { Calendar, DollarSign, TrendingUp, BarChart3, Search, X, ToggleLeft, ToggleRight } from 'lucide-react';
import { simulatorAPI } from '../api/client';

function SimulationForm({ onSimulate, loading }) {
  const [simulationMode, setSimulationMode] = useState('backtest'); // 'backtest' or 'montecarlo'
  const [formData, setFormData] = useState({
    tickers: ['SPY', 'QQQ', 'DIA'],
    start_date: '2010-01-01',
    end_date: '2025-12-01',
    initial_investment: 10000,
    monthly_contribution: 0,
    reinvest_dividends: true,
  });

  // Update start date when mode changes
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setFormData(prev => ({
      ...prev,
      start_date: simulationMode === 'backtest' ? '2010-01-01' : today,
      end_date: simulationMode === 'backtest' ? '2025-12-01' : today
    }));
  }, [simulationMode]);

  const [monteCarloParams, setMonteCarloParams] = useState({
    horizon_years: 10,
    simulations: 1000,
    lookback_years: 10,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);


  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.length > 0) {
      try {
        const response = await simulatorAPI.searchTickers(query);
        setSearchResults(response.data.results || []);
        setShowSearchResults(true);
      } catch (error) {
        console.error('Search failed:', error);
      }
    } else {
      setShowSearchResults(false);
    }
  };

  const handleAddFromSearch = (ticker) => {
    if (!formData.tickers.includes(ticker.symbol)) {
      setFormData((prev) => ({
        ...prev,
        tickers: [...prev.tickers, ticker.symbol],
      }));
    }
    setSearchQuery('');
    setShowSearchResults(false);
  };

  const handleRemoveTicker = (tickerToRemove) => {
    setFormData((prev) => ({
      ...prev,
      tickers: prev.tickers.filter(ticker => ticker !== tickerToRemove),
    }));
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : name.includes('_') ? value : parseFloat(value) || value,
    }));
  };

  const handleMonteCarloChange = (e) => {
    const { name, value } = e.target;
    setMonteCarloParams((prev) => ({
      ...prev,
      [name]: parseInt(value),
    }));
  };

  const handleModeChange = (e) => {
    const newMode = e.target.value;
    setSimulationMode(newMode);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.tickers.length === 0) {
      alert('Please select at least one ticker');
      return;
    }
    
    // Validate date range for Monte Carlo
    if (simulationMode === 'montecarlo' && formData.start_date > formData.end_date) {
      alert('Start date cannot be after end date for Monte Carlo simulation');
      return;
    }
    
    if (simulationMode === 'backtest') {
      onSimulate('backtest', formData);
    } else {
      onSimulate('montecarlo', formData, monteCarloParams.horizon_years, monteCarloParams.simulations, monteCarloParams.lookback_years);
    }
  };

  return (
    <form className="simulation-form">
      <h2>Simulation Parameters</h2>

      {/* Simulation Mode Selector */}
      <div className="form-section">
        <label className="form-label">Simulation Mode</label>
        <select
          value={simulationMode}
          onChange={handleModeChange}
          disabled={loading}
          className="form-input"
        >
          <option value="backtest">Run Backtest Simulation</option>
          <option value="montecarlo">Run Monte Carlo Forecast</option>
        </select>
      </div>

      {/* Search Bar */}
      <div className="form-section">
        <label className="form-label">
          <Search size={16} /> Search Tickers
          <span className="tooltip">💡 Try: AAPL, MSFT, GOOGL, TSLA, NVDA, JPM, JNJ</span>
        </label>
        <div className="search-container">
          <input
            type="text"
            placeholder="Search by ticker or name... (e.g., Apple, Microsoft, Google)"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            disabled={loading}
            className="form-input"
          />
          {showSearchResults && searchResults.length > 0 && (
            <div className="search-results">
              {searchResults.map((result) => (
                <div
                  key={result.symbol}
                  className="search-result-item"
                  onClick={() => handleAddFromSearch(result)}
                >
                  <div className="result-symbol">{result.symbol}</div>
                  <div className="result-name">{result.name}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tickers Section */}
      <div className="form-section">
        <label className="form-label">📊 Selected Tickers</label>
        <div className="selected-tickers">
          {formData.tickers.length === 0 ? (
            <p className="no-tickers">No tickers selected. Use the search bar above to add tickers.</p>
          ) : (
            formData.tickers.map((ticker) => (
              <div key={ticker} className="ticker-item">
                <span className="ticker-symbol">{ticker}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveTicker(ticker)}
                  disabled={loading}
                  className="remove-ticker-btn"
                  title="Remove ticker"
                >
                  <X size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Date Range Section */}
      <div className="form-section">
        {simulationMode === 'backtest' ? (
          <>
            <div className="form-group">
              <label className="form-label">
                <Calendar size={16} /> Start Date
              </label>
              <input
                type="date"
                name="start_date"
                value={formData.start_date}
                onChange={handleInputChange}
                disabled={loading}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">
                <Calendar size={16} /> End Date
              </label>
              <input
                type="date"
                name="end_date"
                value={formData.end_date}
                onChange={handleInputChange}
                disabled={loading}
                className="form-input"
              />
            </div>
          </>
        ) : (
          <>
            <div className="form-group">
              <label className="form-label">
                <Calendar size={16} /> Start Date
              </label>
              <input
                type="date"
                name="start_date"
                value={formData.start_date}
                onChange={handleInputChange}
                disabled={loading}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">
                <Calendar size={16} /> Horizon (Years)
              </label>
              <input
                type="number"
                name="horizon_years"
                value={monteCarloParams.horizon_years}
                onChange={handleMonteCarloChange}
                min="1"
                max="50"
                disabled={loading}
                className="form-input"
              />
            </div>
          </>
        )}
      </div>

      {/* Investment Section */}
      <div className="form-section">
        <div className="form-group">
          <label className="form-label">
            <DollarSign size={16} /> Initial Investment
          </label>
          <input
            type="number"
            name="initial_investment"
            value={formData.initial_investment}
            onChange={handleInputChange}
            min="0"
            step="100"
            disabled={loading}
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label className="form-label">
            <TrendingUp size={16} /> Monthly Contribution
          </label>
          <input
            type="number"
            name="monthly_contribution"
            value={formData.monthly_contribution}
            onChange={handleInputChange}
            min="0"
            step="50"
            disabled={loading}
            className="form-input"
          />
        </div>
      </div>

      {/* Options Section */}
      <div className="form-section">
        <label className="checkbox-label">
          <input
            type="checkbox"
            name="reinvest_dividends"
            checked={formData.reinvest_dividends}
            onChange={handleInputChange}
            disabled={loading}
          />
          <span>Reinvest Dividends</span>
        </label>
        {simulationMode === 'montecarlo' && (
          <>
            <div className="form-group">
              <label className="form-label">Number of Simulations</label>
              <input
                type="number"
                name="simulations"
                value={monteCarloParams.simulations}
                onChange={handleMonteCarloChange}
                min="100"
                max="10000"
                step="100"
                disabled={loading}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Historical Lookback (Years)</label>
              <input
                type="number"
                name="lookback_years"
                value={monteCarloParams.lookback_years}
                onChange={handleMonteCarloChange}
                min="1"
                max="50"
                disabled={loading}
                className="form-input"
              />
              <small className="form-help-text">
                Years of historical data to use for calculating Monte Carlo returns
              </small>
            </div>
            <div className="time-estimate">
              <strong>⏱️ Estimated Time:</strong> {Math.round(monteCarloParams.simulations * monteCarloParams.lookback_years * 0.01)} seconds
              <br />
              <small>Based on {monteCarloParams.simulations} simulations using {monteCarloParams.lookback_years} years of data</small>
            </div>
          </>
        )}
      </div>

      {/* Submit Button */}
      <div className="form-section">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading || formData.tickers.length === 0}
          className="btn btn-primary"
        >
          {loading ? 'Running...' : 
           simulationMode === 'backtest' ? 'Run Backtest Simulation' : 'Run Monte Carlo Forecast'}
        </button>
      </div>
    </form>
  );
}

export default SimulationForm;
