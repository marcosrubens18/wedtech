# Prompt para gerar o vídeo de pitch no Gemini

> O gerador de vídeo do Gemini (Veo) cria clipes curtos, de cerca de 8 segundos. Por isso o prompt pede o vídeo em cenas. Nas cenas marcadas com **[INSERIR GRAVAÇÃO DE TELA]**, grave a tela do app de verdade (siga `roteiro-demo.md`) e junte na edição.

```text
Você é diretor(a) de criação e roteirista especialista em vídeos de pitch para startups. Crie um vídeo de pitch de 90 segundos, em português do Brasil, para a WedTech, projeto de um hackathon universitário.

## O PRODUTO
WedTech é uma plataforma que integra, em um só lugar, o estoque e as vendas do lojista de bairro em todos os canais: loja física, site próprio (com "compre online e retire na loja" e "compre na loja e receba em casa"), WhatsApp/Instagram, Mercado Livre, Shopee, Magalu, Amazon e TikTok Shop.
Slogan: "Um produto. Todos os canais. Uma única inteligência."
Assinatura da marca: "WedTech — Tecnologia e conexão para o futuro."

## A DOR QUE RESOLVEMOS (Dor 1 do hackathon: integração de estoque omnichannel)
O lojista de bairro que começa a vender online controla o estoque de cada canal separado, no caderno ou na planilha. Resultado: vende no marketplace um produto que já acabou na loja, cancela o pedido, perde reputação e dinheiro, e passa horas atualizando canal por canal.

## PERSONA
Dona Maria, cerca de 45 anos, dona de uma loja de bairro em uma cidade brasileira, que quer crescer vendendo pela internet. Mostre que a solução serve para qualquer ramo: em cenas rápidas, apareça uma loja de roupas, uma lanchonete e uma loja de capinhas e eletrônicos.

## OS 3 PILARES (precisam aparecer de forma clara)
1. IoT: leitor de código de barras e a câmera do celular "bipando" produtos; QR code para o cliente retirar o pedido na loja; prateleira inteligente com sensor que percebe quando um produto sai.
2. IA: prevê quando o produto vai acabar, cria sozinha o pedido de compra ao fornecedor (o lojista só confirma) e decide quando pausar anúncios.
3. Automação: estoque reservado na hora da compra online; anúncios dos marketplaces pausados quando o produto vai acabar antes de o fornecedor entregar e reativados sozinhos quando a mercadoria chega; aviso automático por WhatsApp ao cliente de que o pedido está pronto.

## ESTILO VISUAL
- Formato 16:9, 1080p, ritmo dinâmico, cortes rápidos.
- Paleta da marca: azul-marinho #081A2E, azul #173F73, azul tecnológico #2F6FB2, azul-claro #75A9E6, com fundos claros e brancos. Tipografia sans-serif moderna (estilo Inter). Ícones e motion graphics minimalistas.
- Pessoas brasileiras reais e diversas, bairro urbano brasileiro, luz natural e quente, clima otimista e acolhedor.
- NÃO use logotipos reais de marketplaces nem de marcas de produtos: use apenas os nomes em texto ou ícones genéricos de loja.
- Trilha instrumental leve, moderna e otimista. Narração com voz brasileira calorosa e confiante.

## ESTRUTURA (90 s)
1. Gancho (0–10 s): Dona Maria atrás do balcão, cercada de caderno, celular apitando com vendas de vários apps. Texto na tela: "Vendeu. Mas tinha no estoque?"
2. Problema (10–25 s): cliente frustrado com pedido cancelado; avaliação negativa; planilhas; lojista cansada à noite atualizando canal por canal.
3. Virada (25–35 s): logo WedTech surgindo; slogan "Um produto. Todos os canais. Uma única inteligência."
4. Solução, um estoque para todos os canais (35–50 s): animação de um produto no centro conectado por linhas de luz a ícones de loja física, site, WhatsApp e marketplaces; uma venda acontece e o número do estoque cai em todos ao mesmo tempo. [INSERIR GRAVAÇÃO DE TELA: painel WedTech]
5. IoT (50–60 s): celular bipando um código de barras no balcão; cliente mostrando um QR code para retirar a compra feita no site; prateleira com sensor acendendo. [INSERIR GRAVAÇÃO DE TELA: leitor e retirada]
6. IA + automação (60–75 s): alerta "Esse produto acaba em 3 dias, e seu fornecedor entrega em 7"; anúncios pausando sozinhos; pedido ao fornecedor pronto, Dona Maria só toca em "Confirmar"; mensagem de WhatsApp "Seu pedido está pronto para retirada". [INSERIR GRAVAÇÃO DE TELA: automações]
7. Resultado (75–85 s): Dona Maria sorrindo, loja movimentada, notificações de vendas de vários canais; montagem rápida com a lanchonete e a loja de capinhas usando a mesma tela. Texto: "Zero venda sem estoque. Mais tempo para crescer."
8. Fechamento (85–90 s): logo WedTech + "Tecnologia e conexão para o futuro." + "Hackathon 2026".

## FORMATO DA RESPOSTA
Primeiro, entregue o roteiro em uma tabela com: nº da cena, tempo, descrição visual detalhada, narração (texto exato), texto na tela e transição.
Depois, gere cada cena como um clipe de até 8 segundos, com um prompt de vídeo detalhado para cada uma (câmera, enquadramento, iluminação, movimento, ação dos personagens). Nas cenas marcadas com [INSERIR GRAVAÇÃO DE TELA], gere apenas o enquadramento de abertura/fechamento (por exemplo, um notebook ou celular mostrando uma tela genérica azul), pois vamos inserir a gravação real do aplicativo na edição.
Por fim, entregue a narração completa, em um bloco único, para gravação ou geração de voz.
```
