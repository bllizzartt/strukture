import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { format } from 'date-fns';

const styles = StyleSheet.create({
  page: {
    padding: 50,
    fontSize: 10,
    fontFamily: 'Helvetica',
    lineHeight: 1.5,
  },
  header: {
    textAlign: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 2,
  },
  jurisdiction: {
    fontSize: 9,
    textAlign: 'center',
    color: '#555',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    marginTop: 14,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  paragraph: {
    marginBottom: 6,
    textAlign: 'justify',
  },
  bold: {
    fontFamily: 'Helvetica-Bold',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  label: {
    width: 160,
    color: '#444',
  },
  value: {
    flex: 1,
    fontFamily: 'Helvetica-Bold',
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    marginTop: 8,
    marginBottom: 8,
  },
  signatureSection: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signatureBlock: {
    width: '45%',
  },
  signatureImage: {
    height: 50,
    width: 180,
    objectFit: 'contain',
  },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    marginTop: 8,
    marginBottom: 3,
    height: 50,
  },
  signatureLabel: {
    fontSize: 9,
    color: '#444',
  },
  signatureDate: {
    fontSize: 8,
    color: '#666',
    marginTop: 2,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 50,
    right: 50,
    textAlign: 'center',
    fontSize: 7,
    color: '#999',
  },
  pageNumber: {
    position: 'absolute',
    bottom: 20,
    right: 50,
    fontSize: 8,
    color: '#999',
  },
  indent: {
    paddingLeft: 20,
    marginBottom: 4,
  },
  templateLine: {
    marginBottom: 2,
  },
});

export interface LeaseDocumentData {
  // Landlord info
  landlordName: string;
  landlordEmail: string;
  landlordPhone?: string;

  // Tenant info
  tenantName: string;
  tenantEmail: string;
  tenantPhone?: string;
  tenantDob?: string;

  // Property
  propertyName: string;
  propertyAddress: string;
  unitNumber: string;

  // Lease terms
  startDate: string;
  endDate: string;
  monthlyRent: number;
  depositAmount: number;
  lateFee: number | null;
  gracePeriodDays: number;
  rentDueDay: number;
  petDeposit: number | null;
  petRent: number | null;
  additionalTerms: string | null;

  // Signatures (base64 data URIs)
  tenantSignature?: string;
  tenantSignedAt?: string;
  landlordSignature?: string;
  landlordSignedAt?: string;

  // Template content (if template-based lease)
  templateContent?: string;
}

function fmt(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

function fmtDate(date: string): string {
  return format(new Date(date), 'MMMM d, yyyy');
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function populateTemplateForPdf(content: string, data: LeaseDocumentData): string {
  const replacements: Record<string, string> = {
    '{{landlord_name}}': data.landlordName,
    '{{landlord_email}}': data.landlordEmail,
    '{{landlord_phone}}': data.landlordPhone || 'N/A',
    '{{tenant_name}}': data.tenantName || 'N/A',
    '{{tenant_email}}': data.tenantEmail,
    '{{tenant_phone}}': data.tenantPhone || 'N/A',
    '{{tenant_dob}}': data.tenantDob ? format(new Date(data.tenantDob), 'MM/dd/yyyy') : 'N/A',
    '{{property_name}}': data.propertyName,
    '{{property_address}}': data.propertyAddress,
    '{{unit_number}}': data.unitNumber,
    '{{num_bedrooms}}': 'N/A',
    '{{num_bathrooms}}': 'N/A',
    '{{lease_start_date}}': fmtDate(data.startDate),
    '{{lease_end_date}}': fmtDate(data.endDate),
    '{{monthly_rent}}': fmt(data.monthlyRent),
    '{{deposit_amount}}': fmt(data.depositAmount),
    '{{rent_due_day}}': ordinal(data.rentDueDay),
    '{{grace_period_days}}': String(data.gracePeriodDays),
    '{{late_fee}}': data.lateFee ? fmt(data.lateFee) : 'N/A',
    '{{pet_deposit}}': data.petDeposit ? fmt(data.petDeposit) : 'N/A',
    '{{pet_rent}}': data.petRent ? fmt(data.petRent) : 'N/A',
    '{{today_date}}': format(new Date(), 'MM/dd/yyyy'),
    '{{num_occupants}}': '1',
  };

  let populated = content;
  for (const [key, value] of Object.entries(replacements)) {
    populated = populated.replaceAll(key, value);
  }
  return populated;
}

// Split long text into chunks that fit on pages
function splitIntoPages(lines: string[], linesPerPage: number): string[][] {
  const pages: string[][] = [];
  for (let i = 0; i < lines.length; i += linesPerPage) {
    pages.push(lines.slice(i, i + linesPerPage));
  }
  return pages;
}

// Template-based lease document
function TemplateLeaseDocument({ data }: { data: LeaseDocumentData }) {
  const populated = populateTemplateForPdf(data.templateContent!, data);
  const lines = populated.split('\n');
  const LINES_PER_PAGE = 45;

  // Reserve last page for signatures
  const contentPages = splitIntoPages(lines, LINES_PER_PAGE);

  return (
    <Document>
      {contentPages.map((pageLines, pageIndex) => (
        <Page key={pageIndex} size="LETTER" style={styles.page}>
          {pageLines.map((line, lineIndex) => {
            // Check if line looks like a section header (all caps or starts with a number followed by a period)
            const isHeader = /^\d+\.\s+[A-Z]/.test(line) || (line === line.toUpperCase() && line.trim().length > 3 && /[A-Z]/.test(line));

            return (
              <Text
                key={lineIndex}
                style={
                  isHeader
                    ? { ...styles.sectionTitle, marginTop: lineIndex === 0 ? 0 : 10 }
                    : line.trim() === ''
                    ? { marginBottom: 6 }
                    : styles.templateLine
                }
              >
                {line}
              </Text>
            );
          })}

          <Text style={styles.footer}>
            Residential Lease Agreement — {data.propertyName} Unit {data.unitNumber} — Generated by Strukture
          </Text>
          <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
        </Page>
      ))}

      {/* Signature page */}
      <Page size="LETTER" style={styles.page}>
        <View style={styles.divider} />

        <Text style={{ ...styles.sectionTitle, textAlign: 'center' }}>SIGNATURES</Text>
        <Text style={{ ...styles.paragraph, textAlign: 'center', fontSize: 9, color: '#555' }}>
          By signing below, each party acknowledges that they have read, understand, and agree to all terms
          and conditions set forth in this Lease Agreement.
        </Text>

        <View style={styles.signatureSection}>
          {/* Landlord signature */}
          <View style={styles.signatureBlock}>
            <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 10, marginBottom: 4 }}>LANDLORD</Text>
            {data.landlordSignature ? (
              <View>
                <Image src={data.landlordSignature} style={styles.signatureImage} />
                <View style={{ borderBottomWidth: 1, borderBottomColor: '#000' }} />
              </View>
            ) : (
              <View style={styles.signatureLine} />
            )}
            <Text style={styles.signatureLabel}>Signature: {data.landlordName}</Text>
            {data.landlordSignedAt ? (
              <Text style={styles.signatureDate}>
                Signed electronically on {fmtDate(data.landlordSignedAt)}
              </Text>
            ) : (
              <Text style={styles.signatureDate}>Date: ________________________</Text>
            )}
          </View>

          {/* Tenant signature */}
          <View style={styles.signatureBlock}>
            <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 10, marginBottom: 4 }}>TENANT</Text>
            {data.tenantSignature ? (
              <View>
                <Image src={data.tenantSignature} style={styles.signatureImage} />
                <View style={{ borderBottomWidth: 1, borderBottomColor: '#000' }} />
              </View>
            ) : (
              <View style={styles.signatureLine} />
            )}
            <Text style={styles.signatureLabel}>
              Signature: {data.tenantName || '________________________'}
            </Text>
            {data.tenantSignedAt ? (
              <Text style={styles.signatureDate}>
                Signed electronically on {fmtDate(data.tenantSignedAt)}
              </Text>
            ) : (
              <Text style={styles.signatureDate}>Date: ________________________</Text>
            )}
          </View>
        </View>

        <View style={{ marginTop: 16 }}>
          <Text style={{ fontSize: 8, color: '#666', textAlign: 'center' }}>
            Electronic signatures on this document are legally binding under the Electronic Signatures in Global
            and National Commerce Act (ESIGN Act, 15 U.S.C. §§ 7001-7006) and the New Mexico Uniform Electronic
            Transactions Act (NMSA 1978, §§ 14-16-1 to 14-16-21).
          </Text>
        </View>

        <Text style={styles.footer}>
          Residential Lease Agreement — {data.propertyName} Unit {data.unitNumber} — Generated by Strukture
        </Text>
        <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
      </Page>
    </Document>
  );
}

// Legacy hardcoded lease document (for leases without templates)
function LegacyLeaseDocument({ data }: { data: LeaseDocumentData }) {
  const hasPets = !!(data.petDeposit || data.petRent);

  return (
    <Document>
      {/* PAGE 1 */}
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>RESIDENTIAL LEASE AGREEMENT</Text>
          <Text style={styles.subtitle}>State of New Mexico</Text>
          <Text style={styles.jurisdiction}>
            Governed by the New Mexico Uniform Owner-Resident Relations Act (NMSA 1978, §§ 47-8-1 to 47-8-51)
          </Text>
        </View>

        <Text style={styles.paragraph}>
          This Residential Lease Agreement (&quot;Lease&quot;) is made and entered into as of{' '}
          <Text style={styles.bold}>{fmtDate(data.startDate)}</Text>, by and between the following parties:
        </Text>

        <Text style={styles.sectionTitle}>1. Parties</Text>

        <Text style={{ ...styles.paragraph, fontFamily: 'Helvetica-Bold', marginBottom: 2 }}>LANDLORD (Owner):</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Full Name:</Text>
          <Text style={styles.value}>{data.landlordName}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Email:</Text>
          <Text style={styles.value}>{data.landlordEmail}</Text>
        </View>
        {data.landlordPhone && (
          <View style={styles.row}>
            <Text style={styles.label}>Phone:</Text>
            <Text style={styles.value}>{data.landlordPhone}</Text>
          </View>
        )}

        <View style={{ marginTop: 6 }} />
        <Text style={{ ...styles.paragraph, fontFamily: 'Helvetica-Bold', marginBottom: 2 }}>TENANT (Resident):</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Full Name:</Text>
          <Text style={styles.value}>{data.tenantName || '________________________________________'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Email:</Text>
          <Text style={styles.value}>{data.tenantEmail}</Text>
        </View>
        {data.tenantPhone && (
          <View style={styles.row}>
            <Text style={styles.label}>Phone:</Text>
            <Text style={styles.value}>{data.tenantPhone}</Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>2. Premises</Text>
        <Text style={styles.paragraph}>
          Landlord hereby leases to Tenant, and Tenant hereby rents from Landlord, the following described premises
          (&quot;Premises&quot;):
        </Text>
        <View style={styles.row}>
          <Text style={styles.label}>Property Name:</Text>
          <Text style={styles.value}>{data.propertyName}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Address:</Text>
          <Text style={styles.value}>{data.propertyAddress}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Unit Number:</Text>
          <Text style={styles.value}>{data.unitNumber}</Text>
        </View>

        <Text style={styles.sectionTitle}>3. Lease Term</Text>
        <Text style={styles.paragraph}>
          The term of this Lease shall begin on <Text style={styles.bold}>{fmtDate(data.startDate)}</Text>{' '}
          and shall end on <Text style={styles.bold}>{fmtDate(data.endDate)}</Text>, unless sooner terminated
          in accordance with the terms of this Lease or applicable law.
        </Text>

        <Text style={styles.sectionTitle}>4. Rent</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Monthly Rent:</Text>
          <Text style={styles.value}>{fmt(data.monthlyRent)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Due Date:</Text>
          <Text style={styles.value}>{ordinal(data.rentDueDay)} of each month</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Grace Period:</Text>
          <Text style={styles.value}>{data.gracePeriodDays} days</Text>
        </View>
        {data.lateFee && (
          <View style={styles.row}>
            <Text style={styles.label}>Late Fee:</Text>
            <Text style={styles.value}>{fmt(data.lateFee)} (assessed after grace period)</Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>5. Security Deposit</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Security Deposit:</Text>
          <Text style={styles.value}>{fmt(data.depositAmount)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Total Due at Signing:</Text>
          <Text style={styles.value}>{fmt(data.monthlyRent + data.depositAmount)} (first month + deposit)</Text>
        </View>

        <Text style={styles.footer}>
          Residential Lease Agreement — {data.propertyName} Unit {data.unitNumber} — Generated by Strukture
        </Text>
        <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
      </Page>

      {/* PAGE 2 */}
      <Page size="LETTER" style={styles.page}>
        {hasPets ? (
          <>
            <Text style={styles.sectionTitle}>6. Pet Policy</Text>
            {data.petDeposit && (
              <View style={styles.row}>
                <Text style={styles.label}>Pet Deposit:</Text>
                <Text style={styles.value}>{fmt(data.petDeposit)} (non-refundable)</Text>
              </View>
            )}
            {data.petRent && (
              <View style={styles.row}>
                <Text style={styles.label}>Monthly Pet Rent:</Text>
                <Text style={styles.value}>{fmt(data.petRent)}</Text>
              </View>
            )}
          </>
        ) : (
          <>
            <Text style={styles.sectionTitle}>6. Pet Policy</Text>
            <Text style={styles.paragraph}>
              No pets are permitted on the Premises without the prior written consent of Landlord.
            </Text>
          </>
        )}

        <Text style={styles.sectionTitle}>7. Landlord Obligations (NMSA § 47-8-20)</Text>
        <Text style={styles.paragraph}>
          Landlord shall comply with building codes, maintain premises in habitable condition, keep common areas
          clean and safe, maintain all systems in working order, and supply running water and heat.
        </Text>

        <Text style={styles.sectionTitle}>8. Tenant Obligations (NMSA § 47-8-22)</Text>
        <Text style={styles.paragraph}>
          Tenant shall comply with building codes, keep the unit clean and safe, dispose of waste properly,
          use facilities reasonably, not damage the premises, and not disturb neighbors.
        </Text>

        <Text style={styles.sectionTitle}>9. Right of Entry (NMSA § 47-8-24)</Text>
        <Text style={styles.paragraph}>
          Landlord may enter upon 24 hours written notice for inspections, repairs, or showings. Emergency entry permitted.
        </Text>

        <Text style={styles.sectionTitle}>10. Termination (NMSA § 47-8-37)</Text>
        <Text style={styles.paragraph}>
          Either party may terminate with 30 days written notice. Landlord may terminate for material noncompliance
          per NMSA § 47-8-33. Tenant may terminate per NMSA § 47-8-27.
        </Text>

        <Text style={styles.sectionTitle}>11. Governing Law</Text>
        <Text style={styles.paragraph}>
          This Lease is governed by the New Mexico Uniform Owner-Resident Relations Act (NMSA 1978, §§ 47-8-1 to 47-8-51).
        </Text>

        {data.additionalTerms && (
          <>
            <Text style={styles.sectionTitle}>12. Additional Terms</Text>
            <Text style={styles.paragraph}>{data.additionalTerms}</Text>
          </>
        )}

        <Text style={styles.footer}>
          Residential Lease Agreement — {data.propertyName} Unit {data.unitNumber} — Generated by Strukture
        </Text>
        <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
      </Page>

      {/* SIGNATURE PAGE */}
      <Page size="LETTER" style={styles.page}>
        <View style={styles.divider} />

        <Text style={{ ...styles.sectionTitle, textAlign: 'center' }}>SIGNATURES</Text>
        <Text style={{ ...styles.paragraph, textAlign: 'center', fontSize: 9, color: '#555' }}>
          By signing below, each party acknowledges that they have read, understand, and agree to all terms
          and conditions set forth in this Lease Agreement.
        </Text>

        <View style={styles.signatureSection}>
          <View style={styles.signatureBlock}>
            <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 10, marginBottom: 4 }}>LANDLORD</Text>
            {data.landlordSignature ? (
              <View>
                <Image src={data.landlordSignature} style={styles.signatureImage} />
                <View style={{ borderBottomWidth: 1, borderBottomColor: '#000' }} />
              </View>
            ) : (
              <View style={styles.signatureLine} />
            )}
            <Text style={styles.signatureLabel}>Signature: {data.landlordName}</Text>
            {data.landlordSignedAt ? (
              <Text style={styles.signatureDate}>
                Signed electronically on {fmtDate(data.landlordSignedAt)}
              </Text>
            ) : (
              <Text style={styles.signatureDate}>Date: ________________________</Text>
            )}
          </View>

          <View style={styles.signatureBlock}>
            <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 10, marginBottom: 4 }}>TENANT</Text>
            {data.tenantSignature ? (
              <View>
                <Image src={data.tenantSignature} style={styles.signatureImage} />
                <View style={{ borderBottomWidth: 1, borderBottomColor: '#000' }} />
              </View>
            ) : (
              <View style={styles.signatureLine} />
            )}
            <Text style={styles.signatureLabel}>
              Signature: {data.tenantName || '________________________'}
            </Text>
            {data.tenantSignedAt ? (
              <Text style={styles.signatureDate}>
                Signed electronically on {fmtDate(data.tenantSignedAt)}
              </Text>
            ) : (
              <Text style={styles.signatureDate}>Date: ________________________</Text>
            )}
          </View>
        </View>

        <View style={{ marginTop: 16 }}>
          <Text style={{ fontSize: 8, color: '#666', textAlign: 'center' }}>
            Electronic signatures on this document are legally binding under the Electronic Signatures in Global
            and National Commerce Act (ESIGN Act, 15 U.S.C. §§ 7001-7006) and the New Mexico Uniform Electronic
            Transactions Act (NMSA 1978, §§ 14-16-1 to 14-16-21).
          </Text>
        </View>

        <Text style={styles.footer}>
          Residential Lease Agreement — {data.propertyName} Unit {data.unitNumber} — Generated by Strukture
        </Text>
        <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
      </Page>
    </Document>
  );
}

export function LeaseDocument({ data }: { data: LeaseDocumentData }) {
  if (data.templateContent) {
    return <TemplateLeaseDocument data={data} />;
  }
  return <LegacyLeaseDocument data={data} />;
}
