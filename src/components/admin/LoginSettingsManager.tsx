import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Upload, Trash2, Image as ImageIcon, Plus, Info, HelpCircle, Code } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { compressImage } from "@/lib/image-utils";

const PAGE_TYPES = [
 { id: 'center', label: 'Center Portal' },
 { id: 'admin', label: 'Admin Portal' },
 { id: 'parent', label: 'Parent Portal' },
 { id: 'teacher', label: 'Teacher Portal' },
];

const LoginSettingsManager = () => {
 const queryClient = useQueryClient();
 const [activeTab, setActiveTab] = useState('center');

 const { data: settings, isLoading } = useQuery({
  queryKey: ['login_page_settings'],
  queryFn: async () => {
   const { data, error } = await supabase
    .from('login_page_settings')
    .select('*');
   if (error) throw error;
   return data;
  },
 });

 const updateMutation = useMutation({
  mutationFn: async (updatedSettings: any) => {
   const { page_type, ...rest } = updatedSettings;
   const { error } = await supabase
    .from('login_page_settings')
    .update(rest)
    .eq('page_type', page_type);
   if (error) throw error;
  },
  onSuccess: () => {
   queryClient.invalidateQueries({ queryKey: ['login_page_settings'] });
   toast.success("Settings updated successfully");
  },
  onError: (error: any) => {
   toast.error(`Error updating settings: ${error.message}`);
  },
 });

 const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'logo_url' | 'background_url' | 'background_urls', pageType: string, index?: number) => {
  const file = e.target.files?.[0];
  if (!file) return;

  try {
   let finalFile: File | Blob = file;
   if (file.type.startsWith('image/')) {
    finalFile = await compressImage(file, 100);
   }

   const fileExt = file.name.split('.').pop();
   const filePath = `${pageType}-${field}-${Math.random()}.${fileExt}`;

   const { error: uploadError } = await supabase.storage
    .from('login-assets')
    .upload(filePath, finalFile);

   if (uploadError) throw uploadError;

   const { data: { publicUrl } } = supabase.storage
    .from('login-assets')
    .getPublicUrl(filePath);

   if (field === 'background_urls') {
    const pageSettings = settings?.find(s => s.page_type === pageType);
    const currentUrls = pageSettings?.background_urls || [];
    const newUrls = [...currentUrls, publicUrl];
    updateMutation.mutate({ page_type: pageType, background_urls: newUrls });
   } else {
    updateMutation.mutate({ page_type: pageType, [field]: publicUrl });
   }
  } catch (error: any) {
   toast.error(`Upload failed: ${error.message}`);
  }
 };

 const removeBackgroundUrl = (pageType: string, index: number) => {
  const pageSettings = settings?.find(s => s.page_type === pageType);
  const currentUrls = [...(pageSettings?.background_urls || [])];
  currentUrls.splice(index, 1);
  updateMutation.mutate({ page_type: pageType, background_urls: currentUrls });
 };

 const addFeature = (pageType: string) => {
  const pageSettings = settings?.find(s => s.page_type === pageType);
  const features = Array.isArray(pageSettings?.features) ? [...(pageSettings.features as any[])] : [];
  features.push({ icon: 'Shield', title: 'New Feature', description: 'Feature description' });
  updateMutation.mutate({ page_type: pageType, features });
 };

 const updateFeature = (pageType: string, index: number, field: string, value: string) => {
  const pageSettings = settings?.find(s => s.page_type === pageType);
  const features = [...(pageSettings?.features as any[])];
  features[index] = { ...features[index], [field]: value };
  updateMutation.mutate({ page_type: pageType, features });
 };

 const removeFeature = (pageType: string, index: number) => {
  const pageSettings = settings?.find(s => s.page_type === pageType);
  const features = [...(pageSettings?.features as any[])];
  features.splice(index, 1);
  updateMutation.mutate({ page_type: pageType, features });
 };

 const updateJsonField = (pageType: string, field: 'developer_info' | 'help_info', subField: string, value: string) => {
  const pageSettings = settings?.find(s => s.page_type === pageType);
  const currentVal = (pageSettings?.[field] as any) || {};
  updateMutation.mutate({ page_type: pageType, [field]: { ...currentVal, [subField]: value } });
 };

 if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

 return (
  <div className="space-y-6 max-w-6xl mx-auto pb-20">
   <Card className="border border-border shadow-sm rounded-2xl bg-white border border-border/20 overflow-hidden">
    <CardHeader className="border-b border-muted/20 bg-primary/5 py-6">
     <CardTitle className="text-xl font-black flex items-center gap-3">
      <div className="p-2 rounded-xl bg-primary/10">
       <ImageIcon className="h-6 w-6 text-primary" />
      </div>
      Login Page Customization
     </CardTitle>
     <CardDescription>Configure the appearance and landing page content of various login portals.</CardDescription>
    </CardHeader>
    <CardContent className="p-6">
     <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
      <TabsList className="bg-muted/50 p-1 rounded-xl w-full justify-start overflow-x-auto">
       {PAGE_TYPES.map((type) => (
        <TabsTrigger key={type.id} value={type.id} className="rounded-lg px-6 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm whitespace-nowrap">
         {type.label}
        </TabsTrigger>
       ))}
      </TabsList>

      {PAGE_TYPES.map((type) => {
       const pageSettings = settings?.find(s => s.page_type === type.id);
       if (!pageSettings) return null;

       const features = Array.isArray(pageSettings.features) ? (pageSettings.features as any[]) : [];
       const devInfo = (pageSettings.developer_info as any) || {};
       const helpInfo = (pageSettings.help_info as any) || {};

       return (
        <TabsContent key={type.id} value={type.id} className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
         {/* Branding & Theme Section */}
         <section className="space-y-6">
          <div className="flex items-center gap-2 border-b pb-2">
           <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
            <Info className="h-4 w-4" />
           </div>
           <h3 className="text-lg font-bold">Branding & Theme</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <div className="space-y-6">
            <div className="space-y-2">
             <Label className="text-sm font-bold">Login Card Title</Label>
             <Input
              defaultValue={pageSettings.title}
              onBlur={(e) => updateMutation.mutate({ page_type: type.id, title: e.target.value })}
             />
            </div>
            <div className="space-y-2">
             <Label className="text-sm font-bold">Login Card Subtitle</Label>
             <Input
              defaultValue={pageSettings.subtitle || ''}
              onBlur={(e) => updateMutation.mutate({ page_type: type.id, subtitle: e.target.value })}
             />
            </div>
            <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
              <Label className="text-sm font-bold">Button Text</Label>
              <Input
               defaultValue={pageSettings.button_text || ''}
               onBlur={(e) => updateMutation.mutate({ page_type: type.id, button_text: e.target.value })}
              />
             </div>
             <div className="space-y-2">
              <Label className="text-sm font-bold">Username Label</Label>
              <Input
               defaultValue={pageSettings.username_label || ''}
               onBlur={(e) => updateMutation.mutate({ page_type: type.id, username_label: e.target.value })}
              />
             </div>
             <div className="space-y-2">
              <Label className="text-sm font-bold">Username Placeholder</Label>
              <Input
               defaultValue={pageSettings.username_placeholder || ''}
               onBlur={(e) => updateMutation.mutate({ page_type: type.id, username_placeholder: e.target.value })}
              />
             </div>
             <div className="space-y-2">
              <Label className="text-sm font-bold">Password Label</Label>
              <Input
               defaultValue={pageSettings.password_label || ''}
               onBlur={(e) => updateMutation.mutate({ page_type: type.id, password_label: e.target.value })}
              />
             </div>
             <div className="space-y-2">
              <Label className="text-sm font-bold">Password Placeholder</Label>
              <Input
               defaultValue={pageSettings.password_placeholder || ''}
               onBlur={(e) => updateMutation.mutate({ page_type: type.id, password_placeholder: e.target.value })}
              />
             </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
              <Label className="text-sm font-bold">Primary Theme Color</Label>
              <div className="flex gap-2">
               <Input
                type="color"
                className="w-12 p-1 h-10 cursor-pointer"
                defaultValue={pageSettings.primary_color || '#4f46e5'}
                onChange={(e) => updateMutation.mutate({ page_type: type.id, primary_color: e.target.value })}
               />
               <Input
                defaultValue={pageSettings.primary_color || ''}
                onBlur={(e) => updateMutation.mutate({ page_type: type.id, primary_color: e.target.value })}
               />
              </div>
             </div>
             <div className="space-y-2">
              <Label className="text-sm font-bold">Background Color</Label>
              <div className="flex gap-2">
               <Input
                type="color"
                className="w-12 p-1 h-10 cursor-pointer"
                defaultValue={pageSettings.background_color || '#f8fafc'}
                onChange={(e) => updateMutation.mutate({ page_type: type.id, background_color: e.target.value })}
               />
               <Input
                defaultValue={pageSettings.background_color || ''}
                onBlur={(e) => updateMutation.mutate({ page_type: type.id, background_color: e.target.value })}
               />
              </div>
             </div>
            </div>
           </div>

           <div className="space-y-4">
            <Label className="text-sm font-bold">Portal Logo</Label>
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-muted rounded-2xl p-6 bg-muted/20 hover:bg-muted/30 transition-colors">
             {pageSettings.logo_url ? (
              <div className="relative group mb-4">
               <img src={pageSettings.logo_url} alt="Logo" className="h-24 object-contain rounded-lg" />
               <button
                onClick={() => updateMutation.mutate({ page_type: type.id, logo_url: null })}
                className="absolute -top-2 -right-2 p-1.5 bg-destructive text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
               >
                <Trash2 className="h-4 w-4" />
               </button>
              </div>
             ) : (
              <div className="flex flex-col items-center gap-2 mb-4">
               <Upload className="h-10 w-10 text-muted-foreground" />
               <p className="text-xs text-muted-foreground">Upload custom logo (PNG/SVG recommended)</p>
              </div>
             )}
             <Input
              type="file"
              accept="image/*"
              className="max-w-xs"
              onChange={(e) => handleUpload(e, 'logo_url', type.id)}
             />
            </div>
           </div>
          </div>
         </section>

         {/* Marketing Content Section */}
         <section className="space-y-6">
          <div className="flex items-center gap-2 border-b pb-2">
           <div className="p-1.5 rounded-lg bg-orange-50 text-orange-600">
            <Plus className="h-4 w-4" />
           </div>
           <h3 className="text-lg font-bold">Landing Page Marketing</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <div className="space-y-6">
            <div className="space-y-2">
             <Label className="text-sm font-bold">Main Marketing Headline</Label>
             <Input
              placeholder="e.g. The Ultimate School Management Solution"
              defaultValue={pageSettings.marketing_title || ''}
              onBlur={(e) => updateMutation.mutate({ page_type: type.id, marketing_title: e.target.value })}
             />
            </div>
            <div className="space-y-2">
             <Label className="text-sm font-bold">Marketing Sub-headline</Label>
             <Textarea
              placeholder="e.g. Streamline your educational institution with our comprehensive ERP platform."
              defaultValue={pageSettings.marketing_subtitle || ''}
              onBlur={(e) => updateMutation.mutate({ page_type: type.id, marketing_subtitle: e.target.value })}
              className="min-h-[100px]"
             />
            </div>
           </div>

           <div className="space-y-4">
            <Label className="text-sm font-bold">Background Images Slider</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
             {pageSettings.background_urls?.map((url, idx) => (
              <div key={idx} className="relative aspect-video rounded-lg overflow-hidden border group">
               <img src={url} alt="BG" className="w-full h-full object-cover" />
               <button
                onClick={() => removeBackgroundUrl(type.id, idx)}
                className="absolute top-1 right-1 p-1 bg-destructive/80 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
               >
                <Trash2 className="h-3 w-3" />
               </button>
              </div>
             ))}
             <label className="aspect-video rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer hover:bg-muted/20 transition-colors">
              <Plus className="h-6 w-6 text-muted-foreground" />
              <span className="text-[10px] font-bold text-muted-foreground mt-1">ADD IMAGE</span>
              <input
               type="file"
               className="hidden"
               accept="image/*"
               onChange={(e) => handleUpload(e, 'background_urls', type.id)}
              />
             </label>
            </div>
           </div>
          </div>
         </section>

         {/* Features Section */}
         <section className="space-y-6">
          <div className="flex items-center justify-between border-b pb-2">
           <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
             <Info className="h-4 w-4" />
            </div>
            <h3 className="text-lg font-bold">Features Grid</h3>
           </div>
           <Button size="sm" onClick={() => addFeature(type.id)} className="rounded-xl h-8">
            <Plus className="h-4 w-4 mr-1" /> Add Feature
           </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
           {features.map((feature, idx) => (
            <Card key={idx} className="bg-muted/10 border-muted-foreground/10 relative">
             <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
               <Input
                placeholder="Icon name (e.g. Shield)"
                value={feature.icon}
                onChange={(e) => updateFeature(type.id, idx, 'icon', e.target.value)}
                className="h-8 text-xs font-bold"
               />
               <button
                onClick={() => removeFeature(type.id, idx)}
                className="p-1 text-destructive hover:bg-destructive/10 rounded"
               >
                <Trash2 className="h-4 w-4" />
               </button>
              </div>
              <Input
               placeholder="Feature Title"
               value={feature.title}
               onChange={(e) => updateFeature(type.id, idx, 'title', e.target.value)}
               className="h-9 font-bold"
              />
              <Textarea
               placeholder="Description"
               value={feature.description}
               onChange={(e) => updateFeature(type.id, idx, 'description', e.target.value)}
               className="text-xs resize-none"
              />
             </CardContent>
            </Card>
           ))}
           {features.length === 0 && (
            <div className="col-span-full py-12 text-center text-muted-foreground border-2 border-dashed rounded-2xl">
             No features added yet. Click "Add Feature" to start.
            </div>
           )}
          </div>
         </section>

         {/* Footer & Help Section */}
         <section className="space-y-6">
          <div className="flex items-center gap-2 border-b pb-2">
           <div className="p-1.5 rounded-lg bg-green-50 text-green-600">
            <Code className="h-4 w-4" />
           </div>
           <h3 className="text-lg font-bold">Footer & Help Info</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Code className="h-4 w-4 text-primary" />
              <h4 className="text-sm font-bold">Developer Information</h4>
            </div>
            <div className="grid grid-cols-1 gap-4 bg-muted/20 p-4 rounded-2xl border">
             <div className="space-y-2">
              <Label className="text-xs font-bold">Company/Developer Name</Label>
              <Input
               defaultValue={devInfo.name || ''}
               onBlur={(e) => updateJsonField(type.id, 'developer_info', 'name', e.target.value)}
              />
             </div>
             <div className="space-y-2">
              <Label className="text-xs font-bold">Website URL</Label>
              <Input
               defaultValue={devInfo.website || ''}
               onBlur={(e) => updateJsonField(type.id, 'developer_info', 'website', e.target.value)}
              />
             </div>
             <div className="space-y-2">
              <Label className="text-xs font-bold">Copyright Text</Label>
              <Input
               defaultValue={devInfo.copyright || ''}
               onBlur={(e) => updateJsonField(type.id, 'developer_info', 'copyright', e.target.value)}
              />
             </div>
            </div>
           </div>

           <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <HelpCircle className="h-4 w-4 text-primary" />
              <h4 className="text-sm font-bold">Help & Support</h4>
            </div>
            <div className="grid grid-cols-1 gap-4 bg-muted/20 p-4 rounded-2xl border">
             <div className="space-y-2">
              <Label className="text-xs font-bold">Help Link Text</Label>
              <Input
               defaultValue={helpInfo.text || ''}
               onBlur={(e) => updateJsonField(type.id, 'help_info', 'text', e.target.value)}
              />
             </div>
             <div className="space-y-2">
              <Label className="text-xs font-bold">Help URL / Link</Label>
              <Input
               defaultValue={helpInfo.link || ''}
               onBlur={(e) => updateJsonField(type.id, 'help_info', 'link', e.target.value)}
              />
             </div>
            </div>
           </div>
          </div>
         </section>
        </TabsContent>
       );
      })}
     </Tabs>
    </CardContent>
   </Card>
  </div>
 );
};

export default LoginSettingsManager;
