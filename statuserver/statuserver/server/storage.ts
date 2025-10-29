import { 
  type Service, 
  type InsertService, 
  type Incident, 
  type InsertIncident,
  type StatusHistory,
  type InsertStatusHistory,
  type ServerMetrics,
  type InsertServerMetrics,
  type ServiceStatus
} from "@shared/schema";
import { randomUUID } from "crypto";
import { importServicesFromData } from "./importData";
import importedData from "./imported_services.json";

export interface IStorage {
  // Services
  getServices(): Promise<Service[]>;
  getService(id: string): Promise<Service | undefined>;
  createService(service: InsertService): Promise<Service>;
  updateServiceStatus(id: string, status: ServiceStatus): Promise<Service | undefined>;
  
  // Incidents
  getIncidents(): Promise<Incident[]>;
  getIncident(id: string): Promise<Incident | undefined>;
  createIncident(incident: InsertIncident): Promise<Incident>;
  
  // Status History
  getStatusHistory(serviceId: string): Promise<StatusHistory[]>;
  createStatusHistory(history: InsertStatusHistory): Promise<StatusHistory>;
  
  // Server Metrics
  getServerMetrics(serviceId?: string): Promise<ServerMetrics[]>;
  createServerMetrics(metrics: InsertServerMetrics): Promise<ServerMetrics>;
}

export class MemStorage implements IStorage {
  private services: Map<string, Service>;
  private incidents: Map<string, Incident>;
  private statusHistory: Map<string, StatusHistory>;
  private serverMetrics: Map<string, ServerMetrics>;

  constructor() {
    this.services = new Map();
    this.incidents = new Map();
    this.statusHistory = new Map();
    this.serverMetrics = new Map();
    
    // Seed with example data
    this.seedData();
  }

  private async seedData() {
    await importServicesFromData(this, importedData as any);
    
    return;
    
    const exampleServices: InsertService[] = [
      {
        name: "API Gateway",
        description: "Central API routing and management service",
        category: "App",
        region: "ru-central1-a",
        status: "operational",
        icon: "server",
      },
      {
        name: "Web Application",
        description: "Main web application frontend",
        category: "App",
        region: "ru-central1-a",
        status: "operational",
        icon: "globe",
      },
      {
        name: "Mobile API",
        description: "REST API for mobile applications",
        category: "App",
        region: "ru-central1-b",
        status: "degraded",
        icon: "server",
      },
      {
        name: "S3 Storage Bucket",
        description: "Object storage for static assets and user uploads",
        category: "services",
        region: "ru-central1-a",
        status: "operational",
        icon: "database",
      },
      {
        name: "GitLab Repository",
        description: "Source code management and CI/CD pipeline",
        category: "services",
        region: "ru-central1-c",
        status: "operational",
        icon: "server",
      },
      {
        name: "Redis Cache",
        description: "In-memory data structure store for caching",
        category: "services",
        region: "ru-central1-a",
        status: "operational",
        icon: "database",
      },
      {
        name: "Message Queue",
        description: "RabbitMQ message broker for async processing",
        category: "services",
        region: "ru-central1-b",
        status: "operational",
        icon: "server",
      },
      {
        name: "Elasticsearch",
        description: "Search and analytics engine",
        category: "services",
        region: "ru-central1-c",
        status: "maintenance",
        icon: "database",
      },
      {
        name: "Application Server 1",
        description: "Primary application server instance",
        category: "server",
        region: "ru-central1-a",
        status: "operational",
        icon: "server",
      },
      {
        name: "Application Server 2",
        description: "Secondary application server instance",
        category: "server",
        region: "ru-central1-a",
        status: "operational",
        icon: "server",
      },
      {
        name: "Database Server",
        description: "PostgreSQL database server",
        category: "server",
        region: "ru-central1-b",
        status: "operational",
        icon: "database",
      },
      {
        name: "Backup Server",
        description: "Automated backup and disaster recovery",
        category: "server",
        region: "ru-central1-c",
        status: "operational",
        icon: "shield",
      },
      {
        name: "Load Balancer",
        description: "Application load balancing across multiple instances",
        category: "server",
        region: "ru-central1-a",
        status: "operational",
        icon: "globe",
      },
      {
        name: "Monitoring Server",
        description: "System monitoring and alerting service",
        category: "server",
        region: "ru-central1-b",
        status: "down",
        icon: "server",
      },
    ];

    for (const service of exampleServices) {
      await this.createService(service);
    }

    // Create some example incidents
    const services = Array.from(this.services.values());
    if (services.length > 0) {
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const resolvedDate = new Date(oneWeekAgo);
      resolvedDate.setHours(resolvedDate.getHours() + 2);

      await this.createIncident({
        serviceId: services[0].id,
        title: "Increased API Response Times",
        description: "Some users experienced slower than normal API response times due to database query optimization issues.",
        status: "resolved",
        severity: "minor",
        startedAt: twoWeeksAgo,
        resolvedAt: resolvedDate,
      });

      await this.createIncident({
        serviceId: services[1].id,
        title: "Storage Upload Failures",
        description: "A subset of object storage uploads failed due to temporary network issues in ru-central1-b region.",
        status: "resolved",
        severity: "major",
        startedAt: oneWeekAgo,
        resolvedAt: new Date(oneWeekAgo.getTime() + 3600000),
      });

      // GitLab incidents
      const gitlabService = services.find(s => s.name.includes("GitLab"));
      if (gitlabService) {
        const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
        const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
        const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
        
        await this.createIncident({
          serviceId: gitlabService.id,
          title: "CI/CD Pipeline Timeout",
          description: "Build pipeline exceeded timeout limit",
          status: "resolved",
          severity: "minor",
          startedAt: twoDaysAgo,
          resolvedAt: new Date(twoDaysAgo.getTime() + 1800000),
        });

        await this.createIncident({
          serviceId: gitlabService.id,
          title: "Repository Sync Delay",
          description: "Git push operations experiencing delays",
          status: "resolved",
          severity: "major",
          startedAt: threeDaysAgo,
          resolvedAt: new Date(threeDaysAgo.getTime() + 2700000),
        });

        await this.createIncident({
          serviceId: gitlabService.id,
          title: "Merge Request Processing",
          description: "Automated merge checks running slower than expected",
          status: "resolved",
          severity: "minor",
          startedAt: fiveDaysAgo,
          resolvedAt: new Date(fiveDaysAgo.getTime() + 3600000),
        });

        await this.createIncident({
          serviceId: gitlabService.id,
          title: "Runner Connectivity",
          description: "GitLab runners intermittently disconnecting",
          status: "investigating",
          severity: "major",
          startedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
        });
      }

      // S3 Storage incidents
      const s3Service = services.find(s => s.name.includes("S3"));
      if (s3Service) {
        const oneDayAgo = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
        const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
        const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
        const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
        const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
        const sixDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        await this.createIncident({
          serviceId: s3Service.id,
          title: "High Latency on S3 Reads",
          description: "Object retrieval experiencing increased latency. Bucket size: 450GB",
          status: "resolved",
          severity: "major",
          startedAt: oneDayAgo,
          resolvedAt: new Date(oneDayAgo.getTime() + 4500000),
        });

        await this.createIncident({
          serviceId: s3Service.id,
          title: "Bucket Quota Warning",
          description: "Storage bucket approaching capacity limit. Size: 780GB/1TB",
          status: "monitoring",
          severity: "minor",
          startedAt: fourDaysAgo,
        });

        await this.createIncident({
          serviceId: s3Service.id,
          title: "Failed Upload Operations",
          description: "Multiple upload failures due to network congestion. Bucket: 320GB",
          status: "resolved",
          severity: "critical",
          startedAt: sixDaysAgo,
          resolvedAt: new Date(sixDaysAgo.getTime() + 5400000),
        });

        await this.createIncident({
          serviceId: s3Service.id,
          title: "S3 Replication Delay",
          description: "Cross-region replication experiencing delays. Bucket size: 125GB",
          status: "resolved",
          severity: "minor",
          startedAt: twoDaysAgo,
          resolvedAt: new Date(twoDaysAgo.getTime() + 2100000),
        });

        await this.createIncident({
          serviceId: s3Service.id,
          title: "Bucket Access Permissions Issue",
          description: "IAM policy conflicts blocking access. Affected bucket: 92GB",
          status: "resolved",
          severity: "major",
          startedAt: threeDaysAgo,
          resolvedAt: new Date(threeDaysAgo.getTime() + 3300000),
        });

        await this.createIncident({
          serviceId: s3Service.id,
          title: "Storage Class Migration",
          description: "Automated archival to Glacier delayed. Data volume: 1.2TB",
          status: "resolved",
          severity: "minor",
          startedAt: fiveDaysAgo,
          resolvedAt: new Date(fiveDaysAgo.getTime() + 7200000),
        });

        await this.createIncident({
          serviceId: s3Service.id,
          title: "Object Versioning Overflow",
          description: "Excessive versions consuming storage. Bucket size: 560GB",
          status: "resolved",
          severity: "major",
          startedAt: sevenDaysAgo,
          resolvedAt: new Date(sevenDaysAgo.getTime() + 4800000),
        });
      }
      
      // Create server metrics for the last 24 hours
      for (let i = 24; i >= 0; i--) {
        const timestamp = new Date();
        timestamp.setHours(timestamp.getHours() - i);
        
        for (const service of services) {
          const baseLoad = Math.random() * 40 + 30;
          
          // S3 services have higher disk usage
          const isS3 = service.name.toLowerCase().includes('s3') || service.name.toLowerCase().includes('storage');
          const diskUsage = isS3 ? 60 + Math.random() * 25 : 45 + Math.random() * 15;
          
          await this.createServerMetrics({
            serviceId: service.id,
            cpuUsage: baseLoad + Math.random() * 20,
            ramUsage: baseLoad + Math.random() * 25,
            diskUsage: diskUsage,
          });
        }
      }
    }
  }

  // Services
  async getServices(): Promise<Service[]> {
    return Array.from(this.services.values());
  }

  async getService(id: string): Promise<Service | undefined> {
    return this.services.get(id);
  }

  async createService(insertService: InsertService): Promise<Service> {
    const id = this.generateDeterministicId(insertService);
    const service: Service = {
      id,
      name: insertService.name,
      description: insertService.description ?? null,
      category: insertService.category,
      region: insertService.region,
      status: insertService.status || "operational",
      type: insertService.type ?? null,
      icon: insertService.icon ?? null,
      address: insertService.address ?? null,
      port: insertService.port ?? null,
      updatedAt: new Date(),
    };
    this.services.set(id, service);
    
    // Create initial status history entry
    await this.createStatusHistory({
      serviceId: id,
      status: insertService.status || "operational",
      timestamp: new Date(),
    });
    
    return service;
  }

  private generateDeterministicId(service: InsertService): string {
    const key = `${service.name}-${service.region}-${service.category}-${service.address || ''}-${service.port || ''}`;
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    const hashStr = Math.abs(hash).toString(16).padStart(30, '0');
    return `${hashStr.slice(0,8)}-${hashStr.slice(8,12)}-4${hashStr.slice(12,15)}-a${hashStr.slice(15,18)}-${hashStr.slice(18,30)}`;
  }

  async updateServiceStatus(id: string, status: ServiceStatus): Promise<Service | undefined> {
    const service = this.services.get(id);
    if (!service) return undefined;

    const updatedService: Service = {
      ...service,
      status,
      updatedAt: new Date(),
    };
    this.services.set(id, updatedService);
    
    // Record status change in history
    await this.createStatusHistory({
      serviceId: id,
      status,
      timestamp: new Date(),
    });
    
    return updatedService;
  }

  // Incidents
  async getIncidents(): Promise<Incident[]> {
    return Array.from(this.incidents.values());
  }

  async getIncident(id: string): Promise<Incident | undefined> {
    return this.incidents.get(id);
  }

  async createIncident(insertIncident: InsertIncident): Promise<Incident> {
    const id = randomUUID();
    const incident: Incident = {
      ...insertIncident,
      id,
      startedAt: insertIncident.startedAt || new Date(),
      createdAt: new Date(),
    };
    this.incidents.set(id, incident);
    return incident;
  }

  // Status History
  async getStatusHistory(serviceId: string): Promise<StatusHistory[]> {
    return Array.from(this.statusHistory.values())
      .filter((history) => history.serviceId === serviceId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  async createStatusHistory(insertHistory: InsertStatusHistory): Promise<StatusHistory> {
    const id = randomUUID();
    const history: StatusHistory = {
      ...insertHistory,
      id,
      timestamp: insertHistory.timestamp || new Date(),
    };
    this.statusHistory.set(id, history);
    return history;
  }

  // Server Metrics
  async getServerMetrics(serviceId?: string): Promise<ServerMetrics[]> {
    let metrics = Array.from(this.serverMetrics.values());
    if (serviceId) {
      metrics = metrics.filter((m) => m.serviceId === serviceId);
    }
    return metrics.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  async createServerMetrics(insertMetrics: InsertServerMetrics): Promise<ServerMetrics> {
    const id = randomUUID();
    const metrics: ServerMetrics = {
      ...insertMetrics,
      id,
      timestamp: new Date(),
    };
    this.serverMetrics.set(id, metrics);
    return metrics;
  }
}

export const storage = new MemStorage();
