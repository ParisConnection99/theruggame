// components/countdown-timer.js
'use client';

import { useState, useEffect } from 'react';

export function CountdownTimer() {
  const initialHours = 5; // Fixed 5 hour countdown
  const [timeLeft, setTimeLeft] = useState(initialHours * 60 * 60 * 1000);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (ms) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);

    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-black rounded-lg p-4">
      <p className="text-gray-300 mb-1">WE WILL BE BACK IN</p>
      <div className="text-4xl font-mono font-bold text-green-400">
        {formatTime(timeLeft)}
      </div>
    </div>
  );
}