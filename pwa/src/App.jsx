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

// --- FIREBASE & SERVICES ---
import { auth, db, storage } from './firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, updateProfile } from 'firebase/auth';
import { doc, setDoc, deleteDoc, updateDoc, onSnapshot } from 'firebase/firestore';

// --- CONTEXT & HOOKS ---
import { AuthProvider, useAuth } from './context/AuthContext';
import { useRegistry } from './hooks/useRegistry';

// --- UI UTILS & COMMONS ---
import { SmokingCalculator } from './utils/smokingCalculator';
import { cn } from './utils/utils';
import { Card, Button, Input, StaggeredItem } from './components/Common';

// --- GLOBAL CONSTANTS ---
const APP_VERSION = "21.1.0-WIDGET-SCALES";

const hexToRgb = (hex) => {
  try {
    const h = hex || '#00d2ff';
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(h);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '0, 210, 255';
  } catch { return '0, 210, 255'; }
};

const ACCENTS = [
  { n: 'Cyan', v: '#00d2ff' }, { n: 'Lime', v: '#D4FF5C' }, { n: 'Emerald', v: '#4ADE80' },
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
          <h2 className="text-3xl font-[1000] uppercase tracking-tighter leading-none mb-4">Registry Fault</h2>
          <p className="text-white/40 text-sm mb-10 max-w-md font-bold leading-relaxed">{this.state.error?.toString() || "Logic sync error."}</p>
          <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="px-10 h-18 rounded-full bg-white text-black font-black uppercase tracking-widest active:scale-95 transition-all shadow-2xl">Reset Environment</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- CORE UI COMPONENTS ---

const LoadingView = () => (
  <div className="min-h-screen w-full bg-[#020202] flex flex-col items-center justify-center space-y-12 text-accent font-inter font-black">
    <Loader2 className="animate-spin" size={100} strokeWidth={3} />
    <span className="text-sm font-black tracking-[1.5em] uppercase text-accent animate-pulse ml-[1.2em]">Synchronizing Registry</span>
  </div>
);

const ErrorView = ({ msg }) => (
  <div className="min-h-screen w-full bg-[#020202] flex flex-col items-center justify-center p-12 text-center text-white font-inter">
    <AlertCircle className="text-danger mb-12" size={120} strokeWidth={2} />
    <h2 className="text-5xl font-[1000] uppercase tracking-tighter leading-none mb-8 font-inter">Sync Failure</h2>
    <p className="text-white/20 text-sm max-w-sm font-bold opacity-60 leading-relaxed uppercase tracking-widest mb-16 font-inter">{msg}</p>
    <button onClick={() => window.location.reload()} className="rounded-[32px] font-[1000] uppercase tracking-[0.6em] px-20 h-24 bg-white text-black shadow-2xl active:scale-95 transition-all font-inter font-black">Re-Link System</button>
  </div>
);

const SmokingProgress = React.memo(({ count, limit, variant, size = 'LARGE' }) => {
  const isL = count >= limit; const tobaccoPct = Math.max(0, 1 - (count / limit)); const isJoint = variant === 'KING' || variant === 'QUEEN';
  const isSmall = size === 'SMALL';
  return (
    <div className={cn(
      "relative rounded-full overflow-hidden border-2 transition-all duration-1000 flex items-center shadow-2xl",
      isSmall ? "h-8" : "h-11",
      variant === 'KING' ? "w-64" : (variant === 'QUEEN' ? "w-48" : (isSmall ? "w-40" : "w-56")),
      isL ? "bg-danger border-danger shadow-[0_0_50px_rgba(255,0,0,0.6)]" : "bg-white/[0.03] border-white/10"
    )}>
      {!isL && ( <div className={cn("absolute h-full transition-all duration-1000 ease-out", isJoint ? "bg-gradient-to-r from-white/80 to-white" : "bg-white shadow-[0_0_20px_white]")} style={{ width: `${tobaccoPct * 72}%`, right: '28%' }} /> )}
      {!isL && count > 0 && ( <div className="absolute h-full w-3 bg-danger shadow-[0_0_25px_red] z-20 transition-all duration-1000 ease-out" style={{ right: `calc(28% + ${tobaccoPct * 72}% - 1.5px)` }} /> )}
      <div className={cn("absolute right-0 h-full w-[28%] border-l-2 transition-all duration-1000", isL ? "bg-danger border-white/20" : (isJoint ? "bg-[#2a2a2e] border-white/5" : "bg-[#f59e0b] border-black/20"))} />
    </div>
  );
});

const RingProgress = React.memo(({ count, limit, size = 'LARGE' }) => {
  const isL = count >= limit; const progress = Math.min(1, count / limit);
  const isSmall = size === 'SMALL';
  return (
    <div className={cn("relative flex items-center justify-center shadow-2xl rounded-full", isSmall ? "w-24 h-24" : "w-32 h-32")}>
      <svg className="absolute inset-0 w-full h-full -rotate-90 overflow-visible p-2" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-white/[0.03]" />
        <motion.circle cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="10" fill="transparent" strokeDasharray="264" initial={{ strokeDashoffset: 264 }} animate={{ strokeDashoffset: 264 - (progress * 264) }} className={cn("transition-colors duration-1000", isL ? "text-danger" : "text-accent")} strokeLinecap="round" />
      </svg>
      <HeartPulse size={isSmall ? 18 : 24} className={cn("transition-all duration-1000", isL ? "text-danger scale-125" : "text-accent animate-pulse")} />
    </div>
  );
});

const GenericBarProgress = React.memo(({ count, limit, size = 'LARGE' }) => {
  const isL = count >= limit; const progress = Math.min(1, count / limit);
  const isSmall = size === 'SMALL';
  return (
    <div className={cn("h-11 rounded-full overflow-hidden border-2 p-1.5 transition-all duration-1000 shadow-2xl", isSmall ? "w-40" : "w-56", isL ? "bg-danger/20 border-danger" : "bg-white/[0.03] border-white/10")}>
      <div className={cn("h-full rounded-full transition-all duration-1000", isL ? "bg-danger shadow-[0_0_30px_red]" : "bg-accent shadow-[0_0_20px_var(--accent)]")} style={{ width: `${progress * 100}%` }} />
    </div>
  );
});

/**
 * <TrackerCard />
 * REFACTORED: Supports SMALL, MEDIUM, and LARGE widget sizes.
 * Perfectly centered content with dynamic typography and heights.
 */
const TrackerCard = React.memo(({ config, count, onInc, onDec, index }) => {
  const isL = count >= config.limit;
  const size = config.size || 'LARGE';

  const isSmall = size === 'SMALL';
  const isMedium = size === 'MEDIUM';
  const isLarge = size === 'LARGE';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05, type: 'spring', damping: 15 }}
      className={cn(
        "bg-white/[0.02] rounded-[56px] border-2 flex flex-col items-center justify-between transition-all duration-700 group relative overflow-hidden shadow-2xl font-inter",
        isLarge ? "min-h-[520px] p-10" : (isMedium ? "min-h-[380px] p-8" : "min-h-[260px] p-6"),
        isL ? "border-danger/30 shadow-[0_0_60px_rgba(248,113,113,0.1)]" : "border-white/[0.03] hover:border-accent/20"
      )}
    >
      {!isSmall && <span className="text-[10px] font-black text-white/20 tracking-[0.6em] uppercase relative z-10">Target: {config.limit}</span>}

      <div className="flex-1 w-full flex flex-col items-center justify-center relative z-10 space-y-8">
        <div className={cn("w-full flex justify-center items-center", isSmall ? "h-16" : "h-24")}>
          {config.type === 'CIGARETTE' && <SmokingProgress count={count} limit={config.limit} variant="CIGARETTE" size={size} />}
          {config.type === 'SIMPLE' && <RingProgress count={count} limit={config.limit} size={size} />}
          {config.type === 'JOINT_KING' && <SmokingProgress count={count} limit={config.limit} variant="KING" size={size} />}
          {config.type === 'JOINT_QUEEN' && <SmokingProgress count={count} limit={config.limit} variant="QUEEN" size={size} />}
          {(!['CIGARETTE', 'SIMPLE', 'JOINT_KING', 'JOINT_QUEEN'].includes(config.type)) && <GenericBarProgress count={count} limit={config.limit} size={size} />}
        </div>

        <div className="flex flex-col items-center text-center">
          <div className="flex items-center gap-3">
            <motion.span
              key={count}
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={cn(
                "font-[1000] tracking-tighter tabular-nums transition-all duration-700 leading-none",
                isLarge ? "text-7xl" : (isMedium ? "text-5xl" : "text-4xl"),
                isL ? "text-danger drop-shadow-[0_0_30px_rgba(248,113,113,0.4)]" : "text-white"
              )}
            >
              {count}
            </motion.span>
          </div>
          <span className={cn(
            "font-black tracking-[0.8em] uppercase transition-all duration-700",
            isSmall ? "text-[8px] mt-2" : "text-[12px] mt-5",
            isL ? "text-danger" : "text-accent opacity-30 group-hover:opacity-60"
          )}>
            {config.name}
          </span>
        </div>
      </div>

      <div className={cn("w-full flex justify-between items-center relative z-10 px-2 font-inter", isSmall ? "mt-4" : "mt-8")}>
        <button onClick={onDec} className={cn("rounded-full bg-white/[0.08] border border-white/10 flex items-center justify-center text-white/30 hover:text-white active:scale-90 transition-all shadow-xl backdrop-blur-md", isSmall ? "w-11 h-11" : "w-16 h-16")}>
          <Minus size={isSmall ? 20 : 28} strokeWidth={3} />
        </button>
        <button onClick={onInc} className={cn(
          "rounded-full flex items-center justify-center text-black active:scale-90 transition-all backdrop-blur-md",
          isSmall ? "w-11 h-11" : "w-16 h-16",
          isL ? "bg-danger shadow-[0_0_50px_rgba(248,113,113,0.6)]" : "bg-accent shadow-[0_20px_50px_var(--accent-rgb)]"
        )} style={{'--accent-rgb': 'rgba(0,210,255,0.4)'}}>
          <Plus size={isSmall ? 20 : 28} strokeWidth={4} />
        </button>
      </div>
    </motion.div>
  );
});

// --- SUB-COMPONENTS ---

const TopBanner = React.memo(({ user, onNavigate }) => {
  const [isOpen, setIsOpen] = useState(false); const dropdownRef = useRef(null);
  useEffect(() => { const handleClickOutside = (event) => { if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsOpen(false); }; if (isOpen) document.addEventListener('mousedown', handleClickOutside); return () => document.removeEventListener('mousedown', handleClickOutside); }, [isOpen]);
  const handleLogout = async () => { setIsOpen(false); if (window.confirm("Terminate this session?")) await signOut(auth); };
  return (
    <header className="sticky top-0 z-[100] w-full backdrop-blur-md bg-black/70 border-b border-white/[0.03]" style={{ paddingTop: 'max(env(safe-area-inset-top), 1rem)', paddingBottom: '1.25rem' }}>
      <div className="max-w-7xl mx-auto flex justify-between items-center px-6">
        <div className="flex flex-col text-left"><div className="flex items-center gap-2.5"><div className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse shadow-[0_0_12px_var(--accent)]" /><h1 className="text-2xl font-[1000] tracking-tighter uppercase leading-none font-inter font-black">TABAK<span className="text-accent">++</span></h1></div><span className="text-[10px] font-black text-white/30 tracking-[0.4em] uppercase ml-4.5 mt-1.5 opacity-60 font-inter">Registry Portal</span></div>
        <div className="relative" ref={dropdownRef}>
          <button onClick={() => setIsOpen(!isOpen)} className="group relative w-11 h-11 rounded-[18px] bg-accent/5 border border-accent/20 flex items-center justify-center text-accent active:scale-90 transition-all shadow-2xl overflow-hidden"><User size={20} strokeWidth={3} /><div className="absolute inset-0 bg-accent/10 opacity-0 group-hover:opacity-100 transition-opacity" /></button>
          <AnimatePresence>{isOpen && ( <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="absolute right-0 mt-4 w-56 bg-[#121316] border border-white/[0.05] rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-3xl p-3 overflow-hidden font-inter z-[110]"><div className="px-4 py-3 border-b border-white/[0.03] mb-2"><span className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] block">Active identity</span><span className="text-sm font-bold text-white truncate block mt-1">{user?.displayName || 'Registry User'}</span></div><button onClick={() => { onNavigate('control'); setIsOpen(false); }} className="w-full flex items-center gap-4 px-4 py-3.5 rounded-[16px] text-white/60 hover:text-white hover:bg-white/[0.03] transition-all group text-left font-black uppercase tracking-widest text-[10px]"><Settings size={18} /> Settings</button><button onClick={handleLogout} className="w-full flex items-center gap-4 px-4 py-3.5 rounded-[16px] text-rose-500/60 hover:text-rose-500 hover:bg-rose-500/5 transition-all text-left font-black uppercase tracking-widest text-[10px]"><LogOut size={18} /> Log Out</button></motion.div> )}</AnimatePresence>
        </div>
      </div>
    </header>
  );
});

const MetricBanner = React.memo(({ m }) => (
  <section className="bg-white/[0.02] rounded-[48px] p-10 border border-white/[0.03] relative overflow-hidden group shadow-2xl font-inter">
    <div className="absolute top-0 right-0 w-80 h-80 bg-accent/5 rounded-full blur-[100px] -mr-40 -mt-40 group-hover:bg-accent/10 transition-all" />
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 relative z-10">
      <div className="space-y-3 text-left">
        <h3 className="text-[11px] font-[1000] text-white/20 tracking-[0.6em] uppercase">Remaining Units</h3>
        <div className="flex items-baseline gap-4">
          <span className="text-7xl font-[1000] tracking-tighter tabular-nums leading-none">{Math.max(0, (m.limit || 0) - (m.count || 0))}</span>
          <span className="text-sm font-black text-accent uppercase tracking-[0.4em] leading-none animate-pulse">Left</span>
        </div>
      </div>
      <div className="flex flex-col md:items-end gap-3">
        <div className="flex items-center gap-4">
          <div className="px-5 py-2 rounded-[16px] bg-accent/10 border border-accent/20 text-accent text-[11px] font-[1000] tracking-[0.3em] uppercase shadow-2xl whitespace-nowrap">{m.rank || '...'}</div>
          <span className="text-3xl font-[1000] text-white/20 tracking-tighter tabular-nums">{m.xp || 0} <span className="text-sm font-bold opacity-50 uppercase tracking-widest">XP</span></span>
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
        <button onClick={() => onReo(config.id, 'up')} disabled={idx === 0} className="text-white/20 hover:text-accent disabled:opacity-0 transition-all p-1 active:scale-75"><ArrowUp size={22} strokeWidth={3} /></button>
        <button onClick={() => onReo(config.id, 'down')} disabled={idx === total - 1} className="text-white/20 hover:text-accent disabled:opacity-0 transition-all p-1 active:scale-75"><ArrowDown size={22} strokeWidth={3} /></button>
      </div>
      <div className="w-14 h-14 md:w-16 md:h-16 bg-white/[0.03] border border-white/5 rounded-[18px] flex items-center justify-center text-accent/60 group-hover:text-accent transition-all shrink-0 shadow-inner">
        {config.type.startsWith('JOINT') ? <Crown size={28} /> : (config.type === 'SIMPLE' ? <Activity size={28} /> : <Zap size={28} />)}
      </div>
      <div className="flex flex-col gap-0.5 min-w-0 flex-1 overflow-hidden">
        <span className="text-xl md:text-2xl font-[900] tracking-tight uppercase group-hover:text-white transition-colors truncate font-inter leading-tight">{config.name}</span>
        <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] font-inter opacity-40 truncate">Target: {config.limit} • {config.size || 'LARGE'}</span>
      </div>
    </div>
    <div className="flex flex-row items-center gap-4 shrink-0 ml-2">
      <button onClick={() => onEdit(config)} className="w-11 h-11 rounded-[14px] bg-white/[0.1] border border-white/[0.05] flex items-center justify-center text-white/40 hover:text-accent active:scale-90 shadow-md transition-all"><Edit2 size={18} /></button>
      <button onClick={onDel} className="w-11 h-11 rounded-[14px] bg-white/[0.1] border border-white/[0.05] flex items-center justify-center text-white/40 hover:text-danger active:scale-90 shadow-md transition-all"><Trash2 size={18} /></button>
    </div>
  </div>
));

const InsightCard = React.memo(({ icon: Icon, label, val, sub, color }) => (
  <Card className="p-12 bg-white/[0.02] border border-white/[0.03] flex flex-col items-center justify-center text-center shadow-2xl rounded-[56px] group hover:border-accent/20 transition-all duration-700 min-h-[320px]">
     <div className={cn("p-6 rounded-[28px] bg-white/[0.03] mb-8 shadow-inner border border-white/5 group-hover:scale-110 transition-transform duration-700", color)}><Icon size={44} /></div>
     <span className="text-6xl md:text-7xl font-[1000] tracking-tighter tabular-nums mb-3 font-inter group-hover:text-white transition-colors leading-none">{val}</span>
     <span className="text-sm font-black text-white/20 uppercase tracking-[0.5em] font-inter group-hover:text-white/40">{sub}</span>
     <div className="mt-10 pt-10 border-t border-white/[0.05] w-full text-[11px] font-[1000] uppercase tracking-[0.8em] text-accent opacity-20 font-inter group-hover:opacity-40">{label}</div>
  </Card>
));

const NavBtn = React.memo(({ id, icon: Icon, label, active, onClick }) => (
  <button onClick={onClick} className="relative flex-1 py-3 flex flex-col items-center gap-1.5 group transition-all duration-500 font-inter">
    <div className={cn("absolute -top-3 w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_12px_var(--accent)] transition-all duration-500", active ? "opacity-100 scale-100" : "opacity-0 scale-0")} />
    <Icon size={24} className={cn("transition-all duration-500", active ? "text-accent scale-110 drop-shadow-[0_0_100px_var(--accent-rgb)]" : "text-white/20 group-hover:text-white/40")} style={{'--accent-rgb': 'rgba(0,210,255,0.4)'}} strokeWidth={active ? 3 : 2} />
    <span className={cn("text-[9px] font-black uppercase tracking-[0.3em] transition-all duration-500 font-inter", active ? "text-white opacity-100" : "text-white/20 opacity-0 group-hover:opacity-40 translate-y-2 group-hover:translate-y-0 font-inter")}>{label}</span>
  </button>
));

const HistoryScreen = React.memo(({ logs, m, onEdit, userId, today }) => {
  const onDelete = async (logDate) => { if (window.confirm("Delete record?")) try { await deleteDoc(doc(db, 'users', userId, 'logs', logDate)); } catch (e) { alert(e.message); } };
  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-12 font-inter">
       <Card className="p-12 bg-white/[0.02] border border-white/[0.03] rounded-[48px] shadow-2xl"><div className="flex justify-between items-start mb-12 text-left font-inter"><div className="space-y-2 text-left font-inter"><h3 className="text-[10px] font-black text-white/30 tracking-[0.8em] uppercase">Visual Stream</h3><span className="text-3xl font-[1000] tracking-tighter uppercase font-inter">Registry Logs</span></div><div className="p-4 bg-accent/10 rounded-[20px] text-accent"><BarChart3 size={32} strokeWidth={2.5} /></div></div><div className="h-72 w-full"><ResponsiveContainer width="100%" height="100%"><LineChart data={logs.slice(0, 7).reverse().map(l => ({ name: new Date(l.logDate).toLocaleDateString(undefined, {weekday:'short'}).toUpperCase(), val: Object.values(l.counts || {}).reduce((a,b)=>a+b, 0) }))}><CartesianGrid strokeDasharray="8 8" stroke="#ffffff03" vertical={false} /><XAxis dataKey="name" stroke="#6b7280" fontSize={10} axisLine={false} tickLine={false} tick={{fontWeight:900}} dy={15} /><Tooltip contentStyle={{ background: '#121316', border: 'none', borderRadius: '24px', fontSize: '12px' }} /><Line type="monotone" dataKey="val" stroke="var(--accent)" strokeWidth={8} dot={{ r: 8, fill: 'var(--accent)', strokeWidth: 5, stroke: '#0a0a0c' }} animationDuration={2000} /></LineChart></ResponsiveContainer></div></Card>
       <div className="grid grid-cols-1 md:grid-cols-3 gap-8"><InsightCard icon={TrendingUp} label="Streak" val={m.streak} sub="Days Active" color="text-amber-400" /><InsightCard icon={Wallet} label="Retained" val={`$${(m.savings || 0).toFixed(2)}`} sub="Capital Saved" color="text-emerald-400" /><InsightCard icon={Activity} label="Impact" val={`${Math.floor((m.lost || 0)/60)}H`} sub="Time Restored" color="text-rose-400" /></div>
       <div className="space-y-8 pt-12 text-left font-inter"><h4 className="text-[10px] font-black text-white/20 tracking-[1em] uppercase px-4 text-left font-inter">Timeline Feed</h4>{logs.map((log, i) => ( <StaggeredItem key={log.logDate} index={i}><div className="bg-white/[0.02] p-10 rounded-[48px] border border-white/[0.03] flex items-center justify-between group hover:border-accent/20 transition-all shadow-2xl font-inter"><div className="flex flex-col gap-3 text-left font-inter"><span className="text-2xl font-[1000] tracking-tighter uppercase leading-none">{log.logDate === today ? 'Today' : new Date(log.logDate).toLocaleDateString(undefined, {month:'short', day:'numeric', weekday:'long'})}</span><span className="text-[11px] font-black text-white/30 uppercase tracking-[0.4em] flex items-center gap-3">{Object.values(log.counts || {}).reduce((a,b)=>a+b, 0)} units registered</span></div><div className="flex items-center gap-4"><button onClick={() => onEdit(log)} className="p-5 rounded-[22px] bg-white/[0.03] border border-white/[0.05] hover:text-accent transition-all shadow-xl font-inter"><Edit2 size={24} /></button><button onClick={() => onDelete(log.logDate)} className="p-5 rounded-[22px] bg-white/[0.03] border border-white/[0.05] hover:text-danger transition-all shadow-xl font-inter"><Trash2 size={24} /></button></div></div></StaggeredItem> ))}</div>
    </motion.div>
  );
});

// --- ARCHITECTURAL CORE ---

const AppContent = () => {
  const { user, loading: authLoading } = useAuth();
  const [settings, setSettings] = useState({ accent: '#00d2ff' });
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);
  const registry = useRegistry(user, today);
  const { configs, logs, metrics, loading: registryLoading, error: registryError, increment, decrement, reorder, addProtocol, updateProtocol, deleteProtocol } = registry || { configs: [], logs: [], metrics: {}, loading: true, error: null };
  const [activeTab, setActiveTab] = useState('track'); const [showAdd, setShowAdd] = useState(false); const [editTarget, setEditTarget] = useState(null); const [editProtocol, setEditProtocol] = useState(null);

  useEffect(() => { if (!user) return; return onSnapshot(doc(db, 'users', user.uid), (s) => { if (s.exists()) { const d = s.data(); setSettings(p => ({ ...p, accent: d.accent || '#00d2ff' })); } }); }, [user]);
  const onUpdateSettings = useCallback(async (upd) => { if (!user) return; try { await updateDoc(doc(db, 'users', user.uid), upd); } catch (e) { console.error(e); } }, [user]);

  const handleAddProtocol = async (data) => { try { await addProtocol(data); setShowAdd(false); } catch (e) { alert(e.message); } };
  const handleUpdateProtocol = async (data) => { try { await updateProtocol(editProtocol.id, data); setEditProtocol(null); } catch (e) { alert(e.message); } };

  if (registryError) return <ErrorView msg={registryError} />;
  if (authLoading || registryLoading) return <LoadingView />;
  if (!user) return <AuthScreen accent={settings.accent} />;

  return (
    <div className="min-h-screen w-full bg-[#020202] text-white font-inter selection:bg-accent/30 overflow-x-hidden flex flex-col" style={{ '--accent': settings.accent, '--accent-rgb': hexToRgb(settings.accent) }}>
      <TopBanner user={user} onNavigate={setActiveTab} />
      <main className="flex-1 overflow-y-auto pt-10 pb-[calc(env(safe-area-inset-bottom)+12rem)] px-5 max-w-7xl mx-auto w-full transition-all duration-500 overflow-x-hidden font-inter">
        <AnimatePresence mode="wait">
          {activeTab === 'track' && (
            <motion.div key="track" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }} className="space-y-10">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
                 {configs.sort((a,b)=>a.order-b.order).map((c, i) => (
                   <TrackerCard key={c.id} config={c} count={(metrics.todayLog?.counts || {})[c.id] || 0} onInc={() => increment(c.id)} onDec={() => decrement(c.id)} index={i} />
                 ))}
              </div>
              <MetricBanner m={metrics} />
            </motion.div>
          )}
          {activeTab === 'history' && <HistoryScreen logs={logs} m={metrics} onEdit={setEditTarget} userId={user.uid} today={today} />}
          {activeTab === 'control' && <SettingsScreen configs={configs} user={user} settings={settings} onAdd={() => setShowAdd(true)} onReo={reorder} onEditP={setEditProtocol} onUpd={onUpdateSettings} onDel={deleteProtocol} />}
        </AnimatePresence>
      </main>
      <nav className="fixed bottom-0 left-0 right-0 z-[100] bg-[#020202]/80 backdrop-blur-3xl border-t border-white/[0.03] pb-[env(safe-area-inset-bottom)] px-6"><div className="max-w-xl mx-auto flex items-center justify-around h-20"><NavBtn id="track" icon={LayoutGrid} label="Track" active={activeTab === 'track'} onClick={() => setActiveTab('track')} /><NavBtn id="history" icon={BarChart3} label="History" active={activeTab === 'history'} onClick={() => setActiveTab('history')} /><NavBtn id="control" icon={Settings} label="Control" active={activeTab === 'control'} onClick={() => setActiveTab('control')} /></div></nav>
      <AnimatePresence>
        {showAdd && <ProtocolFormOverlay isOpen={showAdd} onClose={() => setShowAdd(false)} onApply={handleAddProtocol} title="New Protocol" />}
        {editProtocol && <ProtocolFormOverlay isOpen={!!editProtocol} onClose={() => setEditProtocol(null)} onApply={handleUpdateProtocol} title="Modify Protocol" initialData={editProtocol} />}
        {editTarget && <EditOverlay log={editTarget} configs={configs} onClose={() => setEditTarget(null)} user={user} />}
      </AnimatePresence>
    </div>
  );
};

// --- SETTINGS (VIEW) ---

const SettingsScreen = ({ configs, user, settings, onAdd, onReo, onEditP, onUpd, onDel }) => {
  const [n, setN] = useState(user?.displayName || ''); const [la, setLa] = useState(settings.accent);
  const handleThemeApply = () => { onUpd({ accent: la }); };
  return (
    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-12 max-w-3xl mx-auto font-inter text-left">
       <Card className="p-12 bg-white/[0.02] border border-white/[0.03] rounded-[56px] shadow-2xl font-inter"><div className="flex flex-col items-center gap-10">
          <div className="w-40 h-40 rounded-[48px] bg-accent/5 border-2 border-accent/20 flex items-center justify-center overflow-hidden shadow-2xl"><User size={64} className="text-accent" strokeWidth={3} /></div>
          <div className="w-full space-y-10"><Input label="Identity Label" value={n} onChange={setN} isDark /><button onClick={() => updateProfile(auth.currentUser, { displayName: n })} className="w-full h-20 bg-white text-black font-[1000] uppercase tracking-[0.5em] rounded-[28px] active:scale-95 transition-all">Commit Profile</button></div>
       </div></Card>
       <Card className="p-12 bg-white/[0.02] border border-white/[0.03] rounded-[56px] shadow-2xl font-inter">
          <div className="space-y-10">
             <div className="px-2 text-left font-inter"><h3 className="text-[10px] font-black uppercase tracking-[0.8em] text-white/30 mb-2">Interface Schematics</h3><span className="text-3xl font-[1000] tracking-tighter uppercase">Accent Spectrum</span></div>
             <div className="grid grid-cols-3 gap-6">
                {ACCENTS.map(x => (
                   <button key={x.v} onClick={() => setLa(x.v)} className={cn("h-16 rounded-[24px] border-2 transition-all duration-500 relative flex items-center justify-center", la === x.v ? "border-white scale-105 shadow-2xl" : "border-white/[0.05] opacity-40 hover:opacity-100")} style={{ backgroundColor: x.v }}>
                      {la === x.v && <Check size={24} className="text-white drop-shadow-md" strokeWidth={4} />}
                   </button>
                ))}
             </div>
             <button onClick={handleThemeApply} className="w-full h-20 bg-white/[0.1] border border-white/5 text-white font-[1000] uppercase tracking-[0.5em] rounded-[28px] active:scale-95 transition-all shadow-xl hover:bg-white/[0.15]">Apply Scheme</button>
          </div>
       </Card>
       <Card className="p-12 bg-white/[0.02] border border-white/[0.03] rounded-[56px] shadow-2xl font-inter"><div className="flex items-center justify-between px-2 font-inter"><div className="space-y-2 text-left font-inter"><h3 className="text-[10px] font-black uppercase tracking-[0.8em] text-white/30">Active Schematics</h3><span className="text-3xl font-[1000] tracking-tighter uppercase font-inter">Protocols</span></div><button onClick={onAdd} className="p-5 bg-accent text-black rounded-[24px] shadow-2xl active:scale-90 transition-all"><Plus size={32} /></button></div><div className="space-y-6">{configs.sort((a,b)=>a.order-b.order).map((c, idx) => ( <ProtocolListItem key={c.id} config={c} idx={idx} total={configs.length} onReo={onReo} onEdit={onEditP} onDel={() => onDel(c.id)} /> ))}</div></Card>
    </motion.div>
  );
};

const AuthScreen = ({ accent }) => {
  const [isL, setIsL] = useState(true); const [e, setE] = useState(''); const [p, setP] = useState(''); const [n, setN] = useState(''); const [loading, setLoading] = useState(false); const [err, setErr] = useState('');
  const handle = async () => { setLoading(true); setErr(''); try { if (isL) { await signInWithEmailAndPassword(auth, e, p); } else { const c = await createUserWithEmailAndPassword(auth, e, p); await updateProfile(c.user, { displayName: n }); await setDoc(doc(db, 'users', c.user.uid), { name: n, accent: '#00d2ff', isDark: true }); } } catch (e) { setErr(e.message); } finally { setLoading(false); } };
  return (
    <div className="min-h-screen bg-[#020202] flex items-center justify-center p-8 text-white font-inter relative overflow-hidden font-inter">
      <div className="w-full max-w-[450px] space-y-16 relative z-10"><div className="flex flex-col items-center text-center"><Zap size={48} className="text-accent mb-10" /><h1 className="text-7xl font-[1000] tracking-tighter uppercase font-inter">TABAK<span className="text-accent">++</span></h1></div><div className="bg-white/[0.02] border border-white/[0.05] p-12 rounded-[56px] space-y-10 shadow-2xl">
          <div className="space-y-8">{err && <div className="p-6 bg-danger/10 text-danger text-center">{err}</div>}<Input label="Link" value={e} onChange={setE} isDark /><Input label="Passkey" type="password" value={p} onChange={setP} isDark /><button className="w-full h-20 bg-accent text-black font-black uppercase tracking-[0.5em] rounded-[28px]" onClick={handle}>{loading ? <Loader2 className="animate-spin" /> : (isL ? 'Sync Registry' : 'Join Registry')}</button></div><button onClick={() => setIsL(!isL)} className="w-full text-center opacity-40 uppercase text-[10px] tracking-widest font-black">{isL ? "Request Access Entry" : "Return to Log In"}</button>
      </div></div>
    </div>
  );
};

const ProtocolFormOverlay = ({ isOpen, onClose, onApply, title, initialData = null }) => {
  const [n, setN] = useState(initialData?.name || ''); const [l, setL] = useState(initialData?.limit || '20'); const [t, setT] = useState(initialData?.type || 'CIGARETTE');
  const [s, setS] = useState(initialData?.size || 'LARGE');
  return (
    <IPhoneModifyModal isOpen={isOpen} onClose={onClose} title={title} actionLabel={initialData ? "Apply Modification" : "Authorize logic"} onAction={() => onApply({ name: n, limit: parseInt(l) || 20, type: t, size: s })}>
      <div className="space-y-10 text-left"><Input label="Descriptor" value={n} onChange={setN} isDark /><Input label="Threshold" type="number" value={l} onChange={setL} isDark />
        <div className="space-y-5"><span className="text-[10px] font-black uppercase tracking-[0.8em] text-white/20">Widget Scale</span><div className="grid grid-cols-3 gap-4">
          {['SMALL', 'MEDIUM', 'LARGE'].map(x => ( <button key={x} onClick={() => setS(x)} className={cn("h-14 rounded-[20px] border-2 font-black text-[10px] uppercase transition-all", s === x ? "border-accent bg-accent/10 text-accent" : "border-white/5 opacity-40")}>{x}</button> ))}
        </div></div>
        <div className="space-y-5"><span className="text-[10px] font-black uppercase tracking-[0.8em] text-white/20">Visual Schematic</span><div className="grid grid-cols-2 gap-5">{['CIGARETTE', 'SIMPLE', 'JOINT_KING', 'JOINT_QUEEN'].map(x => ( <button key={x} onClick={() => setT(x)} className={cn("h-18 rounded-[32px] border-2 font-black text-[10px] md:text-[12px] uppercase", t === x ? "border-accent bg-accent/10 text-accent" : "border-white/5 opacity-40")}>{x.replace('_',' ')}</button> ))}</div></div>
      </div>
    </IPhoneModifyModal>
  );
};

// --- APP WRAPPER EXPORT ---

const App = () => (
  <GlobalErrorBoundary>
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  </GlobalErrorBoundary>
);

export default App;
