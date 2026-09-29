"use strict";
// Pedidos — todos os canais e tipos num lugar só:
// balcão, "compre online e retire na loja", entrega em casa e marketplaces.

const OPEN_STATUS = ["novo", "separando", "pronto", "separado"];
const pedidosTabs = [
  ["abertos", "Para resolver", (o) => OPEN_STATUS.includes(o.status)],
  ["retirada", "Retirar na loja", (o) => o.type === "retirada" && OPEN_STATUS.includes(o.status)],
  ["entrega", "Entregas", (o) => o.type === "entrega" && OPEN_STATUS.includes(o.status)],
  ["concluidos", "Concluídos", (o) => !OPEN_STATUS.includes(o.status)],
  ["devolucoes", "Devoluções e trocas", (o) => (o.returns || []).length > 0],
];

function orderAction(o) {
  if (o.status === "novo" || o.status === "separando")
    return `<button class="btn small primary" data-order="${o.id}">${o.status === "novo" ? "Separar" : "Continuar"}</button>`;
  if (o.status === "pronto") return `<button class="btn small primary" data-order="${o.id}">Entregar</button>`;
  if (o.status === "separado") return `<button class="btn small primary" data-dispatch="${o.id}" ${ui.busy ? "disabled" : ""}>Despachar</button>`;
  return `<button class="btn small" data-order="${o.id}">Ver</button>`;
}

function ordersTable(list) {
  if (!list.length) return emptyBox("Nenhum pedido aqui. 🎉");
  return `<div class="table-wrap"><table><thead><tr><th>Pedido</th><th>Canal</th><th>Cliente</th><th>Tipo</th><th>Itens</th><th>Total</th><th>Status</th><th></th></tr></thead><tbody>${list
    .map(
      (o) =>
        `<tr><td><b>${o.id}</b><small>${esc(ago(o.ts))}</small></td><td>${logo(o.channel, "sm")}</td><td>${esc(o.customer.name)}</td><td>${typeIcon[o.type]} ${W.orderTypes[o.type]}</td><td>${o.items
          .map((i) => esc(i.name) + " × " + i.qty)
          .join("<br>")}</td><td>${money(o.total)}</td><td>${orderBadge(o)}</td><td>${orderAction(o)}</td></tr>`,
    )
    .join("")}</tbody></table></div>`;
}

function pedidosPage() {
  const sorted = [...state.orders].sort((a, b) => b.ts - a.ts);
  const tab = pedidosTabs.find((t) => t[0] === ui.pedidosTab) || pedidosTabs[0];
  const list = sorted.filter(tab[2]);
  const onlineConnected = state.connected.filter((c) => W.isExternal(c));
  return (
    heading(
      "Pedidos",
      "Todos os pedidos de todos os canais, num lugar só. O estoque fica reservado até a entrega.",
      `<a class="btn" href="loja.html" target="_blank" rel="noopener">🌐 Comprar pelo site</a><button class="btn primary" data-action="simulate-order" ${ui.busy || !onlineConnected.length ? "disabled" : ""}>+ Simular pedido de marketplace</button>`,
    ) +
    `<div class="tabs" role="tablist">${pedidosTabs
      .map(([id, label, fn]) => {
        const n = sorted.filter(fn).length;
        return `<button type="button" role="tab" class="tab ${ui.pedidosTab === id ? "active" : ""}" aria-selected="${ui.pedidosTab === id}" data-pedidos-tab="${id}">${label}${id !== "concluidos" && id !== "devolucoes" && n ? ` <span class="tab-count">${n}</span>` : ""}</button>`;
      })
      .join("")}</div>${ui.pedidosTab === "devolucoes" ? returnLookupCard() : ""}<section class="card table-card">${ordersTable(list)}</section>` +
    aiStrip(
      "Nenhuma venda sem estoque.",
      "Cada pedido reserva as unidades na hora: o mesmo produto não é vendido duas vezes em canais diferentes. Retiradas não buscadas em 48 h voltam para a venda sozinhas.",
      "automacoes",
      "Ver automações →",
    )
  );
}

// Gaveta do pedido: separação (bipagem), retirada (QR) e despacho
function orderDrawer(id) {
  const o = state.orders.find((x) => x.id === id);
  if (!o) return "";
  const ch = W.channelById(o.channel);
  const route = [...o.items]
    .map((it) => ({
      ...it,
      where:
        it.source === "deposito"
          ? "Depósito"
          : W.shopsOf(state).length > 1
            ? W.locName(state, it.source) + (it.source === "loja" ? " · " + (productById(it.productId)?.shelf || "") : "")
            : productById(it.productId)?.shelf || "Loja",
    }))
    .sort((a, b) => (a.source === b.source ? a.where.localeCompare(b.where) : a.source === "deposito" ? 1 : -1));
  const pickupAt = o.type === "retirada" && W.shopsOf(state).length > 1 ? W.locName(state, o.store || "loja") : "";
  const moveNote =
    pickupAt && (o.status === "novo" || o.status === "separando") && o.items.some((it) => it.source !== (o.store || "loja"))
      ? `<div class="validation">🚚 A IA separou parte do pedido fora da ${esc(pickupAt)}: leve esses itens para lá antes de avisar o cliente.</div>`
      : "";
  const done = o.items.every((it) => it.scanned);
  const msgs = state.messages.filter((m) => m.orderId === o.id);
  let action = "";
  if (o.status === "novo" || o.status === "separando") {
    action = `<form id="pedido-scan-form" class="scan-form"><div class="field grow"><label for="pedido-scan-code">Bipar código do item</label><input id="pedido-scan-code" name="code" autocomplete="off" required placeholder="SKU ou código de barras"></div><button class="btn primary" ${ui.busy ? "disabled" : ""}>Bipar</button>${cameraButton("pedido", "📷 Câmera")}</form>${cameraBox("pedido")}${
      ui.orderFeedback ? `<div class="validation">⚠ ${esc(ui.orderFeedback)}</div>` : ""
    }<button class="btn primary wide" data-action="confirm-separation" ${ui.busy || !done ? "disabled" : ""}>${
      o.type === "retirada" ? "Confirmar separação e avisar o cliente" : "Confirmar separação"
    }</button>`;
  } else if (o.status === "pronto") {
    action = `<div class="qr-box">${renderQR(o.pickupCode, 150)}<span class="caption">Código de retirada <b>${esc(o.pickupCode)}</b> — é o mesmo QR que o cliente recebeu</span></div><form id="pedido-retirada-form" class="scan-form"><div class="field grow"><label for="pedido-retirada-code">Bipe o QR do cliente para entregar</label><input id="pedido-retirada-code" name="code" autocomplete="off" required placeholder="RET-000000"></div><button class="btn primary" ${ui.busy ? "disabled" : ""}>Entregar</button>${cameraButton("pedido", "📷 Ler QR")}</form>${cameraBox("pedido")}${
      ui.orderFeedback ? `<div class="validation">⚠ ${esc(ui.orderFeedback)}</div>` : ""
    }`;
  } else if (o.status === "separado") {
    action = `<button class="btn primary wide" data-dispatch="${o.id}" ${ui.busy ? "disabled" : ""}>${ui.busy ? "Despachando…" : "🚚 Despachar pedido (gera NF e etiqueta)"}</button>`;
  } else if (o.status === "expirado") {
    action = `<div class="validation">⏱️ O cliente não retirou em 48 h. A reserva foi cancelada e o produto voltou a ficar à venda.</div>`;
  } else {
    action = `<div class="validation ok">✓ ${W.orderStatus[o.status]}.</div><div class="actions wrap">${o.invoiceId ? `<button class="btn" data-doc="invoice:${o.invoiceId}">Ver nota fiscal</button>` : ""}${o.labelId ? `<button class="btn" data-doc="label:${o.labelId}">Ver etiqueta</button>` : ""}</div>` + returnBlock(o);
  }
  return drawerShell(
    "PEDIDO · " + esc(ch.name.toUpperCase()),
    "Fechar pedido",
    `<h1 id="drawer-title">${esc(o.id)}</h1><p class="muted drawer-sub">${logo(o.channel, "xs")} ${esc(ch.name)} · ${typeIcon[o.type]} ${W.orderTypes[o.type]} · ${esc(ago(o.ts))}</p><div class="order-meta">${orderBadge(o)}<span><b>${esc(o.customer.name)}</b>${o.customer.phone ? " · " + esc(o.customer.phone) : ""}${o.customer.address ? "<br>" + esc(o.customer.address) : ""}${pickupAt ? "<br>🏪 Retirada na " + esc(pickupAt) : ""}</span></div>${moveNote}<h3 class="block-title">${
      o.status === "novo" || o.status === "separando" ? "Rota de separação sugerida pela IA" : "Itens"
    }</h3>${route
      .map(
        (it, i) =>
          `<div class="channel-row"><span class="step-n ${it.scanned ? "ok" : ""}">${it.scanned ? "✓" : i + 1}</span><div>${esc(it.emoji || "")} ${esc(it.name)}<div class="muted">${esc(it.sku)} · Qtd. ${it.qty} · <b>${esc(it.where)}</b></div></div>${badge(it.scanned ? "Bipado" : "Pendente", it.scanned ? "" : "neutral")}</div>`,
      )
      .join("")}<div class="order-total"><span>Total</span><b>${money(o.total)}</b></div>${action}${
      msgs.length
        ? `<h3 class="block-title">💬 Mensagens enviadas pela automação</h3>${msgs.map((m) => `<div class="wa-bubble">${esc(m.text)}<small>${esc(ago(m.ts))} · WhatsApp para ${esc(m.to)}</small></div>`).join("")}`
        : ""
    }<p class="caption">Cada bipagem confere o item físico contra o pedido. A baixa do estoque só acontece na entrega ou no despacho.</p>`,
  );
}

// Busca rápida: o cliente chegou com a nota, o número do pedido ou o código de retirada
function returnLookupCard() {
  return `<section class="card"><div class="section-head"><div><h2>↩️ Cliente veio devolver ou trocar?</h2><p>Vale para compras de <b>qualquer canal</b>: site, WhatsApp, marketplaces ou a própria loja. O produto volta na hora para a venda em todos os canais.</p></div></div><form id="return-lookup-form" class="scan-form"><div class="field grow"><label for="return-code">Número do pedido, da nota fiscal ou código de retirada</label><input id="return-code" name="code" required placeholder="Ex.: PED-1002, NF-1003 ou RET-123456" autocomplete="off"></div><button class="btn primary">Buscar pedido</button>${cameraButton("devolucao", "📷 Ler QR")}</form>${cameraBox("devolucao")}${
    ui.returnFeedback ? `<div class="validation">⚠ ${esc(ui.returnFeedback)}</div>` : ""
  }</section>`;
}

// Devolução/troca dentro da ficha do pedido (pedido já entregue)
function returnBlock(o) {
  const shops = W.shopsOf(state);
  const history = (o.returns || [])
    .map(
      (r) =>
        `<div class="channel-row"><span>↩️</span><div>${r.lines.map((l) => esc(l.name) + " × " + l.qty).join(", ")}<div class="muted">${esc(r.reason)} · ${esc(W.locName(state, r.store))} · ${r.lines.some((l) => l.back) ? "voltou para a venda" : "avaria"} · ${esc(ago(r.ts))}</div></div>${badge(r.creditCode ? "Vale " + r.creditCode + " · " + money(r.value) : "Estorno " + money(r.value), "neutral")}</div>`,
    )
    .join("");
  const rows = o.items
    .map((it, i) => ({ it, i, left: it.qty - W.returnedQty(o, i) }))
    .filter((x) => x.left > 0);
  if (!rows.length) return `<h3 class="block-title">↩️ Devoluções</h3>${history}<p class="caption">Todos os itens deste pedido já foram devolvidos.</p>`;
  return `<h3 class="block-title">↩️ Devolução ou troca</h3>${history}<form id="return-form" class="return-form"><div class="return-items">${rows
    .map(
      ({ it, i, left }) =>
        `<label class="return-item"><span>${esc(it.emoji || "")} ${esc(it.name)}<small>${money(it.price)} · até ${left} un.</small></span><input type="number" name="qty-${i}" min="0" max="${left}" value="${i === rows[0].i ? 1 : 0}" aria-label="Quantidade devolvida de ${esc(it.name)}"></label>`,
    )
    .join("")}</div><div class="form-grid compact"><div class="field"><label for="ret-reason">Motivo</label><select id="ret-reason" name="reason"><option>Não serviu</option><option>Trocar por outro tamanho/modelo</option><option>Não gostou</option><option>Produto com defeito</option><option>Chegou errado</option></select></div><div class="field"><label for="ret-condition">O produto está…</label><select id="ret-condition" name="condition"><option value="venda">Em bom estado (volta para a venda)</option><option value="defeito">Com defeito (avaria)</option></select></div><div class="field"><label for="ret-refund">Reembolso</label><select id="ret-refund" name="refund"><option value="vale">Vale-troca (cliente compra outro)</option><option value="estorno">Estorno do valor</option></select></div>${
    shops.length > 1
      ? `<div class="field"><label for="ret-store">Recebido na</label><select id="ret-store" name="store">${shops.map((sh) => `<option value="${sh.id}">${esc(sh.name)}</option>`).join("")}</select></div>`
      : ""
  }</div><button class="btn primary wide" ${ui.busy ? "disabled" : ""}>Registrar devolução</button><p class="caption">Comprou em ${esc(W.channelById(o.channel).name)} e devolveu na loja: o item em bom estado volta na hora para o estoque de todos os canais. Alimentos devolvidos nunca voltam para a venda.</p></form>`;
}
