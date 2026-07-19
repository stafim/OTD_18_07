import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Pencil, Trash2, History, User, Clock, Truck, Building2, Navigation, Camera, Car, Gauge, AlertTriangle, Download, MapPin, Loader2, Copy, Check, ArrowRight, ArrowRightLeft, Package, Route, ChevronsUpDown, RefreshCw, Factory, Warehouse } from "lucide-react";
import { VehicleFormDialog } from "./form-dialog";
import * as XLSX from "xlsx";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { normalizeImageUrl, cn, copyToClipboard } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useToast } from "@/hooks/use-toast";
import type { Vehicle, Manufacturer, Client, Collect, Driver, Yard, DeliveryLocation, Transfer } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type CollectWithRelations = Collect & {
  manufacturer?: Manufacturer;
  yard?: Yard;
  driver?: Driver | null;
};

type TransportWithRelations = {
  id: string;
  vehicleChassi: string;
  clientId: string;
  originYardId: string;
  deliveryLocationId: string;
  driverId: string | null;
  status: string;
  deliveryDate: string | null;
  scheduledDeparture: string | null;
  notes: string | null;
  createdAt: string | null;
  transitStartedAt: string | null;
  checkinDateTime: string | null;
  checkinLocation: { coordinates: number[] } | null;
  checkinSelfiePhoto: string | null;
  checkinOdometerPhoto: string | null;
  checkinFrontalPhoto: string | null;
  checkinLateral1Photo: string | null;
  checkinLateral2Photo: string | null;
  checkinTraseiraPhoto: string | null;
  checkinFuelLevelPhoto: string | null;
  checkinDamagePhotos: string[] | null;
  checkinNotes: string | null;
  checkoutDateTime: string | null;
  checkoutLocation: { coordinates: number[] } | null;
  checkoutSelfiePhoto: string | null;
  checkoutOdometerPhoto: string | null;
  checkoutFrontalPhoto: string | null;
  checkoutLateral1Photo: string | null;
  checkoutLateral2Photo: string | null;
  checkoutTraseiraPhoto: string | null;
  checkoutFuelLevelPhoto: string | null;
  checkoutDamagePhotos: string[] | null;
  checkoutNotes: string | null;
  routeDistanceKm: string | null;
  routeDurationMinutes: number | null;
  estimatedTolls: string | null;
  estimatedFuel: string | null;
  originYard?: Yard | null;
  deliveryLocation?: DeliveryLocation | null;
  driver?: Driver | null;
  client?: Client | null;
};

type TransferWithRelations = Transfer & {
  originYard?: Yard | null;
  destinationYard?: Yard | null;
  driver?: Driver | null;
};

type VehicleJourney = {
  vehicle: Vehicle & {
    manufacturer?: Manufacturer | null;
    yard?: Yard | null;
    client?: Client | null;
  };
  collects: CollectWithRelations[];
  transports: TransportWithRelations[];
  transfers: TransferWithRelations[];
};

const statusOptions = [
  { value: "all", label: "Todos os Status" },
  { value: "pre_estoque", label: "Pré-estoque" },
  { value: "em_estoque", label: "Em estoque" },
  { value: "despachado", label: "Despachado" },
  { value: "entregue", label: "Entregue" },
  { value: "retirado", label: "Retirado" },
];

export default function VehiclesPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [deleteChassi, setDeleteChassi] = useState<string | null>(null);
  const [historyChassi, setHistoryChassi] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingChassi, setEditingChassi] = useState<string | null>(null);
  const [copiedChassi, setCopiedChassi] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Assign client dialog state
  const [assignClientVehicle, setAssignClientVehicle] = useState<Vehicle | null>(null);
  const [assignClientId, setAssignClientId] = useState("");
  const [assignClientPopoverOpen, setAssignClientPopoverOpen] = useState(false);

  const { data: vehicleJourney, isLoading: isLoadingJourney } = useQuery<VehicleJourney>({
    queryKey: ["/api/vehicle-journey", historyChassi],
    enabled: !!historyChassi,
    staleTime: 0,
  });

  const { data: vehicles, isLoading } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
  });

  const { data: manufacturers } = useQuery<Manufacturer[]>({
    queryKey: ["/api/manufacturers"],
  });

  const { data: clients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: yards } = useQuery<Yard[]>({
    queryKey: ["/api/yards"],
  });

  const { data: collects } = useQuery<Collect[]>({
    queryKey: ["/api/collects"],
  });

  // Chassis que possuem uma coleta em trânsito (veículo saiu da montadora mas
  // ainda não deu entrada no pátio). Usado para sinalizar "Pré-estoque (em trânsito)".
  const inTransitCollectChassis = useMemo(() => {
    const set = new Set<string>();
    (collects ?? []).forEach((c) => {
      if (c.status === "em_transito" && c.vehicleChassi) set.add(c.vehicleChassi);
    });
    return set;
  }, [collects]);

  const getManufacturerName = (manufacturerId: string | null) => {
    if (!manufacturerId) return "-";
    const manufacturer = manufacturers?.find(m => m.id === manufacturerId);
    return manufacturer?.name || "-";
  };

  const getClientName = (clientId: string | null) => {
    if (!clientId) return "-";
    const client = clients?.find(c => c.id === clientId);
    return client?.name || "-";
  };

  const getYardName = (yardId: string | null | undefined) => {
    if (!yardId) return "-";
    const yard = yards?.find(y => y.id === yardId);
    return yard?.name || "-";
  };

  const deleteMutation = useMutation({
    mutationFn: async (chassi: string) => {
      await apiRequest("DELETE", `/api/vehicles/${chassi}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      toast({ title: "Veículo excluído com sucesso" });
      setDeleteChassi(null);
    },
    onError: () => {
      toast({ title: "Erro ao excluir veículo", variant: "destructive" });
    },
  });

  const assignClientMutation = useMutation({
    mutationFn: async ({ chassi, clientId }: { chassi: string; clientId: string }) =>
      apiRequest("PATCH", `/api/vehicles/${encodeURIComponent(chassi)}`, { clientId }),
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ["/api/vehicles"] });
      toast({ title: "Cliente vinculado com sucesso!" });
      setAssignClientVehicle(null);
      setAssignClientId("");
      setAssignClientPopoverOpen(false);
    },
    onError: () => toast({ title: "Erro ao vincular cliente", variant: "destructive" }),
  });

  const filteredData = vehicles?.filter((v) => {
    const manufacturerName = getManufacturerName(v.manufacturerId);
    const matchesSearch =
      v.chassi.toLowerCase().includes(search.toLowerCase()) ||
      manufacturerName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || v.status === statusFilter;
    const matchesClient = clientFilter === "all" || v.clientId === clientFilter;
    return matchesSearch && matchesStatus && matchesClient;
  });

  const statusLabels: Record<string, string> = {
    pre_estoque: "Pré-estoque",
    em_estoque: "Em estoque",
    despachado: "Despachado",
    entregue: "Entregue",
    retirado: "Retirado",
  };

  const handleNew = () => {
    setEditingChassi(null);
    setDialogOpen(true);
  };

  const handleEdit = (v: Vehicle) => {
    setEditingChassi(v.chassi);
    setDialogOpen(true);
  };

  const handleExportExcel = () => {
    if (!vehicles || vehicles.length === 0) {
      toast({ title: "Nenhum veículo para exportar", variant: "destructive" });
      return;
    }

    const exportData = vehicles.map((v) => ({
      Chassi: v.chassi,
      Cliente: getClientName(v.clientId),
      Pátio: getYardName(v.yardId),
      Status:
        v.status === "pre_estoque" && inTransitCollectChassis.has(v.chassi)
          ? "Pré-estoque (em trânsito)"
          : statusLabels[v.status] || v.status,
      "Data Entrada": v.yardEntryDateTime
        ? format(new Date(v.yardEntryDateTime), "dd/MM/yyyy HH:mm", { locale: ptBR })
        : v.createdAt
        ? format(new Date(v.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })
        : "-",
      "Data Retirada": v.dispatchDateTime
        ? format(new Date(v.dispatchDateTime), "dd/MM/yyyy HH:mm", { locale: ptBR })
        : "-",
      Montadora: getManufacturerName(v.manufacturerId),
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Estoque");
    
    const colWidths = [
      { wch: 20 },
      { wch: 20 },
      { wch: 15 },
      { wch: 12 },
      { wch: 18 },
      { wch: 18 },
      { wch: 15 },
    ];
    ws["!cols"] = colWidths;

    const fileName = `estoque_${format(new Date(), "yyyy-MM-dd_HH-mm")}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    toast({ title: "Planilha exportada com sucesso!" });
  };

  const columns = [
    {
      key: "chassi",
      label: "Chassi",
      render: (v: Vehicle) => (
        <div className="flex items-center gap-1.5 group/chassi">
          <span className="font-mono text-sm">{v.chassi}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              copyToClipboard(v.chassi);
              setCopiedChassi(v.chassi);
              setTimeout(() => setCopiedChassi(null), 2000);
            }}
            className="opacity-0 group-hover/chassi:opacity-100 transition-opacity p-0.5 rounded hover:bg-muted"
            title="Copiar chassi"
            data-testid={`button-copy-chassi-${v.chassi}`}
          >
            {copiedChassi === v.chassi
              ? <Check className="h-3.5 w-3.5 text-green-500" />
              : <Copy className="h-3.5 w-3.5 text-muted-foreground" />
            }
          </button>
        </div>
      ),
    },
    {
      key: "clientId",
      label: "Cliente",
      render: (v: Vehicle) => getClientName(v.clientId),
    },
    {
      key: "yardId",
      label: "Pátio",
      render: (v: Vehicle) => getYardName(v.yardId),
    },
    {
      key: "status",
      label: "Status",
      render: (v: Vehicle) => (
        <div className="flex flex-col items-start gap-1">
          <StatusBadge status={v.status} />
          {v.status === "pre_estoque" && inTransitCollectChassis.has(v.chassi) && (
            <Badge
              variant="outline"
              className="border-0 font-medium gap-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
              data-testid={`badge-em-transito-coleta-${v.chassi}`}
            >
              <Truck className="h-3 w-3" />
              Em trânsito (coleta)
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: "yardEntryDateTime",
      label: "Data Entrada",
      render: (v: Vehicle) =>
        v.yardEntryDateTime
          ? format(new Date(v.yardEntryDateTime), "dd/MM/yyyy HH:mm", { locale: ptBR })
          : v.createdAt
          ? format(new Date(v.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })
          : "-",
    },
    {
      key: "dispatchDateTime",
      label: "Data Retirada",
      render: (v: Vehicle) =>
        v.dispatchDateTime
          ? format(new Date(v.dispatchDateTime), "dd/MM/yyyy HH:mm", { locale: ptBR })
          : "-",
    },
    {
      key: "actions",
      label: "",
      className: "w-40",
      render: (v: Vehicle) => (
        <div className="flex items-center gap-1">
          {v.status === "em_estoque" && (
            <Button
              size="icon"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                setAssignClientVehicle(v);
                setAssignClientId(v.clientId ?? "");
              }}
              data-testid={`button-assign-client-${v.chassi}`}
              title="Vincular Cliente"
            >
              <User className="h-4 w-4" />
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              setHistoryChassi(v.chassi);
            }}
            data-testid={`button-history-${v.chassi}`}
            title="Histórico do chassi"
          >
            <History className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(v);
            }}
            data-testid={`button-edit-${v.chassi}`}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteChassi(v.chassi);
            }}
            data-testid={`button-delete-${v.chassi}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const stockSummary = useMemo(() => {
    const all = vehicles ?? [];
    const count = (status: string) => all.filter(v => v.status === status).length;
    return {
      total: all.length,
      preEstoque: count("pre_estoque"),
      emEstoque: count("em_estoque"),
      emTransporte: count("em_transporte"),
      emTransferencia: count("em_transferencia"),
      despachado: count("despachado"),
      entregue: count("entregue"),
    };
  }, [vehicles]);

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Estoque de Veículos"
        breadcrumbs={[
          { label: "Cadastros", href: "/" },
          { label: "Estoque" },
        ]}
      />

      {/* Resumo do Estoque */}
      <div className="px-4 md:px-6 pt-4 pb-0">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card className="border bg-card" data-testid="card-summary-total">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Total</p>
              {isLoading ? (
                <div className="h-7 w-10 bg-muted animate-pulse rounded" />
              ) : (
                <p className="text-2xl font-bold tabular-nums">{stockSummary.total}</p>
              )}
              <p className="text-xs text-muted-foreground mt-0.5">veículos</p>
            </CardContent>
          </Card>
          <Card className="border bg-card" data-testid="card-summary-pre-estoque">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Pré-Estoque</p>
              {isLoading ? (
                <div className="h-7 w-10 bg-muted animate-pulse rounded" />
              ) : (
                <p className="text-2xl font-bold tabular-nums text-yellow-600 dark:text-yellow-400">{stockSummary.preEstoque}</p>
              )}
              <p className="text-xs text-muted-foreground mt-0.5">aguardando</p>
            </CardContent>
          </Card>
          <Card className="border bg-card" data-testid="card-summary-em-estoque">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Em Estoque</p>
              {isLoading ? (
                <div className="h-7 w-10 bg-muted animate-pulse rounded" />
              ) : (
                <p className="text-2xl font-bold tabular-nums text-green-600 dark:text-green-400">{stockSummary.emEstoque}</p>
              )}
              <p className="text-xs text-muted-foreground mt-0.5">no pátio</p>
            </CardContent>
          </Card>
          <Card className="border bg-card" data-testid="card-summary-em-transporte">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Em Transporte</p>
              {isLoading ? (
                <div className="h-7 w-10 bg-muted animate-pulse rounded" />
              ) : (
                <p className="text-2xl font-bold tabular-nums text-blue-600 dark:text-blue-400">{stockSummary.emTransporte}</p>
              )}
              <p className="text-xs text-muted-foreground mt-0.5">em trânsito</p>
            </CardContent>
          </Card>
          <Card className="border bg-card" data-testid="card-summary-em-transferencia">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Transferência</p>
              {isLoading ? (
                <div className="h-7 w-10 bg-muted animate-pulse rounded" />
              ) : (
                <p className="text-2xl font-bold tabular-nums text-purple-600 dark:text-purple-400">{stockSummary.emTransferencia}</p>
              )}
              <p className="text-xs text-muted-foreground mt-0.5">entre pátios</p>
            </CardContent>
          </Card>
          <Card className="border bg-card" data-testid="card-summary-entregue">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Despachado/Entregue</p>
              {isLoading ? (
                <div className="h-7 w-10 bg-muted animate-pulse rounded" />
              ) : (
                <p className="text-2xl font-bold tabular-nums text-muted-foreground">{stockSummary.despachado + stockSummary.entregue}</p>
              )}
              <p className="text-xs text-muted-foreground mt-0.5">concluídos</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:flex-wrap">
            <div className="relative max-w-sm flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por chassi ou montadora..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                data-testid="input-search-vehicles"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48" data-testid="select-status-filter">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger className="w-48" data-testid="select-client-filter">
                <SelectValue placeholder="Filtrar por cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Clientes</SelectItem>
                {clients?.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
                queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
                queryClient.invalidateQueries({ queryKey: ["/api/manufacturers"] });
                queryClient.invalidateQueries({ queryKey: ["/api/yards"] });
                queryClient.invalidateQueries({ queryKey: ["/api/collects"] });
              }}
              title="Atualizar lista"
              data-testid="button-refresh-vehicles"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground" data-testid="text-total-count">
              {filteredData?.length || 0} chassis
            </span>
            <Button variant="outline" onClick={handleExportExcel} data-testid="button-export-excel">
              <Download className="mr-2 h-4 w-4" />
              Baixar planilha
            </Button>
            <Button onClick={handleNew} data-testid="button-add-vehicle">
              <Plus className="mr-2 h-4 w-4" />
              Novo Veículo
            </Button>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={filteredData ?? []}
          isLoading={isLoading}
          keyField="chassi"
          onRowClick={(v) => setHistoryChassi(v.chassi)}
          emptyMessage="Nenhum veículo cadastrado"
        />
      </div>

      <AlertDialog open={!!deleteChassi} onOpenChange={() => setDeleteChassi(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este veículo? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteChassi && deleteMutation.mutate(deleteChassi)}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!historyChassi} onOpenChange={() => setHistoryChassi(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-2 flex-wrap pr-8">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-normal">Histórico do Chassi</span>
                <span className="font-mono font-bold">{historyChassi}</span>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => copyToClipboard(historyChassi || "")} title="Copiar chassi">
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-7"
                onClick={() => {
                  setHistoryChassi(null);
                  const v = vehicles?.find((x) => x.chassi === historyChassi);
                  if (v) handleEdit(v);
                }}
              >
                <Pencil className="h-3.5 w-3.5 mr-1" />
                Editar
              </Button>
            </DialogTitle>
          </DialogHeader>

          {isLoadingJourney ? (
            <div className="space-y-3 pt-2">
              <Skeleton className="h-28 w-full rounded-xl" />
              <Skeleton className="h-4 w-40 rounded" />
              <div className="space-y-4 pl-8">
                <Skeleton className="h-20 w-full rounded-lg" />
                <Skeleton className="h-20 w-full rounded-lg" />
              </div>
            </div>
          ) : vehicleJourney ? (
            <div className="space-y-5 pt-1">

              {/* ── Situação Atual ── */}
              <div className="rounded-xl border-2 border-primary/25 bg-primary/5 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="flex h-2 w-2 rounded-full bg-primary" />
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-primary">Situação Atual</span>
                </div>
                {(() => {
                  const vStatus = vehicleJourney.vehicle.status;
                  const isDelivered = vStatus === "entregue" || vStatus === "retirado";
                  // Last transport with a delivery location (most recent first)
                  const lastDeliveredTransport = [...vehicleJourney.transports]
                    .reverse()
                    .find(t => t.deliveryLocation);
                  const deliveryLoc = isDelivered ? lastDeliveredTransport?.deliveryLocation : null;
                  const deliveryDate = isDelivered ? lastDeliveredTransport?.checkoutDateTime : null;

                  return (
                    <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                      {/* Localização atual — destaque */}
                      <div className="col-span-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-0.5 flex items-center gap-1">
                          {isDelivered
                            ? <><MapPin className="h-3 w-3" /> Local de Entrega</>
                            : <><Warehouse className="h-3 w-3" /> Pátio Atual</>}
                        </p>
                        <p className="text-base font-bold leading-tight">
                          {isDelivered
                            ? (deliveryLoc?.name ?? vehicleJourney.vehicle.yard?.name ?? <span className="italic font-normal text-muted-foreground text-sm">Não definido</span>)
                            : (vehicleJourney.vehicle.yard?.name ?? <span className="italic font-normal text-muted-foreground text-sm">Não definido</span>)}
                        </p>
                        {isDelivered
                          ? (deliveryLoc?.city || deliveryLoc?.state) && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {[deliveryLoc.city, deliveryLoc.state].filter(Boolean).join(" – ")}
                            </p>
                          )
                          : (vehicleJourney.vehicle.yard?.city || vehicleJourney.vehicle.yard?.state) && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {[vehicleJourney.vehicle.yard?.city, vehicleJourney.vehicle.yard?.state].filter(Boolean).join(" – ")}
                            </p>
                          )}
                      </div>
                      {/* Status */}
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Status</p>
                        <StatusBadge status={vehicleJourney.vehicle.status} />
                      </div>
                      {/* Fabricante */}
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-0.5 flex items-center gap-1">
                          <Factory className="h-3 w-3" /> Fabricante
                        </p>
                        <p className="text-sm font-medium">{vehicleJourney.vehicle.manufacturer?.name ?? "–"}</p>
                      </div>
                      {/* Cliente */}
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-0.5 flex items-center gap-1">
                          <Building2 className="h-3 w-3" /> Cliente
                        </p>
                        <p className="text-sm font-medium">
                          {vehicleJourney.vehicle.client?.name ?? <span className="italic font-normal text-muted-foreground">Sem cliente</span>}
                        </p>
                      </div>
                      {/* Data de entrega ou entrada no pátio */}
                      {isDelivered && deliveryDate ? (
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-0.5 flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Data de Entrega
                          </p>
                          <p className="text-sm">{format(new Date(deliveryDate), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                        </div>
                      ) : vehicleJourney.vehicle.yardEntryDateTime ? (
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-0.5 flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Entrada no Pátio
                          </p>
                          <p className="text-sm">{format(new Date(vehicleJourney.vehicle.yardEntryDateTime), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                        </div>
                      ) : null}
                    </div>
                  );
                })()}
              </div>

              {/* ── Timeline de eventos ── */}
              {(() => {
                type TLItem =
                  | { kind: "collect";  idx: number; sortDate: string; data: CollectWithRelations }
                  | { kind: "transfer"; idx: number; sortDate: string; data: TransferWithRelations }
                  | { kind: "transport";idx: number; sortDate: string; data: TransportWithRelations };

                const items: TLItem[] = [
                  ...vehicleJourney.collects.map((c, i) => ({
                    kind: "collect" as const, idx: i,
                    sortDate: (c.createdAt ?? c.checkinDateTime ?? "") as string,
                    data: c,
                  })),
                  ...vehicleJourney.transfers.map((t, i) => ({
                    kind: "transfer" as const, idx: i,
                    sortDate: (t.createdAt ?? "") as string,
                    data: t,
                  })),
                  ...vehicleJourney.transports.map((t, i) => ({
                    kind: "transport" as const, idx: i,
                    sortDate: (t.createdAt ?? "") as string,
                    data: t,
                  })),
                ].sort((a, b) => {
                  if (!a.sortDate && !b.sortDate) return 0;
                  if (!a.sortDate) return -1;
                  if (!b.sortDate) return 1;
                  return new Date(a.sortDate).getTime() - new Date(b.sortDate).getTime();
                });

                if (items.length === 0) return (
                  <div className="text-center py-10 text-muted-foreground">
                    <History className="h-10 w-10 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">Nenhum evento registrado</p>
                  </div>
                );

                // helpers
                const collectStatusLabel: Record<string, string> = {
                  finalizada: "Finalizada", em_transito: "Em trânsito",
                  pendente: "Pendente", autorizado_portaria: "Aut. portaria", cancelada: "Cancelada",
                };
                const transferStatusLabel: Record<string, string> = {
                  pendente: "Pendente", autorizada: "Autorizada",
                  em_transito: "Em trânsito", concluida: "Concluída", cancelada: "Cancelada",
                };
                const transportStatusLabel: Record<string, string> = {
                  pendente: "Pendente", atribuido: "Atribuído",
                  em_transito: "Em trânsito", finalizado: "Finalizado", cancelado: "Cancelado",
                };

                const chip = (label: string, color: "orange" | "purple" | "blue" | "red" | "gray") => {
                  const cls: Record<string, string> = {
                    orange: "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300",
                    purple: "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300",
                    blue:   "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
                    red:    "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300",
                    gray:   "bg-muted text-muted-foreground",
                  };
                  return (
                    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold", cls[color])}>
                      {label}
                    </span>
                  );
                };

                const routePill = (origin: string, destination: string, originSub?: string, destSub?: string) => (
                  <div className="mt-2 mb-3 flex items-center gap-1.5 rounded-lg border bg-muted/40 px-3 py-2 text-sm flex-wrap">
                    <div className="min-w-0">
                      <span className="font-semibold">{origin}</span>
                      {originSub && <span className="ml-1 text-xs text-muted-foreground">({originSub})</span>}
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <span className="font-semibold">{destination}</span>
                      {destSub && <span className="ml-1 text-xs text-muted-foreground">({destSub})</span>}
                    </div>
                  </div>
                );

                const infoRow = (icon: React.ReactNode, label: string, value: string) => (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {icon}
                    <span>{label}:</span>
                    <span className="font-medium text-foreground">{value}</span>
                  </div>
                );

                return (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" /> Linha do Tempo&nbsp;
                      <span className="font-normal normal-case tracking-normal">({items.length} {items.length === 1 ? "evento" : "eventos"})</span>
                    </p>

                    <div className="relative">
                      {/* vertical rail */}
                      <div className="absolute left-[15px] top-4 bottom-1 w-px bg-border" />

                      <div className="space-y-1">
                        {items.map((item, pos) => {
                          const isLast = pos === items.length - 1;

                          /* ── COLETA ── */
                          if (item.kind === "collect") {
                            const c = item.data;
                            const done    = c.status === "finalizada";
                            const cancelled = c.status === "cancelada";
                            const dotColor  = cancelled ? "#ef4444" : done ? "#f97316" : "#fdba74";
                            const statusColor = cancelled ? "red" : done ? "orange" : "gray";
                            return (
                              <div key={`c-${item.idx}`} className={cn("relative flex gap-3", !isLast && "pb-5")}>
                                <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 bg-background"
                                  style={{ borderColor: dotColor }}>
                                  <Package className="h-3.5 w-3.5" style={{ color: dotColor }} />
                                </div>
                                <div className="flex-1 min-w-0 pt-0.5">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-bold">Coleta #{item.idx + 1}</span>
                                    {chip(collectStatusLabel[c.status] ?? c.status, statusColor as any)}
                                    {c.createdAt && (
                                      <span className="text-[11px] text-muted-foreground ml-auto">
                                        {format(new Date(c.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                                      </span>
                                    )}
                                  </div>
                                  {routePill(
                                    c.manufacturer?.name ?? "–",
                                    c.yard?.name ?? "–",
                                    [c.manufacturer?.city, c.manufacturer?.state].filter(Boolean).join(", ") || undefined,
                                    [c.yard?.city, c.yard?.state].filter(Boolean).join(", ") || undefined,
                                  )}
                                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                                    {c.driver && infoRow(<User className="h-3 w-3 shrink-0" />, "Motorista", c.driver.name)}
                                    {c.checkinDateTime && infoRow(<Clock className="h-3 w-3 shrink-0" />, "Saída montadora", format(new Date(c.checkinDateTime), "dd/MM 'às' HH:mm", { locale: ptBR }))}
                                    {c.checkoutDateTime && infoRow(<Clock className="h-3 w-3 shrink-0" />, "Chegada pátio", format(new Date(c.checkoutDateTime), "dd/MM 'às' HH:mm", { locale: ptBR }))}
                                  </div>
                                  {(c.checkinNotes || c.checkoutNotes) && (
                                    <p className="mt-2 text-xs text-muted-foreground italic border-l-2 border-border pl-2">
                                      {c.checkinNotes || c.checkoutNotes}
                                    </p>
                                  )}
                                </div>
                              </div>
                            );
                          }

                          /* ── TRANSFERÊNCIA ── */
                          if (item.kind === "transfer") {
                            const t = item.data;
                            const done      = t.status === "concluida";
                            const cancelled = t.status === "cancelada";
                            const dotColor  = cancelled ? "#ef4444" : done ? "#a855f7" : "#c084fc";
                            const statusColor = cancelled ? "red" : done ? "purple" : "gray";
                            return (
                              <div key={`tr-${item.idx}`} className={cn("relative flex gap-3", !isLast && "pb-5")}>
                                <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 bg-background"
                                  style={{ borderColor: dotColor }}>
                                  <ArrowRightLeft className="h-3.5 w-3.5" style={{ color: dotColor }} />
                                </div>
                                <div className="flex-1 min-w-0 pt-0.5">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-bold">Transferência #{item.idx + 1}</span>
                                    {chip(transferStatusLabel[t.status] ?? t.status, statusColor as any)}
                                    {t.createdAt && (
                                      <span className="text-[11px] text-muted-foreground ml-auto">
                                        {format(new Date(t.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                                      </span>
                                    )}
                                  </div>
                                  {routePill(t.originYard?.name ?? "–", t.destinationYard?.name ?? "–")}
                                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                                    {t.driver && infoRow(<User className="h-3 w-3 shrink-0" />, "Motorista", t.driver.name)}
                                    {/* transferências legadas usam authorizedAt/completedAt; modernas usam checkinDateTime/checkoutDateTime */}
                                    {(t as any).checkinDateTime && infoRow(<Clock className="h-3 w-3 shrink-0" />, "Saída origem", format(new Date((t as any).checkinDateTime), "dd/MM 'às' HH:mm", { locale: ptBR }))}
                                    {(t as any).checkoutDateTime && infoRow(<Clock className="h-3 w-3 shrink-0" />, "Chegada destino", format(new Date((t as any).checkoutDateTime), "dd/MM 'às' HH:mm", { locale: ptBR }))}
                                    {t.authorizedAt && !(t as any).checkinDateTime && infoRow(<Clock className="h-3 w-3 shrink-0" />, "Autorizado", format(new Date(t.authorizedAt), "dd/MM 'às' HH:mm", { locale: ptBR }))}
                                    {t.completedAt && !(t as any).checkoutDateTime && infoRow(<Clock className="h-3 w-3 shrink-0" />, "Concluído", format(new Date(t.completedAt), "dd/MM 'às' HH:mm", { locale: ptBR }))}
                                  </div>
                                  {t.notes && (
                                    <p className="mt-2 text-xs text-muted-foreground italic border-l-2 border-border pl-2">{t.notes}</p>
                                  )}
                                </div>
                              </div>
                            );
                          }

                          /* ── TRANSPORTE ── */
                          if (item.kind === "transport") {
                            const t = item.data;
                            const done      = t.status === "finalizado";
                            const cancelled = t.status === "cancelado";
                            const dotColor  = cancelled ? "#ef4444" : done ? "#3b82f6" : "#93c5fd";
                            const statusColor = cancelled ? "red" : done ? "blue" : "gray";
                            return (
                              <div key={`tp-${item.idx}`} className={cn("relative flex gap-3", !isLast && "pb-5")}>
                                <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 bg-background"
                                  style={{ borderColor: dotColor }}>
                                  <Truck className="h-3.5 w-3.5" style={{ color: dotColor }} />
                                </div>
                                <div className="flex-1 min-w-0 pt-0.5">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-bold">Transporte #{item.idx + 1}</span>
                                    {chip(transportStatusLabel[t.status] ?? t.status, statusColor as any)}
                                    {t.createdAt && (
                                      <span className="text-[11px] text-muted-foreground ml-auto">
                                        {format(new Date(t.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                                      </span>
                                    )}
                                  </div>
                                  {routePill(
                                    t.originYard?.name ?? "–",
                                    t.deliveryLocation?.name ?? t.client?.name ?? "–",
                                  )}
                                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                                    {t.driver && infoRow(<User className="h-3 w-3 shrink-0" />, "Motorista", t.driver.name)}
                                    {t.client && infoRow(<Building2 className="h-3 w-3 shrink-0" />, "Cliente", t.client.name)}
                                    {t.checkinDateTime && infoRow(<Clock className="h-3 w-3 shrink-0" />, "Saída pátio", format(new Date(t.checkinDateTime), "dd/MM 'às' HH:mm", { locale: ptBR }))}
                                    {t.checkoutDateTime && infoRow(<Clock className="h-3 w-3 shrink-0" />, "Entrega", format(new Date(t.checkoutDateTime), "dd/MM 'às' HH:mm", { locale: ptBR }))}
                                    {t.routeDistanceKm && infoRow(<Route className="h-3 w-3 shrink-0" />, "Distância", `${parseFloat(t.routeDistanceKm).toFixed(0)} km`)}
                                    {t.routeDurationMinutes && infoRow(<Clock className="h-3 w-3 shrink-0" />, "Duração est.", `${Math.floor(t.routeDurationMinutes / 60)}h ${t.routeDurationMinutes % 60}min`)}
                                  </div>
                                  {t.notes && (
                                    <p className="mt-2 text-xs text-muted-foreground italic border-l-2 border-border pl-2">{t.notes}</p>
                                  )}
                                </div>
                              </div>
                            );
                          }

                          return null;
                        })}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">Veículo não encontrado</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <VehicleFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        vehicleChassi={editingChassi}
      />

      {/* Assign Client Dialog */}
      <Dialog
        open={!!assignClientVehicle}
        onOpenChange={(open) => { if (!open) { setAssignClientVehicle(null); setAssignClientId(""); setAssignClientPopoverOpen(false); } }}
      >
        <DialogContent className="max-w-lg" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-500" />
              Vincular Cliente ao Chassi
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-md bg-muted/50 px-3 py-2 text-sm">
              <span className="text-muted-foreground">Chassi: </span>
              <span className="font-mono font-semibold">{assignClientVehicle?.chassi}</span>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="assign-client-combobox" className="text-sm font-medium">Cliente</Label>
              <Popover open={assignClientPopoverOpen} onOpenChange={setAssignClientPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    id="assign-client-combobox"
                    variant="outline"
                    role="combobox"
                    aria-expanded={assignClientPopoverOpen}
                    className={cn(
                      "w-full justify-between font-normal",
                      !assignClientId && "text-muted-foreground"
                    )}
                    data-testid="select-assign-client"
                  >
                    {assignClientId
                      ? clients?.find(c => c.id === assignClientId)?.name ?? "Selecione um cliente..."
                      : "Selecione um cliente..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar cliente..." data-testid="input-search-assign-client" />
                    <CommandList>
                      <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                      <CommandGroup>
                        {clients?.map(c => (
                          <CommandItem
                            key={c.id}
                            value={c.name}
                            onSelect={() => {
                              setAssignClientId(c.id);
                              setAssignClientPopoverOpen(false);
                            }}
                            data-testid={`option-assign-client-${c.id}`}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                assignClientId === c.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {c.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => { setAssignClientVehicle(null); setAssignClientId(""); setAssignClientPopoverOpen(false); }}
            >
              Cancelar
            </Button>
            <Button
              disabled={!assignClientId || assignClientMutation.isPending}
              onClick={() => assignClientVehicle && assignClientMutation.mutate({ chassi: assignClientVehicle.chassi, clientId: assignClientId })}
              data-testid="button-confirm-assign-client"
            >
              {assignClientMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
