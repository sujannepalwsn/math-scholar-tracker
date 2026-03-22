import React, { useEffect } from "react"
import { User } from "lucide-react";
;
import { useLocation } from "react-router-dom"
import { Button } from "@/components/ui/button"


const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden p-4">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-destructive/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="text-center space-y-6 max-w-md animate-in zoom-in-95 duration-500">
        <div className="relative inline-block">
           <h1 className="text-9xl font-black text-primary opacity-20">404</h1>
           <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-4xl font-bold tracking-tighter">Lost in Space</span>
           </div>
        </div>
        <p className="text-xl text-muted-foreground font-medium">The page you are looking for has been moved to another dimension or never existed.</p>
        <Button size="lg" className="rounded-2xl h-14 px-8 font-bold shadow-strong" asChild>
          <a href="/">
            Return to Dashboard
          </a>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
