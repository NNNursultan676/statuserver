import { useQuery } from "@tanstack/react-query";
import { Service, Incident, ServerMetrics } from "@shared/schema";
import { MetricCard } from "@/components/MetricCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { Activity, AlertCircle, Clock, Server, Download, Calendar as CalendarIcon, FileSpreadsheet, FileText, Cpu, HardDrive, TrendingUp, TrendingDown, AlertTriangle, BarChart3 } from "lucide-react";
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
    refetchInterval: 1000,
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

  // Анализ нагрузки серверов
  const serverLoadAnalysis = services.map((service) => {
    const serviceMetrics = filteredMetrics.filter((m) => m.serviceId === service.id);
    const avgCpu = serviceMetrics.length > 0
      ? serviceMetrics.reduce((sum, m) => sum + m.cpuUsage, 0) / serviceMetrics.length
      : 0;
    const avgRam = serviceMetrics.length > 0
      ? serviceMetrics.reduce((sum, m) => sum + m.ramUsage, 0) / serviceMetrics.length
      : 0;
    const avgDisk = serviceMetrics.length > 0
      ? serviceMetrics.reduce((sum, m) => sum + m.diskUsage, 0) / serviceMetrics.length
      : 0;
    const maxCpu = serviceMetrics.length > 0
      ? Math.max(...serviceMetrics.map(m => m.cpuUsage))
      : 0;
    const maxRam = serviceMetrics.length > 0
      ? Math.max(...serviceMetrics.map(m => m.ramUsage))
      : 0;

    // Подсчет инцидентов для этого сервиса
    const serviceIncidents = incidents.filter(inc => inc.serviceId === service.id);
    const downtime = serviceIncidents.filter(inc => inc.severity === "critical").length;

    return {
      name: service.name,
      shortName: service.name.substring(0, 15),
      avgCpu: Number(avgCpu.toFixed(1)),
      avgRam: Number(avgRam.toFixed(1)),
      avgDisk: Number(avgDisk.toFixed(1)),
      maxCpu: Number(maxCpu.toFixed(1)),
      maxRam: Number(maxRam.toFixed(1)),
      totalLoad: Number(((avgCpu + avgRam + avgDisk) / 3).toFixed(1)),
      incidents: serviceIncidents.length,
      downtime,
      stability: serviceMetrics.length > 0 ? Number((100 - (downtime / serviceMetrics.length * 100)).toFixed(1)) : 100,
    };
  }).sort((a, b) => b.totalLoad - a.totalLoad);

  // Топ 5 самых нагруженных серверов
  const topLoadedServers = serverLoadAnalysis.slice(0, 5);

  // Топ 5 наименее нагруженных серверов
  const leastLoadedServers = [...serverLoadAnalysis].reverse().slice(0, 5);

  // Топ 5 самых стабильных серверов
  const mostStableServers = [...serverLoadAnalysis].sort((a, b) => b.stability - a.stability).slice(0, 5);

  // Топ 5 самых нестабильных серверов
  const leastStableServers = [...serverLoadAnalysis].sort((a, b) => a.stability - b.stability).slice(0, 5);

  // Radar chart data для комплексного анализа топ серверов
  const radarData = topLoadedServers.map(server => ({
    server: server.shortName,
    CPU: server.avgCpu,
    RAM: server.avgRam,
    Disk: server.avgDisk,
    Load: server.totalLoad,
  }));

  // Статистика падений по серверам
  const downtimeStats = serverLoadAnalysis.map(server => ({
    name: server.shortName,
    incidents: server.incidents,
    critical: server.downtime,
  })).filter(s => s.incidents > 0).sort((a, b) => b.critical - a.critical);

  const exportToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(16);
    doc.text("Complete Services Analytics Report", pageWidth / 2, 15, { align: "center" });

    doc.setFontSize(8);
    const rangeText = range
      ? `${format(range.start, "MMM d, yyyy")} - ${format(range.end, "MMM d, yyyy")}`
      : "All Time";
    doc.text(rangeText, pageWidth / 2, 22, { align: "center" });
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 27, { align: "center" });

    let yPos = 33;

    // Summary metrics
    autoTable(doc, {
      startY: yPos,
      head: [["Uptime", "Total Services", "Operational", "Active Inc.", "MTTR", "Degraded", "Down"]],
      body: [[
        `${uptimePercentage}%`, 
        `${totalServices}`,
        `${operationalServices}`,
        `${activeIncidents}`, 
        `${mttr}m`,
        `${statusCounts.degraded}`,
        `${statusCounts.down}`
      ]],
      theme: "grid",
      headStyles: { fillColor: [66, 139, 202], fontSize: 7 },
      bodyStyles: { fontSize: 7 },
      margin: { left: 14, right: 14 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 8;

    // Services by Category
    doc.setFontSize(10);
    doc.text("Services Distribution by Category", 14, yPos);
    yPos += 5;

    const categoryData = Object.entries(categoryDistribution).map(([name, value]) => [
      name,
      value.toString(),
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [["Category", "Count"]],
      body: categoryData,
      theme: "grid",
      headStyles: { fillColor: [102, 126, 234], fontSize: 7 },
      bodyStyles: { fontSize: 7 },
      margin: { left: 14, right: 14 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 8;

    // Services by Type
    doc.setFontSize(10);
    doc.text("Services Distribution by Type", 14, yPos);
    yPos += 5;

    const typeData = Object.entries(typeStats).map(([type, count]) => [
      type,
      count.toString(),
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [["Type", "Count"]],
      body: typeData,
      theme: "grid",
      headStyles: { fillColor: [76, 175, 80], fontSize: 7 },
      bodyStyles: { fontSize: 7 },
      margin: { left: 14, right: 14 },
    });

    // New Page for Server Load Analysis
    doc.addPage();
    yPos = 20;

    // Top Loaded Servers
    doc.setFontSize(12);
    doc.text("Top 10 Most Loaded Servers", 14, yPos);
    yPos += 5;

    const topLoadedData = topLoadedServers.slice(0, 10).map(s => [
      s.name.substring(0, 25),
      `${s.avgCpu}%`,
      `${s.avgRam}%`,
      `${s.avgDisk}%`,
      `${s.totalLoad}%`,
      `${s.incidents}`,
      `${s.stability}%`,
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [["Service", "CPU", "RAM", "Disk", "Load", "Inc.", "Stab."]],
      body: topLoadedData,
      theme: "grid",
      headStyles: { fillColor: [220, 53, 69], fontSize: 6 },
      bodyStyles: { fontSize: 6 },
      margin: { left: 14, right: 14 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 8;

    // Least Loaded Servers
    doc.setFontSize(12);
    doc.text("Top 10 Least Loaded Servers", 14, yPos);
    yPos += 5;

    const leastLoadedData = leastLoadedServers.slice(0, 10).map(s => [
      s.name.substring(0, 25),
      `${s.avgCpu}%`,
      `${s.avgRam}%`,
      `${s.avgDisk}%`,
      `${s.totalLoad}%`,
      `${s.incidents}`,
      `${s.stability}%`,
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [["Service", "CPU", "RAM", "Disk", "Load", "Inc.", "Stab."]],
      body: leastLoadedData,
      theme: "grid",
      headStyles: { fillColor: [40, 167, 69], fontSize: 6 },
      bodyStyles: { fontSize: 6 },
      margin: { left: 14, right: 14 },
    });

    // New Page for All Services Details
    doc.addPage();
    yPos = 20;

    doc.setFontSize(12);
    doc.text("Complete Services Details", 14, yPos);
    yPos += 5;

    const allServicesData = serverLoadAnalysis.map(s => [
      s.name.substring(0, 20),
      s.shortName.substring(0, 10),
      `${s.avgCpu}%`,
      `${s.avgRam}%`,
      `${s.avgDisk}%`,
      `${s.totalLoad}%`,
      `${s.incidents}`,
      `${s.downtime}`,
      `${s.stability}%`,
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [["Name", "Short", "CPU", "RAM", "Disk", "Load", "Inc", "Down", "Stab"]],
      body: allServicesData,
      theme: "grid",
      headStyles: { fillColor: [63, 81, 181], fontSize: 5 },
      bodyStyles: { fontSize: 5 },
      margin: { left: 10, right: 10 },
    });

    doc.save(`complete-analytics-${new Date().toISOString().split("T")[0]}.pdf`);
  };

  const exportToJSON = () => {
    const data = {
      reportMetadata: {
        title: "Complete Services Analytics Report",
        dateRange: range
          ? { from: format(range.start, "yyyy-MM-dd"), to: format(range.end, "yyyy-MM-dd") }
          : "all",
        generatedAt: new Date().toISOString(),
        totalServicesAnalyzed: services.length,
        totalIncidents: incidents.length,
      },
      summaryStatistics: {
        totalServices,
        operationalServices,
        degradedServices: statusCounts.degraded,
        downServices: statusCounts.down,
        maintenanceServices: statusCounts.maintenance,
        loadingServices: statusCounts.loading,
        uptimePercentage,
        activeIncidents,
        resolvedIncidents: incidents.filter(i => i.status === "resolved").length,
        mttr,
      },
      distributionAnalysis: {
        byCategory: categoryDistribution,
        byType: typeStats,
        byEnvironment: environmentStats,
        byStatus: {
          operational: statusCounts.operational,
          degraded: statusCounts.degraded,
          down: statusCounts.down,
          maintenance: statusCounts.maintenance,
          loading: statusCounts.loading,
        },
      },
      loadAnalysis: {
        top10MostLoaded: topLoadedServers.slice(0, 10),
        top10LeastLoaded: leastLoadedServers.slice(0, 10),
        top10MostStable: mostStableServers.slice(0, 10),
        top10LeastStable: leastStableServers.slice(0, 10),
      },
      downtimeAnalysis: {
        statisticsByServer: downtimeStats,
        totalCriticalIncidents: downtimeStats.reduce((sum, s) => sum + s.critical, 0),
        totalIncidents: downtimeStats.reduce((sum, s) => sum + s.incidents, 0),
      },
      completeServerAnalysis: serverLoadAnalysis.map(server => ({
        ...server,
        serviceDetails: services.find(s => s.name === server.name),
      })),
      allServices: services.map(service => {
        const analysis = serverLoadAnalysis.find(s => s.name === service.name);
        return {
          ...service,
          performanceMetrics: analysis ? {
            avgCpu: analysis.avgCpu,
            avgRam: analysis.avgRam,
            avgDisk: analysis.avgDisk,
            totalLoad: analysis.totalLoad,
            maxCpu: analysis.maxCpu,
            maxRam: analysis.maxRam,
            incidents: analysis.incidents,
            downtime: analysis.downtime,
            stability: analysis.stability,
          } : null,
        };
      }),
      allIncidents: incidents.map(inc => ({
        ...inc,
        serviceName: getServiceName(inc.serviceId),
      })),
      metricsData: filteredMetrics.length > 0 ? {
        totalDataPoints: filteredMetrics.length,
        averages: {
          cpu: (filteredMetrics.reduce((sum, m) => sum + m.cpuUsage, 0) / filteredMetrics.length).toFixed(2),
          ram: (filteredMetrics.reduce((sum, m) => sum + m.ramUsage, 0) / filteredMetrics.length).toFixed(2),
          disk: (filteredMetrics.reduce((sum, m) => sum + m.diskUsage, 0) / filteredMetrics.length).toFixed(2),
        },
        peaks: {
          cpu: Math.max(...filteredMetrics.map(m => m.cpuUsage)).toFixed(2),
          ram: Math.max(...filteredMetrics.map(m => m.ramUsage)).toFixed(2),
          disk: Math.max(...filteredMetrics.map(m => m.diskUsage)).toFixed(2),
        },
      } : null,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `complete-analytics-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToCSV = () => {
    const csvRows = [];

    csvRows.push("Complete Services Analytics Report");
    csvRows.push(`Generated;${new Date().toLocaleString()}`);
    csvRows.push(`Date Range;${range ? `${format(range.start, "MMM d, yyyy")} - ${format(range.end, "MMM d, yyyy")}` : "All Time"}`);
    csvRows.push("");

    // Summary Statistics
    csvRows.push("Summary Statistics");
    csvRows.push("Metric;Value");
    csvRows.push(`Total Services;${totalServices}`);
    csvRows.push(`Operational Services;${operationalServices}`);
    csvRows.push(`Degraded Services;${statusCounts.degraded}`);
    csvRows.push(`Down Services;${statusCounts.down}`);
    csvRows.push(`Maintenance Services;${statusCounts.maintenance}`);
    csvRows.push(`Overall Uptime;${uptimePercentage}%`);
    csvRows.push(`Active Incidents;${activeIncidents}`);
    csvRows.push(`Mean Time to Resolve;${mttr}m`);
    csvRows.push("");

    // Services by Category
    csvRows.push("Services Distribution by Category");
    csvRows.push("Category;Count");
    Object.entries(categoryDistribution).forEach(([name, value]) => {
      csvRows.push(`${name};${value}`);
    });
    csvRows.push("");

    // Services by Type
    csvRows.push("Services Distribution by Type");
    csvRows.push("Type;Count");
    Object.entries(typeStats).forEach(([type, count]) => {
      csvRows.push(`${type};${count}`);
    });
    csvRows.push("");

    // Services by Environment
    csvRows.push("Services Distribution by Environment");
    csvRows.push("Environment;Count");
    Object.entries(environmentStats).forEach(([env, count]) => {
      csvRows.push(`${env};${count}`);
    });
    csvRows.push("");

    csvRows.push("Top 10 Most Loaded Servers");
    csvRows.push("Service;Avg CPU;Avg RAM;Avg Disk;Total Load;Incidents;Downtime;Stability;Max CPU;Max RAM");
    topLoadedServers.slice(0, 10).forEach((s) => {
      csvRows.push(`${s.name};${s.avgCpu}%;${s.avgRam}%;${s.avgDisk}%;${s.totalLoad}%;${s.incidents};${s.downtime};${s.stability}%;${s.maxCpu}%;${s.maxRam}%`);
    });
    csvRows.push("");

    csvRows.push("Top 10 Least Loaded Servers");
    csvRows.push("Service;Avg CPU;Avg RAM;Avg Disk;Total Load;Incidents;Downtime;Stability");
    leastLoadedServers.slice(0, 10).forEach((s) => {
      csvRows.push(`${s.name};${s.avgCpu}%;${s.avgRam}%;${s.avgDisk}%;${s.totalLoad}%;${s.incidents};${s.downtime};${s.stability}%`);
    });
    csvRows.push("");

    csvRows.push("Top 10 Most Stable Servers");
    csvRows.push("Service;Stability;Incidents;Downtime");
    mostStableServers.slice(0, 10).forEach((s) => {
      csvRows.push(`${s.name};${s.stability}%;${s.incidents};${s.downtime}`);
    });
    csvRows.push("");

    csvRows.push("Top 10 Least Stable Servers");
    csvRows.push("Service;Stability;Incidents;Downtime");
    leastStableServers.slice(0, 10).forEach((s) => {
      csvRows.push(`${s.name};${s.stability}%;${s.incidents};${s.downtime}`);
    });
    csvRows.push("");

    csvRows.push("Downtime Statistics");
    csvRows.push("Service;Total Incidents;Critical Incidents");
    downtimeStats.forEach((s) => {
      csvRows.push(`${s.name};${s.incidents};${s.critical}`);
    });
    csvRows.push("");

    csvRows.push("Complete Services Analysis");
    csvRows.push("Service;Category;Type;Environment;Avg CPU;Avg RAM;Avg Disk;Total Load;Max CPU;Max RAM;Incidents;Critical Downtime;Stability");
    services.forEach((service) => {
      const analysis = serverLoadAnalysis.find(s => s.name === service.name);
      if (analysis) {
        csvRows.push(`${service.name};${service.category};${service.type || 'N/A'};${service.region};${analysis.avgCpu}%;${analysis.avgRam}%;${analysis.avgDisk}%;${analysis.totalLoad}%;${analysis.maxCpu}%;${analysis.maxRam}%;${analysis.incidents};${analysis.downtime};${analysis.stability}%`);
      }
    });
    csvRows.push("");

    const csvContent = "\uFEFF" + csvRows.join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `complete-analytics-${new Date().toISOString().split("T")[0]}.csv`;
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

  // Подсчет по статусам
  const statusCounts = {
    operational: services.filter((s) => s.status === "operational").length,
    degraded: services.filter((s) => s.status === "degraded").length,
    down: services.filter((s) => s.status === "down").length,
    maintenance: services.filter((s) => s.status === "maintenance").length,
    loading: services.filter((s) => s.status === "loading").length,
  };

  // Подсчет по типам
  const typeStats = services.reduce((acc, service) => {
    const type = service.type || "Unknown";
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Подсчет по окружениям
  const environmentStats = services.reduce((acc, service) => {
    const env = service.region || "Unknown";
    acc[env] = (acc[env] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Список окружений
  const environments = Array.from(new Set(services.map(s => s.region || "Unknown")));

  // Функция получения имени сервиса
  const getServiceName = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    return service ? service.name : "Unknown Service";
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold mb-2">Advanced Analytics & Reports</h1>
          <p className="text-muted-foreground">Comprehensive server load analysis, stability metrics, and downtime statistics</p>
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

      {/* Расширенная статистика */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Server className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Services</p>
              <p className="text-2xl font-semibold">{totalServices}</p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                {operationalServices} operational
              </p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Service Issues</p>
              <p className="text-2xl font-semibold">{statusCounts.degraded + statusCounts.down}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {statusCounts.degraded} degraded, {statusCounts.down} down
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Categories</p>
              <p className="text-2xl font-semibold">{Object.keys(categoryDistribution).length}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {Object.keys(typeStats).length} types
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Activity className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Environments</p>
              <p className="text-2xl font-semibold">{environments.length}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Active regions
              </p>
            </div>
          </div>
        </Card>
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
                  Peak: {Math.max(...filteredMetrics.map(m => m.cpuUsage)).toFixed(1)}%
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
                  Peak: {Math.max(...filteredMetrics.map(m => m.ramUsage)).toFixed(1)}%
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
                  Peak: {Math.max(...filteredMetrics.map(m => m.diskUsage)).toFixed(1)}%
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Анализ нагрузки серверов */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-red-500" />
            <h3 className="text-lg font-medium">Топ 5 самых нагруженных серверов</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topLoadedServers} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
              <YAxis dataKey="shortName" type="category" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} width={100} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px"
                }}
              />
              <Legend />
              <Bar dataKey="avgCpu" fill="hsl(220 70% 50%)" name="CPU %" />
              <Bar dataKey="avgRam" fill="hsl(280 70% 50%)" name="RAM %" />
              <Bar dataKey="avgDisk" fill="hsl(40 70% 50%)" name="Disk %" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <TrendingDown className="w-5 h-5 text-green-500" />
            <h3 className="text-lg font-medium">Топ 5 наименее нагруженных серверов</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={leastLoadedServers} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
              <YAxis dataKey="shortName" type="category" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} width={100} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px"
                }}
              />
              <Legend />
              <Bar dataKey="avgCpu" fill="hsl(142 76% 45%)" name="CPU %" />
              <Bar dataKey="avgRam" fill="hsl(162 76% 45%)" name="RAM %" />
              <Bar dataKey="avgDisk" fill="hsl(182 76% 45%)" name="Disk %" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Комплексный анализ - Radar Chart */}
      <Card className="p-6">
        <h3 className="text-lg font-medium mb-6">Комплексный анализ нагрузки топ серверов</h3>
        <ResponsiveContainer width="100%" height={400}>
          <RadarChart data={radarData}>
            <PolarGrid stroke="hsl(var(--border))" />
            <PolarAngleAxis dataKey="server" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
            <PolarRadiusAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
            <Radar name="CPU" dataKey="CPU" stroke="hsl(220 70% 50%)" fill="hsl(220 70% 50%)" fillOpacity={0.3} />
            <Radar name="RAM" dataKey="RAM" stroke="hsl(280 70% 50%)" fill="hsl(280 70% 50%)" fillOpacity={0.3} />
            <Radar name="Disk" dataKey="Disk" stroke="hsl(40 70% 50%)" fill="hsl(40 70% 50%)" fillOpacity={0.3} />
            <Legend />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "6px"
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </Card>

      {/* Статистика падений и стабильности */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h3 className="text-lg font-medium">Статистика падений по серверам</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={downtimeStats.slice(0, 8)}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
              <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px"
                }}
              />
              <Legend />
              <Bar dataKey="incidents" fill="hsl(38 92% 50%)" name="Всего инцидентов" />
              <Bar dataKey="critical" fill="hsl(0 84% 60%)" name="Критические" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <Activity className="w-5 h-5 text-green-500" />
            <h3 className="text-lg font-medium">Самые стабильные серверы</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={mostStableServers}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="shortName" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
              <YAxis domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px"
                }}
              />
              <Bar dataKey="stability" fill="hsl(142 76% 45%)" name="Стабильность %" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Остальные графики */}
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

      {/* Детальная таблица анализа */}
      <Card className="p-6">
        <h3 className="text-lg font-medium mb-6">Детальный анализ всех серверов</h3>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Сервер</TableHead>
                <TableHead>CPU (avg)</TableHead>
                <TableHead>RAM (avg)</TableHead>
                <TableHead>Disk (avg)</TableHead>
                <TableHead>Общая нагрузка</TableHead>
                <TableHead>Инциденты</TableHead>
                <TableHead>Падения</TableHead>
                <TableHead>Стабильность</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {serverLoadAnalysis.map((server) => (
                <TableRow key={server.name}>
                  <TableCell className="font-medium">{server.name}</TableCell>
                  <TableCell>
                    <span className={server.avgCpu > 80 ? "text-red-600 dark:text-red-400 font-medium" : ""}>
                      {server.avgCpu}%
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={server.avgRam > 85 ? "text-amber-600 dark:text-amber-400 font-medium" : ""}>
                      {server.avgRam}%
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={server.avgDisk > 90 ? "text-red-600 dark:text-red-400 font-medium" : ""}>
                      {server.avgDisk}%
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={server.totalLoad > 70 ? "text-red-600 dark:text-red-400 font-semibold" : server.totalLoad > 50 ? "text-amber-600 dark:text-amber-400 font-medium" : "text-green-600 dark:text-green-400"}>
                      {server.totalLoad}%
                    </span>
                  </TableCell>
                  <TableCell>{server.incidents}</TableCell>
                  <TableCell>
                    <span className={server.downtime > 0 ? "text-red-600 dark:text-red-400 font-medium" : "text-green-600 dark:text-green-400"}>
                      {server.downtime}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={server.stability < 95 ? "text-amber-600 dark:text-amber-400" : "text-green-600 dark:text-green-400 font-medium"}>
                      {server.stability}%
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

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
    </div>
  );
}