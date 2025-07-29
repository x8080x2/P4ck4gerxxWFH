import { Switch, Route } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import ApplicationForm from "@/pages/application-form";
import ApplicationSuccess from "@/pages/application-success";
import AgreementLetter from "@/pages/agreement-letter";
import AglAccess from "@/pages/agl-access";
import NotFound from "@/pages/not-found";
import { cacheManager } from "./lib/cache-manager";

function Router() {
  return (
    <Switch>
      <Route path="/" component={ApplicationForm} />
      <Route path="/success/:id" component={ApplicationSuccess} />
      <Route path="/agl-access" component={AglAccess} />
      <Route path="/agl" component={AgreementLetter} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Initialize cache manager when app starts
  useEffect(() => {
    // Cache manager is already initialized via import
    console.log('🧹 Cache manager initialized');
    
    // Cleanup on unmount
    return () => {
      cacheManager.destroy();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
