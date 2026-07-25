# Rota Control — Estoque & Contratos

App mobile-first para controlar validade de produtos e contratos (geladeira, gôndolas, pontos extras).

## Arquivos
- `index.html` — estrutura das 3 telas
- `style.css` — visual (dark, cartões coloridos por status)
- `app.js` — toda a lógica (Supabase, alertas, WhatsApp, metas)
- `config.js` — **você precisa editar este arquivo**
- `schema.sql` — rode no Supabase antes de usar o app

## Passo 1 — Criar o banco no Supabase
1. Crie um projeto em https://supabase.com
2. Vá em **SQL Editor** → cole todo o conteúdo de `schema.sql` → **Run**
3. Isso cria as tabelas `produtos`, `contrato_tipos` (já vem com os 7 tipos que você pediu) e `contratos`

## Passo 2 — Conectar o app ao seu Supabase
1. No Supabase, vá em **Project Settings → API**
2. Copie a **Project URL** e a **anon public key**
3. Abra `config.js` e cole nos lugares indicados:
```js
const SUPABASE_URL = "https://xxxxxxx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOi....";
```

## Passo 3 — Publicar o site
Qualquer hospedagem estática funciona (é só HTML/CSS/JS puro, sem build):
- **Netlify / Vercel**: arraste a pasta inteira (drag-and-drop) → pronto
- **GitHub Pages**: suba os arquivos num repositório e ative Pages
- Ou abra `index.html` direto no celular pra testar localmente

Depois de publicado, adicione o site à tela inicial do celular (Chrome/Safari →
"Adicionar à tela de início") pra ele funcionar como um app.

## Como funciona cada tela

**Produtos**: cadastra nome, quantidade e validade. Os cartões ficam com uma
barra colorida na lateral:
- 🟢 verde = mais de 20 dias para vencer
- 🟡 amarelo = 20 dias ou menos (configurável em `config.js`, `DIAS_ALERTA`)
- 🔴 vermelho = vencido

**WhatsApp**: monta uma mensagem formatada (com emojis por status, quantidade
e validade de cada item) e deixa você **copiar o texto** ou **abrir direto no
WhatsApp** já com a mensagem pronta pra escolher o contato.

**Metas**: cadastra contratos (geladeira, gôndola de cerveja, NAB, Gatorade,
drinks prontos, ponto extra de refri e de cerveja), informando o cliente/ponto
de venda e a data. Cada tipo tem uma barra de progresso comparando quantos
contratos já foram fechados contra a meta que você definir (clique no campo
"Meta" pra editar).

## Sobre os alertas por notificação
O navegador pede permissão de notificação ao abrir o app. Enquanto a aba
estiver aberta (ou minimizada), ele confere a cada 6 horas se algum produto
entrou na faixa de alerta e dispara uma notificação — sem repetir a mesma
notificação no mesmo dia.

**Importante**: navegador não manda notificação com o site fechado. Se você
quiser alertas mesmo de app fechado (notificação push de verdade, tipo
Instagram), é preciso um passo extra: registrar um Service Worker com Web
Push e um pequeno servidor (ou Edge Function do próprio Supabase) que dispare
o push todo dia. Se quiser, posso montar essa parte depois — fica bem mais
simples de fazer isso como uma segunda etapa.

## Segurança
O app usa a chave `anon` do Supabase direto no navegador, com as tabelas
liberadas para leitura/escrita (RLS "allow all"). Isso é adequado pra uso
pessoal/single-user. Se um dia você quiser login com senha e dados privados
por usuário, me avise que ajusto o schema pra usar autenticação do Supabase.
