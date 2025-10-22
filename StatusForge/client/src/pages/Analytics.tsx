import { useQuery } from "@tanstack/react-query";
import { Service, Incident } from "@shared/schema";
import { MetricCard } from "@/components/MetricCard";
import { Card } from "@/components/ui/card";
import { LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Activity, AlertCircle, Clock, Server } from "lucide-react";

export default function Analytics() {
  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const { data: incidents = [] } = useQuery<Incident[]>({
    queryKey: ["/api/incidents"],
  });

  const totalServices = services.length;
  const operationalServices = services.filter((s) => s.status === "operational").length;
  const uptimePercentage = totalServices > 0 
    ? ((operationalServices / totalServices) * 100).toFixed(2) 
    : "0.00";

  const activeIncidents = incidents.filter((i) => i.status !== "resolved").length;
  
  const resolvedIncidents = incidents.filter((i) => i.resolvedAt);
  const mttr = resolvedIncidents.length > 0
    ? Math.round(
        resolvedIncidents.reduce((sum, inc) => {
          const duration = new Date(inc.resolvedAt!).getTime() - new Date(inc.startedAt).getTime();
          return sum + duration;
        }, 0) / resolvedIncidents.length / (1000 * 60)
      )
    : 0;

  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    return date.toISOString().split("T")[0];
  });

  const uptimeData = last30Days.map((date) => ({
    date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    uptime: 95 + Math.random() * 5,
  }));

  const incidentsByDay = last30Days.map((date) => {
    const count = incidents.filter((inc) => 
      inc.startedAt.toString().startsWith(date)
    ).length;
    return {
      date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      incidents: count,
    };
  });

  const statusDistribution = [
    { name: "Operational", value: services.filter((s) => s.status === "operational").length, color: "hsl(142 76% 45%)" },
    { name: "Degraded", value: services.filter((s) => s.status === "degraded").length, color: "hsl(38 92% 50%)" },
    { name: "Down", value: services.filter((s) => s.status === "down").length, color: "hsl(0 84% 60%)" },
    { name: "Maintenance", value: services.filter((s) => s.status === "maintenance").length, color: "hsl(217 91% 60%)" },
  ].filter((item) => item.value > 0);

  const categoryDistribution = Array.from(
    services.reduce((acc, service) => {
      acc.set(service.category, (acc.get(service.category) || 0) + 1);
      return acc;
    }, new Map<string, number>())
  ).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold mb-2">Analytics & Metrics</h1>
        <p className="text-muted-foreground">Comprehensive service health and performance metrics</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Overall Uptime"
          value={`${uptimePercentage}%`}
          subtitle="Last 30 days"
          trend="up"
          trendValue="+0.3%"
          icon={<Activity className="w-5 h-5" />}
        />
        <MetricCard
          title="Active Services"
          value={totalServices}
          subtitle={`${operationalServices} operational`}
          icon={<Server className="w-5 h-5" />}
        />
        <MetricCard
          title="Active Incidents"
          value={activeIncidents}
          subtitle={`${incidents.length} total incidents`}
          trend={activeIncidents > 0 ? "down" : "neutral"}
          icon={<AlertCircle className="w-5 h-5" />}
        />
        <MetricCard
          title="Mean Time to Resolve"
          value={`${mttr}m`}
          subtitle="Average resolution time"
          trend="up"
          trendValue="-12m"
          icon={<Clock className="w-5 h-5" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-medium mb-6">Uptime Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={uptimeData}>
              <defs>
                <linearGradient id="uptimeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(142 76% 45%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(142 76% 45%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="date" 
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                stroke="hsl(var(--border))"
              />
              <YAxis 
                domain={[90, 100]}
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
              <Area 
                type="monotone" 
                dataKey="uptime" 
                stroke="hsl(142 76% 45%)" 
                fill="url(#uptimeGradient)" 
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-medium mb-6">Incidents Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={incidentsByDay}>
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
                  borderRadius: "6px"
                }}
              />
              <Line 
                type="monotone" 
                dataKey="incidents" 
                stroke="hsl(0 84% 60%)" 
                strokeWidth={2}
                dot={{ fill: "hsl(0 84% 60%)", r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-medium mb-6">Service Status Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusDistribution}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {statusDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "hsl(var(--popover))", 
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px"
                }}
              />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                wrapperStyle={{ fontSize: "14px" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-medium mb-6">Services by Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryDistribution}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {categoryDistribution.map((_, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={`hsl(var(--chart-${(index % 5) + 1}))`} 
                  />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "hsl(var(--popover))", 
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px"
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
