import React, { useState, useEffect } from 'react';
import { Calendar, DollarSign, TrendingUp, BarChart3, Search } from 'lucide-react';
import { simulatorAPI } from '../api/client';

function SimulationForm({ availableTickers, onSimulate, onForecast, loading }) {
  const [formData, setFormData] = useState({
    tickers: ['SPY', 'QQQ', 'DIA'],
    start_date: '2010-01-01',
    end_date: '2025-12-01',
    initial_investment: 10000,
    monthly_contribution: 0,
    reinvest_dividends: true,
    inflation_adjusted: true,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const [forecastParams, setForecastParams] = useState({
    horizon_years: 10,
    simulations: 1000,
  });

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

  const handleTickerToggle = (ticker) => {
    setFormData((prev) => ({
      ...prev,
      tickers: prev.tickers.includes(ticker)
        ? prev.tickers.filter((t) => t !== ticker)
        : [...prev.tickers, ticker],
    }));
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : name.includes('_') ? value : parseFloat(value) || value,
    }));
  };

  const handleForecastChange = (e) => {
    const { name, value } = e.target;
    setForecastParams((prev) => ({
      ...prev,
      [name]: parseInt(value),
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.tickers.length === 0) {
      alert('Please select at least one ticker');
      return;
    }
    onSimulate(formData);
  };

  const handleForecast = (e) => {
    e.preventDefault();
    onForecast(formData, forecastParams.horizon_years, forecastParams.simulations);
  };

  return (
    <form className="simulation-form">
      <h2>Simulation Parameters</h2>

      {/* Search Bar */}
      <div className="form-section">
        <label className="form-label">
          <Search size={16} /> Search Tickers
        </label>
        <div className="search-container">
          <input
            type="text"
            placeholder="Search by ticker or name..."
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
        <label className="form-label">📊 Selected Indices</label>
        <div className="ticker-grid">
          {availableTickers.map((ticker) => (
            <label key={ticker} className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.tickers.includes(ticker)}
                onChange={() => handleTickerToggle(ticker)}
                disabled={loading}
              />
              <span>{ticker}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Date Range Section */}
      <div className="form-section">
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
      </div>

      {/* Forecast Parameters */}
      <div className="form-section">
        <h3>Monte Carlo Forecast</h3>
        <div className="form-group">
          <label className="form-label">Horizon (Years)</label>
          <input
            type="number"
            name="horizon_years"
            value={forecastParams.horizon_years}
            onChange={handleForecastChange}
            min="1"
            max="50"
            disabled={loading}
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Simulations</label>
          <input
            type="number"
            name="simulations"
            value={forecastParams.simulations}
            onChange={handleForecastChange}
            min="100"
            max="10000"
            step="100"
            disabled={loading}
            className="form-input"
          />
        </div>
      </div>

      {/* Buttons */}
      <div className="form-buttons">
        <button
          type="submit"
          onClick={handleSubmit}
          disabled={loading || formData.tickers.length === 0}
          className="btn btn-primary"
        >
          {loading ? 'Running...' : 'Run Backtest Simulation'}
        </button>
        <button
          type="button"
          onClick={handleForecast}
          disabled={loading || formData.tickers.length === 0}
          className="btn btn-secondary"
        >
          {loading ? 'Running...' : 'Generate Forecast'}
        </button>
      </div>
    </form>
  );
}

export default SimulationForm;
