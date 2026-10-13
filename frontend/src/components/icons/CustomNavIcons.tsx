import React from 'react';

export interface CustomNavIconProps {
  className?: string;
  solid?: boolean;
  strokeWidth?: number | string;
}

/**
 * KaLogoIcon (Official Rokad Ka Platform Logo)
 * - Solid mode: ka-logo-fill.svg (geometric filled grid blocks)
 * - Outline mode: ka-logo-outline.svg (clean geometric outline boundary)
 */
export const KaLogoIcon: React.FC<CustomNavIconProps> = ({
  className = 'h-6 w-6 shrink-0',
  solid = false,
  strokeWidth = 0.8,
}) => {
  if (solid) {
    return (
      <svg
        viewBox="0 0 109 80"
        className={`${className} scale-[1.0] origin-center fill-current transition-all`}
        aria-hidden="true"
      >
        <path d="M77.3937 16L61.5906 16V0L77.3937 1.39876e-06V16Z" fill="currentColor" />
        <path d="M93.1969 32H77.3937V16L93.1969 16L93.1969 32Z" fill="currentColor" />
        <path d="M109 48H93.1969V32L109 32V48Z" fill="currentColor" />
        <path d="M93.1969 64L77.3937 64L77.3937 48L93.1969 48V64Z" fill="currentColor" />
        <path d="M77.3937 80H61.5906V64H77.3937V80Z" fill="currentColor" />
        <path d="M31.6063 64H47.4094V80H31.6063V64Z" fill="currentColor" />
        <path d="M15.8031 48H31.6063V64H15.8031V48Z" fill="currentColor" />
        <path d="M0 32H15.8031V48H0V32Z" fill="currentColor" />
        <path d="M15.8031 16H31.6063V32H15.8031V16Z" fill="currentColor" />
        <path d="M31.6063 4.19629e-06H47.4094V16H31.6063V4.19629e-06Z" fill="currentColor" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 109 80"
      className={`${className} scale-[1.18] origin-center fill-none stroke-current transition-all`}
      aria-hidden="true"
    >
      <path
        d="M76.8936 64.5V79.5H62.0908V64.5H76.8936ZM46.9092 64.5V79.5H32.1064V64.5H46.9092ZM92.6973 48.5V63.5H77.8936V48.5H92.6973ZM31.1064 48.5V63.5H16.3027V48.5H31.1064ZM108.5 32.5V47.5H93.6973V32.5H108.5ZM15.3027 32.5V47.5H0.5V32.5H15.3027ZM92.6973 16.5V31.5H77.8936V16.5H92.6973ZM31.1064 16.5V31.5H16.3027V16.5H31.1064ZM76.8936 0.5V15.5H62.0908V0.5H76.8936ZM46.9092 0.5V15.5H32.1064V0.5H46.9092Z"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
};

// Aliased as CoinStackIcon for backward compatibility
export const CoinStackIcon = KaLogoIcon;
