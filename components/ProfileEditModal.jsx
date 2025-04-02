import React, { useState, useEffect } from 'react';
import Image from 'next/image';

export default function ProfileEditModal({ isOpen, onClose, onSave, defaultUsername = '' }) {
    const [username, setUsername] = useState('');
    const [profileImage, setProfileImage] = useState('/images/pepe.webp');
   
    useEffect(() => {
      if (isOpen) {
        setUsername(defaultUsername);
      }
    }, [isOpen, defaultUsername]);
   
    const handleSave = () => {
      onSave({ username, profileImage });
      onClose();
    };
   
    if (!isOpen) return null;
   
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-[#1a1b1f] rounded-lg p-6 w-full max-w-md">
          <h2 className="text-white text-xl mb-6 text-center">edit profile</h2>
          
          {/* Profile Photo Section */}
          <div className="flex flex-col items-center mb-6">
            <div className="relative w-16 h-16 group cursor-pointer mb-2">
              <Image
                src={profileImage}
                alt="Profile"
                width={64}
                height={64}
                className="rounded-full"
              />
              <div className="absolute bottom-0 right-0 bg-blue-500 rounded-full p-1">
                <svg 
                  width="16" 
                  height="16" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  className="text-white"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                  />
                </svg>
              </div>
            </div>
            <label className="text-white">Profile photo</label>
          </div>
   
          {/* Username Section */}
          <div className="mb-6">
            <label className="text-white mb-2 block">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-[#2c2d32] text-white p-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              placeholder="Enter username"
            />
            <p className="text-orange-500 text-sm mt-1">you can change your username once every day</p>
          </div>
   
          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="text-white hover:underline px-4 py-2"
            >
              {'<close>'}
            </button>
            <button
              onClick={handleSave}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              save
            </button>
          </div>
        </div>
      </div>
    );
   }