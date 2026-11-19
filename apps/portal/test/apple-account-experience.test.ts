import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const source = (file: string) => readFileSync(path.join(process.cwd(), file), "utf8");

test("every governed portal login and landing view has optional, actionable account help", () => {
  const guidance = source("components/account-access-help.tsx");
  const login = source("components/login-panel.tsx");
  const intelligence = source("components/intelligence-sign-in.tsx");
  const dashboard = source("components/dashboard.tsx");
  for (const audience of ["customer", "employee", "board", "admin", "intelligence"]) {
    assert.match(guidance, new RegExp(audience + ": \\{"));
  }
  assert.match(guidance, /<details className="account-access-help">/);
  assert.match(guidance, /<summary>/);
  assert.match(guidance, /authenticated \? guide\.after : guide\.before/);
  assert.match(guidance, /account-application/);
  assert.match(guidance, /legal\/privacy/);
  assert.match(login, /<AccountAccessHelp audience=\{accessType\}/);
  assert.match(intelligence, /<AccountAccessHelp audience="intelligence"/);
  assert.match(dashboard, /<AccountAccessHelp\s+audience=\{module\.area === "executive" \? "board" : module\.area\}/);
  assert.match(dashboard, /replay=\{module\.route !== areaLandingRoutes\[module\.area\]\}/);
  assert.doesNotMatch(dashboard, /user && snapshot && module\.route === areaLandingRoutes/);
  assert.match(dashboard, /guidance is rendered immediately/);
});

test("protected account and help routes replay onboarding without granting access", () => {
  const dashboard = source("components/dashboard.tsx");
  const guidance = source("components/account-access-help.tsx");
  for (const code of [
    "customer.account", "customer.settings", "customer.support",
    "employee.administration", "executive.command-centre",
  ]) {
    assert.ok(dashboard.includes('"' + code + '"'), code + " must offer optional help replay");
  }
  assert.match(dashboard, /\.includes\(module\.code\)/);
  assert.match(dashboard, /guidance is rendered immediately/);
  assert.match(guidance, /replay \? "Review account access and onboarding"/);
  assert.match(guidance, /authenticated \? guide\.after : guide\.before/);
  assert.doesNotMatch(guidance, /localStorage|sessionStorage|navigator\.credentials/);
  assert.doesNotMatch(dashboard, /user && snapshot && module\.route === areaLandingRoutes/);
});

test("password entry supports credential managers and accessible show-hide without browser persistence", () => {
  const login = source("components/login-panel.tsx");
  const intelligence = source("components/intelligence-sign-in.tsx");
  const css = source("app/globals.css");
  assert.match(login, /autoComplete="username"/);
  assert.match(login, /autoComplete="current-password"/);
  assert.match(login, /type=\{showPassword \? "text" : "password"\}/);
  assert.match(login, /aria-pressed=\{showPassword\}/);
  assert.match(login, /aria-label=\{showPassword \? "Hide password" : "Show password"\}/);
  assert.match(login, /\{busy \? "Signing in…" : "Sign in"\}/);
  assert.match(login, /Sign in to the right workspace/);
  assert.match(intelligence, /autoComplete="one-time-code"/);
  assert.match(intelligence, /autoComplete="current-password"/);
  assert.match(css, /\.login-password-field > button:focus-visible/);
  assert.doesNotMatch([login, intelligence].join("\n"), /localStorage|sessionStorage/);
});

test("Apple identity and passkeys are not advertised before their verified backend exists", () => {
  const login = source("components/login-panel.tsx");
  const intelligence = source("components/intelligence-sign-in.tsx");
  const help = source("components/account-access-help.tsx");
  assert.doesNotMatch([login, intelligence, help].join("\n"), /appleid-signin|navigator\.credentials\.create|navigator\.credentials\.get/);
  assert.match(intelligence, /completeCognitoCardSignIn/);
  assert.match(intelligence, /\/auth\/customer\/start/);
  assert.match(login, /protectedMutation/);
  assert.match(login, /result\.accessType !== accessType/);
  assert.match(help, /server-side scope/);
});
