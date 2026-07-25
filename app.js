// ============================================================
// SETUP
// ============================================================
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let produtos = [];
let tipos = [];
let contratos = [];
let filtroAtual = "todos";

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ============================================================
// TOAST
// ============================================================
let toastTimer;
function toast(msg) {
  const el = $("#toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2400);
}

// ============================================================
// TABS
// ============================================================
$$(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    $$(".tab-btn").forEach((b) => b.classList.remove("active"));
    $$(".screen").forEach((s) => s.classList.remove("active"));
    btn.classList.add("active");
    $("#" + btn.dataset.tab).classList.add("active");
  });
});

// ============================================================
// STATUS DE VALIDADE
// ============================================================
function hojeZero() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function getStatus(validadeStr) {
  const validade = new Date(validadeStr + "T00:00:00");
  const dias = Math.round((validade - hojeZero()) / 86400000);
  let status = "ok";
  if (dias <= 0) status = "critico";
  else if (dias <= DIAS_ALERTA) status = "atencao";
  return { status, dias };
}

function fmtData(str) {
  const [y, m, d] = str.split("-");
  return `${d}/${m}/${y}`;
}

function labelDias(dias) {
  if (dias < 0) return `Vencido há ${Math.abs(dias)} dia${Math.abs(dias) === 1 ? "" : "s"}`;
  if (dias === 0) return "Vence hoje";
  return `Vence em ${dias} dia${dias === 1 ? "" : "s"}`;
}

// ============================================================
// FETCH DATA
// ============================================================
async function carregarTudo() {
  await Promise.all([carregarProdutos(), carregarTipos(), carregarContratos()]);
  renderProdutos();
  renderMetas();
  renderContratos();
  atualizarAlertChip();
  checarNotificacoes();
}

async function carregarProdutos() {
  const { data, error } = await sb.from("produtos").select("*").order("validade", { ascending: true });
  if (error) return toast("Erro ao carregar produtos");
  produtos = data || [];
}

async function carregarTipos() {
  const { data, error } = await sb.from("contrato_tipos").select("*").order("nome");
  if (error) return toast("Erro ao carregar tipos de contrato");
  tipos = data || [];
  const select = $("#c_tipo");
  select.innerHTML = tipos.map((t) => `<option value="${t.id}">${t.nome}</option>`).join("");
}

async function carregarContratos() {
  const { data, error } = await sb
    .from("contratos")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) return toast("Erro ao carregar contratos");
  contratos = data || [];
}

// ============================================================
// RENDER — PRODUTOS
// ============================================================
function renderProdutos() {
  const lista = $("#listaProdutos");
  const filtrados = produtos.filter((p) => {
    if (filtroAtual === "todos") return true;
    return getStatus(p.validade).status === filtroAtual;
  });

  $("#produtosCount").textContent = `(${produtos.length})`;
  $("#produtosEmpty").classList.toggle("hidden", filtrados.length > 0);

  lista.innerHTML = filtrados
    .map((p) => {
      const { status, dias } = getStatus(p.validade);
      return `
        <div class="tag status-${status}">
          <div class="tag-top">
            <div class="tag-name">${escapeHtml(p.nome)}</div>
            <div class="status-badge status-${status}">${labelDias(dias)}</div>
          </div>
          <div class="tag-meta">
            <span>Qtd: <b>${p.quantidade}</b></span>
            <span>Validade: <b>${fmtData(p.validade)}</b></span>
          </div>
          <div class="tag-actions">
            <button class="icon-btn" onclick="editarProduto('${p.id}')">Editar</button>
            <button class="icon-btn danger" onclick="excluirProduto('${p.id}')">Excluir</button>
          </div>
        </div>`;
    })
    .join("");
}

$$(".pill").forEach((pill) => {
  pill.addEventListener("click", () => {
    $$(".pill").forEach((p) => p.classList.remove("active"));
    pill.classList.add("active");
    filtroAtual = pill.dataset.filter;
    renderProdutos();
  });
});

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ============================================================
// FORM — ADICIONAR / EDITAR PRODUTO
// ============================================================
let editandoProdutoId = null;

function entrarModoEdicaoProduto(p) {
  editandoProdutoId = p.id;
  $("#p_nome").value = p.nome;
  $("#p_qtd").value = p.quantidade;
  $("#p_validade").value = p.validade;
  $("#formProdutoTitle").textContent = "Editar produto";
  $("#btnSalvarProduto").textContent = "Salvar alterações";
  $("#btnCancelarEdicao").classList.remove("hidden");
  $("#formProduto").scrollIntoView({ behavior: "smooth", block: "start" });
  $("#p_nome").focus();
}

function sairModoEdicaoProduto() {
  editandoProdutoId = null;
  $("#formProduto").reset();
  $("#p_qtd").value = 1;
  $("#formProdutoTitle").textContent = "Adicionar produto";
  $("#btnSalvarProduto").textContent = "+ Adicionar produto";
  $("#btnCancelarEdicao").classList.add("hidden");
}

function editarProduto(id) {
  const p = produtos.find((x) => x.id === id);
  if (!p) return;
  entrarModoEdicaoProduto(p);
}
window.editarProduto = editarProduto;

$("#btnCancelarEdicao").addEventListener("click", sairModoEdicaoProduto);

$("#formProduto").addEventListener("submit", async (e) => {
  e.preventDefault();
  const nome = $("#p_nome").value.trim();
  const quantidade = parseInt($("#p_qtd").value, 10);
  const validade = $("#p_validade").value;
  if (!nome || !validade) return;

  if (editandoProdutoId) {
    const { error } = await sb
      .from("produtos")
      .update({ nome, quantidade, validade })
      .eq("id", editandoProdutoId);
    if (error) return toast("Erro ao atualizar produto");
    toast("Produto atualizado ✅");
    sairModoEdicaoProduto();
  } else {
    const { error } = await sb.from("produtos").insert({ nome, quantidade, validade });
    if (error) return toast("Erro ao salvar produto");
    e.target.reset();
    $("#p_qtd").value = 1;
    toast("Produto adicionado ✅");
  }

  await carregarProdutos();
  renderProdutos();
  atualizarAlertChip();
});

async function excluirProduto(id) {
  if (!confirm("Excluir este produto?")) return;
  const { error } = await sb.from("produtos").delete().eq("id", id);
  if (error) return toast("Erro ao excluir");
  if (id === editandoProdutoId) sairModoEdicaoProduto();
  toast("Produto excluído");
  await carregarProdutos();
  renderProdutos();
  atualizarAlertChip();
}
window.excluirProduto = excluirProduto;

// ============================================================
// ALERT CHIP
// ============================================================
function atualizarAlertChip() {
  const chip = $("#alertChip");
  const count = $("#alertCount");
  const criticos = produtos.filter((p) => getStatus(p.validade).status === "critico").length;
  const atencao = produtos.filter((p) => getStatus(p.validade).status === "atencao").length;
  const total = criticos + atencao;

  count.textContent = total;
  chip.classList.toggle("has-alerts", atencao > 0 && criticos === 0);
  chip.classList.toggle("has-danger", criticos > 0);
}

$("#alertChip").addEventListener("click", () => {
  $$(".tab-btn").forEach((b) => b.classList.remove("active"));
  $$(".screen").forEach((s) => s.classList.remove("active"));
  $('[data-tab="tab-produtos"]').classList.add("active");
  $("#tab-produtos").classList.add("active");
  $$(".pill").forEach((p) => p.classList.remove("active"));
  $('.pill[data-filter="todos"]').classList.add("active");
  filtroAtual = "todos";
  renderProdutos();
});

// ============================================================
// WHATSAPP — GERAR MENSAGEM
// ============================================================
$("#btnGerarWpp").addEventListener("click", () => {
  const somenteAlerta = $("#wpp_somenteAlerta").checked;
  let lista = [...produtos].sort((a, b) => new Date(a.validade) - new Date(b.validade));
  if (somenteAlerta) {
    lista = lista.filter((p) => getStatus(p.validade).status !== "ok");
  }

  if (lista.length === 0) {
    toast("Nenhum produto para incluir na mensagem");
    return;
  }

  const hoje = new Date().toLocaleDateString("pt-BR");
  const emoji = { ok: "🟢", atencao: "🟡", critico: "🔴" };

  let texto = `📦 *CONTROLE DE ESTOQUE*\n🗓️ ${hoje}\n━━━━━━━━━━━━━━━━━━━━\n\n`;

  lista.forEach((p, i) => {
    const { status, dias } = getStatus(p.validade);
    texto += `${emoji[status]} *${p.nome}*\n`;
    texto += `   Qtd: ${p.quantidade} | Val: ${fmtData(p.validade)} (${labelDias(dias)})\n\n`;
  });

  texto += `━━━━━━━━━━━━━━━━━━━━\n`;
  texto += `Total de itens: *${lista.length}*\n`;
  const criticos = lista.filter((p) => getStatus(p.validade).status === "critico").length;
  const atencao = lista.filter((p) => getStatus(p.validade).status === "atencao").length;
  if (criticos > 0) texto += `🔴 Vencidos: ${criticos}\n`;
  if (atencao > 0) texto += `🟡 Em atenção: ${atencao}\n`;

  $("#wppPreview").textContent = texto;
  $("#wppPreviewCard").style.display = "block";
  $("#wppPreviewCard").scrollIntoView({ behavior: "smooth", block: "start" });
});

$("#btnCopiar").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText($("#wppPreview").textContent);
    toast("Texto copiado ✅");
  } catch {
    toast("Não foi possível copiar automaticamente");
  }
});

$("#btnEnviar").addEventListener("click", () => {
  const texto = encodeURIComponent($("#wppPreview").textContent);
  window.open(`https://wa.me/?text=${texto}`, "_blank");
});

// ============================================================
// METAS DE CONTRATO
// ============================================================
function renderMetas() {
  const lista = $("#listaMetas");
  lista.innerHTML = tipos
    .map((t) => {
      const count = contratos.filter((c) => c.tipo_id === t.id).length;
      const meta = t.meta || 0;
      const pct = meta > 0 ? Math.min(100, Math.round((count / meta) * 100)) : 0;
      return `
        <div class="meta-card">
          <div class="meta-top">
            <span class="name">${t.nome}</span>
            <span class="count">${count}${meta > 0 ? " / " + meta : ""}</span>
          </div>
          <div class="meta-bar"><div class="meta-bar-fill" style="width:${meta > 0 ? pct : 0}%"></div></div>
          <div class="meta-edit">
            <span>Meta:</span>
            <input type="number" min="0" value="${meta}" data-tipo="${t.id}" class="meta-input">
          </div>
        </div>`;
    })
    .join("");

  $$(".meta-input").forEach((input) => {
    input.addEventListener("change", async (e) => {
      const tipoId = e.target.dataset.tipo;
      const novaMeta = parseInt(e.target.value, 10) || 0;
      const { error } = await sb.from("contrato_tipos").update({ meta: novaMeta }).eq("id", tipoId);
      if (error) return toast("Erro ao salvar meta");
      toast("Meta atualizada");
      await carregarTipos();
      renderMetas();
    });
  });
}

// ============================================================
// CONTRATOS
// ============================================================
$("#formContrato").addEventListener("submit", async (e) => {
  e.preventDefault();
  const tipo_id = $("#c_tipo").value;
  const cliente = $("#c_cliente").value.trim();
  const data_contrato = $("#c_data").value;
  const observacao = $("#c_obs").value.trim() || null;
  if (!tipo_id || !cliente || !data_contrato) return;

  const { error } = await sb.from("contratos").insert({ tipo_id, cliente, data_contrato, observacao });
  if (error) return toast("Erro ao salvar contrato");

  e.target.reset();
  toast("Contrato adicionado ✅");
  await carregarContratos();
  renderMetas();
  renderContratos();
});

function renderContratos() {
  const lista = $("#listaContratos");
  $("#contratosEmpty").classList.toggle("hidden", contratos.length > 0);
  lista.innerHTML = contratos
    .slice(0, 10)
    .map((c) => {
      const tipo = tipos.find((t) => t.id === c.tipo_id);
      return `
        <div class="tag">
          <div class="tag-top">
            <div class="tag-name">${escapeHtml(c.cliente)}</div>
            <div class="status-badge status-ok">${tipo ? tipo.nome : c.tipo_id}</div>
          </div>
          <div class="tag-meta">
            <span>Data: <b>${fmtData(c.data_contrato)}</b></span>
            ${c.observacao ? `<span>${escapeHtml(c.observacao)}</span>` : ""}
          </div>
          <div class="tag-actions">
            <button class="icon-btn danger" onclick="excluirContrato('${c.id}')">Excluir</button>
          </div>
        </div>`;
    })
    .join("");
}

async function excluirContrato(id) {
  if (!confirm("Excluir este contrato?")) return;
  const { error } = await sb.from("contratos").delete().eq("id", id);
  if (error) return toast("Erro ao excluir");
  toast("Contrato excluído");
  await carregarContratos();
  renderMetas();
  renderContratos();
}
window.excluirContrato = excluirContrato;

// ============================================================
// NOTIFICAÇÕES (enquanto o app está aberto no navegador)
// ============================================================
async function pedirPermissaoNotificacao() {
  if (!("Notification" in window)) return;
  if (Notification.permission === "default") {
    await Notification.requestPermission();
  }
}

function checarNotificacoes() {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const hojeStr = new Date().toISOString().slice(0, 10);

  produtos.forEach((p) => {
    const { status, dias } = getStatus(p.validade);
    if (status === "ok") return;

    const chave = `notif_${p.id}_${hojeStr}`;
    if (localStorage.getItem(chave)) return;

    new Notification("⏰ Produto próximo do vencimento", {
      body: `${p.nome} — ${labelDias(dias)} (Qtd: ${p.quantidade})`,
      tag: p.id,
    });
    localStorage.setItem(chave, "1");
  });
}

// Checa a cada 6 horas enquanto a aba estiver aberta
setInterval(checarNotificacoes, 6 * 60 * 60 * 1000);

// ============================================================
// INIT
// ============================================================
(function initDatasPadrao() {
  const hoje = new Date().toISOString().slice(0, 10);
  $("#c_data").value = hoje;
})();

pedirPermissaoNotificacao();
carregarTudo();
