import { Service } from "@shared/schema";

export function getServiceUrl(service: Service): string | null {
  if (!service.address) return null;
  
  const isIp = /^[0-9.]+$/.test(service.address);
  
  if (service.address.startsWith("http")) {
    return service.address;
  } else if (isIp && service.port) {
    return `http://${service.address}:${service.port}`;
  } else if (service.address) {
    return `https://${service.address}`;
  }
  
  return null;
}

export function openServiceUrl(service: Service) {
  const url = getServiceUrl(service);
  if (url) {
    window.open(url, '_blank');
  }
}
