import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { normalizeImageUrl } from "@/lib/utils";
import {
  MapPin, AlertTriangle, Loader2, Info, Trophy,
  Map as MapIcon, X, Truck, User, Building2,
  Camera, Clock, Navigation, ChevronRight,
  CalendarIcon, Filter, Search,
} from "lucide-react";

interface DamageReport {
  id: string;
  transportId: string | null;
  latitude: string | null;
  longitude: string | null;
  photoUrl: string | null;
  damageTypeName: string | null;
  damageTypeCategory: string | null;
  vehicleChassi: string | null;
  description: string | null;
  createdAt: string | null;
  driverName: string | null;
}

interface LocationCluster {
  key: string;
  lat: number;
  lng: number;
  damages: DamageReport[];
}

interface CityStats {
  city: string;
  count: number;
  lat: number;
  lng: number;
  categories: Record<string, number>;
}

interface TransportDetail {
  id: string;
  requestNumber: string;
  status: string;
  vehicleChassi: string;
  scheduledDeparture: string | null;
  checkinDateTime: string | null;
  checkoutDateTime: string | null;
  destinationType?: string;
  originYard?: { name: string; city?: string; state?: string } | null;
  deliveryLocation?: { name: string; address?: string } | null;
  driver?: { name: string; phone?: string | null } | null;
  client?: { name: string } | null;
}

const CATEGORY_LABEL: Record<string, string> = {
  furto: "Furto",
  avaria: "Avaria",
  acidente: "Acidente",
  colisao: "Colisão",
  risco: "Risco",
  outros: "Outros",
};

const CATEGORY_COLOR: Record<string, string> = {
  furto: "bg-purple-100 text-purple-800 border-purple-300",
  avaria: "bg-orange-100 text-orange-800 border-orange-300",
  acidente: "bg-red-100 text-red-800 border-red-300",
  colisao: "bg-rose-100 text-rose-800 border-rose-300",
  risco: "bg-yellow-100 text-yellow-800 border-yellow-300",
  outros: "bg-slate-100 text-slate-700 border-slate-300",
};

const STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente",
  aguardando_saida: "Aguardando Saída",
  em_transito: "Em Trânsito",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

const STATUS_CLASS: Record<string, string> = {
  pendente: "bg-yellow-100 text-yellow-800 border-yellow-300",
  aguardando_saida: "bg-blue-100 text-blue-800 border-blue-300",
  em_transito: "bg-purple-100 text-purple-800 border-purple-300",
  entregue: "bg-green-100 text-green-800 border-green-300",
  cancelado: "bg-red-100 text-red-800 border-red-300",
};

const RANK_COLORS = [
  "bg-yellow-400 text-yellow-900",
  "bg-gray-300 text-gray-800",
  "bg-amber-600 text-amber-50",
  "bg-slate-200 text-slate-700",
  "bg-slate-200 text-slate-700",
];

function interpolateColor(t: number): string {
  if (t < 0.5) {
    const r = Math.round(251 + (249 - 251) * (t / 0.5));
    const g = Math.round(191 + (115 - 191) * (t / 0.5));
    const b = Math.round(36 + (22 - 36) * (t / 0.5));
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  } else {
    const t2 = (t - 0.5) / 0.5;
    const r = Math.round(249 + (220 - 249) * t2);
    const g = Math.round(115 + (38 - 115) * t2);
    const b = Math.round(22 + (38 - 22) * t2);
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  }
}

function buildLocationClusters(reports: DamageReport[]): LocationCluster[] {
  const map = new Map<string, LocationCluster>();
  for (const r of reports) {
    if (!r.latitude || !r.longitude) continue;
    const lat = parseFloat(r.latitude);
    const lng = parseFloat(r.longitude);
    const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;
    if (!map.has(key)) map.set(key, { key, lat, lng, damages: [] });
    map.get(key)!.damages.push(r);
  }
  return Array.from(map.values());
}

export default function MapaAvariasPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const overlaysRef = useRef<any[]>([]);
  const clusterMarkersRef = useRef<any[]>([]);

  const setSelectedClusterRef = useRef<(c: LocationCluster | null) => void>(() => {});
  const setSelectedDamageRef = useRef<(r: DamageReport | null) => void>(() => {});

  const [mapsLoaded, setMapsLoaded] = useState(false);
  const [geocodingDone, setGeocodingDone] = useState(false);
  const [geocodingProgress, setGeocodingProgress] = useState(0);
  const [geocodingTotal, setGeocodingTotal] = useState(0);
  const [cityStats, setCityStats] = useState<CityStats[]>([]);
  const [geoCacheRef] = useState<Record<string, string>>({});

  const [selectedCluster, setSelectedCluster] = useState<LocationCluster | null>(null);
  const [selectedDamage, setSelectedDamage] = useState<DamageReport | null>(null);

  // Date filters
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [openFrom, setOpenFrom] = useState(false);
  const [openTo, setOpenTo] = useState(false);

  // Driver & chassi filters
  const [driverFilter, setDriverFilter] = useState<string>("");
  const [chassiFilter, setChassiFilter] = useState<string>("");
  const [openDriverCombo, setOpenDriverCombo] = useState(false);

  setSelectedClusterRef.current = setSelectedCluster;
  setSelectedDamageRef.current = setSelectedDamage;

  const { data: apiKeyData } = useQuery<{ apiKey: string }>({
    queryKey: ["/api/integrations/google-maps/api-key"],
  });

  const { data: reports, isLoading: isLoadingReports } = useQuery<DamageReport[]>({
    queryKey: ["/api/damage-reports"],
  });

  const { data: transportDetail, isLoading: isLoadingTransport } = useQuery<TransportDetail>({
    queryKey: ["/api/transports", selectedDamage?.transportId],
    enabled: !!selectedDamage?.transportId,
    staleTime: 60000,
  });

  // Unique driver names for dropdown
  const uniqueDrivers = useMemo(() => {
    if (!reports) return [];
    const names = new Set<string>();
    for (const r of reports) {
      if (r.driverName) names.add(r.driverName);
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [reports]);

  // Derive filtered reports based on all active filters
  const filteredReports = useMemo(() => {
    if (!reports) return [];
    const chassiLower = chassiFilter.trim().toLowerCase();
    return reports.filter((r) => {
      // Date from
      if (r.createdAt && dateFrom) {
        const start = new Date(dateFrom);
        start.setHours(0, 0, 0, 0);
        if (new Date(r.createdAt) < start) return false;
      }
      // Date to
      if (r.createdAt && dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        if (new Date(r.createdAt) > end) return false;
      }
      // Driver (partial, case-insensitive)
      if (driverFilter.trim()) {
        if (!r.driverName?.toLowerCase().includes(driverFilter.trim().toLowerCase())) return false;
      }
      // Chassi (partial, case-insensitive)
      if (chassiLower) {
        if (!r.vehicleChassi?.toLowerCase().includes(chassiLower)) return false;
      }
      return true;
    });
  }, [reports, dateFrom, dateTo, driverFilter, chassiFilter]);

  // Reset selection when any filter changes
  useEffect(() => {
    setSelectedCluster(null);
    setSelectedDamage(null);
  }, [dateFrom, dateTo, driverFilter, chassiFilter]);

  const hasFilter = !!(dateFrom || dateTo || driverFilter.trim() || chassiFilter.trim());

  // Load Google Maps
  useEffect(() => {
    if (!apiKeyData?.apiKey) return;
    const g = (window as any).google;
    if (g?.maps) { setMapsLoaded(true); return; }
    const existing = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
    if (existing) { existing.addEventListener("load", () => setMapsLoaded(true)); return; }
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKeyData.apiKey}&language=pt-BR`;
    script.async = true;
    script.onload = () => setMapsLoaded(true);
    document.head.appendChild(script);
  }, [apiKeyData?.apiKey]);

  // Geocode all reports (always run on full set for cache population)
  useEffect(() => {
    if (!apiKeyData?.apiKey || !reports) return;
    const withCoords = reports.filter((r) => r.latitude && r.longitude);
    if (withCoords.length === 0) { setGeocodingDone(true); return; }

    const uniquePairs = new Map<string, { lat: string; lng: string }>();
    for (const r of withCoords) {
      const key = `${parseFloat(r.latitude!).toFixed(3)},${parseFloat(r.longitude!).toFixed(3)}`;
      if (!uniquePairs.has(key)) uniquePairs.set(key, { lat: r.latitude!, lng: r.longitude! });
    }

    const pairs = Array.from(uniquePairs.entries());
    setGeocodingTotal(pairs.length);
    setGeocodingProgress(0);
    let done = 0;

    const geocode = async (key: string, lat: string, lng: string) => {
      if (geoCacheRef[key]) { done++; setGeocodingProgress(done); return; }
      try {
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKeyData.apiKey}&language=pt-BR`
        );
        const data = await res.json();
        if (data.results?.[0]) {
          const comps: Array<{ long_name: string; short_name: string; types: string[] }> = data.results[0].address_components;
          const locality = comps.find((c) => c.types.includes("locality"))?.long_name;
          const admin2 = comps.find((c) => c.types.includes("administrative_area_level_2"))?.long_name;
          const state = comps.find((c) => c.types.includes("administrative_area_level_1"))?.short_name;
          const city = locality || admin2 || "Desconhecido";
          geoCacheRef[key] = state ? `${city}, ${state}` : city;
        } else { geoCacheRef[key] = "Desconhecido"; }
      } catch { geoCacheRef[key] = "Desconhecido"; }
      done++;
      setGeocodingProgress(done);
    };

    const runBatched = async () => {
      const batchSize = 5;
      for (let i = 0; i < pairs.length; i += batchSize) {
        await Promise.all(pairs.slice(i, i + batchSize).map(([key, { lat, lng }]) => geocode(key, lat, lng)));
        if (i + batchSize < pairs.length) await new Promise((r) => setTimeout(r, 300));
      }
      setGeocodingDone(true);
    };
    runBatched();
  }, [apiKeyData?.apiKey, reports]);

  // Compute city stats from filteredReports
  useEffect(() => {
    if (!geocodingDone) return;
    const withCoords = filteredReports.filter((r) => r.latitude && r.longitude);
    const cityMap = new Map<string, CityStats>();
    for (const r of withCoords) {
      const roundKey = `${parseFloat(r.latitude!).toFixed(3)},${parseFloat(r.longitude!).toFixed(3)}`;
      const cityName = geoCacheRef[roundKey] || "Desconhecido";
      if (!cityMap.has(cityName)) {
        cityMap.set(cityName, { city: cityName, count: 0, lat: parseFloat(r.latitude!), lng: parseFloat(r.longitude!), categories: {} });
      }
      const entry = cityMap.get(cityName)!;
      entry.count++;
      const cat = r.damageTypeCategory || "outros";
      entry.categories[cat] = (entry.categories[cat] || 0) + 1;
    }
    setCityStats(Array.from(cityMap.values()).sort((a, b) => b.count - a.count));
  }, [geocodingDone, filteredReports]);

  // Initialize map
  useEffect(() => {
    if (!mapsLoaded || !mapRef.current) return;
    const g = (window as any).google;
    if (!g?.maps) return;
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = new g.maps.Map(mapRef.current, {
        center: { lat: -20, lng: -58 },
        zoom: 4,
        mapTypeId: "roadmap",
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        zoomControlOptions: { position: g.maps.ControlPosition.RIGHT_CENTER },
      });
      mapInstanceRef.current.addListener("click", () => {
        setSelectedClusterRef.current(null);
        setSelectedDamageRef.current(null);
      });
    }
  }, [mapsLoaded]);

  // City bubble overlays
  useEffect(() => {
    if (!mapsLoaded || !mapInstanceRef.current) return;
    const g = (window as any).google;
    if (!g?.maps) return;

    for (const o of overlaysRef.current) o.setMap(null);
    overlaysRef.current = [];

    if (cityStats.length === 0) return;
    const maxCount = cityStats[0]?.count || 1;

    cityStats.forEach((city) => {
      const t = city.count / maxCount;
      const color = interpolateColor(t);
      const radius = 30000 + (220000 - 30000) * Math.sqrt(t);
      const circle = new g.maps.Circle({
        center: { lat: city.lat, lng: city.lng },
        radius,
        fillColor: color,
        fillOpacity: 0.25,
        strokeColor: color,
        strokeOpacity: 0.6,
        strokeWeight: 1,
        map: mapInstanceRef.current,
        zIndex: Math.round(t * 10),
        clickable: false,
      });
      overlaysRef.current.push(circle);
    });
  }, [mapsLoaded, cityStats]);

  // Cluster markers from filteredReports
  useEffect(() => {
    if (!mapsLoaded || !mapInstanceRef.current) return;
    const g = (window as any).google;
    if (!g?.maps) return;

    for (const m of clusterMarkersRef.current) m.setMap(null);
    clusterMarkersRef.current = [];

    const clusters = buildLocationClusters(filteredReports);

    clusters.forEach((cluster) => {
      const count = cluster.damages.length;
      const scale = count === 1 ? 10 : count <= 3 ? 12 : count <= 9 ? 14 : 17;

      const marker = new g.maps.Marker({
        position: { lat: cluster.lat, lng: cluster.lng },
        map: mapInstanceRef.current,
        title: `${count} avaria${count !== 1 ? "s" : ""} neste local`,
        label: { text: String(count), color: "white", fontWeight: "bold", fontSize: count < 10 ? "12px" : "11px" },
        icon: {
          path: g.maps.SymbolPath.CIRCLE,
          fillColor: "#dc2626",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
          scale,
        },
        zIndex: 200 + count,
        cursor: "pointer",
      });

      marker.addListener("click", (e: any) => {
        e.stop?.();
        setSelectedClusterRef.current(cluster);
        setSelectedDamageRef.current(null);
        mapInstanceRef.current.panTo({ lat: cluster.lat, lng: cluster.lng });
        setTimeout(() => listRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 300);
      });

      clusterMarkersRef.current.push(marker);
    });
  }, [mapsLoaded, filteredReports]);

  const reportsWithCoords = filteredReports.filter((r) => r.latitude && r.longitude);
  const reportsWithoutCoords = filteredReports.length - reportsWithCoords.length;
  const isGeocoding = !geocodingDone && geocodingTotal > 0;

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Mapa de Avarias"
        breadcrumbs={[{ label: "Relatórios" }, { label: "Mapa de Avarias" }]}
      />

      <div className="flex-1 overflow-auto p-4 md:p-6 space-y-4">

        {/* ── Filter bar ── */}
        <Card>
          <CardContent className="py-3 px-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground shrink-0">
                <Filter className="h-4 w-4" />
                Filtros:
              </div>

              {/* Date from */}
              <Popover open={openFrom} onOpenChange={setOpenFrom}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 text-sm h-8 min-w-[120px] justify-start font-normal" data-testid="button-date-from">
                    <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    {dateFrom ? format(dateFrom, "dd/MM/yyyy", { locale: ptBR }) : <span className="text-muted-foreground">De</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateFrom} onSelect={(d) => { setDateFrom(d); setOpenFrom(false); }} disabled={(d) => dateTo ? d > dateTo : false} locale={ptBR} initialFocus />
                </PopoverContent>
              </Popover>

              <span className="text-muted-foreground text-xs">até</span>

              {/* Date to */}
              <Popover open={openTo} onOpenChange={setOpenTo}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 text-sm h-8 min-w-[120px] justify-start font-normal" data-testid="button-date-to">
                    <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    {dateTo ? format(dateTo, "dd/MM/yyyy", { locale: ptBR }) : <span className="text-muted-foreground">Até</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateTo} onSelect={(d) => { setDateTo(d); setOpenTo(false); }} disabled={(d) => dateFrom ? d < dateFrom : false} locale={ptBR} initialFocus />
                </PopoverContent>
              </Popover>

              <div className="w-px h-5 bg-border shrink-0" />

              {/* Driver combobox */}
              <Popover open={openDriverCombo} onOpenChange={setOpenDriverCombo}>
                <PopoverTrigger asChild>
                  <div className="relative cursor-text" onClick={() => setOpenDriverCombo(true)}>
                    <User className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    <Input
                      value={driverFilter}
                      onChange={(e) => { setDriverFilter(e.target.value); setOpenDriverCombo(true); }}
                      onFocus={() => setOpenDriverCombo(true)}
                      placeholder="Motorista"
                      className="h-8 text-sm pl-7 w-[180px]"
                      data-testid="input-driver-filter"
                    />
                    {driverFilter && (
                      <button
                        onMouseDown={(e) => { e.preventDefault(); setDriverFilter(""); setOpenDriverCombo(false); }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </PopoverTrigger>
                <PopoverContent
                  className="p-0 w-[220px]"
                  align="start"
                  onOpenAutoFocus={(e) => e.preventDefault()}
                >
                  <div className="max-h-52 overflow-y-auto py-1">
                    {uniqueDrivers
                      .filter((name) => !driverFilter.trim() || name.toLowerCase().includes(driverFilter.trim().toLowerCase()))
                      .map((name) => (
                        <button
                          key={name}
                          className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                          onMouseDown={(e) => { e.preventDefault(); setDriverFilter(name); setOpenDriverCombo(false); }}
                          data-testid={`option-driver-${name}`}
                        >
                          {name}
                        </button>
                      ))}
                    {uniqueDrivers.filter((name) => !driverFilter.trim() || name.toLowerCase().includes(driverFilter.trim().toLowerCase())).length === 0 && (
                      <p className="px-3 py-2 text-sm text-muted-foreground">Nenhum motorista encontrado.</p>
                    )}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Chassi input */}
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  value={chassiFilter}
                  onChange={(e) => setChassiFilter(e.target.value)}
                  placeholder="Chassi"
                  className="h-8 text-sm pl-7 w-[130px]"
                  data-testid="input-chassi-filter"
                />
                {chassiFilter && (
                  <button onClick={() => setChassiFilter("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              {hasFilter && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => { setDateFrom(undefined); setDateTo(undefined); setDriverFilter("all"); setChassiFilter(""); }}
                  data-testid="button-clear-filter"
                >
                  <X className="h-3.5 w-3.5 mr-1" />
                  Limpar tudo
                </Button>
              )}

              {hasFilter && (
                <Badge variant="secondary" className="text-xs ml-auto">
                  {filteredReports.length} de {reports?.length ?? 0} avaria{reports?.length !== 1 ? "s" : ""}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="py-3">
            <CardContent className="px-4 py-0">
              <p className="text-xs text-muted-foreground mb-0.5">Total de Avarias</p>
              {isLoadingReports ? <Skeleton className="h-7 w-16" /> : <p className="text-2xl font-bold">{filteredReports.length}</p>}
            </CardContent>
          </Card>
          <Card className="py-3">
            <CardContent className="px-4 py-0">
              <p className="text-xs text-muted-foreground mb-0.5">Com Localização GPS</p>
              {isLoadingReports ? <Skeleton className="h-7 w-16" /> : <p className="text-2xl font-bold text-green-600">{reportsWithCoords.length}</p>}
            </CardContent>
          </Card>
          <Card className="py-3">
            <CardContent className="px-4 py-0">
              <p className="text-xs text-muted-foreground mb-0.5">Sem Localização</p>
              {isLoadingReports ? <Skeleton className="h-7 w-16" /> : <p className="text-2xl font-bold text-muted-foreground">{reportsWithoutCoords}</p>}
            </CardContent>
          </Card>
          <Card className="py-3">
            <CardContent className="px-4 py-0">
              <p className="text-xs text-muted-foreground mb-0.5">Cidades Afetadas</p>
              {!geocodingDone ? <Skeleton className="h-7 w-16" /> : <p className="text-2xl font-bold text-amber-600">{cityStats.length}</p>}
            </CardContent>
          </Card>
        </div>

        {/* Geocoding progress */}
        {isGeocoding && (
          <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
            <CardContent className="flex items-center gap-3 py-3 px-4">
              <Loader2 className="h-4 w-4 animate-spin text-amber-600 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Identificando cidades via Google Maps…</p>
                <div className="mt-1.5 h-1.5 w-full bg-amber-200 dark:bg-amber-800 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full transition-all duration-300" style={{ width: `${geocodingTotal > 0 ? (geocodingProgress / geocodingTotal) * 100 : 0}%` }} />
                </div>
              </div>
              <span className="text-xs text-amber-700 dark:text-amber-300 shrink-0">{geocodingProgress}/{geocodingTotal}</span>
            </CardContent>
          </Card>
        )}

        {/* Ranking */}
        {cityStats.length > 0 && (
          <Card>
            <CardHeader className="py-3 pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-500" />
                Ranking de Cidades com Mais Avarias
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2">
                {cityStats.slice(0, 10).map((city, idx) => (
                  <div key={city.city} className="flex items-start gap-2.5 rounded-lg border bg-card p-2.5" data-testid={`card-city-rank-${idx}`}>
                    <span className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${RANK_COLORS[idx] || RANK_COLORS[4]}`}>{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold leading-tight truncate">{city.city}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{city.count} avaria{city.count !== 1 ? "s" : ""}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {Object.entries(city.categories).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([cat, cnt]) => (
                          <Badge key={cat} variant="outline" className="text-[9px] px-1 py-0 h-3.5 leading-none">{CATEGORY_LABEL[cat] || cat} {cnt}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {cityStats.length > 10 && (
                <p className="text-xs text-muted-foreground mt-2">+ {cityStats.length - 10} outra{cityStats.length - 10 !== 1 ? "s" : ""} cidade{cityStats.length - 10 !== 1 ? "s" : ""} com avarias</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Map */}
        <Card className="overflow-hidden">
          <CardHeader className="py-3 pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <MapIcon className="h-4 w-4 text-blue-500" />
              Mapa de Concentração de Avarias
              <Badge variant="outline" className="ml-auto text-[10px] px-1.5 py-0 h-4">América do Sul</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {!mapsLoaded && (
              <div className="flex items-center justify-center h-[480px] bg-muted/30">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="text-sm">Carregando mapa…</span>
                </div>
              </div>
            )}
            <div ref={mapRef} className="w-full" style={{ height: 480, display: mapsLoaded ? "block" : "none" }} data-testid="map-avarias" />
            {reportsWithCoords.length === 0 && !isLoadingReports && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                <MapPin className="h-8 w-8 opacity-30" />
                <p className="text-sm">Nenhuma avaria com localização GPS no período selecionado</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-yellow-400 border border-yellow-500" />
            <span>Poucas avarias (calor)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-600 border border-red-700" />
            <span>Alta concentração (calor)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-red-600 border-2 border-white shadow flex items-center justify-center">
              <span className="text-white text-[9px] font-bold">N</span>
            </div>
            <span>Pino com contagem — clique para listar</span>
          </div>
          <span className="ml-auto flex items-center gap-1">
            <Info className="h-3 w-3" />
            Clique no pino para ver as avarias do local
          </span>
        </div>

        {/* List of damages at selected location */}
        <div ref={listRef}>
          {selectedCluster && (
            <Card className="border-red-200 dark:border-red-900 shadow-md" data-testid="panel-location-cluster">
              <CardHeader className="py-3 pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  {selectedCluster.damages.length} avaria{selectedCluster.damages.length !== 1 ? "s" : ""} neste local
                  <span className="text-xs font-normal text-muted-foreground">
                    ({selectedCluster.lat.toFixed(4)}, {selectedCluster.lng.toFixed(4)})
                  </span>
                </CardTitle>
                <button
                  onClick={() => { setSelectedCluster(null); setSelectedDamage(null); }}
                  className="rounded-md p-1 hover:bg-muted transition-colors"
                  data-testid="button-close-cluster"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </CardHeader>

              <CardContent className="p-0">
                <div className="divide-y">
                  {selectedCluster.damages.map((damage, idx) => {
                    const isSelected = selectedDamage?.id === damage.id;
                    return (
                      <div
                        key={damage.id}
                        className={`flex items-center gap-3 px-4 py-3 transition-colors ${isSelected ? "bg-red-50 dark:bg-red-950/20" : "hover:bg-muted/40"}`}
                        data-testid={`row-damage-${damage.id}`}
                      >
                        <span className="text-xs font-bold text-muted-foreground w-5 text-right shrink-0">{idx + 1}</span>

                        <div className="w-10 h-10 rounded-md overflow-hidden bg-muted border shrink-0 flex items-center justify-center">
                          {damage.photoUrl ? (
                            <img
                              src={normalizeImageUrl(damage.photoUrl)}
                              alt=""
                              className="w-full h-full object-cover"
                              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                            />
                          ) : (
                            <Camera className="h-4 w-4 text-muted-foreground opacity-40" />
                          )}
                        </div>

                        <div className="flex flex-wrap gap-1 shrink-0">
                          {damage.damageTypeCategory && (
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${CATEGORY_COLOR[damage.damageTypeCategory] || ""}`}>
                              {CATEGORY_LABEL[damage.damageTypeCategory] || damage.damageTypeCategory}
                            </Badge>
                          )}
                          {damage.damageTypeName && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">{damage.damageTypeName}</Badge>
                          )}
                        </div>

                        {damage.vehicleChassi && (
                          <span className="text-xs font-mono text-muted-foreground shrink-0 hidden sm:block">{damage.vehicleChassi}</span>
                        )}

                        <p className="flex-1 text-xs text-muted-foreground truncate hidden md:block">
                          {damage.description || "—"}
                        </p>

                        {damage.createdAt && (
                          <span className="text-xs text-muted-foreground shrink-0 hidden lg:flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(damage.createdAt).toLocaleDateString("pt-BR")}
                          </span>
                        )}

                        <button
                          onClick={() => {
                            setSelectedDamage(isSelected ? null : damage);
                            if (!isSelected) setTimeout(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 100);
                          }}
                          className={`shrink-0 flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md border transition-colors ${
                            isSelected
                              ? "bg-red-600 text-white border-red-600 hover:bg-red-700"
                              : "bg-background text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/30"
                          }`}
                          data-testid={`button-detail-${damage.id}`}
                        >
                          {isSelected ? "Fechar" : "Ver detalhes"}
                          {!isSelected && <ChevronRight className="h-3 w-3" />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Detail panel */}
        <div ref={detailRef}>
          {selectedDamage && (
            <Card className="border-orange-200 dark:border-orange-900 shadow-md" data-testid="panel-damage-detail">
              <CardHeader className="py-3 pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  Detalhes da Avaria e Transporte
                </CardTitle>
                <button onClick={() => setSelectedDamage(null)} className="rounded-md p-1 hover:bg-muted transition-colors" data-testid="button-close-damage-detail">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </CardHeader>

              <CardContent className="px-4 pb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Damage */}
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Avaria</p>

                    {selectedDamage.photoUrl ? (
                      <div className="rounded-lg overflow-hidden border bg-muted aspect-video max-h-52 flex items-center justify-center">
                        <img src={normalizeImageUrl(selectedDamage.photoUrl)} alt={selectedDamage.damageTypeName || "Avaria"} className="w-full h-full object-cover"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} data-testid="img-damage-detail" />
                      </div>
                    ) : (
                      <div className="rounded-lg border bg-muted h-36 flex items-center justify-center">
                        <Camera className="h-8 w-8 text-muted-foreground opacity-40" />
                      </div>
                    )}

                    <div className="flex flex-wrap gap-1.5">
                      {selectedDamage.damageTypeName && <Badge variant="secondary" className="text-xs">{selectedDamage.damageTypeName}</Badge>}
                      {selectedDamage.damageTypeCategory && (
                        <Badge variant="outline" className={`text-xs ${CATEGORY_COLOR[selectedDamage.damageTypeCategory] || ""}`}>
                          {CATEGORY_LABEL[selectedDamage.damageTypeCategory] || selectedDamage.damageTypeCategory}
                        </Badge>
                      )}
                      {selectedDamage.vehicleChassi && (
                        <Badge variant="outline" className="text-xs bg-slate-100 text-slate-700 border-slate-300 font-mono">{selectedDamage.vehicleChassi}</Badge>
                      )}
                    </div>

                    {selectedDamage.description && <p className="text-sm text-muted-foreground italic">"{selectedDamage.description}"</p>}

                    <div className="space-y-1.5 text-xs text-muted-foreground">
                      {selectedDamage.createdAt && (
                        <div className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 shrink-0" /><span>{new Date(selectedDamage.createdAt).toLocaleString("pt-BR")}</span></div>
                      )}
                      {selectedDamage.driverName && (
                        <div className="flex items-center gap-1.5"><User className="h-3.5 w-3.5 shrink-0" /><span>{selectedDamage.driverName}</span></div>
                      )}
                      {selectedDamage.latitude && selectedDamage.longitude && (
                        <div className="flex items-center gap-1.5">
                          <Navigation className="h-3.5 w-3.5 shrink-0" />
                          <a href={`https://www.google.com/maps?q=${selectedDamage.latitude},${selectedDamage.longitude}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
                            {parseFloat(selectedDamage.latitude).toFixed(5)}, {parseFloat(selectedDamage.longitude).toFixed(5)}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Transport */}
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Transporte</p>

                    {!selectedDamage.transportId ? (
                      <div className="rounded-lg border bg-muted/40 p-4 flex items-center justify-center h-32">
                        <p className="text-xs text-muted-foreground">Sem transporte vinculado</p>
                      </div>
                    ) : isLoadingTransport ? (
                      <div className="space-y-2"><Skeleton className="h-5 w-32" /><Skeleton className="h-4 w-48" /><Skeleton className="h-4 w-40" /><Skeleton className="h-4 w-36" /></div>
                    ) : transportDetail ? (
                      <div className="space-y-2.5 text-sm">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5"><Truck className="h-4 w-4 text-muted-foreground" /><span className="font-bold">{transportDetail.requestNumber}</span></div>
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${STATUS_CLASS[transportDetail.status] || ""}`}>
                            {STATUS_LABEL[transportDetail.status] || transportDetail.status}
                          </Badge>
                        </div>

                        <div className="flex items-start gap-1.5">
                          <Building2 className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                          <div className="text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">{transportDetail.originYard?.name || "—"}</span>
                            {transportDetail.originYard?.city && <span className="ml-1">({transportDetail.originYard.city}{transportDetail.originYard.state ? `, ${transportDetail.originYard.state}` : ""})</span>}
                            <span className="mx-1.5 text-muted-foreground/50">→</span>
                            <span className="font-medium text-foreground">
                              {transportDetail.destinationType === "yard" ? "Pátio" : transportDetail.client?.name || transportDetail.deliveryLocation?.name || "—"}
                            </span>
                          </div>
                        </div>

                        {transportDetail.driver?.name && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <User className="h-3.5 w-3.5 shrink-0" />
                            <span>{transportDetail.driver.name}</span>
                            {transportDetail.driver.phone && <span className="text-muted-foreground/60">· {transportDetail.driver.phone}</span>}
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-2 pt-1">
                          {[
                            { label: "Saída programada", value: transportDetail.scheduledDeparture },
                            { label: "Check-in", value: transportDetail.checkinDateTime },
                            { label: "Check-out", value: transportDetail.checkoutDateTime },
                          ].map(({ label, value }) => value ? (
                            <div key={label} className="rounded-md bg-muted/40 px-2.5 py-1.5">
                              <p className="text-[10px] text-muted-foreground">{label}</p>
                              <p className="text-xs font-medium">{new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</p>
                            </div>
                          ) : null)}
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-lg border bg-muted/40 p-4 flex items-center justify-center h-20">
                        <p className="text-xs text-muted-foreground">Transporte não encontrado</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Full city list */}
        {cityStats.length > 0 && (
          <Card>
            <CardHeader className="py-3 pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                Todas as Cidades ({cityStats.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {cityStats.map((city, idx) => (
                  <div key={city.city} className="flex items-center gap-3 px-4 py-2.5" data-testid={`row-city-${idx}`}>
                    <span className="text-xs font-bold text-muted-foreground w-5 text-right">{idx + 1}</span>
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="flex-1 text-sm font-medium">{city.city}</span>
                    <div className="flex gap-1 flex-wrap justify-end">
                      {Object.entries(city.categories).sort((a, b) => b[1] - a[1]).map(([cat, cnt]) => (
                        <Badge key={cat} variant="outline" className="text-[10px] px-1.5 py-0 h-4">{CATEGORY_LABEL[cat] || cat}: {cnt}</Badge>
                      ))}
                    </div>
                    <Badge className="shrink-0 min-w-[28px] justify-center" style={{ backgroundColor: interpolateColor(city.count / (cityStats[0]?.count || 1)), color: "white", border: "none" }}>
                      {city.count}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {isLoadingReports && (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        )}
      </div>
    </div>
  );
}
