import React from 'react';

const EngineeringIcon = ({ color, position }) => {
  return (
    <svg id="Layer_1" data-name="Layer 1" width={26 + position} height="20" viewBox="0 0 85.31 99.68">
      <polygon points="0.84 99.18 18.82 99.18 27.92 81.09 40.26 79.55 34.19 55.9 10.89 62.29 14.74 73.58 0.84 99.18" fill={color} stroke="#000" />
      <g>
        <polygon points="77.24 4.75 54.48 44.8 40.26 46.34 32.77 32.7 38.72 22.88 23.5 22.88 13.94 40.67 20.55 54.12 38.63 49.97 43.14 67.95 59.28 64.59 84.74 18.1 77.24 4.75" fill={color} stroke="#000" />
        <polygon points="45.66 11.42 52.27 0.5 35.52 0.5 29.65 11.42 45.66 11.42" fill={color} stroke="#000" />
        <polygon points="25.73 18.73 41.23 18.73 43.5 14.99 27.74 14.99 25.73 18.73" fill={color} stroke="#000" />
      </g>
    </svg>
  )
}

export default EngineeringIcon;