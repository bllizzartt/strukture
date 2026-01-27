import Link from 'next/link';
import { Building2, MapPin, Home, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { propertyTypeLabels, propertyStatusLabels } from '@/lib/validators/property';
import { cn } from '@/lib/utils';

interface PropertyCardProps {
  property: {
    id: string;
    name: string;
    type: string;
    status: string;
    addressLine1: string;
    city: string;
    state: string;
    zipCode: string;
    _count: {
      units: number;
    };
  };
  onDelete?: (id: string) => void;
}

export function PropertyCard({ property, onDelete }: PropertyCardProps) {
  const statusColors = {
    ACTIVE: 'bg-green-100 text-green-800',
    INACTIVE: 'bg-gray-100 text-gray-800',
    UNDER_RENOVATION: 'bg-yellow-100 text-yellow-800',
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <div className="space-y-1">
          <Link href={`/landlord/properties/${property.id}`}>
            <CardTitle className="text-lg hover:text-primary transition-colors">
              {property.name}
            </CardTitle>
          </Link>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Building2 className="h-4 w-4" />
            {propertyTypeLabels[property.type as keyof typeof propertyTypeLabels] ||
              property.type}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
              statusColors[property.status as keyof typeof statusColors] ||
                'bg-gray-100 text-gray-800'
            )}
          >
            {propertyStatusLabels[property.status as keyof typeof propertyStatusLabels] ||
              property.status}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/landlord/properties/${property.id}/edit`}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Link>
              </DropdownMenuItem>
              {onDelete && (
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => onDelete(property.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              {property.addressLine1}
              <br />
              {property.city}, {property.state} {property.zipCode}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Home className="h-4 w-4 text-muted-foreground" />
            <span>
              {property._count.units} {property._count.units === 1 ? 'Unit' : 'Units'}
            </span>
          </div>
        </div>
        <div className="mt-4">
          <Link href={`/landlord/properties/${property.id}`}>
            <Button variant="outline" size="sm" className="w-full">
              View Details
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
