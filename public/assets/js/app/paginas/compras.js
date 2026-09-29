"use strict";
// Compras e fornecedores — a IA prepara o pedido quando o produto chega ao
// estoque mínimo; o lojista só confere e confirma. O prazo de entrega de cada
// fornecedor decide quando os anúncios dos marketplaces são travados.

const supplierName = (id) => state.suppliers.find((f) => f.id === id)?.name || "Fornecedor";
const dateLabel = (ts) => new Date(ts).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });

function comprasPage() {
  const awaiting = state.purchaseOrders.filter((po) => po.status === "aguardando");
  const sent = state.purchaseOrders.filter((po) => po.status === "enviado");
  const received = state.purchaseOrders.filter((po) => po.status === "recebido").slice(0, 4);
  return (
    heading(
      "Compras e fornecedores",
      "A IA prepara o pedido quando o produto chega ao mínimo. Você só confere e confirma.",
      `<button class="btn primary" data-action="toggle-supplier-form">${ui.supplierFormOpen ? "Cancelar" : "+ Novo fornecedor"}</button>`,
    ) +
    `<section class="card"><div class="section-head"><div><h2>🧾 Preparados pela IA · aguardando sua confirmação</h2><p>Confira a quantidade, ajuste se quiser e envie para o fornecedor.</p></div>${badge(String(awaiting.length), awaiting.length ? "warn" : "neutral")}</div>${
      awaiting.length
        ? awaiting
            .map((po) => {
              const sup = state.suppliers.find((f) => f.id === po.supplierId);
              const total = po.items.reduce((a, it) => a + it.qty * it.cost, 0);
              return `<div class="po-card"><div class="po-head"><div><b>${po.id}</b> · ${esc(sup?.name || "Fornecedor")}<small>Entrega em ${plural(sup?.leadTimeDays || 0, "dia", "dias")} · pedido mínimo ${money(sup?.minOrder || 0)}</small></div>${badge("✧ Sugerido pela IA", "neutral")}</div><p class="po-reason">${esc(po.reason)}</p>${po.items
                .map(
                  (it) =>
                    `<div class="po-item">${productThumb(productById(it.productId) || {}, "sm")}<span>${esc(it.name)}<small>custo ${money(it.cost)} / un.</small></span><label>Qtd. <input type="number" min="1" max="9999" value="${it.qty}" data-po-qty="${po.id}:${it.productId}" aria-label="Quantidade de ${esc(it.name)}"></label></div>`,
                )
                .join("")}<div class="po-foot"><span>Total estimado <b>${money(total)}</b></span><div class="actions"><button class="btn" data-discard-po="${po.id}" ${ui.busy ? "disabled" : ""}>Descartar</button><button class="btn primary" data-confirm-po="${po.id}" ${ui.busy ? "disabled" : ""}>✓ Confirmar e enviar</button></div></div></div>`;
            })
            .join("")
        : emptyBox("Nenhum pedido esperando você. Quando um produto chegar ao estoque mínimo, a IA prepara o pedido aqui.")
    }</section>` +
    `<section class="card table-card"><div class="section-head pad"><div><h2>🚚 A caminho</h2><p>Quando a mercadoria chegar, bipe a entrada: o estoque soma e os anúncios pausados voltam sozinhos.</p></div></div>${
      sent.length
        ? `<div class="table-wrap"><table><thead><tr><th>Pedido</th><th>Fornecedor</th><th>Itens</th><th>Previsão</th><th>Recebido</th><th></th></tr></thead><tbody>${sent
            .map((po) => {
              const qty = po.items.reduce((a, i) => a + i.qty, 0);
              const got = po.items.reduce((a, i) => a + i.received, 0);
              return `<tr><td><b>${po.id}</b><small>${esc(ago(po.sentTs || po.ts))}</small></td><td>${esc(supplierName(po.supplierId))}</td><td>${po.items.map((i) => esc(i.name) + " × " + i.qty).join("<br>")}</td><td>${esc(dateLabel(po.etaTs))}</td><td>${got}/${qty}</td><td><div class="actions"><button class="btn small primary" data-receive-scan="${po.id}">📡 Receber (bipar)</button><button class="btn small" data-receive-all="${po.id}" ${ui.busy ? "disabled" : ""}>Receber tudo</button></div></td></tr>`;
            })
            .join("")}</tbody></table></div>`
        : emptyBox("Nenhum pedido a caminho.")
    }${received.length ? `<p class="caption pad">Recebidos recentemente: ${received.map((po) => po.id).join(", ")}.</p>` : ""}</section>` +
    `<section class="card table-card"><div class="section-head pad"><div><h2>Fornecedores</h2><p>O <b>prazo de entrega</b> é usado pela IA para decidir quando travar os anúncios nos marketplaces.</p></div></div>${
      ui.supplierFormOpen
        ? `<form id="supplier-form" class="form-grid pad"><div class="field"><label for="supplier-name">Nome</label><input id="supplier-name" name="name" required maxlength="80" placeholder="Ex.: Distribuidora Beta"></div><div class="field"><label for="supplier-cnpj">CNPJ</label><input id="supplier-cnpj" name="cnpj" required maxlength="20" placeholder="00.000.000/0000-00"></div><div class="field"><label for="supplier-contact">E-mail</label><input id="supplier-contact" name="contact" maxlength="120"></div><div class="field"><label for="supplier-whats">WhatsApp</label><input id="supplier-whats" name="whatsapp" maxlength="20"></div><div class="field"><label for="supplier-lead">Prazo de entrega (dias)</label><input id="supplier-lead" name="leadTimeDays" type="number" min="1" max="60" value="5"></div><div class="field"><label for="supplier-min">Pedido mínimo (R$)</label><input id="supplier-min" name="minOrder" type="number" min="0" step="1" value="0"></div><div class="field full"><button class="btn primary">Cadastrar fornecedor</button></div></form>`
        : ""
    }<div class="table-wrap"><table><thead><tr><th>Fornecedor</th><th>Contato</th><th>Prazo de entrega</th><th>Pedido mínimo</th><th>Produtos</th></tr></thead><tbody>${state.suppliers
      .map(
        (f) =>
          `<tr><td><b>${esc(f.name)}</b><small>${esc(f.cnpj)}</small></td><td class="muted">${esc(f.contact)}<small>${esc(f.whatsapp || "")}</small></td><td><label class="inline-input"><input type="number" min="1" max="60" value="${f.leadTimeDays}" data-lead="${f.id}" aria-label="Prazo de entrega de ${esc(f.name)}"> dias</label></td><td><label class="inline-input">R$ <input type="number" min="0" step="1" value="${f.minOrder || 0}" data-minorder="${f.id}" aria-label="Pedido mínimo de ${esc(f.name)}"></label></td><td>${state.products.filter((p) => p.supplierId === f.id).length}</td></tr>`,
      )
      .join("")}</tbody></table></div></section>` +
    aiStrip(
      "Como a IA decide",
      "Produto chegou ao mínimo → a IA calcula a quantidade (vendas por dia × prazo do fornecedor, respeitando o pedido mínimo) e prepara o pedido. Se o que sobrou acaba antes da entrega, ela pausa os anúncios nos marketplaces e guarda o restante para a loja e o site.",
      "automacoes",
      "Ver automações →",
    )
  );
}

// Gaveta de recebimento: bipa os produtos que chegaram do fornecedor
function receiveDrawer(poId) {
  const po = state.purchaseOrders.find((x) => x.id === poId);
  if (!po) return "";
  return drawerShell(
    "RECEBER MERCADORIA",
    "Fechar recebimento",
    `<h1 id="drawer-title">${esc(po.id)}</h1><p class="muted drawer-sub">${esc(supplierName(po.supplierId))} · ${W.poStatus[po.status]}</p>${po.items
      .map((it) => {
        const pct = Math.round((it.received / it.qty) * 100);
        return `<div class="channel-row">${productThumb(productById(it.productId) || {}, "sm")}<div>${esc(it.name)}<div class="muted">${esc(it.sku)} · recebido ${it.received} de ${it.qty}</div><div class="shelf-bar"><span style="width:${pct}%"></span></div></div>${badge(it.received >= it.qty ? "Completo" : "Pendente", it.received >= it.qty ? "" : "neutral")}</div>`;
      })
      .join("")}${
      po.status === "enviado"
        ? `<form id="receber-form" class="scan-form"><div class="field grow"><label for="receber-code">Bipe o produto que chegou</label><input id="receber-code" name="code" autocomplete="off" required placeholder="Código de barras ou SKU"></div><div class="field narrow"><label for="receber-qty">Qtd.</label><input id="receber-qty" name="qty" type="number" min="1" max="9999" placeholder="tudo"></div><button class="btn primary" ${ui.busy ? "disabled" : ""}>Dar entrada</button>${cameraButton("receber", "📷 Câmera")}</form>${cameraBox("receber")}${
            ui.receiveFeedback ? `<div class="validation">⚠ ${esc(ui.receiveFeedback)}</div>` : ""
          }<p class="caption">Deixe a quantidade em branco para dar entrada em tudo que falta daquele produto. A mercadoria vai para o depósito.</p>`
        : `<div class="validation ok">✓ Pedido recebido. Estoque reposto e anúncios reativados pela automação.</div>`
    }`,
  );
}
