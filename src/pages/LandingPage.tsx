import React from "react";
import { Helmet } from "react-helmet";
import { Link, useNavigate } from "react-router-dom";
import {
  Shield,
  ArrowRight,
  Play,
  CheckCircle2,
  Users,
  Briefcase,
  GraduationCap,
  BarChart3,
  Zap,
  MessageSquare,
  DollarSign,
  ChevronRight,
  Sparkles,
  MapPin,
  Twitter,
  Linkedin,
  Github,
  Facebook,
  ExternalLink,
  ShieldCheck,
  Building,
  X,
  Globe,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { SYSTEM_MODULES } from "@/lib/system-modules";
import { FeatureCard, PackageCard } from "@/components/auth/LandingPageComponents";
import { useSystemStats } from "@/hooks/use-system-stats";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FileDown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { tracking } from "@/utils/tracking";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger
} from "@/components/ui/dialog";

const LandingPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { data: stats } = useSystemStats();
  const [partners, setPartners] = useState<{ id: string; name: string; logo_url: string; address: string }[]>([]);
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [showExitIntent, setShowExitIntent] = useState(false);

  useEffect(() => {
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 && !localStorage.getItem('exit_intent_dismissed')) {
        setShowExitIntent(true);
      }
    };

    document.addEventListener('mouseleave', handleMouseLeave);
    return () => document.removeEventListener('mouseleave', handleMouseLeave);
  }, []);

  useEffect(() => {
    const fetchPartners = async () => {
      const { data } = await supabase
        .from('centers')
        .select('id, name, logo_url, address')
        .eq('is_active', true)
        .limit(6)
        .order('name');
      if (data) setPartners(data as any);
    };
    fetchPartners();
  }, []);

  const featureSuites = [
    {
      id: "academic",
      title: "Academic Suite",
      description: "Everything you need to manage the learning experience.",
      modules: [7, 8, 9, 23, 24, 28, 5], // Module IDs from SYSTEM_MODULES
      icon: <GraduationCap className="h-6 w-6" />
    },
    {
      id: "admin",
      title: "Admin Suite",
      description: "Powerful tools for institutional oversight and management.",
      modules: [3, 4, 13, 14, 18, 12, 1],
      icon: <Shield className="h-6 w-6" />
    },
    {
      id: "finance",
      title: "Finance Suite",
      description: "Automate fee collection and track every rupee.",
      modules: [11, 26, 25],
      icon: <DollarSign className="h-6 w-6" />
    },
    {
      id: "communication",
      title: "Communication Suite",
      description: "Connect teachers, parents, and students seamlessly.",
      modules: [15, 16, 17],
      icon: <MessageSquare className="h-6 w-6" />
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-primary/20 selection:text-primary scroll-smooth">
      <Helmet>
        <title>EduFlow | Modern School Management System & Automated School ERP</title>
        <meta name="description" content="Transform your institution with EduFlow, the last school management system you'll ever need. Cloud-based education software for automated attendance, fee collection, and parent communication." />
        <meta property="og:title" content="EduFlow | The Operating System for Modern Schools" />
        <meta property="og:description" content="Automate 80% of administrative tasks with our high-performance school ERP. Trusted by 2,000+ institutions worldwide." />
        <meta property="og:type" content="website" />
      </Helmet>
      {/* Navigation */}
      <header className="fixed top-0 w-full z-[100] px-2 md:px-6 py-4 flex items-center justify-between border-b border-white/5 bg-slate-950/80 backdrop-blur-md transition-all">
        <Link to="/" className="flex items-center gap-1.5 md:gap-3">
          <div className="p-1.5 md:p-2 rounded-xl bg-primary/20 border border-primary/20">
            <ShieldCheck className="h-5 w-5 md:h-6 md:w-6 text-primary" />
          </div>
          <span className="text-lg md:text-2xl font-black text-white tracking-tighter uppercase shrink-0">Edu<span className="text-primary">Flow</span></span>
        </Link>

        <nav className="hidden lg:flex items-center gap-8">
          <Link to="/features" className="text-sm font-bold text-slate-300 hover:text-white transition-colors">Features</Link>
          <a href="#solutions" className="text-sm font-bold text-slate-300 hover:text-white transition-colors">Solutions</a>
          <Link to="/pricing" className="text-sm font-bold text-slate-300 hover:text-white transition-colors">Pricing</Link>
          <Link to="/about" className="text-sm font-bold text-slate-300 hover:text-white transition-colors">About</Link>
        </nav>

        <div className="flex items-center gap-2 md:gap-4 shrink-0">
           <Link to="/login" className="hidden sm:block">
             <Button variant="ghost" className="text-white font-bold hover:bg-white/5 rounded-full px-4 md:px-6">
               Login
             </Button>
           </Link>
           <Link to="/login" className="sm:hidden">
             <Button variant="ghost" size="sm" className="text-white font-bold hover:bg-white/5 rounded-full px-3 text-xs">
               Login
             </Button>
           </Link>
           <Link to="/onboarding">
             <Button className="bg-primary hover:bg-primary/90 text-white font-bold rounded-full px-4 md:px-8 shadow-lg shadow-primary/20 text-xs md:text-sm">
               Get Started
             </Button>
           </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[120px] animate-pulse delay-1000" />

        <div className="container mx-auto px-4 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black tracking-widest uppercase mb-8"
          >
            <Sparkles className="h-4 w-4" />
            <span>Next Generation School OS</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-6xl md:text-8xl font-black text-white leading-[0.9] tracking-tighter mb-8 uppercase max-w-5xl mx-auto"
          >
            The Last School Management <span className="text-primary">System You'll Ever Need.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl md:text-2xl text-slate-400 font-medium max-w-3xl mx-auto mb-12"
          >
            Automate 80% of administrative tasks, from fee collection to attendance. Built for modern institutions that value time and transparency.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-wrap gap-6 justify-center"
          >
            <Button asChild size="lg" className="h-16 px-10 rounded-2xl text-lg font-black bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/20">
              <Link to="/onboarding">Start Your 14-Day Free Trial</Link>
            </Button>

            <Button
               size="lg"
               variant="outline"
               className="h-16 px-10 rounded-2xl text-lg font-black border-white/10 bg-white/5 hover:bg-white/10 text-white"
               onClick={async () => {
                  const loadingToast = toast.loading("Entering Sandbox Mode...");
                  localStorage.setItem('is_sandbox', 'true');
                  localStorage.setItem('is_trial', 'false');

                  // Use a public demo account
                  // In a real production app, these would be managed credentials
                  const result = await login("demo@eduflow.com", "demo1234");

                  if (result.success) {
                    await tracking.startSession();
                    tracking.trackEvent('feature_action', 'enter_sandbox');
                    toast.dismiss(loadingToast);
                    navigate("/center-dashboard");
                    setTimeout(() => {
                      toast.success("Welcome to the Sandbox! (Demo Mode Active)");
                    }, 200);
                  } else {
                    localStorage.removeItem('is_sandbox');
                    toast.dismiss(loadingToast);
                    toast.error("Demo mode is temporarily unavailable. Please try again later.");
                  }
               }}
            >
               <Zap className="mr-2 h-6 w-6 text-yellow-400" /> Instant Sandbox
            </Button>

          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-8 text-slate-500 font-bold text-sm uppercase tracking-widest"
          >
            No credit card required • Instant access
          </motion.p>

          {/* Floating Dashboard Preview Mockup */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.5 }}
            className="mt-20 max-w-6xl mx-auto relative group"
          >
            <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
            <div className="relative glass-surface rounded-[2rem] border border-white/10 overflow-hidden shadow-2xl p-4 bg-slate-900/50 backdrop-blur-3xl">
              <div className="flex items-center gap-2 mb-4 px-4 py-2 border-b border-white/5">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-rose-500/50" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/50" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/50" />
                </div>
                <div className="mx-auto bg-white/5 rounded-full px-4 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest border border-white/5">
                  admin-dashboard.eduflow.com
                </div>
              </div>
              <div className="grid grid-cols-12 gap-4">
                {/* Sidebar Mockup */}
                <div className="col-span-3 space-y-3 p-4 border-r border-white/5 hidden md:block">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className={cn("h-8 rounded-lg flex items-center gap-3 px-3", i === 1 ? "bg-primary/20 border border-primary/20" : "bg-white/5")}>
                       <div className={cn("w-3 h-3 rounded-sm", i === 1 ? "bg-primary" : "bg-slate-700")} />
                       <div className={cn("h-2 rounded-full flex-1", i === 1 ? "bg-primary/40" : "bg-slate-800")} />
                    </div>
                  ))}
                </div>
                {/* Content Mockup */}
                <div className="col-span-12 md:col-span-9 p-6 space-y-8">
                  <div className="grid grid-cols-3 gap-6">
                    {[
                      { label: "Revenue", value: "NPR 42.5K", color: "text-emerald-400" },
                      { label: "Students", value: "1,280", color: "text-blue-400" },
                      { label: "Attendance", value: "94.2%", color: "text-purple-400" }
                    ].map(kpi => (
                      <div key={kpi.label} className="bg-white/5 p-4 rounded-2xl border border-white/5">
                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{kpi.label}</div>
                        <div className={cn("text-2xl font-black tracking-tighter", kpi.color)}>{kpi.value}</div>
                      </div>
                    ))}
                  </div>
                  <div className="h-48 bg-white/5 rounded-3xl border border-white/5 p-6 flex flex-col justify-end gap-2">
                     <div className="flex items-end gap-2 h-full">
                        {[40, 70, 45, 90, 65, 80, 55, 95].map((h, i) => (
                          <div key={i} style={{ height: `${h}%` }} className="flex-1 bg-primary/20 rounded-t-lg border-t border-x border-primary/30 relative group/bar">
                             <div className="absolute inset-0 bg-primary opacity-0 group-hover/bar:opacity-100 transition-opacity rounded-t-lg" />
                          </div>
                        ))}
                     </div>
                     <div className="flex justify-between px-2">
                        {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'].map(m => (
                          <span key={m} className="text-[8px] font-bold text-slate-600 uppercase">{m}</span>
                        ))}
                     </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Social Proof / Partners */}
      <section className="py-20 border-y border-white/5 bg-slate-900/20 overflow-hidden">
        <div className="container mx-auto px-4">
           <p className="text-center text-slate-500 font-black text-xs uppercase tracking-[0.3em] mb-12">Trusted by 2,000+ institutions across 15 countries</p>
           <div className="flex flex-wrap justify-center items-center gap-12 md:gap-20 opacity-30 grayscale hover:grayscale-0 transition-all">
              {[
                { name: "St. Jude's Academy", icon: Shield },
                { name: "Global International", icon: Globe },
                { name: "Springfield High", icon: Building },
                { name: "Beacon Heights", icon: GraduationCap },
                { name: "Riverdale Prep", icon: Zap },
                { name: "Oakwood Institute", icon: Briefcase }
              ].map((p, i) => (
                <div key={i} className="flex items-center gap-3">
                   <p.icon className="h-8 w-8" />
                   <span className="font-bold text-xl tracking-tighter whitespace-nowrap">{p.name}</span>
                </div>
              ))}
           </div>
        </div>
      </section>

      {/* Lead Magnet: School Efficiency Calculator */}
      <section className="py-32 bg-slate-900/40 relative overflow-hidden">
         <div className="absolute top-1/2 left-0 w-96 h-96 bg-primary/20 rounded-full blur-[120px] -translate-x-1/2" />
         <div className="container mx-auto px-4 relative z-10">
            <div className="grid lg:grid-cols-2 gap-20 items-center">
               <div className="space-y-8">
                  <Badge className="bg-primary/10 text-primary px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">ROI Calculator</Badge>
                  <h2 className="text-4xl md:text-6xl font-black tracking-tighter uppercase leading-[0.9]">How much time is your school <span className="text-primary">losing?</span></h2>
                  <p className="text-xl text-slate-400 font-medium">The cost of manual administration is higher than you think. Use our interactive tool to calculate your potential savings with EduFlow.</p>

                  <div className="space-y-6 pt-8">
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-primary">
                           <Clock className="h-6 w-6" />
                        </div>
                        <div>
                           <p className="text-white font-black uppercase text-sm tracking-tight">Save 10+ Hours/Week</p>
                           <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">On automated attendance and reporting</p>
                        </div>
                     </div>
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-emerald-500">
                           <DollarSign className="h-6 w-6" />
                        </div>
                        <div>
                           <p className="text-white font-black uppercase text-sm tracking-tight">Eliminate 15% Leakage</p>
                           <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Via automated fee follow-ups</p>
                        </div>
                     </div>
                  </div>
               </div>

               <div className="glass-surface rounded-[3rem] p-10 border border-white/10 bg-slate-900/60 backdrop-blur-3xl shadow-2xl">
                  <div className="space-y-8">
                     <div className="space-y-4">
                        <label className="text-xs font-black uppercase tracking-widest text-slate-400">Number of Students</label>
                        <div className="flex gap-4">
                           <input
                              type="range"
                              min="50" max="2000" step="50"
                              defaultValue="300"
                              className="flex-1 accent-primary h-2 bg-white/10 rounded-full appearance-none cursor-pointer mt-4"
                              onChange={(e) => {
                                 const val = parseInt(e.target.value);
                                 const studentEl = document.getElementById('calc-students');
                                 const saveEl = document.getElementById('calc-savings');
                                 const hourEl = document.getElementById('calc-hours');
                                 if (studentEl) studentEl.innerText = val.toString();
                                 if (saveEl) saveEl.innerText = (val * 12).toLocaleString();
                                 if (hourEl) hourEl.innerText = (val / 10 * 2).toFixed(0);
                              }}
                           />
                           <span id="calc-students" className="text-3xl font-black tracking-tighter text-white w-20 text-right">300</span>
                        </div>
                     </div>

                     <div className="grid grid-cols-2 gap-6 pt-10 border-t border-white/5">
                        <div className="p-6 rounded-2xl bg-white/5 border border-white/5 text-center">
                           <p className="text-[8px] font-black uppercase tracking-widest text-slate-500 mb-2">Monthly Savings</p>
                           <p className="text-3xl font-black text-emerald-400 tracking-tighter">NPR <span id="calc-savings">3,600</span></p>
                        </div>
                        <div className="p-6 rounded-2xl bg-white/5 border border-white/5 text-center">
                           <p className="text-[8px] font-black uppercase tracking-widest text-slate-500 mb-2">Hours Saved/mo</p>
                           <p className="text-3xl font-black text-primary tracking-tighter"><span id="calc-hours">60</span> hrs</p>
                        </div>
                     </div>

                     <div className="space-y-4">
                        <Input
                           placeholder="Enter school email to get full report"
                           className="h-16 rounded-2xl bg-white/5 border-white/10 text-white font-bold"
                        />
                        <Button className="w-full h-16 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black text-lg uppercase tracking-widest shadow-xl shadow-primary/20">
                           Email Me This Report
                        </Button>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </section>

      {/* Chaos to Clarity (Old Way vs New Way) */}
      <section id="solutions" className="py-32 relative overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center mb-24">
            <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-8 uppercase leading-[0.9]">Stop managing spreadsheets. <br /><span className="text-slate-500">Start managing your school.</span></h2>
            <p className="text-xl text-slate-400 font-medium">Traditional school management is fragmented, manual, and slow. EduFlow brings everything together in one unified, high-performance platform.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="p-10 rounded-[3rem] bg-rose-500/5 border border-rose-500/10">
               <div className="w-16 h-16 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500 mb-8">
                  <X className="h-8 w-8" />
               </div>
               <h3 className="text-3xl font-black mb-6 uppercase tracking-tight text-rose-500">The Old Way</h3>
               <ul className="space-y-4">
                  {[
                    "Fragmented Spreadsheets",
                    "Manual Invoicing",
                    "Communication Gaps",
                    "Manual paper attendance tracking",
                    "Lack of real-time insights"
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-slate-400 font-medium">
                       <div className="h-1.5 w-1.5 rounded-full bg-rose-500/40" /> {item}
                    </li>
                  ))}
               </ul>
            </div>

            <div className="p-10 rounded-[3rem] bg-emerald-500/5 border border-emerald-500/10 relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Zap className="h-32 w-32 text-emerald-500" />
               </div>
               <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-8">
                  <CheckCircle2 className="h-8 w-8" />
               </div>
               <h3 className="text-3xl font-black mb-6 uppercase tracking-tight text-emerald-500">The EduFlow Way</h3>
               <ul className="space-y-4">
                  {[
                    "Unified Cloud Database",
                    "Automated Fee Collection",
                    "Real-time Parent App",
                    "One-tap digital attendance registers",
                    "Instant, data-driven analytics"
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-slate-200 font-bold">
                       <CheckCircle2 className="h-5 w-5 text-emerald-500" /> {item}
                    </li>
                  ))}
               </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Suites (Explorer) */}
      <section id="features" className="py-32 bg-slate-900/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-24">
             <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-6 uppercase">Everything you need to run <br />a modern school.</h2>
             <p className="text-xl text-slate-400 max-w-2xl mx-auto font-medium">EduFlow is built on a modular architecture, organized into powerful suites designed for every aspect of your institution.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {featureSuites.map((suite) => (
              <div key={suite.id} className="p-8 rounded-[2.5rem] bg-white/5 border border-white/10 hover:bg-white/10 transition-all group flex flex-col">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform">
                  {suite.icon}
                </div>
                <h3 className="text-2xl font-black mb-3 uppercase tracking-tight">{suite.title}</h3>
                <p className="text-slate-400 font-medium mb-8 text-sm leading-relaxed">{suite.description}</p>

                <div className="mt-auto space-y-3">
                   {suite.modules.map(mid => {
                     const mod = SYSTEM_MODULES.find(m => m.id === mid);
                     return mod ? (
                       <div key={mid} className="flex items-center gap-2 text-xs font-bold text-slate-300">
                          <div className="w-1 h-1 rounded-full bg-primary" /> {mod.name}
                       </div>
                     ) : null;
                   })}
                </div>

                <Button
                   variant="ghost"
                   className="mt-8 w-full group/btn hover:bg-primary/10 text-primary font-black uppercase text-[10px] tracking-widest"
                   onClick={() => navigate(`/suite/${suite.id}`)}
                >
                   Explore Suite <ChevronRight className="ml-2 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Persona Value Props */}
      <section className="py-32">
        <div className="container mx-auto px-4">
           <div className="grid lg:grid-cols-3 gap-12">
              <div className="space-y-8">
                 <div className="p-4 rounded-[2rem] bg-blue-500/10 border border-blue-500/20 w-fit">
                    <Shield className="h-10 w-10 text-blue-400" />
                 </div>
                 <h3 className="text-4xl font-black tracking-tighter uppercase">For Administrators</h3>
                 <p className="text-lg text-slate-400 font-medium leading-relaxed">Gain total control over your institution with real-time analytics, automated reporting, and secure staff management.</p>
                 <ul className="space-y-3">
                    {["Multi-center management", "Financial forecasting", "Compliance tracking"].map(t => (
                      <li key={t} className="flex items-center gap-3 text-white font-bold"><CheckCircle2 className="h-5 w-5 text-blue-500" /> {t}</li>
                    ))}
                 </ul>
              </div>

              <div className="space-y-8">
                 <div className="p-4 rounded-[2rem] bg-emerald-500/10 border border-emerald-500/20 w-fit">
                    <Briefcase className="h-10 w-10 text-emerald-400" />
                 </div>
                 <h3 className="text-4xl font-black tracking-tighter uppercase">For Teachers</h3>
                 <p className="text-lg text-slate-400 font-medium leading-relaxed">Focus on teaching, not paperwork. EduFlow automates attendance, grading, and parent communication.</p>
                 <ul className="space-y-3">
                    {["Digital lesson plans", "Instant roll-call", "Auto-grading tools"].map(t => (
                      <li key={t} className="flex items-center gap-3 text-white font-bold"><CheckCircle2 className="h-5 w-5 text-emerald-500" /> {t}</li>
                    ))}
                 </ul>
              </div>

              <div className="space-y-8">
                 <div className="p-4 rounded-[2rem] bg-purple-500/10 border border-purple-500/20 w-fit">
                    <Users className="h-10 w-10 text-purple-400" />
                 </div>
                 <h3 className="text-4xl font-black tracking-tighter uppercase">For Parents</h3>
                 <p className="text-lg text-slate-400 font-medium leading-relaxed">Stay connected with your child's education. Get real-time updates on attendance, grades, and school news.</p>
                 <ul className="space-y-3">
                    {["Mobile snapshot view", "One-click fee payment", "Direct teacher chat"].map(t => (
                      <li key={t} className="flex items-center gap-3 text-white font-bold"><CheckCircle2 className="h-5 w-5 text-purple-500" /> {t}</li>
                    ))}
                 </ul>
              </div>
           </div>
        </div>
      </section>


      {/* Trust & Testimonial */}
      <section id="about" className="py-32 overflow-hidden">
        <div className="container mx-auto px-4">
           <div className="flex flex-col lg:flex-row items-center gap-20">
              <div className="flex-1">
                 <Badge className="bg-primary/10 text-primary mb-6 rounded-full px-4 py-1">REAL STORIES</Badge>
                 <h2 className="text-5xl md:text-7xl font-black tracking-tighter mb-8 uppercase leading-[0.9]">Trusted by forward-thinking educators.</h2>
                 <div className="p-10 rounded-[3rem] bg-white/5 border border-white/10 relative">
                    <MessageSquare className="absolute top-8 right-10 h-16 w-16 text-primary/10" />
                    <p className="text-2xl text-slate-200 italic font-medium leading-relaxed mb-8">"EduFlow has completely transformed how we manage our school. It's intuitive, powerful, and has saved us hundreds of hours of manual work every month."</p>
                    <div className="flex items-center gap-4">
                       <div className="h-14 w-14 rounded-full bg-slate-800" />
                       <div>
                          <p className="font-black text-xl">Dr. Sarah Jenkins</p>
                          <p className="text-slate-500 font-bold uppercase text-xs tracking-widest">Principal, Springfield Academy</p>
                       </div>
                    </div>
                 </div>
              </div>
              <div className="flex-1 grid grid-cols-2 gap-8">
                 {[
                   { label: "Active Students", value: stats?.students ? `${(stats.students / 1000).toFixed(1)}K+` : "15K+" },
                   { label: "Total Teachers", value: stats?.teachers ? `${stats.teachers}+` : "320+" },
                   { label: "Data Uptime", value: "99.9%" },
                   { label: "Growth", value: "140%" }
                 ].map(s => (
                   <div key={s.label} className="p-8 rounded-[2rem] bg-white/5 border border-white/5 text-center">
                      <p className="text-5xl font-black text-white tracking-tighter mb-2">{s.value}</p>
                      <p className="text-xs font-black text-primary uppercase tracking-[0.2em]">{s.label}</p>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      </section>

      {/* Calendly / Strategy Call */}
      <section className="py-32 bg-primary">
         <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-20 items-center">
               <div className="text-white space-y-8">
                  <h2 className="text-5xl md:text-8xl font-black tracking-tighter uppercase leading-[0.9]">Book a 15-Min Strategy Call.</h2>
                  <p className="text-2xl text-white/80 font-medium">Let's discuss how EduFlow can be tailored to your school's specific needs. Pick a time that works for you.</p>
                  <div className="flex items-center gap-6">
                     <div className="h-16 w-16 rounded-2xl bg-white/20 flex items-center justify-center">
                        <CheckCircle2 className="h-8 w-8 text-white" />
                     </div>
                     <span className="text-xl font-bold">Personalized onboarding strategy</span>
                  </div>
                  <div className="flex items-center gap-6">
                     <div className="h-16 w-16 rounded-2xl bg-white/20 flex items-center justify-center">
                        <DollarSign className="h-8 w-8 text-white" />
                     </div>
                     <span className="text-xl font-bold">Custom pricing for enterprise needs</span>
                  </div>
               </div>
               <div className="rounded-[3rem] bg-white p-6 shadow-2xl h-[600px] overflow-hidden flex flex-col">
                  <div className="flex items-center justify-between mb-8">
                     <div>
                        <h4 className="text-slate-900 font-black text-xl">Select a Date & Time</h4>
                        <p className="text-slate-500 font-medium text-sm">15 Min Strategy Call • May 2024</p>
                     </div>
                     <div className="flex gap-1">
                        {[1, 2, 3, 4, 5, 6, 7].map(i => {
                           const date = i + 10;
                           return (
                              <button
                                 key={i}
                                 onClick={() => setSelectedDate(date)}
                                 className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold transition-all",
                                    selectedDate === date ? "bg-primary text-white" : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                                 )}
                              >
                                 {date}
                              </button>
                           );
                        })}
                     </div>
                  </div>

                  <div className="flex-1 grid grid-cols-2 gap-4 overflow-y-auto pr-2 custom-scrollbar">
                     {["09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM", "01:00 PM", "01:30 PM", "02:00 PM", "02:30 PM"].map(time => (
                        <Button
                           key={time}
                           variant="outline"
                           onClick={() => setSelectedTime(time)}
                           className={cn(
                              "h-16 rounded-2xl border-slate-200 font-bold transition-all",
                              selectedTime === time ? "bg-primary/10 border-primary text-primary" : "text-slate-600 hover:border-primary hover:text-primary hover:bg-primary/5"
                           )}
                        >
                           {time}
                        </Button>
                     ))}
                  </div>

                  <Button
                     onClick={() => {
                        if (!selectedDate || !selectedTime) {
                           toast.error("Please select both a date and a time.");
                           return;
                        }
                        toast.success(`Strategy call booked for May ${selectedDate} at ${selectedTime}!`);
                        setSelectedDate(null);
                        setSelectedTime(null);
                     }}
                     className="mt-8 h-16 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black text-lg shadow-xl shadow-primary/20"
                  >
                     Confirm Booking
                  </Button>
               </div>
            </div>
         </div>
      </section>

      {/* Exit-Intent Popup */}
      <Dialog open={showExitIntent} onOpenChange={(open) => {
        setShowExitIntent(open);
        if (!open) localStorage.setItem('exit_intent_dismissed', 'true');
      }}>
        <DialogContent className="sm:max-w-2xl bg-slate-900 border-white/10 p-0 overflow-hidden rounded-[3rem]">
           <div className="grid md:grid-cols-2">
              <div className="bg-primary p-12 flex flex-col justify-center items-center text-center text-white space-y-6">
                 <div className="w-20 h-20 rounded-3xl bg-white/20 flex items-center justify-center">
                    <FileDown className="h-10 w-10" />
                 </div>
                 <h3 className="text-3xl font-black uppercase leading-tight">Wait! Don't go empty-handed.</h3>
              </div>
              <div className="p-12 space-y-6 flex flex-col justify-center">
                 <p className="text-slate-400 font-medium">Download our <span className="text-white font-bold">'2026 School Digital Transformation Guide'</span> for free before you leave.</p>
                 <div className="space-y-4">
                    <Input placeholder="Enter your email" className="h-14 rounded-2xl bg-white/5 border-white/10 text-white font-bold" />
                    <Button className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest shadow-lg shadow-primary/20">
                       Download Guide
                    </Button>
                    <button
                      onClick={() => { setShowExitIntent(false); localStorage.setItem('exit_intent_dismissed', 'true'); }}
                      className="w-full text-center text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors"
                    >
                      No thanks, I'll explore later
                    </button>
                 </div>
              </div>
           </div>
        </DialogContent>
      </Dialog>

      {/* Final CTA */}
      <section className="py-40 bg-slate-950 text-center relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-primary/5 rounded-full blur-[150px]" />
        <div className="container mx-auto px-4 relative z-10">
           <h2 className="text-6xl md:text-9xl font-black tracking-tighter mb-12 uppercase leading-[0.8]">Ready to transform <br />your school?</h2>
           <Button asChild size="lg" className="h-20 px-16 rounded-[2rem] text-2xl font-black bg-primary hover:bg-primary/90 text-white shadow-2xl shadow-primary/40 transition-transform hover:scale-105 active:scale-95">
             <Link to="/onboarding">Start Your Free Trial Now</Link>
           </Button>
           <p className="mt-8 text-slate-500 font-bold uppercase tracking-widest">Join 2,000+ institutions worldwide</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 border-t border-white/5 bg-slate-950">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-20">
            <div className="space-y-6">
               <div className="flex items-center gap-3">
                 <div className="p-2 rounded-xl bg-primary/20 border border-primary/20">
                   <ShieldCheck className="h-6 w-6 text-primary" />
                 </div>
                 <span className="text-2xl font-black text-white tracking-tighter uppercase">Edu<span className="text-primary">Flow</span></span>
               </div>
               <p className="text-slate-400 font-medium leading-relaxed">Revolutionizing education through innovative digital solutions and seamless institutional management.</p>
               <div className="flex gap-4">
                  <Twitter className="h-5 w-5 text-slate-500 hover:text-white transition-colors cursor-pointer" />
                  <Linkedin className="h-5 w-5 text-slate-500 hover:text-white transition-colors cursor-pointer" />
                  <Github className="h-5 w-5 text-slate-500 hover:text-white transition-colors cursor-pointer" />
                  <Facebook className="h-5 w-5 text-slate-500 hover:text-white transition-colors cursor-pointer" />
               </div>
            </div>

            <div className="space-y-6">
               <h4 className="font-black uppercase tracking-widest text-sm text-white">Product</h4>
               <ul className="space-y-4 text-slate-400 font-bold text-sm">
                  <li><Link to="/features" className="hover:text-primary transition-colors">Features</Link></li>
                  <li><a href="#solutions" className="hover:text-primary transition-colors">Solutions</a></li>
                  <li><Link to="/pricing" className="hover:text-primary transition-colors">Pricing</Link></li>
                  <li><Link to="/pages/security" className="hover:text-primary transition-colors">Security</Link></li>
               </ul>
            </div>

            <div className="space-y-6">
               <h4 className="font-black uppercase tracking-widest text-sm text-white">Resources</h4>
               <ul className="space-y-4 text-slate-400 font-bold text-sm">
                  <li><Link to="/pages/documentation" className="hover:text-primary transition-colors">Documentation</Link></li>
                  <li><Link to="/pages/support" className="hover:text-primary transition-colors">Help Center</Link></li>
                  <li><Link to="/pages/api-docs" className="hover:text-primary transition-colors">API Reference</Link></li>
                  <li><Link to="/pages/community" className="hover:text-primary transition-colors">Community</Link></li>
               </ul>
            </div>

            <div className="space-y-6">
               <h4 className="font-black uppercase tracking-widest text-sm text-white">Company</h4>
               <ul className="space-y-4 text-slate-400 font-bold text-sm">
                  <li><Link to="/about" className="hover:text-primary transition-colors">About Us</Link></li>
                  <li><Link to="/contact-sales" className="hover:text-primary transition-colors">Contact</Link></li>
                  <li><Link to="/pages/privacy" className="hover:text-primary transition-colors">Privacy</Link></li>
                  <li><Link to="/pages/terms" className="hover:text-primary transition-colors">Terms</Link></li>
               </ul>
            </div>
          </div>

          <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
             <div className="flex items-center gap-4">
                <span className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                   <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> All Systems Operational
                </span>
                <span className="text-slate-600">|</span>
                <span className="text-slate-400 text-xs font-bold flex items-center gap-2">
                   <ShieldCheck className="h-4 w-4" /> ISO 27001 Certified
                </span>
             </div>
             <div className="text-slate-500 text-sm font-medium">
                © {new Date().getFullYear()} EduFlow Tech Solutions. All rights reserved.
             </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
