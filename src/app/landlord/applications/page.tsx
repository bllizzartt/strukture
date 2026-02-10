'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Loader2,
  FileText,
  User,
  Building2,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface Application {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: string;
  monthlyIncome: string | null;
  numberOfOccupants: number;
  createdAt: string;
  property: { id: string; name: string };
  unit: { id: string; unitNumber: string } | null;
  documents: { id: string; type: string; name: string }[];
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  SUBMITTED: {
    label: 'Submitted',
    color: 'bg-blue-100 text-blue-800',
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  UNDER_REVIEW: {
    label: 'Under Review',
    color: 'bg-yellow-100 text-yellow-800',
    icon: <Eye className="h-3.5 w-3.5" />,
  },
  APPROVED: {
    label: 'Approved',
    color: 'bg-green-100 text-green-800',
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  DENIED: {
    label: 'Denied',
    color: 'bg-red-100 text-red-800',
    icon: <XCircle className="h-3.5 w-3.5" />,
  },
  WITHDRAWN: {
    label: 'Withdrawn',
    color: 'bg-gray-100 text-gray-800',
    icon: <XCircle className="h-3.5 w-3.5" />,
  },
};

export default function ApplicationsListPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchApplications = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const res = await fetch(`/api/landlord/applications?${params}`);
      const result = await res.json();
      if (result.success) {
        setApplications(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch applications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const filtered = applications.filter((app) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      app.firstName.toLowerCase().includes(q) ||
      app.lastName.toLowerCase().includes(q) ||
      app.email.toLowerCase().includes(q) ||
      app.property.name.toLowerCase().includes(q)
    );
  });

  const counts = {
    all: applications.length,
    SUBMITTED: applications.filter((a) => a.status === 'SUBMITTED').length,
    UNDER_REVIEW: applications.filter((a) => a.status === 'UNDER_REVIEW').length,
    APPROVED: applications.filter((a) => a.status === 'APPROVED').length,
    DENIED: applications.filter((a) => a.status === 'DENIED').length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Rental Applications</h1>
        <p className="text-muted-foreground">Review and manage applications from prospective tenants</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { key: 'all', label: 'Total', count: counts.all },
          { key: 'SUBMITTED', label: 'New', count: counts.SUBMITTED },
          { key: 'UNDER_REVIEW', label: 'Reviewing', count: counts.UNDER_REVIEW },
          { key: 'APPROVED', label: 'Approved', count: counts.APPROVED },
          { key: 'DENIED', label: 'Denied', count: counts.DENIED },
        ].map((stat) => (
          <button
            key={stat.key}
            onClick={() => setStatusFilter(stat.key)}
            className={cn(
              'rounded-lg border p-3 text-left transition-colors',
              statusFilter === stat.key ? 'border-primary bg-primary/5' : 'hover:bg-muted'
            )}
          >
            <p className="text-2xl font-bold">{stat.count}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or property..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="SUBMITTED">Submitted</SelectItem>
            <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="DENIED">Denied</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Applications List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Applications</h3>
            <p className="text-muted-foreground">
              {applications.length === 0
                ? 'No rental applications have been submitted yet.'
                : 'No applications match your filters.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((app) => {
            const status = statusConfig[app.status] || statusConfig.SUBMITTED;
            return (
              <Link key={app.id} href={`/landlord/applications/${app.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">
                              {app.firstName} {app.lastName}
                            </p>
                            <span
                              className={cn(
                                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                                status.color
                              )}
                            >
                              {status.icon}
                              {status.label}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">{app.email}</p>
                        </div>
                      </div>
                      <div className="text-right hidden md:block">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Building2 className="h-3.5 w-3.5" />
                          {app.property.name}
                          {app.unit && ` - Unit ${app.unit.unitNumber}`}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(app.createdAt).toLocaleDateString()} &middot;{' '}
                          {app.documents.length} docs uploaded
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
