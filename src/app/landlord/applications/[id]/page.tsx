'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Loader2,
  User,
  Building2,
  Briefcase,
  Home,
  Car,
  Users,
  FileText,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  DollarSign,
  Phone,
  Mail,
  Calendar,
  ShieldAlert,
  Search,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ApplicationDetail {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string | null;
  ssn4: string | null;
  currentAddress: string | null;
  currentCity: string | null;
  currentState: string | null;
  currentZip: string | null;
  monthlyRentCurrent: string | null;
  lengthAtAddress: string | null;
  reasonForLeaving: string | null;
  previousLandlordName: string | null;
  previousLandlordPhone: string | null;
  previousLandlordEmail: string | null;
  employer: string | null;
  employerPhone: string | null;
  jobTitle: string | null;
  monthlyIncome: string | null;
  employmentLength: string | null;
  additionalIncome: string | null;
  additionalIncomeSource: string | null;
  numberOfOccupants: number;
  occupantNames: string | null;
  hasPets: boolean;
  petDetails: string | null;
  hasVehicles: boolean;
  vehicleDetails: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  emergencyContactRelation: string | null;
  hasEviction: boolean;
  evictionDetails: string | null;
  hasFelony: boolean;
  felonyDetails: string | null;
  hasBankruptcy: boolean;
  desiredMoveIn: string | null;
  desiredLeaseTerm: string | null;
  backgroundCheckConsent: boolean;
  creditCheckConsent: boolean;
  status: string;
  reviewNotes: string | null;
  reviewedAt: string | null;
  createdAt: string;
  property: { id: string; name: string; ownerId: string };
  unit: { id: string; unitNumber: string; monthlyRent: string } | null;
  documents: {
    id: string;
    type: string;
    name: string;
    mimeType: string;
    fileSize: number;
    createdAt: string;
  }[];
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  SUBMITTED: { label: 'Submitted', color: 'bg-blue-100 text-blue-800', icon: <Clock className="h-4 w-4" /> },
  UNDER_REVIEW: { label: 'Under Review', color: 'bg-yellow-100 text-yellow-800', icon: <Eye className="h-4 w-4" /> },
  APPROVED: { label: 'Approved', color: 'bg-green-100 text-green-800', icon: <CheckCircle2 className="h-4 w-4" /> },
  DENIED: { label: 'Denied', color: 'bg-red-100 text-red-800', icon: <XCircle className="h-4 w-4" /> },
  WITHDRAWN: { label: 'Withdrawn', color: 'bg-gray-100 text-gray-800', icon: <XCircle className="h-4 w-4" /> },
};

export default function ApplicationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const appId = params.id as string;

  const [app, setApp] = useState<ApplicationDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');

  const fetchApplication = useCallback(async () => {
    try {
      const res = await fetch(`/api/landlord/applications/${appId}`);
      const result = await res.json();
      if (result.success) {
        setApp(result.data);
        setReviewNotes(result.data.reviewNotes || '');
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
        router.push('/landlord/applications');
      }
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load application' });
    } finally {
      setIsLoading(false);
    }
  }, [appId, toast, router]);

  useEffect(() => {
    fetchApplication();
  }, [fetchApplication]);

  const updateStatus = async (status: string) => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/landlord/applications/${appId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, reviewNotes }),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: 'Success', description: `Application ${status.toLowerCase().replace('_', ' ')}` });
        fetchApplication();
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
      }
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update application' });
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!app) return null;

  const status = statusConfig[app.status] || statusConfig.SUBMITTED;
  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/landlord/applications">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">
                {app.firstName} {app.lastName}
              </h1>
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
                  status.color
                )}
              >
                {status.icon}
                {status.label}
              </span>
            </div>
            <p className="text-muted-foreground">
              Applied for {app.property.name}
              {app.unit && ` - Unit ${app.unit.unitNumber}`} on{' '}
              {new Date(app.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        {(app.status === 'SUBMITTED' || app.status === 'UNDER_REVIEW') && (
          <div className="flex gap-2">
            {app.status === 'SUBMITTED' && (
              <Button variant="outline" onClick={() => updateStatus('UNDER_REVIEW')} disabled={isUpdating}>
                <Eye className="mr-2 h-4 w-4" />
                Mark as Reviewing
              </Button>
            )}

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="default" disabled={isUpdating}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Approve
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Approve Application</AlertDialogTitle>
                  <AlertDialogDescription>
                    Approve the rental application for {app.firstName} {app.lastName}? You can then
                    proceed to create a lease for this applicant.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => updateStatus('APPROVED')}>
                    Approve
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isUpdating}>
                  <XCircle className="mr-2 h-4 w-4" />
                  Deny
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Deny Application</AlertDialogTitle>
                  <AlertDialogDescription>
                    Deny the rental application for {app.firstName} {app.lastName}? This action
                    cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => updateStatus('DENIED')}
                    className="bg-destructive text-destructive-foreground"
                  >
                    Deny Application
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Info - Left 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <InfoRow label="Full Name" value={`${app.firstName} ${app.lastName}`} />
                <InfoRow
                  label="Email"
                  value={app.email}
                  icon={<Mail className="h-3.5 w-3.5" />}
                />
                <InfoRow
                  label="Phone"
                  value={app.phone}
                  icon={<Phone className="h-3.5 w-3.5" />}
                />
                <InfoRow
                  label="Date of Birth"
                  value={app.dateOfBirth ? new Date(app.dateOfBirth).toLocaleDateString() : null}
                />
                <InfoRow label="SSN" value={app.ssn4 ? `***-**-${app.ssn4}` : null} />
              </div>

              {app.emergencyContactName && (
                <div className="border-t mt-4 pt-4">
                  <h4 className="text-sm font-medium mb-2">Emergency Contact</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <InfoRow label="Name" value={app.emergencyContactName} />
                    <InfoRow label="Phone" value={app.emergencyContactPhone} />
                    <InfoRow label="Relationship" value={app.emergencyContactRelation} />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Current Address */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="h-5 w-5" />
                Current Address & Landlord Reference
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <InfoRow
                  label="Address"
                  value={
                    app.currentAddress
                      ? `${app.currentAddress}, ${app.currentCity}, ${app.currentState} ${app.currentZip}`
                      : null
                  }
                  className="col-span-2"
                />
                <InfoRow
                  label="Current Rent"
                  value={
                    app.monthlyRentCurrent
                      ? `$${parseFloat(app.monthlyRentCurrent).toLocaleString()}/mo`
                      : null
                  }
                />
                <InfoRow label="Length at Address" value={app.lengthAtAddress} />
                <InfoRow label="Reason for Leaving" value={app.reasonForLeaving} className="col-span-2" />
              </div>

              {app.previousLandlordName && (
                <div className="border-t mt-4 pt-4">
                  <h4 className="text-sm font-medium mb-2">Previous/Current Landlord</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <InfoRow label="Name" value={app.previousLandlordName} />
                    <InfoRow label="Phone" value={app.previousLandlordPhone} />
                    <InfoRow label="Email" value={app.previousLandlordEmail} />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Employment */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Employment & Income
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <InfoRow label="Employer" value={app.employer} />
                <InfoRow label="Employer Phone" value={app.employerPhone} />
                <InfoRow label="Job Title" value={app.jobTitle} />
                <InfoRow label="Length of Employment" value={app.employmentLength} />
                <InfoRow
                  label="Monthly Income"
                  value={
                    app.monthlyIncome
                      ? `$${parseFloat(app.monthlyIncome).toLocaleString()}`
                      : null
                  }
                  icon={<DollarSign className="h-3.5 w-3.5" />}
                  highlight
                />
                {app.additionalIncome && (
                  <>
                    <InfoRow
                      label="Additional Income"
                      value={`$${parseFloat(app.additionalIncome).toLocaleString()}`}
                    />
                    <InfoRow label="Source" value={app.additionalIncomeSource} />
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Occupants, Pets, Vehicles */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Occupants, Pets & Vehicles
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <InfoRow label="Number of Occupants" value={String(app.numberOfOccupants)} />
                <InfoRow
                  label="Desired Move-In"
                  value={app.desiredMoveIn ? new Date(app.desiredMoveIn).toLocaleDateString() : null}
                  icon={<Calendar className="h-3.5 w-3.5" />}
                />
                <InfoRow label="Desired Lease Term" value={app.desiredLeaseTerm ? `${app.desiredLeaseTerm} months` : null} />
              </div>
              {app.occupantNames && (
                <InfoRow label="Additional Occupants" value={app.occupantNames} className="col-span-2" />
              )}

              {app.hasPets && (
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium mb-2">Pets</h4>
                  <p className="text-sm">{app.petDetails || 'Yes (no details provided)'}</p>
                </div>
              )}

              {app.hasVehicles && (
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium mb-2">Vehicles</h4>
                  <p className="text-sm">{app.vehicleDetails || 'Yes (no details provided)'}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Background */}
          {(app.hasEviction || app.hasFelony || app.hasBankruptcy) && (
            <Card className="border-orange-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-700">
                  <ShieldAlert className="h-5 w-5" />
                  Background Disclosures
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {app.hasEviction && (
                  <div>
                    <p className="text-sm font-medium text-orange-700">Previous Eviction</p>
                    <p className="text-sm">{app.evictionDetails || 'No details provided'}</p>
                  </div>
                )}
                {app.hasFelony && (
                  <div>
                    <p className="text-sm font-medium text-orange-700">Felony Conviction</p>
                    <p className="text-sm">{app.felonyDetails || 'No details provided'}</p>
                  </div>
                )}
                {app.hasBankruptcy && (
                  <div>
                    <p className="text-sm font-medium text-orange-700">Bankruptcy</p>
                    <p className="text-sm">Applicant has declared a previous bankruptcy.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          {/* Documents */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Uploaded Documents
              </CardTitle>
              <CardDescription>{app.documents.length} documents</CardDescription>
            </CardHeader>
            <CardContent>
              {app.documents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No documents uploaded</p>
              ) : (
                <div className="space-y-2">
                  {app.documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{doc.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatBytes(doc.fileSize)} &middot; {doc.type.replace('_', ' ')}
                        </p>
                      </div>
                      <a
                        href={`/api/landlord/applications/${app.id}/documents/${doc.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button variant="ghost" size="icon" title="View document">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Consent */}
          <Card>
            <CardHeader>
              <CardTitle>Consent</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2">
                {app.backgroundCheckConsent ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span className="text-sm">Background Check</span>
              </div>
              <div className="flex items-center gap-2">
                {app.creditCheckConsent ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span className="text-sm">Credit Check</span>
              </div>
            </CardContent>
          </Card>

          {/* Screening */}
          {app.backgroundCheckConsent && app.creditCheckConsent && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Tenant Screening
                </CardTitle>
                <CardDescription>
                  Run background and credit checks through a third-party provider.
                  The applicant has consented to both checks.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Use one of the services below to screen this applicant. Their full SSN is encrypted on
                  file and will be provided securely to the screening provider.
                </p>
                <div className="space-y-2">
                  <a
                    href="https://www.mysmartmove.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium">TransUnion SmartMove</p>
                      <p className="text-xs text-muted-foreground">Credit, criminal, eviction reports</p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </a>
                  <a
                    href="https://www.rentprep.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium">RentPrep</p>
                      <p className="text-xs text-muted-foreground">Background & credit screening</p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </a>
                  <a
                    href="https://certn.co/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium">Certn</p>
                      <p className="text-xs text-muted-foreground">Comprehensive tenant screening</p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </a>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Review Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Review Notes</CardTitle>
              <CardDescription>Internal notes about this application</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Add notes about this applicant..."
                rows={4}
              />
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => updateStatus(app.status === 'SUBMITTED' ? 'UNDER_REVIEW' : app.status)}
                disabled={isUpdating}
              >
                {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Notes
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  icon,
  highlight,
  className,
}: {
  label: string;
  value: string | null;
  icon?: React.ReactNode;
  highlight?: boolean;
  className?: string;
}) {
  if (!value) return null;
  return (
    <div className={className}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="flex items-center gap-1">
        {icon}
        <p className={cn('text-sm', highlight && 'text-lg font-semibold text-primary')}>{value}</p>
      </div>
    </div>
  );
}
