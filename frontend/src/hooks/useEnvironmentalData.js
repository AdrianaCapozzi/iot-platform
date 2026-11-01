// src/hooks/useEnvironmentalData.js
// React Query hooks for all API endpoints

import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api.js';

const STALE_TIME = 55 * 60 * 1000; // 55 min — just under the 1h backend cache TTL

// Backoff exponencial enquanto o backend está esquentando (cache vazio):
// 30s → 60s → 120s → 240s → fica em 240s.
// Quando os dados chegam, o polling para (return false).
function warmupBackoff(failureCount) {
  const delays = [30_000, 60_000, 120_000, 240_000];
  return delays[Math.min(failureCount, delays.length - 1)];
}

export function useSensors(params = {}) {
  return useQuery({
    queryKey: ['sensors', params],
    queryFn:  () => api.getSensors(params),
    staleTime: STALE_TIME,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data || data.count === 0) return warmupBackoff(query.state.fetchFailureCount || query.state.dataUpdateCount);
      return false;
    },
    select: res => res.data,
  });
}

export function useCities(params = {}) {
  return useQuery({
    queryKey: ['cities', params],
    queryFn:  () => api.getCities(params),
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data || data.count === 0) return warmupBackoff(query.state.fetchFailureCount || query.state.dataUpdateCount);
      return false;
    },
    staleTime: STALE_TIME,
    select: res => res.data,
  });
}

export function useRanking(limit = 50) {
  return useQuery({
    queryKey: ['ranking', limit],
    queryFn:  () => api.getRanking(limit),
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data || data.loading === true || data.count === 0) return warmupBackoff(query.state.fetchFailureCount || query.state.dataUpdateCount);
      return false;
    },
    staleTime: STALE_TIME,
    select: res => res,
  });
}

export function useCity(name) {
  return useQuery({
    queryKey: ['city', name],
    queryFn:  () => api.getCity(name),
    staleTime: STALE_TIME,
    enabled: Boolean(name),
    select: res => res.data,
  });
}

export function useSensorsHistory(period) {
  return useQuery({
    queryKey: ['sensors-history', period],
    queryFn:  () => api.getSensorsHistory(period),
    staleTime: STALE_TIME,
    // Always fetch history — used as fallback when live is empty
    enabled: period === 'week' || period === 'month',
    select: res => res.data,
  });
}

/**
 * Historical fallback: 7-day history from MongoDB. Usado quando os dados ao
 * vivo ainda não chegaram. Aceita um `enabled` controlado pelo chamador para
 * evitar fetch redundante quando o live já está disponível.
 */
export function useSensorsHistoryFallback({ enabled = true } = {}) {
  return useQuery({
    queryKey: ['sensors-history-fallback'],
    queryFn:  () => api.getSensorsHistory('week'),
    staleTime: STALE_TIME,
    enabled,
    select: res => res.data ?? [],
  });
}

export function useCityHistory(name, period = 'week') {
  return useQuery({
    queryKey: ['city-history', name, period],
    queryFn:  () => api.getCityHistory(name, period),
    staleTime: STALE_TIME,
    enabled: Boolean(name),
    select: res => res.data ?? [],
  });
}

export function useAlerts() {
  return useQuery({
    queryKey: ['alerts'],
    queryFn:  () => api.getAlerts(),
    staleTime: 5 * 60 * 1000, // 5 min — alertas devem ficar razoavelmente frescos
    refetchInterval: 5 * 60 * 1000,
    select: res => res.data ?? [],
  });
}

export function useICAUD(lat, lon) {
  return useQuery({
    queryKey: ['icaud', lat, lon],
    queryFn:  () => api.getICAUD(lat, lon),
    staleTime: STALE_TIME,
    enabled: lat !== null && lon !== null,
    select: res => res.data,
  });
}
