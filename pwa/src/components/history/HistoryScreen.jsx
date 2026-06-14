import React from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Wallet, Activity, Edit2, Trash2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { db } from '../../firebase';
import { doc, deleteDoc } from 'firebase/firestore';
import { Card, StaggeredItem } from '../Common';
import { cn } from '../../utils/utils';

/**
 * Premium Metric Block
 * High-fidelity stat cards with glassmorphism.
 */
const InsightCard = React.memo(({ icon: Icon, label, val, sub, color }) => (
  <div className="bg-neutral-900/40 backdrop-blur-xl border border-white/5 p-6 rounded-2xl flex flex-col items-center justify-center text-center shadow-lg transition-all hover:border-white/10 group h-full">
     <div className={cn("p-3 rounded-xl bg-white/5 mb-4 shadow-inner border border-white/10 group-hover:scale-110 transition-transform duration-500", color)}>
       <Icon size={20} />
     </div>
     <span className="text-3xl font-[1000] tracking-tighter tabular-nums mb-1 text-white leading-none">
       {val}
     </span>
     <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">
       {sub}
     </span>
     <div className="mt-4 pt-4 border-t border-white/5 w-full text-[9px] font-black uppercase tracking-[0.4em] text-accent opacity-60">
       {label}
     </div>
  </div>
));

export const HistoryScreen = React.memo(({ logs, m, onEdit, userId, today }) => {
  const onDelete = async (logDate) => {
    if (window.confirm("Purge record?")) {
      try {
        await deleteDoc(doc(db, 'users', userId, 'logs', logDate));
      } catch (e) {
        alert(e.message);
      }
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto px-4 lg:px-8 space-y-8 font-inter pb-24">

       {/* CHART SECTION: Full Width Desktop Header */}
       <section className="bg-neutral-900/40 backdrop-blur-xl border border-white/5 p-8 lg:p-10 rounded-[32px] shadow-xl">
         <div className="flex justify-between items-center mb-10">
           <div className="space-y-1">
             <h3 className="text-[10px] font-black text-neutral-500 tracking-[0.4em] uppercase">Trends</h3>
             <span className="text-2xl font-[1000] tracking-tighter uppercase text-white">Daily Velocity</span>
           </div>
           <div className="p-3 bg-accent/10 rounded-xl text-accent border border-accent/20">
             <BarChart3 size={24} strokeWidth={2.5} />
           </div>
         </div>

         <div className="h-64 lg:h-80 w-full max-h-80">
           <ResponsiveContainer width="100%" height="100%">
             <LineChart data={logs.slice(0, 10).reverse().map(l => ({
               name: new Date(l.logDate).toLocaleDateString(undefined, {weekday:'short'}).toUpperCase(),
               val: Object.values(l.counts || {}).reduce((a,b)=>a+b, 0)
             }))}>
               <CartesianGrid strokeDasharray="8 8" stroke="#ffffff03" vertical={false} />
               <XAxis dataKey="name" stroke="#525252" fontSize={10} axisLine={false} tickLine={false} tick={{fontWeight:900}} dy={15} />
               <Tooltip contentStyle={{ background: '#121212', border: '1px solid #ffffff10', borderRadius: '16px', fontSize: '12px', fontWeight: 900 }} />
               <Line type="monotone" dataKey="val" stroke="var(--accent)" strokeWidth={6} dot={{ r: 6, fill: 'var(--accent)', strokeWidth: 4, stroke: '#0a0a0c' }} activeDot={{ r: 8, strokeWidth: 0 }} animationDuration={1500} />
             </LineChart>
           </ResponsiveContainer>
         </div>
       </section>

       <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

         {/* STATS COLUMN: Left on Desktop, Grid on Mobile */}
         <div className="lg:col-span-4 grid grid-cols-3 lg:grid-cols-1 gap-4 lg:gap-6">
           <InsightCard icon={TrendingUp} label="Streak" val={m.streak} sub="Days" color="text-amber-400" />
           <InsightCard icon={Wallet} label="Saved" val={`$${(m.savings || 0).toFixed(2)}`} sub="Capital" color="text-emerald-400" />
           <InsightCard icon={Activity} label="Health" val={`${Math.floor((m.lost || 0)/60)}H`} sub="Recovered" color="text-rose-400" />
         </div>

         {/* FEED COLUMN: Right on Desktop, Full Width Mobile */}
         <div className="lg:col-span-8 bg-neutral-900/40 backdrop-blur-xl border border-white/5 p-8 lg:p-10 rounded-[32px] shadow-xl">
           <h4 className="text-[10px] font-black text-neutral-500 tracking-[0.4em] uppercase mb-8">Registry Feed</h4>
           <div className="space-y-4">
             {logs.length > 0 ? logs.map((log, i) => (
               <div key={log.logDate} className="flex items-center justify-between p-5 bg-black/20 rounded-2xl border border-white/5 hover:border-white/10 transition-all group">
                 <div className="flex flex-col gap-1">
                   <span className="text-sm font-bold text-white uppercase tracking-tight">
                     {log.logDate === today ? 'Today' : new Date(log.logDate).toLocaleDateString(undefined, {month:'short', day:'numeric', weekday:'short'}).toUpperCase()}
                   </span>
                   <span className="text-[10px] font-black text-accent/60 uppercase tracking-widest">
                     {Object.values(log.counts || {}).reduce((a,b)=>a+b, 0) } Registry Units
                   </span>
                 </div>
                 <div className="flex items-center gap-2">
                   <button onClick={() => onEdit(log)} className="p-3 rounded-lg text-neutral-500 hover:text-white hover:bg-white/5 transition-all">
                     <Edit2 size={18} />
                   </button>
                   <button onClick={() => onDelete(log.logDate)} className="p-3 rounded-lg text-neutral-500 hover:text-rose-500 hover:bg-rose-500/5 transition-all">
                     <Trash2 size={18} />
                   </button>
                 </div>
               </div>
             )) : (
               <div className="py-20 text-center text-neutral-600 uppercase text-[10px] font-black tracking-[0.5em] border-2 border-dashed border-white/5 rounded-3xl">
                 No active records
               </div>
             )}
           </div>
         </div>
       </div>
    </motion.div>
  );
});
