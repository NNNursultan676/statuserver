import { useQuery } from "@tanstack/react-query";
import { Service } from "@shared/schema";
import { ServiceCard } from "@/components/ServiceCard";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");

  const { data: services = [], isLoading } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const filteredServices = services.filter((service) => {
    const matchesSearch = service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || service.status === statusFilter;
    const matchesCategory = categoryFilter === "all" || service.category === categoryFilter;
    const matchesSeverity = severityFilter === "all" || 
      (severityFilter === "critical" && (service.status === "down" || service.status === "degraded"));
    return matchesSearch && matchesStatus && matchesCategory && matchesSeverity;
  });

  const categories = ["App", "services", "server"];

  const statusCounts = {
    operational: services.filter((s) => s.status === "operational").length,
    degraded: services.filter((s) => s.status === "degraded").length,
    down: services.filter((s) => s.status === "down").length,
    maintenance: services.filter((s) => s.status === "maintenance").length,
  };

  const allOperational = statusCounts.degraded === 0 && statusCounts.down === 0;

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold">Service Status Dashboard</h1>
        </div>
        
        {allOperational ? (
          <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <p className="font-medium">All systems operational</p>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <p className="font-medium">
                {statusCounts.down > 0 
                  ? `${statusCounts.down} service${statusCounts.down > 1 ? 's' : ''} down` 
                  : `${statusCounts.degraded} service${statusCounts.degraded > 1 ? 's' : ''} degraded`}
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-48" data-testid="select-category">
              <SelectValue placeholder="category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="App">App</SelectItem>
              <SelectItem value="services">services</SelectItem>
              <SelectItem value="server">server</SelectItem>
            </SelectContent>
          </Select>
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-full sm:w-48" data-testid="select-severity">
              <SelectValue placeholder="filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="critical">critical</SelectItem>
              <SelectItem value="operational">status</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-40 rounded-lg bg-card animate-pulse" />
          ))}
        </div>
      ) : filteredServices.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No services found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredServices.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              onClick={() => setLocation(`/service/${service.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
