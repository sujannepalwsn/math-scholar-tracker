import React, { useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
 ChevronLeft,
 Shield,
 LayoutDashboard,
 Users,
 Briefcase,
 BookOpen,
 ClipboardCheck,
 GraduationCap,
 Target,
 Pencil,
 AlertTriangle,
 DollarSign,
 UserCheck,
 Package,
 Bus,
 MessageSquare,
 Bell,
 Calendar,
 Settings,
 Sparkles,
 Bug,
 UserPlus,
 Palette,
 BarChart,
 Database,
 PieChart,
 School,
 FileText,
 Sliders,
 History,
 CheckCircle2,
 ArrowRight
} from 'lucide-react';
import { SYSTEM_MODULES } from '@/lib/system-modules';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const iconMap: Record<string, React.ElementType> = {
 Shield, LayoutDashboard, Users, Briefcase, BookOpen, ClipboardCheck, GraduationCap,
 Target, Pencil, AlertTriangle, DollarSign, UserCheck, Package, Bus, MessageSquare,
 Bell, Calendar, Settings, Sparkles, Bug, UserPlus, Palette, BarChart, Database,
 PieChart, School, FileText, Sliders, History
};

const suiteMapping: Record<string, number[]> = {
 academic: [3, 4, 5, 6, 7, 8, 9, 10, 23, 24, 28],
 admin: [1, 12, 13, 14, 18, 20, 21, 22, 27, 30, 2, 25, 26, 19],
 finance: [11],
 communication: [15, 16, 17, 29]
};

const suiteInfo: Record<string, { title: string; description: string; color: string }> = {
 academic: {
  title: "Academic Suite",
  description: "Empower teachers and inspire students with tools designed for academic excellence.",
  color: "from-blue-500/20 to-indigo-500/20"
 },
 admin: {
  title: "Administrative Suite",
  description: "Streamline operations and maintain complete control over your institution's data and workflows.",
  color: "from-purple-500/20 to-pink-500/20"
 },
 finance: {
  title: "Finance Suite",
  description: "Automate fee collection, track expenses, and gain full visibility into your school's financial health.",
  color: "from-emerald-500/20 to-teal-500/20"
 },
 communication: {
  title: "Communication Suite",
  description: "Bridge the gap between school and home with real-time updates and seamless messaging.",
  color: "from-orange-500/20 to-amber-500/20"
 }
};

const SuiteExplorer = () => {
 const { suiteId } = useParams<{ suiteId: string }>();
 const navigate = useNavigate();

 const currentSuite = suiteId?.toLowerCase() || 'academic';
 const info = suiteInfo[currentSuite] || suiteInfo.academic;
 const moduleIds = suiteMapping[currentSuite] || suiteMapping.academic;

 const modules = useMemo(() => {
  return SYSTEM_MODULES.filter(m => moduleIds.includes(m.id));
 }, [moduleIds]);

 const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
   opacity: 1,
   transition: {
    staggerChildren: 0.1
   }
  }
 };

 const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
   y: 0,
   opacity: 1
  }
 };

 return (
  <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
   {/* Header */}
   <div className={`w-full py-20 px-6 bg-gradient-to-br ${info.color} border-b border-slate-200 dark:border-slate-800 relative overflow-hidden`}>
    <div className="absolute inset-0 bg-grid-slate-200/50 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:bg-grid-slate-800/50 dark:[mask-image:linear-gradient(0deg,rgba(0,0,0,0),rgba(0,0,0,0.6))]" />

    <div className="max-w-7xl mx-auto relative z-10">
     <Button
      variant="ghost"
      className="mb-8 hover:bg-white dark:hover:bg-black/20"
      onClick={() => navigate('/')}
     >
      <ChevronLeft className="mr-2 h-4 w-4" />
      Back to Home
     </Button>

     <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
     >
      <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-slate-900 dark:text-white mb-6">
       {info.title}
      </h1>
      <p className="text-xl text-slate-600 dark:text-slate-400 max-w-3xl leading-relaxed">
       {info.description}
      </p>
     </motion.div>
    </div>
   </div>

   {/* Modules Grid */}
   <div className="max-w-7xl mx-auto px-6 -mt-10">
    <motion.div
     className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
     variants={containerVariants}
     initial="hidden"
     animate="visible"
    >
     {modules.map((module) => {
      const Icon = iconMap[module.icon] || Settings;
      return (
       <motion.div key={module.id} variants={itemVariants}>
        <Card className="h-full border-slate-200 dark:border-slate-800 hover:shadow-xl transition-all duration-300 group overflow-hidden bg-white dark:bg-slate-900/80 ">
         <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300" />

         <CardHeader>
          <div className="flex items-center justify-between mb-4">
           <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform duration-300">
            <Icon size={24} />
           </div>
           <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border border-border">
            {module.completeness}
           </Badge>
          </div>
          <CardTitle className="text-xl group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
           {module.name}
          </CardTitle>
          <CardDescription className="line-clamp-2 mt-2">
           {module.description}
          </CardDescription>
         </CardHeader>

         <CardContent>
          <div className="space-y-4">
           <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Key Functionalities</h4>
            <ul className="space-y-2">
             {module.key_functionalities.slice(0, 3).map((func, idx) => (
              <li key={idx} className="flex items-start text-sm text-slate-600 dark:text-slate-400">
               <CheckCircle2 className="h-4 w-4 text-emerald-500 mr-2 mt-0.5 flex-shrink-0" />
               <span>{func}</span>
              </li>
             ))}
            </ul>
           </div>

           <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <Link to="/login" className="flex items-center text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:gap-2 transition-all">
             Try in Sandbox <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
           </div>
          </div>
         </CardContent>
        </Card>
       </motion.div>
      );
     })}
    </motion.div>
   </div>

   {/* Final CTA */}
   <div className="max-w-4xl mx-auto px-6 mt-20 text-center">
    <div className="p-12 rounded-2xl bg-indigo-600 text-white shadow-2xl relative overflow-hidden">
     <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-white rounded-full blur-3xl" />
     <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-indigo-900/30 rounded-full blur-3xl" />

     <h2 className="text-3xl font-bold mb-6 relative z-10">Ready to see EduFlow in action?</h2>
     <p className="text-indigo-100 mb-8 max-w-xl mx-auto relative z-10">
      Join 2,000+ institutions transforming their operations with our unified school management platform.
     </p>
     <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10">
      <Button size="lg" className="bg-white text-indigo-600 hover:bg-slate-100 font-bold px-8 shadow-xl" onClick={() => navigate('/login')}>
       Launch Free Sandbox
      </Button>
      <button
       className="h-11 rounded-lg px-6 border border-white/30 text-white hover:bg-white font-bold transition-all active:scale-95"
       onClick={() => navigate('/contact-sales')}
      >
       Book a Strategy Call
      </button>
     </div>
    </div>
   </div>
  </div>
 );
};

export default SuiteExplorer;
