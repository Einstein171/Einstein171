import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pg from "pg";
import { execFileSync } from "node:child_process";
import fs from "node:fs";

dotenv.config();

const { Pool } = pg;
const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "change-this-secret-in-production";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/einstein",
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

app.use(express.json({ limit: "1mb" }));

async function db(query, params = []) {
  const result = await pool.query(query, params);
  return result.rows;
}

async function initDb() {
  await db(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(180) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'user',
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const adminEmail = (process.env.ADMIN_EMAIL || "admin@einsteineditaveis.com").toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || "TroqueEssaSenha123!";
  const existing = await db("SELECT id FROM users WHERE email = $1", [adminEmail]);

  if (!existing.length) {
    const hash = await bcrypt.hash(adminPassword, 12);
    await db(
      "INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, 'admin')",
      ["Administrador", adminEmail, hash]
    );
    console.log(`Admin criado: ${adminEmail}`);
  }
}

function signUser(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Não autenticado." });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Sessão expirada. Entre novamente." });
  }
}

function adminOnly(req, res, next) {
  if (req.user?.role !== "admin") return res.status(403).json({ error: "Acesso restrito ao administrador." });
  next();
}

app.get("/api/health", (_req, res) => res.json({ ok: true, app: "EinsteinEditaveis" }));

app.post("/api/auth/register", async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (name.length < 2) return res.status(400).json({ error: "Informe seu nome." });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: "E-mail inválido." });
    if (password.length < 6) return res.status(400).json({ error: "A senha precisa ter pelo menos 6 caracteres." });

    const exists = await db("SELECT id FROM users WHERE email = $1", [email]);
    if (exists.length) return res.status(409).json({ error: "Este e-mail já está cadastrado." });

    const hash = await bcrypt.hash(password, 12);
    const rows = await db(
      "INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email, role, active, created_at",
      [name, email, hash]
    );

    const user = rows[0];
    res.status(201).json({ user, token: signUser(user) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Não foi possível criar a conta." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    const rows = await db("SELECT * FROM users WHERE email = $1", [email]);
    const user = rows[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: "E-mail ou senha incorretos." });
    }
    if (!user.active) return res.status(403).json({ error: "Sua conta está desativada." });

    const safeUser = {
      id: user.id, name: user.name, email: user.email,
      role: user.role, active: user.active, created_at: user.created_at
    };
    res.json({ user: safeUser, token: signUser(safeUser) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao entrar." });
  }
});

app.get("/api/me", auth, async (req, res) => {
  const rows = await db(
    "SELECT id, name, email, role, active, created_at FROM users WHERE id = $1",
    [req.user.id]
  );
  if (!rows[0] || !rows[0].active) return res.status(401).json({ error: "Usuário indisponível." });
  res.json({ user: rows[0] });
});

app.get("/api/admin/stats", auth, adminOnly, async (_req, res) => {
  const [total, active, admins] = await Promise.all([
    db("SELECT COUNT(*)::int AS count FROM users"),
    db("SELECT COUNT(*)::int AS count FROM users WHERE active = TRUE"),
    db("SELECT COUNT(*)::int AS count FROM users WHERE role = 'admin'")
  ]);
  res.json({ total: total[0].count, active: active[0].count, admins: admins[0].count });
});

app.get("/api/admin/users", auth, adminOnly, async (_req, res) => {
  const users = await db(
    "SELECT id, name, email, role, active, created_at FROM users ORDER BY created_at DESC"
  );
  res.json({ users });
});

app.patch("/api/admin/users/:id", auth, adminOnly, async (req, res) => {
  const id = Number(req.params.id);
  const { active, role } = req.body;

  if (!Number.isInteger(id)) return res.status(400).json({ error: "ID inválido." });
  if (id === req.user.id && active === false) return res.status(400).json({ error: "Você não pode desativar sua própria conta." });

  const fields = [];
  const values = [];
  if (typeof active === "boolean") { fields.push(`active = $${values.length + 1}`); values.push(active); }
  if (role === "user" || role === "admin") { fields.push(`role = $${values.length + 1}`); values.push(role); }

  if (!fields.length) return res.status(400).json({ error: "Nenhuma alteração informada." });

  values.push(id);
  const rows = await db(
    `UPDATE users SET ${fields.join(", ")} WHERE id = $${values.length}
     RETURNING id, name, email, role, active, created_at`,
    values
  );

  if (!rows[0]) return res.status(404).json({ error: "Usuário não encontrado." });
  res.json({ user: rows[0] });
});

app.delete("/api/admin/users/:id", auth, adminOnly, async (req, res) => {
  const id = Number(req.params.id);
  if (id === req.user.id) return res.status(400).json({ error: "Você não pode excluir sua própria conta." });

  const result = await pool.query("DELETE FROM users WHERE id = $1", [id]);
  if (!result.rowCount) return res.status(404).json({ error: "Usuário não encontrado." });
  res.json({ ok: true });
});


const DOCS_API_BASE = process.env.DOCS_API_BASE || "https://meudocdigital.com/api/public/v1";

async function docsApi(pathname, { method = "GET", body, idempotencyKey } = {}) {
  const headers = {
    "X-API-Key": process.env.DOCS_API_KEY || "",
    "Content-Type": "application/json"
  };
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;

  const response = await fetch(`${DOCS_API_BASE}${pathname}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const json = await response.json().catch(() => ({}));

  if (!response.ok || json.ok === false) {
    const message = json?.error?.mensagem || `API de documentos retornou HTTP ${response.status}.`;
    const err = new Error(message);
    err.status = response.status;
    err.code = json?.error?.codigo;
    throw err;
  }
  return json.data ?? json;
}

function docsApiGuard(req, res, next) {
  if (!process.env.DOCS_API_KEY) {
    return res.status(503).json({
      error: "A integração da API de documentos ainda não foi configurada no Render. Defina DOCS_API_KEY."
    });
  }
  next();
}

// API de documentos: a chave fica exclusivamente no servidor.
app.get("/api/docs/catalog/version", auth, docsApiGuard, async (_req, res) => {
  try { res.json({ data: await docsApi("/catalog/version") }); }
  catch (e) { res.status(e.status || 500).json({ error: e.message, code: e.code }); }
});

app.get("/api/docs/modules", auth, docsApiGuard, async (_req, res) => {
  try { res.json({ data: await docsApi("/modules") }); }
  catch (e) { res.status(e.status || 500).json({ error: e.message, code: e.code }); }
});

app.get("/api/docs/modules/:code", auth, docsApiGuard, async (req, res) => {
  try {
    const code = encodeURIComponent(req.params.code);
    res.json({ data: await docsApi(`/modules/${code}`) });
  } catch (e) { res.status(e.status || 500).json({ error: e.message, code: e.code }); }
});

app.get("/api/docs/account", auth, docsApiGuard, async (_req, res) => {
  try { res.json({ data: await docsApi("/account") }); }
  catch (e) { res.status(e.status || 500).json({ error: e.message, code: e.code }); }
});

app.get("/api/docs/usage", auth, docsApiGuard, async (_req, res) => {
  try { res.json({ data: await docsApi("/usage") }); }
  catch (e) { res.status(e.status || 500).json({ error: e.message, code: e.code }); }
});

app.get("/api/docs/statement", auth, docsApiGuard, async (_req, res) => {
  try { res.json({ data: await docsApi("/statement") }); }
  catch (e) { res.status(e.status || 500).json({ error: e.message, code: e.code }); }
});

app.get("/api/docs/recharges", auth, docsApiGuard, async (_req, res) => {
  try { res.json({ data: await docsApi("/recharges") }); }
  catch (e) { res.status(e.status || 500).json({ error: e.message, code: e.code }); }
});

app.post("/api/docs/recharges", auth, docsApiGuard, async (req, res) => {
  try { res.json({ data: await docsApi("/recharges", { method: "POST", body: { valor: req.body.valor } }) }); }
  catch (e) { res.status(e.status || 500).json({ error: e.message, code: e.code }); }
});

app.get("/api/docs/recharges/:id", auth, docsApiGuard, async (req, res) => {
  try { res.json({ data: await docsApi(`/recharges/${encodeURIComponent(req.params.id)}`) }); }
  catch (e) { res.status(e.status || 500).json({ error: e.message, code: e.code }); }
});

app.get("/api/docs/jobs/:id", auth, docsApiGuard, async (req, res) => {
  try { res.json({ data: await docsApi(`/jobs/${encodeURIComponent(req.params.id)}`) }); }
  catch (e) { res.status(e.status || 500).json({ error: e.message, code: e.code }); }
});

app.get("/api/docs/documents/:id", auth, docsApiGuard, async (req, res) => {
  try { res.json({ data: await docsApi(`/documents/${encodeURIComponent(req.params.id)}`) }); }
  catch (e) { res.status(e.status || 500).json({ error: e.message, code: e.code }); }
});

app.post("/api/docs/preview", auth, docsApiGuard, async (req, res) => {
  try { res.json({ data: await docsApi("/preview", { method: "POST", body: req.body }) }); }
  catch (e) { res.status(e.status || 500).json({ error: e.message, code: e.code }); }
});

app.post("/api/docs/generate", auth, docsApiGuard, async (req, res) => {
  try {
    const idem = String(req.headers["idempotency-key"] || "");
    if (!idem) return res.status(400).json({ error: "Idempotency-Key é obrigatória para geração final." });
    res.json({ data: await docsApi("/generate", { method: "POST", body: req.body, idempotencyKey: idem }) });
  } catch (e) { res.status(e.status || 500).json({ error: e.message, code: e.code }); }
});

function ensureFrontendBuild() {
  const indexFile = path.join(__dirname, "dist", "index.html");
  if (!fs.existsSync(indexFile)) {
    console.log("dist/index.html não existe. Executando npm run build...");
    execFileSync(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "build"], {
      cwd: __dirname,
      stdio: "inherit"
    });
  }
  if (!fs.existsSync(indexFile)) {
    throw new Error("O build terminou, mas dist/index.html não foi criado.");
  }
}

// Production: serve the Vite build.
const dist = path.join(__dirname, "dist");
app.use(express.static(dist));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  const indexFile = path.join(dist, "index.html");
  res.sendFile(indexFile, (err) => {
    if (err) {
      console.error("Frontend não foi compilado. Execute npm run build.", err);
      if (!res.headersSent) {
        res.status(503).send("Frontend ainda não foi compilado. Aguarde o deploy terminar e tente novamente.");
      }
    }
  });
});

ensureFrontendBuild();

initDb()
  .then(() => {
    app.listen(PORT, () => console.log(`EinsteinEditaveis rodando na porta ${PORT}`));
  })
  .catch((err) => {
    console.error("Falha ao iniciar banco:", err);
    process.exit(1);
  });
