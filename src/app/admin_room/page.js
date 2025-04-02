'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function AdminDashboard() {
  const [isDevMode, setIsDevMode] = useState(false);
  const [userId, setUserId] = useState('');
  const [actionStatus, setActionStatus] = useState({ message: '', type: '' });
  
  useEffect(() => {
    // Check if running in development mode
    // Note: This is client-side only - the API endpoints have their own server-side checks
    setIsDevMode(process.env.NODE_ENV === 'development');
  }, []);

  const handleUserAction = async (action) => {
    if (!userId.trim()) {
      setActionStatus({ 
        message: 'Please enter a user ID', 
        type: 'error' 
      });
      return;
    }
    
    setActionStatus({
      message: `Processing ${action} request...`,
      type: 'info'
    });
    
    try {
      const response = await fetch(`/api/admin_room/users/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || `Failed to ${action} user`);
      }
      
      setActionStatus({ 
        message: result.message || `User ${userId} ${action === 'block' ? 'blocked' : 'unblocked'} successfully`, 
        type: 'success' 
      });
    } catch (error) {
      setActionStatus({ 
        message: `Error: ${error.message}`, 
        type: 'error' 
      });
    }
  };

  if (!isDevMode) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded">
          <h1 className="text-lg font-bold mb-2">Admin Console Unavailable</h1>
          <p>The admin console is only available in development mode.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8 pb-4 border-b">
        <h1 className="text-2xl font-bold mb-2">Admin Console</h1>
        <p className="text-gray-600">Manage your application settings and users</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-blue-400 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">User Management</h2>
          
          <div className="mb-4">
            <label htmlFor="userId" className="block text-sm font-medium text-gray-700 mb-1">
              User ID
            </label>
            <input
              type="text"
              id="userId"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Enter user UID"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={() => handleUserAction('block')}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              Block User
            </button>
            <button
              onClick={() => handleUserAction('unblock')}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              Unblock User
            </button>
          </div>
          
          {actionStatus.message && (
            <div className={`mt-4 p-3 rounded-md ${
              actionStatus.type === 'success' 
                ? 'bg-green-50 text-green-800 border border-green-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {actionStatus.message}
            </div>
          )}
        </div>
        
        {/* Add more admin sections here as needed */}
        <div className="bg-gray-100 p-6 rounded-lg border border-dashed border-gray-300">
          <h2 className="text-xl font-semibold mb-2">Analytics</h2>
          <p className="text-gray-500">Coming soon</p>
        </div>
      </div>
      
      <div className="mt-8 bg-yellow-50 border-l-4 border-yellow-400 p-4">
        <h3 className="text-lg font-medium text-yellow-800 mb-2">Development Mode Only</h3>
        <p className="text-yellow-700">
          This admin console is only available in development mode. 
          These routes are excluded from git and won't be included in production builds.
        </p>
      </div>
    </div>
  );
}