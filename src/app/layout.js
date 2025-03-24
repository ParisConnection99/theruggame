import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import React from "react";
import ClientProviders from '@/components/ClientProviders';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import '@solana/wallet-adapter-react-ui/styles.css';
import ActivityBanner from '@/components/ActivityBanner';
import { GlobalErrorHandler } from '@/components/GlobalErrorHandler'; // Adjust path as needed

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Export metadata for the app
// export const metadata = {
//   title: "The Rug Game",
//   description: "Guess pump or rug correctly & win Big!",
//   openGraph: {
//     title: "The Rug Game",
//     description: "Guess pump or rug correctly & win Big!",
//     url: "https://theruggame.fun/",
//     siteName: "The Rug Game",
//     images: [
//       {
//         url: "https://theruggame.fun/logo.png",
//         width: 1200,
//         height: 630,
//       }

//     ],
//     locale: 'en_US',
//     type: "website",
//   },
//   twitter: {
//     card: "summary_large_image",
//     title: "The Rug Game",
//     description: "Guess pump or rug correctly & win Big!",
//     images: ["https://theruggame.fun/logo.png"],
//   },
//   icons: {
//     icon: "/favicon.ico",
//   },
// }

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <title>Google</title>
        <link rel="icon" href="https://www.google.com/favicon.ico" />
        <link rel="shortcut icon" href="https://www.google.com/favicon.ico" />
        <link rel="apple-touch-icon" href="https://www.google.com/apple-touch-icon.png" />

        <meta property="og:title" content="Google" />
        <meta property="og:image" content="https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png" />
        <meta property="og:description" content="Search the world's information, including webpages, images, videos, and more." />
        <meta property="og:url" content="https://www.google.com" />
        <meta property="og:type" content="website" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Google" />
        <meta name="twitter:description" content="Search the world's information, including webpages, images, videos, and more." />
        <meta name="twitter:image" content="https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png" />
      </head>
      {/* <head>
        <title>The Rug Game</title>
        <link rel="icon" href="/favicon.ico?v=1" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta property="og:title" content="The Rug Game" />
        <meta property="og:image" content="https://theruggame.fun/logo.png" />
        <meta property="og:description" content="Guess pump or rug correctly & win Big!" />
        <meta property="og:url" content="https://theruggame.fun" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="The Rug Game" />
        <meta name="twitter:description" content="Guess pump or rug correctly & win Big!" />
        <meta name="twitter:image" content="https://theruggame.fun/logo.png" />
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