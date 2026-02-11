import Link from 'next/link';
import { Building2 } from 'lucide-react';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Building2 className="h-7 w-7 text-primary" />
            <span className="text-xl font-bold">Strukture</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/listings" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Listings
            </Link>
            <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Sign In
            </Link>
          </div>
        </div>
      </header>
      <main className="container py-8">{children}</main>
    </div>
  );
}
