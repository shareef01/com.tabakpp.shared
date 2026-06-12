import React, { useState, useMemo, useEffect, Component, useCallback } from 'react';
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

const APP_VERSION = "4.6.0-PRO-MAX-OPT";

// --- GLOBAL ERROR BOUNDARY ---
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#020202] flex flex-col items-center justify-center p-12 text-center text-white font-inter">
          <div className="p-8 bg-danger/10 rounded-[32px] text-danger border border-danger/20 shadow-2xl mb-8"><AlertCircle size={48} /></div>
          <h2 className="text-3xl font-[950] uppercase tracking-tighter leading-none">System Malfunction</h2>
          <p className="text-text-dim text-sm mt-4 mb-10 max-w-xs font-bold opacity-60 leading-relaxed">{this.state.error?.message || "UI Logic Crash Detected"}</p>
          <Button onClick={() => { localStorage.clear(); window.location.reload(); }} className="w-64 h-16 rounded-full shadow-2xl">Hard Reset Vault</Button>
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

// --- MAIN WRAPPER ---
const AppWrapper = () => (
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

const App = () => {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('tracker');
  const [appError, setAppError] = useState(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  const [logs, setLogs] = useState([]);
  const [configs, setConfigs] = useState([]);
  const [settings, setSettings] = useState({
    accent: '#D4FF5C', isDark: true, layout: 'LARGE', fontScale: 1, nightOwl: false, globalPrice: '0.5', goal: 'SAVE FOR VACATION'
  });

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
      if (!u) { setLogs([]); setConfigs([]); }
    }, (err) => {
      setAppError("Auth sync failed: " + err.message);
      setAuthLoading(false);
    });
    return () => unsub();
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
          setSettings(p => ({ ...p,
            accent: d.accent || '#D4FF5C',
            isDark: d.isDark ?? true,
            layout: d.layout || 'LARGE',
            fontScale: d.fontScale || 1,
            nightOwl: d.nightOwl ?? false,
            globalPrice: d.globalPrice || '0.5',
            goal: d.goal || 'SAVE FOR VACATION'
          }));
        } else {
          setDoc(doc(db, 'users', uid), { accent: '#D4FF5C', isDark: true, goal: 'SAVE FOR VACATION' }, { merge: true });
        }
      });
      return () => { cUnsub(); lUnsub(); sUnsub(); };
    } catch (err) { setAppError("Vault Sync Failure: " + err.message); }
  }, [user]);

  const metrics = useMemo(() => {
    try {
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
    } catch (e) {
      return { count: 0, limit: 1, streak: 0, xp: 0, rank: '...', progress: 0, savings: 0, lost: 0, todayLog: { counts: {} }, coach: '...' };
    }
  }, [logs, configs, settings.globalPrice, today]);

  function generateCoach(count, limit, streak) {
    const p = limit > 0 ? count / limit : 0;
    if (count === 0 && streak > 0) return `Perfect start! You're on a ${streak}-day streak.`;
    if (p >= 1.0) return "Protocol Threshold. Security active.";
    return "Every session tracked is a data point for growth.";
  }

  const onInc = useCallback(async (id) => {
    if (!user) return;
    const ref = doc(db, 'users', user.uid, 'logs', today);
    const counts = metrics.todayLog.counts || {};
    await setDoc(ref, { logDate: today, counts: { ...counts, [id]: (counts[id] || 0) + 1 } }, { merge: true });
  }, [user, today, metrics.todayLog.counts]);

  const onDec = useCallback(async (id) => {
    if (!user) return;
    const counts = metrics.todayLog.counts || {};
    if (!counts[id] || counts[id] <= 0) return;
    const ref = doc(db, 'users', user.uid, 'logs', today);
    await setDoc(ref, { counts: { ...counts, [id]: counts[id] - 1 } }, { merge: true });
  }, [user, today, metrics.todayLog.counts]);

  const onUpdateSettings = useCallback((upd) => {
    if (!user) return;
    updateDoc(doc(db, 'users', user.uid), upd);
  }, [user]);

  if (appError) return <ErrorView msg={appError} />;
  if (authLoading) return <LoadingView />;
  if (!user) return <AuthScreen accent={settings.accent} />;

  const themeClass = settings.isDark ? "bg-[#020202] text-white" : "bg-[#F5F5F7] text-[#1D1D1F]";

  return (
    <div
      key={settings.isDark ? 'dark' : 'light'}
      className={cn("flex flex-col min-h-screen font-inter transition-all duration-700 overflow-hidden select-none", themeClass)}
      style={{ '--accent': settings.accent, '--accent-rgb': hexToRgb(settings.accent), fontSize: `${settings.fontScale}rem` }}
    >
      {/* HEADER - Safe Area Responsive */}
      <header className="fixed top-0 left-0 right-0 z-[100] pt-[calc(env(safe-area-inset-top)+0.5rem)] pb-6 px-6 md:px-12 flex justify-between items-center bg-inherit/90 backdrop-blur-3xl border-b border-white/5">
        <div className="flex flex-col">
          <h1 className="text-3xl md:text-4xl font-[1000] tracking-tighter uppercase leading-none transition-colors">tabak++</h1>
          <div className="flex items-center space-x-2 mt-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse shadow-[0_0_10px_var(--accent)]" />
            <span className="text-[9px] font-black tracking-[0.4em] uppercase opacity-60 text-accent">{activeTab}</span>
          </div>
        </div>
        <div className="relative">
          <button onClick={() => setShowProfileMenu(!showProfileMenu)} className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent overflow-hidden shadow-2xl transition-all active:scale-90 hover:border-accent/40">{user.photoURL ? <img src={user.photoURL} alt="p" className="w-full h-full object-cover" /> : <UserCircle size={24} />}</button>
          <AnimatePresence>
            {showProfileMenu && (
              <>
                <div className="fixed inset-0 z-[90]" onClick={() => setShowProfileMenu(false)} />
                <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} className={cn("absolute right-0 mt-4 w-56 rounded-[32px] p-2 shadow-2xl border backdrop-blur-3xl z-[100]", settings.isDark ? "bg-black/90 border-white/10" : "bg-white/95 border-black/5 shadow-black/10 shadow-2xl")}>
                  <button onClick={() => { setActiveTab('settings'); setShowProfileMenu(false); }} className="w-full flex items-center space-x-4 p-4 rounded-2xl hover:bg-accent/10 transition-colors text-sm font-[1000] uppercase tracking-widest"><Settings size={18} className="text-accent" /><span>Profile</span></button>
                  <button onClick={() => { signOut(auth); setShowProfileMenu(false); }} className="w-full flex items-center space-x-4 p-4 rounded-2xl hover:bg-danger/10 text-danger transition-colors text-sm font-[1000] uppercase tracking-widest border-t border-white/5 mt-1"><LogOut size={18} /><span>Terminate</span></button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* CONTENT - Safe Area Responsive */}
      <main className="flex-1 overflow-y-auto pt-[calc(env(safe-area-inset-top)+6.5rem)] pb-[calc(env(safe-area-inset-bottom)+9rem)] px-4 md:px-12 max-w-5xl mx-auto w-full transition-all duration-500">
        <AnimatePresence mode="wait">
          {activeTab === 'tracker' && <TrackerScreen key="t" m={metrics} c={configs} onInc={onInc} onDec={onDec} isDark={settings.isDark} view={settings.layout} onAdd={() => setActiveTab('settings')} />}
          {activeTab === 'health' && <HealthScreen key="h" last={Date.now() - 3600000 * 4} isDark={settings.isDark} />}
          {activeTab === 'history' && <HistoryScreen key="y" logs={logs} configs={configs} m={metrics} todayString={today} onEdit={setEditTarget} isDark={settings.isDark} />}
          {activeTab === 'settings' && <SettingsScreen key="s" c={configs} u={user} s={settings} onAdd={() => setShowAdd(true)} onUpd={onUpdateSettings} onReo={async (id, dir) => {
                const idx = configs.findIndex(x => x.id === id);
                if ((dir === 'up' && idx > 0) || (dir === 'down' && idx < configs.length - 1)) {
                   const n = [...configs]; const swap = dir === 'up' ? idx - 1 : idx + 1;
                   [n[idx], n[swap]] = [n[swap], n[idx]]; const final = n.map((x, i) => ({ ...x, order: i }));
                   setConfigs(final);
                   for (const x of final) { await updateDoc(doc(db, 'users', user.uid), { order: x.order }); }
                }
              }} onDel={async (id) => { await deleteDoc(doc(db, 'users', user.uid, 'configs', id)); }} />}
        </AnimatePresence>
      </main>

      {/* NAV - iPhone Home Indicator Responsive */}
      <nav className="fixed bottom-0 left-0 right-0 md:bottom-10 md:left-1/2 md:-translate-x-1/2 md:w-[600px] pb-[calc(env(safe-area-inset-bottom)+0.2rem)] md:pb-0 z-[110] px-4">
        <div className={cn("backdrop-blur-3xl border rounded-t-[36px] md:rounded-[40px] flex justify-around items-center h-22 md:h-22 px-4 md:px-6 shadow-2xl transition-all duration-500", settings.isDark ? "bg-black/80 border-white/5 shadow-black" : "bg-white/80 border-black/5 shadow-black/5 shadow-2xl")}>
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
  );
};

// --- SUB-COMPONENTS ---

const AuthScreen = ({ accent }) => {
  const [isL, setIsL] = useState(true);
  const [e, setE] = useState(''); const [p, setP] = useState(''); const [n, setN] = useState('');
  const [loading, setLoading] = useState(false); const [err, setErr] = useState('');
  const handle = async () => {
    setLoading(true); setErr('');
    try {
      if (isL) { await signInWithEmailAndPassword(auth, e, p); }
      else { const c = await createUserWithEmailAndPassword(auth, e, p); await updateProfile(c.user, { displayName: n }); await setDoc(doc(db, 'users', c.user.uid), { name: n, accent: '#D4FF5C', isDark: true, goal: 'SAVE FOR VACATION' }); }
    } catch (e) { setErr(e.message); } finally { setLoading(false); }
  };
  return (
    <div className="min-h-screen bg-[#020202] flex items-center justify-center p-6 text-white font-inter">
      <div className="w-full max-w-md space-y-12">
        <div className="flex flex-col items-center text-center"><div className="w-24 h-24 bg-accent rounded-[32px] flex items-center justify-center mb-8 shadow-2xl text-bg-base shadow-accent/20" style={{'--accent': accent}}><LayoutDashboard size={40} /></div><h1 className="text-5xl font-[950] tracking-tighter uppercase leading-none text-white font-inter">tabak++</h1></div>
        <Card className="space-y-6 bg-white/[0.03] border-white/5 p-10 backdrop-blur-lg shadow-2xl shadow-black"><div className="flex flex-col space-y-6">
          {err && <div className="p-4 bg-danger/10 border border-danger/20 rounded-2xl text-danger text-[10px] font-black uppercase tracking-widest leading-relaxed">{err}</div>}
          {!isL && <Input label="Vault Commander" value={n} onChange={setN} placeholder="Your Alias" isDark={true} />}
          <Input label="Vault ID" value={e} onChange={setE} placeholder="email@address.com" isDark={true} />
          <Input label="Security Phrase" type="password" value={p} onChange={setP} placeholder="••••••••" isDark={true} />
          <Button className="w-full h-18 text-xs shadow-2xl font-black uppercase tracking-[0.2em]" onClick={handle} disabled={loading} style={{'--accent': accent}}>{loading ? <Loader2 className="animate-spin" /> : (isL ? 'Access Vault' : 'Init Vault')}</Button>
          <div className="flex flex-col space-y-4 items-center pt-2"><button onClick={() => setIsL(!isL)} className="text-[10px] font-black text-text-dim uppercase tracking-widest hover:text-accent transition-all underline underline-offset-8 decoration-white/10">{isL ? "Request Access" : "Return to Login"}</button><button onClick={() => signInAnonymously(auth)} className="text-[10px] font-black text-accent/60 uppercase tracking-widest hover:text-accent transition-all">Guest entry</button></div>
        </div></Card>
      </div>
    </div>
  );
};

const NavItem = ({ icon: Icon, active, onClick, label, isDark }) => (
  <motion.div onClick={onClick} whileTap={{ scale: 0.8 }} className="flex flex-col items-center justify-center flex-1 py-4 cursor-pointer relative group">
    <Icon size={24} className={cn("mb-1 transition-all duration-700", active ? "text-accent scale-110 drop-shadow-[0_0_15px_var(--accent)]" : "text-text-dim group-hover:text-text-muted")} />
    <span className={cn("text-[8px] font-[1000] tracking-[0.2em] uppercase transition-colors duration-500", active ? (isDark ? "text-white" : "text-[#1D1D1F]") : "text-text-dim")}>{label}</span>
    {active && <motion.div layoutId="navDot" className="absolute -top-1 w-2 h-2 rounded-full bg-accent shadow-[0_0_20px_var(--accent)]" />}
  </motion.div>
);

const TrackerScreen = ({ m, c, onInc, onDec, view, isDark, onAdd }) => (
  <div className="flex flex-col space-y-8 pb-10">
    <StaggeredItem index={0}><Card className={cn("p-10 relative overflow-hidden group shadow-2xl transition-all duration-700", isDark ? "bg-white/[0.03] border-white/5 shadow-black" : "bg-white border-black/5 shadow-black/5")}><div className="flex justify-between items-end relative z-10 text-white"><div className="space-y-1.5"><span className="text-[9px] font-black text-text-dim uppercase tracking-[0.4em]">Vault Capacity</span><div className={cn("text-6xl font-[1000] tracking-tighter leading-none transition-colors", !isDark && "text-[#1D1D1F]")}>{Math.max(0, m.limit - m.count)} <span className="text-sm text-accent uppercase tracking-widest font-black ml-3 leading-none">Remaining</span></div></div><div className="text-right space-y-2 hidden md:block"><div className="px-4 py-1.5 bg-accent-soft rounded-xl text-accent text-[9px] font-black uppercase border border-accent/20">{m.rank}</div><div className={cn("text-3xl font-[1000] opacity-40 leading-none tracking-tighter", !isDark && "text-[#1D1D1F]")}>{m.xp} XP</div></div></div><div className="w-full h-3 bg-black/10 rounded-full overflow-hidden mt-10 p-0.5 border border-white/5 relative z-10 shadow-inner"><motion.div animate={{ width: `${Math.min(1, m.progress) * 100}%` }} className={cn("h-full rounded-full transition-all duration-1000 shadow-2xl", m.progress >= 1 ? "bg-danger shadow-[0_0_30px_#F87171]" : "bg-accent shadow-[0_0_20px_var(--accent)]")} /></div></Card></StaggeredItem>
    <div className={cn("grid gap-6 md:gap-10", view === 'COMPACT' ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-1 lg:grid-cols-2")}>
       {c.sort((a,b) => a.order - b.order).map((config, i) => <StaggeredItem key={config.id} index={i+1}><CounterCard config={config} count={(m.todayLog.counts || {})[config.id] || 0} onInc={() => onInc(config.id)} onDec={() => onDec(config.id)} isC={view === 'COMPACT'} isDark={isDark} /></StaggeredItem>)}
       <StaggeredItem index={c.length + 1}><button onClick={onAdd} className={cn("w-full border-2 border-dashed border-white/5 rounded-[36px] md:rounded-[48px] flex flex-col items-center justify-center space-y-4 hover:bg-white/[0.02] hover:border-accent/20 transition-all group relative overflow-hidden shadow-2xl shadow-black/10", view === 'COMPACT' ? "h-[320px]" : "h-[450px] md:h-[580px]")}><div className="w-16 h-16 rounded-[24px] bg-white/5 flex items-center justify-center group-hover:scale-110 group-hover:bg-accent/10 transition-all duration-500 shadow-inner shadow-black/40 text-text-dim group-hover:text-accent"><Plus size={28} /></div><span className="text-[9px] font-black text-text-dim uppercase tracking-[0.4em] group-hover:text-white transition-colors">Deploy Protocol</span></button></StaggeredItem>
    </div>
  </div>
);

const CounterCard = ({ config, count, onInc, onDec, isC, isDark }) => {
  const isL = count >= config.limit; const p = Math.min(1, count / config.limit);
  const isCig = config.type === 'CIGARETTE'; const isJoint = config.type.startsWith('JOINT');
  return (
    <Card className={cn("relative flex flex-col group transition-all duration-1000 p-10 md:p-12 overflow-hidden shadow-2xl", isL ? "bg-danger/[0.04] border-danger/50 shadow-[0_0_60px_rgba(248,113,113,0.15)]" : (isDark ? "bg-white/[0.03] border-white/5 shadow-black/20" : "bg-white border-black/5 shadow-black/5 shadow-2xl"), isC ? "min-h-[380px]" : "min-h-[480px] md:min-h-[580px]")}>
       <div className="flex flex-col items-center text-center space-y-1.5 mb-8 relative z-20"><span className={cn("text-[11px] font-[1000] tracking-[0.5em] uppercase transition-all duration-700", isL ? "text-danger" : "text-accent")}>{config.name}</span><span className="text-[9px] font-black text-text-dim uppercase tracking-[0.2em] opacity-60 font-black">Target: {config.limit}</span></div>
       <div className="flex-1 flex flex-col items-center justify-center relative z-10 py-6 md:py-10">
          {(isCig || isJoint) ? (
             <div className={cn("relative w-full h-12 md:h-14 rounded-full overflow-hidden transition-all duration-1000 border shadow-2xl", isL ? "bg-danger border-danger/40" : (isDark ? "bg-[#111] border-white/5 shadow-[inset_0_4px_20px_rgba(0,0,0,0.8)]" : "bg-[#EEE] border-black/5 shadow-inner"))}>
                <div className={cn("absolute left-0 inset-y-0 bg-[#1a1a1a] transition-all duration-700", isL && "bg-danger/40 w-full")} style={{ width: isL ? '100%' : `${p * 72}%` }} />
                {!isL && count > 0 && <div className="absolute inset-y-0 w-3 bg-[#FF3D00] shadow-[0_0_20px_#FF3D00] z-20" style={{ left: `calc(${p * 72}% - 1.5px)` }} />}
                {!isL && <div className={cn("absolute right-[28%] inset-y-0 transition-all duration-700 shadow-xl", isCig ? "bg-white" : "bg-[#C8E6C9]")} style={{ left: `${p * 72}%` }} />}
                <div className={cn("absolute inset-y-0 right-0 w-[28%] border-l border-black/20 z-[11]", isL ? "bg-danger" : (isCig ? "bg-[#D97706]" : "bg-[#333]"))} />
             </div>
          ) : (
             <div className="relative w-48 h-48 md:w-56 md:h-56 mb-8 flex items-center justify-center"><svg className="w-full h-full -rotate-90"><circle cx="112" cy="112" r="100" className={cn("fill-transparent stroke-[12]", isDark ? "stroke-white/5" : "stroke-black/5")} /><motion.circle cx="112" cy="112" r="100" className={cn("fill-transparent stroke-[12] transition-all duration-1000", isL ? "stroke-danger" : "stroke-accent shadow-accent")} strokeDasharray="628" initial={{ strokeDashoffset: 628 }} animate={{ strokeDashoffset: 628 - (Math.min(1, p) * 628) }} strokeLinecap="round" /></svg><div className="absolute inset-0 flex flex-col items-center justify-center"><div className={cn("text-6xl md:text-7xl font-[1000] tracking-tighter", isL ? "text-danger" : (isDark ? "text-white" : "text-[#1D1D1F]"))}>{count}</div><Activity size={20} className={cn("mt-1.5", isL ? "text-danger" : "text-accent")} /></div></div>
          )}
          {(isCig || isJoint) && <div className={cn("font-[1000] tracking-[-0.08em] leading-none mt-8 transition-all drop-shadow-2xl", isC ? "text-7xl" : "text-9xl md:text-[12rem]", isL ? "text-danger" : (isDark ? "text-white" : "text-[#1D1D1F]"))}>{count}</div>}
       </div>
       <div className="flex justify-center items-center space-x-10 md:space-x-12 relative z-20 pt-6">
          <motion.button whileTap={{ scale: 0.7 }} onClick={() => onDec(config.id)} className={cn("w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center transition-all shadow-xl", isDark ? "bg-white/5 border border-white/10 text-text-dim hover:text-white" : "bg-[#F5F5F7] border border-black/5 text-[#1D1D1F]/40 hover:text-black shadow-inner shadow-black/5")}><Minus size={28} /></motion.button>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => onInc(config.id)} className={cn("w-16 h-16 md:w-20 md:h-20 rounded-full border-2 flex items-center justify-center transition-all shadow-2xl", isL ? "border-danger text-danger bg-danger/10 shadow-danger/20" : "border-accent/40 text-accent bg-accent/5 hover:border-accent hover:rotate-1")}><Plus size={32} /></motion.button>
       </div>
    </Card>
  );
};

const HealthScreen = ({ last, isDark }) => {
  const miles = useMemo(() => SmokingCalculator.calculateRecoveryMilestones(last), [last]);
  const diff = Date.now() - (last || Date.now()); const h = Math.floor(diff / 3600000); const m = Math.floor((diff % 3600000) / 60000);
  return (
    <div className="flex flex-col space-y-10 md:space-y-12 pb-20">
       <Card className={cn("p-10 md:p-14 overflow-hidden relative shadow-2xl", isDark ? "bg-white/[0.03] border-white/5 shadow-black" : "bg-white border-black/5 shadow-black/5")}><div className="flex justify-between items-center mb-10 md:mb-14 relative z-10"><div className="w-20 h-20 md:w-24 md:h-24 rounded-[32px] md:rounded-[42px] bg-success/20 flex items-center justify-center border border-success/30 text-success shadow-2xl shadow-success/20"><Heart size={40} fill="currentColor" /></div><div className="text-right"><span className="text-[10px] font-black text-text-dim uppercase tracking-[0.4em]">Vault Security State</span><div className={cn("text-5xl md:text-6xl font-[1000] text-success tracking-tighter mt-2 drop-shadow-2xl", !isDark && "text-success")}>{h}<span className="text-xl mx-2 opacity-60 font-black">H</span>{m}<span className="text-xl mx-2 opacity-60 font-black">M</span></div></div></div><h2 className={cn("text-4xl md:text-5xl font-[1000] tracking-tighter uppercase leading-none mb-3 relative z-10", !isDark && "text-[#1D1D1F]")}>Biological Repair</h2><p className="text-sm md:text-base font-bold text-text-muted max-w-lg relative z-10 leading-relaxed opacity-80 border-l-4 border-success/30 pl-6 md:pl-8 transition-all hover:opacity-100 font-inter">Neural and cellular sequences are currently re-aligning. Recovery protocols verified.</p><div className="absolute top-0 right-0 w-[600px] h-[600px] bg-success/10 rounded-full blur-[180px] -mr-64 -mt-64 animate-pulse" /></Card>
       <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10 pb-32">{miles.map((m, i) => <StaggeredItem key={m.title} index={i+1}><Card className={cn("h-full flex flex-col group p-10 md:p-12 transition-all duration-1000 hover:bg-white/[0.01] shadow-2xl", isDark ? "bg-white/[0.03] border-white/5 shadow-black" : "bg-white border-black/5 shadow-black/5 shadow-2xl")}><div className="flex justify-between items-start mb-10 md:mb-12"><div className="space-y-1.5 md:space-y-2"><span className={cn("text-[9px] md:text-[10px] font-[1000] uppercase tracking-[0.5em] transition-all duration-1000", m.progress >= 1 ? "text-success shadow-success" : "text-text-dim group-hover:text-success/50")}>{m.progress >= 1 ? 'Phase Stabilized' : 'In Progress'}</span><h4 className={cn("text-2xl md:text-3xl font-[1000] tracking-tighter uppercase leading-none mt-1 md:mt-2 transition-all duration-700", !isDark && "text-[#1D1D1F]")}>{m.title}</h4></div><div className="text-5xl md:text-6xl font-[1000] text-success tracking-tighter transition-all duration-700 group-hover:scale-110">{Math.floor(m.progress * 100)}%</div></div><div className="w-full h-2 md:h-2.5 bg-black/10 rounded-full overflow-hidden mb-10 md:mb-12 border border-white/5 p-0.5 shadow-inner relative"><motion.div animate={{ width: `${m.progress * 100}%` }} className="h-full bg-success shadow-[0_0_30px_rgba(74,222,128,0.6)] rounded-full transition-all duration-1000" /></div><p className="text-xs md:text-sm font-bold text-text-muted leading-relaxed opacity-80 group-hover:opacity-100 transition-opacity flex-1 leading-loose border-l-2 border-white/5 pl-6 md:pl-8 font-inter">{m.desc}</p></Card></StaggeredItem>)}</div>
    </div>
  );
};

const HistoryScreen = ({ logs, configs, todayString, onEdit, m, isDark }) => {
  const chart = useMemo(() => [...logs].sort((a,b)=>a.logDate.localeCompare(b.logDate)).slice(-7).map(l => {
     const counts = l.counts || {}; const firstKey = Object.keys(counts)[0] || 'cigarettes';
     return { name: new Date(l.logDate).toLocaleDateString(undefined, {weekday:'short'}).toUpperCase(), val: counts[firstKey] || 0 };
  }), [logs]);
  return (
    <div className="flex flex-col space-y-10 md:space-y-12 pb-20">
       <StaggeredItem index={0}><Card className={cn("p-0 overflow-hidden shadow-2xl", isDark ? "bg-white/[0.03] border-accent/20 shadow-black" : "bg-white border-black/5 shadow-black/5 shadow-2xl")}><div className="p-10 md:p-14 pb-8 md:pb-10 flex justify-between items-start"><div className="space-y-1.5 md:space-y-2"><span className="text-[10px] md:text-[11px] font-[1000] text-text-dim uppercase tracking-[0.5em]">Analytics Engine</span><h3 className={cn("text-4xl md:text-5xl font-[1000] text-accent mt-1 md:mt-2 uppercase tracking-tighter leading-none font-black")}>Usage Volatility</h3></div><div className="p-4 md:p-5 bg-accent-soft rounded-2xl md:rounded-[32px] border border-accent/20 shadow-2xl text-accent font-black"><BarChart3 size={32} /></div></div><div className="h-[280px] md:h-[350px] w-full pr-10 md:pr-14 pl-4 md:pl-6 pb-10 md:pb-14"><ResponsiveContainer width="100%" height="100%"><LineChart data={chart}><CartesianGrid strokeDasharray="8 8" stroke="rgba(128,128,128,0.1)" vertical={false} /><XAxis dataKey="name" stroke="#888" fontSize={10} axisLine={false} tickLine={false} dy={20} fontVariant="black" /><Tooltip contentStyle={{ background: isDark ? '#0D0D0E' : '#FFF', border: '1px solid var(--accent)', borderRadius: '24px', fontWeight: '950', fontSize: '13px', textTransform:'uppercase', boxShadow:'0 20px 50px rgba(0,0,0,0.4)', color: isDark ? '#FFF' : '#1D1D1F' }} /><Line type="monotone" dataKey="val" stroke="var(--accent)" strokeWidth={6} dot={{ r: 6, fill: 'var(--accent)', strokeWidth: 3, stroke: isDark ? '#020202' : '#FFF' }} activeDot={{ r: 12, fill: '#FFF', shadow: '0 0 30px var(--accent)' }} animationDuration={2500} /></LineChart></ResponsiveContainer></div></Card></StaggeredItem>
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10"><InsightCard Icon={TrendingUp} label="Streak" val={m.streak} suffix="Active Units" color="text-orange-400" index={1} isDark={isDark} /><InsightCard Icon={Wallet} label="Savings" val={`$${m.savings.toFixed(2)}`} suffix="Financial Gain" color="text-emerald-400" index={2} isDark={isDark} /><InsightCard Icon={Activity} label="Health Cost" val={`${Math.floor(m.lost/60)}H`} suffix="Time Impact" color="text-rose-400" index={3} isDark={isDark} /></div>
       <div className="space-y-8 md:space-y-10 pt-12 md:pt-16 px-2 md:px-4"><div className="flex items-center justify-between px-2"><h4 className="text-[12px] md:text-[14px] font-[1000] text-accent uppercase tracking-[0.6em]">Activity Ledger</h4><History size={18} className="text-accent/30" /></div><div className="grid gap-4 md:gap-6">{logs.sort((a,b)=>b.logDate.localeCompare(a.logDate)).map((log, i) => <StaggeredItem key={log.logDate} index={i+5}><Card className={cn("py-10 md:py-12 flex items-center justify-between group p-10 md:p-14 transition-all duration-700 shadow-2xl shadow-black/10", isDark ? "bg-white/[0.03] border-white/5 shadow-black" : "bg-white border-black/5 shadow-black/5 shadow-2xl")}><div className="flex flex-col space-y-1.5 md:space-y-2"><span className={cn("text-2xl md:text-3xl font-[1000] tracking-tighter uppercase leading-none transition-colors", !isDark && "text-[#1D1D1F]")}>{log.logDate === todayString ? 'Today' : new Date(log.logDate).toLocaleDateString(undefined, {month:'short', day:'numeric', weekday:'long'})}</span><span className="text-[10px] md:text-[11px] font-[900] text-text-dim uppercase tracking-[0.4em] mt-2 md:mt-3 flex items-center"><History size={14} className="mr-2.5 opacity-40" /> {Object.values(log.counts || {}).reduce((a,b)=>a+b, 0)} logs committed</span></div><div className="flex items-center space-x-8 md:space-x-12"><div className="flex -space-x-4 md:-space-x-5">{Object.entries(log.counts || {}).map(([cid, count]) => <div key={cid} className={cn("w-14 h-14 md:w-16 md:h-16 rounded-full border-[4px] md:border-[5px] flex items-center justify-center font-[1000] text-sm md:text-base shadow-2xl transition-all group-hover:-translate-y-2.5", isDark ? "bg-black border-white/5 text-white" : "bg-white border-black/5 text-black shadow-black/10")}>{count}</div>)}</div><button onClick={() => onEdit(log)} className={cn("p-4 md:p-5 rounded-2xl md:rounded-[24px] transition-all hover:scale-110 shadow-inner", isDark ? "bg-white/5 text-text-dim hover:text-accent" : "bg-[#F5F5F7] text-black/40 hover:text-accent shadow-inner")}><Edit2 size={20} /></button></div></Card></StaggeredItem>)}</div></div>
    </div>
  );
};

const SettingsScreen = ({ c, u, s, onAdd, onUpd, onReo, onDel }) => {
  const [al, setAl] = useState(u.displayName || 'Commander'); const [gl, setGl] = useState(s.goal || 'OPTIMIZATION');
  return (
    <div className="flex flex-col space-y-10 md:space-y-12 pb-40">
       <Card className={cn("p-10 md:p-14 relative overflow-hidden shadow-2xl", s.isDark ? "bg-white/[0.03] border-white/5 shadow-black" : "bg-white border-black/5 shadow-black/5")}><div className="flex items-center space-x-8 md:space-x-12 mb-12 md:mb-16 relative z-10"><div className="w-32 h-32 md:w-36 md:h-36 bg-accent rounded-[42px] md:rounded-[56px] border-2 border-accent/20 flex items-center justify-center text-6xl md:text-7xl font-[1000] text-bg-base shadow-2xl overflow-hidden shadow-accent/20 transition-all active:scale-95">{u.photoURL ? <img src={u.photoURL} className="w-full h-full object-cover" alt="p" /> : al.charAt(0)}</div><div className="space-y-3 md:space-y-4"><h4 className={cn("text-4xl md:text-5xl font-[1000] tracking-tighter uppercase leading-none transition-colors", !s.isDark && "text-[#1D1D1F]")}>{al}</h4><div className="flex items-center space-x-3 md:space-x-4"><div className="h-2 w-2 md:h-2.5 md:w-2.5 rounded-full bg-accent animate-pulse shadow-[0_0_15px_var(--accent)]" /><span className="text-[11px] md:text-[12px] font-black uppercase tracking-[0.6em] text-accent font-bold font-inter">Vault Commander</span></div></div></div><div className="space-y-10 md:space-y-12 relative z-10"><Input label="Identifier" value={al} onChange={setAl} isDark={s.isDark} /><Input label="Objective" value={gl} onChange={setGl} isDark={s.isDark} /><Button className="w-full h-20 md:h-22 rounded-[32px] shadow-2xl text-[10px] md:text-[11px] font-[1000] uppercase tracking-widest active:scale-95 transition-all" onClick={() => onUpd({ displayName: al, goal: gl })}>Update Parameters</Button></div></Card>
       <Card className={cn("p-10 md:p-14 space-y-12 md:space-y-16 shadow-2xl", s.isDark ? "bg-white/[0.03] border-white/5 shadow-black" : "bg-white border-black/5 shadow-black/5 shadow-2xl")}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12"><Toggle icon={Moon} label="Obsidian Mode" active={s.isDark} onClick={() => onUpd({ isDark: !s.isDark })} isDark={s.isDark} /><Toggle icon={Clock} label="Night Owl Mode" active={s.nightOwl} onClick={() => onUpd({ nightOwl: !s.nightOwl })} isDark={s.isDark} /><Toggle icon={Grid} label="Neural Matrix" active={s.layout === 'COMPACT'} onClick={() => onUpd({ layout: s.layout === 'LARGE' ? 'COMPACT' : 'LARGE' })} isDark={s.isDark} />
             <div className={cn("p-8 md:p-10 rounded-[36px] md:rounded-[48px] border space-y-8 md:space-y-10 shadow-inner transition-all", s.isDark ? "bg-black/40 border-white/5 shadow-black/40" : "bg-[#F0F2F5] border-black/5 shadow-inner")}><div className="flex items-center justify-between px-1 md:px-2 text-[10px] md:text-xs font-[1000] uppercase tracking-[0.5em] opacity-60"><span>Accent Spectrum</span><Activity size={16} className="opacity-30" /></div><div className="flex flex-wrap gap-4 md:gap-5">{ACCENTS.map(x => (
                   <button key={x.v} onClick={() => onUpd({ accent: x.v })} className={cn("w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl border-[3px] md:border-4 transition-all duration-700 shadow-2xl active:scale-90 relative", s.accent === x.v ? "border-white scale-110 shadow-accent/50" : "border-transparent opacity-40 hover:opacity-100")} style={{ backgroundColor: x.v }}>
                      {s.accent === x.v && <motion.div layoutId="colorCheck" className="absolute inset-0 flex items-center justify-center text-white"><Check size={18} strokeWidth={4} /></motion.div>}
                   </button>
                ))}</div></div></div>
          <div className="pt-8 md:pt-10 border-t border-white/10"><div className="flex justify-between items-center px-2 md:px-4 mb-8 md:mb-10"><span className={cn("text-[11px] md:text-[12px] font-[1000] uppercase tracking-[0.5em]", s.isDark ? "text-text-dim" : "text-[#1D1D1F]/60")}>Typography Scaling</span><span className="text-sm font-black text-accent">{Math.round(s.fontScale*100)}%</span></div><input type="range" min="0.8" max="1.3" step="0.1" value={s.fontScale} onChange={e => onUpd({ fontScale: parseFloat(e.target.value) })} className="w-full h-2 bg-black/10 rounded-full appearance-none cursor-pointer accent-accent shadow-inner transition-all hover:bg-black/20" /></div>
       </Card>
       <Card className={cn("p-10 md:p-14 border-white/5 shadow-2xl", s.isDark ? "bg-white/[0.03] border-white/5 shadow-black" : "bg-white border-black/5 shadow-black/5 shadow-2xl")}>
          <div className="flex justify-between items-center mb-12 md:mb-16 px-1 md:px-2"><div className="space-y-1.5 md:space-y-2"><h4 className={cn("text-3xl md:text-4xl font-[1000] uppercase tracking-tighter leading-none transition-colors", !s.isDark && "text-[#1D1D1F]")}>Protocols</h4><p className="text-[10px] md:text-[11px] font-black text-text-dim uppercase tracking-[0.4em] mt-2 md:mt-3 opacity-60 font-black font-inter">Manage operational logic</p></div><div className={cn("p-4 md:p-5 rounded-2xl md:rounded-[32px] shadow-2xl border", s.isDark ? "bg-white/5 border-white/5" : "bg-black/5 border-black/5 text-black/30")}><RefreshCcw size={24} /></div></div>
          <div className="space-y-12 md:space-y-16"><Input label="Global unit rate ($)" value={s.globalPrice} onChange={(v) => onUpd({ globalPrice: v })} type="number" isDark={s.isDark} /><div className="space-y-6 md:space-y-8">{c.map(x => <div key={x.id} className={cn("flex items-center justify-between p-10 md:p-12 rounded-[42px] md:rounded-[56px] border group transition-all duration-1000 shadow-2xl hover:border-accent/40", s.isDark ? "bg-white/[0.01] border-white/5 shadow-black/40" : "bg-[#F5F5F7] border-black/5 shadow-inner")}><div className="flex items-center space-x-8 md:space-x-10"><div className="flex flex-col space-y-2 md:space-y-3"><button onClick={() => onReo(x.id, 'up')} className={cn("p-2.5 rounded-lg transition-all hover:scale-110 shadow-lg", s.isDark ? "bg-white/5 text-text-dim" : "bg-black/5 text-[#1D1D1F]/20")}><ArrowUp size={14} /></button><button onClick={() => onReo(x.id, 'down')} className={cn("p-2.5 rounded-lg transition-all hover:scale-110 shadow-lg", s.isDark ? "bg-white/5 text-text-dim" : "bg-black/5 text-[#1D1D1F]/20")}><ArrowDown size={14} /></button></div><div className="flex flex-col space-y-1"><span className={cn("text-xl md:text-2xl font-[1000] uppercase leading-none transition-all group-hover:text-accent", !s.isDark && "text-[#1D1D1F]")}>{x.name}</span><span className="text-[10px] md:text-[11px] font-black text-text-dim uppercase tracking-[0.3em] mt-1.5 md:mt-2 opacity-60 font-black font-inter">Target: {x.limit} UNITS</span></div></div><div className="flex items-center space-x-5 md:space-x-6 opacity-0 group-hover:opacity-100 duration-700 transition-all translate-x-8 group-hover:translate-x-0"><button onClick={() => onDel(x.id)} className="p-4 md:p-5 rounded-2xl md:rounded-[24px] bg-danger/5 text-danger/40 hover:text-danger border border-danger/10 shadow-2xl transition-all hover:scale-110"><Trash2 size={20} /></button></div></div>)}</div><Button variant="outline" className={cn("w-full border-dashed border-2 rounded-[42px] md:rounded-[56px] h-24 md:h-28 hover:bg-accent-soft hover:border-accent group transition-all transition-colors shadow-black/5", !s.isDark && "text-[#1D1D1F] border-black/10 shadow-inner")} onClick={onAdd}><Plus className="mr-5 md:mr-6 group-hover:rotate-90 transition-transform duration-1000 text-accent scale-110" size={32} /><span className="text-sm md:text-base font-[1000] tracking-[0.3em]">Initialize Tracker</span></Button></div>
       </Card>
       <Button variant="danger" className="w-full h-20 md:h-24 rounded-[32px] md:rounded-[42px] shadow-2xl hover:scale-[1.01] active:scale-[0.98] text-xs md:text-sm font-black transition-all shadow-black/80 shadow-black/50" onClick={() => signOut(auth)}>Emergency Session Termination</Button>
    </div>
  );
};

// --- HELPERS ---

const Toggle = ({ icon: Icon, label, active, onClick, isDark }) => (
  <div onClick={onClick} className={cn("flex items-center justify-between p-8 md:p-10 rounded-[36px] md:rounded-[48px] border shadow-2xl transition-all hover:scale-[1.02] active:scale-[0.98] group cursor-pointer shadow-black/5", isDark ? "bg-white/[0.02] border-white/5 shadow-black/40" : "bg-white border-black/5 shadow-black/5 shadow-2xl")}>
     <div className="flex items-center space-x-5 md:space-x-7"><div className={cn("p-5 md:p-6 rounded-2xl md:rounded-[32px] transition-all duration-700 shadow-2xl", isDark ? "bg-white/5 border border-white/5 shadow-black" : "bg-[#F0F2F5] border-black/5 shadow-inner shadow-black/10")}><Icon size={28} className={cn(active ? "text-accent" : (isDark ? "text-white/40" : "text-black/40"))} /></div><span className={cn("text-xs md:text-sm font-[1000] uppercase tracking-[0.5em] leading-none transition-all font-black transition-colors", !isDark && "text-[#1D1C1E]")}>{label}</span></div>
     <div className={cn("w-16 h-10 md:w-20 md:h-11 rounded-full p-2 md:p-2.5 transition-all duration-500 shadow-inner relative shadow-black/30", active ? "bg-accent shadow-[0_0_20px_var(--accent)]" : "bg-black/20 shadow-black/50")}><motion.div animate={{ x: active ? (window.innerWidth > 768 ? 36 : 24) : 0 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }} className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-white shadow-2xl shadow-black/40" /></div>
  </div>
);

const Overlay = ({ children, onClose, title, isDark }) => (
  <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/95 backdrop-blur-3xl overflow-y-auto"><motion.div initial={{ y: 200, scale: 0.95, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: 200, scale: 0.95, opacity: 0 }} transition={{ type: 'spring', damping: 25, stiffness: 120 }} className="w-full max-w-xl my-auto"><Card className={cn("p-12 md:p-16 relative border-2 shadow-2xl shadow-black", isDark ? "bg-[#0A0A0A] border-accent/40 shadow-accent/10" : "bg-white border-black/5 shadow-black/40 shadow-2xl")}><button onClick={onClose} className={cn("absolute top-10 md:top-14 right-10 md:right-14 p-5 md:p-6 rounded-[28px] md:rounded-[32px] transition-all group", isDark ? "bg-white/5 text-text-dim hover:text-white" : "bg-black/5 text-[#1D1D1F]/40 hover:text-black")}><X size={28} className="group-hover:rotate-90 transition-transform duration-700" /></button><div className="flex items-center space-x-6 md:space-x-8 text-accent mb-16 md:mb-20 border-b border-white/10 pb-10 md:pb-12"><div className="p-5 md:p-6 bg-accent-soft rounded-2xl md:rounded-[32px] border border-accent/20 shadow-2xl text-accent shadow-accent/20"><Activity size={32} className="animate-pulse" /></div><h3 className={cn("text-4xl md:text-5xl font-[1000] tracking-tighter uppercase leading-none font-inter", !isDark && "text-[#1D1D1F]")}>{title}</h3></div><div className={cn(!isDark && "text-[#1D1D1F]")}>{children}</div></Card></motion.div></div>
);

const AddForm = ({ onAdd, isDark }) => {
  const [n, setN] = useState(''); const [l, setL] = useState('20'); const [t, setT] = useState('CIGARETTE');
  return (
    <div className="space-y-12 md:space-y-14">
       <Input label="Label" value={n} onChange={setN} placeholder="ASSIGN_TRACKER_ID" isDark={isDark} />
       <Input label="Capacity" value={l} onChange={setL} type="number" isDark={isDark} />
       <div className="space-y-6 md:space-y-8"><span className="text-[11px] md:text-[12px] font-black text-text-dim uppercase tracking-[0.6em] ml-1">Visual Schema</span><div className="grid grid-cols-2 gap-4 md:grid-cols-2 md:gap-6">{['CIGARETTE', 'SIMPLE', 'JOINT_KING', 'JOINT_QUEEN'].map(x => <button key={x} onClick={() => setT(x)} className={cn("h-16 md:h-20 rounded-2xl md:rounded-[32px] border font-[1000] text-[10px] md:text-[11px] uppercase tracking-[0.4em] transition-all duration-1000 shadow-2xl active:scale-95", t === x ? "bg-accent text-bg-base border-accent shadow-[0_0_60px_var(--accent)]" : (isDark ? "bg-black/5 border-black/5 text-text-dim" : "bg-black/5 border-black/5 text-black/40"))} >{x.replace('_',' ')}</button>)}</div></div>
       <Button size="lg" className="w-full shadow-2xl h-20 md:h-24 rounded-[32px] md:rounded-[42px] text-sm md:text-base font-[1000] uppercase active:scale-95 shadow-black/60 shadow-black/40" onClick={() => onAdd(n, t, l)}>Authorize Protocol</Button>
    </div>
  );
};

const EditForm = ({ log, configs, onSave, isDark }) => {
  const [c, setC] = useState({ ...(log.counts || {}) });
  return (
    <div className="space-y-12 md:space-y-14">
       <div className={cn("flex items-center space-x-6 md:space-x-8 p-6 md:p-8 rounded-[36px] md:rounded-[42px] border shadow-inner", isDark ? "bg-black/40 border-white/5 shadow-black/30" : "bg-black/5 border-black/5 shadow-inner")}><div className="p-4 md:p-5 bg-accent-soft rounded-2xl md:rounded-[28px] border border-accent/20 shadow-accent/20 shadow-xl"><Calendar size={28} className="text-accent" /></div><span className={cn("text-base md:text-lg font-black uppercase tracking-[0.4em] opacity-90", !isDark && "text-[#1D1D1F]")}>{new Date(log.logDate).toLocaleDateString(undefined, { dateStyle: 'full' })}</span></div>
       <div className="max-h-[350px] md:max-h-[400px] overflow-y-auto pr-6 md:pr-8 space-y-10 md:space-y-12 scrollbar-thin scrollbar-thumb-accent/40 pb-10">{configs.map(x => <Input key={x.id} label={x.name} value={c[x.id] || 0} type="number" onChange={v => setC({...c, [x.id]: parseInt(v) || 0})} isDark={isDark} />)}</div>
       <Button size="lg" className="w-full h-20 md:h-24 rounded-[32px] md:rounded-[42px] shadow-2xl text-sm md:text-base font-[1000] transition-all hover:scale-[1.02] active:scale-95 shadow-black/50" onClick={() => onSave(log.logDate, c)}><Save size={28} className="mr-5 md:mr-6" /> Commit Override</Button>
    </div>
  );
};

const InsightCard = ({ Icon, label, val, suffix, color, index, isDark }) => (
  <StaggeredItem index={index}>
    <Card className={cn("flex flex-col items-center text-center py-12 md:py-16 transition-all duration-1000 shadow-2xl group shadow-black/5 shadow-black/10 shadow-2xl", isDark ? "bg-white/[0.03] border-white/5 shadow-black" : "bg-white border-black/5")}>
      <div className={cn("p-6 md:p-8 rounded-[36px] md:rounded-[48px] mb-10 md:mb-12 transition-all duration-1000 group-hover:scale-110 shadow-2xl relative z-10", color, isDark ? "bg-white/[0.04]" : "bg-[#F0F2F5] shadow-inner")}><Icon size={40} /></div>
      <div className={cn("text-5xl md:text-7xl font-[1000] leading-none tracking-tighter mb-3 md:mb-4 relative z-10 drop-shadow-2xl transition-colors font-inter", !isDark && "text-[#1D1D1F]")}>{val}</div>
      <div className="text-[10px] md:text-[12px] font-black text-text-dim uppercase tracking-[0.6em] relative z-10 opacity-70 font-bold">{suffix}</div>
      <div className="mt-12 md:mt-16 pt-10 md:pt-12 border-t border-white/10 w-full flex items-center justify-center relative z-10 text-accent font-black tracking-[0.8em] text-[9px] md:text-[10px] opacity-60 uppercase font-black">{label}</div>
    </Card>
  </StaggeredItem>
);

const ErrorView = ({ msg }) => <div className="min-h-screen bg-[#020202] flex flex-col items-center justify-center p-12 text-center text-white font-inter"><AlertCircle className="text-danger mb-6" size={48} /><h2 className="text-2xl font-black uppercase tracking-tighter leading-none mb-2 text-white font-black font-inter">System Terminal Fail</h2><p className="text-text-dim text-sm max-w-xs">{msg}</p><Button onClick={() => window.location.reload()} className="mt-8 rounded-full">Re-Initialize Vault</Button></div>;
const LoadingView = () => <div className="min-h-screen bg-[#020202] flex flex-col items-center justify-center space-y-6 text-accent font-inter"><Loader2 className="animate-spin" size={48} /><span className="text-[10px] font-black tracking-[0.5em] uppercase text-accent font-black">Syncing Neural Link...</span></div>;

export default AppWrapper;
