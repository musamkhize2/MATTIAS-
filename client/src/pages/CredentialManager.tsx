import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Clock, Key, RefreshCw, Trash2, Eye, EyeOff } from "lucide-react";
import { format } from "date-fns";

export function CredentialManager() {
  const [selectedCredential, setSelectedCredential] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newCredential, setNewCredential] = useState({
    integrationName: "",
    displayName: "",
    credentialType: "api_key" as const,
    value: "",
  });

  // Mock data - in production, fetch from tRPC
  const credentials = [
    {
      id: "cred-1",
      displayName: "HubSpot Main",
      integrationName: "hubspot",
      integrationType: "crm",
      credentialType: "oauth_token" as const,
      isVerified: true,
      verificationStatus: "verified" as const,
      lastVerifiedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      tokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      lastUsedAt: new Date(Date.now() - 5 * 60 * 1000),
      isActive: true,
    },
    {
      id: "cred-2",
      displayName: "Google Ads API",
      integrationName: "google_ads",
      integrationType: "ad_platform",
      credentialType: "oauth_token" as const,
      isVerified: true,
      verificationStatus: "verified" as const,
      lastVerifiedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      lastUsedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      isActive: true,
    },
    {
      id: "cred-3",
      displayName: "Salesforce Dev",
      integrationName: "salesforce",
      integrationType: "crm",
      credentialType: "oauth_token" as const,
      isVerified: false,
      verificationStatus: "expired" as const,
      lastVerifiedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
      tokenExpiresAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      lastUsedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      isActive: false,
    },
  ];

  const getStatusBadge = (status: string, expiresAt?: Date) => {
    if (status === "verified") {
      if (expiresAt && expiresAt < new Date()) {
        return <Badge variant="destructive">Expired</Badge>;
      }
      if (expiresAt && expiresAt < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)) {
        return <Badge variant="secondary" className="bg-yellow-900 text-yellow-100">Expiring Soon</Badge>;
      }
      return <Badge variant="default" className="bg-green-900 text-green-100">Active</Badge>;
    }
    if (status === "expired") {
      return <Badge variant="destructive">Expired</Badge>;
    }
    if (status === "failed") {
      return <Badge variant="destructive">Failed</Badge>;
    }
    return <Badge variant="secondary">Pending</Badge>;
  };

  const getDaysUntilExpiry = (expiresAt?: Date) => {
    if (!expiresAt) return null;
    const days = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Credential Manager</h1>
          <p className="text-muted-foreground mt-1">Manage and monitor integration credentials</p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
          <Key className="w-4 h-4" />
          Add Credential
        </Button>
      </div>

      {/* Credentials Grid */}
      <div className="grid gap-4">
        {credentials.map((cred) => {
          const daysUntilExpiry = getDaysUntilExpiry(cred.tokenExpiresAt);
          const isExpired = cred.tokenExpiresAt && cred.tokenExpiresAt < new Date();

          return (
            <Card
              key={cred.id}
              className={`cursor-pointer transition-all ${
                selectedCredential === cred.id ? "ring-2 ring-blue-500" : ""
              } ${isExpired ? "opacity-60" : ""}`}
              onClick={() => setSelectedCredential(cred.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{cred.displayName}</CardTitle>
                      {getStatusBadge(cred.verificationStatus, cred.tokenExpiresAt)}
                    </div>
                    <CardDescription className="mt-1">
                      {cred.integrationName.charAt(0).toUpperCase() + cred.integrationName.slice(1)} •{" "}
                      {cred.credentialType.replace("_", " ")}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {/* Verification Status */}
                  <div className="flex items-center gap-2">
                    {cred.isVerified ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-yellow-500" />
                    )}
                    <span className="text-muted-foreground">
                      {cred.lastVerifiedAt
                        ? `Verified ${format(cred.lastVerifiedAt, "MMM d, h:mm a")}`
                        : "Not verified"}
                    </span>
                  </div>

                  {/* Last Used */}
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {cred.lastUsedAt ? `Used ${format(cred.lastUsedAt, "MMM d, h:mm a")}` : "Never used"}
                    </span>
                  </div>

                  {/* Expiry Info */}
                  {cred.tokenExpiresAt && (
                    <div className="col-span-2 flex items-center gap-2 p-2 rounded bg-muted">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm">
                        {isExpired ? (
                          <span className="text-destructive font-medium">Expired {format(cred.tokenExpiresAt, "MMM d")}</span>
                        ) : daysUntilExpiry && daysUntilExpiry <= 7 ? (
                          <span className="text-yellow-600 font-medium">
                            Expires in {daysUntilExpiry} day{daysUntilExpiry !== 1 ? "s" : ""}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">
                            Expires {format(cred.tokenExpiresAt, "MMM d, yyyy")}
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                </div>

                {/* Active Status */}
                <div className="flex items-center gap-2 pt-2 border-t">
                  <div className={`w-2 h-2 rounded-full ${cred.isActive ? "bg-green-500" : "bg-gray-500"}`} />
                  <span className="text-sm text-muted-foreground">
                    {cred.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Credential Details Panel */}
      {selectedCredential && (
        <Card className="border-blue-500/50 bg-blue-50/5">
          <CardHeader>
            <CardTitle>Credential Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {credentials
              .filter((c) => c.id === selectedCredential)
              .map((cred) => (
                <div key={cred.id} className="space-y-4">
                  <div>
                    <Label className="text-muted-foreground">Display Name</Label>
                    <p className="font-medium">{cred.displayName}</p>
                  </div>

                  <div>
                    <Label className="text-muted-foreground">Integration Type</Label>
                    <p className="font-medium capitalize">{cred.integrationType}</p>
                  </div>

                  <div>
                    <Label className="text-muted-foreground">Credential Type</Label>
                    <p className="font-medium capitalize">{cred.credentialType.replace("_", " ")}</p>
                  </div>

                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <div className="mt-1">{getStatusBadge(cred.verificationStatus, cred.tokenExpiresAt)}</div>
                  </div>

                  {cred.tokenExpiresAt && (
                    <div>
                      <Label className="text-muted-foreground">Expires</Label>
                      <p className="font-medium">{format(cred.tokenExpiresAt, "MMMM d, yyyy h:mm a")}</p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-4">
                    <Button variant="outline" className="gap-2">
                      <RefreshCw className="w-4 h-4" />
                      Refresh Token
                    </Button>
                    <Button variant="outline" className="gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Verify
                    </Button>
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>
      )}

      {/* Add Credential Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Credential</DialogTitle>
            <DialogDescription>Add a new integration credential to your account</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="integration">Integration</Label>
              <Select value={newCredential.integrationName} onValueChange={(v) => setNewCredential({ ...newCredential, integrationName: v })}>
                <SelectTrigger id="integration">
                  <SelectValue placeholder="Select integration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hubspot">HubSpot</SelectItem>
                  <SelectItem value="salesforce">Salesforce</SelectItem>
                  <SelectItem value="google_ads">Google Ads</SelectItem>
                  <SelectItem value="meta">Meta Ads</SelectItem>
                  <SelectItem value="tiktok">TikTok Ads</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                placeholder="e.g., HubSpot Production"
                value={newCredential.displayName}
                onChange={(e) => setNewCredential({ ...newCredential, displayName: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="credentialType">Credential Type</Label>
              <Select value={newCredential.credentialType} onValueChange={(v) => setNewCredential({ ...newCredential, credentialType: v as any })}>
                <SelectTrigger id="credentialType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="api_key">API Key</SelectItem>
                  <SelectItem value="oauth_token">OAuth Token</SelectItem>
                  <SelectItem value="basic_auth">Basic Auth</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="value">Credential Value</Label>
              <div className="relative">
                <Input
                  id="value"
                  type={showPassword["new"] ? "text" : "password"}
                  placeholder="Enter credential value"
                  value={newCredential.value}
                  onChange={(e) => setNewCredential({ ...newCredential, value: e.target.value })}
                />
                <button
                  className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword({ ...showPassword, new: !showPassword["new"] })}
                >
                  {showPassword["new"] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button>Add Credential</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
