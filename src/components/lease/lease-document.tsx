import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { format } from 'date-fns';

const PRIMARY_COLOR = '#1a365d';
const ACCENT_COLOR = '#2b6cb0';
const LIGHT_BG = '#f7fafc';
const BORDER_COLOR = '#e2e8f0';

const styles = StyleSheet.create({
  page: {
    padding: 50,
    paddingBottom: 70,
    fontSize: 10,
    fontFamily: 'Helvetica',
    lineHeight: 1.5,
  },
  // Branded header
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 2,
    borderBottomColor: PRIMARY_COLOR,
    paddingBottom: 12,
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logo: {
    height: 48,
    width: 120,
    objectFit: 'contain',
  },
  headerTextBlock: {},
  headerPropertyName: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: PRIMARY_COLOR,
  },
  headerAddress: {
    fontSize: 8,
    color: '#718096',
    marginTop: 2,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  headerDocTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: PRIMARY_COLOR,
    textTransform: 'uppercase',
  },
  headerDocSubtitle: {
    fontSize: 8,
    color: '#718096',
    marginTop: 2,
  },
  // Title (no-logo fallback)
  titleCenter: {
    textAlign: 'center',
    marginBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: PRIMARY_COLOR,
    paddingBottom: 12,
  },
  titleText: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: PRIMARY_COLOR,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 11,
    color: '#4a5568',
    marginBottom: 2,
  },
  jurisdiction: {
    fontSize: 8,
    color: '#718096',
    marginTop: 4,
  },
  // Section styling
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: PRIMARY_COLOR,
    marginTop: 14,
    marginBottom: 6,
    textTransform: 'uppercase',
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
    paddingBottom: 3,
  },
  paragraph: {
    marginBottom: 6,
    textAlign: 'justify',
    color: '#2d3748',
  },
  bold: {
    fontFamily: 'Helvetica-Bold',
  },
  // Key-value rows
  row: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  label: {
    width: 160,
    color: '#718096',
    fontSize: 9,
  },
  value: {
    flex: 1,
    fontFamily: 'Helvetica-Bold',
    color: '#2d3748',
  },
  // Info box
  infoBox: {
    backgroundColor: LIGHT_BG,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 4,
    padding: 12,
    marginBottom: 10,
  },
  infoBoxRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  infoBoxLabel: {
    width: 130,
    fontSize: 9,
    color: '#718096',
  },
  infoBoxValue: {
    flex: 1,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#2d3748',
  },
  // Divider
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
    marginTop: 8,
    marginBottom: 8,
  },
  // Signature section
  signatureSection: {
    marginTop: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signatureBlock: {
    width: '45%',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 4,
    padding: 12,
  },
  signatureBlockTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    color: PRIMARY_COLOR,
    textTransform: 'uppercase',
    marginBottom: 6,
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
    color: '#4a5568',
  },
  signatureDate: {
    fontSize: 8,
    color: '#718096',
    marginTop: 2,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 50,
    right: 50,
    borderTopWidth: 1,
    borderTopColor: BORDER_COLOR,
    paddingTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 7,
    color: '#a0aec0',
  },
  footerPageNumber: {
    fontSize: 7,
    color: '#a0aec0',
  },
  // Template line
  templateLine: {
    marginBottom: 2,
    color: '#2d3748',
  },
  indent: {
    paddingLeft: 20,
    marginBottom: 4,
  },
});

export interface CoTenantData {
  name: string;
  email: string;
  signature?: string;
  signedAt?: string;
  signedIp?: string;
  relationship?: string;
}

export interface MinorOccupantData {
  name: string;
  dateOfBirth?: string;
  relationship?: string;
}

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
  tenantSignedIp?: string;
  landlordSignature?: string;
  landlordSignedAt?: string;
  landlordSignedIp?: string;

  // Template content (if template-based lease)
  templateContent?: string;

  // Property logo (optional base64 data URI)
  logoUrl?: string;

  // Co-tenants and minor occupants
  coTenants?: CoTenantData[];
  minorOccupants?: MinorOccupantData[];

  // Document generation metadata
  generatedAt?: string;
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
    '{{num_occupants}}': String(1 + (data.coTenants?.length || 0) + (data.minorOccupants?.length || 0)),
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

// Shared branded header for the first page
function PageHeader({ data, showDocTitle }: { data: LeaseDocumentData; showDocTitle?: boolean }) {
  if (data.logoUrl) {
    return (
      <View style={styles.headerBar}>
        <View style={styles.headerLeft}>
          <Image src={data.logoUrl} style={styles.logo} />
          <View style={styles.headerTextBlock}>
            <Text style={styles.headerPropertyName}>{data.propertyName}</Text>
            <Text style={styles.headerAddress}>{data.propertyAddress}</Text>
          </View>
        </View>
        {showDocTitle && (
          <View style={styles.headerRight}>
            <Text style={styles.headerDocTitle}>Lease Agreement</Text>
            <Text style={styles.headerDocSubtitle}>
              Unit {data.unitNumber}
            </Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.titleCenter}>
      <Text style={styles.titleText}>{data.propertyName}</Text>
      <Text style={styles.subtitle}>RESIDENTIAL LEASE AGREEMENT</Text>
      <Text style={styles.jurisdiction}>
        {data.propertyAddress} — Unit {data.unitNumber}
      </Text>
    </View>
  );
}

// Shared footer
function PageFooter({ data }: { data: LeaseDocumentData }) {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>
        {data.propertyName} — Unit {data.unitNumber} — Lease Agreement
      </Text>
      <Text
        style={styles.footerPageNumber}
        render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
      />
    </View>
  );
}

// Individual signature block helper
function SignatureBlockView({
  title,
  name,
  signature,
  signedAt,
  signedIp,
}: {
  title: string;
  name: string;
  signature?: string;
  signedAt?: string;
  signedIp?: string;
}) {
  return (
    <View style={styles.signatureBlock}>
      <Text style={styles.signatureBlockTitle}>{title}</Text>
      {signature ? (
        <View>
          <Image src={signature} style={styles.signatureImage} />
          <View style={{ borderBottomWidth: 1, borderBottomColor: '#000' }} />
        </View>
      ) : (
        <View style={styles.signatureLine} />
      )}
      <Text style={styles.signatureLabel}>{name || '________________________'}</Text>
      {signedAt ? (
        <View>
          <Text style={styles.signatureDate}>
            Signed electronically on {format(new Date(signedAt), 'MMMM d, yyyy \'at\' h:mm:ss a')}
          </Text>
          {signedIp && (
            <Text style={{ fontSize: 7, color: '#a0aec0' }}>
              IP: {signedIp}
            </Text>
          )}
        </View>
      ) : (
        <Text style={styles.signatureDate}>Date: ________________________</Text>
      )}
    </View>
  );
}

// Shared signature page(s)
function SignaturePage({ data }: { data: LeaseDocumentData }) {
  const coTenants = data.coTenants || [];

  return (
    <Page size="LETTER" style={styles.page} wrap>
      <View style={{ marginBottom: 16 }}>
        <Text style={{ ...styles.sectionTitle, textAlign: 'center', borderBottomWidth: 0 }}>
          EXECUTION OF AGREEMENT
        </Text>
        <Text style={{ ...styles.paragraph, textAlign: 'center', fontSize: 9, color: '#718096' }}>
          By signing below, each party acknowledges that they have read, understand, and agree to all terms
          and conditions set forth in this Lease Agreement.
        </Text>
      </View>

      {/* Lease summary box */}
      <View style={styles.infoBox}>
        <View style={styles.infoBoxRow}>
          <Text style={styles.infoBoxLabel}>Property:</Text>
          <Text style={styles.infoBoxValue}>{data.propertyName} — Unit {data.unitNumber}</Text>
        </View>
        <View style={styles.infoBoxRow}>
          <Text style={styles.infoBoxLabel}>Address:</Text>
          <Text style={styles.infoBoxValue}>{data.propertyAddress}</Text>
        </View>
        <View style={styles.infoBoxRow}>
          <Text style={styles.infoBoxLabel}>Lease Period:</Text>
          <Text style={styles.infoBoxValue}>{fmtDate(data.startDate)} — {fmtDate(data.endDate)}</Text>
        </View>
        <View style={styles.infoBoxRow}>
          <Text style={styles.infoBoxLabel}>Monthly Rent:</Text>
          <Text style={styles.infoBoxValue}>{fmt(data.monthlyRent)}</Text>
        </View>
      </View>

      {/* Primary signatures: Landlord + Tenant */}
      <View style={styles.signatureSection}>
        <SignatureBlockView
          title="Landlord"
          name={data.landlordName}
          signature={data.landlordSignature}
          signedAt={data.landlordSignedAt}
          signedIp={data.landlordSignedIp}
        />
        <SignatureBlockView
          title="Primary Tenant"
          name={data.tenantName}
          signature={data.tenantSignature}
          signedAt={data.tenantSignedAt}
          signedIp={data.tenantSignedIp}
        />
      </View>

      {/* Co-Tenant signatures */}
      {coTenants.length > 0 && (
        <View style={{ marginTop: 16 }}>
          <Text style={{ ...styles.sectionTitle, fontSize: 10 }}>
            CO-TENANT SIGNATURES
          </Text>
          <Text style={{ fontSize: 8, color: '#718096', marginBottom: 8 }}>
            Per NMSA {'\u00A7'} 47-8-20, all adult tenants must sign the lease agreement.
          </Text>
          {/* Render co-tenant signatures in pairs */}
          {Array.from({ length: Math.ceil(coTenants.length / 2) }).map((_, rowIndex) => (
            <View key={rowIndex} style={{ ...styles.signatureSection, marginTop: rowIndex > 0 ? 12 : 0 }}>
              <SignatureBlockView
                title={`Co-Tenant${coTenants[rowIndex * 2].relationship ? ` (${coTenants[rowIndex * 2].relationship})` : ''}`}
                name={coTenants[rowIndex * 2].name}
                signature={coTenants[rowIndex * 2].signature}
                signedAt={coTenants[rowIndex * 2].signedAt}
                signedIp={coTenants[rowIndex * 2].signedIp}
              />
              {coTenants[rowIndex * 2 + 1] && (
                <SignatureBlockView
                  title={`Co-Tenant${coTenants[rowIndex * 2 + 1].relationship ? ` (${coTenants[rowIndex * 2 + 1].relationship})` : ''}`}
                  name={coTenants[rowIndex * 2 + 1].name}
                  signature={coTenants[rowIndex * 2 + 1].signature}
                  signedAt={coTenants[rowIndex * 2 + 1].signedAt}
                  signedIp={coTenants[rowIndex * 2 + 1].signedIp}
                />
              )}
            </View>
          ))}
        </View>
      )}

      {/* ESIGN/UETA Notice */}
      <View style={{ marginTop: 20, backgroundColor: LIGHT_BG, padding: 10, borderRadius: 4 }}>
        <Text style={{ fontSize: 7, color: '#718096', textAlign: 'center', lineHeight: 1.6 }}>
          Electronic signatures on this document are legally binding under the Electronic Signatures in Global
          and National Commerce Act (ESIGN Act, 15 U.S.C. {'\u00A7\u00A7'} 7001-7006) and the New Mexico Uniform Electronic
          Transactions Act (NMSA 1978, {'\u00A7\u00A7'} 14-16-1 to 14-16-21). A complete audit trail including IP addresses
          and timestamps is securely stored for each signatory.
        </Text>
      </View>

      {/* Document generation timestamp */}
      {data.generatedAt && (
        <View style={{ marginTop: 8 }}>
          <Text style={{ fontSize: 7, color: '#a0aec0', textAlign: 'center' }}>
            Document generated on {format(new Date(data.generatedAt), 'MMMM d, yyyy \'at\' h:mm:ss a zzz')}
          </Text>
        </View>
      )}

      <PageFooter data={data} />
    </Page>
  );
}

// Template-based lease document
function TemplateLeaseDocument({ data }: { data: LeaseDocumentData }) {
  const populated = populateTemplateForPdf(data.templateContent!, data);
  const lines = populated.split('\n');
  const LINES_PER_PAGE = 42; // Slightly less to accommodate header on first page

  const contentPages = splitIntoPages(lines, LINES_PER_PAGE);

  return (
    <Document>
      {contentPages.map((pageLines, pageIndex) => (
        <Page key={pageIndex} size="LETTER" style={styles.page}>
          {pageIndex === 0 && <PageHeader data={data} showDocTitle />}

          {pageLines.map((line, lineIndex) => {
            const isHeader = /^\d+\.\s+[A-Z]/.test(line) || (line === line.toUpperCase() && line.trim().length > 3 && /[A-Z]/.test(line));

            return (
              <Text
                key={lineIndex}
                style={
                  isHeader
                    ? { ...styles.sectionTitle, marginTop: lineIndex === 0 && pageIndex > 0 ? 0 : 10 }
                    : line.trim() === ''
                    ? { marginBottom: 6 }
                    : styles.templateLine
                }
              >
                {line}
              </Text>
            );
          })}

          <PageFooter data={data} />
        </Page>
      ))}

      <SignaturePage data={data} />
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
        <PageHeader data={data} />

        <Text style={{ fontSize: 9, color: '#718096', textAlign: 'center', marginBottom: 12 }}>
          Governed by the New Mexico Uniform Owner-Resident Relations Act (NMSA 1978, {'\u00A7\u00A7'} 47-8-1 to 47-8-51)
        </Text>

        <Text style={styles.paragraph}>
          This Residential Lease Agreement ({'\u201C'}Lease{'\u201D'}) is made and entered into as of{' '}
          <Text style={styles.bold}>{fmtDate(data.startDate)}</Text>, by and between the following parties:
        </Text>

        <Text style={styles.sectionTitle}>1. Parties</Text>

        <View style={{ flexDirection: 'row', gap: 16, marginBottom: 8 }}>
          <View style={{ ...styles.infoBox, flex: 1 }}>
            <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 9, color: PRIMARY_COLOR, marginBottom: 4 }}>
              LANDLORD (Owner)
            </Text>
            <View style={styles.infoBoxRow}>
              <Text style={styles.infoBoxLabel}>Name:</Text>
              <Text style={styles.infoBoxValue}>{data.landlordName}</Text>
            </View>
            <View style={styles.infoBoxRow}>
              <Text style={styles.infoBoxLabel}>Email:</Text>
              <Text style={styles.infoBoxValue}>{data.landlordEmail}</Text>
            </View>
            {data.landlordPhone && (
              <View style={styles.infoBoxRow}>
                <Text style={styles.infoBoxLabel}>Phone:</Text>
                <Text style={styles.infoBoxValue}>{data.landlordPhone}</Text>
              </View>
            )}
          </View>

          <View style={{ ...styles.infoBox, flex: 1 }}>
            <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 9, color: PRIMARY_COLOR, marginBottom: 4 }}>
              TENANT (Resident)
            </Text>
            <View style={styles.infoBoxRow}>
              <Text style={styles.infoBoxLabel}>Name:</Text>
              <Text style={styles.infoBoxValue}>{data.tenantName || '________'}</Text>
            </View>
            <View style={styles.infoBoxRow}>
              <Text style={styles.infoBoxLabel}>Email:</Text>
              <Text style={styles.infoBoxValue}>{data.tenantEmail}</Text>
            </View>
            {data.tenantPhone && (
              <View style={styles.infoBoxRow}>
                <Text style={styles.infoBoxLabel}>Phone:</Text>
                <Text style={styles.infoBoxValue}>{data.tenantPhone}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Co-Tenants */}
        {data.coTenants && data.coTenants.length > 0 && (
          <>
            <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 9, color: PRIMARY_COLOR, marginTop: 8, marginBottom: 4 }}>
              ADDITIONAL ADULT TENANTS (CO-TENANTS)
            </Text>
            {data.coTenants.map((ct, i) => (
              <View key={i} style={{ ...styles.infoBox, marginBottom: 4, padding: 8 }}>
                <View style={styles.infoBoxRow}>
                  <Text style={styles.infoBoxLabel}>Name:</Text>
                  <Text style={styles.infoBoxValue}>{ct.name}</Text>
                </View>
                <View style={styles.infoBoxRow}>
                  <Text style={styles.infoBoxLabel}>Email:</Text>
                  <Text style={styles.infoBoxValue}>{ct.email}</Text>
                </View>
                {ct.relationship && (
                  <View style={styles.infoBoxRow}>
                    <Text style={styles.infoBoxLabel}>Relationship:</Text>
                    <Text style={styles.infoBoxValue}>{ct.relationship}</Text>
                  </View>
                )}
              </View>
            ))}
          </>
        )}

        {/* Minor Occupants */}
        {data.minorOccupants && data.minorOccupants.length > 0 && (
          <>
            <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 9, color: PRIMARY_COLOR, marginTop: 8, marginBottom: 4 }}>
              MINOR OCCUPANTS (UNDER 18)
            </Text>
            {data.minorOccupants.map((minor, i) => (
              <View key={i} style={{ ...styles.infoBox, marginBottom: 4, padding: 8 }}>
                <View style={styles.infoBoxRow}>
                  <Text style={styles.infoBoxLabel}>Name:</Text>
                  <Text style={styles.infoBoxValue}>{minor.name}</Text>
                </View>
                {minor.dateOfBirth && (
                  <View style={styles.infoBoxRow}>
                    <Text style={styles.infoBoxLabel}>Date of Birth:</Text>
                    <Text style={styles.infoBoxValue}>{format(new Date(minor.dateOfBirth), 'MM/dd/yyyy')}</Text>
                  </View>
                )}
                {minor.relationship && (
                  <View style={styles.infoBoxRow}>
                    <Text style={styles.infoBoxLabel}>Relationship:</Text>
                    <Text style={styles.infoBoxValue}>{minor.relationship}</Text>
                  </View>
                )}
              </View>
            ))}
          </>
        )}

        <Text style={styles.sectionTitle}>2. Premises</Text>
        <Text style={styles.paragraph}>
          Landlord hereby leases to Tenant, and Tenant hereby rents from Landlord, the following described premises
          ({'\u201C'}Premises{'\u201D'}):
        </Text>
        <View style={styles.infoBox}>
          <View style={styles.infoBoxRow}>
            <Text style={styles.infoBoxLabel}>Property:</Text>
            <Text style={styles.infoBoxValue}>{data.propertyName}</Text>
          </View>
          <View style={styles.infoBoxRow}>
            <Text style={styles.infoBoxLabel}>Address:</Text>
            <Text style={styles.infoBoxValue}>{data.propertyAddress}</Text>
          </View>
          <View style={styles.infoBoxRow}>
            <Text style={styles.infoBoxLabel}>Unit:</Text>
            <Text style={styles.infoBoxValue}>{data.unitNumber}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>3. Lease Term</Text>
        <Text style={styles.paragraph}>
          The term of this Lease shall begin on <Text style={styles.bold}>{fmtDate(data.startDate)}</Text>{' '}
          and shall end on <Text style={styles.bold}>{fmtDate(data.endDate)}</Text>, unless sooner terminated
          in accordance with the terms of this Lease or applicable law.
        </Text>

        <Text style={styles.sectionTitle}>4. Rent &amp; Financial Terms</Text>
        <View style={styles.infoBox}>
          <View style={styles.infoBoxRow}>
            <Text style={styles.infoBoxLabel}>Monthly Rent:</Text>
            <Text style={styles.infoBoxValue}>{fmt(data.monthlyRent)}</Text>
          </View>
          <View style={styles.infoBoxRow}>
            <Text style={styles.infoBoxLabel}>Due Date:</Text>
            <Text style={styles.infoBoxValue}>{ordinal(data.rentDueDay)} of each month</Text>
          </View>
          <View style={styles.infoBoxRow}>
            <Text style={styles.infoBoxLabel}>Grace Period:</Text>
            <Text style={styles.infoBoxValue}>{data.gracePeriodDays} days</Text>
          </View>
          {data.lateFee && (
            <View style={styles.infoBoxRow}>
              <Text style={styles.infoBoxLabel}>Late Fee:</Text>
              <Text style={styles.infoBoxValue}>{fmt(data.lateFee)}</Text>
            </View>
          )}
          <View style={{ ...styles.divider, marginTop: 4, marginBottom: 4 }} />
          <View style={styles.infoBoxRow}>
            <Text style={styles.infoBoxLabel}>Security Deposit:</Text>
            <Text style={styles.infoBoxValue}>{fmt(data.depositAmount)}</Text>
          </View>
          <View style={styles.infoBoxRow}>
            <Text style={{ ...styles.infoBoxLabel, fontFamily: 'Helvetica-Bold' }}>Total Due at Signing:</Text>
            <Text style={{ ...styles.infoBoxValue, color: PRIMARY_COLOR }}>{fmt(data.monthlyRent + data.depositAmount)}</Text>
          </View>
        </View>

        <PageFooter data={data} />
      </Page>

      {/* PAGE 2 */}
      <Page size="LETTER" style={styles.page}>
        {hasPets ? (
          <>
            <Text style={styles.sectionTitle}>5. Pet Policy</Text>
            <View style={styles.infoBox}>
              {data.petDeposit && (
                <View style={styles.infoBoxRow}>
                  <Text style={styles.infoBoxLabel}>Pet Deposit:</Text>
                  <Text style={styles.infoBoxValue}>{fmt(data.petDeposit)} (non-refundable)</Text>
                </View>
              )}
              {data.petRent && (
                <View style={styles.infoBoxRow}>
                  <Text style={styles.infoBoxLabel}>Monthly Pet Rent:</Text>
                  <Text style={styles.infoBoxValue}>{fmt(data.petRent)}</Text>
                </View>
              )}
            </View>
          </>
        ) : (
          <>
            <Text style={styles.sectionTitle}>5. Pet Policy</Text>
            <Text style={styles.paragraph}>
              No pets are permitted on the Premises without the prior written consent of Landlord.
            </Text>
          </>
        )}

        <Text style={styles.sectionTitle}>6. Landlord Obligations (NMSA {'\u00A7'} 47-8-20)</Text>
        <Text style={styles.paragraph}>
          Landlord shall comply with building codes, maintain premises in habitable condition, keep common areas
          clean and safe, maintain all systems in working order, and supply running water and heat.
        </Text>

        <Text style={styles.sectionTitle}>7. Tenant Obligations (NMSA {'\u00A7'} 47-8-22)</Text>
        <Text style={styles.paragraph}>
          Tenant shall comply with building codes, keep the unit clean and safe, dispose of waste properly,
          use facilities reasonably, not damage the premises, and not disturb neighbors.
        </Text>

        <Text style={styles.sectionTitle}>8. Right of Entry (NMSA {'\u00A7'} 47-8-24)</Text>
        <Text style={styles.paragraph}>
          Landlord may enter upon 24 hours written notice for inspections, repairs, or showings. Emergency entry permitted.
        </Text>

        <Text style={styles.sectionTitle}>9. Termination (NMSA {'\u00A7'} 47-8-37)</Text>
        <Text style={styles.paragraph}>
          Either party may terminate with 30 days written notice. Landlord may terminate for material noncompliance
          per NMSA {'\u00A7'} 47-8-33. Tenant may terminate per NMSA {'\u00A7'} 47-8-27.
        </Text>

        <Text style={styles.sectionTitle}>10. Governing Law</Text>
        <Text style={styles.paragraph}>
          This Lease is governed by the New Mexico Uniform Owner-Resident Relations Act (NMSA 1978, {'\u00A7\u00A7'} 47-8-1 to 47-8-51).
        </Text>

        {data.additionalTerms && (
          <>
            <Text style={styles.sectionTitle}>11. Additional Terms</Text>
            <Text style={styles.paragraph}>{data.additionalTerms}</Text>
          </>
        )}

        <PageFooter data={data} />
      </Page>

      {/* SIGNATURE PAGE */}
      <SignaturePage data={data} />
    </Document>
  );
}

export function LeaseDocument({ data }: { data: LeaseDocumentData }) {
  if (data.templateContent) {
    return <TemplateLeaseDocument data={data} />;
  }
  return <LegacyLeaseDocument data={data} />;
}
