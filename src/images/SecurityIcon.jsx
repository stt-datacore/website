import React from 'react';

const SecurityIcon = ({ color, position, dimLimit }) => {
  const dimBalancer = dimLimit;
  // height={dimBalancer * 0.75}
  return (
    <svg width={dimBalancer} height={dimBalancer} viewBox="0 0 99.51 74.68" transform={`translate(${position} 0)`}>
      <path d="M15.16,25.54v6.6S.81,30.63.81,25.54s14.35-6.61,14.35-6.61Z" transform="translate(-0.31 -12.67)" fill={color} stroke="#000" />
      <path d="M19.22,37v-21S22,13.17,49,13.17s45.88,7.45,50.12,9.63L96,29.22H32.53c-6,0-6.8,7.73-6.8,7.73Z" transform="translate(-0.31 -12.67)" fill={color} stroke="#000" />
      <path d="M32.4,32.14H83s-.55,7-3.22,7H62.51c-3.67,0-4.82,2.2-4.82,3.3a5.78,5.78,0,0,0,.69,3.22C59.11,47.25,76.85,83,76.85,83h2.36s1.2-.1,1.2,2.11,0,1.74-.92,1.74H58.65c-2.11,0-1.74-.64-1.74-1.65S57.37,84,58.19,84s2.11.09,2.11.09L38.18,43H32.4s-3.58.46-3.58-6.07C28.82,32.65,32.4,32.14,32.4,32.14Z" transform="translate(-0.31 -12.67)" fill={color} stroke="#000" />
    </svg>
  )
}

export default SecurityIcon;