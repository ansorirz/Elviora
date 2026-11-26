import React, { useEffect, useState } from 'react';

interface BrandLogoProps {
  logoUrl?: string | null;
  alt?: string;
  className?: string;
  iconClassName?: string;
}

export function BrandLogo({
  logoUrl,
  alt = 'Logo Elviora',
  className = 'w-10 h-10 rounded-xl',
  iconClassName = 'w-5 h-5',
}: BrandLogoProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [logoUrl]);

  if (logoUrl && !failed) {
    return (
      <div
        className={`${className} overflow-hidden bg-white dark:bg-[#1F2B23] border border-[#EAE4DA] dark:border-[#344639] flex items-center justify-center icon-3d shrink-0`}
      >
        <img
          src={logoUrl}
          alt={alt}
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`${className} bg-accent-gradient flex items-center justify-center icon-3d shrink-0`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className={iconClassName}
      >
        <path
          d="M12 21V11M12 11C12 7.5 14.5 5 18 5C18 8.5 15.5 11 12 11ZM12 11C12 7.5 9.5 5 6 5C6 8.5 8.5 11 12 11Z"
          stroke="#FAF8F4"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M12 16C14.5 16 17 14.5 17 12.5M12 16C9.5 16 7 14.5 7 12.5"
          stroke="#F5EBD0"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
