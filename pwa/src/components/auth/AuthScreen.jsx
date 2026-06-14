import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { Input } from '../Common';
import { cn } from '../../utils/utils';

/**
 * QuitControlIcon
 * A conceptual, high-fidelity digital SVG replacing the literal cigarette.
 * Features brushed metal filters, pearlescent white bodies, and an
 * integrated neon-green progress gauge.
 */
const QuitControlIcon = React.memo(() => (
  <div className="relative flex flex-col items-center justify-center pointer-events-none select-none group">
    {/* Atmospheric Depth */}
    <div className="absolute inset-0 bg-accent/5 blur-[120px] rounded-full scale-150 animate-pulse" />

    <svg width="400" height="80" viewBox="0 0 400 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="relative drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
      <defs>
        {/* Pearlescent White Body Gradient */}
        <linearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="100%" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="50%" stopColor="#F8F8F8" />
          <stop offset="100%" stopColor="#E2E2E2" />
        </linearGradient>
        {/* Brushed Metal Filter Gradient */}
        <linearGradient id="filterGrad" x1="0" y1="0" x2="0" y2="100%" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4A4A4A" />
          <stop offset="50%" stopColor="#2D2D2D" />
          <stop offset="100%" stopColor="#1A1A1B" />
        </linearGradient>
        {/* Neon Control Gauge Gradient */}
        <linearGradient id="gaugeGrad" x1="0" y1="0" x2="100%" y2="0">
          <stop offset="0%" stopColor="#D4FF32" />
          <stop offset="100%" stopColor="#A4FF00" />
        </linearGradient>
        {/* Glass Overlay Shine */}
        <linearGradient id="glassShine" x1="0" y1="0" x2="0" y2="100%">
          <stop offset="0%" stopColor="white" stopOpacity="0.4" />
          <stop offset="40%" stopColor="white" stopOpacity="0.1" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Main Body - Pearlescent */}
      <rect x="100" y="20" width="220" height="40" rx="20" fill="url(#bodyGrad)" />
      <rect x="100" y="20" width="220" height="20" rx="20" fill="url(#glassShine)" />

      {/* Filter Segment - Brushed Metal */}
      <rect x="300" y="20" width="80" height="40" rx="20" fill="url(#filterGrad)" />
      <rect x="300" y="20" width="80" height="40" rx="20" fill="white" fillOpacity="0.03" />
      <path d="M300 20V60" stroke="black" strokeOpacity="0.2" strokeWidth="1" />

      {/* Integrated Control Gauge */}
      <rect x="120" y="32" width="160" height="16" rx="8" fill="#121212" />
      <motion.rect
        initial={{ width: 0 }}
        animate={{ width: 140 }}
        transition={{ duration: 2, repeat: Infinity, repeatType: 'reverse', ease: "easeInOut" }}
        x="125" y="36" height="8" rx="4" fill="url(#gaugeGrad)"
        className="drop-shadow-[0_0_10px_#D4FF32]"
      />

      {/* Digital Readout Simulation */}
      <circle cx="285" cy="40" r="12" fill="#0A0A0C" stroke="#D4FF32" strokeWidth="1" strokeOpacity="0.3" />
      <rect x="282" y="38" width="6" height="4" rx="1" fill="#D4FF32" fillOpacity="0.8" />
    </svg>

    {/* Dynamic Particle Flow (Subtle) */}
    <div className="absolute inset-0 flex items-center justify-center">
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -100, y: 0 }}
          animate={{ opacity: [0, 0.4, 0], x: -250 - (i * 20), y: [-20, 20, -20] }}
          transition={{ duration: 4 + i, repeat: Infinity, delay: i * 0.8 }}
          className="absolute w-20 h-20 bg-accent/5 rounded-full blur-3xl"
        />
      ))}
    </div>
  </div>
));

export const AuthScreen = React.memo(({ accent }) => {
  const [mode, setMode] = useState('LOGIN');
  const [e, setE] = useState('');
  const [p, setP] = useState('');
  const [n, setN] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ t: '', c: '' });

  const handle = async () => {
    setLoading(true); setMsg({ t: '', c: '' });
    try {
      if (mode === 'LOGIN') {
        await signInWithEmailAndPassword(auth, e, p);
      } else if (mode === 'REGISTER') {
        const c = await createUserWithEmailAndPassword(auth, e, p);
        await updateProfile(c.user, { displayName: n });
        await setDoc(doc(db, 'users', c.user.uid), { name: n, accent: '#D4FF32', isDark: true, widgetSize: 'LARGE' });
      } else {
        await sendPasswordResetEmail(auth, e);
        setMsg({ t: 'SUCCESS', c: 'Reset email sent.' });
      }
    } catch (err) {
      setMsg({ t: 'FAULT', c: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020202] flex flex-col lg:flex-row items-stretch text-white font-inter overflow-hidden selection:bg-accent/30 relative">
      <div className="absolute top-10 left-10 lg:top-16 lg:left-16 z-[100] flex flex-col items-start font-inter pointer-events-none">
         <h1 className="text-4xl lg:text-5xl font-[1000] tracking-tighter uppercase leading-none whitespace-nowrap">TABAK<span className="text-accent">++</span></h1>
         <span className="text-[9px] font-black text-white/60 tracking-[1em] uppercase mt-4 block font-inter">Quit Control System</span>
      </div>

      {/* LEFT COLUMN: Perfectly Centered */}
      <div className="hidden lg:flex flex-1 flex-col items-center justify-center bg-black relative border-r border-white/[0.03]">
         <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none" />
         <div className="flex flex-col items-center justify-center gap-0 w-full h-full">
            <QuitControlIcon />
            <div className="text-center pt-4">
               <motion.h2 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-5xl font-[1000] tracking-tighter uppercase leading-tight font-inter">EVERY SECOND <span className="text-accent">COUNTS.</span></motion.h2>
               <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.6em] mt-4 font-inter">RECLAIM CONTROL OF YOUR LIFE.</p>
            </div>
         </div>
      </div>

      {/* RIGHT COLUMN: Premium Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 lg:p-24 relative z-10 bg-[#020202]">
        <div className="w-full max-w-[440px] flex flex-col items-center">
          <div className="bg-neutral-900/40 backdrop-blur-3xl border border-white/5 p-10 lg:p-12 rounded-[48px] shadow-2xl shadow-black/50 relative overflow-hidden font-inter w-full text-center">
             <div className="absolute inset-0 border border-white/[0.02] rounded-[48px] pointer-events-none" />

             {/* REFINED TOGGLE: Zero Bleed */}
             <div className="relative bg-black/60 border border-white/10 p-1.5 rounded-full flex items-center h-16 w-full mb-10 overflow-hidden font-inter">
                <button onClick={() => setMode('LOGIN')} className={cn("relative flex-1 h-full text-[11px] font-[1000] uppercase tracking-[0.2em] transition-all duration-500 z-20 font-inter", mode === 'LOGIN' ? "text-zinc-950" : "text-neutral-500 hover:text-neutral-300")}>Sign In</button>
                <button onClick={() => setMode('REGISTER')} className={cn("relative flex-1 h-full text-[11px] font-[1000] uppercase tracking-[0.2em] transition-all duration-500 z-20 font-inter", mode === 'REGISTER' ? "text-zinc-950" : "text-neutral-500 hover:text-neutral-300")}>Sign Up</button>
                <motion.div
                   className="absolute left-1.5 h-[calc(100%-12px)] bg-accent rounded-full shadow-lg"
                   animate={{ x: mode === 'LOGIN' ? 0 : '100%', left: mode === 'LOGIN' ? '6px' : '-6px' }}
                   style={{ width: 'calc(50% - 6px)' }}
                   transition={{ type: 'spring', stiffness: 450, damping: 40 }}
                />
             </div>

             <div className="flex flex-col gap-6 relative z-10 font-inter text-center">
               {msg.c && <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className={cn("p-4 rounded-xl text-center font-black text-[10px] uppercase tracking-widest border", msg.t === 'FAULT' ? "bg-danger/10 text-danger border-danger/20" : "bg-accent/10 text-accent border border-accent/20")}>{msg.c}</motion.div>}

               <div className="flex flex-col gap-5 text-left font-inter">
                 {mode === 'REGISTER' && <Input label="Full Name" value={n} onChange={setN} isDark />}
                 <Input label="Email Address" type="email" value={e} onChange={setE} isDark />
                 {mode !== 'RESET' && <Input label="Password" type="password" value={p} onChange={setP} isDark />}
               </div>

               {/* PREMIUM MULTI-LAYERED BUTTON */}
               <button
                className="group relative w-full h-18 bg-accent text-zinc-950 font-[1000] uppercase tracking-[0.4em] rounded-2xl active:scale-[0.98] transition-all overflow-hidden flex items-center justify-center text-[11px] mt-2 shadow-[0_10px_40px_rgba(212,255,50,0.3)]"
                onClick={handle}
               >
                 {/* Glass Reflection Layer */}
                 <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                 {/* Tactical Depth Layer */}
                 <div className="absolute inset-0 border-t border-white/40 rounded-2xl pointer-events-none" />

                 <span className="relative z-10 flex items-center gap-3">
                   {loading ? <Loader2 className="animate-spin" size={18} /> : (mode === 'LOGIN' ? 'Access Registry' : (mode === 'REGISTER' ? 'Create Account' : 'Reset'))}
                 </span>
               </button>

               <div className="flex flex-col items-center gap-4 mt-2 font-inter">
                 {mode === 'LOGIN' && <button onClick={() => setMode('RESET')} className="text-neutral-500 uppercase text-[10px] font-black tracking-widest hover:text-white transition-colors font-inter">Forgot Password?</button>}
                 {mode === 'RESET' && <button onClick={() => setMode('LOGIN')} className="text-neutral-500 uppercase text-[10px] font-black tracking-widest hover:text-white transition-colors font-inter">Back to Sign In</button>}
               </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
});
