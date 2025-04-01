// components/countdown-timer.js
'use client';

import { useState, useEffect } from 'react';

export function CountdownTimer({ initialHours = 5 }) {
  const [duration, setDuration] = useState(initialHours * 60 * 60 * 1000);
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isEditable, setIsEditable] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [duration]);

  const formatTime = (ms) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);

    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleDurationChange = (e) => {
    const hours = parseFloat(e.target.value) || 0;
    const newDuration = hours * 60 * 60 * 1000;
    setDuration(newDuration);
    setTimeLeft(newDuration);
  };

  return (
    <div className="space-y-4">
      {/* Countdown Display */}
      <div className="bg-black rounded-lg p-4">
        <p className="text-gray-300 mb-1">WE WILL BE BACK IN</p>
        <div className="text-4xl font-mono font-bold text-green-400">
          {formatTime(timeLeft)}
        </div>
      </div>

      {/* Admin Controls */}
      <div className="p-4 bg-gray-700 rounded-lg">
        <button 
          onClick={() => setIsEditable(!isEditable)}
          className="text-purple-400 text-sm hover:underline"
        >
          {isEditable ? 'Hide Controls' : 'Admin Controls'}
        </button>
        
        {isEditable && (
          <div className="mt-2 space-y-2">
            <label className="block text-gray-300">
              Set Countdown Duration (hours):
            </label>
            <input
              type="number"
              min="0.1"
              step="0.1"
              defaultValue={initialHours}
              onChange={handleDurationChange}
              className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-purple-500"
            />
            <button
              onClick={() => {
                const defaultDuration = initialHours * 60 * 60 * 1000;
                setDuration(defaultDuration);
                setTimeLeft(defaultDuration);
              }}
              className="w-full mt-2 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              Reset to {initialHours} Hours
            </button>
          </div>
        )}
      </div>
    </div>
  );
}