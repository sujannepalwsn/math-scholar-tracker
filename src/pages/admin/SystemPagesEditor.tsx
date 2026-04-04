import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { FileText, Save, Loader2, Shield, HelpCircle, Wallet, Image as ImageIcon, Upload } from "lucide-react";
import { compressImage } from "@/lib/image-utils";

export default function SystemPagesEditor() {
 const queryClient = useQueryClient();
 const [activeSlug, setActiveSlug] = useState("privacy");

 const { data: pages, isLoading: pagesLoading } = useQuery({
  queryKey: ["admin-system-pages"],
  queryFn: async () => {
   const { data, error } = await supabase.from("system_pages").select("*");
   if (error) throw error;
   return data;
  },
 });

 const currentPage = pages?.find(p => p.slug === activeSlug) || {
  slug: activeSlug,
  title: activeSlug === 'privacy' ? 'Privacy Policy' : activeSlug === 'terms' ? 'Terms of Service' : 'Support',
  content: ""
 };

 const [editTitle, setEditTitle] = useState("");
 const [editContent, setEditContent] = useState("");

 // Platform Settings State
 const { data: platformSettings, isLoading: settingsLoading } = useQuery({
  queryKey: ["platform-settings", "saas_payment_details"],
  queryFn: async () => {
   const { data, error } = await supabase.from("platform_settings").select("*").eq("key", "saas_payment_details").single();
   if (error) throw error;
   return data;
  },
 });

 const [paymentDetails, setPaymentDetails] = useState<any>({
  bank_details: "",
  esewa_qr_url: "",
  khalti_qr_url: "",
  payment_instructions: ""
 });

 React.useEffect(() => {
  if (platformSettings) {
   setPaymentDetails(platformSettings.value);
  }
 }, [platformSettings]);

 // Update local state when page changes or loads
 React.useEffect(() => {
  if (currentPage) {
   setEditTitle(currentPage.title);
   setEditContent(currentPage.content);
  }
 }, [activeSlug, pages]);

 const saveMutation = useMutation({
  mutationFn: async () => {
   const { error } = await supabase
    .from("system_pages")
    .upsert({
     slug: activeSlug,
     title: editTitle,
     content: editContent,
     updated_at: new Date().toISOString()
    }, { onConflict: 'slug' });
   if (error) throw error;
  },
  onSuccess: () => {
   queryClient.invalidateQueries({ queryKey: ["admin-system-pages"] });
   toast.success(`${editTitle} updated successfully`);
  },
  onError: (error: any) => toast.error(error.message),
 });

 const saveSettingsMutation = useMutation({
  mutationFn: async () => {
   const { error } = await supabase
    .from("platform_settings")
    .upsert({
     key: "saas_payment_details",
     value: paymentDetails,
     updated_at: new Date().toISOString()
    }, { onConflict: 'key' });
   if (error) throw error;
  },
  onSuccess: () => {
   queryClient.invalidateQueries({ queryKey: ["platform-settings"] });
   toast.success("SaaS payment details updated");
  },
  onError: (error: any) => toast.error(error.message),
 });

 const handleQRUpload = async (method: 'esewa' | 'khalti', file: File) => {
  const toastId = toast.loading(`Uploading ${method} QR...`);
  try {
   const compressedFile = await compressImage(file, 80);
   const fileExt = file.name.split('.').pop();
   const fileName = `platform/qr-${method}-${Date.now()}.${fileExt}`;

   const { error: uploadError } = await supabase.storage
    .from('center-backgrounds')
    .upload(fileName, compressedFile);

   if (uploadError) throw uploadError;

   const { data: { publicUrl } } = supabase.storage
    .from('center-backgrounds')
    .getPublicUrl(fileName);

   setPaymentDetails({ ...paymentDetails, [`${method}_qr_url`]: publicUrl });
   toast.dismiss(toastId);
   toast.success(`${method} QR uploaded!`);
  } catch (error: any) {
   toast.dismiss(toastId);
   toast.error("Upload failed: " + error.message);
  }
 };

 if (pagesLoading || settingsLoading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin" /></div>;

 return (
  <div className="space-y-8 animate-in fade-in duration-1000">
   <div className="space-y-1">
    <h1 className="text-4xl font-black tracking-tight text-foreground uppercase">System Pages Editor</h1>
    <p className="text-muted-foreground font-medium">Manage legal and support content for the public landing page.</p>
   </div>

   <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
    <Card className="lg:col-span-1 border border-border shadow-sm rounded-2xl bg-white h-fit">
     <CardHeader>
      <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-400">Navigation</CardTitle>
     </CardHeader>
     <CardContent className="space-y-2">
      {[
       { slug: 'privacy', label: 'Privacy Policy', icon: Shield },
       { slug: 'terms', label: 'Terms of Service', icon: FileText },
       { slug: 'support', label: 'Support Info', icon: HelpCircle },
       { slug: 'payment', label: 'Payment Details', icon: Wallet },
      ].map((item) => (
       <Button
        key={item.slug}
        variant={activeSlug === item.slug ? "default" : "ghost"}
        onClick={() => setActiveSlug(item.slug)}
        className="w-full justify-start rounded-xl font-bold gap-3"
       >
        <item.icon className="h-4 w-4" />
        {item.label}
       </Button>
      ))}
     </CardContent>
    </Card>

    {activeSlug === 'payment' ? (
     <Card className="lg:col-span-3 border border-border shadow-sm rounded-2xl overflow-hidden">
       <CardHeader className="border-b bg-muted/30">
        <CardTitle className="text-2xl font-black tracking-tight">SaaS Payment Configuration</CardTitle>
        <CardDescription>Configure the details shown to customers during the SaaS booking process.</CardDescription>
       </CardHeader>
       <CardContent className="p-8 space-y-8">
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-6">
           <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Bank Account Details</Label>
            <Textarea
             value={paymentDetails.bank_details}
             onChange={(e) => setPaymentDetails({...paymentDetails, bank_details: e.target.value})}
             className="min-h-[120px] rounded-2xl font-bold"
             placeholder="Bank Name, Account Number, Holder Name..."
            />
           </div>
           <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">General Payment Instructions</Label>
            <Textarea
             value={paymentDetails.payment_instructions}
             onChange={(e) => setPaymentDetails({...paymentDetails, payment_instructions: e.target.value})}
             className="min-h-[100px] rounded-2xl"
             placeholder="Instructions shown below payment options..."
            />
           </div>
          </div>

          <div className="space-y-6">
           <div className="grid grid-cols-2 gap-4">
             {['esewa', 'khalti'].map((method: any) => (
              <div key={method} className="space-y-3">
               <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">{method.toUpperCase()} QR CODE</Label>
               <div className="aspect-square rounded-2xl bg-slate-100 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center relative overflow-hidden group">
                 {paymentDetails[`${method}_qr_url`] ? (
                  <>
                   <img src={paymentDetails[`${method}_qr_url`]} className="w-full h-full object-cover" />
                   <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button variant="outline" size="sm" className="text-white border-white bg-transparent" asChild>
                      <label className="cursor-pointer">
                       Change
                       <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleQRUpload(method, e.target.files[0])} />
                      </label>
                    </Button>
                   </div>
                  </>
                 ) : (
                  <label className="flex flex-col items-center cursor-pointer p-4 text-center">
                   <ImageIcon className="h-8 w-8 text-slate-300 mb-2" />
                   <span className="text-[9px] font-bold text-slate-400 uppercase">Upload QR</span>
                   <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleQRUpload(method, e.target.files[0])} />
                  </label>
                 )}
               </div>
              </div>
             ))}
           </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
         <Button
          onClick={() => saveSettingsMutation.mutate()}
          disabled={saveSettingsMutation.isPending}
          className="h-12 px-10 rounded-2xl font-black uppercase text-xs tracking-widest bg-indigo-600 text-white shadow-lg"
         >
          {saveSettingsMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Update Payment Vault
         </Button>
        </div>
       </CardContent>
     </Card>
    ) : (
     <Card className="lg:col-span-3 border border-border shadow-sm rounded-2xl overflow-hidden">
      <CardHeader className="border-b bg-muted/30">
       <CardTitle className="text-2xl font-black tracking-tight">Editing: {editTitle}</CardTitle>
       <CardDescription>Updates are reflected immediately on the public site.</CardDescription>
      </CardHeader>
      <CardContent className="p-8 space-y-6">
       <div className="space-y-2">
        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Page Title</Label>
        <Input
         value={editTitle}
         onChange={(e) => setEditTitle(e.target.value)}
         className="h-12 rounded-2xl font-bold text-lg"
        />
       </div>
       <div className="space-y-2">
        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Content (Plain Text or Markdown)</Label>
        <Textarea
         value={editContent}
         onChange={(e) => setEditContent(e.target.value)}
         className="min-h-[500px] rounded-2xl font-medium leading-relaxed resize-none"
         placeholder="Write your page content here..."
        />
       </div>
       <div className="flex justify-end pt-4">
        <Button
         onClick={() => saveMutation.mutate()}
         disabled={saveMutation.isPending}
         className="h-12 px-10 rounded-2xl font-black uppercase text-xs tracking-widest bg-slate-900 text-white shadow-lg"
        >
         {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
         Publish Changes
        </Button>
       </div>
      </CardContent>
     </Card>
    )}
   </div>
  </div>
 );
}
