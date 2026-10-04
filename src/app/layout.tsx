import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "cyrillic"] });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // Prevents zoom on input focus in iOS
  userScalable: false,
  themeColor: "#ffffff",
};

export const metadata: Metadata = {
  title: "Қаржы | Finance Tracker",
  description: "Жеке қаржыны бақылауға арналған қосымша",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Қаржы",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="kk">
      <body className={`${inter.className} antialiased selection:bg-blue-100 overscroll-none`}>
        {children}
      </body>
    </html>
  );
}
