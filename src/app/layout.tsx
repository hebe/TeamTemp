import type { Metadata } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import DevNav from "@/components/DevNav";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "TeamTemp",
  description: "A quick, anonymous temperature check for your team.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${spaceGrotesk.variable} ${inter.variable}`}>
        <DevNav />
        <div className="pt-10">
          {children}
        </div>
      </body>
    </html>
  );
}
