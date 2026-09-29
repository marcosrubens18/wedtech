# WedTech — Protótipo Hackathon

Central Inteligente de E-commerce e Marketplaces da WedTech.
**Um produto. Todos os canais. Uma única inteligência.**

Identidade visual baseada em azul-marinho, azul tecnológico, grafite e superfícies claras. Slogan institucional: **Tecnologia e conexão para o futuro.**

## Abrir

Abra `dist/index.html` no navegador: é a página inicial (home) da WedTech, que apresenta a empresa e o produto, com os botões **Entrar** (vai para o SaaS em `dist/app.html`) e **Contrate agora** (abre o formulário de contratação simulado), ambos no canto superior direito. Não precisa instalar dependências, criar conta, informar chave ou conectar serviços — na tela de login, clique em "Preencher exemplo" e entre (qualquer e-mail/senha funciona; é só um protótipo).

Alternativamente, com Node.js instalado, execute `npm start` nesta pasta e abra http://127.0.0.1:4173. Para encerrar, use Ctrl+C no terminal.

## Roteiro de apresentação (8 a 11 minutos)

0. **Home (40 s):** mostre a proposta de valor, os números, o "antes × depois" do lojista, as avaliações, a seção de segurança/legalidade e os preços. No card **Personalizado**, clique em **Montar com a IA**, responda as 4 perguntas e mostre a recomendação; troque para **Falar com vendedor** para mostrar o chat. Depois clique em **Entrar** no topo.
0. **Login (10 s):** clique em "Preencher exemplo" e entre — é um protótipo, qualquer e-mail/senha funciona. Um tour guiado de 4 passos aparece na primeira vez ("Pular tour" a qualquer momento).
1. **Dashboard (40 s):** apresente indicadores, gráfico e recomendações do copiloto. Clique no sino de **notificações** para mostrar o histórico de eventos ("Nova venda no Mercado Livre..."). Ative **"Operação ao vivo"** para a demo gerar novos pedidos sozinha em segundo plano.
2. **Produtos (30 s):** mostre o catálogo único (com código de barras por produto) e abra Nike Revolution 8.
3. **WedTech One (90 s):** clique em “Preencher exemplo”, altere os dados se desejar e prepare os anúncios. Compare as versões por canal, corrija os avisos com WedTech AI e publique.
4. **Estoque Inteligente (3 min):** abra **Estoque Inteligente** — "estoque único, centralizado no Galpão Principal".
   - Bipe o SKU `NK-RV8-001` em modo Saída (venda balcão) — mostra a sincronização e a **NF simulada** (com QR code real) gerada. Se o navegador suportar `BarcodeDetector`, mostre também o botão **📷 Usar câmera** (complementa o campo de texto, nunca o substitui).
   - Abra o pedido **SEP-2201** e mostre a **rota de separação sugerida** (itens agrupados por corredor do Galpão Principal). Bipe `MS-G500-003` e `TC-K68-007` (ou seus códigos de barras), confirme a separação e despache — mostrando o fluxo “venda no marketplace → separação física → baixa → NF/etiqueta com QR → despacho”.
   - Mostre os cards **"Vendas em risco"** e **"Capital parado"** (impacto financeiro da previsão), a seção **Previsão de ruptura** e a nova seção **Estoque parado** (produtos com baixo giro e sugestão de liquidação). Clique em **"Gerar pedidos automaticamente"** para criar um pedido de compra a um fornecedor a partir da previsão — a peça de automação da Dor 1.
   - Clique em **"Simular contagem física"** para mostrar uma divergência de inventário e corrigi-la com um clique ("Corrigir com WedTech AI").
   - Clique em **"Exportar CSV"** para baixar o estoque/previsão.
5. **Marketplaces (20 s):** simule a conexão do Magalu.
6. **Financeiro (30 s):** mostre receita, custo das vendas, lucro bruto/líquido e a margem por produto (varia por categoria). Registre uma despesa ao vivo; exporte o CSV de despesas.
7. **Configurações (30 s):** mostre os dados da empresa, as lojas/CDs (o **Galpão Principal** tem um selo próprio) e os fornecedores (usados na reposição automática). Cadastre uma nova loja ou fornecedor ao vivo.
8. **WedTech AI (30 s):** clique em “Resuma minha operação.” O resumo incorpora vendas, separações, pedidos de compra em aberto e o impacto financeiro. Pergunte também “Qual meu lucro hoje?”, “Tenho produtos parados?” ou “Qual o impacto financeiro do estoque?”.

Use **Reiniciar demonstração** no rodapé da barra lateral antes da próxima apresentação (também desliga a operação ao vivo, se estiver ativa). **Sair** encerra a sessão e volta para o login.

## Dados e limites

- 10 produtos completos, estoque total de 842 unidades, 37 pedidos e R$ 4.850 em vendas iniciais.
- Os indicadores e quantidades de produtos por canal são calculados a partir do catálogo, em vez de exibir os totais ilustrativos de 128/97/84/42 do briefing.
- `dist/state.js` é a fonte única de regras e dados. `localStorage` guarda alterações por navegador/origem; se indisponível, a sessão continua em memória.
- O gráfico semanal e a participação por canal representam histórico fictício; novos pedidos também atualizam esses indicadores.
- A IA usa respostas locais pré-programadas e os dados atuais. Avisos de GTIN e título são exemplos didáticos, não validações reais de marketplaces.
- GTIN/EAN demonstrativo não é um código comercial válido.
- **Estoque Inteligente:** cada produto tem um código de barras (EAN) demonstrativo além do SKU. O leitor de código de barras é simulado por um campo de texto — digite o SKU ou o código para "bipar". Saída = venda imediata na loja física; Entrada = soma ao estoque (recebimento/reposição). Pedidos de marketplace entram numa fila de separação; cada item precisa ser bipado e conferido contra o pedido antes de liberar a baixa de estoque e o despacho. Todas as leituras ficam no histórico de rastreabilidade.
- **Previsão de ruptura:** estimativa de dias até esgotar calculada a partir da velocidade de venda de hoje de cada produto (não é uma previsão estatística real). Produtos abaixo do estoque mínimo (20 unidades, configurável no código) entram automaticamente na previsão.
- **Fornecedores e pedidos de compra:** cada produto tem um fornecedor vinculado. "Gerar pedidos automaticamente" cria pedidos de compra para produtos abaixo do mínimo que ainda não têm um pedido em aberto — a quantidade sugerida considera o estoque mínimo e o prazo de entrega do fornecedor. Não há envio real a nenhum fornecedor.
- **Divergência de inventário:** "Simular contagem física" gera uma pequena diferença determinística entre o estoque do sistema e uma contagem física fictícia, para demonstrar o fluxo de correção assistida pela WedTech AI.
- **NF e etiqueta:** geradas automaticamente a cada venda física ou despacho de pedido. São documentos demonstrativos (inclusive a "chave de acesso" e o código de rastreio) e **não têm validade fiscal ou logística real**.
- **Financeiro:** custo de aquisição por produto e despesas operacionais são estimativas simuladas (despesas com rateio diário, comparável à receita "de hoje" exibida no restante do app), não dados contábeis reais.
- **Notificações e operação ao vivo:** o sino no topo mostra os últimos eventos (vendas, separações, despachos, reposições) e zera o contador ao abrir. "Operação ao vivo" gera novos pedidos de marketplace periodicamente enquanto ativado, só para manter a demonstração em movimento.
- **Login e tour:** protótipo sem autenticação real — qualquer e-mail e senha entram; a sessão fica só no navegador (`sessionStorage`), então um recarregamento de página não desloga durante a apresentação. O tour guiado aparece uma vez (controlado por `localStorage`) e pode ser pulado.
- **Leitura por câmera:** complementa o campo de texto, nunca o substitui. Usa a API nativa `BarcodeDetector` do navegador (hoje com suporte parcial, principalmente Chrome/Edge); sem suporte ou sem permissão de câmera, mostra um aviso claro e o campo de texto continua funcionando normalmente. Nenhum vídeo é enviado a servidor algum.
- **Galpão Principal:** o estoque é único e compartilhado entre lojas e canais (não há saldo separado por loja), mas narrativamente centralizado no CD Guarulhos, identificado como Galpão Principal em Configurações.
- **Estoque parado e impacto financeiro:** além da previsão de ruptura, a WedTech AI identifica produtos com baixo giro (cobertura acima de 28 dias) e sugere um desconto de liquidação. Os cards "Vendas em risco" e "Capital parado" traduzem a previsão em reais — estimativas simples a partir do catálogo, não projeções estatísticas.
- **Rota de separação sugerida:** cada produto tem um corredor demonstrativo no Galpão Principal; ao separar um pedido, os itens aparecem reordenados por corredor para reduzir deslocamento.
- **QR code:** as NFs e etiquetas simuladas trazem um QR code real, gerado localmente por um encoder vendorizado (`dist/qrcode.js`, adaptado de [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator), MIT) — funciona offline, sem nenhum serviço externo, e foi validado decodificando-o de volta com uma lib de terceiros durante o desenvolvimento.
- **Exportação CSV:** os botões "Exportar CSV" (Estoque Inteligente e Financeiro) geram o arquivo localmente no navegador; nenhum dado sai da máquina.
- **Configurações:** dados da empresa (razão social/CNPJ/IE), lojas/centros de distribuição e fornecedores são editáveis e ficam salvos como os demais dados da demonstração. Operadores são ilustrativos, sem autenticação real.
- Publicações, conexões, vendas, leituras do leitor IoT, pedidos de compra, NF, etiquetas e exportações não fazem nenhuma chamada a APIs externas ou hardware/serviços reais além da câmera do próprio navegador (quando usada). Uploads de imagem ficam locais, limitados a 1 MB por imagem.
- **Home:** empresa (WedTech Tecnologia Ltda.), CNPJ, endereço, números, avaliações e selos de segurança são **ilustrativos** — há um aviso no rodapé. Planos: Básico R$ 50, Profissional R$ 100, Avançado R$ 200 e Personalizado (sob medida). O vendedor online e a recomendação da IA são simulados localmente (respostas pré-programadas). Contratações, conversas e recomendações não são enviadas: ficam só no `localStorage` do navegador (`wedtech-leads`).
- Protótipo sem backend, autenticação, pagamentos ou integrações. HTML, CSS e JavaScript sem dependências externas em tempo de execução; funciona offline.

## Verificação

Execute `npm run check` para verificar sintaxe e testes de consistência: estoque, vendas, publicação, correção de anúncio, leitor IoT (entrada/saída), separação e despacho de pedidos com NF/etiqueta (QR incluído) e rota de separação, previsão de ruptura e de estoque parado, impacto financeiro, pedidos de compra a fornecedores, divergência de inventário, financeiro (lucro/despesas), notificações, login/tour, cadastro de lojas/fornecedores, persistência e renderização das oito áreas.

A interface opcional WebMCP expõe apenas consulta ao resumo da operação, com detecção de suporte. Não foi validada em um navegador com WebMCP disponível. A navegação e os fluxos principais não dependem desse recurso. A validação realizada foi por testes locais de estado e renderização, sem automação visual do navegador.
