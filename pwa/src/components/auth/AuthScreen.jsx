import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { Input } from '../Common';
import { cn } from '../../utils/utils';

/**
 * Optimized BurningCigarette
 * Uses will-change hints for smoke particles and ember dynamics.
 */
const BurningCigarette = React.memo(() => {
  const smokeParticles = useMemo(() => [...Array(8)], []);

  return (
    <div className="relative flex flex-col items-center justify-center pointer-events-none select-none">
       <div className="relative w-[300px] md:w-[480px] h-10 md:h-12 rounded-full border-2 border-white/5 bg-black/20 flex items-center shadow-2xl overflow-hidden backdrop-blur-sm">
          <div className="absolute h-full bg-gradient-to-r from-zinc-400 via-white to-zinc-100" style={{ width: '72%', right: '28%' }} />
          <div className="absolute right-0 h-full w-[28%] border-l-2 bg-gradient-to-b from-[#f59e0b] via-[#ea580c] to-[#d97706] border-black/20" />
          <motion.div
            animate={{ x: [-1, 1, -1] }}
            transition={{ duration: 0.2, repeat: Infinity }}
            className="absolute h-full w-2.5 bg-gradient-to-r from-orange-600 via-red-600 to-orange-500 shadow-[0_0_40px_red] z-20 will-change-transform"
            style={{ right: 'calc(28% + 72% - 1.5px)' }}
          />
       </div>
       <motion.div
         animate={{ opacity: [0.2, 0.5, 0.2] }}
         transition={{ duration: 3, repeat: Infinity }}
         className="absolute w-[500px] h-[250px] bg-orange-600/10 rounded-full blur-[100px] will-change-opacity"
       />
       <div className="absolute -top-[400px] left-0">
          {smokeParticles.map((_, i) => (
            <motion.div
              key={i}
              initial={{ y: 300, opacity: 0, scale: 0.5 }}
              animate={{ y: -200, opacity: [0, 0.2, 0], scale: [0.5, 4, 6], x: [0, 50, -50, 20] }}
              transition={{ duration: 6, repeat: Infinity, delay: i * 0.9 }}
              className="absolute w-32 h-32 bg-white/[0.03] rounded-full blur-[80px] will-change-[transform,opacity]"
            />
          ))}
       </div>
    </div>
  );
});

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
         <h1 className="text-4xl lg:text-5xl font-[1000] tracking-tighter uppercase leading-none whitespace-nowrap">
           TABAK<span className="text-accent">++</span>
         </h1>
         <span className="text-[9px] font-black text-white/70 tracking-[1em] uppercase mt-4 block font-inter">Quit Control System</span>
      </div>

      <div className="hidden lg:flex flex-1 flex-col items-center justify-center bg-black relative border-r border-white/[0.03]">
         <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none" />
         <div className="flex-1 w-full flex flex-col items-center justify-center gap-0">
            <BurningCigarette />
            <div className="text-center pt-2">
               <motion.h2 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-5xl font-[1000] tracking-tighter uppercase leading-tight font-inter">
                 EVERY SECOND <span className="text-accent">COUNTS.</span>
               </motion.h2>
               <p className="text-white/70 text-[10px] font-black uppercase tracking-[0.6em] mt-2 font-inter">RECLAIM CONTROL OF YOUR LIFE.</p>
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
                <motion.div
                   className="absolute left-1 h-[calc(100%-8px)] bg-accent rounded-full shadow-[0_15px_40px_rgba(212,255,50,0.5)]"
                   animate={{ x: mode === 'LOGIN' ? 0 : '100%', left: mode === 'LOGIN' ? '4px' : '-4px' }}
                   style={{ width: 'calc(50% - 4px)' }}
                   transition={{ type: 'spring', stiffness: 450, damping: 40 }}
                />
             </div>

             <div className="space-y-12 relative z-10 text-center font-inter">
               {msg.c && <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className={cn("p-6 rounded-[24px] text-center font-black text-[10px] uppercase tracking-widest border", msg.t === 'FAULT' ? "bg-danger/10 text-danger border-danger/20" : "bg-accent/10 text-accent border border-accent/20")}>{msg.c}</motion.div>}
               <div className="space-y-8 flex flex-col items-center font-inter">
                 {mode === 'REGISTER' && <Input label="Full Name" value={n} onChange={setN} isDark className="w-full text-center" />}
                 <Input label="Email Address" type="email" value={e} onChange={setE} isDark className="w-full text-center" />
                 {mode !== 'RESET' && <Input label="Password" type="password" value={p} onChange={setP} isDark className="w-full text-center" />}
               </div>
               <button
                className="w-full h-24 bg-accent text-zinc-950 font-[1000] uppercase tracking-[0.5em] rounded-[36px] active:scale-95 transition-all shadow-[0_40px_80px_rgba(212,255,50,0.4)] flex items-center justify-center text-sm font-inter"
                onClick={handle}
               >
                 {loading ? <Loader2 className="animate-spin" size={24} /> : (mode === 'LOGIN' ? 'Sign In' : (mode === 'REGISTER' ? 'Sign Up' : 'Reset'))}
               </button>
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
});
