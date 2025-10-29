import React from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BarChart3, History, LayoutDashboard, Settings } from "lucide-react";
import { Link, useLocation } from "wouter";

import Dashboard from "@/pages/Dashboard";
import Analytics from "@/pages/Analytics";
import HistoryPage from "@/pages/History";
import Admin from "@/pages/Admin";
import ServiceDetail from "@/pages/ServiceDetail";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/history" component={HistoryPage} />
      <Route path="/admin" component={Admin} />
      <Route path="/service/:id" component={ServiceDetail} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [location] = useLocation();

  const navigation = [
    { name: "Dashboard", path: "/", icon: LayoutDashboard },
    { name: "Analytics", path: "/analytics", icon: BarChart3 },
    { name: "History", path: "/history", icon: History },
    { name: "Admin", path: "/admin", icon: Settings },
  ];

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen bg-background">
          <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-md bg-primary flex items-center justify-center flex-shrink-0">
                  <LayoutDashboard className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
                </div>
                <h1 className="text-base sm:text-xl font-semibold truncate">Service Status</h1>
              </div>
              
              <nav className="flex items-center gap-0.5 sm:gap-1">
                {navigation.map((item) => {
                  const isActive = location === item.path;
                  return (
                    <Link key={item.path} href={item.path}>
                      <button
                        className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors hover-elevate ${
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                        data-testid={`nav-${item.name.toLowerCase()}`}
                      >
                        <item.icon className="w-4 h-4" />
                        <span className="hidden sm:inline">{item.name}</span>
                      </button>
                    </Link>
                  );
                })}
              </nav>
            </div>
          </header>

          <main className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8">
            <Router />
          </main>
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
