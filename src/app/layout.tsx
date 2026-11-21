import type { Metadata } from 'next';
import { Noto_Sans, Noto_Sans_Devanagari } from 'next/font/google';
import './globals.css';

const notoSans = Noto_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-noto-sans',
  weight: ['400', '500', '600', '700'],
});

const notoSansDevanagari = Noto_Sans_Devanagari({
  subsets: ['devanagari'],
  display: 'swap',
  variable: '--font-noto-devanagari',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'ClaimKavach — Hospital Bill & Insurance Audit',
  description:
    "Audit your hospital bill and insurance deductions. ClaimKavach doesn't store your bill; the file is sent to Google Gemini for reading; the audit runs on your device.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${notoSans.variable} ${notoSansDevanagari.variable}`}>
      <body className="font-sans min-h-screen bg-background">
        {children}
      </body>
    </html>
  );
}
