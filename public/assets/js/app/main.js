"use strict";
// Eventos da interface, rotas (#hash) e sincronização ao vivo com o site do lojista.

// Formulários: um único ponto de entrada (também usado pela câmera)
function handleSubmit(form) {
  const handlers = {
    "login-form": handleLogin,
    "balcao-form": handleCounterScan,
    "counter-delivery-form": counterDeliveryOrder,
    "retirada-form": pickupByCode,
    "pedido-scan-form": orderScan,
    "pedido-retirada-form": orderPickup,
    "entrada-form": handleEntrada,
    "receber-form": receiveScan,
    "product-settings-form": saveProductSettings,
    "supplier-form": handleAddSupplier,
    "expense-form": handleAddExpense,
    "ads-form": prepareAds,
    "store-form": saveStore,
    "event-form": addEvent,
    "cash-form": payCash,
    "vale-form": payCredit,
    "return-lookup-form": returnLookup,
    "return-form": submitReturn,
    "shop-form": handleAddShop,
    "transfer-form": handleTransfer,
    "pricing-form": savePricing,
    "promo-form": savePromo,
    "chat-form": (f) => ask(f.elements.question.value),
    "dashboard-ai-form": (f) => askDashboard(f.elements.question.value),
  };
  const fn = handlers[form.id];
  if (fn) fn(form);
}
document.addEventListener("submit", (e) => {
  if (!e.target.id) return;
  e.preventDefault();
  handleSubmit(e.target);
});

document.addEventListener("input", (e) => {
  if (e.target.id === "search") {
    ui.query = e.target.value;
    const pos = e.target.selectionStart;
    render();
    const el = $("#search");
    el?.focus();
    if (el && pos !== null) el.setSelectionRange(pos, pos);
  }
  if (e.target.closest?.("#ads-form") && e.target.name && e.target.name !== "channel" && ui.one) ui.one.draft[e.target.name] = e.target.value;
});

document.addEventListener("change", (e) => {
  const t = e.target;
  if (t.dataset.min) return setMinStock(t.dataset.min, t.value);
  if (t.dataset.publish) return togglePublish(t.dataset.publish, t.checked);
  if (t.dataset.automation) return toggleAutomation(t.dataset.automation, t.checked);
  if (t.dataset.lead) return changeSupplier(t.dataset.lead, { leadTimeDays: t.value });
  if (t.dataset.minorder) return changeSupplier(t.dataset.minorder, { minOrder: t.value });
  if (t.id === "has-deposito") return toggleDeposito(t.checked);
  if (t.id === "counter-store") {
    ui.counterStore = t.value;
    return render();
  }
  if (t.dataset.cartVariant !== undefined) return changeCartVariant(Number(t.dataset.cartVariant), t.value);
  if (t.id === "counter-delivery") {
    ui.counterDelivery = t.checked;
    return render();
  }
  if (t.name === "channel" && ui.one) ui.one.selected = Array.from(document.querySelectorAll('[name="channel"]:checked')).map((el) => el.value);
  if (t.id === "ad-image") {
    const file = t.files[0];
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 1024 * 1024) {
      toast("Selecione uma imagem PNG, JPG ou WebP de até 1 MB.");
      t.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      ui.one.draft.image = reader.result;
      render();
    };
    reader.readAsDataURL(file);
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (ui.camera) {
      stopCamera();
      return render();
    }
    if (ui.drawer && !ui.busy) {
      closeDrawer();
      return render();
    }
    if (ui.notifOpen) {
      ui.notifOpen = false;
      return render();
    }
    if (ui.menu) {
      ui.menu = false;
      render();
      return $(".mobile-menu")?.focus();
    }
  }
  // Mantém o foco do teclado dentro da gaveta aberta
  if (e.key === "Tab" && ui.drawer) {
    const els = Array.from(document.querySelectorAll(".drawer button:not(:disabled),.drawer a,.drawer input:not(:disabled),.drawer select"));
    if (!els.length) return;
    const first = els[0],
      last = els.at(-1);
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
});

document.addEventListener("click", (e) => {
  // Clique no fundo escuro fecha a gaveta
  if (e.target.classList?.contains("modal-overlay") && ui.drawer && !ui.busy) {
    closeDrawer();
    return render();
  }
  const el = e.target.closest("button");
  if (!el) return;
  const d = el.dataset;
  if (d.setup) return chooseStoreType(d.setup);
  if (d.product) {
    if (ui.busy) return;
    openDrawer("produto", d.product);
    return render();
  }
  if (d.order) {
    if (ui.busy) return;
    openDrawer("pedido", d.order);
    return render();
  }
  if (d.doc) {
    openDrawer("doc", d.doc);
    return render();
  }
  if (d.receiveScan) {
    openDrawer("receber", d.receiveScan);
    return render();
  }
  if (d.cameraStart) return startCamera(d.cameraStart);
  if (d.dispatch) return dispatchOrder(d.dispatch);
  if (d.cartAdd) return addToCart(d.cartAdd);
  if (d.cartInc) return changeCartQty(d.cartInc, 1);
  if (d.cartDec) return changeCartQty(d.cartDec, -1);
  if (d.cartRemove) {
    ui.cart.splice(Number(d.cartRemove), 1);
    return render();
  }
  if (d.pay) return choosePayment(d.pay);
  if (d.restock) return restockShop(d.restock);
  if (d.applyMarkup) return applyMarkup(d.applyMarkup);
  if (d.promo) return promoFromLot(d.promo);
  if (d.clearPromo) return removePromo(d.clearPromo);
  if (d.refill) return refillShelf(d.refill);
  if (d.connect) return connectChannel(d.connect);
  if (d.simulate) return simulateMarketplaceOrder(d.simulate);
  if (d.reactivate) return reactivateAds(d.reactivate);
  if (d.confirmPo) return confirmPO(d.confirmPo);
  if (d.discardPo) return discardPO(d.discardPo);
  if (d.receiveAll) return receiveAll(d.receiveAll);
  if (d.pedidosTab) {
    ui.pedidosTab = d.pedidosTab;
    return render();
  }
  if (d.changeType) return changeStoreType(d.changeType);
  if (d.event) {
    ui.eventId = d.event;
    return render();
  }
  if (d.removeEvent) return removeEvent(d.removeEvent);
  if (d.ask !== undefined) return ask(suggestions[Number(d.ask)]);
  if (d.dashboardAsk !== undefined) return askDashboard(quickQuestions[Number(d.dashboardAsk)]);

  const actions = {
    "login-example": () => {
      $("#login-email").value = "maria@sualoja.com.br";
      $("#login-password").value = "wedtech123";
    },
    logout: () => !ui.busy && logout(),
    menu: () => {
      ui.menu = !ui.menu;
      render();
      (ui.menu ? $(".sidebar-toggle") : $(".mobile-menu"))?.focus();
    },
    sidebar: () => {
      if (ui.menu) ui.menu = false;
      else ui.sidebarOpen = !ui.sidebarOpen;
      render();
      $(".sidebar-toggle")?.focus();
    },
    "close-drawer": () => {
      if (ui.busy) return;
      closeDrawer();
      render();
    },
    "toggle-notifications": () => {
      ui.notifOpen = !ui.notifOpen;
      if (ui.notifOpen) {
        W.markNotificationsRead(state);
        save();
      }
      render();
    },
    "close-notifications": () => {
      ui.notifOpen = false;
      render();
    },
    "tour-next": () => {
      ui.tourStep++;
      if (ui.tourStep >= tourSlides.length) finishTour();
      render();
    },
    "tour-skip": () => {
      finishTour();
      render();
    },
    "hide-checklist": () => {
      state.onboarding.hidden = true;
      save();
      render();
    },
    "new-product": () => {
      resetOne();
      go("ads");
    },
    "start-payment": startPayment,
    "go-returns": () => {
      ui.pedidosTab = "devolucoes";
      go("pedidos");
    },
    "pay-cancel": () => {
      ui.payment = null;
      render();
    },
    "cart-clear": () => {
      ui.cart = [];
      ui.counterFeedback = null;
      render();
    },
    "confirm-separation": confirmSeparation,
    "simulate-order": () => simulateMarketplaceOrder(),
    "fix-product": fixProductIssue,
    "toggle-supplier-form": () => {
      ui.supplierFormOpen = !ui.supplierFormOpen;
      render();
    },
    "toggle-expense-form": () => {
      ui.expenseFormOpen = !ui.expenseFormOpen;
      render();
    },
    "advance-time": advanceTime,
    "prepare-event": prepareEvent,
    consultant: talkToConsultant,
    "toggle-live": () => {
      if (ui.live) stopLive();
      else {
        ui.live = true;
        scheduleLive();
        toast("Operação ao vivo: novos pedidos vão chegar a cada 9 segundos.");
      }
      render();
    },
    "stop-camera": () => {
      stopCamera();
      render();
    },
    "ads-example": fillAdsExample,
    "ads-ai-description": () => {
      const form = $("#ads-form");
      if (form) readAdsForm(form);
      ui.one.draft.description = aiDescription(ui.one.draft);
      render();
      toast("Descrição escrita pela WedTech AI. Revise se quiser.");
    },
    "ads-fix": fixAds,
    "ads-publish": publishAds,
    "ads-edit": () => {
      ui.one.stage = 0;
      render();
    },
    "ads-another": () => {
      resetOne();
      render();
    },
    "copy-catalog": copyCatalogLink,
    "export-estoque-csv": () => {
      const fc = W.forecast(state);
      downloadCSV(
        "wedtech-estoque.csv",
        ["Produto", "SKU", "Loja", "Depósito", "Reservado", "Disponível", "Mínimo", "Dias até acabar", "Situação"],
        state.products.map((p) => {
          const st = W.stockOf(state, p);
          const f = fc.find((x) => x.productId === p.id);
          return [p.name, p.sku, st.loja, st.deposito, st.reservado, st.disponivel, p.minStock, f.daysToStockout ?? "", W.riskLabel[f.risk]];
        }),
      );
    },
    "export-despesas-csv": () =>
      downloadCSV("wedtech-despesas.csv", ["Categoria", "Descrição", "Data", "Valor"], state.expenses.map((x) => [x.category, x.description, x.date, x.amount])),
    reset: () => !ui.busy && $("#reset-dialog")?.showModal(),
    "cancel-reset": () => $("#reset-dialog")?.close(),
    "confirm-reset": resetDemo,
  };
  const fn = actions[d.action];
  if (fn) fn();
});

// Rotas: #inicio, #pedidos, #canal/ml ...
function route() {
  const hash = decodeURIComponent(location.hash.slice(1));
  if (hash.startsWith("canal/")) {
    ui.page = "canal";
    ui.channelPage = hash.slice(6);
  } else {
    ui.page = routes[hash] ? hash : "inicio";
    ui.channelPage = null;
  }
  if (ui.page === "automacoes" && !state.onboarding.automationsVisited) {
    state.onboarding.automationsVisited = true;
    save();
  }
  ui.menu = false;
  ui.drawer = null;
  ui.notifOpen = false;
  ui.payment = null;
  stopCamera();
  render();
  window.scrollTo(0, 0);
}
window.addEventListener("hashchange", route);

// Sincronização ao vivo: uma compra feita no site (outra aba) aparece aqui na hora
window.addEventListener("storage", (e) => {
  if (e.key !== W.STORAGE_KEY || !e.newValue) return;
  const fresh = W.loadState(localStorage);
  if (!fresh) return;
  const before = state.orders.length;
  state = fresh;
  if (ui.busy) return;
  render();
  const last = state.orders[state.orders.length - 1];
  if (state.orders.length > before && last)
    toast("🛒 Novo pedido " + last.id + " pelo " + W.channelById(last.channel).name + " — estoque atualizado em todos os canais!");
});

route();

// Interface opcional para agentes de navegador (WebMCP). Navegadores comuns ignoram.
if (document.modelContext?.registerTool) {
  const lifecycle = new AbortController();
  try {
    Promise.resolve(
      document.modelContext.registerTool(
        {
          name: "get_wedtech_operation_summary",
          title: "Consultar operação WedTech",
          description: "Lê os indicadores atuais, o estoque por produto e o resumo da WedTech AI. Não altera os dados.",
          inputSchema: { type: "object", properties: {}, additionalProperties: false },
          annotations: { readOnlyHint: true, untrustedContentHint: true },
          execute() {
            return {
              metrics: W.metrics(state),
              products: state.products.map((p) => ({ name: p.name, sku: p.sku, ...W.stockOf(state, p) })),
              summary: W.answer(state, "Resuma meu dia."),
            };
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => {});
  } catch {}
  window.addEventListener("pagehide", () => lifecycle.abort(), { once: true });
}
