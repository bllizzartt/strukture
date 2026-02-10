import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/applications/[propertyId] - Get property info for application (public)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ propertyId: string }> }
) {
  try {
    const { propertyId } = await params;

    const property = await prisma.property.findUnique({
      where: { id: propertyId, status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        type: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        state: true,
        zipCode: true,
        amenities: true,
        units: {
          where: { status: 'VACANT' },
          select: {
            id: true,
            unitNumber: true,
            bedrooms: true,
            bathrooms: true,
            squareFeet: true,
            monthlyRent: true,
            depositAmount: true,
            features: true,
            petPolicy: true,
          },
          orderBy: { unitNumber: 'asc' },
        },
        owner: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!property) {
      return NextResponse.json(
        { success: false, error: 'Property not found or not accepting applications' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: property,
    });
  } catch (error) {
    console.error('Error fetching property for application:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load property information' },
      { status: 500 }
    );
  }
}

// POST /api/applications/[propertyId] - Submit a rental application (public)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ propertyId: string }> }
) {
  try {
    const { propertyId } = await params;

    // Verify property exists and is active
    const property = await prisma.property.findUnique({
      where: { id: propertyId, status: 'ACTIVE' },
      select: { id: true, name: true, ownerId: true },
    });

    if (!property) {
      return NextResponse.json(
        { success: false, error: 'Property not found or not accepting applications' },
        { status: 404 }
      );
    }

    const formData = await request.formData();

    // Extract form fields
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;
    const email = formData.get('email') as string;
    const phone = formData.get('phone') as string;

    // Validate required fields
    if (!firstName || !lastName || !email || !phone) {
      return NextResponse.json(
        { success: false, error: 'First name, last name, email, and phone are required' },
        { status: 400 }
      );
    }

    // Check for duplicate application
    const existingApp = await prisma.rentalApplication.findFirst({
      where: {
        propertyId,
        email,
        status: { in: ['SUBMITTED', 'UNDER_REVIEW'] },
      },
    });

    if (existingApp) {
      return NextResponse.json(
        { success: false, error: 'You already have a pending application for this property' },
        { status: 409 }
      );
    }

    // Parse optional fields
    const unitId = formData.get('unitId') as string | null;
    const dateOfBirth = formData.get('dateOfBirth') as string | null;
    const ssn4 = formData.get('ssn4') as string | null;

    // Create the application
    const application = await prisma.rentalApplication.create({
      data: {
        propertyId,
        unitId: unitId || null,
        firstName,
        lastName,
        email,
        phone,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        ssn4: ssn4 || null,

        // Current address
        currentAddress: (formData.get('currentAddress') as string) || null,
        currentCity: (formData.get('currentCity') as string) || null,
        currentState: (formData.get('currentState') as string) || null,
        currentZip: (formData.get('currentZip') as string) || null,
        monthlyRentCurrent: formData.get('monthlyRentCurrent')
          ? parseFloat(formData.get('monthlyRentCurrent') as string)
          : null,
        lengthAtAddress: (formData.get('lengthAtAddress') as string) || null,
        reasonForLeaving: (formData.get('reasonForLeaving') as string) || null,

        // Previous landlord
        previousLandlordName: (formData.get('previousLandlordName') as string) || null,
        previousLandlordPhone: (formData.get('previousLandlordPhone') as string) || null,
        previousLandlordEmail: (formData.get('previousLandlordEmail') as string) || null,

        // Employment
        employer: (formData.get('employer') as string) || null,
        employerPhone: (formData.get('employerPhone') as string) || null,
        jobTitle: (formData.get('jobTitle') as string) || null,
        monthlyIncome: formData.get('monthlyIncome')
          ? parseFloat(formData.get('monthlyIncome') as string)
          : null,
        employmentLength: (formData.get('employmentLength') as string) || null,
        additionalIncome: formData.get('additionalIncome')
          ? parseFloat(formData.get('additionalIncome') as string)
          : null,
        additionalIncomeSource: (formData.get('additionalIncomeSource') as string) || null,

        // Occupants
        numberOfOccupants: formData.get('numberOfOccupants')
          ? parseInt(formData.get('numberOfOccupants') as string, 10)
          : 1,
        occupantNames: (formData.get('occupantNames') as string) || null,
        hasPets: formData.get('hasPets') === 'true',
        petDetails: (formData.get('petDetails') as string) || null,

        // Vehicles
        hasVehicles: formData.get('hasVehicles') === 'true',
        vehicleDetails: (formData.get('vehicleDetails') as string) || null,

        // Emergency contact
        emergencyContactName: (formData.get('emergencyContactName') as string) || null,
        emergencyContactPhone: (formData.get('emergencyContactPhone') as string) || null,
        emergencyContactRelation: (formData.get('emergencyContactRelation') as string) || null,

        // Background
        hasEviction: formData.get('hasEviction') === 'true',
        evictionDetails: (formData.get('evictionDetails') as string) || null,
        hasFelony: formData.get('hasFelony') === 'true',
        felonyDetails: (formData.get('felonyDetails') as string) || null,
        hasBankruptcy: formData.get('hasBankruptcy') === 'true',

        // Move-in preferences
        desiredMoveIn: formData.get('desiredMoveIn')
          ? new Date(formData.get('desiredMoveIn') as string)
          : null,
        desiredLeaseTerm: (formData.get('desiredLeaseTerm') as string) || null,

        // Consent
        backgroundCheckConsent: formData.get('backgroundCheckConsent') === 'true',
        creditCheckConsent: formData.get('creditCheckConsent') === 'true',
      },
    });

    // Handle file uploads (W2, ID, pay stubs)
    const fileFields = [
      { key: 'idFront', type: 'ID_DOCUMENT' as const, label: 'ID - Front' },
      { key: 'idBack', type: 'ID_DOCUMENT' as const, label: 'ID - Back' },
      { key: 'w2', type: 'PROOF_OF_INCOME' as const, label: 'W2 / Income Documentation' },
      { key: 'payStub1', type: 'PROOF_OF_INCOME' as const, label: 'Pay Stub 1' },
      { key: 'payStub2', type: 'PROOF_OF_INCOME' as const, label: 'Pay Stub 2' },
      { key: 'payStub3', type: 'PROOF_OF_INCOME' as const, label: 'Pay Stub 3' },
    ];

    for (const field of fileFields) {
      const file = formData.get(field.key) as File | null;
      if (file && file.size > 0) {
        const arrayBuffer = await file.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        const dataUrl = `data:${file.type};base64,${base64}`;

        await prisma.document.create({
          data: {
            applicationId: application.id,
            propertyId,
            type: field.type,
            name: `${field.label} - ${firstName} ${lastName}`,
            description: `${field.label} uploaded with rental application`,
            fileUrl: dataUrl,
            fileKey: `app-${application.id}-${field.key}-${Date.now()}`,
            fileSize: arrayBuffer.byteLength,
            mimeType: file.type || 'application/octet-stream',
          },
        });
      }
    }

    // Handle supporting documents (unlimited PDFs)
    const supportingDocCount = parseInt(
      (formData.get('supportingDocCount') as string) || '0',
      10
    );

    for (let i = 0; i < supportingDocCount; i++) {
      const file = formData.get(`supportingDoc_${i}`) as File | null;
      const label = (formData.get(`supportingDocLabel_${i}`) as string) || `Supporting Document ${i + 1}`;

      if (file && file.size > 0) {
        const arrayBuffer = await file.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        const dataUrl = `data:${file.type};base64,${base64}`;

        await prisma.document.create({
          data: {
            applicationId: application.id,
            propertyId,
            type: 'APPLICATION',
            name: `${label} - ${firstName} ${lastName}`,
            description: `Supporting document uploaded with rental application: ${label}`,
            fileUrl: dataUrl,
            fileKey: `app-${application.id}-supporting-${i}-${Date.now()}`,
            fileSize: arrayBuffer.byteLength,
            mimeType: file.type || 'application/pdf',
          },
        });
      }
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'RENTAL_APPLICATION_SUBMITTED',
        entityType: 'RentalApplication',
        entityId: application.id,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Application submitted successfully',
        data: { id: application.id },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error submitting application:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to submit application' },
      { status: 500 }
    );
  }
}
