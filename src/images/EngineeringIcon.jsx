import React from 'react';

const EngineeringIcon = ({ color, position, dimLimit }) => {
  const dimBalancer = dimLimit;
  // width={dimBalancer * 0.856}
  return (
    <svg width={dimBalancer} height={dimBalancer} viewBox="0 0 85.98 100.47" transform={`translate(${position} 0)`}>
      <polygon points="0.84 99.97 18.96 99.97 28.14 81.73 40.57 80.18 34.45 56.34 10.97 62.78 14.85 74.16 0.84 99.97" fill={color} stroke="#000" /><polygon points="77.85 4.78 54.91 45.16 40.57 46.7 33.02 32.96 39.02 23.05 23.68 23.05 14.05 40.99 20.7 54.55 38.93 50.36 43.48 68.49 59.75 65.1 85.4 18.24 77.85 4.78" fill={color} stroke="#000" /><polygon points="46.01 11.51 52.68 0.5 35.79 0.5 29.88 11.51 46.01 11.51" fill={color} stroke="#000" /><polygon points="25.93 18.87 41.55 18.87 43.84 15.1 27.95 15.1 25.93 18.87" fill={color} stroke="#000" />
    </svg>
  )
}

export default EngineeringIcon;