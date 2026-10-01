import { Mail } from "lucide-react";

export function PublicEmailContact({ account = false }: { readonly account?: boolean }) {
  const subject = account ? "NovaPharm business account interest" : "NovaPharm business enquiry";
  const address = "vishal@novapharmhealthcare.com";
  return (
    <div className="contact-boundaries">
      <h2>{account ? "Discuss a business account" : "Contact NovaPharm"}</h2>
      <p>Send a non-confidential business enquiry to our team.</p>
      <a className="button button-primary" href={`mailto:${address}?subject=${encodeURIComponent(subject)}`}>
        <Mail size={18} aria-hidden="true" /> Email NovaPharm
      </a>
      <p><a href={`mailto:${address}`}>{address}</a></p>
      <p>This opens your email application. The website does not collect or transmit enquiry details.</p>
      <p>Do not send patient information, bank details, licences or confidential documents. Private applications and portal access require a separately verified invitation.</p>
      <a href="/legal/privacy/#business-enquiries">Business enquiry privacy information</a>
    </div>
  );
}
