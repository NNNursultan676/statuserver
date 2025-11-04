import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

interface Service {
  id: string;
  name: string;
  address?: string | null;
  port?: number | null;
  [key: string]: any;
}

interface ExportMenuProps {
  services: Service[];
}

export function ExportMenu({ services }: ExportMenuProps) {
  const { toast } = useToast();

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportJSON = () => {
    const json = JSON.stringify(services, null, 2);
    downloadFile(json, 'services.json', 'application/json');
    toast({ title: "Экспорт завершен", description: `${services.length} сервисов экспортировано в JSON` });
  };

  const exportCSV = () => {
    if (services.length === 0) {
      toast({ title: "Нет данных", description: "Нет сервисов для экспорта", variant: "destructive" });
      return;
    }

    const headers = ['name', 'type', 'category', 'region', 'status', 'address', 'port'];
    const csvRows = [
      headers.join(','),
      ...services.map(s => 
        headers.map(h => {
          const val = s[h];
          return val !== null && val !== undefined ? `"${val}"` : '';
        }).join(',')
      )
    ];
    
    const csv = csvRows.join('\n');
    downloadFile(csv, 'services.csv', 'text/csv');
    toast({ title: "Экспорт завершен", description: `${services.length} сервисов экспортировано в CSV` });
  };

  const exportExcel = () => {
    if (services.length === 0) {
      toast({ title: "Нет данных", description: "Нет сервисов для экспорта", variant: "destructive" });
      return;
    }

    const headers = ['Имя', 'Тип', 'Категория', 'Среда', 'Статус', 'Адрес', 'Порт'];
    const data = services.map(s => [
      s.name || '',
      s.type || '',
      s.category || '',
      s.region || '',
      s.status || '',
      s.address || '',
      s.port?.toString() || ''
    ]);

    let xlsContent = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><style>table { border-collapse: collapse; } th, td { border: 1px solid #ddd; padding: 8px; }</style></head><body>';
    xlsContent += '<table><thead><tr>';
    headers.forEach(h => { xlsContent += `<th>${h}</th>`; });
    xlsContent += '</tr></thead><tbody>';
    data.forEach(row => {
      xlsContent += '<tr>';
      row.forEach(cell => { xlsContent += `<td>${cell}</td>`; });
      xlsContent += '</tr>';
    });
    xlsContent += '</tbody></table></body></html>';

    downloadFile(xlsContent, 'services.xls', 'application/vnd.ms-excel');
    toast({ title: "Экспорт завершен", description: `${services.length} сервисов экспортировано в Excel` });
  };

  const copyToClipboard = () => {
    const text = services.map(s => 
      `${s.name} - ${s.address || 'N/A'}${s.port ? `:${s.port}` : ''}`
    ).join('\n');
    
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: "Скопировано", description: `${services.length} сервисов скопировано в буфер обмена` });
    }).catch(() => {
      toast({ title: "Ошибка", description: "Не удалось скопировать", variant: "destructive" });
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Экспорт
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportJSON}>
          Экспорт в JSON
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportCSV}>
          Экспорт в CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportExcel}>
          Экспорт в Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={copyToClipboard}>
          Копировать в буфер
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
