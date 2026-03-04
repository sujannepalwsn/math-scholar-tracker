import { Settings } from "lucide-react";

const Settings = () => (
  <div className="space-y-8 animate-in fade-in duration-700">
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 className="text-4xl font-extrabold tracking-tight">System Settings</h1>
        <p className="text-muted-foreground text-lg">Configure global parameters and environment defaults.</p>
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
       <div className="p-12 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center text-center space-y-4 bg-muted/20">
          <div className="p-4 bg-primary/10 rounded-2xl text-primary">
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-settings-2"><path d="M20 7h-9"/><path d="M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/></svg>
          </div>
          <h3 className="text-xl font-bold">Preferences coming soon</h3>
          <p className="text-muted-foreground max-w-xs">We are working on bringing more granular controls to your administrator dashboard.</p>
       </div>
    </div>
  </div>
);

export default Settings;
