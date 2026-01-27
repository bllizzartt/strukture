import Link from 'next/link';
import { Building2 } from 'lucide-react';

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="container flex h-16 items-center">
          <Link href="/" className="flex items-center gap-2">
            <Building2 className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">Strukture</span>
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 container py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t bg-white py-4">
        <div className="container text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Strukture. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
