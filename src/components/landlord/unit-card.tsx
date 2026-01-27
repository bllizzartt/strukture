import Link from 'next/link';
import { Bed, Bath, Square, MoreVertical, Pencil, Trash2, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { unitStatusLabels } from '@/lib/validators/property';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface UnitCardProps {
  propertyId: string;
  unit: {
    id: string;
    unitNumber: string;
    status: string;
    bedrooms: number;
    bathrooms: number;
    squareFeet?: number | null;
    monthlyRent: number | string;
    leases?: Array<{
      tenant: {
        firstName: string;
        lastName: string;
      };
    }>;
  };
  onDelete?: (id: string) => void;
}

export function UnitCard({ propertyId, unit, onDelete }: UnitCardProps) {
  const statusColors = {
    VACANT: 'bg-green-100 text-green-800',
    OCCUPIED: 'bg-blue-100 text-blue-800',
    UNDER_MAINTENANCE: 'bg-yellow-100 text-yellow-800',
    RESERVED: 'bg-purple-100 text-purple-800',
  };

  const activeLease = unit.leases?.[0];
  const rent = typeof unit.monthlyRent === 'string'
    ? parseFloat(unit.monthlyRent)
    : unit.monthlyRent;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <div className="space-y-1">
          <Link href={`/landlord/properties/${propertyId}/units/${unit.id}`}>
            <CardTitle className="text-lg hover:text-primary transition-colors">
              Unit {unit.unitNumber}
            </CardTitle>
          </Link>
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
              statusColors[unit.status as keyof typeof statusColors] ||
                'bg-gray-100 text-gray-800'
            )}
          >
            {unitStatusLabels[unit.status as keyof typeof unitStatusLabels] || unit.status}
          </span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/landlord/properties/${propertyId}/units/${unit.id}/edit`}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </DropdownMenuItem>
            {onDelete && (
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onDelete(unit.id)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <Bed className="h-4 w-4 text-muted-foreground" />
              <span>{unit.bedrooms} bed</span>
            </div>
            <div className="flex items-center gap-1">
              <Bath className="h-4 w-4 text-muted-foreground" />
              <span>{unit.bathrooms} bath</span>
            </div>
            {unit.squareFeet && (
              <div className="flex items-center gap-1">
                <Square className="h-4 w-4 text-muted-foreground" />
                <span>{unit.squareFeet} sqft</span>
              </div>
            )}
          </div>

          <div className="text-lg font-semibold text-primary">
            {formatCurrency(rent)}/mo
          </div>

          {activeLease && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span>
                {activeLease.tenant.firstName} {activeLease.tenant.lastName}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
