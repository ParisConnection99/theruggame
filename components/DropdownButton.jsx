"use client";

import { useState, useEffect, useRef } from "react";

export default function DropdownButton( { onClick }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div ref={dropdownRef} className="relative inline-block text-left">
      <button
      onClick={() => {
        setIsOpen(!isOpen);
      }}
        className="h-10 bg-blue-300 border border-white text-black px-4 rounded-md hover:bg-white focus:outline-none"
      >
        sort: featured ▼
      </button>

      {isOpen && (
        <div className="w-48 absolute left-0 mt-2 bg-blue-300 text-black border border-gray-200 rounded-md shadow-lg">
          <ul className="py-2">
            <li className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
             onClick={(e) => {
              onClick(0);
             }}>
              sort: trending 🔥
              </li>
            <li className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
            onClick={(e) => {
              onClick(1);
            }}>
              sort: creation date ⏰
              </li>
          </ul>
        </div>
      )}
    </div>
  );
}
