import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Heart, BarChart3, Settings, LogOut,
  ChevronRight, Info, History, Plus, Minus, Edit2, Trash2,
  TrendingUp, Wallet, Activity, Calendar, Clock, ArrowUp, ArrowDown, X,
  Save, AlertCircle, RefreshCcw, Camera, Target, Layout, Type, DollarSign,
  Moon, Check, GripVertical, CheckCircle2, Loader2
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

// --- FIREBASE IMPORTS ---
import { auth, db } from './firebase';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut,
  updateProfile
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  onSnapshot,
  query,
  orderBy,
  limit,
  updateDoc
} from 'firebase/firestore';

import { SmokingCalculator } from './utils/smokingCalculator';
import { Card, Button, Input, StaggeredItem } from './components/Common';
import { cn } from './utils/utils';

// --- THEME CONSTANTS ---
const ACCENTS = [
  { n: 'Lime', v: '#D4FF5C' },
  { n: 'Emerald', v: '#4ADE80' },
  { n: 'Red', v: '#F87171' },
  { n: 'Orange', v: '#FB923C' },
  { n: 'Violet', v: '#A78BFA' },
  { n: 'Pink', v: '#F472B6' }
];

// --- MAIN APP COMPONENT ---
const App = () => {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('tracker');

  // Real Data State
  const [logs, setLogs] = useState([]);
  const [configs, setConfigs] = useState([]);
  const [settings, setSettings] = useState({
    accent: '#D4FF5C',
    isDark: true,
    layout: 'LARGE',
    fontScale: 1,
    nightOwl: false,
    globalPrice: '0.5'
  });

  const today = new Date().toISOString().split('T')[0];

  // 1. Auth Listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
      if (!u) {
        setLogs([]);
        setConfigs([]);
      }
    });
    return unsub;
  }, []);

  // 2. Data Sync (Only if authenticated)
  useEffect(() => {
    if (!user) return;

    // Sync Configs
    const configsUnsub = onSnapshot(collection(db, 'users', user.uid, 'configs'), (snap) => {
      const c = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setConfigs(c.length > 0 ? c : [{ id: 'cigarettes', name: 'Cigarettes', limit: 20, type: 'CIGARETTE', price: 0, order: 0 }]);
    });

    // Sync Logs
    const logsQuery = query(collection(db, 'users', user.uid, 'logs'), orderBy('logDate', 'desc'), limit(30));
    const logsUnsub = onSnapshot(logsQuery, (snap) => {
      setLogs(snap.docs.map(d => d.data()));
    });

    // Sync Settings
    const settingsUnsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setSettings(prev => ({
          ...prev,
          accent: data.accent || '#D4FF5C',
          isDark: data.isDark !== undefined ? data.isDark : true,
          layout: data.layout || 'LARGE',
          fontScale: data.fontScale || 1,
          nightOwl: data.nightOwl !== undefined ? data.nightOwl : false,
          globalPrice: data.globalPrice || '0.5'
        }));
      }
    }, (err) => {
      console.error("Settings sync error:", err);
    });

    return () => {
      configsUnsub();
      logsUnsub();
      settingsUnsub();
    };
  }, [user]);

  const metrics = useMemo(() => {
    const todayLog = logs.find(l => l.logDate === today) || { logDate: today, counts: {} };
    const c = SmokingCalculator.getTotalCount(todayLog, configs);
    const l = SmokingCalculator.getTotalLimit(configs);
    const s = SmokingCalculator.calculateStreak(logs, configs);
    const x = SmokingCalculator.calculateXP(logs, s);
    return {
      count: c, limit: l, streak: s, xp: x,
      rank: SmokingCalculator.getRank(x),
      progress: c / l,
      savings: SmokingCalculator.calculateSavings(logs, configs, parseFloat(settings.globalPrice) || 0),
      lost: SmokingCalculator.calculateLifeLostMinutes(logs),
      todayLog
    };
  }, [logs, configs, settings.globalPrice, today]);

  // Actions
  const onInc = async (id) => {
    if (!user) return;
    const logRef = doc(db, 'users', user.uid, 'logs', today);
    const currentCount = metrics.todayLog.counts[id] || 0;
    await setDoc(logRef, {
      logDate: today,
      counts: { ...metrics.todayLog.counts, [id]: currentCount + 1 }
    }, { merge: true });
  };

  const onDec = async (id) => {
    if (!user) return;
    const currentCount = metrics.todayLog.counts[id] || 0;
    if (currentCount <= 0) return;
    const logRef = doc(db, 'users', user.uid, 'logs', today);
    await setDoc(logRef, {
      counts: { ...metrics.todayLog.counts, [id]: currentCount - 1 }
    }, { merge: true });
  };

  if (authLoading) return <LoadingScreen />;
  if (!user) return <AuthScreen />;

  return (
    <div
      className={cn("flex flex-col min-h-screen bg-bg-base text-white font-inter selection:bg-accent/30 transition-all duration-700", !settings.isDark && "invert-[0.9] hue-rotate-180")}
      style={{ '--accent': settings.accent, fontSize: `${settings.fontScale}rem` }}
    >
      <header className="fixed top-0 left-0 right-0 z-40 pt-[env(safe-area-inset-top)] px-8 md:px-12 py-8 bg-gradient-to-b from-black via-black/80 to-transparent flex justify-between items-center">
        <div className="flex flex-col">
          <h1 className="text-4xl md:text-5xl font-[950] tracking-[-0.05em] uppercase leading-none">tabak++</h1>
          <div className="flex items-center space-x-3 mt-2">
             <div className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
             <span className="text-[10px] font-[900] tracking-[0.4em] text-accent uppercase">{activeTab}</span>
          </div>
        </div>
        <div className="flex items-center space-x-6">
           <div className="hidden md:flex flex-col text-right mr-4">
              <span className="text-[9px] font-black text-text-dim uppercase tracking-widest">{metrics.rank}</span>
              <span className="text-sm font-black text-white">{metrics.xp} XP</span>
           </div>
           <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent font-[950] text-xl shadow-2xl overflow-hidden">
              {user.photoURL ? <img src={user.photoURL} alt="p" className="w-full h-full object-cover" /> : user.displayName?.charAt(0) || 'U'}
           </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pt-40 pb-40 px-6 md:px-12 max-w-7xl mx-auto w-full">
        <AnimatePresence mode="wait">
          {activeTab === 'tracker' && <TrackerScreen key="t" m={metrics} c={configs} onInc={onInc} onDec={onDec} onAdd={() => setActiveTab('settings')} view={settings.layout} />}
          {activeTab === 'health' && <HealthScreen key="h" last={Date.now() - 3600000 * 5} />}
          {activeTab === 'history' && <HistoryScreen key="y" logs={logs} configs={configs} m={metrics} todayString={today} />}
          {activeTab === 'settings' && <SettingsScreen key="s" c={configs} u={user} s={settings} />}
        </AnimatePresence>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 md:bottom-10 md:left-1/2 md:-translate-x-1/2 md:w-[600px] pb-[env(safe-area-inset-bottom)] md:pb-0 z-40 px-4">
        <div className="bg-black/80 backdrop-blur-3xl border border-white/5 rounded-t-[40px] md:rounded-[40px] flex justify-around items-center h-24 md:h-22 px-6 shadow-[0_30px_60px_rgba(0,0,0,0.8)]">
          <TabItem id="tracker" icon={LayoutDashboard} active={activeTab === 'tracker'} onClick={() => setActiveTab('tracker')} label="Vault" />
          <TabItem id="health" icon={Heart} active={activeTab === 'health'} onClick={() => setActiveTab('health')} label="Health" />
          <TabItem id="history" icon={BarChart3} active={activeTab === 'history'} onClick={() => setActiveTab('history')} label="History" />
          <TabItem id="settings" icon={Settings} active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} label="Control" />
        </div>
      </nav>
    </div>
  );
};

// --- COMPONENTS ---

const LoadingScreen = () => (
  <div className="min-h-screen bg-bg-base flex flex-col items-center justify-center space-y-6">
     <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
        <Loader2 className="text-accent" size={48} />
     </motion.div>
     <span className="text-[10px] font-black text-accent tracking-[0.5em] uppercase">Syncing Vault...</span>
  </div>
);

const AuthScreen = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    setLoading(true);
    setError('');
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, pass);
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email, pass);
        await updateProfile(cred.user, { displayName: name });
        await setDoc(doc(db, 'users', cred.user.uid), { name, goal: 'STAY HEALTHY' });
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center p-6 font-inter">
      <div className="w-full max-w-md space-y-16">
        <div className="flex flex-col items-center text-center">
           <div className="w-24 h-24 bg-accent rounded-[36px] flex items-center justify-center mb-10 shadow-[0_0_60px_rgba(212,255,92,0.3)]">
              <LayoutDashboard size={40} className="text-bg-base" />
           </div>
           <h1 className="text-6xl font-[950] tracking-tighter uppercase mb-3 text-white">tabak++</h1>
           <p className="text-accent font-black tracking-[0.5em] text-[10px] uppercase">Identity Verification Required</p>
        </div>
        <Card className="space-y-8 p-10 bg-bg-panel/50 border-white/5 backdrop-blur-sm">
          {error && <div className="p-4 bg-danger/10 border border-danger/20 rounded-2xl text-danger text-[10px] font-bold uppercase tracking-widest">{error}</div>}
          {!isLogin && <Input label="Vault Commander Name" placeholder="Shareef" value={name} onChange={setName} />}
          <Input label="Access Identifier" placeholder="email@vault.com" value={email} onChange={setEmail} />
          <Input label="Security Phrase" type="password" placeholder="••••••••" value={pass} onChange={setPass} />
          <Button className="w-full h-18 text-sm" onClick={handleAuth} disabled={loading}>
            {loading ? <Loader2 className="animate-spin mr-2" size={18} /> : (isLogin ? 'Access Records' : 'Initialize Vault')}
          </Button>
          <div className="flex flex-col space-y-4 items-center">
             <button onClick={() => setIsLogin(!isLogin)} className="text-[10px] font-black text-text-dim uppercase tracking-[0.2em] hover:text-accent transition-colors">
                {isLogin ? "Create New Vault" : "Return to Access point"}
             </button>
             <button onClick={() => signInAnonymously(auth)} className="text-[10px] font-black text-accent/60 uppercase tracking-[0.2em] hover:text-accent transition-colors underline decoration-2 underline-offset-4">
                Enter as Guest Observer
             </button>
          </div>
        </Card>
      </div>
    </div>
  );
};

const TrackerScreen = ({ m, c, onInc, onDec, onAdd, view }) => (
  <div className="flex flex-col space-y-12">
    <StaggeredItem index={0}>
       <Card className="flex flex-col md:flex-row md:items-center md:justify-between space-y-10 md:space-y-0 bg-bg-panel/40 border-accent/10 relative overflow-hidden group p-10">
          <div className="flex-1 space-y-2">
             <span className="text-[10px] font-black text-text-dim uppercase tracking-[0.4em]">Vault Capacity Integrity</span>
             <div className="text-6xl md:text-7xl font-[950] tracking-tighter leading-none flex items-baseline">
                {Math.max(0, m.limit - m.count)}
                <span className="text-sm font-black text-accent uppercase tracking-widest ml-4">Remaining</span>
             </div>
          </div>
          <div className="flex flex-col md:items-end space-y-6 md:w-80">
             <div className="flex justify-between w-full text-[10px] font-black uppercase tracking-widest text-text-muted">
                <span>Rank: {m.rank}</span>
                <span>{m.xp} XP</span>
             </div>
             <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5">
                <motion.div animate={{ width: `${Math.min(1, m.progress) * 100}%` }} className={cn("h-full rounded-full transition-colors duration-1000", m.progress >= 1 ? "bg-danger shadow-[0_0_30px_#F87171]" : "bg-white shadow-[0_0_20px_white]")} />
             </div>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-[100px] -mr-32 -mt-32" />
       </Card>
    </StaggeredItem>

    <div className={cn("grid gap-8", view === 'COMPACT' ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-1 lg:grid-cols-2")}>
      {c.sort((a,b) => a.order - b.order).map((config, i) => (
        <StaggeredItem key={config.id} index={i+1}>
          <CounterCard config={config} count={m.todayLog.counts[config.id] || 0} onInc={onInc} onDec={onDec} compact={view === 'COMPACT'} />
        </StaggeredItem>
      ))}
      <StaggeredItem index={c.length + 1}>
        <button onClick={onAdd} className={cn("w-full h-full border-2 border-dashed border-white/5 rounded-[48px] flex flex-col items-center justify-center space-y-6 hover:bg-white/[0.02] hover:border-accent/20 transition-all group relative overflow-hidden", view === 'COMPACT' ? "min-h-[300px]" : "min-h-[500px]")}>
          <div className="w-20 h-20 rounded-[32px] bg-white/5 flex items-center justify-center group-hover:scale-110 group-hover:bg-accent/10 transition-all shadow-inner">
             <Plus className="text-text-dim group-hover:text-accent" size={32} />
          </div>
          <span className="text-[10px] font-black text-text-dim uppercase tracking-[0.4em] group-hover:text-white transition-colors">Deploy Protocol</span>
        </button>
      </StaggeredItem>
    </div>
  </div>
);

const CounterCard = ({ config, count, onInc, onDec, compact }) => {
  const isL = count >= config.limit;
  const p = Math.min(1, count / config.limit);
  const bodyW = isL ? 0 : (1 - p) * 100;

  return (
    <Card className={cn("relative overflow-hidden flex flex-col transition-all duration-1000", isL ? "bg-danger/[0.03] border-danger/40 shadow-[0_0_50px_rgba(248,113,113,0.1)]" : "hover:shadow-2xl", compact ? "p-8 min-h-[350px]" : "p-12 min-h-[500px]")}>
       <div className="flex justify-between items-start relative z-20">
          <div className="space-y-1">
             <span className={cn("text-[11px] font-[950] tracking-[0.5em] uppercase", isL ? "text-danger" : "text-accent")}>{config.name}</span>
             {!compact && <span className="text-[9px] font-black text-text-dim uppercase tracking-widest block">Daily Protocol: {config.limit}</span>}
          </div>
          {isL && <motion.div animate={{ scale: [1,1.2,1], opacity: [1,0.5,1] }} transition={{ repeat: Infinity, duration: 1 }} className="p-2 bg-danger/10 rounded-xl border border-danger/20 text-danger"><AlertCircle size={14} /></motion.div>}
       </div>

       <div className="flex-1 flex flex-col items-center justify-center w-full relative z-10 py-10">
          {/* HIGH FIDELITY BURNING CIGARETTE - CORRECT DIRECTION */}
          <div className={cn("relative w-full h-12 rounded-full overflow-hidden border border-white/5 mb-14 shadow-[inset_0_4px_20px_rgba(0,0,0,0.6)] transition-all duration-1000", isL ? "bg-danger shadow-[0_0_40px_#F87171]" : "bg-bg-panel/90")}>
             {/* White Body - Burns Left to Right */}
             <motion.div
               animate={{ width: `${bodyW}%` }}
               className="absolute right-0 inset-y-0 bg-gradient-to-l from-white to-neutral-200 z-10"
               transition={{ type: 'spring', stiffness: 35, damping: 12 }}
             />

             {/* Ember Tip */}
             {!isL && count > 0 && (
               <motion.div
                 animate={{ right: `${bodyW}%` }}
                 className="absolute inset-y-0 w-12 translate-x-1/2 z-20 flex items-center justify-center"
                 transition={{ type: 'spring', stiffness: 35, damping: 12 }}
               >
                  <motion.div animate={{ scale: [1,1.5,1], opacity: [0.3,0.6,0.3] }} transition={{ repeat: Infinity, duration: 0.15 }} className="absolute inset-0 bg-radial-gradient from-[#FF3D00] to-transparent blur-xl" />
                  <motion.div animate={{ scale: [0.9,1.2,0.9], x: [-1,1,0] }} transition={{ repeat: Infinity, duration: 0.08 }} className="w-5 h-full bg-[#FF3D00] rounded-full shadow-[0_0_30px_#FF3D00]" />
               </motion.div>
             )}

             {/* Filter (Roach) - Eaten at limit */}
             <motion.div
               animate={{ width: isL ? '0%' : '28%', opacity: isL ? 0 : 1 }}
               className="absolute inset-y-0 right-0 bg-[#D97706] z-[11] shadow-2xl origin-right transition-all duration-1000"
             />

             <div className="absolute inset-0 bg-neutral-950/90 -z-10" />
          </div>

          <motion.div key={count} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={cn("font-[950] tracking-[-0.08em] leading-none", compact ? "text-8xl" : "text-[10rem]")}>
             {count}
          </motion.div>
       </div>

       <div className="flex justify-center items-center space-x-10 relative z-20">
          <motion.button whileTap={{ scale: 0.8 }} onClick={() => onDec(config.id)} className="w-16 h-16 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-text-dim hover:text-white transition-all shadow-xl">
             <Minus size={24} />
          </motion.button>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => onInc(config.id)} className={cn("rounded-[36px] flex items-center justify-center shadow-2xl transition-all duration-700 border-2", compact ? "w-28 h-20" : "w-40 h-28", isL ? "border-danger text-danger bg-danger/10 shadow-danger/20" : "border-white/10 text-white bg-bg-panel hover:border-accent hover:text-accent")}>
             <Plus size={compact ? 36 : 56} strokeWidth={4} />
          </motion.button>
       </div>
    </Card>
  );
};

const HealthScreen = ({ last }) => {
  const miles = useMemo(() => SmokingCalculator.calculateRecoveryMilestones(last), [last]);
  const diff = Date.now() - last;
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return (
    <div className="flex flex-col space-y-12">
       <StaggeredItem index={0}>
          <Card className="bg-success/5 border-success/20 overflow-hidden relative p-12">
             <div className="flex justify-between items-center mb-12 relative z-10">
                <div className="w-20 h-20 rounded-[32px] bg-success/20 flex items-center justify-center border border-success/30 shadow-2xl text-success"><Heart size={40} fill="currentColor" /></div>
                <div className="text-right">
                   <span className="text-[10px] font-black text-text-dim uppercase tracking-[0.4em]">Vault Security State</span>
                   <div className="text-5xl font-[950] text-success tracking-tighter mt-2">{h}H {m}M</div>
                </div>
             </div>
             <h2 className="text-4xl font-[950] tracking-tighter uppercase mb-3 relative z-10">Biological Repair</h2>
             <p className="text-sm text-text-muted font-bold leading-relaxed max-w-lg relative z-10">Sequences are actively re-aligning. Cellular regeneration verified.</p>
             <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-success/10 rounded-full blur-[150px] -mr-64 -mt-64" />
          </Card>
       </StaggeredItem>
       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {miles.map((m, i) => (
             <StaggeredItem key={m.title} index={i+1}>
                <Card className="h-full flex flex-col group p-10 border-white/5 shadow-inner">
                   <div className="flex justify-between items-start mb-10">
                      <div className="space-y-1">
                         <span className={cn("text-[10px] font-black uppercase tracking-[0.4em]", m.progress >= 1 ? "text-success" : "text-text-dim")}>{m.progress >= 1 ? 'Stabilized' : 'Repairing'}</span>
                         <h4 className="text-2xl font-[950] tracking-tighter uppercase leading-none mt-2">{m.title}</h4>
                      </div>
                      <div className="text-5xl font-[950] text-success tracking-tighter">{Math.floor(m.progress * 100)}%</div>
                   </div>
                   <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden mb-10 border border-white/5">
                      <motion.div animate={{ width: `${m.progress * 100}%` }} className="h-full bg-success shadow-[0_0_20px_rgba(74,222,128,0.6)]" />
                   </div>
                   <p className="text-sm text-text-muted font-bold leading-relaxed mb-10 flex-1 border-l-2 border-white/5 pl-6">{m.desc}</p>
                </Card>
             </StaggeredItem>
          ))}
       </div>
    </div>
  );
};

const HistoryScreen = ({ logs, configs, todayString, onEdit, m }) => {
  const chartData = useMemo(() => {
    return [...logs].sort((a,b) => a.logDate.localeCompare(b.logDate)).slice(-7).map(l => ({
      name: new Date(l.logDate).toLocaleDateString(undefined, { weekday: 'short' }).toUpperCase(),
      val: l.counts.cigarettes || 0
    }));
  }, [logs]);
  return (
    <div className="flex flex-col space-y-10 pb-20">
       <StaggeredItem index={0}>
          <Card className="p-0 overflow-hidden border-accent/20 bg-bg-panel/40 shadow-2xl">
             <div className="p-12 pb-8 flex justify-between items-start">
                <div className="space-y-1">
                   <span className="text-[10px] font-black text-text-dim uppercase tracking-[0.4em]">Analytics Engine</span>
                   <h3 className="text-4xl font-[950] text-accent mt-1 uppercase tracking-tighter leading-none">Usage Volatility</h3>
                </div>
                <div className="p-4 bg-accent/10 rounded-3xl"><BarChart3 className="text-accent" size={32} /></div>
             </div>
             <div className="h-[300px] w-full pr-12 pl-4 pb-8">
                <ResponsiveContainer width="100%" height="100%">
                   <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="6 6" stroke="rgba(255,255,255,0.02)" vertical={false} />
                      <XAxis dataKey="name" stroke="#666664" fontSize={10} axisLine={false} tickLine={false} dy={20} />
                      <Tooltip contentStyle={{ background: '#0D0D0E', border: '1px solid rgba(212,255,92,0.3)', borderRadius: '20px', fontWeight: '950', fontSize: '14px' }} />
                      <Line type="stepAfter" dataKey="val" stroke="#D4FF5C" strokeWidth={6} dot={{ r: 6, fill: '#D4FF5C' }} animationDuration={2000} />
                   </LineChart>
                </ResponsiveContainer>
             </div>
          </Card>
       </StaggeredItem>

       <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <InsightCard Icon={TrendingUp} label="Current Streak" val={m.streak} suffix="Days Active" color="text-orange-400" index={1} />
          <InsightCard Icon={Wallet} label="Vault Savings" val={`$${m.savings.toFixed(2)}`} suffix="Total Financial" color="text-emerald-400" index={2} />
          <InsightCard Icon={Activity} label="Health Impact" val={`${Math.floor(m.lost/60)}H ${m.lost%60}M`} suffix="Lost Capacity" color="text-rose-400" index={3} />
       </div>

       <div className="space-y-8 pt-10 px-2">
          {logs.sort((a,b) => b.logDate.localeCompare(a.logDate)).map((log, i) => (
             <motion.div key={log.logDate} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i*0.05 }}>
                <Card className="py-10 flex items-center justify-between group border-white/5 hover:border-accent/20">
                   <div className="flex flex-col space-y-1">
                      <span className="text-2xl font-[950] tracking-tight uppercase leading-none">{log.logDate === todayString ? 'Today' : new Date(log.logDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', weekday: 'long'})}</span>
                      <span className="text-[10px] font-black text-text-dim uppercase tracking-[0.4em] mt-2 flex items-center">
                         <History size={12} className="mr-2" /> {Object.values(log.counts).reduce((a,b)=>a+b, 0)} logs committed
                      </span>
                   </div>
                   <div className="flex items-center space-x-8">
                      <div className="flex -space-x-4">
                         {Object.entries(log.counts).map(([cid, count]) => (
                           <div key={cid} className="w-14 h-14 rounded-full bg-bg-panel border-4 border-bg-card flex items-center justify-center font-[950] text-sm shadow-2xl">{count}</div>
                         ))}
                      </div>
                      <button onClick={() => onEdit(log)} className="p-4 rounded-2xl bg-white/5 text-text-dim hover:text-accent opacity-0 group-hover:opacity-100 transition-all border border-white/5"><Edit2 size={18} /></button>
                   </div>
                </Card>
             </motion.div>
          ))}
       </div>
    </div>
  );
};

const SettingsScreen = ({ c, setC, u, setU, onAdd, acc, setAcc, dark, setDark, view, setView, scale, setScale, owl, setOwl, price, setPrice }) => {
  const [alias, setAlias] = useState(u.name);
  return (
    <div className="flex flex-col space-y-12 pb-32">
       <Card className="p-12 relative overflow-hidden bg-bg-panel/40 border-white/5 shadow-2xl">
          <div className="flex items-center space-x-10 mb-14 relative z-10">
             <div className="w-28 h-28 bg-gradient-to-br from-accent/30 to-accent/5 rounded-[42px] border-2 border-accent/20 flex items-center justify-center text-5xl font-[950] text-accent uppercase shadow-2xl">
                {alias.charAt(0)}
             </div>
             <div><h4 className="text-4xl font-[950] tracking-tighter uppercase leading-none">{alias}</h4><span className="text-[10px] font-black text-accent uppercase tracking-[0.5em] mt-2 block italic">Vault Commander</span></div>
          </div>
          <div className="space-y-10 relative z-10">
             <Input label="Vault Identifier Alias" value={alias} onChange={setAlias} />
             <Button className="w-full h-20 shadow-2xl" onClick={() => setU({...u, name: alias})}>Update Parameters</Button>
          </div>
       </Card>

       <Card className="p-12 space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <Toggle icon={Moon} label="Obsidian Mode" active={dark} onClick={() => setDark(!dark)} />
             <Toggle icon={Clock} label="Night Owl Mode" active={owl} onClick={() => setOwl(!owl)} />
             <Toggle icon={Grid} label="Matrix Layout" active={view === 'COMPACT'} onClick={() => setView(view === 'LARGE' ? 'COMPACT' : 'LARGE')} />
             <div className="p-6 bg-white/[0.02] rounded-3xl border border-white/5 space-y-6">
                <span className="text-[10px] font-black text-text-dim uppercase tracking-[0.4em] ml-1">Accent Spectrum</span>
                <div className="flex flex-wrap gap-4">{ACCENTS.map(x => (
                   <button key={x.v} onClick={() => setAcc(x.v)} className={cn("w-12 h-12 rounded-2xl border-4 transition-all duration-500", acc === x.v ? "border-white scale-110" : "border-transparent opacity-40 hover:opacity-100")} style={{ backgroundColor: x.v }} />
                ))}</div>
             </div>
          </div>
          <div className="pt-4"><span className="text-[10px] font-black text-text-dim uppercase tracking-[0.4em] mb-8 block">Typography Scale: {Math.round(scale*100)}%</span><input type="range" min="0.8" max="1.3" step="0.1" value={scale} onChange={e => setScale(parseFloat(e.target.value))} className="w-full h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer accent-accent shadow-inner" /></div>
       </Card>

       <Card className="p-12">
          <h4 className="text-2xl font-[950] uppercase tracking-tighter leading-none mb-10">System Protocols</h4>
          <div className="space-y-10">
             <Input label="Global Unit Price ($)" value={price} onChange={setPrice} type="number" />
             <div className="space-y-4 pt-6">{c.map(x => (
                <div key={x.id} className="flex items-center justify-between p-8 bg-white/[0.02] rounded-[36px] border border-white/5 group hover:border-accent/20 transition-all duration-700">
                   <div className="flex flex-col space-y-2">
                      <span className="text-lg font-[950] uppercase leading-none group-hover:text-accent transition-colors">{x.name}</span>
                      <span className="text-[10px] font-black text-text-dim uppercase tracking-widest">Protocol: {x.limit} units • {x.type}</span>
                   </div>
                   <button onClick={() => setC(c.filter(y => y.id !== x.id))} className="p-4 rounded-2xl bg-danger/5 text-danger/40 hover:text-danger border border-danger/5 shadow-xl opacity-0 group-hover:opacity-100 duration-500"><Trash2 size={18} /></button>
                </div>
             ))}</div>
             <Button variant="secondary" className="w-full border-dashed border-2 rounded-[36px] h-20" onClick={onAdd}><Plus className="mr-4" size={24} /> Deploy Tracker</Button>
          </div>
       </Card>

       <Button variant="danger" className="w-full h-20 shadow-2xl" onClick={() => signOut(auth)}>Terminate Current Session</Button>
    </div>
  );
};

// --- HELPERS ---

const NavItem = ({ icon: Icon, active, onClick, label }) => (
  <motion.div onClick={onClick} whileTap={{ scale: 0.85 }} className="flex flex-col items-center justify-center flex-1 py-4 cursor-pointer relative group">
    <Icon size={24} className={cn("mb-2 transition-all duration-700", active ? "text-accent scale-110 drop-shadow-[0_0_12px_#D4FF5C]" : "text-text-dim group-hover:text-text-muted")} />
    <span className={cn("text-[9px] font-black tracking-[0.2em] uppercase transition-colors duration-500", active ? "text-white" : "text-text-dim")}>{label}</span>
    {active && <motion.div layoutId="navDot" className="absolute -top-1 w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_20px_#D4FF5C]" />}
  </motion.div>
);

const Toggle = ({ icon: Icon, label, active, onClick }) => (
  <div className="flex items-center justify-between p-8 bg-white/[0.02] rounded-[36px] border border-white/5 shadow-inner">
     <div className="flex items-center space-x-5">
        <div className="p-4 bg-white/5 rounded-2xl text-text-muted shadow-lg"><Icon size={24} /></div>
        <span className="text-[11px] font-[950] uppercase tracking-[0.4em] leading-none">{label}</span>
     </div>
     <button onClick={onClick} className={cn("w-16 h-9 rounded-full p-1.5 transition-all duration-700 border border-white/5 shadow-inner", active ? "bg-accent" : "bg-white/10")}>
        <div className={cn("w-6 h-6 rounded-full bg-white transition-all duration-700 shadow-2xl", active ? "translate-x-7" : "translate-x-0")} />
     </button>
  </div>
);

const Overlay = ({ children, onClose, title }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/90 backdrop-blur-2xl">
     <motion.div initial={{ y: 100, scale: 0.95, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: 100, scale: 0.95, opacity: 0 }} className="w-full max-w-lg">
        <Card className="p-12 relative border-accent/40 shadow-[0_0_120px_rgba(212,255,92,0.15)] bg-bg-panel/95">
           <button onClick={onClose} className="absolute top-10 right-10 p-4 rounded-3xl bg-white/5 text-text-dim hover:text-white transition-all border border-white/5 shadow-2xl"><X size={24} /></button>
           <h3 className="text-3xl font-[950] tracking-tighter uppercase leading-none text-accent mb-12">{title}</h3>
           {children}
        </Card>
     </motion.div>
  </div>
);

const InsightCard = ({ Icon, label, val, suffix, color, index }) => (
  <StaggeredItem index={index}>
    <Card className="flex flex-col items-center text-center py-12 bg-bg-panel/40 border-white/5 shadow-2xl group relative overflow-hidden">
      <div className={cn("p-6 rounded-[32px] bg-white/[0.03] mb-8 transition-all duration-1000 group-hover:scale-110", color)}>
        <Icon size={36} />
      </div>
      <div className="text-5xl font-[950] leading-none tracking-tighter mb-2 transition-all duration-700 group-hover:scale-105">{val}</div>
      <div className="text-[10px] font-black text-text-muted uppercase tracking-[0.4em]">{suffix}</div>
      <div className="mt-12 pt-8 border-t border-white/5 w-full flex items-center justify-center opacity-40">
        <span className="text-[9px] font-[950] text-text-dim uppercase tracking-[0.5em]">{label}</span>
      </div>
    </Card>
  </StaggeredItem>
);

export default App;
