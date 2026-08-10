import Link from "next/link";
import { PortalBrand } from "../components/portal-brand";

export default function NotFound() {
  return <main className="system-page"><PortalBrand /><p className="eyebrow">404</p><h1>Portal route not found</h1><p>The requested secure workspace is not available.</p><Link className="button primary" href="/">Return to portal sign in</Link></main>;
}
