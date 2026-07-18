import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Plus,
  Trash2,
  MapPin,
  Route,
  Loader2,
  Edit2,
  Navigation,
  Building2,
  User,
  Fuel,
  ReceiptText,
  BedDouble,
  UtensilsCrossed,
  PackageOpen,
  DollarSign,
  ListTree,
  Hash,
  X,
  Search,
  GripVertical,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { Yard, Client, DeliveryLocation } from "@shared/schema";

interface Waypoint {
  id: string;
  address: string;
  lat?: number;
  lng?: number;
}

interface AddressSuggestion {
  placeId: string;
  description: string;
}

const optionalCurrency = z.string().optional().transform(v => (v === "" ? undefined : v));

function parseBRL(masked: string): string {
  const digits = masked.replace(/\D/g, "");
  if (!digits) return "";
  const cents = parseInt(digits, 10);
  return (cents / 100).toFixed(2);
}

function formatBRL(value: string): string {
  if (!value) return "";
  const digits = value.replace(/\D/g, "").replace(/^0+/, "") || "0";
  const cents = parseInt(digits, 10);
  return (cents / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function numericToBRLDisplay(numeric: string): string {
  if (!numeric) return "";
  const n = parseFloat(numeric);
  if (isNaN(n)) return "";
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface CurrencyInputProps {
  value: string;
  onChange: (numericStr: string) => void;
  placeholder?: string;
  className?: string;
  "data-testid"?: string;
}

function CurrencyInput({ value, onChange, placeholder, className, "data-testid": testId }: CurrencyInputProps) {
  const display = value ? numericToBRLDisplay(value) : "";

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    onChange(parseBRL(raw));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      const digits = value.replace(/\D/g, "").replace(".", "").replace(",", "");
      const stripped = digits.slice(0, -1);
      if (!stripped) { onChange(""); return; }
      const cents = parseInt(stripped, 10);
      onChange((cents / 100).toFixed(2));
      e.preventDefault();
    }
  }

  return (
    <Input
      type="text"
      inputMode="numeric"
      value={display}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      className={className}
      data-testid={testId}
    />
  );
}

const routeFormSchema = z.object({
  name: z.string().min(2, "Nome é obrigatório"),
  originYardId: z.string().min(1, "Selecione o pátio de origem"),
  destinationType: z.enum(["location", "yard"]).default("location"),
  clientId: z.string().optional(),
  destinationLocationId: z.string().optional(),
  destinationYardId: z.string().optional(),
  distanceKm: z.string().optional(),
  fuelCost: optionalCurrency,
  tollCost: optionalCurrency,
  driverDailyCost: optionalCurrency,
  foodCost: optionalCurrency,
  othersCost: optionalCurrency,
  totalCost: optionalCurrency,
});

type RouteFormData = z.infer<typeof routeFormSchema>;
type CostMode = "detailed" | "total";

interface RouteWithRelations {
  id: string;
  name: string;
  originYardId: string;
  destinationType: string;
  destinationLocationId: string | null;
  destinationYardId: string | null;
  distanceKm: string | null;
  fuelCost: string | null;
  tollCost: string | null;
  driverDailyCost: string | null;
  foodCost: string | null;
  othersCost: string | null;
  totalCost: string | null;
  originYard: Yard | null;
  destinationLocation: DeliveryLocation | null;
  destinationYard: Yard | null;
  client: { id: string; name: string } | null;
}

interface DeliveryLocationWithClient extends DeliveryLocation {
  clientId: string;
}

const COST_FIELDS = [
  { name: "fuelCost" as const, label: "Combustível", icon: Fuel, placeholder: "Ex: 350.00" },
  { name: "tollCost" as const, label: "Pedágio", icon: ReceiptText, placeholder: "Ex: 120.00" },
  { name: "driverDailyCost" as const, label: "Hotel / Diária", icon: BedDouble, placeholder: "Ex: 200.00" },
  { name: "foodCost" as const, label: "Alimentação", icon: UtensilsCrossed, placeholder: "Ex: 80.00" },
  { name: "othersCost" as const, label: "Outros", icon: PackageOpen, placeholder: "Ex: 50.00" },
];

function getDisplayTotal(route: RouteWithRelations): string | null {
  if (route.totalCost) {
    const n = parseFloat(route.totalCost);
    return isNaN(n) ? null : n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }
  const fields = [route.fuelCost, route.tollCost, route.driverDailyCost, route.foodCost, route.othersCost];
  const sum = fields.reduce((acc, v) => acc + (v ? parseFloat(v) : 0), 0);
  return sum > 0 ? sum.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : null;
}

export default function RouteManagementPage() {
  const [showDialog, setShowDialog] = useState(false);
  const [editingRoute, setEditingRoute] = useState<RouteWithRelations | null>(null);
  const [calculatingKm, setCalculatingKm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [costMode, setCostMode] = useState<CostMode>("detailed");
  const { toast } = useToast();

  // Waypoints state
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [waypointInput, setWaypointInput] = useState("");
  const [waypointSuggestions, setWaypointSuggestions] = useState<AddressSuggestion[]>([]);
  const [showWaypointSuggestions, setShowWaypointSuggestions] = useState(false);
  const [isSearchingWaypoint, setIsSearchingWaypoint] = useState(false);
  const waypointSearchRef = useRef<NodeJS.Timeout | null>(null);
  const waypointInputRef = useRef<HTMLInputElement>(null);
  const waypointDropdownRef = useRef<HTMLDivElement>(null);

  // Map state — callback ref so init fires the moment the div enters the DOM
  const [mapContainer, setMapContainer] = useState<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const { data: routesList, isLoading } = useQuery<RouteWithRelations[]>({
    queryKey: ["/api/routes"],
  });

  const { data: yards } = useQuery<Yard[]>({ queryKey: ["/api/yards"] });
  const { data: clientsList } = useQuery<Client[]>({ queryKey: ["/api/clients"] });
  const { data: allDeliveryLocations } = useQuery<DeliveryLocationWithClient[]>({
    queryKey: ["/api/delivery-locations"],
  });
  const { data: apiKeyData } = useQuery<{ configured: boolean; apiKey: string }>({
    queryKey: ["/api/integrations/google-maps/api-key"],
  });

  const activeYards = yards?.filter((y) => y.isActive === "true") ?? [];
  const activeClients = clientsList?.filter((c) => c.isActive === "true") ?? [];

  const form = useForm<RouteFormData>({
    resolver: zodResolver(routeFormSchema),
    defaultValues: {
      name: "",
      originYardId: "",
      destinationType: "location",
      clientId: "",
      destinationLocationId: "",
      destinationYardId: "",
      distanceKm: "",
      fuelCost: "",
      tollCost: "",
      driverDailyCost: "",
      foodCost: "",
      othersCost: "",
      totalCost: "",
    },
  });

  const selectedClientId = form.watch("clientId");
  const selectedOriginYardId = form.watch("originYardId");
  const selectedDestinationId = form.watch("destinationLocationId");
  const selectedDestinationYardId = form.watch("destinationYardId");
  const destinationType = form.watch("destinationType");

  // ── Google Maps initialisation ──────────────────────────────────────────
  // Fires whenever the map container div actually enters/leaves the DOM
  useEffect(() => {
    if (!mapContainer || !apiKeyData?.apiKey) return;

    // already initialised for this container
    if (mapInstanceRef.current) return;

    function doInit() {
      if (!mapContainer || mapInstanceRef.current) return;
      mapInstanceRef.current = new google.maps.Map(mapContainer, {
        center: { lat: -15.7801, lng: -47.9292 },
        zoom: 4,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });
      directionsRendererRef.current = new google.maps.DirectionsRenderer({
        map: mapInstanceRef.current,
        suppressMarkers: false,
        polylineOptions: { strokeColor: "#f97316", strokeWeight: 5 },
      });
      setMapReady(true);
    }

    if (window.google?.maps) {
      doInit();
      return;
    }

    // Script not yet loaded — inject it once, then init
    let script = document.getElementById("gm-route-mgmt") as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = "gm-route-mgmt";
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKeyData.apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
    // Poll until the SDK is ready (handles both the script we just added and
    // one added by another page that hasn't finished loading yet)
    const poll = setInterval(() => {
      if (window.google?.maps) { clearInterval(poll); doInit(); }
    }, 80);
    return () => clearInterval(poll);
  }, [mapContainer, apiKeyData?.apiKey]);

  // Tear down map when dialog closes (container unmounts → mapContainer → null)
  useEffect(() => {
    if (!showDialog) {
      mapInstanceRef.current = null;
      directionsRendererRef.current = null;
      setMapReady(false);
    }
  }, [showDialog]);

  // Draw / update the route on the map whenever origin, destination, waypoints, or data changes.
  // yards and allDeliveryLocations are included so the effect re-runs if they load after mapReady.
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !directionsRendererRef.current) return;

    const yard =
      yards?.find(y => y.id === selectedOriginYardId) ??
      (editingRoute?.originYardId === selectedOriginYardId ? editingRoute?.originYard ?? undefined : undefined);

    // Resolve destination based on type
    let destLat: string | null | undefined;
    let destLng: string | null | undefined;
    if (destinationType === "yard") {
      const destYard =
        yards?.find(y => y.id === selectedDestinationYardId) ??
        (editingRoute?.destinationYardId === selectedDestinationYardId ? editingRoute?.destinationYard ?? undefined : undefined);
      destLat = destYard?.latitude;
      destLng = destYard?.longitude;
    } else {
      const dest =
        allDeliveryLocations?.find(d => d.id === selectedDestinationId) ??
        (editingRoute?.destinationLocationId === selectedDestinationId ? editingRoute?.destinationLocation ?? undefined : undefined);
      destLat = dest?.latitude;
      destLng = dest?.longitude;
    }

    if (!yard?.latitude || !yard?.longitude || !destLat || !destLng) {
      directionsRendererRef.current.setDirections({ routes: [] } as any);
      return;
    }

    const directionsService = new google.maps.DirectionsService();
    const wps = waypoints
      .filter(w => w.lat && w.lng)
      .map(w => ({ location: { lat: w.lat!, lng: w.lng! }, stopover: true }));

    directionsService.route(
      {
        origin: { lat: parseFloat(yard.latitude), lng: parseFloat(yard.longitude) },
        destination: { lat: parseFloat(destLat), lng: parseFloat(destLng) },
        waypoints: wps,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          directionsRendererRef.current?.setDirections(result);
        }
      }
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, selectedOriginYardId, selectedDestinationId, selectedDestinationYardId, destinationType, waypoints, yards, allDeliveryLocations, editingRoute]);

  const filteredDeliveryLocations =
    allDeliveryLocations?.filter(
      (dl) => dl.isActive === "true" && dl.clientId === selectedClientId
    ) ?? [];

  useEffect(() => {
    form.setValue("destinationLocationId", "");
  }, [selectedClientId]);

  useEffect(() => {
    if (destinationType === "location" && selectedOriginYardId && selectedDestinationId) {
      calculateDistance(selectedOriginYardId, waypoints, { locationId: selectedDestinationId });
    } else if (destinationType === "yard" && selectedOriginYardId && selectedDestinationYardId) {
      calculateDistance(selectedOriginYardId, waypoints, { destYardId: selectedDestinationYardId });
    }
  }, [selectedOriginYardId, selectedDestinationId, selectedDestinationYardId, destinationType]);

  async function calculateDistance(
    originYardId: string,
    wps: Waypoint[] = [],
    dest: { locationId?: string; destYardId?: string }
  ) {
    setCalculatingKm(true);
    try {
      const payload: Record<string, any> = {
        originYardId,
        truckAxles: "2",
        waypoints: wps.filter(w => w.lat && w.lng).map(w => ({ lat: w.lat, lng: w.lng, address: w.address })),
      };
      if (dest.locationId) payload.destinationLocationId = dest.locationId;
      if (dest.destYardId) payload.destinationYardId = dest.destYardId;
      const res = await apiRequest("POST", "/api/routes/calculate-route", payload);
      const data = await res.json();
      if (data.distanceKm) {
        form.setValue("distanceKm", String(parseFloat(data.distanceKm).toFixed(1)));
      }
    } catch {
      // silently fail — user can enter manually
    } finally {
      setCalculatingKm(false);
    }
  }

  // Waypoint search helpers
  function searchWaypointAddress(query: string) {
    setWaypointInput(query);
    if (waypointSearchRef.current) clearTimeout(waypointSearchRef.current);
    if (!query.trim() || query.length < 3) {
      setWaypointSuggestions([]);
      setShowWaypointSuggestions(false);
      return;
    }
    waypointSearchRef.current = setTimeout(async () => {
      try {
        const token = localStorage.getItem("accessToken");
        if (!token) return;
        const res = await fetch(`/api/integrations/google-maps/places/search?query=${encodeURIComponent(query)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.predictions?.length > 0) {
          setWaypointSuggestions(data.predictions);
          setShowWaypointSuggestions(true);
        } else {
          setWaypointSuggestions([]);
          setShowWaypointSuggestions(false);
        }
      } catch {
        setWaypointSuggestions([]);
      }
    }, 300);
  }

  async function selectWaypointSuggestion(suggestion: AddressSuggestion) {
    setShowWaypointSuggestions(false);
    setWaypointSuggestions([]);
    setIsSearchingWaypoint(true);
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`/api/integrations/google-maps/places/${suggestion.placeId}`, {
        headers: { Authorization: `Bearer ${token || ""}` },
      });
      const data = await res.json();
      if (data.lat && data.lng) {
        const newWp: Waypoint = {
          id: Date.now().toString(),
          address: data.address || suggestion.description,
          lat: data.lat,
          lng: data.lng,
        };
        const updated = [...waypoints, newWp];
        setWaypoints(updated);
        setWaypointInput("");
        if (destinationType === "location" && selectedOriginYardId && selectedDestinationId) {
          calculateDistance(selectedOriginYardId, updated, { locationId: selectedDestinationId });
        } else if (destinationType === "yard" && selectedOriginYardId && selectedDestinationYardId) {
          calculateDistance(selectedOriginYardId, updated, { destYardId: selectedDestinationYardId });
        }
      }
    } catch {
      toast({ title: "Não foi possível obter detalhes do endereço", variant: "destructive" });
    } finally {
      setIsSearchingWaypoint(false);
    }
  }

  function removeWaypoint(id: string) {
    const updated = waypoints.filter(w => w.id !== id);
    setWaypoints(updated);
    if (destinationType === "location" && selectedOriginYardId && selectedDestinationId) {
      calculateDistance(selectedOriginYardId, updated, { locationId: selectedDestinationId });
    } else if (destinationType === "yard" && selectedOriginYardId && selectedDestinationYardId) {
      calculateDistance(selectedOriginYardId, updated, { destYardId: selectedDestinationYardId });
    }
  }

  const createMutation = useMutation({
    mutationFn: (data: Omit<RouteFormData, "clientId">) =>
      apiRequest("POST", "/api/routes", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/routes"] });
      toast({ title: "Rota criada com sucesso!" });
      setShowDialog(false);
      form.reset();
    },
    onError: (err: any) => {
      toast({ title: err.message || "Erro ao criar rota", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Omit<RouteFormData, "clientId"> }) =>
      apiRequest("PATCH", `/api/routes/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/routes"] });
      toast({ title: "Rota atualizada com sucesso!" });
      setShowDialog(false);
      setEditingRoute(null);
      form.reset();
    },
    onError: (err: any) => {
      toast({ title: err.message || "Erro ao atualizar rota", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/routes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/routes"] });
      toast({ title: "Rota excluída." });
      setDeleteId(null);
    },
    onError: () => {
      toast({ title: "Erro ao excluir rota", variant: "destructive" });
    },
  });

  function openCreate() {
    setEditingRoute(null);
    setCostMode("detailed");
    setWaypoints([]);
    setWaypointInput("");
    setWaypointSuggestions([]);
    setShowWaypointSuggestions(false);
    form.reset({
      name: "",
      originYardId: "",
      destinationType: "location",
      clientId: "",
      destinationLocationId: "",
      destinationYardId: "",
      distanceKm: "",
      fuelCost: "",
      tollCost: "",
      driverDailyCost: "",
      foodCost: "",
      othersCost: "",
      totalCost: "",
    });
    setShowDialog(true);
  }

  function openEdit(route: RouteWithRelations) {
    setEditingRoute(route);
    const destType = (route.destinationType as "location" | "yard") || "location";
    const clientId = route.destinationLocation?.clientId ?? route.client?.id ?? "";
    const mode: CostMode = route.totalCost ? "total" : "detailed";
    setCostMode(mode);
    const existingWaypoints: Waypoint[] = Array.isArray((route as any).waypoints)
      ? (route as any).waypoints
      : [];
    setWaypoints(existingWaypoints);
    setWaypointInput("");
    setWaypointSuggestions([]);
    setShowWaypointSuggestions(false);
    form.reset({
      name: route.name,
      originYardId: route.originYardId,
      destinationType: destType,
      clientId,
      destinationLocationId: route.destinationLocationId ?? "",
      destinationYardId: route.destinationYardId ?? "",
      distanceKm: route.distanceKm ?? "",
      fuelCost: route.fuelCost ?? "",
      tollCost: route.tollCost ?? "",
      driverDailyCost: route.driverDailyCost ?? "",
      foodCost: route.foodCost ?? "",
      othersCost: route.othersCost ?? "",
      totalCost: route.totalCost ?? "",
    });
    setShowDialog(true);
  }

  function onSubmit(values: RouteFormData) {
    const { clientId, ...rest } = values;
    // Validate destination based on type
    if (rest.destinationType === "location" && !rest.destinationLocationId) {
      form.setError("destinationLocationId", { message: "Selecione o local de entrega" });
      return;
    }
    if (rest.destinationType === "yard" && !rest.destinationYardId) {
      form.setError("destinationYardId", { message: "Selecione o pátio de destino" });
      return;
    }
    // Clear fields that don't apply to the chosen mode
    if (costMode === "total") {
      rest.fuelCost = undefined;
      rest.tollCost = undefined;
      rest.driverDailyCost = undefined;
      rest.foodCost = undefined;
      rest.othersCost = undefined;
    } else {
      rest.totalCost = undefined;
    }
    // Clear the opposite destination FK
    if (rest.destinationType === "location") {
      rest.destinationYardId = undefined;
    } else {
      rest.destinationLocationId = undefined;
      (rest as any).clientId = undefined;
    }
    const payload = { ...rest, waypoints: waypoints.length > 0 ? waypoints : undefined };
    if (editingRoute) {
      updateMutation.mutate({ id: editingRoute.id, data: payload as any });
    } else {
      createMutation.mutate(payload as any);
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Gestão de Rotas"
        breadcrumbs={[
          { label: "Cadastros", href: "/" },
          { label: "Gestão de Rotas" },
        ]}
      />
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="mb-4 flex justify-end">
          <Button onClick={openCreate} data-testid="button-new-route">
            <Plus className="mr-2 h-4 w-4" />
            Nova Rota
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            Carregando rotas...
          </div>
        ) : !routesList?.length ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
            <Route className="h-12 w-12 opacity-30" />
            <p className="text-sm">Nenhuma rota cadastrada ainda.</p>
            <Button variant="outline" onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Criar primeira rota
            </Button>
          </div>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nome</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Pátio de Origem</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Cliente</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Local de Entrega</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Distância</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Custo Total</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {routesList.map((route, idx) => (
                  <tr
                    key={route.id}
                    className={`border-t transition-colors hover:bg-muted/30 ${idx % 2 === 0 ? "" : "bg-muted/10"}`}
                    data-testid={`row-route-${route.id}`}
                  >
                    <td className="px-4 py-3 font-medium">
                      <div className="flex items-center gap-2">
                        <Route className="h-4 w-4 text-primary shrink-0" />
                        {route.name}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5 shrink-0" />
                        {route.originYard?.name ?? "-"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5 shrink-0" />
                        {route.destinationType === "yard" ? (
                          <span className="text-xs italic">— pátio —</span>
                        ) : (
                          route.client?.name ?? "-"
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {route.destinationType === "yard" ? (
                        <div className="flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5 shrink-0 text-primary" />
                          <span className="font-medium text-foreground">{route.destinationYard?.name ?? "-"}</span>
                          {route.destinationYard?.city
                            ? <span className="text-xs"> — {route.destinationYard.city}/{route.destinationYard.state}</span>
                            : ""}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          {route.destinationLocation?.name ?? "-"}
                          {route.destinationLocation?.city
                            ? ` — ${route.destinationLocation.city}/${route.destinationLocation.state}`
                            : ""}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {route.distanceKm ? (
                        <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
                          <Navigation className="h-3.5 w-3.5" />
                          {parseFloat(route.distanceKm).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {getDisplayTotal(route) ? (
                        <span className="inline-flex items-center gap-1 text-sm font-semibold text-green-700 dark:text-green-400">
                          <DollarSign className="h-3.5 w-3.5" />
                          {getDisplayTotal(route)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEdit(route)}
                          data-testid={`button-edit-route-${route.id}`}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(route.id)}
                          data-testid={`button-delete-route-${route.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={(open) => { setShowDialog(open); if (!open) { setEditingRoute(null); form.reset(); } }}>
        <DialogContent className="max-w-5xl w-[95vw] max-h-[92vh] p-0 flex flex-col overflow-hidden">
          <DialogHeader className="px-6 pt-5 pb-3 border-b shrink-0">
            <DialogTitle>{editingRoute ? "Editar Rota" : "Nova Rota"}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-1 min-h-0 overflow-hidden">
            {/* ── Left: form ──────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da Rota</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: SP → Santos" {...field} data-testid="input-route-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="originYardId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pátio de Origem</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-origin-yard">
                          <SelectValue placeholder="Selecione o pátio" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {activeYards.map((y) => (
                          <SelectItem key={y.id} value={y.id}>
                            {y.name}{y.city ? ` — ${y.city}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Destination type toggle */}
              <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3">
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Tipo de Destino</p>
                  <p className="text-xs text-muted-foreground">
                    {destinationType === "location" ? "Local de entrega de um cliente" : "Pátio cadastrado no sistema"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="dest-type-toggle" className="text-xs text-muted-foreground">
                    {destinationType === "location" ? "Local" : "Pátio"}
                  </Label>
                  <Switch
                    id="dest-type-toggle"
                    checked={destinationType === "yard"}
                    onCheckedChange={(checked) => {
                      form.setValue("destinationType", checked ? "yard" : "location");
                      form.setValue("destinationLocationId", "");
                      form.setValue("destinationYardId", "");
                      form.setValue("clientId", "");
                      form.setValue("distanceKm", "");
                    }}
                    data-testid="toggle-destination-type"
                  />
                </div>
              </div>

              {destinationType === "location" ? (
                <>
                  <FormField
                    control={form.control}
                    name="clientId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cliente</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger data-testid="select-client">
                              <SelectValue placeholder="Selecione o cliente" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {activeClients.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="destinationLocationId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Local de Entrega</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={!selectedClientId}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-destination-location">
                              <SelectValue placeholder={selectedClientId ? "Selecione o local" : "Selecione o cliente primeiro"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {filteredDeliveryLocations.length === 0 ? (
                              <SelectItem value="__none__" disabled>
                                Nenhum local cadastrado para este cliente
                              </SelectItem>
                            ) : (
                              filteredDeliveryLocations.map((dl) => (
                                <SelectItem key={dl.id} value={dl.id}>
                                  {dl.name}{dl.city ? ` — ${dl.city}/${dl.state}` : ""}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              ) : (
                <FormField
                  control={form.control}
                  name="destinationYardId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pátio de Destino</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-destination-yard">
                            <SelectValue placeholder="Selecione o pátio de destino" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {activeYards
                            .filter((y) => y.id !== selectedOriginYardId)
                            .map((y) => (
                              <SelectItem key={y.id} value={y.id}>
                                {y.name}{y.city ? ` — ${y.city}` : ""}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Waypoints section */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Pontos de Rota</span>
                  <div className="flex-1 border-t" />
                </div>
                <p className="text-xs text-muted-foreground">
                  Adicione paradas intermediárias para guiar o trajeto ideal da rota.
                </p>

                {/* Existing waypoints list */}
                {waypoints.length > 0 && (
                  <div className="space-y-1.5">
                    {waypoints.map((wp, index) => (
                      <div
                        key={wp.id}
                        className="flex items-start gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm"
                        data-testid={`waypoint-item-${index}`}
                      >
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary mt-0.5">
                          {index + 1}
                        </div>
                        <span className="flex-1 text-sm leading-snug break-all">{wp.address}</span>
                        <button
                          type="button"
                          onClick={() => removeWaypoint(wp.id)}
                          className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                          data-testid={`button-remove-waypoint-${index}`}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Search input */}
                <div className="relative" ref={waypointDropdownRef}>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      ref={waypointInputRef}
                      value={waypointInput}
                      onChange={(e) => searchWaypointAddress(e.target.value)}
                      onFocus={() => waypointSuggestions.length > 0 && setShowWaypointSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowWaypointSuggestions(false), 150)}
                      placeholder="Buscar ponto intermediário..."
                      className="pl-9 pr-9"
                      data-testid="input-waypoint-search"
                      autoComplete="off"
                    />
                    {isSearchingWaypoint && (
                      <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>

                  {showWaypointSuggestions && waypointSuggestions.length > 0 && (
                    <div className="absolute z-[9999] w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-52 overflow-auto">
                      {waypointSuggestions.map((s) => (
                        <button
                          key={s.placeId}
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm flex items-start gap-2 hover:bg-accent hover:text-accent-foreground"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => selectWaypointSuggestion(s)}
                          data-testid={`waypoint-suggestion-${s.placeId}`}
                        >
                          <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                          <span>{s.description}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <FormField
                control={form.control}
                name="distanceKm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      Distância (km)
                      {calculatingKm && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground font-normal">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Calculando...
                        </span>
                      )}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        placeholder="Ex: 120.5"
                        {...field}
                        data-testid="input-distance-km"
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      Calculado automaticamente ao selecionar origem e destino. Você pode editar se necessário.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Cost section */}
              <div className="pt-2">
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-semibold">Custos da Rota</span>
                  <div className="flex-1 border-t" />
                  {/* Mode toggle */}
                  <div className="flex items-center rounded-md border overflow-hidden text-xs">
                    <button
                      type="button"
                      onClick={() => setCostMode("detailed")}
                      data-testid="button-cost-mode-detailed"
                      className={`flex items-center gap-1 px-2.5 py-1.5 transition-colors ${
                        costMode === "detailed"
                          ? "bg-primary text-primary-foreground"
                          : "bg-background text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <ListTree className="h-3 w-3" />
                      Detalhado
                    </button>
                    <button
                      type="button"
                      onClick={() => setCostMode("total")}
                      data-testid="button-cost-mode-total"
                      className={`flex items-center gap-1 px-2.5 py-1.5 transition-colors border-l ${
                        costMode === "total"
                          ? "bg-primary text-primary-foreground"
                          : "bg-background text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <Hash className="h-3 w-3" />
                      Valor Total
                    </button>
                  </div>
                </div>

                {costMode === "detailed" ? (
                  <div className="grid grid-cols-2 gap-3">
                    {COST_FIELDS.map(({ name, label, icon: Icon }) => (
                      <FormField
                        key={name}
                        control={form.control}
                        name={name}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-1.5 text-xs">
                              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                              {label}
                            </FormLabel>
                            <FormControl>
                              <div className="relative">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none z-10">R$</span>
                                <CurrencyInput
                                  value={field.value ?? ""}
                                  onChange={field.onChange}
                                  placeholder="0,00"
                                  className="pl-8"
                                  data-testid={`input-cost-${name}`}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                ) : (
                  <FormField
                    control={form.control}
                    name="totalCost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1.5 text-sm">
                          <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                          Custo Total da Rota
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium pointer-events-none z-10">R$</span>
                            <CurrencyInput
                              value={field.value ?? ""}
                              onChange={field.onChange}
                              placeholder="0,00"
                              className="pl-10 h-11 text-base"
                              data-testid="input-total-cost"
                            />
                          </div>
                        </FormControl>
                        <p className="text-xs text-muted-foreground">
                          Informe o custo total da rota sem detalhar por categoria.
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 pb-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setShowDialog(false); setEditingRoute(null); form.reset(); }}
                  data-testid="button-cancel-route"
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isPending} data-testid="button-save-route">
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingRoute ? "Salvar Alterações" : "Criar Rota"}
                </Button>
              </div>
            </form>
          </Form>
            </div>{/* end left form column */}

            {/* ── Right: map preview ───────────────────────── */}
            <div className="hidden md:flex w-[420px] shrink-0 flex-col border-l bg-muted/20">
              <div className="px-4 py-3 border-b shrink-0 flex items-center gap-2">
                <Navigation className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Visualização da Rota</span>
                {calculatingKm && (
                  <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Calculando...
                  </span>
                )}
              </div>
              <div className="flex-1 relative">
                <div ref={setMapContainer} className="absolute inset-0" />
                {!mapReady && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground bg-muted/30">
                    <Route className="h-10 w-10 opacity-20" />
                    <p className="text-xs text-center px-4">
                      {!apiKeyData?.apiKey
                        ? "Google Maps não configurado"
                        : "Selecione origem e destino para visualizar a rota"}
                    </p>
                  </div>
                )}
                {mapReady && !selectedOriginYardId && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground pointer-events-none">
                    <MapPin className="h-8 w-8 opacity-20" />
                    <p className="text-xs text-center px-4">Selecione origem e destino para visualizar a rota</p>
                  </div>
                )}
              </div>
            </div>{/* end right map column */}

          </div>{/* end two-column flex */}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir Rota</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir esta rota? Esta ação não pode ser desfeita.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteId(null)} data-testid="button-cancel-delete">
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
