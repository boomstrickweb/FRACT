import React from 'react';

interface BlueskyIconProps {
  className?: string;
  size?: number;
}

export const BlueskyIcon: React.FC<BlueskyIconProps> = ({ className = 'w-5 h-5', size }) => (
  <svg
    viewBox="0 0 568 501"
    className={className}
    width={size}
    height={size}
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M123.121 33.664C188.241 82.5529 258.281 181.68 284 234.873C309.719 181.68 379.759 82.5529 444.879 33.664C491.866 -1.61152 568 -28.8964 568 57.0874C568 74.28 558.12 225.79 552.203 247.078C531.605 321.202 447.882 339.78 376.104 327.758C501.272 349.046 544.757 421.365 487.618 479.529C379.231 589.922 301.996 397.649 284 353.48C266.004 397.649 188.769 589.922 80.382 479.529C23.243 421.365 66.728 349.046 191.896 327.758C120.118 339.78 36.395 321.202 15.797 247.078C9.88 225.79 0 74.28 0 57.0874C0 -28.8964 76.134 -1.61152 123.121 33.664Z" />
  </svg>
);

export default BlueskyIcon;
