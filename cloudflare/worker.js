const OWNER = "zongyou0530";
const REPO = "game-hub";
const ADMIN_ID = 250560159;
const FRONTEND = "https://zongyou0530.github.io";
const FILES = ["data/games.json", "data/videos.json", "data/profile.json", "data/logs.json"];
const SESSION_SECONDS = 3600;

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", ...headers } });
}
function cors(origin) {
  if (origin !== FRONTEND) return {};
  return { "Access-Control-Allow-Origin": FRONTEND, "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "Content-Type, Authorization", "Access-Control-Allow-Methods": "GET, PUT, POST, OPTIONS", "Vary": "Origin" };
}
function base64url(bytes) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function pemToPkcs8(pem) {
  const raw = Uint8Array.from(atob(pem.replace(/-----[^-]+-----/g, "").replace(/\s/g, "")), c => c.charCodeAt(0));
  if (pem.includes("BEGIN PRIVATE KEY")) return raw;
  // Wrap an RSA PKCS#1 key in the PKCS#8 PrivateKeyInfo envelope.
  const prefix = Uint8Array.from([0x02,0x01,0x00,0x30,0x0d,0x06,0x09,0x2a,0x86,0x48,0x86,0xf7,0x0d,0x01,0x01,0x01,0x05,0x00,0x04]);
  const len = raw.length;
  const length = len < 128 ? [len] : len < 256 ? [0x81, len] : [0x82, (len >> 8) & 255, len & 255];
  const body = new Uint8Array(prefix.length + length.length + len);
  body.set(prefix); body.set(length, prefix.length); body.set(raw, prefix.length + length.length);
  const total = body.length;
  const outerLen = total < 128 ? [total] : total < 256 ? [0x81, total] : [0x82, (total >> 8) & 255, total & 255];
  return Uint8Array.from([0x30, ...outerLen, ...body]);
}
async function appJwt(env) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(new TextEncoder().encode(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const payload = base64url(new TextEncoder().encode(JSON.stringify({ iat: now - 30, exp: now + 540, iss: env.GITHUB_APP_ID })));
  const input = header + "." + payload;
  const key = await crypto.subtle.importKey("pkcs8", pemToPkcs8(env.GITHUB_PRIVATE_KEY), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(input));
  return input + "." + base64url(signature);
}
async function installationToken(env) {
  const jwt = await appJwt(env);
  const r = await fetch(`https://api.github.com/app/installations/${env.GITHUB_INSTALLATION_ID}/access_tokens`, {
    method: "POST", headers: { Authorization: `Bearer ${jwt}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "Game-Hub" },
    body: JSON.stringify({ repositories: [REPO], permissions: { contents: "write", metadata: "read" } })
  });
  if (!r.ok) throw new Error("GitHub App installation token failed: " + await r.text());
  return (await r.json()).token;
}
async function githubApi(token, path, options = {}) {
  const r = await fetch("https://api.github.com" + path, { ...options, headers: { Authorization: "Bearer " + token, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "Game-Hub", ...(options.headers || {}) } });
  if (!r.ok) throw new Error("GitHub API " + r.status + ": " + await r.text());
  return r.status === 204 ? null : r.json();
}
function decodeContent(s) {
  return decodeURIComponent(escape(atob(s.replace(/\n/g, ""))));
}
function encodeContent(s) {
  return btoa(unescape(encodeURIComponent(s)));
}
async function getSession(request, env) {
  const token = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const key = "session:" + token;
  const raw = await env.SESSIONS.get(key);
  if (!raw) return null;
  const session = JSON.parse(raw);
  if (session.userId !== ADMIN_ID) return null;
  await env.SESSIONS.put(key, raw, { expirationTtl: SESSION_SECONDS });
  return session;
}
async function readFiles(env) {
  const token = await installationToken(env);
  const result = {};
  for (const path of FILES) {
    const file = await githubApi(token, `/repos/${OWNER}/${REPO}/contents/${path}?ref=main`);
    result[path.split("/").pop().replace(".json", "")] = JSON.parse(decodeContent(file.content));
  }
  return result;
}
async function writeFiles(env, data) {
  if (!data || !Array.isArray(data.games) || !Array.isArray(data.videos) || !Array.isArray(data.logs) || !data.profile || typeof data.profile !== "object") throw new Error("Invalid data payload");
  const token = await installationToken(env);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  // Create a complete backup set before changing any live data file.
  for (const path of FILES) {
    const old = await githubApi(token, `/repos/${OWNER}/${REPO}/contents/${path}?ref=main`);
    const backupPath = `backups/${stamp}/${path.split("/").pop()}`;
    await githubApi(token, `/repos/${OWNER}/${REPO}/contents/${backupPath}`, { method: "PUT", body: JSON.stringify({ message: `backup: ${stamp} ${path}`, content: old.content, branch: "main" }) });
  }
  for (const path of FILES) {
    const old = await githubApi(token, `/repos/${OWNER}/${REPO}/contents/${path}?ref=main`);
    const key = path.split("/").pop().replace(".json", "");
    await githubApi(token, `/repos/${OWNER}/${REPO}/contents/${path}`, { method: "PUT", body: JSON.stringify({ message: `Game Hub: update ${key} data`, content: encodeContent(JSON.stringify(data[key], null, 2) + "\n"), sha: old.sha, branch: "main" }) });
  }
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";
    const headers = cors(origin);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    try {
      if (url.pathname === "/health") return json({ ok: true, service: "game-hub-api" });
      if (url.pathname === "/auth/login") {
        const state = base64url(crypto.getRandomValues(new Uint8Array(32)));
        await env.SESSIONS.put("oauth:" + state, "1", { expirationTtl: 600 });
        const redirect = "https://github.com/login/oauth/authorize?" + new URLSearchParams({ client_id: env.GITHUB_CLIENT_ID, redirect_uri: url.origin + "/auth/callback", scope: "read:user", state });
        return Response.redirect(redirect, 302);
      }
      if (url.pathname === "/auth/callback") {
        const state = url.searchParams.get("state");
        if (!state || !(await env.SESSIONS.get("oauth:" + state))) return new Response("Invalid OAuth state", { status: 400 });
        await env.SESSIONS.delete("oauth:" + state);
        const tokenResponse = await fetch("https://github.com/login/oauth/access_token", { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" }, body: JSON.stringify({ client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET, code: url.searchParams.get("code") }) });
        const oauth = await tokenResponse.json();
        if (!oauth.access_token) return new Response("GitHub OAuth failed", { status: 401 });
        const userResponse = await fetch("https://api.github.com/user", { headers: { Authorization: "Bearer " + oauth.access_token, Accept: "application/vnd.github+json", "User-Agent": "Game-Hub" } });
        const user = await userResponse.json();
        if (user.id !== ADMIN_ID || user.login !== OWNER) return new Response("Access denied", { status: 403 });
        const sessionToken = base64url(crypto.getRandomValues(new Uint8Array(32)));
        await env.SESSIONS.put("session:" + sessionToken, JSON.stringify({ userId: user.id, login: user.login }), { expirationTtl: SESSION_SECONDS });
        return Response.redirect(FRONTEND + "/game-hub/#gh_session=" + sessionToken, 302);
      }
      if (url.pathname === "/auth/logout" && request.method === "POST") {
        const token = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
        if (token) await env.SESSIONS.delete("session:" + token);
        return json({ ok: true }, 200, headers);
      }
      if (url.pathname.startsWith("/api/")) {
        if (origin !== FRONTEND) return json({ error: "Origin not allowed" }, 403);
        const session = await getSession(request, env);
        if (!session) return json({ error: "Unauthorized" }, 401, headers);
        if (url.pathname === "/api/upload" && request.method === "POST") {
          const body = await request.json();
          const mime = String(body.content_type || "");
          const ext = ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" })[mime];
          if (!ext || typeof body.content !== "string" || body.content.length > 7_000_000) return json({ error: "Unsupported image or file too large (max 5 MB)" }, 400, headers);
          const folder = String(body.folder || "logs");
          const folderMap = { logs: "logs", covers: "covers", qrcodes: "qrcodes" };
          if (!Object.prototype.hasOwnProperty.call(folderMap, folder)) return json({ error: "Invalid upload folder" }, 400, headers);
          const original = String(body.name || "image").replace(/[^a-zA-Z0-9._-]/g, "-").slice(-70);
          const stamp = new Date().toISOString().replace(/[:.]/g, "-");
          const path = `assets/${folderMap[folder]}/${stamp}-${original.replace(/\.[^.]+$/, "")}.${ext}`;
          const token = await installationToken(env);
          await githubApi(token, `/repos/${OWNER}/${REPO}/contents/${path}`, { method: "PUT", body: JSON.stringify({ message: `Game Hub: upload ${folder} image ${original}`, content: body.content, branch: "main" }) });
          return json({ ok: true, path }, 200, headers);
        }
        if (url.pathname === "/api/me" && request.method === "GET") return json({ authenticated: true, login: session.login }, 200, headers);
        if (url.pathname === "/api/data" && request.method === "GET") return json(await readFiles(env), 200, headers);
        if (url.pathname === "/api/data" && request.method === "PUT") {
          const body = await request.json();
          await writeFiles(env, body);
          return json({ ok: true, backed_up: true }, 200, headers);
        }
      }
      return json({ error: "Not found" }, 404, headers);
    } catch (error) {
      return json({ error: error.message || "Internal error" }, 500, headers);
    }
  }
};