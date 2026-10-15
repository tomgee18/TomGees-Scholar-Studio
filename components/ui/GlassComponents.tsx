
import React from 'react';

// A glass-morphic card container
// Fixed: Made children optional to prevent TS error "Property 'children' is missing" when using JSX nesting
export const GlassCard = ({ children, className = "" }: { children?: React.ReactNode, className?: string }) => (
  <div className={`backdrop-blur-xl bg-obsidian/60 border border-white/10 rounded-xl shadow-lg ${className}`}>
    {children}
  </div>
);

// Primary action button with Cyber Lime glow
export const PrimaryButton = ({ onClick, children, disabled = false, className = "" }: any) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`
      relative group overflow-hidden px-6 py-2 rounded-lg font-medium text-black
      bg-cyberLime transition-all duration-300
      hover:shadow-glow-lime hover:scale-[1.02] active:scale-[0.98]
      disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none
      ${className}
    `}
  >
    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
    <span className="relative z-10 flex items-center gap-2">{children}</span>
  </button>
);

// Secondary ghost button
export const GhostButton = ({ onClick, children, className = "" }: any) => (
  <button
    onClick={onClick}
    className={`
      px-4 py-2 rounded-lg text-white/70 hover:text-white 
      hover:bg-white/5 border border-transparent hover:border-white/10
      transition-all duration-200
      ${className}
    `}
  >
    {children}
  </button>
);

// Input field with glass style
export const GlassInput = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    {...props}
    className={`
      w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 
      text-gray-200 placeholder-gray-500 outline-none
      focus:border-cyberLime/50 focus:bg-white/10 transition-all duration-200
      ${props.className || ''}
    `}
  />
);

// Textarea with glass style
export const GlassTextarea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea
    {...props}
    className={`
      w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 
      text-gray-200 placeholder-gray-500 outline-none
      focus:border-cyberLime/50 focus:bg-white/10 transition-all duration-200
      ${props.className || ''}
    `}
  />
);

// Badge component
// Fixed: Made children optional for consistency
export const Badge = ({ children, color = 'lime' }: { children?: React.ReactNode, color?: 'lime' | 'violet' }) => {
  const styles = color === 'lime' 
    ? 'bg-cyberLime/10 text-cyberLime border-cyberLime/20' 
    : 'bg-deepViolet/10 text-deepViolet border-deepViolet/20';
  
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border ${styles} font-mono uppercase tracking-wider`}>
      {children}
    </span>
  );
};