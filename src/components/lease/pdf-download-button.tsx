'use client';

import { useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import { Loader2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LeaseDocument, type LeaseDocumentData } from './lease-document';

interface PdfDownloadButtonProps {
  data: LeaseDocumentData;
  fileName: string;
}

export function PdfDownloadButton({ data, fileName }: PdfDownloadButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      const blob = await pdf(<LeaseDocument data={data} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to generate PDF:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button onClick={handleDownload} disabled={isGenerating} variant="outline" size="sm">
      {isGenerating ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <FileText className="mr-2 h-4 w-4" />
      )}
      {isGenerating ? 'Generating...' : 'Download PDF'}
    </Button>
  );
}
