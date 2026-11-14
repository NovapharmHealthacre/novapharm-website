/**
 * Owner-approved NovaPharm Intelligence commercial offer.
 *
 * Public pricing is informational until independently verified customer
 * onboarding, source-rights admission, Stripe lifecycle and trial gates
 * have been enabled in production. Do not derive an access grant from
 * these marketing values.
 */
export const intelligenceTrialOffer = Object.freeze({
  label: "Starter free trial",
  durationDays: 30,
  totalSearches: 25,
  searchUnit: "governed medicine searches",
  onePerVerifiedOrganisation: true,
  paymentCardRequired: false,
  automaticPaidConversion: false,
  priceGBP: 0,
  customerEnrollmentLive: false,
});

export const intelligencePaidPlans = Object.freeze([
  {
    code: "starter",
    label: "Starter",
    monthlyPriceGBP: 199,
    startingAt: false,
    description: "A focused entry point to governed medicines intelligence.",
    accessNote: "Available only after customer and source-rights approval.",
  },
  {
    code: "professional",
    label: "Professional",
    monthlyPriceGBP: 699,
    startingAt: false,
    description: "A broader plan for professional research and analysis.",
    accessNote: "Features depend on approved sources and verified entitlements.",
  },
  {
    code: "enterprise",
    label: "Enterprise",
    monthlyPriceGBP: 2799,
    startingAt: true,
    description: "Contract-led access for organisations with larger requirements.",
    accessNote: "Scope, service terms and final price are agreed by contract.",
  },
] as const);

export const intelligencePricingLaunchNotice =
  "The offer and pricing are approved. New customer trial registration and paid checkout are not yet open. Enrolment will begin only after identity, source-rights, security, billing and production acceptance.";
