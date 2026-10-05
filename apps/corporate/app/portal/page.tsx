import { verifiedPortalUrl } from "@/lib/portal-link";

export const metadata = {
  title: "Secure Portal access | NovaPharm Healthcare",
  robots: { index: false, follow: false },
};

export default function PortalAccessPage() {
  return <section className="section"><div className="shell">
    <span className="eyebrow">Secure Portal</span>
    <h1>Your Secure Portal.</h1>
    <p>Sign in with your approved Microsoft work account.</p>
    <a className="button button-primary" href={verifiedPortalUrl} rel="nofollow">Open Secure Portal</a>
    <p>Owner access is available. Customer access is not yet enabled.</p>
    <p>This public website does not collect passwords or confidential company records.</p>
  </div></section>;
}
