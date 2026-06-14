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
  const isSmall = globalSize === 'SMALL';
  const isMedium = globalSize === 'MEDIUM';
  const isLarge = globalSize === 'LARGE';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05, type: 'spring', damping: 20 }}
      className={cn(
        "bg-neutral-900/40 backdrop-blur-xl border border-white/5 rounded-3xl flex flex-col items-center justify-between transition-all duration-500 group relative overflow-hidden shadow-lg shadow-black/20 font-inter",
        isLarge ? "p-8 min-h-[420px]" : (isMedium ? "p-6 min-h-[340px]" : "p-4 min-h-[240px]"),
        isL ? "border-danger/30" : "hover:border-white/10"
      )}
    >
      {/* Limit Label - Higher contrast */}
      {!isSmall && (
        <span className={cn(
          "font-[1000] text-neutral-500 uppercase tracking-[0.3em] mb-4",
          isLarge ? "text-[11px]" : "text-[10px]"
        )}>
          Limit: {config.limit}
        </span>
      )}

      <div className="flex-1 w-full flex flex-col items-center justify-center space-y-6">
        <div className={cn(
          "w-full flex justify-center items-center",
          isLarge ? "h-32" : (isMedium ? "h-24" : "h-16")
        )}>
          {config.type === 'CIGARETTE' && <SmokingProgress count={count} limit={config.limit} variant="CIGARETTE" size={globalSize} />}
          {config.type === 'SIMPLE' && <RingProgress count={count} limit={config.limit} size={globalSize} />}
          {config.type === 'JOINT_KING' && <SmokingProgress count={count} limit={config.limit} variant="KING" size={globalSize} />}
          {config.type === 'JOINT_QUEEN' && <SmokingProgress count={count} limit={config.limit} variant="QUEEN" size={globalSize} />}
          {(!['CIGARETTE', 'SIMPLE', 'JOINT_KING', 'JOINT_QUEEN'].includes(config.type)) && <GenericBarProgress count={count} limit={config.limit} size={globalSize} />}
        </div>

        <div className="flex flex-col items-center text-center">
          <motion.span
            key={count}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={cn(
              "font-[1000] tracking-tighter tabular-nums leading-none",
              isLarge ? "text-6xl" : (isMedium ? "text-5xl" : "text-3xl"),
              isL ? "text-danger" : "text-white"
            )}
          >
            {count}
          </motion.span>
          <span className={cn(
            "font-black tracking-[0.2em] uppercase transition-colors duration-500 truncate w-full",
            isLarge ? "text-[12px] mt-4" : (isMedium ? "text-[11px] mt-3" : "text-[9px] mt-2"),
            isL ? "text-danger" : "text-accent opacity-80"
          )}>
            {config.name}
          </span>
        </div>
      </div>

      {/* Action Controls - Standardized lines */}
      <div className={cn(
        "w-full flex justify-between items-center border-t border-white/5",
        isLarge ? "mt-8 pt-8" : (isMedium ? "mt-6 pt-6" : "mt-4 pt-4")
      )}>
        <button
          onClick={onDec}
          className={cn(
            "rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-neutral-400 hover:text-white active:scale-90 transition-all",
            isSmall ? "w-10 h-10" : "w-12 h-12"
          )}
        >
          <Minus size={isSmall ? 16 : 20} strokeWidth={3} />
        </button>
        <button
          onClick={onInc}
          className={cn(
            "rounded-xl flex items-center justify-center active:scale-90 transition-all shadow-xl",
            isSmall ? "w-10 h-10" : "w-12 h-12",
            isL ? "bg-danger text-zinc-950" : "bg-accent text-zinc-950"
          )}
        >
          <Plus size={isSmall ? 16 : 20} strokeWidth={4} />
        </button>
      </div>
    </motion.div>
  );
});
