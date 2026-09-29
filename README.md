# WedTech — Protótipo Hackathon 2026

**Sua loja do bairro, vendendo em todo lugar. Com um estoque só.**

A WedTech resolve a **Dor 1 (integração de estoque omnichannel)** para o **lojista de bairro que quer entrar no digital**, de qualquer ramo (roupas, alimentação, eletrônicos…). Loja física, site próprio, WhatsApp/Instagram e marketplaces (Mercado Livre, Shopee, Magalu, Amazon, TikTok Shop) vendem do **mesmo estoque**, com **compre online e retire na loja** (e o inverso), usando **IoT + IA + automação**.

## Como abrir

**Opção 1 (recomendada, necessária para a sincronização ao vivo entre abas):**

```bash
npm start
```

Depois abra http://127.0.0.1:4173. Para parar, use Ctrl+C.

**Opção 2:** abra `public/index.html` direto no navegador.

Não precisa instalar nada: o projeto é HTML, CSS e JavaScript puros, sem dependências, e funciona offline.

- **Login:** clique em "Preencher exemplo" e entre. Qualquer e-mail e senha funcionam.
- **Primeiro acesso:** escolha o tipo da loja (Moda, Alimentação ou Eletrônicos).
- **Câmera:** para bipar com a câmera, use Chrome ou Edge (API `BarcodeDetector`). O campo de texto sempre funciona.

## Estrutura de pastas

```
wedtech-main/
├── public/                       ← tudo que o navegador abre
│   ├── index.html                site institucional (home + planos)
│   ├── app.html                  painel do lojista
│   ├── loja.html                 site próprio do lojista (vitrine do cliente)
│   └── assets/
│       ├── img/                  logo e favicon
│       ├── css/
│       │   ├── brand.css         cores e marca (home + painel)
│       │   ├── home.css          site institucional
│       │   ├── app.css           base do painel
│       │   ├── app-components.css componentes do painel (telas novas)
│       │   └── loja.css          vitrine do cliente
│       └── js/
│           ├── core/             REGRAS DE NEGÓCIO (sem tela, testável no Node)
│           │   ├── catalogos.js     produtos e fornecedores de exemplo por tipo de loja
│           │   ├── calendario.js    datas especiais e sazonalidade por tipo de loja
│           │   └── wedtech-core.js  estoque, reservas, pedidos, automações e IA
│           ├── shared/barcode.js código de barras EAN-13 em SVG
│           ├── vendor/qrcode.js  gerador de QR code (MIT, local)
│           ├── site/home.js      interações da home
│           ├── loja/loja.js      vitrine do cliente
│           └── app/              PAINEL
│               ├── base.js          estado, helpers, ícones e rotas
│               ├── layout.js        login, menu, topo, notificações, gavetas
│               ├── paginas/         uma tela por arquivo (inicio, balcao, pedidos…)
│               ├── acoes.js         o que cada botão faz
│               └── main.js          eventos, rotas e sincronização entre abas
├── tests/
│   ├── core.test.cjs             regras de negócio
│   └── app.test.cjs              renderização do painel e da vitrine
├── docs/
│   ├── roteiro-demo.md           roteiro da apresentação
│   └── prompt-video-gemini.md    prompt para gerar o vídeo de pitch
├── server.cjs                    servidor local (npm start)
└── package.json
```

**Regra de ouro:** toda regra de negócio fica em `core/wedtech-core.js`. As telas (`app/paginas/*.js`) só leem os dados e chamam funções do núcleo. O painel e a vitrine usam o **mesmo** núcleo e o **mesmo** `localStorage`, por isso uma compra no site aparece no painel na hora.

## O que tem no painel

| Tela | O que faz |
|---|---|
| **Início** | 3 números grandes, "O que fazer agora", primeiros passos, vendas por canal, a IA e o que ela fez |
| **Vender no balcão** | PDV: bipa (leitor/câmera), finaliza com NF, entrega pedidos de retirada pelo QR, registra "comprou na loja, recebe em casa" |
| **Pedidos** | Todos os canais juntos: separar (bipando), avisar o cliente, entregar na retirada, despachar |
| **Estoque** | Loja × depósito × reservado × disponível, entrada por leitor (confere o pedido do fornecedor), prateleira inteligente, **estoque mínimo editável** |
| **Produtos** | Catálogo, status por canal, etiqueta com código de barras, mínimo e fornecedor |
| **Canais** | Visão geral dos 8 canais + uma página por canal (conectar, produtos, pedidos, pausados) |
| **Datas e sazonalidade** | Calendário comercial (Dia das Crianças, Black Friday, Natal…), plano da IA por data (quanto vai vender, quanto comprar e até quando pedir, pelo prazo do fornecedor), eventos da região e gráfico de sazonalidade do ano |
| **Compras e fornecedores** | Pedidos **preparados pela IA** para você só confirmar, recebimento bipando, fornecedores com **prazo de entrega** e pedido mínimo |
| **ADS** | Cadastra uma vez, a IA adapta o anúncio para cada canal e publica |
| **Financeiro** | Vendas, custo, **taxas por canal**, despesas e lucro (por canal e por produto) |
| **Automações** | 7 regras liga/desliga + histórico do que a IA fez + mensagens de WhatsApp enviadas |
| **Configurações** | Dados da loja, plano contratado (canais usados × limite), loja com ou sem depósito separado, tipo de loja |
| **WedTech AI** | Chat com respostas a partir dos dados atuais |

## Por tipo de loja

| | Moda | Alimentação | Eletrônicos |
|---|---|---|---|
| Canais externos | Mercado Livre, Shopee, **Shein**, TikTok Shop, Magalu | **iFood, Rappi, 99Food**, Mercado Livre, Amazon | Mercado Livre, Shopee, Amazon, Magalu, TikTok Shop |
| Controle especial | **Grade de tamanhos** (reserva e venda por tamanho, "grade quebrada", compra dividida pela grade que mais vende) | **Validade por lote** (vende primeiro o que vence antes, alerta com promoção, baixa automática de vencidos com a perda no Financeiro) | **Grade por modelo** (ex.: capinha por modelo de celular) |

Todos têm loja física, site próprio e WhatsApp/Instagram. Apps de delivery saem da prateleira (o entregador retira no balcão).

Também em todos: **preço por canal** (a IA sugere o ajuste para repassar a taxa de cada marketplace ou app), **promoções** (loja, site e WhatsApp), **Pix, maquininha e dinheiro no balcão** (com as taxas no Financeiro) e **relatório pós-evento** (previsto × real, o que faltou e o que sobrou, e o ajuste da IA para a próxima vez).

## Omnichannel de ponta a ponta

- **Troca e devolução em qualquer canal:** comprou no site, no WhatsApp, no marketplace ou no app de delivery e devolve na loja (Pedidos › Devoluções e trocas, ou botão no Balcão). Em bom estado, o produto volta na hora para o estoque de todos os canais; com defeito, fica como avaria. O cliente recebe **vale-troca** (usado no balcão como forma de pagamento) ou estorno. Alimentos devolvidos nunca voltam para a venda.
- **Mais de uma loja:** cadastre filiais em Configurações (Profissional: até 2; Avançado: até 5). Cada loja tem a sua prateleira, e tudo soma num estoque só para vender online. O cliente escolhe em qual loja retirar, o balcão escolhe de qual loja sai a venda e a IA sugere como abastecer cada loja a partir do depósito.
- **Etiquetas eletrônicas (IoT):** as etiquetas digitais das prateleiras mostram o preço do sistema e mudam sozinhas quando entra uma promoção.

## Planos

O que muda entre os planos é **quantos canais o lojista integra** (cada API de marketplace tem custo) e quais recursos ele usa. Os preços são **a partir de** e a contratação sempre passa por um **consultor**, que confirma os canais: Básico a partir de R$ 50 (até 3 canais, 1 marketplace) · Profissional a partir de R$ 100 (até 6 canais, 3 marketplaces) · Avançado a partir de R$ 200 (todos os 8 canais). O painel respeita o limite do plano ao conectar canais.

## Automações (IoT + IA)

1. **Pedido automático ao fornecedor:** chegou ao mínimo, a IA calcula a quantidade (vendas/dia × prazo, respeitando o pedido mínimo) e prepara o pedido. O lojista só confirma.
2. **Trava de anúncios pelo prazo do fornecedor:** se o produto acaba antes da entrega, os marketplaces são pausados e o restante fica para a loja e o site.
3. **Reativação automática:** bipou a entrada da mercadoria, os anúncios voltam.
4. **Pausar tudo quando zera:** nenhum canal online vende sem estoque.
5. **Reserva de retirada expira em 48 h** e o produto volta à venda.
6. **Aviso ao cliente por WhatsApp** (simulado) quando o pedido fica pronto ou é enviado.
7. **Sensor de prateleira (IoT):** avisa quando a prateleira está vazia e ainda há estoque no depósito.

## Verificação

```bash
npm run check   # sintaxe + 40 testes (núcleo e telas)
npm test        # só os testes
```

## Limites do protótipo

- Sem backend, pagamentos ou integrações reais. Marketplaces, WhatsApp, NF, etiqueta e sensores são **simulados**. QR codes e códigos de barras são reais (gerados localmente).
- A IA é local (regras e cálculos sobre os dados atuais). Não usa API externa e funciona offline.
- Os dados ficam no `localStorage` do navegador. Use **Reiniciar demonstração** no menu antes de cada apresentação.
- Empresa, CNPJ, números da home, avaliações e selos são ilustrativos.
