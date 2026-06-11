import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Heart, BarChart3, Settings, LogOut,
  ChevronRight, Info, History, Plus, Minus, Edit2, Trash2,
  TrendingUp, Wallet, Activity, Calendar, Clock, ArrowUp, ArrowDown, X,
  Save, AlertCircle, RefreshCcw, Camera, Target, Layout, Type, DollarSign,
  Moon, Check, GripVertical, CheckCircle2
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { SmokingCalculator } from './utils/smokingCalculator';
import { Card, Button, Input, StaggeredItem } from './components/Common';
import { cn } from './utils/utils';

// --- THEME CONSTANTS ---
const ACCENT_COLORS = [
  { name: 'Default', value: '#D4FF5C' },
  { name: 'Emerald', value: '#4ADE80' },
  { name: 'Red', value: '#F87171' },
  { name: 'Orange', value: '#FB923C' },
  { name: 'Violet', value: '#A78BFA' },
  { name: 'Pink', value: '#F472B6' }
];

// --- MAIN APP COMPONENT ---
const App = () => {
  const [user, setUser] = useState({
    name: 'Shareef',
    goal: 'SAVE FOR VACATION',
    profileImage: null
  });

  const [activeTab, setActiveTab] = useState('tracker');
  const [logs, setLogs] = useState([
    { logDate: '2026-06-08', counts: { cigarettes: 12 } },
    { logDate: '2026-06-09', counts: { cigarettes: 15 } },
    { logDate: '2026-06-10', counts: { cigarettes: 22 } },
  ]);

  const [configs, setConfigs] = useState([
    { id: 'cigarettes', name: 'Cigarettes', limit: 20, type: 'CIGARETTE', pricePerUnit: 0.5, excludeFromEconomics: false, displayOrder: 0 }
  ]);

  // Settings State
  const [accentColor, setAccentColor] = useState('#D4FF5C');
  const [isDark, setIsDark] = useState(true);
  const [dashboardLayout, setDashboardLayout] = useState('LARGE'); // 'LARGE' or 'COMPACT'
  const [fontScale, setFontScale] = useState(1);
  const [isManualReset, setIsManualReset] = useState(false);
  const [globalPrice, setGlobalPrice] = useState('0.5');

  const [lastEntry, setLastEntry] = useState(Date.now() - 3600000 * 4);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editLogTarget, setEditLogTarget] = useState(null);

  const today = new Date().toISOString().split('T')[0];
  const todayLog = logs.find(l => l.logDate === today) || { logDate: today, counts: {} };

  const metrics = useMemo(() => {
    const count = SmokingCalculator.getTotalCount(todayLog, configs);
    const limit = SmokingCalculator.getTotalLimit(configs);
    const streak = SmokingCalculator.calculateStreak(logs, configs);
    const xp = SmokingCalculator.calculateXP(logs, streak);
    const savings = SmokingCalculator.calculateSavings(logs, configs, parseFloat(globalPrice) || 0);
    const lifeLost = SmokingCalculator.calculateLifeLostMinutes(logs);

    return {
      totalCount: count,
      totalLimit: limit,
      streak,
      xp,
      rank: SmokingCalculator.getRank(xp),
      progress: count / limit,
      totalSavings: savings,
      lifeLostMinutes: lifeLost,
      coachMessage: generateCoachMessage(count, limit, streak)
    };
  }, [logs, configs, todayLog, globalPrice]);

  function generateCoachMessage(count, limit, streak) {
    const progress = limit > 0 ? count / limit : 0;
    if (count === 0 && streak > 0) return `Perfect start! You're on a ${streak}-day streak.`;
    if (progress > 1.0) return "You've hit your limit for today. Time for a breather.";
    if (progress > 0.8) return "Nearing your limit. You've come so far, keep going.";
    return "Tracking is the first step to progress.";
  }

  const handleIncrement = (cid) => {
    const updatedLogs = [...logs];
    let logIdx = updatedLogs.findIndex(l => l.logDate === today);
    if (logIdx >= 0) {
      updatedLogs[logIdx].counts[cid] = (updatedLogs[logIdx].counts[cid] || 0) + 1;
    } else {
      updatedLogs.push({ logDate: today, counts: { [cid]: 1 } });
    }
    setLogs(updatedLogs);
    setLastEntry(Date.now());
  };

  const handleDecrement = (cid) => {
    const updatedLogs = [...logs];
    const logIdx = updatedLogs.findIndex(l => l.logDate === today);
    if (logIdx >= 0 && (updatedLogs[logIdx].counts[cid] || 0) > 0) {
      updatedLogs[logIdx].counts[cid] -= 1;
      setLogs(updatedLogs);
    }
  };

  const handleSaveLogEdit = (date, newCounts) => {
    const updatedLogs = logs.map(l => l.logDate === date ? { ...l, counts: newCounts } : l);
    setLogs(updatedLogs);
    setEditLogTarget(null);
  };

  const handleAddTracker = (name, limit, type) => {
    const newConfig = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      limit: parseInt(limit) || 20,
      type,
      pricePerUnit: 0,
      excludeFromEconomics: false,
      displayOrder: configs.length
    };
    setConfigs([...configs, newConfig]);
    setShowAddModal(false);
  };

  const handleReorder = (id, direction) => {
    const idx = configs.findIndex(c => c.id === id);
    if (direction === 'up' && idx > 0) {
      const newConfigs = [...configs];
      [newConfigs[idx-1], newConfigs[idx]] = [newConfigs[idx], newConfigs[idx-1]];
      setConfigs(newConfigs.map((c, i) => ({ ...c, displayOrder: i })));
    } else if (direction === 'down' && idx < configs.length - 1) {
      const newConfigs = [...configs];
      [newConfigs[idx], newConfigs[idx+1]] = [newConfigs[idx+1], newConfigs[idx]];
      setConfigs(newConfigs.map((c, i) => ({ ...c, displayOrder: i })));
    }
  };

  if (!user.name) return <AuthScreen onLogin={() => setUser({ ...user, name: 'Shareef' })} />;

  return (
    <div
      className={cn(
        "flex flex-col min-h-screen bg-bg-base text-white font-inter selection:bg-accent/30 overflow-hidden transition-all duration-700",
        !isDark && "invert-[0.9] hue-rotate-180"
      )}
      style={{ '--accent': accentColor, fontSize: `${fontScale}rem` }}
    >
      <header className="fixed top-0 left-0 right-0 z-40 pt-[env(safe-area-inset-top)] px-8 py-6 bg-gradient-to-b from-black via-black/90 to-transparent flex justify-between items-center">
        <div className="flex flex-col">
          <h1 className="text-4xl font-[900] tracking-[-0.05em] uppercase leading-none">tabak++</h1>
          <span className="text-[10px] font-black tracking-[0.4em] text-accent mt-2 uppercase">
            {activeTab === 'tracker' ? 'Vault' : activeTab}
          </span>
        </div>
        <div className="flex items-center space-x-4">
           {user.profileImage ? (
             <img src={user.profileImage} className="w-10 h-10 rounded-full border border-accent/20" alt="profile" />
           ) : (
             <div className="w-10 h-10 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent font-black text-xs">
                {user.name.charAt(0)}
             </div>
           )}
           <Button variant="secondary" className="h-10 rounded-full text-[10px] hidden md:flex" onClick={() => setUser({ ...user, name: '' })}>
             <LogOut size={12} className="mr-2" /> DISCONNECT
           </Button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pt-36 pb-40 px-6 max-w-6xl mx-auto w-full transition-all duration-500">
        <AnimatePresence mode="wait">
          {activeTab === 'tracker' && (
            <TrackerScreen
              key="tracker"
              metrics={metrics}
              configs={configs}
              todayLog={todayLog}
              onIncrement={handleIncrement}
              onDecrement={handleDecrement}
              onAddClick={() => setShowAddModal(true)}
              layout={dashboardLayout}
            />
          )}
          {activeTab === 'health' && (
            <HealthScreen key="health" lastTimestamp={lastEntry} />
          )}
          {activeTab === 'history' && (
            <HistoryScreen key="history" logs={logs} configs={configs} todayString={today} onEditLog={setEditLogTarget} metrics={metrics} />
          )}
          {activeTab === 'settings' && (
            <SettingsScreen
              key="settings"
              configs={configs}
              setConfigs={setConfigs}
              user={user}
              setUser={setUser}
              onAddClick={() => setShowAddModal(true)}
              accentColor={accentColor}
              setAccentColor={setAccentColor}
              isDark={isDark}
              setIsDark={setIsDark}
              dashboardLayout={dashboardLayout}
              setDashboardLayout={setDashboardLayout}
              fontScale={fontScale}
              setFontScale={setFontScale}
              isManualReset={isManualReset}
              setIsManualReset={setIsManualReset}
              globalPrice={globalPrice}
              setGlobalPrice={setGlobalPrice}
              onReorder={handleReorder}
            />
          )}
        </AnimatePresence>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 md:bottom-8 md:left-1/2 md:-translate-x-1/2 md:w-[650px] pb-[env(safe-area-inset-bottom)] bg-black/80 backdrop-blur-3xl border-t md:border border-white/5 md:rounded-[40px] rounded-t-[40px] z-40 transition-all duration-500">
        <div className="flex justify-around items-center h-24 md:h-22 px-6">
          <TabItem id="tracker" Icon={LayoutDashboard} label="Vault" active={activeTab === 'tracker'} onClick={() => setActiveTab('tracker')} />
          <TabItem id="health" Icon={Heart} label="Health" active={activeTab === 'health'} onClick={() => setActiveTab('health')} />
          <TabItem id="history" Icon={BarChart3} label="History" active={activeTab === 'history'} onClick={() => setActiveTab('history')} />
          <TabItem id="settings" Icon={Settings} label="Control" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
        </div>
      </nav>

      {/* Modals Overlay */}
      <AnimatePresence>
        {showAddModal && (
          <Modal onClose={() => setShowAddModal(false)} title="Initialize Tracker">
            <AddTrackerForm onAdd={handleAddTracker} />
          </Modal>
        )}
        {editLogTarget && (
          <Modal onClose={() => setEditLogTarget(null)} title="Correct Data">
            <EditLogForm log={editLogTarget} configs={configs} onSave={handleSaveLogEdit} />
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- CORE COMPONENTS ---

const Modal = ({ children, onClose, title }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl">
    <motion.div initial={{ y: 50, scale: 0.95, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: 50, scale: 0.95, opacity: 0 }} className="w-full max-w-sm">
      <Card className="space-y-8 relative border-accent/30 shadow-[0_0_80px_rgba(var(--accent-rgb),0.15)] bg-bg-panel/95">
        <button onClick={onClose} className="absolute top-8 right-8 p-3 rounded-2xl bg-white/5 text-text-dim hover:text-white transition-all"><X size={20} /></button>
        <div className="flex items-center space-x-3 text-accent">
           <Activity size={24} />
           <h3 className="text-2xl font-[900] tracking-tighter uppercase">{title}</h3>
        </div>
        {children}
      </Card>
    </motion.div>
  </div>
);

const AddTrackerForm = ({ onAdd }) => {
  const [name, setName] = useState('');
  const [limit, setLimit] = useState('20');
  const [type, setType] = useState('CIGARETTE');

  return (
    <div className="space-y-8">
      <Input label="Protocol Label" value={name} onChange={setName} placeholder="e.g. Zyn Pouch" />
      <Input label="Operational Limit" value={limit} onChange={setLimit} type="number" />

      <div className="space-y-3">
         <span className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">Visual Archetype</span>
         <div className="grid grid-cols-2 gap-3">
            {['CIGARETTE', 'SIMPLE', 'JOINT_KING', 'JOINT_QUEEN'].map(t => (
               <button
                 key={t}
                 onClick={() => setType(t)}
                 className={cn(
                    "h-12 rounded-xl border font-black text-[9px] uppercase tracking-widest transition-all",
                    type === t ? "bg-accent text-bg-base border-accent shadow-[0_0_15px_rgba(212,255,92,0.4)]" : "bg-white/5 border-white/5 text-text-dim hover:border-white/10"
                 )}
               >
                 {t.replace('_', ' ')}
               </button>
            ))}
         </div>
      </div>

      <Button className="w-full h-18 text-xs font-[900]" onClick={() => onAdd(name, limit, type)}>Deploy Counter</Button>
    </div>
  );
};

const EditLogForm = ({ log, configs, onSave }) => {
  const [counts, setCounts] = useState({ ...log.counts });
  return (
    <div className="space-y-8">
      <div className="flex items-center space-x-3 p-4 bg-white/5 rounded-2xl border border-white/5">
         <Calendar size={16} className="text-accent" />
         <span className="text-xs font-black text-text-muted uppercase tracking-widest">{new Date(log.logDate).toLocaleDateString(undefined, { dateStyle: 'full' })}</span>
      </div>
      <div className="max-h-[300px] overflow-y-auto pr-2 space-y-6">
        {configs.map(c => (
          <div key={c.id} className="space-y-2">
             <Input
               label={c.name}
               value={counts[c.id] || 0}
               type="number"
               onChange={(v) => setCounts({ ...counts, [c.id]: parseInt(v) || 0 })}
             />
          </div>
        ))}
      </div>
      <Button className="w-full h-16 shadow-xl" onClick={() => onSave(log.logDate, counts)}>
        <Save size={18} className="mr-3" /> Execute Override
      </Button>
    </div>
  );
};

const TabItem = ({ Icon, label, active, onClick }) => (
  <motion.div onClick={onClick} whileTap={{ scale: 0.85 }} className="flex flex-col items-center justify-center flex-1 py-2 cursor-pointer relative group transition-all duration-300">
    <Icon size={22} className={cn("mb-1.5 transition-all duration-500", active ? "text-accent scale-110 drop-shadow-[0_0_8px_#D4FF5C]" : "text-text-dim group-hover:text-text-muted")} />
    <span className={cn("text-[9px] font-black tracking-widest uppercase transition-colors duration-300", active ? "text-white" : "text-text-dim")}>
      {label}
    </span>
    {active && <motion.div layoutId="navDot" className="absolute -top-1 w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_15px_#D4FF5C]" />}
  </motion.div>
);

const AuthScreen = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center p-6 font-inter">
      <div className="w-full max-w-md space-y-16">
        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex flex-col items-center text-center">
           <div className="w-24 h-24 bg-accent rounded-[36px] flex items-center justify-center mb-10 shadow-[0_0_60px_rgba(212,255,92,0.3)] relative overflow-hidden group">
              <LayoutDashboard size={40} className="text-bg-base relative z-10 group-hover:rotate-12 transition-transform duration-500" />
              <div className="absolute inset-0 bg-white/30 translate-y-full group-hover:translate-y-0 transition-transform duration-700 ease-in-out" />
           </div>
           <h1 className="text-6xl font-[950] tracking-[-0.08em] uppercase mb-3 bg-gradient-to-b from-white via-white to-white/40 bg-clip-text text-transparent">tabak++</h1>
           <div className="flex items-center space-x-4">
              <div className="h-px w-8 bg-accent/40" />
              <p className="text-accent font-black tracking-[0.6em] text-[10px] uppercase">The Vault</p>
              <div className="h-px w-8 bg-accent/40" />
           </div>
        </motion.div>
        <StaggeredItem index={1}>
           <Card className="space-y-8 p-10 bg-bg-panel/50 border-white/5 backdrop-blur-sm">
             <Input label="Access Protocol" placeholder="ID.VAULT_CORE" value={email} onChange={setEmail} />
             <Input label="Encryption Phrase" type="password" placeholder="••••••••" value={pass} onChange={setPass} />
             <Button className="w-full h-18 text-sm font-black shadow-2xl" onClick={onLogin}>Initialize Access</Button>
           </Card>
        </StaggeredItem>
      </div>
    </div>
  );
};

const TrackerScreen = ({ metrics, configs, todayLog, onIncrement, onDecrement, onAddClick, layout }) => (
  <div className="flex flex-col space-y-12 pb-10">
    {/* Global Performance Header */}
    <StaggeredItem index={0}>
      <Card className="flex flex-col space-y-10 bg-bg-panel/50 border-accent/10 relative overflow-hidden p-10">
        <div className="flex justify-between items-end relative z-10">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-text-dim uppercase tracking-[0.3em]">Total Remaining Units</span>
            <div className="text-6xl font-[950] tracking-tighter leading-none">{Math.max(0, metrics.totalLimit - metrics.totalCount)}</div>
          </div>
          <div className="text-right">
             <div className="px-3 py-1 bg-accent/10 rounded-lg inline-flex items-center mb-2 border border-accent/20">
                <TrendingUp size={10} className="mr-2 text-accent" />
                <span className="text-[10px] font-black text-accent uppercase tracking-widest">{metrics.rank}</span>
             </div>
             <div className="text-3xl font-[950] text-text-muted tracking-tighter leading-none">{metrics.xp} <span className="text-[10px] font-black tracking-widest uppercase">XP</span></div>
          </div>
        </div>

        <div className="space-y-4 relative z-10">
           <div className="flex justify-between items-center">
              <span className="text-[10px] font-black text-accent uppercase tracking-[0.4em]">Vitality Progress</span>
              <span className="text-[10px] font-black text-text-muted">{Math.round(metrics.progress * 100)}%</span>
           </div>
           <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5">
              <motion.div
                 initial={{ width: 0 }}
                 animate={{ width: `${Math.min(1, metrics.progress) * 100}%` }}
                 className={cn("h-full rounded-full transition-colors duration-1000", metrics.progress >= 1 ? "bg-danger shadow-[0_0_30px_rgba(248,113,113,0.6)]" : "bg-gradient-to-r from-accent to-white shadow-[0_0_20px_rgba(212,255,92,0.4)]")}
              />
           </div>
        </div>

        <div className="p-6 bg-white/[0.02] rounded-3xl border border-white/5 flex items-start space-x-4 relative z-10">
           <div className="p-3 bg-accent/10 rounded-2xl"><Info size={18} className="text-accent" /></div>
           <p className="text-sm font-bold text-text-muted leading-relaxed italic">"{metrics.coachMessage}"</p>
        </div>

        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-accent/5 rounded-full blur-[100px]" />
      </Card>
    </StaggeredItem>

    {/* Counter Grid - Matrix Support */}
    <div className={cn("grid gap-8", layout === 'COMPACT' ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-1 lg:grid-cols-2")}>
      {configs.sort((a, b) => a.displayOrder - b.displayOrder).map((config, index) => (
        <StaggeredItem key={config.id} index={index + 1}>
          <CounterCard config={config} count={todayLog.counts[config.id] || 0} onIncrement={onIncrement} onDecrement={onDecrement} isCompact={layout === 'COMPACT'} />
        </StaggeredItem>
      ))}
      <StaggeredItem index={configs.length + 1}>
         <button onClick={onAddClick} className={cn("w-full h-full border-2 border-dashed border-white/5 rounded-[48px] flex flex-col items-center justify-center space-y-6 hover:bg-white/[0.02] hover:border-accent/20 transition-all group relative overflow-hidden", layout === 'COMPACT' ? "min-h-[250px]" : "min-h-[450px]")}>
            <div className="w-20 h-20 rounded-[32px] bg-white/5 flex items-center justify-center group-hover:scale-110 group-hover:bg-accent/10 transition-all duration-700 shadow-inner">
               <Plus className="text-text-dim group-hover:text-accent" size={36} strokeWidth={3} />
            </div>
            <span className="text-[10px] font-black text-text-dim uppercase tracking-[0.4em] group-hover:text-white transition-colors">Add Logic Hub</span>
            <div className="absolute inset-0 bg-accent/5 translate-y-full group-hover:translate-y-0 transition-transform duration-700" />
         </button>
      </StaggeredItem>
    </div>
  </div>
);

const CounterCard = ({ config, count, onIncrement, onDecrement, isCompact }) => {
  const isLimit = count >= config.limit;
  const progress = Math.min(1, count / config.limit);
  const isBurnable = config.type === 'CIGARETTE' || config.type.startsWith('JOINT');

  // App matching logic: Progress moves from Left to Right.
  // White body length = (1 - progress).
  // Once limit hit, white body is 0, entire bar turns deep red.
  const bodyWidth = isLimit ? 0 : (1 - progress) * 100;

  const visualProps = useMemo(() => {
    switch(config.type) {
      case 'CIGARETTE': return { ember: '#FF3D00', roach: '#D97706', roachWidth: '25%', accent: '#FF3D00' };
      case 'JOINT_KING': return { ember: '#A78BFA', roach: '#424242', roachWidth: '20%', accent: '#A78BFA' };
      case 'JOINT_QUEEN': return { ember: '#F472B6', roach: '#424242', roachWidth: '15%', accent: '#F472B6' };
      default: return { ember: '#D4FF5C', roach: 'transparent', roachWidth: '0%', accent: '#D4FF5C' };
    }
  }, [config.type]);

  return (
    <Card className={cn(
      "relative group overflow-hidden transition-all duration-1000 flex flex-col p-10",
      isLimit ? "border-danger/50 shadow-[0_0_50px_rgba(248,113,113,0.1)] bg-danger/[0.04]" : "hover:border-white/10 hover:shadow-2xl",
      isCompact ? "min-h-[350px] p-6" : "min-h-[500px]"
    )}>
      <div className="flex justify-between items-start mb-10 relative z-20">
        <div className="flex flex-col">
          <span className={cn("text-[11px] font-[950] tracking-[0.5em] uppercase transition-colors duration-700", isLimit ? "text-danger" : "text-accent")}>{config.name}</span>
          {!isCompact && <span className="text-[10px] font-bold text-text-dim uppercase mt-2 tracking-widest">Protocol Threshold: {config.limit}</span>}
        </div>
        {isLimit && <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 0.6 }} className="p-2 bg-danger/20 rounded-xl border border-danger/40"><AlertCircle size={18} className="text-danger" /></motion.div>}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center w-full relative z-10">
        {isBurnable ? (
          <div className={cn("relative w-full h-12 rounded-full overflow-hidden border border-white/5 mb-14 shadow-[inset_0_4px_20px_rgba(0,0,0,0.8)] transition-all duration-1000", isLimit ? "bg-danger shadow-[0_0_40px_#F87171]" : "bg-bg-panel/80")}>
            {/* White Body - Fixed to Right, length shrinking towards Right */}
            <motion.div
                animate={{ width: `${bodyWidth}%` }}
                className={cn("absolute right-0 h-full bg-white shadow-[-10px_0_20px_rgba(255,255,255,0.2)]", isLimit && "opacity-0")}
                transition={{ type: 'spring', stiffness: 40, damping: 15 }}
            />

            {/* Android Matching High-Fidelity Ember */}
            {!isLimit && count > 0 && (
                <motion.div
                  animate={{ right: `${bodyWidth}%` }}
                  transition={{ type: 'spring', stiffness: 40, damping: 15 }}
                  className="absolute top-0 bottom-0 w-12 translate-x-1/2 z-20 flex items-center justify-center"
                >
                    {/* Heat Radius Glow */}
                    <motion.div
                      animate={{ scale: [1, 1.6, 1], opacity: [0.3, 0.6, 0.3] }}
                      transition={{ repeat: Infinity, duration: 0.1 }}
                      className="absolute inset-0 bg-radial-gradient from-[#FF3D00] via-[#FF3D00]/20 to-transparent blur-xl"
                    />
                    {/* Pulsing Core */}
                    <motion.div
                      animate={{
                        scale: [0.9, 1.2, 0.9],
                        x: [-2, 2, -1, 1, 0],
                        backgroundColor: ['#FF3D00', '#FFB74D', '#FF3D00']
                      }}
                      transition={{ repeat: Infinity, duration: 0.08, ease: 'linear' }}
                      className="w-5 h-full rounded-full shadow-[0_0_30px_#FF3D00] border-x border-white/10"
                    />
                </motion.div>
            )}

            {/* Filter (Roach) - Consumed if Over Limit */}
            <motion.div
              animate={{ width: isLimit ? '0%' : visualProps.roachWidth, opacity: isLimit ? 0 : 1, scaleX: isLimit ? 0 : 1 }}
              className="absolute top-0 bottom-0 right-0 z-10 shadow-2xl origin-right transition-all duration-1000"
              style={{ backgroundColor: visualProps.roach }}
            >
               <div className="absolute inset-y-0 left-0 w-1 bg-black/30" />
               <div className="absolute inset-y-0 right-4 w-px bg-white/10" />
            </motion.div>
          </div>
        ) : (
          /* Simple Modern Ring */
          <div className="relative w-48 h-48 mb-14">
             <svg className="w-full h-full -rotate-90">
                <circle cx="96" cy="96" r="88" className="stroke-white/5 fill-transparent" strokeWidth="12" />
                <motion.circle
                  cx="96" cy="96" r="88"
                  className={cn("fill-transparent", isLimit ? "stroke-danger" : "stroke-accent")}
                  strokeWidth="12"
                  strokeLinecap="round"
                  initial={{ strokeDasharray: '0 553' }}
                  animate={{ strokeDasharray: `${progress * 553} 553` }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                />
             </svg>
             <div className="absolute inset-0 flex items-center justify-center">
                <Activity className={cn("w-8 h-8", isLimit ? "text-danger" : "text-accent")} />
             </div>
          </div>
        )}

        <motion.div key={count} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={cn("font-[950] tracking-[-0.08em] text-center leading-none", isCompact ? "text-7xl mb-8" : "text-[10rem] mb-12")}>
          {count}
        </motion.div>
      </div>

      <div className={cn("flex justify-center items-center relative z-20", isCompact ? "space-x-6" : "space-x-12")}>
        <motion.button whileTap={{ scale: 0.7 }} onClick={() => onDecrement(config.id)} className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-text-dim hover:text-white transition-all hover:bg-white/10 shadow-lg">
          <Minus size={22} />
        </motion.button>
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => onIncrement(config.id)} className={cn("rounded-[36px] flex items-center justify-center shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all duration-700 border-2", isCompact ? "w-24 h-20" : "w-36 h-28", isLimit ? "border-danger text-danger bg-danger/10" : "border-white/10 text-white bg-bg-panel hover:border-accent hover:text-accent")}>
          <Plus size={isCompact ? 36 : 56} strokeWidth={4} />
        </motion.button>
      </div>
    </Card>
  );
};

const HealthScreen = ({ lastTimestamp }) => {
  const milestones = useMemo(() => SmokingCalculator.calculateRecoveryMilestones(lastTimestamp), [lastTimestamp]);
  const diff = Date.now() - lastTimestamp;
  const d = Math.floor(diff / (3600000 * 24));
  const h = Math.floor((diff % (3600000 * 24)) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);

  return (
    <div className="flex flex-col space-y-10">
      <StaggeredItem index={0}>
        <Card className="bg-success/5 border-success/20 overflow-hidden relative p-12 shadow-[0_0_80px_rgba(74,222,128,0.05)]">
          <div className="flex justify-between items-center mb-12 relative z-10">
            <div className="w-20 h-20 rounded-[32px] bg-success/20 flex items-center justify-center border border-success/30 shadow-2xl">
              <Heart className="text-success" size={40} fill="currentColor" />
            </div>
            <div className="text-right">
              <span className="text-[10px] font-[900] text-text-dim uppercase tracking-[0.4em]">Vault Security Duration</span>
              <div className="text-5xl font-[950] text-success tracking-tighter mt-2">{d > 0 && <span>{d}<span className="text-sm mx-1">D</span></span>}{h}<span className="text-sm mx-1">H</span>{m}<span className="text-sm">M</span></div>
            </div>
          </div>
          <h2 className="text-4xl font-[950] tracking-tighter mb-3 relative z-10 uppercase leading-none">Biological Repair Core</h2>
          <p className="text-sm text-text-muted font-bold leading-relaxed max-w-lg relative z-10">Real-time physiological tracking based on nonsmoker clinical data. Your cells are currently in a state of advanced regeneration.</p>
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-success/10 rounded-full blur-[150px] -mr-64 -mt-64" />
        </Card>
      </StaggeredItem>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-32">
        {milestones.map((m, i) => (
          <StaggeredItem key={m.title} index={i + 1}>
            <Card className="h-full flex flex-col hover:border-success/40 hover:bg-white/[0.01] transition-all duration-700 group cursor-default p-10 border-white/5 shadow-inner">
              <div className="flex justify-between items-start mb-10">
                 <div className="space-y-1">
                   <span className={cn("text-[10px] font-black uppercase tracking-[0.4em] transition-colors duration-700", m.progress >= 1 ? "text-success" : "text-text-dim group-hover:text-success/60")}>{m.progress >= 1 ? 'Optimization Complete' : 'Active Sequencing'}</span>
                   <h4 className="text-2xl font-[950] tracking-tighter mt-1 uppercase">{m.title}</h4>
                 </div>
                 <div className="text-5xl font-[950] text-success tracking-tighter transition-all group-hover:scale-110 duration-700">{Math.floor(m.progress * 100)}%</div>
              </div>
              <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden mb-10 p-0.5 border border-white/5">
                 <motion.div initial={{ width: 0 }} animate={{ width: `${m.progress * 100}%` }} className="h-full bg-success shadow-[0_0_25px_rgba(74,222,128,0.8)] rounded-full" />
              </div>
              <p className="text-sm text-text-muted font-bold leading-relaxed mb-10 flex-1 border-l-2 border-white/5 pl-6">{m.desc}</p>
              <div className="pt-8 border-t border-white/5 flex justify-between items-center text-text-dim">
                 <div className="flex items-center space-x-3">
                    <Activity size={16} className="text-success/50" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">Integrity Check</span>
                 </div>
                 <ChevronRight size={20} className="group-hover:translate-x-2 transition-transform duration-500" />
              </div>
            </Card>
          </StaggeredItem>
        ))}
      </div>
    </div>
  );
};

const HistoryScreen = ({ logs, configs, todayString, onEditLog, metrics }) => {
  const chartData = useMemo(() => {
    return [...logs].sort((a, b) => a.logDate.localeCompare(b.logDate)).slice(-7).map(l => ({
      name: new Date(l.logDate).toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
      val: l.counts.cigarettes || 0
    }));
  }, [logs]);

  const heatmap = useMemo(() => Array.from({ length: 24 }, (_, i) => ({ h: i, v: Math.floor(Math.random() * 20) })), []);

  return (
    <div className="flex flex-col space-y-10 pb-20">
      <StaggeredItem index={0}>
        <Card className="p-0 overflow-hidden border-accent/20 bg-bg-panel/40 shadow-2xl">
          <div className="p-12 pb-8 flex justify-between items-start">
             <div className="space-y-1">
               <span className="text-[10px] font-black text-text-dim uppercase tracking-[0.4em]">Analytics Engine</span>
               <h3 className="text-4xl font-[950] text-accent mt-1 uppercase tracking-tighter">Usage Volatility</h3>
             </div>
             <div className="p-4 bg-accent/10 rounded-3xl border border-accent/20 shadow-inner"><BarChart3 className="text-accent" size={28} /></div>
          </div>
          <div className="h-[320px] w-full pr-12 pl-4 pb-8">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="6 6" stroke="rgba(255,255,255,0.02)" vertical={false} />
                <XAxis dataKey="name" stroke="#666664" fontSize={10} axisLine={false} tickLine={false} dy={20} fontVariant="black" />
                <Tooltip contentStyle={{ background: '#0D0D0E', border: '1px solid rgba(212,255,92,0.3)', borderRadius: '20px', fontWeight: '950', fontSize: '14px', textTransform: 'uppercase', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }} cursor={{ stroke: 'rgba(212,255,92,0.1)', strokeWidth: 20 }} />
                <Line type="stepAfter" dataKey="val" stroke="#D4FF5C" strokeWidth={6} dot={{ r: 6, fill: '#D4FF5C', strokeWidth: 3, stroke: '#020202' }} activeDot={{ r: 12, strokeWidth: 0, fill: '#FFFFFF' }} animationDuration={2500} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </StaggeredItem>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <InsightCard Icon={TrendingUp} label="Current Streak" val={metrics.streak} suffix="Days Active" color="text-orange-400" index={1} />
        <InsightCard Icon={Wallet} label="Vault Savings" val={`$${metrics.totalSavings.toFixed(2)}`} suffix="Financial Gain" color="text-emerald-400" index={2} />
        <InsightCard Icon={Activity} label="Health Impact" val={`${Math.floor(metrics.lifeLostMinutes / 60)}h ${metrics.lifeLostMinutes % 60}m`} suffix="Recovery Time" color="text-rose-400" index={3} />
      </div>

      <div className="space-y-8 pt-10">
         <div className="flex items-center justify-between px-2">
            <h4 className="text-[12px] font-black text-accent uppercase tracking-[0.5em]">Historical Ledger</h4>
            <div className="h-px flex-1 bg-accent/20 mx-8" />
            <History size={16} className="text-accent/40" />
         </div>
         <div className="grid gap-4">
           {logs.sort((a,b) => b.logDate.localeCompare(a.logDate)).map((log, i) => (
             <motion.div key={log.logDate} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.05 }}>
               <Card className="py-10 flex items-center justify-between hover:bg-white/[0.02] transition-all duration-500 group px-12 border-white/5 hover:border-accent/20 shadow-xl">
                  <div className="flex flex-col space-y-1">
                     <span className="text-2xl font-[950] tracking-tight uppercase leading-none">{log.logDate === todayString ? 'Today' : new Date(log.logDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', weekday: 'long'})}</span>
                     <span className="text-[10px] font-black text-text-dim uppercase tracking-[0.3em] flex items-center pt-2">
                       <History size={12} className="mr-2 opacity-40" /> {Object.values(log.counts).reduce((a,b) => a+b, 0)} logs committed
                     </span>
                  </div>
                  <div className="flex items-center space-x-8">
                    <div className="flex -space-x-4">
                       {Object.entries(log.counts).map(([cid, count]) => (
                         <div key={cid} className="w-14 h-14 rounded-full bg-bg-panel border-4 border-bg-card flex items-center justify-center font-[950] text-sm text-white shadow-2xl transition-transform group-hover:-translate-y-1 duration-500">
                            {count}
                         </div>
                       ))}
                    </div>
                    <button onClick={() => onEditLog(log)} className="p-4 rounded-2xl bg-white/5 text-text-dim hover:text-accent hover:bg-accent/10 transition-all opacity-0 group-hover:opacity-100 border border-white/5 hover:border-accent/20 shadow-inner scale-90 hover:scale-100"><Edit2 size={20} /></button>
                  </div>
               </Card>
             </motion.div>
           ))}
         </div>
      </div>

      <StaggeredItem index={4}>
        <Card className="p-12 bg-bg-panel/40 border-white/5">
           <div className="flex justify-between items-center mb-12">
             <div className="space-y-1">
                <span className="text-[10px] font-black text-text-dim uppercase tracking-[0.4em]">High-Risk Vectors</span>
                <h4 className="text-2xl font-[950] uppercase tracking-tighter">Activity Heatmap</h4>
             </div>
             <div className="p-3 bg-white/5 rounded-2xl"><Clock size={20} className="text-text-dim" /></div>
           </div>
           <div className="flex items-end space-x-2 h-40">
              {heatmap.map((d, i) => (
                <div key={i} className="flex-1 bg-white/5 rounded-t-xl relative group h-full overflow-hidden shadow-inner">
                   <motion.div
                     initial={{ height: 0 }}
                     animate={{ height: `${d.v * 5}%` }}
                     transition={{ delay: i * 0.02, duration: 1 }}
                     className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-accent to-white/60 group-hover:from-white group-hover:to-white transition-all duration-500 shadow-[0_0_20px_rgba(212,255,92,0.4)]"
                   />
                </div>
              ))}
           </div>
           <div className="flex justify-between mt-8 text-[11px] font-[900] text-text-dim uppercase tracking-[0.5em] px-2">
              <span>00:00</span>
              <span>12:00</span>
              <span>23:59</span>
           </div>
        </Card>
      </StaggeredItem>
    </div>
  );
};

const InsightCard = ({ Icon, label, val, suffix, color, index }) => (
  <StaggeredItem index={index}>
    <Card className="flex flex-col items-center text-center py-12 hover:border-accent/20 transition-all duration-700 bg-bg-panel/40 border-white/5 shadow-2xl group">
      <div className={cn("p-6 rounded-[32px] bg-white/[0.03] mb-8 shadow-inner transition-transform duration-700 group-hover:scale-110", color)}>
        <Icon size={32} />
      </div>
      <div className="text-4xl font-[950] leading-none tracking-tighter mb-1 transition-transform duration-700 group-hover:scale-105">{val}</div>
      <div className="text-[11px] font-black text-text-muted mt-2 uppercase tracking-[0.2em]">{suffix}</div>
      <div className="mt-10 pt-6 border-t border-white/5 w-full flex items-center justify-center space-x-3">
        <div className="h-px w-4 bg-white/10" />
        <span className="text-[10px] font-[950] text-text-dim uppercase tracking-[0.5em]">{label}</span>
        <div className="h-px w-4 bg-white/10" />
      </div>
    </Card>
  </StaggeredItem>
);

const SettingsScreen = ({
  configs, setConfigs, user, setUser, onAddClick, accentColor, setAccentColor,
  isDark, setIsDark, dashboardLayout, setDashboardLayout, fontScale, setFontScale,
  isManualReset, setIsManualReset, globalPrice, setGlobalPrice, onReorder
}) => {
  const [alias, setAlias] = useState(user.name);
  const [goal, setGoal] = useState(user.goal);

  return (
    <div className="flex flex-col space-y-10 pb-32">
      {/* Identity Card */}
      <StaggeredItem index={0}>
        <Card className="p-12 bg-bg-panel/40 border-white/5 relative overflow-hidden">
          <div className="flex items-center space-x-10 mb-14 relative z-10">
             <div className="w-28 h-28 bg-gradient-to-br from-accent/30 to-accent/5 rounded-[42px] border-2 border-accent/20 flex items-center justify-center text-5xl font-[950] text-accent uppercase shadow-2xl relative group cursor-pointer">
                {user.profileImage ? <img src={user.profileImage} className="w-full h-full rounded-[40px] object-cover" /> : alias.charAt(0)}
                <div className="absolute inset-0 bg-black/40 rounded-[40px] opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                   <Camera size={32} />
                </div>
             </div>
             <div>
                <h4 className="text-4xl font-[950] tracking-tighter uppercase leading-none">{alias}</h4>
                <div className="flex items-center mt-3 space-x-3">
                   <div className="h-2 w-2 rounded-full bg-accent animate-pulse shadow-[0_0_10px_#D4FF5C]" />
                   <span className="text-[10px] font-black text-accent uppercase tracking-[0.5em]">Vault Commander</span>
                </div>
             </div>
          </div>
          <div className="space-y-10 relative z-10">
             <Input label="Vault Identifier Alias" value={alias} onChange={setAlias} />
             <Input label="Strategic Objective" value={goal} onChange={setGoal} />
             <Button className="w-full h-20 text-xs font-[950] shadow-2xl" onClick={() => setUser({ ...user, name: alias, goal: goal })}>Update Identity Parameters</Button>
          </div>
          <div className="absolute -top-20 -right-20 w-80 h-80 bg-accent/5 rounded-full blur-[120px]" />
        </Card>
      </StaggeredItem>

      {/* Visual & UI Controls */}
      <StaggeredItem index={1}>
         <Card className="p-12 space-y-12">
            <div className="flex justify-between items-center">
               <h4 className="text-[11px] font-black text-text-dim uppercase tracking-[0.5em]">Interface Configuration</h4>
               <Layout size={16} className="text-text-dim opacity-40" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
               {/* Dark Mode */}
               <div className="flex items-center justify-between p-6 bg-white/[0.02] rounded-3xl border border-white/5">
                  <div className="flex items-center space-x-4">
                     <div className="p-3 bg-white/5 rounded-2xl"><Moon size={20} className="text-text-muted" /></div>
                     <div className="flex flex-col">
                        <span className="text-xs font-black uppercase tracking-widest">Obsidian Mode</span>
                        <span className="text-[9px] font-bold text-text-dim uppercase mt-1">Deep OLED Black</span>
                     </div>
                  </div>
                  <button onClick={() => setIsDark(!isDark)} className={cn("w-14 h-8 rounded-full p-1 transition-all duration-500 shadow-inner border border-white/5", isDark ? "bg-accent" : "bg-white/10")}>
                     <div className={cn("w-6 h-6 rounded-full bg-white transition-all duration-500 shadow-lg", isDark ? "translate-x-6" : "translate-x-0")} />
                  </button>
               </div>

               {/* Manual Reset */}
               <div className="flex items-center justify-between p-6 bg-white/[0.02] rounded-3xl border border-white/5">
                  <div className="flex items-center space-x-4">
                     <div className="p-3 bg-white/5 rounded-2xl"><RefreshCcw size={20} className="text-text-muted" /></div>
                     <div className="flex flex-col">
                        <span className="text-xs font-black uppercase tracking-widest">Night Owl Mode</span>
                        <span className="text-[9px] font-bold text-text-dim uppercase mt-1">Manual Date Reset</span>
                     </div>
                  </div>
                  <button onClick={() => setIsManualReset(!isManualReset)} className={cn("w-14 h-8 rounded-full p-1 transition-all duration-500 shadow-inner border border-white/5", isManualReset ? "bg-accent" : "bg-white/10")}>
                     <div className={cn("w-6 h-6 rounded-full bg-white transition-all duration-500 shadow-lg", isManualReset ? "translate-x-6" : "translate-x-0")} />
                  </button>
               </div>
            </div>

            {/* Accent Spectrum */}
            <div className="space-y-6">
               <span className="text-[10px] font-black text-text-dim uppercase tracking-[0.5em] ml-1">Accent Spectrum</span>
               <div className="flex flex-wrap gap-4">
                  {ACCENT_COLORS.map(c => (
                    <button
                      key={c.value}
                      onClick={() => setAccentColor(c.value)}
                      className={cn(
                        "w-12 h-12 rounded-2xl border-4 transition-all duration-500 shadow-xl",
                        accentColor === c.value ? "border-white scale-110" : "border-transparent opacity-40 hover:opacity-100"
                      )}
                      style={{ backgroundColor: c.value }}
                    />
                  ))}
               </div>
            </div>

            {/* Typography Scale */}
            <div className="space-y-8 pt-4">
               <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-text-dim uppercase tracking-[0.5em] ml-1">Typography Scale</span>
                  <span className="text-[10px] font-black text-accent">{Math.round(fontScale * 100)}%</span>
               </div>
               <div className="relative w-full h-12 flex items-center group">
                  <div className="absolute inset-x-0 h-1.5 bg-white/5 rounded-full overflow-hidden">
                     <div className="h-full bg-accent transition-all" style={{ width: `${(fontScale - 0.8) / 0.5 * 100}%` }} />
                  </div>
                  <input
                    type="range" min="0.8" max="1.3" step="0.1" value={fontScale} onChange={(e) => setFontScale(parseFloat(e.target.value))}
                    className="absolute w-full opacity-0 cursor-pointer h-full z-10"
                  />
                  <motion.div
                    animate={{ left: `${(fontScale - 0.8) / 0.5 * 100}%` }}
                    className="absolute w-8 h-8 rounded-2xl bg-white border-4 border-bg-panel shadow-2xl -ml-4 z-0 pointer-events-none group-active:scale-110 transition-transform"
                  />
               </div>
            </div>
         </Card>
      </StaggeredItem>

      {/* Tracker Management */}
      <StaggeredItem index={2}>
        <Card className="p-12">
          <div className="flex justify-between items-center mb-14">
            <div className="space-y-1">
               <h4 className="text-2xl font-[950] uppercase tracking-tighter">Vault Configuration</h4>
               <p className="text-[10px] font-bold text-text-dim uppercase tracking-widest leading-none mt-2">Manage tracking protocols & economics</p>
            </div>
            <div className="p-3 bg-white/5 rounded-2xl"><RefreshCcw size={16} className="text-text-dim" /></div>
          </div>

          <div className="space-y-10">
             <Input label="Global Unit Price Override ($)" value={globalPrice} onChange={setGlobalPrice} type="number" />

             <div className="space-y-6">
               <div className="flex items-center space-x-3 mb-2 opacity-40">
                  <GripVertical size={14} />
                  <span className="text-[10px] font-[900] uppercase tracking-[0.3em]">Operational Priority</span>
               </div>
               {configs.map(c => (
                 <div key={c.id} className="flex items-center justify-between p-8 bg-white/[0.02] rounded-[36px] border border-white/5 group hover:border-accent/20 transition-all duration-500 shadow-inner">
                    <div className="flex items-center space-x-6">
                       <div className="flex flex-col space-y-2">
                         <div className="flex space-x-2">
                           <button onClick={() => onReorder(c.id, 'up')} className="p-1.5 rounded-lg bg-white/5 text-text-dim hover:text-white transition-all"><ArrowUp size={12} /></button>
                           <button onClick={() => onReorder(c.id, 'down')} className="p-1.5 rounded-lg bg-white/5 text-text-dim hover:text-white transition-all"><ArrowDown size={12} /></button>
                         </div>
                       </div>
                       <div className="flex flex-col">
                          <span className="text-lg font-[950] uppercase tracking-tight leading-none transition-colors duration-500 group-hover:text-accent">{c.name}</span>
                          <span className="text-[10px] font-black text-text-dim uppercase tracking-widest mt-2">Target: {c.limit} • Type: {c.type.replace('_', ' ')}</span>
                       </div>
                    </div>
                    <div className="flex space-x-3 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-x-4 group-hover:translate-x-0">
                      <button className="p-4 rounded-2xl bg-white/5 text-text-dim hover:text-white hover:bg-white/10 transition-all border border-white/5"><Edit2 size={18} /></button>
                      <button onClick={() => setConfigs(configs.filter(x => x.id !== c.id))} className="p-4 rounded-2xl bg-danger/5 text-danger/60 hover:text-danger hover:bg-danger/10 transition-all border border-danger/5"><Trash2 size={18} /></button>
                    </div>
                 </div>
               ))}
             </div>

             <button onClick={onAddClick} className="w-full h-20 rounded-[36px] border-2 border-dashed border-accent/20 flex items-center justify-center space-x-4 hover:bg-accent/5 hover:border-accent/40 transition-all duration-500 group group-active:scale-[0.98]">
                <div className="w-10 h-10 rounded-2xl bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors"><Plus size={20} className="text-accent" /></div>
                <span className="text-xs font-[950] text-accent uppercase tracking-[0.3em]">Initialize Operational Tracker</span>
             </button>
          </div>
        </Card>
      </StaggeredItem>

      <StaggeredItem index={3}>
        <Card danger className="bg-danger/[0.03] p-12 overflow-hidden relative group">
          <div className="flex flex-col items-center text-center space-y-8 relative z-10">
             <div className="w-20 h-20 rounded-[32px] bg-danger/10 flex items-center justify-center text-danger border border-danger/20 shadow-2xl transition-transform duration-700 group-hover:rotate-12"><AlertCircle size={36} /></div>
             <div className="space-y-2">
                <h4 className="text-2xl font-[950] uppercase tracking-tighter leading-none">Critical Security</h4>
                <p className="text-[11px] font-black text-danger/60 uppercase tracking-[0.4em]">Irreversible session destruction</p>
             </div>
             <div className="grid grid-cols-2 gap-6 w-full pt-4">
                <Button variant="danger" className="h-16 text-[11px] font-black shadow-2xl" onClick={() => setUser({ ...user, name: '' })}>Terminate</Button>
                <Button variant="outline" className="h-16 text-[11px] font-black border-danger/40 text-danger hover:bg-danger/20 shadow-xl transition-all">Clear Vault</Button>
             </div>
          </div>
          <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-danger/5 rounded-full blur-[100px]" />
        </Card>
      </StaggeredItem>
    </div>
  );
};

export default App;
