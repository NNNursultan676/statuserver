import { useQuery } from "@tanstack/react-query";
import { Service } from "@shared/schema";
import { ServiceCard } from "@/components/ServiceCard";
import { ExportMenu } from "@/components/ExportMenu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Star, History as HistoryIcon, RefreshCw, BarChart3 } from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useFavorites } from "@/hooks/use-favorites";
import { useHistory } from "@/hooks/use-history";
import { useAvailability } from "@/hooks/use-availability";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [regionFilter, setRegionFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("all");
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  const { data: services = [], isLoading } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const { favorites, toggleFavorite, isFavorite } = useFavorites();
  const { history, addToHistory } = useHistory();
  const { checkAvailability, getStatus } = useAvailability();

  const regions = Array.from(new Set(services.map(s => s.region))).sort();
  const categories = Array.from(new Set(services.map(s => s.category))).sort();
  const types = Array.from(new Set(services.map(s => s.type).filter(Boolean))).sort();

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
    
    const matchesRegion = regionFilter === "all" || service.region === regionFilter;
    const matchesCategory = categoryFilter === "all" || service.category === categoryFilter;
    const matchesType = typeFilter.length === 0 || (service.type && typeFilter.includes(service.type));
    
    const matchesFavorite = activeTab !== "favorites" || isFavorite(service.id);
    const matchesHistory = activeTab !== "history" || history.some(h => h.serviceId === service.id);
    
    return matchesSearch && matchesRegion && matchesCategory && matchesType && matchesFavorite && matchesHistory;
  });

  const favoriteServices = filteredServices.filter(s => isFavorite(s.id));
  const recentServices = services.filter(s => history.some(h => h.serviceId === s.id));

  const statusCounts = {
    operational: services.filter((s) => s.status === "operational").length,
    degraded: services.filter((s) => s.status === "degraded").length,
    down: services.filter((s) => s.status === "down").length,
    maintenance: services.filter((s) => s.status === "maintenance").length,
  };

  const environmentStats = regions.reduce((acc, region) => {
    acc[region] = services.filter(s => s.region === region).length;
    return acc;
  }, {} as Record<string, number>);

  const typeStats = types.reduce((acc, type) => {
    if (type) {
      acc[type] = services.filter(s => s.type === type).length;
    }
    return acc;
  }, {} as Record<string, number>);

  const allOperational = statusCounts.degraded === 0 && statusCounts.down === 0;

  const toggleTypeFilter = (type: string) => {
    setTypeFilter(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const handleServiceClick = (service: Service) => {
    addToHistory(service.id, service.name);
    setLocation(`/service/${service.id}`);
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
          <div className="flex flex-col sm:flex-row gap-4">
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

          <div className="flex flex-col sm:flex-row gap-4">
            <Select value={regionFilter} onValueChange={setRegionFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Среда" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все среды</SelectItem>
                {regions.map(region => (
                  <SelectItem key={region} value={region}>{region}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Категория" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все категории</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-muted-foreground self-center">Тип сервиса:</span>
            {types.slice(0, 8).filter(Boolean).map(type => (
              <Badge
                key={type}
                variant={typeFilter.includes(type!) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => toggleTypeFilter(type!)}
              >
                {type}
              </Badge>
            ))}
            {typeFilter.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setTypeFilter([])}>
                Сбросить фильтры
              </Button>
            )}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">
              Все ({filteredServices.length})
            </TabsTrigger>
            <TabsTrigger value="favorites">
              <Star className="w-4 h-4 mr-1" />
              Избранное ({favoriteServices.length})
            </TabsTrigger>
            <TabsTrigger value="history">
              <HistoryIcon className="w-4 h-4 mr-1" />
              История ({recentServices.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-40 rounded-lg bg-card animate-pulse" />
                ))}
              </div>
            ) : filteredServices.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Сервисы не найдены</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredServices.map((service) => (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    onClick={() => handleServiceClick(service)}
                    isFavorite={isFavorite(service.id)}
                    onToggleFavorite={toggleFavorite}
                    availabilityStatus={getStatus(service.id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="favorites" className="mt-6">
            {favoriteServices.length === 0 ? (
              <div className="text-center py-12">
                <Star className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Нет избранных сервисов</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {favoriteServices.map((service) => (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    onClick={() => handleServiceClick(service)}
                    isFavorite={true}
                    onToggleFavorite={toggleFavorite}
                    availabilityStatus={getStatus(service.id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            {recentServices.length === 0 ? (
              <div className="text-center py-12">
                <HistoryIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">История пуста</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recentServices.map((service) => (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    onClick={() => handleServiceClick(service)}
                    isFavorite={isFavorite(service.id)}
                    onToggleFavorite={toggleFavorite}
                    availabilityStatus={getStatus(service.id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
