import { useState } from "react";
import { WebsiteAnalyzerDialog } from "@/components/WebsiteAnalyzerDialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Edit,
  Trash2,
  Building2,
  Globe,
  Users,
  DollarSign,
  Calendar,
  Mail,
  Phone,
  MapPin,
  Save,
  X,
  ChevronRight,
  BarChart3,
} from "lucide-react";

interface Company {
  id: string;
  name: string;
  industry?: string;
  website?: string;
  description?: string;
  monthlyRevenue?: number;
  employeeCount?: number;
  foundedYear?: number;
  contactEmail?: string;
  contactPhone?: string;
  location?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface CompanyFormData {
  name: string;
  industry: string;
  website: string;
  description: string;
  monthlyRevenue: string;
  employeeCount: string;
  foundedYear: string;
  contactEmail: string;
  contactPhone: string;
  location: string;
}

// Extend Company interface to include additional fields from web scraper
interface ExtendedCompanyData extends Company {
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

const mockCompanies: Company[] = [
  {
    id: "comp-1",
    name: "TechCorp Solutions",
    industry: "Software Development",
    website: "https://techcorp.com",
    description: "Leading provider of cloud-based enterprise solutions",
    monthlyRevenue: 250000,
    employeeCount: 85,
    foundedYear: 2015,
    contactEmail: "contact@techcorp.com",
    contactPhone: "+1-555-0123",
    location: "San Francisco, CA",
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
  },
  {
    id: "comp-2",
    name: "Digital Marketing Pro",
    industry: "Marketing & Advertising",
    website: "https://digitalmarketingpro.com",
    description: "Full-service digital marketing agency specializing in SaaS",
    monthlyRevenue: 120000,
    employeeCount: 42,
    foundedYear: 2018,
    contactEmail: "hello@dmpro.com",
    contactPhone: "+1-555-0456",
    location: "New York, NY",
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  },
];

const emptyFormData: CompanyFormData = {
  name: "",
  industry: "",
  website: "",
  description: "",
  monthlyRevenue: "",
  employeeCount: "",
  foundedYear: "",
  contactEmail: "",
  contactPhone: "",
  location: "",
};

function CompanyCard({ company, onEdit, onDelete }: { company: Company; onEdit: (c: Company) => void; onDelete: (id: string) => void }) {
  return (
    <Card className="hover:border-blue-500/50 transition-colors">
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-5 h-5 text-blue-500" />
                <h3 className="font-semibold text-lg">{company.name}</h3>
              </div>
              {company.industry && (
                <Badge variant="secondary" className="mb-2">
                  {company.industry}
                </Badge>
              )}
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => onEdit(company)}>
                <Edit className="w-4 h-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Company</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete "{company.name}"? This action cannot be undone. All associated memories and metrics will be deleted.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="flex gap-2 justify-end">
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onDelete(company.id)} className="bg-red-600 hover:bg-red-700">
                      Delete
                    </AlertDialogAction>
                  </div>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          {/* Description */}
          {company.description && (
            <p className="text-sm text-muted-foreground">{company.description}</p>
          )}

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-2" style={{ borderTop: "1px solid oklch(0.22 0.02 260)" }}>
            {company.monthlyRevenue && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Monthly Revenue</p>
                <div className="flex items-center gap-1">
                  <DollarSign className="w-4 h-4 text-green-500" />
                  <span className="font-semibold text-sm">
                    ${(company.monthlyRevenue / 1000).toFixed(0)}K
                  </span>
                </div>
              </div>
            )}

            {company.employeeCount && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Employees</p>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4 text-blue-500" />
                  <span className="font-semibold text-sm">{company.employeeCount}</span>
                </div>
              </div>
            )}

            {company.foundedYear && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Founded</p>
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4 text-purple-500" />
                  <span className="font-semibold text-sm">{company.foundedYear}</span>
                </div>
              </div>
            )}
          </div>

          {/* Contact Info */}
          <div className="space-y-2 pt-2">
            {company.contactEmail && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <a href={`mailto:${company.contactEmail}`} className="text-blue-500 hover:underline">
                  {company.contactEmail}
                </a>
              </div>
            )}
            {company.contactPhone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <a href={`tel:${company.contactPhone}`} className="text-blue-500 hover:underline">
                  {company.contactPhone}
                </a>
              </div>
            )}
            {company.location && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span>{company.location}</span>
              </div>
            )}
          </div>

          {/* View Memories Button */}
          <Button variant="outline" className="w-full gap-2 mt-2">
            <BarChart3 className="w-4 h-4" />
            View Memories & Metrics
            <ChevronRight className="w-4 h-4 ml-auto" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function CompanyForm({
  initialData,
  onSubmit,
  onCancel,
}: {
  initialData: CompanyFormData;
  onSubmit: (data: CompanyFormData) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState(initialData);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium mb-1 block">Company Name *</label>
          <Input
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Enter company name"
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Industry</label>
          <Input
            name="industry"
            value={formData.industry}
            onChange={handleChange}
            placeholder="e.g., Software Development"
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium mb-1 block">Website</label>
        <Input
          name="website"
          value={formData.website}
          onChange={handleChange}
          placeholder="https://example.com"
          type="url"
        />
      </div>

      <div>
        <label className="text-sm font-medium mb-1 block">Description</label>
        <Textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Brief description of the company"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="text-sm font-medium mb-1 block">Monthly Revenue</label>
          <Input
            name="monthlyRevenue"
            value={formData.monthlyRevenue}
            onChange={handleChange}
            placeholder="e.g., 100000"
            type="number"
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Employee Count</label>
          <Input
            name="employeeCount"
            value={formData.employeeCount}
            onChange={handleChange}
            placeholder="e.g., 50"
            type="number"
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Founded Year</label>
          <Input
            name="foundedYear"
            value={formData.foundedYear}
            onChange={handleChange}
            placeholder="e.g., 2020"
            type="number"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium mb-1 block">Contact Email</label>
          <Input
            name="contactEmail"
            value={formData.contactEmail}
            onChange={handleChange}
            placeholder="contact@company.com"
            type="email"
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Contact Phone</label>
          <Input
            name="contactPhone"
            value={formData.contactPhone}
            onChange={handleChange}
            placeholder="+1-555-0000"
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium mb-1 block">Location</label>
        <Input
          name="location"
          value={formData.location}
          onChange={handleChange}
          placeholder="City, State"
        />
      </div>

      <div className="flex gap-2 justify-end pt-4">
        <Button variant="outline" onClick={onCancel}>
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
        <Button onClick={() => onSubmit(formData)}>
          <Save className="w-4 h-4 mr-2" />
          Save Company
        </Button>
      </div>
    </div>
  );
}

export default function CompanyManager() {
  const [companies, setCompanies] = useState<Company[]>(mockCompanies);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [formData, setFormData] = useState<CompanyFormData>(emptyFormData);

  const handleAddCompany = () => {
    setEditingCompany(null);
    setFormData(emptyFormData);
    setIsDialogOpen(true);
  };

  const handleEditCompany = (company: Company) => {
    setEditingCompany(company);
    setFormData({
      name: company.name,
      industry: company.industry || "",
      website: company.website || "",
      description: company.description || "",
      monthlyRevenue: company.monthlyRevenue?.toString() || "",
      employeeCount: company.employeeCount?.toString() || "",
      foundedYear: company.foundedYear?.toString() || "",
      contactEmail: company.contactEmail || "",
      contactPhone: company.contactPhone || "",
      location: company.location || "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmitForm = (data: CompanyFormData) => {
    if (!data.name.trim()) {
      alert("Company name is required");
      return;
    }

    if (editingCompany) {
      // Update existing company
      setCompanies((prev) =>
        prev.map((c) =>
          c.id === editingCompany.id
            ? {
                ...c,
                name: data.name,
                industry: data.industry,
                website: data.website,
                description: data.description,
                monthlyRevenue: data.monthlyRevenue ? parseFloat(data.monthlyRevenue) : undefined,
                employeeCount: data.employeeCount ? parseInt(data.employeeCount) : undefined,
                foundedYear: data.foundedYear ? parseInt(data.foundedYear) : undefined,
                contactEmail: data.contactEmail,
                contactPhone: data.contactPhone,
                location: data.location,
                updatedAt: new Date(),
              }
            : c
        )
      );
    } else {
      // Create new company
      const newCompany: Company = {
        id: `comp-${Date.now()}`,
        name: data.name,
        industry: data.industry,
        website: data.website,
        description: data.description,
        monthlyRevenue: data.monthlyRevenue ? parseFloat(data.monthlyRevenue) : undefined,
        employeeCount: data.employeeCount ? parseInt(data.employeeCount) : undefined,
        foundedYear: data.foundedYear ? parseInt(data.foundedYear) : undefined,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        location: data.location,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setCompanies((prev) => [newCompany, ...prev]);
    }

    setIsDialogOpen(false);
    setEditingCompany(null);
    setFormData(emptyFormData);
  };

  const handleDeleteCompany = (id: string) => {
    setCompanies((prev) => prev.filter((c) => c.id !== id));
  };

  const handleWebsiteDataExtracted = (extractedData: any) => {
    setFormData((prev) => ({
      ...prev,
      name: extractedData.name || prev.name,
      industry: extractedData.industry || prev.industry,
      website: extractedData.website || prev.website,
      description: extractedData.description || prev.description,
      monthlyRevenue: extractedData.monthlyRevenue?.toString() || prev.monthlyRevenue,
      employeeCount: extractedData.employeeCount?.toString() || prev.employeeCount,
      foundedYear: extractedData.foundedYear?.toString() || prev.foundedYear,
      contactEmail: extractedData.contactEmail || prev.contactEmail,
      contactPhone: extractedData.contactPhone || prev.contactPhone,
      location: extractedData.location || prev.location,
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Company Manager</h1>
          <p className="text-muted-foreground mt-1">
            Manage your companies and track their performance metrics and memories
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={handleAddCompany} style={{ background: "oklch(0.65 0.22 270)" }}>
              <Plus className="w-4 h-4" />
              Add Company
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingCompany ? "Edit Company" : "Add New Company"}
              </DialogTitle>
              <DialogDescription>
                {editingCompany
                  ? "Update company details and metrics"
                  : "Enter company information to get started with tracking"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <WebsiteAnalyzerDialog onDataExtracted={handleWebsiteDataExtracted} />
              <div style={{ borderTop: "1px solid oklch(0.22 0.02 260)", paddingTop: "1rem" }}>
                <CompanyForm
                  initialData={formData}
                  onSubmit={handleSubmitForm}
                  onCancel={() => setIsDialogOpen(false)}
                />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Companies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{companies.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(
                companies.reduce((sum, c) => sum + (c.monthlyRevenue || 0), 0) / 1000
              ).toFixed(0)}K
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Employees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {companies.reduce((sum, c) => sum + (c.employeeCount || 0), 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Founded Year</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {companies.length > 0
                ? Math.round(
                    companies.reduce((sum, c) => sum + (c.foundedYear || 0), 0) / companies.length
                  )
                : "-"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Companies Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {companies.length > 0 ? (
          companies.map((company) => (
            <CompanyCard
              key={company.id}
              company={company}
              onEdit={handleEditCompany}
              onDelete={handleDeleteCompany}
            />
          ))
        ) : (
          <Card className="col-span-full">
            <CardContent className="pt-12 pb-12 text-center">
              <Building2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Companies Yet</h3>
              <p className="text-muted-foreground mb-4">
                Start by adding your first company to track metrics and memories
              </p>
              <Button onClick={handleAddCompany} className="gap-2">
                <Plus className="w-4 h-4" />
                Add Your First Company
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
