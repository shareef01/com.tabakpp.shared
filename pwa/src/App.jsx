import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SmokingCalculator } from './utils/smokingCalculator';

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
  const [configs] = useState([
    { id: 'cigarettes', name: 'Cigarettes', limit: 20, type: 'CIGARETTE', pricePerUnit: 0, excludeFromEconomics: false }
  ]);

  const lastEntryTimestamp = Date.now() - (3 * 60 * 60 * 1000);

  const today = new Date().toISOString().split('T')[0];
  const todayLog = logs.find(l => l.logDate === today) || { logDate: today, counts: {} };

  const metrics = useMemo(() => {
    const count = SmokingCalculator.getTotalCount(todayLog, configs);
    const limit = SmokingCalculator.getTotalLimit(configs);
    const streak = SmokingCalculator.calculateStreak(logs, configs);
    const xp = SmokingCalculator.calculateXP(logs, streak);
    return {
      totalCount: count,
      totalLimit: limit,
      streak,
      xp,
      rank: SmokingCalculator.getRank(xp),
      progress: count / limit
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
    <div className="flex flex-col min-h-screen select-none overflow-hidden font-['Inter']" style={{ backgroundColor: COLORS.bgBase }}>
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 pt-[env(safe-area-inset-top)] px-8 py-6 bg-gradient-to-b from-black via-black/80 to-transparent">
        <div className="flex flex-col">
          <h1 className="text-4xl font-[900] tracking-[-0.05em] text-white uppercase leading-none">tabak++</h1>
          <span className="text-[10px] font-black tracking-[0.4em] text-[#D4FF5C] mt-2 uppercase">
            {activeTab === 'tracker' ? 'Vault' : activeTab}
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pt-36 pb-32 px-6 max-w-lg mx-auto w-full">
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
      <nav className="fixed bottom-0 left-0 right-0 pb-[env(safe-area-inset-bottom)] bg-black/80 backdrop-blur-3xl border-t border-white/5 rounded-t-[40px] z-50">
        <div className="flex justify-around items-center h-24 px-6">
          <TabItem id="tracker" label="Vault" active={activeTab === 'tracker'} onClick={() => setActiveTab('tracker')} />
          <TabItem id="health" label="Health" active={activeTab === 'health'} onClick={() => setActiveTab('health')} />
          <TabItem id="history" label="History" active={activeTab === 'history'} onClick={() => setActiveTab('history')} />
          <TabItem id="settings" label="Control" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
        </div>
      </nav>
    </div>
  );
};

const TabItem = ({ label, active, onClick }) => (
  <motion.div
    onClick={onClick}
    whileTap={{ scale: 0.9 }}
    className="flex flex-col items-center justify-center flex-1 py-2 cursor-pointer relative"
  >
    {active && (
      <motion.div
        layoutId="activeTab"
        className="absolute -top-1 w-1.5 h-1.5 rounded-full bg-[#D4FF5C]"
      />
    )}
    <span className={`text-[10px] font-black tracking-[0.15em] uppercase transition-colors duration-300 ${active ? 'text-white' : 'text-neutral-600'}`}>
      {label}
    </span>
  </motion.div>
);

const TrackerScreen = ({ metrics, configs, todayLog, onIncrement }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    className="flex flex-col space-y-10"
  >
    {/* Global Header Metrics */}
    <div className="flex flex-col space-y-6">
       <div className="flex justify-between items-end w-full">
          <div className="flex flex-col">
            <span className="text-[10px] font-black tracking-widest text-neutral-500 uppercase">Remaining</span>
            <span className="text-2xl font-black text-white leading-none mt-1">{Math.max(0, metrics.totalLimit - metrics.totalCount)}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black tracking-widest text-[#D4FF5C] uppercase">{metrics.rank}</span>
            <span className="text-2xl font-black text-neutral-400 leading-none mt-1">{metrics.xp} XP</span>
          </div>
       </div>
       <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden border border-white/5">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(1, metrics.progress) * 100}%` }}
            className="h-full bg-white"
          />
       </div>
    </div>

    {/* Tracker Cards */}
    {configs.map((config, index) => {
      const count = todayLog.counts[config.id] || 0;
      const progress = Math.min(1, count / config.limit);
      const isOverLimit = count >= config.limit;

      return (
        <motion.div
          key={config.id}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1, transition: { delay: index * 0.1 } }}
          className="p-10 rounded-[42px] bg-[#121214] border border-white/5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col items-center relative overflow-hidden"
          style={{ borderColor: isOverLimit ? 'rgba(248,113,113,0.2)' : 'rgba(255,255,255,0.05)' }}
        >
          <span className="text-[11px] font-black tracking-[0.4em] text-[#D4FF5C] uppercase mb-1" style={{ color: isOverLimit ? COLORS.danger : COLORS.accent }}>
            {config.name}
          </span>
          <span className="text-[9px] font-bold tracking-[0.1em] text-neutral-600 uppercase mb-8">
            Daily Target: {config.limit}
          </span>

          {/* Burn Visual */}
          <div className="relative w-full h-4 bg-white/[0.03] rounded-full overflow-hidden border border-white/5 mb-12">
             <motion.div
                animate={{ x: `${progress * 100}%` }}
                className="absolute inset-0 bg-white"
                style={{ right: 0 }}
             />
             {count > 0 && !isOverLimit && (
               <motion.div
                 animate={{ x: `calc(${progress * 100}% - 8px)` }}
                 className="absolute top-0 bottom-0 w-4"
                 style={{
                    background: 'radial-gradient(circle, #FF3D00 0%, transparent 70%)',
                    filter: 'blur(4px)'
                 }}
               />
             )}
             {isOverLimit && <div className="absolute inset-0 bg-gradient-to-r from-red-500/50 to-red-600" />}
          </div>

          <motion.div
            key={count}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-8xl font-[900] tracking-[-0.05em] mb-12 text-white"
          >
            {count}
          </motion.div>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => onIncrement(config.id)}
            className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center border border-white/10"
          >
            <span className="text-4xl font-light text-white">+</span>
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
      className="flex flex-col space-y-8"
    >
      <div className="p-10 rounded-[42px] bg-[#121214] border border-white/5">
        <h2 className="text-[10px] font-black tracking-[0.3em] text-emerald-400 uppercase mb-2">Restoration Hub</h2>
        <h3 className="text-3xl font-black tracking-tight text-white leading-tight">Body Repair Center</h3>
      </div>

      <div className="grid gap-6">
        {milestones.map((m, i) => (
          <motion.div
            key={m.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0, transition: { delay: i * 0.05 } }}
            className="p-8 rounded-[32px] bg-[#121214] border border-white/5"
          >
            <div className="flex justify-between items-start mb-6">
              <div className="flex flex-col">
                <span className="text-[9px] font-black tracking-widest text-neutral-600 uppercase mb-1">{m.progress >= 1 ? 'COMPLETE' : 'REPAIRING'}</span>
                <span className="text-xl font-black text-white tracking-tight leading-none">{m.title}</span>
              </div>
              <span className="text-3xl font-black text-emerald-400 tracking-tighter">
                {Math.floor(m.progress * 100)}%
              </span>
            </div>

            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
               <motion.div
                 initial={{ width: 0 }}
                 animate={{ width: `${m.progress * 100}%` }}
                 className="h-full bg-emerald-400"
               />
            </div>

            <p className="text-[13px] text-neutral-500 font-medium leading-relaxed mt-6">
              {m.desc}
            </p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default App;
