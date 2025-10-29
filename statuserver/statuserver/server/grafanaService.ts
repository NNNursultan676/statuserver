import type { IStorage } from "./storage";
import type { ServiceStatus } from "@shared/schema";

interface GrafanaMetric {
  metric: {
    instance?: string;
    job?: string;
    [key: string]: any;
  };
  value: [number, string];
}

interface GrafanaResponse {
  status: string;
  data: {
    resultType: string;
    result: GrafanaMetric[];
  };
}

export class GrafanaService {
  private grafanaUrl: string;
  private apiToken: string;
  private dashboardId: string;
  private storage: IStorage;

  constructor(storage: IStorage) {
    this.grafanaUrl = process.env.GRAFANA_URL || "";
    this.apiToken = process.env.GRAFANA_API_TOKEN || "";
    this.dashboardId = process.env.GRAFANA_DASHBOARD_ID || "";
    this.storage = storage;

    if (!this.grafanaUrl || !this.apiToken) {
      console.warn("Grafana configuration is incomplete. Syncing will be disabled.");
    }
  }

  async fetchMetrics(query: string = 'up{job="node_exporter"}'): Promise<GrafanaMetric[]> {
    if (!this.grafanaUrl || !this.apiToken) {
      throw new Error("Grafana is not configured");
    }

    const baseUrl = `${this.grafanaUrl}/api/datasources/proxy/1/api/v1/query`;
    const url = `${baseUrl}?query=${encodeURIComponent(query)}`;
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new Error(`Grafana API error: ${response.status} ${response.statusText}`);
      }

      const data: GrafanaResponse = await response.json();
      
      if (data.status !== 'success') {
        throw new Error(`Grafana query failed: ${data.status}`);
      }

      return data.data.result || [];
    } catch (error) {
      console.error("Failed to fetch Grafana metrics:", error);
      throw error;
    }
  }

  async syncServiceStatuses(): Promise<{ updated: number; errors: number; skipped?: boolean }> {
    let updated = 0;
    let errors = 0;

    try {
      const metrics = await this.fetchMetrics();
      const services = await this.storage.getServices();

      for (const metric of metrics) {
        const instance = metric.metric.instance || '';
        const isUp = metric.value[1] === '1';
        const newStatus: ServiceStatus = isUp ? 'operational' : 'down';

        const matchingServices = services.filter(service => {
          if (!service.address) return false;
          
          const serviceAddress = service.port 
            ? `${service.address}:${service.port}` 
            : service.address;
          
          return instance.includes(service.address) || 
                 instance === serviceAddress ||
                 service.name.toLowerCase().includes(instance.toLowerCase()) ||
                 instance.toLowerCase().includes(service.name.toLowerCase());
        });

        for (const service of matchingServices) {
          if (service.status !== newStatus) {
            try {
              await this.storage.updateServiceStatus(service.id, newStatus);
              updated++;
              console.log(`Updated ${service.name}: ${service.status} -> ${newStatus}`);
            } catch (err) {
              console.error(`Failed to update service ${service.id}:`, err);
              errors++;
            }
          }
        }
      }

      console.log(`Grafana sync completed: ${updated} updated, ${errors} errors`);
      return { updated, errors };
    } catch (error) {
      console.error("Grafana sync failed - setting all services to loading state:", error instanceof Error ? error.message : String(error));
      
      const services = await this.storage.getServices();
      let loadingCount = 0;
      
      for (const service of services) {
        if (service.status !== 'loading') {
          try {
            await this.storage.updateServiceStatus(service.id, 'loading');
            loadingCount++;
          } catch (err) {
            console.error(`Failed to set loading status for ${service.id}:`, err);
          }
        }
      }
      
      console.log(`Set ${loadingCount} services to loading state due to Grafana unavailability`);
      return { updated: loadingCount, errors: 0, skipped: true };
    }
  }

  isConfigured(): boolean {
    return !!(this.grafanaUrl && this.apiToken);
  }
}

export function createGrafanaService(storage: IStorage): GrafanaService {
  return new GrafanaService(storage);
}
