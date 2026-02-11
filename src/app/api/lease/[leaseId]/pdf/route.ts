import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db';

// GET /api/lease/[leaseId]/pdf - Get lease data for PDF generation (client renders PDF)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ leaseId: string }> }
) {
  try {
    const { leaseId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const lease = await prisma.lease.findUnique({
      where: { id: leaseId },
      include: {
        tenant: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            dateOfBirth: true,
          },
        },
        unit: {
          include: {
            property: {
              select: {
                name: true,
                addressLine1: true,
                addressLine2: true,
                city: true,
                state: true,
                zipCode: true,
                logoUrl: true,
                owner: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    phone: true,
                  },
                },
              },
            },
          },
        },
        template: {
          select: {
            content: true,
          },
        },
        occupants: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!lease) {
      return NextResponse.json(
        { success: false, error: 'Lease not found' },
        { status: 404 }
      );
    }

    // Verify the user is the tenant, co-tenant, or the landlord
    const isTenant = session.user.id === lease.tenantId || session.user.email === lease.tenant.email;
    const isLandlord = session.user.id === lease.unit.property.owner.id;
    const isCoTenant = lease.occupants.some(
      (o) => o.type === 'CO_TENANT' && (o.userId === session.user.id || o.email === session.user.email)
    );

    if (!isTenant && !isLandlord && !isCoTenant) {
      return NextResponse.json(
        { success: false, error: 'Not authorized to view this lease' },
        { status: 403 }
      );
    }

    const property = lease.unit.property;
    const address = [
      property.addressLine1,
      property.addressLine2,
      `${property.city}, ${property.state} ${property.zipCode}`,
    ].filter(Boolean).join(', ');

    return NextResponse.json({
      success: true,
      data: {
        landlordName: `${property.owner.firstName} ${property.owner.lastName}`,
        landlordEmail: property.owner.email,
        landlordPhone: property.owner.phone || undefined,
        tenantName: lease.tenant.firstName === 'Pending'
          ? ''
          : `${lease.tenant.firstName} ${lease.tenant.lastName}`,
        tenantEmail: lease.tenant.email,
        tenantPhone: lease.tenant.phone || undefined,
        propertyName: property.name,
        propertyAddress: address,
        unitNumber: lease.unit.unitNumber,
        startDate: lease.startDate.toISOString(),
        endDate: lease.endDate.toISOString(),
        monthlyRent: Number(lease.monthlyRent),
        depositAmount: Number(lease.depositAmount),
        lateFee: lease.lateFee ? Number(lease.lateFee) : null,
        gracePeriodDays: lease.gracePeriodDays,
        rentDueDay: lease.rentDueDay,
        petDeposit: lease.petDeposit ? Number(lease.petDeposit) : null,
        petRent: lease.petRent ? Number(lease.petRent) : null,
        additionalTerms: lease.additionalTerms,
        tenantSignature: lease.tenantSignature || undefined,
        tenantSignedAt: lease.tenantSignedAt?.toISOString() || undefined,
        landlordSignature: lease.landlordSignature || undefined,
        landlordSignedAt: lease.landlordSignedAt?.toISOString() || undefined,
        templateContent: lease.template?.content || undefined,
        tenantDob: lease.tenant.dateOfBirth?.toISOString() || undefined,
        logoUrl: property.logoUrl || undefined,
        tenantSignedIp: lease.tenantSignedIp || undefined,
        landlordSignedIp: lease.landlordSignedIp || undefined,
        generatedAt: new Date().toISOString(),
        coTenants: lease.occupants
          .filter((o) => o.type === 'CO_TENANT')
          .map((o) => ({
            name: `${o.firstName} ${o.lastName}`,
            email: o.email || '',
            signature: o.signature || undefined,
            signedAt: o.signedAt?.toISOString() || undefined,
            signedIp: o.signedIp || undefined,
            relationship: o.relationship || undefined,
          })),
        minorOccupants: lease.occupants
          .filter((o) => o.type === 'MINOR')
          .map((o) => ({
            name: `${o.firstName} ${o.lastName}`,
            dateOfBirth: o.dateOfBirth?.toISOString() || undefined,
            relationship: o.relationship || undefined,
          })),
      },
    });
  } catch (error) {
    console.error('Error fetching lease PDF data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch lease data' },
      { status: 500 }
    );
  }
}
