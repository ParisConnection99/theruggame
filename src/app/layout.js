import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Image from "next/image";
import Link from "next/link";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "The Rug Game",
  description: "Guess pump correctly & win Big!",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-900`}
      >
        {/* Header */}
        <header className="w-full">
          {/* Top Banner */}
          <div className="w-[calc(100%-2rem)] h-10 bg-blue-300 flex items-center justify-center rounded-lg ml-4 mt-4 mr-4 gap-4 px-4">
            <Image
              className="rounded-full"
              src="/images/pepe.webp"
              alt="banner"
              width={25}
              height={25}
              priority
            />
            <h1 className="text-black text-sm font-semibold">
              MoneyMagnet bet 3 SOL ($600) on HoodAI to Rug 🚀
            </h1>
          </div>

          {/* Navigation Menu */}
          <div className="flex justify-between items-center w-full px-5 mt-5">
            <div className="flex gap-6">
              <button className="text-white text-md hover:scale-105 hover:underline">{`<how it works>`}</button>
              <button className="text-white text-md hover:scale-105 hover:underline">{`<support>`}</button>
            </div>

            <button className="absolute-right text-white text-md hover:scale-105 hover:underline">
              {`<connect wallet>`}
            </button>
          </div>
        </header>
        {children}

        {/* Footer */}
        <footer className="bg-gray-900 text-gray-400 text-sm flex justify-between items-center p-4 w-full">
          <div>© theruggame 2025</div>
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
        </footer>

      </body>
    </html>
  );
}
