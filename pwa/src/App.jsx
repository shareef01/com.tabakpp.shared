import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Heart, BarChart3, Settings, LogOut,
  ChevronRight, Info, History, Plus, Minus, Edit2, Trash2,
  TrendingUp, Wallet, Activity, Calendar, Clock, ArrowUp, ArrowDown, X,
  Save, AlertCircle, RefreshCcw, Camera, Target, Layout, Type, DollarSign,
  Moon, Check, GripVertical, CheckCircle2, Loader2
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

// --- FIREBASE ---
import { auth, db } from './firebase';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut,
  updateProfile
} from 'firebase/auth';
import {
  doc,
  setDoc,
  collection,
  onSnapshot,
  query,
  orderBy,
  limit
} from 'firebase/firestore';

import { SmokingCalculator } from './utils/smokingCalculator';
import { Card, Button, Input, StaggeredItem } from './components/Common';
import { cn } from './utils/utils';

// --- UTILS ---
const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '212, 255, 92';
};

// --- MAIN APP ---
const App = () => {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('tracker');
  const [error, setError] = useState(null);

  const [logs, setLogs] = useState([]);
  const [configs, setConfigs] = useState([]);
  const [settings, setSettings] = useState({
    accent: '#D4FF5C',
    isDark: true,
    layout: 'LARGE',
    fontScale: 1,
    nightOwl: false,
    globalPrice: '0.5'
  });

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    }, (err) => {
      console.error("Auth error:", err);
      setError("Vault Access Denied: " + err.message);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) return;
    try {
      const cUnsub = onSnapshot(collection(db, 'users', user.uid, 'configs'), (snap) => {
        const c = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setConfigs(c.length > 0 ? c : [{ id: 'cigarettes', name: 'Cigarettes', limit: 20, type: 'CIGARETTE', price: 0, order: 0 }]);
      });

      const lUnsub = onSnapshot(query(collection(db, 'users', user.uid, 'logs'), orderBy('logDate', 'desc'), limit(30)), (snap) => {
        setLogs(snap.docs.map(d => d.data()));
      });

      const sUnsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          setSettings(prev => ({
            ...prev,
            accent: d.accent || '#D4FF5C',
            isDark: d.isDark ?? true,
            layout: d.layout || 'LARGE',
            fontScale: d.fontScale || 1,
            nightOwl: d.nightOwl ?? false,
            globalPrice: d.globalPrice || '0.5'
          }));
        }
      });

      return () => { cUnsub(); lUnsub(); sUnsub(); };
    } catch (err) {
      setError("Data Sync Failed: " + err.message);
    }
  }, [user]);

  const metrics = useMemo(() => {
    try {
      const tLog = logs.find(l => l.logDate === today) || { logDate: today, counts: {} };
      const c = SmokingCalculator.getTotalCount(tLog, configs);
      const l = SmokingCalculator.getTotalLimit(configs);
      const s = SmokingCalculator.calculateStreak(logs, configs);
      const x = SmokingCalculator.calculateXP(logs, s);
      const prog = l > 0 ? c / l : 0;

      return {
        count: c, limit: l, streak: s, xp: x,
        rank: SmokingCalculator.getRank(x),
        progress: isNaN(prog) ? 0 : prog,
        savings: SmokingCalculator.calculateSavings(logs, configs, parseFloat(settings.globalPrice) || 0),
        lost: SmokingCalculator.calculateLifeLostMinutes(logs),
        todayLog: tLog
      };
    } catch (e) {
      return { count: 0, limit: 1, streak: 0, xp: 0, rank: '...', progress: 0, savings: 0, lost: 0, todayLog: { counts: {} } };
    }
  }, [logs, configs, settings.globalPrice, today]);

  const onInc = async (id) => {
    if (!user) return;
    const ref = doc(db, 'users', user.uid, 'logs', today);
    const cnt = metrics.todayLog.counts[id] || 0;
    await setDoc(ref, { logDate: today, counts: { ...metrics.todayLog.counts, [id]: cnt + 1 } }, { merge: true });
  };

  const onDec = async (id) => {
    if (!user) return;
    const cnt = metrics.todayLog.counts[id] || 0;
    if (cnt <= 0) return;
    const ref = doc(db, 'users', user.uid, 'logs', today);
    await setDoc(ref, { counts: { ...metrics.todayLog.counts, [id]: cnt - 1 } }, { merge: true });
  };

  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  if (error) return <ErrorScreen msg={error} onRetry={() => window.location.reload()} />;
  if (authLoading) return <LoadingScreen />;
  if (!user) return <AuthScreen />;

  return (
    <div
      className={cn("flex flex-col min-h-screen bg-bg-base text-white font-inter selection:bg-accent/30 transition-all duration-700", !settings.isDark && "invert-[0.9] hue-rotate-180")}
      style={{ '--accent': settings.accent, '--accent-rgb': hexToRgb(settings.accent), fontSize: `${settings.fontScale}rem` }}
    >
      <header className="fixed top-0 left-0 right-0 z-40 pt-[env(safe-area-inset-top)] px-8 md:px-12 py-8 bg-gradient-to-b from-black via-black/80 to-transparent flex justify-between items-center">
        <div className="flex flex-col">
          <h1 className="text-4xl font-[950] tracking-tighter uppercase leading-none">tabak++</h1>
          <span className="text-[10px] font-black tracking-[0.4em] text-accent mt-2 uppercase">{activeTab}</span>
        </div>
        <div className="flex items-center space-x-6">
           <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent font-[950] text-xl overflow-hidden">
              {user.photoURL ? <img src={user.photoURL} alt="p" className="w-full h-full object-cover" /> : user.displayName?.charAt(0) || 'U'}
           </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pt-40 pb-40 px-6 max-w-6xl mx-auto w-full">
        <AnimatePresence mode="wait">
          {activeTab === 'tracker' && <TrackerScreen key="t" m={metrics} c={configs} onInc={onInc} onDec={onDec} onAdd={() => setActiveTab('settings')} view={settings.layout} />}
          {activeTab === 'health' && <HealthScreen key="h" last={lastEntry} />}
          {activeTab === 'history' && <HistoryScreen key="y" logs={logs} configs={configs} m={metrics} todayString={today} onEdit={setEditTarget} />}
          {activeTab === 'settings' && (
            <SettingsScreen
              key="s" c={configs} setC={(v) => setConfigs(v)} u={user} s={settings}
              onAdd={() => setShowAdd(true)}
              onUpdateSettings={(upd) => setDoc(doc(db, 'users', user.uid), upd, { merge: true })}
              onReorder={(id, dir) => {
                const idx = configs.findIndex(x => x.id === id);
                if ((dir === 'up' && idx > 0) || (dir === 'down' && idx < configs.length -1)) {
                   const n = [...configs];
                   const swap = dir === 'up' ? idx - 1 : idx + 1;
                   [n[idx], n[swap]] = [n[swap], n[idx]];
                   const final = n.map((x, i) => ({ ...x, order: i }));
                   setConfigs(final);
                   final.forEach(x => setDoc(doc(db, 'users', user.uid, 'configs', x.id), { order: x.order }, { merge: true }));
                }
              }}
            />
          )}
        </AnimatePresence>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 md:bottom-10 md:left-1/2 md:-translate-x-1/2 md:w-[600px] pb-[env(safe-area-inset-bottom)] md:pb-0 z-40 px-4">
        <div className="bg-black/80 backdrop-blur-3xl border border-white/5 rounded-t-[40px] md:rounded-[40px] flex justify-around items-center h-24 md:h-22 px-6 shadow-2xl">
          <NavItem id="tracker" icon={LayoutDashboard} active={activeTab === 'tracker'} onClick={() => setActiveTab('tracker')} label="Vault" />
          <NavItem id="health" icon={Heart} active={activeTab === 'health'} onClick={() => setActiveTab('health')} label="Health" />
          <NavItem id="history" icon={BarChart3} active={activeTab === 'history'} onClick={() => setActiveTab('history')} label="History" />
          <NavItem id="settings" icon={Settings} active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} label="Control" />
        </div>
      </nav>

      <AnimatePresence>
        {showAdd && (
          <Overlay onClose={() => setShowAdd(false)} title="New Protocol">
            <AddForm onAdd={async (n, t, l) => {
              const id = Math.random().toString(36).substr(2, 9);
              await setDoc(doc(db, 'users', user.uid, 'configs', id), { name: n, type: t, limit: parseInt(l) || 20, order: configs.length });
              setShowAdd(false);
            }} />
          </Overlay>
        )}
        {editTarget && (
          <Overlay onClose={() => setEditTarget(null)} title="Override Entry">
            <EditForm log={editTarget} configs={configs} onSave={async (d, c) => {
              await setDoc(doc(db, 'users', user.uid, 'logs', d), { counts: c }, { merge: true });
              setEditTarget(null);
            }} />
          </Overlay>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- SUB COMPONENTS ---

const ErrorScreen = ({ msg, onRetry }) => (
  <div className="min-h-screen bg-bg-base flex flex-col items-center justify-center p-12 text-center space-y-8">
     <div className="p-6 bg-danger/10 rounded-full text-danger"><AlertCircle size={64} /></div>
     <div className="space-y-2">
        <h2 className="text-3xl font-black uppercase">System Failure</h2>
        <p className="text-text-dim max-w-xs mx-auto">{msg}</p>
     </div>
     <Button onClick={onRetry} variant="danger" className="w-64 h-16">Re-Initialize Vault</Button>
  </div>
);

const LoadingScreen = () => (
  <div className="min-h-screen bg-bg-base flex flex-col items-center justify-center space-y-6">
     <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}><Loader2 className="text-accent" size={48} /></motion.div>
     <span className="text-[10px] font-black text-accent tracking-[0.5em] uppercase">Syncing...</span>
  </div>
);

const AuthScreen = () => {
  const [isL, setIsL] = useState(true);
  const [e, setE] = useState('');
  const [p, setP] = useState('');
  const [n, setN] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handle = async () => {
    setLoading(true); setError('');
    try {
      if (isL) { await signInWithEmailAndPassword(auth, e, p); }
      else {
        const c = await createUserWithEmailAndPassword(auth, e, p);
        await updateProfile(c.user, { displayName: n });
        await setDoc(doc(db, 'users', c.user.uid), { name: n, accent: '#D4FF5C', isDark: true });
      }
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-12">
        <div className="flex flex-col items-center text-center">
           <div className="w-24 h-24 bg-accent rounded-[32px] flex items-center justify-center mb-8 shadow-2xl"><LayoutDashboard size={40} className="text-bg-base" /></div>
           <h1 className="text-5xl font-[950] tracking-tighter uppercase text-white">tabak++</h1>
        </div>
        <Card className="space-y-6">
          {error && <div className="p-4 bg-danger/10 border border-danger/20 rounded-2xl text-danger text-[10px] font-bold uppercase">{error}</div>}
          {!isL && <Input label="Vault Commander" value={n} onChange={setN} />}
          <Input label="Vault ID" value={e} onChange={setE} />
          <Input label="Security Phrase" type="password" value={p} onChange={setP} />
          <Button className="w-full h-18 shadow-2xl" onClick={handle} disabled={loading}>{loading ? <Loader2 className="animate-spin" /> : (isL ? 'Access' : 'Initialize')}</Button>
          <div className="flex flex-col space-y-4 items-center">
             <button onClick={() => setIsL(!isL)} className="text-[10px] font-black text-text-dim uppercase tracking-widest hover:text-accent">{isL ? "New Vault" : "Back"}</button>
             <button onClick={() => signInAnonymously(auth)} className="text-[10px] font-black text-accent/60 uppercase tracking-widest hover:text-accent">Guest Entry</button>
          </div>
        </Card>
      </div>
    </div>
  );
};

const TrackerScreen = ({ m, c, onInc, onDec, view }) => (
  <div className="flex flex-col space-y-12 pb-10">
    <StaggeredItem index={0}>
       <Card className="bg-bg-panel/40 border-accent/10 p-10 relative overflow-hidden group">
          <div className="flex justify-between items-end relative z-10">
             <div className="space-y-1">
                <span className="text-[10px] font-black text-text-dim uppercase tracking-widest">Total Remaining</span>
                <div className="text-6xl font-[950] tracking-tighter leading-none">{Math.max(0, m.limit - m.count)}</div>
             </div>
             <div className="text-right">
                <div className="px-3 py-1 bg-accent/10 rounded-lg text-accent text-[10px] font-black uppercase mb-2 border border-accent/20">{m.rank}</div>
                <div className="text-3xl font-[950] text-text-muted leading-none tracking-tighter">{m.xp} XP</div>
             </div>
          </div>
          <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden mt-8 p-0.5 border border-white/5 relative z-10">
             <motion.div animate={{ width: `${Math.min(1, m.progress) * 100}%` }} className={cn("h-full rounded-full transition-all duration-1000", m.progress >= 1 ? "bg-danger shadow-[0_0_20px_#F87171]" : "bg-white shadow-[0_0_20px_white]")} />
          </div>
          <div className="absolute top-0 right-0 w-80 h-80 bg-accent/5 rounded-full blur-[120px] -mr-40 -mt-40" />
       </Card>
    </StaggeredItem>

    <div className={cn("grid gap-8", view === 'COMPACT' ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-1 lg:grid-cols-2")}>
       {c.sort((a,b) => a.order - b.order).map((config, i) => (
         <StaggeredItem key={config.id} index={i+1}>
           <CounterCard config={config} count={m.todayLog.counts[config.id] || 0} onInc={onInc} onDec={onDec} isC={view === 'COMPACT'} />
         </StaggeredItem>
       ))}
    </div>
  </div>
);

const CounterCard = ({ config, count, onInc, onDec, isC }) => {
  const isL = count >= config.limit;
  const p = Math.min(1, count / config.limit);
  const bodyW = isL ? 0 : (1 - p) * 100;
  return (
    <Card className={cn("relative flex flex-col group transition-all duration-1000", isL ? "bg-danger/[0.03] border-danger/40" : "hover:border-accent/20", isC ? "p-8 min-h-[350px]" : "p-12 min-h-[500px]")}>
       <div className="flex justify-between items-start mb-8 relative z-20">
          <span className={cn("text-[11px] font-[950] tracking-[0.5em] uppercase", isL ? "text-danger" : "text-accent")}>{config.name}</span>
          {isL && <motion.div animate={{ scale:[1,1.2,1] }} transition={{ repeat: Infinity }} className="text-danger"><AlertCircle size={18} /></motion.div>}
       </div>
       <div className="flex-1 flex flex-col items-center justify-center relative z-10 py-8">
          {config.type === 'CIGARETTE' ? (
             <div className={cn("relative w-full h-12 rounded-full overflow-hidden border border-white/5 mb-14 shadow-inner transition-all duration-1000", isL ? "bg-danger shadow-[0_0_40px_#F87171]" : "bg-bg-panel")}>
                <motion.div animate={{ width: `${bodyW}%` }} className="absolute right-0 inset-y-0 bg-gradient-to-l from-white to-neutral-200 z-10" />
                {!isL && count > 0 && (
                   <motion.div animate={{ right: `${bodyW}%` }} className="absolute inset-y-0 w-12 translate-x-1/2 z-20 flex items-center justify-center">
                      <div className="absolute inset-0 bg-radial-gradient from-[#FF3D00] to-transparent blur-xl opacity-60" />
                      <motion.div animate={{ scale:[1,1.2,1], backgroundColor:['#FF3D00','#FFB74D','#FF3D00'] }} transition={{ repeat: Infinity, duration:0.1 }} className="w-5 h-full rounded-full shadow-[0_0_20px_#FF3D00]" />
                   </motion.div>
                )}
                <motion.div animate={{ width: isL ? '0%' : '28%' }} className="absolute inset-y-0 right-0 bg-[#D97706] z-[11] shadow-2xl" />
             </div>
          ) : <div className={cn("text-[12rem] font-[950] tracking-tighter leading-none mb-10 transition-colors", isL ? "text-danger" : "text-white")}>{count}</div>}

          {config.type === 'CIGARETTE' && <div className="text-[8rem] font-[950] tracking-tighter leading-none mb-10">{count}</div>}
       </div>
       <div className="flex justify-center items-center space-x-10 relative z-20">
          <motion.button whileTap={{ scale: 0.8 }} onClick={() => onDec(config.id)} className="w-16 h-16 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-text-dim hover:text-white transition-all"><Minus size={24} /></motion.button>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => onInc(config.id)} className={cn("rounded-[36px] flex items-center justify-center shadow-2xl transition-all duration-700 border-2", isC ? "w-28 h-20" : "w-40 h-28", isL ? "border-danger text-danger bg-danger/10" : "border-white/10 text-white bg-bg-panel hover:border-accent hover:text-accent")}>
             <Plus size={isC ? 36 : 56} strokeWidth={4} />
          </motion.button>
       </div>
    </Card>
  );
};

const HealthScreen = ({ last }) => {
  const miles = useMemo(() => SmokingCalculator.calculateRecoveryMilestones(last), [last]);
  return (
    <div className="flex flex-col space-y-12">
       <Card className="bg-success/5 border-success/20 p-12 overflow-hidden relative shadow-2xl">
          <div className="flex justify-between items-center mb-12 relative z-10">
             <div className="w-20 h-20 rounded-[32px] bg-success/20 flex items-center justify-center border border-success/30 text-success"><Heart size={40} fill="currentColor" /></div>
             <h2 className="text-4xl font-[950] tracking-tighter uppercase leading-none text-success">Biological Repair</h2>
          </div>
          <p className="text-sm font-bold text-text-muted max-w-lg relative z-10 leading-relaxed">Sequences are actively re-aligning. Cellular regeneration verified via clinical nonsmoker research.</p>
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-success/10 rounded-full blur-[150px] -mr-40 -mt-40" />
       </Card>
       <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-20">
          {miles.map((m, i) => (
             <StaggeredItem key={m.title} index={i}>
                <Card className="h-full flex flex-col p-10 border-white/5 shadow-inner">
                   <div className="flex justify-between items-start mb-10">
                      <div className="space-y-1">
                         <span className="text-[10px] font-black text-text-dim uppercase tracking-[0.4em]">{m.progress >= 1 ? 'Stabilized' : 'Repairing'}</span>
                         <h4 className="text-2xl font-[950] tracking-tighter uppercase leading-none mt-2">{m.title}</h4>
                      </div>
                      <div className="text-5xl font-[950] text-success tracking-tighter">{Math.floor(m.progress * 100)}%</div>
                   </div>
                   <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden mb-10 border border-white/5 shadow-inner">
                      <motion.div animate={{ width: `${m.progress * 100}%` }} className="h-full bg-success shadow-[0_0_20px_rgba(74,222,128,0.6)]" />
                   </div>
                   <p className="text-sm text-text-muted font-bold leading-relaxed border-l-2 border-white/5 pl-6">{m.desc}</p>
                </Card>
             </StaggeredItem>
          ))}
       </div>
    </div>
  );
};

const HistoryScreen = ({ logs, configs, todayString, onEdit, m }) => {
  const chart = useMemo(() => [...logs].sort((a,b)=>a.logDate.localeCompare(b.logDate)).slice(-7).map(l => ({ name: new Date(l.logDate).toLocaleDateString(undefined, {weekday:'short'}).toUpperCase(), val: l.counts.cigarettes || 0 })), [logs]);
  return (
    <div className="flex flex-col space-y-10 pb-20">
       <Card className="p-0 overflow-hidden border-accent/20 bg-bg-panel/40 shadow-2xl">
          <div className="p-12 pb-8 flex justify-between items-start">
             <div className="space-y-1">
                <span className="text-[10px] font-black text-text-dim uppercase tracking-[0.4em]">Analytics Engine</span>
                <h3 className="text-4xl font-[950] text-accent mt-1 uppercase tracking-tighter leading-none">Usage Volatility</h3>
             </div>
             <div className="p-4 bg-accent/10 rounded-3xl border border-accent/20"><BarChart3 className="text-accent" size={32} /></div>
          </div>
          <div className="h-[300px] w-full pr-12 pl-4 pb-12">
             <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chart}>
                   <CartesianGrid strokeDasharray="6 6" stroke="rgba(255,255,255,0.02)" vertical={false} />
                   <XAxis dataKey="name" stroke="#666664" fontSize={10} axisLine={false} tickLine={false} dy={20} />
                   <Tooltip contentStyle={{ background: '#0D0D0E', border: '1px solid rgba(212,255,92,0.3)', borderRadius: '20px', fontWeight: '950', fontSize: '14px' }} />
                   <Line type="stepAfter" dataKey="val" stroke="#D4FF5C" strokeWidth={6} dot={{ r: 6, fill: '#D4FF5C' }} animationDuration={2000} />
                </LineChart>
             </ResponsiveContainer>
          </div>
       </Card>
       <div className="grid gap-6 pt-10">
          <h4 className="text-[12px] font-black text-accent uppercase tracking-[0.5em] ml-2">Historical Ledger</h4>
          {logs.sort((a,b)=>b.logDate.localeCompare(a.logDate)).map((log, i) => (
             <StaggeredItem key={log.logDate} index={i}>
                <Card className="py-10 flex items-center justify-between group border-white/5 hover:border-accent/20">
                   <div className="flex flex-col space-y-1">
                      <span className="text-2xl font-[950] tracking-tight uppercase leading-none">{log.logDate === todayString ? 'Today' : new Date(log.logDate).toLocaleDateString(undefined, {month:'short', day:'numeric', weekday:'long'})}</span>
                      <span className="text-[10px] font-black text-text-dim uppercase tracking-[0.4em] mt-2 flex items-center"><History size={12} className="mr-2" /> {Object.values(log.counts).reduce((a,b)=>a+b, 0)} logs committed</span>
                   </div>
                   <div className="flex items-center space-x-8">
                      <div className="flex -space-x-4">
                         {Object.entries(log.counts).map(([cid, count]) => (
                           <div key={cid} className="w-14 h-14 rounded-full bg-bg-panel border-4 border-bg-card flex items-center justify-center font-[950] text-sm shadow-2xl group-hover:-translate-y-1 transition-transform duration-500">{count}</div>
                         ))}
                      </div>
                      <button onClick={() => onEdit(log)} className="p-4 rounded-2xl bg-white/5 text-text-dim hover:text-accent opacity-0 group-hover:opacity-100 transition-all border border-white/5"><Edit2 size={18} /></button>
                   </div>
                </Card>
             </StaggeredItem>
          ))}
       </div>
    </div>
  );
};

const SettingsScreen = ({ c, setC, u, s, onAdd, onUpdateSettings, onReorder }) => (
  <div className="flex flex-col space-y-12 pb-32">
     <Card className="p-12 bg-bg-panel/40 border-white/5 shadow-2xl relative overflow-hidden">
        <div className="flex items-center space-x-10 mb-14 relative z-10">
           <div className="w-28 h-28 bg-gradient-to-br from-accent/30 to-accent/5 rounded-[42px] border-2 border-accent/20 flex items-center justify-center text-5xl font-[950] text-accent uppercase shadow-2xl">{u.displayName?.charAt(0) || 'U'}</div>
           <div><h4 className="text-4xl font-[950] tracking-tighter uppercase leading-none">{u.displayName}</h4><span className="text-[10px] font-black text-accent uppercase tracking-[0.5em] mt-2 block">Vault Commander</span></div>
        </div>
        <div className="space-y-10 relative z-10">
           <Input label="Global Unit Price ($)" value={s.globalPrice} onChange={(v) => onUpdateSettings({ globalPrice: v })} type="number" />
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
              <Toggle icon={Moon} label="Obsidian Mode" active={s.isDark} onClick={() => onUpdateSettings({ isDark: !s.isDark })} />
              <Toggle icon={Clock} label="Night Owl Mode" active={s.nightOwl} onClick={() => onUpdateSettings({ nightOwl: !s.nightOwl })} />
              <Toggle icon={Grid} label="Matrix Layout" active={s.layout === 'COMPACT'} onClick={() => onUpdateSettings({ layout: s.layout === 'LARGE' ? 'COMPACT' : 'LARGE' })} />
           </div>
           <div className="pt-8 space-y-8">
              <span className="text-[10px] font-black text-text-dim uppercase tracking-[0.5em]">Typography Scale : {Math.round(s.fontScale*100)}%</span>
              <input type="range" min="0.8" max="1.3" step="0.1" value={s.fontScale} onChange={e => onUpdateSettings({ fontScale: parseFloat(e.target.value) })} className="w-full h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer accent-accent" />
           </div>
           <div className="space-y-6 pt-10">
              <span className="text-[10px] font-black text-text-dim uppercase tracking-[0.5em]">Operational Protocols</span>
              <div className="space-y-4">{c.map(x => (
                <div key={x.id} className="flex items-center justify-between p-8 bg-white/[0.02] rounded-[36px] border border-white/5 group hover:border-accent/20 transition-all duration-700">
                   <div className="flex items-center space-x-6">
                      <div className="flex flex-col space-y-2">
                        <button onClick={() => onReorder(x.id, 'up')} className="p-2 bg-white/5 rounded-lg text-text-dim hover:text-white transition-all"><ArrowUp size={12} /></button>
                        <button onClick={() => onReorder(x.id, 'down')} className="p-2 bg-white/5 rounded-lg text-text-dim hover:text-white transition-all"><ArrowDown size={12} /></button>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-lg font-[950] uppercase leading-none transition-all group-hover:text-accent">{x.name}</span>
                        <span className="text-[10px] font-black text-text-dim uppercase tracking-widest mt-2">{x.limit} UNITS • {x.type}</span>
                      </div>
                   </div>
                   <button onClick={() => onUpdateSettings({})} className="p-4 rounded-2xl bg-danger/5 text-danger/40 hover:text-danger border border-danger/5 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={18} /></button>
                </div>
              ))}</div>
              <Button variant="outline" className="w-full border-dashed border-2 rounded-[36px] h-20" onClick={onAdd}><Plus className="mr-4" /> Deploy Tracker</Button>
           </div>
        </div>
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[150px] -mr-64 -mt-64" />
     </Card>
     <Button variant="danger" className="w-full h-20 shadow-2xl" onClick={() => signOut(auth)}>Terminate Session</Button>
  </div>
);

// --- HELPERS ---

const NavItem = ({ icon: Icon, active, onClick, label }) => (
  <motion.div onClick={onClick} whileTap={{ scale: 0.85 }} className="flex flex-col items-center justify-center flex-1 py-4 cursor-pointer relative group transition-all duration-500">
    <Icon size={24} className={cn("mb-2 transition-all duration-700", active ? "text-accent scale-110 drop-shadow-[0_0_12px_#D4FF5C]" : "text-text-dim group-hover:text-text-muted")} />
    <span className={cn("text-[9px] font-black tracking-[0.2em] uppercase transition-colors duration-500", active ? "text-white" : "text-text-dim")}>{label}</span>
    {active && <motion.div layoutId="navDot" className="absolute -top-1 w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_20px_#D4FF5C]" />}
  </motion.div>
);

const Toggle = ({ icon: Icon, label, active, onClick }) => (
  <div className="flex items-center justify-between p-8 bg-white/[0.02] rounded-[36px] border border-white/5 shadow-inner">
     <div className="flex items-center space-x-5">
        <div className="p-4 bg-white/5 rounded-2xl text-text-muted shadow-lg border border-white/5"><Icon size={22} /></div>
        <span className="text-[11px] font-[950] uppercase tracking-[0.4em]">{label}</span>
     </div>
     <button onClick={onClick} className={cn("w-16 h-9 rounded-full p-1.5 transition-all duration-700 border border-white/5", active ? "bg-accent shadow-[0_0_15px_rgba(212,255,92,0.5)]" : "bg-white/10")}>
        <div className={cn("w-6 h-6 rounded-full bg-white transition-all duration-700 shadow-2xl", active ? "translate-x-7" : "translate-x-0")} />
     </button>
  </div>
);

const Overlay = ({ children, onClose, title }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/90 backdrop-blur-2xl">
     <motion.div initial={{ y: 100, scale: 0.95, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: 100, scale: 0.95, opacity: 0 }} transition={{ type: 'spring', damping: 20, stiffness: 100 }} className="w-full max-w-lg">
        <Card className="p-12 relative border-accent/30 shadow-[0_0_120px_rgba(212,255,92,0.15)] bg-bg-panel/95">
           <button onClick={onClose} className="absolute top-10 right-10 p-4 rounded-3xl bg-white/5 text-text-dim hover:text-white transition-all border border-white/5"><X size={24} /></button>
           <h3 className="text-3xl font-[950] tracking-tighter uppercase leading-none text-accent mb-12">{title}</h3>
           {children}
        </Card>
     </motion.div>
  </div>
);

const AddForm = ({ onAdd }) => {
  const [n, setN] = useState('');
  const [l, setL] = useState('20');
  const [t, setT] = useState('CIGARETTE');
  return (
    <div className="space-y-10">
       <Input label="Protocol Assignment" value={n} onChange={setN} placeholder="VAULT_UNIT_ALPHA" />
       <Input label="Operational Threshold" value={l} onChange={setL} type="number" />
       <div className="space-y-4">
          <span className="text-[10px] font-black text-text-dim uppercase tracking-[0.4em] ml-1">Visual Schema</span>
          <div className="grid grid-cols-2 gap-4">
             {['CIGARETTE', 'SIMPLE', 'JOINT_KING', 'JOINT_QUEEN'].map(x => (
                <button key={x} onClick={() => setT(x)} className={cn("h-14 rounded-2xl border font-black text-[10px] uppercase tracking-widest transition-all duration-500", t === x ? "bg-accent text-bg-base border-accent shadow-[0_0_30px_rgba(212,255,92,0.4)] scale-105" : "bg-white/5 border-white/5 text-text-dim hover:border-white/20")}>{x.replace('_', ' ')}</button>
             ))}
          </div>
       </div>
       <Button size="lg" className="w-full shadow-2xl h-20" onClick={() => onAdd(n, t, l)}>Commit Deployment</Button>
    </div>
  );
};

const EditForm = ({ log, configs, onSave }) => {
  const [c, setC] = useState({ ...log.counts });
  return (
    <div className="space-y-10">
       <div className="flex items-center space-x-4 p-5 bg-white/5 rounded-[24px] border border-white/5 shadow-inner">
          <Calendar size={20} className="text-accent" />
          <span className="text-sm font-black text-white uppercase tracking-[0.2em]">{new Date(log.logDate).toLocaleDateString(undefined, { dateStyle: 'full' })}</span>
       </div>
       <div className="max-h-[350px] overflow-y-auto pr-4 space-y-8 scrollbar-thin">
          {configs.map(x => <Input key={x.id} label={x.name} value={c[x.id] || 0} type="number" onChange={v => setC({...c, [x.id]: parseInt(v) || 0})} />)}
       </div>
       <Button size="lg" className="w-full h-20 shadow-2xl" onClick={() => onSave(log.logDate, c)}><Save className="mr-4" size={24} /> Sync Override</Button>
    </div>
  );
};

export default App;
