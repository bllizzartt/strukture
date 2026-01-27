import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
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
} from 'lucide-react';
import Link from 'next/link';

export default async function LandlordDashboard() {
  const session = await getServerSession(authOptions);

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
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">0 units total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Tenants</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">0% occupancy rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$0.00</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-green-500" />
              Start adding properties
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Maintenance</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
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
            <div className="flex items-center gap-4 p-4 rounded-lg border">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                1
              </div>
              <div className="flex-1">
                <p className="font-medium">Add your first property</p>
                <p className="text-sm text-muted-foreground">
                  Start by adding a property to manage
                </p>
              </div>
              <Link href="/landlord/properties/new">
                <Button size="sm">
                  Add Property
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-lg border opacity-50">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                2
              </div>
              <div className="flex-1">
                <p className="font-medium">Add units to your property</p>
                <p className="text-sm text-muted-foreground">
                  Define the rental units available
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-lg border opacity-50">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                3
              </div>
              <div className="flex-1">
                <p className="font-medium">Onboard your first tenant</p>
                <p className="text-sm text-muted-foreground">
                  Send an invite to start the onboarding process
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
          <Link href="/landlord/leases">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-medium">Manage Leases</p>
                <p className="text-sm text-muted-foreground">View and create leases</p>
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
                <p className="text-sm text-muted-foreground">Handle repair requests</p>
              </div>
            </CardContent>
          </Link>
        </Card>
      </div>
    </div>
  );
}
