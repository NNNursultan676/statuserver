import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./StatusBadge";
import { Service } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { Server, Database, Globe, Shield, ExternalLink, Star, Circle } from "lucide-react";
import { getServiceUrl, openServiceUrl } from "@/lib/serviceUtils";

interface ServiceCardProps {
  service: Service;
  onClick?: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
  availabilityStatus?: boolean | null;
}

const iconMap: Record<string, any> = {
  server: Server,
  database: Database,
  globe: Globe,
  shield: Shield,
};

export function ServiceCard({ service, onClick, isFavorite, onToggleFavorite, availabilityStatus }: ServiceCardProps) {
  const Icon = service.icon ? iconMap[service.icon] || Server : Server;
  const serviceUrl = getServiceUrl(service);
  
  const handleOpenService = (e: React.MouseEvent) => {
    e.stopPropagation();
    openServiceUrl(service);
  };
  
  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite?.(service.id);
  };
  
  return (
    <Card 
      className="p-6 hover-elevate cursor-pointer transition-all"
      onClick={onClick}
      data-testid={`card-service-${service.id}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="relative p-2 rounded-md bg-primary/10 shrink-0">
            <Icon className="w-5 h-5 text-primary" />
            {availabilityStatus !== null && (
              <Circle 
                className={`absolute -top-1 -right-1 w-3 h-3 ${
                  availabilityStatus ? 'fill-green-500 text-green-500' : 'fill-red-500 text-red-500'
                }`} 
              />
            )}
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
            {service.address && (
              <div className="flex items-center gap-2 mt-2">
                <a 
                  href={serviceUrl || '#'} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline font-mono truncate max-w-xs"
                  onClick={(e) => e.stopPropagation()}
                >
                  {service.address}
                </a>
                {service.port && (
                  <span className="text-xs text-muted-foreground font-mono">
                    :{service.port}
                  </span>
                )}
              </div>
            )}
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span className="font-mono">{service.region}</span>
              <span>•</span>
              <span>{service.category}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="flex items-center gap-2">
            {onToggleFavorite && (
              <Button 
                size="icon" 
                variant="ghost"
                onClick={handleFavoriteClick}
                className="h-8 w-8"
              >
                <Star className={`w-4 h-4 ${isFavorite ? 'fill-yellow-500 text-yellow-500' : ''}`} />
              </Button>
            )}
            <StatusBadge status={service.status as any} />
          </div>
          {serviceUrl && (
            <Button 
              size="sm" 
              variant="default"
              onClick={handleOpenService}
              className="mt-2"
            >
              <ExternalLink className="w-3 h-3 mr-1" />
              Открыть
            </Button>
          )}
          <span className="text-xs text-muted-foreground font-mono">
            {formatDistanceToNow(new Date(service.updatedAt), { addSuffix: true })}
          </span>
        </div>
      </div>
    </Card>
  );
}
