import React, { useEffect, useState } from "react";
import { Building, ImageIcon, KeyRound, Loader2, MapPin, Palette, Phone as PhoneIcon, Save, Settings, ShieldCheck, User, Locate } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import ThemeSelector from "@/components/ThemeSelector";
import * as bcrypt from 'bcryptjs';
import NotificationSettings from "@/components/center/NotificationSettings";
import RegulatoryReports from "@/components/center/RegulatoryReports";
import AcademicYearManagement from "@/components/center/AcademicYearManagement";
import PayrollSettings from "@/components/center/PayrollSettings";
import SubscriptionPlans from "@/components/center/SubscriptionPlans";
import CenterRequirements from "@/components/center/CenterRequirements";
import CenterSuggestions from "@/components/center/CenterSuggestions";
import HeaderSettings from "@/components/center/HeaderSettings";
import { logger } from "@/utils/logger";

interface CenterTheme {
 primary: string;
 background: string;
 sidebar: string;
 foreground: string;
 cardBackground: string;
 mutedForeground: string;
}


import { hasActionPermission } from "@/utils/permissions";

export default function CenterSettings() {
 const { user, logout } = useAuth();
 const canEdit = hasActionPermission(user, 'settings_access', 'edit');
 const queryClient = useQueryClient();
 const [searchParams] = useSearchParams();
 const defaultTab = searchParams.get("tab") || "general";

 const [name, setName] = useState("");
 const [address, setAddress] = useState("");
 const [phone, setPhone] = useState("");
 const [email, setEmail] = useState("");
 const [contactPerson, setContactPerson] = useState("");
 const [logoUrl, setLogoUrl] = useState("");
 const [shortCode, setShortCode] = useState("");
 const [latitude, setLatitude] = useState("");
 const [longitude, setLongitude] = useState("");
 const [radiusMeters, setRadiusMeters] = useState("100");

 const [oldPassword, setOldPassword] = useState('');
 const [newPassword, setNewPassword] = useState('');
 const [confirmNewPassword, setConfirmNewPassword] = useState('');
 const [passwordLoading, setPasswordLoading] = useState(false);
 const [theme, setTheme] = useState<CenterTheme>({
  primary: "#6366f1",
  background: "#ffffff",
  sidebar: "#1e293b",
  foreground: "#1e293b",
  cardBackground: "#ffffff",
  mutedForeground: "#64748b" });

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
  enabled: !!user?.center_id });

 // Populate form when center data loads
 useEffect(() => {
  if (center) {
   setName(center.name || "");
   setAddress(center.address || "");
   setPhone(center.phone || "");
   setEmail(center.email || "");
   setContactPerson(center.contact_person || "");
   setLogoUrl(center.logo_url || "");
   setShortCode(center.short_code || "");
   setLatitude(center.latitude?.toString() || "");
   setLongitude(center.longitude?.toString() || "");
   setRadiusMeters(center.radius_meters?.toString() || "100");

   const savedTheme = center.theme;
   if (savedTheme && typeof savedTheme === 'object') {
    setTheme({
     primary: savedTheme.primary || "#6366f1",
     background: savedTheme.background || "#ffffff",
     sidebar: savedTheme.sidebar || "#1e293b",
     foreground: savedTheme.foreground || "#1e293b",
     cardBackground: savedTheme.cardBackground || "#ffffff",
     mutedForeground: savedTheme.mutedForeground || "#64748b" });
   }
  }
 }, [center]);

 const getCurrentLocation = () => {
  if (!navigator.geolocation) {
   toast.error("Geolocation is not supported by your browser");
   return;
  }

  toast.info("Fetching current coordinates...");
  navigator.geolocation.getCurrentPosition(
   (position) => {
    setLatitude(position.coords.latitude.toString());
    setLongitude(position.coords.longitude.toString());
    toast.success("Coordinates updated!");
   },
   (error) => {
    let message = error.message;
    if (error instanceof GeolocationPositionError) {
     switch (error.code) {
      case error.PERMISSION_DENIED:
       message = "Location access denied. Please enable location permissions.";
       break;
      case error.POSITION_UNAVAILABLE:
       message = "Location information is unavailable.";
       break;
      case error.TIMEOUT:
       message = "Location request timed out.";
       break;
     }
    }
    toast.error("Failed to get location: " + message);
   },
   { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
 };

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
   if (!canEdit) throw new Error("Access Denied: You do not have permission to update center settings.");
   const { error } = await supabase
    .from("centers")
    .update({
     name,
     address: address || null,
     phone: phone || null,
     email: email || null,
     contact_person: contactPerson || null,
     logo_url: logoUrl || null,
     short_code: shortCode || null,
     latitude: latitude ? parseFloat(latitude) : null,
     longitude: longitude ? parseFloat(longitude) : null,
     radius_meters: radiusMeters ? parseInt(radiusMeters) : 100,
     theme: theme as unknown as Json } )
    .eq("id", user.center_id);
   if (error) throw error;
   // Apply theme after saving
   applyTheme(theme);
  },
  onSuccess: () => {
   queryClient.invalidateQueries({ queryKey: ["center-details"] });
   toast.success("Center settings updated successfully!");
  },
  onError: (error: Error) => {
   toast.error(error.message || "Failed to update settings");
  } });

 const handlePasswordChange = async (e: React.FormEvent) => {
  e.preventDefault();
  setPasswordLoading(true);

  if (!user) {
   toast.error('User not logged in.');
   setPasswordLoading(false);
   return;
  }

  if (newPassword !== confirmNewPassword) {
   toast.error('New passwords do not match.');
   setPasswordLoading(false);
   return;
  }

  if (newPassword.length < 6) {
   toast.error('New password must be at least 6 characters long.');
   setPasswordLoading(false);
   return;
  }

  try {
   const { data: userData, error: fetchError } = await supabase
    .from('users')
    .select('password_hash')
    .eq('id', user.id)
    .single();

   if (fetchError || !userData) throw new Error('Failed to fetch user data.');

   const passwordMatch = await bcrypt.compare(oldPassword, userData.password_hash);
   if (!passwordMatch) {
    toast.error('Old password is incorrect.');
    setPasswordLoading(false);
    return;
   }

   const hashedPassword = await bcrypt.hash(newPassword, 12);
   const { error: updateError } = await supabase
    .from('users')
    .update({ password_hash: hashedPassword, updated_at: new Date().toISOString() })
    .eq('id', user.id);

   if (updateError) throw updateError;

   toast.success('Password changed successfully. Please log in again.');
   setTimeout(() => logout(), 2000);
  } catch (error) {
   logger.error('Password change error:', error);
   const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
   toast.error(errorMessage || 'Failed to change password.');
  } finally {
   setPasswordLoading(false);
  }
 };

 if (isLoading) {
  return <div className="p-6">Loading settings...</div>;
 }

 return (
  <div className="space-y-8 animate-in fade-in duration-1000 max-w-full overflow-x-hidden">
   <Tabs defaultValue={defaultTab} className="space-y-8 w-full">
    <TabsList className="bg-white border border-border/40 p-1.5 rounded-2xl h-14 shadow-sm w-full justify-start overflow-x-auto no-scrollbar">
     <TabsTrigger value="general" className="rounded-xl px-8 font-black uppercase text-[10px] tracking-widest data-[state=active]:shadow-sm">General</TabsTrigger>
     <TabsTrigger value="payroll" className="rounded-xl px-8 font-black uppercase text-[10px] tracking-widest data-[state=active]:shadow-sm">Payroll Config</TabsTrigger>
     <TabsTrigger value="academic" className="rounded-xl px-8 font-black uppercase text-[10px] tracking-widest data-[state=active]:shadow-sm">Academic Cycles</TabsTrigger>
     <TabsTrigger value="communication" className="rounded-xl px-8 font-black uppercase text-[10px] tracking-widest data-[state=active]:shadow-sm">Communication</TabsTrigger>
     <TabsTrigger value="header" className="rounded-xl px-8 font-black uppercase text-[10px] tracking-widest data-[state=active]:shadow-sm">Header Edit</TabsTrigger>
     <TabsTrigger value="compliance" className="rounded-xl px-8 font-black uppercase text-[10px] tracking-widest data-[state=active]:shadow-sm">Compliance</TabsTrigger>
     <TabsTrigger value="requirements" className="rounded-xl px-8 font-black uppercase text-[10px] tracking-widest data-[state=active]:shadow-sm">Requirements</TabsTrigger>
     <TabsTrigger value="suggestions" className="rounded-xl px-8 font-black uppercase text-[10px] tracking-widest data-[state=active]:shadow-sm">Suggestions</TabsTrigger>
     <TabsTrigger value="subscription" className="rounded-xl px-8 font-black uppercase text-[10px] tracking-widest data-[state=active]:shadow-sm">SaaS Plan</TabsTrigger>
    </TabsList>

    <TabsContent value="general" className="space-y-8 outline-none">
   <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
    <div className="space-y-1">
     <h1 className="text-3xl md:text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-violet-600">
      Center Control
     </h1>
     <div className="flex items-center gap-2">
      <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
      <p className="text-muted-foreground text-sm font-medium">Configure institutional parameters and visual identity.</p>
     </div>
    </div>
   </div>

   <div className="grid gap-8 lg:grid-cols-2">
    {/* Basic Information */}
    <Card className="border border-border shadow-sm overflow-hidden h-fit rounded-2xl bg-white border border-border/20">
     <CardHeader className="border-b border-muted/20 bg-primary/5 py-6">
      <CardTitle className="text-xl font-black flex items-center gap-3 text-foreground/90 uppercase tracking-widest">
       <div className="p-2 rounded-xl bg-primary/10">
        <Building className="h-6 w-6 text-primary" />
       </div>
       Identity Matrix
      </CardTitle>
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
       <Label htmlFor="shortCode">Center Short Code (for ID generation)</Label>
       <Input
        id="shortCode"
        value={shortCode}
        onChange={(e) => setShortCode(e.target.value)}
        placeholder="e.g., KTM"
       />
      </div>
     </CardContent>
    </Card>

    {/* Location Tracking Card */}
    <Card className="border border-border shadow-sm overflow-hidden h-fit rounded-2xl bg-white border border-border/20">
     <CardHeader className="border-b border-muted/20 bg-primary/5 py-6">
      <CardTitle className="text-xl font-black flex items-center gap-3 text-foreground/90 uppercase tracking-widest">
       <div className="p-2 rounded-xl bg-primary/10">
       <MapPin className="h-6 w-6 text-primary" />
       </div>
       Geofencing Protocols
      </CardTitle>
      <CardDescription className="font-medium">Define institutional perimeter for faculty attendance tracking.</CardDescription>
     </CardHeader>
     <CardContent className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
       <div className="space-y-2">
        <Label>Latitude</Label>
        <Input value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="0.0000" />
       </div>
       <div className="space-y-2">
        <Label>Longitude</Label>
        <Input value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="0.0000" />
       </div>
      </div>
      <div className="space-y-2">
       <Label>Geofence Radius (Meters)</Label>
       <Input type="number" value={radiusMeters} onChange={(e) => setRadiusMeters(e.target.value)} placeholder="100" />
       <p className="text-[10px] text-muted-foreground italic">Faculty must be within this range to mark attendance.</p>
      </div>
      <Button variant="outline" className="w-full rounded-xl gap-2 font-bold" onClick={getCurrentLocation}>
       <Locate className="h-4 w-4" />
       FETCH CURRENT COORDINATES
      </Button>
     </CardContent>
    </Card>

    {/* Logo & Branding */}
    <Card className="border border-border shadow-sm overflow-hidden h-fit rounded-2xl bg-white border border-border/20">
     <CardHeader className="border-b border-muted/20 bg-primary/5 py-6">
      <CardTitle className="text-xl font-black flex items-center gap-3 text-foreground/90 uppercase tracking-widest">
       <div className="p-2 rounded-xl bg-primary/10">
       <ImageIcon className="h-6 w-6 text-primary" />
       </div>
       Visual Assets
      </CardTitle>
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
            onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
             e.currentTarget.style.display = 'none';
          }}
         />
        </div>
       )}
      </div>
     </CardContent>
    </Card>

    {/* Personal Appearance Settings */}
    <Card className="lg:col-span-2 border border-border shadow-sm overflow-hidden rounded-2xl bg-white border border-border/20">
     <CardHeader className="border-b border-muted/20 bg-primary/5 py-6">
      <CardTitle className="text-xl font-black flex items-center gap-3 text-foreground/90 uppercase tracking-widest">
       <div className="p-2 rounded-xl bg-primary/10">
        <Palette className="h-6 w-6 text-primary" />
       </div>
       Personal Appearance
      </CardTitle>
      <CardDescription className="font-medium">Customize your own viewing experience</CardDescription>
     </CardHeader>
     <CardContent className="pt-6">
      <ThemeSelector />
     </CardContent>
    </Card>

    {/* Global Institution Theme (Admin Only) */}
    <Card className="lg:col-span-2 border border-border shadow-sm overflow-hidden rounded-2xl bg-white border border-border/20">
     <CardHeader className="border-b border-muted/20 bg-primary/5 py-6">
      <CardTitle className="text-xl font-black flex items-center gap-3 text-foreground/90 uppercase tracking-widest">
       <div className="p-2 rounded-xl bg-primary/10">
        <Settings className="h-6 w-6 text-primary" />
       </div>
       Institutional Branding Override
      </CardTitle>
      <CardDescription className="font-medium">Set the default color palette for all institutional users</CardDescription>
     </CardHeader>
     <CardContent className="pt-6">
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
      </div>

      {/* Theme Preview */}
      <div className="mt-8 p-6 border-2 border-dashed rounded-2xl bg-slate-50/50">
       <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Preview Synthesis</p>
       <div className="flex rounded-2xl overflow-hidden h-32 shadow-sm border border-white">
        <div
         className="w-20 p-3"
         style={{ backgroundColor: theme.sidebar }}
        >
         <div className="w-full h-4 rounded-lg mb-3" style={{ backgroundColor: theme.primary }} />
         <div className="w-full h-2 rounded-full mb-2 bg-white" />
         <div className="w-full h-2 rounded-full mb-2 bg-white" />
         <div className="w-full h-2 rounded-full bg-white" />
        </div>
        <div
         className="flex-1 p-4"
         style={{ backgroundColor: theme.background }}
        >
         <div
          className="w-24 h-8 rounded-xl mb-3"
          style={{ backgroundColor: theme.primary }}
         />
         <div className="w-full h-3 rounded-full mb-2 bg-slate-200" />
         <div className="w-3/4 h-3 rounded-full bg-slate-200" />
        </div>
       </div>
      </div>
     </CardContent>
    </Card>

    {/* Security Settings */}
    <Card className="lg:col-span-2 border border-border shadow-sm overflow-hidden rounded-2xl bg-white border border-border/20">
     <CardHeader className="border-b border-muted/20 bg-primary/5 py-6">
      <CardTitle className="text-xl font-black flex items-center gap-3 text-foreground/90 uppercase tracking-widest">
       <div className="p-2 rounded-xl bg-primary/10">
        <ShieldCheck className="h-6 w-6 text-primary" />
       </div>
       Security Protocols
      </CardTitle>
      <CardDescription className="font-medium text-slate-500">Update your access keys and authentication credentials</CardDescription>
     </CardHeader>
     <CardContent className="p-6 md:p-8">
      <form onSubmit={handlePasswordChange} className="max-w-md space-y-6">
       <div className="space-y-2">
        <Label htmlFor="oldPassword">Current Access Key</Label>
        <Input
         id="oldPassword"
         type="password"
         value={oldPassword}
         onChange={(e) => setOldPassword(e.target.value)}
         required
         disabled={passwordLoading}
         className="h-12 rounded-xl bg-white"
         placeholder="••••••••"
        />
       </div>
       <div className="space-y-2">
        <Label htmlFor="newPassword">New Identity Token</Label>
        <Input
         id="newPassword"
         type="password"
         value={newPassword}
         onChange={(e) => setNewPassword(e.target.value)}
         required
         disabled={passwordLoading}
         className="h-12 rounded-xl bg-white"
         placeholder="Minimum 6 characters"
        />
       </div>
       <div className="space-y-2">
        <Label htmlFor="confirmNewPassword">Verify New Token</Label>
        <Input
         id="confirmNewPassword"
         type="password"
         value={confirmNewPassword}
         onChange={(e) => setConfirmNewPassword(e.target.value)}
         required
         disabled={passwordLoading}
         className="h-12 rounded-xl bg-white"
         placeholder="Re-enter new token"
        />
       </div>
       <Button type="submit" className="h-12 px-8 rounded-xl font-black uppercase tracking-widest text-[10px]" disabled={passwordLoading}>
        {passwordLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> SYNCHRONIZING...</> : <><Save className="h-4 w-4 mr-2" /> UPDATE CREDENTIALS</>}
       </Button>
      </form>
     </CardContent>
    </Card>
   </div>

   {/* Save Button */}
   <div className="flex flex-col sm:flex-row justify-end gap-4">
    <Button
     variant="outline"
     size="lg"
     className="rounded-2xl border-2 h-14 px-8 font-black uppercase text-xs tracking-widest"
     onClick={() => {
      const defaultTheme: CenterTheme = {
       primary: "#6366f1",
       background: "#ffffff",
       sidebar: "#1e293b",
       foreground: "#1e293b",
       cardBackground: "#ffffff",
       mutedForeground: "#64748b" };
      setTheme(defaultTheme);
      // Remove all inline CSS overrides to restore stylesheet defaults
      const root = document.documentElement;
      root.style.removeProperty('--primary');
      root.style.removeProperty('--background');
      root.style.removeProperty('--sidebar-background');
      root.style.removeProperty('--sidebar-foreground');
      root.style.removeProperty('--foreground');
      root.style.removeProperty('--card');
      root.style.removeProperty('--muted-foreground');
      toast.success("Default theme restored. Click Save to persist.");
     }}
    >
     Reset to Default Theme
    </Button>
    <Button
     onClick={() => updateCenterMutation.mutate()}
     disabled={!name || updateCenterMutation.isPending}
     size="lg"
     className="rounded-2xl shadow-sm h-14 px-10 font-black uppercase text-xs tracking-widest bg-gradient-to-r from-primary to-violet-600 hover:scale-[1.02] transition-all"
    >
     {updateCenterMutation.isPending ? (
      <div className="flex items-center gap-3">
       <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
       <span>COMMITTING...</span>
      </div>
     ) : (
      <>
       <Save className="h-4 w-4 mr-2" />
       SYNCHRONIZE SETTINGS
      </>
     )}
    </Button>
   </div>
    </TabsContent>

    <TabsContent value="communication" className="outline-none">
     <NotificationSettings centerId={user?.center_id || ""} />
    </TabsContent>

    <TabsContent value="academic" className="outline-none">
     <AcademicYearManagement centerId={user?.center_id || ""} />
    </TabsContent>

    <TabsContent value="compliance" className="outline-none">
     <RegulatoryReports centerId={user?.center_id || ""} />
    </TabsContent>

    <TabsContent value="payroll" className="outline-none">
     <Card className="border border-border shadow-sm rounded-2xl bg-white border border-border/20 overflow-hidden">
      <CardHeader className="border-b border-muted/20 bg-primary/5 py-6">
       <CardTitle className="text-xl font-black flex items-center gap-3">
        <div className="p-2 rounded-xl bg-primary/10">
         <KeyRound className="h-6 w-6 text-primary" />
        </div>
        Payroll & Taxation Logic
       </CardTitle>
       <CardDescription className="font-medium">Define tax slabs and late penalty protocols.</CardDescription>
      </CardHeader>
      <CardContent className="p-8">
       <PayrollSettings centerId={user?.center_id || ""} canEdit={canEdit} />
      </CardContent>
     </Card>
    </TabsContent>

    <TabsContent value="requirements" className="outline-none">
     <CenterRequirements centerId={user?.center_id || ""} />
    </TabsContent>

    <TabsContent value="suggestions" className="outline-none">
     <CenterSuggestions centerId={user?.center_id || ""} />
    </TabsContent>

    <TabsContent value="header" className="outline-none">
     <HeaderSettings centerId={user?.center_id || ""} />
    </TabsContent>

    <TabsContent value="subscription" className="outline-none">
      <SubscriptionPlans />
    </TabsContent>

   </Tabs>
  </div>
 );
}
