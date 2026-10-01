import Link from "@/components/public-link";

export const metadata = {
  title: "Secure Portal access | NovaPharm Healthcare",
  robots: { index: false, follow: false },
};

export default function PortalAccessPage() {
  return <section className="section"><div className="shell">
    <span className="eyebrow">Secure Portal</span>
    <h1>Sign-in is not available here yet.</h1>
    <p>This website does not currently have a configured secure portal connection. No password has been checked and no account has been signed in.</p>
    <p>Existing account holders should use their verified NovaPharm invitation link. Please do not send passwords or confidential documents through the general enquiry form.</p>
    <Link className="button button-primary" href="/contact/">Contact NovaPharm</Link>
  </div></section>;
}
