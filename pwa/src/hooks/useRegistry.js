import { useState, useEffect, useCallback, useMemo } from 'react';
import { RegistryService } from '../services/registryService';
import { SmokingCalculator } from '../utils/smokingCalculator';

/**
 * useRegistry (The ViewModel)
 * Performance Optimized: Ensures all methods are stable references (useCallback)
 * and all derived data is memoized (useMemo).
 */
export const useRegistry = (user, today) => {
  const [configs, setConfigs] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const unsubConfigs = RegistryService.subscribeToConfigs(
      user.uid,
      (data) => {
        setConfigs(data.length > 0 ? data : [
          { id: 'cigarettes', name: 'Cigarettes', limit: 20, type: 'CIGARETTE', price: 0, order: 0 }
        ]);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    const unsubLogs = RegistryService.subscribeToLogs(
      user.uid,
      (data) => setLogs(data),
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => {
      unsubConfigs();
      unsubLogs();
    };
  }, [user]);

  const metrics = useMemo(() => {
    try {
      const tLog = logs.find(l => l.logDate === today) || { logDate: today, counts: {} };
      const c = SmokingCalculator.getTotalCount(tLog, configs);
      const l = SmokingCalculator.getTotalLimit(configs);
      const s = SmokingCalculator.calculateStreak(logs, configs);
      const x = SmokingCalculator.calculateXP(logs, s);
      return {
        count: c, limit: l, streak: s, xp: x,
        rank: SmokingCalculator.getRank(x),
        progress: l > 0 ? c / l : 0,
        savings: SmokingCalculator.calculateSavings(logs, configs, 0.5) || 0,
        lost: SmokingCalculator.calculateLifeLostMinutes(logs) || 0,
        todayLog: tLog
      };
    } catch (e) {
      return { count: 0, limit: 1, streak: 0, xp: 0, rank: '...', progress: 0, todayLog: { counts: {} } };
    }
  }, [logs, configs, today]);

  const increment = useCallback(async (id) => {
    if (!user) return;
    const counts = metrics.todayLog.counts || {};
    try {
      await RegistryService.updateDailyLog(user.uid, today, { ...counts, [id]: (counts[id] || 0) + 1 });
    } catch (err) { setError(err.message); }
  }, [user, today, metrics.todayLog.counts]);

  const decrement = useCallback(async (id) => {
    if (!user) return;
    const counts = metrics.todayLog.counts || {};
    if (!counts[id] || counts[id] <= 0) return;
    try {
      await RegistryService.updateDailyLog(user.uid, today, { ...counts, [id]: counts[id] - 1 });
    } catch (err) { setError(err.message); }
  }, [user, today, metrics.todayLog.counts]);

  const reorder = useCallback(async (id, dir) => {
    if (!user) return;
    const sorted = [...configs].sort((a,b) => a.order - b.order);
    const idx = sorted.findIndex(x => x.id === id);
    if ((dir === 'up' && idx === 0) || (dir === 'down' && idx === sorted.length - 1)) return;
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
    try {
      await RegistryService.reorderConfigs(user.uid, sorted[idx], sorted[swapIdx]);
    } catch (err) { setError(err.message); }
  }, [user, configs]);

  // STABLE ACTION HANDLERS
  const addProtocol = useCallback((data) => {
    if (!user) return;
    return RegistryService.addProtocol(user.uid, { ...data, order: configs.length });
  }, [user, configs.length]);

  const updateProtocol = useCallback((id, data) => {
    if (!user) return;
    return RegistryService.updateProtocol(user.uid, id, data);
  }, [user]);

  const deleteProtocol = useCallback((id) => {
    if (!user) return;
    return RegistryService.deleteProtocol(user.uid, id);
  }, [user]);

  const clearError = useCallback(() => setError(null), []);

  return {
    configs,
    logs,
    metrics,
    loading,
    error,
    increment,
    decrement,
    reorder,
    addProtocol,
    updateProtocol,
    deleteProtocol,
    clearError
  };
};
