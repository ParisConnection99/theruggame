"use client";

import Link from "next/link";


export default function Footer() {
    return (
        <footer className="bg-gray-900 text-gray-400 text-sm flex items-center p-4 w-full relative">
            {/* Absolute Left: Copyright */}
            <div className="absolute left-4">© theruggame 2025</div>

            {/* Centered Links */}
            <div className="flex justify-center w-full">
                <div className="flex space-x-4">
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
            </div>
        </footer>
    );
}