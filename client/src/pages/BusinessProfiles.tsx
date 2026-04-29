import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Edit2, Building2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export default function BusinessProfiles() {
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    legalName: "",
    industry: "",
    websiteUrl: "",
    annualRevenueTarget: "",
  });

  const { data: profiles, isLoading, refetch } = trpc.businessProfiles.list.useQuery();
  const createMutation = trpc.businessProfiles.create.useMutation();
  const deleteMutation = trpc.businessProfiles.delete.useMutation();

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast.error("Business name is required");
      return;
    }

    try {
      await createMutation.mutateAsync({
        name: formData.name,
        legalName: formData.legalName || undefined,
        industry: formData.industry || undefined,
        websiteUrl: formData.websiteUrl || undefined,
        annualRevenueTarget: formData.annualRevenueTarget ? parseFloat(formData.annualRevenueTarget) : undefined,
      });

      toast.success("Business profile created");
      setFormData({ name: "", legalName: "", industry: "", websiteUrl: "", annualRevenueTarget: "" });
      setIsCreating(false);
      refetch();
    } catch (error) {
      toast.error("Failed to create business profile");
    }
  };

  const handleDelete = async (profileId: string) => {
    try {
      await deleteMutation.mutateAsync({ profileId });
      toast.success("Business profile deleted");
      refetch();
    } catch (error) {
      toast.error("Failed to delete business profile");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Business Profiles</h1>
        <p className="text-muted-foreground">Manage your company information and financial targets</p>
      </div>

      {/* Create Form */}
      {isCreating && (
        <Card className="p-6 border-border bg-card">
          <h2 className="text-lg font-semibold text-card-foreground mb-4">Create Business Profile</h2>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Business Name *</label>
              <Input
                placeholder="e.g. Acme Digital"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Legal Name</label>
              <Input
                placeholder="Official registered name"
                value={formData.legalName}
                onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Industry</label>
              <Input
                placeholder="e.g. B2B SaaS"
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Website URL</label>
              <Input
                placeholder="https://example.com"
                value={formData.websiteUrl}
                onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Annual Revenue Target</label>
              <Input
                placeholder="e.g. 1000000"
                type="number"
                value={formData.annualRevenueTarget}
                onChange={(e) => setFormData({ ...formData, annualRevenueTarget: e.target.value })}
                className="mt-1"
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Profile"}
              </Button>
              <Button variant="outline" onClick={() => setIsCreating(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Profiles List */}
      <div className="space-y-3">
        {isLoading ? (
          <p className="text-muted-foreground">Loading profiles...</p>
        ) : profiles && profiles.length > 0 ? (
          profiles.map((profile) => (
            <Card key={profile.id} className="p-4 border-border bg-card hover:bg-card/80 transition">
              <div className="flex items-start justify-between">
                <div className="flex gap-3 flex-1">
                  <Building2 className="text-accent mt-1" size={20} />
                  <div className="flex-1">
                    <h3 className="font-semibold text-card-foreground">{profile.name}</h3>
                    {profile.legalName && (
                      <p className="text-sm text-muted-foreground">{profile.legalName}</p>
                    )}
                    <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                      {profile.industry && <span>Industry: {profile.industry}</span>}
                      {profile.annualRevenueTarget && (
                        <span>Revenue Target: ${profile.annualRevenueTarget.toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" className="gap-1">
                    <Edit2 size={14} />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(profile.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 size={14} />
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <Card className="p-6 border-border bg-card text-center">
            <Building2 className="mx-auto mb-2 text-muted-foreground" size={32} />
            <p className="text-muted-foreground">No business profiles yet</p>
          </Card>
        )}
      </div>

      {/* Create Button */}
      {!isCreating && (
        <Button onClick={() => setIsCreating(true)} className="gap-2" size="lg">
          <Plus size={18} />
          Create Business Profile
        </Button>
      )}
    </div>
  );
}
