import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, TrendingUp, Wallet, Activity, Edit2, Trash2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { db } from '../../firebase';
import { doc, deleteDoc } from 'firebase/firestore';
import { Card, StaggeredItem } from '../Common';

const InsightCard = React.memo(({ icon: Icon, label, val, sub, color }) => (
  <Card className="p-6 lg:p-8 bg-white/[0.02] border border-white/[0.03] flex flex-col items-center justify-center text-center shadow-2xl rounded-[40px] group hover:border-accent/20 transition-all duration-700 min-h-[220px] lg:min-h-[240px] font-inter">
     <div className={cn("p-3 rounded-[16px] bg-white/[0.05] mb-4 shadow-inner border border-white/10 group-hover:scale-110 transition-transform duration-700", color)}><Icon size={24} /></div>
     <span className="text-4xl lg:text-5xl font-[1000] tracking-tighter tabular-nums mb-1 font-inter group-hover:text-white transition-colors leading-none">{val}</span>
     <span className="text-[11px] font-black text-white/80 uppercase tracking-[0.3em] font-inter group-hover:text-white">{sub}</span>
     <div className="mt-6 pt-6 border-t border-white/[0.1] w-full text-[10px] font-[1000] uppercase tracking-[0.8em] text-accent opacity-70 font-inter group-hover:opacity-100">{label}</div>
  </Card>
));

// Internal utility since we need it in InsightCard
const cn = (...classes) => classes.filter(Boolean).join(' ');

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
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-12 font-inter">
       <Card className="p-12 bg-white/[0.02] border border-white/[0.03] rounded-[48px] shadow-2xl font-inter">
         <div className="flex justify-between items-start mb-12 text-left font-inter">
           <div className="space-y-2 text-left font-inter">
             <h3 className="text-[10px] font-black text-white/60 tracking-[0.8em] uppercase font-inter">History</h3>
             <span className="text-3xl font-[1000] tracking-tighter uppercase font-inter font-black">Daily Logs</span>
           </div>
           <div className="p-4 bg-accent/10 rounded-[20px] text-accent">
             <BarChart3 size={32} strokeWidth={2.5} />
           </div>
         </div>

         <div className="h-72 w-full">
           <ResponsiveContainer width="100%" height="100%">
             <LineChart data={logs.slice(0, 7).reverse().map(l => ({
               name: new Date(l.logDate).toLocaleDateString(undefined, {weekday:'short'}).toUpperCase(),
               val: Object.values(l.counts || {}).reduce((a,b)=>a+b, 0)
             }))}>
               <CartesianGrid strokeDasharray="8 8" stroke="#ffffff03" vertical={false} />
               <XAxis dataKey="name" stroke="#6b7280" fontSize={10} axisLine={false} tickLine={false} tick={{fontWeight:900}} dy={15} />
               <Tooltip contentStyle={{ background: '#121316', border: 'none', borderRadius: '24px', fontSize: '12px' }} />
               <Line type="monotone" dataKey="val" stroke="var(--accent)" strokeWidth={8} dot={{ r: 8, fill: 'var(--accent)', strokeWidth: 5, stroke: '#0a0a0c' }} animationDuration={2000} />
             </LineChart>
           </ResponsiveContainer>
         </div>
       </Card>

       <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
         <InsightCard icon={TrendingUp} label="Streak" val={m.streak} sub="Days" color="text-amber-400" />
         <InsightCard icon={Wallet} label="Saved" val={`$${(m.savings || 0).toFixed(2)}`} sub="Capital" color="text-emerald-400" />
         <InsightCard icon={Activity} label="Health" val={`${Math.floor((m.lost || 0)/60)}H`} sub="Recovered" color="text-rose-400" />
       </div>

       <div className="space-y-8 pt-12 text-left font-inter">
         <h4 className="text-[10px] font-black text-white/50 tracking-[1em] uppercase px-4 text-left font-inter">Recent Feed</h4>
         {logs.map((log, i) => (
           <StaggeredItem key={log.logDate} index={i}>
             <div className="bg-white/[0.02] p-10 rounded-[48px] border border-white/[0.03] flex items-center justify-between group hover:border-accent/20 transition-all shadow-2xl font-inter">
               <div className="flex flex-col gap-3 text-left font-inter">
                 <span className="text-2xl font-[1000] tracking-tighter uppercase leading-none font-inter">
                   {log.logDate === today ? 'Today' : new Date(log.logDate).toLocaleDateString(undefined, {month:'short', day:'numeric', weekday:'long'})}
                 </span>
                 <span className="text-[11px] font-black text-white/60 uppercase tracking-[0.4em] flex items-center gap-3 font-inter">
                   {Object.values(log.counts || {}).reduce((a,b)=>a+b, 0) } units
                 </span>
               </div>
               <div className="flex items-center gap-4">
                 <button onClick={() => onEdit(log)} className="p-5 rounded-[22px] bg-white/[0.03] border border-white/[0.05] hover:text-accent transition-all shadow-xl font-inter">
                   <Edit2 size={24} />
                 </button>
                 <button onClick={() => onDelete(log.logDate)} className="p-5 rounded-[22px] bg-white/[0.03] border border-white/[0.05] hover:text-danger transition-all shadow-xl font-inter">
                   <Trash2 size={24} />
                 </button>
               </div>
             </div>
           </StaggeredItem>
         ))}
       </div>
    </motion.div>
  );
});
