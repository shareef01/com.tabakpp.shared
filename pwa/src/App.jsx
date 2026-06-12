import React, { useState, useMemo, useEffect, Component, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutGrid, BarChart3, Settings, User, Plus, Minus,
  Activity, Zap, ShieldCheck, HeartPulse, Flame, X,
  LogOut, Camera, Calendar, RefreshCcw, Loader2, AlertCircle,
  TrendingUp, Wallet, Clock, Grid, Moon, Sparkles, Check, Edit2, Trash2, Crown
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

// --- UTILS ---
import { SmokingCalculator } from './utils/smokingCalculator';
import { cn } from './utils/utils';
import { Card, Button, Input, StaggeredItem } from './components/Common';

const APP_VERSION = "11.5.0-VISUAL-MASTER";

// --- GLOBAL ERROR BOUNDARY ---
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0a0a0b] flex flex-col items-center justify-center p-12 text-center text-white font-inter">
          <div className="p-8 bg-danger/10 rounded-[32px] text-danger border border-danger/20 shadow-2xl mb-8"><AlertCircle size={48} /></div>
          <h2 className="text-3xl font-[950] uppercase tracking-tighter leading-none">System Reset</h2>
          <p className="text-text-dim text-sm mt-4 mb-10 max-w-xs font-bold opacity-60 leading-relaxed font-inter">{this.state.error?.message || "UI Logic Crash."}</p>
          <Button onClick={() => { localStorage.clear(); window.location.reload(); }} className="w-64 h-18 rounded-full shadow-2xl font-black uppercase tracking-widest bg-white text-black">Re-Initialize</Button>
        </div>
      );
    }
    return this.props.children;
  }
}

const hexToRgb = (hex) => {
  const h = hex || '#00d2ff';
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(h);
  return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '0, 210, 255';
};

// --- MAIN WRAPPER ---
const AppWrapper = () => (
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

const App = () => {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('track');
  const [appError, setAppError] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  const [logs, setLogs] = useState([]);
  const [configs, setConfigs] = useState([]);
  const [settings, setSettings] = useState({
    accent: '#00d2ff', isDark: true, layout: 'LARGE', fontScale: 1, nightOwl: false, globalPrice: '0.5'
  });

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
      if (!u) { setLogs([]); setConfigs([]); }
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
            accent: d.accent || '#00d2ff',
            isDark: d.isDark ?? true,
            layout: d.layout || 'LARGE',
            fontScale: d.fontScale || 1,
            nightOwl: d.nightOwl ?? false,
            globalPrice: d.globalPrice || '0.5'
          }));
        }
      });
      return () => { cUnsub(); lUnsub(); sUnsub(); };
    } catch (err) { setAppError("Registry sync failure: " + err.message); }
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
        todayLog: tLog
      };
    } catch (e) {
      return { count: 0, limit: 1, streak: 0, xp: 0, rank: '...', progress: 0, savings: 0, lost: 0, todayLog: { counts: {} } };
    }
  }, [logs, configs, settings.globalPrice, today]);

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

  if (appError) return <ErrorView msg={appError} />;
  if (authLoading) return <LoadingView />;
  if (!user) return <AuthScreen accent={settings.accent} />;

  return (
    <div
      className="min-h-screen bg-[#0a0a0b] text-white font-inter selection:bg-[#00d2ff]/30 overflow-x-hidden"
      style={{ '--accent': settings.accent, '--accent-rgb': hexToRgb(settings.accent), fontSize: `${settings.fontScale}rem` }}
    >
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0b]/80 backdrop-blur-xl border-b border-white/5 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-accent animate-pulse shadow-[0_0_8px_var(--accent)]" />
              <h1 className="text-xl font-[1000] tracking-tighter uppercase">TABAK<span className="text-accent">++</span></h1>
            </div>
            <span className="text-[10px] font-bold text-[#6b7280] tracking-[0.3em] uppercase ml-4">Registry Master</span>
          </div>
          <button onClick={() => setShowProfile(true)} className="w-11 h-11 rounded-full border border-accent/30 flex items-center justify-center text-accent hover:bg-accent/10 active:scale-95 transition-all shadow-[0_0_15px_var(--accent-rgb)] overflow-hidden">
            {user.photoURL ? <img src={user.photoURL} alt="u" className="w-full h-full object-cover" /> : <User size={20} />}
          </button>
        </div>
      </header>

      <main className="pt-28 pb-[14rem] px-6 max-w-7xl mx-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'track' && (
            <motion.div key="track" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-10">
              <TopBanner m={metrics} />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
                 {configs.sort((a,b)=>a.order-b.order).map((c, i) => (
                   <TrackerCard key={c.id} config={c} count={(metrics.todayLog.counts || {})[c.id] || 0} onInc={() => onInc(c.id)} onDec={() => onDec(c.id)} index={i} />
                 ))}
                 <button onClick={() => setShowAdd(true)} className="bg-[#121315] rounded-[40px] border-2 border-dashed border-white/5 flex flex-col items-center justify-center space-y-4 hover:border-accent/20 transition-all min-h-[500px] group">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-[#6b7280] group-hover:text-accent group-hover:bg-accent/10 transition-all"><Plus size={32} /></div>
                    <span className="text-[10px] font-black uppercase tracking-[0.5em] text-[#6b7280]">New Protocol</span>
                 </button>
              </div>
            </motion.div>
          )}
          {activeTab === 'history' && <HistoryScreen logs={logs} configs={configs} m={metrics} onEdit={setEditTarget} userId={user.uid} />}
          {activeTab === 'control' && <SettingsScreen configs={configs} user={user} settings={settings} onAdd={() => setShowAdd(true)} />}
        </AnimatePresence>
      </main>

      <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
        <div className="bg-[#121315]/80 backdrop-blur-2xl border border-white/10 rounded-full px-8 py-3 flex items-center gap-10 shadow-2xl">
          <NavBtn icon={LayoutGrid} label="Track" active={activeTab === 'track'} onClick={() => setActiveTab('track')} />
          <NavBtn icon={BarChart3} label="History" active={activeTab === 'history'} onClick={() => setActiveTab('history')} />
          <NavBtn icon={Settings} label="Control" active={activeTab === 'control'} onClick={() => setActiveTab('control')} />
        </div>
      </nav>

      <AnimatePresence>
        {showProfile && <ProfileModal user={user} onClose={() => setShowProfile(false)} />}
        {showAdd && <AddOverlay onClose={() => setShowAdd(false)} user={user} configs={configs} />}
        {editTarget && <EditOverlay log={editTarget} configs={configs} onClose={() => setEditTarget(null)} user={user} />}
      </AnimatePresence>
    </div>
  );
};

// --- SUB-COMPONENTS ---

const TopBanner = ({ m }) => (
  <section className="bg-[#121315] rounded-[32px] p-8 border border-white/5 relative overflow-hidden group shadow-2xl">
    <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-[80px] -mr-32 -mt-32" />
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
      <div className="space-y-2">
        <h3 className="text-[11px] font-black text-[#6b7280] tracking-[0.4em] uppercase font-inter">Remaining Units</h3>
        <div className="flex items-baseline gap-3">
          <span className="text-7xl font-[1000] tracking-tighter tabular-nums font-inter">{Math.max(0, m.limit - m.count)}</span>
          <span className="text-sm font-black text-accent uppercase tracking-widest leading-none font-inter">Left</span>
        </div>
      </div>
      <div className="flex flex-col md:items-end gap-2">
        <div className="flex items-center gap-3">
          <div className="px-3 py-1 rounded-full border border-accent/40 text-accent text-[10px] font-black tracking-widest uppercase font-inter">{m.rank}</div>
          <span className="text-2xl font-[900] text-[#6b7280] tracking-tighter tabular-nums font-inter">{m.xp} <span className="text-sm opacity-50 font-inter">XP</span></span>
        </div>
      </div>
    </div>
    <div className="mt-10 w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
      <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(1, m.progress) * 100}%` }} transition={{ duration: 1.5 }} className={cn("h-full", m.progress >= 1 ? "bg-danger shadow-[0_0_15px_red]" : "bg-accent shadow-[0_0_15px_var(--accent)]")} />
    </div>
  </section>
);

const TrackerCard = ({ config, count, onInc, onDec, index }) => {
  const isL = count >= config.limit;
  const isKing = config.type === 'JOINT_KING';
  const isQueen = config.type === 'JOINT_QUEEN';
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} className={cn("bg-[#121315] rounded-[48px] border-2 p-8 md:p-10 flex flex-col items-center justify-between min-h-[520px] transition-all duration-700 group relative overflow-hidden", isL ? "border-danger/40 shadow-[0_0_40px_rgba(248,113,113,0.1)]" : "border-white/5 hover:border-accent/20")}>
      <span className="text-[11px] font-[1000] text-[#6b7280] tracking-[0.4em] uppercase relative z-10 font-inter">Target: {config.limit}</span>
      <div className="flex-1 w-full flex flex-col items-center justify-center space-y-12 relative z-10 py-8">
        <div className="w-full flex justify-center h-24 items-center">
          {config.type === 'CIGARETTE' && <CigaretteProgress count={count} limit={config.limit} />}
          {config.type === 'SIMPLE' && <RingProgress count={count} limit={config.limit} />}
          {(isKing || isQueen) && <JointProgress count={count} limit={config.limit} isKing={isKing} />}
          {(!['CIGARETTE', 'SIMPLE', 'JOINT_KING', 'JOINT_QUEEN'].includes(config.type)) && <GenericBarProgress count={count} limit={config.limit} />}
        </div>
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2">
            {(isKing || isQueen) && <Crown size={24} className={cn("transition-colors duration-700", isL ? "text-danger" : (isKing ? "text-amber-400" : "text-purple-400"))} />}
            <motion.span key={count} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={cn("text-7xl md:text-8xl font-[1000] tracking-tighter tabular-nums font-inter transition-colors duration-700", isL ? "text-danger" : "text-white")}>{count}</motion.span>
          </div>
          <span className={cn("text-[12px] font-black tracking-[0.6em] uppercase transition-colors duration-700 mt-3 font-inter", isL ? "text-danger" : "text-accent opacity-40")}>{config.name}</span>
        </div>
      </div>
      <div className="w-full flex justify-between items-center pt-8 mt-auto relative z-10">
        <button onClick={onDec} className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[#6b7280] hover:text-white hover:bg-white/10 active:scale-90 transition-all shadow-xl"><Minus size={28} strokeWidth={3} /></button>
        <button onClick={onInc} className={cn("w-16 h-16 rounded-full flex items-center justify-center text-black active:scale-90 transition-all shadow-2xl", isL ? "bg-danger shadow-[0_10px_30px_rgba(248,113,113,0.5)]" : "bg-accent shadow-[0_10px_30px_var(--accent-rgb)]")} style={{'--accent-rgb': 'rgba(0,210,255,0.4)'}}><Plus size={28} strokeWidth={4} /></button>
      </div>
    </motion.div>
  );
};

const CigaretteProgress = ({ count, limit }) => {
  const isL = count >= limit;
  const tobaccoPct = Math.max(0, 1 - (count / limit));
  return (
    <div className={cn("relative w-56 h-11 rounded-full overflow-hidden border-2 transition-all duration-1000 flex items-center", isL ? "bg-danger border-danger shadow-[0_0_40px_rgba(255,0,0,0.5)]" : "bg-white/5 border-white/10 shadow-inner")}>
      {!isL && <div className="absolute h-full bg-white shadow-[0_0_20px_white] transition-all duration-1000 ease-out" style={{ width: `${tobaccoPct * 72}%`, right: '28%' }} />}
      {!isL && count > 0 && <div className="absolute h-full w-3 bg-[#ff4b2b] shadow-[0_0_20px_#ff4b2b] z-20 transition-all duration-1000 ease-out" style={{ right: `calc(28% + ${tobaccoPct * 72}% - 1.5px)` }} />}
      <div className={cn("absolute right-0 h-full w-[28%] border-l-2 transition-all duration-1000", isL ? "bg-danger border-white/20" : "bg-[#f39c12] border-black/20")} />
    </div>
  );
};

const JointProgress = ({ count, limit, isKing }) => {
  const isL = count >= limit;
  const tobaccoPct = Math.max(0, 1 - (count / limit));
  return (
    <div className={cn("relative h-11 rounded-full overflow-hidden border-2 transition-all duration-1000 flex items-center", isKing ? "w-56" : "w-44", isL ? "bg-danger border-danger shadow-[0_0_40px_rgba(255,0,0,0.5)]" : "bg-white/5 border-white/10 shadow-inner")}>
       {!isL && <div className="absolute h-full bg-gradient-to-r from-[#ff4b2b] to-[#f39c12] rounded-l-full shadow-[0_0_20px_rgba(255,75,43,0.4)] transition-all duration-1000 ease-out" style={{ width: `${(1-tobaccoPct) * 85}%`, left: 0 }} />}
       {!isL && count > 0 && <div className="absolute h-full w-3 bg-[#ff4b2b] shadow-[0_0_20px_#ff4b2b] z-20 transition-all duration-1000 ease-out" style={{ left: `calc(${(1-tobaccoPct) * 85}% - 1.5px)` }} />}
       <div className={cn("absolute right-0 h-full w-[15%] border-l-2 transition-all duration-1000", isL ? "bg-danger border-white/20" : "bg-[#333]/80 border-white/5")} />
    </div>
  );
};

const GenericBarProgress = ({ count, limit }) => {
  const isL = count >= limit;
  const progress = Math.min(1, count / limit);
  return (
    <div className={cn("w-52 h-11 rounded-full overflow-hidden border-2 p-1 transition-all duration-1000", isL ? "bg-danger/20 border-danger shadow-[0_0_30px_rgba(255,0,0,0.3)]" : "bg-white/5 border-white/10 shadow-inner")}>
      <div className={cn("h-full rounded-full transition-all duration-1000", isL ? "bg-danger shadow-[0_0_20px_red]" : "bg-accent shadow-[0_0_20px_var(--accent)]")} style={{ width: `${progress * 100}%` }} />
    </div>
  );
};

const RingProgress = ({ count, limit }) => {
  const isL = count >= limit;
  const progress = Math.min(1, count / limit);
  return (
    <div className="relative w-28 h-28 flex items-center justify-center">
      <svg className="absolute inset-0 w-full h-full -rotate-90 overflow-visible" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/5" />
        <motion.circle cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray="264" initial={{ strokeDashoffset: 264 }} animate={{ strokeDashoffset: 264 - (progress * 264) }} className={cn("transition-colors duration-1000", isL ? "text-danger" : "text-accent")} strokeLinecap="round" />
      </svg>
      <HeartPulse size={20} className={cn("transition-all duration-1000", isL ? "text-danger scale-125" : "text-accent animate-pulse")} />
    </div>
  );
};

const NavBtn = ({ icon: Icon, label, active, onClick }) => (
  <button onClick={onClick} className={cn("flex flex-col items-center gap-1.5 transition-all relative group", active ? "text-accent" : "text-[#6b7280] hover:text-white")}>
    {active && <motion.div layoutId="navIndicator" className="absolute -top-6 w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_10px_var(--accent)]" />}
    <Icon size={22} strokeWidth={active ? 3 : 2} />
    <span className="text-[9px] font-black uppercase tracking-[0.2em] font-inter">{label}</span>
  </button>
);

const HistoryScreen = ({ logs, configs, m, onEdit, userId }) => {
  const onDelete = async (logDate) => {
    if (window.confirm("Permanently delete this registry record?")) {
      await deleteDoc(doc(db, 'users', userId, 'logs', logDate));
    }
  };
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10 font-inter">
       <Card className="p-10 bg-[#121315] border-white/5">
          <h3 className="text-[11px] font-black text-[#6b7280] tracking-[0.5em] uppercase mb-10">Registry Analytics</h3>
          <div className="h-64 w-full">
             <ResponsiveContainer width="100%" height="100%">
                <LineChart data={logs.slice(0, 7).reverse().map(l => ({ name: new Date(l.logDate).toLocaleDateString(undefined, {weekday:'short'}).toUpperCase(), val: Object.values(l.counts || {}).reduce((a,b)=>a+b, 0) }))}>
                   <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                   <XAxis dataKey="name" stroke="#6b7280" fontSize={10} axisLine={false} tickLine={false} tick={{fontWeight:900, letterSpacing:'0.1em'}} />
                   <Tooltip contentStyle={{ background: '#121315', border: '1px solid #ffffff10', borderRadius: '24px', fontSize: '12px', fontWeight:900 }} />
                   <Line type="monotone" dataKey="val" stroke="var(--accent)" strokeWidth={6} dot={{ r: 6, fill: 'var(--accent)', strokeWidth: 4, stroke: '#121315' }} />
                </LineChart>
             </ResponsiveContainer>
          </div>
       </Card>
       <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <InsightCard icon={TrendingUp} label="Streak" val={m.streak} sub="Days Active" color="text-amber-400" />
          <InsightCard icon={Wallet} label="Retained" val={`$${m.savings.toFixed(2)}`} sub="Resource Saved" color="text-emerald-400" />
          <InsightCard icon={Activity} label="Impact" val={`${Math.floor(m.lost/60)}H`} sub="Time Restored" color="text-rose-400" />
       </div>
       <div className="space-y-6 pt-10">
          <h4 className="text-[11px] font-black text-[#6b7280] tracking-[0.5em] uppercase px-2">Registry Timeline</h4>
          {logs.map(log => (
             <div key={log.logDate} className="bg-[#121315] p-8 rounded-[40px] border border-white/5 flex items-center justify-between group hover:border-accent/10 transition-all shadow-xl">
                <div className="flex flex-col">
                   <span className="text-xl font-[1000] tracking-tighter uppercase">{new Date(log.logDate).toLocaleDateString(undefined, {month:'short', day:'numeric', weekday:'long'})}</span>
                   <span className="text-[10px] font-bold text-[#6b7280] uppercase tracking-widest mt-2">{Object.values(log.counts || {}).reduce((a,b)=>a+b, 0)} units registered</span>
                </div>
                <div className="flex items-center gap-3 md:opacity-0 group-hover:opacity-100 transition-all">
                   <button onClick={() => onEdit(log)} className="p-5 rounded-3xl bg-white/5 hover:bg-accent/10 hover:text-accent transition-all"><Edit2 size={20} /></button>
                   <button onClick={() => onDelete(log.logDate)} className="p-5 rounded-3xl bg-white/5 hover:bg-danger/10 hover:text-danger transition-all"><Trash2 size={20} /></button>
                </div>
             </div>
          ))}
       </div>
    </motion.div>
  );
};

const SettingsScreen = ({ configs, user, settings, onAdd }) => {
  const [n, setN] = useState(user.displayName || '');
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10 max-w-2xl mx-auto font-inter">
       <Card className="p-10 bg-[#121315] border-white/5 space-y-10">
          <div className="flex flex-col items-center gap-8">
             <div className="w-32 h-32 rounded-[44px] bg-accent/10 border-2 border-accent/30 flex items-center justify-center overflow-hidden shadow-2xl shadow-accent/5">
                {user.photoURL ? <img src={user.photoURL} className="w-full h-full object-cover" /> : <User size={48} className="text-accent" />}
             </div>
             <div className="w-full space-y-8">
                <Input label="Registry Identity" value={n} onChange={setN} isDark={true} />
                <button onClick={() => updateProfile(auth.currentUser, { displayName: n })} className="w-full h-16 bg-white text-black font-[1000] uppercase tracking-widest rounded-[24px] active:scale-95 transition-all shadow-2xl">Commit Profile</button>
             </div>
          </div>
       </Card>
       <Card className="p-10 bg-[#121315] border-white/5 space-y-8">
          <div className="flex items-center justify-between"><h3 className="text-sm font-black uppercase tracking-widest">Active Protocols</h3><button onClick={onAdd} className="p-4 bg-accent/10 text-accent rounded-2xl hover:bg-accent/20 transition-all"><Plus size={24} /></button></div>
          <div className="space-y-4">
             {configs.map(c => (
                <div key={c.id} className="flex items-center justify-between p-8 bg-white/5 rounded-[32px] border border-white/5 group hover:border-accent/10 transition-all">
                   <div className="flex items-center gap-6">
                      <div className="p-3 bg-white/5 rounded-2xl text-accent/40">{c.type.startsWith('JOINT') ? <Crown size={20} /> : <Activity size={20} />}</div>
                      <div className="flex flex-col">
                        <span className="text-lg font-black uppercase tracking-tight">{c.name}</span>
                        <span className="text-[10px] font-bold text-[#6b7280] uppercase tracking-widest">Target: {c.limit}</span>
                      </div>
                   </div>
                   <button onClick={async () => await deleteDoc(doc(db, 'users', user.uid, 'configs', c.id))} className="p-4 text-[#6b7280] hover:text-danger transition-colors"><Trash2 size={20} /></button>
                </div>
             ))}
          </div>
       </Card>
       <button onClick={() => signOut(auth)} className="w-full h-18 border-2 border-[#ff4b2b]/30 text-[#ff4b2b] font-black uppercase tracking-[0.4em] rounded-[24px] hover:bg-[#ff4b2b]/5 transition-all flex items-center justify-center gap-4 active:scale-95"><LogOut size={22} /> Terminate Registry</button>
    </motion.div>
  );
};

const ProfileModal = ({ user, onClose }) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
    <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="bg-[#121315] border border-white/10 rounded-[48px] w-full max-w-md p-12 relative z-10 shadow-2xl text-center space-y-8">
      <div className="w-28 h-28 rounded-[40px] bg-accent/10 border-2 border-accent/20 overflow-hidden mx-auto flex items-center justify-center shadow-2xl">
         {user.photoURL ? <img src={user.photoURL} alt="u" className="w-full h-full object-cover" /> : <User size={48} className="text-accent" />}
      </div>
      <div><h4 className="text-3xl font-[1000] uppercase tracking-tighter">{user.displayName || 'Anonymous'}</h4><p className="text-[#6b7280] text-sm font-bold tracking-[0.3em] uppercase mt-2">{user.email}</p></div>
      <button onClick={onClose} className="w-full h-16 bg-white text-black font-[1000] uppercase tracking-widest rounded-[24px] shadow-2xl active:scale-95 transition-all">Close Registry</button>
    </motion.div>
  </div>
);

const AddOverlay = ({ onClose, user, configs }) => {
  const [n, setN] = useState(''); const [l, setL] = useState('20'); const [t, setT] = useState('CIGARETTE');
  const handle = async () => {
     const id = Math.random().toString(36).substr(2, 9);
     await setDoc(doc(db, 'users', user.uid, 'configs', id), { name: n, type: t, limit: parseInt(l) || 20, order: configs.length });
     onClose();
  };
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md font-inter">
       <div className="bg-[#121315] border border-white/10 rounded-[48px] w-full max-w-xl p-12 space-y-10 shadow-2xl">
          <div className="flex justify-between items-center"><h3 className="text-3xl font-[1000] uppercase tracking-tighter">New Protocol</h3><button onClick={onClose} className="p-3 bg-white/5 rounded-full"><X /></button></div>
          <div className="space-y-8">
            <Input label="Registry Label" value={n} onChange={setN} placeholder="Unit Identifier" isDark={true} />
            <Input label="Registry Threshold" value={l} onChange={setL} type="number" isDark={true} />
            <div className="space-y-4">
               <span className="text-[10px] font-black uppercase tracking-[0.5em] text-[#6b7280] ml-2">Visual Logic</span>
               <div className="grid grid-cols-2 gap-4">
                  {['CIGARETTE', 'SIMPLE', 'JOINT_KING', 'JOINT_QUEEN'].map(x => (
                     <button key={x} onClick={() => setT(x)} className={cn("h-16 rounded-[24px] border-2 font-black text-[11px] uppercase tracking-widest transition-all flex items-center justify-center gap-3", t === x ? "border-accent bg-accent/10 text-accent" : "border-white/5 text-[#6b7280] hover:border-white/10")}>
                        {x.includes('KING') && <Crown size={14} />} {x.replace('_',' ')}
                     </button>
                  ))}
               </div>
            </div>
          </div>
          <button onClick={handle} className="w-full h-18 bg-accent text-black font-[1000] uppercase tracking-widest rounded-[24px] shadow-2xl active:scale-95 transition-all">Authorize Registry</button>
       </div>
    </div>
  );
};

const EditOverlay = ({ log, configs, onClose, user }) => {
  const [c, setC] = useState({ ...(log.counts || {}) });
  const handle = async () => {
     await setDoc(doc(db, 'users', user.uid, 'logs', log.logDate), { counts: c, logDate: log.logDate }, { merge: true });
     onClose();
  };
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md font-inter">
       <div className="bg-[#121315] border border-white/10 rounded-[48px] w-full max-w-xl p-12 space-y-10 shadow-2xl">
          <div className="flex justify-between items-center"><h3 className="text-2xl font-[1000] uppercase tracking-tighter">Modify Registry</h3><button onClick={onClose} className="p-3 bg-white/5 rounded-full"><X /></button></div>
          <div className="bg-white/5 p-6 rounded-3xl text-center"><span className="text-xs font-black uppercase tracking-[0.4em] opacity-40">{new Date(log.logDate).toLocaleDateString(undefined, { dateStyle: 'full' })}</span></div>
          <div className="space-y-8 max-h-[400px] overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-accent/20">
             {configs.map(x => <Input key={x.id} label={x.name} value={c[x.id] || 0} type="number" onChange={v => setC({...c, [x.id]: parseInt(v) || 0})} isDark={true} />)}
          </div>
          <button onClick={handle} className="w-full h-18 bg-accent text-black font-[1000] uppercase tracking-widest rounded-[24px] active:scale-95 transition-all shadow-2xl shadow-accent/10">Commit Registry</button>
       </div>
    </div>
  );
};

const InsightCard = ({ icon: Icon, label, val, sub, color }) => (
  <Card className="p-10 bg-[#121315] border-white/5 flex flex-col items-center text-center shadow-xl">
     <div className={cn("p-5 rounded-3xl bg-white/5 mb-6 shadow-inner", color)}><Icon size={32} /></div>
     <span className="text-5xl font-[1000] tracking-tighter tabular-nums mb-2 font-inter">{val}</span>
     <span className="text-[11px] font-black text-[#6b7280] uppercase tracking-[0.3em] font-inter">{sub}</span>
     <div className="mt-8 pt-8 border-t border-white/5 w-full text-[10px] font-black uppercase tracking-[0.6em] text-accent opacity-40 font-inter">{label}</div>
  </Card>
);

const AuthScreen = ({ accent }) => {
  const [isL, setIsL] = useState(true);
  const [e, setE] = useState(''); const [p, setP] = useState(''); const [n, setN] = useState('');
  const [loading, setLoading] = useState(false); const [err, setErr] = useState('');
  const handle = async () => {
    setLoading(true); setErr('');
    try {
      if (isL) { await signInWithEmailAndPassword(auth, e, p); }
      else { const c = await createUserWithEmailAndPassword(auth, e, p); await updateProfile(c.user, { displayName: n }); await setDoc(doc(db, 'users', c.user.uid), { name: n, accent: '#00d2ff', isDark: true }); }
    } catch (e) { setErr(e.message); } finally { setLoading(false); }
  };
  return (
    <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center p-6 text-white font-inter relative overflow-hidden">
      <div className="w-full max-w-md space-y-16 relative z-10">
        <div className="flex flex-col items-center text-center">
          <div className="w-24 h-24 bg-accent rounded-[36px] flex items-center justify-center mb-10 shadow-[0_0_80px_rgba(0,210,255,0.4)] text-black"><Zap size={48} fill="currentColor" /></div>
          <h1 className="text-7xl font-[1000] tracking-tighter uppercase leading-none">TABAK<span className="text-accent">++</span></h1>
          <p className="mt-6 text-[#6b7280] text-[11px] font-black uppercase tracking-[0.8em] ml-[0.8em]">Registry Core Online</p>
        </div>
        <Card className="p-12 bg-[#121315] border-white/5 space-y-8 rounded-[48px] shadow-2xl">
          {err && <div className="p-5 bg-danger/10 border border-danger/20 rounded-2xl text-danger text-[11px] font-black text-center uppercase tracking-widest">{err}</div>}
          {!isL && <Input label="Registry Name" value={n} onChange={setN} placeholder="Registry Identity" isDark={true} />}
          <Input label="Registry Email" value={e} onChange={setE} placeholder="id@system.com" isDark={true} />
          <Input label="Registry Key" type="password" value={p} onChange={setP} placeholder="••••••••" isDark={true} />
          <button className="w-full h-18 bg-accent text-black font-[1000] uppercase tracking-widest rounded-[24px] active:scale-95 transition-all mt-6 flex items-center justify-center shadow-2xl shadow-accent/20" onClick={handle} disabled={loading}>{loading ? <Loader2 className="animate-spin" /> : (isL ? 'Initialize Registry' : 'Register Identity')}</button>
          <button onClick={() => setIsL(!isL)} className="w-full text-[10px] font-black text-[#6b7280] uppercase tracking-[0.4em] hover:text-accent transition-all mt-6">{isL ? "Request New Access" : "Return to Authenticator"}</button>
        </Card>
      </div>
    </div>
  );
};

const ErrorView = ({ msg }) => <div className="min-h-screen bg-[#0a0a0b] flex flex-col items-center justify-center p-12 text-center text-white font-inter"><AlertCircle className="text-danger mb-10" size={84} strokeWidth={2.5} /><h2 className="text-4xl font-[1000] uppercase tracking-tighter leading-none mb-6 text-white">Sync Failed</h2><p className="text-[#6b7280] text-sm max-w-xs font-bold opacity-60 leading-relaxed uppercase tracking-widest mb-12">{msg}</p><button onClick={() => window.location.reload()} className="rounded-[24px] font-black uppercase tracking-[0.5em] px-16 h-20 bg-white text-black shadow-2xl active:scale-95 transition-all">Re-Link System</button></div>;
const LoadingView = () => <div className="min-h-screen bg-[#0a0a0b] flex flex-col items-center justify-center space-y-10 text-accent font-inter"><Loader2 className="animate-spin" size={84} strokeWidth={2.5} /><span className="text-[11px] font-black tracking-[1.2em] uppercase text-accent animate-pulse ml-[1.2em]">Syncing Registry</span></div>;

export default AppWrapper;
