// app/maintenance/page.js
import { CountdownTimer } from '@/components/countdown-timer';

export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4 text-center">
      {/* Logo */}
      <div className="flex justify-center mb-6">
        <img 
          src="/images/logo1.png" 
          alt="THE RUG GAME Logo" 
          className="h-20 w-20"
        />
      </div>

      {/* Title */}
      <h1 className="text-3xl font-bold text-purple-400 mb-2">
        THE RUG GAME
      </h1>
      
      {/* Status Message */}
      <p className="text-xl text-white mb-6">
        IS CLOSED RIGHT NOW
      </p>

      {/* Countdown Component */}
      <CountdownTimer />
    </div>
  );
}