import { useQuery } from "@tanstack/react-query";
import { Service } from "@shared/schema";
import { ExportMenu } from "@/components/ExportMenu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Star, RefreshCw, BarChart3 } from "lucide-react";
import { useState, useEffect } from "react";
import { useFavorites } from "@/hooks/use-favorites";
import { useHistory } from "@/hooks/use-history";
import { useAvailability } from "@/hooks/use-availability";

export default function Dashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeEnvironment, setActiveEnvironment] = useState<string | null>(null);
  const [showFavorites, setShowFavorites] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  const { data: services = [], isLoading } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const { favorites, toggleFavorite, isFavorite } = useFavorites();
  const { history } = useHistory();
  const { checkAvailability } = useAvailability();

  const environments = Array.from(new Set(services.map(s => s.region))).sort();
  
  useEffect(() => {
    if (environments.length > 0 && !activeEnvironment) {
      setActiveEnvironment(environments[0]);
    }
  }, [environments, activeEnvironment]);

  const handleCheckAll = async () => {
    setCheckingAvailability(true);
    for (const service of services) {
      if (service.address) {
        await checkAvailability(service.id);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    setCheckingAvailability(false);
  };

  const filteredServices = services.filter((service) => {
    const matchesSearch = service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.address?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (showFavorites) {
      return matchesSearch && isFavorite(service.id);
    }
    
    const matchesEnvironment = !activeEnvironment || service.region === activeEnvironment;
    return matchesSearch && matchesEnvironment;
  });

  const favoriteServices = services.filter(s => isFavorite(s.id));

  const statusCounts = {
    operational: services.filter((s) => s.status === "operational").length,
    degraded: services.filter((s) => s.status === "degraded").length,
    down: services.filter((s) => s.status === "down").length,
    maintenance: services.filter((s) => s.status === "maintenance").length,
  };

  const environmentStats = environments.reduce((acc, env) => {
    acc[env] = services.filter(s => s.region === env).length;
    return acc;
  }, {} as Record<string, number>);

  const types = Array.from(new Set(services.map(s => s.type).filter(Boolean))).sort();
  const typeStats = types.reduce((acc, type) => {
    if (type) {
      acc[type] = services.filter(s => s.type === type).length;
    }
    return acc;
  }, {} as Record<string, number>);

  const allOperational = statusCounts.degraded === 0 && statusCounts.down === 0;

  const openService = (address?: string | null, port?: number | null) => {
    if (!address) return;
    
    let url = address;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `http://${url}`;
    }
    
    if (port && !address.includes(':')) {
      url = `${url}:${port}`;
    }
    
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold">Панель мониторинга сервисов</h1>
          <ExportMenu services={filteredServices} />
        </div>
        
        {allOperational ? (
          <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <p className="font-medium">Все системы работают</p>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <p className="font-medium">
                {statusCounts.down > 0 
                  ? `${statusCounts.down} сервис(ов) недоступно` 
                  : `${statusCounts.degraded} сервис(ов) работают с проблемами`}
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              <h3 className="font-medium">Статистика по средам</h3>
            </div>
            <div className="space-y-2">
              {Object.entries(environmentStats).slice(0, 5).map(([env, count]) => (
                <div key={env} className="flex justify-between text-sm">
                  <span className="text-muted-foreground truncate">{env}</span>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              <h3 className="font-medium">Статистика по типам</h3>
            </div>
            <div className="space-y-2">
              {Object.entries(typeStats).slice(0, 5).map(([type, count]) => (
                <div key={type} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{type}</span>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              <h3 className="font-medium">Избранное и История</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Избранных</span>
                <Badge variant="secondary">{favorites.length}</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">В истории</span>
                <Badge variant="secondary">{history.length}</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Всего сервисов</span>
                <Badge>{services.length}</Badge>
              </div>
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по имени, описанию или адресу..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button 
              variant="outline" 
              onClick={handleCheckAll}
              disabled={checkingAvailability}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${checkingAvailability ? 'animate-spin' : ''}`} />
              Проверить доступность
            </Button>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <Button
              variant={showFavorites ? "default" : "outline"}
              size="sm"
              onClick={() => setShowFavorites(!showFavorites)}
            >
              <Star className="w-4 h-4 mr-1" />
              Избранное ({favoriteServices.length})
            </Button>
            {!showFavorites && (
              <>
                <div className="h-6 w-px bg-border mx-2" />
                {environments.map(env => (
                  <Button
                    key={env}
                    variant={activeEnvironment === env ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveEnvironment(env)}
                  >
                    {env}
                  </Button>
                ))}
              </>
            )}
          </div>
        </div>

        <div className="mt-6 space-y-6">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-40 rounded-lg bg-card animate-pulse" />
              ))}
            </div>
          ) : filteredServices.length === 0 ? (
            <div className="text-center py-12">
              {showFavorites ? (
                <>
                  <Star className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Нет избранных сервисов</p>
                </>
              ) : (
                <p className="text-muted-foreground">Сервисы не найдены</p>
              )}
            </div>
          ) : (
            (() => {
              const groupedByType = filteredServices.reduce((acc, service) => {
                const type = service.type || 'Другое';
                if (!acc[type]) {
                  acc[type] = [];
                }
                acc[type].push(service);
                return acc;
              }, {} as Record<string, Service[]>);

              return Object.keys(groupedByType).sort().map((type) => (
                <Card key={type} className="overflow-hidden">
                  <div className="p-4 border-b bg-muted/50">
                    <h2 className="text-xl font-semibold">{type}</h2>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[5%]">Статус</TableHead>
                        <TableHead className="w-[30%]">Name</TableHead>
                        <TableHead className="w-[45%]">Address</TableHead>
                        <TableHead className="w-[20%]">Port/URL</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {groupedByType[type].map((service) => {
                        const availabilityStatus = service.availabilityStatus;
                        return (
                          <TableRow key={service.id}>
                            <TableCell>
                              <div className="flex items-center justify-center">
                                {availabilityStatus === true && (
                                  <span className="text-xl" title="Работает">🟢</span>
                                )}
                                {availabilityStatus === false && (
                                  <span className="text-xl" title="Выключен">🔴</span>
                                )}
                                {availabilityStatus === null && (
                                  <span className="text-xl text-muted-foreground" title="Не проверено">⚪</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => toggleFavorite(service.id)}
                                  className="text-muted-foreground hover:text-yellow-500 transition-colors"
                                >
                                  <Star
                                    className={`w-4 h-4 ${
                                      isFavorite(service.id) ? 'fill-yellow-500 text-yellow-500' : ''
                                    }`}
                                  />
                                </button>
                                {service.name}
                              </div>
                            </TableCell>
                            <TableCell>
                              <a
                                href={service.address?.startsWith('http') ? service.address : `http://${service.address}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline"
                              >
                                {service.address}
                              </a>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span>{service.port}</span>
                                {service.address && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openService(service.address, service.port)}
                                    className="h-7 px-2"
                                  >
                                    Открыть
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </Card>
              ));
            })()
          )}
        </div>
      </div>
    </div>
  );
}
