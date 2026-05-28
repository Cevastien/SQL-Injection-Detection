import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { cn } from "@/lib/utils";
import { SidebarProvider } from "@/components/ui/sidebar";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans"
});

export const metadata: Metadata = {
  title: "SQL Injection Detection Dashboard",
  description: "Machine learning powered SQL injection detection dashboard"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={cn(inter.variable, "bg-background font-sans text-foreground")}>
        <SidebarProvider>{children}</SidebarProvider>
      </body>
    </html>
  );
}
