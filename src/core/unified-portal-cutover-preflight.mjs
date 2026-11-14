/**
 * NovaPharm unified portal production release — evidence-only cutover preflight.
 *
 * This pure validator never deploys, remaps DNS, provisions a resource, or
 * issues a release authorization. Each "true" evidence signal must come from
 * an independently reviewed production observation, not an application caller.
 * The final cutover requires a separately signed change approval and operator.
 */
export const UNIFIED_PORTAL_HOST = "portal.novapharmhealthcare.com";
export const INTELLIGENCE_HOST = "intelligence.novapharmhealthcare.com";
export const EXPECTED_WORKSPACES = Object.freeze([
  Object.freeze({role:"customer",path:"/portal/dashboard/"}),
  Object.freeze({role:"employee",path:"/employee/dashboard/"}),
  Object.freeze({role:"board",path:"/portal/executive-platform/"}),
  Object.freeze({role:"admin",path:"/admin/dashboard/"})
]);
const SHA=/^[a-f0-9]{40}$/u;
const DIGEST=/^sha256:[a-f0-9]{64}$/u;
const WINDOW_MS=30*60*1000;
const approval=x=>x?.independentlyVerified===true && x?.approved===true &&
  typeof x?.decisionId==="string" && /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/u.test(x.decisionId);
const passed=x=>x===true;

/**
 * A positive result means the packet is complete enough for a human to
 * consider a cutover. It is NEVER a deployment authorization or an assertion
 * that a public production route is currently active.
 */
export function assessUnifiedPortalCutover(packet,{now=Date.now()}={}){
  const problems=[];
  const requireEvidence=(condition,code)=>{if(!condition)problems.push(code);};
  if(packet===null || typeof packet!=="object" || Array.isArray(packet)){
    return Object.freeze({
      contract:"novapharm.portal.cutover-preflight.v1",
      evidenceComplete:false,
      deploymentAuthorised:false,productionLiveVerified:false,
      requiresSeparateHumanChangeApproval:true,
      blockers:Object.freeze(["missing_trusted_release_packet"])
    });
  }
  const observedAt=typeof packet.observedAt==="string"?Date.parse(packet.observedAt):NaN;
  requireEvidence(Number.isFinite(now)&&Number.isFinite(observedAt)&&
    new Date(observedAt).toISOString()===packet.observedAt&&
    observedAt<=now && now-observedAt<=WINDOW_MS,"stale_or_invalid_observation");
  requireEvidence(packet.contract==="novapharm.portal.cutover-evidence.v1","unexpected_packet_contract");
  requireEvidence(packet.expectedHost===UNIFIED_PORTAL_HOST,"incorrect_canonical_hostname");

  // A root HTTP 200 from Nutraxin staging is NOT proof of a unified portal.
  const ingress=packet.candidateIngress;
  requireEvidence(ingress?.app==="novapharm_unified_portal" &&
    typeof ingress?.apiId==="string" && ingress.apiId.length>3 &&
    ingress.apiId!==packet.stagingNutraxinApiId &&
    ingress.apiId!==packet.intelligenceApiId &&
    ingress?.authenticatedWorkspaceRouting===true &&
    ingress?.defaultAnonymousModuleAccess===false,
  "missing_independent_authenticated_ingress");

  const runtime=packet.runtime;
  requireEvidence(runtime?.enabled===true &&
    Number.isInteger(runtime?.desiredTasks)&&runtime.desiredTasks>0 &&
    Number.isInteger(runtime?.runningTasks)&&runtime.runningTasks>=runtime.desiredTasks &&
    runtime?.healthyTargetCheck===true &&
    typeof runtime?.sourceCommit==="string" && SHA.test(runtime.sourceCommit) &&
    runtime?.sourceCommit===runtime?.imageRevision &&
    typeof runtime?.imageDigest==="string" && DIGEST.test(runtime.imageDigest),
  "unaccepted_immutable_private_runtime");

  const session=packet.sessionBackend;
  requireEvidence(session?.enabled===true &&
    session?.durableAuthoritativeStorage===true &&
    session?.sessionRevocationVerified===true &&
    session?.crossTenantDenied===true &&
    session?.auditCommitVerified===true,
  "missing_authoritative_session_backend");

  const identity=packet.identity;
  requireEvidence(identity?.mfaPositiveAndNegativeTested===true &&
    identity?.sessionCookieHostScoped===true &&
    identity?.csrfDenied===true &&
    Array.isArray(identity?.approvedCallbackUrls) &&
    identity.approvedCallbackUrls.includes(`https://${UNIFIED_PORTAL_HOST}/auth/callback`) &&
    !identity.approvedCallbackUrls.some(url=>typeof url!=="string" || !url.startsWith("https://")),
  "portal_domain_identity_not_accepted");

  const workspaces=packet.workspaceTests;
  requireEvidence(Array.isArray(workspaces) &&
    workspaces.length===EXPECTED_WORKSPACES.length &&
    EXPECTED_WORKSPACES.every(expected=>workspaces.some(x=>
      x?.role===expected.role && x?.path===expected.path &&
      x?.authorisedSessionSucceeded===true &&
      x?.anonymousDenied===true &&
      x?.wrongRoleDenied===true &&
      x?.crossTenantDenied===true)),
  "four_role_workspace_acceptance_missing");

  requireEvidence(packet.nutraxinPreservation?.stagingOrderingRetained===true &&
    packet.nutraxinPreservation?.existingUsersAndOrdersProtected===true &&
    packet.nutraxinPreservation?.independentFallbackRouteProved===true,
  "nutraxin_ordering_preservation_unverified");
  requireEvidence(packet.rollback?.originalMappingRecorded===true &&
    packet.rollback?.rollbackDrillPassed===true &&
    packet.rollback?.operatorAssigned===true,
  "domain_cutover_rollback_missing");

  requireEvidence(approval(packet.financeDecision),"infrastructure_budget_unapproved");
  requireEvidence(approval(packet.securityDecision),"security_acceptance_missing");
  requireEvidence(approval(packet.ownerChangeDecision),"owner_change_approval_missing");

  // Portal may launch only as a bounded non-medicine, non-commerce pilot
  // unless those separate regulators and commercial owners approve release.
  requireEvidence(packet.medicineDataAdmissionEnabled===false &&
    packet.customerBillingEnabled===false &&
    packet.nativeVendorConnectionsEnabled===false,
  "prohibited_data_vendor_or_billing_activation");

  const unique=Object.freeze([...new Set(problems)]);
  return Object.freeze({
    contract:"novapharm.portal.cutover-preflight.v1",
    evidenceComplete:unique.length===0,
    deploymentAuthorised:false,
    productionLiveVerified:false,
    requiresSeparateHumanChangeApproval:true,
    blockers:unique
  });
}
