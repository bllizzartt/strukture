'use client';

import { useEffect, useState, useCallback } from 'react';
import { FileText, Download, Folder, Clock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Document {
  id: string;
  name: string;
  type: string;
  fileSize: number;
  fileUrl: string;
  expiryDate: string | null;
  uploadedAt: string;
}

type DocumentType = 'LEASE' | 'ID' | 'INCOME' | 'INSURANCE' | 'OTHER';

const documentTypeLabels: Record<string, string> = {
  LEASE: 'Lease Documents',
  ID: 'ID Documents',
  INCOME: 'Proof of Income',
  INSURANCE: 'Insurance',
  OTHER: 'Other',
};

const documentTypeOrder: DocumentType[] = ['LEASE', 'ID', 'INCOME', 'INSURANCE', 'OTHER'];

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  return `${size % 1 === 0 ? size : size.toFixed(1)} ${units[i]}`;
}

export default function TenantDocumentsPage() {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDocuments = useCallback(async () => {
    try {
      const response = await fetch('/api/tenant/documents');
      const result = await response.json();
      if (result.success) {
        setDocuments(result.data);
      }
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load documents',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const groupedDocuments = documentTypeOrder.reduce(
    (acc, type) => {
      const docs = documents.filter((doc) => doc.type === type);
      if (docs.length > 0) {
        acc[type] = docs;
      }
      return acc;
    },
    {} as Record<string, Document[]>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">My Documents</h1>
        <p className="text-muted-foreground">View and download your documents</p>
      </div>

      {/* Documents */}
      {documents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No documents uploaded yet</p>
            <p className="text-sm text-muted-foreground">
              Documents related to your tenancy will appear here
            </p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(groupedDocuments).map(([type, docs]) => (
          <Card key={type}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Folder className="h-5 w-5 text-primary" />
                {documentTypeLabels[type] || type}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {docs.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium truncate">{doc.name}</p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <span>{formatFileSize(doc.fileSize)}</span>
                          <span>Uploaded {format(new Date(doc.uploadedAt), 'MMM d, yyyy')}</span>
                          {doc.expiryDate && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Expires {format(new Date(doc.expiryDate), 'MMM d, yyyy')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <a href={doc.fileUrl} download>
                      <Button variant="outline" size="sm">
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </Button>
                    </a>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
