/**
 * Optional, contextual account guidance. No authentication, provisioning, or
 * session state is inferred from this purely instructional disclosure.
 * Only existing routes or public information pages are linked.
 */
export type AccountAudience = "customer" | "employee" | "board" | "admin" | "intelligence";

type Guide = Readonly<{
  reason: string;
  before: readonly string[];
  after: readonly string[];
  accessHref?: string;
  accessLabel?: string;
}>;

const guides: Readonly<Record<AccountAudience, Guide>> = {
  customer: {
    reason: "A verified business account is needed for customer-specific pricing, documents, order requests and financial records. You can explore public information without signing in.",
    before: [
      "Explore products and services on the public NovaPharm website.",
      "Apply for a business account. NovaPharm reviews the application before granting access.",
      "Once approved, sign in to the Customer workspace with your assigned credentials.",
    ],
    after: [
      "Open My Products to explore the catalogue available to your business.",
      "Use My Account and Documents for approved profile and commercial records.",
      "Check your account permissions before requesting orders or changes.",
    ],
    accessHref: "https://novapharmhealthcare.com/account-application/",
    accessLabel: "Apply for a business account",
  },
  employee: {
    reason: "Employee access protects operational, customer and distribution information. Your administrator must assign the correct role.",
    before: [
      "Use the credentials provided through your company onboarding.",
      "Choose Employee; access is checked against your assigned server-side scope.",
      "Contact your administrator if your invitation or permissions are missing.",
    ],
    after: [
      "Start with the operations overview and your assigned modules.",
      "Follow the approval and quality checks shown in each workflow.",
      "Sign out when you finish on a shared device.",
    ],
  },
  board: {
    reason: "Board access contains confidential company information and is available only to approved directors and delegates.",
    before: [
      "Use your individually assigned identity rather than a shared account.",
      "Select Board to request the appropriate, independently verified scope.",
      "Contact the authorised administrator if access is unavailable.",
    ],
    after: [
      "Review the executive overview before opening a specialist module.",
      "Check evidence states and source notes before acting on a report.",
      "Use only the permissions assigned to your identity.",
    ],
  },
  admin: {
    reason: "Administrator access is restricted because it can affect identities, permissions and regulated operations.",
    before: [
      "Use only your issued administrator identity.",
      "Select Administrator; the server validates your role and session.",
      "Contact an authorised administrator for account recovery or activation.",
    ],
    after: [
      "Review your authorised administration modules and their permissions.",
      "Apply least-privilege and approval checks to account changes.",
      "Sign out when finished, especially on shared devices.",
    ],
  },
  intelligence: {
    reason: "An approved Intelligence account is required for private research workspaces. Browsing the public platform, workspaces and data descriptions does not require an account.",
    before: [
      "Explore the public Intelligence platform before creating an account.",
      "Create a business identity or sign in with Cognito; complete its required authenticator verification.",
      "Workspace access depends on separate business approval and data rights.",
    ],
    after: [
      "Review your verified seat and plan.",
      "Open only the workspaces released to your business account.",
      "Respect dataset source rights and use the account help links as needed.",
    ],
    accessHref: "/auth/customer/register",
    accessLabel: "Create a business identity",
  },
};

export function AccountAccessHelp({
  audience,
  authenticated = false,
}: Readonly<{ audience: AccountAudience; authenticated?: boolean }>) {
  const guide = guides[audience];
  return (
    <details className="account-access-help">
      <summary>{authenticated ? "Getting started in this workspace" : "New here? How account access works"}</summary>
      <div className="account-access-help-body">
        <p>{authenticated
          ? "Optional tips for your current workspace. You can keep working without completing a tutorial."
          : guide.reason}</p>
        <ol>
          {(authenticated ? guide.after : guide.before).map((step) => <li key={step}>{step}</li>)}
        </ol>
        <div className="account-access-help-links">
          {!authenticated && guide.accessHref ? <a href={guide.accessHref}>{guide.accessLabel}</a> : null}
          <a href="https://novapharmhealthcare.com/trust-centre/">Security and trust</a>
          <a href="https://novapharmhealthcare.com/legal/privacy/">Privacy information</a>
        </div>
      </div>
    </details>
  );
}
