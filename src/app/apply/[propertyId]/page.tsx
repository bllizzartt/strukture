'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Loader2,
  Building2,
  User,
  Briefcase,
  Home,
  Users,
  Car,
  ShieldCheck,
  CheckCircle2,
  Upload,
  X,
  MapPin,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface PropertyInfo {
  id: string;
  name: string;
  type: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  zipCode: string;
  amenities: string[];
  units: {
    id: string;
    unitNumber: string;
    bedrooms: number;
    bathrooms: number;
    squareFeet: number | null;
    monthlyRent: string;
    depositAmount: string;
    features: string[];
    petPolicy: string | null;
  }[];
  owner: {
    firstName: string;
    lastName: string;
  };
}

type Step = 'personal' | 'address' | 'employment' | 'occupants' | 'documents' | 'consent';

const STEPS: { key: Step; label: string; icon: React.ReactNode }[] = [
  { key: 'personal', label: 'Personal Info', icon: <User className="h-4 w-4" /> },
  { key: 'address', label: 'Current Address', icon: <Home className="h-4 w-4" /> },
  { key: 'employment', label: 'Employment', icon: <Briefcase className="h-4 w-4" /> },
  { key: 'occupants', label: 'Occupants & Vehicles', icon: <Users className="h-4 w-4" /> },
  { key: 'documents', label: 'Documents', icon: <Upload className="h-4 w-4" /> },
  { key: 'consent', label: 'Review & Submit', icon: <ShieldCheck className="h-4 w-4" /> },
];

export default function ApplyPage() {
  const params = useParams();
  const propertyId = params.propertyId as string;

  const [property, setProperty] = useState<PropertyInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<Step>('personal');

  // Form state
  const [form, setForm] = useState({
    unitId: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    ssn4: '',
    // Current address
    currentAddress: '',
    currentCity: '',
    currentState: '',
    currentZip: '',
    monthlyRentCurrent: '',
    lengthAtAddress: '',
    reasonForLeaving: '',
    // Previous landlord
    previousLandlordName: '',
    previousLandlordPhone: '',
    previousLandlordEmail: '',
    // Employment
    employer: '',
    employerPhone: '',
    jobTitle: '',
    monthlyIncome: '',
    employmentLength: '',
    additionalIncome: '',
    additionalIncomeSource: '',
    // Occupants
    numberOfOccupants: '1',
    occupantNames: '',
    hasPets: false,
    petDetails: '',
    hasVehicles: false,
    vehicleDetails: '',
    // Emergency contact
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelation: '',
    // Background
    hasEviction: false,
    evictionDetails: '',
    hasFelony: false,
    felonyDetails: '',
    hasBankruptcy: false,
    // Move-in
    desiredMoveIn: '',
    desiredLeaseTerm: '12',
    // Consent
    backgroundCheckConsent: false,
    creditCheckConsent: false,
  });

  // File state
  const [files, setFiles] = useState<{
    idFront: File | null;
    idBack: File | null;
    w2: File | null;
    payStub1: File | null;
    payStub2: File | null;
    payStub3: File | null;
  }>({
    idFront: null,
    idBack: null,
    w2: null,
    payStub1: null,
    payStub2: null,
    payStub3: null,
  });

  useEffect(() => {
    async function fetchProperty() {
      try {
        const res = await fetch(`/api/applications/${propertyId}`);
        const result = await res.json();
        if (result.success) {
          setProperty(result.data);
        } else {
          setError(result.error || 'Property not found');
        }
      } catch {
        setError('Failed to load property information');
      } finally {
        setIsLoading(false);
      }
    }
    fetchProperty();
  }, [propertyId]);

  const updateForm = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (field: keyof typeof files, file: File | null) => {
    setFiles((prev) => ({ ...prev, [field]: file }));
  };

  const currentStepIndex = STEPS.findIndex((s) => s.key === currentStep);

  const goNext = () => {
    const idx = currentStepIndex;
    if (idx < STEPS.length - 1) {
      setCurrentStep(STEPS[idx + 1].key);
    }
  };

  const goPrev = () => {
    const idx = currentStepIndex;
    if (idx > 0) {
      setCurrentStep(STEPS[idx - 1].key);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();

      // Add all form fields
      Object.entries(form).forEach(([key, value]) => {
        if (value !== '' && value !== null && value !== undefined) {
          formData.append(key, String(value));
        }
      });

      // Add files
      Object.entries(files).forEach(([key, file]) => {
        if (file) {
          formData.append(key, file);
        }
      });

      const res = await fetch(`/api/applications/${propertyId}`, {
        method: 'POST',
        body: formData,
      });

      const result = await res.json();

      if (result.success) {
        setIsSubmitted(true);
      } else {
        setError(result.error || 'Failed to submit application');
      }
    } catch {
      setError('Failed to submit application. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error && !property) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Property Not Available</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Application Submitted!</h2>
            <p className="text-muted-foreground mb-4">
              Thank you for applying to {property?.name}. The property manager will review your
              application and contact you at <strong>{form.email}</strong>.
            </p>
            <p className="text-sm text-muted-foreground">
              You may close this page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!property) return null;

  const formatCurrency = (val: string) => {
    const num = parseFloat(val);
    return isNaN(num) ? val : `$${num.toLocaleString()}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Property Header */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{property.name}</h1>
                <div className="flex items-center gap-1 text-muted-foreground mt-1">
                  <MapPin className="h-4 w-4" />
                  <span>
                    {property.addressLine1}
                    {property.addressLine2 ? `, ${property.addressLine2}` : ''},{' '}
                    {property.city}, {property.state} {property.zipCode}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Managed by {property.owner.firstName} {property.owner.lastName}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step Indicator */}
        <div className="flex items-center justify-between overflow-x-auto gap-1 px-1">
          {STEPS.map((step, idx) => (
            <button
              key={step.key}
              onClick={() => setCurrentStep(step.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                step.key === currentStep
                  ? 'bg-primary text-primary-foreground'
                  : idx < currentStepIndex
                  ? 'bg-green-100 text-green-800'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {step.icon}
              <span className="hidden sm:inline">{step.label}</span>
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-destructive/10 text-destructive text-sm rounded-lg p-3">
            {error}
          </div>
        )}

        {/* Step Content */}
        <Card>
          {currentStep === 'personal' && (
            <>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Tell us about yourself</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Unit Selection */}
                {property.units.length > 0 && (
                  <div className="space-y-2">
                    <Label>Unit of Interest</Label>
                    <Select
                      value={form.unitId}
                      onValueChange={(val) => updateForm('unitId', val)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a unit (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {property.units.map((unit) => (
                          <SelectItem key={unit.id} value={unit.id}>
                            Unit {unit.unitNumber} - {unit.bedrooms}BR/{unit.bathrooms}BA -{' '}
                            {formatCurrency(unit.monthlyRent)}/mo
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={form.firstName}
                      onChange={(e) => updateForm('firstName', e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      value={form.lastName}
                      onChange={(e) => updateForm('lastName', e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={(e) => updateForm('email', e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={form.phone}
                      onChange={(e) => updateForm('phone', e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dateOfBirth">Date of Birth</Label>
                    <Input
                      id="dateOfBirth"
                      type="date"
                      value={form.dateOfBirth}
                      onChange={(e) => updateForm('dateOfBirth', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ssn4">Last 4 of SSN</Label>
                    <Input
                      id="ssn4"
                      maxLength={4}
                      placeholder="XXXX"
                      value={form.ssn4}
                      onChange={(e) => updateForm('ssn4', e.target.value.replace(/\D/g, '').slice(0, 4))}
                    />
                  </div>
                </div>

                {/* Emergency Contact */}
                <div className="border-t pt-4 mt-4">
                  <h3 className="font-medium mb-3">Emergency Contact</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="emergencyContactName">Name</Label>
                      <Input
                        id="emergencyContactName"
                        value={form.emergencyContactName}
                        onChange={(e) => updateForm('emergencyContactName', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="emergencyContactPhone">Phone</Label>
                      <Input
                        id="emergencyContactPhone"
                        type="tel"
                        value={form.emergencyContactPhone}
                        onChange={(e) => updateForm('emergencyContactPhone', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2 mt-4">
                    <Label htmlFor="emergencyContactRelation">Relationship</Label>
                    <Input
                      id="emergencyContactRelation"
                      value={form.emergencyContactRelation}
                      onChange={(e) => updateForm('emergencyContactRelation', e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </>
          )}

          {currentStep === 'address' && (
            <>
              <CardHeader>
                <CardTitle>Current Address</CardTitle>
                <CardDescription>Where do you currently live?</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentAddress">Street Address</Label>
                  <Input
                    id="currentAddress"
                    value={form.currentAddress}
                    onChange={(e) => updateForm('currentAddress', e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentCity">City</Label>
                    <Input
                      id="currentCity"
                      value={form.currentCity}
                      onChange={(e) => updateForm('currentCity', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currentState">State</Label>
                    <Input
                      id="currentState"
                      value={form.currentState}
                      onChange={(e) => updateForm('currentState', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currentZip">ZIP Code</Label>
                    <Input
                      id="currentZip"
                      value={form.currentZip}
                      onChange={(e) => updateForm('currentZip', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="monthlyRentCurrent">Current Monthly Rent</Label>
                    <Input
                      id="monthlyRentCurrent"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={form.monthlyRentCurrent}
                      onChange={(e) => updateForm('monthlyRentCurrent', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lengthAtAddress">Length at Current Address</Label>
                    <Select
                      value={form.lengthAtAddress}
                      onValueChange={(val) => updateForm('lengthAtAddress', val)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select duration" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Less than 6 months">Less than 6 months</SelectItem>
                        <SelectItem value="6-12 months">6-12 months</SelectItem>
                        <SelectItem value="1-2 years">1-2 years</SelectItem>
                        <SelectItem value="2-5 years">2-5 years</SelectItem>
                        <SelectItem value="5+ years">5+ years</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reasonForLeaving">Reason for Leaving</Label>
                  <Textarea
                    id="reasonForLeaving"
                    value={form.reasonForLeaving}
                    onChange={(e) => updateForm('reasonForLeaving', e.target.value)}
                    rows={2}
                  />
                </div>

                {/* Previous Landlord */}
                <div className="border-t pt-4 mt-4">
                  <h3 className="font-medium mb-3">Previous / Current Landlord Reference</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="previousLandlordName">Landlord Name</Label>
                      <Input
                        id="previousLandlordName"
                        value={form.previousLandlordName}
                        onChange={(e) => updateForm('previousLandlordName', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="previousLandlordPhone">Landlord Phone</Label>
                      <Input
                        id="previousLandlordPhone"
                        type="tel"
                        value={form.previousLandlordPhone}
                        onChange={(e) => updateForm('previousLandlordPhone', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2 mt-4">
                    <Label htmlFor="previousLandlordEmail">Landlord Email</Label>
                    <Input
                      id="previousLandlordEmail"
                      type="email"
                      value={form.previousLandlordEmail}
                      onChange={(e) => updateForm('previousLandlordEmail', e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </>
          )}

          {currentStep === 'employment' && (
            <>
              <CardHeader>
                <CardTitle>Employment & Income</CardTitle>
                <CardDescription>Tell us about your employment and income</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="employer">Employer Name</Label>
                    <Input
                      id="employer"
                      value={form.employer}
                      onChange={(e) => updateForm('employer', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="employerPhone">Employer Phone</Label>
                    <Input
                      id="employerPhone"
                      type="tel"
                      value={form.employerPhone}
                      onChange={(e) => updateForm('employerPhone', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="jobTitle">Job Title</Label>
                    <Input
                      id="jobTitle"
                      value={form.jobTitle}
                      onChange={(e) => updateForm('jobTitle', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="employmentLength">Length of Employment</Label>
                    <Select
                      value={form.employmentLength}
                      onValueChange={(val) => updateForm('employmentLength', val)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select duration" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Less than 6 months">Less than 6 months</SelectItem>
                        <SelectItem value="6-12 months">6-12 months</SelectItem>
                        <SelectItem value="1-2 years">1-2 years</SelectItem>
                        <SelectItem value="2-5 years">2-5 years</SelectItem>
                        <SelectItem value="5+ years">5+ years</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="monthlyIncome">Gross Monthly Income</Label>
                  <Input
                    id="monthlyIncome"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={form.monthlyIncome}
                    onChange={(e) => updateForm('monthlyIncome', e.target.value)}
                  />
                </div>

                <div className="border-t pt-4 mt-4">
                  <h3 className="font-medium mb-3">Additional Income (Optional)</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="additionalIncome">Monthly Amount</Label>
                      <Input
                        id="additionalIncome"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={form.additionalIncome}
                        onChange={(e) => updateForm('additionalIncome', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="additionalIncomeSource">Source</Label>
                      <Input
                        id="additionalIncomeSource"
                        placeholder="e.g., Freelance, Child Support"
                        value={form.additionalIncomeSource}
                        onChange={(e) => updateForm('additionalIncomeSource', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </>
          )}

          {currentStep === 'occupants' && (
            <>
              <CardHeader>
                <CardTitle>Occupants, Pets & Vehicles</CardTitle>
                <CardDescription>Who and what will be at the property?</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="numberOfOccupants">Number of Occupants (including yourself)</Label>
                  <Select
                    value={form.numberOfOccupants}
                    onValueChange={(val) => updateForm('numberOfOccupants', val)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {parseInt(form.numberOfOccupants) > 1 && (
                  <div className="space-y-2">
                    <Label htmlFor="occupantNames">
                      Names & Ages of Additional Occupants
                    </Label>
                    <Textarea
                      id="occupantNames"
                      placeholder="e.g., Jane Doe (Age 30), John Doe Jr. (Age 5)"
                      value={form.occupantNames}
                      onChange={(e) => updateForm('occupantNames', e.target.value)}
                      rows={3}
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="desiredMoveIn">Desired Move-In Date</Label>
                    <Input
                      id="desiredMoveIn"
                      type="date"
                      value={form.desiredMoveIn}
                      onChange={(e) => updateForm('desiredMoveIn', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="desiredLeaseTerm">Desired Lease Term</Label>
                    <Select
                      value={form.desiredLeaseTerm}
                      onValueChange={(val) => updateForm('desiredLeaseTerm', val)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="6">6 months</SelectItem>
                        <SelectItem value="12">12 months</SelectItem>
                        <SelectItem value="18">18 months</SelectItem>
                        <SelectItem value="24">24 months</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Pets */}
                <div className="border-t pt-4 mt-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <Checkbox
                      id="hasPets"
                      checked={form.hasPets}
                      onCheckedChange={(checked) => updateForm('hasPets', !!checked)}
                    />
                    <Label htmlFor="hasPets" className="font-medium">
                      I have pets
                    </Label>
                  </div>
                  {form.hasPets && (
                    <div className="space-y-2">
                      <Label htmlFor="petDetails">
                        Pet Details (type, breed, weight, quantity)
                      </Label>
                      <Textarea
                        id="petDetails"
                        placeholder="e.g., 1 dog - Golden Retriever, 60 lbs"
                        value={form.petDetails}
                        onChange={(e) => updateForm('petDetails', e.target.value)}
                        rows={2}
                      />
                    </div>
                  )}
                </div>

                {/* Vehicles */}
                <div className="border-t pt-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <Checkbox
                      id="hasVehicles"
                      checked={form.hasVehicles}
                      onCheckedChange={(checked) => updateForm('hasVehicles', !!checked)}
                    />
                    <Label htmlFor="hasVehicles" className="font-medium">
                      I have vehicles
                    </Label>
                  </div>
                  {form.hasVehicles && (
                    <div className="space-y-2">
                      <Label htmlFor="vehicleDetails">
                        Vehicle Details (year, make, model, license plate)
                      </Label>
                      <Textarea
                        id="vehicleDetails"
                        placeholder="e.g., 2020 Honda Civic, ABC-1234"
                        value={form.vehicleDetails}
                        onChange={(e) => updateForm('vehicleDetails', e.target.value)}
                        rows={2}
                      />
                    </div>
                  )}
                </div>

                {/* Background Questions */}
                <div className="border-t pt-4">
                  <h3 className="font-medium mb-3">Background Questions</h3>
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="hasEviction"
                          checked={form.hasEviction}
                          onCheckedChange={(checked) => updateForm('hasEviction', !!checked)}
                        />
                        <Label htmlFor="hasEviction">
                          Have you ever been evicted or asked to leave a rental?
                        </Label>
                      </div>
                      {form.hasEviction && (
                        <Textarea
                          className="mt-2"
                          placeholder="Please explain..."
                          value={form.evictionDetails}
                          onChange={(e) => updateForm('evictionDetails', e.target.value)}
                          rows={2}
                        />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="hasFelony"
                          checked={form.hasFelony}
                          onCheckedChange={(checked) => updateForm('hasFelony', !!checked)}
                        />
                        <Label htmlFor="hasFelony">
                          Have you ever been convicted of a felony?
                        </Label>
                      </div>
                      {form.hasFelony && (
                        <Textarea
                          className="mt-2"
                          placeholder="Please explain..."
                          value={form.felonyDetails}
                          onChange={(e) => updateForm('felonyDetails', e.target.value)}
                          rows={2}
                        />
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="hasBankruptcy"
                        checked={form.hasBankruptcy}
                        onCheckedChange={(checked) => updateForm('hasBankruptcy', !!checked)}
                      />
                      <Label htmlFor="hasBankruptcy">
                        Have you ever filed for bankruptcy?
                      </Label>
                    </div>
                  </div>
                </div>
              </CardContent>
            </>
          )}

          {currentStep === 'documents' && (
            <>
              <CardHeader>
                <CardTitle>Document Uploads</CardTitle>
                <CardDescription>
                  Upload required documents to complete your application. Accepted formats: PDF, JPG,
                  PNG.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* ID */}
                <div>
                  <h3 className="font-medium mb-3">Government-Issued ID</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <FileUploadField
                      label="ID - Front"
                      file={files.idFront}
                      onChange={(f) => handleFileChange('idFront', f)}
                    />
                    <FileUploadField
                      label="ID - Back"
                      file={files.idBack}
                      onChange={(f) => handleFileChange('idBack', f)}
                    />
                  </div>
                </div>

                {/* Income */}
                <div className="border-t pt-4">
                  <h3 className="font-medium mb-3">Proof of Income</h3>
                  <div className="space-y-4">
                    <FileUploadField
                      label="W2 or Business Income Documentation"
                      file={files.w2}
                      onChange={(f) => handleFileChange('w2', f)}
                    />
                  </div>
                </div>

                {/* Pay Stubs */}
                <div className="border-t pt-4">
                  <h3 className="font-medium mb-3">Recent Pay Stubs (last 3 months)</h3>
                  <div className="space-y-4">
                    <FileUploadField
                      label="Pay Stub 1 (Most Recent)"
                      file={files.payStub1}
                      onChange={(f) => handleFileChange('payStub1', f)}
                    />
                    <FileUploadField
                      label="Pay Stub 2"
                      file={files.payStub2}
                      onChange={(f) => handleFileChange('payStub2', f)}
                    />
                    <FileUploadField
                      label="Pay Stub 3"
                      file={files.payStub3}
                      onChange={(f) => handleFileChange('payStub3', f)}
                    />
                  </div>
                </div>
              </CardContent>
            </>
          )}

          {currentStep === 'consent' && (
            <>
              <CardHeader>
                <CardTitle>Review & Submit</CardTitle>
                <CardDescription>
                  Please review and confirm the following before submitting
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Summary */}
                <div className="rounded-lg bg-muted p-4 space-y-2 text-sm">
                  <p>
                    <strong>Applicant:</strong> {form.firstName} {form.lastName}
                  </p>
                  <p>
                    <strong>Email:</strong> {form.email}
                  </p>
                  <p>
                    <strong>Phone:</strong> {form.phone}
                  </p>
                  {form.employer && (
                    <p>
                      <strong>Employer:</strong> {form.employer} - {form.jobTitle}
                    </p>
                  )}
                  {form.monthlyIncome && (
                    <p>
                      <strong>Monthly Income:</strong> ${parseFloat(form.monthlyIncome).toLocaleString()}
                    </p>
                  )}
                  <p>
                    <strong>Occupants:</strong> {form.numberOfOccupants}
                  </p>
                  <p>
                    <strong>Documents Uploaded:</strong>{' '}
                    {Object.values(files).filter(Boolean).length} of 6
                  </p>
                </div>

                {/* Consent checkboxes */}
                <div className="space-y-4 pt-4">
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="backgroundCheckConsent"
                      checked={form.backgroundCheckConsent}
                      onCheckedChange={(checked) =>
                        updateForm('backgroundCheckConsent', !!checked)
                      }
                    />
                    <Label htmlFor="backgroundCheckConsent" className="text-sm leading-relaxed">
                      I authorize the landlord/property manager to conduct a background check as part
                      of this rental application process.
                    </Label>
                  </div>

                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="creditCheckConsent"
                      checked={form.creditCheckConsent}
                      onCheckedChange={(checked) => updateForm('creditCheckConsent', !!checked)}
                    />
                    <Label htmlFor="creditCheckConsent" className="text-sm leading-relaxed">
                      I authorize the landlord/property manager to pull my credit report as part of
                      this rental application process.
                    </Label>
                  </div>

                  <div className="rounded-lg border p-3 text-xs text-muted-foreground">
                    By submitting this application, I certify that all information provided is true and
                    accurate to the best of my knowledge. I understand that providing false information
                    may result in denial of my application or termination of any resulting lease
                    agreement.
                  </div>
                </div>
              </CardContent>
            </>
          )}
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={goPrev}
            disabled={currentStepIndex === 0}
          >
            Previous
          </Button>

          {currentStep === 'consent' ? (
            <Button
              onClick={handleSubmit}
              disabled={
                isSubmitting ||
                !form.firstName ||
                !form.lastName ||
                !form.email ||
                !form.phone ||
                !form.backgroundCheckConsent ||
                !form.creditCheckConsent
              }
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Application'
              )}
            </Button>
          ) : (
            <Button onClick={goNext}>Next</Button>
          )}
        </div>
      </div>
    </div>
  );
}

function FileUploadField({
  label,
  file,
  onChange,
}: {
  label: string;
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {file ? (
        <div className="flex items-center gap-2 rounded-lg border p-3">
          <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
          <span className="text-sm truncate flex-1">{file.name}</span>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-muted-foreground hover:text-destructive"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed p-4 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors">
          <Upload className="h-4 w-4" />
          <span>Click to upload</span>
          <input
            type="file"
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) => {
              const f = e.target.files?.[0] || null;
              onChange(f);
            }}
          />
        </label>
      )}
    </div>
  );
}
