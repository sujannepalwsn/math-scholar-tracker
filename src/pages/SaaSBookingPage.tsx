import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2, ArrowLeft, ShieldCheck, CreditCard,
  Wallet, Building2, CheckCircle2, ChevronRight,
  Info, AlertCircle, Upload, ImageIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function SaaSBookingPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const planName = searchParams.get("plan") || "Premium";

  const { data: plan, isLoading: planLoading } = useQuery({
    queryKey: ["booking-plan", planName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .ilike("name", planName)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: platformSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ["platform-settings", "saas_payment_details"],
    queryFn: async () => {
      const { data, error } = await supabase.from("platform_settings").select("*").eq("key", "saas_payment_details").maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [formData, setFormData] = React.useState({
    fullName: "",
    institutionName: "",
    email: "",
    phone: "",
    address: ""
  });

  const [selectedMethod, setSelectedMethod] = React.useState<string | null>(null);
  const [proofFile, setProofFile] = React.useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const paymentDetails = platformSettings?.value || {};

  const handleBooking = async () => {
    if (!formData.fullName || !formData.institutionName || !formData.email || !formData.phone) {
       toast.error("Please complete the registration form first");
       return;
    }
    if (!selectedMethod) {
      toast.error("Please select a payment method");
      return;
    }
    setIsSubmitting(true);

    try {
      // 1. Upload proof file if exists
      let proofUrl = null;
      if (proofFile) {
        const fileExt = proofFile.name.split('.').pop();
        const fileName = `subs/proof-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('center-backgrounds')
          .upload(fileName, proofFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('center-backgrounds')
          .getPublicUrl(fileName);
        proofUrl = publicUrl;
      }

      // 2. Create subscription request record
      // Note: We don't have a center_id yet because the user hasn't registered a center
      // In this flow, we likely need to either:
      // a) Redirect to a "Create Center" form first
      // b) Store this booking as a "Lead" or "Pending Creation"
      // Looking at the prompt: "Allows visitor to make payment"

      // Let's create a record in a new table 'saas_bookings' or similar if it exists
      // If not, we will log it as a demo request with payment proof for now
      // or just show a success message since we are a visitor.

      const { error: bookingError } = await supabase.from('saas_bookings').insert({
        full_name: formData.fullName,
        email: formData.email,
        institution_name: formData.institutionName,
        phone: formData.phone,
        address: formData.address,
        plan_name: planName,
        payment_method: selectedMethod,
        payment_proof_url: proofUrl,
        status: 'pending'
      });

      if (bookingError) throw bookingError;

      toast.success("Subscription requested! Our team will contact you for institutional setup after verification.");
      navigate("/");
    } catch (error: any) {
      toast.error("Booking failed: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (planLoading || settingsLoading) return <div className="flex items-center justify-center min-h-screen bg-slate-950"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-indigo-100 selection:text-indigo-600">
      {/* Navbar */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
             <div className="p-1.5 rounded-lg bg-indigo-600">
               <ShieldCheck className="h-5 w-5 text-white" />
             </div>
             <span className="font-black tracking-tighter text-xl uppercase">EDU<span className="text-indigo-600">FLOW</span></span>
          </Link>
          <div className="flex items-center gap-4">
             <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 hidden sm:block">Secure Checkout</span>
             <Button variant="outline" onClick={() => navigate(-1)} className="rounded-full font-bold">Cancel</Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-6xl">
        <div className="grid lg:grid-cols-3 gap-12">
           {/* Booking Form & Options */}
           <div className="lg:col-span-2 space-y-8">
              <div className="space-y-2">
                 <h1 className="text-4xl font-black tracking-tight">Complete Your Subscription</h1>
                 <p className="text-slate-500 font-medium">Secure your institution's digital infrastructure with the {plan?.name} plan.</p>
              </div>

              <Card className="rounded-[2.5rem] border-none shadow-strong overflow-hidden">
                 <CardHeader className="bg-slate-50 border-b p-8">
                    <CardTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
                       <ShieldCheck className="h-6 w-6 text-indigo-600" />
                       Institution Registry
                    </CardTitle>
                 </CardHeader>
                 <CardContent className="p-8 space-y-6">
                    <div className="grid sm:grid-cols-2 gap-6">
                       <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Full Name of Applicant</Label>
                          <Input
                            value={formData.fullName}
                            onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                            placeholder="e.g. John Doe"
                            className="h-12 rounded-2xl bg-slate-50 border-none shadow-inner"
                          />
                       </div>
                       <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Institution Name</Label>
                          <Input
                            value={formData.institutionName}
                            onChange={(e) => setFormData({...formData, institutionName: e.target.value})}
                            placeholder="e.g. Evergreen Academy"
                            className="h-12 rounded-2xl bg-slate-50 border-none shadow-inner"
                          />
                       </div>
                       <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Official Email</Label>
                          <Input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                            placeholder="admin@institution.com"
                            className="h-12 rounded-2xl bg-slate-50 border-none shadow-inner"
                          />
                       </div>
                       <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Contact Number</Label>
                          <Input
                            value={formData.phone}
                            onChange={(e) => setFormData({...formData, phone: e.target.value})}
                            placeholder="98XXXXXXXX"
                            className="h-12 rounded-2xl bg-slate-50 border-none shadow-inner"
                          />
                       </div>
                    </div>
                    <div className="space-y-2">
                       <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Physical Address</Label>
                       <Input
                         value={formData.address}
                         onChange={(e) => setFormData({...formData, address: e.target.value})}
                         placeholder="Street, City, State"
                         className="h-12 rounded-2xl bg-slate-50 border-none shadow-inner"
                       />
                    </div>
                 </CardContent>
              </Card>

              <Card className="rounded-[2.5rem] border-none shadow-strong overflow-hidden">
                 <CardHeader className="bg-slate-50 border-b p-8">
                    <CardTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
                       <Wallet className="h-6 w-6 text-indigo-600" />
                       Select Payment Vector
                    </CardTitle>
                 </CardHeader>
                 <CardContent className="p-8 space-y-8">
                    <div className="grid sm:grid-cols-2 gap-4">
                       {[
                         { id: 'esewa', name: 'eSewa', desc: 'Instant Digital Transfer', color: 'bg-[#60bb46]' },
                         { id: 'khalti', name: 'Khalti', desc: 'Secure Mobile Wallet', color: 'bg-[#5c2d91]' },
                         { id: 'bank', name: 'Bank Transfer', desc: 'Direct Banking Network', color: 'bg-slate-900' },
                         { id: 'card', name: 'Credit/Debit Card', desc: 'International Gateway', color: 'bg-indigo-600' },
                       ].map((method) => (
                         <button
                           key={method.id}
                           onClick={() => setSelectedMethod(method.id)}
                           className={cn(
                             "flex flex-col items-start p-6 rounded-3xl border-2 transition-all text-left group",
                             selectedMethod === method.id ? "border-indigo-600 bg-indigo-50 shadow-md scale-[1.02]" : "border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30"
                           )}
                         >
                            <div className={cn("h-10 w-10 rounded-xl mb-4 flex items-center justify-center text-white", method.color)}>
                               {method.id === 'bank' ? <Building2 className="h-5 w-5" /> : <CreditCard className="h-5 w-5" />}
                            </div>
                            <h3 className="font-black text-lg group-hover:text-indigo-600">{method.name}</h3>
                            <p className="text-xs text-slate-500 font-medium">{method.desc}</p>
                         </button>
                       ))}
                    </div>

                    <AnimatePresence mode="wait">
                       {selectedMethod && (
                          <motion.div
                             initial={{ opacity: 0, y: 10 }}
                             animate={{ opacity: 1, y: 0 }}
                             exit={{ opacity: 0, y: -10 }}
                             className="p-8 rounded-[2rem] bg-slate-900 text-white space-y-6"
                          >
                             {selectedMethod === 'bank' && (
                               <div className="space-y-4">
                                  <div className="flex items-center gap-3 text-indigo-400">
                                     <Building2 className="h-6 w-6" />
                                     <h4 className="font-black uppercase tracking-widest text-xs">Bank Account Repository</h4>
                                  </div>
                                  <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                                     <pre className="font-mono text-sm whitespace-pre-wrap text-slate-300">
                                        {paymentDetails.bank_details || "Bank details pending configuration."}
                                     </pre>
                                  </div>
                               </div>
                             )}

                             {(selectedMethod === 'esewa' || selectedMethod === 'khalti') && (
                               <div className="flex flex-col md:flex-row gap-8 items-center">
                                  <div className="shrink-0 space-y-4 text-center">
                                     <div className="flex items-center justify-center gap-3 text-indigo-400">
                                        <div className={cn("h-3 w-3 rounded-full animate-pulse", selectedMethod === 'esewa' ? "bg-[#60bb46]" : "bg-[#5c2d91]")} />
                                        <h4 className="font-black uppercase tracking-widest text-xs">{selectedMethod.toUpperCase()} PAYPOINT</h4>
                                     </div>
                                     <div className="w-48 h-48 bg-white rounded-3xl p-3 shadow-2xl flex items-center justify-center overflow-hidden">
                                        {paymentDetails[`${selectedMethod}_qr_url`] ? (
                                           <img src={paymentDetails[`${selectedMethod}_qr_url`]} className="w-full h-full object-contain" />
                                        ) : (
                                           <div className="text-slate-300 flex flex-col items-center">
                                              <ImageIcon className="h-10 w-10 mb-2 opacity-20" />
                                              <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">QR NOT FOUND</span>
                                           </div>
                                        )}
                                     </div>
                                  </div>
                                  <div className="flex-1 space-y-4">
                                     <h5 className="font-black text-lg">Scan to Pay Instantly</h5>
                                     <p className="text-slate-400 text-sm leading-relaxed">
                                        Use your mobile wallet application to scan the QR code and execute the transaction.
                                        Please ensure the amount matches your plan total.
                                     </p>
                                  </div>
                               </div>
                             )}

                             {selectedMethod === 'card' && (
                               <div className="text-center py-6 space-y-4">
                                  <div className="p-4 rounded-full bg-white/10 w-fit mx-auto"><CreditCard className="h-8 w-8 text-indigo-400" /></div>
                                  <h4 className="font-black text-xl">Online Checkout</h4>
                                  <p className="text-slate-400 text-sm max-w-sm mx-auto">You will be redirected to our secure payment processor (Stripe/Razorpay) to complete the transaction.</p>
                               </div>
                             )}

                             <div className="pt-6 border-t border-white/10 space-y-4">
                                <Label className="text-[10px] font-black uppercase text-indigo-300 tracking-[0.2em] ml-1">Upload Payment Evidence</Label>
                                <div className="relative group">
                                   <input
                                     type="file"
                                     className="hidden"
                                     id="proof-upload"
                                     accept="image/*,.pdf"
                                     onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                                   />
                                   <label
                                     htmlFor="proof-upload"
                                     className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border-2 border-dashed border-white/20 hover:border-indigo-500 cursor-pointer transition-all"
                                   >
                                      <div className="flex items-center gap-3">
                                         <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400"><Upload className="h-5 w-5" /></div>
                                         <span className="text-sm font-bold text-slate-300">{proofFile ? proofFile.name : "Select Screenshot / Statement"}</span>
                                      </div>
                                      <Badge variant="outline" className="border-white/20 text-white font-black uppercase text-[9px]">{proofFile ? "Ready" : "Required"}</Badge>
                                   </label>
                                </div>
                             </div>
                          </motion.div>
                       )}
                    </AnimatePresence>

                    <div className="p-6 rounded-3xl bg-amber-50 border border-amber-100 flex gap-4">
                       <Info className="h-6 w-6 text-amber-600 shrink-0" />
                       <div className="space-y-1">
                          <p className="font-bold text-amber-900 text-sm">Automated Activation</p>
                          <p className="text-xs text-amber-700 leading-relaxed font-medium">
                             Upon successful payment verification, your institutional dashboard and all {plan?.name} modules will be activated automatically within 5-10 minutes.
                          </p>
                       </div>
                    </div>

                    <Button
                      onClick={handleBooking}
                      disabled={!selectedMethod || isSubmitting}
                      className="w-full h-16 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg shadow-xl shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                       {isSubmitting ? <Loader2 className="h-6 w-6 animate-spin" /> : "PROCEED TO SECURE PAYMENT"}
                    </Button>
                 </CardContent>
              </Card>

              <div className="flex items-center justify-center gap-8 opacity-40 grayscale">
                 <img src="https://cdn.worldvectorlogo.com/logos/visa-10.svg" className="h-8" alt="Visa" />
                 <img src="https://cdn.worldvectorlogo.com/logos/mastercard-2.svg" className="h-8" alt="Mastercard" />
                 <img src="https://khalti.com/static/resources/img/khalti-logo.png" className="h-6" alt="Khalti" />
              </div>
           </div>

           {/* Plan Summary Card */}
           <div className="lg:col-span-1">
              <div className="sticky top-28 space-y-6">
                 <Card className="rounded-[2.5rem] border-none shadow-strong overflow-hidden bg-white">
                    <CardHeader className="bg-indigo-600 text-white p-8">
                       <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-2">Order Summary</p>
                       <CardTitle className="text-3xl font-black tracking-tight">{plan?.name} Plan</CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 space-y-6">
                       <div className="space-y-4">
                          <div className="flex justify-between items-center text-sm">
                             <span className="text-slate-500 font-medium">Standard License</span>
                             <span className="font-black text-slate-700">NPR {plan?.original_price || plan?.price}</span>
                          </div>
                          {plan?.discount_amount && (
                            <div className="flex justify-between items-center text-sm">
                               <span className="text-emerald-600 font-bold">Introductory Discount</span>
                               <span className="font-black text-emerald-600">- NPR {plan.discount_amount}</span>
                            </div>
                          )}
                          <div className="pt-4 border-t flex justify-between items-baseline">
                             <span className="font-black text-slate-900">TOTAL DUE</span>
                             <span className="text-3xl font-black text-indigo-600">NPR {plan?.price}</span>
                          </div>
                       </div>

                       <div className="space-y-3 pt-4">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Included in {plan?.name}</p>
                          <ul className="space-y-2">
                             {['Full Administrative Suite', 'Teacher & Parent Portals', 'Advanced Reporting', '24/7 Priority Support'].map((f, i) => (
                               <li key={i} className="flex items-center gap-2 text-xs font-bold text-slate-600">
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                  {f}
                               </li>
                             ))}
                          </ul>
                       </div>
                    </CardContent>
                 </Card>

                 <div className="p-6 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center text-center gap-3">
                    <AlertCircle className="h-6 w-6 text-slate-400" />
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">
                       Need a custom package for a large university? <br/>
                       <Link to="/contact-sales" className="text-indigo-600 font-black underline underline-offset-4">Talk to Enterprise Sales</Link>
                    </p>
                 </div>
              </div>
           </div>
        </div>
      </main>
    </div>
  );
}
