'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Loader2,
  FileText,
  Plus,
  Pencil,
  Trash2,
  Eye,
  Copy,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// Available placeholders that auto-populate from lease/tenant/property data
const PLACEHOLDERS = [
  { key: '{{landlord_name}}', label: 'Landlord Full Name', category: 'Landlord' },
  { key: '{{landlord_email}}', label: 'Landlord Email', category: 'Landlord' },
  { key: '{{landlord_phone}}', label: 'Landlord Phone', category: 'Landlord' },
  { key: '{{tenant_name}}', label: 'Tenant Full Name', category: 'Tenant' },
  { key: '{{tenant_email}}', label: 'Tenant Email', category: 'Tenant' },
  { key: '{{tenant_phone}}', label: 'Tenant Phone', category: 'Tenant' },
  { key: '{{tenant_dob}}', label: 'Tenant Date of Birth', category: 'Tenant' },
  { key: '{{property_name}}', label: 'Property Name', category: 'Property' },
  { key: '{{property_address}}', label: 'Full Property Address', category: 'Property' },
  { key: '{{unit_number}}', label: 'Unit Number', category: 'Property' },
  { key: '{{num_bedrooms}}', label: 'Number of Bedrooms', category: 'Property' },
  { key: '{{num_bathrooms}}', label: 'Number of Bathrooms', category: 'Property' },
  { key: '{{lease_start_date}}', label: 'Lease Start Date', category: 'Lease Terms' },
  { key: '{{lease_end_date}}', label: 'Lease End Date', category: 'Lease Terms' },
  { key: '{{monthly_rent}}', label: 'Monthly Rent Amount', category: 'Lease Terms' },
  { key: '{{deposit_amount}}', label: 'Security Deposit Amount', category: 'Lease Terms' },
  { key: '{{rent_due_day}}', label: 'Rent Due Day of Month', category: 'Lease Terms' },
  { key: '{{grace_period_days}}', label: 'Grace Period (Days)', category: 'Lease Terms' },
  { key: '{{late_fee}}', label: 'Late Fee Amount', category: 'Lease Terms' },
  { key: '{{pet_deposit}}', label: 'Pet Deposit Amount', category: 'Lease Terms' },
  { key: '{{pet_rent}}', label: 'Monthly Pet Rent', category: 'Lease Terms' },
  { key: '{{today_date}}', label: "Today's Date", category: 'Other' },
  { key: '{{num_occupants}}', label: 'Number of Occupants', category: 'Other' },
];

const PLACEHOLDER_CATEGORIES = ['Landlord', 'Tenant', 'Property', 'Lease Terms', 'Other'];

const DEFAULT_TEMPLATE = `RESIDENTIAL LEASE AGREEMENT
State of New Mexico

This Residential Lease Agreement ("Lease") is entered into on {{today_date}}, by and between:

LANDLORD: {{landlord_name}}
Email: {{landlord_email}} | Phone: {{landlord_phone}}

TENANT: {{tenant_name}}
Email: {{tenant_email}} | Phone: {{tenant_phone}}
Date of Birth: {{tenant_dob}}

1. PREMISES
The Landlord hereby leases to the Tenant the property located at:
{{property_address}}, Unit {{unit_number}}
({{num_bedrooms}} bedroom(s), {{num_bathrooms}} bathroom(s))

2. LEASE TERM
This Lease shall commence on {{lease_start_date}} and shall terminate on {{lease_end_date}}, unless renewed or terminated earlier in accordance with this Lease and applicable New Mexico law.

3. RENT
The Tenant agrees to pay a monthly rent of {{monthly_rent}} due on the {{rent_due_day}} day of each month. A grace period of {{grace_period_days}} days is provided. Rent received after the grace period shall incur a late fee of {{late_fee}}.

4. SECURITY DEPOSIT
The Tenant shall pay a security deposit of {{deposit_amount}} prior to or upon move-in. The deposit shall be held and returned in accordance with the New Mexico Owner-Resident Relations Act (NMSA §47-8-18).

5. OCCUPANTS
The number of occupants permitted to reside in the premises is: {{num_occupants}}.

6. PET POLICY
Pet deposit: {{pet_deposit}}. Monthly pet rent: {{pet_rent}}. Pets must be approved in writing by the Landlord prior to move-in.

7. LANDLORD OBLIGATIONS
The Landlord shall comply with requirements of applicable building and housing codes affecting health and safety, make all repairs necessary to keep the premises in a fit and habitable condition, keep common areas clean and safe, maintain all electrical, plumbing, sanitary, heating, ventilating and air conditioning systems in good and safe working order, and provide running water and reasonable amounts of hot water at all times (NMSA §47-8-20).

8. TENANT OBLIGATIONS
The Tenant shall comply with all obligations imposed on residents by applicable building and housing codes, keep the premises clean and safe, dispose of all garbage and waste in a clean and safe manner, not deliberately or negligently destroy or damage any part of the premises, and conduct themselves in a manner that does not disturb the peaceful enjoyment of other residents (NMSA §47-8-22).

9. RIGHT OF ENTRY
The Landlord may enter the premises upon giving at least 24 hours' notice, except in cases of emergency (NMSA §47-8-24).

10. MAINTENANCE & REPAIRS
The Tenant shall promptly notify the Landlord of any needed repairs. Emergency maintenance requests will be addressed within 24 hours.

11. ASSIGNMENT & SUBLETTING
The Tenant shall not assign this Lease or sublet the premises without the prior written consent of the Landlord.

12. TERMINATION
Either party may terminate this Lease by providing at least 30 days' written notice prior to the end of any monthly period. The Landlord may terminate for material noncompliance in accordance with NMSA §47-8-33. The Tenant may terminate for material noncompliance in accordance with NMSA §47-8-27.

13. GOVERNING LAW
This Lease shall be governed by the New Mexico Uniform Owner-Resident Relations Act (NMSA §47-8-1 et seq.) and other applicable New Mexico laws.

14. REQUIRED DISCLOSURES
If the premises were built before 1978, the Landlord is required to provide a lead-based paint disclosure in accordance with federal law (42 U.S.C. §4852d).

15. ENTIRE AGREEMENT
This Lease constitutes the entire agreement between the parties. Any modifications must be in writing and signed by both parties.

ELECTRONIC SIGNATURE DISCLOSURE
By signing this Lease electronically, both parties acknowledge and agree that:
• This electronic signature is legally binding under the federal Electronic Signatures in Global and National Commerce Act (ESIGN Act, 15 U.S.C. §7001 et seq.) and the New Mexico Uniform Electronic Transactions Act (NMSA §14-16-1 et seq.).
• Each party consents to conduct this transaction electronically.
• Each party has received a copy of this Lease in electronic form.
• The electronic signatures below have the same legal effect as handwritten signatures.`;

interface LeaseTemplateItem {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count: { leases: number };
}

export default function LeaseTemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<LeaseTemplateItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Editor state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateContent, setTemplateContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Preview state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState('');

  // Placeholder panel
  const [showPlaceholders, setShowPlaceholders] = useState(false);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch('/api/landlord/lease-templates');
      const result = await res.json();
      if (result.success) {
        setTemplates(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const openNewTemplate = () => {
    setEditingId(null);
    setTemplateName('Standard Residential Lease');
    setTemplateDescription('New Mexico residential lease agreement');
    setTemplateContent(DEFAULT_TEMPLATE);
    setSaveError(null);
    setEditorOpen(true);
  };

  const openEditTemplate = async (id: string) => {
    try {
      const res = await fetch(`/api/landlord/lease-templates/${id}`);
      const result = await res.json();
      if (result.success) {
        setEditingId(id);
        setTemplateName(result.data.name);
        setTemplateDescription(result.data.description || '');
        setTemplateContent(result.data.content);
        setSaveError(null);
        setEditorOpen(true);
      }
    } catch {
      console.error('Failed to load template');
    }
  };

  const handleSave = async () => {
    if (!templateName || !templateContent) {
      setSaveError('Name and content are required');
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const url = editingId
        ? `/api/landlord/lease-templates/${editingId}`
        : '/api/landlord/lease-templates';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: templateName,
          description: templateDescription || null,
          content: templateContent,
        }),
      });

      const result = await res.json();
      if (result.success) {
        setEditorOpen(false);
        fetchTemplates();
      } else {
        setSaveError(result.error || 'Failed to save template');
      }
    } catch {
      setSaveError('Failed to save template. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteTemplate = async (id: string) => {
    try {
      const res = await fetch(`/api/landlord/lease-templates/${id}`, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        fetchTemplates();
      }
    } catch {
      console.error('Failed to delete template');
    }
  };

  const insertPlaceholder = (key: string) => {
    setTemplateContent((prev) => prev + key);
  };

  const openPreview = () => {
    // Replace placeholders with sample data for preview
    const sampleData: Record<string, string> = {
      '{{landlord_name}}': 'John Smith',
      '{{landlord_email}}': 'john@example.com',
      '{{landlord_phone}}': '(505) 555-0100',
      '{{tenant_name}}': 'Jane Doe',
      '{{tenant_email}}': 'jane@example.com',
      '{{tenant_phone}}': '(505) 555-0200',
      '{{tenant_dob}}': '01/15/1990',
      '{{property_name}}': 'Pueblo Plaza Center',
      '{{property_address}}': '123 Main St, Albuquerque, NM 87101',
      '{{unit_number}}': '101',
      '{{num_bedrooms}}': '2',
      '{{num_bathrooms}}': '1',
      '{{lease_start_date}}': '03/01/2026',
      '{{lease_end_date}}': '02/28/2027',
      '{{monthly_rent}}': '$1,200.00',
      '{{deposit_amount}}': '$1,200.00',
      '{{rent_due_day}}': '1st',
      '{{grace_period_days}}': '5',
      '{{late_fee}}': '$50.00',
      '{{pet_deposit}}': '$300.00',
      '{{pet_rent}}': '$25.00',
      '{{today_date}}': new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
      '{{num_occupants}}': '2',
    };

    let preview = templateContent;
    for (const [key, value] of Object.entries(sampleData)) {
      preview = preview.replaceAll(key, value);
    }
    setPreviewContent(preview);
    setPreviewOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Lease Templates</h1>
          <p className="text-muted-foreground">
            Create and manage reusable lease agreement templates with auto-populating fields.
          </p>
        </div>
        <Button onClick={openNewTemplate}>
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>

      {/* Template List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Templates Yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first lease template to start generating digital leases.
            </p>
            <Button onClick={openNewTemplate}>
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {templates.map((t) => (
            <Card key={t.id}>
              <CardContent className="py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-primary shrink-0" />
                  <div>
                    <h3 className="font-medium">{t.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {t.description || 'No description'} &middot;{' '}
                      {t._count.leases} lease{t._count.leases !== 1 ? 's' : ''} created &middot;{' '}
                      Updated {new Date(t.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  {!t.isActive && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                      Inactive
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEditTemplate(t.id)} title="Edit">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteTemplate(t.id)}
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Template Editor Dialog */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Edit Lease Template' : 'Create Lease Template'}
            </DialogTitle>
            <DialogDescription>
              Write your lease agreement text. Use {"{{placeholders}}"} for fields that auto-populate
              with tenant, property, and lease data when creating a lease.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Template Name *</Label>
                <Input
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g. Standard 12-Month Residential Lease"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Input
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  placeholder="Brief description of this template"
                />
              </div>
            </div>

            {/* Placeholder Reference */}
            <div className="border rounded-lg">
              <button
                type="button"
                onClick={() => setShowPlaceholders(!showPlaceholders)}
                className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium hover:bg-muted/50 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-primary" />
                  Available Placeholders — click to insert into template
                </span>
                {showPlaceholders ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>

              {showPlaceholders && (
                <div className="border-t px-4 py-3 space-y-3">
                  {PLACEHOLDER_CATEGORIES.map((category) => (
                    <div key={category}>
                      <p className="text-xs font-medium text-muted-foreground mb-1.5">{category}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {PLACEHOLDERS.filter((p) => p.category === category).map((p) => (
                          <button
                            key={p.key}
                            type="button"
                            onClick={() => insertPlaceholder(p.key)}
                            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-primary/5 border border-primary/20 text-primary hover:bg-primary/10 transition-colors"
                            title={p.label}
                          >
                            <Copy className="h-3 w-3" />
                            {p.key}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {saveError && (
              <div className="bg-destructive/10 text-destructive text-sm rounded-lg p-3">
                {saveError}
              </div>
            )}

            {/* Template Content Editor */}
            <div className="space-y-1.5">
              <Label>Lease Content *</Label>
              <Textarea
                className="min-h-[400px] font-mono text-sm leading-relaxed"
                value={templateContent}
                onChange={(e) => setTemplateContent(e.target.value)}
                placeholder="Write your lease agreement here. Use {{placeholders}} for dynamic fields..."
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button variant="outline" onClick={openPreview} disabled={!templateContent}>
                <Eye className="h-4 w-4 mr-2" />
                Preview with Sample Data
              </Button>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setEditorOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Template'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Template Preview (Sample Data)</DialogTitle>
            <DialogDescription>
              This shows how the lease will look with real data filled in. Highlighted values are sample data.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-white border rounded-lg p-8 font-serif text-sm leading-relaxed whitespace-pre-wrap">
            {previewContent}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
