'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Loader2,
  Building2,
  Search,
  MapPin,
  BedDouble,
  Bath,
  DollarSign,
  Maximize2,
  ChevronRight,
  SlidersHorizontal,
  PawPrint,
  Car,
  X,
  Eye,
  CheckCircle2,
  Calendar,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface UnitInfo {
  id: string;
  unitNumber: string;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number | null;
  monthlyRent: string;
  depositAmount: string;
  features: string[];
  petPolicy: string | null;
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
  yearBuilt: number | null;
  parkingSpaces: number | null;
  units: UnitInfo[];
  owner: {
    firstName: string;
    lastName: string;
  };
}

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  SINGLE_FAMILY: 'Single Family',
  MULTI_FAMILY: 'Multi-Family',
  APARTMENT: 'Apartment',
  CONDO: 'Condo',
  TOWNHOUSE: 'Townhouse',
  COMMERCIAL: 'Commercial',
};

export default function ApplyLandingPage() {
  const router = useRouter();
  const [properties, setProperties] = useState<PropertyInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [bedroomFilter, setBedroomFilter] = useState('any');
  const [maxRentFilter, setMaxRentFilter] = useState('any');
  const [typeFilter, setTypeFilter] = useState('any');
  const [showFilters, setShowFilters] = useState(false);

  // Viewing modal state
  const [viewingOpen, setViewingOpen] = useState(false);
  const [viewingProperty, setViewingProperty] = useState<PropertyInfo | null>(null);
  const [viewingSubmitting, setViewingSubmitting] = useState(false);
  const [viewingSubmitted, setViewingSubmitted] = useState(false);
  const [viewingError, setViewingError] = useState<string | null>(null);
  const [viewingSlots, setViewingSlots] = useState<{ id: string; startTime: string; endTime: string }[]>([]);
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

  const openViewingModal = async (property: PropertyInfo) => {
    setViewingProperty(property);
    setViewingOpen(true);
    setViewingSubmitted(false);
    setViewingError(null);
    setSelectedSlotId(null);
    setViewingSlots([]);
    setViewingSlotsLoading(true);

    try {
      const res = await fetch(`/api/viewings?propertyId=${property.id}`);
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

  const closeViewingModal = () => {
    setViewingOpen(false);
    setViewingProperty(null);
    setViewingSlots([]);
    setSelectedSlotId(null);
    setViewingForm({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      message: '',
      preferredDate1: '',
      preferredDate2: '',
      preferredDate3: '',
    });
    setViewingSubmitted(false);
    setViewingError(null);
  };

  const handleViewingSubmit = async () => {
    if (!viewingProperty) return;
    setViewingSubmitting(true);
    setViewingError(null);

    try {
      const res = await fetch('/api/viewings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId: viewingProperty.id,
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

  const formatSlotDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatSlotTime = (startStr: string, endStr: string) => {
    const start = new Date(startStr);
    const end = new Date(endStr);
    return `${start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - ${end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  };

  useEffect(() => {
    async function fetchProperties() {
      try {
        const res = await fetch('/api/applications/properties');
        const result = await res.json();
        if (result.success) {
          setProperties(result.data);
        } else {
          setError(result.error || 'Failed to load properties');
        }
      } catch {
        setError('Failed to load available properties');
      } finally {
        setIsLoading(false);
      }
    }
    fetchProperties();
  }, []);

  // Client-side filtering for instant response
  const filteredProperties = useMemo(() => {
    return properties.filter((property) => {
      // Text search - match against name, address, city, state
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const searchTarget = [
          property.name,
          property.addressLine1,
          property.city,
          property.state,
          property.zipCode,
        ]
          .join(' ')
          .toLowerCase();
        if (!searchTarget.includes(query)) return false;
      }

      // Bedroom filter
      if (bedroomFilter !== 'any') {
        const minBeds = parseInt(bedroomFilter, 10);
        if (!property.units.some((u) => u.bedrooms >= minBeds)) return false;
      }

      // Max rent filter
      if (maxRentFilter !== 'any') {
        const maxRent = parseFloat(maxRentFilter);
        if (!property.units.some((u) => parseFloat(u.monthlyRent) <= maxRent)) return false;
      }

      // Property type filter
      if (typeFilter !== 'any') {
        if (property.type !== typeFilter) return false;
      }

      return true;
    });
  }, [properties, searchQuery, bedroomFilter, maxRentFilter, typeFilter]);

  const formatCurrency = (val: string) => {
    const num = parseFloat(val);
    return isNaN(num) ? val : `$${num.toLocaleString()}`;
  };

  const getRentRange = (units: UnitInfo[]) => {
    if (units.length === 0) return 'N/A';
    const rents = units.map((u) => parseFloat(u.monthlyRent));
    const min = Math.min(...rents);
    const max = Math.max(...rents);
    if (min === max) return `$${min.toLocaleString()}/mo`;
    return `$${min.toLocaleString()} - $${max.toLocaleString()}/mo`;
  };

  const getBedroomRange = (units: UnitInfo[]) => {
    if (units.length === 0) return '';
    const beds = units.map((u) => u.bedrooms);
    const min = Math.min(...beds);
    const max = Math.max(...beds);
    if (min === max) return `${min} BR`;
    return `${min}-${max} BR`;
  };

  const clearFilters = () => {
    setSearchQuery('');
    setBedroomFilter('any');
    setMaxRentFilter('any');
    setTypeFilter('any');
  };

  const hasActiveFilters =
    searchQuery || bedroomFilter !== 'any' || maxRentFilter !== 'any' || typeFilter !== 'any';

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading available properties...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Unable to Load Properties</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Building2 className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold">Find Your Next Home</h1>
            </div>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Browse available rental properties and submit your application online.
              Select a property below to get started.
            </p>
          </div>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-10 pr-10 h-12 text-base"
                placeholder="Search by name, address, city, or zip code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Filter Toggle */}
            <div className="flex items-center justify-between mt-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <SlidersHorizontal className="h-4 w-4" />
                {showFilters ? 'Hide Filters' : 'Show Filters'}
              </button>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-primary hover:underline"
                >
                  Clear all filters
                </button>
              )}
            </div>

            {/* Filter Panel */}
            {showFilters && (
              <div className="grid grid-cols-3 gap-4 mt-3 p-4 rounded-lg bg-gray-50 border">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Bedrooms</Label>
                  <Select value={bedroomFilter} onValueChange={setBedroomFilter}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      <SelectItem value="1">1+</SelectItem>
                      <SelectItem value="2">2+</SelectItem>
                      <SelectItem value="3">3+</SelectItem>
                      <SelectItem value="4">4+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Max Rent</Label>
                  <Select value={maxRentFilter} onValueChange={setMaxRentFilter}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      <SelectItem value="1000">Up to $1,000</SelectItem>
                      <SelectItem value="1500">Up to $1,500</SelectItem>
                      <SelectItem value="2000">Up to $2,000</SelectItem>
                      <SelectItem value="2500">Up to $2,500</SelectItem>
                      <SelectItem value="3000">Up to $3,000</SelectItem>
                      <SelectItem value="5000">Up to $5,000</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Property Type</Label>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      {Object.entries(PROPERTY_TYPE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">
            {filteredProperties.length}{' '}
            {filteredProperties.length === 1 ? 'property' : 'properties'} available
          </p>
        </div>

        {filteredProperties.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Properties Found</h3>
              <p className="text-muted-foreground mb-4">
                {hasActiveFilters
                  ? 'No properties match your current filters. Try adjusting your search criteria.'
                  : 'There are no properties currently accepting applications. Please check back later.'}
              </p>
              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters}>
                  Clear Filters
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredProperties.map((property) => (
              <Card
                key={property.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => router.push(`/apply/${property.id}`)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Property Header */}
                      <div className="flex items-start gap-3 mb-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <h2 className="text-lg font-semibold truncate">{property.name}</h2>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">
                              {property.addressLine1}
                              {property.addressLine2 ? `, ${property.addressLine2}` : ''},{' '}
                              {property.city}, {property.state} {property.zipCode}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Property Quick Info */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-3">
                        <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                          <DollarSign className="h-3.5 w-3.5" />
                          {getRentRange(property.units)}
                        </span>
                        <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                          <BedDouble className="h-3.5 w-3.5" />
                          {getBedroomRange(property.units)}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {PROPERTY_TYPE_LABELS[property.type] || property.type}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {property.units.length} {property.units.length === 1 ? 'unit' : 'units'}{' '}
                          available
                        </span>
                      </div>

                      {/* Available Units Summary */}
                      <div className="flex flex-wrap gap-2">
                        {property.units.slice(0, 4).map((unit) => (
                          <div
                            key={unit.id}
                            className="text-xs px-2.5 py-1.5 rounded-md bg-gray-100 border flex items-center gap-2"
                          >
                            <span className="font-medium">Unit {unit.unitNumber}</span>
                            <span className="text-muted-foreground">
                              {unit.bedrooms}BR/{unit.bathrooms}BA
                            </span>
                            {unit.squareFeet && (
                              <span className="text-muted-foreground flex items-center gap-0.5">
                                <Maximize2 className="h-2.5 w-2.5" />
                                {unit.squareFeet.toLocaleString()} sqft
                              </span>
                            )}
                            <span className="font-medium text-primary">
                              {formatCurrency(unit.monthlyRent)}/mo
                            </span>
                          </div>
                        ))}
                        {property.units.length > 4 && (
                          <div className="text-xs px-2.5 py-1.5 rounded-md bg-gray-100 border text-muted-foreground">
                            +{property.units.length - 4} more
                          </div>
                        )}
                      </div>

                      {/* Amenities */}
                      {property.amenities.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {property.amenities.slice(0, 5).map((amenity, idx) => (
                            <span
                              key={idx}
                              className="text-xs px-2 py-0.5 rounded-full bg-primary/5 text-primary/80"
                            >
                              {amenity}
                            </span>
                          ))}
                          {property.amenities.length > 5 && (
                            <span className="text-xs px-2 py-0.5 text-muted-foreground">
                              +{property.amenities.length - 5} more
                            </span>
                          )}
                        </div>
                      )}

                      {/* Managed by */}
                      <p className="text-xs text-muted-foreground mt-3">
                        Managed by {property.owner.firstName} {property.owner.lastName}
                      </p>
                    </div>

                    {/* CTA Buttons */}
                    <div className="shrink-0 flex flex-col items-center gap-2">
                      <Button
                        size="sm"
                        className="whitespace-nowrap"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/apply/${property.id}`);
                        }}
                      >
                        Apply Now
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="whitespace-nowrap"
                        onClick={(e) => {
                          e.stopPropagation();
                          openViewingModal(property);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Schedule Viewing
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Schedule a Viewing Modal */}
      <Dialog open={viewingOpen} onOpenChange={(open) => !open && closeViewingModal()}>
        <DialogContent className="max-w-md">
          {viewingSubmitted ? (
            <div className="text-center py-4">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
              <h3 className="text-lg font-semibold mb-2">
                {selectedSlotId ? 'Viewing Confirmed!' : 'Viewing Request Submitted!'}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {selectedSlotId ? (
                  <>Your viewing for <strong>{viewingProperty?.name}</strong> has been confirmed. You&apos;ll receive a confirmation email shortly.</>
                ) : (
                  <>The property manager will contact you to confirm a viewing time for{' '}
                  <strong>{viewingProperty?.name}</strong>.</>
                )}
              </p>
              <Button onClick={closeViewingModal}>Close</Button>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Schedule a Viewing
                </DialogTitle>
                <DialogDescription>
                  Request an in-person viewing of{' '}
                  <strong>{viewingProperty?.name}</strong>. No application or SSN required.
                </DialogDescription>
              </DialogHeader>

              {viewingError && (
                <div className="bg-destructive/10 text-destructive text-sm rounded-lg p-3">
                  {viewingError}
                </div>
              )}

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="v-firstName">First Name *</Label>
                    <Input
                      id="v-firstName"
                      value={viewingForm.firstName}
                      onChange={(e) =>
                        setViewingForm((f) => ({ ...f, firstName: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="v-lastName">Last Name *</Label>
                    <Input
                      id="v-lastName"
                      value={viewingForm.lastName}
                      onChange={(e) =>
                        setViewingForm((f) => ({ ...f, lastName: e.target.value }))
                      }
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="v-email">Email *</Label>
                  <Input
                    id="v-email"
                    type="email"
                    value={viewingForm.email}
                    onChange={(e) =>
                      setViewingForm((f) => ({ ...f, email: e.target.value }))
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="v-phone">Phone *</Label>
                  <Input
                    id="v-phone"
                    type="tel"
                    value={viewingForm.phone}
                    onChange={(e) =>
                      setViewingForm((f) => ({ ...f, phone: e.target.value }))
                    }
                  />
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
                          <span className="font-medium">{formatSlotDate(slot.startTime)}</span>
                          <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="text-muted-foreground">{formatSlotTime(slot.startTime, slot.endTime)}</span>
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Selecting a pre-set time slot will automatically confirm your viewing.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="v-date1">Preferred Date & Time *</Label>
                      <Input
                        id="v-date1"
                        type="datetime-local"
                        value={viewingForm.preferredDate1}
                        onChange={(e) =>
                          setViewingForm((f) => ({ ...f, preferredDate1: e.target.value }))
                        }
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="v-date2">2nd Choice (Optional)</Label>
                        <Input
                          id="v-date2"
                          type="datetime-local"
                          value={viewingForm.preferredDate2}
                          onChange={(e) =>
                            setViewingForm((f) => ({ ...f, preferredDate2: e.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="v-date3">3rd Choice (Optional)</Label>
                        <Input
                          id="v-date3"
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
                  <Label htmlFor="v-message">Message (Optional)</Label>
                  <Textarea
                    id="v-message"
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
                  ) : selectedSlotId ? (
                    'Confirm Viewing'
                  ) : (
                    'Request Viewing'
                  )}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
