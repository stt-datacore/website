import React from 'react';

const SecurityIcon = ({ color, position }) => {
  return (
    <svg id="Layer_1" data-name="Layer 1" width={24 } height="21" viewBox="0 0 124 95"
      transform={`translate(${position}, 0)`}>
      <path d="M707.17,219.22v8.06s-17.5-1.85-17.5-8.06,17.5-8.06,17.5-8.06Z" transform="translate(-688 -202)" fill={color} stroke="#000" />
      <path d="M712.11,233.14V207.48s3.34-3.34,36.37-3.34,55.95,9.08,61.11,11.74l-3.91,7.83H728.34c-7.25,0-8.29,9.43-8.29,9.43Z" transform="translate(-688 -202)" fill={color} stroke="#000" />
      <path d="M728.18,227.28h61.68s-.67,8.56-3.92,8.56h-21c-4.48,0-5.88,2.69-5.88,4a7.11,7.11,0,0,0,.84,3.92c.9,1.9,22.53,45.45,22.53,45.45h2.88s1.46-.11,1.46,2.57,0,2.13-1.12,2.13H760.2c-2.58,0-2.13-.78-2.13-2s.56-1.45,1.57-1.45,2.57.11,2.57.11l-27-50h-7.06s-4.36.55-4.36-7.41C723.82,227.9,728.18,227.28,728.18,227.28Z" transform="translate(-688 -202)" fill={color} stroke="#000" />
    </svg>

  )
}

export default SecurityIcon;