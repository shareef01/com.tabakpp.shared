import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SmokingCalculator } from './utils/smokingCalculator';

// --- THEME TOKENS ---
const COLORS = {
  bgBase: '#020202',
  bgPanel: '#0D0D0E',
  bgCard: '#121214',
  accent: '#D4FF5C',
  textMain: '#FFFFFF',
  textMuted: '#AAAAA8',
  textDim: '#666664',
  danger: '#F87171',
  success: '#4ADE80'
};

const App = () => {
  const [activeTab, setActiveTab] = useState('tracker');
  const [logs, setLogs] = useState([]);
  const [configs, setConfigs] = useState([
    { id: 'cigarettes', name: 'Cigarettes', limit: 20, type: 'CIGARETTE', pricePerUnit: 0, excludeFromEconomics: false }
  ]);
  const [userGoal, setUserGoal] = useState("SAVE FOR VACATION");
  const [xp, setXp] = useState(1250);

  // Mock last entry for restoration
  const lastEntryTimestamp = Date.now() - (3 * 60 * 60 * 1000); // 3 hours ago

  const today = new Date().toISOString().split('T')[0];
  const todayLog = logs.find(l => l.logDate === today) || { logDate: today, counts: {} };

  const metrics = useMemo(() => {
    const count = SmokingCalculator.getTotalCount(todayLog, configs);
    const limit = SmokingCalculator.getTotalLimit(configs);
    const streak = SmokingCalculator.calculateStreak(logs, configs);
    const currentXp = SmokingCalculator.calculateXP(logs, streak);
    return {
      totalCount: count,
      totalLimit: limit,
      streak,
      xp: currentXp,
      rank: SmokingCalculator.getRank(currentXp),
      progress: Math.min(1, count / limit)
    };
  }, [logs, configs, todayLog]);

  const handleIncrement = (cid) => {
    const updatedLogs = [...logs];
    const logIdx = updatedLogs.findIndex(l => l.logDate === today);
    if (logIdx >= 0) {
      updatedLogs[logIdx].counts[cid] = (updatedLogs[logIdx].counts[cid] || 0) + 1;
    } else {
      updatedLogs.push({ logDate: today, counts: { [cid]: 1 } });
    }
    setLogs(updatedLogs);
  };

  return (
    <div className="flex flex-col min-h-screen select-none overflow-hidden" style={{ backgroundColor: COLORS.bgBase }}>
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 pt-[safe-top] px-6 py-4 bg-gradient-to-b from-black via-black/90 to-transparent">
        <div className="flex flex-col">
          <h1 className="text-3xl font-black tracking-tighter text-white uppercase leading-none">tabak++</h1>
          <span className="text-[10px] font-black tracking-[0.3em] text-[var(--accent)] mt-1 uppercase" style={{ color: COLORS.accent }}>
            {activeTab}
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pt-32 pb-32 px-6">
        <AnimatePresence mode="wait">
          {activeTab === 'tracker' && (
            <TrackerScreen key="tracker" metrics={metrics} configs={configs} todayLog={todayLog} onIncrement={handleIncrement} />
          )}
          {activeTab === 'health' && (
            <HealthScreen key="health" lastTimestamp={lastEntryTimestamp} />
          )}
        </AnimatePresence>
      </main>

      {/* Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 pb-[safe-bottom] bg-black/80 backdrop-blur-xl border-t border-white/5 rounded-t-[32px] z-50">
        <div className="flex justify-around items-center h-20 px-4">
          <TabItem id="tracker" icon="Dashboard" label="Vault" active={activeTab === 'tracker'} onClick={() => setActiveTab('tracker')} />
          <TabItem id="health" icon="Favorite" label="Health" active={activeTab === 'health'} onClick={() => setActiveTab('health')} />
          <TabItem id="history" icon="Storage" label="History" active={activeTab === 'history'} onClick={() => setActiveTab('history')} />
          <TabItem id="settings" icon="Settings" label="Control" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
        </div>
      </nav>
    </div>
  );
};

const TabItem = ({ id, label, active, onClick }) => (
  <motion.div
    onClick={onClick}
    whileTap={{ scale: 0.9 }}
    className="flex flex-col items-center justify-center flex-1 py-2 cursor-pointer"
  >
    <div className={`w-1 h-1 rounded-full mb-1 transition-all ${active ? 'bg-[var(--accent)]' : 'bg-transparent'}`} style={{ backgroundColor: active ? COLORS.accent : 'transparent' }} />
    <span className={`text-[11px] font-bold tracking-widest uppercase ${active ? 'text-white' : 'text-neutral-500'}`}>
      {label}
    </span>
  </motion.div>
);

const TrackerScreen = ({ metrics, configs, todayLog, onIncrement }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    className="flex flex-col space-y-8"
  >
    {/* Global Progress Header */}
    <div className="flex flex-col items-center space-y-4 py-4">
       <div className="w-full h-3 rounded-full bg-white/5 overflow-hidden border border-white/5">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${metrics.progress * 100}%` }}
            className="h-full bg-white"
          />
       </div>
       <div className="flex justify-between w-full text-[10px] font-black tracking-widest text-neutral-500">
          <span>REMAINING: {metrics.totalLimit - metrics.totalCount}</span>
          <span style={{ color: COLORS.accent }}>{metrics.rank.toUpperCase()}</span>
       </div>
    </div>

    {/* Tracker Cards */}
    {configs.map((config, index) => {
      const count = todayLog.counts[config.id] || 0;
      const progress = Math.min(1, count / config.limit);

      return (
        <motion.div
          key={config.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0, transition: { delay: index * 0.1 } }}
          className="p-8 rounded-[32px] bg-[#121214] border border-white/5 shadow-2xl flex flex-col items-center"
          style={{ backgroundColor: COLORS.bgCard }}
        >
          <span className="text-[12px] font-black tracking-[0.3em] text-[var(--accent)] uppercase mb-2" style={{ color: COLORS.accent }}>
            {config.name}
          </span>

          <div className="relative w-full h-8 bg-white/5 rounded-full mt-8 overflow-hidden border border-white/5">
             <motion.div
                animate={{ x: `${progress * 100}%` }}
                className="absolute inset-0 bg-neutral-200"
                style={{ right: 0 }}
             />
             {/* Ember */}
             {count > 0 && (
               <motion.div
                 animate={{ x: `calc(${progress * 100}% - 4px)` }}
                 className="absolute top-0 bottom-0 w-2 shadow-[0_0_15px_rgba(255,61,0,0.8)]"
                 style={{ backgroundColor: '#FF3D00' }}
               />
             )}
          </div>

          <div className="text-7xl font-black tracking-tighter my-8 text-white">
            {count}
          </div>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => onIncrement(config.id)}
            className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center border border-white/10"
          >
            <span className="text-3xl font-black text-white">+</span>
          </motion.button>
        </motion.div>
      );
    })}
  </motion.div>
);

const HealthScreen = ({ lastTimestamp }) => {
  const milestones = useMemo(() => SmokingCalculator.calculateRecoveryMilestones(lastTimestamp), [lastTimestamp]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col space-y-6"
    >
      <div className="p-8 rounded-[32px] bg-[#121214] border border-white/5">
        <h2 className="text-xs font-black tracking-[0.2em] text-emerald-400 uppercase mb-1">Vitality Restoration</h2>
        <h3 className="text-2xl font-black tracking-tight text-white leading-tight">Body Repair Center</h3>
      </div>

      {milestones.map((m, i) => (
        <motion.div
          key={m.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0, transition: { delay: i * 0.1 } }}
          className="p-6 rounded-[32px] bg-[#121214] border border-white/5"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="flex flex-col">
              <span className="text-[10px] font-black tracking-widest text-neutral-500 uppercase">{m.progress >= 1 ? 'COMPLETE' : 'IN PROGRESS'}</span>
              <span className="text-lg font-black text-white">{m.title}</span>
            </div>
            <span className="text-3xl font-black text-emerald-400 tracking-tighter">
              {Math.floor(m.progress * 100)}%
            </span>
          </div>

          <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden">
             <motion.div
               initial={{ width: 0 }}
               animate={{ width: `${m.progress * 100}%` }}
               className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400"
             />
          </div>

          <p className="text-[13px] text-neutral-400 font-medium leading-relaxed mt-4">
            {m.desc}
          </p>
        </motion.div>
      ))}
    </motion.div>
  );
};

export default App;
