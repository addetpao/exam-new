import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ExamPrep Platform - CompTIA A+ 220-1101/1102",
  description: "Professional exam preparation platform for CompTIA A+ certification",
  keywords: ["CompTIA A+", "220-1101", "220-1102", "exam prep", "certification"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}