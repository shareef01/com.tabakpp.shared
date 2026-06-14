import React from 'react';
import { motion } from 'framer-motion';
import { Plus, Minus } from 'lucide-react';
import { cn } from '../../utils/utils';
import { SmokingProgress, RingProgress, GenericBarProgress } from '../gauges/Gauges';

/**
 * Performance Optimized TrackerCard
 * Redesigned for clean lines and perfect grid alignment.
 */
export const TrackerCard = React.memo(({ config, count, onInc, onDec, index, globalSize = 'LARGE' }) => {
  const isL = count >= config.limit;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05, type: 'spring', damping: 20 }}
      className={cn(
        "bg-neutral-900/40 backdrop-blur-xl border border-white/5 rounded-3xl flex flex-col items-center justify-between transition-all duration-500 group relative overflow-hidden shadow-lg shadow-black/20 p-6 min-h-[340px]",
        isL ? "border-danger/30" : "hover:border-white/10"
      )}
    >
      {/* Limit Label - Higher contrast */}
      <span className="text-[10px] font-[1000] text-neutral-500 uppercase tracking-[0.3em] mb-4">
        Limit: {config.limit}
      </span>

      <div className="flex-1 w-full flex flex-col items-center justify-center space-y-6">
        <div className="w-full flex justify-center items-center h-24">
          {config.type === 'CIGARETTE' && <SmokingProgress count={count} limit={config.limit} variant="CIGARETTE" size="SMALL" />}
          {config.type === 'SIMPLE' && <RingProgress count={count} limit={config.limit} size="MEDIUM" />}
          {config.type === 'JOINT_KING' && <SmokingProgress count={count} limit={config.limit} variant="KING" size="SMALL" />}
          {config.type === 'JOINT_QUEEN' && <SmokingProgress count={count} limit={config.limit} variant="QUEEN" size="SMALL" />}
          {(!['CIGARETTE', 'SIMPLE', 'JOINT_KING', 'JOINT_QUEEN'].includes(config.type)) && <GenericBarProgress count={count} limit={config.limit} size="SMALL" />}
        </div>

        <div className="flex flex-col items-center text-center">
          <motion.span
            key={count}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={cn(
              "font-[1000] tracking-tighter tabular-nums leading-none text-5xl",
              isL ? "text-danger" : "text-white"
            )}
          >
            {count}
          </motion.span>
          <span className={cn(
            "text-[11px] font-black tracking-[0.2em] uppercase mt-3 transition-colors duration-500",
            isL ? "text-danger" : "text-accent opacity-80"
          )}>
            {config.name}
          </span>
        </div>
      </div>

      {/* Action Controls - Standardized lines */}
      <div className="w-full flex justify-between items-center mt-6 pt-6 border-t border-white/5">
        <button
          onClick={onDec}
          className="w-12 h-12 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-neutral-400 hover:text-white active:scale-90 transition-all"
        >
          <Minus size={20} strokeWidth={3} />
        </button>
        <button
          onClick={onInc}
          className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center active:scale-90 transition-all shadow-xl",
            isL ? "bg-danger text-zinc-950" : "bg-accent text-zinc-950"
          )}
        >
          <Plus size={20} strokeWidth={4} />
        </button>
      </div>
    </motion.div>
  );
});
