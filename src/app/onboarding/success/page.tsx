import Link from 'next/link';
import { CheckCircle2, Home, Mail, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function OnboardingSuccessPage() {
  return (
    <div className="max-w-2xl mx-auto text-center">
      <div className="mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-6">
          <CheckCircle2 className="h-10 w-10 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold">Application Submitted!</h1>
        <p className="text-muted-foreground mt-2">
          Thank you for completing your tenant application.
        </p>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>What happens next?</CardTitle>
          <CardDescription>Here is what you can expect</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6 text-left">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
              </div>
              <div>
                <h3 className="font-medium">Application Review</h3>
                <p className="text-sm text-muted-foreground">
                  The landlord will review your application within 1-3 business days.
                  They may contact you if additional information is needed.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
              </div>
              <div>
                <h3 className="font-medium">Approval Notification</h3>
                <p className="text-sm text-muted-foreground">
                  You will receive an email notification once your application is approved.
                  The landlord will also sign the lease agreement.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Home className="h-5 w-5 text-primary" />
                </div>
              </div>
              <div>
                <h3 className="font-medium">Move-In Preparation</h3>
                <p className="text-sm text-muted-foreground">
                  After approval, you will receive instructions for paying your deposit
                  and scheduling your move-in date.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link href="/tenant/dashboard">
          <Button>
            Go to Dashboard
          </Button>
        </Link>
        <Link href="/">
          <Button variant="outline">
            Return Home
          </Button>
        </Link>
      </div>

      <p className="text-xs text-muted-foreground mt-8">
        Questions? Contact us at support@strukture.com or call (555) 123-4567
      </p>
    </div>
  );
}
