// src/services/api.js
// Centralized API client for the backend

import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { Accept: 'application/json' },
});

// Response interceptor for unified error handling
client.interceptors.response.use(
  res => res.data,
  err => {
    const message = err.response?.data?.error || err.message || 'API request failed';
    return Promise.reject(new Error(message));
  }
);

export const api = {
  /** Get all sensors */
  getSensors: (params = {}) =>
    client.get('/sensors', { params }),

  /** Get all cities */
  getCities: (params = {}) =>
    client.get('/cities', { params }),

  /** Get city ranking */
  getRanking: (limit = 50) =>
    client.get('/cities/ranking', { params: { limit } }),

  /** Get a specific city */
  getCity: (name) =>
    client.get(`/cities/${encodeURIComponent(name)}`),

  /** Get pre-computed hourly ICAU-D history for a city */
  getCityHistory: (name, period = 'week') =>
    client.get(`/cities/${encodeURIComponent(name)}/history`, { params: { period } }),

  /** Calculate ICAU-D for a coordinate */
  getICAUD: (lat, lon) =>
    client.get('/icau', { params: { lat, lon } }),

  /** Get historical sensor averages */
  getSensorsHistory: (period = 'week') =>
    client.get('/sensors/history', { params: { period } }),

  /** Get active alerts (pollution spikes + stuck sensors) */
  getAlerts: () =>
    client.get('/alerts'),

  /** Health check */
  health: () =>
    client.get('/health'),
};
