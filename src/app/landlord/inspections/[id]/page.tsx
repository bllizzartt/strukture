'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Camera, X, ClipboardCheck, DollarSign, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

// ==================== Constants ====================

const MAX_DIMENSION = 1200;
const JPEG_QUALITY = 0.8;

const ROOMS = [
  {
    name: 'Kitchen',
    items: ['Walls', 'Floor', 'Ceiling', 'Doors/Windows', 'Fixtures', 'Appliances'],
  },
  {
    name: 'Living Room',
    items: ['Walls', 'Floor', 'Ceiling', 'Doors/Windows', 'Fixtures'],
  },
  {
    name: 'Dining Room',
    items: ['Walls', 'Floor', 'Ceiling', 'Doors/Windows', 'Fixtures'],
  },
  {
    name: 'Master Bedroom',
    items: ['Walls', 'Floor', 'Ceiling', 'Doors/Windows', 'Fixtures'],
  },
  {
    name: 'Bedroom 2',
    items: ['Walls', 'Floor', 'Ceiling', 'Doors/Windows', 'Fixtures'],
  },
  {
    name: 'Bathroom',
    items: ['Walls', 'Floor', 'Ceiling', 'Doors/Windows', 'Fixtures', 'Appliances'],
  },
  {
    name: 'Hallway',
    items: ['Walls', 'Floor', 'Ceiling', 'Doors/Windows', 'Fixtures'],
  },
  {
    name: 'Exterior',
    items: ['Walls', 'Floor', 'Doors/Windows', 'Fixtures'],
  },
];

const CONDITIONS = ['Good', 'Fair', 'Poor', 'Damaged'] as const;
type Condition = (typeof CONDITIONS)[number];

const conditionColors: Record<Condition, string> = {
  Good: 'text-green-700',
  Fair: 'text-yellow-700',
  Poor: 'text-orange-700',
  Damaged: 'text-red-700',
};

// ==================== Interfaces ====================

interface InspectionItem {
  condition: Condition | '';
  notes: string;
  estimatedCost: string;
  photos: string[];
}

type InspectionData = Record<string, Record<string, InspectionItem>>;

interface Inspection {
  id: string;
  type: 'MOVE_IN' | 'MOVE_OUT';
  status: 'DRAFT' | 'COMPLETED';
  createdAt: string;
  completedAt: string | null;
  items: InspectionData | null;
  lease: {
    id: string;
    depositAmount: string | number;
    tenant: {
      firstName: string;
      lastName: string;
    };
    unit: {
      unitNumber: string;
      property: {
        name: string;
      };
    };
  };
}

// ==================== Image Compression ====================

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new window.Image();
      img.onerror = reject;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          if (width > height) {
            height = Math.round((height * MAX_DIMENSION) / width);
            width = MAX_DIMENSION;
          } else {
            width = Math.round((width * MAX_DIMENSION) / height);
            height = MAX_DIMENSION;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

// ==================== Helpers ====================

function initializeInspectionData(existing: InspectionData | null): InspectionData {
  const data: InspectionData = {};
  for (const room of ROOMS) {
    data[room.name] = {};
    for (const item of room.items) {
      data[room.name][item] = existing?.[room.name]?.[item] || {
        condition: '',
        notes: '',
        estimatedCost: '',
        photos: [],
      };
    }
  }
  return data;
}

function formatCurrency(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(num);
}

// ==================== Component ====================

export default function InspectionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [inspectionData, setInspectionData] = useState<InspectionData>({});
  const [activeRoom, setActiveRoom] = useState(ROOMS[0].name);
  const [uploadTarget, setUploadTarget] = useState<{ room: string; item: string } | null>(null);

  const inspectionId = params.id as string;

  const fetchInspection = useCallback(async () => {
    try {
      const response = await fetch(`/api/landlord/inspections/${inspectionId}`);
      const result = await response.json();

      if (result.success) {
        setInspection(result.data);
        setInspectionData(initializeInspectionData(result.data.items));
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Inspection not found',
        });
        router.push('/landlord/inspections');
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load inspection',
      });
    } finally {
      setIsLoading(false);
    }
  }, [inspectionId, toast, router]);

  useEffect(() => {
    fetchInspection();
  }, [fetchInspection]);

  const updateItem = (room: string, item: string, field: keyof InspectionItem, value: any) => {
    setInspectionData((prev) => ({
      ...prev,
      [room]: {
        ...prev[room],
        [item]: {
          ...prev[room][item],
          [field]: value,
        },
      },
    }));
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!uploadTarget || !e.target.files?.length) return;

    const { room, item } = uploadTarget;

    try {
      const file = e.target.files[0];
      const compressed = await compressImage(file);

      setInspectionData((prev) => ({
        ...prev,
        [room]: {
          ...prev[room],
          [item]: {
            ...prev[room][item],
            photos: [...prev[room][item].photos, compressed],
          },
        },
      }));
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to process photo',
      });
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setUploadTarget(null);
  };

  const removePhoto = (room: string, item: string, photoIndex: number) => {
    setInspectionData((prev) => ({
      ...prev,
      [room]: {
        ...prev[room],
        [item]: {
          ...prev[room][item],
          photos: prev[room][item].photos.filter((_, i) => i !== photoIndex),
        },
      },
    }));
  };

  const triggerPhotoUpload = (room: string, item: string) => {
    setUploadTarget({ room, item });
    fileInputRef.current?.click();
  };

  // Calculate total deductions from damaged items
  const totalDeductions = Object.values(inspectionData).reduce((total, roomItems) => {
    return (
      total +
      Object.values(roomItems).reduce((roomTotal, item) => {
        if (item.condition === 'Damaged' && item.estimatedCost) {
          return roomTotal + parseFloat(item.estimatedCost) || 0;
        }
        return roomTotal;
      }, 0)
    );
  }, 0);

  const depositAmount = inspection
    ? typeof inspection.lease.depositAmount === 'string'
      ? parseFloat(inspection.lease.depositAmount)
      : inspection.lease.depositAmount
    : 0;

  const refundAmount = Math.max(0, depositAmount - totalDeductions);

  const handleComplete = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/landlord/inspections/${inspectionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: inspectionData,
          status: 'COMPLETED',
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Success',
          description: 'Inspection completed successfully',
        });
        fetchInspection();
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Failed to complete inspection',
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Something went wrong',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/landlord/inspections/${inspectionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: inspectionData,
          status: 'DRAFT',
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Saved',
          description: 'Draft saved successfully',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Failed to save draft',
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Something went wrong',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!inspection) {
    return null;
  }

  const isCompleted = inspection.status === 'COMPLETED';
  const isMoveOut = inspection.type === 'MOVE_OUT';
  const currentRoom = ROOMS.find((r) => r.name === activeRoom) || ROOMS[0];

  return (
    <div className="space-y-6">
      {/* Hidden file input for photo uploads */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePhotoUpload}
      />

      {/* Header */}
      <div className="space-y-3">
        <Link href="/landlord/inspections">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold">
                {inspection.lease.tenant.firstName} {inspection.lease.tenant.lastName}
              </h1>
              <span
                className={cn(
                  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                  inspection.type === 'MOVE_IN'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-orange-100 text-orange-800'
                )}
              >
                {inspection.type === 'MOVE_IN' ? 'Move-In' : 'Move-Out'}
              </span>
              <span
                className={cn(
                  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                  inspection.status === 'DRAFT'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-green-100 text-green-800'
                )}
              >
                {inspection.status === 'DRAFT' ? 'Draft' : 'Completed'}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {inspection.lease.unit.property.name} - Unit {inspection.lease.unit.unitNumber}
            </p>
            <p className="text-xs text-muted-foreground">
              Created {format(new Date(inspection.createdAt), 'MMM d, yyyy')}
              {inspection.completedAt &&
                ` | Completed ${format(new Date(inspection.completedAt), 'MMM d, yyyy')}`}
            </p>
          </div>
        </div>
      </div>

      {/* Room Navigation */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-2">
            {ROOMS.map((room) => {
              const roomData = inspectionData[room.name];
              const filledCount = roomData
                ? Object.values(roomData).filter((item) => item.condition).length
                : 0;
              const totalCount = room.items.length;

              return (
                <button
                  key={room.name}
                  onClick={() => setActiveRoom(room.name)}
                  className={cn(
                    'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    activeRoom === room.name
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                  )}
                >
                  {room.name}
                  <span className="ml-1.5 text-xs opacity-75">
                    {filledCount}/{totalCount}
                  </span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Room Checklist */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            {currentRoom.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {currentRoom.items.map((itemName) => {
            const itemData = inspectionData[currentRoom.name]?.[itemName] || {
              condition: '',
              notes: '',
              estimatedCost: '',
              photos: [],
            };

            return (
              <div key={itemName} className="space-y-3 p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{itemName}</h4>
                  {itemData.condition && (
                    <span
                      className={cn(
                        'text-xs font-medium',
                        conditionColors[itemData.condition as Condition]
                      )}
                    >
                      {itemData.condition}
                    </span>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Condition</Label>
                    <Select
                      value={itemData.condition}
                      onValueChange={(value) =>
                        updateItem(currentRoom.name, itemName, 'condition', value)
                      }
                      disabled={isCompleted}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select condition" />
                      </SelectTrigger>
                      <SelectContent>
                        {CONDITIONS.map((condition) => (
                          <SelectItem key={condition} value={condition}>
                            {condition}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {itemData.condition === 'Damaged' && (
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1">
                        <DollarSign className="h-3.5 w-3.5" />
                        Estimated Cost
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={itemData.estimatedCost}
                        onChange={(e) =>
                          updateItem(currentRoom.name, itemName, 'estimatedCost', e.target.value)
                        }
                        disabled={isCompleted}
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    placeholder="Add notes about this item..."
                    value={itemData.notes}
                    onChange={(e) =>
                      updateItem(currentRoom.name, itemName, 'notes', e.target.value)
                    }
                    rows={2}
                    disabled={isCompleted}
                  />
                </div>

                {/* Photos */}
                <div className="space-y-2">
                  <Label>Photos</Label>
                  <div className="flex flex-wrap gap-2">
                    {itemData.photos.map((photo, photoIndex) => (
                      <div key={photoIndex} className="relative group">
                        <img
                          src={photo}
                          alt={`${itemName} photo ${photoIndex + 1}`}
                          className="h-20 w-20 rounded-lg object-cover border"
                        />
                        {!isCompleted && (
                          <button
                            type="button"
                            onClick={() => removePhoto(currentRoom.name, itemName, photoIndex)}
                            className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ))}

                    {!isCompleted && (
                      <button
                        type="button"
                        onClick={() => triggerPhotoUpload(currentRoom.name, itemName)}
                        className="h-20 w-20 rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                      >
                        <Camera className="h-5 w-5" />
                        <span className="text-xs mt-1">Add</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Deposit Reconciliation (Move-Out only) */}
      {isMoveOut && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Deposit Reconciliation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">Deposit Held</span>
                <span className="font-medium">{formatCurrency(depositAmount)}</span>
              </div>

              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">Total Deductions</span>
                <span className={cn('font-medium', totalDeductions > 0 && 'text-red-600')}>
                  {totalDeductions > 0 ? '-' : ''}
                  {formatCurrency(totalDeductions)}
                </span>
              </div>

              {/* Deduction breakdown */}
              {totalDeductions > 0 && (
                <div className="pl-4 space-y-1">
                  {Object.entries(inspectionData).map(([roomName, roomItems]) =>
                    Object.entries(roomItems)
                      .filter(
                        ([, item]) => item.condition === 'Damaged' && item.estimatedCost
                      )
                      .map(([itemName, item]) => (
                        <div
                          key={`${roomName}-${itemName}`}
                          className="flex justify-between text-sm text-muted-foreground"
                        >
                          <span>
                            {roomName} - {itemName}
                          </span>
                          <span>{formatCurrency(parseFloat(item.estimatedCost) || 0)}</span>
                        </div>
                      ))
                  )}
                </div>
              )}

              <div className="flex justify-between items-center py-3 border-t-2 border-primary">
                <span className="font-semibold text-lg">Refund Amount</span>
                <span className="font-bold text-lg text-green-600">
                  {formatCurrency(refundAmount)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      {!isCompleted && (
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={handleSaveDraft} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Draft
          </Button>
          <Button onClick={handleComplete} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Complete Inspection
          </Button>
        </div>
      )}
    </div>
  );
}
