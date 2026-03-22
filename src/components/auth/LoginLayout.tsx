import React, { useState, useEffect } from "react";
import { Shield, CheckCircle2, HelpCircle, ArrowRight, ExternalLink, Loader2, User, Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tables } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";
import * as Icons from "lucide-react";

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
  const [currentBgIndex, setCurrentBgIndex] = useState(0);
  const primaryColor = settings?.primary_color || '#4f46e5';
  const bgColor = settings?.background_color || '#f8fafc';

  const backgroundUrls = Array.isArray(settings?.background_urls) ? settings.background_urls : (settings?.background_url ? [settings.background_url] : []);
  const features = Array.isArray(settings?.features) ? settings.features : [];
  const devInfo = (settings?.developer_info && typeof settings.developer_info === 'object' && !Array.isArray(settings.developer_info)) ? settings.developer_info as any : { name: "Developer", website: "#", copyright: "© 2024" };
  const helpInfo = (settings?.help_info && typeof settings.help_info === 'object' && !Array.isArray(settings.help_info)) ? settings.help_info as any : { text: "Need help?", link: "#" };

  useEffect(() => {
    if (backgroundUrls.length > 1) {
      const interval = setInterval(() => {
        setCurrentBgIndex((prev) => (prev + 1) % backgroundUrls.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [backgroundUrls.length]);

  const DynamicIcon = ({ name, className }: { name: string, className?: string }) => {
    const IconComponent = (Icons as any)[name] || Shield;
    return <IconComponent className={className} />;
  };

  return (
    <div className="min-h-screen flex flex-col font-sans selection:bg-primary/20" style={{ backgroundColor: bgColor }}>
      {/* Dynamic Background Slider */}
      <div className="fixed inset-0 z-0">
        {backgroundUrls.length > 0 ? (
          backgroundUrls.map((url, idx) => (
            <div
              key={idx}
              className={cn(
                "absolute inset-0 transition-opacity duration-1000 ease-in-out bg-cover bg-center",
                idx === currentBgIndex ? "opacity-100" : "opacity-0"
              )}
              style={{ backgroundImage: `url(${url})` }}
            >
              <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]" />
            </div>
          ))
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
             <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full blur-[120px] bg-primary/20 animate-pulse" />
             <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full blur-[120px] bg-primary/20 animate-pulse delay-1000" />
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex-1 flex flex-col md:flex-row items-center justify-center p-4 md:p-12 gap-12 lg:gap-24 max-w-7xl mx-auto w-full">

        {/* Left Side: Marketing Info */}
        <div className="flex-1 text-white space-y-8 max-w-xl text-center md:text-left animate-in fade-in slide-in-from-left-8 duration-700">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-sm font-bold tracking-wider uppercase mb-4">
             <Sparkles className="h-4 w-4 text-yellow-400" />
             <span>School Management Software</span>
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black leading-tight tracking-tighter drop-shadow-2xl">
            {settings?.marketing_title || 'The Ultimate School Management Solution'}
          </h1>

          <p className="text-lg md:text-xl text-slate-100 font-medium opacity-90 max-w-lg leading-relaxed">
            {settings?.marketing_subtitle || 'Streamline your educational institution with our comprehensive ERP platform.'}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-12">
            {features.map((feature, idx) => (
              <div key={idx} className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 transition-colors group">
                <div
                  className="p-3 rounded-xl shadow-lg transition-transform group-hover:scale-110"
                  style={{ backgroundColor: primaryColor }}
                >
                  <DynamicIcon name={feature.icon} className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base">{feature.title}</h3>
                  <p className="text-xs text-slate-300 font-medium leading-relaxed">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="w-full max-w-[440px] animate-in fade-in slide-in-from-right-8 duration-700 delay-150">
           <Card className="border-none shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] bg-white/90 backdrop-blur-2xl rounded-[2.5rem] overflow-hidden">
             <CardHeader className="space-y-6 pt-12 pb-8 px-10">
               <div className="flex justify-between items-start">
                  <div className="relative">
                    <div
                      className="absolute -inset-1 rounded-2xl blur opacity-25"
                      style={{ backgroundColor: primaryColor }}
                    />
                    <div className="relative bg-white shadow-soft p-4 rounded-2xl flex items-center justify-center min-w-[64px] min-h-[64px]">
                       {settings?.logo_url ? (
                         <img src={settings.logo_url} alt="Logo" className="h-10 w-10 object-contain" />
                       ) : (
                         <Shield className="h-8 w-8" style={{ color: primaryColor }} />
                       )}
                    </div>
                  </div>
                  <a
                    href={helpInfo.link}
                    className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors bg-slate-100 px-4 py-2 rounded-full"
                  >
                    <HelpCircle className="h-4 w-4" />
                    {helpInfo.text || 'Need help?'}
                  </a>
               </div>

               <div className="space-y-2">
                 <CardTitle className="text-3xl font-black tracking-tight text-slate-900">
                   {settings?.title || 'Login'}
                 </CardTitle>
                 {settings?.subtitle && (
                   <p className="text-sm font-medium text-slate-500">
                     {settings.subtitle}
                   </p>
                 )}
               </div>
             </CardHeader>

             <CardContent className="pb-12 px-10">
               <form onSubmit={onSubmit} className="space-y-6">
                 <div className="space-y-2">
                   <Label htmlFor="username" className="text-sm font-bold text-slate-700 ml-1">
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
                        className="h-14 rounded-2xl border-slate-200 bg-slate-50 pl-12 pr-6 font-medium focus-visible:ring-offset-0 transition-all focus:bg-white"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        disabled={loading}
                      />
                   </div>
                 </div>

                 <div className="space-y-2">
                   <div className="flex justify-between items-center ml-1">
                     <Label htmlFor="password" className="text-sm font-bold text-slate-700">
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
                        className="h-14 rounded-2xl border-slate-200 bg-slate-50 pl-12 pr-6 font-medium focus-visible:ring-offset-0 transition-all focus:bg-white"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={loading}
                      />
                   </div>
                 </div>

                 <Button
                   type="submit"
                   className="w-full h-14 text-base font-bold rounded-2xl shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                   style={{ backgroundColor: primaryColor, color: '#fff' }}
                   disabled={loading}
                 >
                   {loading ? (
                     <Loader2 className="h-5 w-5 animate-spin" />
                   ) : (
                     <>
                        <span>{settings?.button_text || 'Sign In'}</span>
                        <ArrowRight className="h-5 w-5" />
                     </>
                   )}
                 </Button>
                 {extraFooter}
               </form>
             </CardContent>
           </Card>
        </div>
      </div>

      {/* Footer Section */}
      <footer className="relative z-10 w-full p-8 flex flex-col md:flex-row items-center justify-between border-t border-white/10 text-white/60 text-sm font-medium">
         <div className="flex items-center gap-4 mb-4 md:mb-0">
            <span className="flex items-center gap-2">
               <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Secure SSL Connection
            </span>
            <span className="hidden md:inline text-white/20">|</span>
            <span className="hidden md:inline">v3.4.0 (Enterprise)</span>
         </div>

         <div className="flex items-center gap-6">
            <div className="flex flex-col items-end">
               <span className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Developed by</span>
               <a
                 href={devInfo.website}
                 target="_blank"
                 rel="noopener noreferrer"
                 className="text-white hover:text-primary transition-colors flex items-center gap-1 font-bold text-base"
               >
                 {devInfo.name} <ExternalLink className="h-3 w-3" />
               </a>
            </div>
            <div className="h-10 w-px bg-white/10 hidden md:block" />
            <span className="hidden md:block opacity-50">{devInfo.copyright}</span>
         </div>
      </footer>
    </div>
  );
};

export default LoginLayout;
