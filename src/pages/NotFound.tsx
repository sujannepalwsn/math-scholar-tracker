import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Shield, Home, ArrowLeft, Search, HelpCircle, MessageSquare, LayoutTemplate, Zap, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  const quickLinks = [
    { label: "Dashboard", icon: LayoutTemplate, onClick: () => navigate("/center-dashboard") },
    { label: "Pricing", icon: DollarSign, onClick: () => navigate("/pricing") },
    { label: "Contact Support", icon: HelpCircle, onClick: () => navigate("/contact-sales") },
    { label: "Features", icon: LayoutTemplate, onClick: () => navigate("/features") },
    { label: "About Us", icon: Shield, onClick: () => navigate("/about") },
    { label: "Start Free Trial", icon: Zap, onClick: () => navigate("/onboarding") },
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-primary-light selection:text-primary">
      {/* Background Decor */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full blur-[120px] bg-primary/5 animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full blur-[120px] bg-indigo-500/5 animate-pulse delay-1000" />
      </div>

      <div className="relative z-10 max-w-4xl w-full text-center space-y-12">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-3 mb-12"
        >
          <div className="p-2 rounded-xl bg-primary-light border border-primary/10">
            <Shield className="h-10 w-10 text-primary" />
          </div>
          <span className="text-3xl font-black text-slate-950 tracking-tighter uppercase">Edu<span className="text-primary">Flow</span></span>
        </motion.div>

        {/* 404 Visual */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="relative inline-block"
        >
          <h1 className="text-[12rem] md:text-[18rem] font-black leading-none tracking-tighter text-slate-50 select-none">404</h1>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-900">
            <Search className="h-24 w-24 text-primary mb-4 opacity-20" />
            <p className="text-2xl md:text-3xl font-black tracking-tight uppercase">Route Not Found</p>
          </div>
        </motion.div>

        {/* Message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-6"
        >
          <p className="text-xl text-slate-600 font-medium max-w-lg mx-auto leading-relaxed">
            The page you are looking for doesn't exist or has been moved to a new destination.
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-4">
             <Button
               variant="ghost"
               className="text-slate-600 font-bold hover:bg-slate-50 rounded-xl px-10 h-12"
               onClick={() => navigate(-1)}
             >
               <ArrowLeft className="h-5 w-5 mr-2" /> Go Back
             </Button>
             <Button
               className="bg-primary hover:bg-primary/90 text-white font-black rounded-xl px-12 h-12 shadow-sm"
               onClick={() => navigate("/")}
             >
               Return Home
             </Button>
          </div>
        </motion.div>

        {/* Quick Links Grid */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="pt-12 space-y-6"
        >
          <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Explore EduFlow Ecosystem</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
            {quickLinks.map((link, i) => (
              <motion.button
                key={i}
                whileHover={{ y: -4, backgroundColor: "rgb(248 250 252)" }}
                whileTap={{ scale: 0.98 }}
                onClick={link.onClick}
                className="flex flex-col items-center justify-center gap-3 p-6 rounded-[2rem] bg-white border border-border shadow-sm text-slate-900 transition-all group"
              >
                <link.icon className="h-6 w-6 text-primary" />
                <span className="text-sm font-bold tracking-tight">{link.label}</span>
              </motion.button>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Footer info */}
      <footer className="absolute bottom-8 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
        Secure Infrastructure • v3.4.0 (Enterprise)
      </footer>
    </div>
  );
};

export default NotFound;
