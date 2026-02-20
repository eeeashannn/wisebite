import React from 'react';

function BrandLogo() {
  return (
    <svg
      className="brand-logo-svg"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {/* Chef's hat outline style */}
      <path
        d="M16 4c-2 0-4 1.5-4 4v2H8c-1.5 0-3 1.2-3 3v2c0 1.5 1 2.5 2 3v10h18V16c1-.5 2-1.5 2-3v-2c0-1.8-1.5-3-3-3h-4V8c0-2.5-2-4-4-4z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 10h8M14 14h4"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default BrandLogo;
