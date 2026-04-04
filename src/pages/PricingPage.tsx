import React, { useState } from "react";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { ShieldCheck, Check, Zap, X, ChevronRight, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

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
  <div className="min-h-screen bg-white text-slate-950 selection:bg-primary-light selection:text-primary">
   <Helmet>
    <title>Pricing | EduFlow School Management System</title>
    <meta name="description" content="Transparent pricing for schools of all sizes in Nepal. Choose between Basic, Pro, and Enterprise plans with competitive local rates." />
   </Helmet>

   {/* Header */}
   <header className="fixed top-0 w-full z-[100] px-4 md:px-8 py-4 flex items-center justify-between border-b border-border bg-white transition-all">
    <Link to="/" className="flex items-center gap-3">
     <div className="p-2 rounded-xl bg-primary-light border border-primary/10">
      <ShieldCheck className="h-6 w-6 text-primary" />
     </div>
     <span className="text-2xl font-black text-slate-950 tracking-tighter uppercase">Edu<span className="text-primary">Flow</span></span>
    </Link>
    <nav className="hidden lg:flex items-center gap-10">
     <Link to="/features" className="text-sm font-bold text-slate-600 hover:text-primary transition-colors">Features</Link>
     <Link to="/pricing" className="text-sm font-bold text-primary transition-colors">Pricing</Link>
     <Link to="/about" className="text-sm font-bold text-slate-600 hover:text-primary transition-colors">About</Link>
    </nav>
    <div className="flex items-center gap-4">
      <Link to="/onboarding">
       <Button className="bg-primary hover:bg-primary/90 text-white font-bold rounded-xl px-8 shadow-sm">
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
      className="text-6xl md:text-7xl font-black tracking-tight mb-8 uppercase leading-[1.1] text-slate-950"
     >
      Scalable Plans for <span className="text-primary">Every Stage.</span>
     </motion.h1>

     <div className="flex items-center justify-center gap-6 mb-12">
      <span className={cn("text-lg font-black uppercase tracking-widest transition-colors", !isYearly ? "text-slate-900" : "text-slate-400")}>Monthly</span>
      <div className="relative flex items-center">
        <Switch checked={isYearly} onCheckedChange={setIsYearly} className="data-[state=checked]:bg-primary" />
        <AnimatePresence>
         {isYearly && (
          <motion.div
           initial={{ opacity: 0, x: 20 }}
           animate={{ opacity: 1, x: 0 }}
           exit={{ opacity: 0, x: 20 }}
           className="absolute left-full ml-4 whitespace-nowrap bg-emerald-50 text-emerald-600 text-[10px] font-black px-3 py-1 rounded-full border border-emerald-100 uppercase tracking-widest"
          >
           SAVE 20%
          </motion.div>
         )}
        </AnimatePresence>
      </div>
      <span className={cn("text-lg font-black uppercase tracking-widest transition-colors", isYearly ? "text-slate-900" : "text-slate-400")}>Yearly</span>
     </div>
    </div>

    {/* Pricing Grid */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto mb-32">
     {tiers.map((tier, i) => (
      <motion.div
       key={tier.name}
       initial={{ opacity: 0, y: 20 }}
       animate={{ opacity: 1, y: 0 }}
       transition={{ delay: i * 0.1 }}
       className={cn(
        "p-10 rounded-2xl flex flex-col relative transition-all duration-500 group",
        tier.popular
         ? "bg-white border-2 border-primary shadow-xl"
         : "bg-slate-50 border border-border hover:bg-white hover:shadow-md"
       )}
      >
       {tier.popular && (
        <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] font-black px-6 py-2 rounded-full uppercase tracking-[0.2em] shadow-md">
         Most Popular Choice
        </div>
       )}

       <div className="mb-10">
        <h3 className="text-3xl font-black mb-3 uppercase tracking-tight text-slate-950">{tier.name}</h3>
        <p className="text-slate-500 font-medium text-sm leading-relaxed">{tier.description}</p>
       </div>

       <div className="mb-10">
        <div className="flex items-baseline gap-2">
         <span className="text-6xl font-black tracking-tighter text-slate-950">
          {tier.price === "Custom" ? "" : "NPR "}
          {tier.price}
         </span>
         {tier.price !== "Custom" && <span className="text-slate-400 font-bold text-lg uppercase tracking-widest">/mo</span>}
        </div>
        {tier.price !== "Custom" && tier.price !== "0" && (
          <p className="text-slate-400 text-xs font-bold mt-2 uppercase tracking-widest">
           Billed {isYearly ? "annually" : "monthly"}
          </p>
        )}
       </div>

       <div className="space-y-4 mb-12 flex-1">
        {tier.features.map((f, j) => (
         <div key={j} className={cn("flex items-center gap-4 text-sm font-bold", f.included ? "text-slate-700" : "text-slate-300")}>
          {f.included ? <Check className="h-5 w-5 text-emerald-600 shrink-0" /> : <X className="h-5 w-5 text-slate-300 shrink-0" />}
          {f.label}
         </div>
        ))}
       </div>

       <Button
        asChild
        className={cn(
         "w-full h-16 rounded-xl text-lg font-black uppercase tracking-widest transition-transform group-hover:scale-[1.02] active:scale-[0.98] shadow-sm",
         tier.popular ? "bg-primary hover:bg-primary/90 text-white" : "bg-slate-950 hover:bg-slate-900 text-white"
        )}
       >
        <Link to={tier.name === "Enterprise" ? "/contact-sales" : "/onboarding"}>
         {tier.cta}
        </Link>
       </Button>
      </motion.div>
     ))}
    </div>

    {/* Feature Comparison Table */}
    <section className="max-w-5xl mx-auto py-24 border-t border-border">
      <div className="text-center mb-16">
       <h2 className="text-4xl font-black uppercase tracking-tight text-slate-950 mb-4">Compare Every Feature</h2>
       <p className="text-slate-500 font-medium">Deep dive into what each plan offers to your institution.</p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border shadow-sm">
       <table className="w-full text-left bg-white">
         <thead>
          <tr className="border-b border-border bg-slate-50/50">
            <th className="py-6 px-8 font-black uppercase tracking-widest text-xs text-slate-500">Feature</th>
            <th className="py-6 font-black uppercase tracking-widest text-xs text-center text-slate-900">Basic</th>
            <th className="py-6 font-black uppercase tracking-widest text-xs text-center text-primary">Pro</th>
            <th className="py-6 font-black uppercase tracking-widest text-xs text-center text-slate-900">Enterprise</th>
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
           <tr key={i} className="border-b border-border/50 hover:bg-slate-50 transition-colors">
             <td className="py-6 px-8 text-slate-700">{row.name}</td>
             <td className="py-6 text-center">{row.basic ? <Check className="h-5 w-5 mx-auto text-emerald-600" /> : <X className="h-5 w-5 mx-auto text-slate-200" />}</td>
             <td className="py-6 text-center">{row.pro ? <Check className="h-5 w-5 mx-auto text-emerald-600" /> : <X className="h-5 w-5 mx-auto text-slate-200" />}</td>
             <td className="py-6 text-center">{row.enterprise ? <Check className="h-5 w-5 mx-auto text-emerald-600" /> : <X className="h-5 w-5 mx-auto text-slate-200" />}</td>
           </tr>
          ))}
         </tbody>
       </table>
      </div>
    </section>

    {/* FAQ Preview */}
    <section className="max-w-3xl mx-auto mt-20 text-center">
      <HelpCircle className="h-12 w-12 text-primary mx-auto mb-6" />
      <h3 className="text-3xl font-black uppercase text-slate-950 mb-4">Have Questions?</h3>
      <p className="text-slate-500 mb-8 font-medium">Need help picking the right plan? Our experts are ready to help you optimize your school.</p>
      <Button asChild variant="outline" className="h-14 px-8 rounded-xl font-black uppercase tracking-widest border-border hover:bg-slate-50">
       <Link to="/contact-sales">Talk to an Expert</Link>
      </Button>
    </section>
   </main>

   <footer className="py-20 border-t border-border bg-slate-50 text-center">
     <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">EduFlow Tech Solutions © {new Date().getFullYear()}</p>
   </footer>
  </div>
 );
};

export default PricingPage;
