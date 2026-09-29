"use strict";
// Estoque — um saldo só para todos os canais, separado por local (loja e depósito).
// IoT: leitor de entrada (confere pedidos ao fornecedor) e sensores de prateleira.
// IA: previsão de quando acaba, estoque parado e estoque mínimo que dispara compras.

function estoquePage(m) {
  const fc = W.forecast(state);
  const impact = W.businessImpact(state);
  const f = (id) => fc.find((x) => x.productId === id);
  const onlineIds = state.connected.filter((c) => c !== "loja");
  const dep = state.store.hasDeposito;
  const shops = W.shopsOf(state);
  const multi = shops.length > 1;
  return (
    heading(
      "Estoque",
      dep
        ? "Um estoque só para a loja, o site, o WhatsApp e os marketplaces. <b>Prateleira</b> é o que está exposto na loja; <b>depósito</b> é o que fica guardado."
        : "Um estoque só para a loja, o site, o WhatsApp e os marketplaces.",
      `<button class="btn" data-action="export-estoque-csv">⇩ Exportar CSV</button>`,
    ) +
    `<div class="kpis ${dep ? "four" : "three"}"><div class="card kpi"><div class="kpi-label">🏪 ${dep ? "Na prateleira" : "Na loja"}</div><strong>${m.unitsLoja}</strong><small>${multi ? "somando " + plural(shops.length, "loja", "lojas") : dep ? "exposto na loja para o cliente" : "tudo o que você tem"}</small></div>${dep ? `<div class="card kpi"><div class="kpi-label">📦 No depósito</div><strong>${m.unitsDeposito}</strong><small>guardado (fundos ou outro local)</small></div>` : ""}<div class="card kpi"><div class="kpi-label">🔒 Reservado</div><strong>${m.unitsReservadas}</strong><small>para pedidos em aberto</small></div><div class="card kpi highlight"><div class="kpi-label">✅ Disponível para vender</div><strong>${m.unitsDisponiveis}</strong><small>em todos os canais</small></div></div>` +
    (impact.salesAtRisk || impact.capitalParado
      ? `<div class="kpis two"><div class="card kpi danger-line"><div class="kpi-label">${icon("alert")}Vendas em risco</div><strong class="danger-text">${money(impact.salesAtRisk)}</strong><small>${plural(impact.atRiskCount, "produto pode", "produtos podem")} faltar antes da reposição</small></div><div class="card kpi warn-line"><div class="kpi-label">🏷️ Dinheiro parado</div><strong class="warn-text">${money(impact.capitalParado)}</strong><small>${plural(impact.paradoCount, "produto com", "produtos com")} pouca saída</small></div></div>`
      : "") +
    `<div class="chart-grid"><section class="card"><div class="section-head"><div><h2>📡 Entrada de mercadoria (leitor IoT)</h2><p>Chegou mercadoria? Bipe cada produto: o estoque soma e o pedido ao fornecedor é conferido sozinho.</p></div>${badge("🟢 Leitor conectado")}</div><form id="entrada-form" class="scan-form"><div class="field grow"><label for="entrada-code">Código de barras ou SKU</label><input id="entrada-code" name="code" placeholder="Bipe ou digite o código" autocomplete="off" required></div><div class="field narrow"><label for="entrada-qty">Qtd.</label><input id="entrada-qty" name="qty" type="number" min="1" max="9999" value="1"></div>${dep ? `<div class="field narrow"><label for="entrada-local">Guardar em</label><select id="entrada-local" name="local"><option value="deposito" ${ui.entradaLocal === "deposito" ? "selected" : ""}>Depósito</option>${shops
    .map((sh) => `<option value="${sh.id}" ${ui.entradaLocal === sh.id ? "selected" : ""}>${esc(multi ? sh.name : "Prateleira")}</option>`)
    .join("")}</select></div>` : ""}<button class="btn primary" ${ui.busy ? "disabled" : ""}>Dar entrada</button>${cameraButton("entrada")}</form>${cameraBox("entrada")}${
      ui.scanFeedback ? `<div class="validation ${ui.scanFeedback.ok ? "ok" : ""}">${ui.scanFeedback.ok ? "✓ " : "⚠ "}${esc(ui.scanFeedback.text)}</div>` : ""
    }<h3 class="block-title">Últimas leituras</h3>${
      state.scanLog.length
        ? state.scanLog
            .slice(0, 5)
            .map(
              (l) =>
                `<div class="channel-row"><span>${{ entrada: "↘", saida: "↗", separacao: "📦", retirada: "🏪", transferencia: "⇄" }[l.type] || "•"}</span><div>${esc(l.product)}<div class="muted">${esc(l.sku)} · ${esc(l.location)} · ${esc(ago(l.ts))}</div></div>${badge({ entrada: "Entrada", saida: "Venda", separacao: "Separação", retirada: "Retirada", transferencia: "Reposição" }[l.type] || l.type, l.type === "entrada" ? "" : "neutral")}</div>`,
            )
            .join("")
        : emptyBox("Nenhuma leitura ainda. Bipe um código para começar.")
    }</section><section class="card"><div class="section-head"><div><h2>Prateleira inteligente</h2><p>Sensores de peso na prateleira avisam quando o produto está acabando na loja${dep ? " e ainda tem no depósito" : ""}.</p></div>${badge("IoT · ao vivo", "neutral")}</div><div class="shelf-grid">${state.products
      .map((p) => {
        const st = W.stockOf(state, p);
        const pct = Math.min(100, Math.round((st.livreLoja / (p.shelfCap || 12)) * 100));
        const refill = W.shelfRefill(state, p);
        return `<div class="shelf ${p.shelfAlert ? "low" : ""}"><div class="shelf-top"><span>${esc(p.emoji)}</span><div><b>${esc(p.name)}</b><small>${esc(p.shelf)} · ${st.livreLoja} un.</small></div></div><div class="shelf-bar"><span style="width:${pct}%"></span></div>${
          p.shelfAlert
            ? `<button class="btn small primary" data-refill="${p.id}" ${ui.busy || !refill ? "disabled" : ""}>Repor ${refill} do depósito</button>`
            : `<small class="sensor-ok">📡 Sensor OK</small>`
        }</div>`;
      })
      .join("")}</div></section></div>` +
    shopsSection(multi) +
    eslSection() +
    validadeSection() +
    gradeSection() +
    `<section class="card table-card"><div class="section-head pad"><div><h2>Estoque por produto</h2><p>Defina o <b>estoque mínimo</b>: quando o produto chegar nele, a IA prepara o pedido ao fornecedor.</p></div>${badge("✧ Previsão WedTech AI", "neutral")}</div><div class="table-wrap"><table><thead><tr><th>Produto</th>${multi ? shops.map((sh) => `<th>${esc(sh.name)}</th>`).join("") : `<th>${dep ? "Prateleira" : "Na loja"}</th>`}${dep ? "<th>Depósito</th>" : ""}<th>Reservado</th><th>Disponível</th><th>Mínimo</th><th>Previsão da IA</th><th>Anúncios online</th></tr></thead><tbody>${state.products
      .map((p) => {
        const st = W.stockOf(state, p);
        const fx = f(p.id);
        const statuses = onlineIds.map((c) => W.channelStatus(state, p, c));
        const active = statuses.filter((x) => x === "ativo").length;
        const paused = statuses.filter((x) => x === "pausado" || x === "sem_estoque").length;
        const forecastText =
          fx.risk === "parado"
            ? "Parado · promoção de " + fx.suggestedDiscount + "%"
            : fx.daysToStockout !== null
              ? "Acaba em ~" + W.dec(fx.daysToStockout) + " dias" + (fx.leadTimeDays ? " · fornecedor " + fx.leadTimeDays + " d" : "")
              : "Sem histórico";
        return `<tr><td><div class="product-name">${productThumb(p, "sm")}<button class="product-button" data-product="${p.id}">${esc(p.name)}<small>${esc(p.sku)}</small></button></div></td>${multi ? shops.map((sh) => `<td>${st.byLoc.find((l) => l.id === sh.id).qty}</td>`).join("") : `<td>${st.loja}</td>`}${dep ? `<td>${st.deposito}</td>` : ""}<td>${st.reservado || "—"}</td><td><b>${st.disponivel}</b></td><td><input class="min-input" type="number" min="0" max="9999" value="${p.minStock}" data-min="${p.id}" aria-label="Estoque mínimo de ${esc(p.name)}"></td><td>${badge(W.riskLabel[fx.risk], riskTone[fx.risk])}<small>${esc(forecastText)}</small></td><td>${
          p.lock ? badge("⏸ Pausado pela IA", "warn") : badge(active + " ativos", "")
        }${paused && !p.lock ? `<small>${paused} sem estoque</small>` : ""}</td></tr>`;
      })
      .join("")}</tbody></table></div></section>` +
    aiStrip(
      "IoT + IA + automação, juntas.",
      "Cada leitura do leitor ou dos sensores atualiza o estoque em todos os canais e alimenta a previsão da WedTech AI.",
      "automacoes",
      "Ver automações →",
    )
  );
}

// Grade (tamanho/modelo): estoque livre de cada variação. Zerado = grade quebrada.
function gradeSection() {
  const list = state.products.filter((p) => p.variants && p.variants.length);
  if (!list.length) return "";
  return `<section class="card"><div class="section-head"><div><h2>📏 Grade de tamanhos e modelos</h2><p>Quanto tem de cada tamanho/modelo para vender. Tamanho zerado é grade quebrada: o cliente que procura vai embora sem comprar.</p></div>${badge("✧ Compras já saem na grade certa", "neutral")}</div><div class="grade-list">${list
    .map(
      (p) =>
        `<div class="grade-row"><div class="grade-name">${productThumb(p, "sm")}<div><b>${esc(p.name)}</b><small>${esc(p.variantKind || "Tamanho")}</small></div></div><div class="grade-cells">${p.variants
          .map((v) => {
            const free = W.variantFree(state, p, v);
            return `<span class="grade-cell ${free === 0 ? "out" : free <= 2 ? "low" : ""}" title="${esc(v.sku)}"><small>${esc(v.label)}</small><b>${free}</b></span>`;
          })
          .join("")}</div></div>`,
    )
    .join("")}</div></section>`;
}

// Validade por lote (perecíveis): o lote que vence antes sai primeiro
function validadeSection() {
  const rows = state.products.flatMap((p) => W.lotsOf(state, p).map((l) => ({ p, l }))).sort((a, b) => a.l.expiry - b.l.expiry);
  if (!rows.length) return "";
  const soon = rows.filter((r) => r.l.daysLeft <= 7).length;
  const lost = (state.losses || []).reduce((a, l) => a + l.value, 0);
  return `<section class="card table-card"><div class="section-head pad"><div><h2>📅 Validade e lotes</h2><p>Os pedidos saem sempre do lote que vence primeiro. Lote vencido sai da venda sozinho, em todos os canais.${lost ? " Perdas por vencimento até agora: <b>" + money(lost) + "</b>." : ""}</p></div>${badge(plural(soon, "lote vence", "lotes vencem") + " em 7 dias", soon ? "warn" : "")}</div><div class="table-wrap"><table><thead><tr><th>Produto</th><th>Lote</th><th>Qtd.</th><th>Vence em</th><th>Situação</th><th></th></tr></thead><tbody>${rows
    .slice(0, 12)
    .map(({ p, l }) => {
      const promo = p.promo && p.promo.until > W.now(state) ? p.promo : null;
      const status = l.daysLeft <= 0 ? badge("Vencido", "danger") : l.daysLeft <= 7 ? badge("Vence em " + plural(l.daysLeft, "dia", "dias"), l.daysLeft <= 2 ? "danger" : "warn") : badge("Em dia");
      const action =
        l.daysLeft <= 7 && l.daysLeft > 0
          ? promo
            ? badge("Promoção -" + promo.pct + "% ativa")
            : `<button class="btn small primary" data-promo="${p.id}:${l.suggestedDiscount || 20}:${Math.max(1, l.daysLeft)}">✧ Promoção de ${l.suggestedDiscount || 20}%</button>`
          : "";
      return `<tr><td><div class="product-name">${productThumb(p, "sm")}<b>${esc(p.name)}</b></div></td><td class="muted">${esc(l.code)}</td><td>${l.qty}</td><td>${new Date(l.expiry).toLocaleDateString("pt-BR")}</td><td>${status}</td><td>${action}</td></tr>`;
    })
    .join("")}</tbody></table></div></section>`;
}

// Várias lojas: quanto cada uma tem, abastecimento sugerido pela IA e transferências
function shopsSection(multi) {
  const shops = W.shopsOf(state);
  if (!multi)
    return `<div class="ai-strip"><span class="spark">🏪</span><div><h2>Tem mais de uma loja?</h2><p>Cadastre a filial em Configurações: o estoque dela soma com o desta loja em todos os canais, e o cliente escolhe onde retirar.</p></div><a class="link" href="#config">Cadastrar loja →</a></div>`;
  const locs = [...shops.map((sh) => ({ id: sh.id, name: sh.name })), ...(state.store.hasDeposito ? [{ id: "deposito", name: "Depósito" }] : [])];
  return `<section class="card"><div class="section-head"><div><h2>🏪 Lojas e transferências</h2><p>Um estoque só para vender online, dividido entre as lojas. A IA sugere como abastecer cada uma a partir do depósito.</p></div></div><div class="shop-cards">${shops
    .map((sh) => {
      const units = state.products.reduce((a, p) => a + (p.stock[sh.id] || 0), 0);
      const zero = state.products.filter((p) => !(p.stock[sh.id] > 0)).length;
      const sug = W.restockSuggestion(state, sh.id);
      return `<div class="shop-card-mini"><b>${esc(sh.name)}</b><small>${esc(sh.address || "")}</small><strong>${units} un.</strong><small>${zero ? plural(zero, "produto zerado", "produtos zerados") : "todos os produtos em estoque"}</small>${
        sug.length && state.store.hasDeposito
          ? `<button class="btn small primary" data-restock="${sh.id}" ${ui.busy ? "disabled" : ""}>✧ Abastecer do depósito (${sug.reduce((a, x) => a + x.qty, 0)} un.)</button>`
          : ""
      }</div>`;
    })
    .join("")}</div><form id="transfer-form" class="scan-form"><div class="field grow"><label for="tr-product">Produto</label><select id="tr-product" name="product">${state.products.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join("")}</select></div><div class="field narrow"><label for="tr-from">De</label><select id="tr-from" name="from">${locs.map((l) => `<option value="${l.id}" ${l.id === "deposito" ? "selected" : ""}>${esc(l.name)}</option>`).join("")}</select></div><div class="field narrow"><label for="tr-to">Para</label><select id="tr-to" name="to">${locs.map((l, i) => `<option value="${l.id}" ${i === 1 ? "selected" : ""}>${esc(l.name)}</option>`).join("")}</select></div><div class="field narrow"><label for="tr-qty">Qtd.</label><input id="tr-qty" name="qty" type="number" min="1" value="1"></div><button class="btn">⇄ Transferir</button></form></section>`;
}

// Etiquetas eletrônicas (e-ink) nas prateleiras — o preço acompanha o sistema
function eslSection() {
  const on = state.automations.etiquetaEletronica;
  return `<section class="card"><div class="section-head"><div><h2>📟 Etiquetas eletrônicas (IoT)</h2><p>As etiquetas digitais das prateleiras mostram o mesmo preço do sistema. Criou uma promoção? Elas mudam sozinhas${W.shopsOf(state).length > 1 ? " em todas as lojas" : ""}.</p></div>${badge(on ? "Sincronização automática" : "Automação desligada", on ? "" : "warn")}</div><div class="esl-grid">${state.products
    .map((p) => {
      const e = p.esl || { price: p.price };
      const promo = e.promoPct ? `<s>${money(p.price)}</s><em>-${e.promoPct}%</em>` : "";
      return `<div class="esl ${e.outdated ? "outdated" : ""}"><div class="esl-screen"><small>${esc(p.name)}</small><div class="esl-price">${promo}<b>${money(e.price)}</b></div><div class="esl-foot"><span>${esc(p.sku)}</span><span>${esc(p.shelf)}</span></div></div><small class="esl-status">${e.outdated ? "⚠ desatualizada" : "📡 sincronizada " + esc(ago(e.ts || W.now(state))).toLowerCase()}</small></div>`;
    })
    .join("")}</div></section>`;
}
