import { useQuery } from "@tanstack/react-query";
import { Incident, Service } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDistanceToNow, format, subDays, eachDayOfInterval } from "date-fns";
import { AlertCircle, CheckCircle2, Clock } from "lucide-react";

export default function History() {
  const { data: incidents = [], isLoading } = useQuery<Incident[]>({
    queryKey: ["/api/incidents"],
  });

  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const getServiceName = (serviceId: string) => {
    return services.find((s) => s.id === serviceId)?.name || "Unknown Service";
  };

  const sortedIncidents = [...incidents].sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  );

  const severityConfig = {
    minor: { label: "Minor", className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
    major: { label: "Major", className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
    critical: { label: "Critical", className: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20" },
  };

  const statusConfig = {
    investigating: { label: "Investigating", icon: AlertCircle },
    identified: { label: "Identified", icon: AlertCircle },
    monitoring: { label: "Monitoring", icon: Clock },
    resolved: { label: "Resolved", icon: CheckCircle2 },
  };

  const last30Days = eachDayOfInterval({
    start: subDays(new Date(), 29),
    end: new Date(),
  });

  const getUptimeForDay = (date: Date) => {
    const dayIncidents = incidents.filter((inc) => {
      const incDate = new Date(inc.startedAt);
      return format(incDate, "yyyy-MM-dd") === format(date, "yyyy-MM-dd");
    });

    if (dayIncidents.length === 0) return "operational";
    if (dayIncidents.some((i) => i.severity === "critical")) return "down";
    if (dayIncidents.some((i) => i.severity === "major")) return "degraded";
    return "minor";
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold mb-2">Incident History</h1>
        <p className="text-muted-foreground">Track and review all service incidents</p>
      </div>

      <Tabs defaultValue="timeline" className="w-full">
        <TabsList>
          <TabsTrigger value="timeline" data-testid="tab-timeline">Timeline</TabsTrigger>
          <TabsTrigger value="calendar" data-testid="tab-calendar">Calendar View</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="space-y-4 mt-6">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-32 rounded-lg bg-card animate-pulse" />
              ))}
            </div>
          ) : sortedIncidents.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="w-12 h-12 mx-auto text-green-500 mb-4" />
              <p className="text-muted-foreground">No incidents recorded</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedIncidents.map((incident) => {
                const StatusIcon = statusConfig[incident.status as keyof typeof statusConfig].icon;
                const duration = incident.resolvedAt
                  ? Math.round(
                      (new Date(incident.resolvedAt).getTime() - new Date(incident.startedAt).getTime()) / (1000 * 60)
                    )
                  : null;

                return (
                  <Card key={incident.id} className="p-6" data-testid={`card-incident-${incident.id}`}>
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <StatusIcon className="w-4 h-4 text-muted-foreground" />
                            <h3 className="font-medium text-base" data-testid={`text-incident-title-${incident.id}`}>
                              {incident.title}
                            </h3>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">
                            {incident.description}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="font-mono">
                              {getServiceName(incident.serviceId)}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge 
                            variant="outline" 
                            className={severityConfig[incident.severity as keyof typeof severityConfig].className}
                          >
                            {severityConfig[incident.severity as keyof typeof severityConfig].label}
                          </Badge>
                          <Badge variant="outline">
                            {statusConfig[incident.status as keyof typeof statusConfig].label}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground font-mono pt-3 border-t">
                        <span>
                          Started {formatDistanceToNow(new Date(incident.startedAt), { addSuffix: true })}
                        </span>
                        {duration !== null && (
                          <span className="text-green-600 dark:text-green-400">
                            Resolved in {duration}m
                          </span>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="calendar" className="mt-6">
          <Card className="p-6">
            <h3 className="text-lg font-medium mb-6">Last 30 Days Uptime</h3>
            <div className="grid grid-cols-10 gap-2">
              {last30Days.map((day) => {
                const status = getUptimeForDay(day);
                const colorClass = {
                  operational: "bg-green-500",
                  minor: "bg-blue-500",
                  degraded: "bg-amber-500",
                  down: "bg-red-500",
                }[status];

                return (
                  <div
                    key={day.toISOString()}
                    className={`aspect-square rounded-md ${colorClass} hover:ring-2 hover:ring-primary transition-all cursor-pointer`}
                    title={`${format(day, "MMM d")}: ${status}`}
                    data-testid={`calendar-day-${format(day, "yyyy-MM-dd")}`}
                  />
                );
              })}
            </div>
            <div className="flex items-center gap-6 mt-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-500" />
                <span className="text-muted-foreground">Operational</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-blue-500" />
                <span className="text-muted-foreground">Minor Issues</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-amber-500" />
                <span className="text-muted-foreground">Degraded</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-red-500" />
                <span className="text-muted-foreground">Down</span>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
