import { useQuery } from "@tanstack/react-query";
import { Service } from "@shared/schema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Star, RefreshCw, BarChart3, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { useFavorites } from "@/hooks/use-favorites";
import { useAvailability } from "@/hooks/use-availability";

export default function Dashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeEnvironment, setActiveEnvironment] = useState<string | null>(null);
  const [showFavorites, setShowFavorites] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [showUnavailableDialog, setShowUnavailableDialog] = useState(false);

  const { data: services = [], isLoading } = useQuery<Service[]>({
    queryKey: ["/api/services"],
    refetchInterval: 30000, // Auto-refresh every 30 seconds
    refetchIntervalInBackground: true,
  });

  const { favorites, toggleFavorite, isFavorite } = useFavorites();
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
    loading: services.filter((s) => s.status === "loading").length,
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

  const unavailableServices = services.filter(s => s.status === "down" || s.status === "degraded");

  return (
    <div className="space-y-6 md:space-y-8">
      <Dialog open={showUnavailableDialog} onOpenChange={setShowUnavailableDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
              Недоступные и проблемные сервисы
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {unavailableServices.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Нет недоступных сервисов</p>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[15%]">Статус</TableHead>
                        <TableHead className="w-[25%]">Имя</TableHead>
                        <TableHead className="w-[20%]">Тип</TableHead>
                        <TableHead className="w-[20%]">Среда</TableHead>
                        <TableHead className="w-[20%]">Адрес</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {unavailableServices.map((service) => {
                        const isDown = service.status === "down";
                        const isDegraded = service.status === "degraded";
                        
                        return (
                          <TableRow key={service.id}>
                            <TableCell>
                              {isDown && (
                                <div className="flex items-center gap-2 bg-red-600 px-3 py-1.5 rounded-md border-2 border-red-700">
                                  <div className="w-2.5 h-2.5 rounded-full bg-white" />
                                  <span className="text-xs font-bold text-white">DOWN</span>
                                </div>
                              )}
                              {isDegraded && (
                                <div className="flex items-center gap-2 bg-amber-600 px-3 py-1.5 rounded-md border-2 border-amber-700">
                                  <div className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
                                  <span className="text-xs font-bold text-white">WARN</span>
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="font-medium">{service.name}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{service.type || "Другое"}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{service.region}</Badge>
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {service.address ? (
                                <a
                                  href={service.address?.startsWith('http') ? service.address : `http://${service.address}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline"
                                >
                                  {service.address}
                                </a>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-3">
                  {unavailableServices.map((service) => {
                    const isDown = service.status === "down";
                    const isDegraded = service.status === "degraded";
                    
                    return (
                      <Card key={service.id} className="p-3">
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-medium text-sm flex-1">{service.name}</h3>
                            <div className="flex-shrink-0">
                              {isDown && (
                                <div className="flex items-center gap-1 bg-red-600 px-2 py-1 rounded border border-red-700">
                                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                                  <span className="text-[10px] font-bold text-white">DOWN</span>
                                </div>
                              )}
                              {isDegraded && (
                                <div className="flex items-center gap-1 bg-amber-600 px-2 py-1 rounded border border-amber-700">
                                  <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                  <span className="text-[10px] font-bold text-white">WARN</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {service.type || "Другое"}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {service.region}
                            </Badge>
                          </div>
                          
                          {service.address && (
                            <a
                              href={service.address?.startsWith('http') ? service.address : `http://${service.address}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline block truncate"
                            >
                              {service.address}
                            </a>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold">Панель мониторинга сервисов</h1>
        </div>

        {allOperational ? (
          <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <p className="font-medium">Все системы работают</p>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowUnavailableDialog(true)}
            className="w-full p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <AlertCircle className="w-4 h-4" />
              <p className="font-medium">
                {statusCounts.down > 0
                  ? `${statusCounts.down} сервис(ов) недоступно`
                  : `${statusCounts.degraded} сервис(ов) работают с проблемами`}
              </p>
              <span className="ml-auto text-xs opacity-75">Нажмите для деталей</span>
            </div>
          </button>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
          <Card className="p-3 md:p-4">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              <h3 className="font-medium text-sm md:text-base">Статистика по средам</h3>
            </div>
            <div className="space-y-1.5 md:space-y-2">
              {Object.entries(environmentStats).slice(0, 5).map(([env, count]) => (
                <div key={env} className="flex justify-between text-xs md:text-sm">
                  <span className="text-muted-foreground truncate">{env}</span>
                  <Badge variant="secondary" className="text-xs">{count}</Badge>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-3 md:p-4">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              <h3 className="font-medium text-sm md:text-base">Статистика по типам</h3>
            </div>
            <div className="space-y-1.5 md:space-y-2">
              {Object.entries(typeStats).slice(0, 5).map(([type, count]) => (
                <div key={type} className="flex justify-between text-xs md:text-sm">
                  <span className="text-muted-foreground">{type}</span>
                  <Badge variant="secondary" className="text-xs">{count}</Badge>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-3 md:p-4">
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              <h3 className="font-medium text-sm md:text-base">Избранное</h3>
            </div>
            <div className="space-y-1.5 md:space-y-2">
              <div className="flex justify-between text-xs md:text-sm">
                <span className="text-muted-foreground">Избранных</span>
                <Badge variant="secondary" className="text-xs">{favorites.length}</Badge>
              </div>
              <div className="flex justify-between text-xs md:text-sm">
                <span className="text-muted-foreground">Всего сервисов</span>
                <Badge className="text-xs">{services.length}</Badge>
              </div>
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
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
              className="w-full sm:w-auto"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${checkingAvailability ? 'animate-spin' : ''}`} />
              Проверить доступность
            </Button>
          </div>

          <div className="flex flex-nowrap gap-2 items-center overflow-x-auto pb-2 -mx-1 px-1">
            <Button
              variant={showFavorites ? "default" : "outline"}
              size="sm"
              onClick={() => setShowFavorites(!showFavorites)}
              className="flex-shrink-0"
            >
              <Star className="w-4 h-4 mr-1" />
              Избранное ({favoriteServices.length})
            </Button>
            {!showFavorites && (
              <>
                <div className="h-6 w-px bg-border mx-2 flex-shrink-0" />
                {environments.map(env => (
                  <Button
                    key={env}
                    variant={activeEnvironment === env ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveEnvironment(env)}
                    className="flex-shrink-0"
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
                  <div className="p-3 sm:p-4 border-b bg-muted/50">
                    <h2 className="text-lg sm:text-xl font-semibold">{type}</h2>
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden md:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[30%]">Name</TableHead>
                          <TableHead className="w-[45%]">Address</TableHead>
                          <TableHead className="w-[20%]">Port/URL</TableHead>
                          <TableHead className="w-[5%]">Статус</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {groupedByType[type].map((service) => {
                          const isOperational = service.status === "operational";
                          const isDown = service.status === "down";
                          const isDegraded = service.status === "degraded";
                          const isMaintenance = service.status === "maintenance";
                          const isLoadingStatus = service.status === "loading";
                          
                          return (
                            <TableRow key={service.id}>
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
                              <TableCell>
                                <div className="flex items-center justify-center">
                                  {isOperational && (
                                    <div className="flex items-center gap-2 bg-green-600 px-4 py-2 rounded-md border-2 border-green-700">
                                      <div className="w-3 h-3 rounded-full bg-white animate-pulse" />
                                      <span className="text-sm font-bold text-white">UP</span>
                                    </div>
                                  )}
                                  {isDown && (
                                    <div className="flex items-center gap-2 bg-red-600 px-4 py-2 rounded-md border-2 border-red-700">
                                      <div className="w-3 h-3 rounded-full bg-white" />
                                      <span className="text-sm font-bold text-white">DOWN</span>
                                    </div>
                                  )}
                                  {isDegraded && (
                                    <div className="flex items-center gap-2 bg-amber-600 px-4 py-2 rounded-md border-2 border-amber-700">
                                      <div className="w-3 h-3 rounded-full bg-white animate-pulse" />
                                      <span className="text-sm font-bold text-white">WARN</span>
                                    </div>
                                  )}
                                  {isMaintenance && (
                                    <div className="flex items-center gap-2 bg-blue-600 px-4 py-2 rounded-md border-2 border-blue-700">
                                      <div className="w-3 h-3 rounded-full bg-white" />
                                      <span className="text-sm font-bold text-white">MAINT</span>
                                    </div>
                                  )}
                                  {isLoadingStatus && (
                                    <div className="flex items-center gap-2 bg-gray-600 px-4 py-2 rounded-md border-2 border-gray-700">
                                      <div className="w-3 h-3 rounded-full bg-white animate-pulse" />
                                      <span className="text-sm font-bold text-white">LOAD</span>
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile Card View */}
                  <div className="md:hidden divide-y">
                    {groupedByType[type].map((service) => {
                      const isOperational = service.status === "operational";
                      const isDown = service.status === "down";
                      const isDegraded = service.status === "degraded";
                      const isMaintenance = service.status === "maintenance";
                      const isLoadingStatus = service.status === "loading";
                      
                      return (
                        <div key={service.id} className="p-3 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <button
                                onClick={() => toggleFavorite(service.id)}
                                className="text-muted-foreground hover:text-yellow-500 transition-colors flex-shrink-0"
                              >
                                <Star
                                  className={`w-4 h-4 ${
                                    isFavorite(service.id) ? 'fill-yellow-500 text-yellow-500' : ''
                                  }`}
                                />
                              </button>
                              <h3 className="font-medium text-sm truncate">{service.name}</h3>
                            </div>
                            <div className="flex-shrink-0">
                              {isOperational && (
                                <div className="flex items-center gap-1 bg-green-600 px-2 py-1 rounded border border-green-700">
                                  <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                  <span className="text-[10px] font-bold text-white">UP</span>
                                </div>
                              )}
                              {isDown && (
                                <div className="flex items-center gap-1 bg-red-600 px-2 py-1 rounded border border-red-700">
                                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                                  <span className="text-[10px] font-bold text-white">DOWN</span>
                                </div>
                              )}
                              {isDegraded && (
                                <div className="flex items-center gap-1 bg-amber-600 px-2 py-1 rounded border border-amber-700">
                                  <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                  <span className="text-[10px] font-bold text-white">WARN</span>
                                </div>
                              )}
                              {isMaintenance && (
                                <div className="flex items-center gap-1 bg-blue-600 px-2 py-1 rounded border border-blue-700">
                                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                                  <span className="text-[10px] font-bold text-white">MAINT</span>
                                </div>
                              )}
                              {isLoadingStatus && (
                                <div className="flex items-center gap-1 bg-gray-600 px-2 py-1 rounded border border-gray-700">
                                  <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                  <span className="text-[10px] font-bold text-white">LOAD</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {service.address && (
                            <div className="flex items-center justify-between gap-2">
                              <a
                                href={service.address?.startsWith('http') ? service.address : `http://${service.address}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-primary hover:underline truncate flex-1"
                              >
                                {service.address}
                              </a>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openService(service.address, service.port)}
                                className="h-7 px-2 text-xs flex-shrink-0"
                              >
                                Открыть
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Card>
              ));
            })()
          )}
        </div>
      </div>
    </div>
  );
}