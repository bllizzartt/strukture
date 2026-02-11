'use client';

import { useEffect, useState, useCallback } from 'react';
import { Loader2, DollarSign, Clock, TrendingUp, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, cn } from '@/lib/utils';

type Period = 'month' | 'quarter' | 'year';

interface DashboardData {
  totalRevenue: number;
  outstandingBalance: number;
  collectionRate: number;
  occupancyRate: number;
  properties: PropertyBreakdown[];
}

interface PropertyBreakdown {
  id: string;
  name: string;
  revenue: number;
  totalUnits: number;
  occupiedUnits: number;
  occupancyRate: number;
}

interface RentRollEntry {
  id: string;
  propertyName: string;
  unitNumber: string;
  tenantName: string | null;
  rentAmount: number;
  paidAmount: number;
  status: 'PAID' | 'PARTIAL' | 'UNPAID' | 'VACANT';
}

const statusBadgeStyles: Record<string, string> = {
  PAID: 'bg-green-100 text-green-800',
  PARTIAL: 'bg-yellow-100 text-yellow-800',
  UNPAID: 'bg-red-100 text-red-800',
  VACANT: 'bg-gray-100 text-gray-800',
};

const statusLabels: Record<string, string> = {
  PAID: 'Paid',
  PARTIAL: 'Partial',
  UNPAID: 'Unpaid',
  VACANT: 'Vacant',
};

export default function FinancialDashboardPage() {
  const { toast } = useToast();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [rentRoll, setRentRoll] = useState<RentRollEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('month');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [dashboardRes, rentRollRes] = await Promise.all([
        fetch(`/api/landlord/financial/dashboard?period=${period}`),
        fetch('/api/landlord/financial/rent-roll'),
      ]);

      const dashboardResult = await dashboardRes.json();
      const rentRollResult = await rentRollRes.json();

      if (dashboardResult.success) {
        setDashboard(dashboardResult.data);
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load financial dashboard data',
        });
      }

      if (rentRollResult.success) {
        setRentRoll(rentRollResult.data);
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load rent roll data',
        });
      }
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load financial data',
      });
    } finally {
      setIsLoading(false);
    }
  }, [period, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalRent = rentRoll.reduce((sum, entry) => sum + entry.rentAmount, 0);
  const totalPaid = rentRoll.reduce((sum, entry) => sum + entry.paidAmount, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Financial Overview</h1>
          <p className="text-muted-foreground">
            Track revenue, collections, and occupancy
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border p-1">
          <Button
            variant={period === 'month' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setPeriod('month')}
          >
            Month
          </Button>
          <Button
            variant={period === 'quarter' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setPeriod('quarter')}
          >
            Quarter
          </Button>
          <Button
            variant={period === 'year' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setPeriod('year')}
          >
            Year
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(dashboard?.totalRevenue ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              For this {period}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Outstanding Balance</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {formatCurrency(dashboard?.outstandingBalance ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Pending collection
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {dashboard?.collectionRate ?? 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Of expected revenue
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Occupancy Rate</CardTitle>
            <Building2 className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {dashboard?.occupancyRate ?? 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Across all properties
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Rent Roll Table */}
      <Card>
        <CardHeader>
          <CardTitle>Rent Roll</CardTitle>
          <CardDescription>
            Current rent status across all units
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rentRoll.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <DollarSign className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No rent roll data</p>
              <p className="text-sm text-muted-foreground">
                Add properties and units to see your rent roll
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left font-medium py-3 px-2">Property</th>
                    <th className="text-left font-medium py-3 px-2">Unit</th>
                    <th className="text-left font-medium py-3 px-2 hidden sm:table-cell">Tenant</th>
                    <th className="text-right font-medium py-3 px-2">Rent Amount</th>
                    <th className="text-center font-medium py-3 px-2">Status</th>
                    <th className="text-right font-medium py-3 px-2 hidden sm:table-cell">Paid Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {rentRoll.map((entry) => (
                    <tr key={entry.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="py-3 px-2">{entry.propertyName}</td>
                      <td className="py-3 px-2">{entry.unitNumber}</td>
                      <td className="py-3 px-2 hidden sm:table-cell">
                        {entry.tenantName ?? <span className="text-muted-foreground">--</span>}
                      </td>
                      <td className="py-3 px-2 text-right">
                        {formatCurrency(entry.rentAmount)}
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                            statusBadgeStyles[entry.status]
                          )}
                        >
                          {statusLabels[entry.status]}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right hidden sm:table-cell">
                        {formatCurrency(entry.paidAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 font-semibold">
                    <td className="py-3 px-2" colSpan={3}>
                      Totals
                    </td>
                    <td className="py-3 px-2 text-right">
                      {formatCurrency(totalRent)}
                    </td>
                    <td className="py-3 px-2" />
                    <td className="py-3 px-2 text-right hidden sm:table-cell">
                      {formatCurrency(totalPaid)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Property Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Property Breakdown</CardTitle>
          <CardDescription>
            Revenue and occupancy by property
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!dashboard?.properties || dashboard.properties.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No properties found</p>
              <p className="text-sm text-muted-foreground">
                Add properties to see the breakdown
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {dashboard.properties.map((property) => (
                <div
                  key={property.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                      <p className="font-medium truncate">{property.name}</p>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {property.occupiedUnits} of {property.totalUnits} units occupied
                    </p>
                    <div className="mt-2 w-full">
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                        <span>Occupancy</span>
                        <span>{property.occupancyRate}%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all',
                            property.occupancyRate >= 80
                              ? 'bg-green-500'
                              : property.occupancyRate >= 50
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                          )}
                          style={{ width: `${property.occupancyRate}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-semibold">
                      {formatCurrency(property.revenue)}
                    </p>
                    <p className="text-xs text-muted-foreground">Revenue</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
