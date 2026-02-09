'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Upload,
  FileText,
  ArrowLeft,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface Property {
  id: string;
  name: string;
  addressLine1: string;
  city: string;
  state: string;
  zipCode: string;
  units: Unit[];
}

interface Unit {
  id: string;
  unitNumber: string;
  status: string;
  monthlyRent: string | number | null;
  depositAmount: string | number | null;
}

type Step = 1 | 2 | 3 | 4;

export default function CreateLeasePage() {
  const router = useRouter();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>(1);
  const [method, setMethod] = useState<'upload' | 'manual' | null>(null);

  // PDF upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedDocId, setUploadedDocId] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');

  // Property/unit selection
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoadingProperties, setIsLoadingProperties] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [selectedUnitId, setSelectedUnitId] = useState('');

  // Lease form fields
  const [form, setForm] = useState({
    tenantEmail: '',
    startDate: '',
    endDate: '',
    monthlyRent: '',
    depositAmount: '',
    lateFee: '',
    gracePeriodDays: '5',
    rentDueDay: '1',
    petDeposit: '',
    petRent: '',
    additionalTerms: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchProperties = useCallback(async () => {
    setIsLoadingProperties(true);
    try {
      const res = await fetch('/api/landlord/properties');
      const result = await res.json();
      if (result.success) {
        const propsWithUnits = await Promise.all(
          result.data.map(async (p: Property) => {
            const unitsRes = await fetch(`/api/landlord/properties/${p.id}/units`);
            const unitsResult = await unitsRes.json();
            return { ...p, units: unitsResult.success ? unitsResult.data : [] };
          })
        );
        setProperties(propsWithUnits);
      }
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load properties' });
    } finally {
      setIsLoadingProperties(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
    } else if (file) {
      toast({ variant: 'destructive', title: 'Invalid file', description: 'Please select a PDF file' });
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('pdf', selectedFile);

      const res = await fetch('/api/landlord/leases/upload-pdf', {
        method: 'POST',
        body: formData,
      });
      const result = await res.json();

      if (result.success) {
        setUploadedDocId(result.data.documentId);
        setUploadedFileName(result.data.fileName);
        toast({ title: 'PDF Uploaded', description: 'Your lease document has been uploaded.' });
        setStep(3);
      } else {
        toast({ variant: 'destructive', title: 'Upload Failed', description: result.error });
      }
    } catch {
      toast({ variant: 'destructive', title: 'Upload Failed', description: 'Failed to upload PDF' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleUnitChange = (unitId: string) => {
    setSelectedUnitId(unitId);
    const property = properties.find((p) => p.id === selectedPropertyId);
    const unit = property?.units.find((u) => u.id === unitId);
    if (unit) {
      setForm((prev) => ({
        ...prev,
        monthlyRent: prev.monthlyRent || (unit.monthlyRent?.toString() ?? ''),
        depositAmount: prev.depositAmount || (unit.depositAmount?.toString() ?? ''),
      }));
    }
  };

  const handleSubmit = async () => {
    if (!selectedUnitId) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please select a property and unit' });
      return;
    }
    if (!form.tenantEmail) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please enter a tenant email' });
      return;
    }
    if (!form.startDate || !form.endDate) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please enter start and end dates' });
      return;
    }
    if (!form.monthlyRent) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please enter monthly rent' });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/landlord/leases/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unitId: selectedUnitId,
          tenantEmail: form.tenantEmail,
          startDate: form.startDate,
          endDate: form.endDate,
          monthlyRent: parseFloat(form.monthlyRent),
          depositAmount: parseFloat(form.depositAmount || '0'),
          lateFee: form.lateFee ? parseFloat(form.lateFee) : null,
          gracePeriodDays: parseInt(form.gracePeriodDays || '5'),
          rentDueDay: parseInt(form.rentDueDay || '1'),
          petDeposit: form.petDeposit ? parseFloat(form.petDeposit) : null,
          petRent: form.petRent ? parseFloat(form.petRent) : null,
          additionalTerms: form.additionalTerms || null,
          leaseDocumentId: uploadedDocId || null,
        }),
      });

      const result = await res.json();
      if (result.success) {
        toast({ title: 'Lease Created', description: 'Lease created and invite sent to tenant.' });
        router.push('/landlord/leases');
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.error || 'Failed to create lease' });
      }
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to create lease' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedProperty = properties.find((p) => p.id === selectedPropertyId);
  const availableUnits = selectedProperty?.units.filter((u) => u.status === 'VACANT' || u.status === 'RESERVED') || [];

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/landlord/leases">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Create Lease</h1>
          <p className="text-muted-foreground">
            {step === 1 && 'Choose how to create your lease'}
            {step === 2 && 'Upload your lease PDF'}
            {step === 3 && 'Assign to a property and unit'}
            {step === 4 && 'Review and edit lease details'}
          </p>
        </div>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4].map((s) => {
          if (method === 'manual' && s === 2) return null;
          return (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step === s
                    ? 'bg-primary text-primary-foreground'
                    : step > s
                    ? 'bg-green-100 text-green-700'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {step > s ? <CheckCircle2 className="h-4 w-4" /> : s}
              </div>
              {s < 4 && !(method === 'manual' && s === 2) && (
                <div className={`w-8 h-0.5 ${step > s ? 'bg-green-300' : 'bg-muted'}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step 1: Choose method */}
      {step === 1 && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card
            className={`cursor-pointer transition-all hover:border-primary ${
              method === 'upload' ? 'border-primary ring-2 ring-primary/20' : ''
            }`}
            onClick={() => setMethod('upload')}
          >
            <CardHeader className="text-center">
              <Upload className="h-12 w-12 mx-auto text-primary mb-2" />
              <CardTitle>Upload PDF</CardTitle>
              <CardDescription>
                Upload an existing lease PDF. The tenant will review and sign it digitally.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card
            className={`cursor-pointer transition-all hover:border-primary ${
              method === 'manual' ? 'border-primary ring-2 ring-primary/20' : ''
            }`}
            onClick={() => setMethod('manual')}
          >
            <CardHeader className="text-center">
              <FileText className="h-12 w-12 mx-auto text-primary mb-2" />
              <CardTitle>Create Manually</CardTitle>
              <CardDescription>
                Fill in lease details from scratch. A digital lease will be generated automatically.
              </CardDescription>
            </CardHeader>
          </Card>

          {method && (
            <div className="md:col-span-2 flex justify-end">
              <Button onClick={() => setStep(method === 'upload' ? 2 : 3)}>
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Upload PDF */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Lease PDF</CardTitle>
            <CardDescription>
              Upload the lease document. The tenant will be able to review it before signing.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedFile ? (
              <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                <Upload className="h-10 w-10 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">Click to upload or drag and drop</span>
                <span className="text-xs text-muted-foreground mt-1">PDF files only</span>
                <input
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </label>
            ) : (
              <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-primary" />
                  <div>
                    <p className="font-medium">{selectedFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedFile(null);
                    setUploadedDocId(null);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={handleUpload} disabled={!selectedFile || isUploading}>
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    Upload & Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Assign property and unit */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Assign to Property</CardTitle>
            <CardDescription>
              Select the property and unit this lease belongs to.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {uploadedDocId && (
              <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                <div className="flex items-center gap-2 text-green-700 font-medium">
                  <CheckCircle2 className="h-4 w-4" />
                  PDF uploaded: {uploadedFileName}
                </div>
                <p className="text-sm text-green-600 mt-1">
                  Tenants will review this document before signing.
                </p>
              </div>
            )}

            {isLoadingProperties ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : properties.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No properties found. Create a property first.</p>
                <Link href="/landlord/properties">
                  <Button className="mt-4">Go to Properties</Button>
                </Link>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Property</Label>
                  <Select
                    value={selectedPropertyId}
                    onValueChange={(val) => {
                      setSelectedPropertyId(val);
                      setSelectedUnitId('');
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a property" />
                    </SelectTrigger>
                    <SelectContent>
                      {properties.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} — {p.addressLine1}, {p.city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedPropertyId && (
                  <div className="space-y-2">
                    <Label>Unit</Label>
                    {availableUnits.length === 0 ? (
                      <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-700">
                        <AlertCircle className="h-4 w-4 inline mr-1" />
                        No vacant units available for this property.
                      </div>
                    ) : (
                      <Select value={selectedUnitId} onValueChange={handleUnitChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a unit" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableUnits.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              Unit {u.unitNumber}
                              {u.monthlyRent ? ` — $${Number(u.monthlyRent).toLocaleString()}/mo` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                )}
              </>
            )}

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(method === 'upload' ? 2 : 1)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={() => setStep(4)} disabled={!selectedPropertyId || !selectedUnitId}>
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Review and edit lease details */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Review & Edit Lease Details</CardTitle>
            <CardDescription>
              Fill in the lease terms. An invite will be sent to the tenant to review
              {uploadedDocId ? ' the uploaded PDF and' : ''} sign.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Property/unit summary */}
            <div className="p-3 rounded-lg bg-muted text-sm">
              <span className="font-medium">Assigning to: </span>
              {selectedProperty?.name} — Unit{' '}
              {selectedProperty?.units.find((u) => u.id === selectedUnitId)?.unitNumber}
              {uploadedDocId && (
                <span className="ml-2 text-green-600">
                  <FileText className="h-3 w-3 inline" /> PDF attached
                </span>
              )}
            </div>

            {/* Tenant Info */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Tenant</h3>
              <div className="space-y-2">
                <Label htmlFor="tenantEmail">Tenant Email *</Label>
                <Input
                  id="tenantEmail"
                  type="email"
                  placeholder="tenant@example.com"
                  value={form.tenantEmail}
                  onChange={(e) => setForm({ ...form, tenantEmail: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  An invite will be sent to this email for the tenant to create an account and sign.
                </p>
              </div>
            </div>

            {/* Lease Term */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Lease Term</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date *</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Financial */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Financials</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="monthlyRent">Monthly Rent *</Label>
                  <Input
                    id="monthlyRent"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={form.monthlyRent}
                    onChange={(e) => setForm({ ...form, monthlyRent: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="depositAmount">Security Deposit</Label>
                  <Input
                    id="depositAmount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={form.depositAmount}
                    onChange={(e) => setForm({ ...form, depositAmount: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rentDueDay">Rent Due Day</Label>
                  <Input
                    id="rentDueDay"
                    type="number"
                    min="1"
                    max="28"
                    value={form.rentDueDay}
                    onChange={(e) => setForm({ ...form, rentDueDay: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gracePeriodDays">Grace Period (days)</Label>
                  <Input
                    id="gracePeriodDays"
                    type="number"
                    min="0"
                    value={form.gracePeriodDays}
                    onChange={(e) => setForm({ ...form, gracePeriodDays: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lateFee">Late Fee</Label>
                  <Input
                    id="lateFee"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={form.lateFee}
                    onChange={(e) => setForm({ ...form, lateFee: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Pet Policy */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Pet Policy</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="petDeposit">Pet Deposit</Label>
                  <Input
                    id="petDeposit"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={form.petDeposit}
                    onChange={(e) => setForm({ ...form, petDeposit: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="petRent">Monthly Pet Rent</Label>
                  <Input
                    id="petRent"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={form.petRent}
                    onChange={(e) => setForm({ ...form, petRent: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Additional Terms */}
            <div className="space-y-2">
              <Label htmlFor="additionalTerms">Additional Terms</Label>
              <Textarea
                id="additionalTerms"
                placeholder="Any additional lease terms or conditions..."
                rows={4}
                value={form.additionalTerms}
                onChange={(e) => setForm({ ...form, additionalTerms: e.target.value })}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => setStep(3)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Lease...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Create Lease & Send Invite
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
