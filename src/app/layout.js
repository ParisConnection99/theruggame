// app/layout.jsx
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import React from "react";
import ClientProviders from '@/components/ClientProviders';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import '@solana/wallet-adapter-react-ui/styles.css';
import ActivityBanner from '@/components/ActivityBanner'; 
import { logError } from '@/utils/errorLogger';


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
  description: "Guess pump or rug correctly & win Big!",
  
  // Add Open Graph metadata for better app representation in Phantom
  openGraph: {
    title: "The Rug Game",
    description: "Guess pump or rug correctly & win Big!",
    url: "https://theruggame.fun/",
    siteName: "The Rug Game",
    images: [
      {
        url: "https://theruggame.fun/images/logo1.png", // Update with your actual logo path
        width: 1200,
        height: 630,
        alt: "The Rug Game Logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  
  // Twitter Card metadata (often used by wallets)
  twitter: {
    card: "summary_large_image",
    title: "The Rug Game",
    description: "Guess pump or rug correctly & win Big!",
    images: ["https://theruggame.fun/images/logo1.png"], // Update with your actual logo path
  },
  
  // Icons for various platforms
  icons: {
    icon: "/favicon.ico"
  },
};

export function GlobalErrorHandler({ children }) {
  useEffect(() => {
    // Capture unhandled promise rejections
    const handleUnhandledRejection = (event) => {
      logError(event.reason, { type: 'unhandledRejection' });
    };
    
    // Capture uncaught errors
    const handleError = (event) => {
      logError(event.error, { type: 'uncaughtError' });
      // Prevent the default browser error handler
      event.preventDefault();
    };
    
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);
    
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, []);
  
  return children;
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-blue-900`}
      >
        <GlobalErrorHandler>
        <ClientProviders>
          <ActivityBanner />
          <Header />
          {children}
          <Footer />
        </ClientProviders>
        </GlobalErrorHandler>
      </body>
    </html>
  );
}