import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Building2,
  Users,
  DollarSign,
  Wrench,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Plus,
  CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';

async function getDashboardData(userId: string) {
  // Get properties with units count
  const properties = await prisma.property.findMany({
    where: { ownerId: userId },
    include: {
      _count: {
        select: { units: true },
      },
      units: {
        include: {
          leases: {
            where: {
              status: 'ACTIVE',
            },
          },
        },
      },
    },
  });

  const totalProperties = properties.length;
  const totalUnits = properties.reduce((sum, p) => sum + p._count.units, 0);

  // Calculate occupied units
  let occupiedUnits = 0;
  let monthlyRevenue = 0;

  properties.forEach((property) => {
    property.units.forEach((unit) => {
      if (unit.leases.length > 0) {
        occupiedUnits++;
        monthlyRevenue += Number(unit.monthlyRent);
      }
    });
  });

  const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

  // Get active tenants (unique tenants with active leases)
  const activeLeases = await prisma.lease.findMany({
    where: {
      status: 'ACTIVE',
      unit: {
        property: {
          ownerId: userId,
        },
      },
    },
    select: {
      tenantId: true,
    },
    distinct: ['tenantId'],
  });

  const activeTenants = activeLeases.length;

  // Get open maintenance requests
  const openMaintenanceRequests = await prisma.maintenanceRequest.count({
    where: {
      unit: {
        property: {
          ownerId: userId,
        },
      },
      status: {
        in: ['SUBMITTED', 'ACKNOWLEDGED', 'IN_PROGRESS'],
      },
    },
  });

  return {
    totalProperties,
    totalUnits,
    activeTenants,
    occupancyRate,
    monthlyRevenue,
    openMaintenanceRequests,
    hasProperties: totalProperties > 0,
    hasUnits: totalUnits > 0,
  };
}

export default async function LandlordDashboard() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return null;
  }

  const data = await getDashboardData(session.user.id);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            Welcome back, {session?.user?.name?.split(' ')[0]}
          </h1>
          <p className="text-muted-foreground">
            Here's an overview of your properties
          </p>
        </div>
        <Link href="/landlord/properties/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Property
          </Button>
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Properties</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalProperties}</div>
            <p className="text-xs text-muted-foreground">{data.totalUnits} units total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Tenants</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.activeTenants}</div>
            <p className="text-xs text-muted-foreground">{data.occupancyRate}% occupancy rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.monthlyRevenue)}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              {data.monthlyRevenue > 0 ? (
                <>
                  <TrendingUp className="h-3 w-3 text-green-500" />
                  From active leases
                </>
              ) : (
                'Start adding properties'
              )}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Maintenance</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.openMaintenanceRequests}</div>
            <p className="text-xs text-muted-foreground">Open requests</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Getting Started */}
        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>Complete these steps to set up your account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={`flex items-center gap-4 p-4 rounded-lg border ${data.hasProperties ? 'bg-green-50 border-green-200' : ''}`}>
              <div className={`flex h-10 w-10 items-center justify-center rounded-full ${data.hasProperties ? 'bg-green-100 text-green-600' : 'bg-primary/10 text-primary'}`}>
                {data.hasProperties ? <CheckCircle2 className="h-5 w-5" /> : '1'}
              </div>
              <div className="flex-1">
                <p className="font-medium">Add your first property</p>
                <p className="text-sm text-muted-foreground">
                  {data.hasProperties ? `${data.totalProperties} properties added` : 'Start by adding a property to manage'}
                </p>
              </div>
              <Link href="/landlord/properties/new">
                <Button size="sm" variant={data.hasProperties ? 'outline' : 'default'}>
                  {data.hasProperties ? 'Add More' : 'Add Property'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
            <div className={`flex items-center gap-4 p-4 rounded-lg border ${data.hasUnits ? 'bg-green-50 border-green-200' : !data.hasProperties ? 'opacity-50' : ''}`}>
              <div className={`flex h-10 w-10 items-center justify-center rounded-full ${data.hasUnits ? 'bg-green-100 text-green-600' : 'bg-muted text-muted-foreground'}`}>
                {data.hasUnits ? <CheckCircle2 className="h-5 w-5" /> : '2'}
              </div>
              <div className="flex-1">
                <p className="font-medium">Add units to your property</p>
                <p className="text-sm text-muted-foreground">
                  {data.hasUnits ? `${data.totalUnits} units added` : 'Define the rental units available'}
                </p>
              </div>
              {data.hasProperties && (
                <Link href="/landlord/properties">
                  <Button size="sm" variant="outline">
                    View Properties
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              )}
            </div>
            <div className={`flex items-center gap-4 p-4 rounded-lg border ${data.activeTenants > 0 ? 'bg-green-50 border-green-200' : !data.hasUnits ? 'opacity-50' : ''}`}>
              <div className={`flex h-10 w-10 items-center justify-center rounded-full ${data.activeTenants > 0 ? 'bg-green-100 text-green-600' : 'bg-muted text-muted-foreground'}`}>
                {data.activeTenants > 0 ? <CheckCircle2 className="h-5 w-5" /> : '3'}
              </div>
              <div className="flex-1">
                <p className="font-medium">Onboard your first tenant</p>
                <p className="text-sm text-muted-foreground">
                  {data.activeTenants > 0 ? `${data.activeTenants} active tenants` : 'Send an invite to start the onboarding process'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest updates from your properties</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No recent activity</p>
              <p className="text-sm text-muted-foreground">
                Activity from your properties will appear here
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <Link href="/landlord/properties">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-medium">My Properties</p>
                <p className="text-sm text-muted-foreground">{data.totalProperties} properties, {data.totalUnits} units</p>
              </div>
            </CardContent>
          </Link>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <Link href="/landlord/payments">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-medium">View Payments</p>
                <p className="text-sm text-muted-foreground">Track rent payments</p>
              </div>
            </CardContent>
          </Link>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <Link href="/landlord/maintenance">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Wrench className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-medium">Maintenance</p>
                <p className="text-sm text-muted-foreground">{data.openMaintenanceRequests} open requests</p>
              </div>
            </CardContent>
          </Link>
        </Card>
      </div>
    </div>
  );
}
