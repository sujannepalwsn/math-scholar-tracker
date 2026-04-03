import React from "react";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { ShieldCheck, Heart, Shield, Globe, Zap, CheckCircle2, ChevronRight, BarChart3, Users, Clock, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const AboutPage = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-primary/20 selection:text-primary">
      <Helmet>
        <title>About Us | EduFlow - Our Mission & Vision</title>
        <meta name="description" content="Why we built EduFlow: to modernize education through high-performance tools. Learn about our commitment to security (ISO 27001) and our vision for 2030." />
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
          <Link to="/pricing" className="text-sm font-bold text-slate-300 hover:text-white transition-colors">Pricing</Link>
          <Link to="/about" className="text-sm font-bold text-white transition-colors underline decoration-primary decoration-2 underline-offset-8">About</Link>
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
        {/* Story Section */}
        <section className="max-w-6xl mx-auto mb-40">
           <div className="grid md:grid-cols-2 gap-20 items-center">
              <div>
                 <motion.div
                   initial={{ opacity: 0, scale: 0.9 }}
                   animate={{ opacity: 1, scale: 1 }}
                   className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black tracking-widest uppercase mb-8"
                 >
                   <Heart className="h-4 w-4" />
                   <span>Our Story</span>
                 </motion.div>
                 <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-8 uppercase leading-[0.9]">Why we built <span className="text-primary">EduFlow.</span></h1>
                 <div className="space-y-6 text-xl text-slate-400 font-medium leading-relaxed">
                    <p>
                       We believe that technology should be an invisible force that empowers educators, not a hurdle that consumes their time.
                    </p>
                    <p>
                       EduFlow was born in the hallways of schools where we saw administrators drowning in paper trails and teachers spending more time on attendance than on actual teaching.
                    </p>
                    <p>
                       We set out to build the "High-Performance School OS" — a platform that is as intuitive as it is powerful, designed to modernize the foundation of education.
                    </p>
                 </div>
              </div>
              <div className="relative">
                 <div className="aspect-square rounded-[4rem] bg-gradient-to-br from-primary/10 to-blue-500/10 border border-white/10 relative overflow-hidden flex items-center justify-center group">
                    <div className="absolute inset-0 bg-primary/20 blur-[100px] opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                    <ShieldCheck className="h-48 w-48 text-primary/20 animate-pulse" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center">
                       <p className="text-white font-black text-2xl uppercase tracking-widest">Bridging the Gap</p>
                       <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.3em] mt-4">Traditional Schooling → Digital Future</p>
                    </div>
                 </div>
              </div>
           </div>
        </section>

        {/* Security Focus Section */}
        <section className="py-32 bg-white/5 border border-white/10 rounded-[4rem] px-8 md:px-20 mb-40 relative overflow-hidden group">
           <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/10 rounded-full blur-[120px] transition-all group-hover:bg-primary/20" />
           <div className="max-w-4xl mx-auto text-center mb-24">
              <Shield className="h-20 w-20 text-primary mx-auto mb-10" />
              <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-8 uppercase leading-[0.9]">Security by Design.</h2>
              <p className="text-xl text-slate-400 font-medium leading-relaxed">
                 We understand that school data is sacred. That's why we've built EduFlow with enterprise-grade security at every layer, ensuring your institution's information is safe, private, and always available.
              </p>
           </div>

           <div className="grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
              {[
                { icon: ShieldCheck, label: "ISO 27001 Certified", detail: "Global security standards" },
                { icon: Zap, label: "256-bit SSL", detail: "End-to-end encryption" },
                { icon: Globe, label: "Cloud Backups", detail: "Hourly automated copies" },
                { icon: Clock, label: "99.9% Uptime", detail: "Enterprise reliability" }
              ].map((s, i) => (
                <div key={i} className="space-y-4">
                   <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto text-primary border border-primary/20 group-hover:scale-110 transition-transform">
                      <s.icon className="h-6 w-6" />
                   </div>
                   <h4 className="font-black text-white uppercase text-xs tracking-widest">{s.label}</h4>
                   <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">{s.detail}</p>
                </div>
              ))}
           </div>
        </section>

        {/* Impact Section */}
        <section className="max-w-6xl mx-auto mb-40">
           <div className="grid md:grid-cols-3 gap-8">
              {[
                { value: "10,000+", label: "Target Schools by 2030" },
                { value: "15+", label: "Countries Present" },
                { value: "1M+", label: "Students Empowered" }
              ].map((stat, i) => (
                <div key={i} className="p-12 rounded-[3rem] bg-white/5 border border-white/5 text-center transition-all hover:border-primary/20 hover:bg-white/10 group">
                   <p className="text-5xl font-black text-white tracking-tighter mb-4 group-hover:text-primary transition-colors">{stat.value}</p>
                   <p className="text-xs font-black text-slate-500 uppercase tracking-[0.3em]">{stat.label}</p>
                </div>
              ))}
           </div>
        </section>

        {/* Final Vision CTA */}
        <section className="text-center pb-40">
           <div className="max-w-4xl mx-auto">
              <h2 className="text-5xl md:text-8xl font-black tracking-tighter mb-12 uppercase leading-[0.9]">Join our mission to <span className="text-primary">transform the future.</span></h2>
              <div className="flex flex-col md:flex-row gap-6 justify-center items-center">
                 <Button asChild size="lg" className="h-20 px-16 rounded-[2rem] text-2xl font-black bg-primary hover:bg-primary/90 text-white shadow-2xl shadow-primary/40 transition-transform hover:scale-105 active:scale-95">
                   <Link to="/onboarding">Join the Revolution</Link>
                 </Button>
                 <Link to="/contact-sales" className="text-lg font-black uppercase tracking-[0.2em] text-slate-400 hover:text-white flex items-center gap-3 group">
                    Contact Our Partners <ChevronRight className="h-5 w-5 group-hover:translate-x-2 transition-transform" />
                 </Link>
              </div>
           </div>
        </section>
      </main>

      {/* Simplified Footer */}
      <footer className="py-20 border-t border-white/5 bg-slate-950 text-center">
         <div className="flex justify-center gap-12 mb-10">
            <TwitterIcon className="h-6 w-6 text-slate-600 hover:text-white transition-colors cursor-pointer" />
            <LinkedInIcon className="h-6 w-6 text-slate-600 hover:text-white transition-colors cursor-pointer" />
            <GithubIcon className="h-6 w-6 text-slate-600 hover:text-white transition-colors cursor-pointer" />
         </div>
         <p className="text-slate-600 font-black uppercase tracking-[0.3em] text-[10px]">Secure Infrastructure • v3.4.0 (Enterprise)</p>
         <p className="mt-4 text-slate-700 font-bold uppercase tracking-widest text-[8px]">© {new Date().getFullYear()} EduFlow Tech Solutions. All rights reserved.</p>
      </footer>
    </div>
  );
};

// Simple Icon Placeholders to avoid dependency issues if they aren't in Lucide
const TwitterIcon = (props: any) => <svg {...props} fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.84 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>;
const LinkedInIcon = (props: any) => <svg {...props} fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.2225 0z"/></svg>;
const GithubIcon = (props: any) => <svg {...props} fill="currentColor" viewBox="0 0 24 24"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.43.372.82 1.102.82 2.222 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>;

export default AboutPage;
