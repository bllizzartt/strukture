import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import { format } from 'date-fns';

// Styles
const styles = StyleSheet.create({
  page: {
    padding: 50,
    fontSize: 10,
    fontFamily: 'Helvetica',
    lineHeight: 1.6,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 11,
    textAlign: 'center',
    color: '#666',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    marginTop: 16,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    paddingBottom: 4,
  },
  paragraph: {
    marginBottom: 8,
    textAlign: 'justify',
  },
  bold: {
    fontFamily: 'Helvetica-Bold',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  label: {
    width: 150,
    color: '#555',
  },
  value: {
    flex: 1,
    fontFamily: 'Helvetica-Bold',
  },
  signatureSection: {
    marginTop: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signatureBlock: {
    width: '45%',
  },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    marginTop: 40,
    marginBottom: 4,
  },
  signatureLabel: {
    fontSize: 9,
    color: '#555',
  },
  signatureImage: {
    height: 40,
    marginTop: 10,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 50,
    right: 50,
    textAlign: 'center',
    fontSize: 8,
    color: '#999',
  },
});

export interface LeaseDocumentData {
  // Parties
  landlordName: string;
  tenantName: string;
  tenantEmail: string;

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

  // Signatures (optional - filled after signing)
  tenantSignature?: string;
  tenantSignedAt?: string;
  landlordSignature?: string;
  landlordSignedAt?: string;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

function formatLeaseDate(date: string): string {
  return format(new Date(date), 'MMMM d, yyyy');
}

export function LeaseDocument({ data }: { data: LeaseDocumentData }) {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <Text style={styles.title}>RESIDENTIAL LEASE AGREEMENT</Text>
        <Text style={styles.subtitle}>Strukture Property Management</Text>

        {/* Parties */}
        <Text style={styles.sectionTitle}>1. PARTIES</Text>
        <Text style={styles.paragraph}>
          This Residential Lease Agreement (&quot;Agreement&quot;) is entered into between:
        </Text>
        <View style={styles.row}>
          <Text style={styles.label}>Landlord:</Text>
          <Text style={styles.value}>{data.landlordName}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Tenant:</Text>
          <Text style={styles.value}>{data.tenantName || '________________________'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Tenant Email:</Text>
          <Text style={styles.value}>{data.tenantEmail}</Text>
        </View>

        {/* Property */}
        <Text style={styles.sectionTitle}>2. PROPERTY</Text>
        <Text style={styles.paragraph}>
          Landlord agrees to lease to Tenant the following property:
        </Text>
        <View style={styles.row}>
          <Text style={styles.label}>Property:</Text>
          <Text style={styles.value}>{data.propertyName}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Address:</Text>
          <Text style={styles.value}>{data.propertyAddress}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Unit:</Text>
          <Text style={styles.value}>{data.unitNumber}</Text>
        </View>

        {/* Lease Term */}
        <Text style={styles.sectionTitle}>3. LEASE TERM</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Start Date:</Text>
          <Text style={styles.value}>{formatLeaseDate(data.startDate)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>End Date:</Text>
          <Text style={styles.value}>{formatLeaseDate(data.endDate)}</Text>
        </View>

        {/* Rent */}
        <Text style={styles.sectionTitle}>4. RENT</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Monthly Rent:</Text>
          <Text style={styles.value}>{formatCurrency(data.monthlyRent)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Due Day:</Text>
          <Text style={styles.value}>{data.rentDueDay}st of each month</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Grace Period:</Text>
          <Text style={styles.value}>{data.gracePeriodDays} days</Text>
        </View>
        {data.lateFee && (
          <View style={styles.row}>
            <Text style={styles.label}>Late Fee:</Text>
            <Text style={styles.value}>{formatCurrency(data.lateFee)} (after grace period)</Text>
          </View>
        )}

        {/* Security Deposit */}
        <Text style={styles.sectionTitle}>5. SECURITY DEPOSIT</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Deposit Amount:</Text>
          <Text style={styles.value}>{formatCurrency(data.depositAmount)}</Text>
        </View>
        <Text style={styles.paragraph}>
          The security deposit shall be held by Landlord and returned to Tenant within 30 days of
          lease termination, less any deductions for damages beyond normal wear and tear, unpaid
          rent, or other charges as permitted by law.
        </Text>

        {/* Pet Policy */}
        {(data.petDeposit || data.petRent) && (
          <>
            <Text style={styles.sectionTitle}>6. PET POLICY</Text>
            {data.petDeposit && (
              <View style={styles.row}>
                <Text style={styles.label}>Pet Deposit:</Text>
                <Text style={styles.value}>{formatCurrency(data.petDeposit)}</Text>
              </View>
            )}
            {data.petRent && (
              <View style={styles.row}>
                <Text style={styles.label}>Pet Rent:</Text>
                <Text style={styles.value}>{formatCurrency(data.petRent)}/month</Text>
              </View>
            )}
          </>
        )}

        {/* Standard Terms */}
        <Text style={styles.sectionTitle}>
          {data.petDeposit || data.petRent ? '7' : '6'}. GENERAL TERMS
        </Text>
        <Text style={styles.paragraph}>
          a) Tenant shall use the premises solely for residential purposes and shall not engage in
          any unlawful activities on the property.
        </Text>
        <Text style={styles.paragraph}>
          b) Tenant shall maintain the premises in a clean and sanitary condition and shall not make
          any alterations without the prior written consent of Landlord.
        </Text>
        <Text style={styles.paragraph}>
          c) Tenant shall not assign this lease or sublet the premises without the prior written
          consent of Landlord.
        </Text>
        <Text style={styles.paragraph}>
          d) Landlord shall maintain the structural components of the building, including plumbing,
          electrical, and HVAC systems, in good working order.
        </Text>
        <Text style={styles.paragraph}>
          e) Either party may terminate this lease with 30 days written notice prior to the end of
          the lease term or any renewal period.
        </Text>

        {/* Additional Terms */}
        {data.additionalTerms && (
          <>
            <Text style={styles.sectionTitle}>ADDITIONAL TERMS</Text>
            <Text style={styles.paragraph}>{data.additionalTerms}</Text>
          </>
        )}

        {/* Signatures */}
        <View style={styles.signatureSection}>
          <View style={styles.signatureBlock}>
            {data.landlordSignature ? (
              <>
                <Text style={{ fontSize: 9, color: '#555', marginTop: 10 }}>Signed electronically</Text>
                <View style={styles.signatureLine} />
              </>
            ) : (
              <View style={styles.signatureLine} />
            )}
            <Text style={styles.signatureLabel}>
              Landlord: {data.landlordName}
            </Text>
            {data.landlordSignedAt && (
              <Text style={styles.signatureLabel}>
                Date: {formatLeaseDate(data.landlordSignedAt)}
              </Text>
            )}
          </View>

          <View style={styles.signatureBlock}>
            {data.tenantSignature ? (
              <>
                <Text style={{ fontSize: 9, color: '#555', marginTop: 10 }}>Signed electronically</Text>
                <View style={styles.signatureLine} />
              </>
            ) : (
              <View style={styles.signatureLine} />
            )}
            <Text style={styles.signatureLabel}>
              Tenant: {data.tenantName || '________________________'}
            </Text>
            {data.tenantSignedAt && (
              <Text style={styles.signatureLabel}>
                Date: {formatLeaseDate(data.tenantSignedAt)}
              </Text>
            )}
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          This lease agreement was generated by Strukture Property Management.
          Electronic signatures are legally binding under the ESIGN Act and UETA.
        </Text>
      </Page>
    </Document>
  );
}
