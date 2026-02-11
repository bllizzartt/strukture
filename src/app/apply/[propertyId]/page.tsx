'use client';

import { useEffect, useState, useCallback } from 'react';
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
  Eye,
  Calendar,
  Clock,
  CreditCard,
  Landmark,
  Copy,
  DollarSign,
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
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { getStripe } from '@/lib/stripe/client';

const SCREENING_FEE = 45;
const MAX_IMAGE_DIMENSION = 1600; // max width/height for uploaded images
const IMAGE_QUALITY = 0.8; // JPEG compression quality

/**
 * Compress image files to reduce upload size and avoid server body limits.
 * Non-image files (PDFs, etc.) are returned as-is.
 */
async function compressFileIfImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.size < 500_000) {
    return file; // Skip non-images and small files (<500KB)
  }

  return new Promise<File>((resolve) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;

      // Scale down if larger than max dimension
      if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
        const ratio = Math.min(MAX_IMAGE_DIMENSION / width, MAX_IMAGE_DIMENSION / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= file.size) {
            resolve(file); // Keep original if compression didn't help
          } else {
            resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }));
          }
        },
        'image/jpeg',
        IMAGE_QUALITY
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file); // Return original on error
    };
    img.src = url;
  });
}

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

type Step = 'personal' | 'address' | 'employment' | 'occupants' | 'documents' | 'consent' | 'payment';

const STEPS: { key: Step; label: string; icon: React.ReactNode }[] = [
  { key: 'personal', label: 'Personal Info', icon: <User className="h-4 w-4" /> },
  { key: 'address', label: 'Current Address', icon: <Home className="h-4 w-4" /> },
  { key: 'employment', label: 'Employment', icon: <Briefcase className="h-4 w-4" /> },
  { key: 'occupants', label: 'Occupants & Vehicles', icon: <Users className="h-4 w-4" /> },
  { key: 'documents', label: 'Documents', icon: <Upload className="h-4 w-4" /> },
  { key: 'consent', label: 'Review & Submit', icon: <ShieldCheck className="h-4 w-4" /> },
  { key: 'payment', label: 'Payment', icon: <CreditCard className="h-4 w-4" /> },
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

  // Payment state
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'CARD' | 'WIRE_TRANSFER'>('CARD');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [wireRef, setWireRef] = useState<string | null>(null);
  const [wireSubmitted, setWireSubmitted] = useState(false);

  // Form state
  const [form, setForm] = useState({
    unitId: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    ssn: '',
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

  // Supporting documents (unlimited)
  const [supportingDocs, setSupportingDocs] = useState<{ file: File; label: string }[]>([]);

  const addSupportingDocs = (newFiles: FileList | null) => {
    if (!newFiles) return;
    const additions = Array.from(newFiles)
      .filter((f) => f.type === 'application/pdf')
      .map((file) => ({ file, label: file.name.replace(/\.pdf$/i, '') }));
    setSupportingDocs((prev) => [...prev, ...additions]);
  };

  const removeSupportingDoc = (index: number) => {
    setSupportingDocs((prev) => prev.filter((_, i) => i !== index));
  };

  const updateSupportingDocLabel = (index: number, label: string) => {
    setSupportingDocs((prev) =>
      prev.map((doc, i) => (i === index ? { ...doc, label } : doc))
    );
  };

  // Viewing request state
  const [showViewingForm, setShowViewingForm] = useState(false);
  const [viewingSubmitting, setViewingSubmitting] = useState(false);
  const [viewingSubmitted, setViewingSubmitted] = useState(false);
  const [viewingError, setViewingError] = useState<string | null>(null);
  const [viewingSlots, setViewingSlots] = useState<{ id: string; dayOfWeek: number; startTime: string; endTime: string }[]>([]);
  const [viewingSlotsLoading, setViewingSlotsLoading] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [viewingForm, setViewingForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    message: '',
    preferredDate1: '',
    preferredDate2: '',
    preferredDate3: '',
  });

  const fetchViewingSlots = async () => {
    setViewingSlotsLoading(true);
    try {
      const res = await fetch(`/api/viewings?propertyId=${propertyId}`);
      const result = await res.json();
      if (result.success && result.data.length > 0) {
        setViewingSlots(result.data);
      }
    } catch {
      // Slots not available, fall back to manual date selection
    } finally {
      setViewingSlotsLoading(false);
    }
  };

  const handleShowViewingForm = () => {
    setShowViewingForm(true);
    fetchViewingSlots();
  };

  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const formatSlotDay = (dayOfWeek: number) => {
    return DAY_NAMES[dayOfWeek] || '';
  };

  const formatSlotTime = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
  };

  const handleViewingSubmit = async () => {
    setViewingSubmitting(true);
    setViewingError(null);

    try {
      const res = await fetch('/api/viewings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId,
          ...(selectedSlotId ? { slotId: selectedSlotId } : {}),
          firstName: viewingForm.firstName,
          lastName: viewingForm.lastName,
          email: viewingForm.email,
          phone: viewingForm.phone,
          message: viewingForm.message || undefined,
          ...(selectedSlotId
            ? {}
            : {
                preferredDate1: viewingForm.preferredDate1,
                preferredDate2: viewingForm.preferredDate2 || undefined,
                preferredDate3: viewingForm.preferredDate3 || undefined,
              }),
        }),
      });

      const result = await res.json();
      if (result.success) {
        setViewingSubmitted(true);
      } else {
        setViewingError(result.error || 'Failed to submit viewing request');
      }
    } catch {
      setViewingError('Failed to submit viewing request. Please try again.');
    } finally {
      setViewingSubmitting(false);
    }
  };

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

      // Add files — compress images before uploading to stay under server limits
      for (const [key, file] of Object.entries(files)) {
        if (file) {
          const compressed = await compressFileIfImage(file);
          formData.append(key, compressed);
        }
      }

      // Add supporting documents — compress images
      for (let i = 0; i < supportingDocs.length; i++) {
        const doc = supportingDocs[i];
        const compressed = await compressFileIfImage(doc.file);
        formData.append(`supportingDoc_${i}`, compressed);
        formData.append(`supportingDocLabel_${i}`, doc.label);
      }
      formData.append('supportingDocCount', String(supportingDocs.length));

      const res = await fetch(`/api/applications/${propertyId}`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok && res.status === 413) {
        setError('Your uploaded files are too large. Please reduce file sizes (use smaller images or compressed PDFs) and try again.');
        return;
      }

      let result;
      try {
        result = await res.json();
      } catch {
        setError(`Server error (${res.status}). Your files may be too large — try compressing images or using smaller PDFs.`);
        return;
      }

      if (result.success) {
        setApplicationId(result.data.id);
        setCurrentStep('payment');
      } else {
        setError(result.error || 'Failed to submit application');
      }
    } catch (err) {
      setError(err instanceof Error ? `Failed to submit: ${err.message}` : 'Failed to submit application. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Initialize Stripe PaymentIntent for card payments
  const initializeCardPayment = useCallback(async () => {
    if (!applicationId || clientSecret) return;
    setPaymentLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/applications/${propertyId}/screening-fee`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId }),
      });

      const result = await res.json();
      if (result.success) {
        setClientSecret(result.data.clientSecret);
      } else {
        setError(result.error || 'Failed to initialize payment');
      }
    } catch {
      setError('Failed to initialize payment. Please try again.');
    } finally {
      setPaymentLoading(false);
    }
  }, [applicationId, clientSecret, propertyId]);

  // When switching to CARD payment method and we have an applicationId, initialize payment
  useEffect(() => {
    if (currentStep === 'payment' && paymentMethod === 'CARD' && applicationId && !clientSecret) {
      initializeCardPayment();
    }
  }, [currentStep, paymentMethod, applicationId, clientSecret, initializeCardPayment]);

  // Handle successful Stripe payment
  const handlePaymentSuccess = async () => {
    setPaymentLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/applications/${propertyId}/confirm-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId, method: 'CARD' }),
      });

      const result = await res.json();
      if (result.success) {
        setIsSubmitted(true);
      } else {
        setError(result.error || 'Failed to confirm payment');
      }
    } catch {
      setError('Failed to confirm payment. Please try again.');
    } finally {
      setPaymentLoading(false);
    }
  };

  // Handle wire transfer selection
  const handleWireTransfer = async () => {
    setPaymentLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/applications/${propertyId}/confirm-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId, method: 'WIRE_TRANSFER' }),
      });

      const result = await res.json();
      if (result.success) {
        setWireRef(result.data.wireRef);
        setWireSubmitted(true);
      } else {
        setError(result.error || 'Failed to process wire transfer request');
      }
    } catch {
      setError('Failed to process request. Please try again.');
    } finally {
      setPaymentLoading(false);
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
              Thank you for applying to {property?.name}. Your screening fee has been paid.
              The property manager will review your application and contact you at{' '}
              <strong>{form.email}</strong>.
            </p>
            <p className="text-sm text-muted-foreground">
              You may close this page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (wireSubmitted && wireRef) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-lg w-full mx-4">
          <CardContent className="pt-6 text-center">
            <Landmark className="h-16 w-16 text-blue-500 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Application Received</h2>
            <p className="text-muted-foreground mb-6">
              Your application for <strong>{property?.name}</strong> has been received.
              Please complete the screening fee payment via wire transfer to finalize your application.
            </p>

            <div className="rounded-lg border bg-muted/50 p-5 text-left space-y-3 mb-6">
              <h3 className="font-semibold text-center">Wire Transfer Instructions</h3>
              <div className="space-y-2 text-sm">
                <p><strong>Amount:</strong> ${SCREENING_FEE}.00</p>
                <div className="flex items-center justify-between">
                  <p><strong>Reference Number:</strong> <span className="font-mono text-primary">{wireRef}</span></p>
                  <button
                    onClick={() => navigator.clipboard.writeText(wireRef)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
                <div className="rounded border p-3 bg-background text-xs space-y-1 mt-2">
                  <p>Include the reference number <strong>{wireRef}</strong> in your wire transfer memo.</p>
                  <p>The property manager will provide bank account details and confirm receipt of your payment.</p>
                  <p>Your application will be reviewed once payment is confirmed.</p>
                </div>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              A confirmation has been sent to <strong>{form.email}</strong>. You may close this page.
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

        {/* Schedule a Viewing Card */}
        {!viewingSubmitted ? (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              {!showViewingForm ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Eye className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Want to see it first?</h3>
                      <p className="text-sm text-muted-foreground">
                        Schedule an in-person viewing before submitting your application. No SSN required.
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleShowViewingForm}
                  >
                    <Calendar className="h-4 w-4 mr-1" />
                    Schedule Viewing
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-primary" />
                      Schedule a Viewing
                    </h3>
                    <button
                      onClick={() => setShowViewingForm(false)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {viewingError && (
                    <div className="bg-destructive/10 text-destructive text-sm rounded-lg p-3">
                      {viewingError}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="vf-firstName">First Name *</Label>
                      <Input
                        id="vf-firstName"
                        value={viewingForm.firstName}
                        onChange={(e) =>
                          setViewingForm((f) => ({ ...f, firstName: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="vf-lastName">Last Name *</Label>
                      <Input
                        id="vf-lastName"
                        value={viewingForm.lastName}
                        onChange={(e) =>
                          setViewingForm((f) => ({ ...f, lastName: e.target.value }))
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="vf-email">Email *</Label>
                      <Input
                        id="vf-email"
                        type="email"
                        value={viewingForm.email}
                        onChange={(e) =>
                          setViewingForm((f) => ({ ...f, email: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="vf-phone">Phone *</Label>
                      <Input
                        id="vf-phone"
                        type="tel"
                        value={viewingForm.phone}
                        onChange={(e) =>
                          setViewingForm((f) => ({ ...f, phone: e.target.value }))
                        }
                      />
                    </div>
                  </div>

                  {/* Time slot selection or manual date pickers */}
                  {viewingSlotsLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      <span className="ml-2 text-sm text-muted-foreground">Loading available times...</span>
                    </div>
                  ) : viewingSlots.length > 0 ? (
                    <div className="space-y-2">
                      <Label>Select a Time Slot *</Label>
                      <div className="grid gap-2 max-h-48 overflow-y-auto pr-1">
                        {viewingSlots.map((slot) => (
                          <button
                            key={slot.id}
                            type="button"
                            onClick={() => setSelectedSlotId(selectedSlotId === slot.id ? null : slot.id)}
                            className={`flex items-center gap-3 rounded-lg border p-3 text-left text-sm transition-colors ${
                              selectedSlotId === slot.id
                                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                : 'hover:border-primary/50'
                            }`}
                          >
                            <Calendar className="h-4 w-4 text-primary shrink-0" />
                            <span className="font-medium">{formatSlotDay(slot.dayOfWeek)}</span>
                            <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="text-muted-foreground">{formatSlotTime(slot.startTime)} - {formatSlotTime(slot.endTime)}</span>
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Select a recurring time slot for your preferred viewing day.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-1.5">
                        <Label htmlFor="vf-date1">Preferred Date & Time *</Label>
                        <Input
                          id="vf-date1"
                          type="datetime-local"
                          value={viewingForm.preferredDate1}
                          onChange={(e) =>
                            setViewingForm((f) => ({ ...f, preferredDate1: e.target.value }))
                          }
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="vf-date2">2nd Choice (Optional)</Label>
                          <Input
                            id="vf-date2"
                            type="datetime-local"
                            value={viewingForm.preferredDate2}
                            onChange={(e) =>
                              setViewingForm((f) => ({ ...f, preferredDate2: e.target.value }))
                            }
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="vf-date3">3rd Choice (Optional)</Label>
                          <Input
                            id="vf-date3"
                            type="datetime-local"
                            value={viewingForm.preferredDate3}
                            onChange={(e) =>
                              setViewingForm((f) => ({ ...f, preferredDate3: e.target.value }))
                            }
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <div className="space-y-1.5">
                    <Label htmlFor="vf-message">Message (Optional)</Label>
                    <Textarea
                      id="vf-message"
                      rows={2}
                      placeholder="Any questions or special requests..."
                      value={viewingForm.message}
                      onChange={(e) =>
                        setViewingForm((f) => ({ ...f, message: e.target.value }))
                      }
                    />
                  </div>

                  <Button
                    className="w-full"
                    onClick={handleViewingSubmit}
                    disabled={
                      viewingSubmitting ||
                      !viewingForm.firstName ||
                      !viewingForm.lastName ||
                      !viewingForm.email ||
                      !viewingForm.phone ||
                      (!selectedSlotId && !viewingForm.preferredDate1)
                    }
                  >
                    {viewingSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      'Request Viewing'
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-green-500 shrink-0" />
                <div>
                  <h3 className="font-semibold text-green-800">
                    Viewing Request Submitted!
                  </h3>
                  <p className="text-sm text-green-700">
                    The property manager will contact you to confirm a viewing time. You can still continue with your application below.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
                    <Label htmlFor="ssn">Social Security Number *</Label>
                    <Input
                      id="ssn"
                      type="password"
                      maxLength={11}
                      placeholder="XXX-XX-XXXX"
                      value={form.ssn}
                      onChange={(e) => {
                        // Auto-format with dashes
                        const raw = e.target.value.replace(/\D/g, '').slice(0, 9);
                        let formatted = raw;
                        if (raw.length > 5) {
                          formatted = `${raw.slice(0, 3)}-${raw.slice(3, 5)}-${raw.slice(5)}`;
                        } else if (raw.length > 3) {
                          formatted = `${raw.slice(0, 3)}-${raw.slice(3)}`;
                        }
                        updateForm('ssn', formatted);
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
                      Required for background and credit checks. Encrypted with AES-256 and never stored in plain text.
                    </p>
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

                {/* Supporting Documents */}
                <div className="border-t pt-4">
                  <h3 className="font-medium mb-1">Supporting Documents</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Upload any additional supporting documents (PDF only, no limit). Examples: Section 8
                    voucher, veteran disability letter, state disability documentation, unemployment
                    verification, SSI/SSDI award letter, or any other relevant documents.
                  </p>

                  {supportingDocs.length > 0 && (
                    <div className="space-y-2 mb-4">
                      {supportingDocs.map((doc, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 rounded-lg border p-3"
                        >
                          <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                          <Input
                            className="h-7 text-sm flex-1"
                            value={doc.label}
                            onChange={(e) => updateSupportingDocLabel(index, e.target.value)}
                            placeholder="Document description"
                          />
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {(doc.file.size / 1024).toFixed(0)} KB
                          </span>
                          <button
                            type="button"
                            onClick={() => removeSupportingDoc(index)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed p-4 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                    <Upload className="h-4 w-4" />
                    <span>
                      {supportingDocs.length > 0 ? 'Add more documents' : 'Click to upload supporting documents'}
                    </span>
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf"
                      multiple
                      onChange={(e) => {
                        addSupportingDocs(e.target.files);
                        e.target.value = '';
                      }}
                    />
                  </label>
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
                  {form.ssn && (
                    <p>
                      <strong>SSN:</strong> ***-**-{form.ssn.replace(/\D/g, '').slice(-4)}
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
                  {supportingDocs.length > 0 && (
                    <p>
                      <strong>Supporting Documents:</strong> {supportingDocs.length} file
                      {supportingDocs.length !== 1 ? 's' : ''}
                      {' '}({supportingDocs.map((d) => d.label).join(', ')})
                    </p>
                  )}
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

          {currentStep === 'payment' && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Screening Fee Payment
                </CardTitle>
                <CardDescription>
                  A non-refundable screening fee is required to process your background and credit checks.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Fee Summary */}
                <div className="rounded-lg bg-muted p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">Application Screening Fee</p>
                    <p className="text-sm text-muted-foreground">
                      Covers background check and credit report
                    </p>
                  </div>
                  <p className="text-2xl font-bold">${SCREENING_FEE}.00</p>
                </div>

                {/* Payment Method Selection */}
                <div className="space-y-3">
                  <Label>Payment Method</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('CARD')}
                      className={`flex items-center gap-3 rounded-lg border p-4 text-left transition-colors ${
                        paymentMethod === 'CARD'
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'hover:border-primary/50'
                      }`}
                    >
                      <CreditCard className="h-5 w-5 text-primary shrink-0" />
                      <div>
                        <p className="font-medium text-sm">Debit / Credit Card</p>
                        <p className="text-xs text-muted-foreground">Pay instantly with card</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('WIRE_TRANSFER')}
                      className={`flex items-center gap-3 rounded-lg border p-4 text-left transition-colors ${
                        paymentMethod === 'WIRE_TRANSFER'
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'hover:border-primary/50'
                      }`}
                    >
                      <Landmark className="h-5 w-5 text-primary shrink-0" />
                      <div>
                        <p className="font-medium text-sm">Wire Transfer</p>
                        <p className="text-xs text-muted-foreground">Pay via bank wire</p>
                      </div>
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="bg-destructive/10 text-destructive text-sm rounded-lg p-3">
                    {error}
                  </div>
                )}

                {/* Card Payment */}
                {paymentMethod === 'CARD' && (
                  <div className="space-y-4">
                    {paymentLoading && !clientSecret ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        <span className="ml-2 text-sm text-muted-foreground">
                          Initializing secure payment...
                        </span>
                      </div>
                    ) : clientSecret ? (
                      <Elements
                        stripe={getStripe()}
                        options={{
                          clientSecret,
                          appearance: {
                            theme: 'stripe',
                            variables: {
                              borderRadius: '8px',
                            },
                          },
                        }}
                      >
                        <StripeCheckoutForm
                          onSuccess={handlePaymentSuccess}
                          amount={SCREENING_FEE}
                        />
                      </Elements>
                    ) : null}
                  </div>
                )}

                {/* Wire Transfer */}
                {paymentMethod === 'WIRE_TRANSFER' && (
                  <div className="space-y-4">
                    <div className="rounded-lg border p-4 text-sm space-y-2">
                      <p>
                        Choose wire transfer if you prefer to pay via bank wire. After submitting,
                        you&apos;ll receive a unique reference number and the property manager will provide
                        bank account details.
                      </p>
                      <p className="text-muted-foreground text-xs">
                        Your application will be held until payment is confirmed.
                      </p>
                    </div>
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={handleWireTransfer}
                      disabled={paymentLoading}
                    >
                      {paymentLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Landmark className="mr-2 h-4 w-4" />
                          Submit with Wire Transfer
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </>
          )}
        </Card>

        {/* Navigation */}
        {currentStep !== 'payment' && (
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
                  !form.ssn ||
                  form.ssn.replace(/\D/g, '').length !== 9 ||
                  !form.backgroundCheckConsent ||
                  !form.creditCheckConsent
                }
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving Application...
                  </>
                ) : (
                  'Continue to Payment'
                )}
              </Button>
            ) : (
              <Button onClick={goNext}>Next</Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StripeCheckoutForm({
  onSuccess,
  amount,
}: {
  onSuccess: () => void;
  amount: number;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setError(null);

    const result = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    });

    if (result.error) {
      setError(result.error.message || 'Payment failed. Please try again.');
      setProcessing(false);
    } else if (result.paymentIntent?.status === 'succeeded') {
      onSuccess();
    } else {
      setError('Payment was not completed. Please try again.');
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {error && (
        <div className="bg-destructive/10 text-destructive text-sm rounded-lg p-3">
          {error}
        </div>
      )}
      <Button
        type="submit"
        className="w-full"
        disabled={!stripe || processing}
      >
        {processing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing Payment...
          </>
        ) : (
          `Pay $${amount}.00`
        )}
      </Button>
    </form>
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
