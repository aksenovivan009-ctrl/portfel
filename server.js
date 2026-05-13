const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const PORT = Number(process.env.PORT || 4173);
const ROOT = __dirname;
const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

const symbolName = {
  NVDA: "NVIDIA",
  MSFT: "Microsoft",
  AAPL: "Apple",
  "BRK.B": "Berkshire Hathaway",
  GOOGL: "Alphabet",
  AVGO: "Broadcom",
  V: "Visa",
  COST: "Costco",
  JNJ: "Johnson & Johnson",
  PG: "Procter & Gamble",
  KO: "Coca-Cola",
  JPM: "JPMorgan Chase",
  XOM: "Exxon Mobil",
  CVX: "Chevron",
  USO: "United States Oil Fund",
  "LKOH.ME": "Лукойл",
  "SBER.ME": "Сбер",
  "YDEX.ME": "Яндекс",
  "GC=F": "Золото",
  "BTC-USD": "Bitcoin",
  "ETH-USD": "Ethereum",
};

const stooqSymbol = {
  NVDA: "nvda.us",
  MSFT: "msft.us",
  AAPL: "aapl.us",
  "BRK.B": "brk-b.us",
  GOOGL: "googl.us",
  AVGO: "avgo.us",
  V: "v.us",
  COST: "cost.us",
  JNJ: "jnj.us",
  PG: "pg.us",
  KO: "ko.us",
  JPM: "jpm.us",
  XOM: "xom.us",
  CVX: "cvx.us",
  USO: "uso.us",
  "GC=F": "gc.f",
  "BTC-USD": "btcusd",
  "ETH-USD": "ethusd",
};

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let quoted = false;
  for (const char of line) {
    if (char === "\"") quoted = !quoted;
    else if (char === "," && !quoted) {
      values.push(current);
      current = "";
    } else current += char;
  }
  values.push(current);
  return values;
}

async function fetchStooqQuotes(symbols) {
  const unique = [...new Set(symbols.filter(Boolean))];
  const mapped = unique
    .map((symbol) => ({ original: symbol, provider: stooqSymbol[symbol] }))
    .filter((item) => item.provider);

  if (mapped.length === 0) return [];

  const url = `https://stooq.com/q/l/?s=${mapped.map((item) => item.provider).join("+")}&f=sd2t2ohlcv&h&e=csv`;
  const response = await fetch(url, {
    headers: {
      "accept": "text/csv",
      "user-agent": "Mozilla/5.0 portfolio-dashboard",
    },
  });

  if (!response.ok) {
    throw new Error(`Quote provider responded with ${response.status}`);
  }

  const rows = (await response.text()).trim().split(/\r?\n/).slice(1).map(parseCsvLine);
  const byProvider = new Map(mapped.map((item) => [item.provider.toUpperCase(), item.original]));

  return rows
    .map(([providerSymbol, date, time, open, high, low, close, volume]) => {
      const original = byProvider.get(providerSymbol.toUpperCase());
      const openNumber = Number(open);
      const closeNumber = Number(close);
      if (!original || !Number.isFinite(closeNumber)) return null;
      const change = Number.isFinite(openNumber) ? closeNumber - openNumber : null;
      const changePercent = Number.isFinite(openNumber) && openNumber !== 0 ? (change / openNumber) * 100 : null;
      return {
        symbol: original,
        shortName: symbolName[original] || original,
        price: closeNumber,
        change,
        changePercent,
        currency: ["BTC-USD", "ETH-USD"].includes(original) ? "USD" : original === "GC=F" ? "USD/oz" : "USD",
        exchange: "Stooq",
        marketTime: date !== "N/D" && time !== "N/D" ? new Date(`${date}T${time}`).getTime() : Date.now(),
        high: Number(high) || null,
        low: Number(low) || null,
        volume: Number(volume) || null,
      };
    })
    .filter(Boolean);
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(body);
}

function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const requested = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const safePath = path.normalize(requested).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(ROOT, safePath);

  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, buffer) => {
    if (error) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    const type = MIME_TYPES[path.extname(filePath)] || "application/octet-stream";
    res.writeHead(200, { "content-type": type });
    res.end(buffer);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === "/api/quotes") {
    try {
      const symbols = (url.searchParams.get("symbols") || "").split(",").map((s) => s.trim());
      const quotes = await fetchStooqQuotes(symbols);
      sendJson(res, 200, { ok: true, quotes, updatedAt: Date.now() });
    } catch (error) {
      sendJson(res, 502, { ok: false, error: error.message });
    }
    return;
  }

  serveStatic(req, res);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Portfolio dashboard: http://localhost:${PORT}`);
});
