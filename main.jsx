import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const WA_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || "5511999999999";

async function api(path, options = {}) {
  const token = localStorage.getItem("einstein_token");
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(path, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Erro inesperado.");
  return data;
}

function App() {
  const [page, setPage] = useState("home");
  const [user, setUser] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem("einstein_user");
    if (saved) setUser(JSON.parse(saved));
  }, []);

  function onAuth(data) {
    localStorage.setItem("einstein_token", data.token);
    localStorage.setItem("einstein_user", JSON.stringify(data.user));
    setUser(data.user);
    setPage(data.user.role === "admin" ? "admin" : "dashboard");
  }

  function logout() {
    localStorage.removeItem("einstein_token");
    localStorage.removeItem("einstein_user");
    setUser(null);
    setPage("home");
  }

  const whatsapp = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent("Olá! Preciso de suporte no EinsteinEditaveis.")}`;

  return (
    <>
      <Header user={user} page={page} setPage={setPage} logout={logout} />
      <main>
        {page === "home" && <Home setPage={setPage} user={user} />}
        {page === "login" && <Auth mode="login" onAuth={onAuth} setPage={setPage} />}
        {page === "register" && <Auth mode="register" onAuth={onAuth} setPage={setPage} />}
        {page === "dashboard" && <Dashboard user={user} setPage={setPage} />}
        {page === "admin" && <Admin user={user} setPage={setPage} />}
      </main>

      <a className="whatsapp" href={whatsapp} target="_blank" rel="noreferrer" aria-label="Suporte pelo WhatsApp">
        <span>◉</span> Suporte WhatsApp
      </a>
      <footer>© {new Date().getFullYear()} EinsteinEditaveis • Feito para criar, editar e evoluir.</footer>
    </>
  );
}

function Header({ user, page, setPage, logout }) {
  return (
    <header className="topbar">
      <button className="brand" onClick={() => setPage("home")}>
        <img src="/einstein.png" alt="EinsteinEditaveis" />
        <span>Einstein<span>Editaveis</span></span>
      </button>

      <nav>
        <button className={page === "home" ? "active" : ""} onClick={() => setPage("home")}>Início</button>
        {user ? (
          <>
            <button onClick={() => setPage(user.role === "admin" ? "admin" : "dashboard")}>Painel</button>
            <button className="outline" onClick={logout}>Sair</button>
          </>
        ) : (
          <>
            <button onClick={() => setPage("login")}>Entrar</button>
            <button className="primary small" onClick={() => setPage("register")}>Criar conta</button>
          </>
        )}
      </nav>
    </header>
  );
}

function Home({ setPage, user }) {
  return (
    <section className="hero">
      <div className="hero-copy">
        <div className="pill">⚡ Plataforma de editáveis</div>
        <h1>Crie. Edite.<br /><strong>Publique.</strong></h1>
        <p>Um painel moderno para organizar seus editáveis, acessar sua conta e receber suporte quando precisar.</p>
        <div className="actions">
          <button className="primary" onClick={() => setPage(user ? "dashboard" : "register")}>
            {user ? "Abrir meu painel" : "Começar agora"} →
          </button>
          <button className="ghost" onClick={() => setPage("login")}>Já tenho conta</button>
        </div>
        <div className="features">
          <span>✓ Conta segura</span>
          <span>✓ Painel personalizado</span>
          <span>✓ Suporte rápido</span>
        </div>
      </div>

      <div className="hero-art">
        <div className="glow" />
        <img src="/einstein.png" alt="EinsteinEditaveis" />
      </div>
    </section>
  );
}

function Auth({ mode, onAuth, setPage }) {
  const isLogin = mode === "login";
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api(isLogin ? "/api/auth/login" : "/api/auth/register", {
        method: "POST",
        body: JSON.stringify(form)
      });
      onAuth(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo"><img src="/einstein.png" alt="" /></div>
        <div className="pill">{isLogin ? "Bem-vindo de volta" : "Novo por aqui?"}</div>
        <h2>{isLogin ? "Entrar na sua conta" : "Criar sua conta"}</h2>
        <p>{isLogin ? "Acesse seu painel EinsteinEditaveis." : "Cadastre-se gratuitamente e entre no seu painel."}</p>

        {error && <div className="error">{error}</div>}

        <form onSubmit={submit}>
          {!isLogin && (
            <label>Nome
              <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Seu nome" />
            </label>
          )}
          <label>E-mail
            <input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="voce@email.com" />
          </label>
          <label>Senha
            <input required minLength="6" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Mínimo de 6 caracteres" />
          </label>
          <button className="primary full" disabled={loading}>{loading ? "Aguarde..." : isLogin ? "Entrar" : "Criar conta"}</button>
        </form>

        <button className="link" onClick={() => setPage(isLogin ? "register" : "login")}>
          {isLogin ? "Ainda não tenho conta" : "Já tenho uma conta"}
        </button>
      </div>
    </section>
  );
}

function Dashboard({ user, setPage }) {
  const [tab, setTab] = useState("home");
  if (!user) return <Redirect setPage={setPage} page="login" />;

  return (
    <section className="page">
      <div className="page-head">
        <div>
          <div className="pill">Área do cliente</div>
          <h2>Olá, {user.name.split(" ")[0]} 👋</h2>
          <p>Crie prévias, gere documentos e acompanhe sua carteira pela API integrada.</p>
        </div>
        <div className="dash-tabs">
          <button className={tab === "home" ? "active" : ""} onClick={() => setTab("home")}>Visão geral</button>
          <button className={tab === "docs" ? "active" : ""} onClick={() => setTab("docs")}>Documentos</button>
          <button className={tab === "wallet" ? "active" : ""} onClick={() => setTab("wallet")}>Carteira</button>
        </div>
      </div>

      {tab === "home" && <DashboardHome user={user} setTab={setTab} />}
      {tab === "docs" && <Documents />}
      {tab === "wallet" && <Wallet />}
    </section>
  );
}

function DashboardHome({ user, setTab }) {
  const [account, setAccount] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/api/docs/account").then(r => setAccount(r.data)).catch(e => setError(e.message));
  }, []);

  return (
    <div className="dashboard-grid">
      <div className="panel-card big">
        <div className="icon">⚡</div>
        <h3>Gerador de documentos</h3>
        <p>O catálogo da API é carregado diretamente no painel. Os formulários são montados com os campos mais recentes de cada módulo.</p>
        <button className="primary inline" onClick={() => setTab("docs")}>Abrir catálogo →</button>
        {error && <div className="error">{error}</div>}
        {account && <div className="api-balance"><span>Saldo da API</span><strong>R$ {Number(account.saldo_brl || 0).toFixed(2).replace(".", ",")}</strong></div>}
      </div>
      <div className="panel-card">
        <div className="icon">🧾</div>
        <h3>Prévia</h3>
        <p>Faça uma prévia antes de gerar a versão final. A API devolve links temporários para PDF/imagens.</p>
      </div>
      <div className="panel-card">
        <div className="icon">💬</div>
        <h3>Suporte</h3>
        <p>Precisa de ajuda? Fale com nossa equipe pelo WhatsApp.</p>
        <a className="primary inline" href={`https://wa.me/${WA_NUMBER}`} target="_blank" rel="noreferrer">Abrir suporte</a>
      </div>
    </div>
  );
}

function Documents() {
  const [modules, setModules] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({});
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadModules() {
    setError("");
    try {
      const r = await api("/api/docs/modules");
      setModules(r.data.modulos || []);
    } catch (e) { setError(e.message); }
  }

  useEffect(() => { loadModules(); }, []);

  async function selectModule(code) {
    setError(""); setResult(null);
    try {
      const r = await api(`/api/docs/modules/${encodeURIComponent(code)}`);
      setSelected(r.data);
      const initial = {};
      (r.data.campos || []).forEach(f => { initial[f.campo] = f.padrao ?? ""; });
      setForm(initial);
    } catch (e) { setError(e.message); }
  }

  function setField(name, value) { setForm(prev => ({ ...prev, [name]: value })); }

  async function preview() {
    if (!selected) return;
    setBusy(true); setError(""); setResult(null);
    try {
      const r = await api("/api/docs/preview", { method: "POST", body: JSON.stringify({ modulo: selected.codigo, dados: form }) });
      setResult({ type: "preview", data: r.data });
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  async function generate() {
    if (!selected) return;
    if (!confirm("A geração final pode descontar o preço do documento da carteira. Continuar?")) return;
    setBusy(true); setError(""); setResult(null);
    try {
      const idem = crypto.randomUUID();
      const r = await api("/api/docs/generate", {
        method: "POST",
        headers: { "Idempotency-Key": idem },
        body: JSON.stringify({ modulo: selected.codigo, dados: form })
      });
      setResult({ type: "final", data: r.data });
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  return (
    <div className="docs-layout">
      <div className="modules-card">
        <div className="table-title"><h3>Catálogo</h3><button className="ghost" onClick={loadModules}>↻</button></div>
        {error && <div className="error">{error}</div>}
        <div className="module-list">
          {modules.map(m => (
            <button key={m.codigo} className={selected?.codigo === m.codigo ? "module active" : "module"} onClick={() => selectModule(m.codigo)}>
              <span><b>{m.nome || m.codigo}</b><small>{m.codigo} • {m.campos} campos</small></span>
              <strong>R$ {Number(m.seu_preco_brl || 0).toFixed(2).replace(".", ",")}</strong>
            </button>
          ))}
          {!modules.length && <p className="muted">Carregando catálogo...</p>}
        </div>
      </div>

      <div className="form-card">
        {!selected ? (
          <div className="empty-state"><div className="icon">📄</div><h3>Escolha um documento</h3><p>Selecione um item do catálogo para carregar automaticamente os campos.</p></div>
        ) : (
          <>
            <div className="form-head">
              <div><div className="pill">{selected.codigo}</div><h3>{selected.nome || selected.codigo}</h3><p>R$ {Number(selected.seu_preco_brl || 0).toFixed(2).replace(".", ",")} • {selected.aceita_previa ? "Prévia disponível" : "Sem prévia"}</p></div>
            </div>
            <div className="dynamic-form">
              {(selected.campos || []).map(field => <DynamicField key={field.campo} field={field} value={form[field.campo] ?? ""} onChange={v => setField(field.campo, v)} />)}
            </div>
            <div className="form-actions">
              {selected.aceita_previa !== false && <button className="ghost" disabled={busy} onClick={preview}>Gerar prévia</button>}
              <button className="primary" disabled={busy} onClick={generate}>{busy ? "Processando..." : "Gerar documento final"}</button>
            </div>
            {result && <ApiResult result={result} />}
          </>
        )}
      </div>
    </div>
  );
}

function DynamicField({ field, value, onChange }) {
  if (field.automatico && !field.obrigatorio) return null;
  const label = `${field.titulo || field.campo}${field.obrigatorio ? " *" : ""}`;
  const common = { value, required: !!field.obrigatorio, placeholder: field.exemplo || field.formato || "", onChange: e => onChange(e.target.value) };
  if (field.tipo === "textarea") return <label>{label}<textarea {...common} rows="4" /></label>;
  if (field.tipo === "select") return <label>{label}<select {...common}><option value="">Selecione...</option>{(field.opcoes || []).map(o => <option key={o} value={o}>{o}</option>)}</select></label>;
  if (field.tipo === "multiselect") return <label>{label}<input {...common} placeholder={(field.opcoes || []).join(", ")} /></label>;
  if (field.tipo === "date") return <label>{label}<input {...common} /></label>;
  if (field.tipo === "image") return <label>{label}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={async e => { const file=e.target.files?.[0]; if(!file)return; if(file.size>5*1024*1024){alert("Imagem máxima: 5 MB.");return;} const reader=new FileReader(); reader.onload=()=>onChange(reader.result); reader.readAsDataURL(file); }} /></label>;
  return <label>{label}<input {...common} /></label>;
}

function ApiResult({ result }) {
  const d = result.data || {};
  return <div className="api-result">
    <h3>{result.type === "preview" ? "Prévia pronta" : "Documento gerado"}</h3>
    <div className="result-grid">
      {d.custo_brl != null && <span>Custo <b>R$ {Number(d.custo_brl).toFixed(2).replace(".", ",")}</b></span>}
      {d.saldo_restante_brl != null && <span>Saldo <b>R$ {Number(d.saldo_restante_brl).toFixed(2).replace(".", ",")}</b></span>}
      {d.status && <span>Status <b>{d.status}</b></span>}
    </div>
    <div className="result-links">
      {d.pdf_url && <a className="primary inline" href={d.pdf_url} target="_blank" rel="noreferrer">Abrir PDF</a>}
      {(d.imagens || []).map((url, i) => <a key={url} href={url} target="_blank" rel="noreferrer">Página {i + 1}</a>)}
    </div>
    {d.acesso_digital && <div className="digital-access"><b>Acesso do aplicativo</b><div>CPF: {d.acesso_digital.cpf}</div><div>Senha: {d.acesso_digital.senha}</div><div>Site: <a href={d.acesso_digital.site} target="_blank" rel="noreferrer">{d.acesso_digital.site}</a></div></div>}
  </div>;
}

function Wallet() {
  const [account, setAccount] = useState(null);
  const [amount, setAmount] = useState("20");
  const [recharge, setRecharge] = useState(null);
  const [error, setError] = useState("");

  async function load() {
    try { setAccount((await api("/api/docs/account")).data); } catch(e) { setError(e.message); }
  }
  useEffect(() => { load(); }, []);

  async function createRecharge(e) {
    e.preventDefault(); setError(""); setRecharge(null);
    try {
      const r = await api("/api/docs/recharges", { method:"POST", body: JSON.stringify({ valor:Number(amount) }) });
      setRecharge(r.data);
    } catch(e) { setError(e.message); }
  }

  return <div className="wallet-grid">
    <div className="panel-card">
      <div className="icon">💰</div><h3>Carteira da API</h3>
      {error && <div className="error">{error}</div>}
      <div className="wallet-balance">R$ {Number(account?.saldo_brl || 0).toFixed(2).replace(".", ",")}</div>
      <p>{account?.api_ativa === false ? "A API está pausada por saldo insuficiente." : "Saldo disponível para gerar documentos."}</p>
    </div>
    <div className="panel-card">
      <div className="icon">⚡</div><h3>Recarregar por Pix</h3>
      <form onSubmit={createRecharge}>
        <label>Valor (R$)<input type="number" min="20" step="1" value={amount} onChange={e => setAmount(e.target.value)} /></label>
        <button className="primary full">Gerar Pix</button>
      </form>
      {recharge && <div className="pix-box"><b>{recharge.status}</b>{recharge.qr_code_imagem && <img src={recharge.qr_code_imagem} alt="QR Code Pix" />}{recharge.pix_copia_e_cola && <textarea readOnly value={recharge.pix_copia_e_cola} rows="4" />}</div>}
    </div>
  </div>;
}

function Admin({ user, setPage }) {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, admins: 0 });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [u, s] = await Promise.all([api("/api/admin/users"), api("/api/admin/stats")]);
      setUsers(u.users);
      setStats(s);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user?.role === "admin") load();
  }, [user]);

  async function update(id, patch) {
    try {
      await api(`/api/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
      load();
    } catch (err) { setError(err.message); }
  }

  async function remove(id) {
    if (!confirm("Excluir este usuário?")) return;
    try {
      await api(`/api/admin/users/${id}`, { method: "DELETE" });
      load();
    } catch (err) { setError(err.message); }
  }

  if (!user || user.role !== "admin") return <Redirect setPage={setPage} page="login" />;

  return (
    <section className="page">
      <div className="page-head">
        <div>
          <div className="pill">Administração</div>
          <h2>Painel de Admin</h2>
          <p>Gerencie contas e acompanhe sua plataforma.</p>
        </div>
        <button className="ghost" onClick={load}>↻ Atualizar</button>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="stats">
        <Stat label="Usuários" value={stats.total} />
        <Stat label="Ativos" value={stats.active} />
        <Stat label="Admins" value={stats.admins} />
      </div>

      <div className="table-card">
        <div className="table-title"><h3>Usuários cadastrados</h3><span>{loading ? "Carregando..." : `${users.length} contas`}</span></div>
        <div className="table-scroll">
          <table>
            <thead><tr><th>Usuário</th><th>E-mail</th><th>Função</th><th>Status</th><th>Ações</th></tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td><b>{u.name}</b><small>#{u.id}</small></td>
                  <td>{u.email}</td>
                  <td>
                    <select value={u.role} disabled={u.id === user.id} onChange={e => update(u.id, { role: e.target.value })}>
                      <option value="user">Usuário</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td><span className={u.active ? "badge on" : "badge off"}>{u.active ? "Ativo" : "Inativo"}</span></td>
                  <td className="actions-cell">
                    {u.id !== user.id && <button onClick={() => update(u.id, { active: !u.active })}>{u.active ? "Desativar" : "Ativar"}</button>}
                    {u.id !== user.id && <button className="danger" onClick={() => remove(u.id)}>Excluir</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value }) {
  return <div className="stat"><span>{label}</span><strong>{value}</strong></div>;
}

function Redirect({ setPage, page }) {
  useEffect(() => setPage(page), []);
  return <div className="loading">Redirecionando...</div>;
}

createRoot(document.getElementById("root")).render(<App />);