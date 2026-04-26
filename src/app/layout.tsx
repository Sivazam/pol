import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import QueryProvider from "@/lib/query-provider";
import AuthSessionProvider from "@/components/auth/AuthSessionProvider";
import SessionGate from "@/components/auth/SessionGate";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Polavaram Project — Rehabilitation & Resettlement Portal",
  description: "Government of Andhra Pradesh — Polavaram Irrigation Project Rehabilitation and Resettlement Tracking Portal. Monitoring 13,961 families across 3 mandals and 30 villages.",
  keywords: ["Polavaram", "Rehabilitation", "Resettlement", "Andhra Pradesh", "Godavari", "Irrigation"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased bg-[#F8FAFC] text-[#1A202C]`}
      >
        <AuthSessionProvider>
          <QueryProvider>
            <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
              <SessionGate />
              {children}
              <Toaster />
            </ThemeProvider>
          </QueryProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
