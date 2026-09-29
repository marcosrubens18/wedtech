// Testes de renderização do painel e do site da loja (sem navegador)
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const pub = (f) => path.join(__dirname, "..", "public", f);

// Lê a ordem dos scripts direto do HTML, para o teste nunca ficar desatualizado
function scriptsOf(html) {
  return [...fs.readFileSync(pub(html), "utf8").matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);
}

function browser({ session = "1", hash = "", saved = null } = {}) {
  const app = { innerHTML: "" };
  const store = new Map();
  if (saved) store.set("wedtech-demo-v3", saved);
  const ctx = {
    document: {
      querySelector: (s) => (s === "#app" ? app : null),
      querySelectorAll: () => [],
      getElementById: () => null,
      addEventListener() {},
      body: { style: {} },
    },
    localStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) },
    sessionStorage: { getItem: () => session, setItem() {}, removeItem() {} },
    navigator: {},
    location: { hash, href: "http://localhost/app.html" },
    addEventListener() {},
    scrollTo() {},
    setTimeout,
    clearTimeout,
    console,
    URL,
    URLSearchParams,
    FileReader: class {},
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  return { ctx, app, store, run: (code) => vm.runInContext(code, ctx) };
}
function load(b, html) {
  for (const src of scriptsOf(html)) b.run(fs.readFileSync(pub(src), "utf8"));
}

test("painel: login → tipo de loja → todas as telas renderizam sem 'undefined'", () => {
  const b = browser({ session: null });
  load(b, "app.html");
  assert.match(b.app.innerHTML, /id="login-form"/);
  b.run("ui.loggedIn=true;render()");
  assert.match(b.app.innerHTML, /Qual é o tipo da sua loja/);
  b.run("chooseStoreType('moda')");
  const pages = ["inicio", "balcao", "pedidos", "estoque", "produtos", "canais", "compras", "sazonalidade", "ads", "financeiro", "automacoes", "ai", "config"];
  for (const p of pages) {
    b.run(`ui.tourStep=null;ui.page='${p}';render()`);
    assert.ok(b.app.innerHTML.includes("WedTech"), p);
    assert.ok(!b.app.innerHTML.includes("undefined"), "undefined em " + p);
    assert.ok(!b.app.innerHTML.includes("NaN"), "NaN em " + p);
  }
  for (const tipo of ["moda", "alimentacao", "eletronicos"]) {
    b.run("state=WedTech.seed('" + tipo + "');state.setupDone=true;");
    for (const p of pages) {
      b.run("ui.page='" + p + "';render()");
      assert.ok(!b.app.innerHTML.includes("undefined"), "undefined em " + p + " (" + tipo + ")");
      assert.ok(!b.app.innerHTML.includes("NaN"), "NaN em " + p + " (" + tipo + ")");
    }
    for (const c of b.run("WedTech.channelsFor(state).map(c=>c.id)")) {
      b.run("ui.page='canal';ui.channelPage='" + c + "';render()");
      assert.ok(!b.app.innerHTML.includes("undefined"), "undefined no canal " + c);
    }
  }
});

test("painel: início simples com 'O que fazer agora' e IA", () => {
  const b = browser();
  load(b, "app.html");
  b.run("state.setupDone=true;ui.page='inicio';render()");
  const h = b.app.innerHTML;
  assert.match(h, /O que fazer agora/);
  assert.match(h, /Pedidos para resolver/);
  assert.match(h, /Primeiros passos/);
  assert.match(h, /A IA TRABALHOU POR VOCÊ/);
  assert.match(h, /id="dashboard-ai-form"/);
  assert.match(h, /aria-label="Navegação principal"/);
  assert.match(h, /id="main-content" tabindex="-1"/);
});

test("painel: gavetas de produto, pedido, recebimento e documentos", () => {
  const b = browser();
  load(b, "app.html");
  b.run("state.setupDone=true;ui.page='produtos';openDrawer('produto','p1');render()");
  assert.match(b.app.innerHTML, /Etiqueta com código de barras/);
  assert.match(b.app.innerHTML, /<svg class="barcode"/);
  assert.match(b.app.innerHTML, /Estoque mínimo/);
  b.run("openDrawer('pedido', state.orders.find(o=>o.status==='pronto').id);render()");
  assert.match(b.app.innerHTML, /Bipe o QR do cliente/);
  assert.match(b.app.innerHTML, /<svg/);
  b.run("openDrawer('pedido', state.orders.find(o=>o.status==='novo').id);render()");
  assert.match(b.app.innerHTML, /Rota de separação sugerida/);
  b.run("openDrawer('receber', state.purchaseOrders[0].id);render()");
  assert.match(b.app.innerHTML, /Bipe o produto que chegou/);
  b.run("const r=WedTech.sellCounter(state,[{productId:'p2',qty:1}]);openDrawer('doc','invoice:'+r.invoice.id);render()");
  assert.match(b.app.innerHTML, /NOTA FISCAL SIMULADA/);
  assert.ok(!b.app.innerHTML.includes("undefined"));
});

test("painel: fluxo da demo aparece nas telas (pedido da IA e trava)", () => {
  const b = browser();
  load(b, "app.html");
  b.run("state.setupDone=true;WedTech.sellCounter(state,[{productId:'p1',qty:1}]);ui.page='compras';render()");
  assert.match(b.app.innerHTML, /aguardando sua confirmação/);
  assert.match(b.app.innerHTML, /data-confirm-po="PC-3002"/);
  b.run("ui.page='automacoes';render()");
  assert.match(b.app.innerHTML, /Pausei os anúncios de Tênis Casual Conforto/);
  b.run("ui.page='canal';ui.channelPage='ml';render()");
  assert.match(b.app.innerHTML, /Pausado pela IA/);
});

test("site da loja: vitrine, carrinho e confirmação com QR de retirada", () => {
  const b = browser();
  load(b, "loja.html");
  const h = b.app.innerHTML;
  assert.match(h, /Maria Moda &amp; Calçados/);
  assert.match(h, /Retire grátis na loja/);
  assert.ok(!h.includes("undefined"));
  b.run("chosen['p2']='v2';addItem('p2');addItem('p2');view='cart';renderStore()");
  assert.match(b.app.innerHTML, /Tamanho M/);
  assert.match(b.app.innerHTML, /Retirar na loja/);
  assert.match(b.app.innerHTML, /Receber em casa/);
  b.run("const o=WedTech.createOrder(state,{channel:'site',type:'retirada',customer:{name:'Ana'},items:[{productId:'p2',qty:1}]});lastOrder=o.id;view='done';renderStore()");
  assert.match(b.app.innerHTML, /RET-\d{6}/);
  assert.match(b.app.innerHTML, /<svg/);
});

test("painel: balcão com pagamento, estoque com grade e validade, relatórios", () => {
  const b = browser();
  load(b, "app.html");
  b.run("state.setupDone=true;ui.page='balcao';addToCart('p1');ui.payment={stage:'choose'};render()");
  assert.match(b.app.innerHTML, /Como o cliente vai pagar/);
  b.run("ui.payment={stage:'pix',token:1};render()");
  assert.match(b.app.innerHTML, /QR Pix/);
  b.run("ui.payment={stage:'dinheiro'};render()");
  assert.match(b.app.innerHTML, /Valor recebido/);
  b.run("ui.payment=null;ui.page='estoque';render()");
  assert.match(b.app.innerHTML, /Grade de tamanhos/);
  b.run("state=WedTech.seed('alimentacao');state.setupDone=true;ui.page='estoque';render()");
  assert.match(b.app.innerHTML, /Validade e lotes/);
  assert.match(b.app.innerHTML, /data-promo=/);
  b.run("ui.page='sazonalidade';render()");
  assert.match(b.app.innerHTML, /Como foram as últimas datas/);
  b.run("ui.page='canal';ui.channelPage='ifood';render()");
  assert.match(b.app.innerHTML, /Preço neste canal/);
  assert.ok(!b.app.innerHTML.includes("undefined"));
});

test("painel: devolução, lojas e etiquetas eletrônicas renderizam", () => {
  const b = browser();
  load(b, "app.html");
  b.run("state.setupDone=true;ui.page='pedidos';ui.pedidosTab='devolucoes';render()");
  assert.match(b.app.innerHTML, /Cliente veio devolver ou trocar/);
  b.run("openDrawer('pedido', state.orders.find(o=>o.status==='enviado').id);render()");
  assert.match(b.app.innerHTML, /id="return-form"/);
  b.run("ui.drawer=null;WedTech.addShop(state,{name:'Loja Centro'});ui.page='estoque';render()");
  assert.match(b.app.innerHTML, /Lojas e transferências/);
  assert.match(b.app.innerHTML, /Etiquetas eletrônicas/);
  assert.match(b.app.innerHTML, /<th>Loja Centro<\/th>/);
  b.run("ui.page='balcao';render()");
  assert.match(b.app.innerHTML, /Vendendo na/);
  b.run("ui.page='config';render()");
  assert.match(b.app.innerHTML, /Suas lojas/);
  assert.ok(!b.app.innerHTML.includes("undefined"));
});
