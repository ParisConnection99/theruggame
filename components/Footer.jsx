'use client';

import Link from "next/link";
import { FaTelegram, FaTwitter, FaInstagram } from 'react-icons/fa';

export default function Footer() {
    return (
        <footer className="bg-blue-900 text-gray-400 text-sm p-4 w-full relative">
            {/* Responsive Container */}
            <div className="relative flex flex-col items-center md:flex-row md:items-center w-full">
                {/* Copyright - Absolutely positioned on larger screens */}
                <div className="hidden md:block absolute left-4">
                    © theruggame 2025
                </div>

                {/* Mobile Copyright */}
                <div className="md:hidden text-center mb-4">
                    © theruggame 2025
                </div>

                {/* Centered Content Container */}
                <div className="flex flex-col items-center w-full">
                    {/* Footer Links */}
                    <div className="flex space-x-4 mb-4">
                        <Link href="/docs/privacy-policy" className="hover:underline">
                            privacy policy
                        </Link>
                        <span>|</span>
                        <Link href="/docs/terms-of-service" className="hover:underline">
                            terms of service
                        </Link>
                        <span>|</span>
                        <Link href="/docs/fees" className="hover:underline">
                            fees
                        </Link>
                    </div>

                    {/* Social Media Icons */}
                    <div className="flex items-center justify-center gap-6">
                        <a href="https://t.me/theruggamesupport" target="_blank" rel="noopener noreferrer" className="hover:text-blue-500">
                            <FaTelegram className="w-5 h-5" />
                        </a>
                        <a href="https://x.com/ruggamedotfun" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400">
                            <FaTwitter className="w-5 h-5" />
                        </a>
                        <a href="https://instagram.com/theruggame.fun" target="_blank" rel="noopener noreferrer" className="hover:text-pink-400">
                            <FaInstagram className="w-5 h-5" />
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
}