import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Service, Incident } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { MetricCard } from "@/components/MetricCard";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Server, ExternalLink } from "lucide-react";
import { formatDistanceToNow, subDays, eachDayOfInterval, format } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { getServiceUrl, openServiceUrl } from "@/lib/serviceUtils";

export default function ServiceDetail() {
  const [, params] = useRoute("/service/:id");
  const [, setLocation] = useLocation();
  const serviceId = params?.id;

  const { data: service, isLoading: serviceLoading } = useQuery<Service>({
    queryKey: [`/api/services/${serviceId}`],
    enabled: !!serviceId,
  });

  const { data: incidents = [] } = useQuery<Incident[]>({
    queryKey: ["/api/incidents"],
  });

  if (serviceLoading) {
    return (
      <div className="space-y-8">
        <div className="h-8 w-64 bg-card animate-pulse rounded" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-card animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Service not found</p>
        <Button onClick={() => setLocation("/")} className="mt-4">
          Go to Dashboard
        </Button>
      </div>
    );
  }

  const serviceIncidents = incidents
    .filter((inc) => inc.serviceId === serviceId)
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

  const last30Days = eachDayOfInterval({
    start: subDays(new Date(), 29),
    end: new Date(),
  });

  const uptimeData = last30Days.map((date) => {
    const dayIncidents = serviceIncidents.filter((inc) => {
      const incDate = new Date(inc.startedAt);
      return format(incDate, "yyyy-MM-dd") === format(date, "yyyy-MM-dd");
    });

    let uptime = 100;
    if (dayIncidents.some((i) => i.severity === "critical")) uptime = 50;
    else if (dayIncidents.some((i) => i.severity === "major")) uptime = 85;
    else if (dayIncidents.some((i) => i.severity === "minor")) uptime = 95;

    return {
      date: format(date, "MMM d"),
      uptime,
    };
  });

  const totalIncidents = serviceIncidents.length;
  const activeIncidents = serviceIncidents.filter((i) => i.status !== "resolved").length;
  const avgUptime = (uptimeData.reduce((sum, d) => sum + d.uptime, 0) / uptimeData.length).toFixed(2);

  return (
    <div className="space-y-8">
      <div>
        <Button variant="ghost" onClick={() => setLocation("/")} className="mb-4" data-testid="button-back">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
        
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <Server className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold mb-1" data-testid="text-service-name">
                {service.name}
              </h1>
              <p className="text-muted-foreground">{service.description}</p>
              {service.address && (
                <div className="flex items-center gap-2 mt-2">
                  <a 
                    href={getServiceUrl(service) || '#'} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline font-mono"
                  >
                    {service.address}
                  </a>
                  {service.port && (
                    <span className="text-sm text-muted-foreground font-mono">
                      :{service.port}
                    </span>
                  )}
                  {getServiceUrl(service) && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => openServiceUrl(service)}
                      className="ml-2"
                    >
                      <ExternalLink className="w-3 h-3 mr-1" />
                      Открыть
                    </Button>
                  )}
                </div>
              )}
              <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                <span className="font-mono">{service.region}</span>
                <span>•</span>
                <span>{service.category}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <StatusBadge status={service.status as any} size="default" />
            <span className="text-sm text-muted-foreground">
              Updated {formatDistanceToNow(new Date(service.updatedAt), { addSuffix: true })}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Current Status"
          value={service.status.charAt(0).toUpperCase() + service.status.slice(1)}
          subtitle="Real-time status"
        />
        <MetricCard
          title="30-Day Uptime"
          value={`${avgUptime}%`}
          subtitle="Average uptime"
          trend="up"
        />
        <MetricCard
          title="Total Incidents"
          value={totalIncidents}
          subtitle="All time"
        />
        <MetricCard
          title="Active Incidents"
          value={activeIncidents}
          subtitle="Currently ongoing"
          trend={activeIncidents > 0 ? "down" : "neutral"}
        />
      </div>

      <Tabs defaultValue="metrics" className="w-full">
        <TabsList>
          <TabsTrigger value="metrics" data-testid="tab-metrics">Metrics</TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-history">Incident History</TabsTrigger>
        </TabsList>

        <TabsContent value="metrics" className="mt-6">
          <Card className="p-6">
            <h3 className="text-lg font-medium mb-6">30-Day Uptime Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={uptimeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  stroke="hsl(var(--border))"
                />
                <YAxis 
                  domain={[0, 100]}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  stroke="hsl(var(--border))"
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--popover))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px"
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="uptime" 
                  stroke="hsl(142 76% 45%)" 
                  strokeWidth={2}
                  dot={{ fill: "hsl(142 76% 45%)", r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          {serviceIncidents.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground">No incidents recorded for this service</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {serviceIncidents.map((incident) => (
                <Card key={incident.id} className="p-6" data-testid={`incident-${incident.id}`}>
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-base mb-2">{incident.title}</h3>
                      <p className="text-sm text-muted-foreground mb-3">{incident.description}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                        <span>Started {formatDistanceToNow(new Date(incident.startedAt), { addSuffix: true })}</span>
                        {incident.resolvedAt && (
                          <>
                            <span>•</span>
                            <span className="text-green-600 dark:text-green-400">
                              Resolved {formatDistanceToNow(new Date(incident.resolvedAt), { addSuffix: true })}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Badge variant="outline" className={
                        incident.severity === "critical" 
                          ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                          : incident.severity === "major"
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                          : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                      }>
                        {incident.severity}
                      </Badge>
                      <Badge variant="outline">
                        {incident.status}
                      </Badge>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
