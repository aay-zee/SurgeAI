import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { ThemeToggle } from '@/components/theme-toggle';

export const metadata: Metadata = {
  title: 'SurgeAI - AI-Powered Business Insights',
  description: 'Empower your ideas with AI insights. SurgeAI helps you analyze conversations, spot trends, and turn data into growth.',
  keywords: ['AI', 'Business Intelligence', 'Data Analysis', 'Insights', 'SaaS'],
  authors: [{ name: 'SurgeAI' }],
  viewport: 'width=device-width, initial-scale=1',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 relative overflow-hidden">
        <ThemeProvider>
          {/* Animated background gradient */}
          <div className="fixed inset-0 bg-gradient-to-br from-primary/5 via-accent/5 to-transparent animate-pulse" />
          <div className="fixed inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(37,99,235,0.1),transparent_70%)]" />
          <div className="fixed inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(99,102,241,0.1),transparent_70%)]" />
          
          {/* Theme Toggle */}
          <ThemeToggle />
          
          {/* Page Content */}
          <div className="relative z-10">
            {children}
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}