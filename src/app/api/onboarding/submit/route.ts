import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db';
import { completeOnboardingSchema } from '@/lib/validators/onboarding';
import { encrypt } from '@/lib/encryption';
import { addMonths } from 'date-fns';

// POST /api/onboarding/submit - Submit complete onboarding application
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
    const result = completeOnboardingSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const data = result.data;

    // Verify unit is still available
    const unit = await prisma.unit.findUnique({
      where: { id: data.unitId },
      include: {
        property: true,
      },
    });

    if (!unit) {
      return NextResponse.json(
        { success: false, error: 'Unit not found' },
        { status: 404 }
      );
    }

    if (unit.status !== 'VACANT') {
      return NextResponse.json(
        { success: false, error: 'This unit is no longer available' },
        { status: 409 }
      );
    }

    // Get client IP for signature tracking
    const forwardedFor = request.headers.get('x-forwarded-for');
    const clientIp = forwardedFor ? forwardedFor.split(',')[0].trim() : 'unknown';

    // Calculate lease dates
    const startDate = new Date(data.moveInDate);
    const leaseMonths = parseInt(data.leaseTerm);
    const endDate = addMonths(startDate, leaseMonths);

    // Start transaction
    const lease = await prisma.$transaction(async (tx) => {
      // Update user profile with onboarding data
      await tx.user.update({
        where: { id: session.user.id },
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          dateOfBirth: new Date(data.dateOfBirth),
          ssnEncrypted: encrypt(data.ssnLast4),
          emergencyContactName: data.emergencyContactName,
          emergencyContactPhone: data.emergencyContactPhone,
          emergencyContactRelation: data.emergencyContactRelation,
          status: 'ACTIVE',
        },
      });

      // Create the lease
      const newLease = await tx.lease.create({
        data: {
          tenantId: session.user.id,
          unitId: data.unitId,
          status: 'PENDING_SIGNATURE',
          startDate,
          endDate,
          monthlyRent: unit.monthlyRent,
          depositAmount: unit.depositAmount,
          rentDueDay: 1,
          gracePeriodDays: 5,
          tenantSignature: data.signature,
          tenantSignedAt: new Date(),
          tenantSignedIp: clientIp,
          moveInDate: startDate,
        },
        include: {
          unit: {
            include: {
              property: true,
            },
          },
          tenant: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      // Update unit status to reserved
      await tx.unit.update({
        where: { id: data.unitId },
        data: { status: 'RESERVED' },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'TENANT_ONBOARDING_COMPLETED',
          entityType: 'Lease',
          entityId: newLease.id,
          ipAddress: clientIp,
          newValues: {
            unitId: data.unitId,
            leaseId: newLease.id,
            moveInDate: data.moveInDate,
            leaseTerm: data.leaseTerm,
          },
        },
      });

      return newLease;
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          leaseId: lease.id,
          message: 'Application submitted successfully. Awaiting landlord approval.',
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error submitting onboarding:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to submit application' },
      { status: 500 }
    );
  }
}
