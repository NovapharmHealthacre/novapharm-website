const postcodeShape = /^(GIR 0AA|[A-Z]{1,2}\d[A-Z\d]? \d[A-Z]{2})$/u;

export interface Coordinate {
  readonly latitude: number;
  readonly longitude: number;
}

export interface CatchmentDistance {
  readonly distanceKm: number;
  readonly within1Km: boolean;
  readonly within3Km: boolean;
  readonly within5Km: boolean;
  readonly within10Km: boolean;
}

export function normalisePostcode(value: string): string {
  const compact = value.toUpperCase().replace(/[^A-Z0-9]/gu, "");
  if (compact.length < 5 || compact.length > 7) throw new Error("UK postcode is invalid.");
  const formatted = `${compact.slice(0, -3)} ${compact.slice(-3)}`;
  if (!postcodeShape.test(formatted)) throw new Error("UK postcode is invalid.");
  return formatted;
}

export function postcodeParts(value: string): Readonly<{ area: string; district: string; sector: string; unit: string }> {
  const postcode = normalisePostcode(value);
  const [outward = "", inward = ""] = postcode.split(" ");
  const area = outward.match(/^[A-Z]{1,2}/u)?.[0] ?? "";
  return Object.freeze({ area, district: outward, sector: `${outward} ${inward[0] ?? ""}`, unit: postcode });
}

function coordinate(value: Coordinate): void {
  if (!Number.isFinite(value.latitude) || value.latitude < -90 || value.latitude > 90 || !Number.isFinite(value.longitude) || value.longitude < -180 || value.longitude > 180) throw new Error("Geographic coordinate is invalid.");
}

export function distanceKm(left: Coordinate, right: Coordinate): number {
  coordinate(left);
  coordinate(right);
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const latitudeDelta = radians(right.latitude - left.latitude);
  const longitudeDelta = radians(right.longitude - left.longitude);
  const a = Math.sin(latitudeDelta / 2) ** 2 + Math.cos(radians(left.latitude)) * Math.cos(radians(right.latitude)) * Math.sin(longitudeDelta / 2) ** 2;
  return 6_371.0088 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function catchmentDistance(origin: Coordinate, target: Coordinate): CatchmentDistance {
  const distance = distanceKm(origin, target);
  return Object.freeze({ distanceKm: distance, within1Km: distance <= 1, within3Km: distance <= 3, within5Km: distance <= 5, within10Km: distance <= 10 });
}

export function withinRadius(origin: Coordinate, candidates: readonly Readonly<Coordinate & { id: string }>[], radiusKm: number): readonly Readonly<Coordinate & { id: string; distanceKm: number }>[] {
  if (!Number.isFinite(radiusKm) || radiusKm <= 0 || radiusKm > 100) throw new Error("Geographic radius must be greater than zero and no more than 100 km.");
  return Object.freeze(candidates.map((candidate) => Object.freeze({ ...candidate, distanceKm: distanceKm(origin, candidate) })).filter((candidate) => candidate.distanceKm <= radiusKm).toSorted((left, right) => left.distanceKm - right.distanceKm || left.id.localeCompare(right.id)));
}
