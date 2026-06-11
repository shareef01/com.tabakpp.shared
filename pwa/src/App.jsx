import React, { useState, useMemo, useEffect, Component } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Heart, BarChart3, Settings, LogOut,
  ChevronRight, Info, History, Plus, Minus, Edit2, Trash2,
  TrendingUp, Wallet, Activity, Calendar, Clock, ArrowUp, ArrowDown, X,
  Save, AlertCircle, RefreshCcw, Camera, Target, Layout, Type, DollarSign,
  Moon, Check, GripVertical, CheckCircle2, Loader2, InfoIcon, Flame, Grid,
  Database, ShieldCheck
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
  doc, setDoc, collection, onSnapshot, query, orderBy, limit, deleteDoc
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
          <h2 className="text-3xl font-[950] uppercase tracking-tighter leading-none">System Failure</h2>
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

  const [logs, setLogs] = useState([]);
  const [configs, setConfigs] = useState([]);
  const [settings, setSettings] = useState({
    accent: '#D4FF5C', isDark: true, layout: 'LARGE', fontScale: 1, nightOwl: false, globalPrice: '0.5', goal: 'SAVE FOR VACATION'
  });

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u); setAuthLoading(false);
      if (!u) { setLogs([]); setConfigs([]); }
    }, (err) => setAppError("Auth denied: " + err.message));
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
          setSettings(p => ({ ...p, accent: d.accent || '#D4FF5C', isDark: d.isDark ?? true, layout: d.layout || 'LARGE', fontScale: d.fontScale || 1, nightOwl: d.nightOwl ?? false, globalPrice: d.globalPrice || '0.5', goal: d.goal || 'SAVE FOR VACATION' }));
        }
      });
      return () => { cUnsub(); lUnsub(); sUnsub(); };
    } catch (err) { setAppError("System Synchronization Failure: " + err.message); }
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
    if (p > 0.8) return "Nearing limit. High volatility detected.";
    return "Every session tracked is a step toward optimization.";
  }

  const onInc = async (id) => {
    if (!user) return;
    const ref = doc(db, 'users', user.uid, 'logs', today);
    const cnt = (metrics.todayLog.counts || {})[id] || 0;
    await setDoc(ref, { logDate: today, counts: { ...(metrics.todayLog.counts || {}), [id]: cnt + 1 } }, { merge: true });
  };

  const onDec = async (id) => {
    if (!user) return;
    const cnt = (metrics.todayLog.counts || {})[id] || 0;
    if (cnt <= 0) return;
    const ref = doc(db, 'users', user.uid, 'logs', today);
    await setDoc(ref, { counts: { ...(metrics.todayLog.counts || {}), [id]: cnt - 1 } }, { merge: true });
  };

  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  if (appError) return <div className="min-h-screen bg-bg-base flex flex-col items-center justify-center p-12 text-center text-white font-inter"><AlertCircle className="text-danger mb-6" size={48} /><h2 className="text-2xl font-black uppercase">Identity Failure</h2><p className="text-text-dim text-sm mt-2">{appError}</p></div>;
  if (authLoading) return <div className="min-h-screen bg-bg-base flex flex-col items-center justify-center space-y-6 text-accent font-inter"><Loader2 className="animate-spin" size={48} /><span className="text-[10px] font-black tracking-[0.5em] uppercase">Syncing Neural Link...</span></div>;
  if (!user) return <AuthScreen />;

  return (
    <ErrorBoundary>
    <div className={cn("flex flex-col min-h-screen bg-bg-base text-white font-inter selection:bg-accent/30 transition-all duration-700", !settings.isDark && "invert-[0.9] hue-rotate-180")} style={{ '--accent': settings.accent, '--accent-rgb': hexToRgb(settings.accent), fontSize: `${settings.fontScale}rem` }}>
      <header className="fixed top-0 left-0 right-0 z-40 pt-[env(safe-area-inset-top)] px-8 md:px-12 py-8 bg-gradient-to-b from-black via-black/80 to-transparent flex justify-between items-center">
        <div className="flex flex-col">
          <h1 className="text-4xl font-[950] tracking-tighter uppercase leading-none">tabak++</h1>
          <div className="flex items-center space-x-2 mt-2"><div className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse shadow-[0_0_10px_var(--accent)]" /><span className="text-[10px] font-[900] tracking-[0.4em] text-accent uppercase leading-none">{activeTab}</span></div>
        </div>
        <div className="flex items-center space-x-6">
           <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent font-[950] text-xl overflow-hidden shadow-2xl transition-all hover:scale-110">{user.photoURL ? <img src={user.photoURL} alt="p" className="w-full h-full object-cover" /> : user.displayName?.charAt(0) || 'U'}</div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pt-40 pb-40 px-6 max-w-6xl mx-auto w-full transition-all duration-500">
        <AnimatePresence mode="wait">
          {activeTab === 'tracker' && <TrackerScreen key="t" m={metrics} c={configs} onInc={onInc} onDec={onDec} onAdd={() => setActiveTab('settings')} view={settings.layout} />}
          {activeTab === 'health' && <HealthScreen key="h" last={Date.now() - 3600000 * 4} />}
          {activeTab === 'history' && <HistoryScreen key="y" logs={logs} configs={configs} m={metrics} todayString={today} onEdit={setEditTarget} />}
          {activeTab === 'settings' && <SettingsScreen key="s" c={configs} u={user} s={settings} onAdd={() => setShowAdd(true)} onUpd={(upd) => setDoc(doc(db, 'users', user.uid), upd, { merge: true })} onReo={async (id, dir) => {
                const idx = configs.findIndex(x => x.id === id);
                if ((dir === 'up' && idx > 0) || (dir === 'down' && idx < configs.length - 1)) {
                   const n = [...configs]; const swap = dir === 'up' ? idx - 1 : idx + 1;
                   [n[idx], n[swap]] = [n[swap], n[idx]]; const final = n.map((x, i) => ({ ...x, order: i }));
                   setConfigs(final);
                   for (const x of final) { await setDoc(doc(db, 'users', user.uid, 'configs', x.id), { order: x.order }, { merge: true }); }
                }
              }} onDel={async (id) => { await deleteDoc(doc(db, 'users', user.uid, 'configs', id)); }} />}
        </AnimatePresence>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 md:bottom-10 md:left-1/2 md:-translate-x-1/2 md:w-[600px] pb-[env(safe-area-inset-bottom)] md:pb-0 z-40 px-4">
        <div className="bg-black/80 backdrop-blur-3xl border border-white/5 rounded-t-[40px] md:rounded-[40px] flex justify-around items-center h-24 md:h-22 px-6 shadow-2xl">
          <NavItem id="tracker" icon={LayoutDashboard} active={activeTab === 'tracker'} onClick={() => setActiveTab('tracker')} label="tracker" />
          <NavItem id="health" icon={Heart} active={activeTab === 'health'} onClick={() => setActiveTab('health')} label="health" />
          <NavItem id="history" icon={Database} active={activeTab === 'history'} onClick={() => setActiveTab('history')} label="vault" />
          <NavItem id="settings" icon={Settings} active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} label="control" />
        </div>
      </nav>

      <AnimatePresence>
        {showAdd && <Overlay onClose={() => setShowAdd(false)} title="New Protocol"><AddForm onAdd={async (n, t, l) => { const id = Math.random().toString(36).substr(2, 9); await setDoc(doc(db, 'users', user.uid, 'configs', id), { name: n, type: t, limit: parseInt(l) || 20, order: configs.length }); setShowAdd(false); }} /></Overlay>}
        {editTarget && <Overlay onClose={() => setEditTarget(null)} title="Override Entry"><EditForm log={editTarget} configs={configs} onSave={async (d, c) => { await setDoc(doc(db, 'users', user.uid, 'logs', d), { counts: c }, { merge: true }); setEditTarget(null); }} /></Overlay>}
      </AnimatePresence>
    </div>
    </ErrorBoundary>
  );
};

// --- SCREENS ---

const AuthScreen = () => {
  const [isL, setIsL] = useState(true);
  const [e, setE] = useState(''); const [p, setP] = useState(''); const [n, setN] = useState('');
  const [loading, setLoading] = useState(false); const [err, setErr] = useState('');
  const handle = async () => {
    setLoading(true); setErr('');
    try {
      if (isL) { await signInWithEmailAndPassword(auth, e, p); }
      else { const c = await createUserWithEmailAndPassword(auth, e, p); await updateProfile(c.user, { displayName: n }); await setDoc(doc(db, 'users', c.user.uid), { name: n, accent: '#D4FF5C', isDark: true }); }
    } catch (e) { setErr(e.message); } finally { setLoading(false); }
  };
  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center p-6 text-white font-inter">
      <div className="w-full max-w-md space-y-12">
        <div className="flex flex-col items-center text-center"><div className="w-24 h-24 bg-accent rounded-[32px] flex items-center justify-center mb-8 shadow-2xl text-bg-base"><LayoutDashboard size={40} /></div><h1 className="text-5xl font-[950] tracking-tighter uppercase leading-none text-white">tabak++</h1></div>
        <Card className="space-y-6 bg-bg-panel/50 border-white/5 p-10 backdrop-blur-lg shadow-[0_30px_60px_rgba(0,0,0,0.6)]">
          {err && <div className="p-4 bg-danger/10 border border-danger/20 rounded-2xl text-danger text-[10px] font-black uppercase tracking-widest">{err}</div>}
          {!isL && <Input label="Vault Commander" value={n} onChange={setN} placeholder="Your Alias" />}
          <Input label="Vault ID" value={e} onChange={setE} placeholder="email@address.com" />
          <Input label="Security Phrase" type="password" value={p} onChange={setP} placeholder="••••••••" />
          <Button className="w-full h-18 text-xs shadow-2xl" onClick={handle} disabled={loading}>{loading ? <Loader2 className="animate-spin" /> : (isL ? 'Access Vault' : 'Initialize Vault')}</Button>
          <div className="flex flex-col space-y-4 items-center pt-2">
             <button onClick={() => setIsL(!isL)} className="text-[10px] font-black text-text-dim uppercase tracking-widest hover:text-accent transition-all">{isL ? "Request New Vault" : "Back to Login"}</button>
             <button onClick={() => signInAnonymously(auth)} className="text-[10px] font-black text-accent/60 uppercase tracking-widest hover:text-accent transition-all">Guest Entry mode</button>
          </div>
        </Card>
      </div>
    </div>
  );
};

const TrackerScreen = ({ m, c, onInc, onDec, view, onAdd }) => (
  <div className="flex flex-col space-y-12 pb-10">
    <StaggeredItem index={0}><Card className="bg-bg-panel/40 border-accent/10 p-12 relative overflow-hidden group shadow-2xl"><div className="flex justify-between items-end relative z-10 text-white"><div className="space-y-2"><span className="text-[10px] font-[900] text-text-dim uppercase tracking-[0.4em]">Vault Integrity</span><div className="text-7xl font-[950] tracking-tighter leading-none">{Math.max(0, m.limit - m.count)} <span className="text-base text-accent uppercase tracking-widest font-black ml-4 leading-none">Remaining</span></div></div><div className="text-right space-y-3 hidden md:block"><div className="px-4 py-2 bg-accent/10 rounded-2xl text-accent text-[10px] font-black uppercase border border-accent/20">{m.rank}</div><div className="text-4xl font-[950] text-text-muted leading-none tracking-tighter">{m.xp} XP</div></div></div><div className="w-full h-3.5 bg-white/5 rounded-full overflow-hidden mt-12 p-0.5 border border-white/5 relative z-10 shadow-inner shadow-black/30"><motion.div animate={{ width: `${Math.min(1, m.progress) * 100}%` }} className={cn("h-full rounded-full transition-all duration-1000", m.progress >= 1 ? "bg-danger shadow-[0_0_30px_#F87171]" : "bg-white shadow-[0_0_20px_white]")} /></div><div className="p-6 bg-white/[0.03] rounded-[32px] border border-white/5 flex items-start space-x-5 mt-10 relative z-10 backdrop-blur-sm shadow-inner"><div className="p-3 bg-accent/10 rounded-2xl text-accent shadow-inner"><InfoIcon size={20} /></div><p className="text-sm font-bold text-text-muted leading-relaxed italic opacity-80">"{m.coach}"</p></div><div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[150px] -mr-64 -mt-64" /></Card></StaggeredItem>
    <div className={cn("grid gap-10", view === 'COMPACT' ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-1 lg:grid-cols-2")}>
       {c.sort((a,b) => a.order - b.order).map((config, i) => <StaggeredItem key={config.id} index={i+1}><CounterCard config={config} count={(m.todayLog.counts || {})[config.id] || 0} onInc={onInc} onDec={onDec} isC={view === 'COMPACT'} /></StaggeredItem>)}
       <StaggeredItem index={c.length + 1}><button onClick={onAdd} className={cn("w-full border-2 border-dashed border-white/5 rounded-[48px] flex flex-col items-center justify-center space-y-6 hover:bg-white/[0.02] hover:border-accent/20 transition-all group relative overflow-hidden shadow-2xl", view === 'COMPACT' ? "h-[350px]" : "h-[550px]")}><div className="w-20 h-20 rounded-[32px] bg-white/5 flex items-center justify-center group-hover:scale-110 group-hover:bg-accent/10 transition-all duration-500 shadow-inner shadow-black/40"><Plus className="text-text-dim group-hover:text-accent" size={32} /></div><span className="text-[10px] font-black text-text-dim uppercase tracking-[0.4em] group-hover:text-white transition-colors">Deploy Protocol</span></button></StaggeredItem>
    </div>
  </div>
);

const CounterCard = ({ config, count, onInc, onDec, isC }) => {
  const isL = count >= config.limit;
  const p = Math.min(1, count / config.limit);

  // Archetype Visual Logic
  const bodyW = isL ? 0 : (1 - p) * 100;
  const isCig = config.type === 'CIGARETTE';
  const isJoint = config.type.startsWith('JOINT');

  return (
    <Card className={cn("relative flex flex-col group transition-all duration-1000 p-12 overflow-hidden shadow-2xl", isL ? "bg-danger/[0.04] border-danger/50 shadow-[0_0_60px_rgba(248,113,113,0.15)]" : "hover:border-accent/30 border-white/5", isC ? "min-h-[380px]" : "min-h-[550px]")}>
       <div className="flex justify-between items-start mb-10 relative z-20 text-white text-center flex-col items-center w-full">
          <span className={cn("text-[11px] font-[950] tracking-[0.5em] uppercase transition-all duration-700", isL ? "text-danger" : "text-accent")}>{config.name}</span>
          <span className="text-[9px] font-black text-text-dim uppercase tracking-[0.2em] opacity-60 mt-1">Daily Protocol: {config.limit}</span>
       </div>

       <div className="flex-1 flex flex-col items-center justify-center relative z-10 py-12">
          {(isCig || isJoint) ? (
             <div className={cn("relative w-full h-14 rounded-full overflow-hidden border border-white/5 mb-16 shadow-[inset_0_4px_20px_rgba(0,0,0,0.8)] transition-all duration-1000", isL ? "bg-danger shadow-[0_0_60px_#F87171]" : "bg-bg-panel/95")}>
                {/* White body anchored at start of roach, shrinks FROM LEFT */}
                <motion.div
                  animate={{ width: `${bodyW}%` }}
                  transition={{ type:'spring', stiffness:45, damping:14 }}
                  className={cn("absolute right-0 inset-y-0 z-10 shadow-[-15px_0_30px_rgba(255,255,255,0.3)] rounded-l-sm", isCig ? "bg-gradient-to-l from-white to-neutral-200" : "bg-gradient-to-l from-[#C8E6C9] to-[#A5D6A7]")}
                />

                {!isL && count > 0 && (
                  <motion.div animate={{ right: `${bodyW}%` }} transition={{ type:'spring', stiffness:45, damping:14 }} className="absolute inset-y-0 w-16 translate-x-1/2 z-20 flex items-center justify-center">
                    <div className="absolute inset-0 bg-radial-gradient from-[#FF3D00] via-[#FF3D00]/20 to-transparent blur-2xl opacity-80" />
                    <motion.div animate={{ scale:[0.9,1.4,0.95], x:[-2,2,-1], backgroundColor:['#FF3D00','#FFB74D','#FF3D00'] }} transition={{ repeat: Infinity, duration:0.08, ease:'linear' }} className="w-6 h-full rounded-full shadow-[0_0_40px_#FF3D00] border-x border-white/20" />
                  </motion.div>
                )}

                <motion.div
                   animate={{ width: isL ? '0%' : (isCig ? '30%' : '20%'), opacity: isL ? 0 : 1 }}
                   className={cn("absolute inset-y-0 right-0 z-[11] shadow-2xl border-l border-black/30 origin-right transition-all duration-1000", isCig ? "bg-[#D97706]" : "bg-[#424242]")}
                />
                <div className="absolute inset-0 bg-neutral-950/90 -z-10" />
             </div>
          ) : (
             /* Simple archetype (e.g. Nicotine Pouch) */
             <div className="relative w-56 h-56 mb-16 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90 drop-shadow-[0_0_15px_rgba(var(--accent-rgb),0.3)]">
                   <circle cx="112" cy="112" r="100" className="stroke-white/5 fill-transparent" strokeWidth="16" />
                   <motion.circle cx="112" cy="112" r="100" className={cn("fill-transparent transition-all duration-1000", isL ? "stroke-danger" : "stroke-accent")} strokeWidth="16" strokeLinecap="round" initial={{ strokeDasharray:'0 628' }} animate={{ strokeDasharray:`${Math.min(1,p)*628} 628` }} transition={{ duration: 1.5, ease:'easeOut'}} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center"><Activity className={cn("w-10 h-10 transition-colors duration-1000", isL ? "text-danger" : "text-accent")} /></div>
             </div>
          )}
          <motion.div key={count} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type:'spring', stiffness:100 }} className={cn("font-[950] tracking-[-0.08em] leading-none mb-10 transition-all text-white shadow-black drop-shadow-2xl", isC ? "text-8xl" : "text-[11rem]", isL && "text-danger")}>{count}</motion.div>
       </div>

       <div className={cn("flex justify-center items-center relative z-20", isC ? "space-x-8" : "space-x-12")}>
          <motion.button whileTap={{ scale: 0.7 }} onClick={() => onDec(config.id)} className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-text-dim hover:text-white transition-all shadow-xl hover:bg-white/10 hover:scale-110"><Minus size={24} /></motion.button>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => onInc(config.id)} className={cn("rounded-[42px] flex items-center justify-center shadow-[0_20px_50px_rgba(0,0,0,0.6)] transition-all duration-700 border-2", isC ? "w-28 h-22" : "w-44 h-32", isL ? "border-danger text-danger bg-danger/10 shadow-danger/20 scale-105" : "border-white/10 text-white bg-bg-panel hover:border-accent hover:text-accent hover:scale-105 hover:rotate-1")}><Plus size={isC ? 38 : 64} strokeWidth={4} /></motion.button>
       </div>
    </Card>
  );
};

const HealthScreen = ({ last }) => {
  const miles = useMemo(() => SmokingCalculator.calculateRecoveryMilestones(last), [last]);
  const diff = Date.now() - (last || Date.now()); const h = Math.floor(diff / 3600000); const m = Math.floor((diff % 3600000) / 60000);
  return (
    <div className="flex flex-col space-y-12 pb-20 text-white max-w-5xl mx-auto">
       <Card className="bg-success/5 border-success/20 p-14 overflow-hidden relative shadow-2xl"><div className="flex justify-between items-center mb-14 relative z-10"><div className="w-24 h-24 rounded-[42px] bg-success/20 flex items-center justify-center border border-success/30 text-success shadow-2xl shadow-black/40"><Heart size={48} fill="currentColor" /></div><div className="text-right"><span className="text-[11px] font-black text-text-dim uppercase tracking-[0.4em]">Vault Security State</span><div className="text-6xl font-[950] text-success tracking-tighter mt-3 drop-shadow-2xl shadow-success/20">{h}<span className="text-xl mx-2 opacity-60">H</span>{m}<span className="text-xl mx-2 opacity-60">M</span></div></div></div><h2 className="text-5xl font-[950] tracking-tighter uppercase leading-none text-white mb-4 relative z-10">Biological Repair</h2><p className="text-base font-bold text-text-muted max-w-lg relative z-10 leading-relaxed opacity-80 border-l-4 border-success/30 pl-8 transition-all hover:opacity-100 font-bold">Neural and cellular sequences are currently re-aligning. Your internal vault systems have verified regeneration markers.</p><div className="absolute top-0 right-0 w-[600px] h-[600px] bg-success/10 rounded-full blur-[180px] -mr-64 -mt-64 animate-pulse" /></Card>
       <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pb-32">{miles.map((m, i) => <StaggeredItem key={m.title} index={i+1}><Card className="h-full flex flex-col group p-12 border-white/5 shadow-inner hover:border-success/40 transition-all duration-1000 hover:bg-white/[0.01] shadow-2xl"><div className="flex justify-between items-start mb-12"><div className="space-y-2"><span className={cn("text-[10px] font-[950] uppercase tracking-[0.5em] transition-all duration-1000", m.progress >= 1 ? "text-success shadow-success" : "text-text-dim group-hover:text-success/50")}>{m.progress >= 1 ? 'Phase Stabilized' : 'Repair in Progress'}</span><h4 className="text-3xl font-[950] tracking-tighter uppercase leading-none mt-2 transition-all duration-700 group-hover:text-white">{m.title}</h4></div><div className="text-6xl font-[950] text-success tracking-tighter transition-all duration-700 group-hover:scale-110">{Math.floor(m.progress * 100)}%</div></div><div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden mb-12 border border-white/5 p-0.5 shadow-inner relative"><motion.div animate={{ width: `${m.progress * 100}%` }} className="h-full bg-success shadow-[0_0_30px_rgba(74,222,128,0.6)] rounded-full transition-all duration-1000" /></div><p className="text-sm font-bold text-text-muted leading-relaxed opacity-80 group-hover:opacity-100 transition-opacity flex-1 leading-loose border-l-2 border-white/5 pl-8 font-bold">{m.desc}</p></Card></StaggeredItem>)}</div>
    </div>
  );
};

const HistoryScreen = ({ logs, todayString, onEdit, m }) => {
  const chart = useMemo(() => [...logs].sort((a,b)=>a.logDate.localeCompare(b.logDate)).slice(-7).map(l => {
     const counts = l.counts || {}; const firstKey = Object.keys(counts)[0] || 'cigarettes';
     return { name: new Date(l.logDate).toLocaleDateString(undefined, {weekday:'short'}).toUpperCase(), val: counts[firstKey] || 0 };
  }), [logs]);
  return (
    <div className="flex flex-col space-y-12 pb-20 text-white max-w-5xl mx-auto">
       <StaggeredItem index={0}><Card className="p-0 overflow-hidden border-accent/20 bg-bg-panel/40 shadow-[0_40px_80px_rgba(0,0,0,0.6)]"><div className="p-14 pb-10 flex justify-between items-start"><div className="space-y-2"><span className="text-[11px] font-[950] text-text-dim uppercase tracking-[0.5em]">Global Analytics Engine</span><h3 className="text-5xl font-[950] text-accent mt-2 uppercase tracking-tighter leading-none font-black">Usage Volatility</h3></div><div className="p-5 bg-accent/10 rounded-[32px] border border-accent/20 shadow-2xl transition-all hover:scale-110 duration-500 text-accent font-black"><BarChart3 size={40} /></div></div><div className="h-[350px] w-full pr-14 pl-6 pb-14"><ResponsiveContainer width="100%" height="100%"><LineChart data={chart}><CartesianGrid strokeDasharray="8 8" stroke="rgba(255,255,255,0.02)" vertical={false} /><XAxis dataKey="name" stroke="#666664" fontSize={11} axisLine={false} tickLine={false} dy={25} fontVariant="black" /><Tooltip contentStyle={{ background: '#0D0D0E', border: '1px solid rgba(212,255,92,0.4)', borderRadius: '24px', fontWeight: '950', fontSize: '15px', textTransform:'uppercase', boxShadow:'0 20px 50px rgba(0,0,0,0.8)' }} /><Line type="stepAfter" dataKey="val" stroke="#D4FF5C" strokeWidth={8} dot={{ r: 8, fill: '#D4FF5C', strokeWidth: 4, stroke: '#020202' }} activeDot={{ r: 16, fill: '#FFF', shadow: '0 0 30px #D4FF5C' }} animationDuration={2500} /></LineChart></ResponsiveContainer></div></Card></StaggeredItem>
       <div className="grid grid-cols-1 md:grid-cols-3 gap-10"><InsightCard Icon={TrendingUp} label="Operational Streak" val={m.streak} suffix="Active Units" color="text-orange-400" index={1} /><InsightCard Icon={Wallet} label="Vault Reserves" val={`$${(m.savings || 0).toFixed(2)}`} suffix="Financial Gain" color="text-emerald-400" index={2} /><InsightCard Icon={Activity} label="System Capacity" val={`${Math.floor((m.lost || 0)/60)}H ${(m.lost || 0)%60}M`} suffix="Recovery Latency" color="text-rose-400" index={3} /></div>
       <div className="space-y-10 pt-16 px-4"><div className="flex items-center justify-between px-2"><h4 className="text-[14px] font-black text-accent uppercase tracking-[0.6em]">Historical Activity Ledger</h4><History size={20} className="text-accent/30" /></div><div className="grid gap-6">{logs.sort((a,b)=>b.logDate.localeCompare(a.logDate)).map((log, i) => <StaggeredItem key={log.logDate} index={i+5}><Card className="py-12 flex items-center justify-between group border-white/5 hover:border-accent/30 shadow-2xl transition-all duration-700 px-14 hover:bg-white/[0.01] shadow-black shadow-2xl"><div className="flex flex-col space-y-2"><span className="text-3xl font-[950] tracking-tighter uppercase leading-none transition-all group-hover:text-white">{log.logDate === todayString ? 'Today' : new Date(log.logDate).toLocaleDateString(undefined, {month:'short', day:'numeric', weekday:'long'})}</span><span className="text-[11px] font-black text-text-dim uppercase tracking-[0.4em] mt-3 flex items-center transition-colors group-hover:text-accent/60 font-black"><History size={16} className="mr-3 opacity-40" /> {Object.values(log.counts || {}).reduce((a,b)=>a+b, 0)} logs committed to vault</span></div><div className="flex items-center space-x-12"><div className="flex -space-x-5">{Object.entries(log.counts || {}).map(([cid, count]) => <div key={cid} className="w-16 h-16 rounded-full bg-bg-panel border-[5px] border-bg-card flex items-center justify-center font-[950] text-base shadow-2xl transition-all group-hover:-translate-y-3 group-hover:scale-110 duration-500 hover:border-accent/40 shadow-black">{count}</div>)}</div><button onClick={() => onEdit(log)} className="p-5 rounded-[24px] bg-white/5 text-text-dim hover:text-accent hover:bg-accent/10 opacity-0 group-hover:opacity-100 transition-all border border-white/5 hover:scale-110 shadow-2xl shadow-black/50"><Edit2 size={24} /></button></div></Card></StaggeredItem>)}</div></div>
    </div>
  );
};

const SettingsScreen = ({ c, u, s, onAdd, onUpd, onReo, onDel }) => {
  const [al, setAl] = useState(u.displayName || 'Commander'); const [gl, setGl] = useState(s.goal || 'OPTIMIZATION');
  return (
    <div className="flex flex-col space-y-12 pb-40 text-white max-w-4xl mx-auto">
       <Card className="p-14 relative overflow-hidden bg-bg-panel/40 border-white/5 shadow-2xl transition-all duration-1000 hover:border-accent/20"><div className="flex items-center space-x-12 mb-16 relative z-10"><div className="w-36 h-36 bg-gradient-to-br from-accent/40 to-accent/5 rounded-[56px] border-2 border-accent/20 flex items-center justify-center text-7xl font-[950] text-accent uppercase shadow-[0_30px_60px_rgba(var(--accent-rgb),0.3)] transition-all hover:scale-105 duration-700">{u.photoURL ? <img src={u.photoURL} className="w-full h-full object-cover rounded-[52px]" alt="p" /> : al.charAt(0)}</div><div className="space-y-4"><h4 className="text-5xl font-[950] tracking-tighter uppercase leading-none">{al}</h4><div className="flex items-center space-x-4"><div className="h-2.5 w-2.5 rounded-full bg-accent animate-pulse shadow-[0_0_15px_#D4FF5C]" /><span className="text-[12px] font-black text-accent uppercase tracking-[0.6em] transition-all font-black">Vault Commander</span></div></div></div><div className="space-y-12 relative z-10"><Input label="Commander Identifier" value={al} onChange={setAl} /><Input label="Life Objective" value={gl} onChange={setGl} /><Button className="w-full h-22 rounded-[36px] shadow-2xl text-[10px] font-black transition-all hover:scale-[1.01]" onClick={() => onUpd({ displayName: al, goal: gl })}>Update Neural Link Parameters</Button></div><div className="absolute top-0 right-0 w-[600px] h-[600px] bg-accent/5 rounded-full blur-[200px] -mr-64 -mt-64 pointer-events-none opacity-40" /></Card>
       <Card className="p-14 space-y-16 border-white/5 shadow-2xl"><div className="grid grid-cols-1 md:grid-cols-2 gap-12 text-white"><Toggle icon={Moon} label="Obsidian Protocol" active={s.isDark} onClick={() => onUpd({ isDark: !s.isDark })} /><Toggle icon={Clock} label="Night Owl Mode" active={s.nightOwl} onClick={() => onUpd({ nightOwl: !s.nightOwl })} /><Toggle icon={Grid} label="Neural Matrix" active={s.layout === 'COMPACT'} onClick={() => onUpd({ layout: s.layout === 'LARGE' ? 'COMPACT' : 'LARGE' })} /><div className="p-10 bg-white/[0.02] rounded-[48px] border border-white/5 space-y-10 shadow-inner group hover:bg-white/[0.03] transition-all"><div className="flex items-center justify-between px-2 text-white text-xs font-[950] uppercase tracking-[0.5em] group-hover:text-accent font-black"><span>Accent Spectrum</span><Activity size={18} className="opacity-30" /></div><div className="flex flex-wrap gap-5">{ACCENTS.map(x => <button key={x.v} onClick={() => onUpd({ accent: x.v })} className={cn("w-16 h-16 rounded-[24px] border-4 transition-all duration-700 shadow-2xl", s.accent === x.v ? "border-white scale-110 shadow-accent/50 rotate-6" : "border-transparent opacity-40 hover:opacity-100 hover:rotate-6")} style={{ backgroundColor: x.v }} />)}</div></div></div><div className="pt-10 border-t border-white/5 text-white"><div className="flex justify-between items-center px-4 mb-10 text-white"><span className="text-[12px] font-[950] text-text-dim uppercase tracking-[0.5em]">Typography Scaling</span><span className="text-sm font-black text-accent">{Math.round(s.fontScale*100)}%</span></div><input type="range" min="0.8" max="1.3" step="0.1" value={s.fontScale} onChange={e => onUpd({ fontScale: parseFloat(e.target.value) })} className="w-full h-2 bg-white/5 rounded-full appearance-none cursor-pointer accent-accent shadow-inner hover:bg-white/10 transition-all" /></div></Card>
       <Card className="p-14 border-white/5 shadow-2xl text-white"><div className="flex justify-between items-center mb-16 px-2 text-white"><div className="space-y-2"><h4 className="text-4xl font-[950] uppercase tracking-tighter leading-none">Vault Algorithms</h4><p className="text-[11px] font-black text-text-dim uppercase tracking-[0.4em] mt-3 opacity-60 font-black">Manage operational protocols & economics</p></div><div className="p-5 bg-white/5 rounded-[32px] shadow-2xl border border-white/5 text-text-dim font-black"><RefreshCcw size={28} /></div></div><div className="space-y-16"><Input label="Global unit exchange rate ($)" value={s.globalPrice} onChange={(v) => onUpd({ globalPrice: v })} type="number" /><div className="space-y-8">{c.map(x => <div key={x.id} className="flex items-center justify-between p-12 bg-white/[0.01] rounded-[56px] border border-white/5 group hover:border-accent/40 transition-all duration-1000 shadow-2xl hover:bg-accent/[0.01] shadow-black/40"><div className="flex items-center space-x-10"><div className="flex flex-col space-y-3"><button onClick={() => onReo(x.id, 'up')} className="p-3 bg-white/5 rounded-xl text-text-dim hover:text-white transition-all hover:scale-110 shadow-lg border border-white/5"><ArrowUp size={16} /></button><button onClick={() => onReo(x.id, 'down')} className="p-3 bg-white/5 rounded-xl text-text-dim hover:text-white transition-all hover:scale-110 shadow-lg border border-white/5"><ArrowDown size={16} /></button></div><div className="flex flex-col space-y-1"><span className="text-2xl font-[950] uppercase leading-none group-hover:text-accent transition-all duration-700">{x.name}</span><span className="text-[11px] font-black text-text-dim uppercase tracking-[0.3em] mt-2 opacity-60 font-black">Threshold: {x.limit} UNITS • ARCHETYPE: {x.type}</span></div></div><div className="flex items-center space-x-6 opacity-0 group-hover:opacity-100 duration-700 transition-all translate-x-8 group-hover:translate-x-0"><button className="p-5 rounded-[24px] bg-white/5 text-text-dim hover:text-white border border-white/5 shadow-2xl transition-all hover:scale-110"><Edit2 size={24} /></button><button onClick={() => onDel(x.id)} className="p-5 rounded-[24px] bg-danger/5 text-danger/40 hover:text-danger border border-danger/10 shadow-2xl transition-all hover:scale-110"><Trash2 size={24} /></button></div></div>)}</div><Button variant="outline" className="w-full border-dashed border-2 rounded-[56px] h-28 hover:bg-accent/5 hover:border-accent group transition-all shadow-2xl shadow-black/40" onClick={onAdd}><Plus className="mr-6 group-hover:rotate-90 transition-transform duration-1000 text-accent scale-110" size={40} /><span className="text-base font-[950] tracking-[0.3em] group-hover:text-white">Initialize New Operational Tracker</span></Button></div></Card>
       <Button variant="danger" className="w-full h-24 rounded-[42px] shadow-[0_40px_80px_rgba(248,113,113,0.3)] hover:scale-[1.01] active:scale-[0.98] text-sm font-black transition-all shadow-black/80" onClick={() => signOut(auth)}>Emergency Session Termination</Button>
    </div>
  );
};

// --- HELPERS ---

const NavItem = ({ icon: Icon, active, onClick, label }) => (
  <motion.div onClick={onClick} whileTap={{ scale: 0.8 }} className="flex flex-col items-center justify-center flex-1 py-5 cursor-pointer relative group text-white">
    <Icon size={28} className={cn("mb-3 transition-all duration-1000", active ? "text-accent scale-125 drop-shadow-[0_0_20px_var(--accent)]" : "text-text-dim group-hover:text-text-muted")} /><span className={cn("text-[11px] font-black tracking-[0.3em] uppercase transition-colors duration-500", active ? "text-white" : "text-text-dim")}>{label}</span>
    {active && <motion.div layoutId="navDot" className="absolute -top-1 w-2.5 h-2.5 rounded-full bg-accent shadow-[0_0_30px_var(--accent)]" />}
  </motion.div>
);

const Toggle = ({ icon: Icon, label, active, onClick }) => (
  <div className="flex items-center justify-between p-10 bg-white/[0.02] rounded-[48px] border border-white/5 shadow-2xl transition-all hover:bg-white/[0.04] group text-white">
     <div className="flex items-center space-x-7"><div className="p-6 bg-white/5 rounded-[32px] text-text-muted shadow-2xl border border-white/5 group-hover:border-accent/20 transition-all duration-700 shadow-black/50"><Icon size={32} /></div><span className="text-sm font-[950] uppercase tracking-[0.5em] leading-none transition-all group-hover:text-white font-black">{label}</span></div>
     <button onClick={onClick} className={cn("w-20 h-11 rounded-full p-2.5 transition-all duration-1000 border border-white/10 shadow-inner", active ? "bg-accent shadow-accent/50" : "bg-white/10")}><div className={cn("w-6 h-6 rounded-full bg-white transition-all duration-1000 shadow-2xl", active ? "translate-x-10" : "translate-x-0")} /></button>
  </div>
);

const Overlay = ({ children, onClose, title }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/95 backdrop-blur-3xl overflow-y-auto">
     <motion.div initial={{ y: 200, scale: 0.95, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: 200, scale: 0.95, opacity: 0 }} transition={{ type: 'spring', damping: 25, stiffness: 120 }} className="w-full max-w-xl my-auto">
        <Card className="p-16 relative border-accent/40 shadow-[0_0_200px_rgba(var(--accent-rgb),0.2)] bg-bg-panel/98 rounded-[64px] border-2 shadow-black/80"><button onClick={onClose} className="absolute top-14 right-14 p-6 rounded-[32px] bg-white/5 text-text-dim hover:text-white transition-all border border-white/5 shadow-2xl group shadow-black/40"><X size={32} className="group-hover:rotate-90 transition-transform duration-700" /></button><div className="flex items-center space-x-8 text-accent mb-20 border-b border-white/10 pb-12"><div className="p-6 bg-accent/10 rounded-[32px] border border-accent/20 shadow-2xl text-accent shadow-black/40"><Activity size={40} className="animate-pulse" /></div><h3 className="text-5xl font-[950] tracking-tighter uppercase leading-none">{title}</h3></div><div className="text-white">{children}</div></Card>
     </motion.div>
  </div>
);

const AddForm = ({ onAdd }) => {
  const [n, setN] = useState(''); const [l, setL] = useState('20'); const [t, setT] = useState('CIGARETTE');
  return (
    <div className="space-y-14 text-white">
       <Input label="Neural Network Identifier" value={n} onChange={setN} placeholder="ASSIGN_TRACKER_ID" />
       <Input label="Threshold Objective" value={l} onChange={setL} type="number" />
       <div className="space-y-8"><span className="text-[12px] font-black text-text-dim uppercase tracking-[0.6em] ml-1">Visual Schema</span><div className="grid grid-cols-2 gap-6">{['CIGARETTE', 'SIMPLE', 'JOINT_KING', 'JOINT_QUEEN'].map(x => <button key={x} onClick={() => setT(x)} className={cn("h-20 rounded-[32px] border font-black text-[11px] uppercase tracking-[0.4em] transition-all duration-1000 shadow-2xl hover:scale-105 shadow-black/60", t === x ? "bg-accent text-bg-base border-accent shadow-[0_0_60px_var(--accent)] scale-110 rotate-1 shadow-black/40" : "bg-white/5 border-white/5 text-text-dim hover:border-white/30 hover:bg-white/10 shadow-black/60")}>{x.replace('_', ' ')}</button>)}</div></div>
       <Button size="lg" className="w-full shadow-[0_40px_100px_rgba(0,0,0,0.8)] h-24 rounded-[42px] text-base font-[950] shadow-black/60" onClick={() => onAdd(n, t, l)}>Commit Neural Link</Button>
    </div>
  );
};

const EditForm = ({ log, configs, onSave }) => {
  const [c, setC] = useState({ ...(log.counts || {}) });
  return (
    <div className="space-y-14 text-white">
       <div className="flex items-center space-x-8 p-8 bg-white/5 rounded-[42px] border border-white/5 shadow-2xl text-white shadow-black/50"><div className="p-5 bg-accent/10 rounded-[28px] border border-accent/20 shadow-inner"><Calendar size={32} className="text-accent" /></div><span className="text-lg font-black uppercase tracking-[0.4em] opacity-90">{new Date(log.logDate).toLocaleDateString(undefined, { dateStyle: 'full' })}</span></div>
       <div className="max-h-[400px] overflow-y-auto pr-8 space-y-12 scrollbar-thin scrollbar-thumb-accent/40 pb-10">{configs.map(x => <Input key={x.id} label={x.name} value={c[x.id] || 0} type="number" onChange={v => setC({...c, [x.id]: parseInt(v) || 0})} />)}</div>
       <Button size="lg" className="w-full h-24 rounded-[42px] shadow-2xl text-base font-[1000] transition-all hover:scale-[1.02] shadow-black/50" onClick={() => onSave(log.logDate, c)}><Save size={32} className="mr-6" /> Register Override</Button>
    </div>
  );
};

const InsightCard = ({ Icon, label, val, suffix, color, index }) => (
  <StaggeredItem index={index}>
    <Card className="flex flex-col items-center text-center py-16 bg-bg-panel/50 border-white/5 shadow-[0_50px_100px_rgba(0,0,0,0.6)] group relative overflow-hidden transition-all duration-1000 hover:border-accent/40 hover:bg-white/[0.01]">
      <div className={cn("p-8 rounded-[48px] bg-white/[0.04] mb-12 transition-all duration-1000 group-hover:scale-110 group-hover:bg-accent/10 border border-white/5 shadow-2xl relative z-10 shadow-black/50", color)}><Icon size={48} /></div>
      <div className="text-7xl font-[1000] leading-none tracking-tighter mb-4 text-white relative z-10 shadow-black drop-shadow-2xl">{val}</div>
      <div className="text-[12px] font-black text-text-muted uppercase tracking-[0.6em] relative z-10 opacity-70 font-black">{suffix}</div>
      <div className="mt-16 pt-12 border-t border-white/10 w-full flex items-center justify-center relative z-10 text-accent font-black tracking-[0.8em] text-[10px] opacity-60"><span>{label}</span></div>
      <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-accent/5 rounded-full blur-[150px]" />
    </Card>
  </StaggeredItem>
);

export default App;
