import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db';
import { sendTenantSignedEmail, sendLeaseFullySignedEmail } from '@/lib/email';
import { createHash } from 'crypto';

function sha256(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

// POST /api/lease/[leaseId]/sign - Sign a lease (tenant or landlord)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ leaseId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - please log in' },
        { status: 401 }
      );
    }

    const { leaseId } = await params;
    const { signature, consentText } = await request.json();

    if (!signature) {
      return NextResponse.json(
        { success: false, error: 'Signature is required' },
        { status: 400 }
      );
    }

    const lease = await prisma.lease.findUnique({
      where: { id: leaseId },
      include: {
        tenant: { select: { id: true, email: true, firstName: true, lastName: true } },
        unit: {
          include: {
            property: {
              select: {
                ownerId: true,
                name: true,
                addressLine1: true,
                city: true,
                state: true,
                zipCode: true,
                owner: {
                  select: { firstName: true, lastName: true, email: true },
                },
              },
            },
          },
        },
        template: {
          select: { content: true },
        },
      },
    });

    if (!lease) {
      return NextResponse.json(
        { success: false, error: 'Lease not found' },
        { status: 404 }
      );
    }

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const now = new Date();

    // Determine if this is tenant or landlord signing (match by ID or email)
    const matchesTenant = session.user.id === lease.tenantId || session.user.email === lease.tenant.email;
    const matchesLandlord = session.user.id === lease.unit.property.ownerId;

    // Determine signing role - prioritize based on what still needs signing
    let signingAs: 'tenant' | 'landlord' | null = null;
    if (matchesTenant && !lease.tenantSignedAt) {
      signingAs = 'tenant';
    } else if (matchesLandlord && !lease.landlordSignedAt) {
      signingAs = 'landlord';
    } else if (matchesTenant && lease.tenantSignedAt) {
      return NextResponse.json(
        { success: false, error: 'You have already signed this lease' },
        { status: 400 }
      );
    } else if (matchesLandlord && lease.landlordSignedAt) {
      return NextResponse.json(
        { success: false, error: 'You have already signed this lease' },
        { status: 400 }
      );
    }

    // Also check session role as fallback
    if (!signingAs && session.user.role === 'TENANT' && !lease.tenantSignedAt) {
      signingAs = 'tenant';
    } else if (!signingAs && session.user.role === 'LANDLORD' && !lease.landlordSignedAt) {
      signingAs = 'landlord';
    }

    if (!signingAs) {
      return NextResponse.json(
        { success: false, error: 'You are not authorized to sign this lease' },
        { status: 403 }
      );
    }

    // Generate hashes for audit trail
    const signatureHash = sha256(signature);
    const documentHash = lease.template?.content
      ? sha256(lease.template.content)
      : sha256(`lease-${leaseId}-${lease.startDate}-${lease.endDate}-${lease.monthlyRent}`);

    const signerName = session.user.name || `${session.user.email}`;
    const signerEmail = session.user.email || '';
    const signerRole = signingAs === 'tenant' ? 'TENANT' : 'LANDLORD';

    const defaultConsentText = `I, ${signerName}, hereby consent to sign this Residential Lease Agreement electronically. I acknowledge that my electronic signature is legally binding under the Electronic Signatures in Global and National Commerce Act (ESIGN Act, 15 U.S.C. §§ 7001-7006) and the New Mexico Uniform Electronic Transactions Act (NMSA 1978, §§ 14-16-1 to 14-16-21). I have read and agree to all terms and conditions of this lease agreement.`;

    // Create SignatureAuditLog entries
    await prisma.signatureAuditLog.createMany({
      data: [
        {
          leaseId,
          userId: session.user.id,
          action: 'CONSENT_GIVEN',
          signerName,
          signerEmail,
          signerRole,
          ipAddress: ip,
          userAgent,
          consentText: consentText || defaultConsentText,
          consentAccepted: true,
          signatureHash: null,
          documentHash,
        },
        {
          leaseId,
          userId: session.user.id,
          action: 'SIGNATURE_APPLIED',
          signerName,
          signerEmail,
          signerRole,
          ipAddress: ip,
          userAgent,
          consentText: null,
          consentAccepted: false,
          signatureHash,
          documentHash,
        },
      ],
    });

    if (signingAs === 'tenant') {
      // If tenant matched by email but has a different user ID, update the lease
      const needsTenantIdUpdate = session.user.id !== lease.tenantId;

      // Tenant signs - check if landlord already signed to activate
      const shouldActivate = !!lease.landlordSignedAt;

      await prisma.lease.update({
        where: { id: leaseId },
        data: {
          tenantSignature: signature,
          tenantSignedAt: now,
          tenantSignedIp: ip,
          ...(needsTenantIdUpdate ? { tenantId: session.user.id } : {}),
          ...(shouldActivate ? { status: 'ACTIVE' } : {}),
        },
      });

      // If both signed, activate the lease and update unit
      if (shouldActivate) {
        await prisma.unit.update({
          where: { id: lease.unitId },
          data: { status: 'OCCUPIED' },
        });

        // Send fully signed email to both parties
        const propertyAddress = `${lease.unit.property.addressLine1}, ${lease.unit.property.city}, ${lease.unit.property.state} ${lease.unit.property.zipCode}`;
        const landlordFullName = `${lease.unit.property.owner.firstName} ${lease.unit.property.owner.lastName}`;
        const tenantFullName = signerName;

        await sendLeaseFullySignedEmail({
          landlordName: landlordFullName,
          landlordEmail: lease.unit.property.owner.email,
          tenantName: tenantFullName,
          tenantEmail: lease.tenant.email,
          propertyName: lease.unit.property.name,
          unitNumber: lease.unit.unitNumber,
          propertyAddress,
          startDate: lease.startDate.toISOString(),
          endDate: lease.endDate.toISOString(),
          leaseId,
        });
      }

      // Update tenant status to ACTIVE if pending
      await prisma.user.updateMany({
        where: { id: session.user.id, status: 'PENDING' },
        data: { status: 'ACTIVE' },
      });

      // Notify landlord that tenant has signed
      if (!shouldActivate) {
        const tenantName = session.user.name || `${lease.tenant.firstName} ${lease.tenant.lastName}`;
        await sendTenantSignedEmail(lease.unit.property.owner.email, {
          landlordName: `${lease.unit.property.owner.firstName} ${lease.unit.property.owner.lastName}`,
          tenantName,
          propertyName: lease.unit.property.name,
          unitNumber: lease.unit.unitNumber,
          leaseId,
        });
      }
    } else {
      // Landlord signs - check if tenant already signed to activate
      const shouldActivate = !!lease.tenantSignedAt;

      await prisma.lease.update({
        where: { id: leaseId },
        data: {
          landlordSignature: signature,
          landlordSignedAt: now,
          landlordSignedIp: ip,
          ...(shouldActivate ? { status: 'ACTIVE' } : {}),
        },
      });

      // If both signed, activate the lease and update unit
      if (shouldActivate) {
        await prisma.unit.update({
          where: { id: lease.unitId },
          data: { status: 'OCCUPIED' },
        });

        // Send fully signed email to both parties
        const propertyAddress = `${lease.unit.property.addressLine1}, ${lease.unit.property.city}, ${lease.unit.property.state} ${lease.unit.property.zipCode}`;
        const landlordFullName = signerName;
        const tenantFullName = `${lease.tenant.firstName} ${lease.tenant.lastName}`;

        await sendLeaseFullySignedEmail({
          landlordName: landlordFullName,
          landlordEmail: lease.unit.property.owner.email,
          tenantName: tenantFullName,
          tenantEmail: lease.tenant.email,
          propertyName: lease.unit.property.name,
          unitNumber: lease.unit.unitNumber,
          propertyAddress,
          startDate: lease.startDate.toISOString(),
          endDate: lease.endDate.toISOString(),
          leaseId,
        });
      }
    }

    const isTenant = signingAs === 'tenant';

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: isTenant ? 'TENANT_SIGN_LEASE' : 'LANDLORD_SIGN_LEASE',
        entityType: 'Lease',
        entityId: leaseId,
        ipAddress: ip,
        userAgent,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Lease signed successfully${isTenant && !lease.landlordSignedAt ? '. Waiting for landlord signature.' : !isTenant && !lease.tenantSignedAt ? '. Waiting for tenant signature.' : '. Lease is now active!'}`,
    });
  } catch (error) {
    console.error('Error signing lease:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to sign lease' },
      { status: 500 }
    );
  }
}
