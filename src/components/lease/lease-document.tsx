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

export function LeaseDocument({ data }: { data: LeaseDocumentData }) {
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

        {/* SECTION 1 - PARTIES */}
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

        {/* SECTION 2 - PREMISES */}
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

        {/* SECTION 3 - TERM */}
        <Text style={styles.sectionTitle}>3. Lease Term</Text>
        <Text style={styles.paragraph}>
          The term of this Lease shall begin on <Text style={styles.bold}>{fmtDate(data.startDate)}</Text>{' '}
          and shall end on <Text style={styles.bold}>{fmtDate(data.endDate)}</Text>, unless sooner terminated
          in accordance with the terms of this Lease or applicable law. Upon expiration, this Lease shall convert
          to a month-to-month tenancy unless either party provides written notice of termination at least thirty
          (30) days prior to the end of any rental period, as required by NMSA 1978 § 47-8-37.
        </Text>

        {/* SECTION 4 - RENT */}
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
        <Text style={styles.paragraph}>
          Rent shall be payable through the Strukture tenant portal or by such other method as agreed upon in
          writing by both parties. Landlord shall not charge a late fee unless rent remains unpaid after the grace
          period specified above, in accordance with NMSA 1978 § 47-8-15(D).
        </Text>

        {/* SECTION 5 - SECURITY DEPOSIT */}
        <Text style={styles.sectionTitle}>5. Security Deposit</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Security Deposit:</Text>
          <Text style={styles.value}>{fmt(data.depositAmount)}</Text>
        </View>
        <Text style={styles.paragraph}>
          Pursuant to NMSA 1978 § 47-8-18, the security deposit shall not exceed one (1) month&apos;s rent for leases
          of less than one year. Landlord shall deposit the security deposit in a federally insured interest-bearing
          account in a bank or savings institution in New Mexico. The deposit shall be returned to Tenant within
          thirty (30) days of lease termination, less any lawful deductions for: (a) unpaid rent; (b) damages
          beyond normal wear and tear; (c) other charges agreed upon in this Lease. Landlord shall provide an
          itemized statement of any deductions.
        </Text>

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
        {/* SECTION 6 - PET POLICY */}
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
            <Text style={styles.paragraph}>
              Tenant must obtain prior written approval from Landlord before keeping any pet on the Premises.
              Tenant shall be liable for all damages caused by their pet(s) and shall maintain renter&apos;s
              insurance covering pet-related incidents. Service animals and emotional support animals are
              exempt from pet deposits and pet rent as required by federal and state fair housing laws.
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.sectionTitle}>6. Pet Policy</Text>
            <Text style={styles.paragraph}>
              No pets are permitted on the Premises without the prior written consent of Landlord.
              Service animals and emotional support animals are exempt from this restriction as required
              by federal and state fair housing laws.
            </Text>
          </>
        )}

        {/* SECTION 7 - OBLIGATIONS */}
        <Text style={styles.sectionTitle}>7. Landlord Obligations</Text>
        <Text style={styles.paragraph}>
          Pursuant to NMSA 1978 § 47-8-20, Landlord shall:
        </Text>
        <Text style={styles.indent}>
          (a) Comply with all applicable building and housing codes materially affecting health and safety;
        </Text>
        <Text style={styles.indent}>
          (b) Make all repairs and do whatever is necessary to put and keep the premises in a fit and habitable condition;
        </Text>
        <Text style={styles.indent}>
          (c) Keep all common areas of the premises in a clean and safe condition;
        </Text>
        <Text style={styles.indent}>
          (d) Maintain in good and safe working order all electrical, plumbing, sanitary, heating, ventilating,
          air-conditioning and other facilities and appliances supplied by the Landlord;
        </Text>
        <Text style={styles.indent}>
          (e) Provide and maintain appropriate receptacles and conveniences for the removal of garbage and other waste;
        </Text>
        <Text style={styles.indent}>
          (f) Supply running water and reasonable amounts of hot water at all times and reasonable heat.
        </Text>

        <Text style={styles.sectionTitle}>8. Tenant Obligations</Text>
        <Text style={styles.paragraph}>
          Pursuant to NMSA 1978 § 47-8-22, Tenant shall:
        </Text>
        <Text style={styles.indent}>
          (a) Comply with all applicable building and housing codes materially affecting health and safety;
        </Text>
        <Text style={styles.indent}>
          (b) Keep the unit safe and sanitary;
        </Text>
        <Text style={styles.indent}>
          (c) Dispose of all waste in a clean and safe manner;
        </Text>
        <Text style={styles.indent}>
          (d) Keep all plumbing fixtures as clean as their condition permits;
        </Text>
        <Text style={styles.indent}>
          (e) Use all electrical, plumbing, sanitary, heating, ventilating, air-conditioning and other facilities
          and appliances in a reasonable manner;
        </Text>
        <Text style={styles.indent}>
          (f) Not deliberately or negligently destroy, deface, damage, impair or remove any part of the premises;
        </Text>
        <Text style={styles.indent}>
          (g) Conduct themselves in a manner that will not disturb the neighbor&apos;s peaceful enjoyment of the premises.
        </Text>

        {/* SECTION 9 - ENTRY */}
        <Text style={styles.sectionTitle}>9. Right of Entry</Text>
        <Text style={styles.paragraph}>
          Pursuant to NMSA 1978 § 47-8-24, Landlord may enter the Premises upon twenty-four (24) hours written
          notice for the following purposes: inspection, repairs, showing the unit to prospective tenants or
          buyers, or in case of emergency. Landlord shall not abuse the right of entry or use it to harass Tenant.
        </Text>

        {/* SECTION 10 - MAINTENANCE */}
        <Text style={styles.sectionTitle}>10. Maintenance and Repairs</Text>
        <Text style={styles.paragraph}>
          Tenant shall promptly notify Landlord of any conditions requiring repair or maintenance by submitting
          a request through the Strukture tenant portal. Landlord shall make repairs within a reasonable time
          after receiving notice. In case of emergency affecting health or safety, Landlord shall respond within
          twenty-four (24) hours.
        </Text>

        {/* SECTION 11 - SUBLETTING */}
        <Text style={styles.sectionTitle}>11. Assignment and Subletting</Text>
        <Text style={styles.paragraph}>
          Tenant shall not assign this Lease or sublet the Premises or any part thereof without the prior written
          consent of Landlord. Landlord shall not unreasonably withhold consent.
        </Text>

        <Text style={styles.footer}>
          Residential Lease Agreement — {data.propertyName} Unit {data.unitNumber} — Generated by Strukture
        </Text>
        <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
      </Page>

      {/* PAGE 3 - TERMINATION, ADDITIONAL TERMS, SIGNATURES */}
      <Page size="LETTER" style={styles.page}>
        {/* SECTION 12 - TERMINATION */}
        <Text style={styles.sectionTitle}>12. Termination</Text>
        <Text style={styles.paragraph}>
          Either party may terminate this Lease at the end of the lease term or any renewal period by providing
          written notice at least thirty (30) days prior to the desired termination date, as required by
          NMSA 1978 § 47-8-37. Landlord may terminate for material noncompliance as provided in NMSA 1978 § 47-8-33.
          Tenant may terminate for material noncompliance as provided in NMSA 1978 § 47-8-27.
        </Text>
        <Text style={styles.paragraph}>
          In cases of domestic violence, sexual assault, or stalking, Tenant may terminate this Lease with
          written notice as provided by NMSA 1978 § 47-8-33(J).
        </Text>

        {/* SECTION 13 - GOVERNING LAW */}
        <Text style={styles.sectionTitle}>13. Governing Law</Text>
        <Text style={styles.paragraph}>
          This Lease shall be governed by and construed in accordance with the laws of the State of New Mexico,
          specifically the Uniform Owner-Resident Relations Act (NMSA 1978, §§ 47-8-1 to 47-8-51). Any provision
          of this Lease that conflicts with applicable law shall be void and unenforceable, but all other
          provisions shall remain in full force and effect.
        </Text>

        {/* SECTION 14 - DISCLOSURES */}
        <Text style={styles.sectionTitle}>14. Required Disclosures</Text>
        <Text style={styles.paragraph}>
          Landlord hereby discloses the following as required by New Mexico and federal law:
        </Text>
        <Text style={styles.indent}>
          (a) Lead-Based Paint: If the Premises were built before 1978, Landlord has provided Tenant with
          the EPA pamphlet &quot;Protect Your Family From Lead in Your Home&quot; and any known information
          concerning lead-based paint hazards.
        </Text>
        <Text style={styles.indent}>
          (b) Move-in Condition: Landlord and Tenant shall conduct a joint move-in inspection and document
          the condition of the Premises within five (5) days of move-in.
        </Text>

        {/* ADDITIONAL TERMS */}
        {data.additionalTerms && (
          <>
            <Text style={styles.sectionTitle}>15. Additional Terms and Conditions</Text>
            <Text style={styles.paragraph}>{data.additionalTerms}</Text>
          </>
        )}

        {/* ENTIRE AGREEMENT */}
        <Text style={styles.sectionTitle}>
          {data.additionalTerms ? '16' : '15'}. Entire Agreement
        </Text>
        <Text style={styles.paragraph}>
          This Lease constitutes the entire agreement between the parties and supersedes all prior negotiations,
          representations, or agreements. This Lease may not be modified except by written instrument signed by
          both parties. Both parties acknowledge that they have read, understand, and agree to be bound by all
          terms and conditions of this Lease.
        </Text>

        <View style={styles.divider} />

        {/* SIGNATURES */}
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
