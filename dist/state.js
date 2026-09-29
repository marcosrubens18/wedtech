(function (global) {
  "use strict";

  // Marketplace metadata
  const channels = [
    { id: "ml", name: "Mercado Livre", short: "ML", color: "#31866a" },
    { id: "sh", name: "Shopee", short: "S", color: "#f59d62" },
    { id: "tk", name: "TikTok Shop", short: "Tk", color: "#344e46" },
    { id: "mg", name: "Magalu", short: "M", color: "#4b9cdd" },
    { id: "lp", name: "Loja própria", short: "N", color: "#b4cfbd" },
  ];
  // Fulfillment (separation) status labels
  const fulfillmentStatus = {
    pending: "Aguardando separação",
    separating: "Em separação",
    separated: "Separado · pronto para etiqueta",
    shipped: "Saiu para entrega",
  };
  // Purchase order (pedido de compra a fornecedor) status labels
  const purchaseOrderStatus = {
    suggested: "Sugerido pela previsão",
    sent: "Enviado ao fornecedor",
    received: "Recebido · estoque reposto",
  };
  const brl = (n) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
      n,
    );
  // Gera uma sequência de dígitos pseudoaleatória e determinística (não é uma chave fiscal real)
  function pseudoDigits(seed, length) {
    let x = 0;
    for (const ch of String(seed)) x = (x * 31 + ch.charCodeAt(0)) % 1e9;
    let out = "";
    for (let i = 0; i < length; i++) {
      x = (x * 1103515245 + 12345) % 1000000007;
      out += Math.abs(x) % 10;
    }
    return out;
  }
  // Initial demonstration data
  function seed() {
    const items = [
      [
        "Nike Revolution 8",
        "NK-RV8-001",
        399.9,
        18,
        "Nike",
        "Calçados",
        "shoe",
      ],
      [
        "Smartwatch Fit Pro",
        "SW-FP-002",
        249.9,
        65,
        "Fit Pro",
        "Eletrônicos",
        "watch",
      ],
      [
        "Mouse Gamer G500",
        "MS-G500-003",
        129.9,
        142,
        "Logitech",
        "Informática",
        "mouse",
      ],
      [
        "Headset Gamer X200",
        "HS-X200-004",
        189.9,
        94,
        "HyperX",
        "Informática",
        "headset",
      ],
      [
        "Garrafa Térmica 750ml",
        "GT-750-005",
        89.9,
        120,
        "Termix",
        "Casa",
        "box",
      ],
      [
        "Mochila Urban 20L",
        "MC-URB-006",
        159.9,
        82,
        "Urban",
        "Acessórios",
        "bag",
      ],
      [
        "Teclado Mecânico K68",
        "TC-K68-007",
        279.9,
        76,
        "Redragon",
        "Informática",
        "keyboard",
      ],
      [
        "Camiseta Essential",
        "CM-ESS-008",
        59.9,
        136,
        "Basics",
        "Vestuário",
        "shirt",
      ],
      [
        "Caixa de Som Mini",
        "CX-MINI-009",
        119.9,
        12,
        "JBL",
        "Eletrônicos",
        "speaker",
      ],
      [
        "Suporte Notebook Alumínio",
        "SP-NB-010",
        99.9,
        97,
        "Office",
        "Informática",
        "box",
      ],
    ];
    // Fornecedor preferencial por categoria, usado na reposição automática
    const supplierByCategory = {
      Calçados: "sp2",
      Vestuário: "sp2",
      Eletrônicos: "sp1",
      Informática: "sp1",
      Casa: "sp3",
      Acessórios: "sp3",
    };
    // Fração do preço que representa o custo de aquisição, por categoria — categorias
    // diferentes têm margens diferentes, como em um varejo real.
    const costRatioByCategory = {
      Calçados: 0.58,
      Eletrônicos: 0.62,
      Informática: 0.6,
      Casa: 0.5,
      Acessórios: 0.45,
      Vestuário: 0.4,
    };
    // Corredor do Galpão Principal onde cada categoria fica armazenada — usado na
    // sugestão de rota de separação (agrupar a coleta por corredor reduz deslocamento).
    const aisleByCategory = {
      Calçados: "A",
      Vestuário: "A",
      Informática: "B",
      Eletrônicos: "C",
      Casa: "D",
      Acessórios: "D",
    };
    const products = items.map((p, i) => ({
      id: "p" + i,
      name: p[0],
      sku: p[1],
      price: p[2],
      // Custo de aquisição estimado (usado no cálculo de margem/financeiro)
      cost: Math.round(p[2] * (costRatioByCategory[p[5]] ?? 0.6) * 100) / 100,
      stock: p[3],
      // Estoque mínimo recomendado: abaixo disso, a previsão de ruptura considera o produto crítico
      minStock: 20,
      brand: p[4],
      category: p[5],
      icon: p[6],
      // Código de barras (EAN-13 demonstrativo) usado pelo leitor IoT
      barcode: "789123450" + String(i + 1).padStart(4, "0"),
      // Fornecedor vinculado, usado na geração automática de pedidos de compra
      supplierId: supplierByCategory[p[5]] || "sp1",
      // Corredor no Galpão Principal, usado na rota de separação sugerida
      aisle: (aisleByCategory[p[5]] || "E") + ((i % 4) + 1),
      description:
        i === 0
          ? "Tênis masculino para corrida. Conforto e leveza para acompanhar seu ritmo."
          : "Qualidade e praticidade para o dia a dia.",
      features:
        i === 0
          ? "Leve, respirável, solado emborrachado"
          : "Acabamento resistente, garantia de 90 dias",
      channels: ["ml", "sh", "tk", "lp"],
      issue: i === 1,
      slow: i === 3,
      image: "",
    }));
    const orders = Array.from({ length: 37 }, (_, i) => ({
      id: "WT-" + (1040 + i),
      productId: "p" + (i % 10),
      channel: i < 18 ? "ml" : i < 29 ? "sh" : "tk",
      quantity: 1,
      amount: i === 36 ? 170 : 130,
      time:
        "Hoje, " +
        String(8 + Math.floor(i / 6)).padStart(2, "0") +
        ":" +
        String((i % 6) * 9).padStart(2, "0"),
    }));
    return {
      // Incrementada sempre que o formato dos dados muda — descarta dados antigos
      // salvos no navegador (localStorage) em vez de quebrar com campos ausentes.
      version: 2,
      products,
      orders,
      connected: ["ml", "sh", "tk"],
      history: [
        { text: "Catálogo central sincronizado", time: "Há 2 minutos" },
        { text: "WedTech AI analisou 10 produtos", time: "Há 5 minutos" },
        { text: "Anúncio da Shopee precisa de atenção", time: "Há 12 minutos" },
      ],
      salesWeek: [2350, 3180, 2780, 3920, 3540, 4200],
      shareBase: { ml: 10424.4, sh: 7694.2, tk: 4219.4, lp: 2482 },
      // Dados da empresa (painel de configurações)
      company: {
        name: "WedTech Comércio de Produtos Ltda",
        cnpj: "48.123.456/0001-09",
        ie: "148.256.987.114",
      },
      // Lojas e centros de distribuição cadastrados
      stores: [
        {
          id: "st1",
          name: "Loja Tatuapé",
          type: "loja",
          cnpj: "48.123.456/0001-09",
          address: "Rua Serra de Bragança, 1000 — Tatuapé, São Paulo/SP",
          active: true,
        },
        {
          id: "st2",
          name: "CD Guarulhos",
          type: "cd",
          cnpj: "48.123.456/0002-80",
          address: "Rod. Hélio Smidt, 500 — Cumbica, Guarulhos/SP",
          active: true,
          // Galpão Principal: o estoque é único e compartilhado, mas fisicamente
          // centralizado aqui — é daqui que a separação de pedidos e a reposição
          // das lojas partem.
          hub: true,
        },
      ],
      // Fornecedores cadastrados, usados na reposição automática de estoque
      suppliers: [
        {
          id: "sp1",
          name: "Distribuidora Alfa Eletrônicos",
          cnpj: "22.333.444/0001-55",
          contact: "compras@alfaeletronicos.com.br",
          leadTimeDays: 5,
        },
        {
          id: "sp2",
          name: "Nike do Brasil Comércio",
          cnpj: "33.444.555/0001-66",
          contact: "vendas@nikebr.com.br",
          leadTimeDays: 7,
        },
        {
          id: "sp3",
          name: "Import Acessórios Ltda",
          cnpj: "44.555.666/0001-77",
          contact: "pedidos@importacessorios.com.br",
          leadTimeDays: 4,
        },
      ],
      // Pedidos de compra a fornecedores (reposição automática de estoque)
      purchaseOrders: [
        {
          id: "PO-3001",
          supplierId: "sp1",
          items: [
            {
              productId: "p8",
              sku: "CX-MINI-009",
              name: "Caixa de Som Mini",
              qty: 40,
            },
          ],
          status: "sent",
          createdAt: "Ontem, 16:40",
        },
      ],
      // Divergências entre estoque do sistema e contagem física (leitor IoT)
      inventoryChecks: [],
      // Registro de leituras do leitor IoT (entrada, saída e separação)
      scanLog: [],
      // Notas fiscais simuladas (sem validade fiscal real)
      invoices: [],
      // Etiquetas de envio simuladas
      labels: [],
      // Despesas operacionais simuladas (rateio diário, comparável à receita "de hoje")
      expenses: [
        {
          id: "DESP-1",
          category: "Aluguel",
          description: "Aluguel da Loja Tatuapé (rateio diário)",
          amount: 140,
          date: "Hoje",
        },
        {
          id: "DESP-2",
          category: "Marketing",
          description: "Campanha patrocinada no Mercado Livre",
          amount: 85,
          date: "Hoje",
        },
        {
          id: "DESP-3",
          category: "Frete",
          description: "Frete de reposição de estoque",
          amount: 62,
          date: "Hoje",
        },
        {
          id: "DESP-4",
          category: "Salários",
          description: "Equipe de operação (rateio diário)",
          amount: 310,
          date: "Hoje",
        },
      ],
      // Notificações da operação (sininho do dashboard)
      notifications: [
        {
          id: "NT-seed-1",
          type: "separacao",
          text: "Nova venda no Mercado Livre: pedido SEP-2201 aguardando separação",
          time: "Há 12 minutos",
          read: false,
        },
        {
          id: "NT-seed-2",
          type: "estoque",
          text: "Caixa de Som Mini está abaixo do estoque mínimo",
          time: "Há 30 minutos",
          read: false,
        },
      ],
      // Pedidos de marketplace aguardando separação/expedição no estoque físico
      fulfillments: [
        {
          id: "SEP-2201",
          channel: "ml",
          createdAt: "Hoje, 09:10",
          status: "pending",
          items: [
            {
              productId: "p2",
              sku: "MS-G500-003",
              name: "Mouse Gamer G500",
              qty: 2,
              scanned: false,
            },
            {
              productId: "p6",
              sku: "TC-K68-007",
              name: "Teclado Mecânico K68",
              qty: 1,
              scanned: false,
            },
          ],
        },
        {
          id: "SEP-2202",
          channel: "sh",
          createdAt: "Hoje, 10:35",
          status: "pending",
          items: [
            {
              productId: "p3",
              sku: "HS-X200-004",
              name: "Headset Gamer X200",
              qty: 1,
              scanned: false,
            },
          ],
        },
      ],
    };
  }
  // Derived operational metrics
  function metrics(s) {
    return {
      revenue:
        Math.round(s.orders.reduce((a, o) => a + o.amount, 0) * 100) / 100,
      orders: s.orders.length,
      products: s.products.length,
      stock: s.products.reduce((a, p) => a + p.stock, 0),
      connected: s.connected.length,
      alerts:
        s.products.filter((p) => p.stock < 20).length +
        s.products.filter((p) => p.issue).length +
        s.products.filter((p) => p.slow).length +
        2,
      pendingSeparations: s.fulfillments.filter(
        (f) => f.status === "pending" || f.status === "separating",
      ).length,
      unreadNotifications: s.notifications.filter((n) => !n.read).length,
      openPurchaseOrders: s.purchaseOrders.filter(
        (po) => po.status !== "received",
      ).length,
      openInventoryChecks: s.inventoryChecks.filter((c) => c.status === "open")
        .length,
    };
  }
  // Previsão de ruptura E de excesso: velocidade de venda, dias restantes até
  // esgotar (ou dias de cobertura parada) por produto — os dois lados da mesma
  // moeda numa gestão de estoque inteligente.
  const OVERSTOCK_DAYS = 28; // cobertura acima disso é considerada estoque parado
  function forecast(s) {
    return s.products.map((p) => {
      const sold = s.orders
        .filter((o) => o.productId === p.id)
        .reduce((a, o) => a + o.quantity, 0);
      // Demonstração: os pedidos são todos "de hoje", então as unidades vendidas
      // hoje representam a velocidade diária considerada na previsão.
      const dailySales = sold;
      const daysToStockout =
        dailySales > 0 ? Math.round((p.stock / dailySales) * 10) / 10 : null;
      const min = p.minStock ?? 20;
      let risk, suggestedDiscount;
      if (p.stock <= min) {
        risk = "critico";
      } else if (daysToStockout !== null && daysToStockout <= 3) {
        risk = "atencao";
      } else if (
        (daysToStockout === null || daysToStockout >= OVERSTOCK_DAYS) &&
        p.stock > min * 2
      ) {
        risk = "excesso";
        const days = daysToStockout ?? OVERSTOCK_DAYS + 30;
        suggestedDiscount = Math.max(
          10,
          Math.min(30, 10 + Math.round((days - OVERSTOCK_DAYS) / 4)),
        );
      } else {
        risk = "ok";
      }
      return {
        productId: p.id,
        name: p.name,
        stock: p.stock,
        minStock: min,
        dailySales,
        daysToStockout,
        risk,
        suggestedDiscount: suggestedDiscount ?? null,
      };
    });
  }
  // Traduz a previsão em impacto financeiro: quanto está em risco de não vender
  // (ruptura) e quanto capital está parado em estoque excedente — para o pitch.
  function businessImpact(s) {
    const list = forecast(s);
    const priceOf = (id) => s.products.find((p) => p.id === id)?.price || 0;
    const costOf = (id) => s.products.find((p) => p.id === id)?.cost || 0;
    const atRisk = list.filter((f) => f.risk === "critico" || f.risk === "atencao");
    const overstock = list.filter((f) => f.risk === "excesso");
    const salesAtRisk =
      Math.round(
        atRisk.reduce((a, f) => {
          const demand = f.dailySales * 7;
          const shortfall = Math.max(0, demand - f.stock);
          return a + shortfall * priceOf(f.productId);
        }, 0) * 100,
      ) / 100;
    const capitalParado =
      Math.round(
        overstock.reduce((a, f) => {
          const excess = Math.max(0, f.stock - f.minStock * 2);
          return a + excess * costOf(f.productId);
        }, 0) * 100,
      ) / 100;
    return {
      salesAtRisk,
      capitalParado,
      atRiskCount: atRisk.length,
      overstockCount: overstock.length,
    };
  }
  // State mutations used by the demonstration
  function pushNotification(s, type, text) {
    s.notifications.unshift({
      id: "NT-" + (s.notifications.length + 1) + "-" + Date.now(),
      type,
      text,
      time: "Agora",
      read: false,
    });
    if (s.notifications.length > 30) s.notifications.length = 30;
  }
  function markNotificationsRead(s) {
    s.notifications.forEach((n) => (n.read = true));
  }
  function sell(s, id) {
    const p = s.products.find((p) => p.id === id);
    if (!p || p.stock < 1) throw Error("Produto sem estoque disponível.");
    p.stock--;
    const o = {
      id: "WT-" + (1040 + s.orders.length),
      productId: id,
      channel: "ml",
      quantity: 1,
      amount: p.price,
      time: "Agora",
    };
    s.orders.push(o);
    s.shareBase.ml += p.price;
    s.history.unshift({
      text: "Venda de " + p.name + " • estoque sincronizado: " + p.stock,
      time: "Agora",
    });
    pushNotification(s, "venda", "Nova venda no Mercado Livre: " + p.name);
    return o;
  }
  function publish(s, draft, selected, ads) {
    if (!selected.length) throw Error("Selecione pelo menos um canal.");
    if (s.products.some((p) => p.sku.toLowerCase() === draft.sku.toLowerCase()))
      throw Error("Este SKU já existe no catálogo. Use outro SKU.");
    const price = Number(draft.price);
    const p = {
      ...draft,
      id: "p" + Date.now(),
      price,
      stock: Number(draft.stock),
      cost: draft.cost ? Number(draft.cost) : Math.round(price * 0.6 * 100) / 100,
      minStock: draft.minStock ? Number(draft.minStock) : 20,
      supplierId: draft.supplierId || null,
      barcode: draft.barcode || "",
      channels: [...selected],
      icon: "box",
      issue: false,
      slow: false,
      ads,
    };
    s.products.push(p);
    s.history.unshift({
      text: p.name + " publicado em " + selected.length + " canais (simulação)",
      time: "Agora",
    });
    return p;
  }
  // Encontra um produto pelo SKU ou pelo código de barras (leitura do leitor IoT)
  function findByCode(s, code) {
    const c = String(code || "")
      .trim()
      .toLowerCase();
    if (!c) throw Error("Informe um código de barras ou SKU.");
    const p = s.products.find(
      (p) =>
        p.sku.toLowerCase() === c || (p.barcode || "").toLowerCase() === c,
    );
    if (!p) throw Error("Código não reconhecido no catálogo.");
    return p;
  }
  // Gera uma nota fiscal simulada (sem validade fiscal real) para uma venda ou despacho
  function generateInvoice(s, items, context) {
    const total =
      Math.round(items.reduce((a, it) => a + it.price * it.qty, 0) * 100) /
      100;
    const inv = {
      id: "NF-" + (1000 + s.invoices.length + 1),
      key: pseudoDigits("NF" + s.invoices.length + "-" + Date.now(), 44),
      items,
      total,
      context,
      date: "Agora",
    };
    s.invoices.unshift(inv);
    return inv;
  }
  // Gera uma etiqueta de envio simulada para um pedido despachado
  function generateLabel(s, f) {
    const channel = channels.find((c) => c.id === f.channel);
    const qty = f.items.reduce((a, it) => a + it.qty, 0);
    const lbl = {
      id: "ETQ-" + (5000 + s.labels.length + 1),
      trackingCode: "WT" + pseudoDigits("ETQ-" + f.id, 10),
      fulfillmentId: f.id,
      channel: f.channel,
      recipient: (channel ? channel.name : "Cliente") + " · Cliente da demonstração",
      weight: Math.max(0.2, Math.round(qty * 0.35 * 10) / 10),
      date: "Agora",
    };
    s.labels.unshift(lbl);
    return lbl;
  }
  // Leitura de SAÍDA na loja física: bipar = venda imediata, baixa de estoque e NF simulada
  function scanSale(s, code, storeId) {
    const p = findByCode(s, code);
    if (p.stock < 1) throw Error(p.name + " está sem estoque disponível.");
    const store =
      s.stores.find((st) => st.id === storeId) || s.stores[0] || null;
    p.stock--;
    const o = {
      id: "WT-" + (1040 + s.orders.length),
      productId: p.id,
      channel: "lp",
      quantity: 1,
      amount: p.price,
      time: "Agora",
    };
    s.orders.push(o);
    s.shareBase.lp = (s.shareBase.lp || 0) + p.price;
    const invoice = generateInvoice(
      s,
      [{ productId: p.id, sku: p.sku, name: p.name, qty: 1, price: p.price }],
      { channel: "lp", store: store ? store.name : "Loja" },
    );
    o.invoiceId = invoice.id;
    s.scanLog.unshift({
      id: "SC-" + (s.scanLog.length + 1),
      type: "saida",
      sku: p.sku,
      product: p.name,
      store: store ? store.name : "Loja",
      time: "Agora",
    });
    s.history.unshift({
      text:
        "Leitor IoT: venda de " +
        p.name +
        (store ? " na " + store.name : "") +
        " • estoque sincronizado: " +
        p.stock +
        " • NF " +
        invoice.id +
        " gerada",
      time: "Agora",
    });
    pushNotification(
      s,
      "venda",
      "Venda registrada" + (store ? " na " + store.name : "") + ": " + p.name,
    );
    return { product: p, order: o, invoice };
  }
  // Leitura de ENTRADA na loja física: bipar = soma ao estoque (recebimento/reposição)
  function scanReceive(s, code, qty, storeId) {
    const p = findByCode(s, code);
    const n = Math.max(1, Math.min(9999, Math.round(Number(qty) || 1)));
    const store =
      s.stores.find((st) => st.id === storeId) || s.stores[0] || null;
    p.stock += n;
    s.scanLog.unshift({
      id: "SC-" + (s.scanLog.length + 1),
      type: "entrada",
      sku: p.sku,
      product: p.name,
      store: store ? store.name : "Loja",
      time: "Agora",
    });
    s.history.unshift({
      text:
        "Leitor IoT: entrada de " +
        n +
        " un. de " +
        p.name +
        (store ? " na " + store.name : ""),
      time: "Agora",
    });
    return p;
  }
  // Gera um novo pedido de marketplace aguardando separação (simulação de entrada de venda)
  function newFulfillment(s, channel) {
    const c = channels.find((c) => c.id === channel) || channels[0];
    const pool = s.products.filter((p) => p.stock > 0);
    if (!pool.length)
      throw Error("Nenhum produto com estoque disponível para gerar pedido.");
    const idx = s.fulfillments.length % pool.length;
    const first = pool[idx];
    const items = [
      {
        productId: first.id,
        sku: first.sku,
        name: first.name,
        qty: 1,
        scanned: false,
      },
    ];
    if (pool.length > 1) {
      const second = pool[(idx + 3) % pool.length];
      if (second.id !== first.id)
        items.push({
          productId: second.id,
          sku: second.sku,
          name: second.name,
          qty: 1,
          scanned: false,
        });
    }
    const f = {
      id: "SEP-" + (2200 + s.fulfillments.length + 1),
      channel: c.id,
      createdAt: "Agora",
      status: "pending",
      items,
    };
    s.fulfillments.unshift(f);
    s.history.unshift({
      text: "Novo pedido do " + c.name + " aguardando separação (" + f.id + ")",
      time: "Agora",
    });
    pushNotification(
      s,
      "separacao",
      "Nova venda no " + c.name + ": pedido " + f.id + " aguardando separação",
    );
    return f;
  }
  // Bipagem de um item durante a separação de um pedido: confere se o código pertence ao pedido
  function scanFulfillmentItem(s, fulfillmentId, code) {
    const f = s.fulfillments.find((f) => f.id === fulfillmentId);
    if (!f) throw Error("Pedido não encontrado.");
    if (f.status === "separated" || f.status === "shipped")
      throw Error("Este pedido já foi separado.");
    const c = String(code || "")
      .trim()
      .toLowerCase();
    if (!c) throw Error("Informe um código de barras ou SKU.");
    const product = s.products.find(
      (p) =>
        p.sku.toLowerCase() === c || (p.barcode || "").toLowerCase() === c,
    );
    const item = f.items.find(
      (it) =>
        !it.scanned &&
        (it.sku.toLowerCase() === c ||
          (product && it.productId === product.id)),
    );
    if (!item)
      throw Error(
        "Este código não pertence a este pedido ou o item já foi separado.",
      );
    f.status = "separating";
    item.scanned = true;
    s.scanLog.unshift({
      id: "SC-" + (s.scanLog.length + 1),
      type: "separacao",
      sku: item.sku,
      product: item.name,
      store: "Separação " + f.id,
      time: "Agora",
    });
    return f;
  }
  // Confirma a separação: baixa o estoque de cada item e libera o pedido para etiqueta
  function confirmSeparation(s, fulfillmentId) {
    const f = s.fulfillments.find((f) => f.id === fulfillmentId);
    if (!f) throw Error("Pedido não encontrado.");
    if (f.items.some((it) => !it.scanned))
      throw Error("Bipe todos os itens antes de confirmar a separação.");
    for (const it of f.items) {
      const p = s.products.find((p) => p.id === it.productId);
      if (p && p.stock < it.qty)
        throw Error("Estoque insuficiente para " + p.name + ".");
    }
    for (const it of f.items) {
      const p = s.products.find((p) => p.id === it.productId);
      if (!p) continue;
      p.stock -= it.qty;
      s.orders.push({
        id: "WT-" + (1040 + s.orders.length),
        productId: p.id,
        channel: f.channel,
        quantity: it.qty,
        amount: Math.round(p.price * it.qty * 100) / 100,
        time: "Agora",
      });
    }
    f.status = "separated";
    s.history.unshift({
      text: "Pedido " + f.id + " separado e pronto para etiqueta",
      time: "Agora",
    });
    return f;
  }
  // Despacha um pedido já separado: gera NF e etiqueta simuladas
  function dispatchFulfillment(s, fulfillmentId) {
    const f = s.fulfillments.find((f) => f.id === fulfillmentId);
    if (!f) throw Error("Pedido não encontrado.");
    if (f.status !== "separated")
      throw Error("Separe todos os itens do pedido antes de despachar.");
    f.status = "shipped";
    const items = f.items.map((it) => {
      const p = s.products.find((p) => p.id === it.productId);
      return {
        productId: it.productId,
        sku: it.sku,
        name: it.name,
        qty: it.qty,
        price: p ? p.price : 0,
      };
    });
    const invoice = generateInvoice(s, items, {
      channel: f.channel,
      fulfillmentId: f.id,
    });
    const label = generateLabel(s, f);
    f.invoiceId = invoice.id;
    f.labelId = label.id;
    s.history.unshift({
      text:
        "Pedido " +
        f.id +
        " saiu para entrega — NF " +
        invoice.id +
        " e etiqueta " +
        label.trackingCode +
        " geradas",
      time: "Agora",
    });
    pushNotification(s, "despacho", "Pedido " + f.id + " saiu para entrega");
    return f;
  }
  // Cadastra uma nova loja/centro de distribuição (painel de configurações)
  function addStore(s, draft) {
    const name = (draft.name || "").trim(),
      cnpj = (draft.cnpj || "").trim();
    if (!name || !cnpj) throw Error("Informe nome e CNPJ da loja.");
    if (s.stores.some((st) => st.cnpj === cnpj))
      throw Error("Já existe uma loja cadastrada com este CNPJ.");
    const store = {
      id: "st" + (s.stores.length + 1) + "-" + Date.now(),
      name,
      type: draft.type === "cd" ? "cd" : "loja",
      cnpj,
      address: (draft.address || "").trim(),
      active: true,
    };
    s.stores.push(store);
    s.history.unshift({
      text: "Nova loja cadastrada nas configurações: " + store.name,
      time: "Agora",
    });
    return store;
  }
  // Cadastra um novo fornecedor (painel de configurações)
  function addSupplier(s, draft) {
    const name = (draft.name || "").trim(),
      cnpj = (draft.cnpj || "").trim();
    if (!name || !cnpj) throw Error("Informe nome e CNPJ do fornecedor.");
    if (s.suppliers.some((sp) => sp.cnpj === cnpj))
      throw Error("Já existe um fornecedor cadastrado com este CNPJ.");
    const supplier = {
      id: "sp" + (s.suppliers.length + 1) + "-" + Date.now(),
      name,
      cnpj,
      contact: (draft.contact || "").trim(),
      leadTimeDays: Math.max(1, Math.min(60, Math.round(Number(draft.leadTimeDays) || 5))),
    };
    s.suppliers.push(supplier);
    s.history.unshift({
      text: "Novo fornecedor cadastrado nas configurações: " + supplier.name,
      time: "Agora",
    });
    return supplier;
  }
  // Automação: gera pedidos de compra para produtos abaixo do mínimo com fornecedor definido
  function autoGeneratePurchaseOrders(s) {
    const openProductIds = new Set(
      s.purchaseOrders
        .filter((po) => po.status !== "received")
        .flatMap((po) => po.items.map((it) => it.productId)),
    );
    const created = [];
    for (const p of s.products) {
      const min = p.minStock ?? 20;
      if (p.stock >= min) continue;
      if (!p.supplierId) continue;
      if (openProductIds.has(p.id)) continue;
      const supplier = s.suppliers.find((sp) => sp.id === p.supplierId);
      if (!supplier) continue;
      const sold = s.orders
        .filter((o) => o.productId === p.id)
        .reduce((a, o) => a + o.quantity, 0);
      const qty = Math.max(min * 2 - p.stock, sold * supplier.leadTimeDays, 10);
      const po = {
        id: "PO-" + (3000 + s.purchaseOrders.length + 1),
        supplierId: supplier.id,
        items: [
          { productId: p.id, sku: p.sku, name: p.name, qty: Math.round(qty) },
        ],
        status: "suggested",
        createdAt: "Agora",
      };
      s.purchaseOrders.unshift(po);
      created.push(po);
    }
    if (created.length)
      s.history.unshift({
        text:
          created.length +
          " pedido(s) de compra gerado(s) automaticamente pela previsão de ruptura",
        time: "Agora",
      });
    return created;
  }
  // Envia um pedido de compra sugerido ao fornecedor
  function sendPurchaseOrder(s, poId) {
    const po = s.purchaseOrders.find((po) => po.id === poId);
    if (!po) throw Error("Pedido de compra não encontrado.");
    if (po.status !== "suggested") throw Error("Este pedido já foi enviado.");
    po.status = "sent";
    const supplier = s.suppliers.find((sp) => sp.id === po.supplierId);
    s.history.unshift({
      text:
        "Pedido " +
        po.id +
        " enviado para " +
        (supplier ? supplier.name : "o fornecedor"),
      time: "Agora",
    });
    return po;
  }
  // Confirma o recebimento de um pedido de compra: repõe o estoque
  function receivePurchaseOrder(s, poId) {
    const po = s.purchaseOrders.find((po) => po.id === poId);
    if (!po) throw Error("Pedido de compra não encontrado.");
    if (po.status === "received") throw Error("Este pedido já foi recebido.");
    for (const it of po.items) {
      const p = s.products.find((p) => p.id === it.productId);
      if (p) p.stock += it.qty;
    }
    po.status = "received";
    s.history.unshift({
      text: "Pedido " + po.id + " recebido. Estoque reposto.",
      time: "Agora",
    });
    pushNotification(
      s,
      "compra",
      "Pedido de compra " + po.id + " recebido: estoque reposto",
    );
    return po;
  }
  // Simula uma contagem física de estoque (leitor IoT) e registra eventual divergência
  function simulateInventoryCount(s, productId) {
    const p = s.products.find((p) => p.id === productId);
    if (!p) throw Error("Produto não encontrado.");
    const diff = p.stock % 2 === 0 ? 1 : 2;
    const counted = Math.max(0, p.stock - diff);
    const check = {
      id: "CHK-" + (s.inventoryChecks.length + 1),
      productId: p.id,
      name: p.name,
      systemStock: p.stock,
      countedStock: counted,
      status: "open",
      time: "Agora",
    };
    s.inventoryChecks.unshift(check);
    s.history.unshift({
      text:
        "Contagem física de " +
        p.name +
        ": sistema " +
        p.stock +
        " × contado " +
        counted,
      time: "Agora",
    });
    return check;
  }
  // Corrige o estoque do sistema para o valor contado fisicamente
  function resolveInventoryCheck(s, checkId) {
    const c = s.inventoryChecks.find((c) => c.id === checkId);
    if (!c) throw Error("Contagem não encontrada.");
    if (c.status !== "open") throw Error("Esta contagem já foi resolvida.");
    const p = s.products.find((p) => p.id === c.productId);
    if (p) p.stock = c.countedStock;
    c.status = "resolved";
    s.history.unshift({
      text:
        "WedTech AI corrigiu o estoque de " +
        c.name +
        " para " +
        c.countedStock +
        " unidades",
      time: "Agora",
    });
    pushNotification(
      s,
      "estoque",
      "Divergência de estoque corrigida: " + c.name,
    );
    return c;
  }
  // Indicadores financeiros: receita, custo das vendas, lucro bruto/líquido e margem
  function financials(s) {
    const revenue =
      Math.round(s.orders.reduce((a, o) => a + o.amount, 0) * 100) / 100;
    const cogs =
      Math.round(
        s.orders.reduce((a, o) => {
          const p = s.products.find((p) => p.id === o.productId);
          return a + (p ? p.cost * o.quantity : 0);
        }, 0) * 100,
      ) / 100;
    const grossProfit = Math.round((revenue - cogs) * 100) / 100;
    const grossMargin =
      revenue > 0 ? Math.round((grossProfit / revenue) * 1000) / 10 : 0;
    const totalExpenses =
      Math.round(s.expenses.reduce((a, e) => a + e.amount, 0) * 100) / 100;
    const netProfit = Math.round((grossProfit - totalExpenses) * 100) / 100;
    return { revenue, cogs, grossProfit, grossMargin, totalExpenses, netProfit };
  }
  // Registra uma nova despesa operacional (painel Financeiro)
  function addExpense(s, draft) {
    const category = (draft.category || "").trim(),
      description = (draft.description || "").trim();
    const amount = Number(draft.amount);
    if (!category || !(amount > 0))
      throw Error("Informe categoria e um valor válido para a despesa.");
    const expense = {
      id: "DESP-" + (s.expenses.length + 1) + "-" + Date.now(),
      category,
      description,
      amount: Math.round(amount * 100) / 100,
      date: (draft.date || "").trim() || "Hoje",
    };
    s.expenses.push(expense);
    s.history.unshift({
      text: "Nova despesa registrada: " + category + " (" + brl(expense.amount) + ")",
      time: "Agora",
    });
    return expense;
  }
  // Local WedTech AI response engine
  function answer(s, q) {
    const m = metrics(s),
      low = s.products.filter((p) => p.stock < 20),
      issues = s.products.filter((p) => p.issue);
    q = q
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    if (/impacto|prejuizo|perdendo/.test(q)) {
      const b = businessImpact(s);
      return (
        "Impacto financeiro estimado da gestão de estoque:\n\n" +
        (b.atRiskCount
          ? "⚠ " +
            brl(b.salesAtRisk) +
            " em vendas dos próximos 7 dias em risco, por causa de " +
            b.atRiskCount +
            " produto(s) perto da ruptura."
          : "✓ Nenhuma venda em risco de ruptura nos próximos 7 dias.") +
        "\n" +
        (b.overstockCount
          ? "📦 " +
            brl(b.capitalParado) +
            " de capital parado em " +
            b.overstockCount +
            " produto(s) com baixo giro."
          : "✓ Nenhum produto com estoque parado no momento.") +
        "\n\nGerar pedidos de compra para os produtos em risco e liquidar os parados libera caixa para reinvestir."
      );
    }
    if (/parad[oa]|encalhad[oa]|excesso|liquidaca[o]/.test(q)) {
      const overstock = forecast(s).filter((f) => f.risk === "excesso");
      return overstock.length
        ? "Produtos com estoque parado (baixo giro nos últimos dias):\n\n" +
            overstock
              .map(
                (f) =>
                  f.name +
                  " — " +
                  f.stock +
                  " unidades" +
                  (f.daysToStockout !== null
                    ? " · cobertura de ~" + f.daysToStockout + " dias"
                    : " · sem vendas registradas") +
                  " · sugestão: liquidação de " +
                  f.suggestedDiscount +
                  "%.",
              )
              .join("\n") +
            "\n\nLiberar esse capital parado ajuda a financiar a reposição dos produtos em risco de ruptura."
        : "Nenhum produto com estoque parado no momento.";
    }
    if (/estoque|ruptura/.test(q)) {
      const risk = forecast(s).filter(
        (f) => f.risk === "critico" || f.risk === "atencao",
      );
      return risk.length
        ? "Previsão de ruptura com base no ritmo de vendas de hoje:\n\n" +
            risk
              .map(
                (f) =>
                  f.name +
                  " — " +
                  f.stock +
                  " unidades" +
                  (f.daysToStockout !== null
                    ? " · esgota em ~" + f.daysToStockout + " dia(s)"
                    : " · abaixo do mínimo (" + f.minStock + ")") +
                  ".",
              )
              .join("\n") +
            "\n\nRecomendo gerar pedidos de compra para os fornecedores antes de ampliar os anúncios. O saldo é compartilhado entre os canais."
        : "Todos os produtos estão dentro do estoque mínimo recomendado.";
    }
    if (/erro|anuncio/.test(q))
      return issues.length
        ? issues
            .map(
              (p) =>
                p.name +
                " — o título do anúncio da Shopee precisa de revisão. Abra o produto para corrigir com WedTech AI.",
            )
            .join("\n")
        : "Nenhum erro pendente nos anúncios do catálogo.";
    if (/separa|expedi|despach/.test(q)) {
      const open = s.fulfillments.filter((f) => f.status !== "shipped");
      return open.length
        ? "Você tem " +
            open.length +
            " pedido(s) aguardando separação ou despacho:\n\n" +
            open
              .map(
                (f) =>
                  f.id +
                  " — " +
                  f.items.length +
                  " item(ns) — " +
                  fulfillmentStatus[f.status],
              )
              .join("\n") +
            "\n\nAbra o Estoque Inteligente para bipar os itens e liberar o despacho."
        : "Nenhum pedido pendente de separação no momento.";
    }
    if (/fornecedor|compra/.test(q)) {
      const open = s.purchaseOrders.filter((po) => po.status !== "received");
      return open.length
        ? "Pedidos de compra em aberto:\n\n" +
            open
              .map((po) => {
                const supplier = s.suppliers.find(
                  (sp) => sp.id === po.supplierId,
                );
                return (
                  po.id +
                  " — " +
                  (supplier ? supplier.name : "fornecedor") +
                  " — " +
                  (po.status === "sent"
                    ? "enviado, aguardando entrega"
                    : "sugerido, ainda não enviado")
                );
              })
              .join("\n") +
            "\n\nAbra o Estoque Inteligente para enviar ou confirmar o recebimento."
        : "Nenhum pedido de compra em aberto. O estoque está coberto pelo mínimo configurado.";
    }
    if (/divergenc|contagem/.test(q)) {
      const open = s.inventoryChecks.filter((c) => c.status === "open");
      return open.length
        ? "Divergências de inventário encontradas na última contagem física:\n\n" +
            open
              .map(
                (c) =>
                  c.name +
                  " — sistema " +
                  c.systemStock +
                  " × contado " +
                  c.countedStock +
                  ".",
              )
              .join("\n") +
            "\n\nAbra o Estoque Inteligente para corrigir com um clique."
        : "Nenhuma divergência de inventário em aberto no momento.";
    }
    if (/lucro|despes|financeiro|margem/.test(q)) {
      const fin = financials(s);
      return (
        "Financeiro da operação:\n\nReceita: " +
        brl(fin.revenue) +
        "\nCusto das vendas: " +
        brl(fin.cogs) +
        "\nLucro bruto: " +
        brl(fin.grossProfit) +
        " (" +
        fin.grossMargin +
        "%)" +
        "\nDespesas: " +
        brl(fin.totalExpenses) +
        "\nLucro líquido: " +
        brl(fin.netProfit) +
        "\n\nAbra o Financeiro para ver o detalhamento."
      );
    }
    if (/mais|giro|vendendo/.test(q)) {
      const ranked = s.products
        .map((p) => ({
          ...p,
          sold: s.orders
            .filter((o) => o.productId === p.id)
            .reduce((a, o) => a + o.quantity, 0),
        }))
        .sort((a, b) => b.sold - a.sold);
      return (
        "Produtos com mais unidades vendidas hoje:\n\n" +
        ranked
          .slice(0, 3)
          .map((p, i) => i + 1 + ". " + p.name + " — " + p.sold + " unidades.")
          .join("\n") +
        "\n\nO Mouse Gamer G500 também apresenta crescimento nesta semana. O Headset Gamer X200 está com giro abaixo da média histórica."
      );
    }
    if (/atencao|problema/.test(q))
      return (
        "Estas situações merecem atenção:\n\n" +
        low
          .map((p) => p.name + " — estoque baixo: " + p.stock + " unidades.")
          .concat(
            issues.map((p) => p.name + " — anúncio da Shopee com erro."),
            s.products
              .filter((p) => p.slow)
              .map((p) => p.name + " — vendas abaixo da média histórica."),
          )
          .join("\n") +
        "\n\nComece pela reposição dos produtos com estoque baixo."
      );
    if (/resum|operacao|hoje|vendas/.test(q)) {
      const b = businessImpact(s);
      return (
        "Hoje sua operação registrou " +
        m.orders +
        " pedidos e " +
        brl(m.revenue) +
        " em vendas.\n\nO Mercado Livre continua sendo seu principal canal. Seu catálogo possui " +
        m.products +
        " produtos e " +
        m.stock +
        " unidades, com " +
        m.connected +
        " marketplaces conectados.\n\nIdentifiquei " +
        low.length +
        " produtos com estoque baixo, " +
        issues.length +
        " anúncio(s) que precisam de correção e " +
        m.pendingSeparations +
        " pedido(s) aguardando separação.\n\n" +
        (m.openPurchaseOrders
          ? m.openPurchaseOrders +
            " pedido(s) de compra em andamento com fornecedores."
          : "Nenhum pedido de compra em aberto no momento.") +
        (b.salesAtRisk || b.capitalParado
          ? "\n\nImpacto financeiro: " +
            (b.salesAtRisk ? brl(b.salesAtRisk) + " em vendas em risco" : "") +
            (b.salesAtRisk && b.capitalParado ? " e " : "") +
            (b.capitalParado ? brl(b.capitalParado) + " de capital parado" : "") +
            ". Pergunte “Qual o impacto financeiro do estoque?” para detalhes."
          : "")
      );
    }
    return "Nesta demonstração, consigo analisar estoque e previsão de ruptura, produtos parados (baixo giro), vendas, erros nos anúncios, pedidos aguardando separação, pedidos de compra a fornecedores, divergências de inventário, o financeiro (lucro e despesas) e o impacto financeiro da gestão de estoque. Escolha uma sugestão ou peça: “Resuma minha operação.”";
  }
  // Public API for the interface and automated tests
  const api = {
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
    findByCode,
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
    generateInvoice,
    generateLabel,
    financials,
    addExpense,
  };
  if (typeof module !== "undefined") module.exports = api;
  global.WedTech = api;
})(typeof window !== "undefined" ? window : globalThis);
