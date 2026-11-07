import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import type { Server } from "node:http";

process.env.NODE_ENV = "test";
process.env.SUPABASE_URL = "https://shared-test.supabase.co";
process.env.SUPABASE_ANON_KEY = "test-key";
process.env.CLIENT_ORIGIN = "https://triplounge-web.onrender.com";
process.env.NAVER_MAPS_API_KEY_ID = "test";
process.env.NAVER_MAPS_API_KEY = "test";

const originalFetch = globalThis.fetch;
const rpcCalls: { path: string; body: unknown }[] = [];
globalThis.fetch = async (input, init) => {
  if (!String(input).startsWith(process.env.SUPABASE_URL!)) {
    return originalFetch(input, init);
  }
  const body = JSON.parse(String(init?.body));
  rpcCalls.push({ path: String(input), body });
  const id = body.p_post_id;
  const post = { id, visibility: "PUBLIC", post_days: [{ title: "공유 일기", post_photos: [{ latitude: 35, longitude: 128 }] }] };
  if (id === 500) return new Response(JSON.stringify({ code: "PGRST202", message: "missing function" }), { status: 404 });
  return new Response(JSON.stringify(id === 404 ? null : id === 12 ? { ...post, visibility: "PRIVATE" } : post), {
    headers: { "Content-Type": "application/json" },
  });
};

let server: Server;
let base: string;
before(async () => {
  const { app } = await import("../src/app.js");
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  assert(address && typeof address !== "string");
  base = `http://127.0.0.1:${address.port}`;
});
after(async () => {
  globalThis.fetch = originalFetch;
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

test("anonymous reader gets public diary photos and coordinates through the read-only RPC", async () => {
  const response = await fetch(`${base}/posts/11`);
  assert.equal(response.status, 200);
  const reply = await response.json();
  assert.equal(reply.data.post_days[0].post_photos[0].latitude, 35);
  assert.match(rpcCalls.at(-1)!.path, /\/rpc\/get_shared_post$/);
  assert.deepEqual(rpcCalls.at(-1)!.body, { p_post_id: 11 });
});
test("private and missing posts both return 404", async () => {
  for (const id of [12, 404]) {
    const response = await fetch(`${base}/posts/${id}`);
    assert.equal(response.status, 404);
    assert.equal((await response.json()).error.code, "POST_NOT_FOUND");
  }
});
test("invalid IDs never query the database", async () => {
  const count = rpcCalls.length;
  for (const id of ["0", "-1", "1.5", "1e2", "abc", "9007199254740992"]) {
    assert.equal((await fetch(`${base}/posts/${id}`)).status, 400);
  }
  assert.equal(rpcCalls.length, count);
});
test("write routes and list route are unavailable and never call Supabase", async () => {
  const count = rpcCalls.length;
  for (const [method, path] of [["POST", "/posts"], ["POST", "/posts/images"], ["PATCH", "/posts/11"], ["DELETE", "/posts/11"], ["GET", "/posts"]]) {
    assert.equal((await fetch(base + path, { method })).status, 404);
  }
  assert.equal(rpcCalls.length, count);
});
test("database setup errors remain errors instead of reporting a missing diary", async () => {
  const response = await fetch(`${base}/posts/500`);
  assert.equal(response.status, 500);
  assert.equal((await response.json()).error.code, "POST_READ_FAILED");
});
