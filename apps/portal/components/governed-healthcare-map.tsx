"use client";

/**
 * Protected, opt-in MapKit JS 6 rendering for accepted postcode-centroid evidence.
 * Map access is never a substitute for authorised source data or route estimates.
 * NEXT_PUBLIC_APPLE_MAPS_TOKEN must be an Apple Maps JS token restricted to the
 * deployed origin in the Apple Developer portal. No signing key belongs here.
 */
import { useEffect, useMemo, useRef, useState } from "react";

type GeoPoint = Readonly<{ latitude: number; longitude: number; title: string; kind: "pharmacy" | "practice" }>;
type MapOrigin = Readonly<{ postcode: string; latitude: number; longitude: number }>;
type MapKitNamespace = Readonly<{
  Coordinate: new (latitude: number, longitude: number) => unknown;
  Map: new (container: HTMLElement, options: { center: unknown; cameraDistance: number; showsUserLocation: boolean }) => {
    addAnnotation(annotation: unknown): void;
    destroy?: () => void;
  };
  MarkerAnnotation: new (coordinate: unknown, options: { title: string; color: string; glyphText: string; clusteringIdentifier?: string }) => unknown;
}>;

declare global {
  interface Window {
    mapkit?: MapKitNamespace;
    __novaGovernedMapsReady?: () => void;
  }
}

const mapkitScriptId = "nova-mapkitjs-v6";
const mapkitUrl = "https://cdn.apple-mapkit.com/mk/6/mapkit.core.js";
const token = process.env["NEXT_PUBLIC_APPLE_MAPS_TOKEN"];

function coordinate(value: unknown, minimum: number, maximum: number): number | null {
  if (typeof value !== "number" && (typeof value !== "string" || !value.trim())) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= minimum && number <= maximum ? number : null;
}

function acceptedPoints(rows: readonly Record<string, unknown>[], kind: GeoPoint["kind"]): GeoPoint[] {
  return rows.flatMap((row) => {
    const latitude = coordinate(row["latitude"], -90, 90);
    const longitude = coordinate(row["longitude"], -180, 180);
    const label = kind === "pharmacy" ? row["trading_name"] : row["practice_name"];
    if (latitude === null || longitude === null || typeof label !== "string" || !label.trim()) return [];
    return [{ latitude, longitude, title: label.trim().slice(0, 100), kind }];
  });
}

export function GovernedHealthcareMap({ origin, pharmacies, practices, radiusKm }: Readonly<{
  origin: MapOrigin;
  pharmacies: readonly Record<string, unknown>[];
  practices: readonly Record<string, unknown>[];
  radiusKm: number;
}>) {
  const mapElement = useRef<HTMLElement>(null);
  const [status, setStatus] = useState("Map not initialised");
  const points = useMemo(() => [
    ...acceptedPoints(pharmacies, "pharmacy"),
    ...acceptedPoints(practices, "practice")
  ].slice(0, 80), [pharmacies, practices]);
  const lat = coordinate(origin.latitude, -90, 90);
  const lon = coordinate(origin.longitude, -180, 180);

  useEffect(() => {
    if (lat === null || lon === null) { setStatus("Invalid source coordinates; map unavailable."); return; }
    if (!token) { setStatus("Apple Maps token not configured. Results remain accessible in tables."); return; }
    let cancelled = false;
    let map: InstanceType<MapKitNamespace["Map"]> | undefined;
    const initialise = () => {
      if (cancelled || !window.mapkit || !mapElement.current) return;
      try {
        const kit = window.mapkit;
        map = new kit.Map(mapElement.current, {
          center: new kit.Coordinate(lat, lon),
          cameraDistance: Math.max(1200, Math.min(40000, radiusKm * 2700)),
          showsUserLocation: false
        });
        map.addAnnotation(new kit.MarkerAnnotation(new kit.Coordinate(lat, lon), {
          title: `Postcode centroid: ${origin.postcode}`, color: "#1D1D1F", glyphText: "C"
        }));
        for (const point of points) {
          map.addAnnotation(new kit.MarkerAnnotation(new kit.Coordinate(point.latitude, point.longitude), {
            title: point.title, color: point.kind === "pharmacy" ? "#E3120B" : "#424245",
            glyphText: point.kind === "pharmacy" ? "P" : "GP",
            clusteringIdentifier: `novapharm-${point.kind}`
          }));
        }
        setStatus(`Interactive Apple map: ${points.length} organisation markers with recorded coordinates. Location permission not requested.`);
      } catch {
        setStatus("Apple Maps could not initialise. Use the evidence tables instead.");
      }
    };
    if (window.mapkit) initialise();
    else {
      window.__novaGovernedMapsReady = initialise;
      let script = document.getElementById(mapkitScriptId) as HTMLScriptElement | null;
      if (!script) {
        script = document.createElement("script");
        script.id = mapkitScriptId;
        script.src = mapkitUrl;
        script.async = true;
        script.crossOrigin = "anonymous";
        // MapKit JS supports nonce-based CSP; read only the non-secret page nonce.
        script.nonce = document.querySelector<HTMLScriptElement>("script[nonce]")?.nonce ?? "";
        script.dataset["callback"] = "__novaGovernedMapsReady";
        script.dataset["libraries"] = "map,annotations";
        script.dataset["token"] = token;
        script.onerror = () => { if (!cancelled) setStatus("Apple Maps could not load. Use the evidence tables instead."); };
        document.head.appendChild(script);
      } else {
        // A shared loader may still be inflight, so wait for its ready callback.
        script.addEventListener("load", initialise, { once: true });
      }
      setStatus("Loading the authorised Apple map…");
    }
    return () => {
      cancelled = true;
      map?.destroy?.();
      delete window.__novaGovernedMapsReady;
    };
  }, [lat, lon, origin.postcode, points, radiusKm]);

  if (lat === null || lon === null) return null;
  const query = `https://maps.apple.com/?ll=${encodeURIComponent(String(lat))},${encodeURIComponent(String(lon))}&q=${encodeURIComponent(origin.postcode)}`;
  return <section aria-label="Map for postcode-centroid results" style={{ marginBlock: 24 }}>
    <header style={{ marginBottom: 12 }}>
      <h2 style={{ fontSize: "1.2rem", margin: 0 }}>Area map</h2>
      <p style={{ marginBlock: "8px 0", color: "#424245" }}>
        Source-backed postcode centroid, not a delivery route or proof of a business location. 
        Only organisations with accepted coordinates receive markers.
      </p>
    </header>
    {token ? <section ref={mapElement} aria-label={`Interactive map centred on ${origin.postcode}`}
      style={{ width: "100%", height: 360, minHeight: 200, border: "1px solid #D2D2D7", borderRadius: 14, overflow: "hidden" }} /> : null}
    <p role="status" aria-live="polite" style={{ color: "#424245", marginTop: 10 }}>{status}</p>
    <p><a href={query} target="_blank" rel="noopener noreferrer">View postcode centroid in Apple Maps (opens external map)</a></p>
    <p style={{ fontSize: 13, color: "#595961" }}>
      Coordinates are derived from protected source records; distances in the results are straight-line estimates.
      No current-device location, patient location, live stock, dispensing or travel time is inferred.
    </p>
  </section>;
}
