"use strict";
// Vender no balcão (PDV) — pensado para usar no celular:
// bipa (leitor ou câmera), confere o carrinho (com tamanho/modelo), recebe por
// Pix, maquininha ou dinheiro e finaliza. Também entrega pedidos de retirada pelo
// QR do cliente e registra "compra na loja, recebe em casa".

const cartPrice = (it) => {
  const p = productById(it.productId);
  return p ? W.priceFor(state, p, "loja") : 0;
};
function cartTotal() {
  return ui.cart.reduce((a, it) => a + cartPrice(it) * it.qty, 0);
}

function cartRows() {
  return ui.cart
    .map((it, i) => {
      const p = productById(it.productId);
      if (!p) return "";
      const promo = cartPrice(it) < p.price;
      const variantSelect =
        p.variants && p.variants.length
          ? `<select class="variant-select" data-cart-variant="${i}" aria-label="${esc(p.variantKind || "Tamanho")} de ${esc(p.name)}">${p.variants
              .map((v) => `<option value="${v.id}" ${v.id === it.variantId ? "selected" : ""} ${W.variantFree(state, p, v) === 0 ? "disabled" : ""}>${esc(p.variantKind || "Tam.")} ${esc(v.label)} (${W.variantFree(state, p, v)})</option>`)
              .join("")}</select>`
          : "";
      return `<div class="cart-row">${productThumb(p, "sm")}<div class="cart-name">${esc(p.name)}<small>${money(cartPrice(it))}${promo ? " · 🏷️ promoção" : ""} · ${W.stockOf(state, p).disponivel} disponíveis</small>${variantSelect}</div><div class="qty"><button type="button" data-cart-dec="${i}" aria-label="Diminuir">−</button><b>${it.qty}</b><button type="button" data-cart-inc="${i}" aria-label="Aumentar">+</button></div><b class="cart-sub">${money(cartPrice(it) * it.qty)}</b><button type="button" class="link" data-cart-remove="${i}" aria-label="Remover ${esc(p.name)}">×</button></div>`;
    })
    .join("");
}

// Painel de pagamento: Pix (QR), maquininha (débito/crédito) ou dinheiro (troco)
function paymentPanel() {
  const total = cartTotal();
  const pay = ui.payment;
  if (!pay) return "";
  if (pay.stage === "choose")
    return `<div class="pay-box"><h3>Como o cliente vai pagar?</h3><div class="pay-grid"><button type="button" class="pay-option" data-pay="pix"><span>⚡</span>Pix<small>sem taxa</small></button><button type="button" class="pay-option" data-pay="debito"><span>💳</span>Débito<small>maquininha · 1,99%</small></button><button type="button" class="pay-option" data-pay="credito"><span>💳</span>Crédito<small>maquininha · 3,49%</small></button><button type="button" class="pay-option" data-pay="dinheiro"><span>💵</span>Dinheiro<small>calcula o troco</small></button><button type="button" class="pay-option" data-pay="vale"><span>🎟️</span>Vale-troca<small>de uma devolução</small></button></div><button type="button" class="link" data-action="pay-cancel">Cancelar</button></div>`;
  if (pay.stage === "pix")
    return `<div class="pay-box"><h3>⚡ Pix · ${money(total)}</h3><div class="qr-box">${renderQR("PIX|" + state.store.name + "|" + total.toFixed(2) + "|" + pay.token, 150)}<span class="caption">QR Pix demonstrativo — o cliente escaneia pelo app do banco</span></div><p class="pay-wait"><span class="spin"></span>Aguardando pagamento… a confirmação chega sozinha.</p><button type="button" class="link" data-action="pay-cancel">Cancelar</button></div>`;
  if (pay.stage === "debito" || pay.stage === "credito")
    return `<div class="pay-box"><h3>💳 ${pay.stage === "debito" ? "Débito" : "Crédito"} · ${money(total)}</h3><div class="pos-machine"><span>📟</span><b>${money(total)}</b><small>Aproxime, insira ou passe o cartão</small></div><p class="pay-wait"><span class="spin"></span>Maquininha conectada — aguardando aprovação…</p><button type="button" class="link" data-action="pay-cancel">Cancelar</button></div>`;
  if (pay.stage === "vale")
    return `<div class="pay-box"><h3>🎟️ Vale-troca · ${money(total)}</h3><form id="vale-form" class="scan-form"><div class="field grow"><label for="vale-code">Código do vale</label><input id="vale-code" name="code" required placeholder="VALE-00000" autocomplete="off"></div><button class="btn primary">Usar vale</button></form><p class="caption">O vale é gerado quando o cliente devolve um produto comprado em qualquer canal.</p><button type="button" class="link" data-action="pay-cancel">Cancelar</button></div>`;
  if (pay.stage === "dinheiro")
    return `<div class="pay-box"><h3>💵 Dinheiro · ${money(total)}</h3><form id="cash-form" class="scan-form"><div class="field grow"><label for="cash-received">Valor recebido (R$)</label><input id="cash-received" name="received" type="number" min="${total.toFixed(2)}" step="0.01" value="${Math.ceil(total / 10) * 10}" required></div><button class="btn primary">Confirmar</button></form><p class="caption">O troco é calculado e aparece na nota.</p><button type="button" class="link" data-action="pay-cancel">Cancelar</button></div>`;
  return "";
}

function balcaoPage() {
  const ready = state.orders.filter((o) => o.status === "pronto");
  return (
    heading(
      "Vender no balcão",
      "Bipe o produto, confira o carrinho e receba por Pix, cartão ou dinheiro. O estoque de todos os canais atualiza na hora.",
      `<button class="btn" data-action="go-returns">↩️ Devolução ou troca</button><a class="btn" href="#pedidos">Ver pedidos</a>`,
    ) +
    `<div class="pdv-grid"><section class="card"><div class="section-head"><div><h2>1. Bipe os produtos</h2><p>Use o leitor de código de barras, a câmera do celular ou toque no produto.</p></div>${badge("🟢 Leitor conectado")}</div>${storePicker()}<form id="balcao-form" class="scan-form"><div class="field grow"><label for="balcao-code">Código de barras ou SKU</label><input id="balcao-code" name="code" placeholder="Bipe ou digite o código" autocomplete="off" required></div><button class="btn primary" ${ui.busy ? "disabled" : ""}>Adicionar</button>${cameraButton("balcao")}</form>${cameraBox("balcao")}${
      ui.counterFeedback ? `<div class="validation ${ui.counterFeedback.ok ? "ok" : ""}">${ui.counterFeedback.ok ? "✓ " : "⚠ "}${esc(ui.counterFeedback.text)}</div>` : ""
    }<div class="quick-grid">${state.products
      .map((p) => {
        const st = W.stockOf(state, p);
        const free = st.disponivel;
        const here = st.byLoc.find((l) => l.id === ui.counterStore)?.free ?? free;
        const price = W.priceFor(state, p, "loja");
        return `<button type="button" class="quick-item" data-cart-add="${p.id}" ${free <= 0 ? "disabled" : ""}><span class="quick-emoji">${esc(p.emoji)}</span><span class="quick-name">${esc(p.name)}</span><small>${money(price)}${price < p.price ? " 🏷️" : ""} · ${free > 0 ? (W.shopsOf(state).length > 1 ? here + " nesta loja" : free + " disp.") : "esgotado"}</small></button>`;
      })
      .join("")}</div></section><section class="card cart-card"><div class="section-head"><h2>2. Carrinho</h2>${ui.cart.length && !ui.payment ? '<button class="link" data-action="cart-clear">Limpar</button>' : ""}</div>${
      cartRows() || emptyBox("Carrinho vazio. Bipe um produto para começar.")
    }<div class="cart-total"><span>Total</span><strong>${money(cartTotal())}</strong></div>${
      ui.payment
        ? paymentPanel()
        : `<label class="switch-row"><input type="checkbox" id="counter-delivery" ${ui.counterDelivery ? "checked" : ""}><span>🚚 Cliente comprou na loja e quer <b>receber em casa</b></span></label>${
            ui.counterDelivery
              ? `<form id="counter-delivery-form" class="form-grid compact"><div class="field full"><label for="cd-name">Nome do cliente</label><input id="cd-name" name="name" required maxlength="80"></div><div class="field"><label for="cd-phone">WhatsApp</label><input id="cd-phone" name="phone" inputmode="tel" maxlength="20" placeholder="(11) 90000-0000"></div><div class="field"><label for="cd-address">Endereço</label><input id="cd-address" name="address" required maxlength="140"></div><div class="field full"><button class="btn primary wide" ${ui.busy || !ui.cart.length ? "disabled" : ""}>Registrar pedido para entrega</button></div></form><p class="caption">O pedido reserva o estoque e vai para a fila de separação, saindo do depósito.</p>`
              : `<button class="btn primary wide big" data-action="start-payment" ${ui.busy || !ui.cart.length ? "disabled" : ""}>${ui.busy ? '<span class="spin"></span>Finalizando…' : "3. Receber pagamento · " + money(cartTotal())}</button><p class="caption">Depois do pagamento a nota fiscal (simulada) sai e o estoque baixa em todos os canais.</p>`
          }`
    }</section></div>` +
    `<section class="card pickup-card"><div class="section-head"><div><h2>🏪 Cliente veio retirar um pedido?</h2><p>Bipe o QR code que o cliente recebeu no WhatsApp (ou digite o código de retirada).</p></div>${badge(plural(ready.length, "pedido pronto", "pedidos prontos"), ready.length ? "" : "neutral")}</div><form id="retirada-form" class="scan-form"><div class="field grow"><label for="retirada-code">Código de retirada</label><input id="retirada-code" name="code" placeholder="Ex.: RET-123456" autocomplete="off" required></div><button class="btn primary" ${ui.busy ? "disabled" : ""}>Entregar pedido</button>${cameraButton("retirada", "📷 Ler QR")}</form>${cameraBox("retirada")}${
      ui.pickupFeedback ? `<div class="validation ${ui.pickupFeedback.ok ? "ok" : ""}">${ui.pickupFeedback.ok ? "✓ " : "⚠ "}${esc(ui.pickupFeedback.text)}</div>` : ""
    }${
      ready.length
        ? `<div class="pickup-list">${ready
            .map((o) => `<button type="button" class="pickup-chip" data-order="${o.id}">${logo(o.channel, "xs")}<span><b>${esc(o.customer.name)}</b><small>${o.id} · ${esc(o.pickupCode)}</small></span></button>`)
            .join("")}</div>`
        : ""
    }</section>`
  );
}

// Com mais de uma loja, o balcão escolhe de qual prateleira sai a venda
function storePicker() {
  const shops = W.shopsOf(state);
  if (shops.length < 2) return "";
  return `<div class="field store-picker"><label for="counter-store">🏪 Vendendo na</label><select id="counter-store">${shops
    .map((sh) => `<option value="${sh.id}" ${sh.id === ui.counterStore ? "selected" : ""}>${esc(sh.name)}</option>`)
    .join("")}</select></div>`;
}
