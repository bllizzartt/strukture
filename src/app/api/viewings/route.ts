import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { notifyViewingRequested } from '@/lib/notifications';

// POST /api/viewings - Submit a viewing request (public)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      propertyId,
      unitId,
      firstName,
      lastName,
      email,
      phone,
      message,
      preferredDate1,
      preferredDate2,
      preferredDate3,
    } = body;

    // Validate required fields
    if (!propertyId || !firstName || !lastName || !email || !phone || !preferredDate1) {
      return NextResponse.json(
        { success: false, error: 'Name, email, phone, property, and at least one preferred date are required' },
        { status: 400 }
      );
    }

    // Verify property exists and is active
    const property = await prisma.property.findUnique({
      where: { id: propertyId, status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        addressLine1: true,
        city: true,
        state: true,
        zipCode: true,
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            telegramChatId: true,
          },
        },
      },
    });

    if (!property) {
      return NextResponse.json(
        { success: false, error: 'Property not found or not accepting viewings' },
        { status: 404 }
      );
    }

    // Check for duplicate viewing request (same email + property within last 7 days)
    const recentRequest = await prisma.viewingRequest.findFirst({
      where: {
        propertyId,
        email,
        status: { in: ['REQUESTED', 'CONFIRMED'] },
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    });

    if (recentRequest) {
      return NextResponse.json(
        { success: false, error: 'You already have a pending viewing request for this property' },
        { status: 409 }
      );
    }

    // Look up unit number if provided
    let unitNumber: string | undefined;
    if (unitId) {
      const unit = await prisma.unit.findUnique({
        where: { id: unitId },
        select: { unitNumber: true },
      });
      unitNumber = unit?.unitNumber;
    }

    // Create the viewing request
    const viewing = await prisma.viewingRequest.create({
      data: {
        propertyId,
        unitId: unitId || null,
        firstName,
        lastName,
        email,
        phone,
        message: message || null,
        preferredDate1: new Date(preferredDate1),
        preferredDate2: preferredDate2 ? new Date(preferredDate2) : null,
        preferredDate3: preferredDate3 ? new Date(preferredDate3) : null,
      },
    });

    // Notify landlord
    try {
      await notifyViewingRequested({
        viewingId: viewing.id,
        visitorName: `${firstName} ${lastName}`,
        visitorEmail: email,
        visitorPhone: phone,
        message: message || undefined,
        propertyName: property.name,
        propertyAddress: `${property.addressLine1}, ${property.city}, ${property.state} ${property.zipCode}`,
        unitNumber,
        preferredDate1,
        preferredDate2: preferredDate2 || undefined,
        preferredDate3: preferredDate3 || undefined,
        landlordId: property.owner.id,
        landlordEmail: property.owner.email,
        landlordName: `${property.owner.firstName} ${property.owner.lastName}`,
        landlordTelegramId: property.owner.telegramChatId,
      });
    } catch (notifyError) {
      console.error('Failed to send viewing notifications:', notifyError);
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Viewing request submitted successfully',
        data: { id: viewing.id },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error submitting viewing request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to submit viewing request' },
      { status: 500 }
    );
  }
}
