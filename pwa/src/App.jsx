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

const APP_VERSION = "11.0.0-STABLE-GOLD";

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
          <p className="text-text-dim text-sm mt-4 mb-10 max-w-xs font-bold opacity-60 leading-relaxed">{this.state.error?.message || "UI Logic Crash Detected."}</p>
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
            <span className="text-[10px] font-bold text-[#6b7280] tracking-[0.3em] uppercase ml-4">Master Registry</span>
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
        <h3 className="text-[11px] font-black text-[#6b7280] tracking-[0.4em] uppercase">Remaining Units</h3>
        <div className="flex items-baseline gap-3">
          <span className="text-7xl font-[1000] tracking-tighter tabular-nums">{Math.max(0, m.limit - m.count)}</span>
          <span className="text-sm font-black text-accent uppercase tracking-widest leading-none">Left</span>
        </div>
      </div>
      <div className="flex flex-col md:items-end gap-2">
        <div className="flex items-center gap-3">
          <div className="px-3 py-1 rounded-full border border-accent/40 text-accent text-[10px] font-black tracking-widest uppercase">{m.rank}</div>
          <span className="text-2xl font-[900] text-[#6b7280] tracking-tighter tabular-nums">{m.xp} <span className="text-sm opacity-50">XP</span></span>
        </div>
      </div>
    </div>
    <div className="mt-10 w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
      <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(1, m.progress) * 100}%` }} transition={{ duration: 1.5 }} className={cn("h-full", m.progress >= 1 ? "bg-danger shadow-[0_0_15px_red]" : "bg-accent shadow-[0_0_15px_var(--accent)]")} />
    </div>
  </section>
);

const TrackerCard = ({ config, count, onInc, onDec, index }) => {
  const progress = Math.min(1, count / config.limit);
  const isKing = config.type === 'JOINT_KING';
  const isQueen = config.type === 'JOINT_QUEEN';
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} className="bg-[#121315] rounded-[40px] border border-white/5 p-8 flex flex-col items-center justify-between min-h-[520px] hover:border-accent/20 transition-all group relative overflow-hidden">
      <span className="text-[10px] font-black text-[#6b7280] tracking-[0.3em] uppercase relative z-10">Target: {config.limit}</span>
      <div className="flex-1 w-full flex flex-col items-center justify-center space-y-12 relative z-10">
        <div className="w-full flex justify-center h-24 items-center">
          {config.type === 'CIGARETTE' && <CigaretteProgress progress={progress} />}
          {config.type === 'SIMPLE' && <RingProgress progress={progress} />}
          {(isKing || isQueen) && <JointProgress progress={progress} isKing={isKing} />}
          {(!['CIGARETTE', 'SIMPLE', 'JOINT_KING', 'JOINT_QUEEN'].includes(config.type)) && <GenericBarProgress progress={progress} />}
        </div>
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2">
            {(isKing || isQueen) && <Crown size={20} className={isKing ? "text-amber-400" : "text-purple-400"} />}
            <motion.span key={count} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-7xl md:text-8xl font-[1000] tracking-tighter tabular-nums">{count}</motion.span>
          </div>
          <span className="text-[11px] font-black text-accent tracking-[0.5em] uppercase opacity-40 mt-2">{config.name}</span>
        </div>
      </div>
      <div className="w-full flex justify-between items-center pt-8 mt-auto relative z-10">
        <button onClick={onDec} className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[#6b7280] hover:text-white hover:bg-white/10 active:scale-90 transition-all shadow-lg"><Minus size={24} strokeWidth={3} /></button>
        <button onClick={onInc} className="w-14 h-14 rounded-full bg-accent flex items-center justify-center text-black hover:brightness-110 active:scale-90 transition-all shadow-[0_10px_25px_var(--accent-rgb)]" style={{'--accent-rgb': 'rgba(0,210,255,0.4)'}}><Plus size={24} strokeWidth={4} /></button>
      </div>
    </motion.div>
  );
};

const CigaretteProgress = ({ progress }) => (
  <div className="relative w-48 h-10 bg-white/5 rounded-full overflow-hidden border-2 border-white/10 flex">
    <div className="h-full bg-white shadow-[0_0_15px_white]" style={{ width: `${progress * 72}%` }} />
    <div className="h-full bg-[#f39c12]" style={{ width: '28%' }} />
    <div className="absolute inset-y-0 w-2.5 bg-danger shadow-[0_0_15px_red]" style={{ left: `calc(${progress * 72}% - 5px)` }} />
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
  </div>
);

const JointProgress = ({ progress, isKing }) => (
  <div className={cn("relative h-10 bg-white/5 rounded-full overflow-hidden border-2 border-white/10 p-1 flex items-center", isKing ? "w-52" : "w-40")}>
     <div className="h-full bg-gradient-to-r from-[#ff4b2b] to-[#f39c12] rounded-full shadow-[0_0_20px_rgba(255,75,43,0.6)]" style={{ width: `${progress * 100}%` }} />
     <div className="absolute top-0 right-0 h-full w-4 bg-[#333]/40 border-l border-white/5" />
  </div>
);

const GenericBarProgress = ({ progress }) => (
  <div className="w-48 h-10 bg-white/5 rounded-full overflow-hidden border-2 border-white/10 p-1">
    <div className="h-full bg-accent rounded-full shadow-[0_0_20px_var(--accent)]" style={{ width: `${progress * 100}%` }} />
  </div>
);

const RingProgress = ({ progress }) => (
  <div className="relative w-24 h-24 flex items-center justify-center">
    <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/5" />
      <motion.circle cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray="264" initial={{ strokeDashoffset: 264 }} animate={{ strokeDashoffset: 264 - (progress * 264) }} className="text-accent" strokeLinecap="round" />
    </svg>
    <HeartPulse size={16} className="text-accent animate-pulse" />
  </div>
);

const NavBtn = ({ icon: Icon, label, active, onClick }) => (
  <button onClick={onClick} className={cn("flex flex-col items-center gap-1.5 transition-all relative group", active ? "text-accent" : "text-[#6b7280] hover:text-white")}>
    {active && <motion.div layoutId="navIndicator" className="absolute -top-6 w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_10px_var(--accent)]" />}
    <Icon size={22} strokeWidth={active ? 3 : 2} />
    <span className="text-[9px] font-black uppercase tracking-[0.2em]">{label}</span>
  </button>
);

const HistoryScreen = ({ logs, configs, m, onEdit, userId }) => {
  const onDelete = async (logDate) => {
    if (window.confirm("Permanently delete this entry?")) {
      await deleteDoc(doc(db, 'users', userId, 'logs', logDate));
    }
  };
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10">
       <Card className="p-8 bg-[#121315] border-white/5">
          <h3 className="text-[11px] font-black text-[#6b7280] tracking-[0.4em] uppercase mb-8">Registry Analytics</h3>
          <div className="h-64 w-full">
             <ResponsiveContainer width="100%" height="100%">
                <LineChart data={logs.slice(0, 7).reverse().map(l => ({ name: new Date(l.logDate).toLocaleDateString(undefined, {weekday:'short'}), val: Object.values(l.counts || {}).reduce((a,b)=>a+b, 0) }))}>
                   <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                   <XAxis dataKey="name" stroke="#6b7280" fontSize={10} axisLine={false} tickLine={false} />
                   <Tooltip contentStyle={{ background: '#121315', border: '1px solid #ffffff10', borderRadius: '16px', fontSize: '12px' }} />
                   <Line type="monotone" dataKey="val" stroke="var(--accent)" strokeWidth={4} dot={{ r: 4, fill: 'var(--accent)' }} />
                </LineChart>
             </ResponsiveContainer>
          </div>
       </Card>
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <InsightCard icon={TrendingUp} label="Streak" val={m.streak} sub="Days Active" color="text-amber-400" />
          <InsightCard icon={Wallet} label="Retained" val={`$${m.savings.toFixed(2)}`} sub="Resource Saved" color="text-emerald-400" />
          <InsightCard icon={Activity} label="Impact" val={`${Math.floor(m.lost/60)}H`} sub="Time Restored" color="text-rose-400" />
       </div>
       <div className="space-y-4">
          {logs.map(log => (
             <div key={log.logDate} className="bg-[#121315] p-6 rounded-[28px] border border-white/5 flex items-center justify-between group">
                <div className="flex flex-col">
                   <span className="text-lg font-black tracking-tighter uppercase">{new Date(log.logDate).toLocaleDateString(undefined, {month:'short', day:'numeric', weekday:'long'})}</span>
                   <span className="text-[10px] font-bold text-[#6b7280] uppercase tracking-widest">{Object.values(log.counts || {}).reduce((a,b)=>a+b, 0)} units logged</span>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                   <button onClick={() => onEdit(log)} className="p-4 rounded-2xl bg-white/5 hover:bg-accent/10 hover:text-accent transition-all"><Edit2 size={18} /></button>
                   <button onClick={() => onDelete(log.logDate)} className="p-4 rounded-2xl bg-white/5 hover:bg-danger/10 hover:text-danger transition-all"><Trash2 size={18} /></button>
                </div>
             </div>
          ))}
       </div>
    </motion.div>
  );
};

const SettingsScreen = ({ configs, user, settings, onAdd }) => {
  const [n, setN] = useState(user.displayName || '');
  const [loading, setLoading] = useState(false);
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10 max-w-2xl mx-auto">
       <Card className="p-10 bg-[#121315] border-white/5 space-y-10">
          <div className="flex flex-col items-center gap-6">
             <div className="w-32 h-32 rounded-[44px] bg-accent/10 border-2 border-accent/30 flex items-center justify-center overflow-hidden">
                {user.photoURL ? <img src={user.photoURL} className="w-full h-full object-cover" /> : <User size={48} className="text-accent" />}
             </div>
             <div className="w-full space-y-6">
                <Input label="Registry Identity" value={n} onChange={setN} isDark={true} />
                <button onClick={() => updateProfile(auth.currentUser, { displayName: n })} className="w-full h-14 bg-white text-black font-black uppercase tracking-widest rounded-2xl active:scale-95 transition-all">Update Identity</button>
             </div>
          </div>
       </Card>
       <Card className="p-10 bg-[#121315] border-white/5 space-y-8">
          <div className="flex items-center justify-between"><h3 className="text-sm font-black uppercase tracking-widest">Active Protocols</h3><button onClick={onAdd} className="p-3 bg-accent/10 text-accent rounded-xl hover:bg-accent/20 transition-all"><Plus size={20} /></button></div>
          <div className="space-y-4">
             {configs.map(c => (
                <div key={c.id} className="flex items-center justify-between p-6 bg-white/5 rounded-[24px] border border-white/5">
                   <div className="flex items-center gap-4">
                      {c.type.startsWith('JOINT') ? <Crown size={16} className="text-accent/40" /> : <Activity size={16} className="text-accent/40" />}
                      <div className="flex flex-col">
                        <span className="text-base font-black uppercase tracking-tight">{c.name}</span>
                        <span className="text-[10px] font-bold text-[#6b7280] uppercase tracking-widest">Target: {c.limit}</span>
                      </div>
                   </div>
                   <button onClick={async () => await deleteDoc(doc(db, 'users', user.uid, 'configs', c.id))} className="p-3 text-[#6b7280] hover:text-danger transition-colors"><Trash2 size={18} /></button>
                </div>
             ))}
          </div>
       </Card>
       <button onClick={() => signOut(auth)} className="w-full h-16 border border-[#ff4b2b]/30 text-[#ff4b2b] font-black uppercase tracking-widest rounded-2xl hover:bg-[#ff4b2b]/5 transition-all flex items-center justify-center gap-4"><LogOut size={20} /> Terminate Session</button>
    </motion.div>
  );
};

const ProfileModal = ({ user, onClose }) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
    <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="bg-[#121315] border border-white/10 rounded-[32px] w-full max-w-md p-10 relative z-10 shadow-2xl text-center space-y-6">
      <div className="w-24 h-24 rounded-[32px] bg-accent/10 border-2 border-accent/20 overflow-hidden mx-auto flex items-center justify-center">
         {user.photoURL ? <img src={user.photoURL} alt="u" className="w-full h-full object-cover" /> : <User size={40} className="text-accent" />}
      </div>
      <div><h4 className="text-2xl font-[1000] uppercase tracking-tighter">{user.displayName || 'Registry User'}</h4><p className="text-[#6b7280] text-xs font-bold tracking-[0.3em] uppercase mt-1">{user.email}</p></div>
      <button onClick={onClose} className="w-full h-14 bg-white text-black font-black uppercase tracking-widest rounded-2xl">Dismiss</button>
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
       <div className="bg-[#121315] border border-white/10 rounded-[40px] w-full max-w-lg p-10 space-y-8 shadow-2xl">
          <div className="flex justify-between items-center"><h3 className="text-2xl font-[1000] uppercase tracking-tighter">New Protocol</h3><button onClick={onClose}><X /></button></div>
          <Input label="Registry Label" value={n} onChange={setN} placeholder="Identify Protocol" isDark={true} />
          <Input label="Threshold Limit" value={l} onChange={setL} type="number" isDark={true} />
          <div className="grid grid-cols-2 gap-4">
             {['CIGARETTE', 'SIMPLE', 'JOINT_KING', 'JOINT_QUEEN'].map(x => (
                <button key={x} onClick={() => setT(x)} className={cn("h-14 rounded-2xl border-2 font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2", t === x ? "border-accent bg-accent/10 text-accent" : "border-white/5 text-[#6b7280] hover:border-white/10")}>
                   {x.includes('KING') && <Crown size={12} />} {x.replace('_',' ')}
                </button>
             ))}
          </div>
          <button onClick={handle} className="w-full h-16 bg-accent text-black font-black uppercase tracking-widest rounded-2xl active:scale-95 transition-all">Authorize</button>
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm font-inter">
       <div className="bg-[#121315] border border-white/10 rounded-[40px] w-full max-w-lg p-10 space-y-8 shadow-2xl">
          <div className="flex justify-between items-center">
             <h3 className="text-xl font-[1000] uppercase tracking-tighter">Modify Registry</h3>
             <button onClick={onClose} className="p-2 bg-white/5 rounded-full"><X size={20} /></button>
          </div>
          <div className="bg-white/5 p-4 rounded-2xl text-center"><span className="text-xs font-black uppercase tracking-widest opacity-40">{new Date(log.logDate).toLocaleDateString(undefined, { dateStyle: 'full' })}</span></div>
          <div className="space-y-6 max-h-[400px] overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-white/10">
             {configs.map(x => <Input key={x.id} label={x.name} value={c[x.id] || 0} type="number" onChange={v => setC({...c, [x.id]: parseInt(v) || 0})} isDark={true} />)}
          </div>
          <button onClick={handle} className="w-full h-16 bg-accent text-black font-black uppercase tracking-widest rounded-2xl active:scale-95 transition-all shadow-[0_10px_30px_rgba(0,210,255,0.3)]">Commit Changes</button>
       </div>
    </div>
  );
};

const InsightCard = ({ icon: Icon, label, val, sub, color }) => (
  <Card className="p-8 bg-[#121315] border-white/5 flex flex-col items-center text-center">
     <div className={cn("p-4 rounded-2xl bg-white/5 mb-4", color)}><Icon size={28} /></div>
     <span className="text-4xl font-[1000] tracking-tighter tabular-nums mb-1">{val}</span>
     <span className="text-[10px] font-black text-[#6b7280] uppercase tracking-[0.2em]">{sub}</span>
     <div className="mt-6 pt-6 border-t border-white/5 w-full text-[9px] font-black uppercase tracking-widest text-accent opacity-40">{label}</div>
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
      <div className="w-full max-w-md space-y-12 relative z-10">
        <div className="flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-accent rounded-[28px] flex items-center justify-center mb-8 shadow-[0_0_60px_rgba(0,210,255,0.4)] text-black"><Zap size={40} fill="currentColor" /></div>
          <h1 className="text-6xl font-[1000] tracking-tighter uppercase leading-none">TABAK<span className="text-accent">++</span></h1>
        </div>
        <Card className="p-10 bg-[#121315] border-white/5 space-y-6">
          {err && <div className="p-4 bg-danger/10 border border-danger/20 rounded-2xl text-danger text-xs font-bold text-center">{err}</div>}
          {!isL && <Input label="Registry Name" value={n} onChange={setN} placeholder="Registry Identity" isDark={true} />}
          <Input label="Registry Email" value={e} onChange={setE} placeholder="id@system.com" isDark={true} />
          <Input label="Registry Key" type="password" value={p} onChange={setP} placeholder="••••••••" isDark={true} />
          <button className="w-full h-16 bg-accent text-black font-black uppercase tracking-widest rounded-2xl active:scale-95 transition-all mt-4 flex items-center justify-center shadow-[0_10px_30px_rgba(0,210,255,0.3)]" onClick={handle} disabled={loading}>{loading ? <Loader2 className="animate-spin" /> : (isL ? 'Sync Registry' : 'Join Registry')}</button>
          <button onClick={() => setIsL(!isL)} className="w-full text-xs font-bold text-[#6b7280] uppercase tracking-[0.2em] hover:text-accent transition-all mt-4">{isL ? "Request Access Entry" : "Return to Log In"}</button>
        </Card>
      </div>
    </div>
  );
};

const ErrorView = ({ msg }) => <div className="min-h-screen bg-[#0a0a0b] flex flex-col items-center justify-center p-12 text-center text-white font-inter"><AlertCircle className="text-danger mb-10" size={64} /><h2 className="text-3xl font-[1000] uppercase tracking-tighter leading-none mb-4 text-white">Sync Failed</h2><p className="text-text-dim text-sm max-w-xs font-bold opacity-60 leading-relaxed">{msg}</p><button onClick={() => window.location.reload()} className="mt-12 rounded-full font-black uppercase tracking-[0.5em] px-12 h-20 bg-white text-black shadow-2xl active:scale-95 transition-all">Re-Link System</button></div>;
const LoadingView = () => <div className="min-h-screen bg-[#0a0a0b] flex flex-col items-center justify-center space-y-8 text-accent font-inter"><Loader2 className="animate-spin" size={72} strokeWidth={3} /><span className="text-[11px] font-black tracking-[1.2em] uppercase text-accent animate-pulse ml-[1.2em]">Syncing Registry</span></div>;

export default AppWrapper;
