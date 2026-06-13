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
import { doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// --- CONTEXT & HOOKS ---
import { AuthProvider, useAuth } from './context/AuthContext';
import { useRegistry } from './hooks/useRegistry';

// --- UI UTILS & COMMONS ---
import { SmokingCalculator } from './utils/smokingCalculator';
import { cn } from './utils/utils';
import { Card, Button, Input, StaggeredItem } from './components/Common';

// --- GLOBAL CONSTANTS ---
const APP_VERSION = "20.5.0-ARCH-FIX";

// --- SUB-COMPONENTS (THE VIEWS) ---

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

const InsightCard = React.memo(({ icon: Icon, label, val, sub, color }) => (
  <Card className="p-12 bg-white/[0.02] border border-white/[0.03] flex flex-col items-center text-center shadow-2xl rounded-[56px] group hover:border-accent/20 transition-all duration-700">
     <div className={cn("p-6 rounded-[28px] bg-white/[0.03] mb-8 shadow-inner border border-white/5 group-hover:scale-110 transition-transform duration-700", color)}><Icon size={40} /></div>
     <span className="text-6xl font-[1000] tracking-tighter tabular-nums mb-3 font-inter group-hover:text-white transition-colors">{val}</span>
     <span className="text-[12px] font-black text-white/20 uppercase tracking-[0.5em] font-inter group-hover:text-white/40">{sub}</span>
     <div className="mt-10 pt-10 border-t border-white/[0.05] w-full text-[11px] font-black uppercase tracking-[0.8em] text-accent opacity-20 font-inter group-hover:opacity-40">{label}</div>
  </Card>
));

const HistoryScreen = ({ logs, m, onEdit, userId, today }) => {
  const onDelete = async (logDate) => { if (window.confirm("Delete record?")) try { await deleteDoc(doc(db, 'users', userId, 'logs', logDate)); } catch (e) { alert(e.message); } };
  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-12 font-inter">
       <Card className="p-12 bg-white/[0.02] border border-white/[0.03] rounded-[48px] shadow-2xl"><div className="flex justify-between items-start mb-12 text-left font-inter"><div className="space-y-2 text-left font-inter"><h3 className="text-[10px] font-black text-white/30 tracking-[0.8em] uppercase">Visual Stream</h3><span className="text-3xl font-[1000] tracking-tighter uppercase font-inter">Registry Logs</span></div><div className="p-4 bg-accent/10 rounded-[20px] text-accent"><BarChart3 size={32} strokeWidth={2.5} /></div></div><div className="h-72 w-full"><ResponsiveContainer width="100%" height="100%"><LineChart data={logs.slice(0, 7).reverse().map(l => ({ name: new Date(l.logDate).toLocaleDateString(undefined, {weekday:'short'}).toUpperCase(), val: Object.values(l.counts || {}).reduce((a,b)=>a+b, 0) }))}><CartesianGrid strokeDasharray="8 8" stroke="#ffffff03" vertical={false} /><XAxis dataKey="name" stroke="#6b7280" fontSize={10} axisLine={false} tickLine={false} tick={{fontWeight:900}} dy={15} /><Tooltip contentStyle={{ background: '#121316', border: 'none', borderRadius: '24px', fontSize: '12px' }} /><Line type="monotone" dataKey="val" stroke="var(--accent)" strokeWidth={8} dot={{ r: 8, fill: 'var(--accent)', strokeWidth: 5, stroke: '#0a0a0c' }} animationDuration={2000} /></LineChart></ResponsiveContainer></div></Card>
       <div className="grid grid-cols-1 md:grid-cols-3 gap-8"><InsightCard icon={TrendingUp} label="Streak" val={m.streak} sub="Days Active" color="text-amber-400" /><InsightCard icon={Wallet} label="Retained" val={`$${(m.savings || 0).toFixed(2)}`} sub="Capital Saved" color="text-emerald-400" /><InsightCard icon={Activity} label="Impact" val={`${Math.floor((m.lost || 0)/60)}H`} sub="Time Restored" color="text-rose-400" /></div>
       <div className="space-y-8 pt-12 text-left font-inter"><h4 className="text-[10px] font-black text-white/20 tracking-[1em] uppercase px-4">Timeline Feed</h4>{logs.map((log, i) => ( <StaggeredItem key={log.logDate} index={i}><div className="bg-white/[0.02] p-10 rounded-[48px] border border-white/[0.03] flex items-center justify-between group hover:border-accent/20 transition-all shadow-2xl font-inter"><div className="flex flex-col gap-3 text-left font-inter"><span className="text-2xl font-[1000] tracking-tighter uppercase leading-none">{log.logDate === today ? 'Today' : new Date(log.logDate).toLocaleDateString(undefined, {month:'short', day:'numeric', weekday:'long'})}</span><span className="text-[11px] font-black text-white/30 uppercase tracking-[0.4em] flex items-center gap-3">{Object.values(log.counts || {}).reduce((a,b)=>a+b, 0)} units registered</span></div><div className="flex items-center gap-4"><button onClick={() => onEdit(log)} className="p-5 rounded-[22px] bg-white/[0.03] border border-white/[0.05] hover:text-accent transition-all shadow-xl font-inter"><Edit2 size={24} /></button><button onClick={() => onDelete(log.logDate)} className="p-5 rounded-[22px] bg-white/[0.03] border border-white/[0.05] hover:text-danger transition-all shadow-xl font-inter"><Trash2 size={24} /></button></div></div></StaggeredItem> ))}</div>
    </motion.div>
  );
};

const TopBanner = React.memo(({ user, onProfileClick }) => (
  <header className="sticky top-0 z-[100] w-full backdrop-blur-md bg-black/70 border-b border-white/[0.03]" style={{ paddingTop: 'max(env(safe-area-inset-top), 1rem)', paddingBottom: '1.25rem' }}>
    <div className="max-w-7xl mx-auto flex justify-between items-center px-6">
      <div className="flex flex-col text-left">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse shadow-[0_0_12px_var(--accent)]" />
          <h1 className="text-2xl font-[1000] tracking-tighter uppercase leading-none font-inter font-black">TABAK<span className="text-accent">++</span></h1>
        </div>
        <span className="text-[10px] font-black text-white/30 tracking-[0.4em] uppercase ml-4.5 mt-1.5 opacity-60">Registry Portal</span>
      </div>
      <button onClick={onProfileClick} className="group relative w-11 h-11 rounded-[18px] bg-white/[0.03] border border-white/[0.05] flex items-center justify-center text-white/40 hover:text-accent hover:border-accent/30 hover:bg-accent/10 active:scale-90 transition-all shadow-2xl overflow-hidden">
        {user?.photoURL ? <img src={`${user.photoURL}${user.photoURL.includes('?') ? '&' : '?'}t=${Date.now()}`} alt="u" className="w-full h-full object-cover" /> : <User size={20} />}
        <div className="absolute inset-0 bg-accent/0 group-hover:bg-accent/5 transition-colors" />
      </button>
    </div>
  </header>
));

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
          <div className="px-5 py-2 rounded-[16px] bg-accent/10 border border-accent/20 text-accent text-[11px] font-[1000] tracking-[0.3em] uppercase shadow-2xl">{m.rank || '...'}</div>
          <span className="text-3xl font-[1000] text-white/20 tracking-tighter tabular-nums">{m.xp || 0} <span className="text-sm font-bold opacity-50 uppercase tracking-widest">XP</span></span>
        </div>
      </div>
    </div>
    <div className="mt-12 w-full h-2 bg-white/[0.03] rounded-full overflow-hidden p-0.5 border border-white/[0.05] shadow-inner">
      <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(1, m.progress || 0) * 100}%` }} transition={{ duration: 1.5, type: 'spring' }} className={cn("h-full rounded-full transition-all duration-700", (m.progress || 0) >= 1 ? "bg-danger shadow-[0_0_20px_rgba(248,113,113,0.8)]" : "bg-accent shadow-[0_0_20px_var(--accent)]")} />
    </div>
  </section>
));

const TrackerCard = React.memo(({ config, count, onInc, onDec, index }) => {
  const isL = count >= (config.limit || 1);
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * 0.05, type: 'spring', damping: 15 }} className={cn("bg-white/[0.02] rounded-[56px] border-2 p-10 flex flex-col items-center justify-between min-h-[520px] transition-all duration-700 group relative overflow-hidden shadow-2xl font-inter", isL ? "border-danger/30 shadow-[0_0_60px_rgba(248,113,113,0.1)]" : "border-white/[0.03] hover:border-accent/20")}>
      <span className="text-[10px] font-black text-white/20 tracking-[0.6em] uppercase relative z-10">Target: {config.limit}</span>
      <div className="flex-1 w-full flex flex-col items-center justify-center space-y-12 relative z-10 py-10">
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-3">
            <motion.span key={count} initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={cn("text-7xl font-[1000] tracking-tighter tabular-nums transition-all duration-700 leading-none", isL ? "text-danger drop-shadow-[0_0_30px_rgba(248,113,113,0.4)]" : "text-white")}>{count}</motion.span>
          </div>
          <span className={cn("text-[12px] font-black tracking-[0.8em] uppercase transition-all duration-700 mt-5", isL ? "text-danger" : "text-accent opacity-30 group-hover:opacity-60")}>{config.name}</span>
        </div>
      </div>
      <div className="w-full flex justify-between items-center pt-8 mt-auto relative z-10 px-2 font-inter">
        <button onClick={onDec} className="w-18 h-18 rounded-[24px] bg-white/[0.04] border border-white/[0.05] flex items-center justify-center text-white/30 hover:text-white active:scale-90 transition-all shadow-xl"><Minus size={32} strokeWidth={3} /></button>
        <button onClick={onInc} className={cn("w-18 h-18 rounded-[28px] flex items-center justify-center text-black active:scale-90 transition-all shadow-[0_20px_50px_var(--accent-rgb)]", isL ? "bg-danger shadow-[0_20px_50px_rgba(248,113,113,0.6)]" : "bg-accent")} style={{'--accent-rgb': 'rgba(0,210,255,0.4)'}}><Plus size={32} strokeWidth={4} /></button>
      </div>
    </motion.div>
  );
});

const ProtocolListItem = React.memo(({ config, idx, total, onReo, onEdit, onDel }) => (
  <div className="flex flex-row justify-between items-center w-full p-6 md:p-8 bg-[#121316] rounded-[32px] border border-white/[0.05] group hover:border-accent/30 transition-all duration-500 shadow-xl overflow-hidden min-h-[100px] gap-6 font-inter">
    <div className="flex flex-row items-center gap-6 min-w-0 flex-1 text-left">
      <div className="flex flex-col gap-2 shrink-0 items-center justify-center py-2">
        <button onClick={() => onReo(config.id, 'up')} disabled={idx === 0} className="text-white/20 hover:text-accent disabled:opacity-0 transition-all p-1 active:scale-75"><ArrowUp size={22} strokeWidth={3} /></button>
        <button onClick={() => onReo(config.id, 'down')} disabled={idx === total - 1} className="text-white/20 hover:text-accent disabled:opacity-0 transition-all p-1 active:scale-75"><ArrowDown size={22} strokeWidth={3} /></button>
      </div>
      <div className="w-14 h-14 md:w-16 md:h-16 bg-white/[0.03] border border-white/5 rounded-[18px] flex items-center justify-center text-accent/60 group-hover:text-accent transition-all shrink-0 shadow-inner">
        {config.type.startsWith('JOINT') ? <Crown size={28} /> : (config.type === 'SIMPLE' ? <Activity size={28} /> : <Zap size={28} />)}
      </div>
      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        <span className="text-xl md:text-2xl font-[900] tracking-tight uppercase group-hover:text-white transition-colors truncate font-inter">{config.name}</span>
        <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] font-inter opacity-40">Target: {config.limit}</span>
      </div>
    </div>
    <div className="flex flex-row items-center gap-4 shrink-0">
      <button onClick={() => onEdit(config)} className="w-11 h-11 rounded-[14px] bg-white/[0.03] border border-white/[0.05] flex items-center justify-center text-white/30 hover:text-accent active:scale-90 shadow-md transition-all"><Edit2 size={18} /></button>
      <button onClick={onDel} className="w-11 h-11 rounded-[14px] bg-white/[0.03] border border-white/[0.05] flex items-center justify-center text-white/30 hover:text-danger active:scale-90 shadow-md transition-all"><Trash2 size={18} /></button>
    </div>
  </div>
));

const NavBtn = React.memo(({ id, icon: Icon, label, active, onClick }) => (
  <button onClick={onClick} className="relative flex-1 py-3 flex flex-col items-center gap-1.5 group transition-all duration-500 font-inter">
    <div className={cn("absolute -top-3 w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_12px_var(--accent)] transition-all duration-500", active ? "opacity-100 scale-100" : "opacity-0 scale-0")} />
    <Icon size={24} className={cn("transition-all duration-500", active ? "text-accent scale-110 drop-shadow-[0_0_100px_var(--accent-rgb)]" : "text-white/20 group-hover:text-white/40")} style={{'--accent-rgb': 'rgba(0,210,255,0.4)'}} strokeWidth={active ? 3 : 2} />
    <span className={cn("text-[9px] font-black uppercase tracking-[0.3em] transition-all duration-500 font-inter", active ? "text-white opacity-100" : "text-white/20 opacity-0 group-hover:opacity-40 translate-y-2 group-hover:translate-y-0 font-inter")}>{label}</span>
  </button>
));

// --- ARCHITECTURAL CORE (THE VIEWMODEL) ---

const AppContent = () => {
  const { user, loading: authLoading } = useAuth();
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);

  // MVVM Architectural Refactor: Decoupling Registry Logic into ViewModel
  const {
    configs, logs, metrics, loading: registryLoading, error: registryError,
    increment, decrement, reorder, addProtocol, updateProtocol, deleteProtocol
  } = useRegistry(user, today);

  const [activeTab, setActiveTab] = useState('track');
  const [showProfile, setShowProfile] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [editProtocol, setEditProtocol] = useState(null);

  if (registryError) return <ErrorView msg={registryError} />;
  if (authLoading || registryLoading) return <LoadingView />;
  if (!user) return <AuthScreen accent="#00d2ff" />;

  return (
    <div className="min-h-screen w-full bg-[#020202] text-white font-inter selection:bg-accent/30 overflow-x-hidden flex flex-col" style={{ '--accent': '#00d2ff', '--accent-rgb': hexToRgb('#00d2ff') }}>
      <TopBanner user={user} onProfileClick={() => setShowProfile(true)} />
      <main className="flex-1 overflow-y-auto pt-10 pb-[calc(env(safe-area-inset-bottom)+12rem)] px-5 max-w-7xl mx-auto w-full transition-all duration-500 overflow-x-hidden font-inter">
        <AnimatePresence mode="wait">
          {activeTab === 'track' && (
            <motion.div key="track" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }} className="space-y-10">
              <MetricBanner m={metrics} />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
                 {configs.sort((a,b)=>a.order-b.order).map((c, i) => (
                   <TrackerCard key={c.id} config={c} count={(metrics.todayLog.counts || {})[c.id] || 0} onInc={() => increment(c.id)} onDec={() => decrement(c.id)} index={i} />
                 ))}
                 <button onClick={() => setShowAdd(true)} className="bg-white/[0.01] rounded-[48px] border-2 border-dashed border-white/[0.05] flex flex-col items-center justify-center space-y-5 hover:bg-accent/5 hover:border-accent/20 transition-all min-h-[520px] group shadow-2xl font-inter"><Plus size={32} /><span className="text-[10px] font-black uppercase tracking-[0.5em]">Add Protocol</span></button>
              </div>
            </motion.div>
          )}
          {activeTab === 'history' && <HistoryScreen logs={logs} m={metrics} onEdit={setEditTarget} userId={user.uid} today={today} />}
          {activeTab === 'control' && <SettingsScreen configs={configs} user={user} settings={{accent:'#00d2ff'}} onAdd={() => setShowAdd(true)} onReo={reorder} onEditP={setEditProtocol} onUpd={()=>{}} onDel={deleteProtocol} />}
        </AnimatePresence>
      </main>
      <nav className="fixed bottom-0 left-0 right-0 z-[100] bg-[#020202]/80 backdrop-blur-3xl border-t border-white/[0.03] pb-[env(safe-area-inset-bottom)] px-6"><div className="max-w-xl mx-auto flex items-center justify-around h-20"><NavBtn id="track" icon={LayoutGrid} label="Track" active={activeTab === 'track'} onClick={() => setActiveTab('track')} /><NavBtn id="history" icon={BarChart3} label="History" active={activeTab === 'history'} onClick={() => setActiveTab('history')} /><NavBtn id="control" icon={Settings} label="Control" active={activeTab === 'control'} onClick={() => setActiveTab('control')} /></div></nav>
      <AnimatePresence>{showProfile && <ProfileModal user={user} onClose={() => setShowProfile(false)} />}{showAdd && <ProtocolFormOverlay isOpen={showAdd} onClose={() => setShowAdd(false)} onApply={addProtocol} title="New Protocol" />}{editProtocol && <ProtocolFormOverlay isOpen={!!editProtocol} onClose={() => setEditProtocol(null)} onApply={(data) => updateProtocol(editProtocol.id, data)} title="Modify Protocol" initialData={editProtocol} />}{editTarget && <EditOverlay log={editTarget} configs={configs} onClose={() => setEditTarget(null)} user={user} />}</AnimatePresence>
    </div>
  );
};

// --- SETTINGS (VIEW) ---

const SettingsScreen = ({ configs, user, settings, onAdd, onReo, onEditP, onUpd, onDel }) => {
  const [n, setN] = useState(user?.displayName || ''); const [isUploading, setIsUploading] = useState(false); const [previewUrl, setPreviewUrl] = useState(null); const fileRef = useRef(null);
  const handleUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setIsUploading(true); const localPreview = URL.createObjectURL(file); setPreviewUrl(localPreview);
    try {
      const storageRef = ref(storage, `profile_pictures/${user.uid}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      await updateProfile(auth.currentUser, { photoURL: url });
      await setDoc(doc(db, 'users', user.uid), { photoURL: url }, { merge: true });
      alert("Profile picture synchronized.");
    } catch (err) { alert("Upload failed: " + err.message); }
    finally { setIsUploading(false); setPreviewUrl(null); URL.revokeObjectURL(localPreview); }
  };
  return (
    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-12 max-w-3xl mx-auto font-inter text-left">
       <Card className="p-12 bg-white/[0.02] border border-white/[0.03] rounded-[56px] shadow-2xl font-inter"><div className="flex flex-col items-center gap-10">
          <div className="relative group cursor-pointer" onClick={() => !isUploading && fileRef.current?.click()}><div className={cn("w-40 h-40 rounded-[48px] bg-accent/5 border-2 border-accent/20 flex items-center justify-center overflow-hidden shadow-2xl transition-all duration-700", isUploading && "opacity-50")}>{user?.photoURL ? <img src={user.photoURL} className="w-full h-full object-cover" alt="p" /> : <User size={64} className="text-accent" />}{isUploading && <Loader2 className="absolute animate-spin" />}</div><div className="absolute -bottom-3 -right-3 w-14 h-14 bg-white text-black rounded-[22px] flex items-center justify-center shadow-2xl"><Camera size={24} /></div><input type="file" ref={fileRef} className="hidden" accept="image/*" onChange={handleUpload} /></div>
          <div className="w-full space-y-10"><Input label="Identity Label" value={n} onChange={setN} isDark /><button onClick={() => updateProfile(auth.currentUser, { displayName: n })} className="w-full h-20 bg-white text-black font-black uppercase tracking-[0.5em] rounded-[28px]">Commit Profile</button></div>
       </div></Card>
       <Card className="p-12 bg-white/[0.02] border border-white/[0.03] rounded-[56px] shadow-2xl font-inter"><div className="flex items-center justify-between px-2 font-inter"><div className="space-y-2 text-left font-inter"><h3 className="text-[10px] font-black uppercase tracking-[0.8em] text-white/30">Active Schematics</h3><span className="text-3xl font-[1000] tracking-tighter uppercase font-inter">Protocols</span></div><button onClick={onAdd} className="p-5 bg-accent text-black rounded-[24px] shadow-2xl"><Plus size={32} /></button></div><div className="space-y-6">{configs.sort((a,b)=>a.order-b.order).map((c, idx) => ( <ProtocolListItem key={c.id} config={c} idx={idx} total={configs.length} onReo={onReo} onEdit={onEditP} onDel={() => onDel(c.id)} /> ))}</div></Card>
       <button onClick={() => signOut(auth)} className="w-full h-22 border-2 border-danger/30 text-danger font-black uppercase tracking-[0.6em] rounded-[32px]">Terminate Sessions</button>
    </motion.div>
  );
};

const AuthScreen = ({ accent }) => {
  const [isL, setIsL] = useState(true); const [e, setE] = useState(''); const [p, setP] = useState(''); const [n, setN] = useState(''); const [loading, setLoading] = useState(false); const [err, setErr] = useState('');
  const handle = async () => { setLoading(true); setErr(''); try { if (isL) { await signInWithEmailAndPassword(auth, e, p); } else { const c = await createUserWithEmailAndPassword(auth, e, p); await updateProfile(c.user, { displayName: n }); await setDoc(doc(db, 'users', c.user.uid), { name: n, accent: '#00d2ff', isDark: true }); } } catch (e) { setErr(e.message); } finally { setLoading(false); } };
  return (
    <div className="min-h-screen bg-[#020202] flex items-center justify-center p-8 text-white font-inter relative overflow-hidden font-inter">
      <div className="w-full max-w-[450px] space-y-16 relative z-10"><div className="flex flex-col items-center text-center"><Zap size={48} className="text-accent mb-10" /><h1 className="text-7xl font-[1000] tracking-tighter uppercase font-inter">TABAK<span className="text-accent">++</span></h1></div><div className="bg-white/[0.02] border border-white/[0.05] p-12 rounded-[56px] space-y-10 shadow-2xl">
          <div className="space-y-8">{err && <div className="p-6 bg-danger/10 text-danger text-center">{err}</div>}<Input label="Link" value={e} onChange={setE} isDark /><Input label="Passkey" type="password" value={p} onChange={setP} isDark /><button className="w-full h-20 bg-accent text-black font-black uppercase tracking-[0.5em] rounded-[28px]" onClick={handle}>{loading ? <Loader2 className="animate-spin" /> : (isL ? 'Sync Registry' : 'Join Registry')}</button></div><button onClick={() => setIsL(!isL)} className="w-full text-center opacity-40">{isL ? "Request Access Entry" : "Return to Log In"}</button>
      </div></div>
    </div>
  );
};

// --- APP WRAPPER EXPORT ---

const App = () => (
  <ErrorBoundaryUI>
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  </ErrorBoundaryUI>
);

const ProtocolFormOverlay = ({ isOpen, onClose, onApply, title, initialData = null }) => {
  const [n, setN] = useState(initialData?.name || ''); const [l, setL] = useState(initialData?.limit || '20'); const [t, setT] = useState(initialData?.type || 'CIGARETTE');
  return (
    <IPhoneModifyModal isOpen={isOpen} onClose={onClose} title={title} actionLabel={initialData ? "Apply Modification" : "Authorize logic"} onAction={() => onApply({ name: n, limit: parseInt(l) || 20, type: t })}>
      <div className="space-y-10 text-left"><Input label="Descriptor" value={n} onChange={setN} isDark /><Input label="Threshold" type="number" value={l} onChange={setL} isDark /><div className="space-y-5"><span className="text-[10px] font-black uppercase tracking-[0.8em] text-white/20">Visual Schematic</span><div className="grid grid-cols-2 gap-5">{['CIGARETTE', 'SIMPLE', 'JOINT_KING', 'JOINT_QUEEN'].map(x => ( <button key={x} onClick={() => setT(x)} className={cn("h-18 rounded-[32px] border-2 font-black text-[12px] uppercase", t === x ? "border-accent bg-accent/10 text-accent" : "border-white/5 opacity-40")}>{x.replace('_',' ')}</button> ))}</div></div></div>
    </IPhoneModifyModal>
  );
};

export default App;
