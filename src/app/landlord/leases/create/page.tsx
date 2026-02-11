'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FileText,
  ArrowLeft,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Plus,
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
  bedrooms?: number;
  bathrooms?: number;
}

interface LeaseTemplate {
  id: string;
  name: string;
  description: string | null;
}

export default function CreateLeasePage() {
  const router = useRouter();
  const { toast } = useToast();

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Template selection
  const [templates, setTemplates] = useState<LeaseTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);

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
    numOccupants: '1',
    additionalTerms: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch('/api/landlord/lease-templates');
      const result = await res.json();
      if (result.success) {
        setTemplates(result.data.filter((t: any) => t.isActive));
      }
    } catch {
      console.error('Failed to fetch templates');
    } finally {
      setIsLoadingTemplates(false);
    }
  }, []);

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
    fetchTemplates();
    fetchProperties();
  }, [fetchTemplates, fetchProperties]);

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
          numOccupants: parseInt(form.numOccupants || '1'),
          additionalTerms: form.additionalTerms || null,
          templateId: selectedTemplateId || null,
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
            {step === 1 && 'Select a lease template and assign to property'}
            {step === 2 && 'Assign to a property and unit'}
            {step === 3 && 'Review and set lease details'}
          </p>
        </div>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((s) => (
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
            {s < 3 && (
              <div className={`w-8 h-0.5 ${step > s ? 'bg-green-300' : 'bg-muted'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Select template */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Choose a Lease Template</CardTitle>
            <CardDescription>
              Select a template for your lease agreement. The template text will auto-populate with
              tenant and property data.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingTemplates ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground mb-4">
                  No lease templates yet. Create one first.
                </p>
                <Link href="/landlord/leases/templates">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Template
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {templates.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTemplateId(t.id)}
                    className={`flex items-center gap-3 rounded-lg border p-4 cursor-pointer transition-colors ${
                      selectedTemplateId === t.id
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'hover:border-primary/50'
                    }`}
                  >
                    <FileText className="h-5 w-5 text-primary shrink-0" />
                    <div>
                      <p className="font-medium">{t.name}</p>
                      {t.description && (
                        <p className="text-xs text-muted-foreground">{t.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-4">
              <Button onClick={() => setStep(2)} disabled={!selectedTemplateId}>
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Assign property and unit */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Assign to Property</CardTitle>
            <CardDescription>
              Select the property and unit this lease belongs to.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={() => setStep(3)} disabled={!selectedPropertyId || !selectedUnitId}>
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Lease details */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Lease Details</CardTitle>
            <CardDescription>
              Enter the lease terms. These values will auto-populate into your template.
              An invite will be sent to the tenant to review and sign digitally.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Property/unit summary */}
            <div className="p-3 rounded-lg bg-muted text-sm">
              <span className="font-medium">Property: </span>
              {selectedProperty?.name} — Unit{' '}
              {selectedProperty?.units.find((u) => u.id === selectedUnitId)?.unitNumber}
              <span className="ml-3 text-primary">
                <FileText className="h-3 w-3 inline" /> {templates.find((t) => t.id === selectedTemplateId)?.name}
              </span>
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
                  An invite will be sent to this email for the tenant to create an account and sign digitally.
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
                <div className="space-y-2">
                  <Label htmlFor="numOccupants">Number of Occupants</Label>
                  <Input
                    id="numOccupants"
                    type="number"
                    min="1"
                    value={form.numOccupants}
                    onChange={(e) => setForm({ ...form, numOccupants: e.target.value })}
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
              <Button variant="outline" onClick={() => setStep(2)}>
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
