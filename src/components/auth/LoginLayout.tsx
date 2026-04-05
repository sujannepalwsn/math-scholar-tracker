import React, { useState, useEffect } from "react";
import { Shield, CheckCircle2, HelpCircle, ArrowRight, ExternalLink, Loader2, Sparkles, User, Lock, Globe, MessageSquare, Phone, MapPin, Mail, ChevronRight, Github, Twitter, Linkedin, Facebook, Users, GraduationCap, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { SYSTEM_MODULES } from "@/lib/system-modules";
import { PackageType } from "@/lib/package-presets";
import { FeatureCard, PackageCard, HeroSection, DynamicIcon } from "./LandingPageComponents";
import { useSystemStats } from "@/hooks/use-system-stats";

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
  const bgColor = settings?.background_color || '#020617';

  const hexToRGB = (hex: string) => {
    if (!hex || !hex.startsWith('#')) return '2, 6, 23';
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r}, ${g}, ${b}`;
  };

  const hexToHSL = (hex: string) => {
    if (!hex || !hex.startsWith('#')) return '226 100% 50%';
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
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

  // Determine current role based on path
  const getCurrentRole = () => {
    const path = location.pathname;
    if (path === '/login-admin') return 'admin';
    if (path === '/login-teacher') return 'teacher';
    if (path === '/login-parent') return 'parent';
    return 'center';
  };

  const currentRole = getCurrentRole();
  const { data: stats } = useSystemStats();
  const [partners, setPartners] = useState<{ id: string; name: string; logo_url: string; address: string }[]>([]);

  useEffect(() => {
    const fetchPartners = async () => {
      const { data } = await supabase
        .from('centers')
        .select('id, name, logo_url, address')
        .eq('is_active', true)
        .limit(12)
        .order('name');
      if (data) setPartners(data as any);
    };
    fetchPartners();
  }, []);

  const handleRoleChange = (role: string) => {
    if (role === 'admin') navigate('/login-admin');
    else if (role === 'teacher') navigate('/login-teacher');
    else if (role === 'parent') navigate('/login-parent');
    else navigate('/login');
  };

  // Sort modules: implemented first
  const sortedModules = [...SYSTEM_MODULES].sort((a, b) => {
    if (a.completeness === 'Fully implemented' && b.completeness !== 'Fully implemented') return -1;
    if (a.completeness !== 'Fully implemented' && b.completeness === 'Fully implemented') return 1;
    return 0;
  });

  const packages: PackageType[] = ['Basic', 'Standard', 'Premium'];

  const devInfo = (settings?.developer_info as any) || { name: "EduFlow Tech", website: "#", copyright: `© ${new Date().getFullYear()}` };
  const helpInfo = (settings?.help_info as any) || { text: "Support", link: "/pages/support" };
  const footerLinks = Array.isArray(settings?.footer_links) ? (settings.footer_links as any) : [
    { title: "Product", links: [{ label: "Features", href: "/features" }, { label: "Pricing", href: "/pricing" }, { label: "Security", href: "/pages/security" }] },
    { title: "Support", links: [{ label: "Help Center", href: "/pages/support" }, { label: "Documentation", href: "/pages/documentation" }, { label: "API Docs", href: "/pages/api-docs" }] },
    { title: "Company", links: [{ label: "About Us", href: "/about" }, { label: "Contact", href: "/contact-sales" }, { label: "Privacy", href: "/pages/privacy" }] }
  ];
  const toggles = (settings?.section_toggles as any) || { show_features: true, show_packages: true, show_stats: true, show_footer: true };

  // Apply Super Admin theme colors globally to the login experience
  useEffect(() => {
    if (primaryColor) {
      // Convert hex to HSL for CSS variable consistency if possible,
      // but for login page simple RGB/Hex override is often enough for utility classes
      document.documentElement.style.setProperty('--primary', hexToHSL(primaryColor));
    }
  }, [primaryColor]);

  return (
    <div className="min-h-screen flex flex-col font-sans selection:bg-primary/20 scroll-smooth overflow-x-hidden" style={{ backgroundColor: bgColor }}>
      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          --background: ${hexToRGB(bgColor)};
        }
        .text-primary { color: ${primaryColor} !important; }
        .bg-primary { background-color: ${primaryColor} !important; }
        .border-primary { border-color: ${primaryColor} !important; }
        .ring-primary { --tw-ring-color: ${primaryColor} !important; }
      `}} />
      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 bg-slate-950">
          <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full blur-[120px] bg-primary/10 animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full blur-[120px] bg-blue-600/10 animate-pulse delay-1000" />
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px]" />
        </div>

        {/* Animated Grid Lines */}
        <div className="absolute inset-0 z-10 pointer-events-none bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </div>

      {/* Navigation Bar */}
      <header className="relative z-50 w-full px-4 md:px-6 py-4 flex items-center justify-between border-b border-white/5 bg-slate-950/20 backdrop-blur-md">
        <Link to="/" className="flex items-center gap-3">
          <div className="p-1.5 md:p-2 rounded-xl bg-primary/20 border border-primary/20">
            {settings?.logo_url ? (
              <img src={settings.logo_url} alt="Logo" className="h-6 w-6 md:h-8 md:w-8 object-contain" />
            ) : (
              <Shield className="h-5 w-5 md:h-6 md:w-6 text-primary" />
            )}
          </div>
          <span className="text-lg md:text-2xl font-black text-white tracking-tighter uppercase">EDU<span className="text-primary">FLOW</span></span>
        </Link>

        <div className="flex items-center gap-2 md:gap-4">
           <Link to="/contact-sales">
             <Button variant="ghost" className="text-white font-bold hover:bg-white/5 rounded-full px-2 md:px-6 text-[10px] md:text-sm">
               Contact
             </Button>
           </Link>
           <Link to="/getting-started">
             <Button className="bg-primary hover:bg-primary/90 text-white font-bold rounded-full px-4 md:px-8 shadow-lg shadow-primary/20 text-[10px] md:text-sm h-9 md:h-10">
               Tour
             </Button>
           </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-[460px]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <Card className="border-none shadow-[0_32px_64px_-16px_rgba(0,0,0,0.7)] bg-slate-900/40 backdrop-blur-[40px] border border-white/10 rounded-[2.5rem] overflow-hidden text-white">
              <CardHeader className="space-y-6 pt-10 pb-6 px-8">
                <div className="flex justify-between items-center">
                   <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 py-1 px-4 rounded-full font-black tracking-widest text-[10px] uppercase">
                      SECURE GATEWAY
                   </Badge>
                   <a
                    href={helpInfo.link}
                    className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors bg-white/5 px-4 py-2 rounded-full border border-white/5"
                  >
                    <HelpCircle className="h-4 w-4" />
                    {helpInfo.text || 'Need help?'}
                  </a>
                </div>

                <div className="space-y-2">
                  <CardTitle className="text-4xl font-black tracking-tighter">
                    {settings?.title || 'Sign In'}
                  </CardTitle>
                  <p className="text-slate-400 font-medium text-sm">
                    Access your institution's digital ecosystem
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
                      <SelectTrigger className="h-14 rounded-2xl border-white/5 bg-white/5 font-bold text-white transition-all focus:bg-white/10 focus:ring-primary/50">
                        <SelectValue placeholder="Select Role" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-white/10 text-white rounded-2xl">
                        <SelectItem value="center" className="focus:bg-primary/20 focus:text-white cursor-pointer py-3 rounded-xl">
                           <div className="flex items-center gap-3">
                             <div className="p-2 rounded-lg bg-blue-500/20"><Shield className="h-4 w-4 text-blue-400" /></div>
                             <span className="font-bold">Tuition Center</span>
                           </div>
                        </SelectItem>
                        <SelectItem value="teacher" className="focus:bg-primary/20 focus:text-white cursor-pointer py-3 rounded-xl">
                           <div className="flex items-center gap-3">
                             <div className="p-2 rounded-lg bg-emerald-500/20"><Briefcase className="h-4 w-4 text-emerald-400" /></div>
                             <span className="font-bold">Teacher Portal</span>
                           </div>
                        </SelectItem>
                        <SelectItem value="parent" className="focus:bg-primary/20 focus:text-white cursor-pointer py-3 rounded-xl">
                           <div className="flex items-center gap-3">
                             <div className="p-2 rounded-lg bg-purple-500/20"><Users className="h-4 w-4 text-purple-400" /></div>
                             <span className="font-bold">Parent Portal</span>
                           </div>
                        </SelectItem>
                        <SelectItem value="admin" className="focus:bg-primary/20 focus:text-white cursor-pointer py-3 rounded-xl">
                           <div className="flex items-center gap-3">
                             <div className="p-2 rounded-lg bg-amber-500/20"><Shield className="h-4 w-4 text-amber-400" /></div>
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
                       <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-primary">
                         <User className="h-5 w-5" />
                       </div>
                       <Input
                         id="username"
                         type="text"
                         placeholder={settings?.username_placeholder || 'Enter username'}
                         className="h-14 rounded-2xl border-white/5 bg-white/5 pl-12 pr-6 font-bold text-white placeholder:text-slate-600 focus-visible:ring-offset-0 transition-all focus:bg-white/10 focus:border-primary/50"
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
                       <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-primary">
                         <Lock className="h-5 w-5" />
                       </div>
                       <Input
                         id="password"
                         type="password"
                         placeholder={settings?.password_placeholder || '••••••••'}
                         className="h-14 rounded-2xl border-white/5 bg-white/5 pl-12 pr-6 font-bold text-white placeholder:text-slate-600 focus-visible:ring-offset-0 transition-all focus:bg-white/10 focus:border-primary/50"
                         value={password}
                         onChange={(e) => setPassword(e.target.value)}
                         required
                         disabled={loading}
                       />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-14 text-lg font-black rounded-2xl shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white"
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
                      <span className="w-full border-t border-white/5" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-slate-900/40 px-4 text-slate-500 font-bold tracking-widest">Quick Actions</span>
                    </div>
                  </div>

                  {extraFooter}
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </div>

      </main>

      {/* Modern Footer */}
      {toggles.show_footer && (
        <footer className="relative z-10 bg-slate-950 border-t border-white/5 pt-20 pb-12">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-20">
              <div className="space-y-6 col-span-1 md:col-span-1">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-primary/20 border border-primary/20">
                    <Shield className="h-6 w-6 text-primary" />
                  </div>
                  <span className="text-2xl font-black text-white tracking-tighter">EDUFLOW</span>
                </div>
                <p className="text-slate-400 font-medium leading-relaxed">
                  Revolutionizing education through innovative digital solutions and seamless institution management.
                </p>
                <div className="flex items-center gap-4">
                  <a href="#" className="p-2 rounded-full bg-white/5 hover:bg-primary transition-colors text-slate-400 hover:text-white">
                    <Twitter className="h-5 w-5" />
                  </a>
                  <a href="#" className="p-2 rounded-full bg-white/5 hover:bg-primary transition-colors text-slate-400 hover:text-white">
                    <Linkedin className="h-5 w-5" />
                  </a>
                  <a href="#" className="p-2 rounded-full bg-white/5 hover:bg-primary transition-colors text-slate-400 hover:text-white">
                    <Github className="h-5 w-5" />
                  </a>
                  <a href="#" className="p-2 rounded-full bg-white/5 hover:bg-primary transition-colors text-slate-400 hover:text-white">
                    <Facebook className="h-5 w-5" />
                  </a>
                </div>
              </div>

              {footerLinks.map((column: any, i: number) => (
                <div key={i} className="space-y-6">
                  <h4 className="text-lg font-black text-white tracking-tight uppercase">{column.title}</h4>
                  <ul className="space-y-4">
                    {column.links.map((link: any, j: number) => (
                      <li key={j}>
                        {link.href.startsWith('/') ? (
                          <Link
                            to={link.href}
                            className="text-slate-400 font-medium hover:text-white transition-colors flex items-center gap-2 group"
                          >
                            <ChevronRight className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-all -ml-6 group-hover:ml-0" />
                            {link.label}
                          </Link>
                        ) : (
                          <a
                            href={link.href}
                            onClick={(e) => {
                              if (link.href.startsWith('#')) {
                                e.preventDefault();
                                document.getElementById(link.href.substring(1))?.scrollIntoView({ behavior: 'smooth' });
                              }
                            }}
                            className="text-slate-400 font-medium hover:text-white transition-colors flex items-center gap-2 group"
                          >
                            <ChevronRight className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-all -ml-6 group-hover:ml-0" />
                            {link.label}
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

          <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
             <div className="flex items-center gap-4">
                <span className="flex items-center gap-2 text-emerald-400 text-sm font-bold">
                   <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> All Systems Operational
                </span>
                <span className="text-slate-600">|</span>
                <span className="text-slate-400 text-sm font-bold flex items-center gap-2">
                   <CheckCircle2 className="h-4 w-4" /> ISO 27001 Certified
                </span>
             </div>

             <div className="text-slate-500 text-sm font-medium flex items-center gap-4">
                <span>{devInfo.copyright}</span>
                <a href={devInfo.website} target="_blank" rel="noopener noreferrer" className="text-white hover:text-primary transition-colors font-bold flex items-center gap-1">
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
