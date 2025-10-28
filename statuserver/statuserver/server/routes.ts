import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertServiceSchema, insertIncidentSchema, insertServerMetricsSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Services endpoints
  app.get("/api/services", async (req, res) => {
    try {
      const services = await storage.getServices();
      res.json(services);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch services" });
    }
  });

  app.get("/api/services/:id", async (req, res) => {
    try {
      const service = await storage.getService(req.params.id);
      if (!service) {
        return res.status(404).json({ error: "Service not found" });
      }
      res.json(service);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch service" });
    }
  });

  app.post("/api/services", async (req, res) => {
    try {
      const validatedData = insertServiceSchema.parse(req.body);
      const service = await storage.createService(validatedData);
      res.status(201).json(service);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid service data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create service" });
    }
  });

  app.patch("/api/services/:id/status", async (req, res) => {
    try {
      const { status } = req.body;
      
      if (!status || !["operational", "degraded", "down", "maintenance"].includes(status)) {
        return res.status(400).json({ error: "Invalid status value" });
      }

      const service = await storage.updateServiceStatus(req.params.id, status);
      if (!service) {
        return res.status(404).json({ error: "Service not found" });
      }
      
      res.json(service);
    } catch (error) {
      res.status(500).json({ error: "Failed to update service status" });
    }
  });

  // Incidents endpoints
  app.get("/api/incidents", async (req, res) => {
    try {
      const incidents = await storage.getIncidents();
      res.json(incidents);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch incidents" });
    }
  });

  app.get("/api/incidents/:id", async (req, res) => {
    try {
      const incident = await storage.getIncident(req.params.id);
      if (!incident) {
        return res.status(404).json({ error: "Incident not found" });
      }
      res.json(incident);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch incident" });
    }
  });

  app.post("/api/incidents", async (req, res) => {
    try {
      const validatedData = insertIncidentSchema.parse(req.body);
      const incident = await storage.createIncident(validatedData);
      res.status(201).json(incident);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid incident data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create incident" });
    }
  });

  // Status history endpoints
  app.get("/api/status-history/:serviceId", async (req, res) => {
    try {
      const history = await storage.getStatusHistory(req.params.serviceId);
      res.json(history);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch status history" });
    }
  });

  // Server metrics endpoints
  app.get("/api/server-metrics", async (req, res) => {
    try {
      const serviceId = req.query.serviceId as string | undefined;
      const metrics = await storage.getServerMetrics(serviceId);
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch server metrics" });
    }
  });

  app.post("/api/server-metrics", async (req, res) => {
    try {
      const validatedData = insertServerMetricsSchema.parse(req.body);
      const metrics = await storage.createServerMetrics(validatedData);
      res.status(201).json(metrics);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid metrics data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create server metrics" });
    }
  });

  // Import services from HTML or JSON
  app.post("/api/import-services", async (req, res) => {
    try {
      const { data } = req.body;
      if (!data) {
        return res.status(400).json({ error: "No data provided" });
      }
      
      const { importServicesFromData } = await import("./importData");
      const count = await importServicesFromData(storage, data);
      res.json({ success: true, imported: count });
    } catch (error) {
      console.error("Import error:", error);
      res.status(500).json({ error: "Failed to import services" });
    }
  });

  // Export services to JSON
  app.get("/api/export-services", async (req, res) => {
    try {
      const format = req.query.format || "json";
      const services = await storage.getServices();
      
      if (format === "json") {
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Content-Disposition", "attachment; filename=services.json");
        res.json(services);
      } else if (format === "csv") {
        const csv = convertToCSV(services);
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", "attachment; filename=services.csv");
        res.send(csv);
      } else {
        res.status(400).json({ error: "Unsupported format" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to export services" });
    }
  });

  // Check service availability
  app.post("/api/check-availability/:id", async (req, res) => {
    try {
      const service = await storage.getService(req.params.id);
      if (!service || !service.address) {
        return res.status(404).json({ error: "Service not found or no address" });
      }

      const available = await checkServiceAvailability(service.address, service.port);
      res.json({ available, serviceId: service.id });
    } catch (error) {
      res.status(500).json({ error: "Failed to check availability" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

function convertToCSV(services: any[]): string {
  if (services.length === 0) return "";
  
  const headers = Object.keys(services[0]).join(",");
  const rows = services.map(service => 
    Object.values(service).map(v => 
      typeof v === 'string' && v.includes(',') ? `"${v}"` : v
    ).join(",")
  );
  
  return [headers, ...rows].join("\n");
}

async function checkServiceAvailability(address: string, port?: number | null): Promise<boolean> {
  try {
    const url = port ? `http://${address}:${port}` : address;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(url, { 
      signal: controller.signal,
      method: 'HEAD'
    });
    clearTimeout(timeoutId);
    
    return response.ok;
  } catch {
    return false;
  }
}
