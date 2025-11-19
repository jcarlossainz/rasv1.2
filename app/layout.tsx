import type { Metadata } from "next";
import { Roboto, Poppins } from "next/font/google";
import "./globals.css";
import '@/styles/gallery-animations.css';
import { ToastProvider } from '@/components/ui/toast-provider'
import { ConfirmProvider } from '@/components/ui/confirm-modal'


const roboto = Roboto({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  variable: '--font-roboto',
  display: 'swap',
});

const poppins = Poppins({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-poppins',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "RAS - Realty Administration System",
  description: "Sistema profesional de administración inmobiliaria",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${roboto.variable} ${poppins.variable}`}>
      <body className="font-roboto antialiased">
      <ToastProvider>
          <ConfirmProvider>
        {children}
          </ConfirmProvider>
      </ToastProvider>
      </body>
    </html>
  );
}
