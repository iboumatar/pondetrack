import { useState, useEffect, useRef } from "react";
import { supabase as supabaseClient } from "./supabase/client";

const LIGHT = {
  bg:          "#F8FAF9",
  cardVert:    "#E8F5EE",
  cardAmbre:   "#FEF3DC",
  cardBleu:    "#EAF2FF",
  cardSauge:   "#EDF4F0",
  cardRouge:   "#FEE9E9",
  amber:       "#B87008",
  amberDim:    "#9A6005",
  amberGlow:   "rgba(184,112,8,0.12)",
  vitals:      "#0D7A38",
  vitalsDim:   "rgba(13,122,56,0.10)",
  danger:      "#B91C1C",
  dangerDim:   "#FEE9E9",
  warning:     "#D97706",
  warningDim:  "#FEF3DC",
  blue:        "#1D4ED8",
  blueDim:     "#EAF2FF",
  textPrimary: "#0D1F17",
  textSub:     "#2D6645",
  textMuted:   "#5A8A70",
  border:      "rgba(13,31,23,0.14)",
  navBg:       "#FFFFFF",
  cardHover:   "#E2EFE8",
};

const DARK = {
  bg:          "#0F2318",
  cardVert:    "#162D20",
  cardAmbre:   "#1E2D10",
  cardBleu:    "#0F1E30",
  cardSauge:   "#1A2E24",
  cardRouge:   "#2D1010",
  amber:       "#F5A623",
  amberDim:    "#C4811A",
  amberGlow:   "rgba(245,166,35,0.15)",
  vitals:      "#4ADE80",
  vitalsDim:   "rgba(74,222,128,0.12)",
  danger:      "#F87171",
  dangerDim:   "rgba(248,113,113,0.15)",
  warning:     "#FBBF24",
  warningDim:  "rgba(251,191,36,0.15)",
  blue:        "#60A5FA",
  blueDim:     "rgba(96,165,250,0.12)",
  textPrimary: "#F0F7F2",
  textSub:     "#7AAD8A",
  textMuted:   "#4A7259",
  border:      "rgba(255,255,255,0.07)",
  navBg:       "#0D1F14",
  cardHover:   "#1E3D2C",
};

// T est initialisé avec LIGHT et mis à jour dynamiquement par Object.assign dans App
const T = { ...LIGHT };

// Données initiales par poulailler (modifiables dynamiquement)
const POULAILLERS_INIT = {};  // Vide — rempli après onboarding


// Stock aliment COMMUN — vide au départ
const STOCK_COMMUN = { aliment: 0, capacite: 5000, consoJour: 0 };

const DATA = {
  ferme:    "Ma Ferme",
  ponte:    { auj:0, hier:0, objectif:0, taux:0, semaine:[0,0,0,0,0,0,0] },
  effectif: { total:0, pondeuses:0, mortalite:0, misEnPlace: "2026-01-01" },
  stock:    STOCK_COMMUN,
  finance:  { ca:0, benefice:0, marge:0 },
  alertes:  [],
};

const JOURS = ["Lun","Mar","Mer","Jeu","Ven","Sam","Auj"];
const PAGES_NAV = [
  { id: "dashboard", ico: "🏠", label: "Accueil" },
  { id: "ponte",     ico: "🥚", label: "Ponte" },
  { id: "sante",     ico: "💉", label: "Santé" },
  { id: "stock",     ico: "🌾", label: "Stock" },
  { id: "effectif",  ico: "🐔", label: "Effectif" },
  { id: "finances",  ico: "💰", label: "Finances" },
];

function fmt(n) { return new Intl.NumberFormat("fr-FR").format(n); }

// ── Courbe animée ─────────────────────────────────────────────────────────────
function PonteCurve({ data, unite = 'plat.' }) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    let start = null;
    const dur = 1600;
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / dur, 1);
      setProgress(1 - Math.pow(1 - p, 3));
      if (p < 1) requestAnimationFrame(step);
    };
    const raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  const W = 300, H = 80;
  const padL = 6, padR = 6, padT = 14, padB = 6;
  const w = W - padL - padR, h = H - padT - padB;
  const min = Math.min(...data), max = Math.max(...data), range = max - min || 1;

  const pts = data.map((v, i) => ({
    x: padL + (i / (data.length - 1)) * w,
    y: padT + h - ((v - min) / range) * h,
  }));

  const smooth = pts.reduce((acc, pt, i) => {
    if (i === 0) return `M${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
    const p = pts[i - 1];
    const cx = ((p.x + pt.x) / 2).toFixed(1);
    return acc + ` C${cx},${p.y.toFixed(1)} ${cx},${pt.y.toFixed(1)} ${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
  }, "");

  const fillPath = smooth + ` L${pts[pts.length-1].x},${H} L${pts[0].x},${H} Z`;
  const totalLen = 500;

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible", display: "block" }}>
      <defs>
        <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={T.amber} stopOpacity="0.3" />
          <stop offset="100%" stopColor={T.amber} stopOpacity="0" />
        </linearGradient>
        <filter id="gl"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      {[0, 0.5, 1].map((v, i) => (
        <line key={i} x1={padL} y1={padT + h - v*h} x2={padL+w} y2={padT + h - v*h}
          stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="3 5" />
      ))}
      <path d={fillPath} fill="url(#cg)" opacity={progress} />
      <path d={smooth} fill="none" stroke={T.amber} strokeWidth="2.5"
        strokeLinecap="round" strokeLinejoin="round"
        strokeDasharray={`${progress * totalLen} ${totalLen}`}
        filter="url(#gl)" />
      {pts.map((pt, i) => i === pts.length - 1 ? (
        <g key={i} opacity={progress}>
          <circle cx={pt.x} cy={pt.y} r={9} fill={T.amber} opacity="0.15" />
          <circle cx={pt.x} cy={pt.y} r={4.5} fill={T.amber} />
          <text x={pt.x} y={pt.y - 13} textAnchor="middle" fill={T.amber} fontSize="10" fontWeight="800">
            {data[i]} {unite}
          </text>
        </g>
      ) : (
        <circle key={i} cx={pt.x} cy={pt.y} r={2.5}
          fill={T.cardVert} stroke={T.amber} strokeWidth="1.5" opacity={progress * 0.7} />
      ))}
    </svg>
  );
}

// ── Histogramme 7 jours ──────────────────────────────────────────────────────
function BarChart7j({ data, labels, unite = "plat." }) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => { const t = setTimeout(() => setAnimated(true), 100); return () => clearTimeout(t); }, []);

  const max = Math.max(...data, 1);
  const dernierIdx = data.length - 1;

  return (
    <div style={{ display:"flex", alignItems:"flex-end", gap:5, height:80 }}>
      {data.map((v, i) => {
        const pct    = v / max;
        const active = i === dernierIdx;
        return (
          <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
            {/* Valeur au dessus */}
            <div style={{ fontSize:10, fontWeight:800, color: active ? T.amber : T.textSub,
              opacity: animated ? 1 : 0, transition:`opacity 0.3s ease ${i*0.06}s` }}>
              {v}
            </div>
            {/* Barre */}
            <div style={{ width:"100%", position:"relative", display:"flex", alignItems:"flex-end",
              height:52, borderRadius:6 }}>
              <div style={{
                width:"100%",
                height: animated ? `${Math.max(pct * 52, 4)}px` : "4px",
                background: active
                  ? `linear-gradient(180deg, ${T.amber}, ${T.amberDim})`
                  : `linear-gradient(180deg, ${T.textSub}44, ${T.textSub}22)`,
                borderRadius:"5px 5px 2px 2px",
                boxShadow: active ? `0 2px 8px ${T.amber}55` : "none",
                transition: `height 0.6s cubic-bezier(0.34,1.56,0.64,1) ${i*0.06}s`,
              }} />
            </div>
            {/* Jour */}
            <div style={{ fontSize:9, color: active ? T.amber : T.textMuted,
              fontWeight: active ? 800 : 600 }}>
              {labels[i]}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Jauge arc ─────────────────────────────────────────────────────────────────
function ArcGauge({ taux }) {
  const [anim, setAnim] = useState(0);
  useEffect(() => { const t = setTimeout(() => setAnim(taux), 400); return () => clearTimeout(t); }, [taux]);

  const r = 46, cx = 60, cy = 58;
  const startDeg = -210, sweep = 240;
  const deg2xy = (d) => {
    const rad = d * Math.PI / 180;
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
  };
  const [sx, sy] = deg2xy(startDeg);
  const [ex, ey] = deg2xy(startDeg + sweep);
  const pct = anim / 100;
  const [fx, fy] = deg2xy(startDeg + sweep * pct);
  const big = sweep * pct > 180 ? 1 : 0;
  const col = taux >= 80 ? T.vitals : taux >= 65 ? T.amber : T.danger;

  return (
    <svg width={120} height={90} viewBox="0 0 120 90">
      <defs>
        <filter id="ag"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <path d={`M${sx},${sy} A${r},${r} 0 1 1 ${ex},${ey}`}
        fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="9" strokeLinecap="round" />
      {pct > 0 && (
        <path d={`M${sx},${sy} A${r},${r} 0 ${big} 1 ${fx},${fy}`}
          fill="none" stroke={col} strokeWidth="9" strokeLinecap="round"
          filter="url(#ag)"
          style={{ transition: "all 1.3s cubic-bezier(0.34,1.56,0.64,1)" }} />
      )}
      <text x={cx} y={cy - 6} textAnchor="middle" fill={T.textPrimary} fontSize="20" fontWeight="900">{anim}%</text>
      <text x={cx} y={cy + 10} textAnchor="middle" fill={T.textMuted} fontSize="8">taux ponte</text>
      <text x={cx} y={cy + 22} textAnchor="middle" fill={col} fontSize="8" fontWeight="700">objectif 80%</text>
    </svg>
  );
}

// ── Carte KPI ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, unit, sub, icon, color, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <div onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: hov && onClick ? "#E2EFE8" : T.cardSauge,
        borderRadius: 14, padding: "14px 15px",
        border: `1px solid ${hov && onClick ? color + "55" : T.border}`,
        cursor: onClick ? "pointer" : "default",
        transition: "all 0.18s ease", position: "relative", overflow: "hidden",
      }}>
      <div style={{ position: "absolute", top: -16, right: -16, width: 52, height: 52, borderRadius: "50%", background: color, opacity: 0.08 }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 13, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 5 }}>{label}</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
            <span style={{ fontSize: 22, fontWeight: 900, color: T.textPrimary, letterSpacing: "-0.02em" }}>{value}</span>
            {unit && <span style={{ fontSize: 14, color: T.textSub }}>{unit}</span>}
          </div>
          {sub && <div style={{ fontSize: 14, color: T.textSub, marginTop: 3 }}>{sub}</div>}
        </div>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: color + "1E", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>{icon}</div>
      </div>
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: T.border }}>
        <div style={{ height: "100%", width: "55%", background: color, opacity: 0.45, borderRadius: 1 }} />
      </div>
    </div>
  );
}

// ── Barre santé ───────────────────────────────────────────────────────────────
function HealthBar({ label, val, seuil, color }) {
  const [anim, setAnim] = useState(0);
  useEffect(() => { const t = setTimeout(() => setAnim(val), 600); return () => clearTimeout(t); }, [val]);
  const ok = val >= seuil;
  const col = ok ? color : T.danger;
  return (
    <div style={{ marginBottom: 11 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: 13, color: T.textSub }}>{label}</span>
        <span style={{ fontSize: 13, color: col, fontWeight: 700 }}>{val}%</span>
      </div>
      <div style={{ height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${anim}%`, background: col, borderRadius: 3,
          boxShadow: ok ? `0 0 8px ${col}55` : "none",
          transition: "width 1.2s ease",
        }} />
      </div>
    </div>
  );
}

// ── PAGE PLACEHOLDER ──────────────────────────────────────────────────────────
function Placeholder({ title, ico }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 12, background: T.bg }}>
      <div style={{ fontSize: 52 }}>{ico}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: T.textPrimary }}>{title}</div>
      <div style={{ fontSize: 13, color: T.textMuted }}>Section en cours de développement</div>
    </div>
  );
}

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
function DashboardPage({ setPage, darkMode, setDarkMode, poulailler, consoJours, updateConso, consoTotale, poulaillers, nomFerme, setAppState, stockKgGlobal }) {
  const cTotale    = consoTotale || 0;
  const stockBrut  = stockKgGlobal || 0;
  const _now       = new Date();
  const heure      = _now.getHours() + _now.getMinutes()/60;
  const rationM    = Math.round(cTotale * 0.5);
  const rationS    = Math.round(cTotale * 0.5);
  let   stockEst   = stockBrut;
  const distribs   = [];
  if (heure >= 8)  { stockEst -= rationM; distribs.push({ heure:"08:00", kg:rationM }); }
  if (heure >= 16) { stockEst -= rationS; distribs.push({ heure:"16:00", kg:rationS }); }
  stockEst = Math.max(0, stockEst);
  const stockInfo  = { stockEstime: stockEst, distribs, prochaineDistrib: heure < 8 ? "08:00" : heure < 16 ? "16:00" : "08:00 demain" };

  const d = {
    ...DATA,
    ferme:    nomFerme || "Ma Ferme",
    ponte:    poulailler ? poulailler.ponte    : DATA.ponte,
    effectif: poulailler ? poulailler.effectif : DATA.effectif,
    stock: {
      aliment:       stockEst,
      alimentBrut:   stockBrut,
      capacite:      5000,
      consoJour:     cTotale,
      stockInfo,
      oeufsDispos:   poulailler ? (poulailler.oeufsDispos || 0) : 0,
      derniereVente: poulailler ? (poulailler.derniereVente || { date:"", qte:0 }) : { date:"", qte:0 },
    },
  };
  const variation = d.ponte.auj - d.ponte.hier;
  const objPct = Math.round(d.ponte.auj / d.ponte.objectif * 100);
  const today   = new Date().toISOString().slice(0,10);
  const now = new Date();
  const dateStr = now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  const heureStr = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  return (
    <div style={{ paddingBottom: 20 }}>

      {/* Header */}
      <div style={{ padding: "20px 18px 0" }}>
        {/* Ligne 1 : nom ferme + statut */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 14, color: T.textMuted, marginBottom: 2, letterSpacing: "0.04em" }}>{dateStr}</div>
            <div style={{ fontSize: 19, fontWeight: 800, color: T.textPrimary, letterSpacing: "-0.02em" }}>{d.ferme}</div>
          </div>
          <div style={{ display:"flex", gap:6, alignItems:"center" }}>
            <button onClick={() => setPage("selection")} style={{
              background: T.cardSauge, border:`1px solid ${T.border}`,
              borderRadius:20, padding:"6px 12px", cursor:"pointer",
              display:"flex", alignItems:"center", gap:6,
            }}>
              <span style={{ fontSize:13 }}>🏡</span>
              <span style={{ fontSize:10, fontWeight:700, color:T.textSub }}>Changer</span>
            </button>
            {/* Bouton Paramètres */}
            <button onClick={() => setPage("parametres")} style={{
              width:34, height:34, borderRadius:12,
              background: T.cardSauge, border:`1px solid ${T.border}`,
              cursor:"pointer",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:18,
            }}>
              ⚙️
            </button>
          </div>
          <button
            onClick={() => setDarkMode(dm => !dm)}
            style={{
              background: darkMode ? DARK.cardSauge : LIGHT.cardSauge,
              border: `1px solid ${darkMode ? "rgba(255,255,255,0.1)" : "rgba(13,31,23,0.12)"}`,
              borderRadius: 20, padding: "6px 14px", cursor: "pointer",
              display: "flex", alignItems: "center", gap: 7,
              boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
              transition: "all 0.25s ease",
            }}
          >
            <span style={{ fontSize: 13 }}>{darkMode ? "🌙" : "☀️"}</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: darkMode ? DARK.textSub : LIGHT.textSub }}>
              {darkMode ? "Sombre" : "Clair"}
            </span>
          </button>
        </div>

        {/* Ligne 2 : stock aliment fusionné dans le header */}
        {(() => {
          const sacs    = toSacs(d.stock.aliment);
          const rupture = dateRupture(d.stock.aliment);
          const col     = rupture.critique ? T.danger : T.amber;
          return (
            <div onClick={() => setPage("stock")} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              background: rupture.critique ? T.cardRouge : T.cardAmbre,
              border: `1px solid ${rupture.critique ? T.danger + "66" : "rgba(224,147,18,0.25)"}`,
              borderRadius: 14, padding: "12px 16px", cursor: "pointer",
              boxShadow: rupture.critique ? `0 0 14px ${T.danger}33` : "none",
            }}>
              {/* Icône + label */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: col + "1E", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                  {rupture.critique ? "🚨" : "🌾"}
                </div>
                <div>
                  <div style={{ fontSize: 13, color: rupture.critique ? T.danger : T.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>
                    {rupture.critique ? "⚠️ Stock critique" : "Stock aliment"}
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginTop: 2 }}>
                    <span style={{ fontSize: 22, fontWeight: 900, color: T.textPrimary, letterSpacing: "-0.02em" }}>{sacs.pleins}</span>
                    <span style={{ fontSize: 13, color: rupture.critique ? T.danger : T.textSub, fontWeight: 700 }}>sacs</span>
                  </div>
                </div>
              </div>

              {/* Date rupture + barre */}
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 14, color: col, fontWeight: 700 }}>
                  {rupture.critique ? `🔴 Rupture le ${rupture.date} !` : `Rupture le ${rupture.date}`}
                </div>
                <div style={{ fontSize: 14, color: T.textMuted, marginTop: 2 }}>
                  Autonomie {rupture.jours} jour{rupture.jours > 1 ? "s" : ""}
                </div>
                {/* Mini barre */}
                <div style={{ marginTop: 6, height: 4, width: 100, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{
                    height: "100%",
                    width: `${Math.min(d.stock.aliment / d.stock.capacite * 100, 100)}%`,
                    background: col, borderRadius: 2,
                    boxShadow: `0 0 6px ${col}55`,
                  }} />
                </div>
              </div>
            </div>
          );
        })()}

        {/* Indicateur distribs aliment du jour */}
        {d.stock.stockInfo && d.stock.stockInfo.distribs.length > 0 && (
          <div style={{ margin:"8px 18px 0", background:T.cardAmbre, borderRadius:12,
            padding:"9px 14px", border:`1px solid rgba(224,147,18,0.2)`,
            display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:16 }}>🌾</span>
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:T.textPrimary }}>
                  Distributions aujourd'hui
                </div>
                <div style={{ fontSize:10, color:T.textMuted }}>
                  {d.stock.stockInfo.distribs.map(d => `${d.heure} (${fmt(d.kg)} kg)`).join(" · ")}
                </div>
              </div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:10, color:T.textMuted }}>Prochaine</div>
              <div style={{ fontSize:12, fontWeight:800, color:T.amber }}>
                {d.stock.stockInfo.prochaineDistrib}
              </div>
            </div>
          </div>
        )}

        {/* Stock œufs disponibles (invendus) */}
        {(() => {
          const total     = d.stock.oeufsDispos;
          const plateaux  = Math.floor(total / PLATEAU);
          const reste     = total % PLATEAU;
          const vente     = d.stock.derniereVente;
          const venteDate = new Date(vente.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
          return (
            <div style={{
              background: T.cardBleu,
              border: `1px solid rgba(37,99,235,0.15)`,
              borderRadius: 12, padding: "10px 16px", marginTop: 8,
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                {/* Gauche : icône + chiffres */}
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 9, background: T.amber + "1E", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>
                    🥚
                  </div>
                  <div>
                    <div style={{ fontSize: 13, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>
                      Œufs disponibles
                    </div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 1 }}>
                      <span style={{ fontSize: 20, fontWeight: 900, color: T.amber, letterSpacing: "-0.02em" }}>{plateaux}</span>
                      <span style={{ fontSize: 14, color: T.textSub, fontWeight: 700 }}>plat.</span>
                      {reste > 0 && (
                        <span style={{ fontSize: 14, color: T.textMuted }}>+ {reste} œufs</span>
                      )}
                      <span style={{ fontSize: 14, color: T.textMuted }}>({fmt(total)} œufs)</span>
                    </div>
                  </div>
                </div>
                {/* Droite : dernière vente */}
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 13, color: T.textMuted }}>Dernière vente</div>
                  <div style={{ fontSize: 14, color: T.textSub, fontWeight: 700, marginTop: 1 }}>{Math.floor(vente.qte / PLATEAU)} plat. — {venteDate}</div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Carrousel ponte */}
      <CarrouselPonte poulaillers={poulaillers || POULAILLERS_INIT} setPage={setPage} />

      {/* KPIs */}
      <div style={{ margin: "18px 18px 0" }}>
        <div style={{ fontSize: 14, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, marginBottom: 10 }}>
          📊 Indicateurs
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
          {(() => {
            const age = calcAgeSemaines(d.effectif.misEnPlace);
            return (
              <div onClick={() => setPage("effectif")} style={{
                background: T.cardVert, borderRadius: 14, padding: "14px 15px",
                border: `1px solid rgba(22,163,74,0.2)`, cursor: "pointer",
                position: "relative", overflow: "hidden", transition: "all 0.18s ease",
              }}>
                <div style={{ position: "absolute", top: -16, right: -16, width: 52, height: 52, borderRadius: "50%", background: T.vitals, opacity: 0.08 }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: 13, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 5 }}>Effectif pondeuses</div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                      <span style={{ fontSize: 22, fontWeight: 900, color: T.textPrimary, letterSpacing: "-0.02em" }}>{fmt(d.effectif.pondeuses)}</span>
                      <span style={{ fontSize: 14, color: T.textSub }}>têtes</span>
                    </div>
                    <div style={{ fontSize: 14, color: T.textSub, marginTop: 3 }}>
                      {d.effectif.mortalite} mortes ce mois
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: T.vitals + "1E", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>🐔</div>
                    <div style={{
                      background: T.amberGlow, border: `1px solid ${T.amber}44`,
                      borderRadius: 8, padding: "2px 8px", textAlign: "center",
                    }}>
                      <div style={{ fontSize: 13, fontWeight: 900, color: T.amber, lineHeight: 1.2 }}>{age}</div>
                      <div style={{ fontSize: 14, color: T.textMuted, letterSpacing: "0.04em" }}>sem.</div>
                    </div>
                  </div>
                </div>
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: "rgba(255,255,255,0.05)" }}>
                  <div style={{ height: "100%", width: "55%", background: T.vitals, opacity: 0.45, borderRadius: 1 }} />
                </div>
              </div>
            );
          })()}
        </div>
      </div>


      {/* Consommation aliment */}
      {(() => {
        const conso   = d.stock.consoJour;           // kg/jour total
        const poules  = d.effectif.pondeuses;
        const gPP     = Math.round((conso / poules) * 1000); // g par poule
        const sacsFull = Math.floor(conso / SAC_KG);
        const resteKg  = conso % SAC_KG;
        const sacsDecimal = (conso / SAC_KG).toFixed(1);
        return (
          <div style={{ margin: "18px 18px 0", background: T.cardAmbre, borderRadius: 16, padding: "14px 16px", border: `1px solid rgba(224,147,18,0.2)` }}>
            <div style={{ fontSize: 14, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, marginBottom: 12 }}>
              🌾 Consommation journalière
            </div>
            <div style={{ display: "flex", gap: 10 }}>

              {/* Sacs */}
              <div style={{ flex: 1, background: "rgba(255,255,255,0.6)", borderRadius: 12, padding: "10px 12px", textAlign: "center" }}>
                <div style={{ fontSize: 13, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Total / jour</div>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 4 }}>
                  <span style={{ fontSize: 24, fontWeight: 900, color: T.amber, letterSpacing: "-0.02em" }}>{sacsDecimal}</span>
                  <span style={{ fontSize: 13, color: T.textSub, fontWeight: 700 }}>sacs</span>
                </div>
                <div style={{ fontSize: 13, color: T.textSub, marginTop: 2, fontWeight: 700 }}>
                  {sacsFull} sacs + {resteKg} kg
                </div>
                <div style={{ fontSize: 14, color: T.textMuted, marginTop: 1 }}>{fmt(conso)} kg/jour</div>
              </div>

              {/* g / poule */}
              <div style={{ flex: 1, background: "rgba(255,255,255,0.6)", borderRadius: 12, padding: "10px 12px", textAlign: "center" }}>
                <div style={{ fontSize: 13, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Par poule / jour</div>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 4 }}>
                  <span style={{ fontSize: 24, fontWeight: 900, color: T.amber, letterSpacing: "-0.02em" }}>{gPP}</span>
                  <span style={{ fontSize: 13, color: T.textSub, fontWeight: 700 }}>g</span>
                </div>
                <div style={{ fontSize: 13, color: T.textSub, marginTop: 2, fontWeight: 700 }}>
                  {fmt(poules)} poules
                </div>
                <div style={{ fontSize: 14, color: gPP >= 100 && gPP <= 130 ? T.vitals : T.warning, marginTop: 1, fontWeight: 700 }}>
                  {gPP >= 100 && gPP <= 130 ? "✓ Normal" : gPP < 100 ? "⚠️ Trop faible" : "⚠️ Trop élevé"}
                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {/* Alertes */}
      <div style={{ margin: "18px 18px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontSize: 14, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700 }}>
            🔔 Alertes ({d.alertes.length})
          </span>
          <button onClick={() => setPage("sante")} style={{ background: "none", border: "none", color: T.amber, fontSize: 13, fontWeight: 700, cursor: "pointer", padding: 0 }}>
            Gérer →
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {d.alertes.map(a => {
            const isD = a.type === "danger";
            return (
              <div key={a.id} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "9px 13px",
                background: isD ? T.cardRouge : T.warningDim,
                borderRadius: 10, borderLeft: `3px solid ${isD ? T.danger : T.warning}`,
              }}>
                <span style={{ fontSize: 14 }}>{isD ? "🚨" : "⚠️"}</span>
                <span style={{ fontSize: 13, color: isD ? T.danger : T.warning, fontWeight: 700 }}>{a.msg}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Accès rapides */}
      <div style={{ margin: "18px 18px 0" }}>
        <div style={{ fontSize: 14, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, marginBottom: 10 }}>
          ⚡ Accès rapide
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {[
            { label: "Saisir ponte", ico: "🥚", page: "ponte", color: T.amber },
            { label: "Prophylaxie", ico: "💉", page: "sante", color: T.danger },
            { label: "Effectif", ico: "🐔", page: "effectif", color: T.vitals },
            { label: "Finances", ico: "💰", page: "finances", color: T.blue },
          ].map(btn => (
            <button key={btn.page} onClick={() => setPage(btn.page)} style={{
              flex: 1, background: T.cardSauge, border: `1px solid ${btn.color}25`,
              borderRadius: 12, padding: "12px 4px", cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
            }}>
              <span style={{ fontSize: 20 }}>{btn.ico}</span>
              <span style={{ fontSize: 13, color: T.textSub, fontWeight: 700, textAlign: "center", lineHeight: 1.3 }}>{btn.label}</span>
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}



// ── CARROUSEL PONTE ───────────────────────────────────────────────────────────
function CarrouselPonte({ poulaillers, setPage }) {
  const liste   = Object.values(poulaillers || POULAILLERS_INIT);
  const today   = new Date().toISOString().slice(0,10);
  const [idx, setIdx] = useState(0); // Vue globale = index 0
  const total   = liste.length + 1; // +1 pour la vue globale

  const goLeft  = () => setIdx(i => (i - 1 + total) % total);
  const goRight = () => setIdx(i => (i + 1) % total);

  // Touch swipe
  const touchStart = useRef(null);
  const onTouchStart = (e) => { touchStart.current = e.touches[0].clientX; };
  const onTouchEnd   = (e) => {
    if (!touchStart.current) return;
    const diff = touchStart.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) diff > 0 ? goRight() : goLeft();
    touchStart.current = null;
  };

  // Données de la slide courante
  // idx=0 → vue globale, idx=1 → liste[0], idx=2 → liste[1]...
  const isGlobal = idx === 0;
  const p        = !isGlobal ? liste[idx - 1] : null;

  // Ponte affichée = aujourd'hui si saisie aujourd'hui, sinon hier (veille)
  const getPonte = (poulailler) => {
    const saisieAujourdhui = poulailler.ponte.dateSaisie === today;
    return {
      valeur:    saisieAujourdhui ? poulailler.ponte.auj  : poulailler.ponte.hier,
      label:     saisieAujourdhui ? "Aujourd'hui"         : "Hier (en attente)",
      enAttente: !saisieAujourdhui,
    };
  };

  // Vue globale
  const ponteGlobale = liste.reduce((s, p) => {
    const pt = getPonte(p);
    return s + pt.valeur;
  }, 0);
  const toutSaisi = liste.every(p => p.ponte.dateSaisie === today);

  const couleur = isGlobal ? "#0D7A38" : p.couleur;

  return (
    <div style={{ margin:"16px 18px 0" }}
      onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>

      {/* Slide */}
      <div style={{
        background: couleur + "15",
        borderRadius:20, padding:"18px",
        border:`1px solid ${couleur}33`,
        position:"relative", overflow:"hidden",
        transition:"all 0.25s ease",
      }}>
        {/* Halo déco */}
        <div style={{ position:"absolute", top:-40, right:-40, width:160, height:160,
          borderRadius:"50%", background:couleur, opacity:0.06, pointerEvents:"none" }} />

        {/* Header slide */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:22 }}>{isGlobal ? "🏡" : p.ico}</span>
            <div>
              <div style={{ fontSize:11, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.08em" }}>
                {isGlobal ? "Vue globale" : p.nom}
              </div>
              {!isGlobal && (() => {
                const pt = getPonte(p);
                return (
                  <div style={{ fontSize:10, fontWeight:700,
                    color: pt.enAttente ? T.warning : T.vitals, marginTop:2 }}>
                    {pt.enAttente ? "⏳ En attente de saisie" : "✓ Saisie du jour"}
                  </div>
                );
              })()}
              {isGlobal && (
                <div style={{ fontSize:10, fontWeight:700,
                  color: toutSaisi ? T.vitals : T.warning, marginTop:2 }}>
                  {toutSaisi ? "✓ Tous saisis" : `⏳ ${liste.filter(p=>p.ponte.dateSaisie!==today).length} en attente`}
                </div>
              )}
            </div>
          </div>

          {/* Flèches nav */}
          <div style={{ display:"flex", gap:6, alignItems:"center" }}>
            <button onClick={goLeft} style={{ background:"rgba(255,255,255,0.7)", border:`1px solid ${T.border}`,
              borderRadius:8, width:30, height:30, cursor:"pointer", fontSize:14, display:"flex",
              alignItems:"center", justifyContent:"center" }}>‹</button>
            <span style={{ fontSize:11, color:T.textMuted, fontWeight:700 }}>{idx+1}/{total}</span>
            <button onClick={goRight} style={{ background:"rgba(255,255,255,0.7)", border:`1px solid ${T.border}`,
              borderRadius:8, width:30, height:30, cursor:"pointer", fontSize:14, display:"flex",
              alignItems:"center", justifyContent:"center" }}>›</button>
          </div>
        </div>

        {/* Contenu ponte */}
        {!isGlobal && (() => {
          const pt       = getPonte(p);
          const plateaux = Math.floor(pt.valeur / PLATEAU);
          const reste    = pt.valeur % PLATEAU;
          const hier     = Math.floor(p.ponte.hier / PLATEAU);
          const variation = pt.valeur - p.ponte.hier;
          const tauxPonte = Math.round(pt.valeur / p.effectif.pondeuses * 100);

          return (
            <div>
              {/* Chiffre principal */}
              <div style={{ display:"flex", alignItems:"baseline", gap:8, marginBottom:4 }}>
                <span style={{ fontSize:48, fontWeight:900, color:T.textPrimary,
                  letterSpacing:"-0.04em", lineHeight:1 }}>{plateaux}</span>
                <span style={{ fontSize:15, fontWeight:700, color:couleur }}>plateaux</span>
                {reste > 0 && (
                  <span style={{ fontSize:13, background:couleur+"22",
                    border:`1px solid ${couleur}44`, borderRadius:8, padding:"1px 8px",
                    color:couleur, fontWeight:700 }}>+ {reste} œufs</span>
                )}
              </div>
              <div style={{ fontSize:12, color:T.textMuted, marginBottom:12 }}>
                = {pt.valeur.toLocaleString("fr-FR")} œufs · taux {tauxPonte}%
                {pt.enAttente && <span style={{ color:T.warning, fontWeight:700 }}> · Données de la veille</span>}
              </div>

              {/* Stats rapides */}
              <div style={{ display:"flex", gap:8 }}>
                <div style={{ flex:1, background:"rgba(255,255,255,0.65)", borderRadius:12, padding:"9px 10px", textAlign:"center" }}>
                  <div style={{ fontSize:10, color:T.textMuted }}>Hier</div>
                  <div style={{ fontSize:16, fontWeight:900, color:T.textSub }}>{hier} plat.</div>
                </div>
                <div style={{ flex:1, background:"rgba(255,255,255,0.65)", borderRadius:12, padding:"9px 10px", textAlign:"center" }}>
                  <div style={{ fontSize:10, color:T.textMuted }}>Variation</div>
                  <div style={{ fontSize:16, fontWeight:900, color:variation>=0?T.vitals:T.danger }}>
                    {variation>=0?"▲":"▼"} {Math.abs(variation)}
                  </div>
                </div>
                <div style={{ flex:1, background:"rgba(255,255,255,0.65)", borderRadius:12, padding:"9px 10px", textAlign:"center" }}>
                  <div style={{ fontSize:10, color:T.textMuted }}>Taux</div>
                  <div style={{ fontSize:16, fontWeight:900, color:couleur }}>{tauxPonte}%</div>
                </div>
              </div>

              {/* Courbe */}
              <div style={{ marginTop:12 }}>
                <PonteCurve data={p.ponte.semaine.map(v=>Math.floor(v/PLATEAU))} unite="plat." />
                <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
                  {["L","M","M","J","V","S","Auj"].map((j,i) => (
                    <div key={i} style={{ flex:1, textAlign:"center" }}>
                      <div style={{ fontSize:9, color:i===6?couleur:T.textMuted, fontWeight:i===6?800:500 }}>{j}</div>
                      <div style={{ fontSize:9, color:i===6?couleur:T.textSub, fontWeight:700 }}>
                        {Math.floor(p.ponte.semaine[i]/PLATEAU)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Vue globale */}
        {isGlobal && (
          <div>
            {/* Chiffre principal + taux global */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
              <div>
                <div style={{ display:"flex", alignItems:"baseline", gap:8, marginBottom:4 }}>
                  <span style={{ fontSize:48, fontWeight:900, color:T.textPrimary,
                    letterSpacing:"-0.04em", lineHeight:1 }}>
                    {Math.floor(ponteGlobale/PLATEAU)}
                  </span>
                  <span style={{ fontSize:15, fontWeight:700, color:couleur }}>plateaux</span>
                </div>
                <div style={{ fontSize:12, color:T.textMuted }}>
                  = {ponteGlobale.toLocaleString("fr-FR")} œufs
                  {!toutSaisi && <span style={{ color:T.warning, fontWeight:700 }}> · données d'hier</span>}
                </div>
              </div>
              {/* Taux de ponte global */}
              {(() => {
                const totalPondeuses = liste.reduce((s,p) => s + p.effectif.pondeuses, 0);
                const tauxGlobal = totalPondeuses > 0 ? Math.round(ponteGlobale / totalPondeuses * 100) : 0;
                return (
                  <div style={{ background:"rgba(255,255,255,0.7)", borderRadius:12,
                    padding:"10px 14px", textAlign:"center", minWidth:70 }}>
                    <div style={{ fontSize:11, color:T.textMuted, marginBottom:2 }}>Taux global</div>
                    <div style={{ fontSize:26, fontWeight:900,
                      color: tauxGlobal>=80 ? "#0D7A38" : tauxGlobal>=65 ? T.amber : T.danger }}>
                      {tauxGlobal}%
                    </div>
                    <div style={{ fontSize:10, color:T.textMuted }}>de ponte</div>
                  </div>
                );
              })()}
            </div>

            {/* Détail par poulailler */}
            {liste.map(p => {
              const pt = getPonte(p);
              const pl = Math.floor(pt.valeur/PLATEAU);
              return (
                <div key={p.id} style={{ background:"rgba(255,255,255,0.65)", borderRadius:12,
                  padding:"10px 14px", marginBottom:8,
                  display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontSize:18 }}>{p.ico}</span>
                    <div>
                      <div style={{ fontSize:13, fontWeight:700, color:T.textPrimary }}>{p.nom}</div>
                      <div style={{ fontSize:10, color: pt.enAttente ? T.warning : T.vitals, fontWeight:700 }}>
                        {pt.enAttente ? "⏳ Veille" : "✓ Aujourd'hui"}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:18, fontWeight:900, color:p.couleur }}>{pl} plat.</div>
                    <div style={{ fontSize:10, color:T.textMuted }}>{pt.valeur.toLocaleString("fr-FR")} œufs</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Indicateurs dots */}
      <div style={{ display:"flex", justifyContent:"center", gap:6, marginTop:10 }}>
        {Array.from({length:total}).map((_,i) => (
          <div key={i} onClick={() => setIdx(i)} style={{
            width: i===idx ? 20 : 6, height:6, borderRadius:3,
            background: i===idx ? (i===0 ? "#0D7A38" : liste[i-1]?.couleur) : T.border,
            cursor:"pointer", transition:"all 0.25s ease",
          }} />
        ))}
      </div>

      {/* Bouton saisir ponte */}
      <button onClick={() => setPage("ponte")} style={{
        width:"100%", marginTop:10, background:T.vitals, color:"#fff",
        border:"none", borderRadius:14, padding:"13px",
        fontSize:14, fontWeight:800, cursor:"pointer",
        display:"flex", alignItems:"center", justifyContent:"center", gap:8,
      }}>
        <span>✏️</span> Saisir la ponte du jour
      </button>
    </div>
  );
}

// ── PAGE PONTE ────────────────────────────────────────────────────────────────
function PontePage({ setPage, poulailler, ventes, setVentes }) {
  const JOURS_SEMAINE = ["Lun","Mar","Mer","Jeu","Ven","Sam","Auj"];

  // État local de la page
  const [activeTab, setActiveTab] = useState("saisie"); // saisie | stock | alveoles

  // Saisie ponte
  const [saisieDate, setSaisieDate]   = useState(new Date().toISOString().slice(0,10));
  const [saisiePlat, setSaisiePlat]   = useState("");
  const [saisieOeuf, setSaisieOeuf]   = useState("");
  const [saisieBat,  setSaisieBat]    = useState("A");

  // Historique pontes (mock)
  const [historique, setHistorique] = useState([]);

  // Stock œufs dispos
  const [stockOeufs, setStockOeufs]   = useState(0);
  const [venteDate,  setVenteDate]    = useState(new Date().toISOString().slice(0,10));
  const [ventePlat,  setVentePlat]    = useState("");

  // Stock alvéoles (alvéoles)
  const [alveoles,   setAlveoles]     = useState(0);
  const [alveAdd,    setAlveAdd]      = useState("");


  const ponteParJour = historique.reduce((acc, e) => {
    if (!acc[e.date]) acc[e.date] = 0;
    acc[e.date] += e.total;
    return acc;
  }, {});
  const semaine = DATA.ponte.semaine;
  const totalAuj = (ponteParJour["2026-07-06"] || 0);

  const handleSaisie = () => {
    if (!saisiePlat && !saisieOeuf) return;
    const pl = parseInt(saisiePlat) || 0;
    const oe = parseInt(saisieOeuf) || 0;
    const total = pl * PLATEAU + oe;
    const newEntry = { id: Date.now(), date: saisieDate, bat: saisieBat, plateaux: pl, oeufs: oe, total };
    setHistorique(prev => [newEntry, ...prev]);
    setStockOeufs(prev => prev + total);
    // Consomme des alvéoles
    setAlveoles(prev => Math.max(0, prev - pl));
    setSaisiePlat(""); setSaisieOeuf("");
  };

  const handleVente = () => {
    const qte = (parseInt(ventePlat) || 0) * PLATEAU;
    if (qte <= 0 || qte > stockOeufs) return;
    setStockOeufs(prev => prev - qte);
    setVentePlat("");
  };

  const stockPlateaux = Math.floor(stockOeufs / PLATEAU);
  const stockReste    = stockOeufs % PLATEAU;

  const tabs = [
    { id:"saisie",   label:"Saisie ponte",  ico:"✏️" },
    { id:"stock",    label:"Stock œufs",    ico:"🥚" },
    { id:"alveoles", label:"Alvéoles",ico:"📦" },
  ];

  return (
    <div style={{ background: T.bg, minHeight:"100vh", paddingBottom: 90 }}>
      {/* Header */}
      <div style={{ background: T.cardVert, padding:"20px 18px 16px", borderBottom:`1px solid ${T.border}` }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
          <button onClick={() => setPage("dashboard")} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer", color:T.textSub }}>←</button>
          <div>
            <div style={{ fontSize:11, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.08em" }}>Module</div>
            <div style={{ fontSize:20, fontWeight:800, color:T.textPrimary }}>🥚 Suivi de Ponte</div>
            {poulailler && <div style={{ fontSize:11, color:T.textSub, marginTop:2 }}>{poulailler.ico} {poulailler.nom}</div>}
          </div>
        </div>

        {/* Mini courbe recap */}
        <div style={{ background:"rgba(255,255,255,0.6)", borderRadius:14, padding:"12px 14px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
            <div>
              <div style={{ fontSize:11, color:T.textMuted }}>Aujourd'hui</div>
              <div style={{ display:"flex", alignItems:"baseline", gap:6 }}>
                <span style={{ fontSize:32, fontWeight:900, color:T.amber }}>{Math.floor(DATA.ponte.auj/PLATEAU)}</span>
                <span style={{ fontSize:13, color:T.textSub, fontWeight:700 }}>plat.</span>
                {DATA.ponte.auj % PLATEAU > 0 &&
                  <span style={{ fontSize:12, color:T.textMuted }}>+ {DATA.ponte.auj % PLATEAU} œufs</span>}
              </div>
              <div style={{ fontSize:12, color:T.textMuted }}>= {DATA.ponte.auj.toLocaleString("fr-FR")} œufs · taux {DATA.ponte.taux}%</div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:11, color:T.textMuted }}>Hier</div>
              <div style={{ fontSize:18, fontWeight:800, color:T.textSub }}>{Math.floor(DATA.ponte.hier/PLATEAU)} plat.</div>
              <div style={{ fontSize:12, color: DATA.ponte.auj >= DATA.ponte.hier ? T.vitals : T.danger, fontWeight:700 }}>
                {DATA.ponte.auj >= DATA.ponte.hier ? "▲" : "▼"} {Math.abs(DATA.ponte.auj - DATA.ponte.hier)} œufs
              </div>
            </div>
          </div>
          <PonteCurve data={semaine.map(v => Math.floor(v/PLATEAU))} unite="plat." />
          <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
            {JOURS_SEMAINE.map((j,i) => (
              <div key={i} style={{ flex:1, textAlign:"center" }}>
                <div style={{ fontSize:9, color: i===6 ? T.amber : T.textMuted, fontWeight: i===6 ? 700:500 }}>{j}</div>
                <div style={{ fontSize:10, color: i===6 ? T.amber : T.textSub, fontWeight:700 }}>{Math.floor(semaine[i]/PLATEAU)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", margin:"16px 18px 0", gap:8 }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            flex:1, padding:"9px 4px", borderRadius:12, border:"none", cursor:"pointer",
            background: activeTab===tab.id ? T.amber : T.cardSauge,
            transition:"all 0.18s ease",
          }}>
            <div style={{ fontSize:16 }}>{tab.ico}</div>
            <div style={{ fontSize:10, fontWeight:700, color: activeTab===tab.id ? "#fff" : T.textSub, marginTop:2 }}>
              {tab.label}
            </div>
          </button>
        ))}
      </div>

      {/* ── TAB SAISIE ── */}
      {activeTab === "saisie" && (
        <div style={{ padding:"16px 18px 0" }}>

          {/* Formulaire */}
          <div style={{ background: T.cardVert, borderRadius:16, padding:"16px", marginBottom:16, border:`1px solid rgba(13,122,56,0.15)` }}>
            <div style={{ fontSize:12, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:700, marginBottom:12 }}>
              Nouvelle saisie
            </div>

            {/* Date + Bâtiment */}
            <div style={{ display:"flex", gap:10, marginBottom:10 }}>
              <div style={{ flex:2 }}>
                <div style={{ fontSize:11, color:T.textMuted, marginBottom:4 }}>Date</div>
                <input type="date" value={saisieDate} onChange={e=>setSaisieDate(e.target.value)}
                  style={{ width:"100%", padding:"9px 12px", borderRadius:10, border:`1px solid ${T.border}`,
                    background:"rgba(255,255,255,0.8)", fontSize:13, color:T.textPrimary, boxSizing:"border-box" }} />
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:11, color:T.textMuted, marginBottom:4 }}>Bâtiment</div>
                <select value={saisieBat} onChange={e=>setSaisieBat(e.target.value)}
                  style={{ width:"100%", padding:"9px 12px", borderRadius:10, border:`1px solid ${T.border}`,
                    background:"rgba(255,255,255,0.8)", fontSize:13, color:T.textPrimary, boxSizing:"border-box" }}>
                  {["A","B","C","D"].map(b => <option key={b} value={b}>Bât. {b}</option>)}
                </select>
              </div>
            </div>

            {/* Plateaux + Œufs */}
            <div style={{ display:"flex", gap:10, marginBottom:12 }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:11, color:T.textMuted, marginBottom:4 }}>Plateaux (×30)</div>
                <input type="number" min="0" value={saisiePlat} onChange={e=>setSaisiePlat(e.target.value)}
                  placeholder="0"
                  style={{ width:"100%", padding:"9px 12px", borderRadius:10, border:`1px solid ${T.border}`,
                    background:"rgba(255,255,255,0.8)", fontSize:16, fontWeight:800, color:T.amber, boxSizing:"border-box" }} />
              </div>
              <div style={{ display:"flex", alignItems:"flex-end", paddingBottom:10, fontSize:16, color:T.textMuted }}>+</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:11, color:T.textMuted, marginBottom:4 }}>Œufs en plus</div>
                <input type="number" min="0" max="29" value={saisieOeuf} onChange={e=>setSaisieOeuf(e.target.value)}
                  placeholder="0"
                  style={{ width:"100%", padding:"9px 12px", borderRadius:10, border:`1px solid ${T.border}`,
                    background:"rgba(255,255,255,0.8)", fontSize:16, fontWeight:800, color:T.textPrimary, boxSizing:"border-box" }} />
              </div>
            </div>

            {/* Total preview */}
            {(saisiePlat || saisieOeuf) && (
              <div style={{ background:"rgba(255,255,255,0.7)", borderRadius:10, padding:"8px 12px", marginBottom:12, textAlign:"center" }}>
                <span style={{ fontSize:13, color:T.textMuted }}>Total : </span>
                <span style={{ fontSize:16, fontWeight:900, color:T.amber }}>
                  {((parseInt(saisiePlat)||0)*PLATEAU + (parseInt(saisieOeuf)||0)).toLocaleString("fr-FR")} œufs
                </span>
                <span style={{ fontSize:12, color:T.textMuted }}>
                  {" "}({parseInt(saisiePlat)||0} plat. + {parseInt(saisieOeuf)||0} œufs)
                </span>
              </div>
            )}

            <button onClick={handleSaisie} style={{
              width:"100%", background: T.vitals, color:"#fff", border:"none",
              borderRadius:12, padding:"13px", fontSize:15, fontWeight:800, cursor:"pointer",
            }}>
              ✓ Enregistrer la ponte
            </button>
          </div>

          {/* Historique */}
          <div style={{ fontSize:12, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:700, marginBottom:10 }}>
            Historique récent
          </div>
          {Object.entries(
            historique.reduce((acc, e) => {
              if (!acc[e.date]) acc[e.date] = [];
              acc[e.date].push(e);
              return acc;
            }, {})
          ).map(([date, entries]) => {
            const totalJour = entries.reduce((s,e) => s+e.total, 0);
            const platJour  = Math.floor(totalJour/PLATEAU);
            const resteJour = totalJour % PLATEAU;
            return (
              <div key={date} style={{ marginBottom:12 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                  <span style={{ fontSize:12, color:T.textSub, fontWeight:700 }}>
                    {new Date(date+"T12:00:00").toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"short"})}
                  </span>
                  <span style={{ fontSize:13, fontWeight:900, color:T.amber }}>
                    {platJour} plat.{resteJour>0?` + ${resteJour} œufs`:""} = {totalJour.toLocaleString("fr-FR")} œufs
                  </span>
                </div>
                {entries.map(e => (
                  <div key={e.id} style={{
                    background: T.cardSauge, borderRadius:10, padding:"9px 14px",
                    display:"flex", justifyContent:"space-between", alignItems:"center",
                    marginBottom:5, border:`1px solid ${T.border}`
                  }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <div style={{ background:T.amber+"22", borderRadius:8, padding:"3px 8px" }}>
                        <span style={{ fontSize:11, fontWeight:800, color:T.amber }}>Bât. {e.bat}</span>
                      </div>
                      <span style={{ fontSize:12, color:T.textSub }}>{e.plateaux} plat. + {e.oeufs} œufs</span>
                    </div>
                    <span style={{ fontSize:13, fontWeight:800, color:T.textPrimary }}>{e.total.toLocaleString("fr-FR")} œufs</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* ── TAB STOCK ŒUFS ── */}
      {activeTab === "stock" && (
        <div style={{ padding:"16px 18px 0" }}>

          {/* Solde actuel */}
          <div style={{ background: T.cardBleu, borderRadius:16, padding:"18px", marginBottom:14, border:`1px solid rgba(37,99,235,0.15)`, textAlign:"center" }}>
            <div style={{ fontSize:11, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.08em" }}>Stock disponible</div>
            <div style={{ display:"flex", alignItems:"baseline", justifyContent:"center", gap:8, margin:"8px 0 4px" }}>
              <span style={{ fontSize:48, fontWeight:900, color:T.blue, letterSpacing:"-0.04em" }}>{stockPlateaux}</span>
              <span style={{ fontSize:16, color:T.textSub, fontWeight:700 }}>plateaux</span>
            </div>
            {stockReste > 0 && <div style={{ fontSize:13, color:T.textMuted }}>+ {stockReste} œufs</div>}
            <div style={{ fontSize:13, color:T.textSub, marginTop:4 }}>= {stockOeufs.toLocaleString("fr-FR")} œufs au total</div>
          </div>

          <FormVente
            onSave={(v) => {
              setVentes(p => [v, ...p]);
              setStockOeufs(p => Math.max(0, p - v.plateaux * PLATEAU));
            }}
          />
          <div style={{ height:14 }} />

          {/* Mini historique mouvements */}
          <div style={{ fontSize:12, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:700, marginBottom:10 }}>
            Derniers mouvements
          </div>
          {[
            { type:"vente",   date:"03 juil.", qte:-600,  label:"Vente client" },
            { type:"ponte",   date:"06 juil.", qte:+391,  label:"Ponte du jour" },
            { type:"ponte",   date:"05 juil.", qte:+387,  label:"Ponte hier" },
            { type:"vente",   date:"01 juil.", qte:-900,  label:"Vente marché" },
          ].map((m,i) => (
            <div key={i} style={{
              background: T.cardSauge, borderRadius:10, padding:"10px 14px",
              display:"flex", justifyContent:"space-between", alignItems:"center",
              marginBottom:7, border:`1px solid ${T.border}`
            }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:18 }}>{m.type==="vente"?"🛒":"🥚"}</span>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:T.textPrimary }}>{m.label}</div>
                  <div style={{ fontSize:11, color:T.textMuted }}>{m.date}</div>
                </div>
              </div>
              <div style={{ fontSize:14, fontWeight:900, color: m.qte>0 ? T.vitals : T.danger }}>
                {m.qte>0?"+":""}{Math.floor(m.qte/PLATEAU)} plat.
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── TAB ALVÉOLES ── */}
      {activeTab === "alveoles" && (
        <div style={{ padding:"16px 18px 0" }}>

          {/* Stock actuel */}
          <div style={{
            background: alveoles < 30 ? T.cardRouge : T.cardVert,
            borderRadius:16, padding:"18px", marginBottom:14,
            border:`1px solid ${alveoles < 30 ? T.danger+"44" : "rgba(13,122,56,0.15)"}`,
            textAlign:"center",
          }}>
            <div style={{ fontSize:11, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.08em" }}>Alvéoles disponibles</div>
            <div style={{ display:"flex", alignItems:"baseline", justifyContent:"center", gap:8, margin:"8px 0 4px" }}>
              <span style={{ fontSize:48, fontWeight:900, color: alveoles < 30 ? T.danger : T.vitals, letterSpacing:"-0.04em" }}>
                {alveoles}
              </span>
              <span style={{ fontSize:16, fontWeight:700, color:T.textSub }}>plateaux</span>
            </div>
            <div style={{ fontSize:13, color: alveoles < 30 ? T.danger : T.textSub, fontWeight: alveoles<30?700:500 }}>
              {alveoles < 30 ? "⚠️ Stock bas — pensez à en racheter !" : `Suffisant pour ${Math.floor(alveoles / (DATA.ponte.auj/PLATEAU)).toFixed(0)} jour(s)`}
            </div>
          </div>

          {/* Ajouter des alvéoles */}
          <div style={{ background: T.cardVert, borderRadius:16, padding:"16px", marginBottom:14, border:`1px solid rgba(13,122,56,0.15)` }}>
            <div style={{ fontSize:12, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:700, marginBottom:12 }}>
              📦 Réapprovisionner
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <input type="number" min="0" value={alveAdd} onChange={e=>setAlveAdd(e.target.value)}
                placeholder="Nb plateaux reçus"
                style={{ flex:1, padding:"10px 14px", borderRadius:10, border:`1px solid ${T.border}`,
                  background:"rgba(255,255,255,0.8)", fontSize:14, fontWeight:700, color:T.textPrimary }} />
              <button onClick={() => { setAlveoles(p=>p+(parseInt(alveAdd)||0)); setAlveAdd(""); }} style={{
                background: T.vitals, color:"#fff", border:"none", borderRadius:10,
                padding:"10px 18px", fontSize:15, fontWeight:800, cursor:"pointer"
              }}>+ Ajouter</button>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}



// ── FORMULAIRE VENTE PARTAGÉ ──────────────────────────────────────────────────
function FormVente({ onSave, stockOeufs, setStockOeufs }) {
  const [vDate,        setVDate]        = useState(new Date().toISOString().slice(0,10));
  const [vPlat,        setVPlat]        = useState("");
  const [vPrix,        setVPrix]        = useState("3500");
  const [vNote,        setVNote]        = useState("");
  const [vStatut,      setVStatut]      = useState("paye");
  const [vEcheance,    setVEcheance]    = useState("");

  const pl    = parseInt(vPlat) || 0;
  const px    = parseInt(vPrix) || 0;
  const total = pl * px;

  const handleSave = () => {
    if (!pl || !px) return;
    const vente = {
      id: Date.now(), date: vDate, ponteDate: vDate,
      plateaux: pl, prixUnitaire: px, total, note: vNote,
      statut: vStatut,
      ...(vStatut==="paye"    && { datePaiement: vDate }),
      ...(vStatut==="impaye"  && { dateEcheance: vEcheance }),
      ...(vStatut==="partiel" && { montantRecu: parseInt(vMontantRecu)||0, dateEcheance: vEcheance }),
    };
    onSave(vente);
    if (setStockOeufs) setStockOeufs(p => Math.max(0, p - pl * PLATEAU));
    setVPlat(""); setVNote(""); setVMontantRecu(""); setVEcheance("");
  };

  return (
    <div style={{ background:T.cardVert, borderRadius:16, padding:"16px", border:`1px solid rgba(13,122,56,0.15)` }}>
      <div style={{ fontSize:12, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:700, marginBottom:12 }}>
        🛒 Enregistrer une vente
      </div>

      {/* Date */}
      <div style={{ marginBottom:10 }}>
        <div style={{ fontSize:11, color:T.textMuted, marginBottom:4 }}>Date de vente</div>
        <input type="date" value={vDate} onChange={e=>setVDate(e.target.value)}
          style={{ width:"100%", padding:"9px 12px", borderRadius:10, border:`1px solid ${T.border}`,
            background:"rgba(255,255,255,0.8)", fontSize:13, color:T.textPrimary, boxSizing:"border-box" }} />
      </div>

      {/* Plateaux + Prix */}
      <div style={{ display:"flex", gap:10, marginBottom:10 }}>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:11, color:T.textMuted, marginBottom:4 }}>Nb plateaux</div>
          <input type="number" min="0" value={vPlat} onChange={e=>setVPlat(e.target.value)} placeholder="0"
            style={{ width:"100%", padding:"10px 12px", borderRadius:10, border:`1px solid ${T.border}`,
              background:"rgba(255,255,255,0.8)", fontSize:18, fontWeight:900, color:T.vitals, boxSizing:"border-box" }} />
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:11, color:T.textMuted, marginBottom:4 }}>Prix / plateau (F)</div>
          <input type="number" min="0" value={vPrix} onChange={e=>setVPrix(e.target.value)}
            style={{ width:"100%", padding:"10px 12px", borderRadius:10, border:`1px solid ${T.border}`,
              background:"rgba(255,255,255,0.8)", fontSize:18, fontWeight:900, color:T.amber, boxSizing:"border-box" }} />
        </div>
      </div>

      {/* Client */}
      <div style={{ marginBottom:10 }}>
        <div style={{ fontSize:11, color:T.textMuted, marginBottom:4 }}>Client / Note</div>
        <input type="text" value={vNote} onChange={e=>setVNote(e.target.value)}
          placeholder="Ex: Marché central, Client Awa..."
          style={{ width:"100%", padding:"9px 12px", borderRadius:10, border:`1px solid ${T.border}`,
            background:"rgba(255,255,255,0.8)", fontSize:13, color:T.textPrimary, boxSizing:"border-box" }} />
      </div>

      {/* Statut paiement */}
      <div style={{ marginBottom:10 }}>
        <div style={{ fontSize:11, color:T.textMuted, marginBottom:6, fontWeight:700 }}>Statut du paiement</div>
        <div style={{ display:"flex", gap:8 }}>
          {[
            { id:"paye",    label:"✓ Payé",    color:T.vitals  },
            { id:"partiel", label:"⚡ Partiel", color:T.warning },
            { id:"impaye",  label:"🔴 Impayé",  color:T.danger  },
          ].map(s => (
            <button key={s.id} onClick={() => setVStatut(s.id)} style={{
              flex:1, padding:"9px 4px", borderRadius:10, cursor:"pointer",
              background: vStatut===s.id ? s.color+"22" : "rgba(255,255,255,0.7)",
              border:`1.5px solid ${vStatut===s.id ? s.color : T.border}`,
              fontSize:11, fontWeight:700, color: vStatut===s.id ? s.color : T.textSub,
            }}>{s.label}</button>
          ))}
        </div>
      </div>

      {/* Montant reçu si partiel */}
      {vStatut==="partiel" && (
        <div style={{ marginBottom:10 }}>
          <div style={{ fontSize:11, color:T.textMuted, marginBottom:4 }}>Montant déjà reçu (FCFA)</div>
          <input type="number" value={vMontantRecu} onChange={e=>setVMontantRecu(e.target.value)} placeholder="0"
            style={{ width:"100%", padding:"10px 12px", borderRadius:10, border:`1px solid ${T.warning}55`,
              background:"rgba(255,255,255,0.8)", fontSize:16, fontWeight:900,
              color:T.warning, boxSizing:"border-box" }} />
        </div>
      )}

      {/* Date échéance */}
      {(vStatut==="impaye"||vStatut==="partiel") && (
        <div style={{ marginBottom:10 }}>
          <div style={{ fontSize:11, color:T.textMuted, marginBottom:4 }}>Date d'échéance</div>
          <input type="date" value={vEcheance} onChange={e=>setVEcheance(e.target.value)}
            style={{ width:"100%", padding:"9px 12px", borderRadius:10, border:`1px solid ${T.danger}55`,
              background:"rgba(255,255,255,0.8)", fontSize:13, color:T.danger, boxSizing:"border-box" }} />
        </div>
      )}

      {/* Aperçu total */}
      {pl > 0 && px > 0 && (
        <div style={{ background:"rgba(255,255,255,0.7)", borderRadius:10, padding:"9px 12px", marginBottom:12, textAlign:"center" }}>
          <span style={{ fontSize:13, color:T.textMuted }}>Total : </span>
          <span style={{ fontSize:18, fontWeight:900, color:T.vitals }}>{fmt(total)} FCFA</span>
          <span style={{ fontSize:12, color:T.textMuted }}> · {pl} plat. × {fmt(px)} F</span>
          {vStatut==="partiel" && vMontantRecu && (
            <div style={{ fontSize:12, color:T.warning, marginTop:2 }}>
              Reçu: {fmt(parseInt(vMontantRecu)||0)} F · Reste: {fmt(total-(parseInt(vMontantRecu)||0))} F
            </div>
          )}
        </div>
      )}

      <button onClick={handleSave} style={{
        width:"100%", background:T.vitals, color:"#fff", border:"none",
        borderRadius:12, padding:"13px", fontSize:15, fontWeight:800, cursor:"pointer"
      }}>✓ Enregistrer la vente</button>
    </div>
  );
}


// ── WIDGET MISE À JOUR STOCK ──────────────────────────────────────────────────
function UpdateStockWidget({ stockKg, setStock }) {
  const [show,     setShow]     = useState(false);
  const [newStock, setNewStock] = useState("");

  return (
    <div style={{ background:T.cardVert, borderRadius:16, padding:"14px 16px",
      marginBottom:14, border:`1px solid rgba(13,122,56,0.15)` }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <div style={{ fontSize:12, color:T.textMuted, textTransform:"uppercase",
            letterSpacing:"0.08em", fontWeight:700 }}>📦 Stock actuel</div>
          <div style={{ display:"flex", alignItems:"baseline", gap:6, marginTop:4 }}>
            <span style={{ fontSize:28, fontWeight:900, color:T.vitals }}>{Math.floor(stockKg/SAC_KG)}</span>
            <span style={{ fontSize:13, color:T.textSub, fontWeight:700 }}>sacs</span>
            <span style={{ fontSize:12, color:T.textMuted }}>({fmt(stockKg)} kg)</span>
          </div>
        </div>
        <button onClick={() => setShow(v=>!v)} style={{
          background: show ? T.danger : T.vitals,
          color:"#fff", border:"none", borderRadius:10,
          padding:"9px 14px", fontSize:12, fontWeight:800, cursor:"pointer"
        }}>{show ? "✕" : "✏️ Modifier"}</button>
      </div>

      {show && (
        <div style={{ marginTop:12 }}>
          <div style={{ fontSize:11, color:T.textMuted, marginBottom:6 }}>
            Entrez le stock réel en kg (ex: 1200 = 24 sacs)
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <input type="number" value={newStock}
              onChange={e => setNewStock(e.target.value)}
              placeholder="0"
              style={{ flex:1, padding:"10px 14px", borderRadius:10,
                border:`1px solid ${T.vitals}55`, background:"rgba(255,255,255,0.9)",
                fontSize:20, fontWeight:900, color:T.vitals, boxSizing:"border-box" }} />
            <button onClick={() => {
              const kg = parseInt(newStock) || 0;
              if (kg >= 0) { setStock(kg); setShow(false); setNewStock(""); }
            }} style={{
              background:T.vitals, color:"#fff", border:"none",
              borderRadius:10, padding:"10px 20px", fontSize:16, fontWeight:800, cursor:"pointer"
            }}>✓</button>
          </div>
          {newStock && (
            <div style={{ fontSize:11, color:T.vitals, marginTop:6, fontWeight:700 }}>
              = {Math.floor((parseInt(newStock)||0)/SAC_KG)} sacs + {(parseInt(newStock)||0)%SAC_KG} kg restants
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── PAGE STOCK ALIMENT ────────────────────────────────────────────────────────
function StockPage({ setPage, consoTotale, poulaillers, stockKgGlobal, setStockKgGlobal }) {

  const [stockKg, setStockKg] = useState(stockKgGlobal || 0);
  // Synchroniser avec l'état global
  const setStock = (val) => {
    const newVal = typeof val === 'function' ? val(stockKg) : val;
    setStockKg(newVal);
    if (setStockKgGlobal) setStockKgGlobal(newVal);
  };
  // Stock estimé selon l'heure (distributions auto)
  const getStockEstimePage = () => {
    const heure = new Date().getHours() + new Date().getMinutes()/60;
    const rationM = Math.round((consoTotale||378) * 0.6);
    const rationS = Math.round((consoTotale||378) * 0.4);
    let est = stockKg;
    if (heure >= 8)  est -= rationM;
    if (heure >= 16) est -= rationS;
    return Math.max(0, est);
  };
  const [consoJour, setConsoJour]     = useState(230);
  const [seuilAlerte, setSeuilAlerte] = useState(7);  // jours
  const [showConfig, setShowConfig]   = useState(false);

  // Saisie livraison
  const [livrSacs, setLivrSacs]       = useState("");
  const [livrDate, setLivrDate]       = useState(new Date().toISOString().slice(0,10));

  // Saisie conso par poulailler
  const [consoDate,  setConsoDate]   = useState(new Date().toISOString().slice(0,10));
  const [consoPoul,  setConsoPoul]   = useState("A"); // poulailler sélectionné
  const [consoSacsA, setConsoSacsA] = useState("");
  const [consoKgA,   setConsoKgA]   = useState("");
  const [consoSacsB, setConsoSacsB] = useState("");
  const [consoKgB,   setConsoKgB]   = useState("");

  const [activeTab, setActiveTab]     = useState("stock");

  // Historique mouvements
  const [historique, setHistorique]   = useState([]);

  const autonomie   = Math.floor(stockKg / (consoTotale || consoJour));
  const rupture     = new Date();
  rupture.setDate(rupture.getDate() + autonomie);
  const ruptureStr  = rupture.toLocaleDateString("fr-FR", { day:"numeric", month:"long" });
  const critique    = autonomie <= seuilAlerte;
  const pctStock    = Math.min(Math.round(stockKg / 2000 * 100), 100);

  const sacsStock   = Math.floor(stockKg / SAC_KG);
  const resteKg     = stockKg % SAC_KG;
  const sacsDecimal = (stockKg / SAC_KG).toFixed(1);

  const gPP = Math.round((consoJour / DATA.effectif.pondeuses) * 1000);

  const handleLivraison = () => {
    const sacs = parseInt(livrSacs) || 0;
    if (!sacs) return;
    const kg = sacs * SAC_KG;
    setStock(p => p + kg);
    setHistorique(p => [{
      id: Date.now(), type:"livraison", date: livrDate,
      sacs, kg, label:"Livraison fournisseur"
    }, ...p]);
    setLivrSacs("");
  };

  const handleConso = () => {
    const sacsA = parseInt(consoSacsA)||0;
    const kgA   = parseInt(consoKgA)||0;
    const sacsB = parseInt(consoSacsB)||0;
    const kgB   = parseInt(consoKgB)||0;
    const totalA = sacsA * SAC_KG + kgA;
    const totalB = sacsB * SAC_KG + kgB;
    const total  = totalA + totalB;
    const sacsTotal = Math.floor(total / SAC_KG);
    if (!total) return;
    setStock(p => Math.max(0, p - total));
    setConsoJour(total);
    // Une seule ligne = somme totale A + B
    setHistorique(p => [{
      id: Date.now(), type:"consommation", date:new Date().toISOString().slice(0,10),
      sacs: sacsTotal, kg: total,
      label:`Conso totale (A: ${fmt(totalA)}kg · B: ${fmt(totalB)}kg)`
    }, ...p]);
    setConsoSacsA(""); setConsoKgA("");
    setConsoSacsB(""); setConsoKgB("");
  };

  const tabs = [
    { id:"stock",    label:"Stock",      ico:"🌾" },
    { id:"entree",   label:"Livraison",  ico:"📦" },
    { id:"sortie",   label:"Conso. réf.", ico:"🐔" },
    { id:"historique", label:"Historique", ico:"📋" },
  ];

  return (
    <div style={{ background: T.bg, minHeight:"100vh", paddingBottom:90 }}>

      {/* Header */}
      <div style={{ background: T.cardAmbre, padding:"20px 18px 16px", borderBottom:`1px solid rgba(224,147,18,0.2)` }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
          <button onClick={() => setPage("dashboard")} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer", color:T.textSub }}>←</button>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:11, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.08em" }}>Module</div>
            <div style={{ fontSize:20, fontWeight:800, color:T.textPrimary }}>🌾 Stock Aliment</div>
          </div>
          <button onClick={() => setShowConfig(v => !v)} style={{
            background:"rgba(255,255,255,0.6)", border:`1px solid ${T.border}`,
            borderRadius:10, padding:"6px 12px", cursor:"pointer", fontSize:12, fontWeight:700, color:T.textSub
          }}>⚙️ Seuil</button>
        </div>

        {/* Config seuil alerte */}
        {showConfig && (
          <div style={{ background:"rgba(255,255,255,0.7)", borderRadius:12, padding:"12px 14px", marginBottom:12 }}>
            <div style={{ fontSize:12, color:T.textMuted, marginBottom:8, fontWeight:700 }}>
              🔔 Déclencher alerte rouge si autonomie ≤
            </div>
            <div style={{ display:"flex", gap:10, alignItems:"center" }}>
              <input type="number" min="1" max="30" value={seuilAlerte}
                onChange={e => setSeuilAlerte(parseInt(e.target.value)||2)}
                style={{ width:80, padding:"8px 12px", borderRadius:10, border:`1px solid ${T.border}`,
                  fontSize:18, fontWeight:900, color:T.amber, textAlign:"center" }} />
              <span style={{ fontSize:13, color:T.textSub, fontWeight:700 }}>jours</span>
              <button onClick={() => setShowConfig(false)} style={{
                marginLeft:"auto", background:T.amber, color:"#fff", border:"none",
                borderRadius:10, padding:"8px 16px", fontWeight:800, cursor:"pointer", fontSize:13
              }}>✓ OK</button>
            </div>
          </div>
        )}

        {/* Résumé stock */}
        <div style={{ background:"rgba(255,255,255,0.65)", borderRadius:14, padding:"14px 16px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
            <div>
              <div style={{ fontSize:11, color:T.textMuted, marginBottom:3 }}>Stock actuel</div>
              <div style={{ display:"flex", alignItems:"baseline", gap:6 }}>
                <span style={{ fontSize:40, fontWeight:900, color: critique ? T.danger : T.amber, letterSpacing:"-0.04em" }}>{sacsStock}</span>
                <span style={{ fontSize:15, fontWeight:700, color:T.textSub }}>sacs</span>
              </div>
              {resteKg > 0 && <div style={{ fontSize:12, color:T.textMuted }}>+ {resteKg} kg</div>}
              <div style={{ fontSize:12, color:T.textMuted, marginTop:2 }}>{fmt(stockKg)} kg au total</div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:11, color:T.textMuted, marginBottom:3 }}>Date de rupture</div>
              <div style={{ fontSize:15, fontWeight:800, color: critique ? T.danger : T.textPrimary }}>{ruptureStr}</div>
              <div style={{ fontSize:12, fontWeight:700, color: critique ? T.danger : T.vitals, marginTop:2 }}>
                {critique ? `🔴 Dans ${autonomie} jours !` : `✓ ${autonomie} jours d'autonomie`}
              </div>
            </div>
          </div>

          {/* Barre progression */}
          <div style={{ height:8, background:"rgba(0,0,0,0.08)", borderRadius:4, overflow:"hidden" }}>
            <div style={{
              height:"100%", width:`${pctStock}%`, borderRadius:4,
              background: critique ? T.danger : T.amber,
              boxShadow: `0 0 8px ${critique ? T.danger : T.amber}66`,
              transition:"width 1s ease"
            }} />
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
            <span style={{ fontSize:11, color:T.textMuted }}>0</span>
            <span style={{ fontSize:11, color:T.textMuted, fontWeight:700 }}>{pctStock}% du stock max</span>
            <span style={{ fontSize:11, color:T.textMuted }}>2 000 kg</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", margin:"16px 18px 0", gap:8 }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            flex:1, padding:"9px 4px", borderRadius:12, border:"none", cursor:"pointer",
            background: activeTab===tab.id ? T.amber : T.cardSauge,
            transition:"all 0.18s ease",
          }}>
            <div style={{ fontSize:16 }}>{tab.ico}</div>
            <div style={{ fontSize:10, fontWeight:700, color: activeTab===tab.id ? "#fff" : T.textSub, marginTop:2 }}>
              {tab.label}
            </div>
          </button>
        ))}
      </div>

      {/* ── TAB STOCK SYNTHESE ── */}
      {activeTab === "stock" && (
        <div style={{ padding:"16px 18px 0" }}>

          {/* Conso journalière */}
          <div style={{ background: T.cardAmbre, borderRadius:16, padding:"16px", marginBottom:14, border:`1px solid rgba(224,147,18,0.2)` }}>
            <div style={{ fontSize:12, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:700, marginBottom:12 }}>
              🌾 Consommation journalière
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <div style={{ flex:1, background:"rgba(255,255,255,0.65)", borderRadius:12, padding:"12px", textAlign:"center" }}>
                <div style={{ fontSize:11, color:T.textMuted, marginBottom:4 }}>Total / jour</div>
                <div style={{ display:"flex", alignItems:"baseline", justifyContent:"center", gap:4 }}>
                  <span style={{ fontSize:26, fontWeight:900, color:T.amber }}>{(consoJour/SAC_KG).toFixed(1)}</span>
                  <span style={{ fontSize:12, fontWeight:700, color:T.textSub }}>sacs</span>
                </div>
                <div style={{ fontSize:12, color:T.textSub, marginTop:2, fontWeight:700 }}>
                  {Math.floor(consoJour/SAC_KG)} sacs + {consoJour%SAC_KG} kg
                </div>
                <div style={{ fontSize:11, color:T.textMuted }}>{fmt(consoJour)} kg/jour</div>
              </div>
              <div style={{ flex:1, background:"rgba(255,255,255,0.65)", borderRadius:12, padding:"12px", textAlign:"center" }}>
                <div style={{ fontSize:11, color:T.textMuted, marginBottom:4 }}>Par poule / jour</div>
                <div style={{ display:"flex", alignItems:"baseline", justifyContent:"center", gap:4 }}>
                  <span style={{ fontSize:26, fontWeight:900, color:T.amber }}>{gPP}</span>
                  <span style={{ fontSize:12, fontWeight:700, color:T.textSub }}>g</span>
                </div>
                <div style={{ fontSize:12, color:T.textSub, marginTop:2 }}>{fmt(DATA.effectif.pondeuses)} poules</div>
                <div style={{ fontSize:11, fontWeight:700, color: gPP>=100&&gPP<=130 ? T.vitals : T.warning, marginTop:2 }}>
                  {gPP>=100&&gPP<=130 ? "✓ Normal (100-130g)" : gPP<100 ? "⚠️ Trop faible" : "⚠️ Trop élevé"}
                </div>
              </div>
            </div>
          </div>



          {/* Distributions du jour */}
          {(() => {
            const heure   = new Date().getHours() + new Date().getMinutes()/60;
            const conso   = consoTotale || 378;
            const rationM = Math.round(conso * 0.5);
            const rationS = Math.round(conso * 0.5);
            const estim   = getStockEstimePage();
            const sacsEst = Math.floor(estim / SAC_KG);
            const distribs = [];
            if (heure >= 8)  distribs.push({ heure:"08:00", kg:rationM, faite:true,  label:"Matin (50%)" });
            else             distribs.push({ heure:"08:00", kg:rationM, faite:false, label:"Matin (50%)" });
            if (heure >= 16) distribs.push({ heure:"16:00", kg:rationS, faite:true,  label:"Soir (50%)" });
            else             distribs.push({ heure:"16:00", kg:rationS, faite:false, label:"Soir (50%)" });
            const prochaine = heure < 8 ? "08:00" : heure < 16 ? "16:00" : "08:00 demain";
            return (
              <div style={{ background:T.cardVert, borderRadius:16, padding:"16px",
                marginBottom:14, border:`1px solid rgba(13,122,56,0.15)` }}>
                <div style={{ fontSize:12, color:T.textMuted, textTransform:"uppercase",
                  letterSpacing:"0.08em", fontWeight:700, marginBottom:12 }}>
                  ⏰ Distributions automatiques du jour
                </div>
                <div style={{ display:"flex", gap:10, marginBottom:12 }}>
                  {distribs.map((d,i) => (
                    <div key={i} style={{ flex:1, background:"rgba(255,255,255,0.7)",
                      borderRadius:12, padding:"10px", textAlign:"center",
                      border:`1px solid ${d.faite ? T.vitals+"44" : T.border}` }}>
                      <div style={{ fontSize:11, fontWeight:700,
                        color: d.faite ? T.vitals : T.textMuted }}>{d.heure}</div>
                      <div style={{ fontSize:15, fontWeight:900, color:T.textPrimary,
                        margin:"4px 0" }}>{fmt(d.kg)} kg</div>
                      <div style={{ fontSize:10, color:T.textMuted }}>{d.label}</div>
                      <div style={{ fontSize:11, fontWeight:700, marginTop:4,
                        color: d.faite ? T.vitals : T.textMuted }}>
                        {d.faite ? "✓ Distribuée" : "⏳ À venir"}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ display:"flex", justifyContent:"space-between",
                  background:"rgba(255,255,255,0.6)", borderRadius:10, padding:"10px 14px" }}>
                  <div>
                    <div style={{ fontSize:11, color:T.textMuted }}>Stock estimé maintenant</div>
                    <div style={{ fontSize:18, fontWeight:900, color:T.vitals }}>
                      {sacsEst} sacs ({fmt(estim)} kg)
                    </div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:11, color:T.textMuted }}>Prochaine distribution</div>
                    <div style={{ fontSize:14, fontWeight:800, color:T.amber }}>{prochaine}</div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Alerte seuil */}
          {critique && (
            <div style={{ background:T.cardRouge, borderRadius:14, padding:"14px 16px", border:`1px solid ${T.danger}44`, marginBottom:14 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <span style={{ fontSize:24 }}>🚨</span>
                <div>
                  <div style={{ fontSize:14, fontWeight:800, color:T.danger }}>Stock critique !</div>
                  <div style={{ fontSize:12, color:T.danger, marginTop:2 }}>
                    Rupture le {ruptureStr} — seulement {autonomie} jour(s) restant(s). Commandez maintenant.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB LIVRAISON ── */}
      {activeTab === "entree" && (
        <div style={{ padding:"16px 18px 0" }}>
          <div style={{ background: T.cardVert, borderRadius:16, padding:"16px", border:`1px solid rgba(13,122,56,0.15)` }}>
            <div style={{ fontSize:12, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:700, marginBottom:12 }}>
              📦 Nouvelle livraison
            </div>
            <div style={{ marginBottom:10 }}>
              <div style={{ fontSize:11, color:T.textMuted, marginBottom:4 }}>Date de livraison</div>
              <input type="date" value={livrDate} onChange={e=>setLivrDate(e.target.value)}
                style={{ width:"100%", padding:"10px 12px", borderRadius:10, border:`1px solid ${T.border}`,
                  background:"rgba(255,255,255,0.8)", fontSize:13, color:T.textPrimary, boxSizing:"border-box" }} />
            </div>
            <div style={{ marginBottom:12 }}>
              <div style={{ fontSize:11, color:T.textMuted, marginBottom:4 }}>Nombre de sacs reçus (50 kg / sac)</div>
              <input type="number" min="0" value={livrSacs} onChange={e=>setLivrSacs(e.target.value)}
                placeholder="0"
                style={{ width:"100%", padding:"12px 14px", borderRadius:10, border:`1px solid ${T.border}`,
                  background:"rgba(255,255,255,0.8)", fontSize:22, fontWeight:900, color:T.vitals, boxSizing:"border-box" }} />
            </div>
            {livrSacs && (
              <div style={{ background:"rgba(255,255,255,0.7)", borderRadius:10, padding:"9px 12px", marginBottom:12, textAlign:"center" }}>
                <span style={{ fontSize:13, color:T.textMuted }}>= </span>
                <span style={{ fontSize:16, fontWeight:900, color:T.vitals }}>{fmt((parseInt(livrSacs)||0)*SAC_KG)} kg ajoutés</span>
                <span style={{ fontSize:12, color:T.textMuted }}> → nouveau stock : {fmt(stockKg + (parseInt(livrSacs)||0)*SAC_KG)} kg</span>
              </div>
            )}
            <button onClick={handleLivraison} style={{
              width:"100%", background:T.vitals, color:"#fff", border:"none",
              borderRadius:12, padding:"13px", fontSize:15, fontWeight:800, cursor:"pointer"
            }}>✓ Enregistrer la livraison</button>
          </div>
        </div>
      )}

      {/* ── TAB CONSOMMATION ── */}
      {activeTab === "sortie" && (
        <div style={{ padding:"16px 18px 0" }}>

          <div style={{ background:T.cardAmbre, borderRadius:16, padding:"14px 16px", marginBottom:12, border:`1px solid rgba(224,147,18,0.2)` }}>
            <div style={{ fontSize:12, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:700 }}>
              🐔 Consommation de référence — par poulailler
            </div>
            <div style={{ fontSize:11, color:T.textSub, marginTop:4 }}>
              À modifier uniquement quand la conso change
            </div>
          </div>

          {/* Un bloc par poulailler */}
          {Object.values(poulaillers || POULAILLERS_INIT).map((p, idx) => {
            const sacsVal = idx===0 ? consoSacsA : consoSacsB;
            const kgVal   = idx===0 ? consoKgA   : consoKgB;
            const setSacs = idx===0 ? setConsoSacsA : setConsoSacsB;
            const setKg   = idx===0 ? setConsoKgA   : setConsoKgB;
            const pp = { ...p, sacs:sacsVal, setSacs, kg:kgVal, setKg };
            const total = (parseInt(pp.sacs)||0)*SAC_KG + (parseInt(pp.kg)||0);
            return (
              <div key={p.id} style={{ background:"rgba(255,255,255,0.85)", borderRadius:14, padding:"14px",
                marginBottom:10, border:`1px solid ${p.couleur}33` }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
                  <span style={{ fontSize:20 }}>{pp.ico}</span>
                  <div style={{ fontSize:13, fontWeight:800, color:pp.couleur }}>{pp.nom}</div>
                  {total > 0 && (
                    <div style={{ marginLeft:"auto", background:p.couleur+"22", borderRadius:8, padding:"2px 10px" }}>
                      <span style={{ fontSize:12, fontWeight:800, color:pp.couleur }}>{fmt(total)} kg</span>
                    </div>
                  )}
                </div>
                <div style={{ display:"flex", gap:10 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:11, color:"#5A8A70", marginBottom:4 }}>Sacs (×50 kg)</div>
                    <input type="number" min="0" value={p.sacs} onChange={e=>p.setSacs(e.target.value)}
                      placeholder="0"
                      style={{ width:"100%", padding:"10px 12px", borderRadius:10, border:`1px solid ${pp.couleur}44`,
                        background:"#fff", fontSize:20, fontWeight:900, color:pp.couleur, boxSizing:"border-box" }} />
                  </div>
                  <div style={{ display:"flex", alignItems:"flex-end", paddingBottom:10, fontSize:16, color:"#5A8A70", fontWeight:700 }}>+</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:11, color:"#5A8A70", marginBottom:4 }}>kg en plus</div>
                    <input type="number" min="0" max="49" value={p.kg} onChange={e=>p.setKg(e.target.value)}
                      placeholder="0"
                      style={{ width:"100%", padding:"10px 12px", borderRadius:10, border:`1px solid ${p.couleur}44`,
                        background:"#fff", fontSize:20, fontWeight:900, color:"#0D1F17", boxSizing:"border-box" }} />
                  </div>
                </div>
              </div>
            );
          })}

          {/* Total + bouton */}
          {((parseInt(consoSacsA)||0)+(parseInt(consoSacsB)||0)+(parseInt(consoKgA)||0)+(parseInt(consoKgB)||0)) > 0 && (
            <div style={{ background:T.cardAmbre, borderRadius:12, padding:"10px 14px", marginBottom:12,
              display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontSize:13, color:"#5A8A70", fontWeight:700 }}>Total déduit du stock :</span>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:18, fontWeight:900, color:T.amber }}>
                  {fmt(((parseInt(consoSacsA)||0)+(parseInt(consoSacsB)||0))*SAC_KG + (parseInt(consoKgA)||0)+(parseInt(consoKgB)||0))} kg
                </div>
                <div style={{ fontSize:11, color:"#5A8A70" }}>
                  Stock restant : {fmt(Math.max(0, stockKg - (((parseInt(consoSacsA)||0)+(parseInt(consoSacsB)||0))*SAC_KG + (parseInt(consoKgA)||0)+(parseInt(consoKgB)||0))))} kg
                </div>
              </div>
            </div>
          )}

          <button onClick={handleConso} style={{
            width:"100%", background:T.amber, color:"#fff", border:"none",
            borderRadius:12, padding:"13px", fontSize:15, fontWeight:800, cursor:"pointer"
          }}>✓ Enregistrer la consommation</button>
        </div>
      )}

      {/* ── TAB HISTORIQUE ── */}
      {activeTab === "historique" && (
        <div style={{ padding:"16px 18px 0" }}>
          <div style={{ fontSize:12, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:700, marginBottom:12 }}>
            Tous les mouvements
          </div>
          {historique.map((m) => {
            const isLivr = m.type === "livraison";
            const totalKg = m.sacs * SAC_KG + (m.kg % SAC_KG || 0);
            return (
              <div key={m.id} style={{
                background: isLivr ? T.cardVert : T.cardAmbre,
                borderRadius:12, padding:"12px 16px", marginBottom:9,
                border:`1px solid ${isLivr ? "rgba(13,122,56,0.15)" : "rgba(224,147,18,0.2)"}`,
                display:"flex", alignItems:"center", gap:12
              }}>
                <div style={{ width:38, height:38, borderRadius:10,
                  background: isLivr ? T.vitals+"22" : T.amber+"22",
                  display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>
                  {isLivr ? "📦" : "🐔"}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:T.textPrimary }}>{m.label}</div>
                  <div style={{ fontSize:11, color:T.textMuted }}>
                    {new Date(m.date+"T12:00:00").toLocaleDateString("fr-FR",{day:"numeric",month:"short",year:"numeric"})}
                  </div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:15, fontWeight:900, color: isLivr ? T.vitals : T.amber }}>
                    {isLivr ? "+" : "-"}{(m.kg / SAC_KG).toFixed(1)} sacs
                  </div>
                  <div style={{ fontSize:11, color:T.textMuted }}>
                    {isLivr ? "+" : "-"}{fmt(m.kg)} kg
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}


// ── PAGE EFFECTIF ─────────────────────────────────────────────────────────────
function EffectifPage({ setPage, poulailler }) {

  const [activeTab, setActiveTab] = useState("vue");

  // État principal du lot
  const [lot, setLot] = useState({
    effectif:    poulailler ? poulailler.effectif.pondeuses : 2100,
    misEnPlace:  poulailler ? poulailler.effectif.misEnPlace : "2025-01-20",
    race:        "ISA Brown",
    fournisseur: "Ferme Diallo",
  });

  // Historique mortalité
  const [mortalites, setMortalites] = useState([]);

  // Saisie mortalité
  const [mortDate,  setMortDate]  = useState(new Date().toISOString().slice(0,10));
  const [mortNb,    setMortNb]    = useState("");
  const [mortCause, setMortCause] = useState("Inconnu");

  // Saisie entrée de poules
  const [entreeDate, setEntreeDate] = useState(new Date().toISOString().slice(0,10));
  const [entreeNb,   setEntreeNb]   = useState("");
  const [entreeNote, setEntreeNote] = useState("");

  // Édition date mise en place (pour recalc âge)
  const [editMEP,    setEditMEP]    = useState(false);
  const [newMEP,     setNewMEP]     = useState(lot.misEnPlace);

  // Calculs
  const ageSemaines = calcAgeSemaines(lot.misEnPlace);
  const ageJours    = Math.floor((new Date() - new Date(lot.misEnPlace)) / 86400000);
  const moisAge     = Math.floor(ageSemaines / 4.33);
  const mortTotale  = mortalites.reduce((s, m) => s + m.nb, 0);
  const mortPct     = ((mortTotale / (lot.effectif + mortTotale)) * 100).toFixed(2);

  // Phase de production selon âge
  const getPhase = (sem) => {
    if (sem < 18)  return { label:"Pré-ponte",    color:"#2563EB", bg:"#EAF2FF", ico:"🐣", desc:"Les poules ne pondent pas encore" };
    if (sem < 30)  return { label:"Démarrage",    color:"#16A34A", bg:"#E8F5EE", ico:"🌱", desc:"Montée en production" };
    if (sem < 55)  return { label:"Pic de ponte", color:"#B87008", bg:"#FEF3DC", ico:"🔥", desc:"Production maximale" };
    if (sem < 72)  return { label:"Déclin",       color:"#D97706", bg:"#FEF3DC", ico:"📉", desc:"Production en baisse progressive" };
    return              { label:"Fin de cycle",   color:"#B91C1C", bg:"#FEE9E9", ico:"⏰", desc:"Réforme à envisager" };
  };
  const phase = getPhase(ageSemaines);

  const handleMortalite = () => {
    const nb = parseInt(mortNb) || 0;
    if (!nb) return;
    setLot(p => ({ ...p, effectif: Math.max(0, p.effectif - nb) }));
    setMortalites(p => [{ id:Date.now(), date:mortDate, nb, cause:mortCause }, ...p]);
    setMortNb("");
  };

  const handleEntree = () => {
    const nb = parseInt(entreeNb) || 0;
    if (!nb) return;
    setLot(p => ({ ...p, effectif: p.effectif + nb }));
    setMortalites(p => [{ id:Date.now(), date:entreeDate, nb:-nb, cause:`Entrée : ${entreeNote||"nouveau lot"}` }, ...p]);
    setEntreeNb(""); setEntreeNote("");
  };

  const tabs = [
    { id:"vue",       label:"Vue",        ico:"🐔" },
    { id:"mortalite", label:"Mortalité",  ico:"📉" },
    { id:"entree",    label:"Entrée",     ico:"➕" },
    { id:"historique",label:"Historique", ico:"📋" },
  ];

  return (
    <div style={{ background:T.bg, minHeight:"100vh", paddingBottom:90 }}>

      {/* Header */}
      <div style={{ background:T.cardVert, padding:"20px 18px 16px", borderBottom:`1px solid rgba(13,122,56,0.15)` }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
          <button onClick={() => setPage("dashboard")} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer", color:T.textSub }}>←</button>
          <div>
            <div style={{ fontSize:11, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.08em" }}>Module</div>
            <div style={{ fontSize:20, fontWeight:800, color:T.textPrimary }}>🐔 Gestion Effectif</div>
            {poulailler && <div style={{ fontSize:11, color:T.textSub, marginTop:2 }}>{poulailler.ico} {poulailler.nom}</div>}
          </div>
        </div>

        {/* Recap en-tête */}
        <div style={{ background:"rgba(255,255,255,0.65)", borderRadius:14, padding:"14px 16px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
            <div>
              <div style={{ fontSize:11, color:T.textMuted, marginBottom:3 }}>Effectif actuel</div>
              <div style={{ display:"flex", alignItems:"baseline", gap:6 }}>
                <span style={{ fontSize:44, fontWeight:900, color:T.vitals, letterSpacing:"-0.04em" }}>{fmt(lot.effectif)}</span>
                <span style={{ fontSize:15, fontWeight:700, color:T.textSub }}>poules</span>
              </div>
              <div style={{ fontSize:12, color:T.textMuted, marginTop:2 }}>{lot.race} · {lot.fournisseur}</div>
            </div>

            {/* Âge */}
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:11, color:T.textMuted, marginBottom:3 }}>Âge du lot</div>
              <div style={{ display:"flex", alignItems:"baseline", gap:4, justifyContent:"flex-end" }}>
                <span style={{ fontSize:28, fontWeight:900, color:T.amber }}>{ageSemaines}</span>
                <span style={{ fontSize:13, fontWeight:700, color:T.textSub }}>sem.</span>
              </div>
              <div style={{ fontSize:12, color:T.textMuted }}>≈ {moisAge} mois · {ageJours} jours</div>
              <button onClick={() => setEditMEP(v=>!v)} style={{
                marginTop:4, background:"none", border:`1px solid ${T.border}`,
                borderRadius:8, padding:"3px 8px", fontSize:11, color:T.textSub, cursor:"pointer"
              }}>✏️ Modifier date</button>
            </div>
          </div>

          {/* Édition date mise en place */}
          {editMEP && (
            <div style={{ marginTop:10, background:"rgba(255,255,255,0.8)", borderRadius:10, padding:"10px 12px" }}>
              <div style={{ fontSize:11, color:T.textMuted, marginBottom:6 }}>Date de mise en place du lot</div>
              <div style={{ display:"flex", gap:8 }}>
                <input type="date" value={newMEP} onChange={e=>setNewMEP(e.target.value)}
                  style={{ flex:1, padding:"8px 12px", borderRadius:10, border:`1px solid ${T.border}`,
                    fontSize:13, color:T.textPrimary }} />
                <button onClick={() => { setLot(p=>({...p, misEnPlace:newMEP})); setEditMEP(false); }} style={{
                  background:T.vitals, color:"#fff", border:"none", borderRadius:10,
                  padding:"8px 16px", fontWeight:800, fontSize:13, cursor:"pointer"
                }}>✓</button>
              </div>
            </div>
          )}

          {/* Phase de production */}
          <div style={{ marginTop:12, background:phase.bg, borderRadius:10, padding:"10px 14px", border:`1px solid ${phase.color}22` }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:20 }}>{phase.ico}</span>
              <div>
                <div style={{ fontSize:13, fontWeight:800, color:phase.color }}>{phase.label}</div>
                <div style={{ fontSize:11, color:T.textMuted }}>{phase.desc}</div>
              </div>
              <div style={{ marginLeft:"auto", background:phase.color+"22", borderRadius:20, padding:"3px 10px" }}>
                <span style={{ fontSize:11, fontWeight:700, color:phase.color }}>Sem. {ageSemaines}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", margin:"16px 18px 0", gap:8 }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            flex:1, padding:"9px 4px", borderRadius:12, border:"none", cursor:"pointer",
            background: activeTab===tab.id ? T.vitals : T.cardSauge,
            transition:"all 0.18s ease",
          }}>
            <div style={{ fontSize:16 }}>{tab.ico}</div>
            <div style={{ fontSize:10, fontWeight:700, color: activeTab===tab.id ? "#fff" : T.textSub, marginTop:2 }}>
              {tab.label}
            </div>
          </button>
        ))}
      </div>

      {/* ── TAB VUE ── */}
      {activeTab === "vue" && (
        <div style={{ padding:"16px 18px 0" }}>

          {/* KPIs */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
            {[
              { label:"Effectif initial", val:fmt(lot.effectif + mortTotale), unit:"poules", color:T.vitals, ico:"🐔" },
              { label:"Mortalité totale", val:mortTotale, unit:"sujets", color:T.danger, ico:"📉" },
              { label:"Taux mortalité",   val:`${mortPct}%`, unit:"", color: parseFloat(mortPct)>5 ? T.danger : T.vitals, ico:"📊" },
              { label:"Taux de ponte",    val:`${DATA.ponte.taux}%`, unit:"", color:T.amber, ico:"🥚" },
            ].map((k,i) => (
              <div key={i} style={{ background:T.cardVert, borderRadius:14, padding:"14px", border:`1px solid rgba(13,122,56,0.15)` }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                  <div>
                    <div style={{ fontSize:11, color:T.textMuted, marginBottom:4 }}>{k.label}</div>
                    <div style={{ fontSize:22, fontWeight:900, color:k.color }}>{k.val}</div>
                    {k.unit && <div style={{ fontSize:11, color:T.textMuted }}>{k.unit}</div>}
                  </div>
                  <span style={{ fontSize:20 }}>{k.ico}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Timeline des phases */}
          <div style={{ background:T.cardVert, borderRadius:16, padding:"14px 16px", border:`1px solid rgba(13,122,56,0.15)` }}>
            <div style={{ fontSize:12, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:700, marginBottom:12 }}>
              📅 Cycle de production
            </div>
            {[
              { label:"Pré-ponte",     debut:0,   fin:18,  ico:"🐣", color:"#2563EB" },
              { label:"Démarrage",     debut:18,  fin:30,  ico:"🌱", color:"#16A34A" },
              { label:"Pic de ponte",  debut:30,  fin:55,  ico:"🔥", color:"#B87008" },
              { label:"Déclin",        debut:55,  fin:72,  ico:"📉", color:"#D97706" },
              { label:"Fin de cycle",  debut:72,  fin:90,  ico:"⏰", color:"#B91C1C" },
            ].map((ph, i) => {
              const active = ageSemaines >= ph.debut && ageSemaines < ph.fin;
              const done   = ageSemaines >= ph.fin;
              return (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:10, marginBottom: i<4 ? 8:0 }}>
                  <div style={{ width:32, height:32, borderRadius:"50%", flexShrink:0,
                    background: active ? ph.color : done ? ph.color+"44" : "rgba(0,0,0,0.06)",
                    display:"flex", alignItems:"center", justifyContent:"center", fontSize:15 }}>
                    {ph.ico}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", justifyContent:"space-between" }}>
                      <span style={{ fontSize:13, fontWeight: active ? 800:600, color: active ? ph.color : T.textMuted }}>
                        {ph.label}
                      </span>
                      <span style={{ fontSize:11, color:T.textMuted }}>S{ph.debut}–S{ph.fin}</span>
                    </div>
                    <div style={{ height:4, background:"rgba(0,0,0,0.06)", borderRadius:2, marginTop:4, overflow:"hidden" }}>
                      <div style={{ height:"100%", borderRadius:2, background: active ? ph.color : done ? ph.color+"66":"transparent",
                        width: active ? `${Math.min(((ageSemaines-ph.debut)/(ph.fin-ph.debut))*100,100)}%` : done?"100%":"0%" }} />
                    </div>
                  </div>
                  {active && (
                    <div style={{ background:ph.color, borderRadius:20, padding:"2px 8px", flexShrink:0 }}>
                      <span style={{ fontSize:10, color:"#fff", fontWeight:700 }}>En cours</span>
                    </div>
                  )}
                  {done && <span style={{ fontSize:14, flexShrink:0 }}>✅</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TAB MORTALITÉ ── */}
      {activeTab === "mortalite" && (
        <div style={{ padding:"16px 18px 0" }}>
          <div style={{ background:T.cardRouge, borderRadius:16, padding:"16px", marginBottom:14, border:`1px solid rgba(185,28,28,0.15)` }}>
            <div style={{ fontSize:12, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:700, marginBottom:12 }}>
              📉 Enregistrer une mortalité
            </div>
            <div style={{ display:"flex", gap:10, marginBottom:10 }}>
              <div style={{ flex:2 }}>
                <div style={{ fontSize:11, color:T.textMuted, marginBottom:4 }}>Date</div>
                <input type="date" value={mortDate} onChange={e=>setMortDate(e.target.value)}
                  style={{ width:"100%", padding:"9px 12px", borderRadius:10, border:`1px solid ${T.border}`,
                    background:"rgba(255,255,255,0.8)", fontSize:13, color:T.textPrimary, boxSizing:"border-box" }} />
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:11, color:T.textMuted, marginBottom:4 }}>Nombre</div>
                <input type="number" min="1" value={mortNb} onChange={e=>setMortNb(e.target.value)}
                  placeholder="0"
                  style={{ width:"100%", padding:"9px 12px", borderRadius:10, border:`1px solid ${T.border}`,
                    background:"rgba(255,255,255,0.8)", fontSize:18, fontWeight:900, color:T.danger, boxSizing:"border-box" }} />
              </div>
            </div>
            <div style={{ marginBottom:12 }}>
              <div style={{ fontSize:11, color:T.textMuted, marginBottom:4 }}>Cause</div>
              <select value={mortCause} onChange={e=>setMortCause(e.target.value)}
                style={{ width:"100%", padding:"9px 12px", borderRadius:10, border:`1px solid ${T.border}`,
                  background:"rgba(255,255,255,0.8)", fontSize:13, color:T.textPrimary }}>
                {["Inconnu","Maladie","Accident","Prédateur","Chaleur","Autre"].map(c =>
                  <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <button onClick={handleMortalite} style={{
              width:"100%", background:T.danger, color:"#fff", border:"none",
              borderRadius:12, padding:"13px", fontSize:15, fontWeight:800, cursor:"pointer"
            }}>✓ Enregistrer</button>
          </div>

          {/* Liste mortalités récentes */}
          <div style={{ fontSize:12, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:700, marginBottom:10 }}>
            Mortalités récentes
          </div>
          {mortalites.filter(m=>m.nb>0).map(m => (
            <div key={m.id} style={{ background:T.cardSauge, borderRadius:12, padding:"11px 14px",
              display:"flex", alignItems:"center", gap:12, marginBottom:8, border:`1px solid ${T.border}` }}>
              <div style={{ width:36, height:36, borderRadius:10, background:T.danger+"15",
                display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>💀</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:700, color:T.textPrimary }}>{m.cause}</div>
                <div style={{ fontSize:11, color:T.textMuted }}>
                  {new Date(m.date+"T12:00:00").toLocaleDateString("fr-FR",{weekday:"short",day:"numeric",month:"short"})}
                </div>
              </div>
              <div style={{ fontSize:16, fontWeight:900, color:T.danger }}>-{m.nb}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── TAB ENTRÉE ── */}
      {activeTab === "entree" && (
        <div style={{ padding:"16px 18px 0" }}>
          <div style={{ background:T.cardVert, borderRadius:16, padding:"16px", border:`1px solid rgba(13,122,56,0.15)` }}>
            <div style={{ fontSize:12, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:700, marginBottom:12 }}>
              ➕ Entrée de poules
            </div>
            <div style={{ marginBottom:10 }}>
              <div style={{ fontSize:11, color:T.textMuted, marginBottom:4 }}>Date d'entrée</div>
              <input type="date" value={entreeDate} onChange={e=>setEntreeDate(e.target.value)}
                style={{ width:"100%", padding:"9px 12px", borderRadius:10, border:`1px solid ${T.border}`,
                  background:"rgba(255,255,255,0.8)", fontSize:13, color:T.textPrimary, boxSizing:"border-box" }} />
            </div>
            <div style={{ marginBottom:10 }}>
              <div style={{ fontSize:11, color:T.textMuted, marginBottom:4 }}>Nombre de poules</div>
              <input type="number" min="1" value={entreeNb} onChange={e=>setEntreeNb(e.target.value)}
                placeholder="0"
                style={{ width:"100%", padding:"12px 14px", borderRadius:10, border:`1px solid ${T.border}`,
                  background:"rgba(255,255,255,0.8)", fontSize:22, fontWeight:900, color:T.vitals, boxSizing:"border-box" }} />
            </div>
            <div style={{ marginBottom:12 }}>
              <div style={{ fontSize:11, color:T.textMuted, marginBottom:4 }}>Note (optionnel)</div>
              <input type="text" value={entreeNote} onChange={e=>setEntreeNote(e.target.value)}
                placeholder="Ex: nouveau lot ISA Brown..."
                style={{ width:"100%", padding:"9px 12px", borderRadius:10, border:`1px solid ${T.border}`,
                  background:"rgba(255,255,255,0.8)", fontSize:13, color:T.textPrimary, boxSizing:"border-box" }} />
            </div>
            {entreeNb && (
              <div style={{ background:"rgba(255,255,255,0.7)", borderRadius:10, padding:"9px 12px", marginBottom:12, textAlign:"center" }}>
                <span style={{ fontSize:13, color:T.textMuted }}>Nouvel effectif : </span>
                <span style={{ fontSize:16, fontWeight:900, color:T.vitals }}>
                  {fmt(lot.effectif + (parseInt(entreeNb)||0))} poules
                </span>
              </div>
            )}
            <button onClick={handleEntree} style={{
              width:"100%", background:T.vitals, color:"#fff", border:"none",
              borderRadius:12, padding:"13px", fontSize:15, fontWeight:800, cursor:"pointer"
            }}>✓ Enregistrer l'entrée</button>
          </div>
        </div>
      )}

      {/* ── TAB HISTORIQUE ── */}
      {activeTab === "historique" && (
        <div style={{ padding:"16px 18px 0" }}>
          <div style={{ fontSize:12, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:700, marginBottom:12 }}>
            Tous les mouvements
          </div>
          {mortalites.map(m => {
            const isEntree = m.nb < 0;
            return (
              <div key={m.id} style={{ background: isEntree ? T.cardVert : T.cardSauge,
                borderRadius:12, padding:"12px 16px", marginBottom:9,
                border:`1px solid ${isEntree ? "rgba(13,122,56,0.15)" : T.border}`,
                display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ width:36, height:36, borderRadius:10,
                  background: isEntree ? T.vitals+"22" : T.danger+"15",
                  display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>
                  {isEntree ? "➕" : "💀"}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:T.textPrimary }}>{m.cause}</div>
                  <div style={{ fontSize:11, color:T.textMuted }}>
                    {new Date(m.date+"T12:00:00").toLocaleDateString("fr-FR",{weekday:"short",day:"numeric",month:"short",year:"numeric"})}
                  </div>
                </div>
                <div style={{ fontSize:15, fontWeight:900, color: isEntree ? T.vitals : T.danger }}>
                  {isEntree ? `+${Math.abs(m.nb)}` : `-${m.nb}`}
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}


// ── PAGE SANTÉ / PROPHYLAXIE ──────────────────────────────────────────────────
function SantePage({ setPage }) {

  const [activeTab, setActiveTab] = useState("planning");
  const today = new Date();

  // Programme prophylactique complet J1 → fin de cycle
  // Les dates sont calculées dynamiquement à partir de la mise en place
  const misEnPlace = new Date("2025-01-20");

  const dateFromJ = (j) => {
    const d = new Date(misEnPlace);
    d.setDate(d.getDate() + j);
    return d;
  };

  const programme = [
    // ── PREMIERS JOURS ──
    { id:1,  jour:1,   type:"vitamine",    nom:"Vitamines + électrolytes",          dose:"1g/L eau",       duree:3, note:"Stress du transport",      produit:"Vitasol / Électrolytes",       qte:2,  unite:"sachets 100g", prix:2500  },
    { id:2,  jour:4,   type:"vaccin",      nom:"Vaccin Newcastle + Bronchite (HB1)",dose:"Oculonasal",     duree:1, note:"Primo-vaccination",        produit:"Hitchner B1 / NDIB",           qte:1,  unite:"flacon 500d",  prix:8500  },
    { id:3,  jour:7,   type:"vitamine",    nom:"Multivitamines",                    dose:"1g/L eau",       duree:3, note:"Renforcement immunité",     produit:"Multivit Poultry",             qte:2,  unite:"sachets 100g", prix:3000  },
    { id:4,  jour:10,  type:"traitement",  nom:"Anticoccidien préventif",           dose:"1ml/L eau",      duree:5, note:"Prévention coccidiose",     produit:"Amprolium / Coccistop",        qte:2,  unite:"flacons 1L",   prix:12000 },
    { id:5,  jour:14,  type:"vaccin",      nom:"Vaccin Gumboro (IBD)",              dose:"Eau de boisson", duree:1, note:"Maladie de Gumboro",        produit:"Bursine / Gumboro D78",        qte:1,  unite:"flacon 500d",  prix:9000  },
    { id:6,  jour:18,  type:"vitamine",    nom:"Vitamines A+D3+E",                  dose:"1g/L eau",       duree:3, note:"Croissance osseuse",        produit:"ADE Poultry",                  qte:2,  unite:"sachets 100g", prix:3500  },
    { id:7,  jour:21,  type:"vaccin",      nom:"Rappel Newcastle + Bronchite",      dose:"Oculonasal",     duree:1, note:"Rappel primo-vaccination",  produit:"Hitchner B1 / NDIB",           qte:1,  unite:"flacon 500d",  prix:8500  },
    { id:8,  jour:24,  type:"traitement",  nom:"Vermifuge",                         dose:"1ml/L eau",      duree:2, note:"Déparasitage interne",      produit:"Pipérazine / Levamisole",      qte:1,  unite:"flacon 1L",    prix:7500  },
    { id:9,  jour:28,  type:"vaccin",      nom:"Rappel Gumboro (IBD)",              dose:"Eau de boisson", duree:1, note:"Renforcement Gumboro",      produit:"Bursine / Gumboro D78",        qte:1,  unite:"flacon 500d",  prix:9000  },
    { id:10, jour:35,  type:"vitamine",    nom:"Vitamines B-Complex",               dose:"1ml/L eau",      duree:3, note:"Métabolisme nerveux",       produit:"B-Complex Poultry",            qte:1,  unite:"flacon 500ml", prix:5500  },
    // ── CROISSANCE ──
    { id:11, jour:42,  type:"vaccin",      nom:"Vaccin Newcastle (La Sota)",        dose:"Eau de boisson", duree:1, note:"Rappel Newcastle",          produit:"La Sota / Clone 30",           qte:1,  unite:"flacon 500d",  prix:7000  },
    { id:12, jour:49,  type:"traitement",  nom:"Anticoccidien curatif",             dose:"1ml/L eau",      duree:5, note:"Si signes cliniques",       produit:"Toltrazuril / Baycox",         qte:2,  unite:"flacons 1L",   prix:15000 },
    { id:13, jour:56,  type:"vitamine",    nom:"Vitamines E + Sélénium",            dose:"1g/L eau",       duree:3, note:"Fertilité et immunité",     produit:"Vit E-Sélénium Poultry",       qte:2,  unite:"sachets 100g", prix:4000  },
    { id:14, jour:63,  type:"vaccin",      nom:"Vaccin Bronchite Infectieuse",      dose:"Oculonasal",     duree:1, note:"Protection respiratoire",   produit:"H120 / IB Primer",             qte:1,  unite:"flacon 500d",  prix:8000  },
    { id:15, jour:70,  type:"vitamine",    nom:"Multivitamines",                    dose:"1g/L eau",       duree:3, note:"Préparation ponte",         produit:"Multivit Poultry",             qte:2,  unite:"sachets 100g", prix:3000  },
    // ── PRÉ-PONTE ──
    { id:16, jour:112, type:"vaccin",      nom:"Newcastle + Bronchite (inactivé)",  dose:"Injection IM",   duree:1, note:"Vaccin huileux pré-ponte",  produit:"Newcavac / ND+IB Oil",         qte:2,  unite:"flacons 250d", prix:22000 },
    { id:17, jour:119, type:"vitamine",    nom:"Vitamines A+D3+E+K",               dose:"1g/L eau",       duree:5, note:"Stimulation ponte",         produit:"ADEK Poultry",                 qte:3,  unite:"sachets 100g", prix:3500  },
    { id:18, jour:126, type:"traitement",  nom:"Vermifuge",                         dose:"1ml/L eau",      duree:2, note:"Déparasitage avant ponte",  produit:"Pipérazine / Levamisole",      qte:1,  unite:"flacon 1L",    prix:7500  },
    // ── PRODUCTION ──
    { id:19, jour:150, type:"vitamine",    nom:"Vitamines B-Complex",               dose:"1ml/L eau",      duree:3, note:"Maintien production",       produit:"B-Complex Poultry",            qte:1,  unite:"flacon 500ml", prix:5500  },
    { id:20, jour:180, type:"vaccin",      nom:"Rappel Newcastle (La Sota)",        dose:"Eau de boisson", duree:1, note:"Rappel mensuel",            produit:"La Sota / Clone 30",           qte:1,  unite:"flacon 500d",  prix:7000  },
    { id:21, jour:180, type:"vitamine",    nom:"Vitamines E + Sélénium",            dose:"1g/L eau",       duree:3, note:"Anti-stress thermique",     produit:"Vit E-Sélénium Poultry",       qte:2,  unite:"sachets 100g", prix:4000  },
    { id:22, jour:210, type:"traitement",  nom:"Anticoccidien préventif",           dose:"1ml/L eau",      duree:5, note:"Rappel trimestriel",        produit:"Amprolium / Coccistop",        qte:2,  unite:"flacons 1L",   prix:12000 },
    { id:23, jour:210, type:"vitamine",    nom:"Vitamines A+D3",                    dose:"1g/L eau",       duree:3, note:"Solidité coquille",         produit:"ADE Poultry",                  qte:2,  unite:"sachets 100g", prix:3500  },
    { id:24, jour:240, type:"vaccin",      nom:"Rappel Newcastle (La Sota)",        dose:"Eau de boisson", duree:1, note:"Rappel mensuel",            produit:"La Sota / Clone 30",           qte:1,  unite:"flacon 500d",  prix:7000  },
    { id:25, jour:240, type:"vitamine",    nom:"Multivitamines",                    dose:"1g/L eau",       duree:3, note:"Maintien immunité",         produit:"Multivit Poultry",             qte:2,  unite:"sachets 100g", prix:3000  },
    { id:26, jour:270, type:"traitement",  nom:"Vermifuge",                         dose:"1ml/L eau",      duree:2, note:"Déparasitage trimestriel",  produit:"Pipérazine / Levamisole",      qte:1,  unite:"flacon 1L",    prix:7500  },
    { id:27, jour:300, type:"vaccin",      nom:"Rappel Newcastle (La Sota)",        dose:"Eau de boisson", duree:1, note:"Rappel mensuel",            produit:"La Sota / Clone 30",           qte:1,  unite:"flacon 500d",  prix:7000  },
    { id:28, jour:330, type:"vitamine",    nom:"Vitamines B-Complex + E",           dose:"1ml/L eau",      duree:3, note:"Soutien fin de cycle",      produit:"B-Complex + Vit E",            qte:2,  unite:"flacons 500ml",prix:9000  },
    { id:29, jour:360, type:"traitement",  nom:"Anticoccidien préventif",           dose:"1ml/L eau",      duree:5, note:"Fin de cycle",              produit:"Amprolium / Coccistop",        qte:2,  unite:"flacons 1L",   prix:12000 },
    { id:30, jour:400, type:"vaccin",      nom:"Rappel Newcastle (La Sota)",        dose:"Eau de boisson", duree:1, note:"Dernier rappel",            produit:"La Sota / Clone 30",           qte:1,  unite:"flacon 500d",  prix:7000  },
  ];

  // Enrichir avec dates réelles et statuts
  const [actes, setActes] = useState(() =>
    programme.map(p => ({
      ...p,
      datePrevu: dateFromJ(p.jour),
      fait: p.jour < (Math.floor((today - misEnPlace)/86400000) - 10),
      dateFait: null,
    }))
  );

  // Saisie nouvel acte
  const [showAdd, setShowAdd]       = useState(false);
  const [newNom,       setNewNom]       = useState("");
  const [newType,      setNewType]      = useState("vaccin");
  const [newDate,      setNewDate]      = useState(new Date().toISOString().slice(0,10));
  const [newDose,      setNewDose]      = useState("");
  const [newNote,      setNewNote]      = useState("");
  const [newRecurrence, setNewRecurrence] = useState(""); // nb jours entre chaque occurrence
  const [newNotifJ,    setNewNotifJ]    = useState(5);    // nb jours avant notification

  const marquerFait = (id) => {
    setActes(prev => prev.map(a => a.id===id ? {...a, fait:true, dateFait:new Date()} : a));
  };

  const ajouterActe = () => {
    if (!newNom) return;
    const d    = new Date(newDate);
    const j    = Math.floor((d - misEnPlace) / 86400000);
    const recur = parseInt(newRecurrence) || 0;
    const notifJ = parseInt(newNotifJ) || 5;
    const newActes = [];

    // Acte principal
    newActes.push({
      id: Date.now(), jour:j, type:newType, nom:newNom,
      dose:newDose, duree:1, note:newNote,
      datePrevu:d, fait:false, dateFait:null,
      recurrence: recur, notifAvant: notifJ,
    });

    // Générer les occurrences futures si récurrence activée (sur 12 mois)
    if (recur > 0) {
      let nextDate = new Date(d);
      let occurrence = 1;
      while (occurrence <= Math.floor(365 / recur)) {
        nextDate = new Date(nextDate);
        nextDate.setDate(nextDate.getDate() + recur);
        const nextJ = Math.floor((nextDate - misEnPlace) / 86400000);
        newActes.push({
          id: Date.now() + occurrence, jour:nextJ, type:newType,
          nom:`${newNom} (×${occurrence+1})`,
          dose:newDose, duree:1, note:`Récurrence ${recur}j · ${newNote}`,
          datePrevu: new Date(nextDate), fait:false, dateFait:null,
          recurrence: recur, notifAvant: notifJ,
          isRecurrence: true,
        });
        occurrence++;
      }
    }

    setActes(prev => [...prev, ...newActes].sort((a,b)=>a.jour-b.jour));
    setNewNom(""); setNewDose(""); setNewNote("");
    setNewRecurrence(""); setNewNotifJ(5);
    setShowAdd(false);
  };

  const getDaysUntil = (d) => Math.round((new Date(d) - today) / 86400000);

  const aVenir  = actes.filter(a => !a.fait && getDaysUntil(a.datePrevu) > 7)
                        .sort((a,b)=>a.jour-b.jour);
  const urgent  = actes.filter(a => !a.fait && getDaysUntil(a.datePrevu) <= 7)
                        .sort((a,b)=>a.jour-b.jour);
  const faits   = actes.filter(a => a.fait).sort((a,b)=>b.jour-a.jour);

  const typeConfig = {
    vaccin:     { ico:"💉", color:"#2563EB", bg:"#EAF2FF", label:"Vaccin" },
    vitamine:   { ico:"💊", color:"#B87008", bg:"#FEF3DC", label:"Vitamine" },
    traitement: { ico:"🔬", color:"#16A34A", bg:"#E8F5EE", label:"Traitement" },
  };

  const getBadge = (a) => {
    const days = getDaysUntil(a.datePrevu);
    if (days < 0)  return { label:`${Math.abs(days)}j de retard`, color:"#B91C1C", bg:"#FEE9E9" };
    if (days === 0) return { label:"Aujourd'hui !", color:"#B91C1C", bg:"#FEE9E9" };
    if (days <= 3) return { label:`Dans ${days}j`, color:"#B91C1C", bg:"#FEE9E9" };
    if (days <= 7) return { label:`Dans ${days}j`, color:"#D97706", bg:"#FEF3DC" };
    return              { label:`J+${a.jour}`, color:T.textMuted, bg:T.cardSauge };
  };

  const ActeCard = ({ a, showBtn=false }) => {
    const tc = typeConfig[a.type] || typeConfig.traitement;
    const badge = getBadge(a);
    return (
      <div style={{ background:T.cardSauge, borderRadius:13, padding:"12px 14px",
        marginBottom:9, border:`1px solid ${T.border}`,
        opacity: a.fait ? 0.6 : 1,
      }}>
        <div style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
          <div style={{ width:38, height:38, borderRadius:10, background:tc.bg, flexShrink:0,
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:18,
            border:`1px solid ${tc.color}22` }}>
            {tc.ico}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:6 }}>
              <div style={{ fontSize:13, fontWeight:800, color: a.fait ? T.textMuted : T.textPrimary, textDecoration: a.fait?"line-through":"none" }}>
                {a.nom}
              </div>
              <div style={{ background:badge.bg, borderRadius:20, padding:"2px 9px", flexShrink:0 }}>
                <span style={{ fontSize:10, fontWeight:700, color:badge.color }}>{badge.label}</span>
              </div>
            </div>
            <div style={{ display:"flex", gap:8, marginTop:4, flexWrap:"wrap" }}>
              <span style={{ fontSize:11, background:tc.bg, color:tc.color, borderRadius:6, padding:"1px 7px", fontWeight:700 }}>
                {tc.label}
              </span>
              {a.dose && <span style={{ fontSize:11, color:T.textMuted }}>📏 {a.dose}</span>}
              {a.duree > 1 && <span style={{ fontSize:11, color:T.textMuted }}>⏱ {a.duree}j</span>}
              {a.recurrence > 0 && (
                <span style={{ fontSize:11, background:"rgba(99,102,241,0.12)", color:"#6366F1",
                  borderRadius:6, padding:"1px 7px", fontWeight:700 }}>
                  🔄 /{ a.recurrence}j
                </span>
              )}
              {a.notifAvant > 0 && (
                <span style={{ fontSize:11, background:T.warningDim, color:T.warning,
                  borderRadius:6, padding:"1px 7px", fontWeight:700 }}>
                  🔔 -{a.notifAvant}j
                </span>
              )}
            </div>
            <div style={{ fontSize:11, color:T.textMuted, marginTop:3 }}>
              {a.datePrevu.toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"})}
              {a.note ? ` · ${a.note}` : ""}
            </div>

            {/* Produit + prix + quantité */}
            {(a.produit || a.prix) && (
              <div style={{ marginTop:8, background:"rgba(255,255,255,0.7)", borderRadius:9, padding:"8px 10px",
                border:`1px solid ${T.border}`, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:6 }}>
                <div>
                  <div style={{ fontSize:10, color:T.textMuted, marginBottom:1 }}>Produit recommandé</div>
                  <div style={{ fontSize:12, fontWeight:700, color:T.textPrimary }}>{a.produit}</div>
                </div>
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  {a.qte && (
                    <div style={{ textAlign:"center" }}>
                      <div style={{ fontSize:10, color:T.textMuted }}>Quantité</div>
                      <div style={{ fontSize:13, fontWeight:800, color:tc.color }}>{a.qte} {a.unite}</div>
                    </div>
                  )}
                  {a.prix && (
                    <div style={{ background:tc.bg, borderRadius:8, padding:"4px 10px", textAlign:"center", border:`1px solid ${tc.color}22` }}>
                      <div style={{ fontSize:10, color:T.textMuted }}>Prix estimé</div>
                      <div style={{ fontSize:13, fontWeight:900, color:tc.color }}>{fmt(a.prix)} F</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        {showBtn && !a.fait && (
          <button onClick={() => marquerFait(a.id)} style={{
            width:"100%", marginTop:10, background:T.vitals, color:"#fff",
            border:"none", borderRadius:10, padding:"9px", fontSize:13, fontWeight:800, cursor:"pointer"
          }}>✓ Marquer comme fait</button>
        )}
        {a.fait && (
          <div style={{ marginTop:6, fontSize:11, color:T.vitals, fontWeight:700 }}>
            ✅ Réalisé {a.dateFait ? `le ${new Date(a.dateFait).toLocaleDateString("fr-FR",{day:"numeric",month:"short"})}` : ""}
          </div>
        )}
      </div>
    );
  };

  const tabs = [
    { id:"planning",  label:"Planning",  ico:"📅" },
    { id:"urgent",    label:`Urgent (${urgent.length})`, ico:"🚨" },
    { id:"historique",label:"Historique",  ico:"✅" },
    { id:"ajouter",   label:"Ajouter",   ico:"➕" },
  ];

  return (
    <div style={{ background:T.bg, minHeight:"100vh", paddingBottom:90 }}>

      {/* Header */}
      <div style={{ background:T.cardBleu, padding:"20px 18px 16px", borderBottom:`1px solid rgba(37,99,235,0.15)` }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
          <button onClick={() => setPage("dashboard")} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer", color:T.textSub }}>←</button>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:11, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.08em" }}>Module</div>
            <div style={{ fontSize:20, fontWeight:800, color:T.textPrimary }}>💉 Prophylaxie & Santé</div>
          </div>
        </div>

        {/* Stats résumé */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
          {[
            { label:"Urgents",  val:urgent.length,  color:urgent.length>0 ? T.danger : T.vitals, ico:"🚨" },
            { label:"À venir",  val:aVenir.length,   color:T.blue,   ico:"📅" },
            { label:"Réalisés", val:faits.length,   color:T.vitals, ico:"✅" },
          ].map((s,i) => (
            <div key={i} style={{ background:"rgba(255,255,255,0.65)", borderRadius:12, padding:"10px", textAlign:"center" }}>
              <div style={{ fontSize:16 }}>{s.ico}</div>
              <div style={{ fontSize:22, fontWeight:900, color:s.color }}>{s.val}</div>
              <div style={{ fontSize:11, color:T.textMuted }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", margin:"16px 18px 0", gap:8 }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            flex:1, padding:"8px 4px", borderRadius:12, border:"none", cursor:"pointer",
            background: activeTab===tab.id ? T.blue : T.cardSauge,
            transition:"all 0.18s ease",
          }}>
            <div style={{ fontSize:15 }}>{tab.ico}</div>
            <div style={{ fontSize:9, fontWeight:700, color: activeTab===tab.id ? "#fff" : T.textSub, marginTop:2, lineHeight:1.3 }}>
              {tab.label}
            </div>
          </button>
        ))}
      </div>

      {/* ── TAB PLANNING ── */}
      {activeTab === "planning" && (
        <div style={{ padding:"16px 18px 0" }}>

          {/* Urgents en tête */}
          {urgent.length > 0 && (
            <div style={{ background:T.cardRouge, borderRadius:14, padding:"12px 14px", marginBottom:14, border:`1px solid ${T.danger}33` }}>
              <div style={{ fontSize:12, color:T.danger, fontWeight:800, marginBottom:10 }}>
                🚨 {urgent.length} acte(s) urgent(s) — dans les 7 prochains jours
              </div>
              {urgent.map(a => <ActeCard key={a.id} a={a} showBtn={true} />)}
            </div>
          )}

          {/* Programme complet par phase */}
          {[
            { label:"🐣 Premiers jours (J1–J70)",   jMin:0,   jMax:70  },
            { label:"🌱 Pré-ponte (J71–J140)",       jMin:71,  jMax:140 },
            { label:"🔥 Production (J141–fin)",       jMin:141, jMax:9999 },
          ].map((phase, pi) => {
            const actesPhase = actes.filter(a => a.jour >= phase.jMin && a.jour <= phase.jMax && !a.fait);
            if (!actesPhase.length) return null;
            return (
              <div key={pi} style={{ marginBottom:16 }}>
                <div style={{ fontSize:12, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:700, marginBottom:10 }}>
                  {phase.label}
                </div>
                {actesPhase.map(a => <ActeCard key={a.id} a={a} showBtn={true} />)}
              </div>
            );
          })}
        </div>
      )}

      {/* ── TAB URGENT ── */}
      {activeTab === "urgent" && (
        <div style={{ padding:"16px 18px 0" }}>
          {urgent.length === 0 ? (
            <div style={{ textAlign:"center", padding:"40px 20px" }}>
              <div style={{ fontSize:48 }}>✅</div>
              <div style={{ fontSize:16, fontWeight:700, color:T.vitals, marginTop:12 }}>Aucune urgence !</div>
              <div style={{ fontSize:13, color:T.textMuted, marginTop:6 }}>Tous les actes sont à jour.</div>
            </div>
          ) : (
            urgent.map(a => <ActeCard key={a.id} a={a} showBtn={true} />)
          )}
        </div>
      )}

      {/* ── TAB HISTORIQUE ── */}
      {activeTab === "historique" && (
        <div style={{ padding:"16px 18px 0" }}>
          <div style={{ fontSize:12, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:700, marginBottom:12 }}>
            {faits.length} actes réalisés
          </div>
          {faits.map(a => <ActeCard key={a.id} a={a} showBtn={false} />)}
        </div>
      )}

      {/* ── TAB AJOUTER ── */}
      {activeTab === "ajouter" && (
        <div style={{ padding:"16px 18px 0" }}>
          <div style={{ background:T.cardBleu, borderRadius:16, padding:"16px", border:`1px solid rgba(37,99,235,0.15)` }}>
            <div style={{ fontSize:12, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:700, marginBottom:14 }}>
              ➕ Ajouter un acte au programme
            </div>

            <div style={{ marginBottom:10 }}>
              <div style={{ fontSize:11, color:T.textMuted, marginBottom:4 }}>Type</div>
              <div style={{ display:"flex", gap:8 }}>
                {Object.entries(typeConfig).map(([key,tc]) => (
                  <button key={key} onClick={() => setNewType(key)} style={{
                    flex:1, padding:"8px 6px", borderRadius:10, border:`1px solid ${newType===key ? tc.color : T.border}`,
                    background: newType===key ? tc.bg : "rgba(255,255,255,0.6)",
                    cursor:"pointer",
                  }}>
                    <div style={{ fontSize:16 }}>{tc.ico}</div>
                    <div style={{ fontSize:10, fontWeight:700, color:newType===key ? tc.color : T.textMuted, marginTop:2 }}>{tc.label}</div>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom:10 }}>
              <div style={{ fontSize:11, color:T.textMuted, marginBottom:4 }}>Nom de l'acte</div>
              <input type="text" value={newNom} onChange={e=>setNewNom(e.target.value)}
                placeholder="Ex: Vaccin Newcastle..."
                style={{ width:"100%", padding:"10px 12px", borderRadius:10, border:`1px solid ${T.border}`,
                  background:"rgba(255,255,255,0.8)", fontSize:13, color:T.textPrimary, boxSizing:"border-box" }} />
            </div>

            <div style={{ display:"flex", gap:10, marginBottom:10 }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:11, color:T.textMuted, marginBottom:4 }}>Date prévue</div>
                <input type="date" value={newDate} onChange={e=>setNewDate(e.target.value)}
                  style={{ width:"100%", padding:"9px 12px", borderRadius:10, border:`1px solid ${T.border}`,
                    background:"rgba(255,255,255,0.8)", fontSize:13, color:T.textPrimary, boxSizing:"border-box" }} />
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:11, color:T.textMuted, marginBottom:4 }}>Dose</div>
                <input type="text" value={newDose} onChange={e=>setNewDose(e.target.value)}
                  placeholder="Ex: 1ml/L eau"
                  style={{ width:"100%", padding:"9px 12px", borderRadius:10, border:`1px solid ${T.border}`,
                    background:"rgba(255,255,255,0.8)", fontSize:13, color:T.textPrimary, boxSizing:"border-box" }} />
              </div>
            </div>

            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:11, color:T.textMuted, marginBottom:4 }}>Note (optionnel)</div>
              <input type="text" value={newNote} onChange={e=>setNewNote(e.target.value)}
                placeholder="Indication, objectif..."
                style={{ width:"100%", padding:"9px 12px", borderRadius:10, border:`1px solid ${T.border}`,
                  background:"rgba(255,255,255,0.8)", fontSize:13, color:T.textPrimary, boxSizing:"border-box" }} />
            </div>

            {/* Récurrence */}
            <div style={{ background:"rgba(99,102,241,0.08)", borderRadius:12, padding:"14px",
              marginBottom:14, border:"1px solid rgba(99,102,241,0.2)" }}>
              <div style={{ fontSize:12, color:"#6366F1", fontWeight:700, marginBottom:10 }}>
                🔄 Récurrence automatique
              </div>
              <div style={{ display:"flex", gap:10, marginBottom:10 }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:11, color:T.textMuted, marginBottom:4 }}>
                    Répéter tous les (jours)
                  </div>
                  <div style={{ display:"flex", gap:6 }}>
                    {[0, 15, 30, 45, 60, 90].map(n => (
                      <button key={n} onClick={() => setNewRecurrence(n===0?"":String(n))} style={{
                        flex:1, padding:"7px 4px", borderRadius:8, border:"none", cursor:"pointer",
                        background: (newRecurrence===String(n)||(n===0&&!newRecurrence))
                          ? "#6366F1" : "rgba(255,255,255,0.7)",
                        fontSize:10, fontWeight:700,
                        color: (newRecurrence===String(n)||(n===0&&!newRecurrence)) ? "#fff" : T.textSub,
                      }}>
                        {n===0 ? "Non" : `${n}j`}
                      </button>
                    ))}
                  </div>
                  {/* Valeur personnalisée */}
                  <input type="number" value={newRecurrence}
                    onChange={e=>setNewRecurrence(e.target.value)}
                    placeholder="Ou saisir en jours..."
                    style={{ width:"100%", marginTop:8, padding:"8px 12px", borderRadius:8,
                      border:"1px solid rgba(99,102,241,0.3)",
                      background:"rgba(255,255,255,0.8)", fontSize:13, color:"#6366F1",
                      fontWeight:700, boxSizing:"border-box" }} />
                </div>
              </div>

              {newRecurrence && parseInt(newRecurrence) > 0 && (
                <div style={{ marginTop:6 }}>
                  <div style={{ fontSize:11, color:T.textMuted, marginBottom:4 }}>
                    🔔 Notification avant (jours)
                  </div>
                  <div style={{ display:"flex", gap:6 }}>
                    {[3, 5, 7, 10].map(n => (
                      <button key={n} onClick={() => setNewNotifJ(n)} style={{
                        flex:1, padding:"7px 4px", borderRadius:8, border:"none", cursor:"pointer",
                        background: newNotifJ===n ? T.amber : "rgba(255,255,255,0.7)",
                        fontSize:11, fontWeight:700,
                        color: newNotifJ===n ? "#fff" : T.textSub,
                      }}>{n}j</button>
                    ))}
                  </div>
                </div>
              )}

              {newRecurrence && parseInt(newRecurrence) > 0 && (
                <div style={{ marginTop:10, background:"rgba(255,255,255,0.7)", borderRadius:8,
                  padding:"8px 12px", fontSize:11, color:"#6366F1", fontWeight:700 }}>
                  ✓ {Math.floor(365/parseInt(newRecurrence))} occurrences générées sur 12 mois
                  · notification {newNotifJ}j avant chaque acte
                </div>
              )}
            </div>

            <button onClick={ajouterActe} style={{
              width:"100%", background:T.blue, color:"#fff", border:"none",
              borderRadius:12, padding:"13px", fontSize:15, fontWeight:800, cursor:"pointer"
            }}>✓ Ajouter au programme</button>
          </div>
        </div>
      )}
    </div>
  );
}


// ── PAGE FINANCES ─────────────────────────────────────────────────────────────
function FinancePage({ setPage, ventes: ventesProps, setVentes: setVentesProps }) {

  const [activeTab, setActiveTab]         = useState("bilan");
  const [soldeOuverture, setSoldeOuverture] = useState(0);
  const [showSoldeEdit, setShowSoldeEdit]   = useState(false);
  const [tempSolde, setTempSolde]           = useState("");

  const CATEGORIES_DEPENSES = [
    { id:"aliment",    label:"Aliment",         ico:"🌾" },
    { id:"medicament", label:"Médicaments",      ico:"💊" },
    { id:"alveoles",   label:"Alvéoles",         ico:"📦" },
    { id:"location",   label:"Location",         ico:"🏠" },
    { id:"employe",    label:"Employés",         ico:"👷" },
    { id:"autre",      label:"Autre dépense",    ico:"📝" },
  ];

  // ── DONNÉES INITIALES ──
  // Utiliser les ventes partagées depuis App
  const ventes    = ventesProps || [];
  const setVentes = setVentesProps || (() => {});

  const [depenses, setDepenses] = useState([]);

  // Saisie vente

  // Saisie dépense
  const [dDate,    setDDate]    = useState(new Date().toISOString().slice(0,10));
  const [dCat,     setDCat]     = useState("aliment");
  const [dMontant, setDMontant] = useState("");
  const [dNote,    setDNote]    = useState("");

  // ── CALCULS ──
  const totalVentes    = ventes.reduce((s,v) => s + v.total, 0);
  const totalEncaisse  = ventes.reduce((s,v) => {
    if (v.statut==="paye")    return s + v.total;
    if (v.statut==="partiel") return s + (v.montantRecu||0);
    return s;
  }, 0);
  const totalCreances  = ventes.reduce((s,v) => {
    if (v.statut==="impaye")  return s + v.total;
    if (v.statut==="partiel") return s + (v.total - (v.montantRecu||0));
    return s;
  }, 0);
  const totalDepenses  = depenses.reduce((s,d) => s + d.montant, 0);
  const beneficeNet    = soldeOuverture + totalEncaisse - totalDepenses;
  const beneficeProj   = soldeOuverture + totalVentes - totalDepenses;
  const marge          = totalEncaisse > 0 ? Math.round((totalEncaisse - totalDepenses) / totalEncaisse * 100) : 0;

  // Bilan par mois — COMPTABILITÉ DE PRODUCTION
  // Les recettes d'un mois = valeur des œufs PONDUS ce mois-là
  // (pas la date de vente, mais la date de ponte rattachée à la vente)
  // Chaque vente est rattachée à une "période de ponte" (date de ponte = date vente - X jours)
  // Simplifié : on utilise la date de ponte renseignée sur la vente (ponteDateVente)
  const getBilanMois = () => {
    const mois = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
      const label = d.toLocaleDateString("fr-FR", { month:"short", year:"2-digit" });
      mois[key] = { label, recettes:0, depenses:0, oeufsVendus:0, plateauxVendus:0 };
    }
    // Recettes rattachées à la date de PONTE (ponteDate), pas à la date de vente
    ventes.forEach(v => {
      const key = (v.ponteDate || v.date).slice(0,7);
      if (mois[key]) {
        mois[key].recettes      += v.total;
        mois[key].plateauxVendus += v.plateaux;
        mois[key].oeufsVendus   += v.plateaux * PLATEAU;
      }
    });
    // Dépenses rattachées à leur date réelle
    depenses.forEach(d => {
      const key = d.date.slice(0,7);
      if (mois[key]) mois[key].depenses += d.montant;
    });
    return Object.values(mois).map(m => ({ ...m, benefice: m.recettes - m.depenses }));
  };
  const bilanMois = getBilanMois();
  const maxVal = Math.max(...bilanMois.map(m => Math.max(m.recettes, m.depenses)), 1);

  // Projection mensuelle (moyenne des 3 derniers mois)
  const derniersMois = bilanMois.slice(-3);
  const moyRecettes  = Math.round(derniersMois.reduce((s,m)=>s+m.recettes,0) / 3);
  const moyDepenses  = Math.round(derniersMois.reduce((s,m)=>s+m.depenses,0) / 3);
  const moyBenefice  = moyRecettes - moyDepenses;

  // Dépenses par catégorie
  const depParCat = CATEGORIES_DEPENSES.map(c => ({
    ...c,
    total: depenses.filter(d=>d.cat===c.id).reduce((s,d)=>s+d.montant,0),
  })).filter(c=>c.total>0).sort((a,b)=>b.total-a.total);



  const handleDepense = () => {
    const m = parseInt(dMontant)||0;
    if (!m) return;
    setDepenses(p => [{ id:Date.now(), date:dDate, cat:dCat, montant:m, note:dNote }, ...p]);
    setDMontant(""); setDNote("");
  };

  const catConf = Object.fromEntries(CATEGORIES_DEPENSES.map(c=>[c.id,c]));

  const tabs = [
    { id:"bilan",     label:"Bilan",      ico:"📊" },
    { id:"ventes",    label:"Ventes",     ico:"🛒" },
    { id:"depenses",  label:"Dépenses",   ico:"💸" },
    { id:"projection",label:"Projection", ico:"📈" },
  ];

  return (
    <div style={{ background:T.bg, minHeight:"100vh", paddingBottom:90 }}>

      {/* Header */}
      <div style={{ background:T.cardBleu, padding:"20px 18px 16px", borderBottom:`1px solid rgba(37,99,235,0.15)` }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
          <button onClick={() => setPage("dashboard")} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer", color:T.textSub }}>←</button>
          <div>
            <div style={{ fontSize:11, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.08em" }}>Module</div>
            <div style={{ fontSize:20, fontWeight:800, color:T.textPrimary }}>💰 Finances & Comptabilité</div>
          </div>
        </div>

        {/* KPIs header */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
          {[
            { label:"Encaissé",   val:fmt(Math.round(totalEncaisse/1000))+"k",  unit:"FCFA", color:T.vitals  },
            { label:"Dépenses",   val:fmt(Math.round(totalDepenses/1000))+"k",  unit:"FCFA", color:T.danger  },
            { label:"Solde réel", val:(beneficeNet>=0?"+":"")+fmt(Math.round(beneficeNet/1000))+"k", unit:"FCFA", color:beneficeNet>=0?T.amber:T.danger },
          ].map((k,i) => (
            <div key={i} style={{ background:"rgba(255,255,255,0.65)", borderRadius:12, padding:"10px 8px", textAlign:"center" }}>
              <div style={{ fontSize:11, color:T.textMuted, marginBottom:2 }}>{k.label}</div>
              <div style={{ fontSize:18, fontWeight:900, color:k.color }}>{k.val}</div>
              <div style={{ fontSize:10, color:T.textMuted }}>{k.unit}</div>
            </div>
          ))}
        </div>
        <div style={{ textAlign:"center", marginTop:8 }}>
          <span style={{ fontSize:12, color:T.textSub, fontWeight:700 }}>Marge nette : </span>
          <span style={{ fontSize:14, fontWeight:900, color:marge>=0?T.vitals:T.danger }}>{marge}%</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", margin:"16px 18px 0", gap:8 }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            flex:1, padding:"9px 4px", borderRadius:12, border:"none", cursor:"pointer",
            background: activeTab===tab.id ? T.blue : T.cardSauge,
            transition:"all 0.18s ease",
          }}>
            <div style={{ fontSize:15 }}>{tab.ico}</div>
            <div style={{ fontSize:10, fontWeight:700, color:activeTab===tab.id?"#fff":T.textSub, marginTop:2 }}>{tab.label}</div>
          </button>
        ))}
      </div>

      {/* ── TAB BILAN ── */}
      {activeTab === "bilan" && (
        <div style={{ padding:"16px 18px 0" }}>

          {/* Solde d'ouverture */}
          <div style={{ background: soldeOuverture > 0 ? T.cardVert : soldeOuverture < 0 ? T.cardRouge : T.cardSauge,
            borderRadius:16, padding:"14px 16px", marginBottom:14,
            border:`1px solid ${soldeOuverture > 0 ? "rgba(13,122,56,0.2)" : soldeOuverture < 0 ? T.danger+"33" : T.border}` }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ fontSize:11, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:700, marginBottom:4 }}>
                  💼 Solde d'ouverture
                </div>
                <div style={{ fontSize:11, color:T.textSub, marginBottom:6 }}>
                  Trésorerie avant le début de la comptabilité
                </div>
                {!showSoldeEdit ? (
                  <div style={{ display:"flex", alignItems:"baseline", gap:6 }}>
                    <span style={{ fontSize:24, fontWeight:900,
                      color: soldeOuverture > 0 ? T.vitals : soldeOuverture < 0 ? T.danger : T.textMuted }}>
                      {soldeOuverture >= 0 ? "+" : ""}{fmt(soldeOuverture)}
                    </span>
                    <span style={{ fontSize:12, color:T.textMuted }}>FCFA</span>
                  </div>
                ) : (
                  <div style={{ display:"flex", gap:8, alignItems:"center", marginTop:6 }}>
                    <input type="number" value={tempSolde}
                      onChange={e => setTempSolde(e.target.value)}
                      placeholder="Ex: 500000"
                      style={{ flex:1, padding:"9px 12px", borderRadius:10,
                        border:`1px solid ${T.border}`, background:"rgba(255,255,255,0.9)",
                        fontSize:16, fontWeight:900, color:T.amber, boxSizing:"border-box" }} />
                    <button onClick={() => {
                      setSoldeOuverture(parseInt(tempSolde) || 0);
                      setShowSoldeEdit(false); setTempSolde("");
                    }} style={{ background:T.vitals, color:"#fff", border:"none",
                      borderRadius:10, padding:"9px 16px", fontWeight:800, fontSize:13, cursor:"pointer" }}>
                      ✓
                    </button>
                    <button onClick={() => { setShowSoldeEdit(false); setTempSolde(""); }}
                      style={{ background:T.cardSauge, color:T.textSub, border:`1px solid ${T.border}`,
                        borderRadius:10, padding:"9px 12px", fontWeight:700, fontSize:13, cursor:"pointer" }}>
                      ✕
                    </button>
                  </div>
                )}
              </div>
              {!showSoldeEdit && (
                <button onClick={() => { setShowSoldeEdit(true); setTempSolde(soldeOuverture.toString()); }}
                  style={{ background:"rgba(255,255,255,0.7)", border:`1px solid ${T.border}`,
                    borderRadius:10, padding:"7px 12px", cursor:"pointer",
                    fontSize:12, fontWeight:700, color:T.textSub }}>
                  ✏️ Modifier
                </button>
              )}
            </div>

            {/* Solde total avec ouverture */}
            {soldeOuverture !== 0 && (
              <div style={{ marginTop:12, paddingTop:10, borderTop:`1px solid ${T.border}`,
                display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={{ fontSize:12, color:T.textSub }}>Solde total (ouverture + activité)</span>
                <span style={{ fontSize:16, fontWeight:900,
                  color: beneficeNet >= 0 ? T.vitals : T.danger }}>
                  {beneficeNet >= 0 ? "+" : ""}{fmt(beneficeNet)} FCFA
                </span>
              </div>
            )}
          </div>

          {/* Créances en cours */}
          {totalCreances > 0 && (
            <div style={{ background:T.cardAmbre, borderRadius:16, padding:"14px 16px",
              marginBottom:14, border:`1px solid rgba(224,147,18,0.25)` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                <div>
                  <div style={{ fontSize:11, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:700 }}>
                    ⏳ Créances à encaisser
                  </div>
                  <div style={{ fontSize:22, fontWeight:900, color:T.amber, marginTop:4 }}>
                    {fmt(totalCreances)} FCFA
                  </div>
                  <div style={{ fontSize:11, color:T.textSub, marginTop:2 }}>
                    Solde après encaissement : <strong style={{color:T.vitals}}>{beneficeProj>=0?"+":""}{fmt(beneficeProj)} FCFA</strong>
                  </div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:11, color:T.textMuted }}>Ventes totales</div>
                  <div style={{ fontSize:16, fontWeight:800, color:T.textPrimary }}>{fmt(totalVentes)} F</div>
                  <div style={{ fontSize:11, color:T.textMuted, marginTop:2 }}>Encaissé</div>
                  <div style={{ fontSize:14, fontWeight:800, color:T.vitals }}>{fmt(totalEncaisse)} F</div>
                </div>
              </div>
              {/* Liste des impayés */}
              {ventes.filter(v=>v.statut!=="paye").map(v => (
                <div key={v.id} style={{ background:"rgba(255,255,255,0.7)", borderRadius:10,
                  padding:"9px 12px", marginBottom:7, display:"flex",
                  justifyContent:"space-between", alignItems:"center" }}>
                  <div>
                    <div style={{ fontSize:12, fontWeight:700, color:T.textPrimary }}>{v.note}</div>
                    <div style={{ fontSize:10, color:T.textMuted }}>
                      {new Date(v.date+"T12:00:00").toLocaleDateString("fr-FR",{day:"numeric",month:"short"})}
                      {v.dateEcheance && ` · Échéance: ${new Date(v.dateEcheance+"T12:00:00").toLocaleDateString("fr-FR",{day:"numeric",month:"short"})}`}
                    </div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:12, fontWeight:900,
                      color: v.statut==="partiel" ? T.warning : T.danger }}>
                      {v.statut==="partiel"
                        ? `Reste: ${fmt(v.total-(v.montantRecu||0))} F`
                        : `${fmt(v.total)} F`}
                    </div>
                    <div style={{ fontSize:10, background: v.statut==="partiel" ? T.warningDim : T.dangerDim,
                      color: v.statut==="partiel" ? T.warning : T.danger,
                      borderRadius:6, padding:"1px 7px", marginTop:2, fontWeight:700 }}>
                      {v.statut==="partiel" ? "⚡ Partiel" : "🔴 Impayé"}
                    </div>
                    <button onClick={() => setVentes(prev => prev.map(vv =>
                      vv.id===v.id ? {...vv, statut:"paye", datePaiement:new Date().toISOString().slice(0,10), montantRecu:vv.total} : vv
                    ))} style={{
                      marginTop:4, background:T.vitals, color:"#fff", border:"none",
                      borderRadius:8, padding:"4px 10px", fontSize:10, fontWeight:800, cursor:"pointer"
                    }}>✓ Marquer payé</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Graphe barres mensuel */}
          <div style={{ background:T.cardBleu, borderRadius:16, padding:"16px", marginBottom:14, border:`1px solid rgba(37,99,235,0.15)` }}>
            <div style={{ fontSize:12, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:700, marginBottom:14 }}>
              📊 Bilan mensuel (6 mois)
            </div>
            {bilanMois.map((m,i) => (
              <div key={i} style={{ marginBottom:10 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                  <span style={{ fontSize:12, fontWeight:700, color:T.textPrimary }}>{m.label}</span>
                  <span style={{ fontSize:12, fontWeight:900, color:m.benefice>=0?T.vitals:T.danger }}>
                    {m.benefice>=0?"+":""}{fmt(Math.round(m.benefice/1000))}k F
                  </span>
                </div>
                <div style={{ position:"relative", height:6, background:"rgba(0,0,0,0.06)", borderRadius:3, marginBottom:3 }}>
                  <div style={{ height:"100%", width:`${m.recettes/maxVal*100}%`, background:T.vitals, borderRadius:3, opacity:0.8 }} />
                </div>
                <div style={{ position:"relative", height:6, background:"rgba(0,0,0,0.06)", borderRadius:3 }}>
                  <div style={{ height:"100%", width:`${m.depenses/maxVal*100}%`, background:T.danger, borderRadius:3, opacity:0.8 }} />
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", marginTop:3 }}>
                  <span style={{ fontSize:10, color:T.vitals }}>+{fmt(Math.round(m.recettes/1000))}k F {m.plateauxVendus>0?`(${m.plateauxVendus} plat.)`:""}</span>
                  <span style={{ fontSize:10, color:T.danger }}>-{fmt(Math.round(m.depenses/1000))}k F</span>
                </div>
              </div>
            ))}
            <div style={{ display:"flex", gap:16, justifyContent:"center", marginTop:8 }}>
              <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                <div style={{ width:12, height:4, background:T.vitals, borderRadius:2 }}/>
                <span style={{ fontSize:10, color:T.textMuted }}>Recettes</span>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                <div style={{ width:12, height:4, background:T.danger, borderRadius:2 }}/>
                <span style={{ fontSize:10, color:T.textMuted }}>Dépenses</span>
              </div>
            </div>
          </div>

          {/* Répartition dépenses */}
          <div style={{ background:T.cardAmbre, borderRadius:16, padding:"16px", border:`1px solid rgba(224,147,18,0.2)` }}>
            <div style={{ fontSize:12, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:700, marginBottom:12 }}>
              💸 Répartition des dépenses
            </div>
            {depParCat.map((c,i) => {
              const pct = Math.round(c.total / totalDepenses * 100);
              return (
                <div key={i} style={{ marginBottom:10 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                    <span style={{ fontSize:12, color:T.textPrimary }}>{c.ico} {c.label}</span>
                    <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                      <span style={{ fontSize:11, color:T.textMuted }}>{pct}%</span>
                      <span style={{ fontSize:12, fontWeight:800, color:T.amber }}>{fmt(Math.round(c.total/1000))}k F</span>
                    </div>
                  </div>
                  <div style={{ height:6, background:"rgba(0,0,0,0.06)", borderRadius:3, overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${pct}%`, background:T.amber, borderRadius:3 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TAB VENTES ── */}
      {activeTab === "ventes" && (
        <div style={{ padding:"16px 18px 0" }}>

          <FormVente onSave={(v) => setVentes(p => [v, ...p])} />
          <div style={{ height:16 }} />

          {/* Liste ventes */}
          <div style={{ fontSize:12, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:700, marginBottom:10 }}>
            Historique des ventes
          </div>
          {ventes.map(v => (
            <div key={v.id} style={{ background:T.cardSauge, borderRadius:13, padding:"12px 14px", marginBottom:9,
              border:`1px solid ${T.border}`, display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ width:38, height:38, borderRadius:10, background:T.vitals+"22",
                display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>🛒</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:700, color:T.textPrimary }}>{v.note || "Vente"}</div>
                <div style={{ fontSize:11, color:T.textMuted }}>
                  {new Date(v.date+"T12:00:00").toLocaleDateString("fr-FR",{day:"numeric",month:"short",year:"numeric"})}
                  {" · "}{v.plateaux} plat. × {fmt(v.prixUnitaire)} F
                </div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:15, fontWeight:900,
                color: v.statut==="paye" ? T.vitals : v.statut==="partiel" ? T.warning : T.danger }}>
                {fmt(v.statut==="partiel" ? (v.montantRecu||0) : v.total)} F
                {v.statut==="partiel" && <span style={{fontSize:10, color:T.textMuted}}> /{fmt(v.total)}</span>}
              </div>
              <div style={{ fontSize:10, color:T.textMuted }}>{v.plateaux} plateaux</div>
              <div style={{ fontSize:10, fontWeight:700, marginTop:2,
                color: v.statut==="paye" ? T.vitals : v.statut==="partiel" ? T.warning : T.danger }}>
                {v.statut==="paye" ? "✓ Payé" : v.statut==="partiel" ? "⚡ Partiel" : "🔴 Impayé"}
              </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── TAB DÉPENSES ── */}
      {activeTab === "depenses" && (
        <div style={{ padding:"16px 18px 0" }}>

          {/* Formulaire dépense */}
          <div style={{ background:T.cardRouge, borderRadius:16, padding:"16px", marginBottom:14, border:`1px solid rgba(185,28,28,0.12)` }}>
            <div style={{ fontSize:12, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:700, marginBottom:12 }}>
              💸 Enregistrer une dépense
            </div>

            {/* Catégorie */}
            <div style={{ marginBottom:10 }}>
              <div style={{ fontSize:11, color:T.textMuted, marginBottom:6 }}>Catégorie</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
                {CATEGORIES_DEPENSES.map(c => (
                  <button key={c.id} onClick={() => setDCat(c.id)} style={{
                    padding:"6px 12px", borderRadius:20, border:`1px solid ${dCat===c.id ? T.danger : T.border}`,
                    background: dCat===c.id ? T.cardRouge : "rgba(255,255,255,0.6)",
                    cursor:"pointer", fontSize:12, fontWeight:700,
                    color: dCat===c.id ? T.danger : T.textSub,
                  }}>
                    {c.ico} {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display:"flex", gap:10, marginBottom:10 }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:11, color:T.textMuted, marginBottom:4 }}>Date</div>
                <input type="date" value={dDate} onChange={e=>setDDate(e.target.value)}
                  style={{ width:"100%", padding:"9px 12px", borderRadius:10, border:`1px solid ${T.border}`,
                    background:"rgba(255,255,255,0.8)", fontSize:13, color:T.textPrimary, boxSizing:"border-box" }} />
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:11, color:T.textMuted, marginBottom:4 }}>Montant (FCFA)</div>
                <input type="number" min="0" value={dMontant} onChange={e=>setDMontant(e.target.value)} placeholder="0"
                  style={{ width:"100%", padding:"9px 12px", borderRadius:10, border:`1px solid ${T.border}`,
                    background:"rgba(255,255,255,0.8)", fontSize:16, fontWeight:900, color:T.danger, boxSizing:"border-box" }} />
              </div>
            </div>
            <div style={{ marginBottom:12 }}>
              <div style={{ fontSize:11, color:T.textMuted, marginBottom:4 }}>Note</div>
              <input type="text" value={dNote} onChange={e=>setDNote(e.target.value)} placeholder="Description de la dépense..."
                style={{ width:"100%", padding:"9px 12px", borderRadius:10, border:`1px solid ${T.border}`,
                  background:"rgba(255,255,255,0.8)", fontSize:13, color:T.textPrimary, boxSizing:"border-box" }} />
            </div>
            <button onClick={handleDepense} style={{
              width:"100%", background:T.danger, color:"#fff", border:"none",
              borderRadius:12, padding:"13px", fontSize:15, fontWeight:800, cursor:"pointer"
            }}>✓ Enregistrer la dépense</button>
          </div>

          {/* Liste dépenses */}
          <div style={{ fontSize:12, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:700, marginBottom:10 }}>
            Historique des dépenses
          </div>
          {depenses.map(d => {
            const c = catConf[d.cat] || { ico:"📝", label:"Autre" };
            return (
              <div key={d.id} style={{ background:T.cardSauge, borderRadius:13, padding:"12px 14px", marginBottom:9,
                border:`1px solid ${T.border}`, display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ width:38, height:38, borderRadius:10, background:T.danger+"15",
                  display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>{c.ico}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:T.textPrimary }}>{c.label}</div>
                  <div style={{ fontSize:11, color:T.textMuted }}>
                    {new Date(d.date+"T12:00:00").toLocaleDateString("fr-FR",{day:"numeric",month:"short",year:"numeric"})}
                    {d.note ? ` · ${d.note}` : ""}
                  </div>
                </div>
                <div style={{ fontSize:15, fontWeight:900, color:T.danger }}>-{fmt(d.montant)} F</div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── TAB PROJECTION ── */}
      {activeTab === "projection" && (
        <div style={{ padding:"16px 18px 0" }}>

          {/* Moyenne basée sur 3 derniers mois */}
          <div style={{ background:T.cardBleu, borderRadius:16, padding:"16px", marginBottom:14, border:`1px solid rgba(37,99,235,0.15)` }}>
            <div style={{ fontSize:12, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:700, marginBottom:4 }}>
              📈 Projection mensuelle
            </div>
            <div style={{ fontSize:11, color:T.textMuted, marginBottom:14 }}>
              Basée sur la moyenne des 3 derniers mois
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:14 }}>
              {[
                { label:"Recettes moy.",  val:moyRecettes,  color:T.vitals },
                { label:"Dépenses moy.",  val:moyDepenses,  color:T.danger },
                { label:"Bénéfice moy.",  val:moyBenefice,  color:moyBenefice>=0?T.amber:T.danger },
              ].map((k,i) => (
                <div key={i} style={{ background:"rgba(255,255,255,0.65)", borderRadius:12, padding:"10px 8px", textAlign:"center" }}>
                  <div style={{ fontSize:10, color:T.textMuted, marginBottom:2 }}>{k.label}</div>
                  <div style={{ fontSize:14, fontWeight:900, color:k.color }}>{fmt(Math.round(k.val/1000))}k</div>
                  <div style={{ fontSize:10, color:T.textMuted }}>FCFA</div>
                </div>
              ))}
            </div>

            {/* Projections sur 3/6/12 mois */}
            <div style={{ fontSize:12, color:T.textMuted, fontWeight:700, marginBottom:10 }}>Projections cumulées</div>
            {[3, 6, 12].map(n => {
              const rec = moyRecettes * n;
              const dep = moyDepenses * n;
              const ben = rec - dep;
              return (
                <div key={n} style={{ background:"rgba(255,255,255,0.65)", borderRadius:12, padding:"12px 14px", marginBottom:8 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                    <span style={{ fontSize:13, fontWeight:800, color:T.textPrimary }}>Sur {n} mois</span>
                    <span style={{ fontSize:15, fontWeight:900, color:ben>=0?T.vitals:T.danger }}>
                      {ben>=0?"+":""}{fmt(Math.round(ben/1000))}k F
                    </span>
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between" }}>
                    <span style={{ fontSize:11, color:T.vitals }}>Recettes : {fmt(Math.round(rec/1000))}k F</span>
                    <span style={{ fontSize:11, color:T.danger }}>Dépenses : {fmt(Math.round(dep/1000))}k F</span>
                  </div>
                  <div style={{ marginTop:6, height:5, background:"rgba(0,0,0,0.06)", borderRadius:3, overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${Math.min(dep/rec*100,100)}%`, background:T.danger, borderRadius:3, opacity:0.7 }} />
                  </div>
                  <div style={{ fontSize:10, color:T.textMuted, marginTop:3 }}>
                    Taux de charges : {rec>0?Math.round(dep/rec*100):0}%
                  </div>
                </div>
              );
            })}
          </div>

          {/* KPIs performance */}
          <div style={{ background:T.cardAmbre, borderRadius:16, padding:"16px", border:`1px solid rgba(224,147,18,0.2)` }}>
            <div style={{ fontSize:12, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:700, marginBottom:12 }}>
              🎯 KPIs de performance
            </div>
            {[
              { label:"Revenu / poule / mois",   val:`${fmt(Math.round(moyRecettes/DATA.effectif.pondeuses))} F`,  ico:"🐔" },
              { label:"Bénéfice / plateau vendu", val:`${fmt(Math.round(moyBenefice/Math.max(ventes.reduce((s,v)=>s+v.plateaux,0)/6,1)))} F`, ico:"🥚" },
              { label:"Point mort mensuel",       val:`${fmt(moyDepenses)} F`,  ico:"⚖️" },
              { label:"Marge nette moyenne",      val:`${marge}%`,             ico:"📊" },
            ].map((k,i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 0",
                borderBottom: i<3 ? `1px solid ${T.border}` : "none" }}>
                <span style={{ fontSize:20 }}>{k.ico}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:12, color:T.textMuted }}>{k.label}</div>
                </div>
                <div style={{ fontSize:15, fontWeight:900, color:T.amber }}>{k.val}</div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}





// ── PAGE PARAMÈTRES UTILISATEUR ───────────────────────────────────────────────
function SettingsPage({ setPage, user, setUser, setAppState, nomFerme, setNomFerme, darkMode, setDarkMode }) {
  const [activeTab, setActiveTab]       = useState("profil");
  const [editNom,   setEditNom]         = useState(false);
  const [tempNom,   setTempNom]         = useState(user?.nom || "");
  const [editEmail, setEditEmail]       = useState(false);
  const [tempEmail, setTempEmail]       = useState(user?.email || "");
  const [editTel,   setEditTel]         = useState(false);
  const [tempTel,   setTempTel]         = useState(user?.tel || "");
  const [editFerme, setEditFerme]       = useState(false);
  const [tempFerme, setTempFerme]       = useState(nomFerme || "");

  // Mot de passe
  const [oldPass,   setOldPass]         = useState("");
  const [newPass,   setNewPass]         = useState("");
  const [newPass2,  setNewPass2]        = useState("");
  const [showPass,  setShowPass]        = useState(false);
  const [passMsg,   setPassMsg]         = useState(null); // {type, text}

  // Suppression compte
  const [confirmDelete, setConfirmDelete] = useState("");
  const [showDelete,    setShowDelete]    = useState(false);

  // Notifications
  const [notifVaccin,  setNotifVaccin]  = useState(true);
  const [notifStock,   setNotifStock]   = useState(true);
  const [notifPonte,   setNotifPonte]   = useState(false);
  const [notifFinance, setNotifFinance] = useState(true);

  const handleChangePass = () => {
    if (!oldPass) { setPassMsg({type:"error", text:"Entrez votre mot de passe actuel"}); return; }
    if (newPass.length < 6) { setPassMsg({type:"error", text:"Nouveau mot de passe trop court (6 min)"}); return; }
    if (newPass !== newPass2) { setPassMsg({type:"error", text:"Les mots de passe ne correspondent pas"}); return; }
    // En prod : supabase.auth.updateUser({ password: newPass })
    setPassMsg({type:"success", text:"✓ Mot de passe mis à jour avec succès"});
    setOldPass(""); setNewPass(""); setNewPass2("");
    setTimeout(() => setPassMsg(null), 3000);
  };

  const handleDeleteAccount = () => {
    if (confirmDelete !== "SUPPRIMER") { return; }
    // En prod : supabase.auth.admin.deleteUser(user.id)
    setAppState("auth");
    setUser(null);
  };

  const avatar = (user?.nom || "U")[0].toUpperCase();

  const tabs = [
    { id:"profil",   label:"Profil",         ico:"👤" },
    { id:"securite", label:"Sécurité",        ico:"🔒" },
    { id:"notifs",   label:"Notifications",   ico:"🔔" },
    { id:"compte",   label:"Compte",          ico:"⚙️" },
  ];

  const InfoRow = ({ label, value, onEdit, editing, children }) => (
    <div style={{ padding:"14px 0", borderBottom:`1px solid ${T.border}` }}>
      <div style={{ fontSize:11, color:T.textMuted, textTransform:"uppercase",
        letterSpacing:"0.07em", fontWeight:700, marginBottom:5 }}>{label}</div>
      {editing ? children : (
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ fontSize:14, fontWeight:600, color: value ? T.textPrimary : T.textMuted }}>
            {value || "Non renseigné"}
          </div>
          <button onClick={onEdit} style={{ background:"none", border:`1px solid ${T.border}`,
            borderRadius:8, padding:"4px 12px", fontSize:12, fontWeight:700,
            color:T.amber, cursor:"pointer" }}>✏️ Modifier</button>
        </div>
      )}
    </div>
  );

  const inputStyle = {
    width:"100%", padding:"10px 12px", borderRadius:10,
    border:`1.5px solid ${T.amber}66`,
    background:"rgba(255,255,255,0.9)", fontSize:14,
    color:T.textPrimary, boxSizing:"border-box",
  };

  const SaveCancel = ({ onSave, onCancel }) => (
    <div style={{ display:"flex", gap:8, marginTop:8 }}>
      <button onClick={onSave} style={{ flex:1, background:T.vitals, color:"#fff",
        border:"none", borderRadius:10, padding:"9px", fontSize:13, fontWeight:800, cursor:"pointer" }}>
        ✓ Enregistrer
      </button>
      <button onClick={onCancel} style={{ background:T.cardSauge, color:T.textSub,
        border:`1px solid ${T.border}`, borderRadius:10, padding:"9px 14px",
        fontSize:13, fontWeight:700, cursor:"pointer" }}>✕</button>
    </div>
  );

  return (
    <div style={{ background:T.bg, minHeight:"100vh", paddingBottom:90 }}>

      {/* Header */}
      <div style={{ background:T.cardVert, padding:"20px 18px 20px", borderBottom:`1px solid ${T.border}` }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
          <button onClick={() => setPage("dashboard")} style={{ background:"none", border:"none",
            fontSize:20, cursor:"pointer", color:T.textSub }}>←</button>
          <div style={{ fontSize:20, fontWeight:800, color:T.textPrimary }}>⚙️ Paramètres</div>
        </div>

        {/* Avatar + infos rapides */}
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <div style={{ width:56, height:56, borderRadius:18,
            background:`linear-gradient(135deg, ${T.amber}, ${T.amberDim})`,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:24, fontWeight:900, color:"#fff",
            boxShadow:`0 4px 14px ${T.amber}44` }}>
            {avatar}
          </div>
          <div>
            <div style={{ fontSize:17, fontWeight:800, color:T.textPrimary }}>{user?.nom || "Éleveur"}</div>
            <div style={{ fontSize:12, color:T.textSub, marginTop:2 }}>
              {user?.email || user?.tel || ""}
            </div>
            <div style={{ fontSize:11, color:T.vitals, fontWeight:700, marginTop:2 }}>
              {user?.provider === "google" ? "🔗 Compte Google" : "✓ Compte actif"}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", margin:"16px 18px 0", gap:8 }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            flex:1, padding:"9px 4px", borderRadius:12, border:"none", cursor:"pointer",
            background: activeTab===tab.id ? T.vitals : T.cardSauge,
            transition:"all 0.18s ease",
          }}>
            <div style={{ fontSize:15 }}>{tab.ico}</div>
            <div style={{ fontSize:9, fontWeight:700,
              color: activeTab===tab.id ? "#fff" : T.textSub, marginTop:2 }}>
              {tab.label}
            </div>
          </button>
        ))}
      </div>

      {/* ── TAB PROFIL ── */}
      {activeTab === "profil" && (
        <div style={{ padding:"16px 18px 0" }}>
          <div style={{ background:T.cardSauge, borderRadius:16, padding:"0 16px", border:`1px solid ${T.border}` }}>

            <InfoRow label="Nom complet" value={user?.nom}
              onEdit={() => { setTempNom(user?.nom||""); setEditNom(true); }}
              editing={editNom}>
              <input value={tempNom} onChange={e=>setTempNom(e.target.value)}
                style={inputStyle} autoFocus />
              <SaveCancel
                onSave={() => { setUser(u=>({...u, nom:tempNom})); setEditNom(false); }}
                onCancel={() => setEditNom(false)} />
            </InfoRow>

            <InfoRow label="Email" value={user?.email}
              onEdit={() => { setTempEmail(user?.email||""); setEditEmail(true); }}
              editing={editEmail}>
              <input type="email" value={tempEmail} onChange={e=>setTempEmail(e.target.value)}
                style={inputStyle} autoFocus />
              <SaveCancel
                onSave={() => { setUser(u=>({...u, email:tempEmail})); setEditEmail(false); }}
                onCancel={() => setEditEmail(false)} />
            </InfoRow>

            <InfoRow label="Téléphone" value={user?.tel}
              onEdit={() => { setTempTel(user?.tel||""); setEditTel(true); }}
              editing={editTel}>
              <input type="tel" value={tempTel} onChange={e=>setTempTel(e.target.value)}
                placeholder="+221 77 123 45 67" style={inputStyle} autoFocus />
              <SaveCancel
                onSave={() => { setUser(u=>({...u, tel:tempTel})); setEditTel(false); }}
                onCancel={() => setEditTel(false)} />
            </InfoRow>

            <InfoRow label="Nom de la ferme" value={nomFerme}
              onEdit={() => { setTempFerme(nomFerme); setEditFerme(true); }}
              editing={editFerme}>
              <input value={tempFerme} onChange={e=>setTempFerme(e.target.value)}
                style={inputStyle} autoFocus />
              <SaveCancel
                onSave={() => { setNomFerme(tempFerme); setEditFerme(false); }}
                onCancel={() => setEditFerme(false)} />
            </InfoRow>

            <div style={{ padding:"14px 0" }}>
              <div style={{ fontSize:11, color:T.textMuted, textTransform:"uppercase",
                letterSpacing:"0.07em", fontWeight:700, marginBottom:8 }}>Thème</div>
              <div style={{ display:"flex", background:T.cardSauge, borderRadius:10, padding:3, gap:3 }}>
                {[
                  { id:false, label:"☀️ Clair" },
                  { id:true,  label:"🌙 Sombre" },
                ].map(t => (
                  <button key={String(t.id)} onClick={() => setDarkMode(t.id)} style={{
                    flex:1, padding:"9px", borderRadius:8, border:"none", cursor:"pointer",
                    background: darkMode===t.id ? T.amber : "transparent",
                    fontSize:13, fontWeight:700,
                    color: darkMode===t.id ? "#fff" : T.textMuted,
                    transition:"all 0.18s ease",
                  }}>{t.label}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB SÉCURITÉ ── */}
      {activeTab === "securite" && (
        <div style={{ padding:"16px 18px 0" }}>

          {user?.provider === "google" ? (
            <div style={{ background:T.cardBleu, borderRadius:16, padding:"20px",
              border:`1px solid rgba(37,99,235,0.2)`, textAlign:"center" }}>
              <div style={{ fontSize:36, marginBottom:10 }}>🔗</div>
              <div style={{ fontSize:15, fontWeight:700, color:T.textPrimary, marginBottom:6 }}>
                Compte Google
              </div>
              <div style={{ fontSize:13, color:T.textSub }}>
                Votre mot de passe est géré par Google. Connectez-vous à google.com pour le modifier.
              </div>
            </div>
          ) : (
            <div style={{ background:T.cardSauge, borderRadius:16, padding:"16px",
              border:`1px solid ${T.border}` }}>
              <div style={{ fontSize:13, fontWeight:800, color:T.textPrimary, marginBottom:14 }}>
                🔒 Changer le mot de passe
              </div>

              {[
                { label:"Mot de passe actuel", val:oldPass, set:setOldPass },
                { label:"Nouveau mot de passe", val:newPass, set:setNewPass },
                { label:"Confirmer le nouveau", val:newPass2, set:setNewPass2 },
              ].map((f, i) => (
                <div key={i} style={{ marginBottom:12 }}>
                  <div style={{ fontSize:11, color:T.textMuted, marginBottom:4, fontWeight:700 }}>{f.label}</div>
                  <div style={{ position:"relative" }}>
                    <input type={showPass?"text":"password"} value={f.val}
                      onChange={e => f.set(e.target.value)}
                      placeholder="••••••••"
                      style={{ ...inputStyle, paddingRight:40,
                        borderColor: i===2 && newPass2 ?
                          (newPass===newPass2 ? T.vitals+"66" : T.danger+"66") : T.amber+"66" }} />
                    {i===0 && (
                      <button onClick={()=>setShowPass(v=>!v)} style={{
                        position:"absolute", right:10, top:"50%", transform:"translateY(-50%)",
                        background:"none", border:"none", cursor:"pointer", fontSize:15 }}>
                        {showPass?"🙈":"👁️"}
                      </button>
                    )}
                  </div>
                  {i===1 && newPass && newPass.length < 6 && (
                    <div style={{ fontSize:11, color:T.danger, marginTop:3 }}>⚠️ 6 caractères minimum</div>
                  )}
                  {i===2 && newPass2 && newPass!==newPass2 && (
                    <div style={{ fontSize:11, color:T.danger, marginTop:3 }}>⚠️ Mots de passe différents</div>
                  )}
                  {i===2 && newPass2 && newPass===newPass2 && (
                    <div style={{ fontSize:11, color:T.vitals, marginTop:3 }}>✓ Identiques</div>
                  )}
                </div>
              ))}

              {passMsg && (
                <div style={{ background: passMsg.type==="success" ? T.cardVert : T.cardRouge,
                  border:`1px solid ${passMsg.type==="success" ? T.vitals+"44" : T.danger+"44"}`,
                  borderRadius:10, padding:"10px 14px", marginBottom:12,
                  fontSize:13, color: passMsg.type==="success" ? T.vitals : T.danger, fontWeight:700 }}>
                  {passMsg.text}
                </div>
              )}

              <button onClick={handleChangePass} style={{
                width:"100%", background:T.vitals, color:"#fff", border:"none",
                borderRadius:12, padding:"13px", fontSize:14, fontWeight:800, cursor:"pointer",
              }}>🔒 Mettre à jour le mot de passe</button>
            </div>
          )}

          {/* Sessions */}
          <div style={{ background:T.cardSauge, borderRadius:16, padding:"16px",
            marginTop:14, border:`1px solid ${T.border}` }}>
            <div style={{ fontSize:13, fontWeight:800, color:T.textPrimary, marginBottom:12 }}>
              📱 Sessions actives
            </div>
            {[
              { device:"iPhone 14", location:"Dakar, SN", date:"Maintenant", current:true },
              { device:"Chrome / Windows", location:"Dakar, SN", date:"Il y a 2 jours", current:false },
            ].map((s, i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:10,
                padding:"10px 0", borderBottom: i===0 ? `1px solid ${T.border}` : "none" }}>
                <span style={{ fontSize:22 }}>{s.device.includes("iPhone")?"📱":"💻"}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:T.textPrimary }}>{s.device}</div>
                  <div style={{ fontSize:11, color:T.textMuted }}>{s.location} · {s.date}</div>
                </div>
                {s.current
                  ? <div style={{ fontSize:11, color:T.vitals, fontWeight:700 }}>● Actuel</div>
                  : <button style={{ background:T.cardRouge, color:T.danger, border:`1px solid ${T.danger}33`,
                      borderRadius:8, padding:"4px 10px", fontSize:11, fontWeight:700, cursor:"pointer" }}>
                      Déconnecter
                    </button>
                }
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB NOTIFICATIONS ── */}
      {activeTab === "notifs" && (
        <div style={{ padding:"16px 18px 0" }}>
          <div style={{ background:T.cardSauge, borderRadius:16, padding:"0 16px",
            border:`1px solid ${T.border}` }}>
            {[
              { label:"💉 Rappels vaccins & vitamines", sub:"Alertes 7 jours avant", val:notifVaccin, set:setNotifVaccin },
              { label:"🌾 Stock aliment critique",      sub:"Quand < seuil défini",  val:notifStock,  set:setNotifStock  },
              { label:"🥚 Rappel saisie ponte",         sub:"Chaque soir à 19h",     val:notifPonte,  set:setNotifPonte  },
              { label:"💰 Créances impayées",           sub:"Échéance dépassée",     val:notifFinance,set:setNotifFinance},
            ].map((n, i, arr) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:12,
                padding:"16px 0", borderBottom: i<arr.length-1 ? `1px solid ${T.border}` : "none" }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:T.textPrimary }}>{n.label}</div>
                  <div style={{ fontSize:11, color:T.textMuted, marginTop:2 }}>{n.sub}</div>
                </div>
                {/* Toggle switch */}
                <div onClick={() => n.set(v=>!v)} style={{
                  width:46, height:26, borderRadius:13, cursor:"pointer",
                  background: n.val ? T.vitals : T.border,
                  position:"relative", transition:"background 0.2s ease",
                  flexShrink:0,
                }}>
                  <div style={{
                    position:"absolute", top:3, width:20, height:20, borderRadius:"50%",
                    background:"#fff", boxShadow:"0 1px 4px rgba(0,0,0,0.2)",
                    left: n.val ? 23 : 3, transition:"left 0.2s ease",
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB COMPTE ── */}
      {activeTab === "compte" && (
        <div style={{ padding:"16px 18px 0" }}>

          {/* Infos abonnement */}
          <div style={{ background:T.cardAmbre, borderRadius:16, padding:"16px",
            marginBottom:14, border:`1px solid rgba(224,147,18,0.2)` }}>
            <div style={{ fontSize:13, fontWeight:800, color:T.textPrimary, marginBottom:10 }}>
              💎 Plan actuel
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ fontSize:18, fontWeight:900, color:T.amber }}>Essai gratuit</div>
                <div style={{ fontSize:12, color:T.textSub, marginTop:2 }}>30 jours · expire le 13 août 2026</div>
              </div>
              <button style={{ background:T.amber, color:"#fff", border:"none",
                borderRadius:12, padding:"10px 16px", fontSize:13, fontWeight:800, cursor:"pointer" }}>
                Passer Pro →
              </button>
            </div>
          </div>

          {/* Déconnexion */}
          <button onClick={() => {
            localStorage.removeItem("pondetrack_onboarding_done");
            localStorage.removeItem("pondetrack_ferme_nom");
            localStorage.removeItem("pondetrack_poulaillers");
            localStorage.removeItem("pondetrack_conso");
            supabaseClient.auth.signOut();
            setAppState("auth");
            setUser(null);
          }} style={{
            width:"100%", background:T.cardSauge, color:T.textSub,
            border:`1px solid ${T.border}`, borderRadius:14,
            padding:"14px", fontSize:14, fontWeight:700, cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center", gap:8,
            marginBottom:10,
          }}>
            🚪 Se déconnecter
          </button>

          {/* Export données */}
          <button style={{
            width:"100%", background:T.cardBleu, color:T.blue,
            border:`1px solid rgba(37,99,235,0.2)`, borderRadius:14,
            padding:"14px", fontSize:14, fontWeight:700, cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center", gap:8,
            marginBottom:24,
          }}>
            📥 Exporter mes données (CSV)
          </button>

          {/* Zone danger */}
          <div style={{ background:T.cardRouge, borderRadius:16, padding:"16px",
            border:`1px solid ${T.danger}33` }}>
            <div style={{ fontSize:13, fontWeight:800, color:T.danger, marginBottom:6 }}>
              ⚠️ Zone dangereuse
            </div>
            <div style={{ fontSize:12, color:T.textSub, marginBottom:12 }}>
              La suppression de votre compte est <strong>irréversible</strong>. Toutes vos données (fermes, pontes, finances) seront définitivement effacées.
            </div>

            {!showDelete ? (
              <button onClick={() => setShowDelete(true)} style={{
                width:"100%", background:"none", color:T.danger,
                border:`1.5px solid ${T.danger}`, borderRadius:12,
                padding:"12px", fontSize:14, fontWeight:800, cursor:"pointer",
              }}>🗑️ Supprimer mon compte</button>
            ) : (
              <div>
                <div style={{ fontSize:12, color:T.danger, marginBottom:8, fontWeight:700 }}>
                  Tapez <strong>SUPPRIMER</strong> pour confirmer :
                </div>
                <input value={confirmDelete} onChange={e=>setConfirmDelete(e.target.value)}
                  placeholder="SUPPRIMER"
                  style={{ width:"100%", padding:"11px 14px", borderRadius:10,
                    border:`1.5px solid ${T.danger}`, background:"rgba(255,255,255,0.9)",
                    fontSize:14, fontWeight:800, color:T.danger,
                    boxSizing:"border-box", textAlign:"center", marginBottom:10 }} />
                <div style={{ display:"flex", gap:8 }}>
                  <button onClick={() => { setConfirmDelete(""); setShowDelete(false); }}
                    style={{ flex:1, background:T.cardSauge, color:T.textSub,
                      border:`1px solid ${T.border}`, borderRadius:10,
                      padding:"11px", fontSize:13, fontWeight:700, cursor:"pointer" }}>
                    Annuler
                  </button>
                  <button onClick={handleDeleteAccount}
                    disabled={confirmDelete !== "SUPPRIMER"}
                    style={{ flex:2, background: confirmDelete==="SUPPRIMER" ? T.danger : T.border,
                      color:"#fff", border:"none", borderRadius:10,
                      padding:"11px", fontSize:13, fontWeight:800,
                      cursor: confirmDelete==="SUPPRIMER" ? "pointer" : "not-allowed" }}>
                    ✓ Confirmer la suppression
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── SPLASH SCREEN ─────────────────────────────────────────────────────────────
function SplashScreen({ onFinish }) {
  const [fade, setFade] = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setFade(true), 2200);
    const t2 = setTimeout(() => onFinish(), 2800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:9999,
      background:`linear-gradient(160deg, #0F2318 0%, #1A3C2B 60%, #0F2318 100%)`,
      display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center", gap:0,
      opacity: fade ? 0 : 1,
      transition:"opacity 0.6s ease",
    }}>
      {/* Logo animé */}
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:16 }}>
        <div style={{
          width:100, height:100, borderRadius:28,
          background:"linear-gradient(135deg, #F5A623, #E09312)",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:52,
          boxShadow:"0 8px 32px rgba(245,166,35,0.4)",
          animation:"pulse 1.8s ease-in-out infinite",
        }}>🐔</div>

        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:32, fontWeight:900, color:"#F0F7F2",
            letterSpacing:"-0.03em", lineHeight:1.1 }}>PondeTrack</div>
          <div style={{ fontSize:14, color:"rgba(240,247,242,0.6)",
            marginTop:6, letterSpacing:"0.08em", textTransform:"uppercase" }}>
            Gestion de poulailler
          </div>
        </div>

        {/* Barre de chargement */}
        <div style={{ width:120, height:3, background:"rgba(255,255,255,0.1)",
          borderRadius:2, marginTop:16, overflow:"hidden" }}>
          <div style={{
            height:"100%", background:"#F5A623", borderRadius:2,
            animation:"load 2s ease forwards",
          }} />
        </div>
      </div>

      <div style={{ position:"absolute", bottom:40, fontSize:11,
        color:"rgba(240,247,242,0.3)", letterSpacing:"0.06em" }}>
        by IMG · v1.0
      </div>

      <style>{`
        @keyframes pulse {
          0%,100% { transform: scale(1); box-shadow: 0 8px 32px rgba(245,166,35,0.4); }
          50%      { transform: scale(1.06); box-shadow: 0 12px 40px rgba(245,166,35,0.6); }
        }
        @keyframes load {
          0%   { width: 0%; }
          100% { width: 100%; }
        }
      `}</style>
    </div>
  );
}

// ── PAGE CONNEXION / INSCRIPTION ──────────────────────────────────────────────
function AuthPage({ onAuth }) {
  const [mode,       setMode]       = useState("login");   // login | register | forgot
  const [methode,    setMethode]    = useState("email");   // email | tel
  const [email,      setEmail]      = useState("");
  const [tel,        setTel]        = useState("");
  const [password,   setPassword]   = useState("");
  const [password2,  setPassword2]  = useState("");
  const [nom,        setNom]        = useState("");
  const [showPass,   setShowPass]   = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");
  const [codeSent,   setCodeSent]   = useState(false);
  const [code,       setCode]       = useState("");

  const identifiant = methode === "email" ? email : tel;

  const validate = () => {
    if (!identifiant) return "Entrez votre " + (methode==="email" ? "email" : "numéro");
    if (methode==="email" && !identifiant.includes("@")) return "Email invalide";
    if (methode==="tel" && identifiant.replace(/\s/g,"").length < 8) return "Numéro invalide";
    if (mode==="login" && !password) return "Entrez votre mot de passe";
    if (mode==="register") {
      if (!nom) return "Entrez votre nom";
      if (!password) return "Choisissez un mot de passe";
      if (password.length < 6) return "Mot de passe trop court (6 caractères min)";
      if (password !== password2) return "Les mots de passe ne correspondent pas";
    }
    return null;
  };

  const handleSubmit = () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError("");
    setLoading(true);
    // Simulation — en prod remplacer par Supabase auth
    setTimeout(() => {
      setLoading(false);
      onAuth({
        nom: nom || identifiant.split("@")[0],
        email: methode==="email" ? email : null,
        tel:   methode==="tel"   ? tel   : null,
        isNew: mode === "register",
      });
    }, 1200);
  };

  const handleSendCode = () => {
    if (!tel || tel.replace(/\s/g,"").length < 8) { setError("Numéro invalide"); return; }
    setError("");
    setCodeSent(true);
  };

  const inputStyle = (focused) => ({
    width:"100%", padding:"13px 14px", borderRadius:12,
    border:`1.5px solid ${focused ? T.amber+"88" : T.border}`,
    background:"rgba(255,255,255,0.92)", fontSize:14,
    color:"#0D1F17", boxSizing:"border-box",
    outline:"none",
  });

  return (
    <div style={{
      minHeight:"100vh", background:T.bg,
      fontFamily:"'Inter',system-ui,sans-serif",
      display:"flex", flexDirection:"column",
    }}>
      {/* Header décoratif */}
      <div style={{
        background:`linear-gradient(160deg, #0F2318 0%, #1A3C2B 100%)`,
        padding:"40px 24px 32px", borderRadius:"0 0 32px 32px",
        textAlign:"center",
      }}>
        <div style={{ width:64, height:64, borderRadius:18, margin:"0 auto 14px",
          background:"linear-gradient(135deg, #F5A623, #E09312)",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:32, boxShadow:"0 6px 20px rgba(245,166,35,0.4)" }}>🐔</div>
        <div style={{ fontSize:24, fontWeight:900, color:"#F0F7F2" }}>PondeTrack</div>
        <div style={{ fontSize:13, color:"rgba(240,247,242,0.55)", marginTop:4 }}>
          {mode==="login"    ? "Connectez-vous à votre ferme" :
           mode==="register" ? "Créez votre compte éleveur"   :
           "Réinitialiser le mot de passe"}
        </div>
      </div>

      <div style={{ flex:1, padding:"28px 20px 40px" }}>

        {/* Toggle email / téléphone */}
        {mode !== "forgot" && (
          <div style={{ display:"flex", background:T.cardSauge, borderRadius:12,
            padding:4, marginBottom:20, gap:4 }}>
            {[
              { id:"email", label:"📧 Email" },
              { id:"tel",   label:"📱 Téléphone" },
            ].map(m => (
              <button key={m.id} onClick={() => { setMethode(m.id); setError(""); }} style={{
                flex:1, padding:"9px", borderRadius:9, border:"none", cursor:"pointer",
                background: methode===m.id ? T.white : "transparent",
                fontSize:13, fontWeight:700,
                color: methode===m.id ? T.amber : T.textMuted,
                boxShadow: methode===m.id ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                transition:"all 0.18s ease",
              }}>{m.label}</button>
            ))}
          </div>
        )}

        {/* Nom (inscription seulement) */}
        {mode==="register" && (
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:12, color:T.textMuted, marginBottom:5, fontWeight:700 }}>
              Nom complet *
            </div>
            <input value={nom} onChange={e=>{setNom(e.target.value);setError("");}}
              placeholder="Ex: Matar Diallo"
              style={inputStyle(nom.length>0)} />
          </div>
        )}

        {/* Email ou Téléphone */}
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:12, color:T.textMuted, marginBottom:5, fontWeight:700 }}>
            {methode==="email" ? "Adresse email *" : "Numéro de téléphone *"}
          </div>
          {methode==="email" ? (
            <input type="email" value={email}
              onChange={e=>{setEmail(e.target.value);setError("");}}
              placeholder="exemple@email.com"
              style={inputStyle(email.length>0)} />
          ) : (
            <div style={{ display:"flex", gap:8 }}>
              <div style={{ background:"rgba(255,255,255,0.92)", border:`1.5px solid ${T.border}`,
                borderRadius:12, padding:"13px 12px", fontSize:14, fontWeight:700,
                color:T.textSub, whiteSpace:"nowrap" }}>
                +221
              </div>
              <input type="tel" value={tel}
                onChange={e=>{setTel(e.target.value);setError("");setCodeSent(false);}}
                placeholder="77 123 45 67"
                style={{...inputStyle(tel.length>0), flex:1}} />
            </div>
          )}
        </div>

        {/* Code SMS si téléphone + inscription/connexion */}
        {methode==="tel" && (mode==="login"||mode==="register") && (
          <div style={{ marginBottom:14 }}>
            {!codeSent ? (
              <button onClick={handleSendCode} style={{
                width:"100%", background:T.cardAmbre,
                border:`1.5px solid ${T.amber}44`, borderRadius:12,
                padding:"12px", fontSize:13, fontWeight:700,
                color:T.amber, cursor:"pointer",
              }}>📲 Recevoir le code SMS</button>
            ) : (
              <div>
                <div style={{ fontSize:12, color:T.vitals, marginBottom:6, fontWeight:700 }}>
                  ✓ Code envoyé au {tel}
                </div>
                <input value={code} onChange={e=>setCode(e.target.value)}
                  placeholder="Entrez le code à 6 chiffres"
                  maxLength={6} style={{...inputStyle(code.length>0), textAlign:"center",
                    fontSize:22, fontWeight:900, letterSpacing:"0.15em", color:T.amber}} />
              </div>
            )}
          </div>
        )}

        {/* Mot de passe (email seulement) */}
        {methode==="email" && mode!=="forgot" && (
          <div style={{ marginBottom: mode==="login" ? 8 : 14 }}>
            <div style={{ fontSize:12, color:T.textMuted, marginBottom:5, fontWeight:700 }}>
              {mode==="register" ? "Choisissez un mot de passe *" : "Mot de passe *"}
            </div>
            <div style={{ position:"relative" }}>
              <input type={showPass?"text":"password"} value={password}
                onChange={e=>{setPassword(e.target.value);setError("");}}
                placeholder={mode==="register" ? "6 caractères minimum" : "••••••••"}
                style={inputStyle(password.length>0)} />
              <button onClick={()=>setShowPass(v=>!v)} style={{
                position:"absolute", right:12, top:"50%", transform:"translateY(-50%)",
                background:"none", border:"none", cursor:"pointer", fontSize:16,
              }}>{showPass?"🙈":"👁️"}</button>
            </div>
          </div>
        )}

        {/* Confirmer mot de passe (inscription) */}
        {methode==="email" && mode==="register" && (
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:12, color:T.textMuted, marginBottom:5, fontWeight:700 }}>
              Confirmer le mot de passe *
            </div>
            <input type={showPass?"text":"password"} value={password2}
              onChange={e=>{setPassword2(e.target.value);setError("");}}
              placeholder="Répétez le mot de passe"
              style={{...inputStyle(password2.length>0),
                borderColor: password2 && password!==password2 ? T.danger+"88" :
                             password2 && password===password2 ? T.vitals+"88" : T.border}} />
            {password2 && password===password2 && (
              <div style={{fontSize:11,color:T.vitals,marginTop:4,fontWeight:700}}>✓ Mots de passe identiques</div>
            )}
          </div>
        )}

        {/* Mot de passe oublié */}
        {mode==="login" && methode==="email" && (
          <div style={{ textAlign:"right", marginBottom:20 }}>
            <button onClick={()=>setMode("forgot")} style={{
              background:"none", border:"none", color:T.amber,
              fontSize:12, fontWeight:700, cursor:"pointer",
            }}>Mot de passe oublié ?</button>
          </div>
        )}

        {/* Message erreur */}
        {error && (
          <div style={{ background:T.cardRouge, border:`1px solid ${T.danger}44`,
            borderRadius:10, padding:"10px 14px", marginBottom:14,
            fontSize:13, color:T.danger, fontWeight:600 }}>
            ⚠️ {error}
          </div>
        )}

        {/* Bouton principal */}
        <button onClick={handleSubmit} disabled={loading} style={{
          width:"100%", padding:"15px",
          background: loading ? T.border : `linear-gradient(135deg, #16A34A, #0D7A38)`,
          color:"#fff", border:"none", borderRadius:14,
          fontSize:16, fontWeight:800, cursor:loading?"not-allowed":"pointer",
          boxShadow: loading ? "none" : "0 4px 16px rgba(13,122,56,0.35)",
          transition:"all 0.2s ease", marginBottom:20,
        }}>
          {loading ? "⏳ Chargement..." :
           mode==="login"    ? "🔓 Se connecter" :
           mode==="forgot"   ? "📧 Envoyer le lien" :
           "✓ Créer mon compte"}
        </button>

        {/* Lien switch login/register */}
        <div style={{ textAlign:"center" }}>
          {mode==="login" ? (
            <div style={{ fontSize:13, color:T.textMuted }}>
              Pas encore de compte ?{" "}
              <button onClick={()=>{setMode("register");setError("");}} style={{
                background:"none", border:"none", color:T.amber,
                fontSize:13, fontWeight:800, cursor:"pointer",
              }}>S'inscrire →</button>
            </div>
          ) : (
            <div style={{ fontSize:13, color:T.textMuted }}>
              Déjà un compte ?{" "}
              <button onClick={()=>{setMode("login");setError("");}} style={{
                background:"none", border:"none", color:T.amber,
                fontSize:13, fontWeight:800, cursor:"pointer",
              }}>Se connecter →</button>
            </div>
          )}
        </div>

        {/* Séparateur */}
        <div style={{ display:"flex", alignItems:"center", gap:10, margin:"20px 0" }}>
          <div style={{ flex:1, height:1, background:T.border }} />
          <span style={{ fontSize:11, color:T.textMuted }}>ou continuer avec</span>
          <div style={{ flex:1, height:1, background:T.border }} />
        </div>

        {/* Google */}
        <button onClick={async () => {
          await supabaseClient.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: 'https://pondetrack.vercel.app' }
          });
        }} style={{
          width:"100%", padding:"13px",
          background:"#fff", border:"1.5px solid #E0E0E0",
          borderRadius:14, fontSize:14, fontWeight:700,
          color:"#3C4043", cursor:"pointer",
          display:"flex", alignItems:"center", justifyContent:"center", gap:10,
          boxShadow:"0 1px 6px rgba(0,0,0,0.08)",
          marginBottom:10,
        }}>
          {/* Logo Google SVG */}
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Continuer avec Google
        </button>

        {/* Démo */}
        <button onClick={() => onAuth({ nom:"Visiteur", isNew:true, demo:true })} style={{
          width:"100%", padding:"12px",
          background:"rgba(255,255,255,0.6)", border:`1.5px solid ${T.border}`,
          borderRadius:14, fontSize:13, fontWeight:700,
          color:T.textMuted, cursor:"pointer",
        }}>👁️ Essayer en mode démo</button>

      </div>
    </div>
  );
}

// ── ONBOARDING NOUVEL UTILISATEUR ─────────────────────────────────────────────
function Onboarding({ onFinish }) {
  const [step, setStep]       = useState(1); // 1: ferme, 2: poulailler, 3: poules
  const [ferme, setFerme]     = useState({ nom:"", localite:"" });
  const [poulaillers, setPoulaillers] = useState([
    { id:"A", nom:"Poulailler A", capacite:"", couleur:"#16A34A", ico:"🐔" }
  ]);
  const [ageMode, setAgeMode] = useState("date_naissance"); // ou "semaines"
  const [dateNaissance, setDateNaissance] = useState("");
  const [ageSemaines, setAgeSemaines]     = useState("");

  const COULEURS = ["#16A34A","#2563EB","#D97706","#9333EA","#DC2626","#0891B2"];
  const ICOS     = ["🐔","🐓","🐣","🦆","🐧","🦉"];

  const ajouterPoulailler = () => {
    const idx = poulaillers.length;
    const id  = String.fromCharCode(65 + idx); // A, B, C...
    setPoulaillers(p => [...p, {
      id, nom:`Poulailler ${id}`,
      capacite:"",
      couleur: COULEURS[idx % COULEURS.length],
      ico:     ICOS[idx % ICOS.length],
    }]);
  };

  const supprimerPoulailler = (idx) => {
    if (poulaillers.length <= 1) return;
    setPoulaillers(p => p.filter((_,i) => i !== idx));
  };

  const updatePoulailler = (idx, field, val) => {
    setPoulaillers(p => p.map((item,i) => i===idx ? {...item,[field]:val} : item));
  };

  // Calcul âge en semaines
  const getAgeSemaines = () => {
    if (ageMode === "semaines") return parseInt(ageSemaines) || 0;
    if (!dateNaissance) return 0;
    const diff = Math.floor((new Date() - new Date(dateNaissance)) / (1000*60*60*24*7));
    return Math.max(0, diff);
  };

  const getMisEnPlace = () => {
    if (ageMode === "date_naissance") return dateNaissance;
    if (!ageSemaines) return new Date().toISOString().slice(0,10);
    const d = new Date();
    d.setDate(d.getDate() - parseInt(ageSemaines)*7);
    return d.toISOString().slice(0,10);
  };

  const semaines    = getAgeSemaines();
  const misEnPlace  = getMisEnPlace();

  const getPhase = (sem) => {
    if (sem < 18)  return { label:"Pré-ponte 🐣",    color:"#2563EB" };
    if (sem < 30)  return { label:"Démarrage 🌱",    color:"#16A34A" };
    if (sem < 55)  return { label:"Pic de ponte 🔥", color:"#B87008" };
    if (sem < 72)  return { label:"Déclin 📉",       color:"#D97706" };
    return              { label:"Fin de cycle ⏰",   color:"#B91C1C" };
  };

  const phase = semaines > 0 ? getPhase(semaines) : null;

  const canNext1 = ferme.nom.trim().length > 0;
  const canNext2 = poulaillers.every(p => p.nom && p.capacite);
  const canFinish = (ageMode==="date_naissance" ? dateNaissance : ageSemaines);

  const handleFinish = () => {
    const poulaillersData = {};
    poulaillers.forEach(p => {
      const effectif = parseInt(p.capacite) || 0;
      poulaillersData[p.id] = {
        id: p.id, nom: p.nom, couleur: p.couleur, ico: p.ico,
        capacite: effectif,
        ponte: {
          auj: 0, hier: 0,
          objectif: Math.round(effectif * 0.85),
          taux: semaines >= 18 ? 0 : 0,
          semaine: [0,0,0,0,0,0,0],
          dateSaisie: "",
        },
        effectif: {
          total: effectif, pondeuses: effectif, mortalite: 0,
          misEnPlace,
        },
        consoJour: Math.round(effectif * 0.11),
        oeufsDispos: 0,
        derniereVente: { date:"", qte:0 },
      };
    });

    const consoJoursInit = {};
    poulaillers.forEach(p => {
      consoJoursInit[p.id] = Math.round((parseInt(p.capacite)||0) * 0.11);
    });

    onFinish({ ferme, poulaillers: poulaillersData, consoJours: consoJoursInit });
  };

  const progress = Math.round((step / 3) * 100);

  return (
    <div style={{ background:T.bg, minHeight:"100vh", fontFamily:"'Inter',system-ui,sans-serif" }}>

      {/* Header */}
      <div style={{ background:T.cardVert, padding:"28px 20px 20px", borderBottom:`1px solid ${T.border}` }}>
        <div style={{ fontSize:28, marginBottom:6 }}>🐔</div>
        <div style={{ fontSize:22, fontWeight:900, color:T.textPrimary }}>Bienvenue !</div>
        <div style={{ fontSize:13, color:T.textSub, marginTop:4 }}>
          Configurons votre ferme en 3 étapes
        </div>
        {/* Barre de progression */}
        <div style={{ marginTop:16, height:5, background:T.border, borderRadius:3, overflow:"hidden" }}>
          <div style={{ height:"100%", width:`${progress}%`, background:T.vitals,
            borderRadius:3, transition:"width 0.4s ease" }} />
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", marginTop:6 }}>
          {["Votre ferme","Poulaillers","Vos poules"].map((s,i) => (
            <span key={i} style={{ fontSize:11, fontWeight: step===i+1?800:500,
              color: step===i+1 ? T.vitals : step>i+1 ? T.vitals : T.textMuted }}>
              {step > i+1 ? "✓ " : ""}{s}
            </span>
          ))}
        </div>
      </div>

      <div style={{ padding:"24px 18px", paddingBottom:100 }}>

        {/* ── ÉTAPE 1 : Ferme ── */}
        {step === 1 && (
          <div>
            <div style={{ fontSize:18, fontWeight:800, color:T.textPrimary, marginBottom:6 }}>
              🏡 Votre ferme
            </div>
            <div style={{ fontSize:13, color:T.textSub, marginBottom:20 }}>
              Ces informations apparaîtront sur votre tableau de bord.
            </div>

            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:12, color:T.textMuted, marginBottom:5, fontWeight:700 }}>
                Nom de la ferme *
              </div>
              <input value={ferme.nom} onChange={e=>setFerme(f=>({...f,nom:e.target.value}))}
                placeholder="Ex: Ferme Matar, Élevage Diallo..."
                style={{ width:"100%", padding:"13px 14px", borderRadius:12,
                  border:`1.5px solid ${ferme.nom ? T.vitals+"66" : T.border}`,
                  background:"rgba(255,255,255,0.9)", fontSize:15, fontWeight:700,
                  color:T.textPrimary, boxSizing:"border-box" }} />
            </div>

            <div style={{ marginBottom:24 }}>
              <div style={{ fontSize:12, color:T.textMuted, marginBottom:5, fontWeight:700 }}>
                Localité (optionnel)
              </div>
              <input value={ferme.localite} onChange={e=>setFerme(f=>({...f,localite:e.target.value}))}
                placeholder="Ex: Dakar, Thiès, Ziguinchor..."
                style={{ width:"100%", padding:"13px 14px", borderRadius:12,
                  border:`1px solid ${T.border}`,
                  background:"rgba(255,255,255,0.9)", fontSize:14,
                  color:T.textPrimary, boxSizing:"border-box" }} />
            </div>

            <button onClick={() => canNext1 && setStep(2)} style={{
              width:"100%", background: canNext1 ? T.vitals : T.border,
              color:"#fff", border:"none", borderRadius:14,
              padding:"15px", fontSize:15, fontWeight:800, cursor: canNext1?"pointer":"not-allowed",
            }}>Suivant →</button>
          </div>
        )}

        {/* ── ÉTAPE 2 : Poulaillers ── */}
        {step === 2 && (
          <div>
            <div style={{ fontSize:18, fontWeight:800, color:T.textPrimary, marginBottom:6 }}>
              🏠 Vos poulaillers
            </div>
            <div style={{ fontSize:13, color:T.textSub, marginBottom:20 }}>
              Ajoutez un poulailler par bâtiment. Vous pouvez en ajouter d'autres plus tard.
            </div>

            {poulaillers.map((p, idx) => (
              <div key={idx} style={{ background:T.cardSauge, borderRadius:16, padding:"16px",
                marginBottom:12, border:`1.5px solid ${p.couleur}33` }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
                  <div style={{ width:36, height:36, borderRadius:10, background:p.couleur+"22",
                    display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>
                    {p.ico}
                  </div>
                  <div style={{ fontSize:14, fontWeight:800, color:p.couleur }}>
                    Poulailler {p.id}
                  </div>
                  {poulaillers.length > 1 && (
                    <button onClick={() => supprimerPoulailler(idx)} style={{
                      marginLeft:"auto", background:"none", border:"none",
                      fontSize:18, cursor:"pointer", color:T.danger
                    }}>🗑️</button>
                  )}
                </div>

                <div style={{ display:"flex", gap:10 }}>
                  <div style={{ flex:2 }}>
                    <div style={{ fontSize:11, color:T.textMuted, marginBottom:4 }}>Nom</div>
                    <input value={p.nom} onChange={e=>updatePoulailler(idx,"nom",e.target.value)}
                      placeholder={`Poulailler ${p.id}`}
                      style={{ width:"100%", padding:"10px 12px", borderRadius:10,
                        border:`1px solid ${T.border}`, background:"rgba(255,255,255,0.9)",
                        fontSize:13, color:T.textPrimary, boxSizing:"border-box" }} />
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:11, color:T.textMuted, marginBottom:4 }}>Nb poules</div>
                    <input type="number" min="1" value={p.capacite}
                      onChange={e=>updatePoulailler(idx,"capacite",e.target.value)}
                      placeholder="2100"
                      style={{ width:"100%", padding:"10px 12px", borderRadius:10,
                        border:`1px solid ${p.capacite ? p.couleur+"66":T.border}`,
                        background:"rgba(255,255,255,0.9)", fontSize:16, fontWeight:900,
                        color:p.couleur, boxSizing:"border-box" }} />
                  </div>
                </div>
              </div>
            ))}

            <button onClick={ajouterPoulailler} style={{
              width:"100%", background:"rgba(255,255,255,0.7)",
              border:`1.5px dashed ${T.vitals}`, borderRadius:14,
              padding:"13px", fontSize:13, fontWeight:700, cursor:"pointer",
              color:T.vitals, marginBottom:20,
            }}>➕ Ajouter un autre poulailler</button>

            <div style={{ display:"flex", gap:10 }}>
              <button onClick={() => setStep(1)} style={{
                flex:1, background:T.cardSauge, color:T.textSub,
                border:`1px solid ${T.border}`, borderRadius:14,
                padding:"14px", fontSize:14, fontWeight:700, cursor:"pointer",
              }}>← Retour</button>
              <button onClick={() => canNext2 && setStep(3)} style={{
                flex:2, background: canNext2 ? T.vitals : T.border,
                color:"#fff", border:"none", borderRadius:14,
                padding:"14px", fontSize:15, fontWeight:800, cursor: canNext2?"pointer":"not-allowed",
              }}>Suivant →</button>
            </div>
          </div>
        )}

        {/* ── ÉTAPE 3 : Âge des poules ── */}
        {step === 3 && (
          <div>
            <div style={{ fontSize:18, fontWeight:800, color:T.textPrimary, marginBottom:6 }}>
              🐣 Âge de vos poules
            </div>
            <div style={{ fontSize:13, color:T.textSub, marginBottom:20 }}>
              L'âge permet de calculer la phase de production et les rappels prophylactiques.
            </div>

            {/* Choix du mode */}
            <div style={{ display:"flex", gap:10, marginBottom:20 }}>
              {[
                { id:"date_naissance", label:"Date de naissance", ico:"📅" },
                { id:"semaines",       label:"Âge en semaines",   ico:"🔢" },
              ].map(m => (
                <button key={m.id} onClick={() => setAgeMode(m.id)} style={{
                  flex:1, padding:"12px 8px", borderRadius:12, cursor:"pointer",
                  background: ageMode===m.id ? T.amber+"22" : T.cardSauge,
                  border:`1.5px solid ${ageMode===m.id ? T.amber : T.border}`,
                }}>
                  <div style={{ fontSize:20 }}>{m.ico}</div>
                  <div style={{ fontSize:12, fontWeight:700,
                    color: ageMode===m.id ? T.amber : T.textSub, marginTop:4 }}>
                    {m.label}
                  </div>
                </button>
              ))}
            </div>

            {/* Saisie */}
            {ageMode === "date_naissance" ? (
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:12, color:T.textMuted, marginBottom:5, fontWeight:700 }}>
                  Date de naissance des poussins *
                </div>
                <input type="date" value={dateNaissance}
                  onChange={e=>setDateNaissance(e.target.value)}
                  max={new Date().toISOString().slice(0,10)}
                  style={{ width:"100%", padding:"13px 14px", borderRadius:12,
                    border:`1.5px solid ${dateNaissance ? T.amber+"66" : T.border}`,
                    background:"rgba(255,255,255,0.9)", fontSize:15, fontWeight:700,
                    color:T.amber, boxSizing:"border-box" }} />
              </div>
            ) : (
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:12, color:T.textMuted, marginBottom:5, fontWeight:700 }}>
                  Âge actuel en semaines *
                </div>
                <input type="number" min="1" max="100" value={ageSemaines}
                  onChange={e=>setAgeSemaines(e.target.value)}
                  placeholder="Ex: 32"
                  style={{ width:"100%", padding:"13px 14px", borderRadius:12,
                    border:`1.5px solid ${ageSemaines ? T.amber+"66" : T.border}`,
                    background:"rgba(255,255,255,0.9)", fontSize:24, fontWeight:900,
                    color:T.amber, boxSizing:"border-box", textAlign:"center" }} />
                <div style={{ fontSize:11, color:T.textMuted, marginTop:6, textAlign:"center" }}>
                  semaines depuis la naissance
                </div>
              </div>
            )}

            {/* Aperçu calculé */}
            {semaines > 0 && (
              <div style={{ background:T.cardAmbre, borderRadius:14, padding:"14px 16px",
                marginBottom:20, border:`1px solid rgba(224,147,18,0.25)` }}>
                <div style={{ fontSize:12, color:T.textMuted, marginBottom:10, fontWeight:700 }}>
                  📊 Résumé calculé automatiquement
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
                  <div style={{ background:"rgba(255,255,255,0.7)", borderRadius:10, padding:"10px", textAlign:"center" }}>
                    <div style={{ fontSize:11, color:T.textMuted }}>Âge</div>
                    <div style={{ fontSize:24, fontWeight:900, color:T.amber }}>{semaines}</div>
                    <div style={{ fontSize:11, color:T.textMuted }}>semaines</div>
                  </div>
                  <div style={{ background:"rgba(255,255,255,0.7)", borderRadius:10, padding:"10px", textAlign:"center" }}>
                    <div style={{ fontSize:11, color:T.textMuted }}>Soit</div>
                    <div style={{ fontSize:24, fontWeight:900, color:T.amber }}>
                      {Math.floor(semaines/4.33).toFixed(0)}
                    </div>
                    <div style={{ fontSize:11, color:T.textMuted }}>mois</div>
                  </div>
                </div>
                {phase && (
                  <div style={{ background:"rgba(255,255,255,0.7)", borderRadius:10,
                    padding:"10px 14px", display:"flex", alignItems:"center", gap:10 }}>
                    <span style={{ fontSize:20 }}>📈</span>
                    <div>
                      <div style={{ fontSize:11, color:T.textMuted }}>Phase de production</div>
                      <div style={{ fontSize:14, fontWeight:800, color:phase.color }}>{phase.label}</div>
                    </div>
                  </div>
                )}
                <div style={{ fontSize:11, color:T.textSub, marginTop:10 }}>
                  📅 Date de mise en place estimée : <strong>{new Date(misEnPlace+"T12:00:00").toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"})}</strong>
                </div>
                <div style={{ fontSize:11, color:T.textSub, marginTop:4 }}>
                  🌾 Conso estimée : ~{Math.round((poulaillers.reduce((s,p)=>s+(parseInt(p.capacite)||0),0))*0.11)} kg/jour (110g/poule)
                </div>
              </div>
            )}

            <div style={{ display:"flex", gap:10 }}>
              <button onClick={() => setStep(2)} style={{
                flex:1, background:T.cardSauge, color:T.textSub,
                border:`1px solid ${T.border}`, borderRadius:14,
                padding:"14px", fontSize:14, fontWeight:700, cursor:"pointer",
              }}>← Retour</button>
              <button onClick={() => canFinish && handleFinish()} style={{
                flex:2, background: canFinish ? T.vitals : T.border,
                color:"#fff", border:"none", borderRadius:14,
                padding:"14px", fontSize:15, fontWeight:800, cursor: canFinish?"pointer":"not-allowed",
              }}>✓ Créer ma ferme</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


// ── CALCUL STOCK ESTIMÉ SELON L'HEURE ─────────────────────────────────────────
function getStockEstime(kg, conso) {
  const now   = new Date();
  const heure = now.getHours() + now.getMinutes() / 60;
  const rationM = Math.round((conso || 0) * 0.5);
  const rationS = Math.round((conso || 0) * 0.5);
  let stockEstime = kg || 0;
  const distribs = [];
  if (heure >= 8)  { stockEstime -= rationM; distribs.push({ heure:"08:00", kg:rationM, label:"Matin (50%)" }); }
  if (heure >= 16) { stockEstime -= rationS; distribs.push({ heure:"16:00", kg:rationS, label:"Soir (50%)"  }); }
  const prochaineDistrib = heure < 8 ? "08:00" : heure < 16 ? "16:00" : "08:00 demain";
  return { stockEstime: Math.max(0, stockEstime), distribs, prochaineDistrib };
}

// ── PAGE SÉLECTION POULAILLER ─────────────────────────────────────────────────
function SelectionPoulailler({ onSelect, poulaillerActif, consoJours, consoTotale, poulaillers, onAjouter, onSupprimer }) {
  const liste                       = Object.values(poulaillers || POULAILLERS_INIT);
  const [showForm, setShowForm]     = useState(false);
  const [fId,      setFId]          = useState('');
  const [fNom,     setFNom]         = useState('');
  const [fCap,     setFCap]         = useState('');
  const [fDate,    setFDate]        = useState(new Date().toISOString().slice(0,10));

  return (
    <div style={{ background:T.bg, minHeight:"100vh", padding:"0 0 40px" }}>

      {/* Header */}
      <div style={{ background:T.cardVert, padding:"32px 20px 24px", borderBottom:`1px solid ${T.border}` }}>
        <div style={{ fontSize:11, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:6 }}>
          Ferme MATAR
        </div>
        <div style={{ fontSize:24, fontWeight:900, color:T.textPrimary }}>
          🏡 Choisir un poulailler
        </div>
        <div style={{ fontSize:13, color:T.textSub, marginTop:4 }}>
          {liste.length} poulailler{liste.length > 1 ? "s" : ""} enregistré{liste.length > 1 ? "s" : ""}
        </div>
      </div>

      <div style={{ padding:"24px 18px 0" }}>

        {/* Cartes poulaillers */}
        <div style={{ display:"flex", flexDirection:"column", gap:14, marginBottom:28 }}>
          {liste.map(p => {
            const actif    = poulaillerActif?.id === p.id;
            const tauxPonte = p.ponte.taux;

            const ageSem    = calcAgeSemaines(p.effectif.misEnPlace);

            return (
              <div key={p.id} onClick={() => onSelect(p)}
                style={{
                  background: actif ? p.couleur + "18" : T.cardSauge,
                  borderRadius:18, padding:"18px",
                  border: `2px solid ${actif ? p.couleur : T.border}`,
                  cursor:"pointer", transition:"all 0.2s ease",
                  boxShadow: actif ? `0 4px 20px ${p.couleur}33` : "0 2px 8px rgba(0,0,0,0.05)",
                }}>

                {/* Ligne titre */}
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ width:44, height:44, borderRadius:14, background:p.couleur+"22",
                      display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>
                      {p.ico}
                    </div>
                    <div>
                      <div style={{ fontSize:17, fontWeight:900, color:T.textPrimary }}>{p.nom}</div>
                      <div style={{ fontSize:11, color:T.textMuted }}>
                        {fmt(p.effectif.pondeuses)} poules · S{ageSem}
                      </div>
                    </div>
                  </div>
                  {actif && (
                    <div style={{ background:p.couleur, borderRadius:20, padding:"4px 12px" }}>
                      <span style={{ fontSize:11, color:"#fff", fontWeight:700 }}>● Actif</span>
                    </div>
                  )}
                </div>

                {/* KPIs rapides */}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
                  {/* Ponte */}
                  <div style={{ background:"rgba(255,255,255,0.7)", borderRadius:12, padding:"10px 8px", textAlign:"center" }}>
                    <div style={{ fontSize:9, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:4 }}>Ponte / jour</div>
                    <div style={{ fontSize:20, fontWeight:900, color:p.couleur }}>
                      {Math.floor(p.ponte.auj / PLATEAU)}
                    </div>
                    <div style={{ fontSize:10, color:T.textMuted }}>plateaux</div>
                    <div style={{ fontSize:10, fontWeight:700, color: tauxPonte>=80 ? T.vitals : T.warning, marginTop:2 }}>
                      {tauxPonte}% taux
                    </div>
                  </div>

                  {/* Conso aliment de ce poulailler */}
                  <div style={{ background:"rgba(255,255,255,0.7)", borderRadius:12, padding:"10px 8px", textAlign:"center" }}>
                    <div style={{ fontSize:9, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:4 }}>Conso/jour</div>
                    <div style={{ fontSize:20, fontWeight:900, color:T.amber }}>
                      {(p.consoJour / SAC_KG).toFixed(1)}
                    </div>
                    <div style={{ fontSize:10, color:T.textMuted }}>sacs</div>
                    <div style={{ fontSize:10, color:T.textSub, marginTop:2 }}>{p.consoJour} kg</div>
                  </div>

                  {/* Effectif */}
                  <div style={{ background:"rgba(255,255,255,0.7)", borderRadius:12, padding:"10px 8px", textAlign:"center" }}>
                    <div style={{ fontSize:9, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:4 }}>Effectif</div>
                    <div style={{ fontSize:20, fontWeight:900, color:T.vitals }}>
                      {fmt(p.effectif.pondeuses)}
                    </div>
                    <div style={{ fontSize:10, color:T.textMuted }}>poules</div>
                    <div style={{ fontSize:10, fontWeight:700, color:T.textSub, marginTop:2 }}>
                      S{ageSem}
                    </div>
                  </div>
                </div>

                {/* Barre taux ponte */}
                <div style={{ marginTop:12 }}>
                  <div style={{ height:5, background:"rgba(0,0,0,0.06)", borderRadius:3, overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${tauxPonte}%`, background:p.couleur,
                      borderRadius:3, transition:"width 0.8s ease" }} />
                  </div>
                </div>

                {/* Boutons */}
                <div style={{ display:"flex", gap:8, marginTop:12 }}>
                  <button onClick={() => onSelect(p)} style={{
                    flex:1,
                    background: actif ? p.couleur : "rgba(255,255,255,0.8)",
                    color: actif ? "#fff" : p.couleur,
                    border:`1.5px solid ${p.couleur}`,
                    borderRadius:12, padding:"11px", fontSize:14, fontWeight:800, cursor:"pointer",
                  }}>
                    {actif ? "✓ Sélectionné" : `Ouvrir ${p.nom}`}
                  </button>
                  {liste.length > 1 && (
                    <button onClick={(e) => { e.stopPropagation(); onSupprimer(p.id); }} style={{
                      background:"rgba(185,28,28,0.08)", color:T.danger,
                      border:`1.5px solid ${T.danger}44`, borderRadius:12,
                      padding:"11px 14px", fontSize:18, cursor:"pointer",
                    }}>🗑️</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bouton ajouter poulailler */}
        <button onClick={() => setShowForm(v=>!v)} style={{
          width:"100%", marginBottom:14,
          background: showForm ? T.cardRouge : T.cardVert,
          border:`1px solid ${showForm ? T.danger+"44" : "rgba(13,122,56,0.2)"}`,
          borderRadius:14, padding:"13px", cursor:"pointer",
          display:"flex", alignItems:"center", justifyContent:"center", gap:8,
        }}>
          <span style={{ fontSize:18 }}>{showForm ? "✕" : "➕"}</span>
          <span style={{ fontSize:14, fontWeight:800, color: showForm ? T.danger : T.vitals }}>
            {showForm ? "Annuler" : "Ajouter un poulailler"}
          </span>
        </button>

        {/* Formulaire ajout */}
        {showForm && (
          <div style={{ background:T.cardVert, borderRadius:16, padding:"16px", marginBottom:14, border:`1px solid rgba(13,122,56,0.2)` }}>
            <div style={{ fontSize:12, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:700, marginBottom:12 }}>
              🐔 Nouveau poulailler
            </div>
            <div style={{ display:"flex", gap:10, marginBottom:10 }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:11, color:T.textMuted, marginBottom:4 }}>Identifiant (ex: C)</div>
                <input value={fId} onChange={e=>setFId(e.target.value.toUpperCase())} placeholder="C"
                  maxLength={2}
                  style={{ width:"100%", padding:"10px 12px", borderRadius:10, border:`1px solid ${T.border}`,
                    background:"rgba(255,255,255,0.8)", fontSize:18, fontWeight:900, color:T.vitals,
                    textAlign:"center", boxSizing:"border-box" }} />
              </div>
              <div style={{ flex:2 }}>
                <div style={{ fontSize:11, color:T.textMuted, marginBottom:4 }}>Nom</div>
                <input value={fNom} onChange={e=>setFNom(e.target.value)} placeholder="Poulailler C"
                  style={{ width:"100%", padding:"10px 12px", borderRadius:10, border:`1px solid ${T.border}`,
                    background:"rgba(255,255,255,0.8)", fontSize:13, color:T.textPrimary, boxSizing:"border-box" }} />
              </div>
            </div>
            <div style={{ display:"flex", gap:10, marginBottom:12 }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:11, color:T.textMuted, marginBottom:4 }}>Capacité (poules)</div>
                <input type="number" value={fCap} onChange={e=>setFCap(e.target.value)} placeholder="1000"
                  style={{ width:"100%", padding:"10px 12px", borderRadius:10, border:`1px solid ${T.border}`,
                    background:"rgba(255,255,255,0.8)", fontSize:16, fontWeight:800, color:T.textPrimary, boxSizing:"border-box" }} />
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:11, color:T.textMuted, marginBottom:4 }}>Mise en place</div>
                <input type="date" value={fDate} onChange={e=>setFDate(e.target.value)}
                  style={{ width:"100%", padding:"10px 12px", borderRadius:10, border:`1px solid ${T.border}`,
                    background:"rgba(255,255,255,0.8)", fontSize:13, color:T.textPrimary, boxSizing:"border-box" }} />
              </div>
            </div>
            <button onClick={() => {
              if (!fId || !fNom) return;
              onAjouter(fId, fNom, fCap, fDate);
              setFId(''); setFNom(''); setFCap(''); setShowForm(false);
            }} style={{
              width:"100%", background:T.vitals, color:"#fff", border:"none",
              borderRadius:12, padding:"12px", fontSize:14, fontWeight:800, cursor:"pointer"
            }}>✓ Créer le poulailler</button>
          </div>
        )}

        {/* Stock commun */}
        {(() => {
          const ct  = consoTotale || liste.reduce((s,p)=>s+p.consoJour,0);
          const sacs = Math.floor(STOCK_COMMUN.aliment / SAC_KG);
          const resteKg     = STOCK_COMMUN.aliment % SAC_KG;
          const autonomie   = Math.floor(STOCK_COMMUN.aliment / ct);
          const critique    = autonomie <= 2;
          const rupture     = new Date();
          rupture.setDate(rupture.getDate() + autonomie);
          const ruptureStr  = rupture.toLocaleDateString("fr-FR",{day:"numeric",month:"long"});
          return (
            <div style={{ background: critique ? T.cardRouge : T.cardAmbre, borderRadius:16, padding:"16px",
              marginBottom:14, border:`1px solid ${critique ? T.danger+"44" : "rgba(224,147,18,0.2)"}`,
              boxShadow: critique ? `0 0 16px ${T.danger}22` : "none" }}>
              <div style={{ fontSize:12, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:700, marginBottom:12 }}>
                🌾 Stock aliment commun — {liste.length} poulaillers
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                <div>
                  <div style={{ display:"flex", alignItems:"baseline", gap:6 }}>
                    <span style={{ fontSize:36, fontWeight:900, color: critique ? T.danger : T.amber, letterSpacing:"-0.03em" }}>{sacs}</span>
                    <span style={{ fontSize:14, fontWeight:700, color:T.textSub }}>sacs</span>
                  </div>
                  {resteKg > 0 && <div style={{ fontSize:12, color:T.textMuted }}>+ {resteKg} kg</div>}
                  <div style={{ fontSize:12, color:T.textMuted }}>{fmt(STOCK_COMMUN.aliment)} kg au total</div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:12, fontWeight:800, color: critique ? T.danger : T.textPrimary }}>
                    {critique ? `🔴 Rupture le ${ruptureStr} !` : `Rupture le ${ruptureStr}`}
                  </div>
                  <div style={{ fontSize:12, color: critique ? T.danger : T.vitals, fontWeight:700, marginTop:4 }}>
                    {autonomie} jours d'autonomie
                  </div>
                  <div style={{ fontSize:11, color:T.textMuted, marginTop:2 }}>
                    Conso totale : {fmt(ct)} kg/j
                  </div>
                </div>
              </div>
              {/* Répartition conso par poulailler */}
              {liste.map((p,i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:5 }}>
                  <span style={{ fontSize:13 }}>{p.ico}</span>
                  <span style={{ fontSize:12, color:T.textSub, flex:1 }}>{p.nom}</span>
                  <span style={{ fontSize:12, fontWeight:700, color:p.couleur }}>{((consoJours?.[p.id]||p.consoJour)/SAC_KG).toFixed(1)} sacs/j</span>
                  <span style={{ fontSize:11, color:T.textMuted }}>({consoJours?.[p.id]||p.consoJour} kg)</span>
                </div>
              ))}
              {/* Barre stock */}
              <div style={{ marginTop:10, height:6, background:"rgba(0,0,0,0.06)", borderRadius:3, overflow:"hidden" }}>
                <div style={{ height:"100%", borderRadius:3,
                  width:`${Math.min(STOCK_COMMUN.aliment/STOCK_COMMUN.capacite*100,100)}%`,
                  background: critique ? T.danger : T.amber }} />
              </div>
            </div>
          );
        })()}

        {/* Vue globale résumé */}
        <div style={{ background:T.cardVert, borderRadius:16, padding:"16px", border:`1px solid rgba(13,122,56,0.15)` }}>
          <div style={{ fontSize:12, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:700, marginBottom:12 }}>
            🏡 Vue globale — Tous les poulaillers
          </div>
          {[
            { label:"Total poules",        val:fmt(liste.reduce((s,p)=>s+p.effectif.pondeuses,0)),  unit:"pondeuses", ico:"🐔" },
            { label:"Ponte totale / jour", val:fmt(liste.reduce((s,p)=>s+p.ponte.auj,0)),           unit:"œufs",      ico:"🥚" },
            { label:"En plateaux",         val:fmt(Math.floor(liste.reduce((s,p)=>s+p.ponte.auj,0)/PLATEAU)), unit:"plat./jour", ico:"📦" },
          ].map((k,i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
              padding:"9px 0", borderBottom: i<2 ? `1px solid ${T.border}` : "none" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:18 }}>{k.ico}</span>
                <span style={{ fontSize:13, color:T.textSub }}>{k.label}</span>
              </div>
              <div style={{ textAlign:"right" }}>
                <span style={{ fontSize:16, fontWeight:900, color:T.vitals }}>{k.val}</span>
                <span style={{ fontSize:11, color:T.textMuted }}> {k.unit}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── APP ROOT ──────────────────────────────────────────────────────────────────
export default function App() {
  const [appState, setAppState]               = useState("splash");  // splash | auth | onboarding | app
  const [page, setPage]                       = useState("selection");
  const [darkMode, setDarkMode]               = useState(false);
  const [poulaillerActif, setPoulaillerActif] = useState(null);
  const [nomFerme, setNomFerme]               = useState(() => { try { return localStorage.getItem("pondetrack_ferme_nom") || ""; } catch { return ""; } });
  const [user, setUser]                       = useState(null);

  const handleAuth = (userData) => {
    setUser(userData);
    // Vérifier si l'utilisateur a déjà fait l'onboarding
    const onboardingDone = localStorage.getItem("pondetrack_onboarding_done");
    if (!onboardingDone && !userData.demo) {
      setAppState("onboarding");
    } else {
      setAppState("app");
      setPage("selection");
    }
  };

  // Charger config depuis localStorage si disponible
  const getSaved = (key, fallback) => {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
  };

  // Liste dynamique des poulaillers
  const [poulaillers,  setPoulaillers]  = useState(() => getSaved("pondetrack_poulaillers", POULAILLERS_INIT));

  // Consommation journalière — DOIT être défini avant ajouterPoulailler
  const [consoJours, setConsoJours] = useState(() => getSaved("pondetrack_conso", {}));

  const ajouterPoulailler = (id, nom, capacite, misEnPlace) => {
    const couleurs = ["#16A34A","#2563EB","#D97706","#9333EA","#DC2626","#0891B2"];
    const icos     = ["🐔","🐓","🐣","🦆","🐧","🦉"];
    const idx      = Object.keys(poulaillers).length;
    const newP = {
      id, nom, couleur: couleurs[idx % couleurs.length], ico: icos[idx % icos.length],
      capacite: parseInt(capacite)||1000,
      ponte:    { auj:0, hier:0, objectif:Math.round(parseInt(capacite)*0.85)||800, taux:0, semaine:[0,0,0,0,0,0,0] },
      effectif: { total:parseInt(capacite)||1000, pondeuses:parseInt(capacite)||1000, mortalite:0, misEnPlace },
      consoJour: Math.round((parseInt(capacite)||1000) * 0.11),
      oeufsDispos: 0,
      derniereVente: { date:"", qte:0 },
    };
    setPoulaillers(prev => ({ ...prev, [id]: newP }));
    setConsoJours(prev => ({ ...prev, [id]: newP.consoJour }));
  };

  const supprimerPoulailler = (id) => {
    if (Object.keys(poulaillers).length <= 1) return;
    setPoulaillers(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setConsoJours(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (poulaillerActif?.id === id) setPoulaillerActif(null);
  };

  const updateConso = (id, val) => {
    setConsoJours(prev => ({ ...prev, [id]: val }));
  };

  // Conso totale = somme de tous les poulaillers
  const consoTotale = Object.values(consoJours).reduce((s, v) => s + v, 0);

  const theme = darkMode ? DARK : LIGHT;
  Object.assign(T, theme);

  // Stock aliment global partagé entre Dashboard et StockPage
  const [stockKgGlobal, setStockKgGlobal] = useState(0);

  // État ventes partagé entre Ponte et Finances
  const [ventesGlobal, setVentesGlobal] = useState([]);

  const handleOnboardingFinish = ({ ferme, poulaillers: newP, consoJours: newC }) => {
    setNomFerme(ferme.nom);
    setPoulaillers(newP);
    setConsoJours(newC);
    // Sauvegarder config dans localStorage
    localStorage.setItem("pondetrack_onboarding_done", "true");
    localStorage.setItem("pondetrack_ferme_nom", ferme.nom);
    localStorage.setItem("pondetrack_poulaillers", JSON.stringify(newP));
    localStorage.setItem("pondetrack_conso", JSON.stringify(newC));
    setAppState("app");
    setPage("selection");
  };

  const handleSelectPoulailler = (p) => {
    setPoulaillerActif(p);
    setPage("dashboard");
  };

  // Écouter le retour Google OAuth au chargement
  useEffect(() => {
    // Vérifier session existante (retour après Google)
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const u = session.user;
        handleAuth({
          nom: u.user_metadata?.full_name || u.email?.split('@')[0] || "Éleveur",
          email: u.email,
          provider: u.app_metadata?.provider || "google",
          isNew: false,
        });
      }
    });

    // Écouter les changements auth (connexion Google en temps réel)
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        const u = session.user;
        handleAuth({
          nom: u.user_metadata?.full_name || u.email?.split('@')[0] || "Éleveur",
          email: u.email,
          provider: u.app_metadata?.provider || "google",
          isNew: true,
        });
      }
      if (event === "SIGNED_OUT") {
        setAppState("auth");
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Rendu selon l'état de l'app
  if (appState === "splash")     return <SplashScreen onFinish={() => setAppState("auth")} />;
  if (appState === "auth")       return <AuthPage onAuth={handleAuth} />;
  if (appState === "onboarding") return <Onboarding onFinish={handleOnboardingFinish} />;

  const renderPage = () => {
    switch (page) {
      case "onboarding": return <Onboarding onFinish={handleOnboardingFinish} />;
      case "selection": return <SelectionPoulailler onSelect={handleSelectPoulailler} poulaillerActif={poulaillerActif} consoJours={consoJours} consoTotale={consoTotale} poulaillers={poulaillers} onAjouter={ajouterPoulailler} onSupprimer={supprimerPoulailler} />;
      case "dashboard": return <DashboardPage setPage={setPage} darkMode={darkMode} setDarkMode={setDarkMode} poulailler={poulaillerActif} consoJours={consoJours} updateConso={updateConso} consoTotale={consoTotale} poulaillers={poulaillers} nomFerme={nomFerme} setAppState={setAppState} stockKgGlobal={stockKgGlobal} />;
      case "ponte":     return <PontePage setPage={setPage} poulailler={poulaillerActif} ventes={ventesGlobal} setVentes={setVentesGlobal} />;
      case "sante":     return <SantePage setPage={setPage} />;
      case "stock":     return <StockPage setPage={setPage} consoTotale={consoTotale} poulaillers={poulaillers} stockKgGlobal={stockKgGlobal} setStockKgGlobal={setStockKgGlobal} />;
      case "effectif":  return <EffectifPage setPage={setPage} poulailler={poulaillerActif} />;
      case "finances":  return <FinancePage setPage={setPage} ventes={ventesGlobal} setVentes={setVentesGlobal} />;
      case "parametres": return <SettingsPage setPage={setPage} user={user} setUser={setUser} setAppState={setAppState} nomFerme={nomFerme} setNomFerme={setNomFerme} darkMode={darkMode} setDarkMode={setDarkMode} />;
      default: return null;
    }
  };

  return (
    <div style={{ background: T.bg, minHeight: "100vh", fontFamily: "'Inter', system-ui, sans-serif", color: T.textPrimary, maxWidth: 430, margin: "0 auto", position: "relative" }}>
      <div style={{ overflowY: "auto", minHeight: "100vh", paddingBottom: 80 }}>
        {renderPage()}
      </div>

      {/* Bottom nav */}
      <div style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 430,
        background: T.navBg, borderTop: `1px solid ${T.border}`,
        display: "flex", zIndex: 100,
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}>
        {PAGES_NAV.map(p => {
          const active = page === p.id;
          return (
            <button key={p.id} onClick={() => setPage(p.id)} style={{
              flex: 1, background: "none", border: "none", padding: "10px 2px 10px",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 3, cursor: "pointer",
            }}>
              <span style={{ fontSize: active ? 20 : 18, transition: "font-size 0.15s" }}>{p.ico}</span>
              <span style={{ fontSize: 14, fontWeight: active ? 800 : 500, color: active ? T.amber : T.textMuted, transition: "color 0.15s" }}>
                {p.label}
              </span>
              {active && <div style={{ width: 16, height: 2.5, background: T.amber, borderRadius: 2, boxShadow: `0 0 6px ${T.amber}88` }} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
