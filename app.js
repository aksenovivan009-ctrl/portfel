const totalCapital = 10000000;

const holdings = [
  { category: "Качественный рост", asset: "Microsoft (MSFT)", symbols: ["MSFT"], weight: 18, expectedReturn: 12, risk: 16, comment: "Крупная ставка на AI, облака и устойчивый денежный поток" },
  { category: "Качественный рост", asset: "Alphabet (GOOGL)", symbols: ["GOOGL"], weight: 14, expectedReturn: 13, risk: 18, comment: "Рост через рекламу, облака и AI при умеренном риске" },
  { category: "AI / полупроводники", asset: "Broadcom (AVGO)", symbols: ["AVGO"], weight: 10, expectedReturn: 15, risk: 24, comment: "AI-инфраструктура с меньшей концентрацией, чем у NVDA" },
  { category: "Финансы", asset: "Visa (V)", symbols: ["V"], weight: 10, expectedReturn: 9, risk: 12, comment: "Платежная сеть с высокой маржинальностью и умеренным риском" },
  { category: "Защитное потребление", asset: "Costco (COST)", symbols: ["COST"], weight: 9, expectedReturn: 8, risk: 10, comment: "Стабильный спрос и сильная модель membership" },
  { category: "AI / полупроводники", asset: "NVIDIA (NVDA)", symbols: ["NVDA"], weight: 8, expectedReturn: 18, risk: 30, comment: "Драйвер доходности, но доля ограничена из-за риска" },
  { category: "Защитный якорь", asset: "Berkshire Hathaway (BRK.B)", symbols: ["BRK.B"], weight: 8, expectedReturn: 6, risk: 8, comment: "Диверсифицированный холдинг как стабилизатор портфеля" },
  { category: "Здравоохранение", asset: "Johnson & Johnson (JNJ)", symbols: ["JNJ"], weight: 7, expectedReturn: 5, risk: 8, comment: "Защитный сектор и низкая волатильность" },
  { category: "Защитное потребление", asset: "Procter & Gamble (PG)", symbols: ["PG"], weight: 6, expectedReturn: 5, risk: 7, comment: "Товары повседневного спроса и дивидендная устойчивость" },
  { category: "Защитное потребление", asset: "Coca-Cola (KO)", symbols: ["KO"], weight: 5, expectedReturn: 5, risk: 7, comment: "Глобальный бренд и стабильный спрос" },
  { category: "Финансы", asset: "JPMorgan Chase (JPM)", symbols: ["JPM"], weight: 3, expectedReturn: 8, risk: 16, comment: "Сильный банк, но доля снижена для контроля риска" },
  { category: "Энергия", asset: "Exxon Mobil (XOM)", symbols: ["XOM"], weight: 2, expectedReturn: 6, risk: 14, comment: "Энергетика и дивидендный стабилизатор малой долей" },
].map((item) => ({
  ...item,
  amount: totalCapital * item.weight / 100,
  returnContribution: item.weight * item.expectedReturn / 100,
  riskContribution: item.weight * item.risk / 100,
}));

const statistics = holdings.map((item) => [item.asset, item.expectedReturn / 100, item.risk / 100]);
const matrixAssets = statistics.map((row) => row[0]);
const relationship = {
  "Качественный рост": { "Качественный рост": 0.6, "AI / полупроводники": 0.65, "Финансы": 0.4, "Защитное потребление": 0.25, "Здравоохранение": 0.2, "Защитный якорь": 0.45, "Энергия": 0.25 },
  "AI / полупроводники": { "AI / полупроводники": 0.7, "Финансы": 0.35, "Защитное потребление": 0.2, "Здравоохранение": 0.15, "Защитный якорь": 0.35, "Энергия": 0.25 },
  "Финансы": { "Финансы": 0.55, "Защитное потребление": 0.25, "Здравоохранение": 0.2, "Защитный якорь": 0.45, "Энергия": 0.35 },
  "Защитное потребление": { "Защитное потребление": 0.45, "Здравоохранение": 0.25, "Защитный якорь": 0.3, "Энергия": 0.15 },
  "Здравоохранение": { "Здравоохранение": 0.45, "Защитный якорь": 0.25, "Энергия": 0.1 },
  "Защитный якорь": { "Защитный якорь": 0.45, "Энергия": 0.25 },
  "Энергия": { "Энергия": 0.5 },
};

function assumedCorrelation(left, right) {
  if (left.asset === right.asset) return 1;
  return relationship[left.category]?.[right.category]
    ?? relationship[right.category]?.[left.category]
    ?? 0.25;
}

const correlation = holdings.map((left) => holdings.map((right) => assumedCorrelation(left, right)));
const covariance = holdings.map((left) => holdings.map((right) => {
  const corr = assumedCorrelation(left, right);
  return corr * (left.risk / 100) * (right.risk / 100);
}));

const colors = ["#1f7a4d", "#315f9f", "#b16a16", "#247b78", "#8f4d72", "#6c7444", "#b6463b"];
const quotes = new Map();

const rub = new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 });
const pct = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 });
const money = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 });

function qs(id) {
  return document.getElementById(id);
}

function formatPercent(value) {
  return `${pct.format(value)}%`;
}

function renderKpis() {
  qs("totalValue").textContent = rub.format(holdings.reduce((sum, item) => sum + item.amount, 0));
  qs("portfolioReturn").textContent = formatPercent(holdings.reduce((sum, item) => sum + item.returnContribution, 0));
  qs("portfolioRisk").textContent = formatPercent(holdings.reduce((sum, item) => sum + item.riskContribution, 0));
  qs("assetCount").textContent = holdings.length;
}

function quoteFor(item) {
  const found = item.symbols.map((symbol) => quotes.get(symbol)).filter(Boolean);
  if (!found.length) return null;
  const valid = found.filter((quote) => Number.isFinite(quote.price));
  if (!valid.length) return null;
  const avgPrice = valid.reduce((sum, quote) => sum + quote.price, 0) / valid.length;
  const avgChange = valid.reduce((sum, quote) => sum + (quote.changePercent || 0), 0) / valid.length;
  const currency = valid.map((quote) => quote.currency).filter(Boolean).join(" / ");
  return { price: avgPrice, changePercent: avgChange, currency };
}

function renderHoldings() {
  const query = qs("assetSearch").value.trim().toLowerCase();
  const body = qs("holdingsBody");
  body.innerHTML = "";

  holdings
    .filter((item) => `${item.asset} ${item.category}`.toLowerCase().includes(query))
    .forEach((item) => {
      const quote = quoteFor(item);
      const changeClass = quote?.changePercent > 0 ? "positive" : quote?.changePercent < 0 ? "negative" : "";
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${item.asset}</strong><small>${item.comment}</small></td>
        <td><span class="pill">${item.category}</span></td>
        <td>${rub.format(item.amount)}</td>
        <td>${formatPercent(item.weight)}</td>
        <td>${formatPercent(item.expectedReturn)}<small>вклад ${formatPercent(item.returnContribution)}</small></td>
        <td>${formatPercent(item.risk)}<small>вклад ${formatPercent(item.riskContribution)}</small></td>
        <td>${quote ? `${money.format(quote.price)} ${quote.currency}` : "—"}</td>
        <td class="${changeClass}">${quote ? formatPercent(quote.changePercent) : "—"}</td>
      `;
      body.appendChild(tr);
    });
}

function renderAllocationChart() {
  const canvas = qs("allocationChart");
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  canvas.width = canvas.clientWidth * dpr;
  canvas.height = 280 * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, canvas.clientWidth, 280);

  const byCategory = new Map();
  holdings.forEach((item) => byCategory.set(item.category, (byCategory.get(item.category) || 0) + item.weight));
  const entries = [...byCategory.entries()];
  const total = entries.reduce((sum, [, value]) => sum + value, 0);
  const cx = canvas.clientWidth / 2;
  const cy = 128;
  const radius = 96;
  let start = -Math.PI / 2;

  entries.forEach(([name, value], index) => {
    const angle = (value / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, start, start + angle);
    ctx.closePath();
    ctx.fillStyle = colors[index % colors.length];
    ctx.fill();
    start += angle;
  });

  ctx.beginPath();
  ctx.fillStyle = "#ffffff";
  ctx.arc(cx, cy, 54, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#17211d";
  ctx.font = "800 24px system-ui";
  ctx.textAlign = "center";
  ctx.fillText("100%", cx, cy + 8);

  qs("categoryLegend").innerHTML = entries
    .map(([name, value], index) => `<div class="legend-row"><span class="swatch" style="background:${colors[index % colors.length]}"></span><span>${name}</span><strong>${formatPercent(value)}</strong></div>`)
    .join("");
}

function renderRiskReturnChart() {
  const canvas = qs("riskReturnChart");
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  const height = 390;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, width, height);

  const margin = { left: 58, right: 20, top: 24, bottom: 48 };
  const points = statistics.map(([asset, ret, risk]) => ({ asset, ret, risk }));
  const maxRisk = Math.max(...points.map((point) => point.risk)) * 1.12;
  const minReturn = Math.min(...points.map((point) => point.ret)) - 0.01;
  const maxReturn = Math.max(...points.map((point) => point.ret)) * 1.15;

  const x = (risk) => margin.left + (risk / maxRisk) * (width - margin.left - margin.right);
  const y = (ret) => height - margin.bottom - ((ret - minReturn) / (maxReturn - minReturn)) * (height - margin.top - margin.bottom);

  ctx.strokeStyle = "#dfe5df";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(margin.left, margin.top);
  ctx.lineTo(margin.left, height - margin.bottom);
  ctx.lineTo(width - margin.right, height - margin.bottom);
  ctx.stroke();

  ctx.fillStyle = "#66736d";
  ctx.font = "12px system-ui";
  ctx.textAlign = "center";
  ctx.fillText("Риск", width / 2, height - 12);
  ctx.save();
  ctx.translate(16, height / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText("Средняя доходность", 0, 0);
  ctx.restore();

  points.forEach((point, index) => {
    const px = x(point.risk);
    const py = y(point.ret);
    ctx.beginPath();
    ctx.fillStyle = colors[index % colors.length];
    ctx.arc(px, py, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#17211d";
    ctx.font = "12px system-ui";
    ctx.textAlign = px > width - 130 ? "right" : "left";
    ctx.fillText(point.asset, px + (px > width - 130 ? -10 : 10), py + 4);
  });
}

function renderStatsTable() {
  qs("statsTab").innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Актив</th><th>Ожидаемая доходность за 3 мес.</th><th>Модельный риск</th></tr></thead>
        <tbody>${statistics.map(([asset, ret, risk]) => `<tr><td>${asset}</td><td class="${ret < 0 ? "negative" : "positive"}">${formatPercent(ret * 100)}</td><td>${formatPercent(risk * 100)}</td></tr>`).join("")}</tbody>
      </table>
    </div>`;
}

function heatColor(value, maxAbs) {
  const intensity = Math.min(Math.abs(value) / maxAbs, 1);
  const positive = value >= 0;
  const base = positive ? [31, 122, 77] : [182, 70, 59];
  const alpha = 0.1 + intensity * 0.35;
  return `rgba(${base[0]}, ${base[1]}, ${base[2]}, ${alpha})`;
}

function renderMatrix(targetId, matrix, decimals) {
  const maxAbs = Math.max(...matrix.flat().map((value) => Math.abs(value))) || 1;
  const rows = matrix.map((row, rowIndex) => `
    <tr>
      <th>${matrixAssets[rowIndex]}</th>
      ${row.map((value) => `<td class="heat" style="background:${heatColor(value, maxAbs)}">${value.toFixed(decimals)}</td>`).join("")}
    </tr>`).join("");

  qs(targetId).innerHTML = `
    <div class="matrix-wrap">
      <table class="matrix">
        <thead><tr><th>Актив</th>${matrixAssets.map((asset) => `<th>${asset}</th>`).join("")}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

async function refreshQuotes() {
  const button = qs("refreshQuotes");
  const status = qs("quoteStatus");
  const symbols = [...new Set(holdings.flatMap((item) => item.symbols))];
  button.disabled = true;
  status.textContent = "Обновляю котировки...";

  try {
    const response = await fetch(`/api/quotes?symbols=${encodeURIComponent(symbols.join(","))}`, { cache: "no-store" });
    const payload = await response.json();
    if (!payload.ok) throw new Error(payload.error || "Не удалось получить котировки");
    payload.quotes.forEach((quote) => quotes.set(quote.symbol, quote));
    renderHoldings();
    status.textContent = `Обновлено: ${new Date(payload.updatedAt).toLocaleTimeString("ru-RU")}`;
  } catch (error) {
    status.textContent = `Ошибка обновления: ${error.message}`;
  } finally {
    button.disabled = false;
  }
}

function bindTabs() {
  document.querySelectorAll(".tab").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((tab) => tab.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach((panel) => panel.classList.add("hidden"));
      button.classList.add("active");
      qs(`${button.dataset.tab}Tab`).classList.remove("hidden");
    });
  });
}

function init() {
  renderKpis();
  renderHoldings();
  renderAllocationChart();
  renderRiskReturnChart();
  renderStatsTable();
  renderMatrix("correlationTab", correlation, 2);
  renderMatrix("covarianceTab", covariance, 4);
  bindTabs();
  qs("assetSearch").addEventListener("input", renderHoldings);
  qs("refreshQuotes").addEventListener("click", refreshQuotes);
  window.addEventListener("resize", () => {
    renderAllocationChart();
    renderRiskReturnChart();
  });
}

init();
