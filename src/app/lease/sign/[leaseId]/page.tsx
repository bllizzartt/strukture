'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import SignatureCanvas from 'react-signature-canvas';
import {
  Loader2,
  Check,
  AlertCircle,
  Eraser,
  Building2,
  Calendar,
  DollarSign,
  FileText,
  Home,
  Clock,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import type { LeaseDocumentData } from '@/components/lease/lease-document';

const PDFDownloadLink = dynamic(
  () => import('@react-pdf/renderer').then((mod) => mod.PDFDownloadLink),
  { ssr: false }
);
const LeaseDocumentLazy = dynamic(
  () => import('@/components/lease/lease-document').then((mod) => ({ default: mod.LeaseDocument })),
  { ssr: false }
);

interface LeaseData {
  id: string;
  status: string;
  startDate: string;
  endDate: string;
  monthlyRent: string | number;
  depositAmount: string | number;
  lateFee: string | number | null;
  gracePeriodDays: number;
  rentDueDay: number;
  petDeposit: string | number | null;
  petRent: string | number | null;
  additionalTerms: string | null;
  leaseDocumentId: string | null;
  tenantSignedAt: string | null;
  landlordSignedAt: string | null;
  tenant: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    status: string;
  };
  unit: {
    unitNumber: string;
    property: {
      name: string;
      addressLine1: string;
      addressLine2: string | null;
      city: string;
      state: string;
      zipCode: string;
      owner: {
        firstName: string;
        lastName: string;
        email: string;
      };
    };
  };
}

export default function LeaseSignPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const { toast } = useToast();
  const signatureRef = useRef<SignatureCanvas>(null);

  const [lease, setLease] = useState<LeaseData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigning, setIsSigning] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [pdfData, setPdfData] = useState<LeaseDocumentData | null>(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);

  const leaseId = params.leaseId as string;

  const fetchLease = useCallback(async () => {
    try {
      const response = await fetch(`/api/lease/${leaseId}`);
      const result = await response.json();
      if (result.success) {
        setLease(result.data);
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load lease',
      });
    } finally {
      setIsLoading(false);
    }
  }, [leaseId, toast]);

  useEffect(() => {
    fetchLease();
  }, [fetchLease]);

  const fetchPdfData = async () => {
    setIsLoadingPdf(true);
    try {
      const response = await fetch(`/api/lease/${leaseId}/pdf`);
      const result = await response.json();
      if (result.success) {
        setPdfData(result.data);
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load PDF data' });
    } finally {
      setIsLoadingPdf(false);
    }
  };

  const handleClearSignature = () => {
    signatureRef.current?.clear();
    setHasSignature(false);
  };

  const handleSignatureEnd = () => {
    setHasSignature(!signatureRef.current?.isEmpty());
  };

  const handleSign = async () => {
    if (!agreed) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please agree to the lease terms' });
      return;
    }
    if (!hasSignature || signatureRef.current?.isEmpty()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please provide your signature' });
      return;
    }

    setIsSigning(true);
    try {
      const signature = signatureRef.current?.toDataURL('image/png') || '';
      const response = await fetch(`/api/lease/${leaseId}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signature }),
      });

      const result = await response.json();
      if (result.success) {
        toast({ title: 'Lease Signed', description: result.message });
        fetchLease(); // Refresh to show updated status
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to sign lease' });
    } finally {
      setIsSigning(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!lease) {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="border-b">
          <div className="container flex h-16 items-center">
            <Link href="/" className="flex items-center gap-2">
              <Building2 className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold">Strukture</span>
            </Link>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md text-center">
            <CardContent className="pt-8 pb-8">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium">Lease Not Found</p>
              <p className="text-sm text-muted-foreground mt-2">
                This lease link may be invalid or expired.
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Check if user needs to log in or register
  const needsAuth = sessionStatus !== 'authenticated';
  const isCurrentUserTenant = session?.user?.id === lease.tenant.id || session?.user?.email === lease.tenant.email;
  const isCurrentUserLandlord = session?.user?.email === lease.unit.property.owner.email;
  const canSign = isCurrentUserTenant || isCurrentUserLandlord;
  const alreadySigned = isCurrentUserTenant ? !!lease.tenantSignedAt : isCurrentUserLandlord ? !!lease.landlordSignedAt : false;
  const leaseFullySigned = !!lease.tenantSignedAt && !!lease.landlordSignedAt;

  const monthlyRent = typeof lease.monthlyRent === 'string' ? parseFloat(lease.monthlyRent) : lease.monthlyRent;
  const depositAmount = typeof lease.depositAmount === 'string' ? parseFloat(lease.depositAmount) : lease.depositAmount;
  const landlordName = `${lease.unit.property.owner.firstName} ${lease.unit.property.owner.lastName}`;
  const propertyAddress = `${lease.unit.property.addressLine1}, ${lease.unit.property.city}, ${lease.unit.property.state} ${lease.unit.property.zipCode}`;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="container flex h-16 items-center">
          <Link href="/" className="flex items-center gap-2">
            <Building2 className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">Strukture</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 container max-w-3xl py-8 px-4">
        <div className="space-y-6">
          {/* Title */}
          <div>
            <h1 className="text-3xl font-bold">Lease Agreement</h1>
            <p className="text-muted-foreground">
              {lease.unit.property.name} - Unit {lease.unit.unitNumber}
            </p>
          </div>

          {/* Status Banner */}
          {leaseFullySigned && (
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-600" />
                <p className="text-green-800 font-medium">This lease has been fully signed and is now active.</p>
              </div>
              {sessionStatus === 'authenticated' && (
                <>
                  {!pdfData ? (
                    <Button onClick={fetchPdfData} disabled={isLoadingPdf} variant="outline" size="sm">
                      {isLoadingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                      Download PDF
                    </Button>
                  ) : (
                    <PDFDownloadLink
                      document={<LeaseDocumentLazy data={pdfData} />}
                      fileName={`lease-${lease.unit.property.name}-unit-${lease.unit.unitNumber}.pdf`}
                    >
                      {({ loading }) => (
                        <Button variant="outline" size="sm" disabled={loading}>
                          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                          {loading ? 'Generating...' : 'Download PDF'}
                        </Button>
                      )}
                    </PDFDownloadLink>
                  )}
                </>
              )}
            </div>
          )}

          {alreadySigned && !leaseFullySigned && (
            <div className="flex items-center gap-2 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <Check className="h-5 w-5 text-blue-600" />
              <p className="text-blue-800 font-medium">
                You have signed this lease. Waiting for the {isCurrentUserTenant ? 'landlord' : 'tenant'} to sign.
              </p>
            </div>
          )}

          {/* Uploaded Lease PDF Viewer */}
          {lease.leaseDocumentId && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Lease Document
                </CardTitle>
                <CardDescription>
                  Review the full lease document below before signing.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden bg-gray-100">
                  <iframe
                    src={`/api/lease/${leaseId}/document`}
                    className="w-full"
                    style={{ height: '600px' }}
                    title="Lease Document PDF"
                  />
                </div>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-muted-foreground">
                    Scroll through the document above to review all terms before signing below.
                  </p>
                  <a
                    href={`/api/lease/${leaseId}/document?download=true`}
                    download
                  >
                    <Button variant="outline" size="sm">
                      <FileText className="mr-2 h-4 w-4" />
                      Download PDF
                    </Button>
                  </a>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Parties */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Parties
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Landlord</p>
                <p className="font-medium">{landlordName}</p>
                <p className="text-sm text-muted-foreground">{lease.unit.property.owner.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tenant</p>
                <p className="font-medium">
                  {lease.tenant.firstName !== 'Pending' ? `${lease.tenant.firstName} ${lease.tenant.lastName}` : lease.tenant.email}
                </p>
                <p className="text-sm text-muted-foreground">{lease.tenant.email}</p>
              </div>
            </CardContent>
          </Card>

          {/* Property */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="h-5 w-5 text-primary" />
                Property
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Property</p>
                  <p className="font-medium">{lease.unit.property.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Unit</p>
                  <p className="font-medium">{lease.unit.unitNumber}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm text-muted-foreground">Address</p>
                  <p className="font-medium">{propertyAddress}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lease Terms */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Lease Terms
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div>
                  <p className="text-sm text-muted-foreground">Start Date</p>
                  <p className="font-medium">{format(new Date(lease.startDate), 'MMMM d, yyyy')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">End Date</p>
                  <p className="font-medium">{format(new Date(lease.endDate), 'MMMM d, yyyy')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Rent Due Day</p>
                  <p className="font-medium">{lease.rentDueDay}st of each month</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Financial */}
          <Card className="bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                Financial Terms
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div>
                  <p className="text-sm text-muted-foreground">Monthly Rent</p>
                  <p className="text-lg font-semibold">{formatCurrency(monthlyRent)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Security Deposit</p>
                  <p className="text-lg font-semibold">{formatCurrency(depositAmount)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Grace Period</p>
                  <p className="font-medium">{lease.gracePeriodDays} days</p>
                </div>
                {lease.lateFee && (
                  <div>
                    <p className="text-sm text-muted-foreground">Late Fee</p>
                    <p className="font-medium">
                      {formatCurrency(typeof lease.lateFee === 'string' ? parseFloat(lease.lateFee) : lease.lateFee)}
                    </p>
                  </div>
                )}
                {lease.petDeposit && (
                  <div>
                    <p className="text-sm text-muted-foreground">Pet Deposit</p>
                    <p className="font-medium">
                      {formatCurrency(typeof lease.petDeposit === 'string' ? parseFloat(lease.petDeposit) : lease.petDeposit)}
                    </p>
                  </div>
                )}
                {lease.petRent && (
                  <div>
                    <p className="text-sm text-muted-foreground">Pet Rent</p>
                    <p className="font-medium">
                      {formatCurrency(typeof lease.petRent === 'string' ? parseFloat(lease.petRent) : lease.petRent)}/mo
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t">
                <div className="flex justify-between items-center">
                  <p className="font-medium">Due at Signing</p>
                  <p className="text-xl font-bold text-primary">
                    {formatCurrency(monthlyRent + depositAmount)}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  First month&apos;s rent + security deposit
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Standard Terms */}
          <Card>
            <CardHeader>
              <CardTitle>General Terms</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>a) Tenant shall use the premises solely for residential purposes and shall not engage in any unlawful activities on the property.</p>
              <p>b) Tenant shall maintain the premises in a clean and sanitary condition and shall not make any alterations without the prior written consent of Landlord.</p>
              <p>c) Tenant shall not assign this lease or sublet the premises without the prior written consent of Landlord.</p>
              <p>d) Landlord shall maintain the structural components of the building, including plumbing, electrical, and HVAC systems, in good working order.</p>
              <p>e) Either party may terminate this lease with 30 days written notice prior to the end of the lease term or any renewal period.</p>
            </CardContent>
          </Card>

          {/* Additional Terms */}
          {lease.additionalTerms && (
            <Card>
              <CardHeader>
                <CardTitle>Additional Terms</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{lease.additionalTerms}</p>
              </CardContent>
            </Card>
          )}

          {/* Signature Status */}
          <Card>
            <CardHeader>
              <CardTitle>Signatures</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Landlord</p>
                  <p className="font-medium">{landlordName}</p>
                  {lease.landlordSignedAt ? (
                    <p className="text-sm text-green-600 mt-2 flex items-center gap-1">
                      <Check className="h-4 w-4" />
                      Signed on {format(new Date(lease.landlordSignedAt), 'MMM d, yyyy')}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-2">Pending signature</p>
                  )}
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Tenant</p>
                  <p className="font-medium">
                    {lease.tenant.firstName !== 'Pending' ? `${lease.tenant.firstName} ${lease.tenant.lastName}` : lease.tenant.email}
                  </p>
                  {lease.tenantSignedAt ? (
                    <p className="text-sm text-green-600 mt-2 flex items-center gap-1">
                      <Check className="h-4 w-4" />
                      Signed on {format(new Date(lease.tenantSignedAt), 'MMM d, yyyy')}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-2">Pending signature</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Auth Required */}
          {needsAuth && !leaseFullySigned && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800">Sign in to sign this lease</p>
                    <p className="text-sm text-amber-700 mt-1">
                      You need to create an account or sign in to sign this lease.
                    </p>
                    <div className="flex gap-3 mt-4">
                      <Link href={`/register?role=TENANT&callbackUrl=/lease/sign/${leaseId}`}>
                        <Button>Create Account</Button>
                      </Link>
                      <Link href={`/login?callbackUrl=/lease/sign/${leaseId}`}>
                        <Button variant="outline">Sign In</Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sign Section */}
          {canSign && !alreadySigned && !leaseFullySigned && (
            <>
              {/* Terms Agreement */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="terms"
                      checked={agreed}
                      onCheckedChange={(checked) => setAgreed(checked as boolean)}
                    />
                    <div className="space-y-1">
                      <label htmlFor="terms" className="text-sm font-medium leading-none cursor-pointer">
                        I agree to the lease terms and conditions
                      </label>
                      <p className="text-xs text-muted-foreground">
                        By checking this box, I acknowledge that I have read and agree to all terms outlined
                        in this lease agreement. I understand that my electronic signature is legally binding
                        under the ESIGN Act and UETA.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Signature Pad */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">Your Signature</CardTitle>
                    <Button type="button" variant="ghost" size="sm" onClick={handleClearSignature}>
                      <Eraser className="h-4 w-4 mr-1" />
                      Clear
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg bg-white">
                    <SignatureCanvas
                      ref={signatureRef}
                      canvasProps={{
                        className: 'w-full h-40 cursor-crosshair',
                        style: { width: '100%', height: '160px' },
                      }}
                      onEnd={handleSignatureEnd}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Sign above using your mouse or touch screen.
                  </p>
                </CardContent>
              </Card>

              {/* Submit */}
              <div className="flex justify-end">
                <Button
                  size="lg"
                  onClick={handleSign}
                  disabled={isSigning || !agreed || !hasSignature}
                >
                  {isSigning ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Sign Lease Agreement
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-4 bg-white">
        <div className="container text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Strukture. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
