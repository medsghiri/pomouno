import Link from 'next/link';
import React from 'react';

interface LogoProps {
  className?: string;
  clickable?: boolean;
  /** size in pixels for width & height */
  size?: number;
  style?: React.CSSProperties;
}

export function Logo({ className = "w-10 h-10", clickable = false, size = 40, style }: LogoProps) {
  const logoSvg = (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none" className={className} style={style}>
      {/* Main timer body */}
      <circle cx="50" cy="50" r="35" fill="#E53935" stroke="#C62828" strokeWidth="4" />

      {/* Clock hands pointing to 1 o'clock */}
      <line x1="50" y1="50" x2="50" y2="32" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
      <line x1="50" y1="50" x2="58" y2="42" stroke="#fff" strokeWidth="3" strokeLinecap="round" />

      {/* Center dot */}
      <circle cx="50" cy="50" r="3" fill="#fff" />
    </svg>
  );

  if (clickable) {
    return (
      <Link href="/" className="hover:opacity-80 transition-opacity">
        {logoSvg}
      </Link>
    );
  }

  return logoSvg;
}