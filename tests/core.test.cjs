// Testes do núcleo de regras (estoque omnichannel, pedidos, automações e IA)
const { test } = require("node:test");
const assert = require("node:assert/strict");
const W = require("../public/assets/js/core/wedtech-core.js");

const byName = (s, i) => s.products[i];

test("estado inicial: estoque por local, reservas e canais", () => {
  const s = W.seed("moda");
  const m = W.metrics(s);
  assert.equal(m.products, 8);
  assert.equal(m.connected, 5);
  assert.equal(m.openOrders, 4);
  assert.equal(m.pickupsReady, 1);
  assert.equal(m.unitsDisponiveis, m.unitsLoja + m.unitsDeposito - m.unitsReservadas);
  assert.equal(m.locked, 1, "boné começa com anúncios travados aguardando o fornecedor");
  assert.equal(m.poAwaiting, 0);
  // Seed não dispara automações novas
  assert.equal(s.automationLog.length, 4);
  // Boné pausado nos marketplaces, mas ativo na loja e no site
  const bone = byName(s, 2);
  assert.equal(W.channelStatus(s, bone, "ml"), "pausado");
  assert.equal(W.channelStatus(s, bone, "site"), "ativo");
  assert.equal(W.channelStatus(s, bone, "magalu"), "desconectado");
});

test("os três tipos de loja têm o mesmo roteiro de estoque", () => {
  for (const tipo of ["moda", "alimentacao", "eletronicos"]) {
    const s = W.seed(tipo);
    assert.equal(s.tipo, tipo);
    assert.equal(W.metrics(s).locked, 1);
    assert.equal(W.forecast(s)[0].risk, "atencao");
    assert.equal(W.forecast(s)[4].risk, "parado");
    assert.match(s.products[0].barcode, /^\d{13}$/);
  }
});

test("compra no site para retirar reserva o estoque em todos os canais", () => {
  const s = W.seed("moda");
  const p = byName(s, 0);
  const before = W.stockOf(s, p);
  const o = W.createOrder(s, { channel: "site", type: "retirada", customer: { name: "Ana", phone: "11" }, items: [{ productId: p.id, qty: 2 }] });
  const after = W.stockOf(s, p);
  assert.equal(o.status, "novo");
  assert.match(o.pickupCode, /^RET-\d{6}$/);
  assert.equal(o.items[0].source, "loja", "retirada sai da prateleira da loja");
  assert.equal(after.total, before.total, "reserva não baixa o estoque físico");
  assert.equal(after.disponivel, before.disponivel - 2, "mas tira do disponível de todos os canais");
  assert.ok(s.onboarding.siteSale);
});

test("fluxo de retirada: separar, avisar por WhatsApp, bipar QR e baixar estoque", () => {
  const s = W.seed("moda");
  const p = byName(s, 5);
  const o = W.createOrder(s, { channel: "site", type: "retirada", customer: { name: "Ana Paula", phone: "(11) 9" }, items: [{ productId: p.id, qty: 1 }] });
  assert.throws(() => W.confirmSeparation(s, o.id), /Bipe todos/);
  assert.throws(() => W.scanOrderItem(s, o.id, "CODIGO-ERRADO"), /não pertence/);
  W.scanOrderItem(s, o.id, p.barcode);
  W.confirmSeparation(s, o.id);
  assert.equal(o.status, "pronto");
  assert.match(s.messages[0].text, new RegExp(o.pickupCode));
  assert.throws(() => W.deliverPickup(s, o.id, "RET-000000"), /não confere/);
  const lojaAntes = p.stock.loja;
  W.deliverByCode(s, o.pickupCode);
  assert.equal(o.status, "retirado");
  assert.equal(p.stock.loja, lojaAntes - 1);
  assert.ok(o.invoiceId);
});

test("entrega: marketplace sai do depósito, gera NF e etiqueta ao despachar", () => {
  const s = W.seed("moda");
  const o = s.orders.find((x) => x.channel === "ml" && x.status === "novo");
  for (const it of o.items) W.scanOrderItem(s, o.id, it.sku);
  W.confirmSeparation(s, o.id);
  assert.equal(o.status, "separado");
  W.dispatchOrder(s, o.id);
  assert.equal(o.status, "enviado");
  assert.ok(o.invoiceId && o.labelId);
  assert.match(s.labels[0].trackingCode, /^WT\d{10}$/);
  assert.throws(() => W.dispatchOrder(s, o.id), /Separe/);
});

test("DEMO: venda no balcão → IA prepara pedido ao fornecedor e trava marketplaces", () => {
  const s = W.seed("moda");
  const p = byName(s, 0); // herói: 11 disponíveis, mínimo 10, vende 3/dia, fornecedor 7 dias
  assert.equal(W.channelStatus(s, p, "ml"), "ativo");
  const { order, invoice } = W.sellCounter(s, [{ productId: p.id, qty: 1 }]);
  assert.equal(order.status, "concluido");
  assert.ok(invoice.id);
  // Pedido preparado pela IA, aguardando confirmação
  const po = s.purchaseOrders.find((x) => x.status === "aguardando");
  assert.ok(po, "a IA prepara o pedido");
  assert.equal(po.items[0].productId, p.id);
  assert.ok(po.items[0].qty * po.items[0].cost >= s.suppliers[0].minOrder, "respeita o pedido mínimo do fornecedor");
  // Trava: acaba antes da entrega → marketplaces pausados, loja/site/WhatsApp seguem
  assert.equal(p.lock.kind, "prazo");
  assert.equal(W.channelStatus(s, p, "ml"), "pausado");
  assert.equal(W.channelStatus(s, p, "shopee"), "pausado");
  assert.equal(W.channelStatus(s, p, "site"), "ativo");
  assert.equal(W.channelStatus(s, p, "whats"), "ativo");
  assert.throws(() => W.createOrder(s, { channel: "ml", type: "entrega", customer: { name: "X" }, items: [{ productId: p.id, qty: 1 }] }), /pausado/i);
  // Não duplica o pedido
  W.sellCounter(s, [{ productId: p.id, qty: 1 }]);
  assert.equal(s.purchaseOrders.filter((x) => x.items[0].productId === p.id && x.status === "aguardando").length, 1);
  // Lojista confirma; mercadoria chega e é bipada → anúncios voltam sozinhos
  W.confirmPurchaseOrder(s, po.id, { [p.id]: 30 });
  assert.equal(po.status, "enviado");
  assert.equal(po.items[0].qty, 30);
  assert.match(s.messages[0].text, /PC-/);
  const r = W.receiveGoods(s, p.barcode, 30, "deposito");
  assert.equal(r.po.id, po.id);
  assert.equal(po.status, "recebido");
  assert.equal(p.lock, null);
  assert.equal(W.channelStatus(s, p, "ml"), "ativo");
  assert.match(s.automationLog[0].text, /reativei/);
});

test("prazo do fornecedor muda a trava; pausar tudo quando zera", () => {
  const s = W.seed("moda");
  const bone = byName(s, 2);
  const sup = W.supplierOf(s, bone);
  W.updateSupplier(s, sup.id, { leadTimeDays: 1 });
  assert.equal(bone.lock, null, "entrega rápida: não precisa travar");
  W.updateSupplier(s, sup.id, { leadTimeDays: 5 });
  assert.equal(bone.lock.kind, "prazo");
  const all = W.stockOf(s, bone).disponivel;
  W.sellCounter(s, [{ productId: bone.id, qty: all }]);
  assert.equal(bone.lock.kind, "zero");
  assert.equal(W.channelStatus(s, bone, "site"), "sem_estoque");
  assert.throws(() => W.sellCounter(s, [{ productId: bone.id, qty: 1 }]), /só 0/);
});

test("estoque mínimo editável dispara o pedido na hora", () => {
  const s = W.seed("moda");
  const p = byName(s, 5); // vestido: 16 disponíveis
  W.updateProduct(s, p.id, { minStock: 20 });
  assert.ok(s.purchaseOrders.some((po) => po.status === "aguardando" && po.items[0].productId === p.id));
  assert.ok(s.onboarding.minReviewed);
  assert.throws(() => W.updateProduct(s, p.id, { minStock: -1 }), /inválido/);
});

test("descartar pedido da IA não sugere de novo por 24 h", () => {
  const s = W.seed("moda");
  const p = byName(s, 5);
  W.updateProduct(s, p.id, { minStock: 20 });
  const po = s.purchaseOrders[0];
  W.discardPurchaseOrder(s, po.id);
  W.runAutomations(s);
  assert.equal(s.purchaseOrders.filter((x) => x.status === "aguardando").length, 0);
});

test("sensor de prateleira pede reposição e a transferência resolve", () => {
  const s = W.seed("moda");
  const calca = byName(s, 3);
  assert.ok(calca.shelfAlert);
  const qty = W.shelfRefill(s, calca);
  assert.ok(qty > 0);
  W.transferStock(s, calca.id, "deposito", "loja", qty);
  assert.equal(calca.shelfAlert, false);
  assert.throws(() => W.transferStock(s, calca.id, "deposito", "loja", 999), /livres/);
});

test("reserva de retirada expira em 48 h e volta a ficar à venda", () => {
  const s = W.seed("moda");
  const pronto = s.orders.find((o) => o.status === "pronto");
  const p = s.products.find((x) => x.id === pronto.items[0].productId);
  const before = W.stockOf(s, p).disponivel;
  W.advanceTime(s, 49);
  assert.equal(pronto.status, "expirado");
  assert.equal(W.stockOf(s, p).disponivel, before + pronto.items[0].qty);
  assert.match(s.automationLog[0].text, /expirou/);
});

test("automações desligadas não agem", () => {
  const s = W.seed("moda");
  W.setAutomation(s, "autoPedidoCompra", false);
  W.setAutomation(s, "travaAnuncios", false);
  assert.equal(byName(s, 2).lock, null, "desligar a trava reativa os anúncios");
  W.sellCounter(s, [{ productId: byName(s, 0).id, qty: 1 }]);
  assert.equal(s.purchaseOrders.filter((x) => x.status === "aguardando").length, 0);
  assert.equal(byName(s, 0).lock, null);
});

test("conectar canal publica o catálogo com o mesmo estoque", () => {
  const s = W.seed("moda");
  W.connectChannel(s, "magalu");
  assert.ok(s.connected.includes("magalu"));
  assert.equal(W.channelStatus(s, byName(s, 1), "magalu"), "ativo");
  assert.equal(W.channelStatus(s, byName(s, 2), "magalu"), "pausado", "produto travado entra pausado");
  assert.throws(() => W.connectChannel(s, "magalu"), /já está conectado/);
  const o = W.simulateOrder(s, "magalu");
  assert.equal(o.type, "entrega");
});

test("ADS publica novo produto na loja + canais escolhidos e valida SKU", () => {
  const s = W.seed("moda");
  const p = W.publish(s, { name: "Produto teste", sku: "TESTE-01", price: 79.9, stockLoja: 5, stockDeposito: 10, minStock: 3 }, ["site", "ml"], []);
  assert.deepEqual(p.channels, ["loja", "site", "ml"]);
  assert.equal(W.stockOf(s, p).disponivel, 15);
  assert.match(p.barcode, /^\d{13}$/);
  assert.equal(W.forecast(s).find((f) => f.productId === p.id).risk, "ok", "produto novo não é 'parado'");
  assert.throws(() => W.publish(s, { name: "X", sku: "teste-01", price: 1 }, ["ml"], []), /SKU/);
  assert.throws(() => W.publish(s, { name: "X", sku: "T2", price: 1 }, [], []), /canal/);
});

test("financeiro considera custo, taxas dos canais e despesas", () => {
  const s = W.seed("moda");
  const f = W.financials(s);
  assert.equal(f.revenue, W.metrics(s).revenue);
  assert.equal(f.grossProfit, Math.round((f.revenue - f.cogs - f.fees - f.paymentFees) * 100) / 100);
  assert.ok(f.paymentFees > 0, "vendas no cartão pagam taxa de maquininha");
  const loja = f.byChannel.find((c) => c.channel === "loja");
  const ml = f.byChannel.find((c) => c.channel === "ml");
  assert.equal(loja.fees, 0);
  assert.ok(ml.fees > 0);
  assert.ok(loja.margin > ml.margin, "loja física rende mais que marketplace");
  const net = f.netProfit;
  W.addExpense(s, { category: "Frete", amount: 30 });
  assert.equal(W.financials(s).netProfit, Math.round((net - 30) * 100) / 100);
  assert.throws(() => W.addExpense(s, { category: "", amount: 0 }), /categoria/);
});

test("fornecedor: cadastro valida nome, CNPJ e prazo", () => {
  const s = W.seed("moda");
  const f = W.addSupplier(s, { name: "Beta", cnpj: "11.111.111/0001-11", leadTimeDays: 3, minOrder: 100 });
  assert.equal(f.leadTimeDays, 3);
  assert.equal(f.minOrder, 100);
  assert.throws(() => W.addSupplier(s, { name: "Outro", cnpj: "11.111.111/0001-11" }), /CNPJ/);
  assert.throws(() => W.addSupplier(s, { name: "", cnpj: "" }), /nome e CNPJ/);
  assert.throws(() => W.updateSupplier(s, f.id, { leadTimeDays: 0 }), /entre 1 e 60/);
});

test("WedTech AI responde com os dados atuais", () => {
  const s = W.seed("moda");
  assert.match(W.answer(s, "O que eu faço agora?"), /O que eu faria agora/);
  assert.match(W.answer(s, "Quais anúncios estão pausados?"), /Boné Aba Curva/);
  assert.match(W.answer(s, "Tenho risco de ficar sem estoque?"), /Tênis Casual Conforto/);
  assert.match(W.answer(s, "Tenho pedidos de compra em aberto?"), /PC-3001/);
  assert.match(W.answer(s, "Quem vem retirar na loja?"), /RET-/);
  assert.match(W.answer(s, "Tenho produtos parados?"), /Jaqueta Corta-vento.*promoção/s);
  assert.match(W.answer(s, "Qual meu lucro hoje?"), /Lucro líquido/);
  assert.match(W.answer(s, "Resuma meu dia."), /disponíveis para vender/);
  assert.match(W.answer(s, "Qual o impacto financeiro?"), /em risco/);
  assert.match(W.answer(s, "Existem erros nos meus anúncios?"), /Shopee/);
});

test("todo e checklist em linguagem simples", () => {
  const s = W.seed("moda");
  const t = W.todo(s).map((x) => x.text).join("\n");
  assert.match(t, /retirar pedido na loja/);
  assert.match(t, /Repor prateleira/);
  assert.match(t, /Conecte/);
  const c = W.checklist(s);
  assert.equal(c.total, 6);
  assert.ok(c.done >= 1);
});

test("persistência: salva e recarrega o mesmo estado", () => {
  const s = W.seed("eletronicos");
  const store = new Map();
  const storage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
  W.saveState(storage, s);
  const back = W.loadState(storage);
  assert.equal(back.tipo, "eletronicos");
  assert.equal(back.products.length, 8);
  storage.setItem(W.STORAGE_KEY, '{"version":1}');
  assert.equal(W.loadState(storage), null, "formato antigo é descartado");
});

test("planos: limite de canais e de marketplaces", () => {
  const s = W.seed("moda");
  assert.equal(W.planUsage(s).plan.name, "Profissional");
  W.connectChannel(s, "magalu"); // 6º canal, 3º marketplace
  assert.throws(() => W.connectChannel(s, "tiktok"), /permite até 6 canais/);
  assert.throws(() => W.connectChannel(s, "ifood"), /não é um canal deste tipo/);
  s.plan = "basico";
  const b = W.seed("moda");
  b.plan = "basico";
  assert.throws(() => W.connectChannel(b, "magalu"), /Básico/);
});

test("sazonalidade: calendário, plano da IA e pedidos para a data especial", () => {
  const s = W.seed("eletronicos");
  const evs = W.upcomingEvents(s, 6);
  assert.ok(evs.length >= 3);
  assert.ok(evs.every((e, i) => i === 0 || e.ts >= evs[i - 1].ts), "ordenado por data");
  assert.ok(evs.some((e) => /Black Friday/.test(e.name)));
  const bf = evs.find((e) => /Black Friday/.test(e.name));
  assert.equal(bf.mult, 2.8, "impacto depende do tipo de loja");
  const plan = W.eventPlan(s, bf.id);
  assert.ok(plan.toBuyCount > 0);
  assert.ok(plan.extraRevenue > 0);
  const r = plan.rows.find((x) => x.toBuy > 0);
  assert.ok(r.expected > r.normal, "previsão maior que a venda normal");
  const created = W.prepareEvent(s, bf.id);
  assert.ok(created.length >= 1);
  assert.ok(created.every((po) => po.status === "aguardando" && po.eventId === bf.id));
  assert.ok(W.upcomingEvents(s, 6).find((e) => e.id === bf.id).prepared);
  assert.ok(W.eventPlan(s, bf.id).rows.every((x) => x.toBuy === 0), "pedidos a caminho cobrem a necessidade");
  assert.match(W.answer(s, "Como me preparar para a Black Friday?"), /Black Friday/);
});

test("sazonalidade: evento do lojista aumenta a demanda durante o pico", () => {
  const s = W.seed("moda");
  const d = new Date(W.now(s) + 2 * 864e5);
  const iso = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  const before = W.forecast(s)[1].daysToStockout;
  const ev = W.addCustomEvent(s, { name: "Festa do bairro", date: iso, increase: 100, windowDays: 5 });
  assert.equal(ev.mult, 2);
  assert.equal(W.demandFactor(s), 2, "hoje já está dentro da janela de pico");
  assert.ok(W.forecast(s)[1].daysToStockout < before, "estoque acaba mais rápido no pico");
  assert.throws(() => W.addCustomEvent(s, { name: "X", date: "2000-01-01", increase: 10, windowDays: 1 }), /futuro/);
  W.removeCustomEvent(s, ev.id);
  assert.equal(W.demandFactor(s) >= 1, true);
});

test("loja sem depósito: tudo passa para a prateleira", () => {
  const s = W.seed("moda");
  const total = W.metrics(s).unitsLoja + W.metrics(s).unitsDeposito;
  W.setHasDeposito(s, false);
  assert.equal(W.metrics(s).unitsDeposito, 0);
  assert.equal(W.metrics(s).unitsLoja, total);
  assert.ok(s.orders.filter((o) => ["novo", "separando", "pronto", "separado"].includes(o.status)).every((o) => o.items.every((i) => i.source === "loja")));
  const r = W.receiveGoods(s, s.products[0].sku, 5, "deposito");
  assert.equal(r.product.stock.deposito, 0, "entrada vai para a loja");
  assert.throws(() => W.transferStock(s, s.products[0].id, "deposito", "loja", 1), /sem depósito/);
  assert.match(W.answer(s, "Resuma meu dia."), /reservadas para pedidos/);
});

test("canais por tipo de loja: comida tem iFood, Rappi e 99Food; moda tem Shein", () => {
  const food = W.seed("alimentacao");
  const ids = W.channelsFor(food).map((c) => c.id);
  assert.ok(["ifood", "rappi", "food99"].every((x) => ids.includes(x)));
  assert.ok(food.connected.includes("ifood"));
  assert.ok(W.channelsFor(W.seed("moda")).some((c) => c.id === "shein"));
  // Delivery sai da prateleira (o entregador retira no balcão)
  const o = food.orders.find((x) => x.channel === "ifood" && x.status === "novo");
  assert.ok(o.items.every((i) => i.source === "loja"));
  // A trava também pausa os apps de delivery
  assert.equal(W.channelStatus(food, food.products[2], "ifood"), "pausado");
});

test("grade: reserva e venda por tamanho, grade quebrada e compra na grade certa", () => {
  const s = W.seed("moda");
  const tenis = s.products[0];
  const v40 = tenis.variants.find((v) => v.label === "40");
  const v42 = tenis.variants.find((v) => v.label === "42");
  assert.equal(W.variantFree(s, tenis, v42), 0);
  assert.ok(W.todo(s).some((t) => /Grade quebrada: Tênis/.test(t.text)));
  assert.throws(() => W.createOrder(s, { channel: "site", type: "retirada", customer: { name: "Ana" }, items: [{ productId: tenis.id, variantId: v42.id, qty: 1 }] }), /42: só 0/);
  const o = W.createOrder(s, { channel: "site", type: "retirada", customer: { name: "Ana" }, items: [{ productId: tenis.id, variantId: v40.id, qty: 2 }] });
  assert.equal(o.items[0].name, "Tênis Casual Conforto · 40");
  assert.equal(W.variantFree(s, tenis, v40), 1, "reserva por tamanho");
  assert.equal(W.resolveCode(s, v40.sku).variant.id, v40.id, "bipar o código do tamanho");
  W.sellCounter(s, [{ productId: tenis.id, variantId: v40.id, qty: 1 }]);
  assert.equal(v40.qty, 2);
  const total = () => tenis.variants.reduce((a, v) => a + v.qty, 0);
  assert.equal(total(), tenis.stock.loja + tenis.stock.deposito, "grade soma o estoque");
  const g = W.gradeFor(tenis, 20);
  assert.equal(g.reduce((a, x) => a + x.qty, 0), 20);
  W.receiveGoods(s, tenis.sku, 20, "deposito");
  assert.equal(total(), tenis.stock.loja + tenis.stock.deposito);
  assert.ok(v42.qty > 0, "a compra repõe a grade quebrada");
});

test("validade: FEFO, alerta com promoção e baixa automática de vencidos", () => {
  const s = W.seed("alimentacao");
  const mel = s.products[1];
  assert.equal(W.lotsOf(s, mel)[0].qty, 18);
  assert.ok(s.automationLog.some((l) => l.rule === "alertaValidade" && /Mel/.test(l.text)));
  W.sellCounter(s, [{ productId: mel.id, qty: 3 }]);
  assert.equal(W.lotsOf(s, mel)[0].qty, 15, "vende primeiro o lote que vence antes");
  const pao = s.products[6];
  const before = pao.stock.loja + pao.stock.deposito;
  W.advanceTime(s, 30);
  assert.equal(pao.stock.loja + pao.stock.deposito, before - 3, "lote vencido sai da venda");
  assert.ok(W.financials(s).losses > 0, "perda registrada no financeiro");
  assert.match(W.answer(s, "Tem produto vencendo?"), /Mel Puro Silvestre/);
});

test("preço por canal e promoção", () => {
  const s = W.seed("moda");
  const p = s.products[1];
  assert.equal(W.priceFor(s, p, "ml"), p.price);
  assert.equal(W.suggestedMarkup("ml"), 19);
  W.setChannelMarkup(s, "ml", 19);
  const ml = W.priceFor(s, p, "ml");
  assert.ok(ml > p.price);
  assert.match(ml.toFixed(2), /\.90$/, "preço termina em ,90");
  const o = W.createOrder(s, { channel: "ml", type: "entrega", customer: { name: "X" }, items: [{ productId: p.id, qty: 1 }] });
  assert.equal(o.items[0].price, ml);
  W.applyPromo(s, p.id, 20, 3);
  assert.ok(W.priceFor(s, p, "site") < p.price);
  assert.equal(W.priceFor(s, p, "ml"), ml, "promoção não vale no marketplace");
  assert.throws(() => W.setChannelMarkup(s, "ml", 500), /entre/);
});

test("balcão: Pix, maquininha e dinheiro com troco", () => {
  const s = W.seed("moda");
  const p = s.products[7];
  assert.equal(W.sellCounter(s, [{ productId: p.id, qty: 1 }], { payment: "pix" }).order.payment.fee, 0);
  assert.ok(W.sellCounter(s, [{ productId: p.id, qty: 1 }], { payment: "credito" }).order.payment.fee > 0);
  const cash = W.sellCounter(s, [{ productId: p.id, qty: 1 }], { payment: "dinheiro", received: 50 });
  assert.equal(cash.order.payment.change, Math.round((50 - p.price) * 100) / 100);
  assert.throws(() => W.sellCounter(s, [{ productId: p.id, qty: 1 }], { payment: "dinheiro", received: 1 }), /menor/);
  assert.match(W.answer(s, "Como estão os pagamentos no pix?"), /Pix/);
});

test("relatório pós-evento: previsto × real e aprendizado da IA", () => {
  const s = W.seed("moda");
  assert.equal(s.eventReports.length, 2);
  const r = s.eventReports[0];
  assert.ok(r.accuracy > 0 && r.accuracy <= 100);
  assert.equal(r.soldUnits + r.lostUnits, r.demandUnits);
  assert.ok(s.eventLearning[r.key] > 0);
  assert.match(W.answer(s, "Como foi o resultado da última data?"), /Previ/);
});

test("devolução em qualquer canal: comprou no marketplace, devolve na loja", () => {
  const s = W.seed("moda");
  const o = s.orders.find((x) => x.channel === "ml" && x.status === "enviado");
  const p = s.products.find((x) => x.id === o.items[0].productId);
  const total = W.stockOf(s, p).total;
  const revenue = W.financials(s).revenue;
  assert.equal(W.findOrderByDoc(s, o.id.toLowerCase()).id, o.id);
  const r = W.registerReturn(s, o.id, { lines: [{ index: 0, qty: 1 }], condition: "venda", refund: "vale" });
  assert.equal(W.stockOf(s, p).total, total + 1, "volta para o estoque de todos os canais");
  assert.match(r.creditCode, /^VALE-\d{5}$/);
  assert.equal(W.financials(s).revenue, Math.round((revenue - r.value) * 100) / 100, "receita já sem a devolução");
  assert.throws(() => W.registerReturn(s, o.id, { lines: [{ index: 0, qty: 9 }] }), /só/);
  // Vale-troca usado no balcão
  const cheap = s.products[7];
  const sale = W.sellCounter(s, [{ productId: cheap.id, qty: 1 }], { payment: "vale", credit: r.creditCode });
  assert.equal(sale.order.payment.method, "vale");
  assert.equal(s.credits[0].balance, Math.round((r.value - W.priceFor(s, cheap, "loja")) * 100) / 100);
  assert.throws(() => W.sellCounter(s, [{ productId: s.products[4].id, qty: 1 }], { payment: "vale", credit: r.creditCode }), /tem/);
  // Com defeito não volta para a venda; pedido em aberto não pode ser devolvido
  const o2 = s.orders.find((x) => x.status === "concluido" && x.id !== sale.order.id);
  const p2 = s.products.find((x) => x.id === o2.items[0].productId);
  const t2 = W.stockOf(s, p2).total;
  W.registerReturn(s, o2.id, { lines: [{ index: 0, qty: 1 }], condition: "defeito", refund: "estorno" });
  assert.equal(W.stockOf(s, p2).total, t2);
  assert.throws(() => W.registerReturn(s, s.orders.find((x) => x.status === "novo").id, { lines: [{ index: 0, qty: 1 }] }), /entregues/);
  assert.match(W.answer(s, "Teve alguma devolução?"), /Vale|vale/);
});

test("alimento devolvido nunca volta para a venda", () => {
  const s = W.seed("alimentacao");
  const o = s.orders.find((x) => x.status === "concluido");
  const p = s.products.find((x) => x.id === o.items[0].productId);
  const t = W.stockOf(s, p).total;
  const r = W.registerReturn(s, o.id, { lines: [{ index: 0, qty: 1 }], condition: "venda", refund: "estorno" });
  assert.equal(r.lines[0].back, false);
  assert.equal(W.stockOf(s, p).total, t);
});

test("várias lojas: nova loja, abastecimento, retirada na loja escolhida e limite do plano", () => {
  const s = W.seed("moda");
  const total = W.metrics(s).unitsDisponiveis;
  const sh = W.addShop(s, { name: "Loja Centro", address: "Av. Central, 50" });
  assert.equal(sh.id, "loja2");
  assert.throws(() => W.addShop(s, { name: "Loja 3" }), /até 2 lojas/);
  assert.equal(W.metrics(s).unitsDisponiveis, total, "cadastrar a loja não muda o estoque");
  const moved = W.restockShop(s, "loja2");
  assert.ok(moved.length > 0);
  assert.equal(W.metrics(s).unitsDisponiveis, total, "transferência não muda o total vendável");
  const p = s.products[7];
  const o = W.createOrder(s, { channel: "site", type: "retirada", customer: { name: "Bia" }, items: [{ productId: p.id, qty: 1 }], store: "loja2" });
  assert.equal(o.store, "loja2");
  assert.equal(o.items[0].source, "loja2", "sai da prateleira da loja escolhida");
  const sale = W.sellCounter(s, [{ productId: p.id, qty: 1 }], { store: "loja2" });
  assert.equal(sale.order.store, "loja2");
  assert.match(W.answer(s, "Quanto tenho em cada loja?"), /Loja Centro/);
});

test("etiqueta eletrônica acompanha preço e promoção (e fica desatualizada se desligar)", () => {
  const s = W.seed("moda");
  const p = s.products[1];
  assert.equal(p.esl.price, p.price);
  assert.equal(s.automationLog.filter((l) => l.rule === "etiquetaEletronica").length, 0, "o estado inicial não gera log");
  W.applyPromo(s, p.id, 20, 3);
  W.runAutomations(s);
  assert.equal(p.esl.price, W.priceFor(s, p, "loja"));
  assert.equal(p.esl.promoPct, 20);
  assert.match(s.automationLog[0].text, /Etiqueta eletrônica/);
  W.setAutomation(s, "etiquetaEletronica", false);
  W.clearPromo(s, p.id);
  W.runAutomations(s);
  assert.ok(p.esl.outdated);
});
