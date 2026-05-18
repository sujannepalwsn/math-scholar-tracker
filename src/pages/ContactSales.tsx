import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Building2,
  Mail,
  Phone,
  Globe,
  CheckCircle2,
  ArrowRight,
  MessageSquare,
  ShieldCheck,
  Users,
  BarChart3,
  Zap,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useLoginSettings } from "@/hooks/use-login-settings";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate, Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const ContactSales = () => {
  const { data: settings, isLoading: settingsLoading } = useLoginSettings('contact-sales');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const primaryColor = settings?.primary_color || '#4f46e5';

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      full_name: formData.get('full_name') as string,
      email: formData.get('email') as string,
      phone_number: formData.get('phone_number') as string,
      school_name: formData.get('school_name') as string,
      role: formData.get('role') as string,
      student_count: formData.get('student_count') as string,
      message: formData.get('message') as string,
    };

    try {
      const { error } = await supabase
        .from('demo_requests')
        .insert([data]);

      if (error) throw error;

      toast.success("Demo request sent successfully! Our team will contact you soon.");
      (e.target as HTMLFormElement).reset();
    } catch (error: any) {
      console.error("Error submitting demo request:", error);
      toast.error(error.message || "Failed to send request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const benefits = [
    {
      title: "Personalized Tour",
      desc: "See exactly how EDUFLOW fits your unique school workflow.",
      icon: Users
    },
    {
      title: "Data Migration Plan",
      desc: "Learn how we help you migrate your existing data safely.",
      icon: ShieldCheck
    },
    {
      title: "Pricing Consultation",
      desc: "Get a custom quote based on your institution's size and needs.",
      icon: BarChart3
    },
    {
      title: "Feature deep-dive",
      desc: "Explore advanced modules like AI analytics and automated finance.",
      icon: Zap
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 selection:bg-indigo-100 selection:text-indigo-600" style={{ '--primary': primaryColor } as React.CSSProperties}>
      {/* Navbar */}
      <nav className="sticky top-0 w-full z-50 bg-white/70 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
          <div className="p-1.5 rounded-lg bg-primary" style={{ backgroundColor: primaryColor }}>
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-black text-slate-900 tracking-tighter uppercase">EDU<span className="text-primary" style={{ color: primaryColor }}>FLOW</span></span>
        </div>
        <div className="flex items-center gap-4">
           <Button asChild variant="ghost" className="text-slate-600 font-bold hover:bg-slate-100 px-6 hidden sm:flex">
             <Link to="/getting-started">Product Tour</Link>
           </Button>
           <Button asChild className="text-white font-bold px-6 shadow-md shadow-indigo-600/10" style={{ backgroundColor: primaryColor }}>
             <Link to="/login">Login</Link>
           </Button>
        </div>
      </nav>

      <div className="container mx-auto py-12 lg:py-24 px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-start">

          {/* Left Column: Info & Branding */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-12"
          >
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-primary text-[10px] font-black tracking-widest uppercase" style={{ color: primaryColor }}>
                <MessageSquare className="w-3 h-3" />
                <span>Contact Sales</span>
              </div>
              <h1 className="text-4xl md:text-4xl md:text-6xl font-black text-slate-900 leading-[1.1] tracking-tight">
                {settings?.title || "Book a Personalized Demo"}
              </h1>
              <p className="text-xl text-slate-500 font-medium leading-relaxed max-w-lg">
                {settings?.subtitle || "See why top-tier institutions trust EDUFLOW to power their administration and growth."}
              </p>
            </div>

            <div className="grid gap-6">
               {benefits.map((benefit, i) => (
                 <div key={i} className="flex gap-4 p-4 rounded-2xl bg-white border border-slate-200 shadow-sm transition-all hover:shadow-md hover:border-indigo-100 group">
                    <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                       <benefit.icon className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                       <h3 className="font-bold text-slate-900">{benefit.title}</h3>
                       <p className="text-sm text-slate-500">{benefit.desc}</p>
                    </div>
                 </div>
               ))}
            </div>

            <div className="pt-8 border-t border-slate-200">
               <div className="flex flex-wrap gap-8">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                        <CheckCircle2 className="w-5 h-5" />
                     </div>
                     <span className="text-sm font-bold text-slate-700">99.9% Uptime SLA</span>
                  </div>
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                        <ShieldCheck className="w-5 h-5" />
                     </div>
                     <span className="text-sm font-bold text-slate-700">ISO 27001 Certified</span>
                  </div>
               </div>
            </div>
          </motion.div>

          {/* Right Column: Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="p-8 md:p-10 rounded-[2.5rem] border-none shadow-strong bg-white relative overflow-hidden">
               {/* Accent Gradient */}
               <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-[60px]" />

               <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <Label htmlFor="full_name" className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Full Name</Label>
                       <Input id="full_name" name="full_name" required placeholder="John Doe" className="h-12 rounded-xl bg-slate-50 border-slate-100 focus:bg-white transition-all" />
                    </div>
                    <div className="space-y-2">
                       <Label htmlFor="email" className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Work Email</Label>
                       <Input id="email" name="email" type="email" required placeholder="john@school.edu" className="h-12 rounded-xl bg-slate-50 border-slate-100 focus:bg-white transition-all" />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <Label htmlFor="phone_number" className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Phone Number</Label>
                       <Input id="phone_number" name="phone_number" placeholder="+1 (555) 000-0000" className="h-12 rounded-xl bg-slate-50 border-slate-100 focus:bg-white transition-all" />
                    </div>
                    <div className="space-y-2">
                       <Label htmlFor="school_name" className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Institution Name</Label>
                       <Input id="school_name" name="school_name" required placeholder="Evergreen Academy" className="h-12 rounded-xl bg-slate-50 border-slate-100 focus:bg-white transition-all" />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <Label htmlFor="role" className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Your Role</Label>
                       <Select name="role" required>
                          <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-slate-100">
                             <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border-slate-100">
                             <SelectItem value="Principal">Principal</SelectItem>
                             <SelectItem value="Administrator">Administrator</SelectItem>
                             <SelectItem value="IT Manager">IT Manager</SelectItem>
                             <SelectItem value="Teacher">Teacher</SelectItem>
                             <SelectItem value="Owner">Owner / Investor</SelectItem>
                          </SelectContent>
                       </Select>
                    </div>
                    <div className="space-y-2">
                       <Label htmlFor="student_count" className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Student Count</Label>
                       <Select name="student_count" required>
                          <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-slate-100">
                             <SelectValue placeholder="Approx range" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border-slate-100">
                             <SelectItem value="< 100">Less than 100</SelectItem>
                             <SelectItem value="100-500">100 - 500</SelectItem>
                             <SelectItem value="500-1000">500 - 1000</SelectItem>
                             <SelectItem value="1000-5000">1000 - 5000</SelectItem>
                             <SelectItem value="5000+">5000+</SelectItem>
                          </SelectContent>
                       </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                     <Label htmlFor="message" className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">How can we help?</Label>
                     <Textarea id="message" name="message" placeholder="Tell us about your current challenges..." className="min-h-[120px] rounded-xl bg-slate-50 border-slate-100 focus:bg-white transition-all resize-none" />
                  </div>

                  <Button type="submit" disabled={isSubmitting} className="w-full h-14 rounded-xl text-white font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-70" style={{ backgroundColor: primaryColor }}>
                     {isSubmitting ? (
                        <span className="flex items-center gap-2">
                           <Loader2 className="w-4 h-4 animate-spin" /> Processing...
                        </span>
                     ) : (
                        settings?.button_text || "Schedule My Demo"
                     )}
                  </Button>

                  <p className="text-center text-[10px] text-slate-400 font-medium px-8 leading-relaxed">
                     By clicking "{settings?.button_text || "Schedule My Demo"}", you agree to our Terms of Service and Privacy Policy. We'll never share your data.
                  </p>
               </form>
            </Card>

            <div className="mt-8 flex justify-center items-center gap-6 text-slate-400">
               <Building2 className="w-8 h-8 opacity-30" />
               <Globe className="w-8 h-8 opacity-30" />
               <Mail className="w-8 h-8 opacity-30" />
               <Phone className="w-8 h-8 opacity-30" />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Trust Quote */}
      <div className="bg-white py-16 border-y border-slate-200">
         <div className="container mx-auto px-6 text-center max-w-4xl">
            <p className="text-2xl md:text-3xl font-bold text-slate-800 leading-tight italic mb-8">
               "Switching to EDUFLOW was the single best operational decision we made last year. The level of detail and automation is unmatched."
            </p>
            <div className="flex flex-col items-center gap-2">
               <div className="w-12 h-12 rounded-full bg-slate-200 overflow-hidden">
                  <img src="https://i.pravatar.cc/150?u=42" alt="avatar" />
               </div>
               <div className="font-black text-slate-900 uppercase text-xs tracking-widest">James Williamson</div>
               <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">COO, Global Education Trust</div>
            </div>
         </div>
      </div>

      {/* Footer */}
      <footer className="py-12 px-6 text-center text-slate-400">
         <p className="text-xs font-bold uppercase tracking-[0.2em]">EDUFLOW Tech Solutions © 2024</p>
      </footer>
    </div>
  );
};

export default ContactSales;
