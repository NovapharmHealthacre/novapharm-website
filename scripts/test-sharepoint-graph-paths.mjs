import assert from "node:assert/strict";
import test from "node:test";
import { GraphClient, encodeSafeSharePointPath, safeSharePointNextPagePath } from "../src/integrations/sharepoint/graph-client.mjs";

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


test("folder discovery reads a second page before POST", async () => {
  const client = new GraphClient({});
  const calls = [];
  const prefix = "/drives/driveA/items/root/children";
  client.request = async (path, options) => {
    calls.push({ path, method: options?.method });
    if (path === prefix + "?$select=id,name,folder,webUrl") {
      return {
        value: Array.from({length: 200}, (_, i) => ({id: "item-" + i, name: "Other " + i, folder: {}})),
        "@odata.nextLink": "https://graph.microsoft.com/v1.0/drives/driveA/items/root/children?$skiptoken=page2"
      };
    }
    if (path === prefix + "?$skiptoken=page2") {
      return {value: [{id: "found-page-2", name: "Research", folder: {}}]};
    }
    throw new Error("Unexpected stub request: " + path);
  };
  const found = await client.ensureFolder("driveA", "research");
  assert.equal(found.id, "found-page-2");
  assert.equal(calls.length, 2);
  assert.equal(calls.filter(c => c.method === "POST").length, 0);
});

test("continuation remains on the exact Graph origin, drive and item", () => {
  const endpoint = "/drives/driveA/items/root/children";
  assert.equal(safeSharePointNextPagePath(
    "https://graph.microsoft.com/v1.0/drives/driveA/items/root/children?$skiptoken=a%2Fb",
    endpoint), endpoint + "?$skiptoken=a%2Fb");
  const invalid = [
    "https://graph.microsoft.com.evil.test/v1.0/drives/driveA/items/root/children?$skiptoken=a",
    "https://evil.test/v1.0/drives/driveA/items/root/children?$skiptoken=a",
    "http://graph.microsoft.com/v1.0/drives/driveA/items/root/children?$skiptoken=a",
    "https://graph.microsoft.com/v1.0/drives/other/items/root/children?$skiptoken=a",
    "https://graph.microsoft.com/v1.0/drives/driveA/items/other/children?$skiptoken=a",
    "https://graph.microsoft.com/v1.0/me/drive/root/children?$skiptoken=a",
    "https://graph.microsoft.com/v1.0/drives/driveA/items/root/children",
    "https://graph.microsoft.com/v1.0/drives/driveA/items/root/children?$skiptoken=a#fragment",
    "/v1.0/drives/driveA/items/root/children?$skiptoken=a",
    null, "x".repeat(16385)
  ];
  for (const link of invalid) {
    assert.throws(() => safeSharePointNextPagePath(link, endpoint),
      error => error.code === "sharepoint_pagination_invalid");
  }
});

test("repeated continuation fails closed without creating a folder", async () => {
  const client = new GraphClient({});
  let calls = 0;
  client.request = async (_path, options) => {
    assert.notEqual(options?.method, "POST");
    calls += 1;
    return {value: [], "@odata.nextLink":
      "https://graph.microsoft.com/v1.0/drives/driveA/items/root/children?$skiptoken=repeat"};
  };
  await assert.rejects(() => client.ensureFolder("driveA", "Missing"),
    error => error.code === "sharepoint_pagination_invalid");
  assert.equal(calls, 2);
});

test("pagination limit fails closed before creating a folder", async () => {
  const client = new GraphClient({});
  let pages = 0;
  client.request = async (_path, options) => {
    assert.notEqual(options?.method, "POST");
    pages += 1;
    return {value: [], "@odata.nextLink":
      "https://graph.microsoft.com/v1.0/drives/driveA/items/root/children?$skiptoken=" + pages};
  };
  await assert.rejects(() => client.ensureFolder("driveA", "Missing"),
    error => error.code === "sharepoint_pagination_limit");
  assert.equal(pages, 25);
});

test("malformed page response cannot trigger a folder creation", async () => {
  const client = new GraphClient({});
  client.request = async (_path, options) => {
    assert.notEqual(options?.method, "POST");
    return {unknown: []};
  };
  await assert.rejects(() => client.ensureFolder("driveA", "Missing"),
    error => error.code === "sharepoint_pagination_invalid");
});


test("secure-content child listing collects all pages before returning", async () => {
  const client = new GraphClient({});
  const requests = [];
  client.request = async (path, options) => {
    assert.notEqual(options?.method, "POST");
    requests.push(path);
    if (path.includes("?$select=")) {
      return {
        value: Array.from({length: 200}, (_, i) => ({
          id: "item-" + i, name: "Document " + i + ".pdf", file: {}
        })),
        "@odata.nextLink": "https://graph.microsoft.com/v1.0/drives/driveA/root:/NovaPharm%20Digital%20Ecosystem:/children?$skiptoken=page2"
      };
    }
    if (path.endsWith("?$skiptoken=page2")) {
      return {value: [{id: "item-201", name: "Final.pdf", file: {}}]};
    }
    throw new Error("Unexpected request " + path);
  };
  const result = await client.listFolderChildren("driveA", "NovaPharm Digital Ecosystem");
  assert.equal(result.value.length, 201);
  assert.equal(result.value[200].name, "Final.pdf");
  assert.equal(requests.length, 2);
});

test("secure-content listing rejects foreign, repeated and malformed continuation", async () => {
  const invalid = [
    "https://attacker.test/v1.0/drives/driveA/root/children?$skiptoken=1",
    "https://graph.microsoft.com/v1.0/drives/other/root/children?$skiptoken=1",
    "", 12
  ];
  for (const link of invalid) {
    const client = new GraphClient({});
    let count = 0;
    client.request = async (_path, options) => {
      assert.notEqual(options?.method, "POST");
      count += 1;
      return {value: [], "@odata.nextLink": link};
    };
    await assert.rejects(() => client.listFolderChildren("driveA", ""),
      err => err.code === "sharepoint_pagination_invalid");
    assert.equal(count, 1);
  }
  const cyclic = new GraphClient({});
  let count = 0;
  cyclic.request = async () => {
    count += 1;
    return {value: [], "@odata.nextLink":
      "https://graph.microsoft.com/v1.0/drives/driveA/root/children?$skiptoken=again"};
  };
  await assert.rejects(() => cyclic.listFolderChildren("driveA", ""),
    err => err.code === "sharepoint_pagination_invalid");
  assert.equal(count, 2);
});

test("secure-content listing rejects page overrun rather than silently returning partial data", async () => {
  const client = new GraphClient({});
  let count = 0;
  client.request = async () => {
    count += 1;
    return {value: [], "@odata.nextLink":
      "https://graph.microsoft.com/v1.0/drives/driveA/root/children?$skiptoken=" + count};
  };
  await assert.rejects(() => client.listFolderChildren("driveA", ""),
    err => err.code === "sharepoint_pagination_limit");
  assert.equal(count, 25);
});
