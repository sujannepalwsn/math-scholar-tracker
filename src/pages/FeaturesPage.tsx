import React from "react";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { ShieldCheck, GraduationCap, DollarSign, MessageSquare, Briefcase, Zap, CheckCircle2, ChevronRight, BarChart3, Clock, Layout, Users, Shield, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const FeatureSuite = ({ icon: Icon, title, description, features, color, reverse = false, mockup }: any) => (
  <section className={cn("py-24 grid md:grid-cols-2 gap-20 items-center", reverse && "md:flex-row-reverse")}>
    <div className={cn(reverse && "md:order-2")}>
      <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mb-8", color.bg)}>
        <Icon className={cn("h-8 w-8", color.text)} />
      </div>
      <h2 className="text-4xl md:text-5xl font-black mb-6 uppercase tracking-tight leading-none">{title}</h2>
      <p className="text-xl text-slate-400 font-medium mb-10 leading-relaxed">{description}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {features.map((f: string) => (
          <div key={f} className="flex items-center gap-3 text-white font-bold">
            <CheckCircle2 className={cn("h-5 w-5", color.text)} /> {f}
          </div>
        ))}
      </div>
    </div>
    <div className={cn("relative group", reverse && "md:order-1")}>
       <div className={cn("absolute inset-0 blur-[80px] opacity-20 transition-opacity group-hover:opacity-30", color.bg)} />
       {mockup}
    </div>
  </section>
);

const FeaturesPage = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-primary/20 selection:text-primary">
      <Helmet>
        <title>EduFlow Features | Academic, Finance & Admin Suites</title>
        <meta name="description" content="Explore EduFlow's modular ecosystem: Academic Suite for auto-grading, Finance Suite for automated invoicing, and Admin Suite for institutional oversight." />
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
          <Link to="/features" className="text-sm font-bold text-white transition-colors underline decoration-primary decoration-2 underline-offset-8">Features</Link>
          <Link to="/pricing" className="text-sm font-bold text-slate-300 hover:text-white transition-colors">Pricing</Link>
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
        <div className="max-w-4xl mx-auto text-center mb-32">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black tracking-widest uppercase mb-8"
          >
            <Zap className="h-4 w-4" />
            <span>Powering 2,000+ Schools</span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-6xl md:text-8xl font-black tracking-tighter mb-8 uppercase leading-[0.9]"
          >
            A Modular Ecosystem for <span className="text-primary">Every Department.</span>
          </motion.h1>
          <p className="text-xl md:text-2xl text-slate-400 font-medium max-w-3xl mx-auto">
            EduFlow isn't just a database. It's a collection of high-performance tools designed to automate every aspect of your school.
          </p>
        </div>

        {/* Academic Suite */}
        <FeatureSuite
          icon={GraduationCap}
          title="Academic Suite"
          description="Empower educators with tools that automate the tedious and amplify the impactful."
          features={["Auto-Grading Engines", "Digital Lesson Planning", "Chapter Proficiency Matrix", "Student Progress Tracking"]}
          color={{ bg: "bg-blue-500/10", text: "text-blue-400" }}
          mockup={
            <div className="glass-surface rounded-3xl border border-white/10 p-6 bg-slate-900/40 aspect-video flex flex-col gap-4">
               <div className="flex justify-between items-center mb-2">
                  <div className="h-4 w-32 bg-white/5 rounded-full" />
                  <div className="flex gap-1">
                     <div className="w-2 h-2 rounded-full bg-blue-500" />
                     <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  </div>
               </div>
               <div className="grid grid-cols-2 gap-4 flex-1">
                  <div className="bg-white/5 rounded-2xl border border-white/5 p-4 flex flex-col justify-between">
                     <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Average Score</div>
                     <div className="text-3xl font-black text-blue-400">88.4%</div>
                     <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full w-4/5 bg-blue-500" />
                     </div>
                  </div>
                  <div className="bg-white/5 rounded-2xl border border-white/5 p-4 flex flex-col justify-between">
                     <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Attendance</div>
                     <div className="text-3xl font-black text-emerald-400">96.2%</div>
                     <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full w-[96%] bg-emerald-500" />
                     </div>
                  </div>
                  <div className="col-span-2 bg-white/5 rounded-2xl border border-white/5 p-4">
                     <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-4">Lesson Progress</div>
                     <div className="space-y-3">
                        {[75, 40, 90].map((w, i) => (
                           <div key={i} className="flex items-center gap-3">
                              <div className="w-12 h-2 bg-white/5 rounded-full" />
                              <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                                 <div className="h-full bg-primary/40 transition-all group-hover:bg-primary" style={{ width: `${w}%` }} />
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               </div>
            </div>
          }
        />

        {/* Finance Suite */}
        <FeatureSuite
          icon={DollarSign}
          title="Finance Suite"
          description="Complete financial transparency. Automate invoicing, track collection velocity, and eliminate payment gaps."
          features={["Automated Invoicing", "Payment Gateway Integration", "Collection Velocity Gauge", "Expense Management"]}
          color={{ bg: "bg-emerald-500/10", text: "text-emerald-400" }}
          reverse={true}
          mockup={
            <div className="glass-surface rounded-3xl border border-white/10 p-6 bg-slate-900/40 aspect-video flex flex-col gap-6">
               <div className="flex justify-between items-end">
                  <div>
                     <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Revenue</div>
                     <div className="text-4xl font-black text-white">NPR 142,500</div>
                  </div>
                  <div className="text-emerald-400 font-bold text-sm flex items-center gap-1">
                     <Zap className="h-4 w-4 fill-current" /> +12.5%
                  </div>
               </div>
               <div className="flex-1 flex items-end gap-2 px-2">
                  {[30, 45, 35, 60, 80, 55, 90, 70, 85, 100].map((h, i) => (
                    <div key={i} style={{ height: `${h}%` }} className="flex-1 bg-emerald-500/20 border-t border-emerald-500/30 rounded-t-lg relative group/bar transition-all hover:bg-emerald-500/40" />
                  ))}
               </div>
               <div className="flex justify-between text-[8px] font-bold text-slate-600 uppercase tracking-tighter">
                  <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span><span>Jul</span><span>Aug</span><span>Sep</span><span>Oct</span>
               </div>
            </div>
          }
        />

        {/* Admin Suite */}
        <FeatureSuite
          icon={Briefcase}
          title="Admin Suite"
          description="The nerve center of your institution. Manage staff, inventory, and multiple centers with enterprise-grade oversight."
          features={["HR Management", "Inventory Tracking", "Multi-Center Dashboard", "Compliance Reporting"]}
          color={{ bg: "bg-purple-500/10", text: "text-purple-400" }}
          mockup={
            <div className="glass-surface rounded-3xl border border-white/10 p-6 bg-slate-900/40 aspect-video">
               <div className="grid grid-cols-4 gap-4 h-full">
                  <div className="col-span-1 space-y-3">
                     {[1, 2, 3, 4].map(i => <div key={i} className="h-10 bg-white/5 rounded-xl border border-white/5" />)}
                  </div>
                  <div className="col-span-3 bg-white/5 rounded-2xl border border-white/5 p-4 relative overflow-hidden">
                     <div className="flex gap-4 mb-4">
                        <div className="w-12 h-12 rounded-full bg-purple-500/20 border border-purple-500/30" />
                        <div className="space-y-2 flex-1">
                           <div className="h-3 w-1/3 bg-white/10 rounded-full" />
                           <div className="h-2 w-1/2 bg-white/5 rounded-full" />
                        </div>
                     </div>
                     <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                             <div className="flex gap-3 items-center">
                                <div className="w-8 h-8 rounded-lg bg-slate-800" />
                                <div className="h-2 w-20 bg-white/5 rounded-full" />
                             </div>
                             <div className="h-2 w-12 bg-purple-500/20 rounded-full" />
                          </div>
                        ))}
                     </div>
                  </div>
               </div>
            </div>
          }
        />

        {/* Communication Suite */}
        <FeatureSuite
          icon={MessageSquare}
          title="Communication Suite"
          description="Bridge the gap between school and home. Instant notifications, direct messaging, and real-time updates."
          features={["Instant Push Notifications", "One-Click Announcements", "Parent-Teacher Chat", "Event Calendar Sync"]}
          color={{ bg: "bg-amber-500/10", text: "text-amber-400" }}
          reverse={true}
          mockup={
            <div className="relative h-full flex items-center justify-center py-10">
               <div className="w-48 h-96 rounded-[2.5rem] bg-slate-900 border-[6px] border-slate-800 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-5 bg-slate-800 rounded-b-2xl" />
                  <div className="p-4 pt-10 space-y-4">
                     <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 text-[10px] space-y-1">
                        <p className="font-black text-primary uppercase">New Message</p>
                        <p className="text-slate-300">Your child arrived at school at 8:45 AM.</p>
                     </div>
                     <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-[10px] space-y-1">
                        <p className="font-black text-white uppercase">Fee Reminder</p>
                        <p className="text-slate-300">Monthly tuition for June is now due.</p>
                     </div>
                     <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-[10px] space-y-1 opacity-50">
                        <div className="h-2 w-12 bg-white/10 rounded-full mb-1" />
                        <div className="h-2 w-full bg-white/5 rounded-full" />
                     </div>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4 h-8 bg-white/5 rounded-full flex items-center px-4">
                     <div className="h-1 w-full bg-white/10 rounded-full" />
                  </div>
               </div>
               <div className="absolute -right-4 top-20 w-40 h-40 bg-amber-500/10 rounded-3xl blur-2xl -z-10" />
            </div>
          }
        />

        {/* Final CTA */}
        <section className="mt-40 text-center">
           <h2 className="text-5xl md:text-7xl font-black tracking-tighter mb-12 uppercase leading-[0.9]">Ready to see it <br />in action?</h2>
           <div className="flex flex-wrap gap-6 justify-center">
             <Button asChild size="lg" className="h-20 px-16 rounded-[2rem] text-2xl font-black bg-primary hover:bg-primary/90 text-white shadow-2xl shadow-primary/40">
               <Link to="/onboarding">Start Free Trial</Link>
             </Button>
             <Button asChild variant="outline" size="lg" className="h-20 px-16 rounded-[2rem] text-2xl font-black border-white/10 bg-white/5 hover:bg-white/10 text-white">
               <Link to="/contact-sales">Contact Sales</Link>
             </Button>
           </div>
        </section>
      </main>

      {/* Footer (Re-used or simplified) */}
      <footer className="py-20 border-t border-white/5 bg-slate-950 text-center">
         <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">EduFlow Tech Solutions © {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
};

export default FeaturesPage;
