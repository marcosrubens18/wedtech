const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const N = require("../dist/state.js");
test("dados iniciais e soma única do estoque", () => {
  const s = N.seed();
  assert.deepEqual(N.metrics(s), {
    revenue: 4850,
    orders: 37,
    products: 10,
    stock: 842,
    connected: 3,
    alerts: 6,
    pendingSeparations: 2,
    unreadNotifications: 2,
    openPurchaseOrders: 1,
    openInventoryChecks: 0,
  });
  assert.equal(s.orders.filter((o) => o.channel === "ml").length, 18);
  assert.equal(s.orders.filter((o) => o.channel === "sh").length, 11);
  assert.equal(s.orders.filter((o) => o.channel === "tk").length, 8);
});
test("venda atualiza estoque, pedidos, receita e resposta da IA", () => {
  const s = N.seed();
  N.sell(s, "p0");
  assert.equal(s.products[0].stock, 17);
  assert.equal(N.metrics(s).stock, 841);
  assert.equal(N.metrics(s).revenue, 5249.9);
  assert.equal(N.metrics(s).orders, 38);
  assert.match(N.answer(s, "Tenho risco de ficar sem estoque?"), /17 unidades/);
  assert.match(N.answer(s, "Resuma minha operação."), /38 pedidos/);
  assert.equal(s.history[0].time, "Agora");
});
test("estoque nunca fica negativo", () => {
  const s = N.seed();
  for (let i = 0; i < 18; i++) N.sell(s, "p0");
  const before = N.metrics(s);
  assert.throws(() => N.sell(s, "p0"), /sem estoque/);
  assert.equal(s.products[0].stock, 0);
  assert.deepEqual(N.metrics(s), before);
});
test("publicação alimenta o catálogo e não aceita SKU repetido", () => {
  const s = N.seed();
  const d = { name: "Produto teste", sku: "TESTE-01", price: 79.9, stock: 20 };
  const p = N.publish(s, d, ["ml", "sh"], []);
  assert.equal(p.stock, 20);
  assert.equal(N.metrics(s).products, 11);
  assert.equal(N.metrics(s).stock, 862);
  assert.throws(() => N.publish(s, d, ["ml"], []), /SKU/);
  assert.throws(() => N.publish(s, { ...d, sku: "TESTE-02" }, [], []), /canal/);
});
test("correção de anúncio reflete na análise e alertas", () => {
  const s = N.seed();
  s.products[1].issue = false;
  assert.match(N.answer(s, "Existem erros nos meus anúncios?"), /Nenhum erro/);
  assert.equal(N.metrics(s).alerts, 5);
});
test("persistência serializa todos os dados e reset é independente", () => {
  const s = N.seed();
  N.sell(s, "p0");
  assert.equal(JSON.parse(JSON.stringify(s)).products[0].stock, 17);
  assert.equal(N.seed().products[0].stock, 18);
});
test("sete áreas, separação de pedido e etapas de anúncio renderizam sem erro", () => {
  const app = { innerHTML: "" };
  const doc = {
    querySelector: (s) => (s === "#app" ? app : null),
    body: { style: {} },
    addEventListener() {},
  };
  const context = {
    WedTech: N,
    document: doc,
    localStorage: {
      getItem() {
        return null;
      },
      setItem() {},
    },
    sessionStorage: {
      getItem() {
        return "1";
      },
      setItem() {},
      removeItem() {},
    },
    navigator: { mediaDevices: undefined },
    location: { hash: "" },
    window: { addEventListener() {}, scrollTo() {} },
    setTimeout,
    clearTimeout,
    console,
    FileReader: class {},
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync("dist/qrcode.js", "utf8"), context);
  vm.runInContext(fs.readFileSync("dist/app.js", "utf8"), context);
  for (const route of [
    "dashboard",
    "produtos",
    "one",
    "estoque",
    "marketplaces",
    "financeiro",
    "ai",
    "config",
  ]) {
    vm.runInContext(`page='${route}';render()`, context);
    assert.ok(app.innerHTML.includes("WedTech"));
    assert.ok(!app.innerHTML.includes("undefined"));
  }
  assert.ok(app.innerHTML.includes("Estoque Inteligente"));
  vm.runInContext("page='financeiro';render()", context);
  assert.ok(app.innerHTML.includes("Lucro líquido"));
  vm.runInContext("notifPanelOpen=true;render()", context);
  assert.ok(app.innerHTML.includes("notif-panel"));
  assert.ok(!app.innerHTML.includes("undefined"));
  vm.runInContext(
    "notifPanelOpen=false;WedTech.scanSale(state,'NK-RV8-001','st1');docModal='invoice:'+state.invoices[0].id;render()",
    context,
  );
  assert.ok(app.innerHTML.includes("NOTA FISCAL"));
  assert.ok(
    app.innerHTML.includes("<svg"),
    "NF deve mostrar um QR code real (vendorizado, sem serviço externo)",
  );
  assert.ok(!app.innerHTML.includes("undefined"));
  vm.runInContext("docModal=null;render()", context);
  vm.runInContext("modal='p0';render()", context);
  assert.ok(app.innerHTML.includes("18"));
  vm.runInContext("modal=null;fulfillmentModal='SEP-2201';render()", context);
  assert.ok(app.innerHTML.includes("SEP-2201"));
  assert.ok(app.innerHTML.includes("Bipar código do item"));
  assert.ok(app.innerHTML.includes("Rota de separação sugerida"));
  assert.ok(app.innerHTML.includes("Corredor"));
  vm.runInContext("fulfillmentModal=null;render()", context);
  vm.runInContext(
    "page='one';draft={name:'Teste',description:'Descrição',price:100};selected=['ml'];ads=[{channel:'ml',title:'Teste',description:'Descrição',warning:'GTIN não informado.',fixed:false}];oneStage=2;render()",
    context,
  );
  assert.ok(app.innerHTML.includes("Corrigir com WedTech AI"));
  vm.runInContext("ads[0].fixed=true;oneStage=3;render()", context);
  assert.ok(app.innerHTML.includes('data-action="publish"'));
});
test("login: tela de acesso, sem sessão renderiza login; após logar mostra o app; tour aparece uma vez", () => {
  const app = { innerHTML: "" };
  const doc = {
    querySelector: (s) => (s === "#app" ? app : null),
    body: { style: {} },
    addEventListener() {},
  };
  const store = new Map();
  const context = {
    WedTech: N,
    document: doc,
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
    },
    sessionStorage: {
      getItem() {
        return null;
      },
      setItem() {},
      removeItem() {},
    },
    navigator: { mediaDevices: undefined },
    location: { hash: "" },
    window: { addEventListener() {}, scrollTo() {} },
    setTimeout,
    clearTimeout,
    console,
    FileReader: class {},
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync("dist/qrcode.js", "utf8"), context);
  vm.runInContext(fs.readFileSync("dist/app.js", "utf8"), context);
  assert.ok(app.innerHTML.includes('id="login-form"'));
  assert.ok(app.innerHTML.includes("E-mail"));
  assert.ok(!app.innerHTML.includes("Visão geral"));
  vm.runInContext("loggedIn=true;tourStep=0;render()", context);
  assert.ok(app.innerHTML.includes("Visão geral"));
  assert.ok(app.innerHTML.includes("Bem-vindo ao WedTech"));
  vm.runInContext("tourStep=null;render()", context);
  assert.ok(!app.innerHTML.includes('class="tour-card"'));
  vm.runInContext("page='estoque';render()", context);
  assert.ok(app.innerHTML.includes('data-action="export-estoque-csv"'));
  assert.ok(app.innerHTML.includes("Estoque parado"));
  assert.ok(!app.innerHTML.includes("undefined"));
  vm.runInContext("page='config';render()", context);
  assert.ok(app.innerHTML.includes("Galpão Principal"));
  assert.ok(!app.innerHTML.includes("undefined"));
});
test("leitor IoT: saída dá baixa por SKU, entrada soma por código de barras", () => {
  const s = N.seed();
  const { product, order } = N.scanSale(s, "NK-RV8-001", "st1");
  assert.equal(product.id, "p0");
  assert.equal(product.stock, 17);
  assert.equal(order.channel, "lp");
  assert.equal(s.scanLog[0].type, "saida");
  assert.equal(s.scanLog[0].store, "Loja Tatuapé");
  const receive = N.scanReceive(s, "7891234500002", 5, "st1");
  assert.equal(receive.id, "p1");
  assert.equal(receive.stock, 70);
  assert.equal(s.scanLog[0].type, "entrada");
  assert.throws(() => N.scanSale(s, "CODIGO-INEXISTENTE"), /não reconhecido/);
  assert.throws(() => N.scanSale(s, ""), /Informe um código/);
});
test("separação de pedido: bipagem confere itens, baixa estoque e libera despacho", () => {
  const s = N.seed();
  const f = s.fulfillments[0];
  assert.throws(() => N.confirmSeparation(s, f.id), /Bipe todos os itens/);
  assert.throws(
    () => N.scanFulfillmentItem(s, f.id, "CODIGO-ERRADO"),
    /não pertence/,
  );
  N.scanFulfillmentItem(s, f.id, "MS-G500-003");
  assert.equal(f.items[0].scanned, true);
  assert.equal(f.status, "separating");
  N.scanFulfillmentItem(s, f.id, "7891234500007");
  assert.equal(f.items[1].scanned, true);
  const before2 = s.products.find((p) => p.id === "p2").stock;
  const before6 = s.products.find((p) => p.id === "p6").stock;
  const ordersBefore = s.orders.length;
  N.confirmSeparation(s, f.id);
  assert.equal(f.status, "separated");
  assert.equal(s.products.find((p) => p.id === "p2").stock, before2 - 2);
  assert.equal(s.products.find((p) => p.id === "p6").stock, before6 - 1);
  assert.equal(s.orders.length, ordersBefore + 2);
  assert.equal(N.metrics(s).pendingSeparations, 1);
  N.dispatchFulfillment(s, f.id);
  assert.equal(f.status, "shipped");
  assert.throws(() => N.dispatchFulfillment(s, f.id), /Separe/);
});
test("novo pedido entra na fila e cadastro de loja valida nome e CNPJ", () => {
  const s = N.seed();
  const before = s.fulfillments.length;
  const f = N.newFulfillment(s, "ml");
  assert.equal(s.fulfillments.length, before + 1);
  assert.equal(s.fulfillments[0].id, f.id);
  assert.equal(f.status, "pending");
  assert.ok(f.items.length >= 1);
  assert.equal(N.metrics(s).pendingSeparations, 3);
  const store = N.addStore(s, {
    name: "Loja Teste",
    cnpj: "11.111.111/0001-11",
    address: "Rua X",
    type: "loja",
  });
  assert.equal(s.stores.length, 3);
  assert.equal(store.active, true);
  assert.throws(
    () => N.addStore(s, { name: "Outra", cnpj: "11.111.111/0001-11" }),
    /CNPJ/,
  );
  assert.throws(() => N.addStore(s, { name: "", cnpj: "" }), /nome e CNPJ/i);
});
test("previsão identifica risco de ruptura e estoque parado (excesso)", () => {
  const s = N.seed();
  const all = N.forecast(s);
  const ruptura = all.filter((f) => f.risk === "critico" || f.risk === "atencao");
  const excesso = all.filter((f) => f.risk === "excesso");
  assert.deepEqual(
    ruptura.map((f) => f.productId).sort(),
    ["p0", "p8"],
  );
  assert.deepEqual(
    excesso.map((f) => f.productId).sort(),
    ["p2", "p4", "p7", "p9"],
  );
  assert.ok(excesso.every((f) => f.suggestedDiscount >= 10 && f.suggestedDiscount <= 30));
  assert.match(
    N.answer(s, "Tenho risco de ficar sem estoque?"),
    /Nike Revolution 8.*esgota em/s,
  );
  assert.match(N.answer(s, "Tenho produtos parados?"), /Mouse Gamer G500.*liquidação/s);
  const b = N.businessImpact(s);
  assert.equal(b.atRiskCount, 2);
  assert.equal(b.overstockCount, 4);
  assert.ok(b.salesAtRisk > 0);
  assert.ok(b.capitalParado > 0);
  assert.match(N.answer(s, "Qual o impacto financeiro do estoque?"), /vendas.*em risco/is);
});
test("pedidos de compra: geração automática, envio e recebimento repõem o estoque", () => {
  const s = N.seed();
  const created = N.autoGeneratePurchaseOrders(s);
  assert.equal(created.length, 1);
  assert.equal(created[0].items[0].productId, "p0");
  assert.equal(N.metrics(s).openPurchaseOrders, 2);
  // gerar de novo não duplica pedido para o mesmo produto
  assert.equal(N.autoGeneratePurchaseOrders(s).length, 0);
  const po = created[0];
  N.sendPurchaseOrder(s, po.id);
  assert.equal(po.status, "sent");
  assert.throws(() => N.sendPurchaseOrder(s, po.id), /já foi enviado/);
  const before = s.products.find((p) => p.id === "p0").stock;
  N.receivePurchaseOrder(s, po.id);
  assert.equal(
    s.products.find((p) => p.id === "p0").stock,
    before + po.items[0].qty,
  );
  assert.equal(po.status, "received");
  assert.throws(() => N.receivePurchaseOrder(s, po.id), /já foi recebido/);
  assert.throws(() => N.receivePurchaseOrder(s, "PO-9999"), /não encontrado/);
});
test("divergência de inventário: simulação e correção pela WedTech AI", () => {
  const s = N.seed();
  const check = N.simulateInventoryCount(s, "p0");
  assert.equal(check.systemStock, 18);
  assert.equal(check.countedStock, 17);
  assert.equal(check.status, "open");
  assert.equal(N.metrics(s).openInventoryChecks, 1);
  N.resolveInventoryCheck(s, check.id);
  assert.equal(check.status, "resolved");
  assert.equal(s.products.find((p) => p.id === "p0").stock, 17);
  assert.equal(N.metrics(s).openInventoryChecks, 0);
  assert.throws(() => N.resolveInventoryCheck(s, check.id), /já foi resolvida/);
});
test("cadastro de fornecedor valida nome e CNPJ", () => {
  const s = N.seed();
  const supplier = N.addSupplier(s, {
    name: "Distribuidora Beta",
    cnpj: "55.666.777/0001-88",
    contact: "contato@beta.com.br",
    leadTimeDays: 3,
  });
  assert.equal(s.suppliers.length, 4);
  assert.equal(supplier.leadTimeDays, 3);
  assert.throws(
    () => N.addSupplier(s, { name: "Outra", cnpj: "55.666.777/0001-88" }),
    /CNPJ/,
  );
  assert.throws(() => N.addSupplier(s, { name: "", cnpj: "" }), /nome e CNPJ/i);
});
test("financeiro: lucro considera custo e despesas, e nova despesa reduz o lucro líquido", () => {
  const s = N.seed();
  const fin = N.financials(s);
  assert.equal(fin.revenue, 4850);
  assert.equal(fin.grossProfit, 920.84);
  assert.equal(fin.netProfit, 323.84);
  assert.ok(fin.netProfit >= 0, "lucro líquido inicial deve ser positivo na demonstração");
  N.addExpense(s, { category: "Embalagens", description: "Caixas", amount: 45 });
  assert.equal(N.financials(s).totalExpenses, 642);
  assert.equal(N.financials(s).netProfit, 278.84);
  assert.match(N.answer(s, "Qual meu lucro hoje?"), /Lucro líquido/);
  assert.throws(
    () => N.addExpense(s, { category: "", amount: 0 }),
    /categoria e um valor válido/,
  );
});
test("venda e despacho geram NF e etiqueta simuladas, e notificações refletem os eventos", () => {
  const s = N.seed();
  assert.equal(N.metrics(s).unreadNotifications, 2);
  const { order, invoice } = N.scanSale(s, "NK-RV8-001", "st1");
  assert.equal(order.invoiceId, invoice.id);
  assert.equal(s.invoices[0].id, invoice.id);
  assert.equal(s.invoices[0].key.length, 44);
  assert.equal(N.metrics(s).unreadNotifications, 3);
  N.markNotificationsRead(s);
  assert.equal(N.metrics(s).unreadNotifications, 0);
  const f = s.fulfillments[0];
  N.scanFulfillmentItem(s, f.id, "MS-G500-003");
  N.scanFulfillmentItem(s, f.id, "7891234500007");
  N.confirmSeparation(s, f.id);
  N.dispatchFulfillment(s, f.id);
  assert.ok(f.invoiceId);
  assert.ok(f.labelId);
  assert.equal(s.labels[0].id, f.labelId);
  assert.match(s.labels[0].trackingCode, /^WT\d+$/);
  assert.equal(N.metrics(s).unreadNotifications, 1);
});
test("dashboard destaca o WedTech AI e oferece navegação acessível", () => {
  const app = { innerHTML: "" };
  const doc = {
    querySelector: (s) => (s === "#app" ? app : null),
    body: { style: {} },
    addEventListener() {},
  };
  const context = {
    WedTech: N,
    document: doc,
    localStorage: {
      getItem() {
        return null;
      },
      setItem() {},
    },
    sessionStorage: {
      getItem() {
        return "1";
      },
      setItem() {},
      removeItem() {},
    },
    navigator: { mediaDevices: undefined },
    location: { hash: "#dashboard" },
    window: { addEventListener() {}, scrollTo() {} },
    setTimeout,
    clearTimeout,
    console,
    FileReader: class {},
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync("dist/app.js", "utf8"), context);
  assert.match(app.innerHTML, /WEDTECH AI · COPILOTO DA OPERAÇÃO/);
  assert.match(app.innerHTML, /id="dashboard-ai-form"/);
  assert.match(app.innerHTML, /37 pedidos/);
  assert.match(app.innerHTML, /Pular para o conteúdo principal/);
  assert.match(app.innerHTML, /aria-label="Navegação principal"/);
  assert.match(app.innerHTML, /id="main-content" tabindex="-1"/);
  assert.match(app.innerHTML, /for="dashboard-ai-question"/);
});
