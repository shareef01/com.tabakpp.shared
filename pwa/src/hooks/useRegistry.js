import { useState, useEffect, useCallback, useMemo } from 'react';
import { RegistryService } from '../services/registryService';
import { SmokingCalculator } from '../utils/smokingCalculator';

/**
 * useRegistry (The ViewModel)
 * Handles React state, side effects, and calculator logic.
 */
export const useRegistry = (user, today) => {
  const [configs, setConfigs] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) return;

    const unsubConfigs = RegistryService.subscribeToConfigs(
      user.uid,
      (data) => {
        setConfigs(data.length > 0 ? data : [
          { id: 'cigarettes', name: 'Cigarettes', limit: 20, type: 'CIGARETTE', price: 0, order: 0 }
        ]);
        setLoading(false);
      },
      (err) => setError(err.message)
    );

    const unsubLogs = RegistryService.subscribeToLogs(
      user.uid,
      (data) => setLogs(data),
      (err) => setError(err.message)
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

  return {
    configs,
    logs,
    metrics,
    loading,
    error,
    increment,
    decrement,
    reorder,
    addProtocol: (data) => RegistryService.addProtocol(user.uid, { ...data, order: configs.length }),
    updateProtocol: (id, data) => RegistryService.updateProtocol(user.uid, id, data),
    deleteProtocol: (id) => RegistryService.deleteProtocol(user.uid, id),
    clearError: () => setError(null)
  };
};
