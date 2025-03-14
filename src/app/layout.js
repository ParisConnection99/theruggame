import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import React from "react";
import ClientProviders from '@/components/ClientProviders';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import '@solana/wallet-adapter-react-ui/styles.css';
import ActivityBanner from '@/components/ActivityBanner';
import { GlobalErrorHandler } from '@/components/GlobalErrorHandler'; // Adjust path as needed
import CustomHead from '@/components/CustomHead';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Export metadata for the app
export const metadata = {
  title: "The Rug Game",
  description: "Guess pump or rug correctly & win Big!",
  openGraph: {
    title: "The Rug Game",
    description: "Guess pump or rug correctly & win Big!",
    url: "https://theruggame.fun/",
    siteName: "The Rug Game",
    images: [
      {
        url: "https://theruggame.fun/images/logo1.png",
        width: 1200,
        height: 630,
      }
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "The Rug Game",
    description: "Guess pump or rug correctly & win Big!",
    images: ["https://theruggame.fun/images/logo1.png"],
  },
  icons: {
    icon: "/favicon.ico",
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      {/* <head>
        <meta property="og:title" content="The Rug Game" />
        <meta property="og:image" content="https://theruggame.fun/images/logo1.png" />
        <meta property="og:description" content="Guess pump or rug correctly & win Big!" />
        <meta property="og:url" content="https://theruggame.fun/" />
      </head> */}
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-blue-900`}>
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