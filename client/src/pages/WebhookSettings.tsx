import LogoHeader from "@/components/LogoHeader";
import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Check, X } from "lucide-react";

export function WebhookSettings() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [customDomain, setCustomDomain] = useState("");
  const [notificationEmail, setNotificationEmail] = useState("");
  const [slackWebhookUrl, setSlackWebhookUrl] = useState("");

  // Validation state
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch current settings
  useEffect(() => {
    const loadSettings = async () => {
      setIsLoading(true);
      try {
        // TODO: Implement getWebhookSettings tRPC procedure
        // const settings = await trpc.system.getWebhookSettings.query();
        // if (settings) {
        //   setCustomDomain(settings.customDomain || "");
        //   setNotificationEmail(settings.notificationEmail || "");
        //   setSlackWebhookUrl(settings.slackWebhookUrl || "");
        // }
      } catch (error) {
        console.error("Failed to load webhook settings:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      loadSettings();
    }
  }, [user]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate custom domain if provided
    if (customDomain) {
      const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
      if (!domainRegex.test(customDomain)) {
        newErrors.customDomain = "Invalid domain format";
      }
    }

    // Validate email if provided
    if (notificationEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(notificationEmail)) {
        newErrors.notificationEmail = "Invalid email format";
      }
    }

    // Validate Slack webhook URL if provided
    if (slackWebhookUrl) {
      if (!slackWebhookUrl.startsWith("https://hooks.slack.com/")) {
        newErrors.slackWebhookUrl = "Invalid Slack webhook URL";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSaving(true);
    try {
      // TODO: Implement updateWebhookSettings tRPC procedure
      // await trpc.system.updateWebhookSettings.mutate({
      //   customDomain: customDomain || undefined,
      //   notificationEmail: notificationEmail || undefined,
      //   slackWebhookUrl: slackWebhookUrl || undefined,
      // });

      alert("Webhook settings updated successfully");
    } catch (error) {
      console.error("Failed to update webhook settings:", error);
      alert("Failed to update webhook settings");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2">Loading settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Webhook Settings</h1>
        <p className="text-muted-foreground mt-2">
          Configure custom domains, notification channels, and webhook integrations
        </p>
      </div>

      <div className="grid gap-6">
        {/* Custom Domain Card */}
        <Card>
          <CardHeader>
            <CardTitle>Custom Domain</CardTitle>
            <CardDescription>
              Configure a custom domain for webhook callbacks and email links
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customDomain">Domain Name</Label>
              <Input
                id="customDomain"
                placeholder="example.com"
                value={customDomain}
                onChange={(e) => {
                  setCustomDomain(e.target.value);
                  if (errors.customDomain) {
                    setErrors((prev) => ({ ...prev, customDomain: "" }));
                  }
                }}
                className={errors.customDomain ? "border-red-500" : ""}
              />
              {errors.customDomain && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <X className="h-4 w-4" />
                  {errors.customDomain}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Leave empty to use default: mattiasai-g6u5hsty.manus.space
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Email Notifications Card */}
        <Card>
          <CardHeader>
            <CardTitle>Email Notifications</CardTitle>
            <CardDescription>
              Receive campaign delivery alerts and analytics reports via email
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notificationEmail">Notification Email</Label>
              <Input
                id="notificationEmail"
                type="email"
                placeholder="admin@example.com"
                value={notificationEmail}
                onChange={(e) => {
                  setNotificationEmail(e.target.value);
                  if (errors.notificationEmail) {
                    setErrors((prev) => ({ ...prev, notificationEmail: "" }));
                  }
                }}
                className={errors.notificationEmail ? "border-red-500" : ""}
              />
              {errors.notificationEmail && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <X className="h-4 w-4" />
                  {errors.notificationEmail}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Email address where campaign and system alerts will be sent
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Slack Integration Card */}
        <Card>
          <CardHeader>
            <CardTitle>Slack Integration</CardTitle>
            <CardDescription>
              Send campaign alerts and notifications to your Slack workspace
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="slackWebhookUrl">Slack Webhook URL</Label>
              <Textarea
                id="slackWebhookUrl"
                placeholder="https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX"
                value={slackWebhookUrl}
                onChange={(e) => {
                  setSlackWebhookUrl(e.target.value);
                  if (errors.slackWebhookUrl) {
                    setErrors((prev) => ({ ...prev, slackWebhookUrl: "" }));
                  }
                }}
                className={`min-h-20 font-mono text-xs ${errors.slackWebhookUrl ? "border-red-500" : ""}`}
              />
              {errors.slackWebhookUrl && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <X className="h-4 w-4" />
                  {errors.slackWebhookUrl}
                </p>
              )}
              <div className="space-y-2 text-xs text-muted-foreground">
                <p>To get your Slack webhook URL:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Go to your Slack workspace settings</li>
                  <li>Create an Incoming Webhook</li>
                  <li>Copy the webhook URL and paste it here</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Webhook Configuration Info */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-900">Webhook Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-blue-800">
            <p>
              <strong>Weekly Reports:</strong> POST to /api/scheduled/analytics/weekly
            </p>
            <p>
              <strong>Monthly Reports:</strong> POST to /api/scheduled/analytics/monthly
            </p>
            <p>
              <strong>Delivery Alerts:</strong> Sent when campaigns have delivery failures
            </p>
            <p>
              <strong>Approval Notifications:</strong> Sent when actions require approval
            </p>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => window.history.back()}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
