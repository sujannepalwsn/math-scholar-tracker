import React, { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import {
  Building2,
  Upload,
  Users,
  Zap,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  ImageIcon,
  GraduationCap,
  MessageSquare,
  Search,
  Plus,
  MapPin,
  Globe,
  DollarSign as DollarSignLucide,
  Package as PackageLucide
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const OnboardingWizard = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [searchParams] = useSearchParams();
  const plan = searchParams.get("plan") || "Free Trial";

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    schoolName: "",
    schoolLogo: null as File | null,
    location: "",
    website: "",
    adminName: "",
    adminEmail: "",
    adminPassword: "",
    studentCount: "0-100",
    modules: [] as string[]
  });

  const steps = [
    { id: 1, title: "School Profile", icon: <Building2 className="h-5 w-5" /> },
    { id: 2, title: "Administrator", icon: <ShieldCheck className="h-5 w-5" /> },
    { id: 3, title: "Configuration", icon: <Zap className="h-5 w-5" /> },
    { id: 4, title: "Finalize", icon: <CheckCircle2 className="h-5 w-5" /> }
  ];

  const nextStep = () => {
    if (currentStep < 4) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    if (!formData.schoolName || !formData.adminEmail || !formData.adminPassword) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      console.log("Invoking public-onboarding with data:", {
        schoolName: formData.schoolName,
        adminEmail: formData.adminEmail
      });

      const { data, error } = await supabase.functions.invoke('public-onboarding', {
        body: {
          schoolName: formData.schoolName,
          location: formData.location,
          adminName: formData.adminName,
          adminEmail: formData.adminEmail,
          adminPassword: formData.adminPassword,
          modules: formData.modules,
          plan: plan
        }
      });

      if (error) throw error;

      if (data && data.success) {
        toast.success("Account created successfully! Logging you in...");

        // Auto-login after successful registration
        const loginResult = await login(formData.adminEmail, formData.adminPassword);

        if (loginResult.success) {
          navigate("/center-dashboard");
        } else {
          toast.error("Account created, but auto-login failed. Please login manually.");
          navigate("/login");
        }
      } else {
        const errorMsg = data?.error || "Registration failed. Please check your connection or try a different email.";
        toast.error(errorMsg);
      }
    } catch (err: any) {
      console.error("Onboarding error:", err);
      // Detailed error breakdown for Edge Function issues
      let message = "An unexpected error occurred.";
      if (err.name === 'FunctionsHttpError') {
        message = `Server Error: ${err.message}`;
      } else if (err.name === 'FunctionsRelayError') {
        message = "Relay Error: The service is currently unreachable.";
      } else if (err.name === 'FunctionsFetchError') {
        message = "Fetch Error: Please check your internet connection.";
      } else {
        message = err.message || "An unexpected error occurred during onboarding.";
      }
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans selection:bg-primary/20">
      {/* Header */}
      <header className="h-20 border-b border-white/5 bg-slate-950/50 backdrop-blur-md flex items-center px-6 justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/20 border border-primary/20">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <span className="text-2xl font-black tracking-tighter uppercase">Edu<span className="text-primary">Flow</span></span>
        </div>
        <div className="flex items-center gap-4">
           <Badge variant="outline" className="border-primary/30 text-primary font-black uppercase tracking-widest px-4 py-1">
              {plan}
           </Badge>
           <Button variant="ghost" onClick={() => navigate("/")} className="text-slate-400 font-bold hover:text-white">Exit</Button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center py-12 px-4 relative overflow-hidden">
        {/* Background Decor */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="w-full max-w-4xl relative z-10">
          {/* Progress Bar */}
          <div className="mb-12">
             <div className="flex justify-between mb-4">
                {steps.map((step) => (
                   <div key={step.id} className="flex flex-col items-center gap-2">
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 border",
                        currentStep >= step.id ? "bg-primary border-primary text-white shadow-lg shadow-primary/20" : "bg-white/5 border-white/10 text-slate-500"
                      )}>
                         {currentStep > step.id ? <CheckCircle2 className="h-6 w-6" /> : step.icon}
                      </div>
                      <span className={cn(
                        "text-[10px] font-black uppercase tracking-widest",
                        currentStep >= step.id ? "text-primary" : "text-slate-500"
                      )}>{step.title}</span>
                   </div>
                ))}
             </div>
             <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden relative">
                <motion.div
                   className="h-full bg-primary"
                   initial={{ width: "25%" }}
                   animate={{ width: `${(currentStep / 4) * 100}%` }}
                   transition={{ duration: 0.5 }}
                />
                {/* Gamification Badges */}
                <div className="absolute top-0 left-0 w-full h-full flex justify-between px-2 pointer-events-none">
                   {[1, 2, 3, 4].map(i => (
                      <div key={i} className={cn(
                        "w-1 h-full transition-colors",
                        currentStep > i ? "bg-white/20" : "bg-transparent"
                      )} />
                   ))}
                </div>
             </div>
             {currentStep > 1 && (
                <motion.div
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   className="mt-4 flex items-center gap-2 text-emerald-400 font-bold text-[10px] uppercase tracking-widest"
                >
                   <Zap className="h-3 w-3" /> Reward Unlocked: {
                     currentStep === 2 ? "Identity Verified" :
                     currentStep === 3 ? "System Ready" : "Finalizing School"
                   }
                </motion.div>
             )}
          </div>

          <Card className="border-none shadow-2xl bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-[2.5rem] overflow-hidden text-white">
             <CardContent className="p-10 min-h-[500px] flex flex-col">
                <AnimatePresence mode="wait">
                   {currentStep === 1 && (
                      <motion.div
                         key="step1"
                         initial={{ opacity: 0, x: 20 }}
                         animate={{ opacity: 1, x: 0 }}
                         exit={{ opacity: 0, x: -20 }}
                         className="space-y-8 flex-1"
                      >
                         <div className="space-y-2">
                            <h2 className="text-4xl font-black tracking-tighter uppercase">Tell us about your school</h2>
                            <p className="text-slate-400 font-medium">This information will be used to customize your dashboard.</p>
                         </div>

                         <div className="grid md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                               <div className="space-y-2">
                                  <Label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Institution Name</Label>
                                  <div className="relative group">
                                     <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 group-focus-within:text-primary transition-colors" />
                                     <Input
                                        className="h-14 rounded-2xl bg-white/5 border-white/10 pl-12 font-bold placeholder:text-slate-600 focus:bg-white/10 focus:border-primary/50 transition-all"
                                        placeholder="e.g. Springfield Academy"
                                        value={formData.schoolName}
                                        onChange={(e) => setFormData({...formData, schoolName: e.target.value})}
                                     />
                                  </div>
                               </div>
                               <div className="space-y-2">
                                  <Label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Location</Label>
                                  <div className="relative group">
                                     <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 group-focus-within:text-primary transition-colors" />
                                     <Input
                                        className="h-14 rounded-2xl bg-white/5 border-white/10 pl-12 font-bold placeholder:text-slate-600 focus:bg-white/10 focus:border-primary/50 transition-all"
                                        placeholder="City, Country"
                                        value={formData.location}
                                        onChange={(e) => setFormData({...formData, location: e.target.value})}
                                     />
                                  </div>
                               </div>
                            </div>
                            <div className="space-y-6">
                               <div className="space-y-2">
                                  <Label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">School Logo</Label>
                                  <div className="h-32 rounded-2xl border-2 border-dashed border-white/10 bg-white/5 hover:bg-white/10 hover:border-primary/50 transition-all cursor-pointer flex flex-col items-center justify-center group relative overflow-hidden">
                                     {formData.schoolLogo ? (
                                        <div className="text-center">
                                           <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                                           <span className="text-xs font-bold">{formData.schoolLogo.name}</span>
                                        </div>
                                     ) : (
                                        <>
                                           <ImageIcon className="h-8 w-8 text-slate-500 group-hover:text-primary mb-2 transition-colors" />
                                           <span className="text-xs font-bold text-slate-500">Upload SVG, PNG, JPG</span>
                                        </>
                                     )}
                                     <input
                                        type="file"
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        onChange={(e) => setFormData({...formData, schoolLogo: e.target.files?.[0] || null})}
                                     />
                                  </div>
                               </div>
                            </div>
                         </div>
                      </motion.div>
                   )}

                   {currentStep === 2 && (
                      <motion.div
                         key="step2"
                         initial={{ opacity: 0, x: 20 }}
                         animate={{ opacity: 1, x: 0 }}
                         exit={{ opacity: 0, x: -20 }}
                         className="space-y-8 flex-1"
                      >
                         <div className="space-y-2">
                            <h2 className="text-4xl font-black tracking-tighter uppercase">Setup Administrator Account</h2>
                            <p className="text-slate-400 font-medium">You will use these credentials to access your dashboard.</p>
                         </div>

                         <div className="grid md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                               <div className="space-y-2">
                                  <Label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Full Name</Label>
                                  <div className="relative group">
                                     <Users className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 group-focus-within:text-primary transition-colors" />
                                     <Input
                                        className="h-14 rounded-2xl bg-white/5 border-white/10 pl-12 font-bold placeholder:text-slate-600 focus:bg-white/10 focus:border-primary/50 transition-all"
                                        placeholder="Admin Name"
                                        value={formData.adminName}
                                        onChange={(e) => setFormData({...formData, adminName: e.target.value})}
                                     />
                                  </div>
                               </div>
                               <div className="space-y-2">
                                  <Label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Email Address</Label>
                                  <div className="relative group">
                                     <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 group-focus-within:text-primary transition-colors" />
                                     <Input
                                        type="email"
                                        className="h-14 rounded-2xl bg-white/5 border-white/10 pl-12 font-bold placeholder:text-slate-600 focus:bg-white/10 focus:border-primary/50 transition-all"
                                        placeholder="admin@school.com"
                                        value={formData.adminEmail}
                                        onChange={(e) => setFormData({...formData, adminEmail: e.target.value})}
                                     />
                                  </div>
                               </div>
                            </div>
                            <div className="space-y-6">
                               <div className="space-y-2">
                                  <Label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Secure Password</Label>
                                  <div className="relative group">
                                     <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 group-focus-within:text-primary transition-colors" />
                                     <Input
                                        type="password"
                                        className="h-14 rounded-2xl bg-white/5 border-white/10 pl-12 font-bold placeholder:text-slate-600 focus:bg-white/10 focus:border-primary/50 transition-all"
                                        placeholder="••••••••"
                                        value={formData.adminPassword}
                                        onChange={(e) => setFormData({...formData, adminPassword: e.target.value})}
                                     />
                                  </div>
                               </div>
                               <div className="p-6 rounded-2xl bg-primary/10 border border-primary/20 space-y-2 mt-4">
                                  <div className="flex items-center gap-2 text-primary font-black uppercase text-[10px] tracking-widest">
                                     <Zap className="h-4 w-4" /> Security Tip
                                  </div>
                                  <p className="text-xs text-slate-300 leading-relaxed font-medium">Use a mix of letters, numbers, and symbols for maximum security.</p>
                               </div>
                            </div>
                         </div>
                      </motion.div>
                   )}

                   {currentStep === 3 && (
                      <motion.div
                         key="step3"
                         initial={{ opacity: 0, x: 20 }}
                         animate={{ opacity: 1, x: 0 }}
                         exit={{ opacity: 0, x: -20 }}
                         className="space-y-8 flex-1"
                      >
                         <div className="space-y-2">
                            <h2 className="text-4xl font-black tracking-tighter uppercase">Configure Your Suite</h2>
                            <p className="text-slate-400 font-medium">Select the initial modules you want to enable.</p>
                         </div>

                         <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {[
                               { id: "academic", label: "Academic", icon: <GraduationCap className="h-5 w-5" /> },
                               { id: "attendance", label: "Attendance", icon: <CheckCircle2 className="h-5 w-5" /> },
                               { id: "finance", label: "Finance", icon: <DollarSignLucide className="h-5 w-5" /> },
                               { id: "comm", label: "Communication", icon: <MessageSquare className="h-5 w-5" /> },
                               { id: "inventory", label: "Inventory", icon: <PackageLucide className="h-5 w-5" /> },
                               { id: "hr", label: "HR & Payroll", icon: <Users className="h-5 w-5" /> }
                            ].map((mod) => (
                               <button
                                  key={mod.id}
                                  onClick={() => {
                                     if (formData.modules.includes(mod.id)) {
                                        setFormData({...formData, modules: formData.modules.filter(m => m !== mod.id)});
                                     } else {
                                        setFormData({...formData, modules: [...formData.modules, mod.id]});
                                     }
                                  }}
                                  className={cn(
                                     "p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-4 text-center group",
                                     formData.modules.includes(mod.id) ? "bg-primary border-primary text-white shadow-xl shadow-primary/20" : "bg-white/5 border-white/10 text-slate-400 hover:border-primary/50"
                                  )}
                               >
                                  <div className={cn(
                                     "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors",
                                     formData.modules.includes(mod.id) ? "bg-white/20" : "bg-white/5 group-hover:bg-primary/20 group-hover:text-primary"
                                  )}>
                                     {mod.icon}
                                  </div>
                                  <span className="font-black uppercase text-[10px] tracking-widest">{mod.label}</span>
                               </button>
                            ))}
                         </div>
                      </motion.div>
                   )}

                   {currentStep === 4 && (
                      <motion.div
                         key="step4"
                         initial={{ opacity: 0, x: 20 }}
                         animate={{ opacity: 1, x: 0 }}
                         exit={{ opacity: 0, x: -20 }}
                         className="space-y-8 flex-1 flex flex-col items-center justify-center text-center"
                      >
                         <div className="w-24 h-24 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 mb-6">
                            <CheckCircle2 className="h-12 w-12" />
                         </div>
                         <div className="space-y-2">
                            <h2 className="text-4xl font-black tracking-tighter uppercase">Ready for launch</h2>
                            <p className="text-slate-400 font-medium max-w-sm mx-auto">Review your details and start your journey with EduFlow. Your dashboard will be ready in seconds.</p>
                         </div>

                         <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-3xl p-6 text-left space-y-4">
                            <div className="flex justify-between items-center pb-4 border-b border-white/5">
                               <span className="text-xs font-black uppercase tracking-widest text-slate-500">Institution</span>
                               <span className="font-bold text-white">{formData.schoolName || "Not set"}</span>
                            </div>
                            <div className="flex justify-between items-center pb-4 border-b border-white/5">
                               <span className="text-xs font-black uppercase tracking-widest text-slate-500">Administrator</span>
                               <span className="font-bold text-white">{formData.adminEmail || "Not set"}</span>
                            </div>
                            <div className="flex justify-between items-center">
                               <span className="text-xs font-black uppercase tracking-widest text-slate-500">Plan</span>
                               <span className="font-black text-primary uppercase">{plan}</span>
                            </div>
                         </div>
                      </motion.div>
                   )}
                </AnimatePresence>

                <div className="mt-auto pt-10 flex justify-between items-center">
                   <Button
                      variant="ghost"
                      onClick={prevStep}
                      disabled={currentStep === 1 || isSubmitting}
                      className="rounded-2xl font-black uppercase text-[10px] tracking-widest px-8 h-12"
                   >
                      <ChevronLeft className="mr-2 h-4 w-4" /> Back
                   </Button>

                   {currentStep === 4 ? (
                      <Button
                         onClick={handleSubmit}
                         disabled={isSubmitting}
                         className="rounded-2xl font-black uppercase text-sm tracking-widest px-10 h-14 bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-600/20"
                      >
                         {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Complete Setup"}
                      </Button>
                   ) : (
                      <Button
                         onClick={nextStep}
                         className="rounded-2xl font-black uppercase text-[10px] tracking-widest px-8 h-12 bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20"
                      >
                         Next Step <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                   )}
                </div>
             </CardContent>
          </Card>

          <p className="mt-8 text-center text-slate-600 text-xs font-medium">
             Need help? <Link to="/pages/support" className="text-primary font-bold hover:underline">Contact our support team</Link>
          </p>
        </div>
      </main>
    </div>
  );
};


export default OnboardingWizard;
