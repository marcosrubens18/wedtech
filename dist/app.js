"use strict";

// Shared helpers and application state
const {
  seed,
  metrics,
  forecast,
  businessImpact,
  sell,
  publish,
  answer,
  channels,
  fulfillmentStatus,
  purchaseOrderStatus,
  scanSale,
  scanReceive,
  newFulfillment,
  scanFulfillmentItem,
  confirmSeparation,
  dispatchFulfillment,
  addStore,
  addSupplier,
  autoGeneratePurchaseOrders,
  sendPurchaseOrder,
  receivePurchaseOrder,
  simulateInventoryCount,
  resolveInventoryCheck,
  markNotificationsRead,
  financials,
  addExpense,
} = WedTech;
// Operadores ilustrativos do painel de configurações (sem autenticação real)
const operators = [
  {
    initials: "AC",
    name: "Ana Clara Souza",
    role: "Administradora",
    store: "Loja Tatuapé",
  },
  {
    initials: "RM",
    name: "Rafael Mendes",
    role: "Operador de estoque",
    store: "CD Guarulhos",
  },
  {
    initials: "JP",
    name: "João Pedro Lima",
    role: "Vendedor",
    store: "Loja Tatuapé",
  },
];
// Passos do tour guiado, mostrado uma vez após o primeiro login
const tourSlides = [
  {
    title: "Bem-vindo ao WedTech",
    text: "Central inteligente de e-commerce e marketplaces. Vamos conhecer o essencial em 4 passos rápidos.",
    icon: "dashboard",
  },
  {
    title: "Dashboard",
    text: "Vendas, alertas e notificações da sua operação em um só lugar — clique no sino a qualquer momento para ver o histórico.",
    icon: "dashboard",
  },
  {
    title: "Estoque Inteligente",
    text: "Bipe vendas com o leitor (texto ou câmera), separe pedidos e deixe a IA prever rupturas, sugerir liquidações e gerar reposição automática.",
    icon: "estoque",
  },
  {
    title: "Financeiro e WedTech AI",
    text: "Acompanhe o lucro em tempo real e pergunte qualquer coisa sobre a operação para a WedTech AI — inclusive sobre pedidos de compra e impacto financeiro.",
    icon: "financeiro",
  },
];
const $ = (s) => document.querySelector(s),
  money = (n) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(n),
  esc = (v) =>
    String(v ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
let state;
try {
  state = JSON.parse(localStorage.getItem("wedtech-demo-v1"));
  if (
    !state ||
    state.version !== 2 ||
    !Array.isArray(state.products) ||
    !Array.isArray(state.orders) ||
    !Array.isArray(state.stores) ||
    !Array.isArray(state.suppliers) ||
    !Array.isArray(state.notifications) ||
    !Array.isArray(state.purchaseOrders) ||
    !Array.isArray(state.expenses)
  )
    state = seed();
} catch {
  state = seed();
}
let page = "dashboard",
  modal = null,
  busy = false,
  menu = false,
  sidebarOpen = false,
  query = "",
  chat = [],
  dashboardAiResponse = "",
  oneStage = 0,
  progress = 0,
  selected = ["ml", "sh", "tk"],
  ads = [],
  draft = blank(),
  syncText = "",
  publishedId = null,
  scanMode = "saida",
  scanStoreId = "st1",
  scanFeedback = null,
  fulfillmentModal = null,
  fulfillmentFeedback = "",
  storeFormOpen = false,
  supplierFormOpen = false,
  expenseFormOpen = false,
  notifPanelOpen = false,
  docModal = null,
  liveMode = false,
  liveTimer = null,
  loggedIn = false,
  loginError = "",
  loginBusy = false,
  tourStep = null,
  cameraTarget = null,
  cameraError = "";
try {
  loggedIn = sessionStorage.getItem("wedtech-session") === "1";
} catch {}
let cameraStream = null,
  cameraLoopId = null;
function blank() {
  return {
    name: "",
    brand: "",
    category: "Calçados",
    sku: "",
    barcode: "",
    price: "",
    stock: "",
    description: "",
    features: "",
    image: "",
  };
}
// Navigation labels and SVG icon paths
const routes = {
  dashboard: "Dashboard",
  produtos: "Produtos",
  one: "WedTech One",
  estoque: "Estoque Inteligente",
  marketplaces: "Marketplaces",
  financeiro: "Financeiro",
  ai: "WedTech AI",
  config: "Configurações",
};
const paths = {
  dashboard:
    '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  produtos:
    '<path d="m3 7 9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10M7 5l10 5"/>',
  one: '<path d="M12 3v18M3 12h18M5 5l14 14M19 5 5 19"/>',
  estoque: '<path d="M3 5v14M7 5v14M10 5v14M14 5v14M17 5v14M21 5v14"/>',
  marketplaces: '<path d="M4 10v11h16V10M3 4h18l1 6H2zM9 21v-7h6v7"/>',
  ai: '<path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3z"/>',
  financeiro:
    '<path d="M3 3v18h18"/><path d="M7 15l4-5 3 3 5-7"/><circle cx="19" cy="6" r="1.5"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  truck: '<path d="M3 7h11v9H3zM14 11h4l3 3v2h-7z"/><circle cx="7" cy="18" r="1.6"/><circle cx="17.5" cy="18" r="1.6"/>',
  supplier: '<path d="M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6M9 12h.01M15 12h.01"/>',
  config:
    '<circle cx="12" cy="12" r="3"/><path d="M12 2v4m0 12v4M4.2 4.2l2.9 2.9m9.8 9.8 2.9 2.9M2 12h4m12 0h4M4.2 19.8l2.9-2.9m9.8-9.8 2.9-2.9"/>',
  sale: '<path d="M3 17 8 12l4 3 8-11M15 4h5v5"/>',
  orders: '<path d="M5 3h14v18l-3-2-4 2-4-2-3 2zM9 7h6M9 11h6"/>',
  stock: '<path d="M3 8h18v13H3zM5 3h14v5M9 12h6"/>',
  alert: '<path d="m12 3 10 18H2zM12 9v5M12 17v1"/>',
  shoe: '<path d="m3 14 4-8 5 7 8 2 1 4H3zM10 11l-2 2M13 14l-2 2"/>',
  watch:
    '<rect x="6" y="6" width="12" height="12" rx="4"/><path d="M9 6V2h6v4M9 18v4h6v-4M12 9v4h3"/>',
  mouse:
    '<rect x="6" y="2" width="12" height="20" rx="6"/><path d="M12 2v7M6 9h12"/>',
  headset: '<path d="M3 15v-3a9 9 0 0 1 18 0v3M3 13h4v7H3zM17 13h4v7h-4z"/>',
  bag: '<rect x="4" y="7" width="16" height="14" rx="2"/><path d="M8 7V5a4 4 0 0 1 8 0v2"/>',
  keyboard:
    '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M6 9h1m3 0h1m3 0h1m3 0h1M6 13h1m3 0h1m3 0h1M7 16h10"/>',
  shirt: '<path d="m8 3-6 4 3 5 3-2v11h8V10l3 2 3-5-6-4q-4 4-8 0z"/>',
  speaker:
    '<rect x="5" y="2" width="14" height="20" rx="2"/><circle cx="12" cy="14" r="4"/><path d="M11 6h2"/>',
};
function icon(name) {
  return (
    '<span class="icon"><svg viewBox="0 0 24 24" aria-hidden="true">' +
    (paths[name] || paths.produtos) +
    "</svg></span>"
  );
}
function logo(id) {
  const c = channels.find((c) => c.id === id);
  return (
    '<span class="channel-logo ' +
    id +
    '" title="' +
    c.name +
    '">' +
    c.short +
    "</span>"
  );
}
function badge(text, type = "") {
  return '<span class="badge ' + type + '">' + text + "</span>";
}
// QR code real (vendorizado, sem serviço externo) para NF e etiquetas simuladas
function renderQR(data, size) {
  try {
    if (typeof WedTechQR === "undefined") return "";
    const qr = WedTechQR.createQrCode(data, WedTechQR.QRErrorCorrectLevel.M);
    return WedTechQR.toSVG(qr, size, 2);
  } catch {
    return "";
  }
}
function save() {
  try {
    localStorage.setItem("wedtech-demo-v1", JSON.stringify(state));
  } catch {
    toast(
      "Dados mantidos nesta sessão. O armazenamento local está indisponível.",
    );
  }
}
function toast(t) {
  $("#toast").textContent = t;
  $("#toast").classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => $("#toast").classList.remove("show"), 4000);
}
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
// Exporta linhas como CSV e dispara o download local (sem servidor, sem serviço externo)
function csvEscape(v) {
  const s = String(v ?? "");
  return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
function downloadCSV(filename, header, rows) {
  const csv = [header, ...rows]
    .map((r) => r.map(csvEscape).join(";"))
    .join("\r\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast("Arquivo " + filename + " baixado.");
}
function heading(title, sub, action = "") {
  return (
    '<div class="page-heading"><div><h1>' +
    title +
    "</h1><p>" +
    sub +
    '</p></div><div class="actions">' +
    action +
    "</div></div>"
  );
}
function go(p) {
  location.hash = p;
}
// Application shell
// Tela de login — protótipo sem autenticação real: qualquer e-mail/senha entra.
function loginScreen() {
  return `<div class="login-screen"><div class="login-card"><div class="login-brand"><img src="wedtech-symbol.png" alt="" width="46" height="46"><span class="login-word"><b>Wed</b>Tech</span></div><p class="login-tag">Tecnologia e conexão para o futuro.</p><form id="login-form"><div class="field"><label for="login-email">E-mail</label><input id="login-email" name="email" type="email" placeholder="voce@suaempresa.com.br" autocomplete="username" required></div><div class="field" style="margin-top:14px"><label for="login-password">Senha</label><input id="login-password" name="password" type="password" placeholder="••••••••" autocomplete="current-password" required></div>${
    loginError
      ? `<div class="validation" style="margin-top:14px">⚠ ${esc(loginError)}</div>`
      : ""
  }<button class="btn primary" type="submit" style="width:100%;margin-top:20px" ${loginBusy ? "disabled" : ""}>${loginBusy ? '<span class="spin"></span>Entrando...' : "Entrar"}</button></form><button type="button" class="link login-example" data-action="login-example">Preencher exemplo</button><p class="login-note">Protótipo de demonstração — qualquer e-mail e senha funcionam. Nenhum dado é enviado a um servidor.</p><a class="login-back" href="index.html">← Voltar ao site</a></div></div>`;
}
function render() {
  if (!loggedIn) {
    $("#app").innerHTML = loginScreen();
    document.body.style.overflow = "";
    $("#login-email")?.focus();
    return;
  }
  const m = metrics(state);
  $("#app").innerHTML =
    `<a class="skip-link" href="#main-content">Pular para o conteúdo principal</a><div class="layout"><aside id="main-navigation" class="sidebar ${menu ? "open" : ""} ${sidebarOpen ? "expanded" : "collapsed"}" aria-label="Menu principal"><button type="button" class="sidebar-toggle" data-action="sidebar" aria-controls="primary-navigation" aria-label="${menu || sidebarOpen ? "Recolher" : "Abrir"} menu lateral" aria-expanded="${menu || sidebarOpen}" title="${menu || sidebarOpen ? "Recolher" : "Abrir"} menu">${menu || sidebarOpen ? "←" : '<img src="wedtech-symbol.png" alt=""><span class="menu-glyph" aria-hidden="true">☰</span>'}</button><div class="brand"><span class="mark"><img src="wedtech-symbol.png" alt="" width="48" height="48"></span><span class="wordmark"><b>Wed</b>Tech</span></div><div class="brand-sub">Tecnologia e conexão para o futuro</div><div class="nav-label">WORKSPACE</div><nav class="nav" id="primary-navigation" aria-label="Navegação principal">${Object.entries(
      routes,
    )
      .map(
        ([id, name]) =>
          `<a href="#${id}" class="${page === id ? "active" : ""}" ${page === id ? 'aria-current="page"' : ""}>${icon(id)}${name}${id === "ai" ? '<span class="badge" style="margin-left:auto;padding:3px 5px;font-size:10px">AI</span>' : id === "estoque" && m.pendingSeparations ? `<span class="badge" style="margin-left:auto;padding:3px 5px;font-size:10px">${m.pendingSeparations}</span>` : ""}</a>`,
      )
      .join(
        "",
      )}</nav><div class="sidebar-bottom"><div class="side-note"><b>Uma operação. Mais possibilidades.</b><br>Um produto. Todos os canais.<br>Uma única inteligência.</div><div><span class="dot"></span>Modo Demonstração</div><div style="margin:10px 0;color:#8fa3bb">Protótipo Hackathon · v0.1</div><button class="link" style="color:#9fc7f3;padding:8px 0;display:block" data-action="reset">↺ Reiniciar demonstração</button><button class="link" style="color:#9fc7f3;padding:8px 0;display:block" data-action="logout">⏻ Sair</button></div></aside>${menu ? '<button type="button" class="sidebar-backdrop" data-action="menu" aria-label="Fechar menu lateral"></button>' : ""}<div class="workspace"><header class="topbar"><div class="crumb"><button class="mobile-menu" aria-label="Abrir menu" data-action="menu">☰</button><span class="muted">Workspace</span><span class="separator muted">/</span><span>${routes[page]}</span></div><div class="top-right">${badge('<span class="dot"></span>Demonstração', "neutral")}<span class="notif-wrap"><button type="button" class="notif-bell" data-action="toggle-notifications" aria-haspopup="true" aria-expanded="${notifPanelOpen}" aria-label="Notificações${m.unreadNotifications ? ", " + m.unreadNotifications + " não lidas" : ""}">${icon("bell")}${m.unreadNotifications ? `<span class="notif-count">${m.unreadNotifications}</span>` : ""}</button>${notifPanelOpen ? notifPanel() : ""}</span><span class="store-name">Minha loja</span><span class="avatar">ML</span></div></header><main id="main-content" tabindex="-1">${page === "dashboard" ? dashboard(m) : page === "produtos" ? catalog() : page === "one" ? one() : page === "estoque" ? iotPage(m) : page === "marketplaces" ? markets() : page === "financeiro" ? financeiro() : page === "config" ? configPage() : ai(m)}</main></div></div>${modal ? detail() : ""}${fulfillmentModal ? fulfillmentDetail() : ""}${docModal ? docDetail() : ""}${tourStep !== null ? tourOverlay() : ""}<dialog class="reset-dialog" id="reset-dialog"><h2>Recomeçar a apresentação?</h2><p>As alterações simuladas serão apagadas e os dados iniciais serão restaurados.</p><div class="actions"><button class="btn" data-action="cancel-reset">Cancelar</button><button class="btn primary" data-action="confirm-reset">Reiniciar</button></div></dialog>`;
  if (modal || fulfillmentModal || docModal || tourStep !== null) {
    document.body.style.overflow = "hidden";
    $(".close")?.focus();
  } else document.body.style.overflow = "";
  if (cameraTarget) attachCameraPreview();
}
// Painel de notificações (sino do topo) — vendas, separações, despachos e reposição
function notifPanel() {
  const items = state.notifications.slice(0, 8);
  const icons = {
    venda: "🛒",
    separacao: "📦",
    despacho: "🚚",
    compra: "🧾",
    estoque: "🔎",
  };
  return `<div class="notif-panel" role="menu" aria-label="Notificações recentes"><div class="notif-panel-head">Notificações<button type="button" class="link" data-action="close-notifications" aria-label="Fechar notificações">×</button></div>${
    items.length
      ? items
          .map(
            (n) =>
              `<div class="notif-item ${n.read ? "" : "unread"}"><span>${icons[n.type] || "🔔"}</span><div>${esc(n.text)}<small>${esc(n.time)}</small></div></div>`,
          )
          .join("")
      : '<div class="notif-item"><div class="muted">Nenhuma notificação por enquanto.</div></div>'
  }</div>`;
}
// Dashboard
function dashboardCopilot(m) {
  const low = state.products.filter((p) => p.stock < 20),
    issues = state.products.filter((p) => p.issue),
    top = channels.find(
      (c) =>
        c.id ===
        Object.entries(state.shareBase).sort((a, b) => b[1] - a[1])[0][0],
    );
  const summary = `Hoje você registrou ${m.orders} pedidos e ${money(m.revenue)} em vendas. ${low.length} ${low.length === 1 ? "produto está" : "produtos estão"} com estoque abaixo de 20 unidades${issues.length ? ` e ${issues.length} anúncio${issues.length === 1 ? " precisa" : "s precisam"} de revisão.` : "."}`;
  const response = dashboardAiResponse || summary;
  return `<section class="dashboard-ai-hero" aria-labelledby="dashboard-ai-title"><div class="dashboard-ai-main"><div class="dashboard-ai-badge"><span>✧</span> WEDTECH AI · COPILOTO DA OPERAÇÃO</div><h2 id="dashboard-ai-title">Sua operação, explicada antes dos números.</h2><div class="dashboard-ai-answer" aria-live="polite">${busy ? '<span class="spin"></span> Analisando sua operação...' : esc(response)}</div><div class="dashboard-ai-chips">${[0, 2, 4].map((i) => `<button type="button" class="dashboard-ai-chip" data-dashboard-ask="${i}" ${busy ? "disabled" : ""}>${suggestions[i]}</button>`).join("")}</div><form class="dashboard-ai-form" id="dashboard-ai-form"><label class="sr-only" for="dashboard-ai-question">Pergunte ao WedTech AI sobre sua operação</label><input id="dashboard-ai-question" name="question" placeholder="Pergunte sobre vendas, estoque ou anúncios..." aria-label="Pergunta rápida para WedTech AI" required maxlength="500" ${busy ? "disabled" : ""}><button ${busy ? "disabled" : ""} aria-label="Enviar pergunta">Perguntar ↑</button></form><a class="dashboard-ai-link" href="#ai">Abrir conversa completa com WedTech AI →</a></div><aside class="dashboard-ai-side" aria-label="Resumo inteligente"><div><small>ATENÇÃO AGORA</small><strong>${m.alerts}</strong><span>alertas identificados</span></div><div><small>ESTOQUE BAIXO</small><strong>${low.length}</strong><span>produtos abaixo de 20 un.</span></div><div><small>PEDIDOS DE COMPRA</small><strong>${m.openPurchaseOrders}</strong><span>em andamento com fornecedores</span></div><div><small>CANAL EM DESTAQUE</small><strong class="channel-highlight">${esc(top?.name || "—")}</strong><span>maior participação nas vendas</span></div></aside></section>`;
}
function dashboard(m) {
  const kpis = [
    ["Vendas hoje", money(m.revenue), "↑ 18,6% vs. ontem", "sale"],
    ["Pedidos", m.orders, "Pedidos recebidos hoje", "orders"],
    ["Produtos ativos", m.products, "Catálogo demonstrativo", "produtos"],
    ["Estoque total", m.stock, "Unidades em todos os canais", "stock"],
    ["Alertas", m.alerts, "Situações e oportunidades", "alert"],
    ["Marketplaces", m.connected, "Conectados e sincronizados", "marketplaces"],
  ];
  const total = Object.values(state.shareBase).reduce((a, b) => a + b, 0);
  let offset = 0;
  const segments = ["ml", "sh", "tk", "lp"].map((id) => {
    const c = channels.find((c) => c.id === id);
    const pct = (state.shareBase[id] / total) * 100;
    const seg = c.color + " " + offset + "% " + (offset + pct) + "%";
    offset += pct;
    return seg;
  });
  const values = [...state.salesWeek, m.revenue],
    max = Math.max(6000, ...values),
    points = values.map((v, i) => [40 + i * 90, 180 - (v / max) * 160]);
  const line = points.map((p) => p.join(",")).join(" ");
  return (
    heading(
      "Visão geral",
      "Bom dia! Aqui está o resumo da sua operação.",
      `<button class="btn" data-action="toggle-live">${liveMode ? "⏸ Pausar operação ao vivo" : "▶ Ativar operação ao vivo"}</button><button class="btn primary" data-action="new">+ Novo produto</button>`,
    ) +
    dashboardCopilot(m) +
    `<div class="kpis">${kpis.map((k, i) => `<div class="card kpi"><div class="kpi-label">${icon(k[3])}${k[0]}</div><strong>${k[1]}</strong><small class="${i === 0 ? "positive" : ""}">${k[2]}</small></div>`).join("")}</div><div class="chart-grid"><section class="card"><div class="section-head"><div><h2>Vendas nos últimos 7 dias</h2><p>A evolução da sua operação, em um só lugar.</p></div><span class="legend"><span class="dot"></span>Vendas</span></div><svg class="graph" viewBox="0 0 600 210" role="img" aria-label="Vendas de 3 a 9 de setembro: ${values.map(money).join(", ")}"><defs><linearGradient id="fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#2f6fb2" stop-opacity=".18"/><stop offset="100%" stop-color="#2f6fb2" stop-opacity="0"/></linearGradient></defs>${[0, 1, 2, 3].map((i) => `<line class="gridline" x1="40" y1="${20 + i * 53}" x2="590" y2="${20 + i * 53}"/><text x="0" y="${25 + i * 53}">${Math.round((max * (1 - i / 3)) / 1000)} mil</text>`).join("")}<polygon points="40,185 ${line} 580,185" fill="url(#fill)"/><polyline points="${line}" fill="none" stroke="#2f6fb2" stroke-width="3" stroke-linejoin="round"/>${points.map((p, i) => `<circle cx="${p[0]}" cy="${p[1]}" r="${i === 6 ? 5 : 3}" fill="#2f6fb2" stroke="white" stroke-width="2"><title>${money(values[i])}</title></circle>`).join("")}</svg><div class="chart-foot">${["Qui, 03", "Sex, 04", "Sáb, 05", "Dom, 06", "Seg, 07", "Ter, 08", "Hoje"].map((t) => "<span>" + t + "</span>").join("")}</div></section><section class="card"><div class="section-head"><div><h2>Vendas por marketplace</h2><p>Participação no faturamento · últimos 7 dias</p></div></div><div class="donut-wrap"><div class="donut" style="background:conic-gradient(${segments.join(",")})" role="img" aria-label="Distribuição de vendas por canal"><div class="donut-center"><strong>4</strong><small>Canais de venda</small></div></div><div class="channel-legend">${[
      "ml",
      "sh",
      "tk",
      "lp",
    ]
      .map((id) => {
        const c = channels.find((c) => c.id === id);
        return `<div><span class="swatch" style="background:${c.color}"></span>${c.name}<strong>${Math.round((state.shareBase[id] / total) * 100)}%</strong></div>`;
      })
      .join(
        "",
      )}</div></div></section></div><div class="ai-strip"><span class="spark">✧</span><div><h2>Sua operação tem um copiloto.</h2><p>WedTech AI encontrou algumas situações que precisam da sua atenção.</p></div><a class="link" href="#ai">Conversar com WedTech AI ↗</a></div><div class="alert-grid">${[
      ["p0", "CRÍTICO", "danger", "Estoque próximo da ruptura.", "Ver estoque"],
      [
        "p1",
        state.products[1].issue ? "ATENÇÃO" : "RESOLVIDO",
        state.products[1].issue ? "warn" : "",
        state.products[1].issue
          ? "Existe um problema no anúncio da Shopee."
          : "Anúncio revisado e pronto para vender.",
        "Ver anúncio",
      ],
      [
        "p2",
        "OPORTUNIDADE",
        "",
        "As vendas deste produto cresceram nesta semana.",
        "Explorar oportunidade",
      ],
    ]
      .map(
        (a) =>
          `<button class="card alert-card" data-product="${a[0]}">${badge(a[1], a[2])}<h3>${esc(state.products.find((p) => p.id === a[0]).name)}</h3><p>${a[3]}</p><span class="link">${a[4]} →</span></button>`,
      )
      .join(
        "",
      )}</div><div class="bottom-grid"><section class="card"><div class="section-head"><h2>Seus canais, conectados</h2><a href="#marketplaces" class="link">Gerenciar →</a></div>${channels
      .filter((c) => c.id !== "lp")
      .map(
        (c) =>
          `<div class="channel-row">${logo(c.id)}<div>${c.name}<div class="muted">${state.products.filter((p) => p.channels.includes(c.id)).length} produtos publicados</div></div>${badge(state.connected.includes(c.id) ? "Conectado" : "Não conectado", state.connected.includes(c.id) ? "" : "neutral")}</div>`,
      )
      .join(
        "",
      )}</section><section class="card"><div class="section-head"><h2>Atividade recente</h2><span class="muted" style="font-size:12px">Sua operação em movimento</span></div>${state.history
      .slice(0, 4)
      .map(
        (h) =>
          `<div class="activity"><span class="activity-icon">✓</span><div>${esc(h.text)}<small>${esc(h.time)}</small></div></div>`,
      )
      .join(
        "",
      )}<p class="caption">Todas as atividades são simulações locais.</p></section></div>`
  );
}
// Product catalog and details
function catalog() {
  const products = state.products.filter((p) =>
    (p.name + " " + p.sku).toLowerCase().includes(query.toLowerCase()),
  );
  return (
    heading(
      "Catálogo de produtos",
      "Um único cadastro. Estoque e informações em sintonia.",
      `<button class="btn primary" data-action="new">+ Novo Produto</button>`,
    ) +
    `<div class="toolbar"><input class="search" type="search" id="search" placeholder="Buscar por produto ou SKU..." aria-label="Buscar produtos" value="${esc(query)}"></div><section class="card table-wrap"><table><thead><tr><th>Produto</th><th>SKU</th><th>Preço</th><th>Estoque</th><th>Marketplaces</th><th>Status</th></tr></thead><tbody>${products.map((p) => `<tr><td><div class="product-name"><span class="product-icon">${p.image ? `<img src="${esc(p.image)}" alt="" style="width:38px;height:38px;object-fit:contain">` : icon(p.icon)}</span><button class="product-button" data-product="${p.id}">${esc(p.name)}<small>${esc(p.brand)} · ${esc(p.category)}</small></button></div></td><td class="muted">${esc(p.sku)}${p.barcode ? `<small>EAN ${esc(p.barcode)}</small>` : ""}</td><td>${money(p.price)}</td><td><b style="color:${p.stock < 20 ? "#b67730" : "inherit"}">${p.stock}</b><small>${p.stock < 20 ? "Estoque baixo" : "unidades"}</small></td><td><div class="mini-channels">${p.channels.map(logo).join("")}</div></td><td>${badge(p.issue ? "Atenção" : "Ativo", p.issue ? "warn" : "")}</td></tr>`).join("")}</tbody></table>${products.length ? "" : '<div class="empty">Nenhum produto encontrado.</div>'}<div class="table-footer">${products.length} de ${state.products.length} produtos · Catálogo demonstrativo completo</div></section><div class="ai-strip" style="margin-top:24px"><span class="spark">✧</span><div><h2>Um estoque que acompanha suas vendas.</h2><p>Abra Nike Revolution 8 e simule uma venda para ver a sincronização entre os canais.</p></div><button class="link" data-product="p0">Experimentar →</button></div>`
  );
}
function detail() {
  const p = state.products.find((p) => p.id === modal);
  if (!p) return "";
  const count = state.orders
    .filter((o) => o.productId === p.id)
    .reduce((a, o) => a + o.quantity, 0);
  const margin = p.price - (p.cost ?? 0),
    marginPct = p.price > 0 ? Math.round((margin / p.price) * 1000) / 10 : 0;
  return `<div class="modal-overlay"><section class="drawer" role="dialog" aria-modal="true" aria-labelledby="detail-title"><div class="drawer-top"><span class="wedtech-label">CATÁLOGO CENTRAL</span><button class="close" data-action="close" aria-label="Fechar detalhes">×</button></div><div class="product-icon" style="width:64px;height:64px;margin-bottom:20px">${p.image ? `<img class="image-preview" src="${esc(p.image)}" alt="${esc(p.name)}">` : icon(p.icon)}</div><h1 id="detail-title">${esc(p.name)}</h1><p class="muted" style="font-size:14px;margin-top:10px">${esc(p.sku)} · ${esc(p.brand)} · ${esc(p.category)}${p.barcode ? " · EAN " + esc(p.barcode) : ""}</p><div class="detail-stats" style="grid-template-columns:repeat(4,1fr)"><div><small>Preço</small><strong>${money(p.price)}</strong></div><div><small>Estoque</small><strong>${p.stock} un.</strong></div><div><small>Vendidos hoje</small><strong>${count}</strong></div><div><small>Margem</small><strong>${marginPct}%</strong></div></div><p style="font-size:14px">${esc(p.description)}</p><p class="caption">${esc(p.features)}</p><div class="sync-box"><div class="section-head" style="margin-bottom:10px"><h2>Estoque em tempo real</h2>${badge("Simulação", "neutral")}</div><p aria-live="polite">${syncText || "Um único saldo, atualizado em todos os canais."}</p>${channels.map((c) => `<div class="sync-channel"><span>${c.name}</span><span>${p.channels.includes(c.id) ? `<b>${p.stock}</b> ${busy ? "sincronizando…" : "✓ Publicado"}` : "Não publicado"}</span></div>`).join("")}<button class="btn primary" style="width:100%;margin-top:18px" data-action="sell" ${busy || p.stock < 1 ? "disabled" : ""}>${busy ? '<span class="spin"></span>Sincronizando estoque...' : p.stock < 1 ? "Estoque esgotado" : "Simular venda"}</button></div><div class="ai-strip" style="align-items:flex-start"><span class="spark">✧</span><div><h2>Análise do WedTech AI</h2><p>${p.stock < 20 ? "Estoque próximo da ruptura. Restam " + p.stock + " unidades. Planeje a reposição." : p.issue ? "O título na Shopee ultrapassa a recomendação desta demonstração." : p.slow ? "Vendas abaixo da média histórica. Revise o anúncio e avalie uma campanha." : "Estoque saudável. Continue acompanhando as vendas entre os canais."}</p></div></div>${p.issue ? `<button class="btn primary" data-action="fix-product" ${busy ? "disabled" : ""}>${busy ? "Corrigindo..." : "✧ Corrigir anúncio com WedTech AI"}</button>` : ""}<h3 style="margin-top:24px">Últimas vendas simuladas</h3>${
    state.orders
      .filter((o) => o.productId === p.id)
      .slice(-3)
      .reverse()
      .map(
        (o) =>
          `<div class="channel-row"><span>${o.id}<small style="display:block">${channels.find((c) => c.id === o.channel).name} · ${o.time}</small></span><b style="margin-left:auto">${money(o.amount)}</b>${o.invoiceId ? `<button class="link" data-doc="invoice:${o.invoiceId}">Ver NF</button>` : ""}</div>`,
      )
      .join("") ||
    '<p class="caption">Este produto ainda não recebeu vendas.</p>'
  }</section></div>`;
}
function stepbar() {
  return `<div class="steps">${["Produto original", "Preparar e validar", "Publicar nos canais"].map((s, i) => `<span class="${(oneStage === 0 ? 0 : oneStage < 4 ? 1 : 2) >= i ? "current" : ""}"><b>${i + 1}</b>${s}</span>`).join("")}</div>`;
}
// WedTech One publishing flow
function one() {
  let content =
    heading(
      "WedTech One",
      "Cadastre uma vez. Publique em qualquer lugar.",
      oneStage === 0
        ? '<button class="btn" data-action="example">Preencher exemplo</button>'
        : "",
    ) + stepbar();
  if (oneStage === 0) {
    return (
      content +
      `<form id="product-form" class="form-layout"><section class="card"><div class="section-head"><div><h2>Informações do produto</h2><p>Este é o ponto de partida para todos os seus anúncios.</p></div>${icon("produtos")}</div><div class="form-grid">${[
        ["name", "Nome do produto", "text"],
        ["brand", "Marca", "text"],
        ["sku", "SKU", "text"],
        ["barcode", "Código de barras (EAN)", "text"],
        ["category", "Categoria", "text"],
        ["price", "Preço (R$)", "number"],
        ["stock", "Estoque", "number"],
      ]
        .map(
          ([key, label, type]) =>
            `<div class="field ${key === "name" ? "full" : ""}"><label for="${key}">${label}${key === "barcode" ? ' <span class="muted">(opcional)</span>' : ""}</label><input id="${key}" name="${key}" type="${type}" value="${esc(draft[key])}" ${key === "barcode" ? "" : "required"} ${type === "number" ? `min="${key === "price" ? ".01" : "0"}" max="${key === "price" ? "9999999" : "999999"}" step="${key === "price" ? ".01" : "1"}"` : 'maxlength="120"'}></div>`,
        )
        .join(
          "",
        )}<div class="field full"><label for="description">Descrição</label><textarea id="description" name="description" required maxlength="2000">${esc(draft.description)}</textarea></div><div class="field full"><label for="features">Características</label><textarea id="features" name="features" maxlength="1000">${esc(draft.features)}</textarea></div><div class="field full"><label for="image">Imagem do produto</label><input id="image" type="file" accept="image/png,image/jpeg,image/webp"><span class="help">PNG, JPG ou WebP, até 1 MB. Guardada apenas neste navegador.</span>${draft.image ? `<img src="${esc(draft.image)}" class="image-preview" alt="Prévia do produto">` : ""}</div></div></section><aside><section class="card"><h2 style="margin-bottom:8px">Onde você quer vender?</h2><p class="muted" style="font-size:14px;margin-bottom:23px">A IA adapta seu produto para cada canal selecionado.</p>${channels
        .filter((c) => c.id !== "lp")
        .map(
          (c) =>
            `<label class="check-row"><input type="checkbox" name="channel" value="${c.id}" ${selected.includes(c.id) ? "checked" : ""}>${logo(c.id)}<span>${c.name}</span></label>`,
        )
        .join(
          "",
        )}<button class="btn primary" style="width:100%;margin-top:15px" type="submit">✧ Preparar anúncios com WedTech AI</button><p class="caption">IA e publicações simuladas. Nenhum anúncio será enviado para plataformas reais.</p></section><section class="one-story"><div class="wedtech-label" style="color:#9fc7f3">MENOS REPETIÇÃO. MAIS TEMPO.</div><h2>Seu próximo anúncio começa apenas uma vez.</h2><p>Títulos, descrições e validações adaptados por canal, a partir de um catálogo central.</p><div class="flow"><span>Produto</span>→<span>WedTech AI</span>→<span>Canais</span></div></section></aside></form>`
    );
  }
  if (oneStage === 1) {
    const steps = [
      "Produto identificado",
      "Categoria analisada",
      "Características processadas",
      "Regras dos marketplaces verificadas",
      "Anúncios preparados",
    ];
    return (
      content +
      `<section class="card progress-card"><h2><span class="spin"></span>WedTech AI está analisando o produto...</h2>${steps.map((s, i) => `<div class="progress-line" style="opacity:${progress > i ? 1 : 0.35}">${progress > i ? "✓" : "○"} ${s}</div>`).join("")}<p class="caption">Preparando versões demonstrativas para ${selected.length} canais.</p></section>`
    );
  }
  return (
    content +
    (oneStage === 5
      ? '<div class="success-banner"><h2>✓ Produto distribuído com sucesso.</h2><p>O produto já está no catálogo central. Todos os canais selecionados compartilham seu estoque.</p></div>'
      : "") +
    `<section class="card" style="margin-bottom:22px"><div class="section-head" style="margin:0"><div><span class="wedtech-label">PRODUTO ORIGINAL</span><h2 style="margin:8px 0">${esc(draft.name)}</h2><p>${esc(draft.description)}</p></div><strong>${money(Number(draft.price))}</strong></div></section><div class="ad-grid">${ads.map((a, i) => `<section class="card ad-card"><div class="section-head">${logo(a.channel)}${badge(oneStage === 5 ? "✓ Publicado" : oneStage === 4 ? (progress > i ? "✓ Publicado" : "Publicando...") : "Pronto", oneStage === 4 ? "neutral" : "")}</div><small>${channels.find((c) => c.id === a.channel).name}</small><h3>${esc(a.title)}</h3><p>${esc(a.description)}</p><p style="margin-top:15px;color:#223a57;font-weight:600">${money(Number(draft.price))}</p><div class="validation ${a.fixed || !a.warning ? "ok" : ""}">${a.fixed ? "✓ " + (a.channel === "ml" ? "GTIN ajustado para demonstração: DEMO-SEM-GTIN." : a.channel === "sh" ? "Título Shopee otimizado." : "Nenhum problema identificado.") : a.warning ? "⚠ " + a.warning : "✓ Nenhum problema identificado."}</div></section>`).join("")}</div><div class="card" style="margin-top:22px"><div class="section-head" style="margin:0"><div><h2>${oneStage === 5 ? "Tudo pronto para vender." : oneStage === 4 ? "Publicando nos canais selecionados..." : ads.some((a) => a.warning && !a.fixed) ? "Validação inteligente encontrou ajustes." : "Todos os anúncios estão prontos."}</h2><p>${oneStage === 5 ? "Simule uma venda e acompanhe a sincronização." : "Validação ilustrativa, sem consulta às regras reais dos marketplaces."}</p></div><div class="actions">${oneStage === 5 ? `<button class="btn" data-action="another">Novo cadastro</button><button class="btn primary" data-product="${publishedId}">Ver produto</button>` : oneStage === 4 ? '<span class="spin"></span>' : `<button class="btn" data-action="edit-one" ${busy ? "disabled" : ""}>Editar produto</button>${ads.some((a) => a.warning && !a.fixed) ? `<button class="btn primary" data-action="fix-ads" ${busy ? "disabled" : ""}>${busy ? "Corrigindo..." : "✧ Corrigir com WedTech AI"}</button>` : '<button class="btn primary" data-action="publish">Publicar</button>'}`}</div></div></div>`
  );
}
// Marketplace management
function markets() {
  return (
    heading(
      "Marketplaces",
      "Seus canais de venda. Uma única operação.",
      badge(metrics(state).connected + " conectados"),
    ) +
    `<div class="market-grid">${channels
      .filter((c) => c.id !== "lp")
      .map(
        (c) =>
          `<section class="card"><div class="market-title">${logo(c.id)}<h2>${c.name}</h2>${badge(state.connected.includes(c.id) ? "Conectado" : "Não conectado", state.connected.includes(c.id) ? "" : "neutral")}</div><div class="market-stats"><div><strong>${state.products.filter((p) => p.channels.includes(c.id)).length}</strong><small>Produtos publicados</small></div><div><strong>${state.orders.filter((o) => o.channel === c.id).length}</strong><small>Pedidos hoje</small></div></div>${state.connected.includes(c.id) ? '<div class="validation ok">✓ Canal conectado em modo demonstração.</div>' : `<button class="btn primary" data-connect="${c.id}" ${busy ? "disabled" : ""}>${busy ? "Conectando..." : "Conectar"}</button><p class="caption">Conexão simulada, sem credenciais.</p>`}</section>`,
      )
      .join(
        "",
      )}</div><div class="ai-strip" style="margin-top:24px"><span class="spark">✧</span><div><h2>Mais canais, o mesmo catálogo.</h2><p>Ao publicar com WedTech One, os anúncios passam a compartilhar as informações e o saldo do produto.</p></div><a class="link" href="#one">Abrir WedTech One →</a></div>`
  );
}
// Estoque Inteligente — leitor IoT (entrada/saída física) e separação de pedidos
// Painel de câmera embutido no leitor (complemento do campo de texto, nunca substitui)
function cameraBox() {
  return `<div class="camera-box"><video id="camera-preview" playsinline muted></video><div class="camera-hint">${cameraError ? "⚠ " + esc(cameraError) : "Aponte a câmera para o código de barras…"}</div><button type="button" class="btn" data-action="stop-camera">Parar câmera</button></div>`;
}
function iotPage(m) {
  const store = state.stores.find((s) => s.id === scanStoreId) || state.stores[0];
  const active = state.fulfillments.filter((f) => f.status !== "shipped");
  const shipped = state.fulfillments.filter((f) => f.status === "shipped").slice(0, 3);
  const allForecast = forecast(state);
  const risk = allForecast
    .filter((f) => f.risk === "critico" || f.risk === "atencao")
    .sort((a, b) => (a.risk === b.risk ? 0 : a.risk === "critico" ? -1 : 1));
  const overstock = allForecast.filter((f) => f.risk === "excesso");
  const openPOs = state.purchaseOrders.filter((po) => po.status !== "received");
  const openChecks = state.inventoryChecks.filter((c) => c.status === "open");
  const impact = businessImpact(state);
  const kpis = [
    ["Leituras hoje", state.scanLog.length, "Registradas pelo leitor IoT", "estoque"],
    ["Aguardando separação", m.pendingSeparations, "Pedidos de marketplace na fila", "orders"],
    ["Estoque baixo", state.products.filter((p) => p.stock < 20).length, "Produtos abaixo de 20 un.", "stock"],
    ["Lojas conectadas", state.stores.length, "Lojas e centros de distribuição", "marketplaces"],
  ];
  return (
    heading(
      "Estoque Inteligente",
      "Leitor de código de barras, separação de pedidos e rastreabilidade em tempo real. Estoque único, centralizado no Galpão Principal.",
      `<button class="btn" data-action="export-estoque-csv">⇩ Exportar CSV</button><button class="btn" data-action="new-order" ${busy ? "disabled" : ""}>+ Simular pedido de marketplace</button>`,
    ) +
    `<div class="kpis" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr))">${kpis
      .map(
        (k) =>
          `<div class="card kpi"><div class="kpi-label">${icon(k[3])}${k[0]}</div><strong>${k[1]}</strong><small>${k[2]}</small></div>`,
      )
      .join(
        "",
      )}</div>${
      impact.salesAtRisk || impact.capitalParado
        ? `<div class="kpis" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr));margin-bottom:23px"><div class="card kpi" style="border-color:var(--fix-line,#f0cdc9)"><div class="kpi-label">${icon("alert")}Vendas em risco (7 dias)</div><strong style="color:#b9574d">${money(impact.salesAtRisk)}</strong><small>${impact.atRiskCount} produto(s) perto da ruptura</small></div><div class="card kpi" style="border-color:#efdcb3"><div class="kpi-label">${icon("stock")}Capital parado em excesso</div><strong style="color:#966319">${money(impact.capitalParado)}</strong><small>${impact.overstockCount} produto(s) com baixo giro</small></div></div>`
        : ""
    }<div class="chart-grid"><section class="card"><div class="section-head"><div><h2>Leitor de código de barras</h2><p>Simule a leitura de um SKU ou código de barras na loja física.</p></div>${badge("🟢 Leitor conectado")}</div><div class="field" style="margin-bottom:18px"><label for="scan-store">Loja / unidade</label><select id="scan-store">${state.stores
      .map(
        (s) =>
          `<option value="${s.id}" ${s.id === scanStoreId ? "selected" : ""}>${esc(s.name)}</option>`,
      )
      .join(
        "",
      )}</select></div><div class="actions" style="margin-bottom:18px"><button type="button" class="btn ${scanMode === "saida" ? "primary" : ""}" data-action="scan-mode-saida">↗ Saída (venda balcão)</button><button type="button" class="btn ${scanMode === "entrada" ? "primary" : ""}" data-action="scan-mode-entrada">↘ Entrada (recebimento)</button></div><form id="scan-form" style="display:flex;align-items:flex-end;gap:12px;flex-wrap:wrap"><div class="field" style="flex:1;min-width:180px"><label for="scan-code">Código de barras ou SKU</label><input id="scan-code" name="code" placeholder="Ex.: 7891234500001 ou NK-RV8-001" autocomplete="off" required></div>${
      scanMode === "entrada"
        ? '<div class="field" style="width:90px"><label for="scan-qty">Qtd.</label><input id="scan-qty" name="qty" type="number" min="1" max="9999" value="1"></div>'
        : ""
    }<button class="btn primary" ${busy ? "disabled" : ""}>${busy ? "Bipando…" : "✧ Bipar"}</button>${cameraTarget !== "store" ? `<button type="button" class="btn" data-camera-start="store" ${busy ? "disabled" : ""}>📷 Usar câmera</button>` : ""}</form>${cameraTarget === "store" ? cameraBox() : ""}<p class="caption">Loja selecionada: ${esc(store?.name || "—")}. A leitura simula um leitor IoT (RFID/código de barras) conectado ao estoque central — ou use a câmera para bipar de verdade.</p>${
      scanFeedback
        ? `<div class="validation ${scanFeedback.type === "ok" ? "ok" : ""}">${scanFeedback.type === "ok" ? "✓ " : "⚠ "}${esc(scanFeedback.text)}</div>`
        : ""
    }</section><section class="card"><div class="section-head"><h2>Histórico de leituras</h2><span class="muted" style="font-size:12px">${state.scanLog.length} registradas</span></div>${
      state.scanLog.length
        ? state.scanLog
            .slice(0, 8)
            .map(
              (l) =>
                `<div class="channel-row"><span>${l.type === "entrada" ? "↘" : l.type === "saida" ? "↗" : "📦"}</span><div>${esc(l.product)}<div class="muted" style="font-size:12px">${esc(l.sku)} · ${esc(l.store)}</div></div>${badge(l.type === "entrada" ? "Entrada" : l.type === "saida" ? "Saída" : "Separação", l.type === "saida" ? "" : l.type === "entrada" ? "neutral" : "warn")}</div>`,
            )
            .join("")
        : '<div class="empty">Nenhuma leitura registrada ainda. Bipe um código para começar.</div>'
    }</section></div><section class="card" style="margin-top:22px"><div class="section-head"><div><h2>Fila de separação</h2><p>Pedidos recebidos nos marketplaces, aguardando conferência física por leitura.</p></div>${badge(active.length + " em aberto")}</div>${
      active.length
        ? `<div class="table-wrap"><table><thead><tr><th>Pedido</th><th>Canal</th><th>Itens</th><th>Recebido</th><th>Status</th><th></th></tr></thead><tbody>${active
            .map(
              (f) =>
                `<tr><td><b>${f.id}</b></td><td>${logo(f.channel)}</td><td>${f.items.length} item(ns) · ${f.items.filter((it) => it.scanned).length}/${f.items.length} bipados</td><td class="muted">${esc(f.createdAt)}</td><td>${badge(fulfillmentStatus[f.status], f.status === "pending" ? "neutral" : f.status === "separating" ? "warn" : "")}</td><td>${
                  f.status === "separated"
                    ? `<button class="btn primary" data-dispatch="${f.id}" ${busy ? "disabled" : ""}>Despachar</button>`
                    : `<button class="btn" data-fulfillment="${f.id}">${f.status === "separating" ? "Continuar separação" : "Separar pedido"}</button>`
                }</td></tr>`,
            )
            .join("")}</tbody></table></div>`
        : '<div class="empty">Nenhum pedido aguardando separação. Simule um novo pedido para ver o fluxo.</div>'
    }${shipped.length ? `<p class="caption">Últimos despachados: ${shipped.map((f) => f.id).join(", ")}.</p>` : ""}</section><section class="card" style="margin-top:22px"><div class="section-head"><div><h2>Previsão de ruptura</h2><p>Estimativa de dias até esgotar, com base no ritmo de vendas de hoje.</p></div>${badge("✧ WedTech AI", "neutral")}</div>${
      risk.length
        ? risk
            .map(
              (f) =>
                `<div class="channel-row"><span>${f.risk === "critico" ? "🔴" : "🟠"}</span><div>${esc(f.name)}<div class="muted" style="font-size:12px">${f.stock} un. · mínimo ${f.minStock}</div></div>${badge(f.daysToStockout !== null ? "esgota em ~" + f.daysToStockout + " dia(s)" : "abaixo do mínimo", f.risk === "critico" ? "danger" : "warn")}</div>`,
            )
            .join("")
        : '<div class="empty">Nenhum produto em risco de ruptura no momento.</div>'
    }</section><section class="card" style="margin-top:22px"><div class="section-head"><div><h2>Estoque parado</h2><p>Produtos com baixo giro, ocupando espaço e capital — o outro lado da gestão inteligente de estoque.</p></div>${badge("✧ WedTech AI", "neutral")}</div>${
      overstock.length
        ? overstock
            .map(
              (f) =>
                `<div class="channel-row"><span>📦</span><div>${esc(f.name)}<div class="muted" style="font-size:12px">${f.stock} un. · cobertura de ~${f.daysToStockout ?? "?"} dias</div></div>${badge("liquidar " + f.suggestedDiscount + "%", "warn")}</div>`,
            )
            .join("")
        : '<div class="empty">Nenhum produto parado no momento.</div>'
    }</section><section class="card" style="margin-top:22px"><div class="section-head"><div><h2>Fornecedores e reposição automática</h2><p>Pedidos de compra gerados a partir da previsão de ruptura.</p></div><button class="btn primary" data-action="auto-po" ${busy ? "disabled" : ""}>✧ Gerar pedidos automaticamente</button></div>${
      openPOs.length
        ? `<div class="table-wrap"><table><thead><tr><th>Pedido</th><th>Fornecedor</th><th>Itens</th><th>Status</th><th></th></tr></thead><tbody>${openPOs
            .map((po) => {
              const supplier = state.suppliers.find(
                (sp) => sp.id === po.supplierId,
              );
              return `<tr><td><b>${po.id}</b></td><td class="muted">${esc(supplier?.name || "—")}</td><td>${po.items.map((it) => it.name + " (" + it.qty + ")").join(", ")}</td><td>${badge(purchaseOrderStatus[po.status], po.status === "suggested" ? "neutral" : "warn")}</td><td>${
                po.status === "suggested"
                  ? `<button class="btn" data-send-po="${po.id}" ${busy ? "disabled" : ""}>Enviar pedido</button>`
                  : `<button class="btn primary" data-receive-po="${po.id}" ${busy ? "disabled" : ""}>Confirmar recebimento</button>`
              }</td></tr>`;
            })
            .join("")}</tbody></table></div>`
        : '<div class="empty">Nenhum pedido de compra em aberto. O estoque está coberto pelo mínimo configurado.</div>'
    }</section><section class="card" style="margin-top:22px"><div class="section-head"><div><h2>Divergência de inventário</h2><p>Confronto entre o estoque do sistema e uma contagem física simulada pelo leitor IoT.</p></div><button class="btn" data-action="simulate-count" ${busy ? "disabled" : ""}>Simular contagem física</button></div>${
      openChecks.length
        ? openChecks
            .map(
              (c) =>
                `<div class="channel-row"><span>⚠</span><div>${esc(c.name)}<div class="muted" style="font-size:12px">Sistema ${c.systemStock} × contado ${c.countedStock}</div></div><button class="btn primary" data-resolve-check="${c.id}" ${busy ? "disabled" : ""}>✧ Corrigir com WedTech AI</button></div>`,
            )
            .join("")
        : '<div class="empty">Nenhuma divergência em aberto. Simule uma contagem para ver o fluxo.</div>'
    }</section><div class="ai-strip" style="margin-top:22px"><span class="spark">✧</span><div><h2>IoT + IA + automação, juntas.</h2><p>Cada leitura sincroniza o estoque em todos os canais e alimenta o WedTech AI com dados em tempo real.</p></div><a class="link" href="#ai">Conversar com WedTech AI ↗</a></div>`
  );
}
// Modal de separação: bipagem item a item com conferência contra o pedido
function fulfillmentDetail() {
  const f = state.fulfillments.find((f) => f.id === fulfillmentModal);
  if (!f) return "";
  const done = f.items.every((it) => it.scanned);
  // Rota de separação sugerida: agrupa a coleta por corredor do Galpão Principal
  // para reduzir deslocamento — a mesma lista de itens, só reordenada pela IA.
  const route = f.items
    .map((it, i) => ({
      ...it,
      aisle: state.products.find((p) => p.id === it.productId)?.aisle || "—",
      original: i,
    }))
    .sort((a, b) => a.aisle.localeCompare(b.aisle) || a.original - b.original);
  return `<div class="modal-overlay"><section class="drawer" role="dialog" aria-modal="true" aria-labelledby="fulfillment-title"><div class="drawer-top"><span class="wedtech-label">SEPARAÇÃO DE PEDIDO</span><button class="close" data-action="close-fulfillment" aria-label="Fechar separação">×</button></div><h1 id="fulfillment-title">${esc(f.id)}</h1><p class="muted" style="font-size:14px;margin-top:10px">${logo(f.channel)} ${esc(channels.find((c) => c.id === f.channel)?.name || "")} · Recebido ${esc(f.createdAt)}</p><div style="margin-top:16px">${badge(fulfillmentStatus[f.status], f.status === "pending" ? "neutral" : f.status === "separating" ? "warn" : "")}</div><h3 style="margin-top:24px;margin-bottom:4px">Rota de separação sugerida</h3><p class="caption" style="margin-top:0">Coleta agrupada por corredor do Galpão Principal, na ordem abaixo.</p>${route
    .map(
      (it, i) =>
        `<div class="channel-row"><span>${it.scanned ? "✓" : i + 1}</span><div>${esc(it.name)}<div class="muted" style="font-size:12px">${esc(it.sku)} · Qtd. ${it.qty} · Corredor ${esc(it.aisle)}</div></div>${badge(it.scanned ? "Bipado" : "Pendente", it.scanned ? "" : "neutral")}</div>`,
    )
    .join(
      "",
    )}${
    f.status !== "separated" && f.status !== "shipped"
      ? `<form id="fulfillment-scan-form" style="display:flex;align-items:flex-end;gap:12px;margin-top:18px"><div class="field" style="flex:1"><label for="fulfillment-scan-code">Bipar código do item</label><input id="fulfillment-scan-code" name="code" autocomplete="off" required placeholder="SKU ou código de barras"></div><button class="btn primary" ${busy ? "disabled" : ""}>${busy ? "Bipando…" : "✧ Bipar"}</button>${cameraTarget !== "fulfillment" ? `<button type="button" class="btn" data-camera-start="fulfillment" ${busy ? "disabled" : ""}>📷 Câmera</button>` : ""}</form>${cameraTarget === "fulfillment" ? cameraBox() : ""}${
          fulfillmentFeedback ? `<div class="validation">⚠ ${esc(fulfillmentFeedback)}</div>` : ""
        }<button class="btn primary" style="width:100%;margin-top:16px" data-action="confirm-separation" ${busy || !done ? "disabled" : ""}>${busy ? "Confirmando…" : "Confirmar separação"}</button>`
      : f.status === "separated"
        ? `<button class="btn primary" style="width:100%;margin-top:16px" data-action="dispatch-from-modal" ${busy ? "disabled" : ""}>${busy ? "Despachando…" : "Despachar pedido"}</button>`
        : `<div class="validation ok" style="margin-top:16px">✓ Pedido despachado.</div><div class="actions" style="margin-top:12px">${f.invoiceId ? `<button class="btn" data-doc="invoice:${f.invoiceId}">Ver NF</button>` : ""}${f.labelId ? `<button class="btn" data-doc="label:${f.labelId}">Ver etiqueta</button>` : ""}</div>`
  }<p class="caption">Cada bipagem confere o item físico contra o pedido do marketplace e só libera a etiqueta quando tudo bate — evitando erro de separação.</p></section></div>`;
}
// Visualizador de NF e etiqueta simuladas (documentos demonstrativos, sem validade fiscal)
function docDetail() {
  const [type, id] = String(docModal).split(":");
  if (type === "invoice") {
    const inv = state.invoices.find((i) => i.id === id);
    if (!inv) return "";
    return `<div class="modal-overlay"><section class="drawer" role="dialog" aria-modal="true" aria-labelledby="doc-title"><div class="drawer-top"><span class="wedtech-label">NOTA FISCAL SIMULADA</span><button class="close" data-action="close-doc" aria-label="Fechar documento">×</button></div><h1 id="doc-title">${esc(inv.id)}</h1><p class="muted" style="font-size:13px;margin-top:8px">Chave de acesso demonstrativa: ${esc(inv.key.replace(/(.{4})/g, "$1 ").trim())}</p><div class="qr-box">${renderQR("NFe|" + inv.id + "|" + inv.key + "|" + inv.total, 140)}<span class="caption">QR real — leia com a câmera do celular para conferir os dados abaixo</span></div><div class="validation" style="margin-top:16px">⚠ Documento demonstrativo gerado pelo protótipo. Não possui validade fiscal.</div><h3 style="margin-top:24px;margin-bottom:12px">Itens</h3>${inv.items
      .map(
        (it) =>
          `<div class="channel-row"><span>${esc(it.name)}<small style="display:block">${esc(it.sku)} · Qtd. ${it.qty}</small></span><b style="margin-left:auto">${money(it.price * it.qty)}</b></div>`,
      )
      .join(
        "",
      )}<div class="detail-stats" style="grid-template-columns:1fr"><div><small>Total da nota</small><strong>${money(inv.total)}</strong></div></div><p class="caption">Emitida em ${esc(inv.date)}${inv.context?.store ? " · " + esc(inv.context.store) : inv.context?.fulfillmentId ? " · Pedido " + esc(inv.context.fulfillmentId) : ""}.</p></section></div>`;
  }
  if (type === "label") {
    const lbl = state.labels.find((l) => l.id === id);
    if (!lbl) return "";
    const c = channels.find((c) => c.id === lbl.channel);
    return `<div class="modal-overlay"><section class="drawer" role="dialog" aria-modal="true" aria-labelledby="doc-title"><div class="drawer-top"><span class="wedtech-label">ETIQUETA DE ENVIO SIMULADA</span><button class="close" data-action="close-doc" aria-label="Fechar documento">×</button></div><h1 id="doc-title">${esc(lbl.trackingCode)}</h1><div class="qr-box">${renderQR("WT|" + lbl.trackingCode + "|" + lbl.fulfillmentId, 140)}<span class="caption">QR real com o código de rastreio</span></div><div class="validation" style="margin-top:16px">⚠ Etiqueta demonstrativa. Não é um código de rastreio real.</div><div class="detail-stats" style="grid-template-columns:repeat(2,1fr)"><div><small>Canal</small><strong>${esc(c?.name || "—")}</strong></div><div><small>Peso estimado</small><strong>${lbl.weight} kg</strong></div></div><h3 style="margin-top:24px;margin-bottom:12px">Destinatário</h3><p style="font-size:14px">${esc(lbl.recipient)}</p><p class="caption">Pedido ${esc(lbl.fulfillmentId)} · Gerada em ${esc(lbl.date)}.</p></section></div>`;
  }
  return "";
}
// Tour guiado — mostrado uma vez após o primeiro login, dispensável a qualquer momento
function tourOverlay() {
  const step = tourSlides[tourStep];
  const last = tourStep === tourSlides.length - 1;
  return `<div class="modal-overlay" style="justify-content:center;align-items:center"><section class="tour-card" role="dialog" aria-modal="true" aria-labelledby="tour-title"><div class="tour-icon">${icon(step.icon)}</div><div class="tour-dots">${tourSlides.map((_, i) => `<span class="${i === tourStep ? "on" : ""}"></span>`).join("")}</div><h2 id="tour-title">${esc(step.title)}</h2><p>${esc(step.text)}</p><div class="tour-actions"><button type="button" class="link" data-action="tour-skip">Pular tour</button><button type="button" class="btn primary" data-action="tour-next">${last ? "Começar" : "Próximo →"}</button></div></section></div>`;
}
// Configurações — empresa, lojas/CDs, produtos, canais e operadores
function configPage() {
  const c = state.company;
  return (
    heading(
      "Configurações",
      "Dados da empresa, lojas, produtos e canais em um único lugar.",
    ) +
    `<div class="bottom-grid"><section class="card"><div class="section-head"><h2>Dados da empresa</h2></div><form id="company-form" class="form-grid"><div class="field full"><label for="company-name">Razão social</label><input id="company-name" name="name" value="${esc(c.name)}" required maxlength="120"></div><div class="field"><label for="company-cnpj">CNPJ</label><input id="company-cnpj" name="cnpj" value="${esc(c.cnpj)}" required maxlength="20"></div><div class="field"><label for="company-ie">Inscrição Estadual</label><input id="company-ie" name="ie" value="${esc(c.ie)}" maxlength="30"></div><div class="field full"><button class="btn primary" type="submit">Salvar dados da empresa</button></div></form></section><section class="card"><div class="section-head"><h2>Canais conectados</h2><a class="link" href="#marketplaces">Gerenciar →</a></div>${channels
      .filter((ch) => ch.id !== "lp")
      .map(
        (ch) =>
          `<div class="channel-row">${logo(ch.id)}<div>${ch.name}</div>${badge(state.connected.includes(ch.id) ? "Conectado" : "Não conectado", state.connected.includes(ch.id) ? "" : "neutral")}</div>`,
      )
      .join(
        "",
      )}</section></div><section class="card" style="margin-top:22px"><div class="section-head"><div><h2>Lojas e centros de distribuição</h2><p>O estoque é único e compartilhado, mas fisicamente centralizado no <b>Galpão Principal</b> — é de lá que a separação de pedidos e a reposição das lojas partem.</p></div><button class="btn primary" data-action="toggle-store-form">${storeFormOpen ? "Cancelar" : "+ Nova loja"}</button></div>${
      storeFormOpen
        ? '<form id="store-form" class="form-grid" style="margin-bottom:22px"><div class="field"><label for="store-name">Nome</label><input id="store-name" name="name" required maxlength="80" placeholder="Ex.: Loja Vila Mariana"></div><div class="field"><label for="store-type">Tipo</label><select id="store-type" name="type"><option value="loja">Loja física</option><option value="cd">Centro de distribuição</option></select></div><div class="field"><label for="store-cnpj">CNPJ</label><input id="store-cnpj" name="cnpj" required maxlength="20" placeholder="00.000.000/0000-00"></div><div class="field"><label for="store-address">Endereço</label><input id="store-address" name="address" maxlength="140"></div><div class="field full"><button class="btn primary" type="submit">Cadastrar loja</button></div></form>'
        : ""
    }<div class="table-wrap"><table><thead><tr><th>Loja</th><th>Tipo</th><th>CNPJ</th><th>Endereço</th><th>Status</th></tr></thead><tbody>${state.stores
      .map(
        (s) =>
          `<tr><td><b>${esc(s.name)}</b>${s.hub ? " " + badge("🏭 Galpão Principal") : ""}</td><td class="muted">${s.type === "cd" ? "Centro de distribuição" : "Loja física"}</td><td class="muted">${esc(s.cnpj)}</td><td class="muted">${esc(s.address)}</td><td>${badge(s.active ? "Ativa" : "Inativa", s.active ? "" : "neutral")}</td></tr>`,
      )
      .join(
        "",
      )}</tbody></table></div></section><section class="card" style="margin-top:22px"><div class="section-head"><div><h2>Fornecedores</h2><p>Usados na geração automática de pedidos de compra do Estoque Inteligente.</p></div><button class="btn primary" data-action="toggle-supplier-form">${supplierFormOpen ? "Cancelar" : "+ Novo fornecedor"}</button></div>${
      supplierFormOpen
        ? '<form id="supplier-form" class="form-grid" style="margin-bottom:22px"><div class="field"><label for="supplier-name">Nome</label><input id="supplier-name" name="name" required maxlength="80" placeholder="Ex.: Distribuidora Beta"></div><div class="field"><label for="supplier-cnpj">CNPJ</label><input id="supplier-cnpj" name="cnpj" required maxlength="20" placeholder="00.000.000/0000-00"></div><div class="field"><label for="supplier-contact">Contato</label><input id="supplier-contact" name="contact" maxlength="120" placeholder="email@fornecedor.com.br"></div><div class="field"><label for="supplier-lead">Prazo de entrega (dias)</label><input id="supplier-lead" name="leadTimeDays" type="number" min="1" max="60" value="5"></div><div class="field full"><button class="btn primary" type="submit">Cadastrar fornecedor</button></div></form>'
        : ""
    }<div class="table-wrap"><table><thead><tr><th>Fornecedor</th><th>CNPJ</th><th>Contato</th><th>Prazo de entrega</th></tr></thead><tbody>${state.suppliers
      .map(
        (sp) =>
          `<tr><td><b>${esc(sp.name)}</b></td><td class="muted">${esc(sp.cnpj)}</td><td class="muted">${esc(sp.contact)}</td><td class="muted">${sp.leadTimeDays} dia(s)</td></tr>`,
      )
      .join(
        "",
      )}</tbody></table></div></section><section class="card" style="margin-top:22px"><div class="section-head"><div><h2>Produtos</h2><p>Cadastro central de produtos, SKU e código de barras.</p></div><a class="link" href="#one">+ Novo produto →</a></div><div class="market-stats"><div><strong>${state.products.length}</strong><small>Produtos cadastrados</small></div><div><strong>${state.products.reduce((a, p) => a + p.stock, 0)}</strong><small>Unidades em estoque</small></div><div><strong>${state.products.filter((p) => p.barcode).length}</strong><small>Com código de barras</small></div></div><a class="link" href="#produtos">Abrir catálogo completo →</a></section><section class="card" style="margin-top:22px"><div class="section-head"><h2>Operadores</h2><span class="muted" style="font-size:12px">Ilustrativo · sem autenticação nesta demonstração</span></div>${operators
      .map(
        (o) =>
          `<div class="channel-row"><span class="avatar">${o.initials}</span><div>${o.name}<div class="muted" style="font-size:12px">${o.role} · ${o.store}</div></div></div>`,
      )
      .join("")}</section>`
  );
}
// Financeiro — receita, custo, lucro e despesas
function financeiro() {
  const fin = financials(state);
  const kpis = [
    ["Receita", money(fin.revenue), "Vendas de hoje", "sale"],
    ["Custo das vendas", money(fin.cogs), "CMV de hoje", "stock"],
    [
      "Lucro bruto",
      money(fin.grossProfit),
      "Margem de " + fin.grossMargin + "%",
      "financeiro",
    ],
    ["Despesas", money(fin.totalExpenses), "Rateio de hoje", "orders"],
    [
      "Lucro líquido",
      money(fin.netProfit),
      fin.netProfit >= 0 ? "Operação no azul" : "Operação no vermelho",
      "financeiro",
    ],
  ];
  const margins = state.products
    .map((p) => ({
      ...p,
      marginPct:
        p.price > 0
          ? Math.round(((p.price - (p.cost ?? 0)) / p.price) * 1000) / 10
          : 0,
    }))
    .sort((a, b) => a.marginPct - b.marginPct);
  return (
    heading(
      "Financeiro",
      "Receita, custo, lucro e despesas da operação — tudo em um só lugar.",
      `<button class="btn" data-action="export-despesas-csv">⇩ Exportar CSV</button><button class="btn primary" data-action="toggle-expense-form" ${busy ? "disabled" : ""}>${expenseFormOpen ? "Cancelar" : "+ Nova despesa"}</button>`,
    ) +
    `<div class="kpis" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr))">${kpis
      .map(
        (k) =>
          `<div class="card kpi"><div class="kpi-label">${icon(k[3])}${k[0]}</div><strong style="${k[0] === "Lucro líquido" ? "color:" + (fin.netProfit >= 0 ? "#2f6fb2" : "#b9574d") : ""}">${k[1]}</strong><small>${k[2]}</small></div>`,
      )
      .join(
        "",
      )}</div><section class="card"><div class="section-head"><div><h2>Despesas operacionais</h2><p>Custos fixos e variáveis rateados no período de hoje.</p></div></div>${
      expenseFormOpen
        ? '<form id="expense-form" class="form-grid" style="margin-bottom:22px"><div class="field"><label for="expense-category">Categoria</label><select id="expense-category" name="category"><option>Aluguel</option><option>Marketing</option><option>Frete</option><option>Salários</option><option>Embalagens</option><option>Taxas de marketplace</option><option>Outros</option></select></div><div class="field"><label for="expense-amount">Valor (R$)</label><input id="expense-amount" name="amount" type="number" min="0.01" step=".01" required></div><div class="field full"><label for="expense-description">Descrição</label><input id="expense-description" name="description" maxlength="140" placeholder="Ex.: Anúncios patrocinados"></div><div class="field full"><button class="btn primary" type="submit">Registrar despesa</button></div></form>'
        : ""
    }<div class="table-wrap"><table><thead><tr><th>Categoria</th><th>Descrição</th><th>Data</th><th>Valor</th></tr></thead><tbody>${state.expenses
      .map(
        (e) =>
          `<tr><td><b>${esc(e.category)}</b></td><td class="muted">${esc(e.description)}</td><td class="muted">${esc(e.date)}</td><td>${money(e.amount)}</td></tr>`,
      )
      .join(
        "",
      )}</tbody></table>${state.expenses.length ? "" : '<div class="empty">Nenhuma despesa registrada.</div>'}<div class="table-footer">Total: ${money(fin.totalExpenses)}</div></div></section><section class="card" style="margin-top:22px"><div class="section-head"><div><h2>Margem por produto</h2><p>Preço de venda × custo de aquisição, ordenado pelos menores primeiro.</p></div></div><div class="table-wrap"><table><thead><tr><th>Produto</th><th>Custo</th><th>Preço</th><th>Margem</th></tr></thead><tbody>${margins
      .map(
        (p) =>
          `<tr><td><b>${esc(p.name)}</b></td><td class="muted">${money(p.cost ?? 0)}</td><td class="muted">${money(p.price)}</td><td><b style="color:${p.marginPct < 30 ? "#b9574d" : "inherit"}">${p.marginPct}%</b></td></tr>`,
      )
      .join(
        "",
      )}</tbody></table></div></section><div class="ai-strip" style="margin-top:22px"><span class="spark">✧</span><div><h2>Pergunte pelo seu lucro.</h2><p>A WedTech AI responde sobre receita, custo, despesas e lucro líquido a qualquer momento.</p></div><a class="link" href="#ai">Conversar com WedTech AI ↗</a></div>`
  );
}
// WedTech AI
const suggestions = [
  "Quais produtos precisam de atenção?",
  "Tenho risco de ficar sem estoque?",
  "Quais produtos estão vendendo mais?",
  "Existem erros nos meus anúncios?",
  "Resuma minha operação.",
  "Tenho pedidos de compra em aberto?",
  "Qual meu lucro hoje?",
];
function ai(m) {
  return (
    heading(
      "WedTech AI",
      "Seu copiloto inteligente para decisões do dia a dia.",
      badge("✧ Inteligência simulada", "neutral"),
    ) +
    `<div class="ai-layout"><section class="card chat"><div class="chat-hello"><span class="spark">✧</span><h2>Olá. Sou o WedTech AI.</h2><p>Analiso sua operação e posso ajudar você a entender seus produtos, estoques, vendas e marketplaces.</p></div><div class="suggestions">${suggestions.map((s, i) => `<button data-ask="${i}" ${busy ? "disabled" : ""}>${s}</button>`).join("")}</div><div class="messages" aria-live="polite">${chat.map((c) => `<div class="message ${c.role}"><small>${c.role === "user" ? "Você" : "✧ WedTech AI · análise dos dados locais"}</small>${esc(c.text)}</div>`).join("")}${busy ? '<div class="message"><span class="spin"></span>Analisando sua operação...</div>' : ""}</div><form class="chat-form" id="chat-form"><input name="question" placeholder="Pergunte sobre sua operação..." aria-label="Pergunta para WedTech AI" required maxlength="500" ${busy ? "disabled" : ""}><button class="btn primary" ${busy ? "disabled" : ""} aria-label="Enviar pergunta">Enviar ↑</button></form><p class="caption">Respostas pré-programadas com base nos dados atuais da demonstração.</p></section><aside class="card ai-context"><div class="wedtech-label">CONTEXTO DA OPERAÇÃO</div><h2>Uma visão conectada</h2>${[
      ["Vendas hoje", money(m.revenue)],
      ["Pedidos", m.orders],
      ["Produtos", m.products],
      ["Unidades em estoque", m.stock],
      ["Marketplaces", m.connected],
    ]
      .map(
        ([l, v]) => `<div class="context-item">${l}<strong>${v}</strong></div>`,
      )
      .join(
        "",
      )}<p class="caption">O copiloto acompanha as alterações simuladas no seu catálogo e estoque.</p><div class="validation ok">✓ Dados locais atualizados</div></aside></div>`
  );
}
// Form data and asynchronous actions
function readDraft(form) {
  for (const key of [
    "name",
    "brand",
    "sku",
    "barcode",
    "category",
    "price",
    "stock",
    "description",
    "features",
  ])
    draft[key] = form.elements[key].value.trim();
}
async function prepare(form) {
  readDraft(form);
  selected = Array.from(form.querySelectorAll('[name="channel"]:checked')).map(
    (el) => el.value,
  );
  if (!selected.length) return toast("Selecione pelo menos um marketplace.");
  if (
    state.products.some((p) => p.sku.toLowerCase() === draft.sku.toLowerCase())
  )
    return toast(
      "Este SKU já existe. Use um SKU diferente para o novo produto.",
    );
  if (!draft.name || !draft.brand || !draft.sku || !draft.description)
    return toast("Preencha os campos obrigatórios.");
  busy = true;
  oneStage = 1;
  progress = 0;
  render();
  for (let i = 1; i <= 5; i++) {
    await pause(330);
    progress = i;
    render();
  }
  ads = selected.map((id) => ({
    channel: id,
    title:
      id === "ml"
        ? draft.name + " " + draft.brand + " Original"
        : id === "sh"
          ? draft.name +
            " | " +
            draft.category +
            " · Qualidade e conforto para todos os momentos do seu dia"
          : id === "tk"
            ? draft.name + " ✨ Seu novo favorito para o dia a dia"
            : draft.name + " - " + draft.brand,
    description:
      id === "ml"
        ? draft.description + " Características: " + draft.features
        : id === "sh"
          ? "Conheça " + draft.name + ". " + draft.description
          : id === "tk"
            ? "Descubra " + draft.name + "! " + draft.description
            : draft.description,
    warning:
      id === "ml"
        ? "GTIN não informado."
        : id === "sh"
          ? "Título ultrapassa o tamanho recomendado."
          : "",
    fixed: false,
  }));
  oneStage = 2;
  busy = false;
  render();
}
async function askDashboard(q) {
  if (busy || !q.trim()) return;
  busy = true;
  dashboardAiResponse = "";
  render();
  await pause(550);
  dashboardAiResponse = answer(state, q);
  busy = false;
  render();
  $("#dashboard-ai-form input")?.focus();
}
async function ask(q) {
  if (busy || !q.trim()) return;
  chat.push({ role: "user", text: q.trim() });
  busy = true;
  render();
  await pause(650);
  chat.push({ role: "assistant", text: answer(state, q) });
  busy = false;
  render();
  $("#chat-form input")?.focus();
  $(".messages")?.lastElementChild?.scrollIntoView({
    behavior: "smooth",
    block: "nearest",
  });
}
// Leitor IoT: bipagem de saída (venda balcão) ou entrada (recebimento) na loja física
async function handleScan(form) {
  if (busy) return;
  const code = form.elements.code.value;
  const qty = form.elements.qty ? form.elements.qty.value : 1;
  busy = true;
  scanFeedback = null;
  render();
  await pause(500);
  try {
    if (scanMode === "saida") {
      const { product } = scanSale(state, code, scanStoreId);
      scanFeedback = {
        type: "ok",
        text:
          "Venda registrada: " +
          product.name +
          ". Estoque sincronizado: " +
          product.stock +
          " unidades.",
      };
      toast("Leitura confirmada. Estoque sincronizado em todos os canais.");
    } else {
      const product = scanReceive(state, code, qty, scanStoreId);
      scanFeedback = {
        type: "ok",
        text:
          "Entrada registrada: " +
          product.name +
          ". Novo estoque: " +
          product.stock +
          " unidades.",
      };
      toast("Entrada de mercadoria registrada.");
    }
    save();
  } catch (err) {
    scanFeedback = { type: "error", text: err.message };
  }
  busy = false;
  render();
  $("#scan-code")?.focus();
}
// Bipagem de um item durante a separação de um pedido
async function handleFulfillmentScan(form) {
  if (busy || !fulfillmentModal) return;
  const code = form.elements.code.value;
  busy = true;
  fulfillmentFeedback = "";
  render();
  await pause(400);
  try {
    scanFulfillmentItem(state, fulfillmentModal, code);
    save();
  } catch (err) {
    fulfillmentFeedback = err.message;
  }
  busy = false;
  render();
  $("#fulfillment-scan-code")?.focus();
}
// Bipagem por câmera — complemento do campo de texto, nunca o substitui: se a
// câmera falhar (sem suporte, permissão negada, sem hardware), o texto continua
// funcionando normalmente.
function attachCameraPreview() {
  const v = $("#camera-preview");
  if (v && cameraStream && v.srcObject !== cameraStream) {
    v.srcObject = cameraStream;
    v.play().catch(() => {});
  }
}
function stopCamera() {
  cameraTarget = null;
  cameraError = "";
  if (cameraLoopId) cancelAnimationFrame(cameraLoopId);
  cameraLoopId = null;
  if (cameraStream) {
    cameraStream.getTracks().forEach((t) => t.stop());
    cameraStream = null;
  }
}
async function startCamera(target) {
  if (busy) return;
  cameraError = "";
  if (!("BarcodeDetector" in window)) {
    cameraError =
      "Seu navegador não suporta leitura por câmera (BarcodeDetector). Use o campo de texto.";
    cameraTarget = target;
    render();
    return;
  }
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: false,
    });
  } catch {
    cameraError =
      "Não foi possível acessar a câmera (permissão negada ou indisponível). Use o campo de texto.";
    cameraTarget = target;
    render();
    return;
  }
  cameraTarget = target;
  render();
  const detector = new window.BarcodeDetector({
    formats: ["ean_13", "ean_8", "code_128", "upc_a", "upc_e", "qr_code"],
  });
  const tick = async () => {
    if (cameraTarget !== target || !cameraStream) return;
    const video = $("#camera-preview");
    if (video && video.readyState >= 2) {
      try {
        const codes = await detector.detect(video);
        if (codes.length) {
          const value = codes[0].rawValue;
          stopCamera();
          if (target === "store") {
            const input = $("#scan-code");
            if (input) {
              input.value = value;
              handleScan($("#scan-form"));
            }
          } else {
            const input = $("#fulfillment-scan-code");
            if (input) {
              input.value = value;
              handleFulfillmentScan($("#fulfillment-scan-form"));
            }
          }
          return;
        }
      } catch {}
    }
    cameraLoopId = requestAnimationFrame(tick);
  };
  cameraLoopId = requestAnimationFrame(tick);
}
// Cadastro de loja/CD no painel de configurações
function handleAddStore(form) {
  try {
    const store = addStore(state, {
      name: form.elements.name.value,
      type: form.elements.type.value,
      cnpj: form.elements.cnpj.value,
      address: form.elements.address.value,
    });
    save();
    storeFormOpen = false;
    toast("Nova loja cadastrada: " + store.name + ".");
  } catch (err) {
    toast(err.message);
  }
  render();
}
// Dados da empresa no painel de configurações
function handleSaveCompany(form) {
  const name = form.elements.name.value.trim(),
    cnpj = form.elements.cnpj.value.trim(),
    ie = form.elements.ie.value.trim();
  if (!name || !cnpj) return toast("Informe nome e CNPJ da empresa.");
  state.company = { name, cnpj, ie };
  state.history.unshift({
    text: "Dados da empresa atualizados",
    time: "Agora",
  });
  save();
  toast("Dados da empresa atualizados.");
  render();
}
// Login — protótipo sem autenticação real: qualquer e-mail/senha válidos entram.
async function handleLogin(form) {
  if (loginBusy) return;
  const email = form.elements.email.value.trim();
  const password = form.elements.password.value;
  if (!email || !password) {
    loginError = "Informe e-mail e senha.";
    render();
    return;
  }
  loginBusy = true;
  loginError = "";
  render();
  await pause(650);
  loginBusy = false;
  loggedIn = true;
  try {
    sessionStorage.setItem("wedtech-session", "1");
  } catch {}
  tourStep = seenTour() ? null : 0;
  render();
}
function seenTour() {
  try {
    return localStorage.getItem("wedtech-tour-seen") === "1";
  } catch {
    return true;
  }
}
function logout() {
  loggedIn = false;
  loginError = "";
  stopLive();
  stopCamera();
  try {
    sessionStorage.removeItem("wedtech-session");
  } catch {}
  render();
}
// Cadastro de fornecedor no painel de configurações
function handleAddSupplier(form) {
  try {
    const supplier = addSupplier(state, {
      name: form.elements.name.value,
      cnpj: form.elements.cnpj.value,
      contact: form.elements.contact.value,
      leadTimeDays: form.elements.leadTimeDays.value,
    });
    save();
    supplierFormOpen = false;
    toast("Novo fornecedor cadastrado: " + supplier.name + ".");
  } catch (err) {
    toast(err.message);
  }
  render();
}
// Registro de despesa no Financeiro
function handleAddExpense(form) {
  try {
    addExpense(state, {
      category: form.elements.category.value,
      amount: form.elements.amount.value,
      description: form.elements.description.value,
      date: "Hoje",
    });
    save();
    expenseFormOpen = false;
    toast("Despesa registrada.");
  } catch (err) {
    toast(err.message);
  }
  render();
}
// Geração automática de pedidos de compra a partir da previsão de ruptura
async function autoPO() {
  if (busy) return;
  busy = true;
  render();
  await pause(600);
  const created = autoGeneratePurchaseOrders(state);
  save();
  busy = false;
  render();
  toast(
    created.length
      ? created.length + " pedido(s) de compra gerado(s) automaticamente."
      : "Nenhum produto abaixo do mínimo com fornecedor definido no momento.",
  );
}
async function sendPO(id) {
  if (busy) return;
  busy = true;
  render();
  await pause(500);
  try {
    const po = sendPurchaseOrder(state, id);
    save();
    toast("Pedido " + po.id + " enviado ao fornecedor.");
  } catch (err) {
    toast(err.message);
  }
  busy = false;
  render();
}
async function receivePO(id) {
  if (busy) return;
  busy = true;
  render();
  await pause(600);
  try {
    const po = receivePurchaseOrder(state, id);
    save();
    toast("Pedido " + po.id + " recebido. Estoque reposto.");
  } catch (err) {
    toast(err.message);
  }
  busy = false;
  render();
}
// Simula a contagem física do produto com maior risco de ruptura no momento
async function simulateCount() {
  if (busy) return;
  const risk = forecast(state).filter((f) => f.risk !== "ok");
  const target = risk[0] || forecast(state).sort((a, b) => a.stock - b.stock)[0];
  if (!target) return toast("Nenhum produto disponível para contagem.");
  busy = true;
  render();
  await pause(600);
  simulateInventoryCount(state, target.productId);
  save();
  busy = false;
  render();
  toast("Contagem física registrada para " + target.name + ".");
}
async function resolveCheck(id) {
  if (busy) return;
  busy = true;
  render();
  await pause(500);
  try {
    const c = resolveInventoryCheck(state, id);
    save();
    toast("Estoque de " + c.name + " corrigido para " + c.countedStock + " un.");
  } catch (err) {
    toast(err.message);
  }
  busy = false;
  render();
}
// Operação ao vivo: gera eventos simulados periodicamente para manter a demo em movimento
async function liveTick() {
  const inStock = state.products.filter((p) => p.stock > 3);
  if (!inStock.length) return;
  const opts = ["ml", "sh", "tk"];
  const channel = opts[Math.floor(Math.random() * opts.length)];
  try {
    newFulfillment(state, channel);
    save();
    render();
  } catch {}
}
function scheduleLiveTick() {
  liveTimer = setTimeout(async () => {
    if (!liveMode) return;
    await liveTick();
    scheduleLiveTick();
  }, 9000);
}
function stopLive() {
  liveMode = false;
  if (liveTimer) clearTimeout(liveTimer);
  liveTimer = null;
}
// DOM events
document.addEventListener("submit", (e) => {
  if (e.target.id === "login-form") {
    e.preventDefault();
    handleLogin(e.target);
  }
  if (e.target.id === "product-form") {
    e.preventDefault();
    prepare(e.target);
  }
  if (e.target.id === "chat-form") {
    e.preventDefault();
    ask(e.target.elements.question.value);
  }
  if (e.target.id === "dashboard-ai-form") {
    e.preventDefault();
    askDashboard(e.target.elements.question.value);
  }
  if (e.target.id === "scan-form") {
    e.preventDefault();
    handleScan(e.target);
  }
  if (e.target.id === "fulfillment-scan-form") {
    e.preventDefault();
    handleFulfillmentScan(e.target);
  }
  if (e.target.id === "store-form") {
    e.preventDefault();
    handleAddStore(e.target);
  }
  if (e.target.id === "company-form") {
    e.preventDefault();
    handleSaveCompany(e.target);
  }
  if (e.target.id === "supplier-form") {
    e.preventDefault();
    handleAddSupplier(e.target);
  }
  if (e.target.id === "expense-form") {
    e.preventDefault();
    handleAddExpense(e.target);
  }
});
document.addEventListener("input", (e) => {
  if (e.target.id === "search") {
    query = e.target.value;
    const pos = e.target.selectionStart;
    render();
    $("#search").focus();
    if (pos !== null) $("#search").setSelectionRange(pos, pos);
  }
  if (
    e.target.closest("#product-form") &&
    e.target.name &&
    e.target.name !== "channel"
  )
    draft[e.target.name] = e.target.value;
});
document.addEventListener("change", (e) => {
  if (e.target.name === "channel") {
    selected = Array.from(
      document.querySelectorAll('[name="channel"]:checked'),
    ).map((el) => el.value);
  }
  if (e.target.id === "scan-store") {
    scanStoreId = e.target.value;
  }
  if (e.target.id === "image") {
    const file = e.target.files[0];
    if (!file) return;
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      file.size > 1024 * 1024
    ) {
      toast("Selecione uma imagem PNG, JPG ou WebP de até 1 MB.");
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      draft.image = reader.result;
      render();
    };
    reader.readAsDataURL(file);
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (cameraTarget) {
    stopCamera();
    render();
    return;
  }
  if (docModal && !busy) {
    docModal = null;
    render();
    return;
  }
  if (fulfillmentModal && !busy) {
    fulfillmentModal = null;
    render();
    return;
  }
  if (modal && !busy) {
    modal = null;
    render();
    return;
  }
  if (notifPanelOpen) {
    notifPanelOpen = false;
    render();
    return;
  }
  if (menu) {
    menu = false;
    render();
    $(".mobile-menu")?.focus();
    return;
  }
  if (sidebarOpen) {
    sidebarOpen = false;
    render();
    $(".sidebar-toggle")?.focus();
  }
});
document.addEventListener("click", async (e) => {
  const el = e.target.closest("button");
  if (!el) return;
  const a = el.dataset.action;
  if (el.dataset.product) {
    if (busy) return;
    modal = el.dataset.product;
    syncText = "";
    render();
    return;
  }
  if (el.dataset.fulfillment) {
    if (busy) return;
    fulfillmentModal = el.dataset.fulfillment;
    fulfillmentFeedback = "";
    render();
    return;
  }
  if (el.dataset.cameraStart) {
    startCamera(el.dataset.cameraStart);
    return;
  }
  if (el.dataset.dispatch) {
    if (busy) return;
    busy = true;
    render();
    await pause(600);
    try {
      dispatchFulfillment(state, el.dataset.dispatch);
      save();
      toast("Pedido despachado. Saiu para entrega.");
    } catch (err) {
      toast(err.message);
    }
    busy = false;
    render();
    return;
  }
  if (el.dataset.doc) {
    if (busy) return;
    docModal = el.dataset.doc;
    render();
    return;
  }
  if (el.dataset.sendPo) return sendPO(el.dataset.sendPo);
  if (el.dataset.receivePo) return receivePO(el.dataset.receivePo);
  if (el.dataset.resolveCheck) return resolveCheck(el.dataset.resolveCheck);
  if (el.dataset.ask !== undefined)
    return ask(suggestions[Number(el.dataset.ask)]);
  if (el.dataset.dashboardAsk !== undefined)
    return askDashboard(suggestions[Number(el.dataset.dashboardAsk)]);
  if (el.dataset.connect) {
    if (busy) return;
    busy = true;
    render();
    await pause(900);
    state.connected.push(el.dataset.connect);
    state.history.unshift({
      text: "Magalu conectado em modo demonstração",
      time: "Agora",
    });
    save();
    busy = false;
    render();
    toast("Marketplace conectado com sucesso.");
    return;
  }
  if (a === "menu") {
    menu = !menu;
    render();
    (menu ? $(".sidebar-toggle") : $(".mobile-menu"))?.focus();
  }
  if (a === "sidebar") {
    if (menu) menu = false;
    else sidebarOpen = !sidebarOpen;
    render();
    $(".sidebar-toggle")?.focus();
  }
  if (a === "close" && !busy) {
    modal = null;
    render();
  }
  if (a === "new") {
    if (busy) return;
    draft = blank();
    oneStage = 0;
    go("one");
    render();
  }
  if (a === "example") {
    draft = {
      ...blank(),
      name: "Nike Revolution 8",
      brand: "Nike",
      sku: "NK-RV8-" + String(state.products.length + 1).padStart(3, "0"),
      barcode: "7891234509999",
      category: "Calçados",
      price: 399.9,
      stock: 18,
      description:
        "Tênis masculino para corrida. Conforto e leveza para o seu dia a dia.",
      features:
        "Cabedal respirável, amortecimento em espuma, solado emborrachado",
    };
    render();
    toast("Exemplo preenchido. Você pode editar todos os campos.");
  }
  if (a === "edit-one" && !busy) {
    oneStage = 0;
    render();
  }
  if (a === "another") {
    draft = blank();
    oneStage = 0;
    ads = [];
    publishedId = null;
    render();
  }
  if (a === "fix-ads" && !busy) {
    busy = true;
    render();
    await pause(850);
    ads.forEach((ad) => {
      ad.fixed = true;
      if (ad.channel === "sh")
        ad.title = (draft.name + " | " + draft.category).slice(0, 70);
      if (ad.channel === "ml") ad.gtin = "DEMO-SEM-GTIN";
    });
    busy = false;
    oneStage = 3;
    render();
    toast("Todos os anúncios estão prontos.");
  }
  if (a === "publish" && !busy) {
    if (ads.some((ad) => ad.warning && !ad.fixed)) return;
    busy = true;
    oneStage = 4;
    progress = 0;
    render();
    for (let i = 0; i < selected.length; i++) {
      await pause(500);
      progress = i + 1;
      render();
    }
    try {
      const p = publish(state, draft, selected, ads);
      publishedId = p.id;
      for (const id of selected)
        if (!state.connected.includes(id)) state.connected.push(id);
      save();
      oneStage = 5;
      toast("Produto distribuído com sucesso. Publicação simulada.");
    } catch (err) {
      oneStage = 3;
      toast(err.message);
    }
    busy = false;
    render();
  }
  if (a === "sell" && !busy) {
    const id = modal,
      p = state.products.find((p) => p.id === id);
    if (!p || p.stock <= 0) return;
    const before = p.stock;
    busy = true;
    sell(state, id);
    save();
    syncText =
      "Nova venda recebida pelo Mercado Livre. Quantidade: 1. Estoque: " +
      before +
      " → " +
      p.stock +
      ". Sincronizando estoque...";
    render();
    toast("Nova venda recebida pelo Mercado Livre.");
    await pause(1300);
    busy = false;
    syncText =
      "✓ Estoque sincronizado. " +
      before +
      " → " +
      p.stock +
      " unidades em todos os canais publicados.";
    render();
    toast("Estoque sincronizado em todos os canais.");
  }
  if (a === "fix-product" && !busy) {
    const p = state.products.find((p) => p.id === modal);
    busy = true;
    render();
    await pause(850);
    p.issue = false;
    state.history.unshift({
      text: "Anúncio de " + p.name + " corrigido na Shopee",
      time: "Agora",
    });
    save();
    busy = false;
    render();
    toast("Título Shopee otimizado. Problema resolvido.");
  }
  if (a === "new-order" && !busy) {
    const opts = ["ml", "sh", "tk", "mg"].filter((id) =>
      state.connected.includes(id),
    );
    const pick = (opts.length ? opts : ["ml"])[
      state.fulfillments.length % (opts.length || 1)
    ];
    try {
      const f = newFulfillment(state, pick);
      save();
      toast("Novo pedido " + f.id + " aguardando separação.");
    } catch (err) {
      toast(err.message);
    }
    render();
  }
  if (a === "scan-mode-saida" && !busy) {
    scanMode = "saida";
    scanFeedback = null;
    render();
  }
  if (a === "scan-mode-entrada" && !busy) {
    scanMode = "entrada";
    scanFeedback = null;
    render();
  }
  if (a === "close-fulfillment" && !busy) {
    fulfillmentModal = null;
    render();
  }
  if (a === "confirm-separation" && !busy && fulfillmentModal) {
    busy = true;
    render();
    await pause(500);
    try {
      confirmSeparation(state, fulfillmentModal);
      save();
      toast("Pedido separado. Pronto para etiqueta.");
    } catch (err) {
      fulfillmentFeedback = err.message;
    }
    busy = false;
    render();
  }
  if (a === "dispatch-from-modal" && !busy && fulfillmentModal) {
    busy = true;
    render();
    await pause(500);
    try {
      dispatchFulfillment(state, fulfillmentModal);
      save();
      toast("Pedido despachado. Saiu para entrega.");
      fulfillmentModal = null;
    } catch (err) {
      fulfillmentFeedback = err.message;
    }
    busy = false;
    render();
  }
  if (a === "toggle-store-form" && !busy) {
    storeFormOpen = !storeFormOpen;
    render();
  }
  if (a === "toggle-supplier-form" && !busy) {
    supplierFormOpen = !supplierFormOpen;
    render();
  }
  if (a === "toggle-expense-form" && !busy) {
    expenseFormOpen = !expenseFormOpen;
    render();
  }
  if (a === "auto-po") return autoPO();
  if (a === "simulate-count") return simulateCount();
  if (a === "toggle-notifications") {
    notifPanelOpen = !notifPanelOpen;
    if (notifPanelOpen) {
      markNotificationsRead(state);
      save();
    }
    render();
  }
  if (a === "close-notifications") {
    notifPanelOpen = false;
    render();
  }
  if (a === "close-doc" && !busy) {
    docModal = null;
    render();
  }
  if (a === "toggle-live") {
    if (liveMode) stopLive();
    else {
      liveMode = true;
      scheduleLiveTick();
    }
    render();
  }
  if (a === "login-example") {
    $("#login-email").value = "demo@wedtech.com.br";
    $("#login-password").value = "wedtech123";
    loginError = "";
  }
  if (a === "logout" && !busy) logout();
  if (a === "stop-camera") {
    stopCamera();
    render();
  }
  if (a === "export-estoque-csv") {
    const f = forecast(state);
    downloadCSV(
      "wedtech-estoque.csv",
      ["Produto", "SKU", "Estoque", "Mínimo", "Dias até esgotar", "Situação"],
      state.products.map((p) => {
        const fc = f.find((x) => x.productId === p.id);
        return [
          p.name,
          p.sku,
          p.stock,
          p.minStock,
          fc?.daysToStockout ?? "",
          fc?.risk === "critico"
            ? "Crítico"
            : fc?.risk === "atencao"
              ? "Atenção"
              : fc?.risk === "excesso"
                ? "Estoque parado"
                : "OK",
        ];
      }),
    );
  }
  if (a === "export-despesas-csv") {
    downloadCSV(
      "wedtech-despesas.csv",
      ["Categoria", "Descrição", "Data", "Valor"],
      state.expenses.map((e) => [e.category, e.description, e.date, e.amount]),
    );
  }
  if (a === "tour-next") {
    tourStep = tourStep === null ? 0 : tourStep + 1;
    if (tourStep >= tourSlides.length) {
      tourStep = null;
      try {
        localStorage.setItem("wedtech-tour-seen", "1");
      } catch {}
    }
    render();
  }
  if (a === "tour-skip") {
    tourStep = null;
    try {
      localStorage.setItem("wedtech-tour-seen", "1");
    } catch {}
    render();
  }
  if (a === "reset" && !busy) $("#reset-dialog").showModal();
  if (a === "cancel-reset") $("#reset-dialog").close();
  if (a === "confirm-reset") {
    state = seed();
    draft = blank();
    oneStage = 0;
    selected = ["ml", "sh", "tk"];
    chat = [];
    dashboardAiResponse = "";
    query = "";
    modal = null;
    syncText = "";
    scanMode = "saida";
    scanStoreId = "st1";
    scanFeedback = null;
    fulfillmentModal = null;
    fulfillmentFeedback = "";
    storeFormOpen = false;
    supplierFormOpen = false;
    expenseFormOpen = false;
    notifPanelOpen = false;
    docModal = null;
    stopLive();
    stopCamera();
    save();
    go("dashboard");
    render();
    toast("Demonstração reiniciada.");
  }
});
document.addEventListener("keydown", (e) => {
  if (!modal && !fulfillmentModal && !docModal) return;
  if (e.key === "Escape" && !busy) {
    modal = null;
    fulfillmentModal = null;
    docModal = null;
    render();
  }
  if (e.key === "Tab") {
    const els = Array.from(
      document.querySelectorAll(
        ".drawer button:not(:disabled),.drawer a,.drawer input",
      ),
    );
    if (!els.length) return;
    const first = els[0],
      last = els.at(-1);
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
});
// Hash routing and optional browser-agent integration
function route() {
  const hash = location.hash.slice(1);
  page = routes[hash] ? hash : "dashboard";
  menu = false;
  modal = null;
  fulfillmentModal = null;
  docModal = null;
  notifPanelOpen = false;
  stopCamera();
  render();
  window.scrollTo(0, 0);
}
window.addEventListener("hashchange", route);
route();
// Optional browser agent interface; ordinary browsers do not need this API.
if (document.modelContext?.registerTool) {
  const lifecycle = new AbortController();
  try {
    Promise.resolve(
      document.modelContext.registerTool(
        {
          name: "get_wedtech_operation_summary",
          title: "Consultar operação WedTech",
          description:
            "Lê os indicadores atuais, saldos de estoque e análise local da demonstração. Não altera os dados.",
          inputSchema: {
            type: "object",
            properties: {},
            additionalProperties: false,
          },
          annotations: { readOnlyHint: true, untrustedContentHint: true },
          execute(input) {
            if (
              !input ||
              typeof input !== "object" ||
              Array.isArray(input) ||
              Object.keys(input).length
            )
              throw Error("Informe um objeto vazio.");
            return {
              metrics: metrics(state),
              products: state.products.map((p) => ({
                name: p.name,
                sku: p.sku,
                stock: p.stock,
              })),
              summary: answer(state, "Resuma minha operação."),
            };
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => {});
  } catch {}
  window.addEventListener("pagehide", () => lifecycle.abort(), { once: true });
}
