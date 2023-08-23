import React from 'react';

const MedicineIcon = ({ color, position, dimLimit }) => {
  const dimBalancer = dimLimit;
  // height={dimBalancer * 0.926}
  return (
    <svg width={dimBalancer} height={dimBalancer} viewBox="0 0 100.64 93.19" transform={`translate(${position} 0)`}>
      <path d="M36.86,13.74H3.94a35.53,35.53,0,0,0,2.28,4H37.1Z" transform="translate(0 -4.11)" fill={color} stroke="#000" />
      <path d="M9.55,21.92C19.12,32.1,32.38,32.39,38,32.39l-.62-10.47Z" transform="translate(0 -4.11)" fill={color} stroke="#000" />
      <path d="M36.64,10l-.31-5.34H.64A47.92,47.92,0,0,0,2.31,10Z" transform="translate(0 -4.11)" fill={color} stroke="#000" />
      <path d="M63.78,13.74H96.71a39,39,0,0,1-2.28,4H63.55Z" transform="translate(0 -4.11)" fill={color} stroke="#000" />
      <path d="M91.09,21.92C81.53,32.1,68.27,32.39,62.68,32.39l.62-10.47Z" transform="translate(0 -4.11)" fill={color} stroke="#000" />
      <path d="M64,10l.32-5.34H100A50.14,50.14,0,0,1,98.34,10Z" transform="translate(0 -4.11)" fill={color} stroke="#000" />
      <path d="M44.74,81.78c-2-1.1-2.75-2.6-.3-4.27l-.32-4.62c-9.9,5.33-3.43,11.67,1,14.14Z" transform="translate(0 -4.11)" fill={color} stroke="#000" />
      <path d="M42.5,22l1.86,26.89c4.64,2,6.24,2.64,11.59,4.78L58.14,22c-2.88-1-4.29-2.36-4.63-2.91,7.57-5.07,2.81-13-3.19-13s-10.75,8-3.19,13C46.8,19.68,45.39,21.08,42.5,22Z" transform="translate(0 -4.11)" fill={color} stroke="#000" />
      <path d="M40.63,47.06a3.48,3.48,0,0,1,1.56-2.29l-.37-5.4c-4.45,1.22-7.2,4.42-7,7.69.16,2.69,2.44,5.1,7.14,7.16,12.55,5.48,16.68,7.45,16.68,7.45a3,3,0,0,1,1.5,1.89c.15.85-.3,1.8-2,2.62L57,66.75,56.58,72c1.89-.82,3.55-1.57,4.59-2.15a8.56,8.56,0,0,0,4-6.28c.21-2.63-1.23-5.48-6.11-7.42-10.05-4-8.41-3.36-16.56-6.79C41.06,48.73,40.56,47.9,40.63,47.06Z" transform="translate(0 -4.11)" fill={color} stroke="#000" />
      <path d="M54.77,70.84l.68-9.44c-2.65-1.25-6-2.77-10.54-4.63l.66,9.62C50,68.51,52.94,70,54.77,70.84Z" transform="translate(0 -4.11)" fill={color} stroke="#000" />
      <path d="M46.1,74.1l1.57,22.69H53l1.1-19.07C51.77,76.64,49.07,75.36,46.1,74.1Z" transform="translate(0 -4.11)" fill={color} stroke="#000" />
      <path d="M40.67,64.65c-.62-1.2.33-2.4,1.34-3,0,0,.38-.28,1.29-.81l-.36-5.26-1.35.54c-5.58,2.21-6.66,5.6-5.94,8.51a8.77,8.77,0,0,0,3.82,5.19c3.4,1.89,13.25,5.56,16.31,7.4s2.18,3.5-.11,4.67l-.36,5.25c4.42-2.38,11.35-8.9,1.1-14.33L42.5,66.18a3.84,3.84,0,0,1-1.83-1.53" transform="translate(0 -4.11)" fill={color} stroke="#000" />
      <path d="M60,47.06c.07.84-.43,1.67-1.88,2.29h0l-.36,5.2.9-.33c4.84-1.74,7-4.47,7.15-7.16.22-3.7-3.33-7.32-8.86-8.07l-.34,4.89C58.23,44.29,59.9,45.68,60,47.06Z" transform="translate(0 -4.11)" fill={color} stroke="#000" />
    </svg>
  )
}

export default MedicineIcon;