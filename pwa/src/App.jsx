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
  }, [user]);

  const metrics = useMemo(() => {
    const tLog = logs.find(l => l.logDate === today) || { logDate: today, counts: {} };
    const c = SmokingCalculator.getTotalCount(tLog, configs);
    const l = SmokingCalculator.getTotalLimit(configs);
    const s = SmokingCalculator.calculateStreak(logs, configs);
    const x = SmokingCalculator.calculateXP(logs, s);
    const prog = l > 0 ? c / l : 0;
    return {
      count: c, limit: l, streak: s, xp: x, rank: SmokingCalculator.getRank(x),
      progress: isNaN(prog) ? 0 : prog,
      savings: SmokingCalculator.calculateSavings(logs, configs, parseFloat(settings.globalPrice) || 0) || 0,
      lost: SmokingCalculator.calculateLifeLostMinutes(logs) || 0,
      todayLog: tLog,
      coach: generateCoach(c, l, s)
    };
  }, [logs, configs, settings.globalPrice, today]);

  function generateCoach(count, limit, streak) {
    const p = limit > 0 ? count / limit : 0;
    if (count === 0 && streak > 0) return `Perfect start! You're on a ${streak}-day streak.`;
    if (p >= 1.0) return "Daily threshold reached. Conserve your health now.";
    if (p > 0.8) return "Nearing limit. Exercise extreme discipline.";
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

  if (appError) return <div className="min-h-screen bg-bg-base flex flex-col items-center justify-center p-12 text-center text-white font-inter"><AlertCircle className="text-danger mb-6" size={48} /><h2 className="text-2xl font-black uppercase">Critical Fail</h2><p className="text-text-dim text-sm mt-2">{appError}</p></div>;
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
          <NavItem id="tracker" icon={Grid} active={activeTab === 'tracker'} onClick={() => setActiveTab('tracker')} label="tracker" />
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
        <div className="flex flex-col items-center text-center"><div className="w-24 h-24 bg-accent rounded-[32px] flex items-center justify-center mb-8 shadow-2xl text-bg-base"><LayoutDashboard size={40} /></div><h1 className="text-5xl font-[950] tracking-tighter uppercase leading-none">tabak++</h1></div>
        <Card className="space-y-6 bg-bg-panel/50 border-white/5 p-10 backdrop-blur-lg shadow-2xl">
          {err && <div className="p-4 bg-danger/10 border border-danger/20 rounded-2xl text-danger text-[10px] font-black uppercase tracking-widest">{err}</div>}
          {!isL && <Input label="Vault Commander" value={n} onChange={setN} placeholder="Your Alias" />}
          <Input label="Vault ID" value={e} onChange={setE} placeholder="email@address.com" />
          <Input label="Security Phrase" type="password" value={p} onChange={setP} placeholder="••••••••" />
          <Button className="w-full h-18 text-xs shadow-2xl" onClick={handle} disabled={loading}>{loading ? <Loader2 className="animate-spin" /> : (isL ? 'Access Vault' : 'Initialize Vault')}</Button>
          <div className="flex flex-col space-y-4 items-center pt-2">
             <button onClick={() => setIsL(!isL)} className="text-[10px] font-black text-text-dim uppercase tracking-widest hover:text-accent transition-all">{isL ? "Request New Vault" : "Back to Login"}</button>
             <button onClick={() => signInAnonymously(auth)} className="text-[10px] font-black text-accent/60 uppercase tracking-widest hover:text-accent transition-all">Guest mode</button>
          </div>
        </Card>
      </div>
    </div>
  );
};

const TrackerScreen = ({ m, c, onInc, onDec, view, onAdd }) => (
  <div className="flex flex-col space-y-10 pb-10 max-w-4xl mx-auto">
    <StaggeredItem index={0} className="w-full">
       <div className="flex flex-col items-center space-y-2 mb-8">
          <div className="w-48 h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5 shadow-inner">
             <motion.div animate={{ width: `${Math.min(1, m.progress) * 100}%` }} className={cn("h-full rounded-full transition-all duration-1000", m.progress >= 1 ? "bg-danger" : "bg-accent")} />
          </div>
          <span className="text-[9px] font-black text-text-dim uppercase tracking-[0.5em]">Vitality Progress</span>
       </div>
    </StaggeredItem>
    <div className={cn("grid gap-8 w-full", view === 'COMPACT' ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-1 md:grid-cols-2")}>
       {c.sort((a,b) => a.order - b.order).map((config, i) => <StaggeredItem key={config.id} index={i+1}><CounterCard config={config} count={(m.todayLog.counts || {})[config.id] || 0} onInc={onInc} onDec={onDec} isC={view === 'COMPACT'} /></StaggeredItem>)}
    </div>
  </div>
);

const CounterCard = ({ config, count, onInc, onDec, isC }) => {
  const isL = count >= config.limit;
  const p = Math.min(1, count / config.limit);
  // Match App: Progress moves L to R.
  // Cigarette body is the "Full" part (White). It shrinks from RIGHT side.
  // No, screenshot shows: White body starts at filter, shrinks as we increment.
  // Actually, standard cig logic: White body shrinks towards the filter.
  // Screenshot shows: Bar with subtle color.
  const bodyW = isL ? 0 : (1 - p) * 100;
  return (
    <Card className={cn("relative flex flex-col group transition-all duration-1000 p-10 overflow-hidden", isL ? "border-danger/30" : "border-white/5", isC ? "min-h-[350px]" : "min-h-[500px]")}>
       <div className="flex flex-col items-center space-y-1 mb-8">
          <span className={cn("text-[11px] font-black tracking-[0.4em] uppercase", isL ? "text-danger" : "text-accent")}>{config.name}</span>
          <span className="text-[9px] font-bold text-text-dim uppercase tracking-widest">Daily Target: {config.limit}</span>
       </div>
       <div className="flex-1 flex flex-col items-center justify-center py-6">
          {config.type === 'CIGARETTE' ? (
             <div className="relative w-48 h-6 rounded-full overflow-hidden bg-white/5 border border-white/5 shadow-inner">
                {/* Subtle Ash Background */}
                <div className="absolute inset-0 bg-neutral-800 opacity-20" />
                {/* White Body - Fills from roach to left */}
                <motion.div animate={{ width: `${bodyW}%` }} transition={{ type:'spring', stiffness:40, damping:14 }} className="absolute right-0 inset-y-0 bg-[#C8E6C9] z-10" />
                {/* Subtle Ember */}
                {!isL && count > 0 && <motion.div animate={{ right: `${bodyW}%` }} transition={{ type:'spring', stiffness:40, damping:14 }} className="absolute inset-y-0 w-4 translate-x-1/2 z-20 flex items-center justify-center"><div className="w-full h-full bg-gradient-to-l from-[#FF3D00] to-transparent opacity-60" /></motion.div>}
                {/* The Roach - Fixed on Right */}
                <div className="absolute inset-y-0 right-0 w-[20%] bg-[#555] z-[11] border-l border-black/20" />
             </div>
          ) : <div className="w-48 h-6 bg-white/5 rounded-full overflow-hidden border border-white/5"><motion.div animate={{ width: `${p * 100}%` }} className={cn("h-full transition-all", isL ? "bg-danger" : "bg-accent/40")} /></div>}
          <motion.div key={count} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={cn("font-[950] tracking-tighter leading-none text-white mt-12", isC ? "text-7xl" : "text-9xl")}>{count}</motion.div>
       </div>
       <div className="flex justify-center items-center space-x-8 pt-8">
          <motion.button whileTap={{ scale: 0.8 }} onClick={() => onDec(config.id)} className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-text-muted hover:text-white transition-all"><Minus size={24} /></motion.button>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => onInc(config.id)} className={cn("w-16 h-16 rounded-full border-2 flex items-center justify-center transition-all", isL ? "border-danger text-danger bg-danger/10" : "border-accent/40 text-accent bg-accent/5")}><Plus size={24} /></motion.button>
       </div>
    </Card>
  );
};

const HealthScreen = ({ last }) => {
  const miles = useMemo(() => SmokingCalculator.calculateRecoveryMilestones(last), [last]);
  return (
    <div className="flex flex-col space-y-8 max-w-2xl mx-auto">
       <Card className="bg-bg-panel/40 p-10"><div className="flex justify-between items-center"><div className="w-14 h-14 rounded-2xl bg-success/10 flex items-center justify-center text-success border border-success/20"><Heart size={28} /></div><h2 className="text-2xl font-black uppercase text-white tracking-tighter">Body Repair</h2></div></Card>
       {miles.map((m, i) => <StaggeredItem key={m.title} index={i}><Card className="p-8"><div className="flex justify-between items-center mb-6"><div><span className="text-[9px] font-black text-text-dim uppercase tracking-widest">{m.progress >= 1 ? 'Stabilized' : 'Repairing'}</span><h4 className="text-lg font-black text-white uppercase">{m.title}</h4></div><div className="text-3xl font-black text-success">{Math.floor(m.progress * 100)}%</div></div><div className="w-full h-1 bg-white/5 rounded-full overflow-hidden border border-white/5"><motion.div animate={{ width: `${m.progress * 100}%` }} className="h-full bg-success shadow-[0_0_10px_rgba(74,222,128,0.4)]" /></div></Card></StaggeredItem>)}
    </div>
  );
};

const HistoryScreen = ({ logs, todayString, onEdit, m }) => {
  return (
    <div className="flex flex-col space-y-8 max-w-3xl mx-auto">
       <Card className="p-10 bg-bg-panel/40 border-white/5"><span className="text-[10px] font-black text-text-dim uppercase tracking-[0.4em]">Vault Activity</span><div className="grid grid-cols-3 gap-6 mt-8 text-center"><div><span className="text-[9px] font-black text-text-dim uppercase">Streak</span><div className="text-2xl font-black text-white">{m.streak}</div></div><div><span className="text-[9px] font-black text-text-dim uppercase">Saved</span><div className="text-2xl font-black text-white">${m.savings.toFixed(2)}</div></div><div><span className="text-[9px] font-black text-text-dim uppercase">Lost</span><div className="text-2xl font-black text-white">{Math.floor(m.lost/60)}H</div></div></div></Card>
       <div className="grid gap-4">{logs.sort((a,b)=>b.logDate.localeCompare(a.logDate)).map((log, i) => <StaggeredItem key={log.logDate} index={i}><Card className="py-8 flex items-center justify-between group p-10"><div className="flex flex-col"><span className="text-lg font-black text-white uppercase">{log.logDate === todayString ? 'Today' : new Date(log.logDate).toLocaleDateString(undefined, {month:'short', day:'numeric'})}</span><span className="text-[9px] font-black text-text-dim uppercase mt-1 tracking-widest">{Object.values(log.counts || {}).reduce((a,b)=>a+b, 0)} registered</span></div><div className="flex items-center space-x-6"><div className="flex -space-x-3">{Object.entries(log.counts || {}).map(([cid, count]) => <div key={cid} className="w-10 h-10 rounded-full bg-bg-panel border-2 border-bg-card flex items-center justify-center font-black text-xs text-white shadow-xl">{count}</div>)}</div><button onClick={() => onEdit(log)} className="p-3 rounded-xl bg-white/5 text-text-dim hover:text-accent border border-white/5"><Edit2 size={16} /></button></div></Card></StaggeredItem>)}</div>
    </div>
  );
};

const SettingsScreen = ({ c, u, s, onAdd, onUpd, onReo, onDel }) => (
  <div className="flex flex-col space-y-10 pb-32 max-w-3xl mx-auto">
     <Card className="p-10"><div className="flex items-center space-x-8 mb-10"><div className="w-20 h-20 bg-accent rounded-[32px] flex items-center justify-center text-4xl font-black text-bg-base uppercase shadow-2xl">{u.displayName?.charAt(0)}</div><h4 className="text-3xl font-black tracking-tighter uppercase text-white leading-none">{u.displayName}</h4></div><div className="space-y-6"><Toggle icon={Moon} label="Obsidian Mode" active={s.isDark} onClick={() => onUpd({ isDark: !s.isDark })} /><Toggle icon={Clock} label="Night Owl Mode" active={s.nightOwl} onClick={() => onUpd({ nightOwl: !s.nightOwl })} /><div className="p-6 bg-white/5 rounded-3xl border border-white/10 space-y-6"><span className="text-[10px] font-black text-text-dim uppercase tracking-[0.4em]">Accent Spectrum</span><div className="flex flex-wrap gap-4">{ACCENTS.map(x => <button key={x.v} onClick={() => onUpd({ accent: x.v })} className={cn("w-10 h-10 rounded-2xl border-2 transition-all", s.accent === x.v ? "border-white scale-110" : "border-transparent opacity-40 hover:opacity-100")} style={{ backgroundColor: x.v }} />)}</div></div><div className="pt-6 border-t border-white/10 space-y-4"><span className="text-[10px] font-black text-text-dim uppercase tracking-[0.4em]">Scaling: {Math.round(s.fontScale*100)}%</span><input type="range" min="0.8" max="1.3" step="0.1" value={s.fontScale} onChange={e => onUpd({ fontScale: parseFloat(e.target.value) })} className="w-full h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer accent-accent shadow-inner" /></div></div></Card>
     <Card className="p-10 space-y-8"><div className="flex justify-between items-center"><h4 className="text-xl font-black uppercase text-white">Protocols</h4><RefreshCcw size={18} className="text-text-dim" /></div><div className="space-y-4">{c.map(x => <div key={x.id} className="flex items-center justify-between p-6 bg-white/5 rounded-[28px] border border-white/5 group hover:border-accent/20 transition-all"><div className="flex flex-col"><span className="text-sm font-black text-white uppercase">{x.name}</span><span className="text-[9px] font-black text-text-dim uppercase mt-1">Limit: {x.limit}</span></div><div className="flex space-x-3"><button onClick={() => onReo(x.id, 'up')} className="p-2 bg-white/5 rounded-lg text-text-dim border border-white/5 hover:text-white transition-all"><ArrowUp size={12} /></button><button onClick={() => onDel(x.id)} className="p-2 bg-white/5 rounded-lg text-danger/40 border border-white/5 hover:text-danger transition-all"><Trash2 size={12} /></button></div></div>)}</div><Button variant="outline" className="w-full border-dashed h-16 rounded-[28px]" onClick={onAdd}><Plus className="mr-2" size={18} /> Initialize Tracker</Button></Card>
     <Button variant="danger" className="w-full h-18 rounded-3xl text-[10px] font-black shadow-2xl" onClick={() => signOut(auth)}>Emergency Session Termination</Button>
  </div>
);

const NavItem = ({ icon: Icon, active, onClick, label }) => (
  <motion.div onClick={onClick} whileTap={{ scale: 0.8 }} className="flex flex-col items-center justify-center flex-1 py-5 cursor-pointer relative group text-white">
    <Icon size={24} className={cn("mb-2 transition-all duration-500", active ? "text-accent scale-110 drop-shadow-[0_0_10px_var(--accent)]" : "text-text-dim group-hover:text-text-muted")} /><span className={cn("text-[8px] font-black tracking-[0.2em] uppercase transition-colors duration-500", active ? "text-white" : "text-text-dim")}>{label}</span>
    {active && <motion.div layoutId="navDot" className="absolute -top-1 w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_10px_var(--accent)]" />}
  </motion.div>
);

const Toggle = ({ icon: Icon, label, active, onClick }) => (
  <div className="flex items-center justify-between p-6 bg-white/5 rounded-[28px] border border-white/10 shadow-inner">
     <div className="flex items-center space-x-5 text-white"><div className="p-3 bg-white/5 rounded-xl border border-white/5"><Icon size={20} /></div><span className="text-[10px] font-black uppercase tracking-[0.2em] leading-none">{label}</span></div>
     <button onClick={onClick} className={cn("w-14 h-8 rounded-full p-1 transition-all duration-500 border border-white/5", active ? "bg-accent" : "bg-white/10")}><div className={cn("w-6 h-6 rounded-full bg-white transition-all shadow-2xl", active ? "translate-x-6" : "translate-x-0")} /></button>
  </div>
);

const Overlay = ({ children, onClose, title }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/95 backdrop-blur-2xl">
     <motion.div initial={{ y: 50, scale: 0.95, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: 50, scale: 0.95, opacity: 0 }} className="w-full max-w-sm"><Card className="p-10 relative border-accent/20 shadow-2xl bg-bg-panel/95"><button onClick={onClose} className="absolute top-8 right-8 p-3 rounded-2xl bg-white/5 text-text-dim border border-white/5"><X size={20} /></button><h3 className="text-xl font-black tracking-tight uppercase leading-none text-white mb-10">{title}</h3><div className="text-white">{children}</div></Card></motion.div>
  </div>
);

const AddForm = ({ onAdd }) => {
  const [n, setN] = useState(''); const [l, setL] = useState('20'); const [t, setT] = useState('CIGARETTE');
  return (
    <div className="space-y-8 text-white">
       <Input label="Label" value={n} onChange={setN} placeholder="VAULT_UNIT" />
       <Input label="Limit" value={l} onChange={setL} type="number" />
       <div className="space-y-3"><span className="text-[10px] font-black text-text-dim uppercase tracking-[0.2em]">Visual Archetype</span><div className="grid grid-cols-2 gap-3">{['CIGARETTE', 'SIMPLE'].map(x => <button key={x} onClick={() => setT(x)} className={cn("h-12 rounded-xl border font-black text-[9px] uppercase tracking-widest transition-all", t === x ? "bg-accent text-bg-base border-accent shadow-2xl" : "bg-white/5 border-white/5 text-text-dim")}>{x}</button>)}</div></div>
       <Button className="w-full h-16 shadow-2xl" onClick={() => onAdd(n, t, l)}>Initialize Link</Button>
    </div>
  );
};

const EditForm = ({ log, configs, onSave }) => {
  const [c, setC] = useState({ ...(log.counts || {}) });
  return (
    <div className="space-y-10 text-white">
       <div className="flex items-center space-x-6 p-6 bg-white/5 rounded-[28px] border border-white/5 shadow-inner"><Calendar size={24} className="text-accent" /><span className="text-sm font-black uppercase tracking-[0.2em]">{new Date(log.logDate).toLocaleDateString(undefined, { dateStyle: 'short' })}</span></div>
       <div className="max-h-[300px] overflow-y-auto pr-4 space-y-8 scrollbar-thin">{configs.map(x => <Input key={x.id} label={x.name} value={c[x.id] || 0} type="number" onChange={v => setC({...c, [x.id]: parseInt(v) || 0})} />)}</div>
       <Button className="w-full h-16 rounded-2xl shadow-2xl" onClick={() => onSave(log.logDate, c)}>Register Corrections</Button>
    </div>
  );
};

export default App;
