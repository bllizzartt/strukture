'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Settings,
  MessageCircle,
  Download,
  Search,
  Send,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Copy,
  ExternalLink,
  Bell,
  BellOff,
  Unplug,
  Smartphone,
  Wrench,
  Plus,
  Trash2,
  Mail,
  Phone,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

const MAINTENANCE_CATEGORIES = [
  { value: 'PLUMBING', label: 'Plumbing' },
  { value: 'ELECTRICAL', label: 'Electrical' },
  { value: 'HVAC', label: 'HVAC' },
  { value: 'APPLIANCE', label: 'Appliance' },
  { value: 'STRUCTURAL', label: 'Structural' },
  { value: 'PEST_CONTROL', label: 'Pest Control' },
  { value: 'LANDSCAPING', label: 'Landscaping' },
  { value: 'CLEANING', label: 'Cleaning' },
  { value: 'SECURITY', label: 'Security' },
  { value: 'OTHER', label: 'Other' },
] as const;

interface Vendor {
  id: string;
  name: string;
  companyName: string | null;
  email: string;
  phone: string | null;
  categories: string[];
  isActive: boolean;
  notes: string | null;
}

interface TelegramStatus {
  connected: boolean;
  telegramUsername: string | null;
  telegramNotifications: boolean;
  botUsername: string | null;
}

function generateVerificationCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export default function SettingsPage() {
  const { toast } = useToast();
  const [status, setStatus] = useState<TelegramStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isTogglingNotifs, setIsTogglingNotifs] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [codeCopied, setCodeCopied] = useState(false);

  // Vendor state
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [vendorForm, setVendorForm] = useState({ name: '', companyName: '', email: '', phone: '', categories: [] as string[], notes: '' });
  const [isSavingVendor, setIsSavingVendor] = useState(false);
  const [deletingVendorId, setDeletingVendorId] = useState<string | null>(null);

  const fetchVendors = useCallback(async () => {
    try {
      const response = await fetch('/api/landlord/vendors');
      const result = await response.json();
      if (result.success) setVendors(result.data);
    } catch {
      // Silent fail
    }
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/landlord/settings/telegram');
      const result = await response.json();
      if (result.success) {
        setStatus(result.data);
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to load Telegram settings', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchStatus();
    fetchVendors();
    setVerificationCode(generateVerificationCode());
  }, [fetchStatus, fetchVendors]);

  const toggleCategory = (cat: string) => {
    setVendorForm(prev => ({
      ...prev,
      categories: prev.categories.includes(cat)
        ? prev.categories.filter(c => c !== cat)
        : [...prev.categories, cat],
    }));
  };

  const saveVendor = async () => {
    if (!vendorForm.name || !vendorForm.email || vendorForm.categories.length === 0) {
      toast({ title: 'Missing fields', description: 'Name, email, and at least one category are required', variant: 'destructive' });
      return;
    }
    setIsSavingVendor(true);
    try {
      const response = await fetch('/api/landlord/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vendorForm),
      });
      const result = await response.json();
      if (result.success) {
        setVendors(prev => [result.data, ...prev]);
        setVendorForm({ name: '', companyName: '', email: '', phone: '', categories: [], notes: '' });
        setShowAddVendor(false);
        toast({ title: 'Vendor added', description: `${vendorForm.name} will be auto-notified for matching requests.` });
      } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to save vendor', variant: 'destructive' });
    } finally {
      setIsSavingVendor(false);
    }
  };

  const deleteVendor = async (id: string) => {
    setDeletingVendorId(id);
    try {
      const response = await fetch(`/api/landlord/vendors?id=${id}`, { method: 'DELETE' });
      const result = await response.json();
      if (result.success) {
        setVendors(prev => prev.filter(v => v.id !== id));
        toast({ title: 'Vendor removed' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to delete vendor', variant: 'destructive' });
    } finally {
      setDeletingVendorId(null);
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(verificationCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    } catch {
      toast({ title: 'Copy failed', description: 'Please copy the code manually', variant: 'destructive' });
    }
  };

  const verifyConnection = async () => {
    setIsVerifying(true);
    try {
      const response = await fetch('/api/landlord/settings/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verificationCode }),
      });
      const result = await response.json();

      if (result.success) {
        setStatus(result.data);
        toast({ title: 'Connected!', description: 'Telegram notifications are now active.' });
      } else {
        toast({ title: 'Not found', description: result.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to verify connection', variant: 'destructive' });
    } finally {
      setIsVerifying(false);
    }
  };

  const toggleNotifications = async () => {
    if (!status) return;
    setIsTogglingNotifs(true);
    try {
      const response = await fetch('/api/landlord/settings/telegram', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramNotifications: !status.telegramNotifications }),
      });
      const result = await response.json();

      if (result.success) {
        setStatus({ ...status, telegramNotifications: !status.telegramNotifications });
        toast({
          title: status.telegramNotifications ? 'Notifications paused' : 'Notifications enabled',
          description: status.telegramNotifications
            ? 'You will no longer receive Telegram notifications.'
            : 'You will now receive Telegram notifications.',
        });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to update settings', variant: 'destructive' });
    } finally {
      setIsTogglingNotifs(false);
    }
  };

  const disconnect = async () => {
    setIsDisconnecting(true);
    try {
      const response = await fetch('/api/landlord/settings/telegram', { method: 'DELETE' });
      const result = await response.json();

      if (result.success) {
        setStatus({ ...status!, connected: false, telegramUsername: null, telegramNotifications: false });
        setVerificationCode(generateVerificationCode());
        toast({ title: 'Disconnected', description: 'Telegram has been disconnected.' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to disconnect', variant: 'destructive' });
    } finally {
      setIsDisconnecting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your notification preferences and integrations.
        </p>
      </div>

      {/* Telegram Setup Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
              <MessageCircle className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <CardTitle>Telegram Notifications</CardTitle>
              <CardDescription>
                Get instant notifications on your phone for applications, maintenance requests, payments, and more.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {status?.connected ? (
            /* Connected State */
            <div className="space-y-6">
              <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950/30">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-900 dark:text-green-100">Connected</p>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    {status.telegramUsername
                      ? `@${status.telegramUsername}`
                      : 'Your Telegram account is connected.'}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  variant={status.telegramNotifications ? 'outline' : 'default'}
                  onClick={toggleNotifications}
                  disabled={isTogglingNotifs}
                >
                  {isTogglingNotifs ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : status.telegramNotifications ? (
                    <BellOff className="h-4 w-4 mr-2" />
                  ) : (
                    <Bell className="h-4 w-4 mr-2" />
                  )}
                  {status.telegramNotifications ? 'Pause Notifications' : 'Enable Notifications'}
                </Button>

                <Button
                  variant="destructive"
                  onClick={disconnect}
                  disabled={isDisconnecting}
                >
                  {isDisconnecting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Unplug className="h-4 w-4 mr-2" />
                  )}
                  Disconnect
                </Button>
              </div>

              <div className="rounded-lg bg-muted/50 p-4">
                <h4 className="font-medium mb-2">You&apos;ll receive notifications for:</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>- New rental applications</li>
                  <li>- Maintenance requests</li>
                  <li>- Viewing requests</li>
                  <li>- Lease signings</li>
                  <li>- Payment updates</li>
                  <li>- Application status changes</li>
                </ul>
              </div>
            </div>
          ) : (
            /* Setup Guide */
            <div className="space-y-8">
              {/* Step 1: Download Telegram */}
              <div className="flex gap-4">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  1
                </div>
                <div className="space-y-3">
                  <div>
                    <h3 className="font-semibold">Download Telegram</h3>
                    <p className="text-sm text-muted-foreground">
                      If you don&apos;t have Telegram yet, download it for free on your phone.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <a
                      href="https://apps.apple.com/app/telegram-messenger/id686449807"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline" className="gap-2">
                        <Smartphone className="h-4 w-4" />
                        Apple App Store
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </a>
                    <a
                      href="https://play.google.com/store/apps/details?id=org.telegram.messenger"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline" className="gap-2">
                        <Smartphone className="h-4 w-4" />
                        Google Play Store
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </a>
                    <a
                      href="https://telegram.org"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
                        <Download className="h-3 w-3" />
                        Desktop / Web
                      </Button>
                    </a>
                  </div>
                </div>
              </div>

              {/* Step 2: Find the bot */}
              <div className="flex gap-4">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  2
                </div>
                <div className="space-y-3">
                  <div>
                    <h3 className="font-semibold">Find the Strukture Bot</h3>
                    <p className="text-sm text-muted-foreground">
                      Open Telegram and search for our notification bot.
                    </p>
                  </div>
                  {status?.botUsername ? (
                    <div className="flex items-center gap-2">
                      <a
                        href={`https://t.me/${status.botUsername}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button variant="outline" className="gap-2 font-mono">
                          <Search className="h-4 w-4" />
                          @{status.botUsername}
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </a>
                      <span className="text-xs text-muted-foreground">Click to open in Telegram</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-950/30">
                      <XCircle className="h-4 w-4 text-yellow-600 flex-shrink-0" />
                      <p className="text-sm text-yellow-700 dark:text-yellow-300">
                        Telegram bot is not configured yet. Contact your administrator.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Step 3: Send verification code */}
              <div className="flex gap-4">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  3
                </div>
                <div className="space-y-3">
                  <div>
                    <h3 className="font-semibold">Send Verification Code</h3>
                    <p className="text-sm text-muted-foreground">
                      Copy the code below and send it as a message to the bot in Telegram.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 px-4 py-3">
                      <span className="font-mono text-2xl font-bold tracking-widest text-primary">
                        {verificationCode}
                      </span>
                    </div>
                    <Button variant="outline" size="sm" onClick={copyCode} className="gap-1">
                      <Copy className="h-3 w-3" />
                      {codeCopied ? 'Copied!' : 'Copy'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setVerificationCode(generateVerificationCode())}
                      className="gap-1 text-muted-foreground"
                    >
                      <RefreshCw className="h-3 w-3" />
                      New code
                    </Button>
                  </div>
                </div>
              </div>

              {/* Step 4: Verify */}
              <div className="flex gap-4">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  4
                </div>
                <div className="space-y-3">
                  <div>
                    <h3 className="font-semibold">Verify Connection</h3>
                    <p className="text-sm text-muted-foreground">
                      After sending the code in Telegram, click the button below to complete the setup.
                    </p>
                  </div>
                  <Button
                    onClick={verifyConnection}
                    disabled={isVerifying || !status?.botUsername}
                    className="gap-2"
                  >
                    {isVerifying ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    {isVerifying ? 'Checking...' : 'Verify Connection'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Vendor Management Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
                <Wrench className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <CardTitle>Preferred Vendors</CardTitle>
                <CardDescription>
                  Vendors are automatically emailed when a matching maintenance request is submitted.
                </CardDescription>
              </div>
            </div>
            {!showAddVendor && (
              <Button size="sm" onClick={() => setShowAddVendor(true)} className="gap-1">
                <Plus className="h-4 w-4" /> Add Vendor
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add Vendor Form */}
          {showAddVendor && (
            <div className="rounded-lg border p-4 space-y-4 bg-muted/30">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Contact Name *</Label>
                  <Input
                    placeholder="e.g., Joe Smith"
                    value={vendorForm.name}
                    onChange={e => setVendorForm(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Company Name</Label>
                  <Input
                    placeholder="e.g., Joe's Plumbing"
                    value={vendorForm.companyName}
                    onChange={e => setVendorForm(prev => ({ ...prev, companyName: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    placeholder="vendor@email.com"
                    value={vendorForm.email}
                    onChange={e => setVendorForm(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    placeholder="(555) 123-4567"
                    value={vendorForm.phone}
                    onChange={e => setVendorForm(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Categories they handle *</Label>
                <div className="flex flex-wrap gap-2">
                  {MAINTENANCE_CATEGORIES.map(cat => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => toggleCategory(cat.value)}
                      className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                        vendorForm.categories.includes(cat.value)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background text-muted-foreground border-border hover:border-primary/50'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={saveVendor} disabled={isSavingVendor} size="sm">
                  {isSavingVendor && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  Save Vendor
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { setShowAddVendor(false); setVendorForm({ name: '', companyName: '', email: '', phone: '', categories: [], notes: '' }); }}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Vendor List */}
          {vendors.length === 0 && !showAddVendor ? (
            <div className="text-center py-8 text-muted-foreground">
              <Wrench className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No vendors added yet</p>
              <p className="text-sm">Add your preferred plumbers, electricians, and other vendors.</p>
              <p className="text-sm mt-1">They&apos;ll be automatically emailed when a tenant submits a matching request.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {vendors.map(vendor => (
                <div key={vendor.id} className="flex items-start justify-between rounded-lg border p-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{vendor.name}</p>
                      {vendor.companyName && (
                        <span className="text-sm text-muted-foreground">({vendor.companyName})</span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {vendor.email}
                      </span>
                      {vendor.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {vendor.phone}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {vendor.categories.map(cat => (
                        <span key={cat} className="rounded-full bg-muted px-2 py-0.5 text-xs">
                          {MAINTENANCE_CATEGORIES.find(c => c.value === cat)?.label || cat}
                        </span>
                      ))}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteVendor(vendor.id)}
                    disabled={deletingVendorId === vendor.id}
                    className="text-muted-foreground hover:text-destructive shrink-0"
                  >
                    {deletingVendorId === vendor.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification Preferences Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Settings className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Notification Channels</CardTitle>
              <CardDescription>
                Overview of how you receive notifications.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">In-App Notifications</p>
                  <p className="text-sm text-muted-foreground">Bell icon in the top bar</p>
                </div>
              </div>
              <span className="text-sm font-medium text-green-600">Always On</span>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <Send className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Email Notifications</p>
                  <p className="text-sm text-muted-foreground">Important updates sent to your email</p>
                </div>
              </div>
              <span className="text-sm font-medium text-green-600">Always On</span>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <MessageCircle className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Telegram Notifications</p>
                  <p className="text-sm text-muted-foreground">Instant push notifications on your phone</p>
                </div>
              </div>
              <span className={`text-sm font-medium ${status?.connected && status?.telegramNotifications ? 'text-green-600' : 'text-muted-foreground'}`}>
                {status?.connected
                  ? status.telegramNotifications
                    ? 'Active'
                    : 'Paused'
                  : 'Not Connected'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
