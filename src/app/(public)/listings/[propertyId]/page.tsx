'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Loader2, Building2, MapPin, Bed, Bath, Square, DollarSign, PawPrint } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface UnitListing {
  id: string;
  unitNumber: string;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number | null;
  monthlyRent: string | number;
  depositAmount: string | number;
  features: string[];
  petPolicy: string | null;
}

interface PropertyListing {
  id: string;
  name: string;
  type: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  zipCode: string;
  yearBuilt: number | null;
  amenities: string[];
  logoUrl: string | null;
  vacantUnits: UnitListing[];
}

export default function ListingDetailPage() {
  const { propertyId } = useParams();
  const [property, setProperty] = useState<PropertyListing | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProperty = useCallback(async () => {
    try {
      const response = await fetch(`/api/public/listings/${propertyId}`);
      const result = await response.json();
      if (result.success) setProperty(result.data);
    } catch {
      // Silent
    } finally {
      setIsLoading(false);
    }
  }, [propertyId]);

  useEffect(() => { fetchProperty(); }, [fetchProperty]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="text-center py-20">
        <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Property not found</h2>
        <Link href="/listings">
          <Button variant="link">Back to listings</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start gap-4">
        <Link href="/listings">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-4">
            {property.logoUrl ? (
              <img src={property.logoUrl} alt="" className="h-16 w-16 rounded-lg object-cover" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10">
                <Building2 className="h-8 w-8 text-primary" />
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold">{property.name}</h1>
              <p className="flex items-center gap-1 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {property.addressLine1}, {property.city}, {property.state} {property.zipCode}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Property Details */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Property Type</p>
            <p className="text-lg font-semibold">{property.type.replace(/_/g, ' ')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Year Built</p>
            <p className="text-lg font-semibold">{property.yearBuilt || 'N/A'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Available Units</p>
            <p className="text-lg font-semibold">{property.vacantUnits.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Amenities */}
      {property.amenities.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Amenities</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {property.amenities.map((amenity) => (
                <span key={amenity} className="rounded-full bg-primary/10 px-3 py-1 text-sm text-primary">
                  {amenity}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Units */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Available Units</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {property.vacantUnits.map((unit) => (
            <Card key={unit.id}>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Unit {unit.unitNumber}</h3>
                  <span className="text-2xl font-bold text-primary">
                    ${Number(unit.monthlyRent).toLocaleString()}<span className="text-sm font-normal text-muted-foreground">/mo</span>
                  </span>
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><Bed className="h-4 w-4" /> {unit.bedrooms} bed</span>
                  <span className="flex items-center gap-1"><Bath className="h-4 w-4" /> {unit.bathrooms} bath</span>
                  {unit.squareFeet && (
                    <span className="flex items-center gap-1"><Square className="h-4 w-4" /> {unit.squareFeet.toLocaleString()} sqft</span>
                  )}
                  <span className="flex items-center gap-1"><DollarSign className="h-4 w-4" /> ${Number(unit.depositAmount).toLocaleString()} deposit</span>
                </div>
                {unit.petPolicy && (
                  <p className="flex items-center gap-1 text-sm"><PawPrint className="h-4 w-4" /> {unit.petPolicy}</p>
                )}
                {unit.features.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {unit.features.map((f) => (
                      <span key={f} className="rounded bg-muted px-2 py-0.5 text-xs">{f}</span>
                    ))}
                  </div>
                )}
                <Link href={`/apply/${property.id}?unit=${unit.id}`}>
                  <Button className="w-full">Apply Now</Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
