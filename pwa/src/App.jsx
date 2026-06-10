import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Heart, BarChart3, Settings, LogOut, ChevronRight, Info, History } from 'lucide-react';
import { SmokingCalculator } from './utils/smokingCalculator';
import { Card, Button, Input, StaggeredItem } from './components/Common';
import { cn } from './utils/utils';

// --- MAIN APP COMPONENT ---
const App = () => {
  const [user, setUser] = useState(null); // Simple mock auth
  const [activeTab, setActiveTab] = useState('tracker');
  const [logs, setLogs] = useState([]);
  const [configs, setConfigs] = useState([
    { id: 'cigarettes', name: 'Cigarettes', limit: 20, type: 'CIGARETTE', pricePerUnit: 0.5, excludeFromEconomics: false }
  ]);

  // Use lastEntry for Health timer
  const [lastEntry, setLastEntry] = useState(Date.now() - 3600000);

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
    setLastEntry(Date.now());
  };

  if (!user) return <AuthScreen onLogin={() => setUser({ name: 'Shareef' })} />;

  return (
    <div className="flex flex-col min-h-screen bg-bg-base text-white font-inter selection:bg-accent/30 overflow-hidden">
      {/* Desktop Sidebar / Header */}
      <header className="fixed top-0 left-0 right-0 z-50 pt-[env(safe-area-inset-top)] px-8 py-6 bg-gradient-to-b from-black via-black/80 to-transparent flex justify-between items-center">
        <div className="flex flex-col">
          <h1 className="text-4xl font-[900] tracking-[-0.05em] uppercase leading-none">tabak++</h1>
          <span className="text-[10px] font-black tracking-[0.4em] text-accent mt-2 uppercase">
            {activeTab} Vault
          </span>
        </div>
        <div className="hidden md:flex space-x-2">
           <Button variant="secondary" className="h-10 rounded-full" onClick={() => setUser(null)}>
             <LogOut size={14} className="mr-2" /> Sign Out
           </Button>
        </div>
      </header>

      {/* Main Content Area - Responsive */}
      <main className="flex-1 overflow-y-auto pt-36 pb-40 px-6 max-w-4xl mx-auto w-full md:grid md:grid-cols-1 md:gap-8">
        <AnimatePresence mode="wait">
          {activeTab === 'tracker' && (
            <TrackerScreen key="tracker" metrics={metrics} configs={configs} todayLog={todayLog} onIncrement={handleIncrement} />
          )}
          {activeTab === 'health' && (
            <HealthScreen key="health" lastTimestamp={lastEntry} />
          )}
        </AnimatePresence>
      </main>

      {/* Navigation - Bottom bar on mobile, floating on desktop */}
      <nav className="fixed bottom-0 left-0 right-0 md:bottom-8 md:left-1/2 md:-translate-x-1/2 md:w-[500px] pb-[env(safe-area-inset-bottom)] bg-black/80 backdrop-blur-3xl border-t md:border border-white/5 md:rounded-[40px] rounded-t-[40px] z-50">
        <div className="flex justify-around items-center h-24 md:h-20 px-6">
          <TabItem id="tracker" Icon={LayoutDashboard} label="Vault" active={activeTab === 'tracker'} onClick={() => setActiveTab('tracker')} />
          <TabItem id="health" Icon={Heart} label="Health" active={activeTab === 'health'} onClick={() => setActiveTab('health')} />
          <TabItem id="history" Icon={BarChart3} label="History" active={activeTab === 'history'} onClick={() => setActiveTab('history')} />
          <TabItem id="settings" Icon={Settings} label="Control" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
        </div>
      </nav>
    </div>
  );
};

const TabItem = ({ Icon, label, active, onClick }) => (
  <motion.div
    onClick={onClick}
    whileTap={{ scale: 0.9 }}
    className="flex flex-col items-center justify-center flex-1 py-2 cursor-pointer relative"
  >
    <Icon size={20} className={cn("mb-1 transition-colors duration-300", active ? "text-accent" : "text-text-dim")} />
    <span className={cn("text-[9px] font-black tracking-widest uppercase transition-colors duration-300", active ? "text-white" : "text-text-dim")}>
      {label}
    </span>
    {active && (
      <motion.div layoutId="navDot" className="absolute -top-1 w-1 h-1 rounded-full bg-accent" />
    )}
  </motion.div>
);

const AuthScreen = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-12">
        <div className="flex flex-col items-center text-center">
           <div className="w-20 h-20 bg-accent rounded-[32px] flex items-center justify-center mb-8 shadow-[0_0_40px_rgba(212,255,92,0.2)]">
              <LayoutDashboard size={32} className="text-bg-base" />
           </div>
           <h1 className="text-5xl font-[900] tracking-tighter uppercase mb-2">tabak++</h1>
           <p className="text-text-muted font-bold tracking-widest text-[10px] uppercase">The Tracking Vault</p>
        </div>

        <Card className="space-y-6">
          <Input label="Vault ID" placeholder="email@address.com" value={email} onChange={setEmail} />
          <Input label="Security Phrase" type="password" placeholder="••••••••" value={pass} onChange={setPass} />
          <Button className="w-full h-16 text-sm" onClick={onLogin}>Access Vault</Button>
          <div className="flex justify-center pt-4">
             <button className="text-[10px] font-black text-text-dim uppercase tracking-[0.2em] hover:text-accent transition-colors">Create New Vault</button>
          </div>
        </Card>
      </div>
    </div>
  );
};

const TrackerScreen = ({ metrics, configs, todayLog, onIncrement }) => (
  <div className="flex flex-col space-y-12">
    {/* Global Performance Header */}
    <StaggeredItem index={0}>
      <Card className="flex flex-col space-y-8 bg-bg-panel/50 border-accent/10">
        <div className="flex justify-between items-end">
          <div>
            <span className="text-[10px] font-black text-text-dim uppercase tracking-widest">Global Remaining</span>
            <div className="text-4xl font-[900] leading-none mt-2">{Math.max(0, metrics.totalLimit - metrics.totalCount)}</div>
          </div>
          <div className="text-right">
             <span className="text-[10px] font-black text-accent uppercase tracking-widest">{metrics.rank}</span>
             <div className="text-2xl font-black text-text-muted leading-none mt-1">{metrics.xp} XP</div>
          </div>
        </div>
        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
           <motion.div
             initial={{ width: 0 }}
             animate={{ width: `${Math.min(1, metrics.progress) * 100}%` }}
             className="h-full bg-white shadow-[0_0_15px_rgba(255,255,255,0.3)]"
           />
        </div>
      </Card>
    </StaggeredItem>

    {/* Counter Grid */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {configs.map((config, index) => {
        const count = todayLog.counts[config.id] || 0;
        const progress = Math.min(1, count / config.limit);
        const isLimit = count >= config.limit;

        return (
          <StaggeredItem key={config.id} index={index + 1}>
            <Card className={cn("relative group overflow-hidden", isLimit && "border-danger/30 shadow-danger/5")}>
              <div className="flex justify-between items-start mb-8">
                <div className="flex flex-col">
                  <span className={cn("text-[10px] font-[900] tracking-[0.3em] uppercase", isLimit ? "text-danger" : "text-accent")}>{config.name}</span>
                  <span className="text-[9px] font-bold text-text-dim uppercase mt-1">Target: {config.limit}</span>
                </div>
                {isLimit && <Info size={14} className="text-danger animate-pulse" />}
              </div>

              {/* Progress Bar (Manual Draw logic) */}
              <div className="relative w-full h-6 bg-white/[0.03] rounded-full overflow-hidden border border-white/5 mb-12">
                 <motion.div
                    animate={{ x: `${progress * 100}%` }}
                    className={cn("absolute inset-0 transition-colors", isLimit ? "bg-danger/40" : "bg-white/80")}
                    style={{ right: 0 }}
                 />
                 {count > 0 && !isLimit && (
                   <motion.div
                     animate={{ x: `calc(${progress * 100}% - 12px)` }}
                     className="absolute top-0 bottom-0 w-3 bg-[#FF3D00] shadow-[0_0_20px_#FF3D00]"
                   />
                 )}
              </div>

              <motion.div
                key={count}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-7xl md:text-8xl font-[900] tracking-tighter text-center mb-10"
              >
                {count}
              </motion.div>

              <div className="flex justify-center">
                <Button
                   variant={isLimit ? "danger" : "secondary"}
                   className="w-24 h-24 rounded-full border-2"
                   onClick={() => onIncrement(config.id)}
                >
                  <span className="text-4xl">+</span>
                </Button>
              </div>
            </Card>
          </StaggeredItem>
        );
      })}
    </div>
  </div>
);

const HealthScreen = ({ lastTimestamp }) => {
  const milestones = useMemo(() => SmokingCalculator.calculateRecoveryMilestones(lastTimestamp), [lastTimestamp]);
  const timeSince = Math.floor((Date.now() - lastTimestamp) / 60000);

  return (
    <div className="flex flex-col space-y-8">
      <StaggeredItem index={0}>
        <Card className="bg-success/5 border-success/20">
          <div className="flex justify-between items-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-success/20 flex items-center justify-center">
              <Heart className="text-success" size={24} fill="currentColor" />
            </div>
            <div className="text-right">
              <span className="text-[9px] font-black text-text-dim uppercase tracking-widest">Last Entry</span>
              <div className="text-xl font-black text-success">{timeSince}M AGO</div>
            </div>
          </div>
          <h2 className="text-3xl font-[900] tracking-tight mb-2">Restoration Hub</h2>
          <p className="text-xs text-text-muted font-medium leading-relaxed max-w-sm">Biological markers are actively repairing. Each phase duration is based on clinical nonsmoker recovery timelines.</p>
        </Card>
      </StaggeredItem>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {milestones.map((m, i) => (
          <StaggeredItem key={m.title} index={i + 1}>
            <Card className="h-full flex flex-col">
              <div className="flex justify-between items-start mb-6">
                 <div>
                   <span className="text-[9px] font-black text-text-dim uppercase tracking-widest">{m.progress >= 1 ? 'Phase Complete' : 'Active Repair'}</span>
                   <h4 className="text-lg font-black tracking-tight mt-1">{m.title}</h4>
                 </div>
                 <div className="text-3xl font-black text-success tracking-tighter">{Math.floor(m.progress * 100)}%</div>
              </div>
              <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mb-6">
                 <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${m.progress * 100}%` }}
                    className="h-full bg-success"
                 />
              </div>
              <p className="text-xs text-text-muted font-medium leading-relaxed mb-6 flex-1">{m.desc}</p>
              <div className="pt-4 border-t border-white/5 flex justify-between items-center text-text-dim">
                 <div className="flex items-center space-x-2">
                    <History size={12} />
                    <span className="text-[9px] font-black uppercase tracking-widest">Log Audit</span>
                 </div>
                 <ChevronRight size={14} />
              </div>
            </Card>
          </StaggeredItem>
        ))}
      </div>
    </div>
  );
};

export default App;
