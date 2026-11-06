#!/usr/bin/env bash
set -euo pipefail
mkdir -p activation
printf 'endpoint\thttp_status\tcontent_type\tcurl_exit\tfinal_url\n' > activation/status.tsv
probe() {
  local name="$1" url="$2" status="unknown" ctype="unknown" final_url="unknown" rc=0
  curl --silent --show-error --location --max-time 14 --max-redirs 4 \
    -H 'Cache-Control: no-cache' \
    -D "activation/$name.headers" \
    -o "activation/$name.body" \
    -w '%{http_code}\t%{content_type}\t%{url_effective}' "$url" > "activation/$name.meta" 2>"activation/$name.stderr" || rc=$?
  if [[ -s "activation/$name.meta" ]]; then
    IFS=$'\t' read -r status ctype final_url < "activation/$name.meta" || true
  fi
  printf '%s\t%s\t%s\t%s\t%s\n' "$name" "$status" "$ctype" "$rc" "$final_url" >> activation/status.tsv
}
probe corporate-contact 'https://novapharmhealthcare.com/contact/'
probe corporate-portal 'https://novapharmhealthcare.com/portal/'
probe managed-portal 'https://portal.novapharmhealthcare.com/portal/'
probe managed-api 'https://api.novapharmhealthcare.com/api/health'
probe aws-staging-api 'https://y2sa7gga5i.execute-api.eu-north-1.amazonaws.com/health'
node --input-type=module <<'JS'
import { readFileSync, writeFileSync } from "node:fs";
const fs = path => readFileSync(path, "utf8");
const rows = fs("activation/status.tsv").trim().split("\n").slice(1).map(line => {
  const [name, http, contentType, curlExit, finalUrl] = line.split("\t");
  return { name, http: Number(http) || 0, contentType, curlExit: Number(curlExit), finalUrl };
});
function body(name) { try { return fs("activation/" + name + ".body"); } catch { return ""; } }
const contact = body("corporate-contact");
const portal = body("managed-portal");
const stage = body("aws-staging-api");
const checks = {
  publicContactPage200: rows.find(x => x.name === "corporate-contact")?.http === 200,
  publicContactManagedForm: /<form\b[^>]*data-contact-form/iu.test(contact) && !/does not collect or transmit enquiry details/iu.test(contact),
  managedPortalAvailable: rows.find(x => x.name === "managed-portal")?.http === 200,
  managedPortalLoginEvidenced: /sign in to your portal|login-form/iu.test(portal),
  liveApiAvailable: rows.find(x => x.name === "managed-api")?.http === 200,
  stagingSafe: /"live":false/.test(stage) && /"acceptingPublicSubmissions":false/.test(stage)
};
const status = { observedAt: new Date().toISOString(), endpoints: rows, checks, liveContactVerified: false, livePortalVerified: false };
writeFileSync("activation/summary.json", JSON.stringify(status, null, 2) + "\n");
console.log(JSON.stringify(status, null, 2));
if (!checks.stagingSafe) process.exitCode = 2;
JS
rm -f activation/*.body
