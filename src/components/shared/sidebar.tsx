'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Building2,
  LayoutDashboard,
  CreditCard,
  Wrench,
  FileText,
  User,
  Home,
  Users,
  Settings,
  Bell,
  LogOut,
} from 'lucide-react';
import { signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';

interface NavItem {
  title: string;
  href: string;
  icon: React.ReactNode;
}

const tenantNavItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/tenant/dashboard',
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    title: 'Payments',
    href: '/tenant/payments',
    icon: <CreditCard className="h-5 w-5" />,
  },
  {
    title: 'Maintenance',
    href: '/tenant/maintenance',
    icon: <Wrench className="h-5 w-5" />,
  },
  {
    title: 'Lease',
    href: '/tenant/lease',
    icon: <FileText className="h-5 w-5" />,
  },
  {
    title: 'Profile',
    href: '/tenant/profile',
    icon: <User className="h-5 w-5" />,
  },
];

const landlordNavItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/landlord/dashboard',
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    title: 'Properties',
    href: '/landlord/properties',
    icon: <Home className="h-5 w-5" />,
  },
  {
    title: 'Tenants',
    href: '/landlord/tenants',
    icon: <Users className="h-5 w-5" />,
  },
  {
    title: 'Leases',
    href: '/landlord/leases',
    icon: <FileText className="h-5 w-5" />,
  },
  {
    title: 'Payments',
    href: '/landlord/payments',
    icon: <CreditCard className="h-5 w-5" />,
  },
  {
    title: 'Maintenance',
    href: '/landlord/maintenance',
    icon: <Wrench className="h-5 w-5" />,
  },
  {
    title: 'Settings',
    href: '/landlord/settings',
    icon: <Settings className="h-5 w-5" />,
  },
];

interface SidebarProps {
  role: 'TENANT' | 'LANDLORD';
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const navItems = role === 'TENANT' ? tenantNavItems : landlordNavItems;

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-background">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center gap-2 border-b px-6">
          <Building2 className="h-8 w-8 text-primary" />
          <span className="text-xl font-bold">Strukture</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                pathname === item.href
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              {item.icon}
              {item.title}
            </Link>
          ))}
        </nav>

        {/* Bottom section */}
        <div className="border-t p-4 space-y-1">
          <Link
            href={`/${role.toLowerCase()}/notifications`}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <Bell className="h-5 w-5" />
            Notifications
          </Link>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 px-3 text-muted-foreground"
            onClick={() => signOut({ callbackUrl: '/' })}
          >
            <LogOut className="h-5 w-5" />
            Sign Out
          </Button>
        </div>
      </div>
    </aside>
  );
}
