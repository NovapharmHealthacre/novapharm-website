/**
 * Source-only census of every repository workflow capable of GitHub Pages
 * deployment. Prevents new unreviewed Pages publishers from silently entering
 * the estate. Only detects declared YAML and obvious shell references: never
 * claims administrator branch rules, runtime dispatch or native/HIG approval.
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const reviewedPagesPublishers = Object.freeze([
  "pages-live-publish.yml",
  "pages-public-release-recovery.yml",
  "publish-aws-contact-production.yml"
]);

export function sourceCommands(yaml) {
  assert.equal(typeof yaml,"string","Workflow YAML source required");
  return yaml.split(/\r?\n/).filter(line=>!/^\s*#/.test(line))
    .map(line=>line.replace(/\s+#(?=\s|$).*$/, ""))
    .join("\n");
}

export function classifyWorkflow(name, yaml) {
  assert.match(name, /^[a-z0-9._-]+\.ya?ml$/i);
  const source=sourceCommands(yaml);
  const deployPages=/^\s*(?:-\s*)?uses:\s*actions\/deploy-pages@/m.test(source);
  const uploadPages=/^\s*(?:-\s*)?uses:\s*actions\/upload-pages-artifact@/m.test(source);
  const pagesWrite=/^\s*pages:\s*write\s*$/m.test(source);
  const directRefPush=/\bgit\s+push\b[^\n]*(?:gh-pages|refs\/heads\/gh-pages)/i.test(source);
  const ghRefMutation=/\bgh\s+api\b[^\n]*(?:--method\s+(?:POST|PUT|PATCH)|-X\s+(?:POST|PUT|PATCH))[^\n]*(?:\/git\/refs|\/git\/ref\/heads\/gh-pages|\/contents\/)/i.test(source);
  const otherPagesPublisher=/\b(?:npx\s+gh-pages|wrangler\s+pages\s+deploy|gh-pages\s+-d)\b/i.test(source);
  const allowed=reviewedPagesPublishers.includes(name);
  const issues=[];
  if(deployPages && !allowed) issues.push("Unreviewed Pages deployment action");
  if(uploadPages && !allowed) issues.push("Unreviewed Pages artifact publisher");
  if(pagesWrite && !allowed) issues.push("Unreviewed GitHub Pages write permission");
  if(directRefPush || ghRefMutation || otherPagesPublisher)
    issues.push("Unreviewed direct public branch or Pages publication command");
  if(allowed && (!deployPages || !uploadPages || !pagesWrite))
    issues.push("Reviewed publisher signature changed; re-approve publishing topology");
  // The two recovery workflows allow pull_request checks but must not permit
  // untrusted candidate validation to inherit Pages, status or OIDC write.
  if(["pages-live-publish.yml","pages-public-release-recovery.yml"].includes(name)){
    const start=source.indexOf("  validate-release:\n");
    const end=source.indexOf("  build:\n",start);
    const candidate=start>=0 && end>start ? source.slice(start,end) : "";
    if(!/^\s{4}permissions:\n\s{6}contents:\s*read\s*$/m.test(candidate))
      issues.push("Pull request validation lacks explicit read-only job permissions");
    if(/^\s{6}(?:pages|id-token|statuses):\s*write\s*$/m.test(candidate))
      issues.push("Pull request validation retains privileged write permissions");
  }
  return {workflow:name,allowedPublisher:allowed,deployPages,uploadPages,pagesWrite,
    directRefPush,ghRefMutation,otherPagesPublisher,issues};
}

export function auditWorkflowFiles(workflows){
  assert.ok(Array.isArray(workflows) && workflows.length>=1);
  const seen=new Set();
  const rows=workflows.map(entry=>{
    if(seen.has(entry.name)) throw new Error("Duplicate workflow name: "+entry.name);
    seen.add(entry.name);
    return classifyWorkflow(entry.name,entry.yaml);
  });
  for(const name of reviewedPagesPublishers)
    if(!seen.has(name)) throw new Error("Reviewed Pages publisher missing: "+name);
  return {
    schema:"novapharm.github-pages-deployment-entrances.v1",
    level:"source workflow topology only; not branch enforcement or production/Apple HIG signoff",
    workflowsScanned:rows.length,
    reviewedPagesPublisherCount:rows.filter(x=>x.allowedPublisher).length,
    unreviewedPotentialPagesPublishers:rows.filter(x=>!x.allowedPublisher &&
      (x.deployPages || x.uploadPages || x.pagesWrite ||
       x.directRefPush || x.ghRefMutation || x.otherPagesPublisher)).length,
    violations:rows.filter(x=>x.issues.length).length,
    workflows:rows
  };
}

export function auditRepositoryWorkflows(root=".github/workflows"){
  const files=readdirSync(root).filter(x=>/\.ya?ml$/i.test(x)).sort();
  assert.ok(files.length>=200,"Workflow inventory unexpectedly reduced; reviewer must assess publisher removal");
  return auditWorkflowFiles(files.map(name=>({name,yaml:readFileSync(resolve(root,name),"utf8")})));
}

if(process.argv[1] && fileURLToPath(import.meta.url)===resolve(process.argv[1])){
  const result=auditRepositoryWorkflows();
  const summary={
    checked:result.workflowsScanned,
    allowed:result.reviewedPagesPublisherCount,
    unreviewed:result.unreviewedPotentialPagesPublishers,
    violations:result.violations
  };
  console.log(JSON.stringify(summary));
  if(result.violations){
    console.error(JSON.stringify(result.workflows.filter(w=>w.issues.length)
      .map(w=>({workflow:w.workflow,issues:w.issues}))));
    process.exitCode=1;
  }
}
