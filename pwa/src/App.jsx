import React, { useState, useMemo, useEffect, Component, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutGrid, BarChart3, Settings, User, Plus, Minus,
  Activity, Zap, ShieldCheck, HeartPulse, Flame, X,
  LogOut, Camera, Calendar, RefreshCcw, Loader2, AlertCircle,
  TrendingUp, Wallet, Clock, Grid, Moon, Sparkles, Check, Edit2, Trash2, Crown,
  ArrowUp, ArrowDown, ChevronRight, Apple, Github, Key, Mail, Fingerprint,
  Layout, Maximize, Minimize, Grid2X2, Columns2, Square, Lock, UserPlus, LogIn
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

// --- FIREBASE & SERVICES ---
import { auth, db } from './firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, deleteDoc, updateDoc, onSnapshot } from 'firebase/firestore';

// --- CONTEXT & HOOKS ---
import { AuthProvider, useAuth } from './context/AuthContext';
import { useRegistry } from './hooks/useRegistry';

// --- UI UTILS & COMMONS ---
import { SmokingCalculator } from './utils/smokingCalculator';
import { cn } from './utils/utils';
import { Card, Button, Input, StaggeredItem } from './components/Common';

// --- GLOBAL CONSTANTS ---
const APP_VERSION = "28.2.0-CONTRAST-HARDENED";

const hexToRgb = (hex) => {
  try {
    const h = hex || '#00d2ff';
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(h);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '0, 210, 255';
  } catch { return '0, 210, 255'; }
};

const ACCENTS = [
  { n: 'Cyan', v: '#00d2ff' }, { n: 'Lime', v: '#D4FF32' }, { n: 'Emerald', v: '#4ADE80' },
  { n: 'Violet', v: '#A78BFA' }, { n: 'Amber', v: '#FBBF24' }, { n: 'Rose', v: '#FB7185' }
];

// --- ERROR BOUNDARY ---
class GlobalErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error("FATAL_APP_CRASH:", error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-[#020202] flex flex-col items-center justify-center p-12 text-center text-white font-inter">
          <div className="p-8 bg-danger/10 rounded-[32px] text-danger border border-danger/20 shadow-2xl mb-8"><AlertCircle size={48} /></div>
          <h2 className="text-3xl font-[1000] uppercase tracking-tighter leading-none mb-4 font-inter">System Error</h2>
          <p className="text-white/60 text-sm mb-10 max-w-md font-bold leading-relaxed">{this.state.error?.toString() || "Sync failed."}</p>
          <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="px-10 h-18 rounded-full bg-white text-black font-black uppercase tracking-widest active:scale-95 transition-all shadow-2xl">Reset System</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- VISUAL COMPONENTS ---

const LoadingView = () => (
  <div className="min-h-screen w-full bg-[#020202] flex flex-col items-center justify-center space-y-12 text-accent font-inter font-black">
    <Loader2 className="animate-spin" size={100} strokeWidth={3} />
    <span className="text-sm font-black tracking-[1.5em] uppercase text-accent animate-pulse ml-[1.2em]">Synchronizing</span>
  </div>
);

const ErrorView = ({ msg }) => (
  <div className="min-h-screen w-full bg-[#020202] flex flex-col items-center justify-center p-12 text-center text-white font-inter">
    <AlertCircle className="text-danger mb-12" size={120} strokeWidth={2} />
    <h2 className="text-5xl font-[1000] uppercase tracking-tighter leading-none mb-8 font-inter">Sync Failure</h2>
    <p className="text-white/60 text-sm max-w-sm font-bold opacity-60 leading-relaxed uppercase tracking-widest mb-16 font-inter">{msg}</p>
    <button onClick={() => window.location.reload()} className="rounded-[32px] font-[1000] uppercase tracking-[0.6em] px-20 h-24 bg-white text-black shadow-2xl active:scale-95 transition-all font-inter font-black">Try Again</button>
  </div>
);

const SmokingProgress = React.memo(({ count, limit, variant, size = 'LARGE' }) => {
  const isL = count >= limit; const tobaccoPct = Math.max(0, 1 - (count / limit)); const isJoint = variant === 'KING' || variant === 'QUEEN';
  const isSmall = size === 'SMALL'; const isMedium = size === 'MEDIUM';
  return (
    <div className={cn("relative rounded-full overflow-hidden border-2 transition-all duration-1000 flex items-center shadow-2xl", isSmall ? "h-8 w-40" : (isMedium ? "h-9 w-48" : "h-11 w-56"), variant === 'KING' && "w-64", variant === 'QUEEN' && "w-52", isL ? "bg-danger border-danger shadow-[0_0_50px_rgba(255,0,0,0.6)]" : "bg-white/[0.03] border-white/10")}>
      {!isL && ( <div className={cn("absolute h-full transition-all duration-1000 ease-out", isJoint ? "bg-gradient-to-r from-white/80 to-white" : "bg-white shadow-[0_0_20px_white]")} style={{ width: `${tobaccoPct * 72}%`, right: '28%' }} /> )}
      {!isL && count > 0 && ( <div className="absolute h-full w-3 bg-danger shadow-[0_0_25px_red] z-20 transition-all duration-1000 ease-out" style={{ right: `calc(28% + ${tobaccoPct * 72}% - 1.5px)` }} /> )}
      <div className={cn("absolute right-0 h-full w-[28%] border-l-2 transition-all duration-1000", isL ? "bg-danger border-white/20" : (isJoint ? "bg-[#2a2a2e] border-white/5" : "bg-[#f59e0b] border-black/20"))} />
    </div>
  );
});

const RingProgress = React.memo(({ count, limit, size = 'LARGE' }) => {
  const isL = count >= limit; const progress = Math.min(1, count / limit);
  const isSmall = size === 'SMALL'; const isMedium = size === 'MEDIUM';
  return (
    <div className={cn("relative flex items-center justify-center shadow-2xl rounded-full transition-all duration-500", isSmall ? "w-20 h-20" : (isMedium ? "w-24 h-24" : "w-32 h-32"))}>
      <svg className="absolute inset-0 w-full h-full -rotate-90 overflow-visible p-1.5" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-white/[0.03]" />
        <motion.circle cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="10" fill="transparent" strokeDasharray="264" initial={{ strokeDashoffset: 264 }} animate={{ strokeDashoffset: 264 - (progress * 264) }} className={cn("transition-colors duration-1000", isL ? "text-danger" : "text-accent")} strokeLinecap="round" />
      </svg>
      <HeartPulse size={isSmall ? 16 : (isMedium ? 20 : 24)} className={cn("transition-all duration-1000", isL ? "text-danger scale-110" : "text-accent animate-pulse")} />
    </div>
  );
});

const GenericBarProgress = React.memo(({ count, limit, size = 'LARGE' }) => {
  const isL = count >= limit; const progress = Math.min(1, count / limit);
  const isSmall = size === 'SMALL'; const isMedium = size === 'MEDIUM';
  return (
    <div className={cn("rounded-full overflow-hidden border-2 p-1.5 transition-all duration-1000 shadow-2xl", isSmall ? "h-9 w-40" : (isMedium ? "h-10 w-48" : "h-11 w-56"), isL ? "bg-danger/20 border-danger" : "bg-white/[0.03] border-white/10")}>
      <div className={cn("h-full rounded-full transition-all duration-1000", isL ? "bg-danger shadow-[0_0_30px_red]" : "bg-accent shadow-[0_0_20px_var(--accent)]")} style={{ width: `${progress * 100}%` }} />
    </div>
  );
});

const TrackerCard = React.memo(({ config, count, onInc, onDec, index, globalSize = 'LARGE' }) => {
  const isL = count >= config.limit;
  const isSmall = globalSize === 'SMALL'; const isMedium = globalSize === 'MEDIUM'; const isLarge = globalSize === 'LARGE';
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * 0.05, type: 'spring', damping: 15 }} className={cn("bg-white/[0.02] rounded-[56px] border-2 flex flex-col items-center justify-between transition-all duration-700 group relative overflow-hidden shadow-2xl font-inter", isLarge ? "min-h-[520px] p-10" : (isMedium ? "min-h-[420px] p-9" : "min-h-[260px] p-6"), isL ? "border-danger/30 shadow-[0_0_60px_rgba(248,113,113,0.1)]" : "border-white/[0.03] hover:border-accent/20")}>
      {/* LEGIBILITY OVERHAUL: Set opacity to 70% for secondary labels */}
      {!isSmall && <span className={cn("font-black text-white/70 tracking-[0.4em] uppercase relative z-10 truncate w-full text-center shrink-0", isLarge ? "text-[11px]" : "text-[10px]")}>Limit: {config.limit}</span>}
      <div className={cn("flex-1 w-full flex flex-col items-center justify-center relative z-10 min-h-0", isSmall ? "space-y-4" : "space-y-8")}>
        <div className={cn("w-full flex justify-center items-center shrink-0", isSmall ? "h-20" : (isMedium ? "h-28" : "h-32"))}>
          {config.type === 'CIGARETTE' && <SmokingProgress count={count} limit={config.limit} variant="CIGARETTE" size={globalSize} />}
          {config.type === 'SIMPLE' && <RingProgress count={count} limit={config.limit} size={globalSize} />}
          {config.type === 'JOINT_KING' && <SmokingProgress count={count} limit={config.limit} variant="KING" size={globalSize} />}
          {config.type === 'JOINT_QUEEN' && <SmokingProgress count={count} limit={config.limit} variant="QUEEN" size={globalSize} />}
          {(!['CIGARETTE', 'SIMPLE', 'JOINT_KING', 'JOINT_QUEEN'].includes(config.type)) && <GenericBarProgress count={count} limit={config.limit} size={globalSize} />}
        </div>
        <div className="flex flex-col items-center text-center min-w-0 w-full px-2">
          <motion.span key={count} initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={cn("font-[1000] tracking-tighter tabular-nums transition-all duration-700 leading-none shrink-0", isLarge ? "text-7xl" : (isMedium ? "text-6xl" : "text-4xl"), isL ? "text-danger drop-shadow-[0_0_30px_rgba(248,113,113,0.4)]" : "text-white")}>{count}</motion.span>
          <span className={cn("font-black tracking-[0.4em] uppercase transition-all duration-700 truncate w-full shrink-0", isSmall ? "text-[10px] mt-2" : "text-[13px] mt-4", isL ? "text-danger" : "text-accent opacity-70 group-hover:opacity-100")}>{config.name}</span>
        </div>
      </div>
      <div className={cn("w-full flex justify-between items-center relative z-10 px-2 shrink-0", isSmall ? "mt-2 pb-1" : "mt-8 pb-2")}>
        <button onClick={onDec} className={cn("rounded-full bg-white/[0.08] border border-white/10 flex items-center justify-center text-white/50 hover:text-white active:scale-90 transition-all shadow-xl backdrop-blur-md", isSmall ? "w-10 h-10" : "w-16 h-16")}><Minus size={isSmall ? 20 : 28} strokeWidth={3} /></button>
        <button onClick={onInc} className={cn("rounded-full flex items-center justify-center text-zinc-950 active:scale-90 transition-all backdrop-blur-md", isSmall ? "w-10 h-10" : "w-16 h-16", isL ? "bg-danger shadow-[0_0_50px_rgba(248,113,113,0.6)]" : "bg-accent shadow-[0_20px_50px_var(--accent-rgb)]")} style={{'--accent-rgb': 'rgba(0,210,255,0.4)'}}><Plus size={isSmall ? 20 : 28} strokeWidth={4} /></button>
      </div>
    </motion.div>
  );
});

// --- SUB-COMPONENTS ---

const HeaderSizeControl = React.memo(({ value, onChange }) => {
  const options = [ { id: 'SMALL', icon: Grid2X2 }, { id: 'MEDIUM', icon: Columns2 }, { id: 'LARGE', icon: Square } ];
  return (
    <div className="relative bg-white/[0.03] border border-white/[0.05] p-0.5 rounded-[18px] flex items-center shadow-inner overflow-hidden">
      {options.map((opt) => (
        <button key={opt.id} onClick={() => onChange({ widgetSize: opt.id })} className={cn("relative p-2.5 transition-all duration-500 z-10 rounded-[14px] flex items-center justify-center w-9 h-9", value === opt.id ? "text-zinc-950" : "text-white/60 hover:text-white/90")}>
          <opt.icon size={16} strokeWidth={3} />
        </button>
      ))}
      <motion.div className="absolute h-[calc(100%-4px)] bg-accent rounded-[14px] shadow-[0_0_15px_var(--accent-rgb)]" initial={false} animate={{ width: 36, x: value === 'SMALL' ? 2 : (value === 'MEDIUM' ? 38 : 74) }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} />
    </div>
  );
});

const TopBanner = React.memo(({ user, onNavigate, widgetSize, onUpdateSettings }) => {
  const [isOpen, setIsOpen] = useState(false); const dropdownRef = useRef(null);
  useEffect(() => { const handleClickOutside = (event) => { if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsOpen(false); }; if (isOpen) document.addEventListener('mousedown', handleClickOutside); return () => document.removeEventListener('mousedown', handleClickOutside); }, [isOpen]);
  const handleLogout = async () => { setIsOpen(false); if (window.confirm("Log out?")) await signOut(auth); };
  return (
    <header className="sticky top-0 z-[100] w-full backdrop-blur-md bg-black/70 border-b border-white/[0.03]" style={{ paddingTop: 'max(env(safe-area-inset-top), 1rem)', paddingBottom: '1.25rem' }}>
      <div className="max-w-7xl mx-auto flex justify-between items-center px-6 font-inter">
        <div className="flex flex-col text-left font-inter"><div className="flex items-center gap-2.5"><div className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse shadow-[0_0_12px_var(--accent)]" /><h1 className="text-2xl font-[1000] tracking-tighter uppercase leading-none font-black font-inter whitespace-nowrap flex items-center">TABAK<span className="text-accent">++</span></h1></div><span className="text-[11px] font-black text-white/60 tracking-[0.4em] uppercase ml-4.5 mt-1.5 font-inter">Dashboard</span></div>
        <div className="flex items-center gap-6">
          <HeaderSizeControl value={widgetSize} onChange={onUpdateSettings} />
          <div className="relative" ref={dropdownRef}>
            <button onClick={() => setIsOpen(!isOpen)} className="group relative w-11 h-11 rounded-[18px] bg-accent/5 border border-accent/20 flex items-center justify-center text-accent active:scale-90 transition-all shadow-2xl overflow-hidden">
              <User size={20} strokeWidth={3} /><div className="absolute inset-0 bg-accent/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
            <AnimatePresence>{isOpen && ( <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="absolute right-0 mt-4 w-56 bg-[#121316] border border-white/[0.05] rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-3xl p-3 overflow-hidden font-inter z-[110]"><div className="px-4 py-3 border-b border-white/[0.03] mb-2 font-inter"><span className="text-[10px] font-black text-white/60 uppercase tracking-[0.3em] block">Account</span><span className="text-sm font-bold text-white truncate block mt-1">{user?.displayName || 'User'}</span></div><button onClick={() => { onNavigate('control'); setIsOpen(false); }} className="w-full flex items-center gap-4 px-4 py-3.5 rounded-[16px] text-white/70 hover:text-white hover:bg-white/[0.03] transition-all group text-left font-black uppercase tracking-widest text-[10px] font-inter"><Settings size={18} /> Settings</button><button onClick={handleLogout} className="w-full flex items-center gap-4 px-4 py-3.5 rounded-[16px] text-rose-500/70 hover:text-rose-500 hover:bg-rose-500/5 transition-all text-left font-black uppercase tracking-widest text-[10px] font-inter"><LogOut size={18} /> Log Out</button></motion.div> )}</AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
});

const MetricBanner = React.memo(({ m }) => (
  <section className="bg-white/[0.02] rounded-[48px] p-10 border border-white/[0.03] relative overflow-hidden group shadow-2xl font-inter">
    <div className="absolute top-0 right-0 w-80 h-80 bg-accent/5 rounded-full blur-[100px] -mr-40 -mt-40 group-hover:bg-accent/10 transition-all" />
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 relative z-10 font-inter">
      <div className="space-y-3 text-left">
        <h3 className="text-[11px] font-[1000] text-white/70 tracking-[0.6em] uppercase">Daily Allowance</h3>
        <div className="flex items-baseline gap-4">
          <span className="text-7xl font-[1000] tracking-tighter tabular-nums leading-none">{Math.max(0, (m.limit || 0) - (m.count || 0))}</span>
          <span className="text-sm font-black text-accent uppercase tracking-[0.4em] animate-pulse">Left</span>
        </div>
      </div>
      <div className="flex flex-col md:items-end gap-3 font-inter">
        <div className="flex items-center gap-4">
          <div className="px-5 py-2 rounded-[16px] bg-accent/10 border border-accent/20 text-accent text-[11px] font-[1000] tracking-[0.3em] uppercase shadow-2xl whitespace-nowrap font-inter">{m.rank || '...'}</div>
          <span className="text-3xl font-[1000] text-white/70 tracking-tighter tabular-nums font-inter">{m.xp || 0} <span className="text-sm font-bold opacity-70 uppercase tracking-widest font-inter">XP</span></span>
        </div>
      </div>
    </div>
    <div className="mt-12 w-full h-2 bg-white/[0.03] rounded-full overflow-hidden p-0.5 border border-white/[0.05] shadow-inner">
      <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(1, m.progress || 0) * 100}%` }} transition={{ duration: 1.5, type: 'spring' }} className={cn("h-full rounded-full transition-all duration-700", (m.progress || 0) >= 1 ? "bg-danger shadow-[0_0_20px_rgba(248,113,113,0.8)]" : "bg-accent shadow-[0_0_20px_var(--accent)]")} />
    </div>
  </section>
));

const ProtocolListItem = React.memo(({ config, idx, total, onReo, onEdit, onDel }) => (
  <div className="flex flex-row justify-between items-center w-full p-6 md:p-8 bg-[#121316] rounded-[32px] border border-white/[0.05] group hover:border-accent/30 transition-all duration-500 shadow-xl overflow-hidden min-h-[100px] gap-6 font-inter">
    <div className="flex flex-row items-center gap-6 min-w-0 flex-1 text-left overflow-hidden">
      <div className="flex flex-col gap-2 shrink-0 items-center justify-center py-2">
        <button onClick={() => onReo(config.id, 'up')} disabled={idx === 0} className="text-white/60 hover:text-accent disabled:opacity-0 transition-all p-1 active:scale-75"><ArrowUp size={22} strokeWidth={3} /></button>
        <button onClick={() => onReo(config.id, 'down')} disabled={idx === total - 1} className="text-white/60 hover:text-accent disabled:opacity-0 transition-all p-1 active:scale-75"><ArrowDown size={22} strokeWidth={3} /></button>
      </div>
      <div className="w-14 h-14 md:w-16 md:h-16 bg-white/[0.03] border border-white/5 rounded-[18px] flex items-center justify-center text-accent/60 group-hover:text-accent transition-all shrink-0 shadow-inner">
        {config.type.startsWith('JOINT') ? <Crown size={28} /> : (config.type === 'SIMPLE' ? <Activity size={28} /> : <Zap size={28} />)}
      </div>
      <div className="flex flex-col gap-0.5 min-w-0 flex-1 overflow-hidden">
        <span className="text-xl md:text-2xl font-[900] tracking-tight uppercase group-hover:text-white transition-colors truncate leading-tight font-inter">{config.name}</span>
        <span className="text-[11px] font-black text-white/60 uppercase tracking-[0.3em] font-inter opacity-80 truncate font-inter">Limit: {config.limit}</span>
      </div>
    </div>
    <div className="flex flex-row items-center gap-4 shrink-0 ml-2">
      <button onClick={() => onEdit(config)} className="w-11 h-11 rounded-[14px] bg-white/[0.1] border border-white/[0.05] flex items-center justify-center text-white/60 hover:text-accent active:scale-90 shadow-md transition-all"><Edit2 size={18} /></button>
      <button onClick={onDel} className="w-11 h-11 rounded-[14px] bg-white/[0.1] border border-white/[0.05] flex items-center justify-center text-white/60 hover:text-danger active:scale-90 shadow-md transition-all"><Trash2 size={18} /></button>
    </div>
  </div>
));

/**
 * <InsightCard />
 * REFACTORED: Significantly increased text contrast and font weights.
 * Unit labels like "DAYS" and footer labels like "STREAK" are now 100% readable.
 */
const InsightCard = React.memo(({ icon: Icon, label, val, sub, color }) => (
  <Card className="p-6 lg:p-8 bg-white/[0.02] border border-white/[0.03] flex flex-col items-center justify-center text-center shadow-2xl rounded-[40px] group hover:border-accent/20 transition-all duration-700 min-h-[220px] lg:min-h-[240px] font-inter">
     <div className={cn("p-3 rounded-[16px] bg-white/[0.05] mb-4 shadow-inner border border-white/10 group-hover:scale-110 transition-transform duration-700", color)}><Icon size={24} /></div>
     <span className="text-4xl lg:text-5xl font-[1000] tracking-tighter tabular-nums mb-1 font-inter group-hover:text-white transition-colors leading-none">{val}</span>
     <span className="text-[11px] font-black text-white/80 uppercase tracking-[0.3em] font-inter group-hover:text-white">{sub}</span>
     <div className="mt-6 pt-6 border-t border-white/[0.1] w-full text-[10px] font-[1000] uppercase tracking-[0.8em] text-accent opacity-70 font-inter group-hover:opacity-100">{label}</div>
  </Card>
));

const NavBtn = React.memo(({ id, icon: Icon, label, active, onClick }) => (
  <button onClick={onClick} className="relative flex-1 py-3 flex flex-col items-center gap-1.5 group transition-all duration-500 font-inter">
    <div className={cn("absolute -top-3 w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_12px_var(--accent)] transition-all duration-500", active ? "opacity-100 scale-100" : "opacity-0 scale-0")} />
    <Icon size={24} className={cn("transition-all duration-500", active ? "text-accent scale-110 drop-shadow-[0_0_100px_var(--accent-rgb)]" : "text-white/60 group-hover:text-white/90")} style={{'--accent-rgb': 'rgba(0,210,255,0.4)'}} strokeWidth={active ? 3 : 2} />
    <span className={cn("text-[9px] font-black uppercase tracking-[0.3em] transition-all duration-500 font-inter", active ? "text-white opacity-100" : "text-white/60 opacity-0 group-hover:opacity-90 translate-y-2 group-hover:translate-y-0 font-inter")}>{label}</span>
  </button>
));

const HistoryScreen = React.memo(({ logs, m, onEdit, userId, today }) => {
  const onDelete = async (logDate) => { if (window.confirm("Purge record?")) try { await deleteDoc(doc(db, 'users', userId, 'logs', logDate)); } catch (e) { alert(e.message); } };
  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-12 font-inter">
       <Card className="p-12 bg-white/[0.02] border border-white/[0.03] rounded-[48px] shadow-2xl font-inter"><div className="flex justify-between items-start mb-12 text-left font-inter"><div className="space-y-2 text-left font-inter"><h3 className="text-[10px] font-black text-white/60 tracking-[0.8em] uppercase font-inter">History</h3><span className="text-3xl font-[1000] tracking-tighter uppercase font-inter font-black">Daily Logs</span></div><div className="p-4 bg-accent/10 rounded-[20px] text-accent"><BarChart3 size={32} strokeWidth={2.5} /></div></div><div className="h-72 w-full"><ResponsiveContainer width="100%" height="100%"><LineChart data={logs.slice(0, 7).reverse().map(l => ({ name: new Date(l.logDate).toLocaleDateString(undefined, {weekday:'short'}).toUpperCase(), val: Object.values(l.counts || {}).reduce((a,b)=>a+b, 0) }))}><CartesianGrid strokeDasharray="8 8" stroke="#ffffff03" vertical={false} /><XAxis dataKey="name" stroke="#6b7280" fontSize={10} axisLine={false} tickLine={false} tick={{fontWeight:900}} dy={15} /><Tooltip contentStyle={{ background: '#121316', border: 'none', borderRadius: '24px', fontSize: '12px' }} /><Line type="monotone" dataKey="val" stroke="var(--accent)" strokeWidth={8} dot={{ r: 8, fill: 'var(--accent)', strokeWidth: 5, stroke: '#0a0a0c' }} animationDuration={2000} /></LineChart></ResponsiveContainer></div></Card>
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
         <InsightCard icon={TrendingUp} label="Streak" val={m.streak} sub="Days" color="text-amber-400" />
         <InsightCard icon={Wallet} label="Saved" val={`$${(m.savings || 0).toFixed(2)}`} sub="Capital" color="text-emerald-400" />
         <InsightCard icon={Activity} label="Health" val={`${Math.floor((m.lost || 0)/60)}H`} sub="Recovered" color="text-rose-400" />
       </div>
       <div className="space-y-8 pt-12 text-left font-inter"><h4 className="text-[10px] font-black text-white/50 tracking-[1em] uppercase px-4 text-left font-inter">Recent Feed</h4>{logs.map((log, i) => ( <StaggeredItem key={log.logDate} index={i}><div className="bg-white/[0.02] p-10 rounded-[48px] border border-white/[0.03] flex items-center justify-between group hover:border-accent/20 transition-all shadow-2xl font-inter"><div className="flex flex-col gap-3 text-left font-inter"><span className="text-2xl font-[1000] tracking-tighter uppercase leading-none font-inter">{log.logDate === today ? 'Today' : new Date(log.logDate).toLocaleDateString(undefined, {month:'short', day:'numeric', weekday:'long'})}</span><span className="text-[11px] font-black text-white/60 uppercase tracking-[0.4em] flex items-center gap-3 font-inter">{Object.values(log.counts || {}).reduce((a,b)=>a+b, 0) } units</span></div><div className="flex items-center gap-4"><button onClick={() => onEdit(log)} className="p-5 rounded-[22px] bg-white/[0.03] border border-white/[0.05] hover:text-accent transition-all shadow-xl font-inter"><Edit2 size={24} /></button><button onClick={() => onDelete(log.logDate)} className="p-5 rounded-[22px] bg-white/[0.03] border border-white/[0.05] hover:text-danger transition-all shadow-xl font-inter"><Trash2 size={24} /></button></div></div></StaggeredItem> ))}</div>
    </motion.div>
  );
});

// --- AUTH EXPERIENCE ---

const BurningCigarette = () => (
  <div className="relative flex flex-col items-center justify-center pointer-events-none select-none">
     <div className="relative w-[300px] md:w-[480px] h-10 md:h-12 rounded-full border-2 border-white/5 bg-black/20 flex items-center shadow-2xl overflow-hidden backdrop-blur-sm">
        <div className="absolute h-full bg-gradient-to-r from-zinc-400 via-white to-zinc-100" style={{ width: '72%', right: '28%' }} />
        <div className="absolute right-0 h-full w-[28%] border-l-2 bg-gradient-to-b from-[#f59e0b] via-[#ea580c] to-[#d97706] border-black/20" />
        <motion.div animate={{ x: [-1, 1, -1] }} transition={{ duration: 0.2, repeat: Infinity }} className="absolute h-full w-2.5 bg-gradient-to-r from-orange-600 via-red-600 to-orange-500 shadow-[0_0_40px_red] z-20" style={{ right: 'calc(28% + 72% - 1.5px)' }} />
     </div>
     <motion.div animate={{ opacity: [0.2, 0.5, 0.2] }} transition={{ duration: 3, repeat: Infinity }} className="absolute w-[500px] h-[250px] bg-orange-600/10 rounded-full blur-[100px]" />
     <div className="absolute -top-[400px] left-0">
        {[...Array(8)].map((_, i) => ( <motion.div key={i} initial={{ y: 300, opacity: 0, scale: 0.5 }} animate={{ y: -200, opacity: [0, 0.2, 0], scale: [0.5, 4, 6], x: [0, 50, -50, 20] }} transition={{ duration: 6, repeat: Infinity, delay: i * 0.9 }} className="absolute w-32 h-32 bg-white/[0.02] rounded-full blur-[80px]" /> ))}
     </div>
  </div>
);

const AuthScreen = ({ accent }) => {
  const [mode, setMode] = useState('LOGIN');
  const [e, setE] = useState(''); const [p, setP] = useState(''); const [n, setN] = useState('');
  const [loading, setLoading] = useState(false); const [msg, setMsg] = useState({ t: '', c: '' });

  const handle = async () => {
    setLoading(true); setMsg({ t: '', c: '' });
    try {
      if (mode === 'LOGIN') { await signInWithEmailAndPassword(auth, e, p); }
      else if (mode === 'REGISTER') {
        const c = await createUserWithEmailAndPassword(auth, e, p);
        await updateProfile(c.user, { displayName: n });
        await setDoc(doc(db, 'users', c.user.uid), { name: n, accent: '#D4FF32', isDark: true, widgetSize: 'LARGE' });
      } else {
        await sendPasswordResetEmail(auth, e);
        setMsg({ t: 'SUCCESS', c: 'Reset email sent.' });
      }
    } catch (err) { setMsg({ t: 'FAULT', c: err.message }); } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#020202] flex flex-col lg:flex-row items-stretch text-white font-inter overflow-hidden selection:bg-accent/30 relative">

      <div className="absolute top-10 left-10 lg:top-16 lg:left-16 z-[100] flex flex-col items-start font-inter pointer-events-none">
         <h1 className="text-4xl lg:text-5xl font-[1000] tracking-tighter uppercase leading-none whitespace-nowrap">TABAK<span className="text-accent">++</span></h1>
         <span className="text-[11px] font-black text-white/60 tracking-[1em] uppercase mt-4 block font-inter">Quit Control System</span>
      </div>

      <div className="hidden lg:flex flex-1 flex-col items-center justify-center bg-black relative border-r border-white/[0.03]">
         <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none" />
         <div className="flex-1 w-full flex flex-col items-center justify-center gap-0">
            <BurningCigarette />
            <div className="text-center pt-2">
               <motion.h2 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-5xl font-[1000] tracking-tighter uppercase leading-tight font-inter">EVERY SECOND <span className="text-accent">COUNTS.</span></motion.h2>
               <p className="text-white/60 text-[11px] font-black uppercase tracking-[0.6em] mt-2 font-inter">RECLAIM CONTROL OF YOUR LIFE.</p>
            </div>
         </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-8 lg:p-24 relative z-10 bg-[#020202]">
        <div className="w-full h-full flex flex-col items-center justify-center space-y-16">
          <div className="bg-white/[0.01] border border-white/[0.08] p-12 lg:p-18 rounded-[80px] space-y-12 shadow-[0_50px_150px_rgba(0,0,0,1)] backdrop-blur-3xl relative overflow-hidden font-inter w-full max-w-[500px] text-center max-h-[90vh] overflow-y-auto scrollbar-hide">
             <div className="absolute inset-0 border border-white/[0.03] rounded-[80px] pointer-events-none" />
             <div className="relative bg-black/60 border border-white/[0.05] p-1.5 rounded-full flex items-center h-18 w-full shadow-inner overflow-hidden font-inter">
                <button onClick={() => setMode('LOGIN')} className={cn("relative flex-1 h-full text-[12px] font-[1000] uppercase tracking-[0.2em] transition-all duration-500 z-20 font-inter", mode === 'LOGIN' ? "text-zinc-950" : "text-white/60")}>Sign In</button>
                <button onClick={() => setMode('REGISTER')} className={cn("relative flex-1 h-full text-[12px] font-[1000] uppercase tracking-[0.2em] transition-all duration-500 z-20 font-inter", mode === 'REGISTER' ? "text-zinc-950" : "text-white/60")}>Sign Up</button>
                <motion.div className="absolute left-1 h-[calc(100%-8px)] bg-accent rounded-full shadow-[0_15px_40px_rgba(212,255,50,0.5)]" animate={{ x: mode === 'LOGIN' ? 0 : '100%', left: mode === 'LOGIN' ? '4px' : '-4px' }} style={{ width: 'calc(50% - 4px)' }} transition={{ type: 'spring', stiffness: 450, damping: 40 }} />
             </div>

             <div className="space-y-12 relative z-10 text-center font-inter">
               {msg.c && <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className={cn("p-6 rounded-[24px] text-center font-black text-[10px] uppercase tracking-widest border", msg.t === 'FAULT' ? "bg-danger/10 text-danger border-danger/20" : "bg-accent/10 text-accent border border-accent/20")}>{msg.c}</motion.div>}
               <div className="space-y-8 flex flex-col items-center font-inter">
                 {mode === 'REGISTER' && <Input label="Full Name" value={n} onChange={setN} isDark className="w-full text-center" />}
                 <Input label="Email Address" type="email" value={e} onChange={setE} isDark className="w-full text-center" />
                 {mode !== 'RESET' && <Input label="Password" type="password" value={p} onChange={setP} isDark className="w-full text-center" />}
               </div>
               <button className="w-full h-24 bg-accent text-zinc-950 font-[1000] uppercase tracking-[0.5em] rounded-[36px] active:scale-95 transition-all shadow-[0_30px_70px_rgba(212,255,50,0.3)] flex items-center justify-center text-sm font-inter" onClick={handle}>{loading ? <Loader2 className="animate-spin" size={24} /> : (mode === 'LOGIN' ? 'Sign In' : (mode === 'REGISTER' ? 'Sign Up' : 'Reset'))}</button>
             </div>

             <div className="flex flex-col items-center gap-6 pt-4 text-center font-inter">
               {mode === 'LOGIN' && <button onClick={() => setMode('RESET')} className="text-white/60 uppercase text-[10px] font-black tracking-widest hover:text-accent transition-colors font-inter">Forgot Password?</button>}
               {mode === 'RESET' && <button onClick={() => setMode('LOGIN')} className="text-white/60 uppercase text-[10px] font-black tracking-widest hover:text-white transition-colors font-inter">Back to Sign In</button>}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- ARCHITECTURAL CORE ---

const AppContent = () => {
  const { user, loading: authLoading } = useAuth();
  const [settings, setSettings] = useState({ accent: '#D4FF32', widgetSize: 'LARGE' });
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);
  const registry = useRegistry(user, today);
  const { configs, logs, metrics, loading: registryLoading, error: registryError, increment, decrement, reorder, addProtocol, updateProtocol, deleteProtocol } = registry || { configs: [], logs: [], metrics: {}, loading: true, error: null };
  const [activeTab, setActiveTab] = useState('track'); const [showAdd, setShowAdd] = useState(false); const [editTarget, setEditTarget] = useState(null); const [editProtocol, setEditProtocol] = useState(null);

  useEffect(() => { if (!user) return; return onSnapshot(doc(db, 'users', user.uid), (s) => { if (s.exists()) { const d = s.data(); setSettings(p => ({ ...p, accent: d.accent || '#D4FF32', widgetSize: d.widgetSize || 'LARGE' })); } }); }, [user]);
  const onUpdateSettings = useCallback(async (upd) => { if (!user) return; try { await updateDoc(doc(db, 'users', user.uid), upd); } catch (e) { console.error(e); } }, [user]);
  const handleAddProtocol = async (data) => { try { await addProtocol(data); setShowAdd(false); } catch (e) { alert(e.message); } };
  const handleUpdateProtocol = async (data) => { try { await updateProtocol(editProtocol.id, data); setEditProtocol(null); } catch (e) { alert(e.message); } };

  if (authLoading) return <LoadingView />;
  if (!user) return <AuthScreen accent="#D4FF32" />;
  if (registryLoading) return <LoadingView />;
  if (registryError) return <ErrorView msg={registryError} />;

  return (
    <div className="min-h-screen w-full bg-[#020202] text-white font-inter selection:bg-accent/30 overflow-x-hidden flex flex-col font-inter" style={{ '--accent': settings.accent, '--accent-rgb': hexToRgb(settings.accent) }}>
      <TopBanner user={user} onNavigate={setActiveTab} widgetSize={settings.widgetSize} onUpdateSettings={onUpdateSettings} />
      <main className="flex-1 overflow-y-auto pt-10 pb-[calc(env(safe-area-inset-bottom)+12rem)] px-5 max-w-7xl mx-auto w-full transition-all duration-500 overflow-x-hidden font-inter">
        <AnimatePresence mode="wait">
          {activeTab === 'track' && (
            <motion.div key="track" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }} className="space-y-10 font-inter">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
                 {configs.sort((a,b)=>a.order-b.order).map((c, i) => ( <TrackerCard key={c.id} config={c} count={(metrics.todayLog?.counts || {})[c.id] || 0} onInc={() => increment(c.id)} onDec={() => decrement(c.id)} index={i} globalSize={settings.widgetSize} /> ))}
              </div>
              <MetricBanner m={metrics} />
            </motion.div>
          )}
          {activeTab === 'history' && <HistoryScreen logs={logs} m={metrics} onEdit={setEditTarget} userId={user.uid} today={today} />}
          {activeTab === 'control' && <SettingsScreen configs={configs} user={user} settings={settings} onAdd={() => setShowAdd(true)} onReo={reorder} onEditP={setEditProtocol} onUpd={onUpdateSettings} onDel={deleteProtocol} />}
        </AnimatePresence>
      </main>
      <nav className="fixed bottom-0 left-0 right-0 z-[100] bg-[#020202]/80 backdrop-blur-3xl border-t border-white/[0.03] pb-[env(safe-area-inset-bottom)] px-6 font-inter"><div className="max-w-xl mx-auto flex items-center justify-around h-20"><NavBtn id="track" icon={LayoutGrid} label="Track" active={activeTab === 'track'} onClick={() => setActiveTab('track')} /><NavBtn id="history" icon={BarChart3} label="History" active={activeTab === 'history'} onClick={() => setActiveTab('history')} /><NavBtn id="control" icon={Settings} label="Settings" active={activeTab === 'control'} onClick={() => setActiveTab('control')} /></div></nav>
      <AnimatePresence>{showAdd && <ProtocolFormOverlay isOpen={showAdd} onClose={() => setShowAdd(false)} onApply={handleAddProtocol} title="New Counter" />}{editProtocol && <ProtocolFormOverlay isOpen={!!editProtocol} onClose={() => setEditProtocol(null)} onApply={handleUpdateProtocol} title="Edit Counter" initialData={editProtocol} />}{editTarget && <EditOverlay log={editTarget} configs={configs} onClose={() => setEditTarget(null)} user={user} />}</AnimatePresence>
    </div>
  );
};

const SettingsScreen = ({ configs, user, settings, onAdd, onReo, onEditP, onUpd, onDel }) => {
  const [n, setN] = useState(user?.displayName || ''); const [la, setLa] = useState(settings.accent);
  return (
    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-12 max-w-3xl mx-auto font-inter text-left font-inter">
       <Card className="p-12 bg-white/[0.02] border border-white/[0.03] rounded-[56px] shadow-2xl font-inter"><div className="flex flex-col items-center gap-10 font-inter"><div className="w-40 h-40 rounded-[48px] bg-accent/5 border-2 border-accent/20 flex items-center justify-center overflow-hidden shadow-2xl font-inter"><User size={64} className="text-accent" strokeWidth={3} /></div><div className="w-full space-y-10 font-inter"><Input label="Display Name" value={n} onChange={setN} isDark /><button onClick={() => updateProfile(auth.currentUser, { displayName: n })} className="w-full h-20 bg-white text-zinc-950 font-black uppercase tracking-[0.5em] rounded-[28px] active:scale-95 transition-all font-inter">Update Profile</button></div></div></Card>
       <Card className="p-12 bg-white/[0.02] border border-white/[0.03] rounded-[56px] shadow-2xl font-inter">
          <div className="space-y-10 font-inter"><div className="px-2 text-left font-inter"><h3 className="text-[10px] font-black uppercase tracking-[0.8em] text-white/60 mb-2 font-inter">Appearance</h3><span className="text-3xl font-[1000] tracking-tighter uppercase font-inter font-black">Accent Spectrum</span></div><div className="grid grid-cols-3 gap-6 font-inter">{ACCENTS.map(x => ( <button key={x.v} onClick={() => setLa(x.v)} className={cn("h-16 rounded-[24px] border-2 transition-all duration-500 relative flex items-center justify-center font-inter", la === x.v ? "border-white scale-105 shadow-2xl" : "border-white/[0.05] opacity-40 hover:opacity-100")} style={{ backgroundColor: x.v }}>{la === x.v && <Check size={24} className="text-white drop-shadow-md" strokeWidth={4} />}</button> ))}</div><button onClick={() => onUpd({ accent: la })} className="w-full h-20 bg-white/[0.1] border border-white/5 text-white font-[1000] uppercase tracking-[0.5em] rounded-[28px] active:scale-95 transition-all shadow-xl hover:bg-white/[0.15] font-inter">Save Color</button></div></Card>
       <Card className="p-12 bg-white/[0.02] border border-white/[0.03] rounded-[56px] shadow-2xl font-inter">
          <div className="flex items-center justify-between gap-8 mb-10 px-2 font-inter">
             <div className="space-y-2 text-left font-inter min-w-0 flex-1">
                <h3 className="text-[10px] font-black uppercase tracking-[0.8em] text-white/60 font-inter">Management</h3>
                <span className="text-3xl font-[1000] tracking-tighter uppercase font-inter font-black block truncate">Your Counters</span>
             </div>
             <button onClick={onAdd} className="p-5 bg-accent text-zinc-950 rounded-[24px] shadow-2xl active:scale-90 transition-all font-inter shrink-0"><Plus size={32} /></button>
          </div>
          <div className="space-y-6 font-inter">{configs.sort((a,b)=>a.order-b.order).map((c, idx) => ( <ProtocolListItem key={c.id} config={c} idx={idx} total={configs.length} onReo={onReo} onEdit={onEditP} onDel={() => onDel(c.id)} /> ))}</div>
       </Card>
    </motion.div>
  );
};

// --- ROOT WRAPPER ---

const App = () => (
  <GlobalErrorBoundary>
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  </GlobalErrorBoundary>
);

export default App;
