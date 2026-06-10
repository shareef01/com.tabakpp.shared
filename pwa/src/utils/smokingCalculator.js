export const SmokingCalculator = {
  getTotalCount: (log, configs) => {
    if (!log || !log.counts) return 0;
    return configs.reduce((sum, config) => sum + (log.counts[config.id] || 0), 0);
  },

  getTotalLimit: (configs) => {
    return Math.max(1, configs.reduce((sum, config) => sum + config.limit, 0));
  },

  calculateStreak: (logs, configs) => {
    if (!logs || logs.length === 0) return 0;
    const totalLimit = SmokingCalculator.getTotalLimit(configs);

    // Sort logs descending by date
    const sortedLogs = [...logs]
      .filter(l => Object.values(l.counts || {}).some(v => v > 0))
      .sort((a, b) => b.logDate.localeCompare(a.logDate));

    if (sortedLogs.length === 0) return 0;

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const yesterdayDate = new Date(now);
    yesterdayDate.setDate(now.getDate() - 1);
    const yesterday = yesterdayDate.toISOString().split('T')[0];

    const firstLogDate = sortedLogs[0].logDate;
    if (firstLogDate !== today && firstLogDate !== yesterday) return 0;

    let streak = 0;
    let expectedDate = new Date(firstLogDate);

    for (const log of sortedLogs) {
      const logDate = new Date(log.logDate);
      if (logDate.toISOString().split('T')[0] !== expectedDate.toISOString().split('T')[0]) break;

      const dayTotal = SmokingCalculator.getTotalCount(log, configs);
      if (dayTotal <= totalLimit) {
        streak++;
        expectedDate.setDate(expectedDate.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  },

  calculateSavings: (logs, configs, globalCost) => {
    let total = 0;
    logs.forEach(log => {
      Object.entries(log.counts || {}).forEach(([cid, count]) => {
        const config = configs.find(c => c.id === cid);
        if (config && !config.excludeFromEconomics) {
          const price = config.pricePerUnit > 0 ? config.pricePerUnit : globalCost;
          total += count * price;
        }
      });
    });
    return total;
  },

  calculateLifeLostMinutes: (logs) => {
    return logs.reduce((sum, log) => {
      const dayTotal = Object.values(log.counts || {}).reduce((a, b) => a + b, 0);
      return sum + (dayTotal * 11);
    }, 0);
  },

  getRank: (xp) => {
    if (xp < 100) return "Apprentice";
    if (xp < 500) return "Scout";
    if (xp < 1500) return "Veteran";
    if (xp < 5000) return "Master";
    return "Legend";
  },

  calculateXP: (logs, streak) => {
    const totalDays = logs.length;
    const totalLogs = logs.reduce((sum, log) => sum + Object.values(log.counts || {}).reduce((a, b) => a + b, 0), 0);
    return (totalDays * 10) + (streak * 15) + (totalLogs * 2);
  },

  calculateRecoveryMilestones: (lastLogTimestamp) => {
    const now = Date.now();
    const diffMinutes = (!lastLogTimestamp || lastLogTimestamp === 0)
      ? 24 * 60
      : Math.floor((now - lastLogTimestamp) / (1000 * 60));

    const safeDiffMinutes = Math.max(0, diffMinutes);

    const milestones = [
      { title: "Heart Rate Normalizes", duration: 20, desc: "Your heart rate and blood pressure begin to drop." },
      { title: "Carbon Monoxide Drops", duration: 12 * 60, desc: "CO levels in your blood drop to normal." },
      { title: "Lung Function Improvements", duration: 2 * 7 * 24 * 60, desc: "Circulation improves and lung function increases." },
      { title: "Respiratory Recovery", duration: 1 * 30 * 24 * 60, desc: "Cilia in the lungs start to function properly." },
      { title: "Cardiovascular Milestone", duration: 365 * 24 * 60, desc: "Excess risk of heart disease is halved." },
      { title: "Stroke Risk Normalization", duration: 5 * 365 * 24 * 60, desc: "Stroke risk is reduced to that of a nonsmoker." }
    ];

    return milestones.map(m => ({
      ...m,
      progress: Math.min(1, safeDiffMinutes / m.duration)
    }));
  }
};
