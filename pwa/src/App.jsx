import React, { useState, useMemo, useEffect, Component, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutGrid, BarChart3, Settings, User, Plus, Minus,
  Activity, Zap, ShieldCheck, HeartPulse, Flame, X,
  LogOut, Camera, Calendar, RefreshCcw, Loader2, AlertCircle,
  TrendingUp, Wallet, Clock, Grid, Moon, Sparkles, Check, Edit2, Trash2, Crown,
  ArrowUp, ArrowDown, ChevronRight, Apple, Github
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
  doc, setDoc, collection, onSnapshot, query, orderBy, limit, deleteDoc, updateDoc, getDoc, writeBatch
} from 'firebase/firestore';

// --- UTILS ---
import { SmokingCalculator } from './utils/smokingCalculator';
import { cn } from './utils/utils';
import { Card, Button, Input, StaggeredItem } from './components/Common';

// --- GLOBAL CONSTANTS & HELPERS ---
const APP_VERSION = "15.5.0-MASTER-FIX";

const hexToRgb = (hex) => {
  const h = hex || '#00d2ff';
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(h);
  return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '0, 210, 255';
};

const ACCENTS = [
  { n: 'Cyan', v: '#00d2ff' }, { n: 'Lime', v: '#D4FF5C' }, { n: 'Emerald', v: '#4ADE80' },
  { n: 'Violet', v: '#A78BFA' }, { n: 'Amber', v: '#FBBF24' }, { n: 'Rose', v: '#FB7185' }
];

// --- REUSABLE UI COMPONENTS (iOS OPTIMIZED) ---

/**
 * <TopBanner />
 * Ultra-modern, notch-safe header with glassmorphism.
 */
function TopBanner({ user, onProfileClick }) {
  return (
    <header
      className="sticky top-0 z-[100] w-full backdrop-blur-md bg-black/70 border-b border-white/[0.03] transition-all"
      style={{ paddingTop: 'max(env(safe-area-inset-top), 1rem)', paddingBottom: '1.25rem' }}
    >
      <div className="max-w-7xl mx-auto flex justify-between items-center px-6">
        <div className="flex flex-col">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse shadow-[0_0_12px_var(--accent)]" />
            <h1 className="text-2xl font-[1000] tracking-tighter uppercase leading-none font-inter">TABAK<span className="text-accent">++</span></h1>
          </div>
          <span className="text-[10px] font-black text-white/30 tracking-[0.4em] uppercase ml-4.5 mt-1.5 opacity-60">Registry Portal</span>
        </div>

        <button
          onClick={onProfileClick}
          className="group relative w-11 h-11 rounded-[18px] bg-white/[0.03] border border-white/[0.05] flex items-center justify-center text-white/40 hover:text-accent hover:border-accent/30 hover:bg-accent/10 active:scale-90 transition-all shadow-2xl overflow-hidden"
          aria-label="Profile"
        >
          {user?.photoURL ? <img src={user.photoURL} alt="u" className="w-full h-full object-cover" /> : <User size={20} />}
          <div className="absolute inset-0 bg-accent/0 group-hover:bg-accent/5 transition-colors" />
        </button>
      </div>
    </header>
  );
}

/**
 * <MetricBanner />
 * Displays daily progress units.
 */
function MetricBanner({ m }) {
  return (
    <section className="bg-white/[0.02] rounded-[48px] p-10 border border-white/[0.03] relative overflow-hidden group shadow-[0_40px_100px_rgba(0,0,0,0.3)]">
      <div className="absolute top-0 right-0 w-80 h-80 bg-accent/5 rounded-full blur-[100px] -mr-40 -mt-40 transition-all duration-1000 group-hover:bg-accent/10" />
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 relative z-10">
        <div className="space-y-3">
          <h3 className="text-[11px] font-[1000] text-white/20 tracking-[0.6em] uppercase font-inter">Remaining Units</h3>
          <div className="flex items-baseline gap-4">
            <span className="text-7xl font-[1000] tracking-tighter tabular-nums font-inter leading-none">{Math.max(0, m.limit - m.count)}</span>
            <span className="text-sm font-black text-accent uppercase tracking-[0.4em] leading-none font-inter">Left</span>
          </div>
        </div>
        <div className="flex flex-col md:items-end gap-3">
          <div className="flex items-center gap-4">
            <div className="px-5 py-2 rounded-[16px] bg-accent/10 border border-accent/20 text-accent text-[11px] font-[1000] tracking-[0.3em] uppercase font-inter shadow-2xl">{m.rank}</div>
            <span className="text-3xl font-[1000] text-white/20 tracking-tighter tabular-nums font-inter">{m.xp} <span className="text-sm font-bold opacity-50 uppercase tracking-widest font-inter">XP</span></span>
          </div>
        </div>
      </div>
      <div className="mt-12 w-full h-2 bg-white/[0.03] rounded-full overflow-hidden p-0.5 border border-white/[0.05] shadow-inner">
        <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(1, m.progress) * 100}%` }} transition={{ duration: 1.5, type: 'spring' }} className={cn("h-full rounded-full transition-all duration-700", m.progress >= 1 ? "bg-danger shadow-[0_0_20px_rgba(248,113,113,0.8)]" : "bg-accent shadow-[0_0_20px_var(--accent)]")} />
      </div>
    </section>
  );
}

/**
 * <SmokingProgress />
 * Optimized burning visuals.
 */
const SmokingProgress = ({ count, limit, variant }) => {
  const isL = count >= limit;
  const tobaccoPct = Math.max(0, 1 - (count / limit));
  const isJoint = variant === 'KING' || variant === 'QUEEN';

  return (
    <div className={cn(
      "relative h-11 rounded-full overflow-hidden border-2 transition-all duration-1000 flex items-center shadow-2xl",
      variant === 'KING' ? "w-64" : (variant === 'QUEEN' ? "w-48" : "w-56"),
      isL ? "bg-danger border-danger shadow-[0_0_50px_rgba(255,0,0,0.6)]" : "bg-white/[0.03] border-white/10"
    )}>
      {!isL && (
        <div
          className={cn(
            "absolute h-full transition-all duration-1000 ease-out",
            isJoint ? "bg-gradient-to-r from-white/80 to-white" : "bg-white shadow-[0_0_20px_white]"
          )}
          style={{ width: `${tobaccoPct * 72}%`, right: '28%' }}
        />
      )}
      {!isL && count > 0 && (
        <div className="absolute h-full w-3 bg-danger shadow-[0_0_25px_red] z-20 transition-all duration-1000 ease-out" style={{ right: `calc(28% + ${tobaccoPct * 72}% - 1.5px)` }} />
      )}
      <div className={cn("absolute right-0 h-full w-[28%] border-l-2 transition-all duration-1000", isL ? "bg-danger border-white/20" : (isJoint ? "bg-[#2a2a2e] border-white/5" : "bg-[#f59e0b] border-black/20"))} />
    </div>
  );
};

const GenericBarProgress = ({ count, limit }) => {
  const isL = count >= limit;
  const progress = Math.min(1, count / limit);
  return (
    <div className={cn("w-56 h-11 rounded-full overflow-hidden border-2 p-1.5 transition-all duration-1000 shadow-2xl", isL ? "bg-danger/20 border-danger" : "bg-white/[0.03] border-white/10")}>
      <div className={cn("h-full rounded-full transition-all duration-1000", isL ? "bg-danger shadow-[0_0_30px_red]" : "bg-accent shadow-[0_0_20px_var(--accent)]")} style={{ width: `${progress * 100}%` }} />
    </div>
  );
};

const RingProgress = ({ count, limit }) => {
  const isL = count >= limit;
  const progress = Math.min(1, count / limit);
  return (
    <div className="relative w-32 h-32 flex items-center justify-center shadow-2xl rounded-full">
      <svg className="absolute inset-0 w-full h-full -rotate-90 overflow-visible p-2" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-white/[0.03]" />
        <motion.circle cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="10" fill="transparent" strokeDasharray="264" initial={{ strokeDashoffset: 264 }} animate={{ strokeDashoffset: 264 - (progress * 264) }} className={cn("transition-colors duration-1000", isL ? "text-danger" : "text-accent")} strokeLinecap="round" />
      </svg>
      <HeartPulse size={24} className={cn("transition-all duration-1000", isL ? "text-danger scale-125" : "text-accent animate-pulse")} />
    </div>
  );
};

const TrackerCard = ({ config, count, onInc, onDec, index }) => {
  const isL = count >= config.limit;
  const isKing = config.type === 'JOINT_KING';
  const isQueen = config.type === 'JOINT_QUEEN';
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * 0.05, type: 'spring', damping: 15 }} className={cn("bg-white/[0.02] rounded-[56px] border-2 p-10 flex flex-col items-center justify-between min-h-[520px] transition-all duration-700 group relative overflow-hidden shadow-2xl font-inter", isL ? "border-danger/30 shadow-[0_0_60px_rgba(248,113,113,0.1)]" : "border-white/[0.03] hover:border-accent/20")}>
      <span className="text-[10px] font-black text-white/20 tracking-[0.6em] uppercase relative z-10">Target: {config.limit}</span>

      <div className="flex-1 w-full flex flex-col items-center justify-center space-y-12 relative z-10 py-10">
        <div className="w-full flex justify-center h-24 items-center">
          {config.type === 'CIGARETTE' && <SmokingProgress count={count} limit={config.limit} variant="CIGARETTE" />}
          {config.type === 'SIMPLE' && <RingProgress count={count} limit={config.limit} />}
          {isKing && <SmokingProgress count={count} limit={config.limit} variant="KING" />}
          {isQueen && <SmokingProgress count={count} limit={config.limit} variant="QUEEN" />}
          {(!['CIGARETTE', 'SIMPLE', 'JOINT_KING', 'JOINT_QUEEN'].includes(config.type)) && <GenericBarProgress count={count} limit={config.limit} />}
        </div>
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-3">
            {(isKing || isQueen) && <Crown size={24} className={cn("transition-all duration-700", isL ? "text-danger drop-shadow-[0_0_15px_red]" : (isKing ? "text-amber-400 opacity-40" : "text-purple-400 opacity-40"))} />}
            <motion.span key={count} initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={cn("text-7xl font-[1000] tracking-tighter tabular-nums transition-all duration-700 leading-none", isL ? "text-danger drop-shadow-[0_0_30px_rgba(248,113,113,0.4)]" : "text-white")}>{count}</motion.span>
          </div>
          <span className={cn("text-[12px] font-black tracking-[0.8em] uppercase transition-all duration-700 mt-5", isL ? "text-danger" : "text-accent opacity-30 group-hover:opacity-60")}>{config.name}</span>
        </div>
      </div>

      <div className="w-full flex justify-between items-center pt-8 mt-auto relative z-10">
        <button onClick={onDec} className="w-16 h-16 rounded-[24px] bg-white/[0.04] border border-white/[0.05] flex items-center justify-center text-white/30 hover:text-white active:scale-90 transition-all shadow-xl"><Minus size={28} strokeWidth={3} /></button>
        <button onClick={onInc} className={cn("w-16 h-16 rounded-[24px] flex items-center justify-center text-black active:scale-90 transition-all shadow-[0_20px_50px_var(--accent-rgb)]", isL ? "bg-danger shadow-[0_20px_50px_rgba(248,113,113,0.6)]" : "bg-accent")} style={{'--accent-rgb': 'rgba(0,210,255,0.4)'}}><Plus size={28} strokeWidth={4} /></button>
      </div>
    </motion.div>
  );
};

/**
 * <IPhoneTrackingCard />
 * REFACTORED: Optimized list item following Apple HIG.
 * Prevents action button overflow via strict flexbox and spacer logic.
 */
const IPhoneTrackingCard = ({ config, idx, total, onReo, onEdit, onDelete }) => (
  <div className="flex flex-row justify-between items-center w-full p-6 bg-white/[0.03] rounded-[32px] border border-white/[0.05] group hover:border-accent/30 transition-all duration-500 shadow-xl overflow-hidden min-h-[100px]">
    {/* Component 1 & 2 & 3: Controls, Icon, Text (Grouped on Left) */}
    <div className="flex flex-row items-center gap-6 min-w-0 flex-1">
      {/* Component 1: Controls (Up/Down) */}
      <div className="flex flex-col gap-2 shrink-0">
        <button
          onClick={() => onReo(config.id, 'up')}
          disabled={idx === 0}
          className="w-11 h-11 rounded-xl bg-white/[0.05] flex items-center justify-center text-white/30 hover:text-accent disabled:opacity-0 transition-all active:scale-75 shrink-0"
        >
          <ArrowUp size={18} strokeWidth={3} />
        </button>
        <button
          onClick={() => onReo(config.id, 'down')}
          disabled={idx === total - 1}
          className="w-11 h-11 rounded-xl bg-white/[0.05] flex items-center justify-center text-white/30 hover:text-accent disabled:opacity-0 transition-all active:scale-75 shrink-0"
        >
          <ArrowDown size={18} strokeWidth={3} />
        </button>
      </div>

      {/* Component 2: Icon */}
      <div className="w-14 h-14 bg-white/[0.03] border border-white/5 rounded-[18px] flex items-center justify-center text-accent/50 group-hover:text-accent transition-all shrink-0">
        {config.type.startsWith('JOINT') ? <Crown size={28} /> : <Activity size={28} />}
      </div>

      {/* Component 3: Text (Flexible spacer) */}
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-xl font-[900] tracking-tight uppercase group-hover:text-white transition-colors truncate">{config.name}</span>
        <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] leading-relaxed">Target: {config.limit}</span>
      </div>
    </div>

    {/* Component 4: Action Buttons (Right Aligned) */}
    <div className="flex flex-row items-center gap-4 ml-4 shrink-0">
      <button
        onClick={() => onEdit(config)}
        className="w-11 h-11 rounded-[14px] bg-white/[0.03] border border-white/[0.05] flex items-center justify-center text-white/20 hover:text-accent hover:border-accent/20 transition-all shadow-md"
      >
        <Edit2 size={18} />
      </button>
      <button
        onClick={() => onDelete(config.id)}
        className="w-11 h-11 rounded-[14px] bg-white/[0.03] border border-white/[0.05] flex items-center justify-center text-white/20 hover:text-danger hover:border-danger/20 transition-all shadow-md"
      >
        <Trash2 size={18} />
      </button>
    </div>
  </div>
);

const IPhoneModifyModal = ({ isOpen, onClose, title, actionLabel, onAction, children }) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/85 backdrop-blur-2xl">
        <motion.div initial={{ opacity: 0, scale: 0.9, y: 100 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 100 }} className="bg-[#121318] border border-white/10 rounded-[56px] w-full max-w-lg p-10 flex flex-col shadow-2xl relative overflow-hidden font-inter" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 2rem)' }}>
          <div className="flex justify-between items-center mb-10">
            <h3 className="text-3xl font-[1000] uppercase tracking-tighter truncate pr-6">{title}</h3>
            <button onClick={onClose} className="w-11 h-11 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all shrink-0 active:scale-90"><X size={24} /></button>
          </div>
          <div className="flex-1 overflow-y-auto mb-10 space-y-10 scrollbar-thin scrollbar-thumb-white/5 pr-2">{children}</div>
          <button onClick={onAction} className="w-full h-18 md:h-20 bg-accent text-black font-[1000] uppercase tracking-[0.4em] rounded-[24px] shadow-2xl active:scale-95 transition-all flex items-center justify-center px-6"><span className="whitespace-nowrap text-xs md:text-sm">{actionLabel}</span></button>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

const ProtocolFormOverlay = ({ isOpen, onClose, onApply, title, initialData = null }) => {
  const [n, setN] = useState(initialData?.name || '');
  const [l, setL] = useState(initialData?.limit || '20');
  const [t, setT] = useState(initialData?.type || 'CIGARETTE');
  return (
    <IPhoneModifyModal isOpen={isOpen} onClose={onClose} title={title} actionLabel={initialData ? "Apply Modification" : "Authorize logic"} onAction={() => onApply({ name: n, limit: parseInt(l) || 20, type: t })}>
      <div className="space-y-10">
        <div className="relative group">
          <span className="absolute left-6 top-1 text-[10px] font-black text-accent uppercase tracking-widest opacity-40">Descriptor</span>
          <input value={n} onChange={e=>setN(e.target.value)} className="w-full h-20 bg-white/[0.03] border border-white/5 rounded-[28px] px-8 pt-6 text-lg font-[1000] focus:border-accent/40 outline-none transition-all font-inter" placeholder="Protocol Label" />
        </div>
        <div className="relative group">
          <span className="absolute left-6 top-1 text-[10px] font-black text-accent uppercase tracking-widest opacity-40">Threshold</span>
          <input type="number" value={l} onChange={e=>setL(e.target.value)} className="w-full h-20 bg-white/[0.03] border border-white/5 rounded-[28px] px-8 pt-6 text-lg font-[1000] focus:border-accent/40 outline-none transition-all font-inter" />
        </div>
        <div className="space-y-5">
          <span className="text-[10px] font-black uppercase tracking-[0.8em] text-white/20 ml-2">Visual Schematic</span>
          <div className="grid grid-cols-2 gap-5">
            {['CIGARETTE', 'SIMPLE', 'JOINT_KING', 'JOINT_QUEEN'].map(x => (
              <button key={x} onClick={() => setT(x)} className={cn("h-18 rounded-[32px] border-2 font-black text-[12px] uppercase tracking-widest transition-all flex items-center justify-center gap-4 active:scale-95", t === x ? "border-accent bg-accent/10 text-accent shadow-[0_0_30px_rgba(0,210,255,0.2)]" : "border-white/5 text-white/20 hover:border-white/10")}>{x.includes('KING') && <Crown size={18} />} {x.replace('_',' ')}</button>
            ))}
          </div>
        </div>
      </div>
    </IPhoneModifyModal>
  );
};

// --- GLOBAL ERROR BOUNDARY ---
class ErrorBoundaryUI extends Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#020202] flex flex-col items-center justify-center p-12 text-center text-white font-inter">
          <div className="p-8 bg-danger/10 rounded-[32px] text-danger border border-danger/20 shadow-2xl mb-8"><AlertCircle size={48} /></div>
          <h2 className="text-3xl font-[950] uppercase tracking-tighter leading-none">System Fault</h2>
          <p className="text-text-dim text-sm mt-4 mb-10 max-w-xs font-bold opacity-60 leading-relaxed font-inter">{this.state.error?.message || "UI Logic Crash Detected."}</p>
          <Button onClick={() => { localStorage.clear(); window.location.reload(); }} className="w-64 h-18 rounded-full shadow-2xl font-black uppercase tracking-widest bg-white text-black">Reset Environment</Button>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- MAIN WRAPPER ---
const AppWrapper = () => (
  <ErrorBoundaryUI>
    <App />
  </ErrorBoundaryUI>
);

const App = () => {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('track');
  const [appError, setAppError] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [editProtocol, setEditProtocol] = useState(null);

  const [logs, setLogs] = useState([]);
  const [configs, setConfigs] = useState([]);
  const [settings, setSettings] = useState({
    accent: '#00d2ff', isDark: true, layout: 'LARGE', fontScale: 1, nightOwl: false, globalPrice: '0.5'
  });

  const today = useMemo(() => new Date().toISOString().split('T')[0], []);

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

  const onUpdateSettings = useCallback((upd) => {
    if (!user) return;
    updateDoc(doc(db, 'users', user.uid), upd);
  }, [user]);

  const onReorder = async (id, dir) => {
    if (!user) return;
    const sorted = [...configs].sort((a,b)=>a.order - b.order);
    const idx = sorted.findIndex(x => x.id === id);
    if ((dir === 'up' && idx === 0) || (dir === 'down' && idx === sorted.length - 1)) return;
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
    const itemA = sorted[idx]; const itemB = sorted[swapIdx];
    const batch = writeBatch(db);
    batch.update(doc(db, 'users', user.uid, 'configs', itemA.id), { order: itemB.order });
    batch.update(doc(db, 'users', user.uid, 'configs', itemB.id), { order: itemA.order });
    await batch.commit();
  };

  const onProtocolUpdate = async (id, data) => {
    if (!user) return;
    await updateDoc(doc(db, 'users', user.uid, 'configs', id), data);
    setEditProtocol(null);
  };

  const onProtocolAdd = async (data) => {
    if (!user) return;
    const id = Math.random().toString(36).substring(2, 11);
    await setDoc(doc(db, 'users', user.uid, 'configs', id), { ...data, order: configs.length });
    setShowAdd(false);
  };

  if (appError) return <ErrorView msg={appError} />;
  if (authLoading) return <LoadingView />;
  if (!user) return <AuthScreen accent={settings.accent} />;

  return (
    <div
      className="min-h-screen bg-[#020202] text-white font-inter selection:bg-accent/30 overflow-x-hidden flex flex-col"
      style={{ '--accent': settings.accent, '--accent-rgb': hexToRgb(settings.accent), fontSize: `${settings.fontScale}rem` }}
    >
      <TopBanner user={user} onProfileClick={() => setShowProfile(true)} />

      <main className="flex-1 overflow-y-auto pt-10 pb-[calc(env(safe-area-inset-bottom)+12rem)] px-5 max-w-7xl mx-auto w-full transition-all duration-500 overflow-x-hidden">
        <AnimatePresence mode="wait">
          {activeTab === 'track' && (
            <motion.div key="track" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }} transition={{ type: 'spring', damping: 20, stiffness: 100 }} className="space-y-10">
              <MetricBanner m={metrics} />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
                 {configs.sort((a,b)=>a.order-b.order).map((c, i) => (
                   <TrackerCard key={c.id} config={c} count={(metrics.todayLog.counts || {})[c.id] || 0} onInc={() => onInc(c.id)} onDec={() => onDec(c.id)} index={i} />
                 ))}
                 <button onClick={() => setShowAdd(true)} className="bg-white/[0.01] rounded-[48px] border-2 border-dashed border-white/[0.05] flex flex-col items-center justify-center space-y-5 hover:bg-accent/5 hover:border-accent/20 transition-all min-h-[500px] group shadow-2xl">
                    <div className="w-16 h-16 rounded-[28px] bg-white/[0.03] flex items-center justify-center text-white/10 group-hover:text-accent group-hover:bg-accent/10 transition-all border border-white/5"><Plus size={32} /></div>
                    <span className="text-[10px] font-black uppercase tracking-[0.5em] text-white/10 group-hover:text-accent transition-colors font-inter">New Protocol</span>
                 </button>
              </div>
            </motion.div>
          )}
          {activeTab === 'history' && <HistoryScreen logs={logs} configs={configs} m={metrics} onEdit={setEditTarget} userId={user.uid} today={today} />}
          {activeTab === 'control' && (
            <SettingsScreen
              configs={configs}
              user={user}
              settings={settings}
              onAdd={() => setShowAdd(true)}
              onReo={onReorder}
              onEditP={setEditProtocol}
              onUpd={onUpdateSettings}
              onDel={async (id) => { if(window.confirm(`Permanently terminate this protocol?`)) await deleteDoc(doc(db, 'users', user.uid, 'configs', id)); }}
            />
          )}
        </AnimatePresence>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-[100] bg-[#020202]/80 backdrop-blur-3xl border-t border-white/[0.03] pb-[env(safe-area-inset-bottom)] px-6">
        <div className="max-w-xl mx-auto flex items-center justify-around h-20">
          <NavBtn id="track" icon={LayoutGrid} label="Track" active={activeTab === 'track'} onClick={() => setActiveTab('track')} />
          <NavBtn id="history" icon={BarChart3} label="History" active={activeTab === 'history'} onClick={() => setActiveTab('history')} />
          <NavBtn id="control" icon={Settings} label="Control" active={activeTab === 'control'} onClick={() => setActiveTab('control')} />
        </div>
      </nav>

      {/* OVERLAYS & MODALS */}
      <AnimatePresence>
        {showProfile && <ProfileModal user={user} onClose={() => setShowProfile(false)} />}

        {showAdd && (
          <ProtocolFormOverlay
            isOpen={showAdd}
            onClose={() => setShowAdd(false)}
            onApply={onProtocolAdd}
            title="New Protocol"
          />
        )}

        {editProtocol && (
          <ProtocolFormOverlay
            isOpen={!!editProtocol}
            onClose={() => setEditProtocol(null)}
            onApply={(data) => onProtocolUpdate(editProtocol.id, data)}
            title="Modify Protocol"
            initialData={editProtocol}
          />
        )}

        {editTarget && <EditOverlay log={editTarget} configs={configs} onClose={() => setEditTarget(null)} user={user} />}
      </AnimatePresence>
    </div>
  );
};

// --- SUB-COMPONENTS ---

const NavBtn = ({ id, icon: Icon, label, active, onClick }) => (
  <button onClick={onClick} className="relative flex-1 py-3 flex flex-col items-center gap-1.5 group transition-all duration-500">
    <div className={cn("absolute -top-3 w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_12px_var(--accent)] transition-all duration-500", active ? "opacity-100 scale-100" : "opacity-0 scale-0")} />
    <Icon size={24} className={cn("transition-all duration-500", active ? "text-accent scale-110 drop-shadow-[0_0_100px_var(--accent-rgb)]" : "text-white/20 group-hover:text-white/40")} style={{'--accent-rgb': 'rgba(0,210,255,0.4)'}} strokeWidth={active ? 3 : 2} />
    <span className={cn("text-[9px] font-black uppercase tracking-[0.3em] transition-all duration-500 font-inter", active ? "text-white opacity-100" : "text-white/20")}>{label}</span>
  </button>
);

const HistoryScreen = ({ logs, configs, m, onEdit, userId, today }) => {
  const onDelete = async (logDate) => {
    if (window.confirm("Permanently delete this registry record?")) {
      await deleteDoc(doc(db, 'users', userId, 'logs', logDate));
    }
  };
  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-12 font-inter">
       <Card className="p-12 bg-white/[0.02] border border-white/[0.03] rounded-[48px] shadow-[0_40px_100px_rgba(0,0,0,0.4)]">
          <div className="flex justify-between items-start mb-12">
             <div className="space-y-2">
                <h3 className="text-[10px] font-black text-white/30 tracking-[0.8em] uppercase">Visual Stream</h3>
                <span className="text-3xl font-[1000] tracking-tighter uppercase">Registry Logs</span>
             </div>
             <div className="p-4 bg-accent/10 rounded-[20px] text-accent"><BarChart3 size={32} strokeWidth={2.5} /></div>
          </div>
          <div className="h-72 w-full">
             <ResponsiveContainer width="100%" height="100%">
                <LineChart data={logs.slice(0, 7).reverse().map(l => ({ name: new Date(l.logDate).toLocaleDateString(undefined, {weekday:'short'}).toUpperCase(), val: Object.values(l.counts || {}).reduce((a,b)=>a+b, 0) }))}>
                   <CartesianGrid strokeDasharray="8 8" stroke="#ffffff03" vertical={false} />
                   <XAxis dataKey="name" stroke="#6b7280" fontSize={10} axisLine={false} tickLine={false} tick={{fontWeight:900, opacity: 0.4}} dy={15} />
                   <Tooltip contentStyle={{ background: '#121316', border: 'none', borderRadius: '24px', fontSize: '12px', fontWeight:900, padding: '15px' }} />
                   <Line type="monotone" dataKey="val" stroke="var(--accent)" strokeWidth={8} dot={{ r: 8, fill: 'var(--accent)', strokeWidth: 5, stroke: '#0a0a0c' }} activeDot={{ r: 12, fill: '#fff', shadow: '0 0 20px #00d2ff' }} animationDuration={2000} />
                </LineChart>
             </ResponsiveContainer>
          </div>
       </Card>

       <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <InsightCard icon={TrendingUp} label="Streak" val={m.streak} sub="Days Active" color="text-amber-400" />
          <InsightCard icon={Wallet} label="Retained" val={`$${m.savings.toFixed(2)}`} sub="Capital Saved" color="text-emerald-400" />
          <InsightCard icon={Activity} label="Impact" val={`${Math.floor(m.lost/60)}H`} sub="Time Restored" color="text-rose-400" />
       </div>

       <div className="space-y-8 pt-12">
          <h4 className="text-[10px] font-black text-white/20 tracking-[1em] uppercase px-4">Timeline Feed</h4>
          {logs.map((log, i) => (
             <StaggeredItem key={log.logDate} index={i}>
                <div className="bg-white/[0.02] p-10 rounded-[48px] border border-white/[0.03] flex items-center justify-between group hover:border-accent/20 transition-all duration-500 shadow-2xl">
                   <div className="flex flex-col gap-3">
                      <span className="text-2xl font-[1000] tracking-tighter uppercase leading-none">{log.logDate === today ? 'Today' : new Date(log.logDate).toLocaleDateString(undefined, {month:'short', day:'numeric', weekday:'long'})}</span>
                      <span className="text-[11px] font-black text-white/30 uppercase tracking-[0.4em] flex items-center gap-3">{Object.values(log.counts || {}).reduce((a,b)=>a+b, 0)} units registered</span>
                   </div>
                   <div className="flex items-center gap-4">
                      <button onClick={() => onEdit(log)} className="p-5 rounded-[22px] bg-white/[0.03] border border-white/[0.05] hover:text-accent hover:border-accent/20 transition-all shadow-xl"><Edit2 size={24} /></button>
                      <button onClick={() => onDelete(log.logDate)} className="p-5 rounded-[22px] bg-white/[0.03] border border-white/[0.05] hover:text-danger hover:border-danger/20 transition-all shadow-xl"><Trash2 size={24} /></button>
                   </div>
                </div>
             </StaggeredItem>
          ))}
       </div>
    </motion.div>
  );
};

const SettingsScreen = ({ configs, user, settings, onAdd, onReo, onEditP, onUpd, onDel }) => {
  const [n, setN] = useState(user.displayName || '');
  const [la, setLa] = useState(settings.accent);
  const applyTheme = () => { onUpd({ accent: la }); setTimeout(() => window.location.reload(), 300); };

  return (
    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-12 max-w-3xl mx-auto font-inter">
       <Card className="p-12 bg-white/[0.02] border border-white/[0.03] rounded-[56px] space-y-12 shadow-2xl">
          <div className="flex flex-col items-center gap-10">
             <div className="relative group cursor-pointer">
                <div className="w-40 h-40 rounded-[48px] bg-accent/5 border-2 border-accent/20 flex items-center justify-center overflow-hidden shadow-2xl">
                   {user.photoURL ? <img src={user.photoURL} className="w-full h-full object-cover" /> : <User size={64} className="text-accent" />}
                </div>
                <div className="absolute -bottom-3 -right-3 w-14 h-14 bg-white text-black rounded-[22px] flex items-center justify-center shadow-2xl border-4 border-[#020202]"><Camera size={24} strokeWidth={2.5} /></div>
             </div>
             <div className="w-full space-y-10">
                <div className="relative group">
                  <span className="absolute left-6 top-1 text-[10px] font-black text-accent uppercase tracking-widest opacity-40">Identity Label</span>
                  <input value={n} onChange={e=>setN(e.target.value)} className="w-full h-20 bg-white/[0.03] border border-white/5 rounded-[28px] px-8 pt-6 text-lg font-[1000] focus:border-accent/40 outline-none transition-all" />
                </div>
                <button onClick={() => updateProfile(auth.currentUser, { displayName: n })} className="w-full h-20 bg-white text-black font-[1000] uppercase tracking-[0.5em] rounded-[28px] active:scale-95 transition-all shadow-2xl flex items-center justify-center gap-4">Commit Profile <ChevronRight size={24} /></button>
             </div>
          </div>
       </Card>

       <Card className="p-12 bg-white/[0.02] border border-white/[0.03] rounded-[56px] space-y-10 shadow-2xl">
          <div className="space-y-10">
             <div className="px-2">
                <h3 className="text-[10px] font-black uppercase tracking-[0.8em] text-white/30 mb-2">Interface Schematics</h3>
                <span className="text-3xl font-[1000] tracking-tighter uppercase">Accent Spectrum</span>
             </div>
             <div className="grid grid-cols-3 gap-6">
                {ACCENTS.map(x => (
                   <button key={x.v} onClick={() => setLa(x.v)} className={cn("h-16 rounded-[24px] border-2 transition-all duration-500 relative flex items-center justify-center", la === x.v ? "border-white scale-105 shadow-2xl" : "border-white/[0.05] opacity-40 hover:opacity-100")} style={{ backgroundColor: x.v }}>
                      {la === x.v && <Check size={24} className="text-white drop-shadow-md" strokeWidth={4} />}
                   </button>
                ))}
             </div>
             <button onClick={applyTheme} className="w-full h-20 bg-accent text-black font-[1000] uppercase tracking-[0.5em] rounded-[28px] active:scale-95 transition-all flex items-center justify-center gap-4 shadow-2xl"><Zap size={22} fill="currentColor" /> Apply Scheme</button>
          </div>
       </Card>

       <Card className="p-12 bg-white/[0.02] border border-white/[0.03] rounded-[56px] space-y-10 shadow-2xl">
          <div className="flex items-center justify-between px-2">
             <div className="space-y-2">
                <h3 className="text-[10px] font-black uppercase tracking-[0.8em] text-white/30">Active Schematics</h3>
                <span className="text-3xl font-[1000] tracking-tighter uppercase">Protocols</span>
             </div>
             <button onClick={onAdd} className="p-5 bg-accent text-black rounded-[24px] hover:brightness-110 active:scale-90 transition-all shadow-2xl"><Plus size={32} strokeWidth={3} /></button>
          </div>
          <div className="space-y-6">
             {configs.sort((a,b)=>a.order-b.order).map((c, idx) => (
                <IPhoneTrackingCard
                  key={c.id}
                  config={c}
                  idx={idx}
                  total={configs.length}
                  onReo={onReo}
                  onEdit={onEditP}
                  onDelete={onDel}
                />
             ))}
          </div>
       </Card>
       <button onClick={() => signOut(auth)} className="w-full h-22 border-2 border-danger/30 text-danger font-[1000] uppercase tracking-[0.6em] rounded-[32px] hover:bg-danger/5 transition-all flex items-center justify-center gap-6 active:scale-95 shadow-2xl shadow-danger/5"><LogOut size={28} /> Terminate Sessions</button>
    </motion.div>
  );
};

const ProfileModal = ({ user, onClose }) => (
  <div className="fixed inset-0 z-[200] flex items-center justify-center p-8 bg-black/80 backdrop-blur-xl">
    <motion.div initial={{ opacity: 0, scale: 0.9, y: 50 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 50 }} className="bg-[#121318] border border-white/10 rounded-[64px] w-full max-w-[480px] p-16 relative z-10 shadow-2xl text-center space-y-10 font-inter">
      <div className="relative mx-auto w-32 h-32 rounded-[44px] bg-accent/10 border-2 border-accent/40 overflow-hidden flex items-center justify-center shadow-2xl">
         {user.photoURL ? <img src={user.photoURL} alt="u" className="w-full h-full object-cover" /> : <User size={56} className="text-accent" />}
      </div>
      <div>
         <h4 className="text-4xl font-[1000] uppercase tracking-tighter leading-none">{user.displayName || 'Registry User'}</h4>
         <p className="text-white/20 text-sm font-black tracking-[0.4em] uppercase mt-4">{user.email}</p>
      </div>
      <button onClick={onClose} className="w-full h-20 bg-white text-black font-[1000] uppercase tracking-[0.5em] rounded-[28px] shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3">Dismiss <ChevronRight size={24} /></button>
    </motion.div>
  </div>
);

const EditOverlay = ({ log, configs, onClose, user }) => {
  const [c, setC] = useState({ ...(log.counts || {}) });
  const handle = async () => {
     await setDoc(doc(db, 'users', user.uid, 'logs', log.logDate), { counts: c, logDate: log.logDate }, { merge: true });
     onClose();
  };
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-8 bg-black/80 backdrop-blur-xl font-inter">
       <div className="bg-[#121318] border border-white/10 rounded-[64px] w-full max-w-[560px] p-16 space-y-12 shadow-2xl">
          <div className="flex justify-between items-center"><h3 className="text-3xl font-[1000] uppercase tracking-tighter">Override Daily Log</h3><button onClick={onClose} className="p-4 bg-white/5 rounded-full hover:bg-white/10 transition-all"><X size={32} /></button></div>
          <div className="bg-white/[0.03] p-8 rounded-[32px] text-center border border-white/5 shadow-inner"><span className="text-sm font-black uppercase tracking-[0.6em] text-accent animate-pulse">{new Date(log.logDate).toLocaleDateString(undefined, { dateStyle: 'full' }).toUpperCase()}</span></div>
          <div className="space-y-10 max-h-[450px] overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-accent/30">
             {configs.map(x => (
                <div key={x.id} className="relative group">
                  <span className="absolute left-6 top-1 text-[10px] font-black text-accent uppercase tracking-widest">{x.name} Units</span>
                  <input type="number" value={c[x.id] || 0} onChange={e=>setC({...c, [x.id]: parseInt(e.target.value) || 0})} className="w-full h-20 bg-white/[0.03] border border-white/5 rounded-[28px] px-8 pt-6 text-2xl font-[1000] focus:border-accent/40 outline-none transition-all" />
                </div>
             ))}
          </div>
          <button onClick={handle} className="w-full h-22 bg-accent text-black font-[1000] uppercase tracking-[0.6em] rounded-[32px] shadow-2xl active:scale-95 transition-all">Commit Override</button>
       </div>
    </div>
  );
};

const InsightCard = ({ icon: Icon, label, val, sub, color }) => (
  <Card className="p-12 bg-white/[0.02] border border-white/[0.03] flex flex-col items-center text-center shadow-2xl rounded-[56px] group hover:border-accent/20 transition-all duration-700">
     <div className={cn("p-6 rounded-[28px] bg-white/[0.03] mb-8 shadow-inner border border-white/5 group-hover:scale-110 transition-transform duration-700", color)}><Icon size={40} /></div>
     <span className="text-6xl font-[1000] tracking-tighter tabular-nums mb-3 font-inter group-hover:text-white transition-colors">{val}</span>
     <span className="text-[12px] font-black text-white/20 uppercase tracking-[0.5em] font-inter group-hover:text-white/40">{sub}</span>
     <div className="mt-10 pt-10 border-t border-white/[0.05] w-full text-[11px] font-black uppercase tracking-[0.8em] text-accent opacity-20 font-inter group-hover:opacity-40">{label}</div>
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
    <div className="min-h-screen bg-[#020202] flex items-center justify-center p-8 text-white font-inter relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-accent/5 rounded-full blur-[120px] animate-pulse" />
      <div className="w-full max-w-[450px] space-y-16 relative z-10">
        <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', damping: 20 }} className="flex flex-col items-center text-center">
          <div className="w-24 h-24 bg-accent rounded-[36px] flex items-center justify-center mb-10 shadow-[0_0_80px_rgba(0,210,255,0.4)] text-black"><Zap size={48} fill="currentColor" /></div>
          <h1 className="text-7xl font-[1000] tracking-tighter uppercase leading-none drop-shadow-2xl">TABAK<span className="text-accent">++</span></h1>
        </motion.div>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white/[0.02] border border-white/[0.05] p-12 rounded-[56px] space-y-10 shadow-2xl backdrop-blur-xl">
          <div className="space-y-8">
            {err && <div className="p-6 bg-danger/10 border border-danger/20 rounded-[24px] text-danger text-[11px] font-[1000] text-center uppercase tracking-widest">{err}</div>}
            {!isL && (
              <div className="relative group">
                <span className="absolute left-6 top-1 text-[10px] font-black text-accent uppercase tracking-widest opacity-40">Identity</span>
                <input value={n} onChange={e=>setN(e.target.value)} className="w-full h-18 bg-white/[0.03] border border-white/5 rounded-[24px] px-6 pt-5 text-sm font-bold focus:border-accent/40 outline-none transition-all" placeholder="Registry Name" />
              </div>
            )}
            <div className="relative group">
              <span className="absolute left-6 top-1 text-[10px] font-black text-accent uppercase tracking-widest opacity-40">Link</span>
              <input value={e} onChange={e=>setE(e.target.value)} className="w-full h-18 bg-white/[0.03] border border-white/5 rounded-[24px] px-6 pt-5 text-sm font-bold focus:border-accent/40 outline-none transition-all" placeholder="Email Address" />
            </div>
            <div className="relative group">
              <span className="absolute left-6 top-1 text-[10px] font-black text-accent uppercase tracking-widest opacity-40">Passkey</span>
              <input type="password" value={p} onChange={e=>setP(e.target.value)} className="w-full h-18 bg-white/[0.03] border border-white/5 rounded-[24px] px-6 pt-5 text-sm font-bold focus:border-accent/40 outline-none transition-all" placeholder="••••••••" />
            </div>
            <button className="w-full h-20 bg-accent text-black font-[1000] uppercase tracking-[0.5em] rounded-[28px] active:scale-95 transition-all shadow-[0_20px_60px_rgba(0,210,255,0.4)] flex items-center justify-center" onClick={handle} disabled={loading}>{loading ? <Loader2 className="animate-spin" /> : (isL ? 'Sync Registry' : 'Join Registry')}</button>
          </div>
          <button onClick={() => setIsL(!isL)} className="w-full text-[11px] font-[1000] text-white/20 uppercase tracking-[0.4em] hover:text-accent transition-all text-center">{isL ? "Request Access Entry" : "Return to Log In"}</button>
        </motion.div>
      </div>
    </div>
  );
};

const ErrorView = ({ msg }) => <div className="min-h-screen bg-[#020202] flex flex-col items-center justify-center p-12 text-center text-white font-inter"><AlertCircle className="text-danger mb-12" size={120} strokeWidth={2} /><h2 className="text-5xl font-[1000] uppercase tracking-tighter leading-none mb-8">Sync Failure</h2><p className="text-white/20 text-sm max-w-sm font-bold opacity-60 leading-relaxed uppercase tracking-widest mb-16">{msg}</p><button onClick={() => window.location.reload()} className="rounded-[32px] font-[1000] uppercase tracking-[0.6em] px-20 h-24 bg-white text-black shadow-2xl active:scale-95 transition-all">Re-Link System</button></div>;
const LoadingView = () => <div className="min-h-screen bg-[#020202] flex flex-col items-center justify-center space-y-12 text-accent font-inter"><Loader2 className="animate-spin" size={100} strokeWidth={3} /><span className="text-sm font-black tracking-[1.5em] uppercase text-accent animate-pulse ml-[1.2em]">Synchronizing Registry</span></div>;

export default AppWrapper;
