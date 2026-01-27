'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UnitForm } from '@/components/landlord/unit-form';

export default function NewUnitPage() {
  const params = useParams();
  const propertyId = params.id as string;

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
          <h1 className="text-3xl font-bold">Add New Unit</h1>
          <p className="text-muted-foreground">Create a new unit for this property</p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Unit Details</CardTitle>
          <CardDescription>Enter the unit information below</CardDescription>
        </CardHeader>
        <CardContent>
          <UnitForm propertyId={propertyId} mode="create" />
        </CardContent>
      </Card>
    </div>
  );
}
