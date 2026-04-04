import React, { useEffect } from "react";
import { Shield, ArrowRight, Loader2, User, Lock, ExternalLink, ChevronRight, Github, Twitter, Linkedin, Facebook, Users, Briefcase, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Tables } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface LoginLayoutProps {
 settings: Tables<'login_page_settings'> | null;
 username: string;
 setUsername: (val: string) => void;
 password: string;
 setPassword: (val: string) => void;
 loading: boolean;
 onSubmit: (e: React.FormEvent) => void;
 extraFooter?: React.ReactNode;
}

const LoginLayout: React.FC<LoginLayoutProps> = ({
 settings,
 username,
 setUsername,
 password,
 setPassword,
 loading,
 onSubmit,
 extraFooter
}) => {
 const navigate = useNavigate();
 const location = useLocation();
 const primaryColor = settings?.primary_color || '#4f46e5';

 const hexToHSL = (hex: string) => {
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16) / 255;
    g = parseInt(hex[2] + hex[2], 16) / 255;
    b = parseInt(hex[3] + hex[3], 16) / 255;
  } else if (hex.length === 7) {
    r = parseInt(hex.slice(1, 3), 16) / 255;
    g = parseInt(hex.slice(3, 5), 16) / 255;
    b = parseInt(hex.slice(5, 7), 16) / 255;
  }
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
   const d = max - min;
   s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
   switch (max) {
    case r: h = (g - b) / d + (g < b ? 6 : 0); break;
    case g: h = (b - r) / d + 2; break;
    case b: h = (r - g) / d + 4; break;
   }
   h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
 };

 const getCurrentRole = () => {
  const path = location.pathname;
  if (path === '/login-admin') return 'admin';
  if (path === '/login-teacher') return 'teacher';
  if (path === '/login-parent') return 'parent';
  return 'center';
 };

 const currentRole = getCurrentRole();

 const handleRoleChange = (role: string) => {
  if (role === 'admin') navigate('/login-admin');
  else if (role === 'teacher') navigate('/login-teacher');
  else if (role === 'parent') navigate('/login-parent');
  else navigate('/login');
 };

 const devInfo = (settings?.developer_info as any) || { name: "EduFlow Tech", website: "#", copyright: `© ${new Date().getFullYear()}` };
 const footerLinks = Array.isArray(settings?.footer_links) ? (settings.footer_links as any) : [
  { title: "Product", links: [{ label: "Features", href: "/#features" }, { label: "Pricing", href: "/pricing" }, { label: "Solutions", href: "/getting-started" }] },
  { title: "Support", links: [{ label: "Contact Sales", href: "/contact-sales" }, { label: "Help Center", href: "#" }, { label: "Security", href: "#" }] },
  { title: "Company", links: [{ label: "About Us", href: "/#about" }, { label: "Privacy", href: "#" }, { label: "Terms", href: "#" }] }
 ];
 const toggles = (settings?.section_toggles as any) || { show_footer: true };

 useEffect(() => {
  if (primaryColor) {
   document.documentElement.style.setProperty('--primary', hexToHSL(primaryColor));
  }
 }, [primaryColor]);

 return (
  <div className="min-h-screen flex flex-col font-sans selection:bg-primary/20 selection:text-primary scroll-smooth overflow-x-hidden bg-slate-50">
   <header className="relative z-50 w-full px-4 md:px-8 py-4 flex items-center justify-between border-b border-border bg-white ">
    <Link to="/" className="flex items-center gap-3">
     <div className="p-1.5 md:p-2 rounded-xl bg-primary/10 border border-primary/10">
      {settings?.logo_url ? (
       <img src={settings.logo_url} alt="Logo" className="h-6 w-6 md:h-8 md:w-8 object-contain" />
      ) : (
       <Shield className="h-5 w-5 md:h-6 md:w-6 text-primary" />
      )}
     </div>
     <span className="text-lg md:text-2xl font-black text-slate-950 tracking-tighter uppercase shrink-0">Edu<span className="text-primary">Flow</span></span>
    </Link>

    <div className="flex items-center gap-2 md:gap-4 shrink-0">
      <Link to="/contact-sales">
       <Button variant="ghost" className="text-slate-600 font-bold hover:bg-slate-100 rounded-xl px-3 md:px-6 text-xs md:text-sm">
        Contact
       </Button>
      </Link>
      <Link to="/getting-started">
       <Button className="bg-primary hover:bg-primary/90 text-white font-bold rounded-xl px-5 md:px-8 shadow-sm text-xs md:text-sm h-10">
        Tour
       </Button>
      </Link>
    </div>
   </header>

   <main className="relative z-10 flex-1 flex items-center justify-center py-12 px-4">
    <div className="w-full max-w-[460px]">
     <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
     >
      <Card className="border border-border shadow-xl bg-white rounded-2xl overflow-hidden text-slate-900">
       <CardHeader className="space-y-6 pt-10 pb-6 px-8 text-center">
        <div className="flex flex-col items-center gap-4">
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/10 py-1 px-4 rounded-full font-black tracking-widest text-[10px] uppercase">
           SECURE GATEWAY
          </Badge>
          <CardTitle className="text-4xl font-black tracking-tight text-slate-950">
          {settings?.title || 'Welcome Back'}
         </CardTitle>
         <p className="text-slate-500 font-medium text-sm">
          Enter your credentials to access your dashboard
         </p>
        </div>
       </CardHeader>

       <CardContent className="pb-10 px-8">
        <form onSubmit={onSubmit} className="space-y-6">
         <div className="space-y-2">
          <Label className="text-xs font-black text-slate-400 ml-1 uppercase tracking-widest">
           Login Role
          </Label>
          <Select value={currentRole} onValueChange={handleRoleChange}>
           <SelectTrigger className="h-14 rounded-2xl border-border bg-slate-50 font-bold text-slate-900 transition-all focus:bg-white focus:ring-primary/20">
            <SelectValue placeholder="Select Role" />
           </SelectTrigger>
           <SelectContent className="bg-white border-border text-slate-900 rounded-2xl shadow-xl">
            <SelectItem value="center" className="focus:bg-primary/10 focus:text-primary cursor-pointer py-3 rounded-xl">
              <div className="flex items-center gap-3">
               <div className="p-2 rounded-lg bg-blue-50 text-blue-600"><Shield className="h-4 w-4" /></div>
               <span className="font-bold">Tuition Center</span>
              </div>
            </SelectItem>
            <SelectItem value="teacher" className="focus:bg-primary/10 focus:text-primary cursor-pointer py-3 rounded-xl">
              <div className="flex items-center gap-3">
               <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600"><Briefcase className="h-4 w-4" /></div>
               <span className="font-bold">Teacher Portal</span>
              </div>
            </SelectItem>
            <SelectItem value="parent" className="focus:bg-primary/10 focus:text-primary cursor-pointer py-3 rounded-xl">
              <div className="flex items-center gap-3">
               <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600"><Users className="h-4 w-4" /></div>
               <span className="font-bold">Parent Portal</span>
              </div>
            </SelectItem>
            <SelectItem value="admin" className="focus:bg-primary/10 focus:text-primary cursor-pointer py-3 rounded-xl">
              <div className="flex items-center gap-3">
               <div className="p-2 rounded-lg bg-amber-50 text-amber-600"><Shield className="h-4 w-4" /></div>
               <span className="font-bold">System Admin</span>
              </div>
            </SelectItem>
           </SelectContent>
          </Select>
         </div>

         <div className="space-y-2">
          <Label htmlFor="username" className="text-xs font-black text-slate-400 ml-1 uppercase tracking-widest">
           {settings?.username_label || 'Username'}
          </Label>
          <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-primary">
             <User className="h-5 w-5" />
            </div>
            <Input
             id="username"
             type="text"
             placeholder={settings?.username_placeholder || 'Enter username'}
             className="h-14 rounded-2xl border-border bg-slate-50 pl-12 pr-6 font-bold text-slate-900 placeholder:text-slate-400 transition-all focus:bg-white focus:border-primary/50"
             value={username}
             onChange={(e) => setUsername(e.target.value)}
             required
             disabled={loading}
            />
          </div>
         </div>

         <div className="space-y-2">
          <div className="flex justify-between items-center ml-1">
           <Label htmlFor="password" className="text-xs font-black text-slate-400 uppercase tracking-widest">
            {settings?.password_label || 'Password'}
           </Label>
          </div>
          <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-primary">
             <Lock className="h-5 w-5" />
            </div>
            <Input
             id="password"
             type="password"
             placeholder={settings?.password_placeholder || '••••••••'}
             className="h-14 rounded-2xl border-border bg-slate-50 pl-12 pr-6 font-bold text-slate-900 placeholder:text-slate-400 transition-all focus:bg-white focus:border-primary/50"
             value={password}
             onChange={(e) => setPassword(e.target.value)}
             required
             disabled={loading}
            />
          </div>
         </div>

         <Button
          type="submit"
          className="w-full h-14 text-lg font-black rounded-2xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white"
          disabled={loading}
         >
          {loading ? (
           <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
           <>
             <span>{settings?.button_text || 'Enter Dashboard'}</span>
             <ArrowRight className="h-5 w-5" />
           </>
          )}
         </Button>

         <div className="relative py-4">
          <div className="absolute inset-0 flex items-center">
           <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
           <span className="bg-white px-4 text-slate-400 font-bold tracking-widest">Login Help</span>
          </div>
         </div>

         <div className="grid grid-cols-2 gap-4">
           <Button
            variant="outline"
            type="button"
            className="rounded-xl h-12 text-[10px] font-black uppercase tracking-widest border-border hover:bg-slate-50"
            onClick={() => navigate('/getting-started')}
           >
            Platform Tour
           </Button>
           <Button
            variant="outline"
            type="button"
            className="rounded-xl h-12 text-[10px] font-black uppercase tracking-widest border-border hover:bg-slate-50"
            onClick={() => navigate('/onboarding')}
           >
            Create Account
           </Button>
         </div>
        </form>
       </CardContent>
      </Card>
     </motion.div>
    </div>

   </main>

   {toggles.show_footer && (
    <footer className="relative z-10 bg-white border-t border-border pt-20 pb-12">
     <div className="container mx-auto px-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-20">
       <div className="space-y-6 col-span-1 md:col-span-1">
        <div className="flex items-center gap-3">
         <div className="p-2 rounded-xl bg-primary/10 border border-primary/10">
          <Shield className="h-6 w-6 text-primary" />
         </div>
         <span className="text-2xl font-black text-slate-950 tracking-tighter">EduFlow</span>
        </div>
        <p className="text-slate-500 font-medium leading-relaxed">
         Revolutionizing education through innovative digital solutions and seamless institution management in Nepal.
        </p>
        <div className="flex items-center gap-4">
         <a href="#" className="p-2 rounded-full bg-slate-50 hover:bg-primary/10 transition-colors text-slate-400 hover:text-primary">
          <Twitter className="h-5 w-5" />
         </a>
         <a href="#" className="p-2 rounded-full bg-slate-50 hover:bg-primary/10 transition-colors text-slate-400 hover:text-primary">
          <Linkedin className="h-5 w-5" />
         </a>
         <a href="#" className="p-2 rounded-full bg-slate-50 hover:bg-primary/10 transition-colors text-slate-400 hover:text-primary">
          <Github className="h-5 w-5" />
         </a>
         <a href="#" className="p-2 rounded-full bg-slate-50 hover:bg-primary/10 transition-colors text-slate-400 hover:text-primary">
          <Facebook className="h-5 w-5" />
         </a>
        </div>
       </div>

       {footerLinks.map((column: any, i: number) => (
        <div key={i} className="space-y-6">
         <h4 className="text-sm font-black text-slate-950 tracking-widest uppercase">{column.title}</h4>
         <ul className="space-y-4">
          {column.links.map((link: any, j: number) => (
           <li key={j}>
            <Link
             to={link.href}
             className="text-slate-600 font-medium hover:text-primary transition-colors flex items-center gap-2 group"
            >
             <ChevronRight className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-all -ml-6 group-hover:ml-0" />
             {link.label}
            </Link>
           </li>
          ))}
         </ul>
        </div>
       ))}
      </div>

     <div className="pt-12 border-t border-border flex flex-col md:flex-row items-center justify-between gap-6">
       <div className="flex items-center gap-4">
        <span className="flex items-center gap-2 text-emerald-600 text-sm font-bold">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> All Systems Operational
        </span>
        <span className="text-slate-300">|</span>
        <span className="text-slate-500 text-sm font-bold flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" /> ISO 27001 Certified
        </span>
       </div>

       <div className="text-slate-400 text-sm font-medium flex items-center gap-4">
        <span>{devInfo.copyright}</span>
        <a href={devInfo.website} target="_blank" rel="noopener noreferrer" className="text-slate-900 hover:text-primary transition-colors font-bold flex items-center gap-1">
         {devInfo.name} <ExternalLink className="h-3 w-3" />
        </a>
       </div>
     </div>
    </div>
   </footer>
  )}
  </div>
 );
};

export default LoginLayout;
