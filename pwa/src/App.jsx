import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Heart, BarChart3, Settings, LogOut,
  ChevronRight, Info, History, Plus, Minus, Edit2, Trash2,
  TrendingUp, Wallet, Activity, Calendar, Clock, ArrowUp, ArrowDown
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';
import { SmokingCalculator } from './utils/smokingCalculator';
import { Card, Button, Input, StaggeredItem } from './components/Common';
import { cn } from './utils/utils';

// --- MAIN APP COMPONENT ---
const App = () => {
  const [user, setUser] = useState({ name: 'Shareef' }); // Mock logged in for dev
  const [activeTab, setActiveTab] = useState('tracker');
  const [logs, setLogs] = useState([
    { logDate: '2026-06-08', counts: { cigarettes: 12 } },
    { logDate: '2026-06-09', counts: { cigarettes: 15 } },
    { logDate: '2026-06-10', counts: { cigarettes: 8 } },
  ]);
  const [configs, setConfigs] = useState([
    { id: 'cigarettes', name: 'Cigarettes', limit: 20, type: 'CIGARETTE', pricePerUnit: 0.5, excludeFromEconomics: false, displayOrder: 0 }
  ]);

  const [lastEntry, setLastEntry] = useState(Date.now() - 3600000 * 4);

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

  if (!user) return <AuthScreen onLogin={() => setUser({ name: 'Shareef' })} />;

  return (
    <div className="flex flex-col min-h-screen bg-bg-base text-white font-inter selection:bg-accent/30 overflow-hidden">
      <header className="fixed top-0 left-0 right-0 z-50 pt-[env(safe-area-inset-top)] px-8 py-6 bg-gradient-to-b from-black via-black/90 to-transparent flex justify-between items-center">
        <div className="flex flex-col">
          <h1 className="text-4xl font-[900] tracking-[-0.05em] uppercase leading-none">tabak++</h1>
          <span className="text-[10px] font-black tracking-[0.4em] text-accent mt-2 uppercase">
            {activeTab} Vault
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
            <TrackerScreen key="tracker" metrics={metrics} configs={configs} todayLog={todayLog} onIncrement={handleIncrement} onDecrement={handleDecrement} />
          )}
          {activeTab === 'health' && (
            <HealthScreen key="health" lastTimestamp={lastEntry} />
          )}
          {activeTab === 'history' && (
            <HistoryScreen key="history" logs={logs} configs={configs} />
          )}
          {activeTab === 'settings' && (
            <SettingsScreen key="settings" configs={configs} setConfigs={setConfigs} user={user} />
          )}
        </AnimatePresence>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 md:bottom-8 md:left-1/2 md:-translate-x-1/2 md:w-[600px] pb-[env(safe-area-inset-bottom)] bg-black/80 backdrop-blur-3xl border-t md:border border-white/5 md:rounded-[40px] rounded-t-[40px] z-50">
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

// --- COMPONENTS ---

const TabItem = ({ Icon, label, active, onClick }) => (
  <motion.div onClick={onClick} whileTap={{ scale: 0.9 }} className="flex flex-col items-center justify-center flex-1 py-2 cursor-pointer relative">
    <Icon size={20} className={cn("mb-1 transition-colors duration-300", active ? "text-accent" : "text-text-dim")} />
    <span className={cn("text-[9px] font-black tracking-widest uppercase transition-colors duration-300", active ? "text-white" : "text-text-dim")}>
      {label}
    </span>
    {active && <motion.div layoutId="navDot" className="absolute -top-1 w-1 h-1 rounded-full bg-accent" />}
  </motion.div>
);

const AuthScreen = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center p-6 font-inter">
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
        </Card>
      </div>
    </div>
  );
};

const TrackerScreen = ({ metrics, configs, todayLog, onIncrement, onDecrement }) => (
  <div className="flex flex-col space-y-12">
    <StaggeredItem index={0}>
      <Card className="flex flex-col space-y-8 bg-bg-panel/50 border-accent/10">
        <div className="flex justify-between items-end">
          <div>
            <span className="text-[10px] font-black text-text-dim uppercase tracking-widest">Global Status</span>
            <div className="text-4xl font-[900] leading-none mt-2">{Math.max(0, metrics.totalLimit - metrics.totalCount)} <span className="text-sm text-text-dim font-bold tracking-normal uppercase ml-2">Remaining</span></div>
          </div>
          <div className="text-right">
             <span className="text-[10px] font-black text-accent uppercase tracking-widest">{metrics.rank}</span>
             <div className="text-2xl font-black text-text-muted leading-none mt-1">{metrics.xp} XP</div>
          </div>
        </div>
        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
           <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(1, metrics.progress) * 100}%` }} className="h-full bg-white shadow-[0_0_15px_rgba(255,255,255,0.3)]" />
        </div>
      </Card>
    </StaggeredItem>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {configs.sort((a, b) => a.displayOrder - b.displayOrder).map((config, index) => (
        <StaggeredItem key={config.id} index={index + 1}>
          <CounterCard config={config} count={todayLog.counts[config.id] || 0} onIncrement={onIncrement} onDecrement={onDecrement} />
        </StaggeredItem>
      ))}
    </div>
  </div>
);

const CounterCard = ({ config, count, onIncrement, onDecrement }) => {
  const isLimit = count >= config.limit;
  const progress = Math.min(1, count / config.limit);
  return (
    <Card className={cn("relative group overflow-hidden transition-colors duration-500", isLimit && "border-danger/30 shadow-danger/5")}>
      <div className="flex justify-between items-start mb-8">
        <div className="flex flex-col">
          <span className={cn("text-[10px] font-[900] tracking-[0.3em] uppercase", isLimit ? "text-danger" : "text-accent")}>{config.name}</span>
          <span className="text-[9px] font-bold text-text-dim uppercase mt-1">Target: {config.limit}</span>
        </div>
        {isLimit && <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}><Info size={14} className="text-danger" /></motion.div>}
      </div>

      {/* Advanced Burn Visual */}
      <div className={cn("relative w-full h-6 bg-white/[0.03] rounded-full overflow-hidden border border-white/5 mb-12 shadow-inner", isLimit && "bg-danger/5")}>
         {/* White body that decreases as count increases */}
         <motion.div
            animate={{ width: `${(1 - progress) * 100}%` }}
            className={cn("absolute right-0 h-full bg-white transition-colors", isLimit && "bg-danger/20")}
            initial={false}
         />

         {/* The Ember - At the tip of the burning white body */}
         {count > 0 && !isLimit && (
           <motion.div
             animate={{ right: `${(1 - progress) * 100}%` }}
             className="absolute top-1/2 -translate-y-1/2 w-6 h-full z-20"
             style={{
                marginRight: '-12px',
                background: 'radial-gradient(circle at center, #FF3D00 20%, #FFB74D 50%, transparent 80%)'
             }}
           >
              {/* Core Flicker */}
              <motion.div
                animate={{
                  opacity: [0.7, 1, 0.7],
                  scale: [0.9, 1.2, 0.9],
                  boxShadow: [
                    '0 0 10px #FF3D00',
                    '0 0 25px #FFB74D',
                    '0 0 10px #FF3D00'
                  ]
                }}
                transition={{ repeat: Infinity, duration: 0.2 }}
                className="w-2 h-full bg-[#FF3D00] mx-auto rounded-full"
              />
           </motion.div>
         )}

         {/* The "Burned" part (background of the bar) */}
         <div className="absolute inset-0 bg-neutral-900 -z-10" />
      </div>

      <motion.div key={count} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-8xl font-[900] tracking-tighter text-center mb-10 leading-none">
        {count}
      </motion.div>

      <div className="flex justify-center items-center space-x-8">
        <motion.button whileTap={{ scale: 0.8 }} onClick={() => onDecrement(config.id)} className="w-16 h-16 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-text-dim hover:text-white transition-colors">
          <Minus size={24} />
        </motion.button>
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => onIncrement(config.id)} className={cn("w-24 h-24 rounded-full border-2 flex items-center justify-center shadow-xl", isLimit ? "border-danger text-danger bg-danger/5" : "border-white/10 text-white bg-white/5")}>
          <Plus size={36} strokeWidth={3} />
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
        <Card className="bg-success/5 border-success/20 overflow-hidden relative">
          <div className="flex justify-between items-center mb-6 relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-success/20 flex items-center justify-center">
              <Heart className="text-success" size={24} fill="currentColor" />
            </div>
            <div className="text-right">
              <span className="text-[9px] font-black text-text-dim uppercase tracking-widest">Vault Clean Time</span>
              <div className="text-2xl font-black text-success tracking-tighter">{hours}H {mins}M</div>
            </div>
          </div>
          <h2 className="text-3xl font-[900] tracking-tight mb-2 relative z-10">Vitality Hub</h2>
          <p className="text-xs text-text-muted font-medium leading-relaxed max-w-sm relative z-10">Restoring physiological markers based on clinical nonsmoker timelines.</p>
          <div className="absolute top-0 right-0 w-64 h-64 bg-success/5 rounded-full blur-[100px] -mr-32 -mt-32" />
        </Card>
      </StaggeredItem>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {milestones.map((m, i) => (
          <StaggeredItem key={m.title} index={i + 1}>
            <Card className="h-full flex flex-col hover:border-success/30 transition-colors group">
              <div className="flex justify-between items-start mb-6">
                 <div>
                   <span className="text-[9px] font-black text-text-dim uppercase tracking-widest group-hover:text-success transition-colors">{m.progress >= 1 ? 'Phase Complete' : 'Active Repair'}</span>
                   <h4 className="text-lg font-black tracking-tight mt-1">{m.title}</h4>
                 </div>
                 <div className="text-3xl font-black text-success tracking-tighter">{Math.floor(m.progress * 100)}%</div>
              </div>
              <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mb-6">
                 <motion.div initial={{ width: 0 }} animate={{ width: `${m.progress * 100}%` }} className="h-full bg-success" />
              </div>
              <p className="text-xs text-text-muted font-medium leading-relaxed mb-6 flex-1">{m.desc}</p>
              <div className="pt-4 border-t border-white/5 flex justify-between items-center text-text-dim">
                 <div className="flex items-center space-x-2">
                    <History size={12} />
                    <span className="text-[9px] font-black uppercase tracking-widest">Audit Logic</span>
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

const HistoryScreen = ({ logs, configs }) => {
  const chartData = useMemo(() => {
    return [...logs].sort((a, b) => a.logDate.localeCompare(b.logDate)).slice(-7).map(l => ({
      name: new Date(l.logDate).toLocaleDateString('en-US', { weekday: 'short' }),
      val: l.counts.cigarettes || 0
    }));
  }, [logs]);

  const heatmap = useMemo(() => {
    // Random mock heatmap for parity
    return Array.from({ length: 24 }, (_, i) => ({ h: i, v: Math.floor(Math.random() * 10) }));
  }, []);

  return (
    <div className="flex flex-col space-y-8 pb-12">
      {/* Charts Section */}
      <StaggeredItem index={0}>
        <Card className="p-0 overflow-hidden">
          <div className="p-8 pb-4">
             <span className="text-[10px] font-black text-text-dim uppercase tracking-widest">Usage Trends</span>
             <h3 className="text-2xl font-black text-accent mt-1 uppercase">Cigarettes</h3>
          </div>
          <div className="h-[250px] w-full pr-8">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="#666664" fontSize={10} axisLine={false} tickLine={false} dy={10} />
                <Tooltip contentStyle={{ background: '#121214', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                <Line type="monotone" dataKey="val" stroke="#D4FF5C" strokeWidth={4} dot={{ r: 4, fill: '#D4FF5C', strokeWidth: 0 }} activeDot={{ r: 8 }} animationDuration={1500} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </StaggeredItem>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <InsightCard Icon={TrendingUp} label="Streak" val="5" suffix="Days" color="text-orange-400" index={1} />
        <InsightCard Icon={Wallet} label="Spent" val="$142.50" suffix="Total" color="text-emerald-400" index={2} />
        <InsightCard Icon={Activity} label="Health" val="12h 45m" suffix="Lost" color="text-rose-400" index={3} />
      </div>

      {/* Heatmap Section */}
      <StaggeredItem index={4}>
        <Card>
           <span className="text-[10px] font-black text-text-dim uppercase tracking-widest">Peak Activity</span>
           <div className="flex items-end space-x-1 h-24 mt-8">
              {heatmap.map((d, i) => (
                <div key={i} className="flex-1 bg-accent/20 rounded-t-sm relative group" style={{ height: `${d.v * 10}%` }}>
                   <div className="absolute inset-0 bg-accent scale-y-0 group-hover:scale-y-100 origin-bottom transition-transform duration-300" />
                </div>
              ))}
           </div>
           <div className="flex justify-between mt-4 text-[9px] font-black text-text-dim uppercase">
              <span>12 AM</span>
              <span>12 PM</span>
              <span>11 PM</span>
           </div>
        </Card>
      </StaggeredItem>
    </div>
  );
};

const InsightCard = ({ Icon, label, val, suffix, color, index }) => (
  <StaggeredItem index={index}>
    <Card className="flex flex-col items-center text-center py-8">
      <div className={cn("p-4 rounded-2xl bg-white/[0.03] mb-4", color)}>
        <Icon size={24} />
      </div>
      <div className="text-2xl font-black leading-none">{val}</div>
      <div className="text-[10px] font-bold text-text-muted mt-1 uppercase">{suffix}</div>
      <div className="text-[9px] font-black text-text-dim mt-4 uppercase tracking-[0.2em]">{label}</div>
    </Card>
  </StaggeredItem>
);

const SettingsScreen = ({ configs, setConfigs, user }) => {
  const [alias, setAlias] = useState(user.name);
  const [goal, setGoal] = useState('SAVE FOR VACATION');

  return (
    <div className="flex flex-col space-y-8 pb-20">
      {/* Identity Card */}
      <StaggeredItem index={0}>
        <Card>
          <div className="flex items-center space-x-6 mb-10">
             <div className="w-20 h-20 bg-accent/10 rounded-full border-2 border-accent/20 flex items-center justify-center text-3xl font-black text-accent uppercase">
                {alias.charAt(0)}
             </div>
             <div>
                <h4 className="text-2xl font-black tracking-tight">{alias}</h4>
                <span className="text-[10px] font-black text-accent uppercase tracking-widest">Premium Member</span>
             </div>
          </div>
          <div className="space-y-6">
             <Input label="Vault Alias" value={alias} onChange={setAlias} />
             <Input label="Life Goal" value={goal} onChange={setGoal} />
             <Button className="w-full">Sync Identity</Button>
          </div>
        </Card>
      </StaggeredItem>

      {/* Tracker Config */}
      <StaggeredItem index={1}>
        <Card>
          <h4 className="text-[10px] font-black text-text-dim uppercase tracking-[0.2em] mb-8">Vault Configuration</h4>
          <div className="space-y-4">
             {configs.map(c => (
               <div key={c.id} className="flex items-center justify-between p-4 bg-white/[0.02] rounded-2xl border border-white/5">
                  <div className="flex flex-col">
                    <span className="text-sm font-black uppercase">{c.name}</span>
                    <span className="text-[10px] font-bold text-text-dim uppercase">Limit: {c.limit}</span>
                  </div>
                  <div className="flex space-x-2">
                    <button className="p-2 text-text-dim hover:text-white transition-colors"><Edit2 size={16} /></button>
                    <button className="p-2 text-text-dim hover:text-danger transition-colors"><Trash2 size={16} /></button>
                  </div>
               </div>
             ))}
             <Button variant="secondary" className="w-full h-12 border-dashed border-2">
                <Plus size={14} className="mr-2" /> Add Tracker
             </Button>
          </div>
        </Card>
      </StaggeredItem>

      <StaggeredItem index={2}>
        <Card danger className="bg-danger/5">
          <h4 className="text-[10px] font-black text-danger uppercase tracking-[0.2em] mb-6 text-center">Session Termination</h4>
          <div className="grid grid-cols-2 gap-4">
            <Button variant="danger" className="h-12 text-[10px]">Log Out</Button>
            <Button variant="outline" className="h-12 text-[10px] border-danger/30 text-danger hover:bg-danger/10">Wipe Vault</Button>
          </div>
        </Card>
      </StaggeredItem>
    </div>
  );
};

export default App;
