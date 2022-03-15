import React from 'react';

const ScienceIcon = ({ color, position }) => {
  return (
    <svg id="Layer_1" data-name="Layer 1"width={20} height="21" viewBox="0 0 69.96 98.77"
      transform={`translate(${position}, 0)`}>
      <path d="M762.46,241.33v-35a4.48,4.48,0,0,0,2.83-3.92c0-2.83-2-2.29-2-2.29h-26s-2-.54-2,2.29a4.48,4.48,0,0,0,2.83,3.92v35s-22.27,40.09-22.27,46,3.64,10.52,7.29,10.52h54.38c3.65,0,7.29-4.58,7.29-10.52S762.46,241.33,762.46,241.33Zm-12,14.25H735.82l7-13.13v-5H750v-3.82h-7.16v-3.94H750v-3.36h-7.16v-3.83H750v-3.85h-7.16v-4.17H750v-2.95h-7.16v-6.75h15.32v37.71l7,13.13Z" transform="translate(-715.27 -199.62)" fill={color} stroke="#000" />
    </svg>

  )
}

export default ScienceIcon;