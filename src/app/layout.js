import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import 'react-toastify/dist/ReactToastify.css';
import React from "react";
import ClientProviders from '@/components/ClientProviders';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import '@solana/wallet-adapter-react-ui/styles.css';
import ActivityBanner from '@/components/ActivityBanner';
import { GlobalErrorHandler } from '@/components/GlobalErrorHandler'; // Adjust path as needed
import { Analytics } from '@vercel/analytics/next';
import { ToastContainer } from 'react-toastify';
import { initializePriceScheduler, checkSchedulerStatus } from '@/services/priceSchedulerService';


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({ children }) {
  useEffect(() => {
    console.log('🔄 App layout mounted, initializing services...');
    
    // Initialize the price scheduler
    initializePriceScheduler();
    
    // Check status after a delay to make sure it started
    setTimeout(() => {
      const isRunning = checkSchedulerStatus();
      console.log(`⏱️ Scheduler status check: ${isRunning ? 'Running' : 'Not running'}`);
      
      if (!isRunning) {
        console.log('🔄 Attempting to restart scheduler...');
        initializePriceScheduler();
      }
    }, 5000);
    
    return () => {
      console.log('🧹 App layout unmounting...');
    };
  }, []);
  
  return (
    <html lang="en">
      <head>
        <title>The Rug Game</title>
        <link rel="icon" href="/favicon.ico?v=1" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta property="og:title" content="The Rug Game" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://theruggame.fun/logo.png" />
        <meta property="og:description" content="Guess pump or rug correctly & win Big!" />
        <meta property="og:url" content="https://theruggame.fun" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="The Rug Game" />
        <meta name="twitter:description" content="Guess pump or rug correctly & win Big!" />
        <meta name="twitter:image" content="https://theruggame.fun/logo.png" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-blue-900`}>
        <GlobalErrorHandler>
          <ClientProviders>
            <ActivityBanner />
            <Header />
            {children}
            <Analytics />
            <ToastContainer />
            <Footer />
          </ClientProviders>
        </GlobalErrorHandler>
      </body>
    </html>
  );
}