import Link from 'next/link';
import { Building2, Users, Shield, CreditCard, Wrench, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">Strukture</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/register">
              <Button>Get Started</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container py-24 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          Property Management
          <span className="text-primary"> Simplified</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Strukture brings landlords and tenants together with powerful tools for
          lease management, online payments, maintenance tracking, and more.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link href="/register?role=landlord">
            <Button size="lg" className="gap-2">
              <Building2 className="h-5 w-5" />
              I'm a Landlord
            </Button>
          </Link>
          <Link href="/register?role=tenant">
            <Button size="lg" variant="outline" className="gap-2">
              <Users className="h-5 w-5" />
              I'm a Tenant
            </Button>
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="container py-24">
        <h2 className="text-center text-3xl font-bold">Everything You Need</h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
          A complete platform for managing your properties and tenants
        </p>

        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            icon={<Shield className="h-10 w-10" />}
            title="Secure Onboarding"
            description="Digital lease signing with secure document storage and tenant verification"
          />
          <FeatureCard
            icon={<CreditCard className="h-10 w-10" />}
            title="Online Payments"
            description="Accept ACH and debit payments with automatic rent collection"
          />
          <FeatureCard
            icon={<Wrench className="h-10 w-10" />}
            title="Maintenance Tracking"
            description="Submit and track maintenance requests with real-time status updates"
          />
          <FeatureCard
            icon={<Building2 className="h-10 w-10" />}
            title="Property Management"
            description="Manage multiple properties and units from a single dashboard"
          />
          <FeatureCard
            icon={<Users className="h-10 w-10" />}
            title="Tenant Portal"
            description="Give tenants their own portal for payments, documents, and requests"
          />
          <FeatureCard
            icon={<Bell className="h-10 w-10" />}
            title="Smart Notifications"
            description="Automated reminders for rent, lease renewals, and maintenance updates"
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="container flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            <span className="font-semibold">Strukture</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Strukture. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm transition-shadow hover:shadow-md">
      <div className="text-primary">{icon}</div>
      <h3 className="mt-4 text-xl font-semibold">{title}</h3>
      <p className="mt-2 text-muted-foreground">{description}</p>
    </div>
  );
}
