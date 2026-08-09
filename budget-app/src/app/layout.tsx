import type { Metadata } from "next";
import { Inter } from "next/font/google"; // Use Inter for enterprise look
import "./globals.css";
import { Providers } from "@/components/providers";
import { APP_LONG_NAME, APP_NAME } from "@/lib/brand";


const font = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: `${APP_NAME} — ${APP_LONG_NAME}`,
  description:
    "Pengajuan, penelusuran, dan persetujuan proposal budget dealer Astra Motor dalam satu alur.",
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
