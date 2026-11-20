import assert from "node:assert/strict";
import test from "node:test";
import { GraphClient, encodeSafeSharePointPath } from "../src/integrations/sharepoint/graph-client.mjs";

const INVALID_PATHS = [
  "", "/", "/root", "root/", "root//child", ".", "..", "root/..",
  "root/.", "root/%2e%2e", "root/a%2Fb", "root/a\b", "root/a\0b",
  "root/trailing.", "root/ whitespace ", "root/a#b", "root/a?b",
  "root/a:b", "root/a\\b", "root/a".repeat(150)
];

test("path encoder preserves distinct valid folders, encoding each segment", () => {
  assert.equal(encodeSafeSharePointPath("NovaPharm Digital Ecosystem/Engineering Verification"),
    "NovaPharm%20Digital%20Ecosystem/Engineering%20Verification");
  assert.equal(encodeSafeSharePointPath("Δοκιμή/研究"), "%CE%94%CE%BF%CE%BA%CE%B9%CE%BC%CE%AE/%E7%A0%94%E7%A9%B6");
  assert.equal(encodeSafeSharePointPath("", { allowRoot: true }), "");
});

test("path encoder denies traversal, delimiter injection, controls and nonstrings", () => {
  for (const path of [...INVALID_PATHS, null, undefined, 45, {}, []]) {
    assert.throws(() => encodeSafeSharePointPath(path), (error) =>
      error instanceof TypeError && error.code === "sharepoint_invalid_path",
      String(path));
  }
});

test("unsafe file names are refused BEFORE any Graph request", async () => {
  const client = new GraphClient({});
  let calls = 0;
  client.request = async () => { calls++; return { id: "item" }; };
  for (const fileName of ["", ".", "..", "../cross.txt", "prefix/other.txt", "data?.txt",
    "data%.txt", "data#.txt", "doc.", " doc.txt", "doc.txt ", "x".repeat(256)]) {
    await assert.rejects(() =>
      client.uploadSmallFile("drive", "NovaPharm Digital Ecosystem", fileName, new Uint8Array(0)),
      (error) => error.code === "sharepoint_invalid_path");
  }
  for (const folderPath of ["", "../other", "a//b", "a/%2f/b"]) {
    await assert.rejects(() =>
      client.uploadSmallFile("drive", folderPath, "safe.txt", new Uint8Array(0)),
      (error) => error.code === "sharepoint_invalid_path");
  }
  assert.equal(calls, 0);
});

test("unsafe folder creation and listing are refused before Graph calls", async () => {
  const client = new GraphClient({});
  let calls = 0;
  client.request = async () => { calls++; return { value: [] }; };
  for (const path of ["../folder", "a//b", "folder\\next", "folder/..", "folder/%2e"]) {
    await assert.rejects(() => client.ensureFolder("drive", path),
      (error) => error.code === "sharepoint_invalid_path");
    await assert.rejects(() => client.listFolderChildren("drive", path),
      (error) => error.code === "sharepoint_invalid_path");
  }
  assert.equal(calls, 0);
});

test("valid file upload keeps the established Graph path and does not access credentials in offline test", async () => {
  const requests = [];
  const client = new GraphClient({});
  client.request = async (path, options) => {
    requests.push({ path, method: options?.method });
    return { id: "new-item" };
  };
  await client.uploadSmallFile("driveA", "NovaPharm Digital Ecosystem/Engineering Verification",
    "audit v1.txt", new Uint8Array([97]), "text/plain");
  assert.deepEqual(requests, [{
    path: "/drives/driveA/root:/NovaPharm%20Digital%20Ecosystem/Engineering%20Verification/audit%20v1.txt:/content",
    method: "PUT"
  }]);
  requests.length = 0;
  await client.listFolderChildren("driveA", "");
  assert.equal(requests[0].path,
    "/drives/driveA/root/children?$select=id,name,size,file,folder,eTag,lastModifiedDateTime,webUrl");
});
