"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { AdminAuth } from "@/components/AdminAuth";

interface Service {
  id: string;
  name: string;
  description: string;
  address: string;
  status: "online" | "offline";
}

interface Incident {
  id: string;
  title: string;
  description: string;
  status: "open" | "resolved";
  date: string;
}

export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [credentials, setCredentials] = useState<{ username: string; password: string } | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const { control, handleSubmit, reset } = useForm<Service>({
    defaultValues: {
      name: "",
      description: "",
      address: "",
      status: "online",
    },
  });

  const {
    control: incidentControl,
    handleSubmit: handleIncidentSubmit,
    reset: resetIncident,
  } = useForm<Incident>({
    defaultValues: {
      title: "",
      description: "",
      status: "open",
      date: "",
    },
  });

  useEffect(() => {
    const loadData = async () => {
      if (!isAuthenticated || !credentials) return;

      try {
        const authHeader = `Basic ${btoa(`${credentials.username}:${credentials.password}`)}`;

        // Загружаем сервисы
        const servicesResponse = await fetch("/api/services", {
          headers: { Authorization: authHeader },
        });
        if (servicesResponse.ok) {
          const servicesData = await servicesResponse.json();
          setServices(servicesData);
        }

        // Загружаем инциденты
        const incidentsResponse = await fetch("/api/incidents", {
          headers: { Authorization: authHeader },
        });
        if (incidentsResponse.ok) {
          const incidentsData = await incidentsResponse.json();
          setIncidents(incidentsData);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };

    loadData();
  }, [isAuthenticated, credentials]);

  const onSubmit = async (data: Service) => {
    try {
      if (!credentials) {
        toast.error("Необходима авторизация");
        return;
      }

      const authHeader = `Basic ${btoa(`${credentials.username}:${credentials.password}`)}`;
      const response = await fetch("/api/services", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify(data),
      });

      if (response.status === 401) {
        toast.error("Сессия истекла. Войдите снова");
        setIsAuthenticated(false);
        setCredentials(null);
        return;
      }

      if (!response.ok) {
        toast.error("Ошибка при создании сервиса");
        return;
      }

      const newService = await response.json();
      setServices((prev) => [...prev, newService]);
      toast.success("Сервис успешно добавлен!");
      reset();
    } catch (error) {
      console.error("Error creating service:", error);
      toast.error("Ошибка подключения к серверу");
    }
  };

  const onIncidentSubmit = async (data: Incident) => {
    try {
      if (!credentials) {
        toast.error("Необходима авторизация");
        return;
      }

      const authHeader = `Basic ${btoa(`${credentials.username}:${credentials.password}`)}`;
      const response = await fetch("/api/incidents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify(data),
      });

      if (response.status === 401) {
        toast.error("Сессия истекла. Войдите снова");
        setIsAuthenticated(false);
        setCredentials(null);
        return;
      }

      if (!response.ok) {
        toast.error("Ошибка при создании инцидента");
        return;
      }

      const newIncident = await response.json();
      setIncidents((prev) => [...prev, newIncident]);
      toast.success("Инцидент успешно создан!");
      resetIncident();
    } catch (error) {
      console.error("Error creating incident:", error);
      toast.error("Ошибка подключения к серверу");
    }
  };

  const handleAuth = async (username: string, password: string) => {
    try {
      const authHeader = `Basic ${btoa(`${username}:${password}`)}`;
      const response = await fetch("/api/auth/verify", {
        method: "GET",
        headers: {
          Authorization: authHeader,
        },
      });
      
      if (response.status === 401) {
        toast.error("Неверный логин или пароль");
        return;
      }
      
      if (!response.ok) {
        toast.error("Ошибка авторизации");
        return;
      }
      
      // Сохраняем учетные данные для последующих запросов
      setCredentials({ username, password });
      setIsAuthenticated(true);
      toast.success("Успешный вход в систему!");
    } catch (error) {
      console.error("Auth error:", error);
      toast.error("Ошибка подключения к серверу");
    }
  };

  if (!isAuthenticated) {
    return <AdminAuth onAuth={handleAuth} />;
  }

  return (
    <div className="p-6 grid gap-6 md:grid-cols-2">
      {/* Add Service */}
      <Card>
        <CardHeader>
          <CardTitle>Add Service</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Service name */}
            <div>
              <Label>Service name</Label>
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <Input
                    placeholder="Service name..."
                    {...field}
                    value={field.value ?? ""}
                    data-testid="input-name"
                  />
                )}
              />
            </div>

            {/* Description */}
            <div>
              <Label>Description</Label>
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <Textarea
                    placeholder="Service description..."
                    {...field}
                    value={field.value ?? ""}
                    data-testid="input-description"
                  />
                )}
              />
            </div>

            {/* Address */}
            <div>
              <Label>Address</Label>
              <Controller
                name="address"
                control={control}
                render={({ field }) => (
                  <Input
                    placeholder="192.168.1.1 or example.com"
                    {...field}
                    value={field.value ?? ""}
                    data-testid="input-address"
                  />
                )}
              />
            </div>

            {/* Status */}
            <div>
              <Label>Status</Label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <select {...field} value={field.value ?? "online"} className="border rounded p-2 w-full">
                    <option value="online">Online</option>
                    <option value="offline">Offline</option>
                  </select>
                )}
              />
            </div>

            <Button type="submit" className="w-full">
              Add Service
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Report Incident */}
      <Card>
        <CardHeader>
          <CardTitle>Report Incident</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleIncidentSubmit(onIncidentSubmit)} className="space-y-4">
            {/* Incident title */}
            <div>
              <Label>Incident title</Label>
              <Controller
                name="title"
                control={incidentControl}
                render={({ field }) => (
                  <Input
                    placeholder="Incident title..."
                    {...field}
                    value={field.value ?? ""}
                    data-testid="input-incident-title"
                  />
                )}
              />
            </div>

            {/* Incident description */}
            <div>
              <Label>Description</Label>
              <Controller
                name="description"
                control={incidentControl}
                render={({ field }) => (
                  <Textarea
                    placeholder="Detailed description of the incident and its impact..."
                    {...field}
                    value={field.value ?? ""}
                    className="min-h-32"
                    data-testid="input-incident-description"
                  />
                )}
              />
            </div>

            {/* Status */}
            <div>
              <Label>Status</Label>
              <Controller
                name="status"
                control={incidentControl}
                render={({ field }) => (
                  <select {...field} value={field.value ?? "open"} className="border rounded p-2 w-full">
                    <option value="open">Open</option>
                    <option value="resolved">Resolved</option>
                  </select>
                )}
              />
            </div>

            <Button type="submit" className="w-full">
              Submit Incident
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
