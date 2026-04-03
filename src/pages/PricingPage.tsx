import React, { useState } from "react";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { ShieldCheck, Check, Zap, X, ChevronRight, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { PackageCard } from "@/components/auth/LandingPageComponents";
import { SYSTEM_MODULES } from "@/lib/system-modules";

const PricingPage = () => {
  const [isYearly, setIsYearly] = useState(false);

  const tiers = [
    {
      name: "Basic",
      description: "Essential tools for small academies starting their digital journey.",
      price: isYearly ? "0" : "0",
      features: [
        { label: "Up to 50 students", included: true },
        { label: "Daily Attendance", included: true },
        { label: "Student Profiles", included: true },
        { label: "Basic Reporting", included: true },
        { label: "Finance Suite", included: false },
        { label: "Parent App Access", included: false },
        { label: "Priority Support", included: false },
      ],
      cta: "Get Started Free",
      popular: false
    },
    {
      name: "Pro",
      description: "Everything you need to run a high-performance modern school.",
      price: isYearly ? "39" : "49",
      features: [
        { label: "Unlimited students", included: true },
        { label: "Advanced Attendance", included: true },
        { label: "Finance & Invoicing", included: true },
        { label: "Exams & Results", included: true },
        { label: "Parent Mobile App", included: true },
        { label: "Lesson Planning", included: true },
        { label: "Email Support", included: true },
      ],
      cta: "Start 14-Day Free Trial",
      popular: true
    },
    {
      name: "Enterprise",
      description: "Custom solutions for multi-center chains and large institutions.",
      price: "Custom",
      features: [
        { label: "Everything in Pro", included: true },
        { label: "Multi-center Management", included: true },
        { label: "Custom Domain", included: true },
        { label: "API & Webhooks", included: true },
        { label: "Dedicated Account Manager", included: true },
        { label: "SLA Guarantees", included: true },
        { label: "On-site Training", included: true },
      ],
      cta: "Contact Sales",
      popular: false
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-primary/20 selection:text-primary">
      <Helmet>
        <title>Pricing | EduFlow School Management System</title>
        <meta name="description" content="Transparent pricing for schools of all sizes. Choose between Basic, Pro, and Enterprise plans with up to 20% discount on yearly billing." />
      </Helmet>

      {/* Header */}
      <header className="fixed top-0 w-full z-[100] px-4 md:px-6 py-4 flex items-center justify-between border-b border-white/5 bg-slate-950/80 backdrop-blur-md transition-all">
        <Link to="/" className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/20 border border-primary/20">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <span className="text-2xl font-black text-white tracking-tighter uppercase">Edu<span className="text-primary">Flow</span></span>
        </Link>
        <nav className="hidden lg:flex items-center gap-8">
          <Link to="/features" className="text-sm font-bold text-slate-300 hover:text-white transition-colors">Features</Link>
          <Link to="/pricing" className="text-sm font-bold text-white transition-colors underline decoration-primary decoration-2 underline-offset-8">Pricing</Link>
          <Link to="/about" className="text-sm font-bold text-slate-300 hover:text-white transition-colors">About</Link>
        </nav>
        <div className="flex items-center gap-4">
           <Link to="/onboarding">
             <Button className="bg-primary hover:bg-primary/90 text-white font-bold rounded-full px-8 shadow-lg shadow-primary/20">
               Get Started
             </Button>
           </Link>
        </div>
      </header>

      <main className="pt-40 pb-20 container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-6xl md:text-8xl font-black tracking-tighter mb-8 uppercase leading-[0.9]"
          >
            Scalable Plans for <span className="text-primary">Every Stage.</span>
          </motion.h1>

          <div className="flex items-center justify-center gap-6 mb-12">
            <span className={cn("text-lg font-black uppercase tracking-widest transition-colors", !isYearly ? "text-white" : "text-slate-500")}>Monthly</span>
            <div className="relative flex items-center">
               <Switch checked={isYearly} onCheckedChange={setIsYearly} className="data-[state=checked]:bg-primary" />
               <AnimatePresence>
                 {isYearly && (
                   <motion.div
                     initial={{ opacity: 0, x: 20 }}
                     animate={{ opacity: 1, x: 0 }}
                     exit={{ opacity: 0, x: 20 }}
                     className="absolute left-full ml-4 whitespace-nowrap bg-emerald-500/10 text-emerald-400 text-[10px] font-black px-3 py-1 rounded-full border border-emerald-500/20 uppercase tracking-widest"
                   >
                     SAVE 20%
                   </motion.div>
                 )}
               </AnimatePresence>
            </div>
            <span className={cn("text-lg font-black uppercase tracking-widest transition-colors", isYearly ? "text-white" : "text-slate-500")}>Yearly</span>
          </div>
        </div>

        {/* Pricing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto mb-32">
          <PackageCard type="Basic" index={0} allModules={SYSTEM_MODULES} />
          <PackageCard type="Standard" index={1} allModules={SYSTEM_MODULES} />
          <PackageCard type="Premium" index={2} allModules={SYSTEM_MODULES} />
        </div>

        {/* Feature Comparison Table */}
        <section className="max-w-5xl mx-auto py-24 border-t border-white/5">
           <div className="text-center mb-16">
              <h2 className="text-4xl font-black uppercase tracking-tight mb-4">Compare Every Feature</h2>
              <p className="text-slate-400 font-medium">Deep dive into what each plan offers to your institution.</p>
           </div>

           <div className="overflow-x-auto">
              <table className="w-full text-left">
                 <thead>
                    <tr className="border-b border-white/10">
                       <th className="py-6 font-black uppercase tracking-widest text-xs text-slate-500">Feature</th>
                       <th className="py-6 font-black uppercase tracking-widest text-xs text-center">Basic</th>
                       <th className="py-6 font-black uppercase tracking-widest text-xs text-center text-primary">Pro</th>
                       <th className="py-6 font-black uppercase tracking-widest text-xs text-center">Enterprise</th>
                    </tr>
                 </thead>
                 <tbody className="text-sm font-bold">
                    {[
                      { name: "Student Management", basic: true, pro: true, enterprise: true },
                      { name: "Attendance Tracking", basic: true, pro: true, enterprise: true },
                      { name: "Finance Suite", basic: false, pro: true, enterprise: true },
                      { name: "Exam Management", basic: false, pro: true, enterprise: true },
                      { name: "Parent Mobile App", basic: false, pro: true, enterprise: true },
                      { name: "Inventory Tracking", basic: false, pro: false, enterprise: true },
                      { name: "HR & Payroll", basic: false, pro: false, enterprise: true },
                      { name: "Multi-Center Analytics", basic: false, pro: false, enterprise: true },
                      { name: "Custom Domain", basic: false, pro: false, enterprise: true },
                      { name: "API Access", basic: false, pro: false, enterprise: true },
                    ].map((row, i) => (
                      <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                         <td className="py-6 text-slate-300">{row.name}</td>
                         <td className="py-6 text-center">{row.basic ? <Check className="h-5 w-5 mx-auto text-emerald-500" /> : <X className="h-5 w-5 mx-auto text-slate-800" />}</td>
                         <td className="py-6 text-center">{row.pro ? <Check className="h-5 w-5 mx-auto text-emerald-500" /> : <X className="h-5 w-5 mx-auto text-slate-800" />}</td>
                         <td className="py-6 text-center">{row.enterprise ? <Check className="h-5 w-5 mx-auto text-emerald-500" /> : <X className="h-5 w-5 mx-auto text-slate-800" />}</td>
                      </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </section>

        {/* FAQ Preview */}
        <section className="max-w-3xl mx-auto mt-20 text-center">
           <HelpCircle className="h-12 w-12 text-primary mx-auto mb-6" />
           <h3 className="text-3xl font-black uppercase mb-4">Have Questions?</h3>
           <p className="text-slate-400 mb-8 font-medium">Need help picking the right plan? Our experts are ready to help you optimize your school.</p>
           <Button asChild variant="outline" className="h-14 px-8 rounded-2xl font-black uppercase tracking-widest border-white/10 hover:bg-white/5">
              <Link to="/contact-sales">Talk to an Expert</Link>
           </Button>
        </section>
      </main>

      <footer className="py-20 border-t border-white/5 bg-slate-950 text-center">
         <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">EduFlow Tech Solutions © {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
};

export default PricingPage;
