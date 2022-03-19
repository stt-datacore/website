import React from 'react';

const ScienceIcon = ({ color, position, dimLimit }) => {
  const dimBalancer = dimLimit;
  // width={dimBalancer * 0.708}
  return (
    <svg width={dimBalancer} height={dimBalancer} viewBox="0 0 70.97 100.2" transform={`translate(${position} 0)`}>
      <path d="M62.39,42.21V6.74s2.87-1.09,2.87-4S63.21.44,63.21.44H36.79s-2-.55-2,2.33,2.87,4,2.87,4V42.21S15,82.89,15,88.92s3.7,10.68,7.4,10.68H77.59c3.7,0,7.4-4.66,7.4-10.68S62.39,42.21,62.39,42.21ZM50.25,56.67H35.35l7.13-13.32V38.24h7.27V34.36H42.48v-4h7.27V27H42.48V23.07h7.27V19.16H42.48V14.94h7.27v-3H42.48V5.09H58V43.35l7.12,13.32Z"
        transform="translate(-14.51 0.1)" fill={color} stroke="#000" />
    </svg>
  )
}

export default ScienceIcon;