import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Briqueterie",
  description: "Gestion de briqueterie",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${geist.variable} h-full`}>
      <body className="min-h-full bg-gray-50 font-sans pt-14">
        <main className="max-w-lg mx-auto min-h-screen">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
