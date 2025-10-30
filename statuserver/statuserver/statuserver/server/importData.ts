import type { IStorage } from "./storage";
import type { InsertService } from "@shared/schema";

interface ImportedService {
  Name: string;
  Type: string;
  Environment: string;
  Address: string;
  Port: number;
}

interface ImportData {
  [environment: string]: {
    [category: string]: ImportedService[];
  };
}

export async function importServicesFromData(storage: IStorage, data: ImportData) {
  const services: InsertService[] = [];
  
  for (const environment of Object.keys(data)) {
    for (const category of Object.keys(data[environment])) {
      const items = data[environment][category];
      
      for (const item of items) {
        const service: InsertService = {
          name: item.Name,
          description: `${item.Type} service`,
          category: category,
          region: environment,
          status: "operational",
          type: item.Type,
          icon: getIconForType(item.Type),
          address: item.Address,
          port: item.Port,
        };
        
        services.push(service);
      }
    }
  }
  
  for (const service of services) {
    await storage.createService(service);
  }
  
  return services.length;
}

function getIconForType(type: string): string {
  const typeMap: Record<string, string> = {
    'DevTools': 'wrench',
    'Backend': 'server',
    'Frontend': 'globe',
    'BPMN': 'workflow',
    'PSQL': 'database',
    'Database': 'database',
    'Keycloak': 'shield',
    'Grafana': 'chart',
    'Kafka': 'message-square',
    'Minio': 'database',
    'Redis': 'database',
    'RabbitMQ': 'message-square',
  };
  
  return typeMap[type] || 'server';
}
