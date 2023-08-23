import React from 'react';

const CommandIcon = ({ color, position, dimLimit }) => {
  const dimBalancer = dimLimit;
  // width={dimBalancer * 0.667}
  return (
    <svg width={dimBalancer} height={dimBalancer} viewBox="0 0 67.58 101.26" transform={`translate(${position}, 0)`}>
      <polygon points="66.05 70.59 44.51 66.24 33.79 0.08 23.07 66.24 1.52 70.59 19.8 79.73 17.66 99.98 33.79 84.96 49.92 99.98 47.77 79.73 66.05 70.59" fill={color} stroke="#000" />
    </svg>
  )
}

export default CommandIcon;