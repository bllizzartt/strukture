'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Upload, Trash2, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PropertyForm } from '@/components/landlord/property-form';
import { useToast } from '@/hooks/use-toast';

export default function EditPropertyPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [property, setProperty] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const propertyId = params.id as string;

  const fetchProperty = useCallback(async () => {
    try {
      const response = await fetch(`/api/landlord/properties/${propertyId}`);
      const result = await response.json();

      if (result.success) {
        setProperty(result.data);
        setLogoUrl(result.data.logoUrl || null);
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Property not found',
        });
        router.push('/landlord/properties');
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load property',
      });
    } finally {
      setIsLoading(false);
    }
  }, [propertyId, toast, router]);

  useEffect(() => {
    fetchProperty();
  }, [fetchProperty]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!property) {
    return null;
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'].includes(file.type)) {
      toast({ variant: 'destructive', title: 'Error', description: 'File must be PNG, JPEG, WebP, or SVG' });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ variant: 'destructive', title: 'Error', description: 'File must be under 2MB' });
      return;
    }

    setIsUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('logo', file);

      const res = await fetch(`/api/landlord/properties/${propertyId}/logo`, {
        method: 'POST',
        body: formData,
      });
      const result = await res.json();

      if (result.success) {
        setLogoUrl(result.data.logoUrl);
        toast({ title: 'Success', description: 'Logo uploaded successfully' });
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
      }
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to upload logo' });
    } finally {
      setIsUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  const handleRemoveLogo = async () => {
    try {
      const res = await fetch(`/api/landlord/properties/${propertyId}/logo`, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        setLogoUrl(null);
        toast({ title: 'Success', description: 'Logo removed' });
      }
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to remove logo' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/landlord/properties/${propertyId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Edit Property</h1>
          <p className="text-muted-foreground">{property.name}</p>
        </div>
      </div>

      {/* Logo Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-primary" />
            Property Logo
          </CardTitle>
          <CardDescription>
            Upload a logo to appear on lease documents and PDFs. Optional — PNG, JPEG, WebP, or SVG up to 2MB.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {logoUrl ? (
            <div className="flex items-center gap-6">
              <div className="relative h-24 w-48 border rounded-lg overflow-hidden bg-white flex items-center justify-center p-2">
                <Image
                  src={logoUrl}
                  alt="Property logo"
                  fill
                  className="object-contain"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={isUploadingLogo}
                >
                  {isUploadingLogo ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  Replace Logo
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveLogo}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remove Logo
                </Button>
              </div>
            </div>
          ) : (
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
              onClick={() => logoInputRef.current?.click()}
            >
              {isUploadingLogo ? (
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-2" />
              ) : (
                <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              )}
              <p className="text-sm font-medium">Click to upload a logo</p>
              <p className="text-xs text-muted-foreground mt-1">PNG, JPEG, WebP, or SVG up to 2MB</p>
            </div>
          )}
          <input
            ref={logoInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="hidden"
            onChange={handleLogoUpload}
          />
        </CardContent>
      </Card>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Property Details</CardTitle>
          <CardDescription>Update the property information</CardDescription>
        </CardHeader>
        <CardContent>
          <PropertyForm
            mode="edit"
            initialData={{
              id: property.id,
              name: property.name,
              type: property.type,
              status: property.status,
              addressLine1: property.addressLine1,
              addressLine2: property.addressLine2,
              city: property.city,
              state: property.state,
              zipCode: property.zipCode,
              country: property.country,
              yearBuilt: property.yearBuilt,
              totalUnits: property.totalUnits,
              parkingSpaces: property.parkingSpaces,
              amenities: property.amenities,
              licenseNumber: property.licenseNumber,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
