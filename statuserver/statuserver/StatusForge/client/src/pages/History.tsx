import { useQuery } from "@tanstack/react-query";
import { Incident, Service } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDistanceToNow, format, subDays, eachDayOfInterval, subMonths, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { AlertCircle, CheckCircle2, Clock, Search, TrendingUp } from "lucide-react";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useState } from "react";

type DateRange = "7days" | "30days" | "3months" | "all";

export default function History() {
  const [dateRange, setDateRange] = useState<DateRange>("30days");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: allIncidents = [], isLoading } = useQuery<Incident[]>({
    queryKey: ["/api/incidents"],
  });

  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const getDateRangeFilter = () => {
    const now = new Date();
    switch (dateRange) {
      case "7days":
        return { start: subDays(now, 7), end: now };
      case "30days":
        return { start: subDays(now, 30), end: now };
      case "3months":
        return { start: subMonths(now, 3), end: now };
      default:
        return null;
    }
  };

  const filterByDate = (date: Date) => {
    const range = getDateRangeFilter();
    if (!range) return true;
    return isWithinInterval(date, { start: startOfDay(range.start), end: endOfDay(range.end) });
  };

  const incidents = allIncidents.filter((inc) => {
    const matchesDate = filterByDate(new Date(inc.startedAt));
    const matchesSeverity = severityFilter === "all" || inc.severity === severityFilter;
    const matchesStatus = statusFilter === "all" || inc.status === statusFilter;
    const matchesSearch =
      inc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDate && matchesSeverity && matchesStatus && matchesSearch;
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

  const range = getDateRangeFilter();
  
  const getChartDays = () => {
    if (range) {
      return eachDayOfInterval({ start: range.start, end: range.end });
    }
    if (allIncidents.length === 0) {
      return eachDayOfInterval({ start: subDays(new Date(), 29), end: new Date() });
    }
    const oldestIncident = allIncidents.reduce((oldest, inc) => {
      const incDate = new Date(inc.startedAt);
      return incDate < oldest ? incDate : oldest;
    }, new Date());
    
    const startDate = new Date(Math.max(
      oldestIncident.getTime(),
      subMonths(new Date(), 6).getTime()
    ));
    
    return eachDayOfInterval({ start: startDate, end: new Date() });
  };
  
  const days = getChartDays();

  const getUptimeForDay = (date: Date) => {
    const dayIncidents = allIncidents.filter((inc) => {
      const incDate = new Date(inc.startedAt);
      return format(incDate, "yyyy-MM-dd") === format(date, "yyyy-MM-dd");
    });

    if (dayIncidents.length === 0) return "operational";
    if (dayIncidents.some((i) => i.severity === "critical")) return "down";
    if (dayIncidents.some((i) => i.severity === "major")) return "degraded";
    return "minor";
  };

  const incidentTrendData = days.map((date) => {
    const dayIncidents = allIncidents.filter((inc) => {
      const incDate = new Date(inc.startedAt);
      return format(incDate, "yyyy-MM-dd") === format(date, "yyyy-MM-dd");
    });
    return {
      date: format(date, "MMM d"),
      critical: dayIncidents.filter((i) => i.severity === "critical").length,
      major: dayIncidents.filter((i) => i.severity === "major").length,
      minor: dayIncidents.filter((i) => i.severity === "minor").length,
      total: dayIncidents.length,
    };
  });

  const unresolvedCount = incidents.filter((i) => i.status !== "resolved").length;
  const avgResolutionTime = incidents.filter((i) => i.resolvedAt).length > 0
    ? Math.round(
        incidents
          .filter((i) => i.resolvedAt)
          .reduce((sum, inc) => {
            const duration = new Date(inc.resolvedAt!).getTime() - new Date(inc.startedAt).getTime();
            return sum + duration;
          }, 0) /
          incidents.filter((i) => i.resolvedAt).length /
          (1000 * 60)
      )
    : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold mb-2">Incident History & Analytics</h1>
        <p className="text-muted-foreground">Track incidents with advanced filtering and trend analysis</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Unresolved</p>
              <p className="text-2xl font-semibold">{unresolvedCount}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Incidents</p>
              <p className="text-2xl font-semibold">{incidents.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Clock className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg Resolution</p>
              <p className="text-2xl font-semibold">{avgResolutionTime}m</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-medium mb-6">Incident Trend</h3>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={incidentTrendData}>
            <defs>
              <linearGradient id="criticalGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(0 84% 60%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(0 84% 60%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="majorGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(38 92% 50%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(38 92% 50%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="minorGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(217 91% 60%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(217 91% 60%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="date"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              stroke="hsl(var(--border))"
            />
            <YAxis
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              stroke="hsl(var(--border))"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "6px",
              }}
            />
            <Legend />
            <Line type="monotone" dataKey="critical" stroke="hsl(0 84% 60%)" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="major" stroke="hsl(38 92% 50%)" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="minor" stroke="hsl(217 91% 60%)" strokeWidth={2} dot={{ r: 3 }} />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      <Card className="p-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search incidents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Last 7 Days</SelectItem>
              <SelectItem value="30days">Last 30 Days</SelectItem>
              <SelectItem value="3months">Last 3 Months</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severity</SelectItem>
              <SelectItem value="minor">Minor</SelectItem>
              <SelectItem value="major">Major</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="investigating">Investigating</SelectItem>
              <SelectItem value="identified">Identified</SelectItem>
              <SelectItem value="monitoring">Monitoring</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

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
            <h3 className="text-lg font-medium mb-6">Uptime Calendar</h3>
            <div className="grid grid-cols-10 gap-2">
              {days.map((day) => {
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
