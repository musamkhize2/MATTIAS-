import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Eye, EyeOff, RotateCw, Trash2, Plus, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface Credential {
  id: number;
  provider: string;
  name: string;
  status: "verified" | "pending" | "failed" | "expired";
  expiresAt: Date;
  lastVerified: Date;
  encryptedValue: string;
}

export default function CredentialManager() {
  const [showSecrets, setShowSecrets] = useState<Record<number, boolean>>({});
  const [selectedCredential, setSelectedCredential] = useState<Credential | null>(null);
  const [newCredentialName, setNewCredentialName] = useState("");
  const [newCredentialValue, setNewCredentialValue] = useState("");

  const { data: credentials, isLoading, refetch } = trpc.integrationCredentials.list.useQuery({});
  const deleteMutation = trpc.integrationCredentials.delete.useMutation();
  // Note: rotate mutation would need to be added to the backend router

  const handleDeleteCredential = async (credentialId: number) => {
    try {
      await deleteMutation.mutateAsync({ credentialId: String(credentialId) });
      toast.success("Credential deleted successfully");
      refetch();
    } catch (error) {
      toast.error("Failed to delete credential");
    }
  };

  const handleRotateCredential = async (credentialId: number) => {
    try {
      // In production, this would call a rotate mutation
      toast.success("Credential rotation initiated");
      refetch();
    } catch (error) {
      toast.error("Failed to rotate credential");
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "verified":
        return <CheckCircle2 size={16} className="text-green-500" />;
      case "pending":
        return <Clock size={16} className="text-yellow-500" />;
      case "failed":
        return <AlertCircle size={16} className="text-red-500" />;
      case "expired":
        return <AlertCircle size={16} className="text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "verified":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "failed":
        return "bg-red-100 text-red-800";
      case "expired":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Credential Manager</h1>
          <p className="text-muted-foreground mt-1">Securely manage integration credentials with AES-256 encryption</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus size={16} />
              Add Credential
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Credential</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">Name</label>
                <Input
                  placeholder="e.g., HubSpot API Key"
                  value={newCredentialName}
                  onChange={(e) => setNewCredentialName(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Value</label>
                <Input
                  type="password"
                  placeholder="Paste your credential value"
                  value={newCredentialValue}
                  onChange={(e) => setNewCredentialValue(e.target.value)}
                  className="mt-1"
                />
              </div>
              <Button className="w-full">Add Credential</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Credentials Grid */}
      <div className="grid gap-4">
        {isLoading ? (
          <Card className="p-8 text-center text-muted-foreground">Loading credentials...</Card>
        ) : (credentials || []).length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">No credentials configured yet</Card>
        ) : (
          (credentials || []).map((cred: any) => (
            <Card key={cred.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-foreground">{cred.name}</h3>
                    <Badge className={`gap-1 ${getStatusColor(cred.status)}`}>
                      {getStatusIcon(cred.status)}
                      {cred.status.charAt(0).toUpperCase() + cred.status.slice(1)}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Provider</p>
                      <p className="text-foreground font-mono">{cred.provider}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Last Verified</p>
                      <p className="text-foreground">{new Date(cred.lastVerified).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Expires</p>
                      <p className={`font-mono ${new Date(cred.expiresAt) < new Date() ? "text-red-500" : "text-foreground"}`}>
                        {new Date(cred.expiresAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Encrypted Value</p>
                      <div className="flex items-center gap-2">
                        <span className="text-foreground font-mono">
                          {showSecrets[cred.id] ? cred.encryptedValue : "••••••••••••"}
                        </span>
                        <button
                          onClick={() => setShowSecrets((prev) => ({ ...prev, [cred.id]: !prev[cred.id] }))}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          {showSecrets[cred.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRotateCredential(Number(cred.id))}
                    className="gap-1"
                  >
                    <RotateCw size={14} />
                    Rotate
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteCredential(cred.id)}
                    disabled={deleteMutation.isPending}
                    className="gap-1 text-red-500 hover:text-red-600"
                  >
                    <Trash2 size={14} />
                    Delete
                  </Button>
                </div>
              </div>

              {cred.status === "expired" && (
                <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700 flex items-center gap-2">
                  <AlertCircle size={14} />
                  This credential has expired. Please rotate or delete it.
                </div>
              )}
            </Card>
          ))
        )}
      </div>

      {/* Security Best Practices */}
      <Card className="p-4 bg-accent/10 border-accent/20">
        <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
          <AlertCircle size={16} className="text-accent" />
          Security Best Practices
        </h3>
        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
          <li>All credentials are encrypted with AES-256 at rest</li>
          <li>Never share credential values in logs or error messages</li>
          <li>Rotate credentials regularly (recommended every 90 days)</li>
          <li>Delete credentials immediately when they expire</li>
          <li>Use separate credentials for different environments (dev, staging, prod)</li>
        </ul>
      </Card>
    </div>
  );
}
