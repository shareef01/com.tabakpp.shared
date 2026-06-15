import React from 'react';
import { motion } from 'framer-motion';
import { Plus, Minus } from 'lucide-react';
import { cn } from '../../utils/utils';
import { SmokingProgress, RingProgress, GenericBarProgress } from '../gauges/Gauges';
import { UI } from '../Common';

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
        UI.CARD,
        isLarge ? "p-6 min-h-[380px]" : (isMedium ? "p-5 min-h-[320px]" : "p-4 min-h-[220px]"),
        isL ? "border-danger/30" : "hover:border-white/10"
      )}
    >
      {/* Limit Label */}
      {!isSmall && (
        <span className={cn(
          UI.LABEL,
          "mb-3 text-center w-full",
          isLarge ? "text-[10px]" : "text-[9px]"
        )}>
          Limit: {config.limit}
        </span>
      )}

      <div className="flex-1 flex flex-col items-center justify-center gap-4 w-full">
        <div className={cn(
          "flex items-center justify-center w-full",
          isLarge ? "h-28" : (isMedium ? "h-20" : "h-14")
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
              isLarge ? "text-5xl" : (isMedium ? "text-4xl" : "text-3xl"),
              isL ? "text-danger" : "text-white"
            )}
          >
            {count}
          </motion.span>
          <span className={cn(
            "font-black tracking-[0.2em] uppercase transition-colors duration-500 truncate w-full",
            isLarge ? "text-[12px] mt-3" : (isMedium ? "text-[10px] mt-2" : "text-[9px] mt-1"),
            isL ? "text-danger" : "text-accent opacity-80"
          )}>
            {config.name}
          </span>
        </div>
      </div>

      {/* Action Controls */}
      <div className={cn(
        "flex items-center justify-between w-full border-t border-white/5",
        isLarge ? "mt-6 pt-6" : (isMedium ? "mt-4 pt-4" : "mt-3 pt-3")
      )}>
        <button
          onClick={onDec}
          className={cn(
            "rounded-xl border border-white/5 bg-white/5 flex items-center justify-center text-neutral-400 transition-all hover:text-white active:scale-90",
            isSmall ? "h-10 w-10" : "h-12 w-12"
          )}
        >
          <Minus size={isSmall ? 16 : 20} strokeWidth={3} />
        </button>
        <button
          onClick={onInc}
          className={cn(
            "rounded-xl flex items-center justify-center transition-all active:scale-90 shadow-xl",
            isSmall ? "h-10 w-10" : "h-12 w-12",
            isL ? "bg-danger text-zinc-950" : "bg-accent text-zinc-950"
          )}
        >
          <Plus size={isSmall ? 16 : 20} strokeWidth={4} />
        </button>
      </div>
    </motion.div>
  );
});
