# Roteiro da demonstração (~6 minutos)

**Antes de começar:** rode `npm start`, abra http://127.0.0.1:4173, entre no painel e clique em **Reiniciar demonstração** (menu lateral). Deixe **duas abas** abertas lado a lado: o **painel** (`app.html`) e o **site da loja** (`loja.html`, pelo botão "🌐 Abrir meu site"). Se possível, abra o site da loja no **celular** para mostrar o QR.

| # | Tempo | Onde | O que fazer | O que falar |
|---|---|---|---|---|
| 0 | 30 s | Home (`index.html`) | Mostre o hero e a lista de canais | "A Maria tem uma loja no bairro e quer vender online sem se perder no estoque." |
| 1 | 30 s | Painel › Início | Mostre os 3 números e "O que fazer agora" | "Tela pensada para quem nunca usou sistema: o que fazer agora, em português simples." |
| 2 | 45 s | **Site da loja** | Escolha o tamanho **39** do **Tênis Casual Conforto** → Retirar na loja → finalize | "O cliente compra pelo site. O produto fica **reservado** na hora." |
| 3 | 15 s | Painel | Aparece o aviso "Novo pedido pelo Site próprio" | "Chegou no painel na hora, junto com os pedidos de todos os canais." |
| 4 | 60 s | Painel › Vender no balcão | Bipe `TN-CAS-001` (ou a câmera na etiqueta do produto) → **Receber pagamento** → **Pix** (confirma sozinho) | "Ao mesmo tempo, alguém compra o tênis no balcão." |
| 5 | 45 s | Painel › Automações / Canal Mercado Livre | Mostre "Preparei o pedido…" e "Pausei os anúncios…"; no ML o tênis está **Pausado pela IA** | "O tênis chegou ao mínimo que a Maria definiu. A IA **preparou o pedido ao fornecedor** e, como ele demora 7 dias e o tênis acaba em ~3, **pausou os marketplaces**. O que sobrou fica para a loja e o site, onde a margem é maior." |
| 6 | 30 s | Painel › Compras e fornecedores | **Confirmar e enviar** | "A Maria só confere e confirma. O fornecedor recebe pelo WhatsApp." |
| 7 | 30 s | Compras › **Receber (bipar)** | Bipe o código de barras do tênis | "A mercadoria chegou: bipou, o estoque somou e os anúncios **voltaram sozinhos**." |
| 8 | 45 s | Painel › Pedidos | Abra o pedido do site → bipe o item → **Confirmar separação** | "Separação conferida item por item. O cliente recebe o WhatsApp com o QR." (mostre a aba do site atualizando sozinha) |
| 9 | 30 s | Pedido (gaveta) ou Balcão › "Cliente veio retirar?" | Bipe o QR do celular com a câmera (ou digite o código `RET-…`) | "O cliente chegou, mostrou o QR, entregue. Baixa de estoque e nota fiscal automáticas." |
| 10 | 20 s | Automações | **⏩ Avançar 48 h** | "Se o cliente não aparecer, a reserva é liberada sozinha em 48 h." |
| 10b | 30 s | Datas e sazonalidade | Mostre o plano do próximo evento (ex.: Dia das Crianças) → **IA: preparar pedidos** | "A IA sabe que o Dia das Crianças vende 50% a mais e que o fornecedor leva 7 dias. Ela diz até quando pedir e prepara os pedidos." |
| 11 | 20 s | WedTech AI | "O que eu faço agora?" | "E ela responde qualquer dúvida sobre a loja." |

**Extras, se sobrar tempo:** Pedidos › **Devoluções e trocas** → digite um pedido do Mercado Livre → Registrar devolução (volta para o estoque de todos os canais e gera vale-troca) → Balcão › pagar com **Vale-troca** · Configurações › **Suas lojas** → cadastrar Loja Centro → Estoque › **Abastecer do depósito** · Produto › criar promoção → Estoque › **Etiquetas eletrônicas** mudam sozinhas · Configurações › trocar para **Alimentação** → Estoque › **Validade e lotes** (promoção com um clique) e canais **iFood/Rappi** · Canal Mercado Livre › **Preço neste canal** (sugestão da IA) · Datas e sazonalidade › **Como foram as últimas datas** · Home › **Contrate agora** → planos "a partir de" → **Falar com um consultor** (escolhe os canais e vê a estimativa) · Canais › conectar a **Magalu** (publica o catálogo inteiro com o mesmo estoque) · Estoque › **Repor** na prateleira inteligente · Configurações › trocar para **Alimentação** ou **Eletrônicos** ("serve para qualquer lojista") · Financeiro › lucro por canal.

## Frases-chave para os jurados

- **Dor 1:** "Um estoque só. Cada venda, em qualquer canal, reserva o produto na hora. Nada é vendido duas vezes."
- **IoT:** leitor de código de barras, câmera do celular, QR de retirada e sensores de prateleira.
- **IA:** prevê quando o produto acaba, calcula a compra e decide quando pausar os marketplaces.
- **Automação:** pedido ao fornecedor, trava e reativação de anúncios, reserva que expira e WhatsApp automático.
- **Persona:** "Feita para o lojista de bairro que está começando no digital. Linguagem simples e o que fazer agora."

## Se algo der errado

- Algo estranho na tela: menu lateral › **Reiniciar demonstração**.
- A câmera não abre: use o campo de texto (digite o SKU ou o código de retirada).
- A aba do site não atualiza: confira se as duas abas estão abertas pelo mesmo endereço (`http://127.0.0.1:4173`).
