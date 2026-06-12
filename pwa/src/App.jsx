import React, { useState, useMemo, useEffect, Component, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, BarChart3, Settings, LogOut,
  ChevronRight, Info, History, Plus, Minus, Edit2, Trash2,
  TrendingUp, Wallet, Activity, Calendar, Clock, ArrowUp, ArrowDown, X,
  Save, AlertCircle, RefreshCcw, Camera, Target, Layout, Type, Grid,
  Database, ShieldCheck, Flame, Loader2, InfoIcon, User, UserCircle, Moon, Check, Sparkles, Zap, Upload
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
  doc, setDoc, collection, onSnapshot, query, orderBy, limit, deleteDoc, updateDoc, getDoc
} from 'firebase/firestore';

import { SmokingCalculator } from './utils/smokingCalculator';
import { Card, Button, Input, StaggeredItem } from './components/Common';
import { cn } from './utils/utils';

const APP_VERSION = "8.0.0-PUBLISH-READY";

// --- GLOBAL ERROR BOUNDARY ---
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#020202] flex flex-col items-center justify-center p-12 text-center text-white font-inter">
          <div className="p-8 bg-danger/10 rounded-[32px] text-danger border border-danger/20 shadow-2xl mb-8 font-inter"><AlertCircle size={48} /></div>
          <h2 className="text-3xl font-[950] uppercase tracking-tighter leading-none">System Crash</h2>
          <p className="text-text-dim text-sm mt-4 mb-10 max-w-xs font-bold opacity-60 leading-relaxed">{this.state.error?.message || "UI Logic Collision Detected."}</p>
          <Button onClick={() => { localStorage.clear(); window.location.reload(); }} className="w-64 h-18 rounded-full shadow-2xl font-black uppercase tracking-widest bg-white text-black">Reset Identity</Button>
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
  { n: 'Lime', v: '#D4FF5C' }, { n: 'Emerald', v: '#4ADE80' }, { n: 'Sky', v: '#38BDF8' },
  { n: 'Violet', v: '#A78BFA' }, { n: 'Amber', v: '#FBBF24' }, { n: 'Rose', v: '#FB7185' }
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
    accent: '#D4FF5C', isDark: true, layout: 'LARGE', fontScale: 1, nightOwl: false, globalPrice: '0.5'
  });

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
      if (!u) { setLogs([]); setConfigs([]); }
    }, (err) => {
      setAppError("Link failed: " + err.message);
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
            globalPrice: d.globalPrice || '0.5'
          }));
        } else {
          setDoc(doc(db, 'users', uid), { accent: '#D4FF5C', isDark: true }, { merge: true });
        }
      });
      return () => { cUnsub(); lUnsub(); sUnsub(); };
    } catch (err) { setAppError("Data sync failed: " + err.message); }
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
    if (count === 0 && streak > 0) return `On a ${streak}-day streak!`;
    if (p >= 1.0) return "Daily threshold reached.";
    return "Track every session for deep insights.";
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
      <header className="fixed top-0 left-0 right-0 z-[100] pt-[calc(env(safe-area-inset-top)+0.5rem)] pb-5 px-6 md:px-12 flex justify-between items-center bg-inherit/90 backdrop-blur-3xl border-b border-white/5">
        <div className="flex flex-col">
          <h1 className="text-3xl md:text-4xl font-[1000] tracking-tighter uppercase leading-none transition-colors">tabak++</h1>
          <div className="flex items-center space-x-2 mt-1.5 text-accent">
            <Sparkles size={10} className="animate-pulse" />
            <span className="text-[9px] font-black tracking-[0.4em] uppercase opacity-60">{activeTab}</span>
          </div>
        </div>
        <button onClick={() => setShowProfileMenu(!showProfileMenu)} className="relative w-11 h-11 md:w-12 md:h-12 rounded-[18px] bg-accent/10 border-2 border-accent/20 flex items-center justify-center text-accent overflow-hidden shadow-2xl transition-all active:scale-90 hover:border-accent/50 group shrink-0">
          {user.photoURL ? <img src={user.photoURL} alt="u" className="w-full h-full object-cover" /> : <User size={24} />}
          <div className="absolute inset-0 bg-accent/0 group-hover:bg-accent/10 transition-colors" />
        </button>
        <AnimatePresence>
          {showProfileMenu && (
            <>
              <div className="fixed inset-0 z-[90]" onClick={() => setShowProfileMenu(false)} />
              <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} className={cn("absolute right-6 top-24 w-64 rounded-[40px] p-2 shadow-2xl border backdrop-blur-3xl z-[100]", settings.isDark ? "bg-black/95 border-white/10" : "bg-white/95 border-black/5 shadow-black/10")}>
                <div className="flex items-center space-x-4 p-5 mb-2 border-b border-white/5">
                  <div className="w-12 h-12 rounded-[20px] bg-accent/10 border-2 border-accent/20 flex items-center justify-center text-accent overflow-hidden shrink-0">
                     {user.photoURL ? <img src={user.photoURL} alt="u" className="w-full h-full object-cover" /> : <UserCircle size={24} />}
                  </div>
                  <div className="flex flex-col truncate min-w-0">
                     <span className="text-sm font-[1000] uppercase tracking-widest truncate">{user.displayName || 'Registry User'}</span>
                     <span className="text-[10px] font-bold opacity-40 uppercase tracking-tighter truncate">{user.email}</span>
                  </div>
                </div>
                <button onClick={() => { setActiveTab('settings'); setShowProfileMenu(false); }} className="w-full flex items-center space-x-4 p-5 rounded-[24px] hover:bg-accent/10 transition-colors text-xs font-black uppercase tracking-widest"><Settings size={18} className="text-accent" /><span>Profile</span></button>
                <button onClick={() => { signOut(auth); setShowProfileMenu(false); }} className="w-full flex items-center space-x-4 p-5 rounded-[24px] hover:bg-danger/10 text-danger transition-colors text-xs font-black uppercase tracking-widest mt-1"><LogOut size={18} /><span>Log Out</span></button>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </header>

      <main className="flex-1 overflow-y-auto pt-[calc(env(safe-area-inset-top)+6.5rem)] pb-[calc(env(safe-area-inset-bottom)+9rem)] px-5 md:px-12 max-w-5xl mx-auto w-full transition-all duration-500 overflow-x-hidden">
        <AnimatePresence mode="wait">
          {activeTab === 'tracker' && <TrackerScreen key="t" m={metrics} c={configs} onInc={onInc} onDec={onDec} isDark={settings.isDark} view={settings.layout} onAdd={() => setActiveTab('settings')} accent={settings.accent} />}
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

      <nav className="fixed bottom-0 left-0 right-0 md:bottom-10 md:left-1/2 md:-translate-x-1/2 md:w-[600px] pb-[calc(env(safe-area-inset-bottom)+0.2rem)] md:pb-0 z-[110] px-4">
        <div className={cn("backdrop-blur-3xl border rounded-t-[40px] md:rounded-[40px] flex justify-around items-center h-22 md:h-22 px-4 md:px-6 shadow-2xl transition-all duration-500", settings.isDark ? "bg-black/80 border-white/5 shadow-black" : "bg-white/80 border-black/5 shadow-black/5 shadow-2xl")}>
          <NavItem id="tracker" icon={LayoutDashboard} active={activeTab === 'tracker'} onClick={() => setActiveTab('tracker')} label="Track" isDark={settings.isDark} />
          <NavItem id="history" icon={BarChart3} active={activeTab === 'history'} onClick={() => setActiveTab('history')} label="History" isDark={settings.isDark} />
          <NavItem id="settings" icon={Settings} active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} label="Control" isDark={settings.isDark} />
        </div>
      </nav>

      <AnimatePresence>
        {showAdd && <Overlay onClose={() => setShowAdd(false)} title="New Tracker" isDark={settings.isDark} accent={settings.accent}><AddForm onAdd={async (n, t, l) => { const id = Math.random().toString(36).substr(2, 9); await setDoc(doc(db, 'users', user.uid, 'configs', id), { name: n, type: t, limit: parseInt(l) || 20, order: configs.length }); setShowAdd(false); }} isDark={settings.isDark} accent={settings.accent} /></Overlay>}
        {editTarget && <Overlay onClose={() => setEditTarget(null)} title="Modify Data" isDark={settings.isDark} accent={settings.accent}><EditForm log={editTarget} configs={configs} onSave={async (d, c) => { await setDoc(doc(db, 'users', user.uid, 'logs', d), { counts: c }, { merge: true }); setEditTarget(null); }} isDark={settings.isDark} accent={settings.accent} /></Overlay>}
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
      else { const c = await createUserWithEmailAndPassword(auth, e, p); await updateProfile(c.user, { displayName: n }); await setDoc(doc(db, 'users', c.user.uid), { name: n, accent: '#D4FF5C', isDark: true }); }
    } catch (e) { setErr(e.message); } finally { setLoading(false); }
  };
  const rgb = hexToRgb(accent);
  return (
    <div className="min-h-screen bg-[#020202] flex items-center justify-center p-6 text-white font-inter relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full opacity-20">
         <div className="absolute top-[-20%] left-[-20%] w-[100%] h-[100%] bg-accent/10 rounded-full blur-[160px] animate-pulse" style={{'--accent': accent}} />
         <div className="absolute bottom-[-20%] right-[-20%] w-[100%] h-[100%] bg-accent/5 rounded-full blur-[160px] animate-pulse" style={{animationDelay:'4s', '--accent': accent}} />
      </div>

      <div className="w-full max-w-md space-y-12 relative z-10">
        <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', damping: 20 }} className="flex flex-col items-center text-center">
          <div className="w-24 h-24 bg-accent rounded-[36px] flex items-center justify-center mb-10 shadow-[0_0_120px_var(--accent-rgb)] text-bg-base transition-all hover:scale-110 duration-1000" style={{'--accent': accent, '--accent-rgb': `rgba(${rgb}, 0.6)`}}>
            <Zap size={52} fill="currentColor" strokeWidth={1.5} />
          </div>
          <h1 className="text-7xl font-[1000] tracking-tighter uppercase leading-none text-white drop-shadow-2xl">tabak++</h1>
          <p className="mt-8 text-accent/50 font-black tracking-[0.5em] uppercase text-[10px]">Registry Link Active</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2, type: 'spring', stiffness: 120 }}>
          <Card className="space-y-6 bg-white/[0.04] border-white/5 p-12 backdrop-blur-3xl shadow-2xl shadow-black rounded-[64px] border-t border-t-white/10">
            <div className="flex flex-col space-y-8">
              {err && <div className="p-6 bg-danger/10 border border-danger/20 rounded-[32px] text-danger text-[11px] font-black uppercase tracking-widest leading-relaxed text-center shadow-2xl">{err}</div>}
              {!isL && <Input label="Full Name" value={n} onChange={setN} placeholder="Identify yourself" isDark={true} />}
              <Input label="Registry Email" value={e} onChange={setE} placeholder="id@domain.com" isDark={true} />
              <Input label="Registry Key" type="password" value={p} onChange={setP} placeholder="••••••••" isDark={true} />
              <button className="w-full h-22 text-[12px] bg-accent text-bg-base shadow-[0_20px_60px_var(--accent-rgb)] font-[1000] uppercase tracking-[0.5em] rounded-[32px] mt-8 transition-all hover:scale-[1.02] active:scale-[0.98] active:brightness-90 flex items-center justify-center" onClick={handle} disabled={loading} style={{'--accent': accent, '--accent-rgb': `rgba(${rgb}, 0.3)`}}>
                {loading ? <Loader2 className="animate-spin" /> : (isL ? 'Sync Registry' : 'Join Registry')}
              </button>
              <div className="flex flex-col space-y-6 items-center pt-8 border-t border-white/5 mt-6">
                <button onClick={() => setIsL(!isL)} className="text-[11px] font-[1000] text-text-dim uppercase tracking-[0.3em] hover:text-accent transition-all decoration-accent underline-offset-8">
                  {isL ? "Request New Access" : "Return to Registry"}
                </button>
                <button onClick={() => signInAnonymously(auth)} className="text-[10px] font-black text-accent/20 uppercase tracking-[0.5em] hover:text-accent transition-all">
                  Incognito Mode
                </button>
              </div>
            </div>
          </Card>
        </motion.div>
        <div className="text-center opacity-30 pt-10 font-inter">
           <span className="text-[10px] font-black uppercase tracking-[2em] text-white ml-[2em]">SYSTEM ONLINE</span>
        </div>
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

const TrackerScreen = ({ m, c, onInc, onDec, view, isDark, onAdd, accent }) => (
  <div className="flex flex-col space-y-8 pb-10">
    <StaggeredItem index={0}><Card className={cn("p-10 relative overflow-hidden group shadow-2xl transition-all duration-700 rounded-[48px]", isDark ? "bg-white/[0.03] border-white/5 shadow-black" : "bg-white border-black/5 shadow-black/5")}><div className="flex justify-between items-end relative z-10 text-white"><div className="space-y-1.5"><span className="text-[9px] font-black text-text-dim uppercase tracking-[0.4em]">Remaining Units</span><div className={cn("text-6xl font-[1000] tracking-tighter leading-none transition-colors", !isDark && "text-[#1D1D1F]")}>{Math.max(0, m.limit - m.count)} <span className="text-sm text-accent uppercase tracking-widest font-black ml-3 leading-none">Left</span></div></div><div className="text-right space-y-2 hidden md:block"><div className="px-4 py-1.5 bg-accent-soft rounded-xl text-accent text-[9px] font-black uppercase border border-accent/20">{m.rank}</div><div className={cn("text-3xl font-[1000] opacity-40 leading-none tracking-tighter", !isDark && "text-[#1D1D1F]")}>{m.xp} XP</div></div></div><div className="w-full h-4 bg-black/10 rounded-full overflow-hidden mt-10 p-0.5 border border-white/5 relative z-10 shadow-inner"><motion.div animate={{ width: `${Math.min(1, m.progress) * 100}%` }} className={cn("h-full rounded-full transition-all duration-1000 shadow-2xl", m.progress >= 1 ? "bg-danger shadow-[0_0_30px_#F87171]" : "bg-accent shadow-[0_0_20px_var(--accent)]")} /></div></Card></StaggeredItem>
    <div className={cn("grid gap-6 md:gap-10", view === 'COMPACT' ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-1 lg:grid-cols-2")}>
       {c.sort((a,b) => a.order - b.order).map((config, i) => <StaggeredItem key={config.id} index={i+1}><CounterCard config={config} count={(m.todayLog.counts || {})[config.id] || 0} onInc={() => onInc(config.id)} onDec={() => onDec(config.id)} isC={view === 'COMPACT'} isDark={isDark} accent={accent} /></StaggeredItem>)}
       <StaggeredItem index={c.length + 1}><button onClick={onAdd} className={cn("w-full border-2 border-dashed border-white/10 rounded-[48px] flex flex-col items-center justify-center space-y-4 hover:bg-white/[0.02] hover:border-accent/20 transition-all group relative overflow-hidden shadow-2xl shadow-black/10", view === 'COMPACT' ? "h-[320px]" : "h-[450px] md:h-[580px]")}><div className="w-20 h-20 rounded-[40px] bg-white/5 flex items-center justify-center group-hover:scale-110 group-hover:bg-accent/10 transition-all duration-700 shadow-inner shadow-black/40 text-text-dim group-hover:text-accent border border-white/5 shrink-0"><Plus size={32} /></div><span className="text-[10px] font-black text-text-dim uppercase tracking-[0.5em] group-hover:text-white transition-colors">Add Protocol</span></button></StaggeredItem>
    </div>
  </div>
);

const CounterCard = ({ config, count, onInc, onDec, isC, isDark, accent }) => {
  const isL = count >= config.limit; const p = Math.min(1, count / config.limit);
  const isCig = config.type === 'CIGARETTE'; const isJoint = config.type.startsWith('JOINT');
  const rgb = hexToRgb(accent);
  return (
    <Card className={cn("relative flex flex-col group transition-all duration-1000 p-10 md:p-14 overflow-hidden shadow-2xl rounded-[64px] font-inter", isL ? "bg-danger/[0.04] border-danger/50 shadow-[0_0_80px_rgba(248,113,113,0.15)]" : (isDark ? "bg-white/[0.03] border-white/5 shadow-black/20" : "bg-white border-black/5 shadow-black/5 shadow-2xl"), isC ? "min-h-[400px]" : "min-h-[500px] md:min-h-[600px]")}>
       <div className="flex flex-col items-center text-center space-y-2 mb-10 relative z-20"><span className={cn("text-[13px] font-[1000] tracking-[0.6em] uppercase transition-all duration-700", isL ? "text-danger" : "text-accent")}>{config.name}</span><span className="text-[9px] font-black text-text-dim uppercase tracking-[0.3em] opacity-40">Limit: {config.limit}</span></div>
       <div className="flex-1 flex flex-col items-center justify-center relative z-10 py-10 w-full overflow-hidden">
          {(isCig || isJoint) ? (
             <div className={cn("relative w-full h-14 md:h-16 rounded-full overflow-hidden transition-all duration-1000 border-2 shadow-2xl mt-4", isL ? "bg-danger border-danger/40" : (isDark ? "bg-[#111] border-white/10 shadow-[inset_0_4px_30px_rgba(0,0,0,0.9)]" : "bg-[#DDD] border-black/5 shadow-inner"))}>
                <div className={cn("absolute left-0 inset-y-0 bg-[#1a1a1a] transition-all duration-1000 shadow-2xl", isL && "bg-danger/60 w-full")} style={{ width: isL ? '100%' : `${p * 72}%` }} />
                {!isL && count > 0 && <div className="absolute inset-y-0 w-3.5 bg-[#FF3D00] shadow-[0_0_30px_#FF3D00] z-20" style={{ left: `calc(${p * 72}% - 1.75px)` }} />}
                {!isL && <div className={cn("absolute right-[28%] inset-y-0 transition-all duration-700 shadow-2xl", isCig ? "bg-white" : "bg-[#C8E6C9]")} style={{ left: `${p * 72}%` }} />}
                <div className={cn("absolute inset-y-0 right-0 w-[28%] border-l-2 border-black/40 z-[11]", isL ? "bg-danger" : (isCig ? "bg-[#D97706]" : "bg-[#333]"))} />
             </div>
          ) : (
             <div className="relative w-40 h-40 md:w-56 md:h-56 mb-6 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" className={cn("fill-transparent stroke-[12]", isDark ? "stroke-white/5" : "stroke-black/5")} />
                  <motion.circle cx="50" cy="50" r="42" className={cn("fill-transparent stroke-[12] transition-all duration-1000 drop-shadow-2xl", isL ? "stroke-danger" : "stroke-accent")} strokeDasharray="264" initial={{ strokeDashoffset: 264 }} animate={{ strokeDashoffset: 264 - (Math.min(1, p) * 264) }} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                   <div className={cn("text-6xl md:text-8xl font-[1000] tracking-tighter leading-none transition-all", isL ? "text-danger" : (isDark ? "text-white" : "text-[#1D1D1F]"))}>{count}</div>
                   <Activity size={24} className={cn("mt-2", isL ? "text-danger" : "text-accent")} />
                </div>
             </div>
          )}
          {(isCig || isJoint) && <div className={cn("font-[1000] tracking-[-0.1em] leading-none mt-12 transition-all drop-shadow-2xl", isC ? "text-8xl" : "text-[10rem] md:text-[14rem]", isL ? "text-danger" : (isDark ? "text-white" : "text-[#1D1D1F]"))}>{count}</div>}
       </div>
       <div className="flex justify-center items-center space-x-12 md:space-x-20 relative z-20 pt-8">
          <motion.button whileTap={{ scale: 0.6 }} onClick={() => onDec(config.id)} className={cn("w-20 h-20 md:w-24 md:h-24 rounded-full border-4 flex items-center justify-center transition-all shadow-2xl active:scale-90 shrink-0 aspect-square", isDark ? "bg-white/5 border-white/10 text-white/30 hover:text-white" : "bg-[#F5F5F7] border-black/10 text-black/20 hover:text-black shadow-inner")}>
            <Minus size={36} strokeWidth={3} />
          </motion.button>
          <motion.button whileTap={{ scale: 0.8 }} onClick={() => onInc(config.id)} className={cn("w-20 h-20 md:w-24 md:h-24 rounded-full border-4 flex items-center justify-center transition-all shadow-2xl active:scale-95 shrink-0 aspect-square", isL ? "border-danger text-danger bg-danger/10" : "bg-accent text-bg-base border-white/20")} style={{'boxShadow': isL ? '0 25px 80px rgba(248,113,113,0.4)' : `0 30px 100px rgba(${rgb}, 0.6)`}}>
            <Plus size={44} strokeWidth={3} />
          </motion.button>
       </div>
    </Card>
  );
};

const HistoryScreen = ({ logs, configs, todayString, onEdit, m, isDark }) => {
  const chart = useMemo(() => [...logs].sort((a,b)=>a.logDate.localeCompare(b.logDate)).slice(-7).map(l => {
     const counts = l.counts || {}; const firstKey = Object.keys(counts)[0] || 'cigarettes';
     return { name: new Date(l.logDate).toLocaleDateString(undefined, {weekday:'short'}).toUpperCase(), val: counts[firstKey] || 0 };
  }), [logs]);
  return (
    <div className="flex flex-col space-y-10 md:space-y-12 pb-20">
       <StaggeredItem index={0}><Card className={cn("p-0 overflow-hidden shadow-2xl rounded-[48px]", isDark ? "bg-white/[0.03] border-accent/20 shadow-black" : "bg-white border-black/5 shadow-black/5 shadow-2xl")}><div className="p-10 md:p-14 pb-8 md:pb-10 flex justify-between items-start"><div className="space-y-1.5 md:space-y-2"><span className="text-[10px] md:text-[11px] font-[1000] text-text-dim uppercase tracking-[0.5em]">Analytics Stream</span><h3 className={cn("text-4xl md:text-5xl font-[1000] text-accent mt-1 md:mt-2 uppercase tracking-tighter leading-none font-black transition-colors")}>Registry Overview</h3></div><div className="p-4 md:p-5 bg-accent-soft rounded-[28px] border border-accent/20 shadow-2xl text-accent font-black"><BarChart3 size={32} /></div></div><div className="h-[280px] md:h-[350px] w-full pr-10 md:pr-14 pl-4 md:pl-6 pb-10 md:pb-14"><ResponsiveContainer width="100%" height="100%"><LineChart data={chart}><CartesianGrid strokeDasharray="8 8" stroke="rgba(128,128,128,0.1)" vertical={false} /><XAxis dataKey="name" stroke="#888" fontSize={10} axisLine={false} tickLine={false} dy={20} fontVariant="black" /><Tooltip contentStyle={{ background: isDark ? '#0D0D0E' : '#FFF', border: '2px solid var(--accent)', borderRadius: '32px', fontWeight: '950', fontSize: '13px', textTransform:'uppercase', boxShadow:'0 30px 60px rgba(0,0,0,0.6)', color: isDark ? '#FFF' : '#1D1D1F' }} /><Line type="monotone" dataKey="val" stroke="var(--accent)" strokeWidth={8} dot={{ r: 8, fill: 'var(--accent)', strokeWidth: 4, stroke: isDark ? '#020202' : '#FFF' }} activeDot={{ r: 14, fill: '#FFF', shadow: '0 0 30px var(--accent)' }} animationDuration={2500} /></LineChart></ResponsiveContainer></div></Card></StaggeredItem>
       <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10"><InsightCard Icon={TrendingUp} label="Streak" val={m.streak} suffix="Registry Units" color="text-orange-400" index={1} isDark={isDark} /><InsightCard Icon={Wallet} label="Savings" val={`$${m.savings.toFixed(2)}`} suffix="Resource Saved" color="text-emerald-400" index={2} isDark={isDark} /><InsightCard Icon={Activity} label="Impact" val={`${Math.floor(m.lost/60)}H`} suffix="Time Restored" color="text-rose-400" index={3} isDark={isDark} /></div>
       <div className="space-y-10 md:space-y-12 pt-16 px-4"><div className="flex items-center justify-between px-2"><h4 className="text-[14px] font-[1000] text-accent uppercase tracking-[0.8em]">Operational Logs</h4><History size={20} className="text-accent/30" /></div><div className="grid gap-6 md:gap-8">{logs.sort((a,b)=>b.logDate.localeCompare(a.logDate)).map((log, i) => <StaggeredItem key={log.logDate} index={i+5}><Card className={cn("py-12 flex items-center justify-between group p-12 md:p-14 transition-all duration-700 shadow-2xl shadow-black/10 rounded-[48px]", isDark ? "bg-white/[0.03] border-white/5 shadow-black" : "bg-white border-black/5 shadow-black/5 shadow-2xl")}><div className="flex flex-col space-y-2"><span className={cn("text-2xl md:text-3xl font-[1000] tracking-tighter uppercase leading-none transition-colors", !isDark && "text-[#1D1D1F]")}>{log.logDate === todayString ? 'Current Period' : new Date(log.logDate).toLocaleDateString(undefined, {month:'short', day:'numeric', weekday:'long'})}</span><span className="text-[11px] font-[900] text-text-dim uppercase tracking-[0.4em] mt-3 flex items-center"><History size={16} className="mr-3 opacity-30" /> {Object.values(log.counts || {}).reduce((a,b)=>a+b, 0)} units tracked</span></div><div className="flex items-center space-x-10"><div className="flex -space-x-5 md:-space-x-6">{Object.entries(log.counts || {}).map(([cid, count]) => <div key={cid} className={cn("w-16 h-16 md:w-18 md:h-18 rounded-full border-[5px] md:border-[6px] flex items-center justify-center font-[1000] text-base shadow-2xl transition-all group-hover:-translate-y-4 shadow-black/20", isDark ? "bg-black border-white/10 text-white" : "bg-white border-black/10 text-black shadow-black/10")}>{count}</div>)}</div><button onClick={() => onEdit(log)} className={cn("p-5 md:p-6 rounded-[28px] md:rounded-[32px] transition-all hover:scale-110 shadow-inner", isDark ? "bg-white/5 text-text-dim hover:text-accent" : "bg-[#F5F5F7] text-black/40 hover:text-accent shadow-inner")}><Edit2 size={24} /></button></div></Card></StaggeredItem>)}</div></div>
    </div>
  );
};

const SettingsScreen = ({ c, u, s, onAdd, onUpd, onReo, onDel }) => {
  const [al, setAl] = useState(u.displayName || 'User');
  const [ld, setLd] = useState(s.isDark);
  const [la, setLa] = useState(s.accent);
  const [photoURL, setPhotoURL] = useState(u.photoURL || '');
  const [loading, setLoading] = useState(false);
  const fileRef = useRef(null);

  const applyTheme = () => {
    onUpd({ isDark: ld, accent: la });
    setTimeout(() => window.location.reload(), 350);
  };

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
       try {
          const url = ev.target.result;
          await updateProfile(auth.currentUser, { photoURL: url });
          await setDoc(doc(db, 'users', u.uid), { photoURL: url }, { merge: true });
          setPhotoURL(url);
          setLoading(false);
       } catch (err) { alert("Upload error: " + err.message); setLoading(false); }
    };
    reader.readAsDataURL(file);
  };

  const rgb = hexToRgb(la);

  return (
    <div className="flex flex-col space-y-12 md:space-y-14 pb-40">
       <Card className={cn("p-12 md:p-16 relative overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.4)] rounded-[64px]", s.isDark ? "bg-white/[0.03] border-white/5 shadow-black" : "bg-white border-black/5 shadow-black/5")}>
          <div className="flex items-center space-x-10 md:space-x-14 mb-14 md:mb-20 relative z-10">
             <div className="relative group shrink-0">
                <div className={cn("w-32 h-32 md:w-40 md:h-40 bg-accent rounded-[44px] border-4 border-white/10 flex items-center justify-center text-6xl md:text-8xl font-[1000] text-bg-base shadow-2xl overflow-hidden shadow-accent/20 transition-all group-active:scale-95", loading && "animate-pulse")}>
                   {photoURL ? <img src={photoURL} className="w-full h-full object-cover" alt="p" /> : al.charAt(0)}
                </div>
                <button onClick={() => fileRef.current?.click()} className="absolute bottom-[-10px] right-[-10px] w-14 h-14 rounded-[22px] bg-white text-black flex items-center justify-center shadow-2xl border-4 border-black/90 active:scale-90 transition-transform">
                   {loading ? <Loader2 size={24} className="animate-spin" /> : <Camera size={24} />}
                </button>
                <input type="file" ref={fileRef} className="hidden" accept="image/*" onChange={handleUpload} />
             </div>
             <div className="space-y-4 min-w-0">
                <h4 className={cn("text-4xl md:text-6xl font-[1000] tracking-tighter uppercase leading-none transition-colors truncate", !s.isDark && "text-[#1D1D1F]")}>{al}</h4>
                <div className="flex items-center space-x-4">
                   <div className="h-2.5 w-2.5 rounded-full bg-accent animate-pulse shadow-[0_0_20px_var(--accent)]" />
                   <span className="text-[12px] font-black uppercase tracking-[0.5em] text-accent/60">System Registry</span>
                </div>
             </div>
          </div>
          <div className="space-y-12 relative z-10">
             <Input label="Registry Identity" value={al} onChange={setAl} isDark={s.isDark} />
             <button className="w-full h-22 rounded-full bg-accent text-bg-base shadow-[0_20px_60px_var(--accent-rgb)] font-[1000] uppercase tracking-[0.4em] active:scale-95 transition-all text-xs flex items-center justify-center" onClick={() => onUpd({ displayName: al })} style={{'--accent-rgb': `rgba(${hexToRgb(s.accent)}, 0.4)`}}>Commit Update</button>
          </div>
       </Card>

       <Card className={cn("p-12 md:p-16 space-y-14 md:space-y-20 shadow-2xl rounded-[64px]", s.isDark ? "bg-white/[0.03] border-white/5 shadow-black" : "bg-white border-black/5 shadow-black/5 shadow-2xl")}>
          <div className="flex flex-col space-y-12">
             <div className="text-[12px] font-black uppercase tracking-[1em] opacity-30 mb-4 px-2 text-accent">Core Schematics</div>
             <Toggle icon={Moon} label="Obsidian Mode" active={ld} onClick={() => setLd(!ld)} isDark={s.isDark} />
             <Toggle icon={Clock} label="Night Owl" active={s.nightOwl} onClick={() => onUpd({ nightOwl: !s.nightOwl })} isDark={s.isDark} />
             <Toggle icon={Grid} label="Matrix Layout" active={s.layout === 'COMPACT'} onClick={() => onUpd({ layout: s.layout === 'LARGE' ? 'COMPACT' : 'LARGE' })} isDark={s.isDark} />

             <div className={cn("p-12 rounded-[56px] border-2 space-y-14 shadow-inner transition-all mt-10", s.isDark ? "bg-black/50 border-white/5 shadow-black/60" : "bg-[#F0F2F5] border-black/5 shadow-inner")}>
                <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-[0.8em] opacity-40">
                   <span>Accent Spectrum</span>
                   <Sparkles size={20} className="opacity-30" />
                </div>
                <div className="flex flex-wrap gap-6 justify-center">
                   {ACCENTS.map(x => (
                      <button key={x.v} onClick={() => setLa(x.v)} className={cn("w-16 h-16 md:w-18 md:h-18 rounded-[28px] border-[5px] transition-all duration-700 shadow-2xl active:scale-90 relative", la === x.v ? "border-white scale-115 shadow-accent/60" : "border-transparent opacity-30 hover:opacity-100")} style={{ backgroundColor: x.v }}>
                         {la === x.v && <motion.div layoutId="colorCheck" className="absolute inset-0 flex items-center justify-center text-white"><Check size={28} strokeWidth={5} /></motion.div>}
                      </button>
                   ))}
                </div>
                <button className="w-full h-22 rounded-full bg-accent text-bg-base shadow-[0_25px_80px_var(--accent-rgb)] font-[1000] uppercase tracking-[0.4em] active:scale-95 transition-all text-xs flex items-center justify-center" onClick={applyTheme} style={{'--accent': la, '--accent-rgb': `rgba(${rgb}, 0.5)`}}><Zap className="mr-4" size={20} fill="currentColor" /> Apply Settings</button>
             </div>
          </div>
          <div className="pt-10 border-t border-white/10">
             <div className="flex justify-between items-center px-4 mb-12">
                <span className={cn("text-[12px] font-[1000] uppercase tracking-[0.6em]", s.isDark ? "text-text-dim" : "text-[#1D1D1F]/60")}>Retina Scaling</span>
                <span className="text-base font-[1000] text-accent tracking-widest">{Math.round(s.fontScale*100)}%</span>
             </div>
             <input type="range" min="0.8" max="1.3" step="0.1" value={s.fontScale} onChange={e => onUpd({ fontScale: parseFloat(e.target.value) })} className="w-full h-3 bg-black/20 rounded-full appearance-none cursor-pointer accent-accent shadow-inner transition-all hover:bg-black/30" />
          </div>
       </Card>

       <Card className={cn("p-12 md:p-16 border-white/5 shadow-2xl rounded-[64px]", s.isDark ? "bg-white/[0.03] border-white/5 shadow-black" : "bg-white border-black/5 shadow-black/5 shadow-2xl")}>
          <div className="flex justify-between items-center mb-16 px-2 text-accent font-inter">
             <div className="space-y-3">
                <h4 className={cn("text-3xl md:text-5xl font-[1000] uppercase tracking-tighter leading-none", !s.isDark && "text-[#1D1D1F]")}>Protocols</h4>
                <p className="text-[11px] font-black text-text-dim uppercase tracking-[0.5em] opacity-40">Active counter stream</p>
             </div>
             <div className={cn("p-6 rounded-[32px] shadow-2xl border-2", s.isDark ? "bg-white/5 border-white/10" : "bg-black/5 border-black/10 text-black/40")}><RefreshCcw size={32} /></div>
          </div>
          <div className="space-y-14">
             <Input label="Protocol Rate ($)" value={s.globalPrice} onChange={(v) => onUpd({ globalPrice: v })} type="number" isDark={s.isDark} />
             <div className="space-y-10">
                {c.map(x => (
                   <div key={x.id} className={cn("flex items-center justify-between p-12 md:p-14 rounded-[64px] border-2 group transition-all duration-1000 shadow-2xl hover:border-accent/50", s.isDark ? "bg-white/[0.01] border-white/5 shadow-black/40" : "bg-[#F5F5F7] border-black/5 shadow-inner")}>
                      <div className="flex items-center space-x-12">
                         <div className="flex flex-col space-y-4">
                            <button onClick={() => onReo(x.id, 'up')} className={cn("p-3.5 rounded-2xl transition-all hover:scale-125 shadow-xl border-2", s.isDark ? "bg-white/5 border-white/10 text-white/40" : "bg-black/5 border-black/10 text-black/20")}><ArrowUp size={18} strokeWidth={3} /></button>
                            <button onClick={() => onReo(x.id, 'down')} className={cn("p-3.5 rounded-2xl transition-all hover:scale-125 shadow-xl border-2", s.isDark ? "bg-white/5 border-white/10 text-white/40" : "bg-black/5 border-black/10 text-black/20")}><ArrowDown size={18} strokeWidth={3} /></button>
                         </div>
                         <div className="flex flex-col space-y-2 font-inter">
                            <span className={cn("text-2xl md:text-3xl font-[1000] uppercase leading-none transition-all group-hover:text-accent tracking-tighter", !s.isDark && "text-[#1D1D1F]")}>{x.name}</span>
                            <span className="text-[11px] font-black text-text-dim uppercase tracking-[0.4em] opacity-40">Limit: {x.limit}</span>
                         </div>
                      </div>
                      <div className="flex items-center space-x-8 opacity-0 group-hover:opacity-100 duration-1000 transition-all translate-x-12 group-hover:translate-x-0">
                         <button onClick={() => onDel(x.id)} className="p-6 rounded-[32px] bg-danger/10 text-danger/50 hover:text-danger border-2 border-danger/20 shadow-2xl transition-all hover:scale-110 active:scale-90 shrink-0"><Trash2 size={28} /></button>
                      </div>
                   </div>
                ))}
             </div>
             <button className="w-full h-32 border-4 border-dashed border-white/10 rounded-[64px] hover:bg-accent/5 hover:border-accent group transition-all duration-700 flex items-center justify-center space-x-6" onClick={onAdd}>
                <Plus className="group-hover:rotate-180 transition-transform duration-1000 text-accent shrink-0" size={48} strokeWidth={3} />
                <span className="text-lg font-[1000] tracking-[0.4em] uppercase text-text-dim group-hover:text-white font-inter">Add Matrix Link</span>
             </button>
          </div>
       </Card>
       <button className="w-full h-24 rounded-full bg-danger text-white shadow-[0_30px_100px_rgba(248,113,113,0.3)] hover:scale-[1.02] active:scale-[0.98] text-sm font-[1000] uppercase tracking-[1em] transition-all font-inter" onClick={() => signOut(auth)}>Log Out Registry</button>
    </div>
  );
};

// --- HELPERS ---

const Toggle = ({ icon: Icon, label, active, onClick, isDark }) => (
  <div onClick={onClick} className={cn("flex items-center justify-between p-10 md:p-12 rounded-[56px] border-2 shadow-2xl transition-all hover:scale-[1.01] active:scale-[0.98] group cursor-pointer shadow-black/10", isDark ? "bg-white/[0.02] border-white/5 shadow-black/40" : "bg-white border-black/5 shadow-black/5 shadow-2xl")}>
     <div className="flex items-center space-x-6 md:space-x-8"><div className={cn("p-6 md:p-7 rounded-[28px] md:rounded-[32px] transition-all duration-700 shadow-2xl border-2 shrink-0", isDark ? "bg-white/5 border-white/5 shadow-black" : "bg-[#F0F2F5] border-black/5 shadow-inner shadow-black/10")}><Icon size={32} strokeWidth={3} className={cn(active ? "text-accent" : (isDark ? "text-white/20" : "text-black/20"))} /></div><span className={cn("text-sm md:text-base font-[1000] uppercase tracking-[0.6em] leading-none transition-all font-black transition-colors truncate font-inter", !isDark && "text-[#1D1C1E]")}>{label}</span></div>
     <div className={cn("w-20 h-11 md:w-22 md:h-12 rounded-full p-2.5 transition-all duration-700 shadow-inner relative shadow-black/50 border-2 shrink-0", active ? "bg-accent border-accent/40 shadow-[0_0_30px_var(--accent-rgb)]" : "bg-black/30 border-white/5 shadow-black/80")} style={{'--accent-rgb': `rgba(${hexToRgb(active ? '#D4FF5C' : '#000')}, 0.5)`}}><motion.div animate={{ x: active ? (window.innerWidth > 768 ? 44 : 40) : 0 }} transition={{ type: 'spring', stiffness: 400, damping: 25 }} className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-white shadow-2xl shadow-black/40 border-2 border-black/10" /></div>
  </div>
);

const Overlay = ({ children, onClose, title, isDark, accent }) => (
  <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/98 backdrop-blur-3xl overflow-y-auto font-inter"><motion.div initial={{ y: 300, scale: 0.9, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: 300, scale: 0.9, opacity: 0 }} transition={{ type: 'spring', damping: 25, stiffness: 100 }} className="w-full max-w-2xl my-auto"><Card className={cn("p-12 md:p-16 relative border-4 shadow-[0_50px_150px_rgba(0,0,0,0.8)] rounded-[70px]", isDark ? "bg-[#050505] border-white/5" : "bg-white border-black/5 shadow-black/40 shadow-2xl")}><button onClick={onClose} className={cn("absolute top-10 md:top-14 right-10 md:right-14 p-6 md:p-7 rounded-[32px] transition-all group border-2 shadow-2xl", isDark ? "bg-white/5 border-white/5 text-white/30 hover:text-white" : "bg-black/5 border-black/5 text-[#1D1D1F]/20 hover:text-black")}><X size={32} strokeWidth={3} className="group-hover:rotate-180 transition-transform duration-1000" /></button><div className="flex items-center space-x-8 text-accent mb-16 md:mb-20 border-b border-white/10 pb-12"><div className="p-7 md:p-8 bg-accent-soft rounded-[36px] border-2 border-accent/20 shadow-2xl text-accent shadow-accent/20"><Activity size={40} strokeWidth={3} className="animate-pulse" /></div><h3 className={cn("text-5xl md:text-7xl font-[1000] tracking-tighter uppercase leading-none font-inter", !isDark && "text-[#1D1D1F]")}>{title}</h3></div><div className={cn(!isDark && "text-[#1D1D1F]")}>{children}</div></Card></motion.div></div>
);

const AddForm = ({ onAdd, isDark, accent }) => {
  const [n, setN] = useState(''); const [l, setL] = useState('20'); const [t, setT] = useState('CIGARETTE');
  const rgb = hexToRgb(accent);
  return (
    <div className="space-y-14">
       <Input label="Tracker Label" value={n} onChange={setN} placeholder="e.g. Protocol Alpha" isDark={isDark} />
       <Input label="Max Threshold" value={l} onChange={setL} type="number" isDark={isDark} />
       <div className="space-y-10"><span className="text-[12px] font-[1000] text-text-dim uppercase tracking-[1em] ml-2 font-inter">Visual Schema</span><div className="grid grid-cols-2 gap-6 md:grid-cols-2 md:gap-8">{['CIGARETTE', 'SIMPLE', 'JOINT_KING', 'JOINT_QUEEN'].map(x => <button key={x} onClick={() => setT(x)} className={cn("h-20 md:h-24 rounded-[36px] border-2 font-[1000] text-[11px] uppercase tracking-[0.5em] transition-all duration-1000 shadow-2xl active:scale-95 font-inter", t === x ? "bg-accent text-bg-base border-accent" : (isDark ? "bg-black/40 border-white/5 text-text-dim" : "bg-black/5 border-black/5 text-black/40"))} style={{'boxShadow': t === x ? `0 20px 60px rgba(${rgb}, 0.4)` : 'none'}}>{x.replace('_',' ')}</button>)}</div></div>
       <button className="w-full h-24 rounded-full bg-accent text-bg-base shadow-[0_30px_100px_var(--accent-rgb)] font-[1000] uppercase tracking-[0.8em] active:scale-95 transition-all text-sm mt-10 font-inter" onClick={() => onAdd(n, t, l)} style={{'--accent-rgb': `rgba(${rgb}, 0.4)`}}>Deploy Registry</button>
    </div>
  );
};

const EditForm = ({ log, configs, onSave, isDark, accent }) => {
  const [c, setC] = useState({ ...(log.counts || {}) });
  const rgb = hexToRgb(accent);
  return (
    <div className="space-y-14">
       <div className={cn("flex items-center space-x-10 p-10 rounded-[48px] border-2 shadow-inner", isDark ? "bg-black/60 border-white/5 shadow-black" : "bg-black/5 border-black/5 shadow-inner")}><div className="p-6 bg-accent-soft rounded-[32px] border-2 border-accent/20 shadow-accent/20 shadow-2xl"><Calendar size={36} strokeWidth={3} className="text-accent" /></div><span className={cn("text-xl md:text-2xl font-[1000] uppercase tracking-[0.6em] opacity-90 font-inter", !isDark && "text-[#1D1D1F]")}>{new Date(log.logDate).toLocaleDateString(undefined, { dateStyle: 'full' })}</span></div>
       <div className="max-h-[400px] overflow-y-auto pr-8 space-y-12 scrollbar-thin scrollbar-thumb-accent/40 pb-10 font-inter">{configs.map(x => <Input key={x.id} label={x.name} value={c[x.id] || 0} type="number" onChange={v => setC({...c, [x.id]: parseInt(v) || 0})} isDark={isDark} />)}</div>
       <button className="w-full h-24 rounded-full bg-accent text-bg-base shadow-[0_30px_100px_var(--accent-rgb)] font-[1000] uppercase tracking-[0.8em] active:scale-95 transition-all text-sm font-inter" onClick={() => onSave(log.logDate, c)} style={{'--accent-rgb': `rgba(${rgb}, 0.4)`}}>Update Registry</button>
    </div>
  );
};

const InsightCard = ({ Icon, label, val, suffix, color, index, isDark }) => (
  <StaggeredItem index={index}>
    <Card className={cn("flex flex-col items-center text-center py-16 md:py-20 transition-all duration-1000 shadow-2xl group shadow-black/20 rounded-[64px]", isDark ? "bg-white/[0.03] border-white/5 shadow-black" : "bg-white border-black/5 shadow-black/10")}>
      <div className={cn("p-10 md:p-12 rounded-[40px] md:rounded-[48px] mb-12 md:mb-16 transition-all duration-1000 group-hover:scale-115 shadow-2xl relative z-10 border-2 shrink-0", color, isDark ? "bg-white/[0.02] border-white/5" : "bg-[#F0F2F5] border-black/5 shadow-inner")}><Icon size={48} strokeWidth={2.5} /></div>
      <div className={cn("text-6xl md:text-8xl font-[1000] leading-none tracking-tighter mb-4 md:mb-6 relative z-10 drop-shadow-2xl transition-colors font-inter", !isDark && "text-[#1D1D1F]")}>{val}</div>
      <div className="text-[12px] font-black text-text-dim uppercase tracking-[0.8em] relative z-10 opacity-30 font-bold font-inter">{suffix}</div>
      <div className="mt-16 md:mt-20 pt-12 md:pt-16 border-t border-white/10 w-full flex items-center justify-center relative z-10 text-accent font-[1000] tracking-[1.5em] text-[10px] md:text-[11px] opacity-40 uppercase font-inter">{label}</div>
    </Card>
  </StaggeredItem>
);

const ErrorView = ({ msg }) => <div className="min-h-screen bg-[#020202] flex flex-col items-center justify-center p-12 text-center text-white font-inter"><AlertCircle className="text-danger mb-10" size={64} /><h2 className="text-3xl font-[1000] uppercase tracking-tighter leading-none mb-4 text-white font-inter">Sync Failed</h2><p className="text-text-dim text-sm max-w-xs font-bold opacity-60 leading-relaxed font-inter">{msg}</p><Button onClick={() => window.location.reload()} className="mt-12 rounded-full font-black uppercase tracking-[0.5em] px-12 h-20 bg-white text-black shadow-2xl font-inter">Re-Link</Button></div>;
const LoadingView = () => <div className="min-h-screen bg-[#020202] flex flex-col items-center justify-center space-y-8 text-accent font-inter"><Loader2 className="animate-spin" size={72} strokeWidth={3} /><span className="text-[11px] font-black tracking-[1.2em] uppercase text-accent font-black animate-pulse ml-[1.2em]">Syncing Registry</span></div>;

export default AppWrapper;
