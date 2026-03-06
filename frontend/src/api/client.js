import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000,
});

export const simulatorAPI = {
  simulate: (params) => api.post('/simulate', params),
  forecast: (params, horizonYears = 10, simulations = 1000) =>
    api.post('/forecast', params, {
      params: { horizon_years: horizonYears, simulations },
    }),
  getTickers: () => api.get('/tickers'),
  searchTickers: (query) => api.get('/search', { params: { q: query } }),
  getCPIData: (currency, startDate, endDate) =>
    api.get('/cpi', { params: { currency, start_date: startDate, end_date: endDate } }),
  getFXData: (startDate, endDate) =>
    api.get('/fx', { params: { start_date: startDate, end_date: endDate } }),
};

export default api;
