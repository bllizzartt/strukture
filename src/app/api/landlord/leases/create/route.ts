import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db';
import { sendLeaseInviteEmail } from '@/lib/email';
import { z } from 'zod';

const createLeaseSchema = z.object({
  unitId: z.string(),
  tenantEmail: z.string().email(),
  startDate: z.string(),
  endDate: z.string(),
  monthlyRent: z.number().positive(),
  depositAmount: z.number().min(0),
  lateFee: z.number().min(0).nullable().optional(),
  gracePeriodDays: z.number().int().min(0).default(5),
  rentDueDay: z.number().int().min(1).max(28).default(1),
  petDeposit: z.number().min(0).nullable().optional(),
  petRent: z.number().min(0).nullable().optional(),
  additionalTerms: z.string().nullable().optional(),
  leaseDocumentId: z.string().nullable().optional(),
  templateId: z.string().nullable().optional(),
  numOccupants: z.number().int().min(1).default(1),
});

// POST /api/landlord/leases/create - Create a lease and send invite to tenant
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const result = createLeaseSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const data = result.data;

    // Verify the unit belongs to one of this landlord's properties
    const unit = await prisma.unit.findUnique({
      where: { id: data.unitId },
      include: {
        property: {
          select: {
            id: true,
            ownerId: true,
            name: true,
            addressLine1: true,
            city: true,
            state: true,
            zipCode: true,
          },
        },
        leases: {
          where: { status: 'ACTIVE' },
          take: 1,
        },
      },
    });

    if (!unit || unit.property.ownerId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'Unit not found or unauthorized' },
        { status: 404 }
      );
    }

    if (unit.leases.length > 0) {
      return NextResponse.json(
        { success: false, error: 'This unit already has an active lease' },
        { status: 400 }
      );
    }

    // Check if tenant exists, if not we'll create the lease with just the email
    // The tenant will create their account when they click the invite link
    let tenant = await prisma.user.findUnique({
      where: { email: data.tenantEmail.toLowerCase() },
    });

    // If tenant doesn't exist, create a placeholder account
    // They'll set their password when they click the invite link
    if (!tenant) {
      const { hash } = await import('bcryptjs');
      // Generate a random temporary password - tenant will set their own via the invite flow
      const tempPassword = crypto.randomUUID();
      const passwordHash = await hash(tempPassword, 12);

      tenant = await prisma.user.create({
        data: {
          email: data.tenantEmail.toLowerCase(),
          passwordHash,
          firstName: 'Pending',
          lastName: 'Tenant',
          role: 'TENANT',
          status: 'PENDING',
        },
      });
    }

    // Create the lease
    const lease = await prisma.lease.create({
      data: {
        tenantId: tenant.id,
        unitId: data.unitId,
        status: 'PENDING_SIGNATURE',
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        monthlyRent: data.monthlyRent,
        depositAmount: data.depositAmount,
        lateFee: data.lateFee ?? null,
        gracePeriodDays: data.gracePeriodDays,
        rentDueDay: data.rentDueDay,
        petDeposit: data.petDeposit ?? null,
        petRent: data.petRent ?? null,
        additionalTerms: data.additionalTerms ?? null,
        leaseDocumentId: data.leaseDocumentId ?? null,
        templateId: data.templateId ?? null,
      },
      include: {
        tenant: { select: { id: true, email: true, firstName: true, lastName: true } },
        unit: {
          include: {
            property: {
              select: { name: true, addressLine1: true, city: true, state: true, zipCode: true },
            },
          },
        },
      },
    });

    // Update unit status to reserved
    await prisma.unit.update({
      where: { id: data.unitId },
      data: { status: 'RESERVED' },
    });

    // Get landlord info for the email
    const landlord = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { firstName: true, lastName: true },
    });

    const landlordName = landlord ? `${landlord.firstName} ${landlord.lastName}` : 'Your Landlord';
    const propertyAddress = `${unit.property.addressLine1}, ${unit.property.city}, ${unit.property.state} ${unit.property.zipCode}`;

    // Send invite email to tenant
    await sendLeaseInviteEmail(data.tenantEmail.toLowerCase(), {
      tenantEmail: data.tenantEmail.toLowerCase(),
      landlordName,
      propertyName: unit.property.name,
      unitNumber: unit.unitNumber,
      propertyAddress,
      monthlyRent: data.monthlyRent,
      depositAmount: data.depositAmount,
      startDate: data.startDate,
      endDate: data.endDate,
      leaseId: lease.id,
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CREATE_LEASE',
        entityType: 'Lease',
        entityId: lease.id,
        newValues: {
          tenantEmail: data.tenantEmail,
          unitId: data.unitId,
          startDate: data.startDate,
          endDate: data.endDate,
          monthlyRent: data.monthlyRent,
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: lease,
      message: 'Lease created and invite sent to tenant',
    });
  } catch (error) {
    console.error('Error creating lease:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create lease' },
      { status: 500 }
    );
  }
}
