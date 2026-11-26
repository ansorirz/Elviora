import React from 'react';

interface AmbientBackdropProps {
  theme: 'light' | 'dark';
}

export function AmbientBackdrop({ theme }: AmbientBackdropProps) {
  const isDark = theme === 'dark';
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 -z-10 pointer-events-none overflow-hidden transition-colors duration-500"
      style={{
        background: isDark
          ? 'linear-gradient(135deg, #090D0B 0%, #0D1310 50%, #0A0F0C 100%)'
          : 'linear-gradient(135deg, #FCFBF7 0%, #F7F2E8 50%, #FBF8F3 100%)',
      }}
    >
      {/* Top-left large blurred botanical aura */}
      <div
        className="absolute -top-36 -left-32 w-[560px] h-[560px] rounded-full transition-all duration-700"
        style={{
          background: 'radial-gradient(circle, var(--blob-1) 0%, transparent 70%)',
          filter: 'blur(90px)',
          opacity: isDark ? 0.45 : 1,
        }}
      />

      {/* Top-right warm bloom orb */}
      <div
        className="absolute -top-24 -right-28 w-[520px] h-[520px] rounded-full transition-all duration-700"
        style={{
          background: 'radial-gradient(circle, var(--blob-2) 0%, transparent 70%)',
          filter: 'blur(100px)',
          opacity: isDark ? 0.4 : 1,
        }}
      />

      {/* Center-right soft gold/secondary ambient glow */}
      <div
        className="absolute top-[38%] right-[12%] w-[480px] h-[480px] rounded-full transition-all duration-700"
        style={{
          background: 'radial-gradient(circle, var(--blob-3) 0%, transparent 72%)',
          filter: 'blur(110px)',
          opacity: isDark ? 0.35 : 1,
        }}
      />

      {/* Bottom-left grounding gradient aura */}
      <div
        className="absolute -bottom-40 left-[18%] w-[620px] h-[460px] rounded-full transition-all duration-700"
        style={{
          background: 'radial-gradient(circle, var(--blob-1) 0%, transparent 72%)',
          filter: 'blur(115px)',
          opacity: isDark ? 0.35 : 0.78,
        }}
      />
    </div>
  );
}
