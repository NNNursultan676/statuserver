import { useQuery } from "@tanstack/react-query";
import { Service, Incident, ServerMetrics } from "@shared/schema";
import { MetricCard } from "@/components/MetricCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Activity, AlertCircle, Clock, Server, Download, Calendar as CalendarIcon, FileSpreadsheet, FileText, Cpu, HardDrive } from "lucide-react";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { subDays, subMonths, startOfDay, endOfDay, isWithinInterval, eachDayOfInterval, format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type DateRange = "7days" | "30days" | "3months" | "custom";

export default function Analytics() {
  const [dateRange, setDateRange] = useState<DateRange>("30days");
  const [showUnresolved, setShowUnresolved] = useState(false);
  const [customDateFrom, setCustomDateFrom] = useState<Date | undefined>(undefined);
  const [customDateTo, setCustomDateTo] = useState<Date | undefined>(undefined);

  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const { data: allIncidents = [] } = useQuery<Incident[]>({
    queryKey: ["/api/incidents"],
  });

  const { data: allMetrics = [] } = useQuery<ServerMetrics[]>({
    queryKey: ["/api/server-metrics"],
    refetchInterval: 3000, // Auto-refresh every 3 seconds
    refetchIntervalInBackground: true,
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
      case "custom":
        if (customDateFrom && customDateTo) {
          return { start: customDateFrom, end: customDateTo };
        }
        return { start: subDays(now, 30), end: now };
      default:
        return { start: subDays(now, 30), end: now };
    }
  };

  const filterByDate = (date: Date) => {
    const range = getDateRangeFilter();
    return isWithinInterval(date, { start: startOfDay(range.start), end: endOfDay(range.end) });
  };

  const incidents = allIncidents.filter((inc) => {
    const matchesDate = filterByDate(new Date(inc.startedAt));
    const matchesResolved = !showUnresolved || inc.status !== "resolved";
    return matchesDate && matchesResolved;
  });

  const range = getDateRangeFilter();
  const filteredMetrics = allMetrics.filter((metric) =>
    filterByDate(new Date(metric.timestamp))
  );

  const exportToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Title
    doc.setFontSize(16);
    doc.text("Status Report", pageWidth / 2, 15, { align: "center" });

    // Date range
    doc.setFontSize(8);
    const rangeText = range
      ? `${format(range.start, "MMM d, yyyy")} - ${format(range.end, "MMM d, yyyy")}`
      : "All Time";
    doc.text(rangeText, pageWidth / 2, 22, { align: "center" });
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 27, { align: "center" });

    let yPos = 33;

    // Summary metrics - compact
    autoTable(doc, {
      startY: yPos,
      head: [["Uptime", "Services", "Active Inc.", "MTTR"]],
      body: [[`${uptimePercentage}%`, `${operationalServices}/${totalServices}`, `${activeIncidents}`, `${mttr}m`]],
      theme: "grid",
      headStyles: { fillColor: [66, 139, 202], fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      margin: { left: 14, right: 14 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 6;

    // Server Metrics - compact
    const serverMetricsData = services.slice(0, 5).map((service) => {
      const serviceMetrics = filteredMetrics.filter((m) => m.serviceId === service.id);
      const avgCpu = serviceMetrics.length > 0
        ? (serviceMetrics.reduce((sum, m) => sum + m.cpuUsage, 0) / serviceMetrics.length).toFixed(0)
        : "-";
      const avgRam = serviceMetrics.length > 0
        ? (serviceMetrics.reduce((sum, m) => sum + m.ramUsage, 0) / serviceMetrics.length).toFixed(0)
        : "-";
      const avgDisk = serviceMetrics.length > 0
        ? (serviceMetrics.reduce((sum, m) => sum + m.diskUsage, 0) / serviceMetrics.length).toFixed(0)
        : "-";

      return [
        service.name.substring(0, 20),
        serviceMetrics.length > 0 ? format(new Date(serviceMetrics[serviceMetrics.length - 1].timestamp), "MMM d HH:mm") : "-",
        avgCpu !== "-" ? `${avgCpu}%` : avgCpu,
        avgRam !== "-" ? `${avgRam}%` : avgRam,
        avgDisk !== "-" ? `${avgDisk}%` : avgDisk,
      ];
    });

    doc.setFontSize(10);
    doc.text("Server Metrics", 14, yPos);
    yPos += 5;

    autoTable(doc, {
      startY: yPos,
      head: [["Service", "Updated", "CPU", "RAM", "Disk"]],
      body: serverMetricsData,
      theme: "grid",
      headStyles: { fillColor: [66, 139, 202], fontSize: 7 },
      bodyStyles: { fontSize: 7 },
      margin: { left: 14, right: 14 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 6;

    // GitLab Incidents
    const gitlabIncidents = incidents
      .filter((inc) => {
        const service = services.find((s) => s.id === inc.serviceId);
        return service?.category === "Infrastructure" || service?.name.toLowerCase().includes("git");
      })
      .slice(0, 5)
      .map((incident) => {
        const service = services.find((s) => s.id === incident.serviceId);
        return [
          format(new Date(incident.startedAt), "MMM d HH:mm"),
          service?.name.substring(0, 15) || "-",
          incident.title.substring(0, 20),
          incident.status === "resolved" ? "✓" : "-",
          (incident.description || incident.severity).substring(0, 15),
        ];
      });

    doc.setFontSize(10);
    doc.text("GitLab", 14, yPos);
    yPos += 5;

    autoTable(doc, {
      startY: yPos,
      head: [["Time", "Project", "Total", "Done", "Reason"]],
      body: gitlabIncidents.length > 0 ? gitlabIncidents : [["No data", "-", "-", "-", "-"]],
      theme: "grid",
      headStyles: { fillColor: [66, 139, 202], fontSize: 7 },
      bodyStyles: { fontSize: 7 },
      margin: { left: 14, right: 14 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 6;

    // S3 Storage
    const s3Data = services
      .filter((s) => s.category === "Infrastructure" || s.name.toLowerCase().includes("storage") || s.name.toLowerCase().includes("s3"))
      .slice(0, 5)
      .map((service) => {
        const serviceMetrics = filteredMetrics.filter((m) => m.serviceId === service.id);
        const latestMetric = serviceMetrics[serviceMetrics.length - 1];
        const avgDisk = serviceMetrics.length > 0
          ? (serviceMetrics.reduce((sum, m) => sum + m.diskUsage, 0) / serviceMetrics.length)
          : 0;

        const quota = 100;
        const used = avgDisk;
        const free = quota - used;

        return [
          latestMetric ? format(new Date(latestMetric.timestamp), "MMM d HH:mm") : "-",
          service.name.substring(0, 15),
          `${quota.toFixed(0)}%`,
          `${used.toFixed(0)}%`,
          `${free.toFixed(0)}%`,
        ];
      });

    doc.setFontSize(10);
    doc.text("S3 Storage", 14, yPos);
    yPos += 5;

    autoTable(doc, {
      startY: yPos,
      head: [["Time", "Name", "Quota", "Used", "Free"]],
      body: s3Data.length > 0 ? s3Data : [["No data", "-", "-", "-", "-"]],
      theme: "grid",
      headStyles: { fillColor: [66, 139, 202], fontSize: 7 },
      bodyStyles: { fontSize: 7 },
      margin: { left: 14, right: 14 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 6;

    // Services Overview - compact
    const servicesData = services.slice(0, 8).map((s) => [
      s.name.substring(0, 25),
      s.category.substring(0, 12),
      s.status,
    ]);

    doc.setFontSize(10);
    doc.text("Services", 14, yPos);
    yPos += 5;

    autoTable(doc, {
      startY: yPos,
      head: [["Name", "Category", "Status"]],
      body: servicesData,
      theme: "grid",
      headStyles: { fillColor: [66, 139, 202], fontSize: 7 },
      bodyStyles: { fontSize: 7 },
      margin: { left: 14, right: 14 },
    });

    doc.save(`status-report-${new Date().toISOString().split("T")[0]}.pdf`);
  };

  const exportToJSON = () => {
    const avgMetrics = services.map((service) => {
      const serviceMetrics = filteredMetrics.filter((m) => m.serviceId === service.id);
      return {
        serviceId: service.id,
        serviceName: service.name,
        avgCpu: serviceMetrics.length > 0
          ? (serviceMetrics.reduce((sum, m) => sum + m.cpuUsage, 0) / serviceMetrics.length).toFixed(1)
          : null,
        avgRam: serviceMetrics.length > 0
          ? (serviceMetrics.reduce((sum, m) => sum + m.ramUsage, 0) / serviceMetrics.length).toFixed(1)
          : null,
        avgDisk: serviceMetrics.length > 0
          ? (serviceMetrics.reduce((sum, m) => sum + m.diskUsage, 0) / serviceMetrics.length).toFixed(1)
          : null,
      };
    });

    const data = {
      dateRange: range
        ? { from: format(range.start, "yyyy-MM-dd"), to: format(range.end, "yyyy-MM-dd") }
        : "all",
      generatedAt: new Date().toISOString(),
      services,
      incidents,
      averageMetrics: avgMetrics,
      statistics: {
        totalServices,
        operationalServices,
        uptimePercentage,
        activeIncidents,
        mttr,
      },
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `status-report-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToCSV = () => {
    const csvRows = [];
    
    // Header
    csvRows.push("Status Report");
    csvRows.push(`Generated;${new Date().toLocaleString()}`);
    csvRows.push(`Date Range;${range ? `${format(range.start, "MMM d, yyyy")} - ${format(range.end, "MMM d, yyyy")}` : "All Time"}`);
    csvRows.push("");

    // Summary
    csvRows.push("Summary");
    csvRows.push("Metric;Value");
    csvRows.push(`Uptime;${uptimePercentage}%`);
    csvRows.push(`Operational Services;${operationalServices}/${totalServices}`);
    csvRows.push(`Active Incidents;${activeIncidents}`);
    csvRows.push(`Mean Time to Resolve;${mttr}m`);
    csvRows.push("");

    // Services
    csvRows.push("Services");
    csvRows.push("Name;Category;Status;Last Updated");
    services.forEach((service) => {
      csvRows.push(`${service.name};${service.category};${service.status};${new Date(service.updatedAt).toLocaleString()}`);
    });
    csvRows.push("");

    // Server Metrics
    csvRows.push("Server Metrics");
    csvRows.push("Service;Updated;CPU;RAM;Disk");
    services.forEach((service) => {
      const serviceMetrics = filteredMetrics.filter((m) => m.serviceId === service.id);
      const latestMetric = serviceMetrics[serviceMetrics.length - 1];
      const avgCpu = serviceMetrics.length > 0
        ? (serviceMetrics.reduce((sum, m) => sum + m.cpuUsage, 0) / serviceMetrics.length).toFixed(1)
        : "N/A";
      const avgRam = serviceMetrics.length > 0
        ? (serviceMetrics.reduce((sum, m) => sum + m.ramUsage, 0) / serviceMetrics.length).toFixed(1)
        : "N/A";
      const avgDisk = serviceMetrics.length > 0
        ? (serviceMetrics.reduce((sum, m) => sum + m.diskUsage, 0) / serviceMetrics.length).toFixed(1)
        : "N/A";
      
      csvRows.push(`${service.name};${latestMetric ? format(new Date(latestMetric.timestamp), "MMM d HH:mm") : "N/A"};${avgCpu}${avgCpu !== "N/A" ? "%" : ""};${avgRam}${avgRam !== "N/A" ? "%" : ""};${avgDisk}${avgDisk !== "N/A" ? "%" : ""}`);
    });
    csvRows.push("");

    // GitLab Incidents
    csvRows.push("GitLab Incidents");
    csvRows.push("Time;Project;Title;Status;Description");
    incidents
      .filter((inc) => {
        const service = services.find((s) => s.id === inc.serviceId);
        return service?.category === "Infrastructure" || service?.name.toLowerCase().includes("git");
      })
      .forEach((incident) => {
        const service = services.find((s) => s.id === incident.serviceId);
        const desc = (incident.description || incident.severity).replace(/;/g, ',');
        csvRows.push(`${format(new Date(incident.startedAt), "MMM d HH:mm")};${service?.name || "Unknown"};${incident.title};${incident.status === "resolved" ? "✓" : "-"};${desc}`);
      });
    csvRows.push("");

    // S3 Storage
    csvRows.push("S3 Storage");
    csvRows.push("Time;Name;Quota;Used;Free");
    services
      .filter((s) => s.category === "Infrastructure" || s.name.toLowerCase().includes("storage") || s.name.toLowerCase().includes("s3"))
      .forEach((service) => {
        const serviceMetrics = filteredMetrics.filter((m) => m.serviceId === service.id);
        const latestMetric = serviceMetrics[serviceMetrics.length - 1];
        const avgDisk = serviceMetrics.length > 0
          ? (serviceMetrics.reduce((sum, m) => sum + m.diskUsage, 0) / serviceMetrics.length)
          : 0;
        const quota = 100;
        const used = avgDisk;
        const free = quota - used;

        csvRows.push(`${latestMetric ? format(new Date(latestMetric.timestamp), "MMM d HH:mm") : "N/A"};${service.name};${quota.toFixed(0)}%;${used.toFixed(1)}%;${free.toFixed(1)}%`);
      });

    const csvContent = "\uFEFF" + csvRows.join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `status-report-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

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

  const uptimeDays = range
    ? eachDayOfInterval({ start: range.start, end: range.end })
    : eachDayOfInterval({ start: subDays(new Date(), 29), end: new Date() });

  const uptimeData = uptimeDays.map((date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const dayIncidents = allIncidents.filter((inc) => {
      const incDate = new Date(inc.startedAt);
      return format(incDate, "yyyy-MM-dd") === dateStr;
    });

    const criticalCount = dayIncidents.filter((i) => i.severity === "critical").length;
    const majorCount = dayIncidents.filter((i) => i.severity === "major").length;
    const degradedCount = dayIncidents.filter((i) => i.severity === "degraded").length;

    let uptimePercent = 100;
    if (criticalCount > 0) {
      uptimePercent = Math.max(85, 100 - (criticalCount * 5 + majorCount * 2 + degradedCount));
    } else if (majorCount > 0) {
      uptimePercent = Math.max(90, 100 - (majorCount * 2 + degradedCount));
    } else if (degradedCount > 0) {
      uptimePercent = Math.max(95, 100 - degradedCount);
    }

    return {
      date: format(date, "MMM d"),
      uptime: uptimePercent,
    };
  });

  const incidentsByDay = uptimeDays.map((date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const count = incidents.filter((inc) => {
      const incDate = new Date(inc.startedAt);
      return format(incDate, "yyyy-MM-dd") === dateStr;
    }).length;
    return {
      date: format(date, "MMM d"),
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

  const severityByCategory = services.reduce((acc, service) => {
    if (!acc[service.category]) {
      acc[service.category] = { operational: 0, degraded: 0, down: 0, maintenance: 0 };
    }
    acc[service.category][service.status as keyof typeof acc[string]] += 1;
    return acc;
  }, {} as Record<string, Record<string, number>>);

  const categoryChartData = Object.entries(severityByCategory).map(([category, stats]) => ({
    category,
    ...stats,
  }));

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold mb-2">Reports & Analytics</h1>
          <p className="text-muted-foreground">Generate comprehensive reports with custom date ranges</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Export Report</DialogTitle>
              <DialogDescription>
                Choose a format to download your report
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-4">
              <Button onClick={() => { exportToPDF(); }} variant="outline" className="justify-start">
                <FileText className="w-4 h-4 mr-2" />
                Export as PDF
              </Button>
              <Button onClick={() => { exportToCSV(); }} variant="outline" className="justify-start">
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Export as CSV
              </Button>
              <Button onClick={() => { exportToJSON(); }} variant="outline" className="justify-start">
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Export as JSON
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-muted-foreground" />
            <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">Last 7 Days</SelectItem>
                <SelectItem value="30days">Last 30 Days</SelectItem>
                <SelectItem value="3months">Last 3 Months</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {dateRange === "custom" && (
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    {customDateFrom ? format(customDateFrom, "MMM d, yyyy") : "From date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={customDateFrom}
                    onSelect={setCustomDateFrom}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <span className="text-muted-foreground">to</span>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    {customDateTo ? format(customDateTo, "MMM d, yyyy") : "To date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={customDateTo}
                    onSelect={setCustomDateTo}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}

          <Button
            variant={showUnresolved ? "default" : "outline"}
            size="sm"
            onClick={() => setShowUnresolved(!showUnresolved)}
          >
            <AlertCircle className="w-4 h-4 mr-2" />
            {showUnresolved ? "Showing Unresolved Only" : "Show Unresolved Only"}
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Overall Uptime"
          value={`${uptimePercentage}%`}
          subtitle={range ? `${format(range.start, "MMM d")} - ${format(range.end, "MMM d")}` : "All time"}
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

      {filteredMetrics.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Cpu className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg CPU Usage</p>
                <p className="text-2xl font-semibold">
                  {(filteredMetrics.reduce((sum, m) => sum + m.cpuUsage, 0) / filteredMetrics.length).toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {range ? `${format(range.start, "MMM d")} - ${format(range.end, "MMM d")}` : "All time"}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <HardDrive className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg RAM Usage</p>
                <p className="text-2xl font-semibold">
                  {(filteredMetrics.reduce((sum, m) => sum + m.ramUsage, 0) / filteredMetrics.length).toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {range ? `${format(range.start, "MMM d")} - ${format(range.end, "MMM d")}` : "All time"}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <HardDrive className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Disk Usage</p>
                <p className="text-2xl font-semibold">
                  {(filteredMetrics.reduce((sum, m) => sum + m.diskUsage, 0) / filteredMetrics.length).toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {range ? `${format(range.start, "MMM d")} - ${format(range.end, "MMM d")}` : "All time"}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

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
          <h3 className="text-lg font-medium mb-6">Status by Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categoryChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="category"
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
              <Legend />
              <Bar dataKey="operational" stackId="a" fill="hsl(142 76% 45%)" />
              <Bar dataKey="degraded" stackId="a" fill="hsl(38 92% 50%)" />
              <Bar dataKey="down" stackId="a" fill="hsl(0 84% 60%)" />
              <Bar dataKey="maintenance" stackId="a" fill="hsl(217 91% 60%)" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-medium mb-6">Server Info</h3>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4" />
                    CPU
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <Server className="w-4 h-4" />
                    RAM
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-4 h-4" />
                    Disk
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.map((service) => {
                const serviceMetrics = filteredMetrics.filter((m) => m.serviceId === service.id);
                const latestMetric = serviceMetrics[serviceMetrics.length - 1];
                const avgCpu = serviceMetrics.length > 0
                  ? (serviceMetrics.reduce((sum, m) => sum + m.cpuUsage, 0) / serviceMetrics.length)
                  : null;
                const avgRam = serviceMetrics.length > 0
                  ? (serviceMetrics.reduce((sum, m) => sum + m.ramUsage, 0) / serviceMetrics.length)
                  : null;
                const avgDisk = serviceMetrics.length > 0
                  ? (serviceMetrics.reduce((sum, m) => sum + m.diskUsage, 0) / serviceMetrics.length)
                  : null;

                return (
                  <TableRow key={service.id}>
                    <TableCell className="font-medium">{service.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {latestMetric ? format(new Date(latestMetric.timestamp), "MMM d, HH:mm") : "N/A"}
                    </TableCell>
                    <TableCell>
                      {avgCpu !== null ? (
                        <span className={avgCpu > 80 ? "text-red-600 dark:text-red-400 font-medium" : ""}>
                          {avgCpu.toFixed(1)}%
                        </span>
                      ) : "N/A"}
                    </TableCell>
                    <TableCell>
                      {avgRam !== null ? (
                        <span className={avgRam > 85 ? "text-amber-600 dark:text-amber-400 font-medium" : ""}>
                          {avgRam.toFixed(1)}%
                        </span>
                      ) : "N/A"}
                    </TableCell>
                    <TableCell>
                      {avgDisk !== null ? (
                        <span className={avgDisk > 90 ? "text-red-600 dark:text-red-400 font-medium" : ""}>
                          {avgDisk.toFixed(1)}%
                        </span>
                      ) : "N/A"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-medium mb-6">Services Overview</h3>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.map((service) => (
                <TableRow key={service.id}>
                  <TableCell className="font-medium">{service.name}</TableCell>
                  <TableCell>{service.category}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        service.status === "operational"
                          ? "bg-green-500/10 text-green-600 dark:text-green-400"
                          : service.status === "degraded"
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          : service.status === "down"
                          ? "bg-red-500/10 text-red-600 dark:text-red-400"
                          : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                      }`}
                    >
                      {service.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(service.updatedAt).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-medium mb-6">GitLab Incidents</h3>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Done</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {incidents
                .filter((inc) => {
                  const service = services.find((s) => s.id === inc.serviceId);
                  return service?.category === "Infrastructure" || service?.name.toLowerCase().includes("git");
                })
                .slice(0, 10)
                .map((incident) => {
                  const service = services.find((s) => s.id === incident.serviceId);
                  const duration = incident.resolvedAt
                    ? Math.round(
                        (new Date(incident.resolvedAt).getTime() - new Date(incident.startedAt).getTime()) / (1000 * 60)
                      )
                    : null;
                  return (
                    <TableRow key={incident.id}>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(incident.startedAt), "HH:mm MMM d")}
                      </TableCell>
                      <TableCell className="font-medium">{service?.name || "Unknown"}</TableCell>
                      <TableCell className="text-sm">{incident.title}</TableCell>
                      <TableCell className="text-sm">
                        {incident.status === "resolved" ? "✓" : "-"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {incident.description || incident.severity}
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-medium mb-6">S3 Storage Metrics</h3>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Quota</TableHead>
                <TableHead>Unfree</TableHead>
                <TableHead>Free</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services
                .filter((s) => s.category === "Infrastructure" || s.name.toLowerCase().includes("storage") || s.name.toLowerCase().includes("s3"))
                .map((service) => {
                  const serviceMetrics = filteredMetrics.filter((m) => m.serviceId === service.id);
                  const latestMetric = serviceMetrics[serviceMetrics.length - 1];
                  const avgDisk = serviceMetrics.length > 0
                    ? (serviceMetrics.reduce((sum, m) => sum + m.diskUsage, 0) / serviceMetrics.length)
                    : 0;

                  const quota = 100;
                  const used = avgDisk;
                  const free = quota - used;

                  return (
                    <TableRow key={service.id}>
                      <TableCell className="text-sm text-muted-foreground">
                        {latestMetric ? format(new Date(latestMetric.timestamp), "HH:mm MMM d") : "N/A"}
                      </TableCell>
                      <TableCell className="font-medium">{service.name}</TableCell>
                      <TableCell className="text-sm">{quota.toFixed(0)}%</TableCell>
                      <TableCell className="text-sm">
                        <span className={used > 80 ? "text-red-600 dark:text-red-400 font-medium" : ""}>
                          {used.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">
                        <span className={free < 20 ? "text-amber-600 dark:text-amber-400 font-medium" : "text-green-600 dark:text-green-400"}>
                          {free.toFixed(1)}%
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}