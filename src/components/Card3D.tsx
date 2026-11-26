import React, { useRef, useState } from 'react';

interface Card3DProps {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number;
}

export function Card3D({ children, className = '', maxTilt = 5 }: Card3DProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, gx: 50, gy: 50, active: false });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const ry = (px - 0.5) * maxTilt * 2;
    const rx = (0.5 - py) * maxTilt * 2;
    setTilt({
      rx,
      ry,
      gx: Math.round(px * 100),
      gy: Math.round(py * 100),
      active: true,
    });
  };

  const handleMouseLeave = () => {
    setTilt((prev) => ({ ...prev, rx: 0, ry: 0, active: false }));
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: tilt.active
          ? `perspective(950px) rotateX(${tilt.rx.toFixed(2)}deg) rotateY(${tilt.ry.toFixed(2)}deg) translateY(-2px)`
          : 'perspective(950px) rotateX(0deg) rotateY(0deg) translateY(0px)',
        transition: tilt.active
          ? 'transform 90ms cubic-bezier(0.16, 1, 0.3, 1)'
          : 'transform 260ms cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      className={`relative overflow-hidden will-change-transform ${className}`}
    >
      {/* Dynamic 3D Specular Sheen Layer */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 transition-opacity duration-200"
        style={{
          opacity: tilt.active ? 1 : 0,
          background: `radial-gradient(circle 180px at ${tilt.gx}% ${tilt.gy}%, rgba(255,255,255,0.18), transparent 70%)`,
        }}
      />
      {children}
    </div>
  );
}
