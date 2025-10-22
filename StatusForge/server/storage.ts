import { 
  type Service, 
  type InsertService, 
  type Incident, 
  type InsertIncident,
  type StatusHistory,
  type InsertStatusHistory,
  type ServiceStatus
} from "@shared/schema";
import { randomUUID } from "crypto";

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
}

export class MemStorage implements IStorage {
  private services: Map<string, Service>;
  private incidents: Map<string, Incident>;
  private statusHistory: Map<string, StatusHistory>;

  constructor() {
    this.services = new Map();
    this.incidents = new Map();
    this.statusHistory = new Map();
    
    // Seed with example data
    this.seedData();
  }

  private async seedData() {
    // Create example services
    const exampleServices: InsertService[] = [
      {
        name: "API Gateway",
        description: "Central API routing and management service",
        category: "Compute",
        region: "ru-central1-a",
        status: "operational",
        icon: "server",
      },
      {
        name: "Object Storage",
        description: "Scalable object storage for static assets and backups",
        category: "Storage",
        region: "ru-central1-b",
        status: "operational",
        icon: "database",
      },
      {
        name: "Load Balancer",
        description: "Application load balancing across multiple instances",
        category: "Network",
        region: "ru-central1-a",
        status: "operational",
        icon: "globe",
      },
      {
        name: "Database Cluster",
        description: "Managed PostgreSQL database cluster",
        category: "Database",
        region: "ru-central1-c",
        status: "operational",
        icon: "database",
      },
      {
        name: "CDN",
        description: "Content delivery network for global asset distribution",
        category: "Network",
        region: "global",
        status: "operational",
        icon: "globe",
      },
      {
        name: "Certificate Manager",
        description: "SSL/TLS certificate management and automation",
        category: "Security",
        region: "ru-central1-a",
        status: "operational",
        icon: "shield",
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
    const id = randomUUID();
    const service: Service = {
      ...insertService,
      id,
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
}

export const storage = new MemStorage();
