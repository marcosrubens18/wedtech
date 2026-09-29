"use strict";
// Início — dashboard simplificado para o lojista de bairro:
// 3 números grandes, "O que fazer agora", primeiros passos, vendas por canal e a IA.

const quickQuestions = ["O que eu faço agora?", "Tenho risco de ficar sem estoque?", "Resuma meu dia."];

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

function checklistCard() {
  const c = W.checklist(state);
  if (state.onboarding.hidden || c.done === c.total) return "";
  const pct = Math.round((c.done / c.total) * 100);
  return `<section class="card checklist"><div class="section-head"><div><h2>Primeiros passos</h2><p>${c.done} de ${c.total} concluídos — em poucos minutos sua loja está vendendo em todos os canais.</p></div><button class="link" data-action="hide-checklist">Ocultar</button></div><div class="progress"><span style="width:${pct}%"></span></div><div class="checklist-grid">${c.steps
    .map((st) => `<a href="#${st.route}" class="check-step ${st.done ? "done" : ""}"><span class="check-dot">${st.done ? "✓" : ""}</span>${esc(st.text)}</a>`)
    .join("")}</div></section>`;
}

function inicioPage(m) {
  const todo = W.todo(state);
  const sales = W.salesByChannel(state).filter((c) => c.revenue > 0).sort((a, b) => b.revenue - a.revenue);
  const maxSale = Math.max(1, ...sales.map((c) => c.revenue));
  const firstName = state.store.owner || state.store.name.split(" ")[0];
  const answer = ui.dashAnswer;
  const recentLog = state.automationLog.slice(0, 4);
  const rule = (id) => W.automationRules.find((r) => r.id === id);
  return (
    heading(
      `${greeting()}, ${esc(firstName)}!`,
      "Veja como está sua loja hoje em todos os canais.",
      `<a class="btn" href="#balcao">🛒 Vender no balcão</a><button class="btn primary" data-action="new-product">+ Novo produto</button>`,
    ) +
    checklistCard() +
    `<div class="big-kpis"><a class="card big-kpi" href="#financeiro"><small>Vendas hoje</small><strong>${money(m.revenue)}</strong><span>${plural(m.orders, "venda", "vendas")} em todos os canais</span></a><a class="card big-kpi ${m.openOrders ? "attention" : ""}" href="#pedidos"><small>Pedidos para resolver</small><strong>${m.openOrders}</strong><span>${m.toSeparate} para separar · ${m.pickupsReady} para retirar</span></a><a class="card big-kpi ${m.atRisk ? "attention" : ""}" href="#estoque"><small>Produtos acabando</small><strong>${m.atRisk}</strong><span>${m.locked ? plural(m.locked, "anúncio pausado", "anúncios pausados") + " pela IA" : "estoque sob controle"}</span></a></div>` +
    `<div class="home-grid"><section class="card"><div class="section-head"><div><h2>O que fazer agora</h2><p>A WedTech AI organizou suas tarefas por prioridade.</p></div>${badge("✧ WedTech AI", "neutral")}</div>${
      todo.length
        ? `<ul class="todo-list">${todo
            .slice(0, 6)
            .map((t) => `<li class="${t.tone}"><span class="todo-icon">${t.icon}</span><span class="todo-text">${esc(t.text)}</span><a class="btn small" href="#${t.route}">${esc(t.cta)}</a></li>`)
            .join("")}</ul>`
        : emptyBox("Tudo em dia! Nenhuma tarefa pendente. 🎉")
    }</section><section class="card"><div class="section-head"><div><h2>Vendas por canal</h2><p>Um estoque só, vendendo em ${plural(sales.length, "canal", "canais")} hoje.</p></div><a class="link" href="#canais">Ver canais →</a></div>${
      sales.length
        ? `<div class="bars">${sales
            .map(
              (c) =>
                `<a class="bar-row" href="#canal/${c.channel}">${logo(c.channel, "xs")}<span class="bar-name">${esc(c.name)}</span><span class="bar"><span style="width:${Math.max(4, (c.revenue / maxSale) * 100)}%"></span></span><b>${money(c.revenue)}</b></a>`,
            )
            .join("")}</div>`
        : emptyBox("Nenhuma venda hoje ainda.")
    }</section></div>` +
    `<section class="dashboard-ai-hero" aria-labelledby="dashboard-ai-title"><div class="dashboard-ai-main"><div class="dashboard-ai-badge"><span>✧</span> WEDTECH AI · SUA ASSISTENTE</div><h2 id="dashboard-ai-title">Pergunte qualquer coisa sobre a sua loja.</h2><div class="dashboard-ai-answer" aria-live="polite">${
      ui.busy && !answer ? '<span class="spin"></span> Analisando sua loja...' : esc(answer || W.answer(state, "Resuma meu dia."))
    }</div><div class="dashboard-ai-chips">${quickQuestions
      .map((q, i) => `<button type="button" class="dashboard-ai-chip" data-dashboard-ask="${i}" ${ui.busy ? "disabled" : ""}>${q}</button>`)
      .join("")}</div><form class="dashboard-ai-form" id="dashboard-ai-form"><label class="sr-only" for="dashboard-ai-question">Pergunte à WedTech AI</label><input id="dashboard-ai-question" name="question" placeholder="Ex.: o que vai acabar esta semana?" required maxlength="500" ${ui.busy ? "disabled" : ""}><button ${ui.busy ? "disabled" : ""}>Perguntar ↑</button></form></div><aside class="dashboard-ai-side" aria-label="O que a IA fez por você"><div class="ai-side-title"><small>A IA TRABALHOU POR VOCÊ</small></div>${recentLog
      .map((l) => `<div class="ai-side-log"><span>${rule(l.rule)?.icon || (l.rule === "devolucao" ? "↩️" : "✧")}</span><p>${esc(l.text)}<small>${esc(ago(l.ts))}</small></p></div>`)
      .join("")}<a class="dashboard-ai-link" href="#automacoes">Ver todas as automações →</a></aside></section>`
  );
}
