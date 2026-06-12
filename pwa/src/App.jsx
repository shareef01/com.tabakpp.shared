import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutGrid, BarChart3, Settings, User, Plus, Minus,
  Activity, Zap, ShieldCheck, HeartPulse, Flame, X,
  LogOut, Camera, Calendar, RefreshCcw
} from 'lucide-react';

// --- STYLING CONSTANTS ---
const COLORS = {
  bg: '#0a0a0b',
  surface: '#121315',
  accent: '#00d2ff',
  textMuted: '#6b7280',
  danger: '#ff4b2b',
  success: '#10b981'
};

// --- CORE UI COMPONENTS ---

const App = () => {
  const [activeTab, setActiveTab] = useState('track');
  const [showProfile, setShowProfile] = useState(false);

  // Mock State for visual demonstration
  const [counts, setCounts] = useState({
    c1: 3,
    c2: 0,
    c3: 0,
    c4: 16
  });

  const onInc = (id) => setCounts(p => ({ ...p, [id]: p[id] + 1 }));
  const onDec = (id) => setCounts(p => ({ ...p, [id]: Math.max(0, p[id] - 1) }));

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white font-inter selection:bg-[#00d2ff]/30 overflow-x-hidden">
      {/* HEADER */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0b]/80 backdrop-blur-xl border-b border-white/5 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex flex-col group cursor-pointer">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#00d2ff] animate-pulse shadow-[0_0_8px_#00d2ff]" />
              <h1 className="text-xl font-[900] tracking-tighter uppercase">TABAK<span className="text-[#00d2ff]">++</span></h1>
            </div>
            <span className="text-[10px] font-bold text-[#6b7280] tracking-[0.3em] uppercase ml-4">Registry Tracker</span>
          </div>

          <button
            onClick={() => setShowProfile(true)}
            className="w-11 h-11 rounded-full border border-[#00d2ff]/30 flex items-center justify-center text-[#00d2ff] hover:bg-[#00d2ff]/10 active:scale-95 transition-all shadow-[0_0_15px_rgba(0,210,255,0.1)]"
          >
            <User size={20} />
          </button>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="pt-28 pb-[14rem] px-6 max-w-7xl mx-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'track' && (
            <motion.div
              key="track"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-10"
            >
              {/* TOP BANNER: OVERALL PROGRESS */}
              <section className="bg-[#121315] rounded-[32px] p-8 border border-white/5 relative overflow-hidden group shadow-2xl">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#00d2ff]/5 rounded-full blur-[80px] -mr-32 -mt-32" />

                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
                  <div className="space-y-2">
                    <h3 className="text-[11px] font-black text-[#6b7280] tracking-[0.4em] uppercase">Remaining Units</h3>
                    <div className="flex items-baseline gap-3">
                      <span className="text-7xl font-[1000] tracking-tighter tabular-nums">61</span>
                      <span className="text-sm font-black text-[#00d2ff] uppercase tracking-widest">Left</span>
                    </div>
                  </div>

                  <div className="flex flex-col md:items-end gap-2">
                    <div className="flex items-center gap-3">
                      <div className="px-3 py-1 rounded-full border border-[#00d2ff]/40 text-[#00d2ff] text-[10px] font-black tracking-widest uppercase">Veteran</div>
                      <span className="text-2xl font-[900] text-[#6b7280] tracking-tighter">638 <span className="text-sm opacity-50">XP</span></span>
                    </div>
                  </div>
                </div>

                <div className="mt-10 w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: '65%' }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className="h-full bg-[#00d2ff] shadow-[0_0_15px_#00d2ff]"
                  />
                </div>
              </section>

              {/* TRACKING GRID */}
              <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
                <TrackerCard
                  id="c1"
                  title="Cigarette"
                  count={counts.c1}
                  type="cigarette"
                  onInc={() => onInc('c1')}
                  onDec={() => onDec('c1')}
                />
                <TrackerCard
                  id="c2"
                  title="Generic"
                  count={counts.c2}
                  type="bar"
                  onInc={() => onInc('c2')}
                  onDec={() => onDec('c2')}
                />
                <TrackerCard
                  id="c3"
                  title="Health Pulse"
                  count={counts.c3}
                  type="ring"
                  onInc={() => onInc('c3')}
                  onDec={() => onDec('c3')}
                />
                <TrackerCard
                  id="c4"
                  title="Embers"
                  count={counts.c4}
                  type="embers"
                  onInc={() => onInc('c4')}
                  onDec={() => onDec('c4')}
                />
              </section>
            </motion.div>
          )}

          {activeTab === 'history' && (
             <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
                <BarChart3 size={64} className="mx-auto text-[#6b7280] mb-4" />
                <h2 className="text-2xl font-black uppercase tracking-widest">History Log</h2>
                <p className="text-[#6b7280] mt-2">Syncing registry records...</p>
             </motion.div>
          )}

          {activeTab === 'control' && (
             <motion.div key="control" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
                <Settings size={64} className="mx-auto text-[#6b7280] mb-4" />
                <h2 className="text-2xl font-black uppercase tracking-widest">System Control</h2>
                <p className="text-[#6b7280] mt-2">Initializing registry parameters...</p>
             </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* BOTTOM NAVIGATION */}
      <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
        <div className="bg-[#121315]/80 backdrop-blur-2xl border border-white/10 rounded-full px-8 py-3 flex items-center gap-10 shadow-2xl">
          <NavBtn icon={LayoutGrid} label="Track" active={activeTab === 'track'} onClick={() => setActiveTab('track')} />
          <NavBtn icon={BarChart3} label="History" active={activeTab === 'history'} onClick={() => setActiveTab('history')} />
          <NavBtn icon={Settings} label="Control" active={activeTab === 'control'} onClick={() => setActiveTab('control')} />
        </div>
      </nav>

      {/* PROFILE MODAL */}
      <Modal show={showProfile} onClose={() => setShowProfile(false)} title="Registry Profile">
        <div className="space-y-8">
          <div className="flex flex-col items-center gap-4">
             <div className="w-24 h-24 rounded-full border-2 border-[#00d2ff] p-1 shadow-[0_0_20px_rgba(0,210,255,0.2)]">
                <div className="w-full h-full rounded-full bg-white/5 flex items-center justify-center">
                   <User size={40} className="text-[#00d2ff]" />
                </div>
             </div>
             <div className="text-center">
                <h4 className="text-xl font-black uppercase tracking-tighter">Registry User</h4>
                <p className="text-[#6b7280] text-xs font-bold tracking-widest uppercase">Rank: Veteran</p>
             </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <button className="w-full h-14 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl flex items-center px-6 gap-4 transition-all">
              <Calendar size={20} className="text-[#00d2ff]" />
              <span className="text-sm font-bold uppercase tracking-widest">View Activity</span>
            </button>
            <button className="w-full h-14 bg-[#ff4b2b]/10 hover:bg-[#ff4b2b]/20 border border-[#ff4b2b]/20 rounded-2xl flex items-center px-6 gap-4 transition-all group">
              <LogOut size={20} className="text-[#ff4b2b]" />
              <span className="text-sm font-bold uppercase tracking-widest text-[#ff4b2b]">Terminate Session</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// --- SUB-COMPONENTS ---

const TrackerCard = ({ title, count, type, onInc, onDec }) => {
  return (
    <div className="bg-[#121315] rounded-[40px] border border-white/5 p-8 flex flex-col items-center justify-between min-h-[520px] hover:border-[#00d2ff]/20 hover:shadow-[0_0_30px_rgba(0,210,255,0.05)] transition-all group relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-20%] w-[140%] h-[40%] bg-gradient-to-b from-[#00d2ff]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />

      <span className="text-[10px] font-black text-[#6b7280] tracking-[0.3em] uppercase relative z-10">Target: 20</span>

      <div className="flex-1 w-full flex flex-col items-center justify-center space-y-12 relative z-10">
        {/* VISUAL INDICATOR TYPES */}
        <div className="w-full flex justify-center h-24">
          {type === 'cigarette' && <CigaretteProgress progress={count/20} />}
          {type === 'bar' && <GenericBarProgress progress={count/20} />}
          {type === 'ring' && <RingProgress progress={count/20} count={count} />}
          {type === 'embers' && <EmberProgress progress={count/20} />}
        </div>

        <div className="flex flex-col items-center">
          <motion.span
            key={count}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-8xl font-[1000] tracking-tighter tabular-nums"
          >
            {count}
          </motion.span>
          <span className="text-[11px] font-black text-[#00d2ff] tracking-[0.5em] uppercase opacity-40 mt-2">{title}</span>
        </div>
      </div>

      <div className="w-full flex justify-between items-center pt-8 relative z-10">
        <button
          onClick={onDec}
          className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[#6b7280] hover:text-white hover:bg-white/10 active:scale-90 transition-all shadow-lg"
        >
          <Minus size={24} strokeWidth={3} />
        </button>
        <button
          onClick={onInc}
          className="w-14 h-14 rounded-full bg-[#00d2ff] flex items-center justify-center text-black hover:brightness-110 active:scale-90 transition-all shadow-[0_10px_25px_rgba(0,210,255,0.4)]"
        >
          <Plus size={24} strokeWidth={4} />
        </button>
      </div>
    </div>
  );
};

// --- CUSTOM PROGRESS VISUALS ---

const CigaretteProgress = ({ progress }) => (
  <div className="relative w-48 h-12 bg-white/5 rounded-full overflow-hidden border-2 border-white/10 flex">
    <div className="h-full bg-white shadow-[0_0_15px_white]" style={{ width: `${progress * 75}%` }} />
    <div className="h-full bg-[#f39c12]" style={{ width: '25%' }} />
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
  </div>
);

const GenericBarProgress = ({ progress }) => (
  <div className="w-48 h-12 bg-white/5 rounded-full overflow-hidden border-2 border-white/10 p-1">
    <div
      className="h-full bg-[#10b981] rounded-full shadow-[0_0_20px_#10b981]"
      style={{ width: `${progress * 100}%` }}
    />
  </div>
);

const RingProgress = ({ progress, count }) => (
  <div className="relative w-24 h-24 flex items-center justify-center">
    <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/5" />
      <motion.circle
        cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="8" fill="transparent"
        strokeDasharray="264"
        initial={{ strokeDashoffset: 264 }}
        animate={{ strokeDashoffset: 264 - (progress * 264) }}
        className="text-[#00d2ff]"
        strokeLinecap="round"
      />
    </svg>
    <div className="flex flex-col items-center">
      <HeartPulse size={16} className="text-[#00d2ff] animate-pulse" />
    </div>
  </div>
);

const EmberProgress = ({ progress }) => (
  <div className="w-48 h-12 bg-white/5 rounded-full overflow-hidden border-2 border-white/10 relative p-1">
    <div
      className="h-full bg-gradient-to-r from-[#ff4b2b] to-[#f39c12] rounded-full shadow-[0_0_25px_#ff4b2b]"
      style={{ width: `${progress * 100}%` }}
    />
    <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-[#ff4b2b]/20 to-transparent blur-md" />
  </div>
);

// --- HELPERS ---

const NavBtn = ({ icon: Icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={cn(
      "flex flex-col items-center gap-1.5 transition-all relative group",
      active ? "text-[#00d2ff]" : "text-[#6b7280] hover:text-white"
    )}
  >
    {active && (
      <motion.div
        layoutId="navIndicator"
        className="absolute -top-6 w-1.5 h-1.5 rounded-full bg-[#00d2ff] shadow-[0_0_10px_#00d2ff]"
      />
    )}
    <Icon size={22} strokeWidth={active ? 3 : 2} />
    <span className="text-[9px] font-black uppercase tracking-[0.2em]">{label}</span>
  </button>
);

const Modal = ({ show, onClose, title, children }) => (
  <AnimatePresence>
    {show && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-[#121315] border border-white/10 rounded-[32px] w-full max-w-md p-8 relative z-10 shadow-2xl"
        >
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-[1000] uppercase tracking-tighter">{title}</h3>
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-[#6b7280] transition-colors"><X size={24} /></button>
          </div>
          {children}
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

export default App;
