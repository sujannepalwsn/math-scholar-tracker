import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowLeft, Shield, FileText, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SystemPage() {
  const { slug } = useParams();

  const { data: page, isLoading } = useQuery({
    queryKey: ["system-page", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_pages")
        .select("*")
        .eq("slug", slug)
        .single();

      if (error) {
        // Fallback or handle error
        const fallbacks: Record<string, { title: string, content: string }> = {
          'privacy': { title: "Privacy Policy", content: "Our privacy policy details how we handle your data. We are committed to protecting your personal information and institutional data." },
          'terms': { title: "Terms of Service", content: "Our terms of service outline the rules for using our platform. By using EduFlow, you agree to comply with these terms." },
          'support': { title: "Help Center", content: "Welcome to the EduFlow Help Center. If you need assistance, please contact our support team at support@eduflow.com." },
          'documentation': { title: "Documentation", content: "Welcome to the EduFlow official documentation. Here you will find guides on how to set up and use every module of the system." },
          'security': { title: "Security & Compliance", content: "EduFlow follows industry-standard security protocols. We are ISO 27001 certified and use end-to-end encryption for sensitive data." },
          'api-docs': { title: "API Reference", content: "The EduFlow API allows developers to integrate our school management system with other tools. Our RESTful API provides full access to your institution's data." },
          'community': { title: "EduFlow Community", content: "Join the thousands of educators and administrators using EduFlow. Share best practices and get tips from our global community." }
        };

        if (slug && fallbacks[slug]) return fallbacks[slug];
        throw error;
      }
      return data;
    },
  });

  if (isLoading) return <div className="flex items-center justify-center min-h-screen bg-slate-950"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-primary/20">
      {/* Simple Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
             <div className="p-1.5 rounded-lg bg-primary/10">
               <Shield className="h-5 w-5 text-primary" />
             </div>
             <span className="font-black tracking-tighter text-xl uppercase">EDU<span className="text-primary">FLOW</span></span>
          </Link>
          <Link to="/login">
            <Button variant="ghost" className="font-bold rounded-full">Sign In</Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16 max-w-4xl">
        <Button
          variant="ghost"
          asChild
          className="mb-8 hover:bg-slate-200 rounded-full font-bold text-slate-500"
        >
          <Link to="/">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Home
          </Link>
        </Button>

        <div className="bg-white p-8 md:p-12 rounded-[2.5rem] shadow-sm border border-slate-100">
           <div className="flex items-center gap-4 mb-8">
              <div className="p-3 rounded-2xl bg-slate-100 text-slate-600">
                 {(slug === 'privacy' || slug === 'security') && <Shield className="h-8 w-8" />}
                 {(slug === 'terms' || slug === 'documentation' || slug === 'api-docs') && <FileText className="h-8 w-8" />}
                 {(slug === 'support' || slug === 'community') && <HelpCircle className="h-8 w-8" />}
              </div>
              <h1 className="text-4xl font-black tracking-tight text-slate-900 capitalize">{page?.title || slug}</h1>
           </div>

           <div className="prose prose-slate max-w-none prose-headings:font-black prose-headings:tracking-tight prose-p:text-slate-600 prose-p:leading-relaxed whitespace-pre-wrap">
              {page?.content}
           </div>
        </div>
      </main>

      <footer className="py-12 border-t bg-white">
         <div className="container mx-auto px-4 text-center">
            <p className="text-slate-400 font-medium text-sm">© {new Date().getFullYear()} EduFlow. All rights reserved.</p>
         </div>
      </footer>
    </div>
  );
}
