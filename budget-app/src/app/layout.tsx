import type { Metadata } from "next";
import { Inter } from "next/font/google"; // Use Inter for enterprise look
import "./globals.css";
import { Providers } from "@/components/providers";


const font = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BudgetPro | Enterprise Budget Management",
  description: "Comprehensive budget proposal and approval web application.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${font.className} bg-slate-50 text-slate-900 antialiased`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
