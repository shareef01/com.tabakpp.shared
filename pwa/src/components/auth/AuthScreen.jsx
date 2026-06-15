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
 * Consumes the dynamic 'accent' prop for themed visualization.
 */
const QuitControlIcon = React.memo(({ accent }) => (
  <div className="relative flex flex-col items-center justify-center pointer-events-none select-none group">
    {/* Dynamic Atmospheric Depth */}
    <div
      className="absolute inset-0 blur-[120px] rounded-full scale-150 animate-pulse opacity-10"
      style={{ backgroundColor: accent }}
    />

    <svg width="440" height="100" viewBox="0 0 440 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="relative drop-shadow-[0_25px_60px_rgba(0,0,0,0.6)]">
      <defs>
        <linearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="100%" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="45%" stopColor="#F0F0F0" />
          <stop offset="55%" stopColor="#E0E0E0" />
          <stop offset="100%" stopColor="#C0C0C0" />
        </linearGradient>
        <linearGradient id="filterGrad" x1="0" y1="0" x2="0" y2="100%" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#555555" />
          <stop offset="50%" stopColor="#1A1A1B" />
          <stop offset="100%" stopColor="#050505" />
        </linearGradient>
        <linearGradient id="gaugeGrad" x1="0" y1="0" x2="100%" y2="0">
          <stop offset="0%" stopColor={accent} />
          <stop offset="100%" stopColor={accent} stopOpacity={0.8} />
        </linearGradient>
        <linearGradient id="glassShine" x1="0" y1="0" x2="0" y2="100%">
          <stop offset="0%" stopColor="white" stopOpacity="0.5" />
          <stop offset="20%" stopColor="white" stopOpacity="0.2" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>

      <rect x="80" y="30" width="240" height="44" rx="22" fill="url(#bodyGrad)" />
      <rect x="80" y="30" width="240" height="22" rx="22" fill="url(#glassShine)" />

      <rect x="320" y="30" width="90" height="44" rx="22" fill="url(#filterGrad)" />
      <rect x="320" y="30" width="90" height="44" rx="22" fill="white" fillOpacity="0.04" />
      <path d="M320 30V74" stroke="black" strokeOpacity="0.3" strokeWidth="1" />

      <rect x="100" y="44" width="180" height="16" rx="8" fill="#080808" />
      <motion.rect
        initial={{ width: 0 }}
        animate={{ width: 160 }}
        transition={{ duration: 1.5, repeat: Infinity, repeatType: 'mirror', ease: "easeInOut" }}
        x="110" y="48" height="8" rx="4" fill="url(#gaugeGrad)"
      />

      <circle cx="305" cy="52" r="14" fill="#050505" stroke={accent} strokeWidth={1} strokeOpacity={0.4} />
      <motion.circle
        animate={{ r: [6, 8, 6], opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 1, repeat: Infinity }}
        cx="305" cy="52" r="6" fill={accent}
      />
    </svg>

    <div className="absolute inset-0 flex items-center justify-center">
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -120, y: 0 }}
          animate={{ opacity: [0, 0.5, 0], x: -300 - (i * 30), y: [-30, 30, -30] }}
          transition={{ duration: 5 + i, repeat: Infinity, delay: i * 0.7 }}
          className="absolute w-24 h-24 rounded-full blur-3xl opacity-5"
          style={{ backgroundColor: accent }}
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
        await setDoc(doc(db, 'users', c.user.uid), { name: n, accent: accent || '#D4FF32', isDark: true, widgetSize: 'LARGE' });
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
    <div className="min-h-screen bg-[#020202] flex flex-col lg:flex-row items-stretch text-white font-inter overflow-hidden relative" style={{'--accent': accent}}>
      <div className="absolute top-10 left-10 lg:top-16 lg:left-16 z-[100] flex flex-col items-start font-inter pointer-events-none">
         <h1 className="text-4xl lg:text-5xl font-[1000] tracking-tighter uppercase leading-none whitespace-nowrap">TABAK<span className="text-accent">++</span></h1>
         <span className="text-[9px] font-black text-white/60 tracking-[1em] uppercase mt-4 block font-inter">Quit Control System</span>
      </div>

      {/* LEFT COLUMN: Perfectly Centered */}
      <div className="hidden lg:flex flex-1 flex-col items-center justify-center bg-black relative border-r border-white/[0.03]">
         <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none" />
         <div className="flex flex-col items-center justify-center gap-0 w-full h-full">
            <QuitControlIcon accent={accent} />
            <div className="text-center pt-4">
               <motion.h2 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-5xl font-[1000] tracking-tighter uppercase leading-tight font-inter">EVERY SECOND <span className="text-accent">COUNTS.</span></motion.h2>
               <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.6em] mt-4 font-inter">RECLAIM CONTROL OF YOUR LIFE.</p>
            </div>
         </div>
      </div>

      {/* RIGHT COLUMN: Premium Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 lg:p-24 relative z-10 bg-[#020202]">
        <div className="w-full max-w-[520px] flex flex-col items-center">
          <div className="bg-neutral-900/40 backdrop-blur-3xl border border-white/5 p-10 lg:p-14 rounded-[56px] shadow-2xl shadow-black/50 relative overflow-hidden font-inter w-full text-center">
             <div className="absolute inset-0 border border-white/[0.02] rounded-[56px] pointer-events-none" />

             {/* REFINED TOGGLE */}
             <div className="relative bg-black/60 border border-white/10 p-1.5 rounded-full flex items-center h-16 w-full mb-10 overflow-hidden font-inter">
                <button onClick={() => setMode('LOGIN')} className={cn("relative flex-1 h-full text-[11px] font-[1000] uppercase tracking-[0.2em] transition-all duration-500 z-20 font-inter", mode === 'LOGIN' ? "text-zinc-950" : "text-white/40 hover:text-white/70")}>Sign In</button>
                <button onClick={() => setMode('REGISTER')} className={cn("relative flex-1 h-full text-[11px] font-[1000] uppercase tracking-[0.2em] transition-all duration-500 z-20 font-inter", mode === 'REGISTER' ? "text-zinc-950" : "text-white/40 hover:text-white/70")}>Sign Up</button>
                <motion.div
                   className="absolute left-1.5 h-[calc(100%-12px)] bg-accent rounded-full shadow-lg"
                   animate={{ x: mode === 'LOGIN' ? 0 : '100%', left: mode === 'LOGIN' ? '6px' : '-6px' }}
                   style={{ width: 'calc(50% - 6px)' }}
                   transition={{ type: 'spring', stiffness: 450, damping: 40 }}
                />
             </div>

             <div className="flex flex-col gap-8 relative z-10 font-inter text-center">
               {msg.c && <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className={cn("p-4 rounded-xl text-center font-black text-[10px] uppercase tracking-widest border", msg.t === 'FAULT' ? "bg-rose-600/10 text-rose-400 border-rose-600/20" : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20")}>{msg.c}</motion.div>}

               <div className="flex flex-col gap-5 text-left font-inter">
                 {mode === 'REGISTER' && <Input label="Full Name" value={n} onChange={setN} isDark />}
                 <Input label="Email Address" type="email" value={e} onChange={setE} isDark />
                 {mode !== 'RESET' && <Input label="Password" type="password" value={p} onChange={setP} isDark />}
               </div>

               {/* PREMIUM MULTI-LAYERED BUTTON */}
               <button
                className="group relative w-full h-20 bg-accent text-zinc-950 font-[1000] uppercase tracking-[0.4em] rounded-2xl active:scale-[0.98] transition-all overflow-hidden flex items-center justify-center text-[12px] mt-4 shadow-accent/20 shadow-xl"
                onClick={handle}
               >
                 <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                 <div className="absolute inset-0 border-t border-white/50 rounded-2xl pointer-events-none" />

                 <span className="relative z-10 flex items-center gap-3">
                   {loading ? <Loader2 className="animate-spin" size={20} /> : (mode === 'LOGIN' ? 'INITIALIZE SYSTEM' : (mode === 'REGISTER' ? 'GENERATE IDENTITY' : 'RESET'))}
                 </span>
               </button>

               <div className="flex flex-col items-center gap-4 mt-2 font-inter">
                 {mode === 'LOGIN' && <button onClick={() => setMode('RESET')} className="text-white/40 uppercase text-[10px] font-black tracking-widest hover:text-accent transition-colors font-inter">Emergency Reset?</button>}
                 {mode === 'RESET' && <button onClick={() => setMode('LOGIN')} className="text-white/40 uppercase text-[10px] font-black tracking-widest hover:text-white transition-colors font-inter">Return to Command</button>}
               </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
});
