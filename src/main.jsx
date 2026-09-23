import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Users,
  List,
  Trophy,
  Award,
  LogOut,
  Search,
  Camera,
  Check,
  X,
  UserRound,
  Building2,
  CalendarDays,
  Mail,
  Phone,
  FileText,
  Trash2,
} from "lucide-react";
import { supabase } from "./supabase";
import "./styles.css";

const products = [
  "Cámaras Refrigeradas",
  "Cámaras Gasificadas",
  "Sistema de refrigeración",
  "Túneles de Frío",
  "Proyectos Llave en Mano",
  "Áreas de Despacho",
  "Sala de Máquinas",
  "Otro",
];
const industries = [
  "Agroexportación",
  "Centro Logísticos",
  "Avícola",
  "Cárnicos",
  "Lácteos",
  "Bebidas",
  "Otros",
];
const demoUsers = [
  "Misael Estrada",
  "Jhon Rojas",
  "Hugo Escobar",
  "Jesús Chávez",
  "Valeria Rodriguez",
];
const deleteCodes = {
  "Misael Estrada": "ME4827",
  "Jhon Rojas": "JR7316",
  "Hugo Escobar": "HE9054",
  "Jesús Chávez": "JC2681",
  "Valeria Rodriguez": "VR6149",
};
const initial = {
  nombre: "",
  dni: "",
  celular: "",
  correo: "",
  empresa: "",
  rubro: "",
  producto: "",
  producto_detalle: "",
  proyecto: "",
  fecha_necesita: "",
  comentario: "",
};
const required = [
  "nombre",
  "celular",
  "empresa",
  "rubro",
  "producto",
  "proyecto",
  "fecha_necesita",
];
const dateKey = (d) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(d));
const today = () => dateKey(new Date());
const shiftDateKey = (key, delta) => {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
};
const fmtRankDate = (key) =>
  new Intl.DateTimeFormat("es-PE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${key}T00:00:00Z`));
const fmt = (d) =>
  new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Lima",
  }).format(new Date(d));
const initials = (name) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
const withRanks = (entries) => {
  let rank = 0,
    prevCount = null;
  return entries.map(([name, count]) => {
    if (count !== prevCount) {
      rank += 1;
      prevCount = count;
    }
    return { name, count, rank };
  });
};
function App() {
  const [user, setUser] = useState(null),
    [profile, setProfile] = useState(null),
    [demo, setDemo] = useState(false),
    [view, setView] = useState("home");
  const [leads, setLeads] = useState([]),
    [loading, setLoading] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  const [demoName, setDemoName] = useState(""),
    [accessCode, setAccessCode] = useState(""),
    [query, setQuery] = useState(""),
    [rankDate, setRankDate] = useState(today());
  const [form, setForm] = useState(initial),
    [otherIndustry, setOtherIndustry] = useState(""),
    [photo, setPhoto] = useState(null),
    [preview, setPreview] = useState(""),
    [selected, setSelected] = useState(null);
  const isAdmin = profile?.role === "admin";
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(async ({ data, error }) => {
      if (error) setError(error.message);
      const sessionUser = data.session?.user;
      if (sessionUser?.is_anonymous) {
        await supabase.auth.signOut();
        setUser(null);
      } else {
        setUser(sessionUser ?? null);
      }
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!user || demo) return;
    let active = true;
    setLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (!active) return;
      if (error) {
        setError(
          "No se pudo cargar tu perfil. Revisa la configuración de Supabase.",
        );
        setLoading(false);
        return;
      }
      setProfile(data);
      await loadLeads();
    })();
    return () => {
      active = false;
    };
  }, [user?.id, demo]);
  useEffect(() => {
    if (!user || demo) return;
    if (view === "ranking-day" || view === "ranking-general" || view === "list") {
      loadLeads();
    }
  }, [view]);
  useEffect(() => {
    if (!photo) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);
  async function loadLeads() {
    setLoading(true);
    let all = [],
      from = 0;
    while (true) {
      const { data, error } = await supabase
        .from("leads")
        .select("*, profiles!leads_owner_id_fkey(full_name)")
        .order("created_at", { ascending: false })
        .order("id")
        .range(from, from + 999);
      if (error) {
        setError("No se pudieron cargar los registros. " + error.message);
        setLoading(false);
        return;
      }
      all.push(...data);
      if (data.length < 1000) break;
      from += 1000;
    }
    setLeads(all);
    setLoading(false);
  }
  async function enterDemo(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (supabase) {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/app-login`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
            body: JSON.stringify({ name: demoName.trim(), code: accessCode }),
          },
        );
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Código inválido.");
        const { error } = await supabase.auth.setSession(result);
        if (error) throw error;
        setDemo(false);
      } else {
        setDemo(true);
        setUser({ id: "demo" });
        setProfile({ full_name: demoName.trim(), role: "admin" });
      }
    } catch (e) {
      setError(e.message || "No se pudo iniciar sesión.");
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    setUser(null);
    setProfile(null);
    setDemo(false);
    setLeads([]);
    setSelected(null);
    setPhoto(null);
    setOtherIndustry("");
    setForm(initial);
    setView("home");
    setMessage("");
    setError("");
    setAccessCode("");
  }
  function newLead() {
    setForm(initial);
    setPhoto(null);
    setOtherIndustry("");
    setError("");
    setMessage("");
    setView("form");
  }
  async function save(e) {
    e.preventDefault();
    if (busy) return;
    setError("");
    if (
      required.some((k) => !form[k].trim()) ||
      (form.rubro === "Otros" && !otherIndustry.trim()) ||
      (form.producto === "Otro" && !form.producto_detalle.trim())
    ) {
      setError("Completa los campos obligatorios.");
      return;
    }
    setBusy(true);
    const id = crypto.randomUUID();
    let photoPath = null;
    try {
      if (photo && !demo) {
        photoPath = `${user.id}/${id}.${photo.type.split("/")[1]}`;
        const { error } = await supabase.storage
          .from("lead-photos")
          .upload(photoPath, photo);
        if (error) throw error;
      }
      const payload = {
        ...Object.fromEntries(
          Object.entries(form).map(([k, v]) => [k, v.trim()]),
        ),
        rubro: form.rubro === "Otros" ? otherIndustry.trim() : form.rubro,
        correo: form.correo.trim() || null,
        producto_detalle:
          form.producto === "Otro" ? form.producto_detalle.trim() : "",
        id,
        owner_id: user.id,
        photo_path: photoPath,
      };
      if (demo) {
        setLeads((l) => [
          {
            ...payload,
            created_at: new Date().toISOString(),
            profiles: { full_name: profile.full_name },
            demoPhoto: preview,
          },
          ...l,
        ]); // Keep the object URL alive until the photo changes; demo detail uses the copied data URL below.
        if (photo) {
          const data = await new Promise((resolve, reject) => {
            const r = new FileReader();
            r.onload = () => resolve(r.result);
            r.onerror = reject;
            r.readAsDataURL(photo);
          });
          setLeads((l) =>
            l.map((x) => (x.id === id ? { ...x, demoPhoto: data } : x)),
          );
        }
      } else {
        const { error } = await supabase.from("leads").insert(payload);
        if (error) throw error;
        await loadLeads();
      }
      setView("home");
      setPhoto(null);
      setForm(initial);
      setMessage(
        demo
          ? "Lead de prueba guardado en esta sesión."
          : "Lead guardado correctamente.",
      );
    } catch (e) {
      setError("No se pudo guardar el lead. " + e.message);
      if (photoPath)
        await supabase.storage.from("lead-photos").remove([photoPath]);
    } finally {
      setBusy(false);
    }
  }
  async function detail(lead) {
    setSelected({ ...lead, photoUrl: lead.demoPhoto || "" });
    setView("detail");
    setError("");
    if (lead.photo_path && !demo) {
      const { data, error } = await supabase.storage
        .from("lead-photos")
        .createSignedUrl(lead.photo_path, 600);
      if (error) setError("No se pudo abrir la foto.");
      else
        setSelected((prev) =>
          prev?.id === lead.id ? { ...prev, photoUrl: data.signedUrl } : prev,
        );
    }
  }
  async function deleteLead() {
    if (!selected || selected.owner_id !== user?.id || busy) return;
    const expectedCode = deleteCodes[profile?.full_name];
    const enteredCode = window.prompt(
      `Ingresa el código de eliminación de ${profile?.full_name}:`,
    );
    if (!enteredCode || enteredCode.trim().toUpperCase() !== expectedCode) {
      setError("Código de eliminación incorrecto.");
      return;
    }
    if (!window.confirm("¿Quieres eliminar este lead? Esta acción no se puede deshacer.")) return;
    setBusy(true);
    setError("");
    try {
      if (demo) {
        setLeads((current) => current.filter((lead) => lead.id !== selected.id));
      } else {
        const { error } = await supabase
          .from("leads")
          .delete()
          .eq("id", selected.id)
          .eq("owner_id", user.id);
        if (error) throw error;
        if (selected.photo_path) {
          const { error: photoError } = await supabase.storage
            .from("lead-photos")
            .remove([selected.photo_path]);
          if (photoError) throw photoError;
        }
        setLeads((current) => current.filter((lead) => lead.id !== selected.id));
      }
      setSelected(null);
      setView("list");
      setMessage("Lead eliminado correctamente.");
    } catch (e) {
      setError("No se pudo eliminar el lead. " + e.message);
    } finally {
      setBusy(false);
    }
  }
  function selectPhoto(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(f.type) ||
      f.size > 5 * 1024 * 1024
    ) {
      setError("Adjunta una imagen JPG, PNG o WebP de hasta 5 MB.");
      e.target.value = "";
      return;
    }
    setError("");
    setPhoto(f);
  }
  const mine = leads.filter((l) => l.owner_id === user?.id),
    todayLeads = mine.filter((l) => dateKey(l.created_at) === today());
  const visible = leads
    .filter((l) => isAdmin || l.owner_id === user?.id)
    .filter((l) =>
      `${l.nombre} ${l.empresa} ${l.profiles?.full_name || ""}`
        .toLocaleLowerCase()
        .includes(query.toLocaleLowerCase()),
    );
  const countByAdvisor = (items) =>
    Object.entries(
      items.reduce((r, l) => {
        const name = l.profiles?.full_name || "Asesor";
        r[name] = (r[name] || 0) + 1;
        return r;
      }, {}),
    ).sort((a, b) => b[1] - a[1]);
  const rankedDay = withRanks(
    countByAdvisor(leads.filter((l) => dateKey(l.created_at) === rankDate)),
  );
  const rankedGeneral = withRanks(countByAdvisor(leads));
  const filled = required.filter((k) => form[k].trim()).length;
  const field = (key, label, placeholder, type = "text", optional = false) => (
    <label className={key === "comentario" ? "wide" : ""}>
      {label}
      {!optional && <em> *</em>}
      {optional && <small> · Opcional</small>}
      <input
        name={key}
        type={type}
        required={!optional}
        maxLength={key === "dni" ? 15 : 200}
        placeholder={placeholder}
        value={form[key]}
        onInput={(e) => {
          const value = e.currentTarget.value;
          setForm((previous) => ({ ...previous, [key]: value }));
        }}
        onChange={(e) => {
          const value = e.target.value;
          setForm((previous) => ({ ...previous, [key]: value }));
        }}
      />
    </label>
  );
  const rows = (items) =>
    items.length ? (
      items.map((l) => (
        <button className="lead-row" key={l.id} onClick={() => detail(l)}>
          <span className="avatar">{initials(l.nombre)}</span>
          <span className="lead-copy">
            <strong>{l.nombre}</strong>
            <span>
              {l.empresa} · {l.producto}
            </span>
          </span>
          <span className="row-date">
            {fmt(l.created_at)}
            <ArrowRight size={16} />
          </span>
        </button>
      ))
    ) : (
      <div className="empty">
        <Users size={32} />
        <h3>Aquí empiezan tus próximas oportunidades</h3>
        <p>Registra tu primer contacto para tenerlo siempre a mano.</p>
        <button className="text-button" onClick={newLead}>
          Registrar un lead <ArrowRight size={16} />
        </button>
      </div>
    );
  const rankingBoard = (ranked, emptyText) => {
    if (!ranked.length)
      return (
        <div className="empty">
          <Trophy />
          <h3>{emptyText}</h3>
        </div>
      );
    const topScore = ranked[0].count;
    return (
      <>
        <div className="podium">
          {[2, 1, 3].map((place) => {
            const entries = ranked.filter((e) => e.rank === place);
            return entries.length ? (
              <div className={`podium-place place-${place}`} key={place}>
                <span className="podium-medal">{place}</span>
                <div className="podium-names">
                  {entries.map((e) => (
                    <div className="podium-name" key={e.name}>
                      <strong>{e.name}</strong>
                      <span>{e.count} leads</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null;
          })}
        </div>
        {ranked.some((e) => e.rank > 3) && (
          <div className="ranking-rest">
            <h3>Demás posiciones</h3>
            {ranked
              .filter((e) => e.rank > 3)
              .map((e) => (
                <div className="rank-row" key={e.name}>
                  <span className="rank-number">{e.rank}</span>
                  <div className="rank-copy">
                    <div className="rank-title">
                      <strong>{e.name}</strong>
                      <span>{e.count} leads</span>
                    </div>
                    <div className="track">
                      <div style={{ width: `${(e.count / topScore) * 100}%` }} />
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </>
    );
  };
  if (!user)
    return (
      <div className="login-page">
        <div className="brand light">
          <img className="brand-logo" src="/logo.png" alt="Friopacking" />
        </div>
        <section className="login-card">
          <span className="eyebrow">CONTACTOS COMERCIALES</span>
          <h1>
            Cada conversación
            <br />
            es una oportunidad.
          </h1>
          <p className="muted">
            Registra tus contactos y continúa la conversación.
          </p>
          <form onSubmit={enterDemo}>
            <label>
              ¿Quién eres? <em>*</em>
              <select
                required
                value={demoName}
                onChange={(e) => setDemoName(e.target.value)}
              >
                <option value="">Selecciona tu nombre…</option>
                {demoUsers.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Código de acceso <em>*</em>
              <input
                type="password"
                inputMode="text"
                autoComplete="current-password"
                required
                maxLength={6}
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                placeholder="Iniciales y 4 números"
              />
            </label>
            <button className="primary" disabled={busy}>
              {busy ? "Ingresando…" : "Ingresar"}
              <ArrowRight size={18} />
            </button>
            {!supabase && (
              <div className="demo-note">
                Vista de prueba · Supabase pendiente de conexión.
                <br />
                Los registros se borran al recargar la página.
              </div>
            )}
            {supabase && (
              <div className="demo-note">
                Acceso protegido · Tus leads estarán disponibles desde cualquier navegador.
              </div>
            )}
          </form>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
        </section>
        <p className="login-footer">
          Tu equipo. Tus contactos. Nuevas oportunidades.
        </p>
      </div>
    );
  return (
    <div className="app">
      <header>
        <div className="header-inner">
          <a
            className="brand"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setView("home");
            }}
          >
            <img className="brand-logo" src="/logo.png" alt="Friopacking" />
          </a>
          <div className="account">
            <span className="avatar small">
              {initials(profile?.full_name || "Asesor")}
            </span>
            <span>
              <strong>{profile?.full_name || "Cargando…"}</strong>
              <small>{isAdmin ? "Administrador" : "Asesor comercial"}</small>
            </span>
            <button
              className="icon-button"
              onClick={logout}
              aria-label="Cerrar sesión"
            >
              <LogOut size={19} />
            </button>
          </div>
        </div>
      </header>
      <main>
        {demo && (
          <div className="demo-banner">
            Modo de prueba · Datos temporales de esta sesión · Supabase aún no
            conectado
          </div>
        )}
        {message && (
          <div className="success" role="status">
            <Check size={18} />
            {message}
            <button onClick={() => setMessage("")} aria-label="Cerrar mensaje">
              <X size={16} />
            </button>
          </div>
        )}
        {error && (
          <div className="error" role="alert">
            {error}
          </div>
        )}
        {view === "home" && (
          <>
            <section className="page-heading">
              <div>
                <span className="eyebrow">TU AGENDA COMERCIAL</span>
                <h1>
                  Hola, {profile?.full_name?.split(" ")[0] || "asesor"}
                  <span className="blue">.</span>
                </h1>
                <p className="muted">
                  Una buena conversación merece un siguiente paso.
                </p>
              </div>
              <button className="primary" onClick={newLead}>
                <Plus size={19} /> Nuevo lead
              </button>
            </section>
            <div className="stats">
              <article>
                <span className="stat-icon">
                  <CalendarDays />
                </span>
                <div>
                  <span>Tus leads hoy</span>
                  <strong>{loading ? "—" : todayLeads.length}</strong>
                </div>
                <span className="stat-note">Hoy</span>
              </article>
              <article>
                <span className="stat-icon">
                  <Users />
                </span>
                <div>
                  <span>Tus leads en total</span>
                  <strong>{loading ? "—" : mine.length}</strong>
                </div>
                <span className="stat-note">Acumulado</span>
              </article>
            </div>
            <section className="card">
              <div className="card-heading">
                <div>
                  <h2>Últimos contactos</h2>
                  <p className="muted">
                    Las oportunidades que estás construyendo.
                  </p>
                </div>
                <button className="text-button" onClick={() => setView("list")}>
                  Ver registros <ArrowRight size={16} />
                </button>
              </div>
              {loading ? (
                <p className="empty">Cargando contactos…</p>
              ) : (
                rows(mine.slice(0, 8))
              )}
            </section>
          </>
        )}
        {view === "list" && (
          <>
            <section className="page-heading">
              <div>
                <span className="eyebrow">SEGUIMIENTO</span>
                <h1>Registro de contactos</h1>
                <p className="muted">
                  {isAdmin
                    ? "Una visión de los contactos de tu equipo."
                    : "Consulta tus contactos registrados."}
                </p>
              </div>
              <button className="primary" onClick={newLead}>
                <Plus size={18} /> Nuevo lead
              </button>
            </section>
            <section className="card">
              <label className="search">
                <Search size={20} />
                <input
                  aria-label="Buscar contactos"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar por nombre, empresa o asesor"
                />
              </label>
              <div className="card-heading">
                <h2>{visible.length} contactos</h2>
              </div>
              {loading ? (
                <p>Cargando…</p>
              ) : visible.length ? (
                rows(visible)
              ) : (
                <div className="empty">
                  <Search />
                  <h3>No hay contactos que mostrar</h3>
                  <p>
                    {query
                      ? "Prueba con otro nombre o empresa."
                      : "Los contactos registrados aparecerán aquí."}
                  </p>
                </div>
              )}
            </section>
          </>
        )}
        {view === "ranking-day" && (
          <>
            <section className="page-heading">
              <div>
                <span className="eyebrow">SEGUIMIENTO</span>
                <h1>Ranking del día</h1>
                <p className="muted">¿Quién lidera hoy?</p>
              </div>
              <button className="primary" onClick={newLead}>
                <Plus size={18} /> Nuevo lead
              </button>
            </section>
            <section className="card">
              <div className="card-heading">
                <div>
                  <h2>Podio del día</h2>
                  <p className="muted">
                    {rankDate === today()
                      ? "Leads registrados hoy por asesor."
                      : `Leads registrados el ${fmtRankDate(rankDate)}.`}
                  </p>
                </div>
                <div className="rank-datenav">
                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => setRankDate((d) => shiftDateKey(d, -1))}
                    aria-label="Día anterior"
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <input
                    aria-label="Fecha del ranking"
                    type="date"
                    value={rankDate}
                    max={today()}
                    onChange={(e) => setRankDate(e.target.value)}
                  />
                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => setRankDate((d) => shiftDateKey(d, 1))}
                    disabled={rankDate >= today()}
                    aria-label="Día siguiente"
                  >
                    <ArrowRight size={18} />
                  </button>
                </div>
              </div>
              {rankingBoard(rankedDay, "Todavía no hay registros para esta fecha")}
            </section>
          </>
        )}
        {view === "ranking-general" && (
          <>
            <section className="page-heading">
              <div>
                <span className="eyebrow">SEGUIMIENTO</span>
                <h1>Ranking general</h1>
                <p className="muted">El acumulado de todos los asesores, desde siempre.</p>
              </div>
              <button className="primary" onClick={newLead}>
                <Plus size={18} /> Nuevo lead
              </button>
            </section>
            <section className="card">
              <div className="card-heading">
                <div>
                  <h2>Podio general</h2>
                  <p className="muted">Acumulado de leads registrados por asesor, todos los días.</p>
                </div>
              </div>
              {rankingBoard(rankedGeneral, "Todavía no hay registros")}
            </section>
          </>
        )}
        {view === "form" && (
          <>
            <button
              className="back"
              onClick={() => setView("home")}
              disabled={busy}
            >
              <ArrowLeft size={17} /> Volver al inicio
            </button>
            <section className="page-heading">
              <div>
                <span className="eyebrow">UNA NUEVA OPORTUNIDAD</span>
                <h1>Nuevo lead</h1>
                <p className="muted">
                  Registra los detalles de tu conversación.
                </p>
              </div>
              <span className="byline">
                <UserRound size={17} />
                {profile?.full_name}
              </span>
            </section>
            <form className="card lead-form" onSubmit={save}>
              <div className="form-progress">
                <span>
                  {filled} de {required.length} campos completos
                </span>
                <span>{Math.round((filled / required.length) * 100)}%</span>
                <progress max={required.length} value={filled} />
              </div>
              <fieldset disabled={busy}>
                <legend>
                  <span>01</span> Datos del contacto
                </legend>
                <div className="grid">
                  {field("nombre", "Nombre completo", "Nombre y apellido")}
                  {field("dni", "DNI", "Número de documento", "text", true)}
                  {field("celular", "Contacto / celular", "+51 9…", "tel")}
                  {field("correo", "Correo", "correo@empresa.com", "email", true)}
                  {field("empresa", "Empresa", "Nombre de la empresa")}
                  <label>
                    Rubro <em> *</em>
                    <select
                      required
                      value={form.rubro}
                      onChange={(e) =>
                        setForm({ ...form, rubro: e.target.value })
                      }
                    >
                      <option value="">Selecciona un rubro…</option>
                      {industries.map((industry) => (
                        <option key={industry}>{industry}</option>
                      ))}
                    </select>
                  </label>
                  {form.rubro === "Otros" && (
                    <label>
                      Especifica el rubro <em> *</em>
                      <input
                        required
                        maxLength={200}
                        value={otherIndustry}
                        onChange={(e) => setOtherIndustry(e.target.value)}
                        placeholder="¿A qué rubro pertenece?"
                      />
                    </label>
                  )}
                </div>
              </fieldset>
              <fieldset disabled={busy}>
                <legend>
                  <span>02</span> Interés y proyecto
                </legend>
                <div className="grid">
                  <label className="wide">
                    Producto de interés <em>*</em>
                    <select
                      required
                      value={form.producto}
                      onChange={(e) =>
                        setForm({ ...form, producto: e.target.value })
                      }
                    >
                      <option value="">Selecciona un producto…</option>
                      {products.map((p) => (
                        <option key={p}>{p}</option>
                      ))}
                    </select>
                  </label>
                  {form.producto === "Otro" &&
                    field(
                      "producto_detalle",
                      "Especifica el producto",
                      "¿A qué producto pertenece?",
                    )}
                  {field(
                    "proyecto",
                    "¿Para qué proyecto?",
                    "Ej. Nueva planta, ampliación",
                  )}
                  {field(
                    "fecha_necesita",
                    "Fecha en que lo necesita",
                    "",
                    "date",
                  )}
                  <label className="wide">
                    Comentario final <small>· Opcional</small>
                    <textarea
                      maxLength={4000}
                      value={form.comentario}
                      onChange={(e) =>
                        setForm({ ...form, comentario: e.target.value })
                      }
                      placeholder="Notas de la conversación y próximos pasos"
                    />
                  </label>
                </div>
              </fieldset>
              <fieldset disabled={busy}>
                <legend>
                  <span>03</span> Foto adjunta <small>· Opcional</small>
                </legend>
                <label className="photo-box">
                  {preview ? (
                    <img src={preview} alt="Foto adjunta" />
                  ) : (
                    <Camera size={27} />
                  )}
                  <strong>
                    {photo ? photo.name : "Adjuntar tarjeta, stand o producto"}
                  </strong>
                  <span>JPG, PNG o WebP · Hasta 5 MB</span>
                  <input
                    aria-label="Adjuntar foto"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={selectPhoto}
                  />
                </label>
                {photo && (
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => setPhoto(null)}
                  >
                    Quitar foto
                  </button>
                )}
              </fieldset>
              <div className="form-actions">
                <span>
                  Los campos con <em>*</em> son obligatorios.
                </span>
                <button
                  className="primary"
                  disabled={busy || (!demo && !profile)}
                >
                  {busy ? "Guardando…" : "Guardar lead"}
                  <Check size={18} />
                </button>
              </div>
            </form>
          </>
        )}
        {view === "detail" && selected && (
          <>
            <button className="back" onClick={() => setView("list")}>
              <ArrowLeft size={17} /> Volver a contactos
            </button>
            <section className="page-heading">
              <div>
                <span className="eyebrow">FICHA DEL CONTACTO</span>
                <h1>{selected.nombre}</h1>
                <p className="muted">{selected.empresa}</p>
              </div>
              <span className="avatar">{initials(selected.nombre)}</span>
            </section>
            <section className="card detail">
              {selected.photoUrl && (
                <img
                  className="detail-photo"
                  src={selected.photoUrl}
                  alt="Foto del contacto"
                />
              )}
              <dl>
                {[
                  ["Registrado por", selected.profiles?.full_name],
                  ["Fecha de registro", fmt(selected.created_at)],
                  ["Celular", selected.celular],
                  ["Correo", selected.correo],
                  ["DNI", selected.dni],
                  ["Rubro", selected.rubro],
                  ["Producto", selected.producto],
                  ["Repuesto", selected.producto_detalle],
                  ["Proyecto", selected.proyecto],
                  ["Fecha requerida", selected.fecha_necesita],
                  ["Comentarios", selected.comentario],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{v || "—"}</dd>
                  </div>
                ))}
              </dl>
              {selected.owner_id === user?.id && (
                <button
                  type="button"
                  className="danger-button"
                  onClick={deleteLead}
                  disabled={busy}
                >
                  <Trash2 size={17} />
                  {busy ? "Eliminando…" : "Eliminar lead"}
                </button>
              )}
            </section>
          </>
        )}
      </main>
      {view !== "form" && (
        <nav aria-label="Navegación principal">
          <button
            className={view === "home" ? "active" : ""}
            onClick={() => setView("home")}
          >
            <Users size={20} />
            <span>Inicio</span>
          </button>
          <button
            className={view === "list" ? "active" : ""}
            onClick={() => setView("list")}
          >
            <List size={20} />
            <span>{isAdmin ? "Todos los leads" : "Mis leads"}</span>
          </button>
          <button
            className={view === "ranking-day" ? "active" : ""}
            onClick={() => setView("ranking-day")}
          >
            <Trophy size={20} />
            <span>Ranking del día</span>
          </button>
          <button
            className={view === "ranking-general" ? "active" : ""}
            onClick={() => setView("ranking-general")}
          >
            <Award size={20} />
            <span>Ranking general</span>
          </button>
        </nav>
      )}
      <footer>
        Registro de leads <span>·</span> Cada contacto cuenta.
      </footer>
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);
