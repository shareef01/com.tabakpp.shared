import React from 'react';
import { motion } from 'framer-motion';
import { HeartPulse } from 'lucide-react';
import { cn } from '../../utils/utils';

/**
 * High-Fidelity Cigarette Gauges
 * Reverted to width-based logic for specific visual behavior.
 * Optimized with transition-all for smooth layout-based animations.
 */
export const SmokingProgress = React.memo(({ count, limit, variant, size = 'LARGE' }) => {
  const isL = count >= limit;
  const tobaccoPct = Math.max(0, 1 - (count / limit));
  const isJoint = variant === 'KING' || variant === 'QUEEN';
  const isSmall = size === 'SMALL';
  const isMedium = size === 'MEDIUM';

  return (
    <div className={cn(
      "relative rounded-full overflow-hidden border-2 transition-all duration-1000 flex items-center shadow-2xl",
      isSmall ? "h-8 w-40" : (isMedium ? "h-9 w-48" : "h-11 w-56"),
      variant === 'KING' && "w-64",
      variant === 'QUEEN' && "w-52",
      isL ? "bg-danger border-danger shadow-[0_0_50px_rgba(255,0,0,0.6)]" : "bg-white/[0.03] border-white/10"
    )}>
      {!isL && (
        <div
          className={cn(
            "absolute h-full transition-all duration-1000 ease-out",
            isJoint ? "bg-gradient-to-r from-white/80 to-white" : "bg-white shadow-[0_0_20px_white]"
          )}
          style={{ width: `${tobaccoPct * 72}%`, right: '28%' }}
        />
      )}
      {!isL && count > 0 && (
        <div
          className="absolute h-full w-3 bg-danger shadow-[0_0_25px_red] z-20 transition-all duration-1000 ease-out"
          style={{ right: `calc(28% + ${tobaccoPct * 72}% - 1.5px)` }}
        />
      )}
      <div className={cn(
        "absolute right-0 h-full w-[28%] border-l-2 transition-all duration-1000",
        isL ? "bg-danger border-white/20" : (isJoint ? "bg-[#2a2a2e] border-white/5" : "bg-[#f59e0b] border-black/20")
      )} />
    </div>
  );
});

/**
 * Performance Optimized Circular Gauge
 */
export const RingProgress = React.memo(({ count, limit, size = 'LARGE' }) => {
  const isL = count >= limit;
  const progress = Math.min(1, count / limit);
  const isSmall = size === 'SMALL';
  const isMedium = size === 'MEDIUM';

  return (
    <div className={cn(
      "relative flex items-center justify-center shadow-2xl rounded-full transition-all duration-500 will-change-transform",
      isSmall ? "w-20 h-20" : (isMedium ? "w-24 h-24" : "w-32 h-32")
    )}>
      <svg className="absolute inset-0 w-full h-full -rotate-90 overflow-visible p-1.5" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-white/[0.03]" />
        <motion.circle
          cx="50" cy="50" r="42"
          stroke="currentColor"
          strokeWidth="10"
          fill="transparent"
          strokeDasharray="264"
          initial={{ strokeDashoffset: 264 }}
          animate={{ strokeDashoffset: 264 - (progress * 264) }}
          transition={{ duration: 1, ease: "easeOut" }}
          className={cn("transition-colors duration-1000 will-change-[stroke-dashoffset]", isL ? "text-danger" : "text-accent")}
          strokeLinecap="round"
        />
      </svg>
      <HeartPulse
        size={isSmall ? 16 : (isMedium ? 20 : 24)}
        className={cn("transition-all duration-1000 will-change-transform", isL ? "text-danger scale-110" : "text-accent animate-pulse")}
      />
    </div>
  );
});

/**
 * Performance Optimized Linear Bar
 */
export const GenericBarProgress = React.memo(({ count, limit, size = 'LARGE' }) => {
  const isL = count >= limit;
  const progress = Math.min(1, count / limit);
  const isSmall = size === 'SMALL';
  const isMedium = size === 'MEDIUM';

  return (
    <div className={cn(
      "rounded-full overflow-hidden border-2 p-1.5 transition-all duration-1000 shadow-2xl will-change-[background-color,border-color]",
      isSmall ? "h-9 w-40" : (isMedium ? "h-10 w-48" : "h-11 w-56"),
      isL ? "bg-danger/20 border-danger" : "bg-white/[0.03] border-white/10"
    )}>
      <motion.div
        initial={false}
        animate={{ scaleX: progress }}
        transition={{ duration: 1, ease: "easeOut" }}
        className={cn(
          "h-full rounded-full origin-left will-change-transform transition-colors duration-1000",
          isL ? "bg-danger shadow-[0_0_30px_red]" : "bg-accent shadow-[0_0_20px_var(--accent)]"
        )}
        style={{ width: '100%' }}
      />
    </div>
  );
});
