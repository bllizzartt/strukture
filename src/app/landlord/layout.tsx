import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { Sidebar } from '@/components/shared/sidebar';
import { Header } from '@/components/shared/header';

export default async function LandlordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  if (session.user.role !== 'LANDLORD' && session.user.role !== 'ADMIN') {
    redirect('/tenant/dashboard');
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar role="LANDLORD" />
      <div className="lg:pl-64">
        <Header />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
