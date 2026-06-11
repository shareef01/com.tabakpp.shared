import React, { useState, useMemo, useEffect, Component } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Heart, BarChart3, Settings, LogOut,
  ChevronRight, Info, History, Plus, Minus, Edit2, Trash2,
  TrendingUp, Wallet, Activity, Calendar, Clock, ArrowUp, ArrowDown, X,
  Save, AlertCircle, RefreshCcw, Camera, Target, Layout, Type, Grid,
  Database, ShieldCheck, Flame, Loader2, InfoIcon, User, UserCircle, Moon, Check
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

// --- FIREBASE ---
import { auth, db } from './firebase';
import {
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signInAnonymously, signOut, updateProfile
} from 'firebase/auth';
import {
  doc, setDoc, collection, onSnapshot, query, orderBy, limit, deleteDoc, updateDoc
} from 'firebase/firestore';

import { SmokingCalculator } from './utils/smokingCalculator';
import { Card, Button, Input, StaggeredItem } from './components/Common';
import { cn } from './utils/utils';

// --- ERROR BOUNDARY ---
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#020202] flex flex-col items-center justify-center p-12 text-center text-white font-inter">
          <div className="p-8 bg-danger/10 rounded-[32px] text-danger border border-danger/20 shadow-2xl mb-8"><AlertCircle size={48} /></div>
          <h2 className="text-3xl font-[950] uppercase tracking-tighter leading-none">System Malfunction</h2>
          <p className="text-text-dim text-sm mt-4 mb-10 max-w-xs font-bold opacity-60 leading-relaxed">{this.state.error?.message}</p>
          <Button onClick={() => window.location.reload()} className="w-64 h-16 rounded-full shadow-2xl">Re-Initialize Vault</Button>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- UTILS ---
const hexToRgb = (hex) => {
  const h = hex || '#D4FF5C';
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(h);
  return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '212, 255, 92';
};

const ACCENTS = [
  { n: 'Lime', v: '#D4FF5C' }, { n: 'Emerald', v: '#4ADE80' }, { n: 'Red', v: '#F87171' },
  { n: 'Orange', v: '#FB923C' }, { n: 'Violet', v: '#A78BFA' }, { n: 'Pink', v: '#F472B6' }
];

// --- MAIN APP ---
const App = () => {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('tracker');
  const [appError, setAppError] = useState(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const [logs, setLogs] = useState([]);
  const [configs, setConfigs] = useState([]);
  const [settings, setSettings] = useState({
    accent: '#D4FF5C', isDark: true, layout: 'LARGE', fontScale: 1, nightOwl: false, globalPrice: '0.5', goal: 'SAVE FOR VACATION'
  });

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
      if (!u) { setLogs([]); setConfigs([]); }
    }, (err) => {
      setAppError("Auth denied: " + err.message);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    try {
      const uid = user.uid;
      const cUnsub = onSnapshot(collection(db, 'users', uid, 'configs'), (snap) => {
        const c = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setConfigs(c.length > 0 ? c : [{ id: 'cigarettes', name: 'Cigarettes', limit: 20, type: 'CIGARETTE', price: 0, order: 0 }]);
      });
      const lUnsub = onSnapshot(query(collection(db, 'users', uid, 'logs'), orderBy('logDate', 'desc'), limit(30)), (snap) => {
        setLogs(snap.docs.map(d => d.data()));
      });
      const sUnsub = onSnapshot(doc(db, 'users', uid), (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          setSettings(p => ({
            ...p,
            accent: d.accent || '#D4FF5C',
            isDark: d.isDark ?? true,
            layout: d.layout || 'LARGE',
            fontScale: d.fontScale || 1,
            nightOwl: d.nightOwl ?? false,
            globalPrice: d.globalPrice || '0.5',
            goal: d.goal || 'SAVE FOR VACATION'
          }));
        }
      });
      return () => { cUnsub(); lUnsub(); sUnsub(); };
    } catch (err) { setAppError("Sync Failure: " + err.message); }
  }, [user]);

  const metrics = useMemo(() => {
    const tLog = logs.find(l => l.logDate === today) || { logDate: today, counts: {} };
    const c = SmokingCalculator.getTotalCount(tLog, configs);
    const l = SmokingCalculator.getTotalLimit(configs);
    const s = SmokingCalculator.calculateStreak(logs, configs);
    const x = SmokingCalculator.calculateXP(logs, s);
    return {
      count: c, limit: l, streak: s, xp: x, rank: SmokingCalculator.getRank(x),
      progress: l > 0 ? c / l : 0,
      savings: SmokingCalculator.calculateSavings(logs, configs, parseFloat(settings.globalPrice) || 0) || 0,
      lost: SmokingCalculator.calculateLifeLostMinutes(logs) || 0,
      todayLog: tLog,
      coach: generateCoach(c, l, s)
    };
  }, [logs, configs, settings.globalPrice, today]);

  function generateCoach(count, limit, streak) {
    const p = limit > 0 ? count / limit : 0;
    if (count === 0 && streak > 0) return `Perfect start! You're on a ${streak}-day streak.`;
    if (p >= 1.0) return "Threshold reached. Security mode active.";
    return "Every session tracked is a step toward optimization.";
  }

  const onInc = async (id) => {
    if (!user) return;
    const ref = doc(db, 'users', user.uid, 'logs', today);
    const counts = metrics.todayLog.counts || {};
    await setDoc(ref, { logDate: today, counts: { ...counts, [id]: (counts[id] || 0) + 1 } }, { merge: true });
  };

  const onDec = async (id) => {
    if (!user) return;
    const counts = metrics.todayLog.counts || {};
    if (!counts[id] || counts[id] <= 0) return;
    const ref = doc(db, 'users', user.uid, 'logs', today);
    await setDoc(ref, { counts: { ...counts, [id]: counts[id] - 1 } }, { merge: true });
  };

  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  if (appError) return <ErrorView msg={appError} />;
  if (authLoading) return <LoadingView />;
  if (!user) return <AuthScreen />;

  const themeClass = settings.isDark ? "bg-[#020202] text-white" : "bg-[#F0F2F5] text-[#1A1C1E]";

  return (
    <ErrorBoundary>
    <div
      className={cn("flex flex-col min-h-screen font-inter transition-all duration-700 overflow-hidden", themeClass)}
      style={{
        '--accent': settings.accent,
        '--accent-rgb': hexToRgb(settings.accent),
        fontSize: `${settings.fontScale}rem`
      }}
    >
      {/* HEADER */}
      <header className="fixed top-0 left-0 right-0 z-50 pt-[env(safe-area-inset-top)] px-8 py-8 flex justify-between items-center bg-inherit">
        <div className="flex flex-col">
          <h1 className="text-4xl font-[1000] tracking-tighter uppercase leading-none">tabak++</h1>
          <div className="flex items-center space-x-2 mt-2">
            <div className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse shadow-[0_0_10px_var(--accent)]" />
            <span className="text-[10px] font-black tracking-[0.4em] uppercase opacity-60 text-accent">{activeTab}</span>
          </div>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent overflow-hidden shadow-2xl transition-all active:scale-90"
          >
            {user.photoURL ? <img src={user.photoURL} alt="p" className="w-full h-full object-cover" /> : <UserCircle size={28} />}
          </button>

          <AnimatePresence>
            {showProfileMenu && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className={cn("absolute right-0 mt-4 w-48 rounded-3xl p-2 shadow-2xl border backdrop-blur-3xl z-[100]", settings.isDark ? "bg-black/90 border-white/10" : "bg-white border-black/5")}
              >
                <button onClick={() => { setActiveTab('settings'); setShowProfileMenu(false); }} className="w-full flex items-center space-x-3 p-4 rounded-2xl hover:bg-accent/10 transition-colors text-sm font-bold uppercase tracking-widest"><Settings size={18} /><span>Profile</span></button>
                <button onClick={() => { signOut(auth); setShowProfileMenu(false); }} className="w-full flex items-center space-x-3 p-4 rounded-2xl hover:bg-danger/10 text-danger transition-colors text-sm font-bold uppercase tracking-widest border-t border-white/5 mt-1"><LogOut size={18} /><span>Log Out</span></button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* CONTENT */}
      <main className="flex-1 overflow-y-auto pt-40 pb-44 px-6 max-w-6xl mx-auto w-full transition-all duration-500">
        <AnimatePresence mode="wait">
          {activeTab === 'tracker' && <TrackerScreen key="t" m={metrics} c={configs} onInc={onInc} onDec={onDec} onAdd={() => setActiveTab('settings')} view={settings.layout} isDark={settings.isDark} />}
          {activeTab === 'health' && <HealthScreen key="h" last={Date.now() - 3600000 * 4} isDark={settings.isDark} />}
          {activeTab === 'history' && <HistoryScreen key="y" logs={logs} configs={configs} m={metrics} todayString={today} onEdit={setEditTarget} isDark={settings.isDark} />}
          {activeTab === 'settings' && <SettingsScreen key="s" c={configs} u={user} s={settings} onAdd={() => setShowAdd(true)} onUpd={(upd) => updateDoc(doc(db, 'users', user.uid), upd)} onReo={async (id, dir) => {
                const idx = configs.findIndex(x => x.id === id);
                if ((dir === 'up' && idx > 0) || (dir === 'down' && idx < configs.length - 1)) {
                   const n = [...configs]; const swap = dir === 'up' ? idx - 1 : idx + 1;
                   [n[idx], n[swap]] = [n[swap], n[idx]]; const final = n.map((x, i) => ({ ...x, order: i }));
                   setConfigs(final);
                   for (const x of final) { await updateDoc(doc(db, 'users', user.uid, 'configs', x.id), { order: x.order }); }
                }
              }} onDel={async (id) => { await deleteDoc(doc(db, 'users', user.uid, 'configs', id)); }} />}
        </AnimatePresence>
      </main>

      {/* NAV */}
      <nav className="fixed bottom-0 left-0 right-0 md:bottom-10 md:left-1/2 md:-translate-x-1/2 md:w-[600px] pb-[env(safe-area-inset-bottom)] md:pb-0 z-[60] px-4">
        <div className={cn("backdrop-blur-3xl border rounded-t-[40px] md:rounded-[40px] flex justify-around items-center h-24 md:h-22 px-6 shadow-2xl transition-all duration-500", settings.isDark ? "bg-black/80 border-white/5" : "bg-white/80 border-black/5 shadow-black/5")}>
          <NavItem id="tracker" icon={LayoutDashboard} active={activeTab === 'tracker'} onClick={() => setActiveTab('tracker')} label="tracker" isDark={settings.isDark} />
          <NavItem id="health" icon={Heart} active={activeTab === 'health'} onClick={() => setActiveTab('health')} label="health" isDark={settings.isDark} />
          <NavItem id="history" icon={BarChart3} active={activeTab === 'history'} onClick={() => setActiveTab('history')} label="vault" isDark={settings.isDark} />
          <NavItem id="settings" icon={Settings} active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} label="control" isDark={settings.isDark} />
        </div>
      </nav>

      {/* OVERLAYS */}
      <AnimatePresence>
        {showAdd && <Overlay onClose={() => setShowAdd(false)} title="New Protocol" isDark={settings.isDark}><AddForm onAdd={async (n, t, l) => { const id = Math.random().toString(36).substr(2, 9); await setDoc(doc(db, 'users', user.uid, 'configs', id), { name: n, type: t, limit: parseInt(l) || 20, order: configs.length }); setShowAdd(false); }} /></Overlay>}
        {editTarget && <Overlay onClose={() => setEditTarget(null)} title="Override Data" isDark={settings.isDark}><EditForm log={editTarget} configs={configs} onSave={async (d, c) => { await setDoc(doc(db, 'users', user.uid, 'logs', d), { counts: c }, { merge: true }); setEditTarget(null); }} isDark={settings.isDark} /></Overlay>}
      </AnimatePresence>
    </div>
    </ErrorBoundary>
  );
};

// --- SUB-COMPONENTS ---

const NavItem = ({ icon: Icon, active, onClick, label, isDark }) => (
  <motion.div onClick={onClick} whileTap={{ scale: 0.8 }} className="flex flex-col items-center justify-center flex-1 py-5 cursor-pointer relative group">
    <Icon size={26} className={cn("mb-2 transition-all duration-700", active ? "text-accent scale-110 drop-shadow-[0_0_15px_var(--accent)]" : "text-text-dim group-hover:text-text-muted")} />
    <span className={cn("text-[9px] font-[1000] tracking-[0.2em] uppercase transition-colors duration-500", active ? (isDark ? "text-white" : "text-black") : "text-text-dim")}>{label}</span>
    {active && <motion.div layoutId="navDot" className="absolute -top-1 w-2 h-2 rounded-full bg-accent shadow-[0_0_20px_var(--accent)]" />}
  </motion.div>
);

const TrackerScreen = ({ m, c, onInc, onDec, view, isDark }) => (
  <div className="flex flex-col space-y-12 pb-10">
    <StaggeredItem index={0}>
       <Card className={cn("p-12 relative overflow-hidden group shadow-2xl", isDark ? "bg-white/[0.03] border-white/5" : "bg-white border-black/5 shadow-black/5")}>
          <div className="flex justify-between items-end relative z-10 text-white">
             <div className="space-y-2">
                <span className="text-[10px] font-black text-text-dim uppercase tracking-[0.4em]">Vault Integrity</span>
                <div className={cn("text-7xl font-[1000] tracking-tighter leading-none transition-colors", !isDark && "text-[#1A1C1E]")}>{Math.max(0, m.limit - m.count)} <span className="text-base text-accent uppercase tracking-widest font-black ml-4 leading-none">Remaining</span></div>
             </div>
             <div className="text-right space-y-3 hidden md:block">
                <div className="px-4 py-2 bg-accent/10 rounded-2xl text-accent text-[10px] font-black uppercase border border-accent/20">{m.rank}</div>
                <div className={cn("text-4xl font-[1000] opacity-40 leading-none tracking-tighter", !isDark && "text-[#1A1C1E]")}>{m.xp} XP</div>
             </div>
          </div>
          <div className="w-full h-3.5 bg-black/10 rounded-full overflow-hidden mt-12 p-0.5 border border-white/5 relative z-10 shadow-inner">
             <motion.div animate={{ width: `${Math.min(1, m.progress) * 100}%` }} className={cn("h-full rounded-full transition-all duration-1000 shadow-2xl", m.progress >= 1 ? "bg-danger shadow-[0_0_30px_#F87171]" : "bg-accent shadow-[0_0_20px_var(--accent)]")} />
          </div>
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[150px] -mr-64 -mt-64" />
       </Card>
    </StaggeredItem>

    <div className={cn("grid gap-10", view === 'COMPACT' ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-1 lg:grid-cols-2")}>
       {c.sort((a,b) => a.order - b.order).map((config, i) => <StaggeredItem key={config.id} index={i+1}><CounterCard config={config} count={(m.todayLog.counts || {})[config.id] || 0} onInc={onInc} onDec={onDec} isC={view === 'COMPACT'} isDark={isDark} /></StaggeredItem>)}
    </div>
  </div>
);

const CounterCard = ({ config, count, onInc, onDec, isC, isDark }) => {
  const isL = count >= config.limit;
  const p = Math.min(1, count / config.limit);
  const isCig = config.type === 'CIGARETTE';
  const isJoint = config.type.startsWith('JOINT');

  return (
    <Card className={cn("relative flex flex-col group transition-all duration-1000 p-12 overflow-hidden shadow-2xl", isL ? "bg-danger/[0.04] border-danger/50 shadow-[0_0_60px_rgba(248,113,113,0.15)]" : (isDark ? "bg-white/[0.03] border-white/5" : "bg-white border-black/5"), isC ? "min-h-[420px]" : "min-h-[580px]")}>
       <div className="flex flex-col items-center text-center space-y-2 mb-10 relative z-20">
          <span className={cn("text-[12px] font-[1000] tracking-[0.5em] uppercase transition-all duration-700", isL ? "text-danger" : "text-accent")}>{config.name}</span>
          <span className="text-[10px] font-black text-text-dim uppercase tracking-[0.2em] opacity-60 font-black">Daily Target: {config.limit}</span>
       </div>

       <div className="flex-1 flex flex-col items-center justify-center relative z-10 py-10">
          {(isCig || isJoint) ? (
             <div className={cn("relative w-full h-14 rounded-full overflow-hidden transition-all duration-1000 border", isL ? "bg-danger border-danger/40 shadow-[0_0_50px_#F87171]" : (isDark ? "bg-[#111] border-white/5 shadow-[inset_0_4px_20px_rgba(0,0,0,0.8)]" : "bg-[#EEE] border-black/5 shadow-inner"))}>
                {/* Ash Side (Spent) */}
                <div
                   className={cn("absolute left-0 inset-y-0 bg-[#1a1a1a] transition-all duration-700", isL && "bg-danger/20 w-full")}
                   style={{ width: isL ? '100%' : `${p * 72}%` }}
                />
                {/* STATIC RED EMBER */}
                {!isL && count > 0 && (
                   <div
                      className="absolute inset-y-0 w-3 bg-[#FF3D00] shadow-[0_0_20px_#FF3D00] z-20"
                      style={{ left: `calc(${p * 72}% - 1.5px)` }}
                   />
                )}
                {/* Body (Unspent) */}
                {!isL && (
                  <div
                    className={cn("absolute right-[28%] inset-y-0 transition-all duration-700", isCig ? "bg-white" : "bg-[#C8E6C9]")}
                    style={{ left: `${p * 72}%` }}
                  />
                )}
                {/* Fixed Filter */}
                <div
                   className={cn("absolute inset-y-0 right-0 w-[28%] border-l border-black/20 z-[11]", isL ? "bg-danger" : (isCig ? "bg-[#D97706]" : "bg-[#333]"))}
                />
             </div>
          ) : (
             /* Circular Gauge */
             <div className="relative w-56 h-56 mb-10 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90">
                   <circle cx="112" cy="112" r="100" className={cn("fill-transparent stroke-[12]", isDark ? "stroke-white/5" : "stroke-black/5")} />
                   <motion.circle
                      cx="112" cy="112" r="100"
                      className={cn("fill-transparent stroke-[12] transition-all duration-1000", isL ? "stroke-danger" : "stroke-accent shadow-accent")}
                      strokeDasharray="628"
                      initial={{ strokeDashoffset: 628 }}
                      animate={{ strokeDashoffset: 628 - (Math.min(1, p) * 628) }}
                      strokeLinecap="round"
                   />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                   <div className={cn("text-7xl font-[1000] tracking-tighter", isL ? "text-danger" : (isDark ? "text-white" : "text-[#1A1C1E]"))}>{count}</div>
                   <Activity size={24} className={cn("mt-2", isL ? "text-danger" : "text-accent")} />
                </div>
             </div>
          )}
          {(isCig || isJoint) && <div className={cn("font-[1000] tracking-[-0.08em] leading-none mt-10 transition-all drop-shadow-2xl", isC ? "text-8xl" : "text-[10rem]", isL ? "text-danger" : (isDark ? "text-white" : "text-[#1A1C1E]"))}>{count}</div>}
       </div>

       <div className="flex justify-center items-center space-x-12 relative z-20 pt-8">
          <motion.button whileTap={{ scale: 0.7 }} onClick={() => onDec(config.id)} className={cn("w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-xl", isDark ? "bg-white/5 border border-white/10 text-text-dim hover:text-white" : "bg-black/5 border border-black/5 text-black/40 hover:text-black")}><Minus size={32} /></motion.button>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => onInc(config.id)} className={cn("w-20 h-20 rounded-full border-2 flex items-center justify-center transition-all shadow-2xl", isL ? "border-danger text-danger bg-danger/10 shadow-danger/20" : "border-accent/40 text-accent bg-accent/5 hover:border-accent hover:rotate-1")}><Plus size={36} /></motion.button>
       </div>
    </Card>
  );
};

const HealthScreen = ({ last, isDark }) => {
  const miles = useMemo(() => SmokingCalculator.calculateRecoveryMilestones(last), [last]);
  const diff = Date.now() - (last || Date.now()); const h = Math.floor(diff / 3600000); const m = Math.floor((diff % 3600000) / 60000);
  return (
    <div className="flex flex-col space-y-12 pb-20 max-w-5xl mx-auto">
       <Card className={cn("p-14 overflow-hidden relative shadow-2xl", isDark ? "bg-success/5 border-success/20" : "bg-white border-black/5")}>
          <div className="flex justify-between items-center mb-14 relative z-10">
             <div className="w-24 h-24 rounded-[42px] bg-success/20 flex items-center justify-center border border-success/30 text-success shadow-2xl"><Heart size={48} fill="currentColor" /></div>
             <div className="text-right">
                <span className="text-[11px] font-black text-text-dim uppercase tracking-[0.4em]">Vault Security State</span>
                <div className={cn("text-6xl font-[1000] text-success tracking-tighter mt-3 drop-shadow-2xl", !isDark && "text-success")}>{h}<span className="text-xl mx-2 opacity-60 font-black">H</span>{m}<span className="text-xl mx-2 opacity-60 font-black">M</span></div>
             </div>
          </div>
          <h2 className={cn("text-5xl font-[1000] tracking-tighter uppercase leading-none mb-4 relative z-10", !isDark && "text-[#1A1C1E]")}>Biological Repair</h2>
          <p className="text-base font-bold text-text-muted max-w-lg relative z-10 leading-relaxed opacity-80 border-l-4 border-success/30 pl-8 transition-all hover:opacity-100">Neural and cellular sequences are currently re-aligning. Recovery protocols verified.</p>
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-success/10 rounded-full blur-[180px] -mr-64 -mt-64 animate-pulse" />
       </Card>
       <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pb-32">
          {miles.map((m, i) => <StaggeredItem key={m.title} index={i+1}><Card className={cn("h-full flex flex-col group p-12 transition-all duration-1000 hover:bg-white/[0.01] shadow-2xl", isDark ? "bg-white/[0.03] border-white/5" : "bg-white border-black/5")}><div className="flex justify-between items-start mb-12"><div className="space-y-2"><span className={cn("text-[10px] font-[1000] uppercase tracking-[0.5em] transition-all duration-1000", m.progress >= 1 ? "text-success shadow-success" : "text-text-dim group-hover:text-success/50")}>{m.progress >= 1 ? 'Phase Stabilized' : 'In Progress'}</span><h4 className={cn("text-3xl font-[1000] tracking-tighter uppercase leading-none mt-2 transition-all duration-700", !isDark && "text-[#1A1C1E]")}>{m.title}</h4></div><div className="text-6xl font-[1000] text-success tracking-tighter transition-all duration-700 group-hover:scale-110">{Math.floor(m.progress * 100)}%</div></div><div className="w-full h-2.5 bg-black/10 rounded-full overflow-hidden mb-12 border border-white/5 p-0.5 shadow-inner relative"><motion.div animate={{ width: `${m.progress * 100}%` }} className="h-full bg-success shadow-[0_0_30px_rgba(74,222,128,0.6)] rounded-full transition-all duration-1000" /></div><p className="text-sm font-bold text-text-muted leading-relaxed opacity-80 group-hover:opacity-100 transition-opacity flex-1 leading-loose border-l-2 border-white/5 pl-8">{m.desc}</p></Card></StaggeredItem>)}
       </div>
    </div>
  );
};

const HistoryScreen = ({ logs, configs, todayString, onEdit, m, isDark }) => {
  const chart = useMemo(() => [...logs].sort((a,b)=>a.logDate.localeCompare(b.logDate)).slice(-7).map(l => {
     const counts = l.counts || {}; const firstKey = Object.keys(counts)[0] || 'cigarettes';
     return { name: new Date(l.logDate).toLocaleDateString(undefined, {weekday:'short'}).toUpperCase(), val: counts[firstKey] || 0 };
  }), [logs]);
  return (
    <div className="flex flex-col space-y-12 pb-20 max-w-5xl mx-auto">
       <StaggeredItem index={0}><Card className={cn("p-0 overflow-hidden shadow-2xl", isDark ? "bg-white/[0.03] border-accent/20" : "bg-white border-black/5 shadow-black/5 shadow-2xl")}><div className="p-14 pb-10 flex justify-between items-start"><div className="space-y-2"><span className="text-[11px] font-[1000] text-text-dim uppercase tracking-[0.5em]">Analytics Engine</span><h3 className={cn("text-5xl font-[1000] text-accent mt-2 uppercase tracking-tighter leading-none font-black")}>Usage Volatility</h3></div><div className="p-5 bg-accent/10 rounded-[32px] border border-accent/20 shadow-2xl text-accent font-black"><BarChart3 size={40} /></div></div><div className="h-[350px] w-full pr-14 pl-6 pb-14"><ResponsiveContainer width="100%" height="100%"><LineChart data={chart}><CartesianGrid strokeDasharray="8 8" stroke="rgba(128,128,128,0.1)" vertical={false} /><XAxis dataKey="name" stroke="#888" fontSize={11} axisLine={false} tickLine={false} dy={25} fontVariant="black" /><Tooltip contentStyle={{ background: isDark ? '#0D0D0E' : '#FFF', border: '1px solid var(--accent)', borderRadius: '24px', fontWeight: '950', fontSize: '15px', textTransform:'uppercase', boxShadow:'0 20px 50px rgba(0,0,0,0.4)', color: isDark ? '#FFF' : '#111' }} /><Line type="monotone" dataKey="val" stroke="var(--accent)" strokeWidth={8} dot={{ r: 8, fill: 'var(--accent)', strokeWidth: 4, stroke: isDark ? '#020202' : '#FFF' }} activeDot={{ r: 16, fill: '#FFF', shadow: '0 0 30px var(--accent)' }} animationDuration={2500} /></LineChart></ResponsiveContainer></div></Card></StaggeredItem>
       <div className="grid grid-cols-1 md:grid-cols-3 gap-10"><InsightCard Icon={TrendingUp} label="Streak" val={m.streak} suffix="Active Units" color="text-orange-400" index={1} isDark={isDark} /><InsightCard Icon={Wallet} label="Savings" val={`$${m.savings.toFixed(2)}`} suffix="Financial Gain" color="text-emerald-400" index={2} isDark={isDark} /><InsightCard Icon={Activity} label="Health Cost" val={`${Math.floor(m.lost/60)}H`} suffix="Time Impact" color="text-rose-400" index={3} isDark={isDark} /></div>
       <div className="space-y-10 pt-16 px-4"><div className="flex items-center justify-between px-2"><h4 className="text-[14px] font-[1000] text-accent uppercase tracking-[0.6em]">Activity Ledger</h4><History size={20} className="text-accent/30" /></div><div className="grid gap-6">{logs.sort((a,b)=>b.logDate.localeCompare(a.logDate)).map((log, i) => <StaggeredItem key={log.logDate} index={i+5}><Card className={cn("py-12 flex items-center justify-between group p-14 transition-all duration-700 shadow-2xl", isDark ? "bg-white/[0.03] border-white/5" : "bg-white border-black/5 shadow-black/5")}><div className="flex flex-col space-y-2"><span className={cn("text-3xl font-[1000] tracking-tighter uppercase leading-none", !isDark && "text-[#1A1C1E]")}>{log.logDate === todayString ? 'Today' : new Date(log.logDate).toLocaleDateString(undefined, {month:'short', day:'numeric', weekday:'long'})}</span><span className="text-[11px] font-[900] text-text-dim uppercase tracking-[0.4em] mt-3 flex items-center"><History size={16} className="mr-3 opacity-40" /> {Object.values(log.counts || {}).reduce((a,b)=>a+b, 0)} logs committed</span></div><div className="flex items-center space-x-12"><div className="flex -space-x-5">{Object.entries(log.counts || {}).map(([cid, count]) => <div key={cid} className={cn("w-16 h-16 rounded-full border-[5px] flex items-center justify-center font-[1000] text-base shadow-2xl transition-all group-hover:-translate-y-3", isDark ? "bg-black border-white/5 text-white" : "bg-white border-black/5 text-black")}>{count}</div>)}</div><button onClick={() => onEdit(log)} className={cn("p-5 rounded-[24px] transition-all hover:scale-110", isDark ? "bg-white/5 text-text-dim hover:text-accent" : "bg-black/5 text-black/40 hover:text-accent shadow-inner")}><Edit2 size={24} /></button></div></Card></StaggeredItem>)}</div></div>
    </div>
  );
};

const SettingsScreen = ({ c, u, s, onAdd, onUpd, onReo, onDel }) => {
  const [al, setAl] = useState(u.displayName || 'Commander');
  const [gl, setGl] = useState(s.goal || 'OPTIMIZATION');

  return (
    <div className="flex flex-col space-y-12 pb-40 max-w-4xl mx-auto">
       <Card className={cn("p-14 relative overflow-hidden shadow-2xl", s.isDark ? "bg-white/[0.03] border-white/5" : "bg-white border-black/5 shadow-black/5")}>
          <div className="flex items-center space-x-12 mb-16 relative z-10">
             <div className="w-36 h-36 bg-accent rounded-[56px] border-2 border-accent/20 flex items-center justify-center text-7xl font-[1000] text-bg-base shadow-2xl overflow-hidden shadow-accent/20">{u.photoURL ? <img src={u.photoURL} className="w-full h-full object-cover" alt="p" /> : al.charAt(0)}</div>
             <div className="space-y-4"><h4 className={cn("text-5xl font-[1000] tracking-tighter uppercase leading-none", !s.isDark && "text-[#1A1C1E]")}>{al}</h4><div className="flex items-center space-x-4"><div className="h-2.5 w-2.5 rounded-full bg-accent animate-pulse shadow-[0_0_15px_var(--accent)]" /><span className="text-[12px] font-black uppercase tracking-[0.6em] text-accent">Vault Commander</span></div></div>
          </div>
          <div className="space-y-12 relative z-10">
             <Input label="Commander Identifier" value={al} onChange={setAl} />
             <Input label="Strategic Objective" value={gl} onChange={setGl} />
             <Button className="w-full h-22 rounded-[36px] shadow-2xl text-[11px] font-[1000] uppercase tracking-widest active:scale-95" onClick={() => onUpd({ displayName: al, goal: gl })}>Update Parameters</Button>
          </div>
       </Card>

       <Card className={cn("p-14 space-y-16 shadow-2xl", s.isDark ? "bg-white/[0.03] border-white/5" : "bg-white border-black/5 shadow-black/5")}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
             <Toggle icon={Moon} label="Obsidian Mode" active={s.isDark} onClick={() => onUpd({ isDark: !s.isDark })} isDark={s.isDark} />
             <Toggle icon={Clock} label="Night Owl Mode" active={s.nightOwl} onClick={() => onUpd({ nightOwl: !s.nightOwl })} isDark={s.isDark} />
             <Toggle icon={Grid} label="Neural Matrix" active={s.layout === 'COMPACT'} onClick={() => onUpd({ layout: s.layout === 'LARGE' ? 'COMPACT' : 'LARGE' })} isDark={s.isDark} />
             <div className={cn("p-10 rounded-[48px] border space-y-10 shadow-inner transition-all", s.isDark ? "bg-black/40 border-white/5" : "bg-black/[0.03] border-black/5")}>
                <div className="flex items-center justify-between px-2 text-xs font-[1000] uppercase tracking-[0.5em] opacity-60"><span>Accent Spectrum</span><Activity size={18} className="opacity-30" /></div>
                <div className="flex flex-wrap gap-5">{ACCENTS.map(x => (
                   <button
                      key={x.v}
                      onClick={() => onUpd({ accent: x.v })}
                      className={cn("w-14 h-14 rounded-2xl border-4 transition-all duration-700 shadow-2xl active:scale-90 relative", s.accent === x.v ? "border-white scale-110 shadow-accent/50" : "border-transparent opacity-40 hover:opacity-100")}
                      style={{ backgroundColor: x.v }}
                   >
                      {s.accent === x.v && <motion.div layoutId="colorCheck" className="absolute inset-0 flex items-center justify-center text-white"><Check size={20} strokeWidth={4} /></motion.div>}
                   </button>
                ))}</div>
             </div>
          </div>
          <div className="pt-10 border-t border-white/10">
             <div className="flex justify-between items-center px-4 mb-10"><span className={cn("text-[12px] font-[1000] uppercase tracking-[0.5em]", s.isDark ? "text-text-dim" : "text-black/60")}>Typography Scaling</span><span className="text-sm font-black text-accent">{Math.round(s.fontScale*100)}%</span></div>
             <input type="range" min="0.8" max="1.3" step="0.1" value={s.fontScale} onChange={e => onUpd({ fontScale: parseFloat(e.target.value) })} className="w-full h-2 bg-black/10 rounded-full appearance-none cursor-pointer accent-accent shadow-inner transition-all hover:bg-black/20" />
          </div>
       </Card>

       <Card className={cn("p-14 border-white/5 shadow-2xl", s.isDark ? "bg-white/[0.03] border-white/5" : "bg-white border-black/5 shadow-black/5")}>
          <div className="flex justify-between items-center mb-16 px-2"><div className="space-y-2"><h4 className={cn("text-4xl font-[1000] uppercase tracking-tighter leading-none", !s.isDark && "text-[#1A1C1E]")}>Protocols</h4><p className="text-[11px] font-black text-text-dim uppercase tracking-[0.4em] mt-3 opacity-60">Manage operational logic</p></div><div className={cn("p-5 rounded-[32px] shadow-2xl border", s.isDark ? "bg-white/5 border-white/5" : "bg-black/5 border-black/5 text-black/30")}><RefreshCcw size={28} /></div></div>
          <div className="space-y-16">
             <Input label="Global unit rate ($)" value={s.globalPrice} onChange={(v) => onUpd({ globalPrice: v })} type="number" />
             <div className="space-y-8">{c.map(x => <div key={x.id} className={cn("flex items-center justify-between p-12 rounded-[56px] border group transition-all duration-1000 shadow-2xl hover:border-accent/40", s.isDark ? "bg-white/[0.01] border-white/5" : "bg-black/[0.01] border-black/5 shadow-black/5")}><div className="flex items-center space-x-10"><div className="flex flex-col space-y-3"><button onClick={() => onReo(x.id, 'up')} className={cn("p-3 rounded-xl transition-all hover:scale-110 shadow-lg", s.isDark ? "bg-white/5 text-text-dim" : "bg-black/5 text-black/20")}><ArrowUp size={16} /></button><button onClick={() => onReo(x.id, 'down')} className={cn("p-3 rounded-xl transition-all hover:scale-110 shadow-lg", s.isDark ? "bg-white/5 text-text-dim" : "bg-black/5 text-black/20")}><ArrowDown size={16} /></button></div><div className="flex flex-col space-y-1"><span className={cn("text-2xl font-[1000] uppercase leading-none transition-all group-hover:text-accent", !s.isDark && "text-[#1A1C1E]")}>{x.name}</span><span className="text-[11px] font-black text-text-dim uppercase tracking-[0.3em] mt-2 opacity-60">Target: {x.limit} UNITS</span></div></div><div className="flex items-center space-x-6 opacity-0 group-hover:opacity-100 duration-700 transition-all translate-x-8 group-hover:translate-x-0"><button onClick={() => onDel(x.id)} className="p-5 rounded-[24px] bg-danger/5 text-danger/40 hover:text-danger border border-danger/10 shadow-2xl transition-all hover:scale-110"><Trash2 size={24} /></button></div></div>)}</div>
             <Button variant="outline" className={cn("w-full border-dashed border-2 rounded-[56px] h-28 hover:bg-accent/5 hover:border-accent group transition-all", !s.isDark && "text-black border-black/20")} onClick={onAdd}><Plus className="mr-6 group-hover:rotate-90 transition-transform duration-1000 text-accent scale-110" size={40} /><span className="text-base font-[1000] tracking-[0.3em]">Initialize Tracker</span></Button>
          </div>
       </Card>
       <Button variant="danger" className="w-full h-24 rounded-[42px] shadow-2xl hover:scale-[1.01] active:scale-[0.98] text-sm font-black transition-all shadow-black/80" onClick={() => signOut(auth)}>Emergency Session Termination</Button>
    </div>
  );
};

// --- HELPERS ---

const Toggle = ({ icon: Icon, label, active, onClick, isDark }) => (
  <div
    onClick={onClick}
    className={cn("flex items-center justify-between p-10 rounded-[48px] border shadow-2xl transition-all hover:scale-[1.02] active:scale-[0.98] group cursor-pointer", isDark ? "bg-white/[0.02] border-white/5" : "bg-white border-black/5 shadow-black/5")}
  >
     <div className="flex items-center space-x-7">
        <div className={cn("p-6 rounded-[32px] transition-all duration-700 shadow-2xl", isDark ? "bg-white/5 border border-white/5" : "bg-[#F0F2F5] border-black/5 shadow-inner")}><Icon size={32} className={cn(active ? "text-accent" : (isDark ? "text-white/40" : "text-black/40"))} /></div>
        <span className={cn("text-sm font-[1000] uppercase tracking-[0.5em] leading-none transition-all font-black", !isDark && "text-[#1A1C1E]")}>{label}</span>
     </div>
     <div className={cn("w-20 h-11 rounded-full p-2.5 transition-all duration-500 shadow-inner relative", active ? "bg-accent shadow-[0_0_20px_var(--accent)]" : "bg-black/20")}>
        <motion.div
          animate={{ x: active ? 36 : 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className={cn("w-6 h-6 rounded-full bg-white shadow-2xl")}
        />
     </div>
  </div>
);

const Overlay = ({ children, onClose, title, isDark }) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-3xl overflow-y-auto">
     <motion.div initial={{ y: 200, scale: 0.95, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: 200, scale: 0.95, opacity: 0 }} transition={{ type: 'spring', damping: 25, stiffness: 120 }} className="w-full max-w-xl my-auto">
        <Card className={cn("p-16 relative border-2 shadow-2xl shadow-black", isDark ? "bg-[#0A0A0A] border-accent/40" : "bg-white border-black/5")}><button onClick={onClose} className={cn("absolute top-14 right-14 p-6 rounded-[32px] transition-all group", isDark ? "bg-white/5 text-text-dim hover:text-white" : "bg-black/5 text-black/40 hover:text-black")}><X size={32} className="group-hover:rotate-90 transition-transform duration-700" /></button><div className="flex items-center space-x-8 text-accent mb-20 border-b border-white/10 pb-12"><div className="p-6 bg-accent/10 rounded-[32px] border border-accent/20 shadow-2xl text-accent"><Activity size={40} className="animate-pulse" /></div><h3 className={cn("text-5xl font-[1000] tracking-tighter uppercase leading-none", !isDark && "text-[#1A1C1E]")}>{title}</h3></div><div>{children}</div></Card>
     </motion.div>
  </div>
);

const AddForm = ({ onAdd }) => {
  const [n, setN] = useState(''); const [l, setL] = useState('20'); const [t, setT] = useState('CIGARETTE');
  return (
    <div className="space-y-14">
       <Input label="Protocol Identifier" value={n} onChange={setN} placeholder="ASSIGN_TRACKER_ID" />
       <Input label="Target Capacity" value={l} onChange={setL} type="number" />
       <div className="space-y-8"><span className="text-[12px] font-black text-text-dim uppercase tracking-[0.6em] ml-1">Visual Schema</span><div className="grid grid-cols-2 gap-6">{['CIGARETTE', 'SIMPLE', 'JOINT_KING', 'JOINT_QUEEN'].map(x => <button key={x} onClick={() => setT(x)} className={cn("h-20 rounded-[32px] border font-[1000] text-[11px] uppercase tracking-[0.4em] transition-all duration-1000 shadow-2xl active:scale-95", t === x ? "bg-accent text-bg-base border-accent shadow-[0_0_60px_var(--accent)] scale-110" : "bg-black/5 border-black/5 text-text-dim")} >{x.replace('_', ' ')}</button>)}</div></div>
       <Button size="lg" className="w-full shadow-2xl h-24 rounded-[42px] text-base font-[1000] uppercase active:scale-95" onClick={() => onAdd(n, t, l)}>Commit Neural Link</Button>
    </div>
  );
};

const EditForm = ({ log, configs, onSave, isDark }) => {
  const [c, setC] = useState({ ...(log.counts || {}) });
  return (
    <div className="space-y-14">
       <div className={cn("flex items-center space-x-8 p-8 rounded-[42px] border shadow-inner", isDark ? "bg-black/40 border-white/5" : "bg-black/5 border-black/5")}><div className="p-5 bg-accent/10 rounded-[28px] border border-accent/20"><Calendar size={32} className="text-accent" /></div><span className={cn("text-lg font-black uppercase tracking-[0.4em] opacity-90", !isDark && "text-black")}>{new Date(log.logDate).toLocaleDateString(undefined, { dateStyle: 'full' })}</span></div>
       <div className="max-h-[400px] overflow-y-auto pr-8 space-y-12 scrollbar-thin scrollbar-thumb-accent/40 pb-10">{configs.map(x => <Input key={x.id} label={x.name} value={c[x.id] || 0} type="number" onChange={v => setC({...c, [x.id]: parseInt(v) || 0})} />)}</div>
       <Button size="lg" className="w-full h-24 rounded-[42px] shadow-2xl text-base font-[1000] transition-all hover:scale-[1.02] active:scale-95" onClick={() => onSave(log.logDate, c)}><Save size={32} className="mr-6" /> Register Override</Button>
    </div>
  );
};

const InsightCard = ({ Icon, label, val, suffix, color, index, isDark }) => (
  <StaggeredItem index={index}>
    <Card className={cn("flex flex-col items-center text-center py-16 transition-all duration-1000 shadow-2xl group", isDark ? "bg-white/[0.03] border-white/5" : "bg-white border-black/5 shadow-black/5")}>
      <div className={cn("p-8 rounded-[48px] mb-12 transition-all duration-1000 group-hover:scale-110 shadow-2xl relative z-10", color, isDark ? "bg-white/[0.04]" : "bg-[#F0F2F5] shadow-inner")}><Icon size={48} /></div>
      <div className={cn("text-7xl font-[1000] leading-none tracking-tighter mb-4 relative z-10 drop-shadow-2xl", !isDark && "text-[#1A1C1E]")}>{val}</div>
      <div className="text-[12px] font-black text-text-dim uppercase tracking-[0.6em] relative z-10 opacity-70">{suffix}</div>
      <div className="mt-16 pt-12 border-t border-white/10 w-full flex items-center justify-center relative z-10 text-accent font-black tracking-[0.8em] text-[10px] opacity-60 uppercase">{label}</div>
    </Card>
  </StaggeredItem>
);

const ErrorView = ({ msg }) => <div className="min-h-screen bg-[#020202] flex flex-col items-center justify-center p-12 text-center text-white font-inter"><AlertCircle className="text-danger mb-6" size={48} /><h2 className="text-2xl font-black uppercase tracking-tighter leading-none mb-2 text-white">System Error</h2><p className="text-text-dim text-sm max-w-xs">{msg}</p><Button onClick={() => window.location.reload()} className="mt-8 rounded-full">Re-Initialize Vault</Button></div>;
const LoadingView = () => <div className="min-h-screen bg-[#020202] flex flex-col items-center justify-center space-y-6 text-accent font-inter"><Loader2 className="animate-spin" size={48} /><span className="text-[10px] font-black tracking-[0.5em] uppercase text-accent">Syncing Neural Link...</span></div>;

export default App;
