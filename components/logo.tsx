export function Logo({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg width="40" height="40" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none" className={className}>
      {/* Main tomato body */}
      <circle cx="50" cy="50" r="35" fill="#E53935" stroke="#C62828" strokeWidth="4" />

      {/* Larger green leafy top - made bigger and more prominent */}
      {/* <path d="M30 12 C35 2, 42 5, 50 10 C58 5, 65 2, 70 12 C65 10, 58 7, 50 12 C42 7, 35 10, 30 12 Z" fill="#66BB6A" />*/}
      {/* <path d="M35 18 C38 15, 45 13, 50 16 C55 13, 62 15, 65 18 C62 21, 55 18, 50 21 C45 18, 38 21, 35 18 Z" fill="#4CAF50" /> */}
      {/* <path d="M40 24 C42 22, 47 21, 50 23 C53 21, 58 22, 60 24 C58 26, 53 24, 50 26 C47 24, 42 26, 40 24 Z" fill="#388E3C" /> */}

      {/* Clock hands pointing to 1 o'clock */}
      <line x1="50" y1="50" x2="50" y2="32" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
      <line x1="50" y1="50" x2="58" y2="42" stroke="#fff" strokeWidth="3" strokeLinecap="round" />

      {/* Center dot */}
      <circle cx="50" cy="50" r="3" fill="#fff" />
    </svg>
  );
}