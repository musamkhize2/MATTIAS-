import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Globe,
  Loader,
  AlertCircle,
  CheckCircle,
  Building2,
  Users,
  DollarSign,
  Calendar,
  MapPin,
  Mail,
  Phone,
  Briefcase,
  Target,
  Award,
  Link as LinkIcon,
  Copy,
  Check,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

interface WebsiteAnalyzerDialogProps {
  onDataExtracted: (data: any) => void;
  trigger?: React.ReactNode;
}

interface ExtractedData {
  name?: string;
  industry?: string;
  description?: string;
  website?: string;
  contactEmail?: string;
  contactPhone?: string;
  location?: string;
  monthlyRevenue?: number;
  employeeCount?: number;
  foundedYear?: number;
  missionStatement?: string;
  visionStatement?: string;
  coreValues?: string[];
  keyProducts?: string[];
  keyServices?: string[];
  targetMarket?: string;
  technologies?: string[];
  certifications?: string[];
  awards?: string[];
  partnerships?: string[];
  fundingStage?: string;
  fundingAmount?: number;
  investors?: string[];
  teamSize?: number;
  officeLocations?: string[];
  recentNews?: string[];
  socialLinks?: {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
    instagram?: string;
  };
}

export function WebsiteAnalyzerDialog({
  onDataExtracted,
  trigger,
}: WebsiteAnalyzerDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const scrapeWebsiteMutation = trpc.companyWebScraper.scrapeWebsite.useMutation();

  const handleAnalyze = async () => {
    if (!url.trim()) {
      setError("Please enter a website URL");
      return;
    }

    setIsLoading(true);
    setError(null);
    setExtractedData(null);

    try {
      const result = await scrapeWebsiteMutation.mutateAsync({ url });

      if (!result.success) {
        setError(result.error || "Failed to analyze website");
        return;
      }

      if (result.data) {
        setExtractedData(result.data);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An error occurred while analyzing the website"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseData = () => {
    if (extractedData) {
      onDataExtracted(extractedData);
      setIsOpen(false);
      setUrl("");
      setExtractedData(null);
      setError(null);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const renderFieldValue = (value: any, field: string) => {
    if (Array.isArray(value)) {
      return (
        <div className="flex flex-wrap gap-1">
          {value.map((item, idx) => (
            <Badge key={idx} variant="secondary" className="text-xs">
              {item}
            </Badge>
          ))}
        </div>
      );
    }

    if (typeof value === "object" && value !== null) {
      return (
        <div className="space-y-1 text-sm">
          {Object.entries(value).map(([key, val]) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-muted-foreground capitalize">{key}:</span>
              <span>{String(val)}</span>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="flex items-center justify-between gap-2">
        <span>{String(value)}</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={() => copyToClipboard(String(value), field)}
        >
          {copiedField === field ? (
            <Check className="w-3 h-3" />
          ) : (
            <Copy className="w-3 h-3" />
          )}
        </Button>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2">
            <Globe className="w-4 h-4" />
            Analyze Website
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Website Company Analyzer</DialogTitle>
          <DialogDescription>
            Enter a company website URL to automatically extract company information
          </DialogDescription>
        </DialogHeader>

        {!extractedData ? (
          <div className="space-y-4">
            {/* URL Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Company Website URL</label>
              <div className="flex gap-2">
                <Input
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    setError(null);
                  }}
                  placeholder="https://example.com"
                  disabled={isLoading}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") handleAnalyze();
                  }}
                />
                <Button onClick={handleAnalyze} disabled={isLoading} className="gap-2">
                  {isLoading ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Globe className="w-4 h-4" />
                      Analyze
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex gap-2 p-3 rounded-lg bg-red-900/20 border border-red-500/30">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-200">{error}</p>
              </div>
            )}

            {/* Loading State */}
            {isLoading && (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <Loader className="w-8 h-8 animate-spin text-blue-500" />
                <p className="text-muted-foreground">
                  Analyzing website and extracting company information...
                </p>
                <p className="text-xs text-muted-foreground">This may take a few moments</p>
              </div>
            )}

            {/* Help Text */}
            {!isLoading && !error && (
              <Card className="bg-blue-900/10 border-blue-500/20">
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground">
                    💡 <strong>Tip:</strong> Enter the company's main website URL. The analyzer
                    will visit the site and extract company information including name, industry,
                    description, contact details, and more.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Success Message */}
            <div className="flex gap-2 p-3 rounded-lg bg-green-900/20 border border-green-500/30">
              <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
              <p className="text-sm text-green-200">
                Successfully extracted company information from {url}
              </p>
            </div>

            {/* Extracted Data Display */}
            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
              {/* Core Information */}
              {(extractedData.name ||
                extractedData.industry ||
                extractedData.description) && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      Core Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {extractedData.name && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Company Name</p>
                        {renderFieldValue(extractedData.name, "name")}
                      </div>
                    )}
                    {extractedData.industry && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Industry</p>
                        {renderFieldValue(extractedData.industry, "industry")}
                      </div>
                    )}
                    {extractedData.description && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Description</p>
                        <p className="text-sm">{extractedData.description}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Contact Information */}
              {(extractedData.contactEmail ||
                extractedData.contactPhone ||
                extractedData.location) && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Contact Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {extractedData.contactEmail && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Email</p>
                        {renderFieldValue(extractedData.contactEmail, "email")}
                      </div>
                    )}
                    {extractedData.contactPhone && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Phone</p>
                        {renderFieldValue(extractedData.contactPhone, "phone")}
                      </div>
                    )}
                    {extractedData.location && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Location</p>
                        {renderFieldValue(extractedData.location, "location")}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Company Metrics */}
              {(extractedData.employeeCount ||
                extractedData.foundedYear ||
                extractedData.monthlyRevenue) && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" />
                      Company Metrics
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {extractedData.employeeCount && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Employee Count</p>
                        {renderFieldValue(extractedData.employeeCount, "employees")}
                      </div>
                    )}
                    {extractedData.foundedYear && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Founded Year</p>
                        {renderFieldValue(extractedData.foundedYear, "founded")}
                      </div>
                    )}
                    {extractedData.monthlyRevenue && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Monthly Revenue</p>
                        {renderFieldValue(extractedData.monthlyRevenue, "revenue")}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Business Details */}
              {(extractedData.missionStatement ||
                extractedData.visionStatement ||
                extractedData.coreValues) && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      Business Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {extractedData.missionStatement && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Mission</p>
                        <p className="text-sm">{extractedData.missionStatement}</p>
                      </div>
                    )}
                    {extractedData.visionStatement && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Vision</p>
                        <p className="text-sm">{extractedData.visionStatement}</p>
                      </div>
                    )}
                    {extractedData.coreValues && extractedData.coreValues.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Core Values</p>
                        {renderFieldValue(extractedData.coreValues, "values")}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Products & Services */}
              {(extractedData.keyProducts || extractedData.keyServices) && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Briefcase className="w-4 h-4" />
                      Products & Services
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {extractedData.keyProducts && extractedData.keyProducts.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Key Products</p>
                        {renderFieldValue(extractedData.keyProducts, "products")}
                      </div>
                    )}
                    {extractedData.keyServices && extractedData.keyServices.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Key Services</p>
                        {renderFieldValue(extractedData.keyServices, "services")}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Additional Information */}
              {(extractedData.technologies ||
                extractedData.awards ||
                extractedData.certifications) && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Award className="w-4 h-4" />
                      Additional Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {extractedData.technologies && extractedData.technologies.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Technologies</p>
                        {renderFieldValue(extractedData.technologies, "tech")}
                      </div>
                    )}
                    {extractedData.awards && extractedData.awards.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Awards</p>
                        {renderFieldValue(extractedData.awards, "awards")}
                      </div>
                    )}
                    {extractedData.certifications &&
                      extractedData.certifications.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Certifications</p>
                          {renderFieldValue(extractedData.certifications, "certs")}
                        </div>
                      )}
                  </CardContent>
                </Card>
              )}

              {/* Social Links */}
              {extractedData.socialLinks &&
                Object.values(extractedData.socialLinks).some((v) => v) && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <LinkIcon className="w-4 h-4" />
                        Social Links
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {Object.entries(extractedData.socialLinks).map(([key, value]) =>
                        value ? (
                          <div key={key} className="flex items-center justify-between gap-2">
                            <span className="text-xs text-muted-foreground capitalize">
                              {key}:
                            </span>
                            <a
                              href={String(value)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-500 hover:underline truncate"
                            >
                              {String(value).substring(0, 40)}...
                            </a>
                          </div>
                        ) : null
                      )}
                    </CardContent>
                  </Card>
                )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setExtractedData(null);
                  setUrl("");
                  setError(null);
                }}
              >
                Analyze Another
              </Button>
              <Button onClick={handleUseData} className="flex-1">
                <Check className="w-4 h-4 mr-2" />
                Use This Data
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Import BarChart3 icon
import { BarChart3 } from "lucide-react";
