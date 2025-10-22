import { Card } from "@/components/ui/card";
import { StatusBadge } from "./StatusBadge";
import { Service } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { Server, Database, Globe, Shield } from "lucide-react";

interface ServiceCardProps {
  service: Service;
  onClick?: () => void;
}

const iconMap: Record<string, any> = {
  server: Server,
  database: Database,
  globe: Globe,
  shield: Shield,
};

export function ServiceCard({ service, onClick }: ServiceCardProps) {
  const Icon = service.icon ? iconMap[service.icon] || Server : Server;
  
  return (
    <Card 
      className="p-6 hover-elevate cursor-pointer transition-all"
      onClick={onClick}
      data-testid={`card-service-${service.id}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="p-2 rounded-md bg-primary/10 shrink-0">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-base mb-1 truncate" data-testid={`text-service-name-${service.id}`}>
              {service.name}
            </h3>
            {service.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {service.description}
              </p>
            )}
            <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
              <span className="font-mono">{service.region}</span>
              <span>•</span>
              <span>{service.category}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <StatusBadge status={service.status as any} />
          <span className="text-xs text-muted-foreground font-mono">
            {formatDistanceToNow(new Date(service.updatedAt), { addSuffix: true })}
          </span>
        </div>
      </div>
    </Card>
  );
}
