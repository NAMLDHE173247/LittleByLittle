import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Lora, Noto_Sans } from "next/font/google";
import "./globals.css";
import "./index.css";
import "./App.css";
import { AuthProvider } from "@/AuthContext";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin", "vietnamese"],
  display: "swap",
  variable: "--font-sans",
});

const lora = Lora({
  subsets: ["latin", "vietnamese"],
  display: "swap",
  style: ["normal", "italic"],
  variable: "--font-serif",
});

const notoSans = Noto_Sans({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-ipa",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Train English",
  description: "Learn English Effectively",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${plusJakarta.variable} ${lora.variable} ${notoSans.variable} h-full antialiased font-sans`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
