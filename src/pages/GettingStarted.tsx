import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useScroll, useSpring } from "framer-motion";
import {
  ChevronRight,
  Play,
  Users,
  CheckCircle2,
  BarChart3,
  GraduationCap,
  Calendar,
  ClipboardCheck,
  CreditCard,
  ShieldCheck,
  Smartphone,
  Zap,
  ArrowRight,
  MessageSquare,
  AlertTriangle,
  Search,
  Plus,
  LayoutDashboard,
  BookOpen,
  PieChart,
  Target,
  Clock,
  Briefcase,
  Star,
  Check,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate, Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { HeroSlider } from "@/components/auth/HeroSlider";
import { useHeroSlides } from "@/hooks/use-hero-slides";

// --- Components ---

const PREMIUM_PRIMARY = '#6366f1'; // Indigo 500

const DotNavigation = ({ activeSection, sections, scrollToSection }: { activeSection: number, sections: string[], scrollToSection: (index: number) => void }) => {
  return (
    <div className="fixed right-8 top-1/2 -translate-y-1/2 z-50 hidden lg:flex flex-col gap-4">
      {sections.map((_, i) => (
        <button
          key={i}
          onClick={() => scrollToSection(i)}
          className={cn(
            "w-3 h-3 rounded-full transition-all duration-300",
            activeSection === i ? "scale-125 shadow-[0_0_10px_rgba(99,102,241,0.5)] bg-indigo-500" : "bg-white/20 hover:bg-white/40"
          )}
        />
      ))}
    </div>
  );
};

const Section = ({ children, id, className, index, setActiveSection, noMinHeight }: { children: React.ReactNode, id: string, className?: string, index: number, setActiveSection: (i: number) => void, noMinHeight?: boolean }) => {
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setActiveSection(index);
        }
      },
      { threshold: 0.5 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [index, setActiveSection]);

  return (
    <section id={id} ref={ref} className={cn(!noMinHeight && "min-h-screen", "relative flex items-center justify-center overflow-hidden py-20 px-6", className)}>
      {children}
    </section>
  );
};

// --- Mockup Components ---

const DashboardMockup = ({ role }: { role: 'admin' | 'teacher' | 'parent' }) => {
  const containerVariants = {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1, transition: { duration: 0.5 } }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="initial"
      animate="animate"
      className="relative w-full max-w-4xl aspect-[16/10] rounded-2xl border border-white/10 bg-slate-900/40 backdrop-blur-xl shadow-2xl overflow-hidden flex"
    >
      {/* Sidebar */}
      <div className="w-16 md:w-48 border-r border-white/5 bg-white/5 p-4 flex flex-col gap-6">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-500/20">
            <Zap className="w-5 h-5 text-indigo-400" />
          </div>
          <span className="font-bold text-white hidden md:block tracking-tighter">Edu<span className="text-indigo-400">Flow</span></span>
        </div>
        <div className="flex flex-col gap-2">
          {[
            { label: 'Overview', active: true },
            { label: 'Students', active: false },
            { label: 'Attendance', active: false },
            { label: 'Finance', active: false },
            { label: 'Reports', active: false }
          ].map((item, i) => (
            <div
              key={i}
              className={cn(
                "h-10 rounded-xl flex items-center gap-3 px-3",
                item.active ? "bg-indigo-500/20 text-indigo-400" : "text-slate-400"
              )}
            >
              <div className="w-5 h-5 rounded bg-current/20" />
              <div className="text-[10px] font-bold hidden md:block uppercase tracking-wider">{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 md:p-8 flex flex-col gap-6 overflow-hidden">
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <div className="h-6 w-48 bg-white/10 rounded-md" />
            <div className="h-3 w-32 bg-white/5 rounded-md" />
          </div>
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full bg-white/10" />
            <div className="w-10 h-10 rounded-full bg-white/10" />
          </div>
        </div>

        {role === 'admin' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Students', value: '1,248', color: 'bg-indigo-500/10' },
              { label: 'Teachers', value: '86', color: 'bg-emerald-500/10' },
              { label: 'Revenue', value: 'NPR 42.5k', color: 'bg-amber-500/10' },
              { label: 'Attendance', value: '94%', color: 'bg-rose-500/10' }
            ].map((stat, i) => (
              <div key={i} className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                <div className={cn("w-8 h-8 rounded-lg", stat.color)} />
                <div className="text-lg font-black text-white">{stat.value}</div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{stat.label}</div>
              </div>
            ))}
            <div className="col-span-2 md:col-span-3 h-48 rounded-2xl bg-white/5 border border-white/5 p-4">
              <div className="flex justify-between mb-4">
                <div className="text-xs font-bold text-slate-400">Monthly Enrollment Trend</div>
                <div className="text-[10px] text-slate-600">Last 7 Months</div>
              </div>
              <div className="flex items-end justify-between h-32 gap-2">
                {[40, 70, 45, 90, 65, 80, 50].map((h, i) => (
                  <motion.div
                    key={i}
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    transition={{ delay: i * 0.1, duration: 0.8 }}
                    className="flex-1 bg-indigo-600/40 rounded-t-sm"
                  />
                ))}
              </div>
            </div>
            <div className="col-span-2 md:col-span-1 h-48 rounded-2xl bg-white/5 border border-white/5 p-4 flex flex-col gap-3">
              <div className="text-xs font-bold text-slate-400 mb-2">Recent Alerts</div>
              {[
                { name: 'Fee Overdue', time: '2m ago' },
                { name: 'New Admission', time: '1h ago' },
                { name: 'Leave Req', time: '3h ago' }
              ].map((alert, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-white/10 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-bold text-white truncate">{alert.name}</div>
                    <div className="text-[8px] text-slate-500 uppercase">{alert.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {role === 'teacher' && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <ClipboardCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-slate-400 font-bold uppercase tracking-widest">Attendance</div>
                  <div className="text-xl font-black text-white">98%</div>
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-slate-400 font-bold uppercase tracking-widest">Lessons</div>
                  <div className="text-xl font-black text-white">12/15</div>
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-slate-400 font-bold uppercase tracking-widest">Exam Avg</div>
                  <div className="text-xl font-black text-white">84.2</div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/5 bg-white/5 overflow-hidden">
               <div className="p-4 border-b border-white/5 flex justify-between items-center">
                 <div className="text-xs font-bold text-slate-400">Class 10A Attendance - May 24</div>
                 <div className="h-8 px-4 bg-indigo-600/20 text-indigo-400 rounded-lg flex items-center text-[10px] font-black uppercase">Submit All</div>
               </div>
               <div className="p-4 space-y-3">
                 {[
                   { name: 'Alice Cooper', status: 'p' },
                   { name: 'Bob Marley', status: 'p' },
                   { name: 'Charlie Puth', status: 'a' },
                   { name: 'David Bowie', status: 'p' }
                 ].map((student, i) => (
                   <div key={i} className="flex items-center gap-4 py-2 border-b border-white/5 last:border-0">
                     <div className="w-8 h-8 rounded-full bg-white/10 shrink-0" />
                     <div className="flex-1 text-[11px] font-bold text-white">{student.name}</div>
                     <div className="flex gap-2">
                       <div className={cn("w-6 h-6 rounded flex items-center justify-center border", student.status === 'p' ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400" : "bg-white/5 border-white/10 text-slate-600")}>
                         <Check className="w-3 h-3" />
                       </div>
                       <div className={cn("w-6 h-6 rounded flex items-center justify-center border", student.status === 'a' ? "bg-rose-500/20 border-rose-500/30 text-rose-400" : "bg-white/5 border-white/10 text-slate-600")}>
                         <X className="w-3 h-3" />
                       </div>
                     </div>
                   </div>
                 ))}
               </div>
            </div>
          </div>
        )}

        {role === 'parent' && (
          <div className="flex gap-6 h-full">
            <div className="flex-1 space-y-6">
              <div className="p-6 rounded-[2rem] bg-gradient-to-br from-indigo-500/30 to-blue-500/30 border border-white/10 text-white">
                <div className="text-sm font-bold opacity-80 mb-1">Quarterly Tuition Fee</div>
                <div className="text-3xl font-black mb-4">NPR 850.00</div>
                <div className="flex justify-between items-center">
                  <div className="text-xs font-medium px-3 py-1 rounded-full bg-white/20">Due: June 15</div>
                  <div className="h-8 w-24 bg-white rounded-xl flex items-center justify-center text-xs font-black text-indigo-600">PAY NOW</div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Daily Summary</div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Attendance</div>
                    </div>
                    <div className="text-lg font-bold text-white">Present</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full bg-amber-500" />
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Homework</div>
                    </div>
                    <div className="text-lg font-bold text-white">2 Pending</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="w-64 flex flex-col gap-4">
              <div className="flex-1 rounded-2xl bg-white/5 border border-white/5 p-4">
                 <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Messages</div>
                 <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-white/10 shrink-0" />
                        <div className="space-y-1 overflow-hidden">
                          <div className="h-2 w-16 bg-white/10 rounded" />
                          <div className="h-1.5 w-full bg-white/5 rounded" />
                        </div>
                      </div>
                    ))}
                 </div>
              </div>
              <div className="h-32 rounded-2xl bg-white/5 border border-white/5 p-4">
                 <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Calendar</div>
                 <div className="grid grid-cols-7 gap-1">
                   {Array.from({length: 21}).map((_, i) => (
                     <div key={i} className={cn("aspect-square rounded-sm", i === 12 ? "bg-primary/40" : "bg-white/5")} />
                   ))}
                 </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// --- Page Sections ---

const HeroSection = ({ scrollToNext, setActiveSection }: { scrollToNext: () => void, setActiveSection: (i: number) => void }) => {
  const { data: slides } = useHeroSlides();
  // Mock data for verification if real data is missing
  const mockSlides = [
    {
      id: '1',
      title: 'Experience The Future',
      subtitle: 'Revolutionizing education with AI-driven insights.',
      media_url: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=2000&auto=format&fit=crop',
      media_type: 'image' as const,
      cta_text: 'Get Started',
      cta_link: '/contact-sales',
      overlay_opacity: 0.4,
      text_align: 'center' as const
    }
  ];
  const activeSlides = slides && slides.length > 0 ? slides : mockSlides;
  const hasSlides = activeSlides.length > 0;

  return (
    <Section id="hero" index={0} setActiveSection={setActiveSection} noMinHeight className="bg-slate-950 p-0 md:h-[100dvh] md:min-h-[100dvh] h-auto py-10 md:py-0">
      <div className="relative w-full h-full flex items-center justify-center">
      <div className={cn(
        "z-0 transition-all duration-500",
        hasSlides
          ? "md:absolute md:inset-0 w-[85%] md:w-full aspect-[4/5] md:aspect-auto rounded-[2rem] md:rounded-none overflow-hidden shadow-2xl md:shadow-none"
          : "absolute inset-0"
      )}>
        {hasSlides ? (
          <HeroSlider slides={slides} />
        ) : (
          <>
            <div className="absolute top-1/4 left-1/4 w-[50vw] h-[50vw] rounded-full blur-[120px] animate-pulse bg-indigo-500/10" />
            <div className="absolute bottom-1/4 right-1/4 w-[40vw] h-[40vw] rounded-full blur-[120px] animate-pulse delay-1000 bg-blue-500/10" />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:60px_60px]" />
          </>
        )}
      </div>

      {!hasSlides && (
        <div className="container mx-auto relative z-10 text-center flex flex-col items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 text-[10px] font-black tracking-widest uppercase mb-8 bg-indigo-500/20 text-indigo-400"
          >
            <SparklesIcon className="w-4 h-4" />
            <span>The Future of School Management</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-6xl md:text-8xl font-black text-white leading-[0.9] tracking-tighter mb-8 max-w-4xl"
          >
            Run Your Entire School <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-blue-400">from One Platform</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl md:text-2xl text-slate-400 font-medium max-w-2xl mb-12"
          >
            From admissions to attendance, exams to finance. <br />
            Everything simplified, everything in sync.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-wrap gap-6 justify-center"
          >
            <Button asChild className="h-16 px-10 rounded-2xl text-white text-lg font-black shadow-2xl shadow-indigo-600/20 transition-all hover:scale-105 active:scale-95 bg-indigo-600 hover:bg-indigo-700">
              <Link to="/contact-sales">Request Personalized Demo <ArrowRight className="ml-2 w-6 h-6" /></Link>
            </Button>
          </motion.div>
        </div>
      )}

      <div className="container mx-auto relative z-10 text-center flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
          className={cn(
            "flex flex-col items-center gap-2 cursor-pointer z-40 pointer-events-auto",
            hasSlides ? "mt-8 md:absolute md:bottom-10 md:left-1/2 md:-translate-x-1/2 md:mt-0" : "absolute bottom-10 left-1/2 -translate-x-1/2",
            hasSlides && "hidden md:flex" // Hide on mobile if slider present to avoid overlap with pagination
          )}
          onClick={scrollToNext}
        >
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Explore</span>
          <motion.div
            animate={{ y: [0, 5, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="w-1 h-8 rounded-full bg-gradient-to-b from-indigo-600 to-transparent"
          />
        </motion.div>
      </div>
      </div>
    </Section>
  );
};

const ProblemSection = ({ setActiveSection }: { setActiveSection: (i: number) => void }) => {
  const problems = [
    {
      title: "Manual Attendance",
      desc: "Wasted hours on paper registers and manual data entry.",
      icon: ClipboardCheck,
      color: "bg-amber-500/20 text-amber-500"
    },
    {
      title: "Scattered Comm",
      desc: "Lost messages and parents out of the loop.",
      icon: MessageSquare,
      color: "bg-rose-500/20 text-rose-500"
    },
    {
      title: "Poor Reporting",
      desc: "No real-time insights into student or center performance.",
      icon: AlertTriangle,
      color: "bg-blue-500/20 text-blue-500"
    }
  ];

  return (
    <Section id="problems" index={1} setActiveSection={setActiveSection} className="bg-slate-900">
      <div className="container mx-auto">
        <div className="text-center mb-20 space-y-4">
          <Badge className="bg-rose-500/10 text-rose-500 border-rose-500/20 rounded-full px-4 py-1">THE PAIN POINTS</Badge>
          <h2 className="text-4xl md:text-6xl font-black text-white tracking-tighter">Managing a school <br /><span className="text-slate-500">shouldn't be this hard.</span></h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {problems.map((p, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="p-8 rounded-[2.5rem] bg-white/5 border border-white/5 hover:bg-white/10 transition-all group"
            >
              <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110", p.color)}>
                <p.icon className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black text-white mb-4">{p.title}</h3>
              <p className="text-slate-400 font-medium leading-relaxed">{p.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </Section>
  );
};

const SolutionOverview = ({ setActiveSection }: { setActiveSection: (i: number) => void }) => {
  return (
    <Section id="solution" index={2} setActiveSection={setActiveSection} className="bg-slate-950">
      <div className="container mx-auto flex flex-col lg:flex-row items-center gap-20">
        <div className="flex-1 space-y-8">
          <Badge className="border-none rounded-full px-4 py-1 bg-indigo-500/10 text-indigo-400">THE SOLUTION</Badge>
          <h2 className="text-5xl md:text-7xl font-black text-white tracking-tighter leading-[0.9]">
            Meet EduFlow. <br />
            <span className="text-slate-500 text-4xl md:text-5xl">Your digital command center.</span>
          </h2>
          <p className="text-xl text-slate-400 font-medium leading-relaxed max-w-xl">
            We’ve consolidated every administrative tool into one beautiful, lightning-fast dashboard.
          </p>
          <div className="space-y-4">
             {[
               "Centralized Data Management",
               "Real-time Collaboration",
               "Automated Workflows"
             ].map((text, i) => (
               <div key={i} className="flex items-center gap-3">
                 <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                   <Check className="w-4 h-4" />
                 </div>
                 <span className="text-white font-bold">{text}</span>
               </div>
             ))}
          </div>
        </div>

        <div className="flex-1 w-full max-w-2xl">
          <DashboardMockup role="admin" />
        </div>
      </div>
    </Section>
  );
};

const FeatureSlide = ({ title, valueProp, icon: Icon, highlights, index, setActiveSection }: { title: string, valueProp: string, icon: any, highlights: string[], index: number, setActiveSection: (i: number) => void }) => {
  return (
    <Section id={`feature-${index}`} index={index} setActiveSection={setActiveSection} className={cn(index % 2 === 0 ? "bg-slate-900" : "bg-slate-950")}>
       <div className="container mx-auto flex flex-col lg:flex-row items-center gap-16">
          <div className={cn("flex-1 space-y-8", index % 2 === 1 ? "lg:order-2" : "")}>
             <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 bg-indigo-500/10 text-indigo-400">
                <Icon className="w-8 h-8" />
             </div>
             <div className="space-y-4">
                <h2 className="text-4xl md:text-6xl font-black text-white tracking-tighter">{title}</h2>
                <p className="text-2xl font-bold text-indigo-400">{valueProp}</p>
             </div>
             <div className="grid gap-4">
                {highlights.map((h, i) => (
                  <div key={i} className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                     <div className="mt-1">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                     </div>
                     <p className="text-slate-300 font-medium">{h}</p>
                  </div>
                ))}
             </div>
          </div>

          <div className="flex-1 w-full flex justify-center">
             {/* Simulated Feature Visuals */}
             <div className="relative w-full max-w-lg aspect-square rounded-[3rem] bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 p-8 flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 z-0 opacity-20">
                   <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600 blur-[80px]" />
                   <div className="absolute bottom-0 left-0 w-64 h-64 blur-[80px] bg-indigo-500" />
                </div>

                {title === "Student Management" && (
                   <div className="relative z-10 w-full space-y-4">
                      {[1, 2, 3, 4].map(i => (
                        <motion.div
                          initial={{ opacity: 0, x: 50 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          key={i}
                          className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 flex items-center gap-4"
                        >
                           <div className="w-12 h-12 rounded-full bg-white/10" />
                           <div className="flex-1 space-y-2">
                              <div className="h-3 w-32 bg-white/10 rounded" />
                              <div className="h-2 w-20 bg-white/5 rounded" />
                           </div>
                           <div className="h-6 w-16 bg-emerald-500/20 rounded-full" />
                        </motion.div>
                      ))}
                   </div>
                )}

                {title === "Attendance System" && (
                   <div className="relative z-10 grid grid-cols-4 gap-4 w-full">
                      {Array.from({length: 12}).map((_, i) => (
                        <motion.div
                          initial={{ scale: 0 }}
                          whileInView={{ scale: 1 }}
                          transition={{ delay: i * 0.05 }}
                          key={i}
                          className={cn(
                            "aspect-square rounded-2xl flex items-center justify-center border",
                            i % 5 === 0 ? "bg-rose-500/20 border-rose-500/30 text-rose-500" : "bg-emerald-500/20 border-emerald-500/30 text-emerald-500"
                          )}
                        >
                           {i % 5 === 0 ? <X className="w-6 h-6" /> : <Check className="w-6 h-6" />}
                        </motion.div>
                      ))}
                   </div>
                )}

                {title === "Exams & Reports" && (
                  <div className="relative z-10 w-full space-y-8">
                     <div className="flex items-end justify-between h-40 gap-3">
                        {[60, 40, 85, 70, 95, 50, 80].map((h, i) => (
                          <motion.div
                            key={i}
                            initial={{ height: 0 }}
                            whileInView={{ height: `${h}%` }}
                            transition={{ duration: 1, delay: i * 0.1 }}
                            className="flex-1 rounded-t-lg bg-gradient-to-t from-indigo-500 to-blue-400"
                          />
                        ))}
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10">
                           <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Class Avg</div>
                           <div className="text-2xl font-black text-white">A- (88%)</div>
                        </div>
                        <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10">
                           <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Pass Rate</div>
                           <div className="text-2xl font-black text-white">96.4%</div>
                        </div>
                     </div>
                  </div>
                )}

                {title === "Teacher & Staff Management" && (
                  <div className="relative z-10 w-full grid grid-cols-2 gap-6">
                     {[1, 2, 3, 4].map(i => (
                       <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.1 }}
                        className="p-6 rounded-[2rem] bg-slate-900/80 border border-white/10 text-center"
                       >
                          <div className="w-16 h-16 rounded-full bg-white/10 mx-auto mb-4" />
                          <div className="h-3 w-20 bg-white/10 rounded mx-auto mb-2" />
                          <div className="h-2 w-12 bg-white/5 rounded mx-auto" />
                       </motion.div>
                     ))}
                  </div>
                )}

                {title === "Parent Portal" && (
                  <div className="relative z-10 w-64 aspect-[9/19] bg-slate-950 border-[6px] border-slate-800 rounded-[3rem] p-4 flex flex-col gap-4 shadow-2xl">
                     <div className="w-16 h-1.5 bg-slate-800 rounded-full mx-auto mb-2" />
                     <div className="h-24 rounded-2xl p-3 border bg-indigo-500/20 border-indigo-500/30">
                        <div className="h-2 w-12 rounded mb-2 bg-indigo-400/40" />
                        <div className="text-[10px] font-bold text-white">Homework Assigned</div>
                     </div>
                     <div className="flex-1 space-y-3">
                        {[1, 2, 3, 4].map(i => (
                          <div key={i} className="flex items-center gap-3 p-2 rounded-xl bg-white/5">
                             <div className="w-8 h-8 rounded-lg bg-white/10" />
                             <div className="h-2 flex-1 bg-white/5 rounded" />
                          </div>
                        ))}
                     </div>
                     <div className="h-12 flex justify-around items-center border-t border-white/5">
                        {[1, 2, 3, 4].map(i => <div key={i} className="w-6 h-6 rounded-full bg-white/5" />)}
                     </div>
                  </div>
                )}

                {title === "Fees & Finance" && (
                   <div className="relative z-10 w-full space-y-6">
                      <div className="p-6 rounded-[2.5rem] bg-emerald-500/10 border border-emerald-500/20 text-center">
                         <div className="text-sm font-bold text-emerald-400 mb-1 uppercase tracking-widest">Total Collected</div>
                         <div className="text-4xl font-black text-white">NPR 124,500.00</div>
                      </div>
                      <div className="space-y-3">
                         {[1, 2, 3].map(i => (
                           <div key={i} className="flex justify-between items-center p-4 rounded-2xl bg-slate-900/80 border border-white/10">
                              <div className="flex items-center gap-3">
                                 <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                                    <CreditCard className="w-5 h-5 text-slate-400" />
                                 </div>
                                 <div className="h-3 w-24 bg-white/10 rounded" />
                              </div>
                              <div className="h-4 w-16 bg-white/5 rounded" />
                           </div>
                         ))}
                      </div>
                   </div>
                )}

                {title === "AI & Analytics" && (
                   <div className="relative z-10 w-full space-y-6">
                      <div className="flex justify-center">
                         <div className="relative">
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
                              className="w-32 h-32 rounded-full border-2 border-dashed border-indigo-400/40"
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                               <Zap className="w-12 h-12 animate-pulse text-indigo-400" />
                            </div>
                         </div>
                      </div>
                      <div className="grid gap-3">
                         <motion.div
                           whileHover={{ x: 10 }}
                           className="p-4 rounded-2xl border flex gap-4 items-center bg-indigo-500/10 border-indigo-500/20"
                         >
                            <div className="w-2 h-2 rounded-full animate-ping bg-indigo-400" />
                            <p className="text-sm font-bold text-white">Attendance predicted to rise by 12% next month</p>
                         </motion.div>
                         <motion.div
                           whileHover={{ x: 10 }}
                           className="p-4 rounded-2xl border flex gap-4 items-center bg-indigo-500/10 border-indigo-500/20"
                         >
                            <div className="w-2 h-2 rounded-full bg-indigo-400" />
                            <p className="text-sm font-bold text-white">Identify students at risk of falling behind</p>
                         </motion.div>
                      </div>
                   </div>
                )}
             </div>
          </div>
       </div>
    </Section>
  );
};

const RoleExperienceSection = ({ setActiveSection }: { setActiveSection: (i: number) => void }) => {
  const [activeTab, setActiveTab] = useState('admin');

  return (
    <Section id="roles" index={10} setActiveSection={setActiveSection} className="bg-slate-950">
      <div className="container mx-auto">
        <div className="text-center mb-16 space-y-4">
          <Badge className="border-none rounded-full px-4 py-1 bg-indigo-500/10 text-indigo-400">EXPERIENCE ROLES</Badge>
          <h2 className="text-4xl md:text-6xl font-black text-white tracking-tighter">One System. <br /><span className="text-slate-500">Every Perspective.</span></h2>
        </div>

        <Tabs defaultValue="admin" className="w-full" onValueChange={setActiveTab}>
          <div className="flex justify-center mb-12">
            <TabsList className="bg-white/5 border border-white/10 p-1 h-14 rounded-2xl">
              <TabsTrigger value="admin" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white rounded-xl px-8 font-black uppercase text-xs">Admin</TabsTrigger>
              <TabsTrigger value="teacher" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white rounded-xl px-8 font-black uppercase text-xs">Teacher</TabsTrigger>
              <TabsTrigger value="parent" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white rounded-xl px-8 font-black uppercase text-xs">Parent</TabsTrigger>
            </TabsList>
          </div>

          <div className="flex flex-col lg:flex-row gap-12 items-center min-h-[500px]">
             <div className="flex-1 max-w-xl">
               <AnimatePresence mode="wait">
                 {activeTab === 'admin' && (
                   <motion.div
                    key="admin-text"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-6"
                   >
                     <h3 className="text-3xl font-black text-white">Complete Oversight</h3>
                     <p className="text-lg text-slate-400 leading-relaxed font-medium">
                       Manage multiple centers, monitor total revenue, and track system-wide performance from a high-level cockpit.
                     </p>
                     <ul className="space-y-3">
                        {["Center Management", "Financial Analytics", "Staff Payroll", "Inventory Tracking"].map((item, i) => (
                          <li key={i} className="flex items-center gap-3 text-white font-bold">
                             <ShieldCheck className="w-5 h-5 text-indigo-400" /> {item}
                          </li>
                        ))}
                     </ul>
                   </motion.div>
                 )}
                 {activeTab === 'teacher' && (
                   <motion.div
                    key="teacher-text"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-6"
                   >
                     <h3 className="text-3xl font-black text-white">Focus on Teaching</h3>
                     <p className="text-lg text-slate-400 leading-relaxed font-medium">
                       Streamline classroom tasks so teachers can focus on what matters most: the students.
                     </p>
                     <ul className="space-y-3">
                        {["One-tap Attendance", "Digital Lesson Plans", "Auto-grading Exams", "Activity Logs"].map((item, i) => (
                          <li key={i} className="flex items-center gap-3 text-white font-bold">
                             <GraduationCap className="w-5 h-5 text-indigo-400" /> {item}
                          </li>
                        ))}
                     </ul>
                   </motion.div>
                 )}
                 {activeTab === 'parent' && (
                   <motion.div
                    key="parent-text"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-6"
                   >
                     <h3 className="text-3xl font-black text-white">Engaged Parenting</h3>
                     <p className="text-lg text-slate-400 leading-relaxed font-medium">
                       Never miss a beat. Stay informed about your child's progress, attendance, and school events in real-time.
                     </p>
                     <ul className="space-y-3">
                        {["Live Progress Reports", "Instant Messaging", "Online Fee Payment", "Homework Tracker"].map((item, i) => (
                          <li key={i} className="flex items-center gap-3 text-white font-bold">
                             <Users className="w-5 h-5 text-indigo-400" /> {item}
                          </li>
                        ))}
                     </ul>
                   </motion.div>
                 )}
               </AnimatePresence>
             </div>

             <div className="flex-1 w-full flex justify-center">
                <DashboardMockup role={activeTab as any} />
             </div>
          </div>
        </Tabs>
      </div>
    </Section>
  );
};

const WorkflowSection = ({ setActiveSection }: { setActiveSection: (i: number) => void }) => {
  const steps = [
    { title: "Admission", desc: "Digital enrollment & data capture", icon: Users },
    { title: "Class", desc: "Automated routine & scheduling", icon: Calendar },
    { title: "Attendance", desc: "One-tap digital presence", icon: ClipboardCheck },
    { title: "Exam", desc: "Smart evaluation & grading", icon: Target },
    { title: "Report", desc: "AI-powered performance cards", icon: BarChart3 }
  ];

  return (
    <Section id="workflow" index={11} setActiveSection={setActiveSection} className="bg-slate-900">
      <div className="container mx-auto">
        <div className="text-center mb-20 space-y-4">
          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 rounded-full px-4 py-1">THE FLOW</Badge>
          <h2 className="text-4xl md:text-6xl font-black text-white tracking-tighter">Everything Connects.</h2>
        </div>

        <div className="relative flex flex-col md:flex-row justify-between gap-8 max-w-6xl mx-auto">
           {/* Connecting Line */}
           <div className="absolute top-1/2 left-0 w-full h-0.5 bg-white/5 -translate-y-1/2 hidden md:block" />

           {steps.map((step, i) => (
             <motion.div
               key={i}
               initial={{ opacity: 0, scale: 0.8 }}
               whileInView={{ opacity: 1, scale: 1 }}
               viewport={{ once: true }}
               transition={{ delay: i * 0.2 }}
               className="relative z-10 flex-1 flex flex-col items-center text-center group"
             >
               <style>
                 {`
                   .workflow-icon-group:hover {
                      background-color: ${PREMIUM_PRIMARY} !important;
                   }
                 `}
               </style>
               <div
                 className="w-20 h-20 rounded-[2rem] bg-slate-950 border border-white/10 flex items-center justify-center mb-6 transition-all group-hover:bg-indigo-600 group-hover:text-white group-hover:scale-110 text-indigo-400"
               >
                  <step.icon className="w-8 h-8" />
               </div>
               <h3 className="text-xl font-bold text-white mb-2">{step.title}</h3>
               <p className="text-slate-400 text-sm font-medium">{step.desc}</p>
             </motion.div>
           ))}
        </div>
      </div>
    </Section>
  );
};

const TrustSection = ({ setActiveSection }: { setActiveSection: (i: number) => void }) => {
  return (
    <Section id="trust" index={12} setActiveSection={setActiveSection} className="bg-slate-950">
      <div className="container mx-auto">
        <div className="grid lg:grid-cols-2 gap-20 items-center">
          <div className="space-y-8">
            <h2 className="text-5xl md:text-7xl font-black text-white tracking-tighter">Trusted by Forward-Thinking Schools.</h2>
            <p className="text-xl text-slate-400 font-medium leading-relaxed">
              Join the growing network of educational institutions revolutionizing their management with EduFlow.
            </p>
            <div className="grid grid-cols-2 gap-8">
               <div>
                  <div className="text-5xl font-black tracking-tighter mb-2 text-indigo-500">15,400+</div>
                  <div className="text-xs font-black text-slate-500 uppercase tracking-widest">Students Managed</div>
               </div>
               <div>
                  <div className="text-5xl font-black tracking-tighter mb-2 text-indigo-500">320+</div>
                  <div className="text-xs font-black text-slate-500 uppercase tracking-widest">Institutions</div>
               </div>
            </div>
          </div>

          <div className="grid gap-6">
             {[
               { name: 'Dr. Sarah Jenkins', school: 'St. Mary\'s International', text: 'EDUFLOW has completely transformed how we handle our daily operations. The interface is intuitive, and the support is exceptional.' },
               { name: 'Mr. David Thompson', school: 'Global Vision School', text: 'The financial transparency and parent engagement features have significantly improved our school\'s reputation and efficiency.' }
             ].map((t, i) => (
               <div key={i} className="p-8 rounded-[2.5rem] bg-white/5 border border-white/10 relative overflow-hidden group">
                  <div className="flex gap-1 text-amber-400 mb-4">
                     {[1, 2, 3, 4, 5].map(star => <Star key={star} className="w-4 h-4 fill-current" />)}
                  </div>
                  <p className="text-lg text-slate-300 italic mb-6 relative z-10">
                    "{t.text}"
                  </p>
                  <div className="flex items-center gap-4 relative z-10">
                     <div className="w-12 h-12 rounded-full bg-white/10" />
                     <div>
                        <div className="font-bold text-white">{t.name}</div>
                        <div className="text-xs text-slate-500 uppercase font-black tracking-widest">{t.school}</div>
                     </div>
                  </div>
                  <div className="absolute top-0 right-0 p-8 opacity-5">
                     <MessageSquare className="w-32 h-32 text-indigo-400" />
                  </div>
               </div>
             ))}
          </div>
        </div>
      </div>
    </Section>
  );
};

const FinalCTASection = ({ setActiveSection, scrollToSection }: { setActiveSection: (i: number) => void, scrollToSection: (i: number) => void }) => {
  return (
    <Section id="final-cta" index={13} setActiveSection={setActiveSection} className="overflow-hidden bg-indigo-600">
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.2)_0%,transparent_70%)]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] border border-white/10 rounded-full animate-ping" />
      </div>

      <div className="container mx-auto relative z-10 text-center flex flex-col items-center">
        <h2 className="text-5xl md:text-8xl font-black text-white tracking-tighter leading-[0.9] mb-8 uppercase">
          Start Managing Your <br />School Smarter Today.
        </h2>
        <p className="text-xl md:text-2xl text-white/80 font-medium mb-12 max-w-2xl">
          Join the elite institutions that prioritize efficiency, transparency, and growth.
        </p>

        <div className="flex flex-wrap gap-6 justify-center">
          <Button asChild className="h-16 px-10 rounded-2xl text-white text-lg font-black shadow-2xl transition-all hover:scale-105 active:scale-95 bg-indigo-600 hover:bg-indigo-700 shadow-indigo-900/40">
            <Link to="/onboarding">Start Your 14-Day Free Trial</Link>
          </Button>
          <Button asChild variant="outline" className="h-16 px-10 rounded-2xl text-white text-lg font-black border-white/20 bg-white/5 hover:bg-white/10 shadow-2xl transition-all hover:scale-105 active:scale-95">
             <Link to="/contact-sales">Request Personalized Demo</Link>
          </Button>
        </div>

        <div className="mt-20 flex flex-col items-center gap-4">
           <div className="flex items-center gap-3">
              <div className="flex -space-x-3">
                 {[1, 2, 3, 4].map(i => (
                    <div key={i} className="w-10 h-10 rounded-full border-4 border-primary bg-slate-200 overflow-hidden">
                       <img src={`https://i.pravatar.cc/150?u=${i + 20}`} alt="user" className="w-full h-full object-cover" />
                    </div>
                 ))}
              </div>
              <span className="text-white font-bold">2k+ schools joined last month</span>
           </div>
        </div>
      </div>
    </Section>
  );
};

const SparklesIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 3L14.5 9L21 11.5L14.5 14L12 21L9.5 14L3 11.5L9.5 9L12 3Z" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// --- Main Page ---

const GettingStarted = () => {
  const [activeSection, setActiveSection] = useState(0);
  const navigate = useNavigate();

  const sections = [
    "hero", "problems", "solution",
    "student-mgmt", "attendance", "exams", "teachers", "parents", "finance", "ai",
    "roles", "workflow", "trust", "final-cta"
  ];

  const scrollToSection = (index: number) => {
    const el = document.getElementById(sections[index]);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const featureSlides = [
    {
      title: "Student Management",
      valueProp: "A 360° view of every student.",
      icon: Users,
      highlights: [
        "Smart Admission & Enrollment",
        "Document & Profile Management",
        "Dynamic Class Assignments"
      ]
    },
    {
      title: "Attendance System",
      valueProp: "Mark presence in seconds.",
      icon: ClipboardCheck,
      highlights: [
        "One-tap Digital Registers",
        "Auto-Notify Parents via SMS",
        "Monthly Trend Analytics"
      ]
    },
    {
      title: "Exams & Reports",
      valueProp: "From assessment to achievement.",
      icon: Target,
      highlights: [
        "Gradebook Automation",
        "Digital Marksheet Generation",
        "Performance Benchmarking"
      ]
    },
    {
      title: "Teacher & Staff Management",
      valueProp: "Empower your educators.",
      icon: Briefcase,
      highlights: [
        "HR & Payroll Integration",
        "Teacher Performance Tracking",
        "Meeting & Task Scheduling"
      ]
    },
    {
      title: "Parent Portal",
      valueProp: "Bridging the gap between home and school.",
      icon: Smartphone,
      highlights: [
        "Mobile-First Experience",
        "Direct Messaging to Teachers",
        "Live Event & Holiday Calendar"
      ]
    },
    {
      title: "Fees & Finance",
      valueProp: "Keep your institution healthy.",
      icon: CreditCard,
      highlights: [
        "Online Fee Collection",
        "Expense & Salary Management",
        "Automated Invoicing"
      ]
    },
    {
      title: "AI & Analytics",
      valueProp: "Data-driven decisions, simplified.",
      icon: Zap,
      highlights: [
        "Predictive Student Performance",
        "Resource Optimization Insights",
        "Automated Activity Logging"
      ]
    }
  ];

  return (
    <div className="bg-slate-950 min-h-screen selection:bg-indigo-500/20 selection:text-indigo-400">
      <DotNavigation
        activeSection={activeSection}
        sections={sections}
        scrollToSection={scrollToSection}
      />

      {/* Nav Overlay */}
      <nav className="fixed top-0 left-0 w-full z-[60] px-6 py-6 flex justify-between items-center pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto cursor-pointer" onClick={() => navigate("/")}>
          <div className={cn("p-2 rounded-xl border transition-colors", activeSection === 13 ? "bg-white/20 border-white/20" : "bg-indigo-600/20 border-indigo-600/20")}>
            <ShieldCheck className={cn("h-6 w-6 transition-colors", activeSection === 13 ? "text-white" : "text-indigo-400")} />
          </div>
          <span className="text-2xl font-black text-white tracking-tighter uppercase">Edu<span className={cn("transition-colors", activeSection === 13 ? "text-white/80" : "text-indigo-400")}>Flow</span></span>
        </div>

        <div className="pointer-events-auto">
           <Button asChild variant="ghost" className="text-white font-bold hover:bg-white/5 rounded-full px-6">
             <Link to="/login">Login</Link>
           </Button>
        </div>
      </nav>

      <HeroSection scrollToNext={() => scrollToSection(1)} setActiveSection={setActiveSection} />
      <ProblemSection setActiveSection={setActiveSection} />
      <SolutionOverview setActiveSection={setActiveSection} />

      {featureSlides.map((feature, i) => (
        <FeatureSlide
          key={i}
          index={3 + i}
          {...feature}
          setActiveSection={setActiveSection}
        />
      ))}

      <RoleExperienceSection setActiveSection={setActiveSection} />
      <WorkflowSection setActiveSection={setActiveSection} />
      <TrustSection setActiveSection={setActiveSection} />
      <FinalCTASection setActiveSection={setActiveSection} scrollToSection={scrollToSection} />

      {/* Footer */}
      <footer className="bg-slate-950 py-12 px-6 border-t border-white/5 text-center">
         <div className="flex items-center justify-center gap-3 mb-6">
            <ShieldCheck className="h-6 w-6 text-indigo-400" />
            <span className="text-xl font-black text-white tracking-tighter uppercase">Edu<span className="text-indigo-400">Flow</span></span>
         </div>
         <p className="text-slate-500 font-medium mb-8">© {new Date().getFullYear()} EduFlow Tech Solutions. All rights reserved.</p>
         <div className="flex justify-center gap-6">
            <a href="#" className="text-slate-400 hover:text-white transition-colors">Privacy</a>
            <a href="#" className="text-slate-400 hover:text-white transition-colors">Terms</a>
            <a href="#" className="text-slate-400 hover:text-white transition-colors">Support</a>
         </div>
      </footer>
    </div>
  );
};

export default GettingStarted;
