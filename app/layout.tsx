import type { Metadata } from 'next';
import './globals.css';
import ThemeRegistry from '@/components/ThemeRegistry';
import ShellOrLogin from '@/components/ShellOrLogin';

export const metadata: Metadata = {
  title: 'Causeway — AML / Fraud Detection',
  description: 'AI-powered anti-money-laundering transaction monitoring for Union Bank of India.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ThemeRegistry>
          <ShellOrLogin>{children}</ShellOrLogin>
        </ThemeRegistry>
      </body>
    </html>
  );
}