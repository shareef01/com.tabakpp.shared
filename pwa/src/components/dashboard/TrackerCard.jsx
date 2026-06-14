import React from 'react';
import { motion } from 'framer-motion';
import { Plus, Minus } from 'lucide-react';
import { cn } from '../../utils/utils';
import { SmokingProgress, RingProgress, GenericBarProgress } from '../gauges/Gauges';

export const TrackerCard = React.memo(({ config, count, onInc, onDec, index, globalSize = 'LARGE' }) => {
  const isL = count >= config.limit;
  const isSmall = globalSize === 'SMALL';
  const isMedium = globalSize === 'MEDIUM';
  const isLarge = globalSize === 'LARGE';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05, type: 'spring', damping: 15 }}
      className={cn(
        "bg-white/[0.02] rounded-[56px] border-2 flex flex-col items-center justify-between transition-all duration-700 group relative overflow-hidden shadow-2xl font-inter",
        isLarge ? "min-h-[520px] p-10" : (isMedium ? "min-h-[420px] p-9" : "min-h-[260px] p-6"),
        isL ? "border-danger/30 shadow-[0_0_60px_rgba(248,113,113,0.1)]" : "border-white/[0.03] hover:border-accent/20"
      )}
    >
      {!isSmall && (
        <span className={cn(
          "font-black text-white/70 tracking-[0.4em] uppercase relative z-10 truncate w-full text-center shrink-0",
          isLarge ? "text-[11px]" : "text-[10px]"
        )}>
          Limit: {config.limit}
        </span>
      )}

      <div className={cn(
        "flex-1 w-full flex flex-col items-center justify-center relative z-10 min-h-0",
        isSmall ? "space-y-4" : "space-y-8"
      )}>
        <div className={cn(
          "w-full flex justify-center items-center shrink-0",
          isSmall ? "h-20" : (isMedium ? "h-28" : "h-32")
        )}>
          {config.type === 'CIGARETTE' && <SmokingProgress count={count} limit={config.limit} variant="CIGARETTE" size={globalSize} />}
          {config.type === 'SIMPLE' && <RingProgress count={count} limit={config.limit} size={globalSize} />}
          {config.type === 'JOINT_KING' && <SmokingProgress count={count} limit={config.limit} variant="KING" size={globalSize} />}
          {config.type === 'JOINT_QUEEN' && <SmokingProgress count={count} limit={config.limit} variant="QUEEN" size={globalSize} />}
          {(!['CIGARETTE', 'SIMPLE', 'JOINT_KING', 'JOINT_QUEEN'].includes(config.type)) && <GenericBarProgress count={count} limit={config.limit} size={globalSize} />}
        </div>

        <div className="flex flex-col items-center text-center min-w-0 w-full px-2">
          <motion.span
            key={count}
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={cn(
              "font-[1000] tracking-tighter tabular-nums transition-all duration-700 leading-none shrink-0",
              isLarge ? "text-7xl" : (isMedium ? "text-6xl" : "text-4xl"),
              isL ? "text-danger drop-shadow-[0_0_30px_rgba(248,113,113,0.4)]" : "text-white"
            )}
          >
            {count}
          </motion.span>
          <span className={cn(
            "font-black tracking-[0.4em] uppercase transition-all duration-700 truncate w-full shrink-0",
            isSmall ? "text-[10px] mt-2" : "text-[13px] mt-4",
            isL ? "text-danger" : "text-accent opacity-70 group-hover:opacity-100"
          )}>
            {config.name}
          </span>
        </div>
      </div>

      <div className={cn(
        "w-full flex justify-between items-center relative z-10 px-2 shrink-0",
        isSmall ? "mt-2 pb-1" : "mt-8 pb-2"
      )}>
        <button
          onClick={onDec}
          className={cn(
            "rounded-full bg-white/[0.08] border border-white/10 flex items-center justify-center text-white/50 hover:text-white active:scale-90 transition-all shadow-xl backdrop-blur-md",
            isSmall ? "w-10 h-10" : "w-16 h-16"
          )}
        >
          <Minus size={isSmall ? 20 : 28} strokeWidth={3} />
        </button>
        <button
          onClick={onInc}
          className={cn(
            "rounded-full flex items-center justify-center text-zinc-950 active:scale-90 transition-all backdrop-blur-md",
            isSmall ? "w-10 h-10" : "w-16 h-16",
            isL ? "bg-danger shadow-[0_0_50px_rgba(248,113,113,0.6)]" : "bg-accent shadow-[0_20px_50px_var(--accent-rgb)]"
          )}
          style={{'--accent-rgb': 'rgba(0,210,255,0.4)'}}
        >
          <Plus size={isSmall ? 20 : 28} strokeWidth={4} />
        </button>
      </div>
    </motion.div>
  );
});
