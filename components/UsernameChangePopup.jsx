'use client';
import { useState } from 'react';
import { useAnalytics } from '@/components/FirebaseProvider';
import { logEvent } from 'firebase/analytics';

// This component can be added to your ProfilePage component
export default function UsernameChangePopup({ isOpen, onClose, onSave, currentUsername = "" }) {
  const [username, setUsername] = useState(currentUsername);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const analytics = useAnalytics();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!username.trim()) {
      setError("Username cannot be empty");
      return;
    }

    try {
      setLoading(true);
      await onSave(username);
      onClose();
    } catch (error) {
      setError(error.message || "Failed to update username");
      logEvent(analytics, 'username_change_modal_error', {
        error_message: error.message,
        error_code: error.code || 'unknown'
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-80 shadow-lg">
        <h3 className="text-lg font-bold mb-4 text-center">Change Username</h3>

        <div className="mb-4 p-3 bg-yellow-800 bg-opacity-30 rounded border border-yellow-700">
          <p className="text-yellow-300 text-sm">
            Note: You can only change your username once per week.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="username" className="block text-sm font-medium mb-1">
              New Username
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter new username"
            />
            {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded bg-gray-700 hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm rounded bg-blue-600 hover:bg-blue-500 text-white"
              disabled={loading}
            >
              {loading ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}