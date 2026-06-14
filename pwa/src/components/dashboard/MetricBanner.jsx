import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/utils';

export const MetricBanner = React.memo(({ m }) => (
  <section className="bg-white/[0.02] rounded-[48px] p-10 border border-white/[0.03] relative overflow-hidden group shadow-2xl font-inter">
    <div className="absolute top-0 right-0 w-80 h-80 bg-accent/5 rounded-full blur-[100px] -mr-40 -mt-40 group-hover:bg-accent/10 transition-all" />
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 relative z-10 font-inter">
      <div className="space-y-3 text-left">
        <h3 className="text-[11px] font-[1000] text-white/70 tracking-[0.6em] uppercase">Daily Allowance</h3>
        <div className="flex items-baseline gap-4">
          <span className="text-7xl font-[1000] tracking-tighter tabular-nums leading-none">
            {Math.max(0, (m.limit || 0) - (m.count || 0))}
          </span>
          <span className="text-sm font-black text-accent uppercase tracking-[0.4em] animate-pulse">Left</span>
        </div>
      </div>
      <div className="flex flex-col md:items-end gap-3 font-inter">
        <div className="flex items-center gap-4">
          <div className="px-5 py-2 rounded-[16px] bg-accent/10 border border-accent/20 text-accent text-[11px] font-[1000] tracking-[0.3em] uppercase shadow-2xl whitespace-nowrap font-inter">
            {m.rank || '...'}
          </div>
          <span className="text-3xl font-[1000] text-white/70 tracking-tighter tabular-nums font-inter">
            {m.xp || 0} <span className="text-sm font-bold opacity-70 uppercase tracking-widest font-inter">XP</span>
          </span>
        </div>
      </div>
    </div>
    <div className="mt-12 w-full h-2 bg-white/[0.03] rounded-full overflow-hidden p-0.5 border border-white/[0.05] shadow-inner">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(1, m.progress || 0) * 100}%` }}
        transition={{ duration: 1.5, type: 'spring' }}
        className={cn(
          "h-full rounded-full transition-all duration-700",
          (m.progress || 0) >= 1 ? "bg-danger shadow-[0_0_20px_rgba(248,113,113,0.8)]" : "bg-accent shadow-[0_0_20px_var(--accent)]"
        )}
      />
    </div>
  </section>
));
