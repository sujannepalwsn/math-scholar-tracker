import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Building, MapPin, Phone, User, Palette, Image, Save } from "lucide-react";

interface CenterTheme {
  primary: string;
  background: string;
  sidebar: string;
  foreground: string;
  cardBackground: string;
  mutedForeground: string;
}

export default function CenterSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [theme, setTheme] = useState<CenterTheme>({
    primary: "#6366f1",
    background: "#ffffff",
    sidebar: "#1e293b",
    foreground: "#1e293b",
    cardBackground: "#ffffff",
    mutedForeground: "#64748b",
  });

  // Fetch center details
  const { data: center, isLoading } = useQuery({
    queryKey: ["center-details", user?.center_id],
    queryFn: async () => {
      if (!user?.center_id) return null;
      const { data, error } = await supabase
        .from("centers")
        .select("*")
        .eq("id", user.center_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id,
  });

  // Populate form when center data loads
  useEffect(() => {
    if (center) {
      setName(center.name || "");
      setAddress(center.address || "");
      setPhone(center.phone || "");
      setEmail(center.email || "");
      setContactPerson((center as any).contact_person || "");
      setLogoUrl((center as any).logo_url || "");
      const savedTheme = (center as any).theme;
      if (savedTheme && typeof savedTheme === 'object') {
        setTheme({
          primary: savedTheme.primary || "#6366f1",
          background: savedTheme.background || "#ffffff",
          sidebar: savedTheme.sidebar || "#1e293b",
          foreground: savedTheme.foreground || "#1e293b",
          cardBackground: savedTheme.cardBackground || "#ffffff",
          mutedForeground: savedTheme.mutedForeground || "#64748b",
        });
        // Apply theme to CSS variables
        applyTheme(savedTheme);
      }
    }
  }, [center]);

  // Function to apply theme to CSS variables
  const applyTheme = (themeData: CenterTheme) => {
    const root = document.documentElement;
    
    // Convert hex to HSL for CSS variables
    const hexToHSL = (hex: string) => {
      if (!hex || !hex.startsWith('#')) return null;
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;

      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      let h = 0, s = 0;
      const l = (max + min) / 2;

      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
          case g: h = ((b - r) / d + 2) / 6; break;
          case b: h = ((r - g) / d + 4) / 6; break;
        }
      }

      return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
    };

    if (themeData.primary) {
      const hsl = hexToHSL(themeData.primary);
      if (hsl) root.style.setProperty('--primary', hsl);
    }
    if (themeData.background) {
      const hsl = hexToHSL(themeData.background);
      if (hsl) root.style.setProperty('--background', hsl);
    }
    if (themeData.sidebar) {
      const hsl = hexToHSL(themeData.sidebar);
      if (hsl) {
        root.style.setProperty('--sidebar-background', hsl);
        root.style.setProperty('--sidebar-foreground', '0 0% 98%'); // Light text for dark sidebar
      }
    }
    if (themeData.foreground) {
      const hsl = hexToHSL(themeData.foreground);
      if (hsl) root.style.setProperty('--foreground', hsl);
    }
    if (themeData.cardBackground) {
      const hsl = hexToHSL(themeData.cardBackground);
      if (hsl) root.style.setProperty('--card', hsl);
    }
    if (themeData.mutedForeground) {
      const hsl = hexToHSL(themeData.mutedForeground);
      if (hsl) root.style.setProperty('--muted-foreground', hsl);
    }
  };

  const updateCenterMutation = useMutation({
    mutationFn: async () => {
      if (!user?.center_id) throw new Error("Center ID not found");
      const { error } = await supabase
        .from("centers")
        .update({
          name,
          address: address || null,
          phone: phone || null,
          email: email || null,
          contact_person: contactPerson || null,
          logo_url: logoUrl || null,
          theme,
        } as any)
        .eq("id", user.center_id);
      if (error) throw error;
      // Apply theme after saving
      applyTheme(theme);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["center-details"] });
      toast.success("Center settings updated successfully!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update settings");
    },
  });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.center_id) return;

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.center_id}/logo.${fileExt}`;

    // Try to upload to a general bucket or use a public URL
    // For now, just accept a URL input
    toast.info("Please enter the logo URL directly. File upload coming soon.");
  };

  if (isLoading) {
    return <div className="p-6">Loading settings...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Center Settings</h1>
        <p className="text-muted-foreground">Manage your center's profile and appearance</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Basic Information
            </CardTitle>
            <CardDescription>Update your center's contact details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Center Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your Center Name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactPerson" className="flex items-center gap-1">
                <User className="h-4 w-4" />
                Contact Person
              </Label>
              <Input
                id="contactPerson"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="e.g., John Doe"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address" className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                Address / Location
              </Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123 Main Street, City"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-1">
                  <Phone className="h-4 w-4" />
                  Phone
                </Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="9876543210"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="center@example.com"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logo & Branding */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              Logo & Branding
            </CardTitle>
            <CardDescription>Customize your center's appearance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="logoUrl">Logo URL</Label>
              <Input
                id="logoUrl"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://example.com/logo.png"
              />
              {logoUrl && (
                <div className="mt-2 p-4 border rounded-lg bg-muted/50">
                  <img
                    src={logoUrl}
                    alt="Center Logo Preview"
                    className="max-h-24 object-contain mx-auto"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Theme Customization */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Dashboard Theme
            </CardTitle>
            <CardDescription>Choose colors for your dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="primaryColor">Primary Color</Label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    id="primaryColor"
                    value={theme.primary}
                    onChange={(e) => setTheme({ ...theme, primary: e.target.value })}
                    className="w-12 h-10 rounded border cursor-pointer"
                  />
                  <Input
                    value={theme.primary}
                    onChange={(e) => setTheme({ ...theme, primary: e.target.value })}
                    placeholder="#6366f1"
                    className="flex-1"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Buttons, links, accents</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="backgroundColor">Background Color</Label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    id="backgroundColor"
                    value={theme.background}
                    onChange={(e) => setTheme({ ...theme, background: e.target.value })}
                    className="w-12 h-10 rounded border cursor-pointer"
                  />
                  <Input
                    value={theme.background}
                    onChange={(e) => setTheme({ ...theme, background: e.target.value })}
                    placeholder="#ffffff"
                    className="flex-1"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Main page background</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sidebarColor">Sidebar Color</Label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    id="sidebarColor"
                    value={theme.sidebar}
                    onChange={(e) => setTheme({ ...theme, sidebar: e.target.value })}
                    className="w-12 h-10 rounded border cursor-pointer"
                  />
                  <Input
                    value={theme.sidebar}
                    onChange={(e) => setTheme({ ...theme, sidebar: e.target.value })}
                    placeholder="#1e293b"
                    className="flex-1"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Sidebar background</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="foregroundColor">Text Color</Label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    id="foregroundColor"
                    value={theme.foreground}
                    onChange={(e) => setTheme({ ...theme, foreground: e.target.value })}
                    className="w-12 h-10 rounded border cursor-pointer"
                  />
                  <Input
                    value={theme.foreground}
                    onChange={(e) => setTheme({ ...theme, foreground: e.target.value })}
                    placeholder="#1e293b"
                    className="flex-1"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Main text, headings</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cardBackground">Card Background</Label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    id="cardBackground"
                    value={theme.cardBackground}
                    onChange={(e) => setTheme({ ...theme, cardBackground: e.target.value })}
                    className="w-12 h-10 rounded border cursor-pointer"
                  />
                  <Input
                    value={theme.cardBackground}
                    onChange={(e) => setTheme({ ...theme, cardBackground: e.target.value })}
                    placeholder="#ffffff"
                    className="flex-1"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Cards, panels background</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mutedForeground">Secondary Text</Label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    id="mutedForeground"
                    value={theme.mutedForeground}
                    onChange={(e) => setTheme({ ...theme, mutedForeground: e.target.value })}
                    className="w-12 h-10 rounded border cursor-pointer"
                  />
                  <Input
                    value={theme.mutedForeground}
                    onChange={(e) => setTheme({ ...theme, mutedForeground: e.target.value })}
                    placeholder="#64748b"
                    className="flex-1"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Muted text, descriptions</p>
              </div>
            </div>

            {/* Theme Preview */}
            <div className="mt-6 p-4 border rounded-lg">
              <p className="text-sm font-medium mb-3">Preview:</p>
              <div className="flex rounded-lg overflow-hidden h-32 border">
                <div
                  className="w-16 p-2"
                  style={{ backgroundColor: theme.sidebar }}
                >
                  <div className="w-full h-3 rounded mb-2" style={{ backgroundColor: theme.primary }} />
                  <div className="w-full h-2 rounded mb-1 bg-white/20" />
                  <div className="w-full h-2 rounded mb-1 bg-white/20" />
                  <div className="w-full h-2 rounded bg-white/20" />
                </div>
                <div
                  className="flex-1 p-3"
                  style={{ backgroundColor: theme.background }}
                >
                  <div
                    className="w-20 h-6 rounded mb-2"
                    style={{ backgroundColor: theme.primary }}
                  />
                  <div className="w-full h-2 rounded mb-1 bg-gray-200" />
                  <div className="w-3/4 h-2 rounded bg-gray-200" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={() => updateCenterMutation.mutate()}
          disabled={!name || updateCenterMutation.isPending}
          size="lg"
        >
          <Save className="h-4 w-4 mr-2" />
          {updateCenterMutation.isPending ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}