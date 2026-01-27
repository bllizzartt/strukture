import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { Sidebar } from '@/components/shared/sidebar';
import { Header } from '@/components/shared/header';

export default async function TenantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  if (session.user.role !== 'TENANT' && session.user.role !== 'ADMIN') {
    redirect('/landlord/dashboard');
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar role="TENANT" />
      <div className="lg:pl-64">
        <Header />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
