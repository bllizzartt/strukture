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
  Trash2,
  Users,
  Baby,
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

interface CoTenant {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  relationship: string;
}

interface MinorOccupant {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  relationship: string;
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
    tenantFirstName: '',
    tenantLastName: '',
    tenantPhone: '',
    tenantDob: '',
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

  // Co-tenants and minor occupants
  const [coTenants, setCoTenants] = useState<CoTenant[]>([]);
  const [minorOccupants, setMinorOccupants] = useState<MinorOccupant[]>([]);

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

  const addCoTenant = () => {
    setCoTenants([...coTenants, { firstName: '', lastName: '', email: '', phone: '', dateOfBirth: '', relationship: '' }]);
  };

  const removeCoTenant = (index: number) => {
    setCoTenants(coTenants.filter((_, i) => i !== index));
  };

  const updateCoTenant = (index: number, field: keyof CoTenant, value: string) => {
    setCoTenants(coTenants.map((ct, i) => i === index ? { ...ct, [field]: value } : ct));
  };

  const addMinor = () => {
    setMinorOccupants([...minorOccupants, { firstName: '', lastName: '', dateOfBirth: '', relationship: 'Child' }]);
  };

  const removeMinor = (index: number) => {
    setMinorOccupants(minorOccupants.filter((_, i) => i !== index));
  };

  const updateMinor = (index: number, field: keyof MinorOccupant, value: string) => {
    setMinorOccupants(minorOccupants.map((m, i) => i === index ? { ...m, [field]: value } : m));
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

    // Validate co-tenants
    for (let i = 0; i < coTenants.length; i++) {
      const ct = coTenants[i];
      if (!ct.firstName || !ct.lastName || !ct.email) {
        toast({ variant: 'destructive', title: 'Error', description: `Co-tenant ${i + 1}: First name, last name, and email are required` });
        return;
      }
    }

    // Validate minors
    for (let i = 0; i < minorOccupants.length; i++) {
      const m = minorOccupants[i];
      if (!m.firstName || !m.lastName || !m.dateOfBirth) {
        toast({ variant: 'destructive', title: 'Error', description: `Minor occupant ${i + 1}: First name, last name, and date of birth are required` });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const totalOccupants = 1 + coTenants.length + minorOccupants.length;

      const res = await fetch('/api/landlord/leases/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unitId: selectedUnitId,
          tenantEmail: form.tenantEmail,
          tenantFirstName: form.tenantFirstName || undefined,
          tenantLastName: form.tenantLastName || undefined,
          tenantPhone: form.tenantPhone || undefined,
          tenantDob: form.tenantDob || undefined,
          startDate: form.startDate,
          endDate: form.endDate,
          monthlyRent: parseFloat(form.monthlyRent),
          depositAmount: parseFloat(form.depositAmount || '0'),
          lateFee: form.lateFee ? parseFloat(form.lateFee) : null,
          gracePeriodDays: parseInt(form.gracePeriodDays || '5'),
          rentDueDay: parseInt(form.rentDueDay || '1'),
          petDeposit: form.petDeposit ? parseFloat(form.petDeposit) : null,
          petRent: form.petRent ? parseFloat(form.petRent) : null,
          numOccupants: totalOccupants,
          additionalTerms: form.additionalTerms || null,
          templateId: selectedTemplateId || null,
          coTenants: coTenants.filter(ct => ct.firstName && ct.email),
          minorOccupants: minorOccupants.filter(m => m.firstName && m.dateOfBirth),
        }),
      });

      const result = await res.json();
      if (result.success) {
        if (result.failedEmails?.length > 0) {
          toast({
            variant: 'destructive',
            title: 'Lease Created — Email Issue',
            description: `Lease created but failed to deliver invite to: ${result.failedEmails.join(', ')}. You can resend from the lease details. Please check the email address and try again.`,
          });
        } else {
          toast({ title: 'Lease Created', description: result.message || 'Lease created and invite sent to tenant(s).' });
        }
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
              Enter the lease terms and all occupant information. All adult tenants will receive a signing invite.
              Per New Mexico law (NMSA § 47-8-20), all adult tenants must sign the lease.
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

            {/* Primary Tenant Info */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Primary Tenant</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tenantFirstName">First Name</Label>
                  <Input
                    id="tenantFirstName"
                    placeholder="John"
                    value={form.tenantFirstName}
                    onChange={(e) => setForm({ ...form, tenantFirstName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tenantLastName">Last Name</Label>
                  <Input
                    id="tenantLastName"
                    placeholder="Doe"
                    value={form.tenantLastName}
                    onChange={(e) => setForm({ ...form, tenantLastName: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tenantEmail">Email *</Label>
                <Input
                  id="tenantEmail"
                  type="email"
                  placeholder="tenant@example.com"
                  value={form.tenantEmail}
                  onChange={(e) => setForm({ ...form, tenantEmail: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  A signing invite will be sent to this email.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tenantPhone">Phone</Label>
                  <Input
                    id="tenantPhone"
                    type="tel"
                    placeholder="(505) 555-0100"
                    value={form.tenantPhone}
                    onChange={(e) => setForm({ ...form, tenantPhone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tenantDob">Date of Birth</Label>
                  <Input
                    id="tenantDob"
                    type="date"
                    value={form.tenantDob}
                    onChange={(e) => setForm({ ...form, tenantDob: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Co-Tenants */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Additional Adult Tenants
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    All adults (18+) residing in the unit must be listed and will need to sign (NMSA § 47-8-20).
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addCoTenant}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Tenant
                </Button>
              </div>

              {coTenants.length === 0 && (
                <div className="p-4 rounded-lg border border-dashed text-center text-sm text-muted-foreground">
                  No additional tenants. Click &quot;Add Tenant&quot; if more than one adult will reside in the unit.
                </div>
              )}

              {coTenants.map((ct, i) => (
                <div key={i} className="p-4 rounded-lg border space-y-3 relative">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-primary">Co-Tenant {i + 1}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCoTenant(i)}
                      className="text-destructive hover:text-destructive h-7 px-2"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">First Name *</Label>
                      <Input
                        placeholder="Jane"
                        value={ct.firstName}
                        onChange={(e) => updateCoTenant(i, 'firstName', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Last Name *</Label>
                      <Input
                        placeholder="Doe"
                        value={ct.lastName}
                        onChange={(e) => updateCoTenant(i, 'lastName', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Email * (signing invite will be sent here)</Label>
                    <Input
                      type="email"
                      placeholder="cotenant@example.com"
                      value={ct.email}
                      onChange={(e) => updateCoTenant(i, 'email', e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Phone</Label>
                      <Input
                        type="tel"
                        placeholder="(505) 555-0101"
                        value={ct.phone}
                        onChange={(e) => updateCoTenant(i, 'phone', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Date of Birth</Label>
                      <Input
                        type="date"
                        value={ct.dateOfBirth}
                        onChange={(e) => updateCoTenant(i, 'dateOfBirth', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Relationship</Label>
                      <Select value={ct.relationship} onValueChange={(val) => updateCoTenant(i, 'relationship', val)}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Spouse">Spouse</SelectItem>
                          <SelectItem value="Domestic Partner">Domestic Partner</SelectItem>
                          <SelectItem value="Roommate">Roommate</SelectItem>
                          <SelectItem value="Family Member">Family Member</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Minor Occupants */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Baby className="h-5 w-5 text-primary" />
                    Minor Occupants (Under 18)
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    List all children under 18 who will reside in the unit. Minors do not sign the lease.
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addMinor}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Minor
                </Button>
              </div>

              {minorOccupants.length === 0 && (
                <div className="p-4 rounded-lg border border-dashed text-center text-sm text-muted-foreground">
                  No minor occupants. Click &quot;Add Minor&quot; to list children under 18.
                </div>
              )}

              {minorOccupants.map((m, i) => (
                <div key={i} className="p-4 rounded-lg border space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-primary">Minor {i + 1}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMinor(i)}
                      className="text-destructive hover:text-destructive h-7 px-2"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">First Name *</Label>
                      <Input
                        placeholder="First name"
                        value={m.firstName}
                        onChange={(e) => updateMinor(i, 'firstName', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Last Name *</Label>
                      <Input
                        placeholder="Last name"
                        value={m.lastName}
                        onChange={(e) => updateMinor(i, 'lastName', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Date of Birth *</Label>
                      <Input
                        type="date"
                        value={m.dateOfBirth}
                        onChange={(e) => updateMinor(i, 'dateOfBirth', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Relationship</Label>
                      <Select value={m.relationship} onValueChange={(val) => updateMinor(i, 'relationship', val)}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Child">Child</SelectItem>
                          <SelectItem value="Stepchild">Stepchild</SelectItem>
                          <SelectItem value="Grandchild">Grandchild</SelectItem>
                          <SelectItem value="Foster Child">Foster Child</SelectItem>
                          <SelectItem value="Dependent">Dependent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
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

            {/* Occupant Summary */}
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-800">
              <span className="font-medium">Total Occupants: </span>
              {1 + coTenants.length + minorOccupants.length}
              {coTenants.length > 0 && <span> ({coTenants.length + 1} adults signing)</span>}
              {minorOccupants.length > 0 && <span> + {minorOccupants.length} minor{minorOccupants.length > 1 ? 's' : ''}</span>}
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
                    Create Lease & Send Invite{coTenants.length > 0 ? 's' : ''}
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
