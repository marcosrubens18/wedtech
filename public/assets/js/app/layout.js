"use strict";
// Estrutura do painel: login, escolha do tipo de loja, menu lateral, topo,
// notificações, tour guiado, gavetas (drawers) e câmera.

const tourSlides = [
  {
    title: "Bem-vindo à WedTech",
    text: "Sua loja física, seu site, o WhatsApp e os marketplaces com um estoque só. Vamos ver o essencial em 4 passos.",
    icon: "inicio",
  },
  {
    title: "Comece pelo Início",
    text: "A tela Início mostra, em linguagem simples, o que precisa ser feito agora: pedidos para separar, clientes vindo retirar e produtos acabando.",
    icon: "pedidos",
  },
  {
    title: "Estoque com IoT",
    text: "Bipe produtos com o leitor ou com a câmera do celular. Sensores na prateleira avisam quando precisa repor a partir do depósito.",
    icon: "estoque",
  },
  {
    title: "A IA trabalha por você",
    text: "Defina o estoque mínimo: a IA prepara o pedido ao fornecedor e, se o produto acabar antes da entrega, pausa os anúncios nos marketplaces sozinha.",
    icon: "automacoes",
  },
];

// Tela de login — protótipo sem autenticação real: qualquer e-mail/senha entra.
function loginScreen() {
  return `<div class="login-screen"><div class="login-card"><div class="login-brand"><img src="assets/img/wedtech-symbol.png" alt="" width="46" height="46"><span class="login-word"><b>Wed</b>Tech</span></div><p class="login-tag">Tecnologia e conexão para o futuro.</p><form id="login-form"><div class="field"><label for="login-email">E-mail</label><input id="login-email" name="email" type="email" placeholder="voce@sualoja.com.br" autocomplete="username" required></div><div class="field" style="margin-top:14px"><label for="login-password">Senha</label><input id="login-password" name="password" type="password" placeholder="••••••••" autocomplete="current-password" required></div>${
    ui.loginError ? `<div class="validation" style="margin-top:14px">⚠ ${esc(ui.loginError)}</div>` : ""
  }<button class="btn primary" type="submit" style="width:100%;margin-top:20px" ${ui.loginBusy ? "disabled" : ""}>${ui.loginBusy ? '<span class="spin"></span>Entrando...' : "Entrar"}</button></form><button type="button" class="link login-example" data-action="login-example">Preencher exemplo</button><p class="login-note">Protótipo de demonstração — qualquer e-mail e senha funcionam. Nenhum dado é enviado a um servidor.</p><a class="login-back" href="index.html">← Voltar ao site</a></div></div>`;
}

// Primeiro acesso: o lojista escolhe o tipo da loja (muda só o catálogo de exemplo)
function setupScreen() {
  return `<div class="login-screen"><div class="setup-card"><div class="login-brand"><img src="assets/img/wedtech-symbol.png" alt="" width="40" height="40"><span class="login-word"><b>Wed</b>Tech</span></div><h1>Qual é o tipo da sua loja?</h1><p class="muted">A WedTech funciona para qualquer lojista de bairro. Escolha um tipo para começar com produtos de exemplo — dá para trocar depois em Configurações.</p><div class="setup-grid">${Object.values(W.storeTypes)
    .map(
      (t) =>
        `<button type="button" class="setup-option" data-setup="${t.id}"><span class="setup-emoji">${t.emoji}</span><b>${esc(t.label)}</b><small>${esc(t.storeName)}</small></button>`,
    )
    .join("")}</div></div></div>`;
}

function sidebar(m) {
  const counts = {
    pedidos: m.openOrders,
    compras: m.poAwaiting,
    estoque: state.products.filter((p) => p.shelfAlert).length,
  };
  const link = (id) => {
    const active = ui.page === id;
    return `<a href="#${id}" class="${active ? "active" : ""}" ${active ? 'aria-current="page"' : ""}>${icon(id)}<span>${routes[id]}</span>${
      id === "ai" ? '<span class="nav-badge">AI</span>' : counts[id] ? `<span class="nav-badge">${counts[id]}</span>` : ""
    }</a>`;
  };
  const channelLinks = W.channelsFor(state)
    .map((c) => {
      const active = ui.page === "canal" && ui.channelPage === c.id;
      const on = state.connected.includes(c.id);
      return `<a href="#canal/${c.id}" class="nav-channel ${active ? "active" : ""} ${on ? "" : "off"}" ${active ? 'aria-current="page"' : ""}>${logo(c.id, "xs")}<span>${esc(c.name)}</span>${on ? "" : '<small class="nav-off">conectar</small>'}</a>`;
    })
    .join("");
  const open = ui.menu || ui.sidebarOpen;
  return `<aside id="main-navigation" class="sidebar ${ui.menu ? "open" : ""} ${ui.sidebarOpen ? "expanded" : "collapsed"}" aria-label="Menu principal"><button type="button" class="sidebar-toggle" data-action="sidebar" aria-controls="primary-navigation" aria-label="${open ? "Recolher" : "Abrir"} menu lateral" aria-expanded="${open}" title="${open ? "Recolher" : "Abrir"} menu">${open ? "←" : '<img src="assets/img/wedtech-symbol.png" alt=""><span class="menu-glyph" aria-hidden="true">☰</span>'}</button><div class="brand"><span class="mark"><img src="assets/img/wedtech-symbol.png" alt="" width="48" height="48"></span><span class="wordmark"><b>Wed</b>Tech</span></div><div class="brand-sub">${esc(state.store.name)}</div><nav class="nav" id="primary-navigation" aria-label="Navegação principal">${navGroups
    .map(
      ([label, ids]) =>
        `<div class="nav-label">${label}</div>${ids.map(link).join("")}${label === "Canais de venda" ? `<div class="nav-channels">${channelLinks}</div>` : ""}`,
    )
    .join("")}</nav><div class="sidebar-bottom"><div><span class="dot"></span>Modo demonstração</div><button class="link side-link" data-action="reset">↺ Reiniciar demonstração</button><button class="link side-link" data-action="logout">⏻ Sair</button></div></aside>`;
}

function topbar(m) {
  const initials = state.store.name.split(/\s+/).filter((w) => /^[A-ZÀ-Ú]/.test(w)).slice(0, 2).map((w) => w[0]).join("") || "WT";
  return `<header class="topbar"><div class="crumb"><button class="mobile-menu" aria-label="Abrir menu" data-action="menu">☰</button><span class="muted">${esc(state.store.name)}</span><span class="separator muted">/</span><span>${esc(currentTitle())}</span></div><div class="top-right"><a class="btn small" href="loja.html" target="_blank" rel="noopener" title="Abrir meu site">🌐 <span class="hide-sm">Abrir meu site</span></a><span class="notif-wrap"><button type="button" class="notif-bell" data-action="toggle-notifications" aria-haspopup="true" aria-expanded="${ui.notifOpen}" aria-label="Notificações${m.unreadNotifications ? ", " + m.unreadNotifications + " não lidas" : ""}">${icon("bell")}${m.unreadNotifications ? `<span class="notif-count">${m.unreadNotifications}</span>` : ""}</button>${ui.notifOpen ? notifPanel() : ""}</span><span class="avatar" title="${esc(state.store.name)}">${esc(initials)}</span></div></header>`;
}

function notifPanel() {
  const icons = { venda: "🛒", pedido: "📦", despacho: "🚚", compra: "🧾", estoque: "📡", canal: "🔌" };
  const items = state.notifications.slice(0, 10);
  return `<div class="notif-panel" role="menu" aria-label="Notificações recentes"><div class="notif-panel-head">Notificações<button type="button" class="link" data-action="close-notifications" aria-label="Fechar notificações">×</button></div>${
    items.length
      ? items
          .map(
            (n) =>
              `<a class="notif-item ${n.read ? "" : "unread"}" href="#${esc(n.route || "inicio")}"><span>${icons[n.type] || "🔔"}</span><div>${esc(n.text)}<small>${esc(ago(n.ts))}</small></div></a>`,
          )
          .join("")
      : '<div class="notif-item"><div class="muted">Nenhuma notificação por enquanto.</div></div>'
  }</div>`;
}

function tourOverlay() {
  const step = tourSlides[ui.tourStep];
  const last = ui.tourStep === tourSlides.length - 1;
  return `<div class="modal-overlay centered"><section class="tour-card" role="dialog" aria-modal="true" aria-labelledby="tour-title"><div class="tour-icon">${icon(step.icon)}</div><div class="tour-dots">${tourSlides.map((_, i) => `<span class="${i === ui.tourStep ? "on" : ""}"></span>`).join("")}</div><h2 id="tour-title">${esc(step.title)}</h2><p>${esc(step.text)}</p><div class="tour-actions"><button type="button" class="link" data-action="tour-skip">Pular tour</button><button type="button" class="btn primary" data-action="tour-next">${last ? "Começar" : "Próximo →"}</button></div></section></div>`;
}

// Gaveta lateral genérica
function drawerShell(label, closeLabel, body) {
  return `<div class="modal-overlay"><section class="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title"><div class="drawer-top"><span class="wedtech-label">${label}</span><button class="close" data-action="close-drawer" aria-label="${closeLabel}">×</button></div>${body}</section></div>`;
}
function drawerHTML() {
  const d = ui.drawer;
  if (!d) return "";
  if (d.type === "produto") return productDrawer(d.id);
  if (d.type === "pedido") return orderDrawer(d.id);
  if (d.type === "receber") return receiveDrawer(d.id);
  if (d.type === "doc") return docDrawer(d.id);
  return "";
}
function openDrawer(type, id) {
  const back = ui.drawer && type === "doc" ? ui.drawer : null;
  ui.drawer = { type, id, back };
  ui.orderFeedback = "";
  ui.receiveFeedback = "";
  stopCamera();
}
function closeDrawer() {
  ui.drawer = ui.drawer?.back || null;
  stopCamera();
}

// Nota fiscal e etiqueta simuladas (documentos demonstrativos)
function docDrawer(ref) {
  const [type, id] = String(ref).split(":");
  if (type === "invoice") {
    const inv = state.invoices.find((i) => i.id === id);
    if (!inv) return "";
    return drawerShell(
      "NOTA FISCAL SIMULADA",
      "Fechar documento",
      `<h1 id="drawer-title">${esc(inv.id)}</h1><p class="muted small-text">Chave de acesso demonstrativa: ${esc(inv.key.replace(/(.{4})/g, "$1 ").trim())}</p><div class="qr-box">${renderQR("NFe|" + inv.id + "|" + inv.key + "|" + inv.total)}<span class="caption">QR real — leia com a câmera do celular</span></div><div class="validation">⚠ Documento demonstrativo gerado pelo protótipo. Não possui validade fiscal.</div><h3 class="block-title">Itens</h3>${inv.items
        .map((it) => `<div class="channel-row"><span>${esc(it.name)}<small class="block">${esc(it.sku)} · Qtd. ${it.qty}</small></span><b class="push">${money(it.price * it.qty)}</b></div>`)
        .join("")}<div class="detail-stats one"><div><small>Total da nota</small><strong>${money(inv.total)}</strong></div></div><p class="caption">Pedido ${esc(inv.orderId)} · ${esc(W.channelById(inv.channel)?.name || "")} · ${esc(ago(inv.ts))}.</p>`,
    );
  }
  if (type === "label") {
    const lbl = state.labels.find((l) => l.id === id);
    if (!lbl) return "";
    return drawerShell(
      "ETIQUETA DE ENVIO SIMULADA",
      "Fechar documento",
      `<h1 id="drawer-title">${esc(lbl.trackingCode)}</h1><div class="qr-box">${renderQR("WT|" + lbl.trackingCode + "|" + lbl.orderId)}<span class="caption">QR real com o código de rastreio</span></div><div class="validation">⚠ Etiqueta demonstrativa. Não é um código de rastreio real.</div><div class="detail-stats two"><div><small>Canal</small><strong>${esc(W.channelById(lbl.channel)?.name || "—")}</strong></div><div><small>Peso estimado</small><strong>${lbl.weight} kg</strong></div></div><h3 class="block-title">Destinatário</h3><p>${esc(lbl.recipient)}</p><p class="caption">Pedido ${esc(lbl.orderId)} · ${esc(ago(lbl.ts))}.</p>`,
    );
  }
  return "";
}

// Câmera embutida (complementa o campo de texto, nunca o substitui)
function cameraButton(target, label = "📷 Usar câmera") {
  return ui.camera === target ? "" : `<button type="button" class="btn" data-camera-start="${target}" ${ui.busy ? "disabled" : ""}>${label}</button>`;
}
function cameraBox(target) {
  if (ui.camera !== target) return "";
  return `<div class="camera-box"><video id="camera-preview" playsinline muted></video><div class="camera-hint">${ui.cameraError ? "⚠ " + esc(ui.cameraError) : "Aponte a câmera para o código de barras ou QR…"}</div><button type="button" class="btn" data-action="stop-camera">Parar câmera</button></div>`;
}

// Monta a página atual
function pageContent(m) {
  switch (ui.page) {
    case "balcao":
      return balcaoPage();
    case "pedidos":
      return pedidosPage();
    case "estoque":
      return estoquePage(m);
    case "produtos":
      return produtosPage();
    case "canais":
      return canaisPage();
    case "canal":
      return canalPage(ui.channelPage);
    case "compras":
      return comprasPage();
    case "sazonalidade":
      return sazonalidadePage();
    case "ads":
      return adsPage();
    case "financeiro":
      return financeiroPage();
    case "automacoes":
      return automacoesPage();
    case "ai":
      return aiPage(m);
    case "config":
      return configPage();
    default:
      return inicioPage(m);
  }
}

function render() {
  const app = $("#app");
  if (!ui.loggedIn) {
    app.innerHTML = loginScreen();
    document.body.style.overflow = "";
    $("#login-email")?.focus();
    return;
  }
  if (!state.setupDone) {
    app.innerHTML = setupScreen();
    document.body.style.overflow = "";
    return;
  }
  const m = W.metrics(state);
  app.innerHTML = `<a class="skip-link" href="#main-content">Pular para o conteúdo principal</a><div class="layout">${sidebar(m)}${
    ui.menu ? '<button type="button" class="sidebar-backdrop" data-action="menu" aria-label="Fechar menu lateral"></button>' : ""
  }<div class="workspace">${topbar(m)}<main id="main-content" tabindex="-1">${pageContent(m)}</main></div></div>${drawerHTML()}${
    ui.tourStep !== null ? tourOverlay() : ""
  }<dialog class="reset-dialog" id="reset-dialog"><h2>Recomeçar a apresentação?</h2><p>As alterações simuladas serão apagadas e os dados iniciais serão restaurados.</p><div class="actions"><button class="btn" data-action="cancel-reset">Cancelar</button><button class="btn primary" data-action="confirm-reset">Reiniciar</button></div></dialog>`;
  if (ui.drawer || ui.tourStep !== null) {
    document.body.style.overflow = "hidden";
    $(".drawer .close")?.focus();
  } else document.body.style.overflow = "";
  if (ui.camera) attachCameraPreview();
}
