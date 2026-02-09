import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';

// POST /api/landlord/leases/upload-pdf - Upload a PDF and extract lease data
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('pdf') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No PDF file provided' },
        { status: 400 }
      );
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { success: false, error: 'File must be a PDF' },
        { status: 400 }
      );
    }

    // Read the file buffer
    const arrayBuffer = await file.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);

    // Extract text from PDF using pdfjs-dist legacy build (works in serverless)
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const doc = await pdfjsLib.getDocument({ data }).promise;
    const pageCount = doc.numPages;

    let text = '';
    for (let i = 1; i <= pageCount; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pageText = content.items
        .map((item: any) => item.str || '')
        .join(' ');
      text += pageText + '\n\n';
    }
    await doc.destroy();

    // Parse the extracted text for common lease fields
    const extracted = parseLeasePdf(text);

    return NextResponse.json({
      success: true,
      data: {
        rawText: text,
        extracted,
        pageCount,
      },
    });
  } catch (error) {
    console.error('Error processing PDF:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process PDF' },
      { status: 500 }
    );
  }
}

interface ExtractedLeaseData {
  tenantName: string | null;
  tenantEmail: string | null;
  landlordName: string | null;
  propertyAddress: string | null;
  monthlyRent: number | null;
  depositAmount: number | null;
  startDate: string | null;
  endDate: string | null;
  lateFee: number | null;
  gracePeriodDays: number | null;
  rentDueDay: number | null;
  petDeposit: number | null;
  petRent: number | null;
  additionalTerms: string | null;
}

function parseLeasePdf(text: string): ExtractedLeaseData {
  const result: ExtractedLeaseData = {
    tenantName: null,
    tenantEmail: null,
    landlordName: null,
    propertyAddress: null,
    monthlyRent: null,
    depositAmount: null,
    startDate: null,
    endDate: null,
    lateFee: null,
    gracePeriodDays: null,
    rentDueDay: null,
    petDeposit: null,
    petRent: null,
    additionalTerms: null,
  };

  // Normalize whitespace
  const normalized = text.replace(/\s+/g, ' ');

  // Extract tenant name - look for common patterns
  const tenantPatterns = [
    /(?:tenant|lessee|renter|resident)\s*(?:name)?[:\s]*([A-Z][a-z]+\s+[A-Z][a-z]+)/i,
    /(?:hereinafter\s+(?:referred\s+to\s+as\s+)?(?:the\s+)?"?tenant"?)\s*[,:]?\s*([A-Z][a-z]+\s+[A-Z][a-z]+)/i,
    /([A-Z][a-z]+\s+[A-Z][a-z]+)\s*[\(,]\s*(?:hereinafter|"tenant"|the tenant)/i,
  ];
  for (const pattern of tenantPatterns) {
    const match = normalized.match(pattern);
    if (match) {
      result.tenantName = match[1].trim();
      break;
    }
  }

  // Extract landlord name
  const landlordPatterns = [
    /(?:landlord|lessor|owner|property\s*manager)\s*(?:name)?[:\s]*([A-Z][a-z]+\s+[A-Z][a-z]+)/i,
    /(?:hereinafter\s+(?:referred\s+to\s+as\s+)?(?:the\s+)?"?landlord"?)\s*[,:]?\s*([A-Z][a-z]+\s+[A-Z][a-z]+)/i,
    /([A-Z][a-z]+\s+[A-Z][a-z]+)\s*[\(,]\s*(?:hereinafter|"landlord"|the landlord)/i,
  ];
  for (const pattern of landlordPatterns) {
    const match = normalized.match(pattern);
    if (match) {
      result.landlordName = match[1].trim();
      break;
    }
  }

  // Extract email
  const emailMatch = normalized.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) {
    result.tenantEmail = emailMatch[0];
  }

  // Extract property address
  const addressPatterns = [
    /(?:property\s*address|premises|located\s*at|property\s*located)[:\s]*([^.]+?(?:\d{5}(?:-\d{4})?))/i,
    /(?:address)[:\s]*(\d+[^.]*?(?:\d{5}(?:-\d{4})?))/i,
    /(\d+\s+[A-Z][a-zA-Z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Boulevard|Blvd|Lane|Ln|Way|Court|Ct|Place|Pl)[.,]?\s+[A-Z][a-zA-Z\s]+[.,]?\s*[A-Z]{2}\s*\d{5})/i,
  ];
  for (const pattern of addressPatterns) {
    const match = normalized.match(pattern);
    if (match) {
      result.propertyAddress = match[1].trim().replace(/\s+/g, ' ');
      break;
    }
  }

  // Extract monetary amounts
  const rentPatterns = [
    /(?:monthly\s*rent|rent\s*amount|rent\s*shall\s*be|rent\s*of|monthly\s*payment)[:\s]*\$?([\d,]+(?:\.\d{2})?)/i,
    /\$\s*([\d,]+(?:\.\d{2})?)\s*(?:per\s*month|\/\s*month|monthly)/i,
  ];
  for (const pattern of rentPatterns) {
    const match = normalized.match(pattern);
    if (match) {
      result.monthlyRent = parseFloat(match[1].replace(/,/g, ''));
      break;
    }
  }

  // Extract deposit amount
  const depositPatterns = [
    /(?:security\s*deposit|deposit\s*(?:amount|of))[:\s]*\$?([\d,]+(?:\.\d{2})?)/i,
    /(?:deposit)[:\s]*\$\s*([\d,]+(?:\.\d{2})?)/i,
  ];
  for (const pattern of depositPatterns) {
    const match = normalized.match(pattern);
    if (match) {
      result.depositAmount = parseFloat(match[1].replace(/,/g, ''));
      break;
    }
  }

  // Extract late fee
  const lateFeeMatch = normalized.match(
    /(?:late\s*fee|late\s*charge|late\s*payment\s*fee)[:\s]*\$?([\d,]+(?:\.\d{2})?)/i
  );
  if (lateFeeMatch) {
    result.lateFee = parseFloat(lateFeeMatch[1].replace(/,/g, ''));
  }

  // Extract grace period
  const graceMatch = normalized.match(
    /(?:grace\s*period)[:\s]*(\d+)\s*(?:day|calendar)/i
  );
  if (graceMatch) {
    result.gracePeriodDays = parseInt(graceMatch[1]);
  }

  // Extract rent due day
  const dueDayPatterns = [
    /(?:rent\s*(?:is\s*)?due|due\s*(?:on|by))\s*(?:the\s*)?(\d{1,2})(?:st|nd|rd|th)?\s*(?:day|of\s*each)/i,
    /(\d{1,2})(?:st|nd|rd|th)?\s*(?:day)?\s*of\s*(?:each|every)\s*month/i,
  ];
  for (const pattern of dueDayPatterns) {
    const match = normalized.match(pattern);
    if (match) {
      const day = parseInt(match[1]);
      if (day >= 1 && day <= 28) {
        result.rentDueDay = day;
      }
      break;
    }
  }

  // Extract dates
  const datePatterns = [
    /(?:commence|start|begin)(?:s|ing)?\s*(?:on|date)?[:\s]*(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i,
    /(?:commence|start|begin)(?:s|ing)?\s*(?:on|date)?[:\s]*([A-Z][a-z]+\s+\d{1,2},?\s+\d{4})/i,
    /(?:term|lease)\s*(?:shall\s*)?(?:commence|start|begin)\s*(?:on)?\s*(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i,
    /(?:term|lease)\s*(?:shall\s*)?(?:commence|start|begin)\s*(?:on)?\s*([A-Z][a-z]+\s+\d{1,2},?\s+\d{4})/i,
  ];
  for (const pattern of datePatterns) {
    const match = normalized.match(pattern);
    if (match) {
      result.startDate = normalizeDate(match[1]);
      break;
    }
  }

  const endDatePatterns = [
    /(?:expire|end|terminat)(?:s|e|ing)?\s*(?:on|date)?[:\s]*(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i,
    /(?:expire|end|terminat)(?:s|e|ing)?\s*(?:on|date)?[:\s]*([A-Z][a-z]+\s+\d{1,2},?\s+\d{4})/i,
    /(?:through|until)\s*(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i,
    /(?:through|until)\s*([A-Z][a-z]+\s+\d{1,2},?\s+\d{4})/i,
  ];
  for (const pattern of endDatePatterns) {
    const match = normalized.match(pattern);
    if (match) {
      result.endDate = normalizeDate(match[1]);
      break;
    }
  }

  // Extract pet deposit
  const petDepositMatch = normalized.match(
    /(?:pet\s*deposit)[:\s]*\$?([\d,]+(?:\.\d{2})?)/i
  );
  if (petDepositMatch) {
    result.petDeposit = parseFloat(petDepositMatch[1].replace(/,/g, ''));
  }

  // Extract pet rent
  const petRentMatch = normalized.match(
    /(?:pet\s*rent|pet\s*fee|monthly\s*pet)[:\s]*\$?([\d,]+(?:\.\d{2})?)/i
  );
  if (petRentMatch) {
    result.petRent = parseFloat(petRentMatch[1].replace(/,/g, ''));
  }

  return result;
}

function normalizeDate(dateStr: string): string | null {
  try {
    // Try parsing MM/DD/YYYY or MM-DD-YYYY
    const slashMatch = dateStr.match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/);
    if (slashMatch) {
      const month = slashMatch[1].padStart(2, '0');
      const day = slashMatch[2].padStart(2, '0');
      let year = slashMatch[3];
      if (year.length === 2) {
        year = parseInt(year) > 50 ? `19${year}` : `20${year}`;
      }
      return `${year}-${month}-${day}`;
    }

    // Try parsing "Month DD, YYYY"
    const wordMatch = dateStr.match(/([A-Z][a-z]+)\s+(\d{1,2}),?\s+(\d{4})/);
    if (wordMatch) {
      const months: Record<string, string> = {
        January: '01', February: '02', March: '03', April: '04',
        May: '05', June: '06', July: '07', August: '08',
        September: '09', October: '10', November: '11', December: '12',
      };
      const month = months[wordMatch[1]];
      if (month) {
        const day = wordMatch[2].padStart(2, '0');
        return `${wordMatch[3]}-${month}-${day}`;
      }
    }

    return null;
  } catch {
    return null;
  }
}
