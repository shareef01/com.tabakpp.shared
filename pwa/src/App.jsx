import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Heart, BarChart3, Settings, LogOut,
  ChevronRight, Info, History, Plus, Minus, Edit2, Trash2,
  TrendingUp, Wallet, Activity, Calendar, Clock, ArrowUp, ArrowDown, X,
  Save, AlertCircle, RefreshCcw
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { SmokingCalculator } from './utils/smokingCalculator';
import { Card, Button, Input, StaggeredItem } from './components/Common';
import { cn } from './utils/utils';

// --- MAIN APP COMPONENT ---
const App = () => {
  const [user, setUser] = useState({ name: 'Shareef', goal: 'SAVE FOR VACATION' });
  const [activeTab, setActiveTab] = useState('tracker');
  const [logs, setLogs] = useState([
    { logDate: '2026-06-08', counts: { cigarettes: 12 } },
    { logDate: '2026-06-09', counts: { cigarettes: 15 } },
    { logDate: '2026-06-10', counts: { cigarettes: 22 } }, // Example over limit
  ]);
  const [configs, setConfigs] = useState([
    { id: 'cigarettes', name: 'Cigarettes', limit: 20, type: 'CIGARETTE', pricePerUnit: 0.5, excludeFromEconomics: false, displayOrder: 0 }
  ]);

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
    if (logIdx >= 0 && updatedLogs[logIdx].counts[cid] > 0) {
      updatedLogs[logIdx].counts[cid] -= 1;
      setLogs(updatedLogs);
    }
  };

  const handleSaveLogEdit = (date, newCounts) => {
    const updatedLogs = logs.map(l => l.logDate === date ? { ...l, counts: newCounts } : l);
    setLogs(updatedLogs);
    setEditLogTarget(null);
  };

  if (!user) return <AuthScreen onLogin={() => setUser({ name: 'Shareef', goal: 'SAVE FOR VACATION' })} />;

  return (
    <div className="flex flex-col min-h-screen bg-bg-base text-white font-inter selection:bg-accent/30 overflow-hidden">
      <header className="fixed top-0 left-0 right-0 z-40 pt-[env(safe-area-inset-top)] px-8 py-6 bg-gradient-to-b from-black via-black/90 to-transparent flex justify-between items-center">
        <div className="flex flex-col">
          <h1 className="text-4xl font-[900] tracking-[-0.05em] uppercase leading-none">tabak++</h1>
          <span className="text-[10px] font-black tracking-[0.4em] text-accent mt-2 uppercase">
            {activeTab === 'tracker' ? 'Vault' : activeTab}
          </span>
        </div>
        <div className="hidden md:flex space-x-2">
           <Button variant="secondary" className="h-10 rounded-full text-[10px]" onClick={() => setUser(null)}>
             <LogOut size={12} className="mr-2" /> DISCONNECT
           </Button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pt-36 pb-40 px-6 max-w-5xl mx-auto w-full">
        <AnimatePresence mode="wait">
          {activeTab === 'tracker' && (
            <TrackerScreen key="tracker" metrics={metrics} configs={configs} todayLog={todayLog} onIncrement={handleIncrement} onDecrement={handleDecrement} onAddClick={() => setShowAddModal(true)} />
          )}
          {activeTab === 'health' && (
            <HealthScreen key="health" lastTimestamp={lastEntry} />
          )}
          {activeTab === 'history' && (
            <HistoryScreen key="history" logs={logs} configs={configs} todayString={today} onEditLog={setEditLogTarget} />
          )}
          {activeTab === 'settings' && (
            <SettingsScreen key="settings" configs={configs} setConfigs={setConfigs} user={user} setUser={setUser} onAddClick={() => setShowAddModal(true)} />
          )}
        </AnimatePresence>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 md:bottom-8 md:left-1/2 md:-translate-x-1/2 md:w-[600px] pb-[env(safe-area-inset-bottom)] bg-black/80 backdrop-blur-3xl border-t md:border border-white/5 md:rounded-[40px] rounded-t-[40px] z-40">
        <div className="flex justify-around items-center h-24 md:h-20 px-6">
          <TabItem id="tracker" Icon={LayoutDashboard} label="Vault" active={activeTab === 'tracker'} onClick={() => setActiveTab('tracker')} />
          <TabItem id="health" Icon={Heart} label="Health" active={activeTab === 'health'} onClick={() => setActiveTab('health')} />
          <TabItem id="history" Icon={BarChart3} label="History" active={activeTab === 'history'} onClick={() => setActiveTab('history')} />
          <TabItem id="settings" Icon={Settings} label="Control" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
        </div>
      </nav>

      {/* Modals Overlay */}
      <AnimatePresence>
        {showAddModal && (
          <Modal onClose={() => setShowAddModal(false)} title="New Tracker">
            <AddTrackerForm onAdd={(n, l) => {
              const newConfig = { id: Math.random().toString(36).substr(2, 9), name: n, limit: parseInt(l) || 20, type: 'SIMPLE', pricePerUnit: 0, excludeFromEconomics: false, displayOrder: configs.length };
              setConfigs([...configs, newConfig]);
              setShowAddModal(false);
            }} />
          </Modal>
        )}
        {editLogTarget && (
          <Modal onClose={() => setEditLogTarget(null)} title="Correct Entry">
            <EditLogForm log={editLogTarget} configs={configs} onSave={handleSaveLogEdit} />
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- CORE COMPONENTS ---

const Modal = ({ children, onClose, title }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
    <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="w-full max-w-sm">
      <Card className="space-y-6 relative border-accent/20 shadow-[0_0_60px_rgba(212,255,92,0.1)]">
        <button onClick={onClose} className="absolute top-6 right-6 p-2 text-text-dim hover:text-white transition-colors"><X size={20} /></button>
        <h3 className="text-2xl font-[900] tracking-tighter uppercase">{title}</h3>
        {children}
      </Card>
    </motion.div>
  </div>
);

const AddTrackerForm = ({ onAdd }) => {
  const [name, setName] = useState('');
  const [limit, setLimit] = useState('20');
  return (
    <div className="space-y-6">
      <Input label="Identity Label" value={name} onChange={setName} placeholder="e.g. Nicotine Pouches" />
      <Input label="Daily Threshold" value={limit} onChange={setLimit} type="number" />
      <Button className="w-full h-16 text-[11px]" onClick={() => onAdd(name, limit)}>Initialize Tracker</Button>
    </div>
  );
};

const EditLogForm = ({ log, configs, onSave }) => {
  const [counts, setCounts] = useState({ ...log.counts });
  return (
    <div className="space-y-6">
      <span className="text-[10px] font-black text-text-dim uppercase tracking-widest block mb-4">{new Date(log.logDate).toLocaleDateString(undefined, { dateStyle: 'full' })}</span>
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
      <Button className="w-full h-16" onClick={() => onSave(log.logDate, counts)}>
        <Save size={16} className="mr-2" /> Sync Corrections
      </Button>
    </div>
  );
};

const TabItem = ({ Icon, label, active, onClick }) => (
  <motion.div onClick={onClick} whileTap={{ scale: 0.9 }} className="flex flex-col items-center justify-center flex-1 py-2 cursor-pointer relative group">
    <Icon size={20} className={cn("mb-1 transition-all duration-500", active ? "text-accent scale-110" : "text-text-dim group-hover:text-text-muted")} />
    <span className={cn("text-[9px] font-black tracking-widest uppercase transition-colors duration-300", active ? "text-white" : "text-text-dim")}>
      {label}
    </span>
    {active && <motion.div layoutId="navDot" className="absolute -top-1 w-1 h-1 rounded-full bg-accent shadow-[0_0_10px_#D4FF5C]" />}
  </motion.div>
);

const AuthScreen = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center p-6 font-inter">
      <div className="w-full max-w-md space-y-12">
        <div className="flex flex-col items-center text-center">
           <div className="w-24 h-24 bg-accent rounded-[32px] flex items-center justify-center mb-8 shadow-[0_0_50px_rgba(212,255,92,0.25)] relative overflow-hidden group">
              <LayoutDashboard size={36} className="text-bg-base relative z-10" />
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
           </div>
           <h1 className="text-6xl font-[900] tracking-tighter uppercase mb-2 bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">tabak++</h1>
           <p className="text-accent font-black tracking-[0.5em] text-[9px] uppercase">The Tracking Vault</p>
        </div>
        <Card className="space-y-6">
          <Input label="Vault Identifier" placeholder="email@vault.com" value={email} onChange={setEmail} />
          <Input label="Access Phrase" type="password" placeholder="••••••••" value={pass} onChange={setPass} />
          <Button className="w-full h-16 text-xs" onClick={onLogin}>Access Records</Button>
        </Card>
      </div>
    </div>
  );
};

const TrackerScreen = ({ metrics, configs, todayLog, onIncrement, onDecrement, onAddClick }) => (
  <div className="flex flex-col space-y-12">
    <StaggeredItem index={0}>
      <Card className="flex flex-col space-y-8 bg-bg-panel/50 border-accent/10 relative overflow-hidden">
        <div className="flex justify-between items-end relative z-10">
          <div>
            <span className="text-[10px] font-black text-text-dim uppercase tracking-widest">Global Daily Status</span>
            <div className="text-5xl font-[900] tracking-tighter mt-2">{Math.max(0, metrics.totalLimit - metrics.totalCount)} <span className="text-sm text-accent font-black tracking-widest uppercase ml-2">Remaining</span></div>
          </div>
          <div className="text-right">
             <span className="text-[10px] font-black text-accent uppercase tracking-widest flex items-center justify-end"><TrendingUp size={10} className="mr-1" /> {metrics.rank}</span>
             <div className="text-2xl font-[900] text-text-muted mt-1">{metrics.xp} <span className="text-xs">XP</span></div>
          </div>
        </div>
        <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden relative">
           <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(1, metrics.progress) * 100}%` }} className={cn("h-full transition-colors duration-700 shadow-[0_0_20px_rgba(255,255,255,0.3)]", metrics.progress >= 1 ? "bg-danger" : "bg-white")} />
        </div>
        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-accent/5 rounded-full blur-[80px]" />
      </Card>
    </StaggeredItem>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {configs.sort((a, b) => a.displayOrder - b.displayOrder).map((config, index) => (
        <StaggeredItem key={config.id} index={index + 1}>
          <CounterCard config={config} count={todayLog.counts[config.id] || 0} onIncrement={onIncrement} onDecrement={onDecrement} />
        </StaggeredItem>
      ))}
      <StaggeredItem index={configs.length + 1}>
         <button onClick={onAddClick} className="w-full h-full min-h-[350px] border-2 border-dashed border-white/5 rounded-[42px] flex flex-col items-center justify-center space-y-6 hover:bg-white/[0.02] hover:border-accent/20 transition-all group relative overflow-hidden">
            <div className="w-16 h-16 rounded-[24px] bg-white/5 flex items-center justify-center group-hover:scale-110 group-hover:bg-accent/10 transition-all duration-500">
               <Plus className="text-text-dim group-hover:text-accent" size={28} />
            </div>
            <span className="text-[10px] font-black text-text-dim uppercase tracking-[0.3em] group-hover:text-white">New Tracker Archetype</span>
         </button>
      </StaggeredItem>
    </div>
  </div>
);

const CounterCard = ({ config, count, onIncrement, onDecrement }) => {
  const isLimit = count >= config.limit;
  const progress = Math.min(1, count / config.limit);

  // App matching logic: Once limit is hit, bar turns red and "over-burns"
  const burnWidth = isLimit ? 0 : (1 - progress) * 100;

  return (
    <Card className={cn("relative group overflow-hidden transition-all duration-700 min-h-[450px] flex flex-col p-10", isLimit ? "border-danger/40 shadow-[0_0_40px_rgba(248,113,113,0.05)] bg-danger/[0.02]" : "hover:border-white/10")}>
      <div className="flex justify-between items-start mb-8 relative z-10">
        <div className="flex flex-col">
          <span className={cn("text-[11px] font-[900] tracking-[0.4em] uppercase transition-colors duration-500", isLimit ? "text-danger" : "text-accent")}>{config.name}</span>
          <span className="text-[9px] font-bold text-text-dim uppercase mt-1 tracking-widest">Vault Objective: {config.limit}</span>
        </div>
        {isLimit && <motion.div animate={{ opacity: [1, 0.4, 1], scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="p-2 bg-danger/10 rounded-full"><AlertCircle size={16} className="text-danger" /></motion.div>}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center w-full relative">
        {/* Android Exact Matching Cigarette Shaders */}
        <div className={cn("relative w-full h-10 rounded-full overflow-hidden border border-white/5 mb-14 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] transition-all duration-1000", isLimit ? "bg-danger/20" : "bg-white/[0.02]")}>

          {/* White Body - Burns Left to Right */}
          <motion.div
              animate={{ width: `${burnWidth}%` }}
              className={cn("absolute right-0 h-full bg-white shadow-[0_0_20px_rgba(255,255,255,0.1)]", isLimit && "opacity-0")}
              transition={{ type: 'spring', stiffness: 50, damping: 20 }}
          />

          {/* Ember (The Physics-based Flickering Tip) */}
          {!isLimit && count > 0 && (
              <motion.div
                animate={{ right: `${burnWidth}%` }}
                transition={{ type: 'spring', stiffness: 50, damping: 20 }}
                className="absolute top-0 bottom-0 w-8 translate-x-1/2 z-20 flex items-center justify-center"
              >
                  {/* Heat Radius */}
                  <motion.div
                    animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0.7, 0.4] }}
                    transition={{ repeat: Infinity, duration: 0.15 }}
                    className="absolute inset-0 bg-radial-gradient from-[#FF3D00] to-transparent blur-lg"
                  />
                  {/* Core Flame */}
                  <motion.div
                    animate={{
                      scaleY: [1, 1.1, 0.9, 1],
                      x: [-1, 1, -1, 1, 0],
                      backgroundColor: ['#FF3D00', '#FFB74D', '#FF3D00']
                    }}
                    transition={{ repeat: Infinity, duration: 0.1, ease: 'linear' }}
                    className="w-4 h-full rounded-full shadow-[0_0_20px_#FF3D00]"
                  />
              </motion.div>
          )}

          {/* Over-Limit "Fully Burnt" State */}
          {isLimit && (
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-gradient-to-r from-danger/60 via-danger to-danger/60 animate-pulse-slow" />
          )}

          {/* The Filter (Roach) - Consumed if Over Limit */}
          <motion.div
            animate={{
               width: isLimit ? '0%' : '25%',
               opacity: isLimit ? 0 : 1
            }}
            className="absolute top-0 bottom-0 right-0 bg-[#D97706] border-l border-black/20 z-10 shadow-lg"
          >
             <div className="absolute inset-y-0 left-0 w-px bg-white/10" />
          </motion.div>

          {/* Background Ash */}
          <div className="absolute inset-0 bg-neutral-950 -z-10" />
        </div>

        <motion.div key={count} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-9xl font-[900] tracking-tighter text-center mb-10 leading-none">
          {count}
        </motion.div>
      </div>

      <div className="flex justify-center items-center space-x-10 relative z-10">
        <motion.button whileTap={{ scale: 0.8 }} onClick={() => onDecrement(config.id)} className="w-16 h-16 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-text-dim hover:text-white transition-all hover:bg-white/10">
          <Minus size={24} />
        </motion.button>
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => onIncrement(config.id)} className={cn("w-28 h-28 rounded-full border-2 flex items-center justify-center shadow-2xl transition-all duration-500", isLimit ? "border-danger text-danger bg-danger/10" : "border-white/10 text-white bg-white/5 hover:border-accent hover:text-accent")}>
          <Plus size={48} strokeWidth={3} />
        </motion.button>
      </div>
    </Card>
  );
};

const HealthScreen = ({ lastTimestamp }) => {
  const milestones = useMemo(() => SmokingCalculator.calculateRecoveryMilestones(lastTimestamp), [lastTimestamp]);
  const diff = Date.now() - lastTimestamp;
  const hours = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);

  return (
    <div className="flex flex-col space-y-8">
      <StaggeredItem index={0}>
        <Card className="bg-success/5 border-success/20 overflow-hidden relative p-10">
          <div className="flex justify-between items-center mb-10 relative z-10">
            <div className="w-16 h-16 rounded-3xl bg-success/20 flex items-center justify-center border border-success/30">
              <Heart className="text-success" size={32} fill="currentColor" />
            </div>
            <div className="text-right">
              <span className="text-[10px] font-black text-text-dim uppercase tracking-[0.2em]">Vault Purity Time</span>
              <div className="text-4xl font-[900] text-success tracking-tighter mt-1">{hours} <span className="text-lg">H</span> {mins} <span className="text-lg">M</span></div>
            </div>
          </div>
          <h2 className="text-4xl font-[900] tracking-tighter mb-2 relative z-10 uppercase">Biological Restoration</h2>
          <p className="text-sm text-text-muted font-medium leading-relaxed max-w-md relative z-10">Clinical markers are actively repairing. Timelines are derived from nonsmoker recovery research.</p>
          <div className="absolute top-0 right-0 w-80 h-80 bg-success/10 rounded-full blur-[100px] -mr-40 -mt-40" />
        </Card>
      </StaggeredItem>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
        {milestones.map((m, i) => (
          <StaggeredItem key={m.title} index={i + 1}>
            <Card className="h-full flex flex-col hover:border-success/30 hover:bg-white/[0.01] transition-all group cursor-default">
              <div className="flex justify-between items-start mb-8">
                 <div>
                   <span className={cn("text-[9px] font-black uppercase tracking-widest transition-colors duration-500", m.progress >= 1 ? "text-success" : "text-text-dim group-hover:text-success/60")}>{m.progress >= 1 ? 'Phase Stabilized' : 'Cellular Repair'}</span>
                   <h4 className="text-xl font-[900] tracking-tight mt-1 uppercase">{m.title}</h4>
                 </div>
                 <div className="text-4xl font-[900] text-success tracking-tighter transition-transform group-hover:scale-110 duration-500">{Math.floor(m.progress * 100)}%</div>
              </div>
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden mb-8">
                 <motion.div initial={{ width: 0 }} animate={{ width: `${m.progress * 100}%` }} className="h-full bg-success shadow-[0_0_10px_rgba(74,222,128,0.5)]" />
              </div>
              <p className="text-sm text-text-muted font-medium leading-relaxed mb-8 flex-1">{m.desc}</p>
              <div className="pt-6 border-t border-white/5 flex justify-between items-center text-text-dim">
                 <div className="flex items-center space-x-2">
                    <Activity size={14} className="text-success/40" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Audit Sequence</span>
                 </div>
                 <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </Card>
          </StaggeredItem>
        ))}
      </div>
    </div>
  );
};

const HistoryScreen = ({ logs, configs, todayString, onEditLog }) => {
  const chartData = useMemo(() => {
    return [...logs].sort((a, b) => a.logDate.localeCompare(b.logDate)).slice(-7).map(l => ({
      name: new Date(l.logDate).toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
      val: l.counts.cigarettes || 0
    }));
  }, [logs]);

  const heatmap = useMemo(() => Array.from({ length: 24 }, (_, i) => ({ h: i, v: Math.floor(Math.random() * 15) })), []);

  return (
    <div className="flex flex-col space-y-8 pb-12">
      <StaggeredItem index={0}>
        <Card className="p-0 overflow-hidden border-accent/20">
          <div className="p-10 pb-6 flex justify-between items-start">
             <div>
               <span className="text-[10px] font-black text-text-dim uppercase tracking-[0.3em]">Temporal Trends</span>
               <h3 className="text-3xl font-[900] text-accent mt-1 uppercase tracking-tighter">Usage Volatility</h3>
             </div>
             <div className="p-3 bg-accent/10 rounded-2xl"><BarChart3 className="text-accent" /></div>
          </div>
          <div className="h-[280px] w-full pr-10 pl-4 pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis dataKey="name" stroke="#666664" fontSize={10} axisLine={false} tickLine={false} dy={15} fontVariant="black" />
                <Tooltip contentStyle={{ background: '#121214', border: '1px solid rgba(212,255,92,0.2)', borderRadius: '16px', fontWeight: '900', fontSize: '12px' }} />
                <Line type="stepAfter" dataKey="val" stroke="#D4FF5C" strokeWidth={5} dot={{ r: 5, fill: '#D4FF5C', strokeWidth: 2, stroke: '#020202' }} activeDot={{ r: 10, shadow: '0 0 20px #D4FF5C' }} animationDuration={2000} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </StaggeredItem>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <InsightCard Icon={TrendingUp} label="Streak" val="5" suffix="Days" color="text-orange-400" index={1} />
        <InsightCard Icon={Wallet} label="Spent" val="$142.50" suffix="Total" color="text-emerald-400" index={2} />
        <InsightCard Icon={Activity} label="Impact" val="12h 45m" suffix="Minutes Lost" color="text-rose-400" index={3} />
      </div>

      <div className="space-y-6 pt-6">
         <h4 className="text-[11px] font-black text-accent uppercase tracking-[0.4em] ml-2">Historical Records</h4>
         {logs.sort((a,b) => b.logDate.localeCompare(a.logDate)).map((log, i) => (
           <motion.div key={log.logDate} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.05 }}>
             <Card className="py-8 flex items-center justify-between hover:bg-white/[0.01] transition-colors group px-10">
                <div className="flex flex-col">
                   <span className="text-xl font-[900] tracking-tight uppercase leading-none">{log.logDate === todayString ? 'Today' : new Date(log.logDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', weekday: 'long'})}</span>
                   <span className="text-[10px] font-bold text-text-dim uppercase tracking-widest mt-2 flex items-center">
                     <History size={10} className="mr-1.5" /> {Object.values(log.counts).reduce((a,b) => a+b, 0)} logs registered
                   </span>
                </div>
                <div className="flex items-center space-x-6">
                  <div className="flex -space-x-3">
                     {Object.entries(log.counts).map(([cid, count]) => (
                       <div key={cid} className="w-12 h-12 rounded-full bg-bg-panel border-4 border-bg-card flex items-center justify-center font-black text-xs text-white shadow-xl">
                          {count}
                       </div>
                     ))}
                  </div>
                  <button onClick={() => onEditLog(log)} className="p-3 rounded-2xl bg-white/5 text-text-dim hover:text-accent hover:bg-accent/10 transition-all opacity-0 group-hover:opacity-100"><Edit2 size={18} /></button>
                </div>
             </Card>
           </motion.div>
         ))}
      </div>

      <StaggeredItem index={4}>
        <Card className="p-10">
           <div className="flex justify-between items-center mb-10">
             <span className="text-[10px] font-black text-text-dim uppercase tracking-[0.3em]">Peak Usage Intensity</span>
             <Clock size={16} className="text-text-dim" />
           </div>
           <div className="flex items-end space-x-1.5 h-32">
              {heatmap.map((d, i) => (
                <div key={i} className="flex-1 bg-white/5 rounded-t-lg relative group h-full overflow-hidden">
                   <motion.div
                     initial={{ height: 0 }}
                     animate={{ height: `${d.v * 6}%` }}
                     className="absolute bottom-0 left-0 right-0 bg-accent group-hover:bg-white transition-colors duration-300 shadow-[0_0_15px_rgba(212,255,92,0.3)]"
                   />
                </div>
              ))}
           </div>
           <div className="flex justify-between mt-6 text-[10px] font-black text-text-dim uppercase tracking-widest">
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
    <Card className="flex flex-col items-center text-center py-10 hover:border-accent/10 transition-colors">
      <div className={cn("p-5 rounded-3xl bg-white/[0.02] mb-6 shadow-inner", color)}>
        <Icon size={28} />
      </div>
      <div className="text-3xl font-[900] leading-none tracking-tighter">{val}</div>
      <div className="text-[10px] font-bold text-text-muted mt-2 uppercase tracking-widest">{suffix}</div>
      <div className="mt-8 pt-4 border-t border-white/5 w-full">
        <span className="text-[9px] font-[900] text-text-dim uppercase tracking-[0.4em]">{label}</span>
      </div>
    </Card>
  </StaggeredItem>
);

const SettingsScreen = ({ configs, setConfigs, user, setUser, onAddClick }) => {
  const [alias, setAlias] = useState(user.name);
  const [goal, setGoal] = useState(user.goal);
  const [price, setPrice] = useState('0.5');

  return (
    <div className="flex flex-col space-y-8 pb-20">
      <StaggeredItem index={0}>
        <Card className="p-10">
          <div className="flex items-center space-x-8 mb-12">
             <div className="w-24 h-24 bg-gradient-to-br from-accent/20 to-accent/5 rounded-[32px] border-2 border-accent/20 flex items-center justify-center text-4xl font-[900] text-accent uppercase shadow-2xl">
                {alias.charAt(0)}
             </div>
             <div>
                <h4 className="text-3xl font-[900] tracking-tighter uppercase leading-none">{alias}</h4>
                <span className="text-[10px] font-black text-accent uppercase tracking-[0.3em] mt-2 block">Vault Commander</span>
             </div>
          </div>
          <div className="space-y-8">
             <Input label="Vault Identifier Alias" value={alias} onChange={setAlias} />
             <Input label="Strategic Life Goal" value={goal} onChange={setGoal} />
             <Button className="w-full h-16 text-[11px]" onClick={() => setUser({ ...user, name: alias, goal: goal })}>Synchronize Identity</Button>
          </div>
        </Card>
      </StaggeredItem>

      <StaggeredItem index={1}>
        <Card className="p-10">
          <div className="flex justify-between items-center mb-10">
            <h4 className="text-[11px] font-black text-text-dim uppercase tracking-[0.4em]">Vault Configuration</h4>
            <RefreshCcw size={14} className="text-text-dim" />
          </div>
          <div className="space-y-4">
             <Input label="Global Unit Price ($)" value={price} onChange={setPrice} type="number" />
             <div className="pt-4 space-y-3">
               {configs.map(c => (
                 <div key={c.id} className="flex items-center justify-between p-6 bg-white/[0.02] rounded-3xl border border-white/5 group hover:border-accent/10 transition-colors">
                    <div className="flex flex-col">
                      <span className="text-sm font-black uppercase tracking-tight">{c.name}</span>
                      <span className="text-[10px] font-bold text-text-dim uppercase tracking-widest mt-1">Threshold: {c.limit} units</span>
                    </div>
                    <div className="flex space-x-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-3 rounded-2xl bg-white/5 text-text-dim hover:text-white transition-all"><Edit2 size={16} /></button>
                      <button onClick={() => setConfigs(configs.filter(x => x.id !== c.id))} className="p-3 rounded-2xl bg-danger/5 text-danger/40 hover:text-danger hover:bg-danger/10 transition-all"><Trash2 size={16} /></button>
                    </div>
                 </div>
               ))}
             </div>
             <Button variant="secondary" className="w-full h-14 border-dashed border-2 mt-4" onClick={onAddClick}>
                <Plus size={16} className="mr-2" /> Initialize New Tracker
             </Button>
          </div>
        </Card>
      </StaggeredItem>

      <StaggeredItem index={2}>
        <Card danger className="bg-danger/[0.03] p-10">
          <div className="flex flex-col items-center text-center space-y-6">
             <div className="w-16 h-16 rounded-full bg-danger/10 flex items-center justify-center text-danger"><AlertCircle size={28} /></div>
             <h4 className="text-[11px] font-black text-danger uppercase tracking-[0.5em]">Critical session commands</h4>
             <div className="grid grid-cols-2 gap-4 w-full">
                <Button variant="danger" className="h-14 text-[10px]" onClick={() => setUser(null)}>Terminate</Button>
                <Button variant="outline" className="h-14 text-[10px] border-danger/30 text-danger hover:bg-danger/10">Wipe Data</Button>
             </div>
          </div>
        </Card>
      </StaggeredItem>
    </div>
  );
};

export default App;
