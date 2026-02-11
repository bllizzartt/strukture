'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Building2, MapPin, Bed, Bath, Square, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface VacantUnit {
  id: string;
  unitNumber: string;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number | null;
  monthlyRent: string | number;
}

interface PropertyListing {
  id: string;
  name: string;
  type: string;
  city: string;
  state: string;
  amenities: string[];
  logoUrl: string | null;
  vacantUnits: VacantUnit[];
}

const propertyTypeLabels: Record<string, string> = {
  SINGLE_FAMILY: 'Single Family',
  MULTI_FAMILY: 'Multi-Family',
  APARTMENT: 'Apartment',
  CONDO: 'Condo',
  TOWNHOUSE: 'Townhouse',
  COMMERCIAL: 'Commercial',
  OTHER: 'Other',
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function ListingsPage() {
  const [listings, setListings] = useState<PropertyListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchListings = useCallback(async () => {
    try {
      const response = await fetch('/api/public/listings');
      const result = await response.json();
      if (result.success) setListings(result.data);
    } catch {
      // Silent
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Hero / Header */}
      <div className="bg-primary/5 border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
              Available Rentals
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Find your next home. Browse available properties and schedule a viewing today.
            </p>
          </div>
        </div>
      </div>

      {/* Listings Grid */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : listings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Building2 className="h-16 w-16 text-muted-foreground mb-6" />
            <h2 className="text-xl font-semibold mb-2">No properties available right now</h2>
            <p className="text-muted-foreground max-w-md">
              Check back later for new listings. We are always adding new properties.
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-6">
              {listings.length} propert{listings.length === 1 ? 'y' : 'ies'} available
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {listings.map((property) => {
                const rents = property.vacantUnits.map((u) => Number(u.monthlyRent));
                const minRent = rents.length > 0 ? Math.min(...rents) : null;
                const maxBeds = property.vacantUnits.length > 0
                  ? Math.max(...property.vacantUnits.map((u) => u.bedrooms))
                  : null;
                const maxBaths = property.vacantUnits.length > 0
                  ? Math.max(...property.vacantUnits.map((u) => u.bathrooms))
                  : null;
                const maxSqft = property.vacantUnits.length > 0
                  ? Math.max(
                      ...property.vacantUnits
                        .filter((u) => u.squareFeet != null)
                        .map((u) => u.squareFeet!)
                    ) || null
                  : null;

                return (
                  <Link
                    key={property.id}
                    href={`/listings/${property.id}`}
                    className="block group"
                  >
                    <Card className="overflow-hidden h-full hover:shadow-lg transition-shadow duration-200">
                      {/* Property Image / Logo */}
                      <div className="aspect-[16/10] bg-muted flex items-center justify-center relative overflow-hidden">
                        {property.logoUrl ? (
                          <img
                            src={property.logoUrl}
                            alt={property.name}
                            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-muted-foreground">
                            <Building2 className="h-12 w-12 mb-2" />
                            <span className="text-sm">No image</span>
                          </div>
                        )}
                        {/* Type Badge */}
                        <span className="absolute top-3 left-3 inline-flex items-center rounded-full bg-background/90 backdrop-blur-sm px-2.5 py-1 text-xs font-medium">
                          {propertyTypeLabels[property.type] || property.type}
                        </span>
                      </div>

                      <CardContent className="p-5 space-y-3">
                        {/* Name and Location */}
                        <div>
                          <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                            {property.name}
                          </h3>
                          <p className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                            {property.city}, {property.state}
                          </p>
                        </div>

                        {/* Property Details */}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          {maxBeds != null && (
                            <span className="flex items-center gap-1">
                              <Bed className="h-3.5 w-3.5" />
                              {maxBeds} bed
                            </span>
                          )}
                          {maxBaths != null && (
                            <span className="flex items-center gap-1">
                              <Bath className="h-3.5 w-3.5" />
                              {maxBaths} bath
                            </span>
                          )}
                          {maxSqft != null && (
                            <span className="flex items-center gap-1">
                              <Square className="h-3.5 w-3.5" />
                              {maxSqft.toLocaleString()} sqft
                            </span>
                          )}
                        </div>

                        {/* Available Units */}
                        <div className="text-sm">
                          <span className="text-primary font-medium">
                            {property.vacantUnits.length} unit{property.vacantUnits.length !== 1 ? 's' : ''} available
                          </span>
                        </div>

                        {/* Starting Price */}
                        {minRent != null && (
                          <div>
                            <span className="text-xl font-bold">
                              From {formatCurrency(minRent)}
                            </span>
                            <span className="text-sm text-muted-foreground">/mo</span>
                          </div>
                        )}

                        {/* Amenities */}
                        {property.amenities && property.amenities.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {property.amenities.slice(0, 4).map((amenity) => (
                              <span
                                key={amenity}
                                className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
                              >
                                {amenity}
                              </span>
                            ))}
                            {property.amenities.length > 4 && (
                              <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                                +{property.amenities.length - 4} more
                              </span>
                            )}
                          </div>
                        )}

                        {/* CTA */}
                        <div className="pt-2">
                          <span className="text-sm font-medium text-primary group-hover:underline">
                            View Details
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
