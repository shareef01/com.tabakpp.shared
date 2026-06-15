import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Settings, LogOut, Grid2X2, Columns2, Square } from 'lucide-react';
import { cn } from '../../utils/utils';

const HeaderSizeControl = React.memo(({ value, onChange }) => {
  const options = [ { id: 'SMALL', icon: Grid2X2 }, { id: 'MEDIUM', icon: Columns2 }, { id: 'LARGE', icon: Square } ];
  const activeIdx = options.findIndex(o => o.id === value);

  return (
    <div className="relative bg-neutral-900/80 backdrop-blur-md border border-white/10 p-1 rounded-full flex items-center h-10 w-[120px] shadow-inner overflow-hidden">
      {options.map((opt) => (
        <button
          key={opt.id}
          onClick={() => onChange({ widgetSize: opt.id })}
          className={cn(
            "relative flex-1 h-full flex items-center justify-center transition-all duration-300 ease-out z-10 rounded-full hover:bg-white/5 group",
            value === opt.id ? "text-zinc-950" : "text-neutral-400 hover:text-white"
          )}
        >
          <opt.icon size={15} strokeWidth={3} className="transition-transform group-active:scale-90" />
        </button>
      ))}
      <motion.div
        className="absolute h-[calc(100%-8px)] bg-accent rounded-full shadow-[0_2px_8px_rgba(212,255,50,0.3)]"
        initial={false}
        animate={{
          x: activeIdx * (112 / 3),
          width: 'calc(33.33% - 2px)'
        }}
        transition={{ type: 'spring', stiffness: 450, damping: 35 }}
        style={{ left: '4px' }}
      />
    </div>
  );
});

export const TopBanner = React.memo(({ user, onNavigate, widgetSize, onUpdateSettings, onRequestLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsOpen(false);
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <header className="sticky top-0 z-[100] w-full backdrop-blur-md bg-black/70 border-b border-white/[0.03]" style={{ paddingTop: 'max(env(safe-area-inset-top), 1rem)', paddingBottom: '1.25rem' }}>
      <div className="max-w-7xl mx-auto flex justify-between items-center px-6 font-inter">
        <div className="flex flex-col text-left font-inter">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse shadow-[0_0_12px_var(--accent)]" />
            <h1 className="text-2xl font-[1000] tracking-tighter uppercase leading-none font-black font-inter whitespace-nowrap flex items-center">
              TABAK<span className="text-accent">++</span>
            </h1>
          </div>
          <span className="text-[11px] font-black text-white/60 tracking-[0.4em] uppercase ml-4.5 mt-1.5 font-inter">Dashboard</span>
        </div>

        <div className="flex items-center gap-6">
          <HeaderSizeControl value={widgetSize} onChange={onUpdateSettings} />

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="group relative w-11 h-11 rounded-[18px] bg-accent/5 border border-accent/20 flex items-center justify-center text-accent active:scale-90 transition-all shadow-2xl overflow-hidden"
            >
              {user?.photoURL ? (
                <img src={user.photoURL} alt="User" className="w-full h-full object-cover" />
              ) : (
                <User size={20} strokeWidth={3} />
              )}
              <div className="absolute inset-0 bg-accent/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>

            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="absolute right-0 mt-4 w-56 bg-[#121316] border border-white/[0.05] rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-3xl p-3 overflow-hidden font-inter z-[110]"
                >
                  <div className="px-4 py-3 border-b border-white/[0.03] mb-2 font-inter">
                    <span className="text-[10px] font-black text-white/60 uppercase tracking-[0.3em] block">Account</span>
                    <span className="text-sm font-bold text-white truncate block mt-1">{user?.displayName || 'User'}</span>
                  </div>

                  <button
                    onClick={() => { onNavigate('control'); setIsOpen(false); }}
                    className="w-full flex items-center gap-4 px-4 py-3.5 rounded-[16px] text-white/70 hover:text-white hover:bg-white/[0.03] transition-all group text-left font-black uppercase tracking-widest text-[10px] font-inter"
                  >
                    <Settings size={18} /> Settings
                  </button>

                  <button
                    onClick={() => { onRequestLogout(); setIsOpen(false); }}
                    className="w-full flex items-center gap-4 px-4 py-3.5 rounded-[16px] text-rose-500/70 hover:text-rose-500 hover:bg-rose-500/5 transition-all text-left font-black uppercase tracking-widest text-[10px] font-inter"
                  >
                    <LogOut size={18} /> Log Out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
});
