import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { trimString } from "../utils/text.js";
import { POINT_VALUE_BRL, pointsToBrl, roundCurrency, roundPoints } from "../utils/points.js";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const SALE_STATUSES = new Set(["pending", "approved", "rejected"]);

const isValidDate = (value) => typeof value === "string" && DATE_REGEX.test(value.trim());

const normalizeOrderNumber = (value) => {
  if (value == null) {
    return null;
  }
  const normalized = String(value).trim();
  return normalized ? normalized : null;
};

const stripBom = (value) => {
  if (!value) return "";
  return value.replace(/^[\uFEFF\u200B]+/, "");
};

const normalizeImportHeader = (header) =>
  stripBom(String(header || "")).toLowerCase().normalize("NFD").replace(/[^a-z0-9]/g, "");

const detectImportDelimiter = (line) => {
  const tab = "\t";
  if (line.includes(tab)) return tab;
  if (line.includes(";")) return ";";
  if (line.includes(",")) return ",";
  return null;
};

const parsePointsValue = (value, fieldLabel) => {
  if (value == null || value === "") {
    return { error: `${fieldLabel} deve ser informado.` };
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return { error: `${fieldLabel} deve ser um numero inteiro maior ou igual a zero.` };
  }
  const rounded = roundPoints(parsed);
  if (Math.abs(rounded - parsed) > 0.0001) {
    return { error: `${fieldLabel} deve ser um numero inteiro.` };
  }
  return { value: rounded };
};

const parseImportDate = (value) => {
  if (!value) {
    return { error: "Informe a data da venda." };
  }
  const trimmed = stripBom(String(value)).trim();
  if (!trimmed) {
    return { error: "Informe a data da venda." };
  }
  const match = trimmed.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})(?:\s+(\d{1,2}):(\d{2}))?$/);
  if (!match) {
    return { error: "Data invalida. Use o formato DD/MM/AAAA." };
  }
  let [day, month, year] = [Number(match[1]), Number(match[2]), Number(match[3])];
  if (year < 100) {
    year += 2000;
  }
  if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900) {
    return { error: "Data invalida. Use o formato DD/MM/AAAA." };
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    return { error: "Data invalida. Use o formato DD/MM/AAAA." };
  }
  const iso = `${year.toString().padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(
    day,
  ).padStart(2, "0")}`;
  return { value: iso };
};

const splitDelimitedLine = (line, delimiter) => {
  if (!delimiter) {
    return line.split(",").map((value) => stripBom(value).trim());
  }
  const result = [];
  let current = "";
  let insideQuotes = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (insideQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (!insideQuotes && char === delimiter) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result.map((value) => stripBom(value).trim());
};

const parseDelimitedRows = (text, delimiter) => {
  const rows = [];
  let current = "";
  let row = [];
  let insideQuotes = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"') {
      if (insideQuotes && text[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (!insideQuotes && char === delimiter) {
      row.push(current);
      current = "";
    } else if (!insideQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && text[index + 1] === "\n") {
        index += 1;
      }
      row.push(current);
      rows.push(row);
      row = [];
      current = "";
    } else {
      current += char;
    }
  }
  if (current.length || row.length) {
    row.push(current);
    rows.push(row);
  }
  return rows;
};

const formatShopifyPaidAtDate = (value) => {
  const trimmed = stripBom(String(value || "")).trim();
  if (!trimmed) return "";
  const isoMatch = trimmed.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!isoMatch) {
    return trimmed;
  }
  const [, year, month, day] = isoMatch;
  return `${day}/${month}/${year}`;
};

const parseManualSalesImport = (text) => {
  const lines = text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) =>
      stripBom(line)
        .replace(/[\u0000-\u0008\u000A-\u001F]+/g, "")
        .trimEnd(),
    );

  const columnAliases = {
    orderNumber: ["pedido", "numero", "ordem", "ordernumber", "numeropedido"],
    cupom: ["cupom", "coupon"],
    date: ["data", "date"],
    points: ["pontos", "points", "pontuacao", "pontuacoes", "pontuacao_total"],
  };

  const columnIndexes = { orderNumber: 0, cupom: 1, date: 2, points: 3 };
  let delimiter = null;
  let dataStarted = false;
  let lineNumber = 0;

  const rows = [];

  for (const rawLine of lines) {
    lineNumber += 1;
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    if (!dataStarted) {
      const normalizedHeaderLine = normalizeImportHeader(line);
      const headerMatched = Object.entries(columnAliases).some(([column, aliases]) =>
        aliases.some((alias) => normalizedHeaderLine.includes(alias)),
      );

      if (headerMatched) {
        delimiter = detectImportDelimiter(line);
        const headers = delimiter ? splitDelimitedLine(line, delimiter) : line.split(/\s+/);
        const normalizedHeaders = headers.map((header) => normalizeImportHeader(header));
        Object.entries(columnAliases).forEach(([column, aliases]) => {
          const index = normalizedHeaders.findIndex((header) => aliases.includes(header));
          if (index >= 0) {
            columnIndexes[column] = index;
          }
        });
        dataStarted = true;
        continue;
      }
      dataStarted = true;
    }

    delimiter = detectImportDelimiter(line) || delimiter;
    const cells = delimiter ? line.split(delimiter) : line.split(/\s{2,}|\s/);

    const getCell = (column) => {
      const index = columnIndexes[column];
      if (index == null || index >= cells.length) return "";
      return stripBom(cells[index]).trim();
    };

    rows.push({
      line: lineNumber,
      orderNumber: getCell("orderNumber"),
      cupom: getCell("cupom"),
      rawDate: getCell("date"),
      rawPoints: getCell("points"),
    });
  }

  return { rows };
};

const loadSkuPointsMap = async () => {
  const rows = await prisma.skuPoint.findMany({
    where: { active: true },
    select: { sku: true, pointsPerUnit: true },
  });
  const map = new Map();
  rows.forEach((row) => {
    if (!row || !row.sku) {
      return;
    }
    const key = row.sku.trim().toLowerCase();
    if (!key) {
      return;
    }
    const points = Number(row.pointsPerUnit);
    map.set(key, Number.isFinite(points) && points >= 0 ? points : 0);
  });
  return map;
};

const tryParseShopifySalesImport = async (text) => {
  const firstLineBreak = text.indexOf("\n");
  const headerLine = firstLineBreak >= 0 ? text.slice(0, firstLineBreak) : text;
  const normalizedHeaderLine = normalizeImportHeader(headerLine);
  const requiredHeaders = ["name", "paidat", "discountcode", "lineitemquantity", "lineitemsku"];
  const isShopifyExport = requiredHeaders.every((header) => normalizedHeaderLine.includes(header));
  if (!isShopifyExport) {
    return null;
  }

  const delimiter = detectImportDelimiter(headerLine) || ",";
  const rows = parseDelimitedRows(text, delimiter);
  if (!rows.length) {
    return { error: "Arquivo CSV sem conteudo." };
  }

  const header = rows[0];
  const normalizedHeader = header.map((cell) => normalizeImportHeader(cell));

  const resolveIndex = (aliases) => {
    for (const alias of aliases) {
      const index = normalizedHeader.indexOf(alias);
      if (index >= 0) {
        return index;
      }
    }
    return -1;
  };

  const nameIndex = resolveIndex(["name"]);
  const paidAtIndex = resolveIndex(["paidat"]);
  const couponIndex = resolveIndex(["discountcode", "discountcodes"]);
  const quantityIndex = resolveIndex(["lineitemquantity"]);
  const skuIndex = resolveIndex(["lineitemsku"]);

  if (nameIndex < 0 || paidAtIndex < 0 || couponIndex < 0 || quantityIndex < 0 || skuIndex < 0) {
    return { error: "Nao foi possivel identificar as colunas obrigatorias do CSV." };
  }

  const skuPointsMap = await loadSkuPointsMap();
  const entryMap = new Map();

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
    const cells = rows[rowIndex];
    if (!cells || !cells.length) {
      continue;
    }

    const hasData = cells.some((cell) => stripBom(cell || "").trim().length > 0);
    if (!hasData) {
      continue;
    }

    const orderRaw = stripBom(cells[nameIndex] || "").trim();
    if (!orderRaw) {
      continue;
    }

    const paidAtRaw = stripBom(cells[paidAtIndex] || "").trim();
    const couponRaw = stripBom(cells[couponIndex] || "").trim();
    const quantityRaw = stripBom(cells[quantityIndex] || "").trim();
    const skuRaw = stripBom(cells[skuIndex] || "").trim();

    const key = orderRaw;
    if (!entryMap.has(key)) {
      entryMap.set(key, {
        line: rowIndex + 1,
        orderNumber: orderRaw,
        rawDate: paidAtRaw ? formatShopifyPaidAtDate(paidAtRaw) : "",
        cupom: couponRaw,
        skuDetails: [],
      });
    }

    const entry = entryMap.get(key);
    if (!entry) {
      continue;
    }

    if (paidAtRaw && !entry.rawDate) {
      entry.rawDate = formatShopifyPaidAtDate(paidAtRaw);
    }
    if (couponRaw && !entry.cupom) {
      entry.cupom = couponRaw;
    }

    if (!skuRaw && !quantityRaw) {
      continue;
    }

    const quantity = Number(quantityRaw);
    const skuKey = skuRaw ? skuRaw.toLowerCase() : "";
    const pointsPerUnit = skuKey ? skuPointsMap.get(skuKey) ?? null : null;

    entry.skuDetails.push({
      sku: skuRaw,
      quantityRaw,
      quantity: Number.isFinite(quantity) ? quantity : null,
      pointsPerUnit,
      points:
        Number.isFinite(quantity) && pointsPerUnit != null
          ? roundPoints(quantity * pointsPerUnit)
          : null,
      line: rowIndex + 1,
    });
  }

  const entries = Array.from(entryMap.values()).map((entry) => {
    const details = entry.skuDetails.map((detail) => {
      let quantity = detail.quantity;
      if (quantity == null) {
        const parsed = Number(String(detail.quantityRaw || "").replace(",", "."));
        quantity = Number.isFinite(parsed) ? parsed : null;
      }
      const pointsPerUnit = detail.pointsPerUnit != null ? Number(detail.pointsPerUnit) : null;
      const computedPoints =
        pointsPerUnit != null && quantity != null ? roundPoints(quantity * pointsPerUnit) : null;
      return {
        sku: detail.sku,
        quantity,
        quantityRaw: detail.quantityRaw,
        pointsPerUnit,
        points: computedPoints,
        line: detail.line,
      };
    });

    const allPointsKnown = details.length > 0 && details.every((detail) => detail.points != null);
    const totalPoints = allPointsKnown
      ? details.reduce((sum, detail) => sum + (detail.points || 0), 0)
      : null;

    return {
      line: entry.line,
      orderNumber: entry.orderNumber,
      cupom: entry.cupom || "",
      rawDate: entry.rawDate || "",
      rawPoints: totalPoints != null ? String(totalPoints) : "",
      totalPoints,
      skuDetails: details,
    };
  });

  const filteredEntries = entries.filter((entry) => entry && entry.orderNumber);
  if (!filteredEntries.length) {
    return { error: "Nenhum pedido valido foi encontrado no arquivo CSV informado." };
  }

  return { rows: filteredEntries };
};

const loadInfluencerByCoupon = async (coupon) => {
  if (!coupon) {
    return null;
  }
  return prisma.influencer.findFirst({
    where: { coupon: { equals: coupon, mode: "insensitive" } },
    select: { id: true, coupon: true, name: true, commissionRate: true },
  });
};

const loadInfluencerMapByCoupons = async (coupons) => {
  if (!coupons.length) {
    return new Map();
  }

  const filters = coupons
    .filter((coupon) => coupon)
    .map((coupon) => ({ coupon: { equals: coupon, mode: "insensitive" } }));

  if (!filters.length) {
    return new Map();
  }

  const influencers = await prisma.influencer.findMany({
    where: { OR: filters },
    select: { id: true, coupon: true, name: true, commissionRate: true },
  });

  const map = new Map();
  influencers.forEach((influencer) => {
    if (!influencer?.coupon) return;
    map.set(influencer.coupon.trim().toLowerCase(), influencer);
  });
  return map;
};

const loadExistingSaleOrderNumbers = async (orderNumbers) => {
  if (!orderNumbers.length) {
    return new Set();
  }
  const orders = orderNumbers.filter((order) => order);
  if (!orders.length) {
    return new Set();
  }
  const sales = await prisma.sale.findMany({
    where: { orderNumber: { in: orders } },
    select: { orderNumber: true },
  });
  const set = new Set();
  sales.forEach((sale) => {
    if (sale?.orderNumber) {
      set.add(sale.orderNumber);
    }
  });
  return set;
};

const buildSalesImportAnalysis = async (entries) => {
  if (!Array.isArray(entries) || !entries.length) {
    return { error: "Nenhuma venda encontrada nos dados informados." };
  }

  const rows = entries.map((entry) => ({
    line: entry.line,
    orderNumber: entry.orderNumber ?? "",
    cupom: entry.cupom ?? "",
    rawDate: entry.rawDate ?? "",
    rawPoints: entry.rawPoints ?? (entry.totalPoints != null ? String(entry.totalPoints) : ""),
    skuDetails: Array.isArray(entry.skuDetails) ? entry.skuDetails : [],
    errors: [],
    source: entry,
  }));

  const coupons = rows
    .map((row) => trimString(row.cupom) || "")
    .filter((coupon, index, array) => coupon && array.indexOf(coupon) === index);
  const couponMap = await loadInfluencerMapByCoupons(coupons);

  const orderNumbers = rows
    .map((row) => normalizeOrderNumber(row.orderNumber))
    .filter((order, index, array) => order && array.indexOf(order) === index);
  const existingOrders = await loadExistingSaleOrderNumbers(orderNumbers);

  rows.forEach((row) => {
    const normalizedOrder = normalizeOrderNumber(row.orderNumber);
    const normalizedCupom = trimString(row.cupom) || "";

    const { value: isoDate, error: dateError } = parseImportDate(row.rawDate);
    if (dateError) {
      row.errors.push(dateError);
    }

    let points = null;
    if (row.source && row.source.totalPoints != null) {
      points = roundPoints(row.source.totalPoints);
    } else {
      const parsedPoints = parsePointsValue(row.rawPoints, "Pontos");
      if (parsedPoints.error) {
        row.errors.push(parsedPoints.error);
      } else {
        points = parsedPoints.value;
      }
    }

    const normalizedDetails = row.skuDetails.map((detail) => {
      const sku = trimString(detail?.sku) || "";
      const quantityValue = Number(detail?.quantity ?? detail?.quantityRaw);
      const quantity = Number.isFinite(quantityValue) ? quantityValue : null;
      const pointsPerUnit = detail?.pointsPerUnit != null ? Number(detail.pointsPerUnit) : null;
      const lineNumber = detail?.line != null ? detail.line : row.line;

      if (!sku) {
        row.errors.push(`SKU nao informado na linha ${lineNumber}.`);
      }

      if (!Number.isFinite(quantityValue) || quantityValue <= 0) {
        row.errors.push(
          `Quantidade invalida para SKU ${sku || "(sem SKU)"} na linha ${lineNumber}.`,
        );
      }

      if (pointsPerUnit == null || pointsPerUnit < 0) {
        row.errors.push(`SKU ${sku || "(sem SKU)"} nao possui pontuacao cadastrada.`);
      }

      const computedPoints =
        pointsPerUnit != null && quantity != null && quantity > 0 ? roundPoints(quantity * pointsPerUnit) : null;

      return {
        sku,
        quantity,
        line: lineNumber,
        pointsPerUnit,
        points: computedPoints,
      };
    });

    let influencer = null;
    if (!normalizedCupom) {
      row.errors.push("Cupom nao cadastrado.");
    } else {
      const key = normalizedCupom.toLowerCase();
      influencer = couponMap.get(key) || null;
      if (!influencer) {
        row.errors.push("Cupom nao cadastrado.");
      }
    }

    row.normalized = {
      orderNumber: normalizedOrder,
      cupom: normalizedCupom,
      date: isoDate,
      points,
      skuDetails: normalizedDetails,
      influencer,
    };
  });

  const orderOccurrences = new Map();
  rows.forEach((row) => {
    const order = row.normalized?.orderNumber ?? normalizeOrderNumber(row.orderNumber);
    if (!order) return;
    if (!orderOccurrences.has(order)) {
      orderOccurrences.set(order, []);
    }
    orderOccurrences.get(order).push(row);
  });

  rows.forEach((row) => {
    const normalizedOrder = row.normalized?.orderNumber ?? null;
    const duplicates = normalizedOrder ? orderOccurrences.get(normalizedOrder) || [] : [];
    if (duplicates.length > 1) {
      row.errors.push("Numero de pedido repetido nos dados importados.");
    }

    if (normalizedOrder && existingOrders.has(normalizedOrder)) {
      row.errors.push("Numero de pedido ja cadastrado.");
    }

    if (!normalizedOrder) {
      row.errors.push("Informe o numero do pedido.");
    }

    if (!row.normalized?.date) {
      row.errors.push("Informe a data da venda.");
    }

    if (row.normalized?.points == null && row.normalized?.skuDetails?.length) {
      const hasAllDetails = row.normalized.skuDetails.every((detail) => detail.points != null);
      if (hasAllDetails) {
        const totalFromSkus = row.normalized.skuDetails.reduce(
          (sum, detail) => sum + (detail.points || 0),
          0,
        );
        row.normalized.points = roundPoints(totalFromSkus);
      }
    }

    if (row.normalized?.points == null) {
      row.errors.push("Informe a pontuacao da venda.");
    }
  });

  const results = rows.map((row) => {
    const influencer = row.normalized?.influencer;
    const points = row.normalized?.points != null ? roundPoints(row.normalized.points) : 0;
    const pointsValue = pointsToBrl(points);
    const normalizedOrder = row.normalized?.orderNumber ?? normalizeOrderNumber(row.orderNumber);

    return {
      line: row.line,
      orderNumber: normalizedOrder,
      cupom: row.normalized?.cupom || "",
      date: row.normalized?.date || null,
      points,
      pointsValue,
      points_value: pointsValue,
      influencerId: influencer?.id ?? null,
      influencerName: influencer?.name ?? null,
      errors: row.errors,
      rawDate: row.rawDate,
      rawPoints: row.rawPoints,
      skuDetails: row.normalized?.skuDetails || [],
    };
  });

  const validRows = results.filter((row) => row && !row.errors.length && row.influencerId);
  const totalPoints = validRows.reduce((sum, row) => sum + (row.points || 0), 0);
  const summary = {
    count: validRows.length,
    total_points: totalPoints,
    total_points_value: pointsToBrl(totalPoints),
    point_value_brl: POINT_VALUE_BRL,
  };

  return {
    rows: results,
    summary,
    totalCount: results.length,
    validCount: validRows.length,
    errorCount: results.length - validRows.length,
    hasErrors: results.some((row) => row.errors.length > 0),
  };
};

const analyzeSalesImport = async (rawText) => {
  const text = stripBom(trimString(rawText || ""));
  if (!text) {
    return { error: "Cole os dados das vendas para realizar a importacao." };
  }

  const shopifyResult = await tryParseShopifySalesImport(text);
  if (shopifyResult) {
    if (shopifyResult.error) {
      return shopifyResult;
    }
    return buildSalesImportAnalysis(shopifyResult.rows);
  }

  const manualResult = parseManualSalesImport(text);
  return buildSalesImportAnalysis(manualResult.rows);
};

const dateStringToUtcDate = (dateString) => {
  const [year, month, day] = dateString.split("-").map((part) => Number(part));
  return new Date(Date.UTC(year, month - 1, day));
};

const ensureCycleForDate = async (dateString, tx = prisma) => {
  if (!dateString || !isValidDate(dateString)) {
    return null;
  }
  const [yearStr, monthStr] = dateString.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!Number.isInteger(year) || !Number.isInteger(month)) {
    return null;
  }
  let cycle = await tx.monthlyCycle.findFirst({
    where: { cycleYear: year, cycleMonth: month },
  });
  if (!cycle) {
    const startIso = `${yearStr}-${monthStr.padStart(2, "0")}-01T00:00:00.000Z`;
    cycle = await tx.monthlyCycle.create({
      data: {
        cycleYear: year,
        cycleMonth: month,
        status: "open",
        startedAt: new Date(startIso),
      },
    });
  }
  return cycle;
};

const touchCycle = async (cycleId, tx = prisma) => {
  if (!cycleId) return;
  try {
    await tx.monthlyCycle.update({
      where: { id: cycleId },
      data: { updatedAt: new Date() },
    });
  } catch (error) {
    // cycle might have been removed; ignore
  }
};

const normalizeSaleSkuItems = async (body) => {
  const candidateArrays = [
    Array.isArray(body?.skuDetails) ? body.skuDetails : null,
    Array.isArray(body?.sku_items) ? body.sku_items : null,
    Array.isArray(body?.items) ? body.items : null,
    Array.isArray(body?.skus) ? body.skus : null,
    Array.isArray(body?.itens) ? body.itens : null,
  ];

  const source = candidateArrays.find((entry) => Array.isArray(entry)) || [];

  if (!source.length) {
    return { items: [], totalPoints: 0, errors: [] };
  }

  const items = [];
  const errors = [];

  for (let index = 0; index < source.length; index += 1) {
    const rawItem = source[index];
    if (!rawItem) {
      continue;
    }

    const positionLabel = `Item ${index + 1}`;
    const sku = trimString(
      rawItem.sku ?? rawItem.SKU ?? rawItem.code ?? rawItem.codigo ?? rawItem.skuCode,
    );
    if (!sku) {
      errors.push(`${positionLabel}: informe o SKU.`);
      continue;
    }

    const skuRecord = await prisma.skuPoint.findFirst({
      where: { sku: { equals: sku, mode: "insensitive" }, active: true },
      select: { sku: true, pointsPerUnit: true },
    });

    if (!skuRecord) {
      errors.push(`SKU ${sku} nao possui pontuacao cadastrada.`);
      continue;
    }

    const quantityRaw =
      rawItem.quantity ?? rawItem.qty ?? rawItem.quantidade ?? rawItem.amount ?? rawItem.quantityRaw;
    const quantityNumber = Number(quantityRaw);
    if (!Number.isFinite(quantityNumber) || quantityNumber <= 0) {
      errors.push(`${positionLabel}: quantidade invalida.`);
      continue;
    }
    const quantity = Math.round(quantityNumber);
    if (Math.abs(quantity - quantityNumber) > 0.0001) {
      errors.push(`${positionLabel}: quantidade deve ser um numero inteiro.`);
      continue;
    }

    const pointsPerUnit = roundPoints(Number(skuRecord.pointsPerUnit ?? 0));
    const points = roundPoints(quantity * pointsPerUnit);

    items.push({
      sku: skuRecord.sku || sku,
      quantity,
      pointsPerUnit,
      points,
    });
  }

  const totalPoints = items.reduce((sum, item) => sum + (item.points || 0), 0);

  return { items, totalPoints, errors };
};

const normalizeSaleBody = async (body) => {
  const orderNumberRaw = body?.orderNumber ?? body?.order_number ?? body?.pedido ?? body?.order;
  const orderNumber = orderNumberRaw == null ? "" : String(trimString(orderNumberRaw)).trim();
  const cupom = trimString(body?.cupom);
  const date = trimString(body?.date);
  const pointsRaw =
    body?.points ??
    body?.pointsValue ??
    body?.points_value ??
    body?.pontuacao ??
    body?.pontuacaoTotal ??
    body?.salePoints;

  if (!orderNumber) {
    return { error: { error: "Informe o numero do pedido." } };
  }
  if (orderNumber.length > 100) {
    return { error: { error: "Numero do pedido deve ter no maximo 100 caracteres." } };
  }
  if (!cupom) {
    return { error: { error: "Informe o cupom da influenciadora." } };
  }
  if (!date || !isValidDate(date)) {
    return { error: { error: "Informe uma data valida (YYYY-MM-DD)." } };
  }

  const { items, totalPoints, errors } = await normalizeSaleSkuItems(body);
  if (errors.length) {
    return { error: { error: errors[0], details: errors } };
  }

  let pointsValue = null;
  if (pointsRaw != null && pointsRaw !== "") {
    const pointsParsed = parsePointsValue(pointsRaw, "Pontos");
    if (pointsParsed.error) {
      return { error: { error: pointsParsed.error } };
    }
    pointsValue = pointsParsed.value;
  }

  if (items.length) {
    if (pointsValue != null && pointsValue !== totalPoints) {
      return {
        error: {
          error: "A pontuacao informada nao corresponde ao total calculado pelos SKUs.",
          details: ["Ajuste os pontos ou os itens cadastrados para prosseguir."],
        },
      };
    }
    pointsValue = totalPoints;
  }

  if (pointsValue == null) {
    return {
      error: {
        error: "Informe a pontuacao da venda ou cadastre pelo menos um SKU valido.",
        details: ["Adicione itens com SKU cadastrado para calcular os pontos automaticamente."],
      },
    };
  }

  return {
    data: {
      orderNumber,
      cupom,
      date,
      points: pointsValue,
      items,
    },
  };
};

const toDecimal = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return new Prisma.Decimal(0);
  }
  return new Prisma.Decimal(roundCurrency(numeric).toFixed(2));
};

const mapSaleSkuDetailRow = (row) => {
  if (!row) {
    return null;
  }

  const quantity = Number(row.quantity ?? 0);
  const pointsPerUnit = Number(row.pointsPerUnit ?? row.points_per_unit ?? 0);
  const points = Number(row.points ?? 0);
  const pointsValue = pointsToBrl(points);

  return {
    id: row.id,
    sale_id: row.saleId ?? row.sale_id,
    sku: row.sku,
    quantity,
    points_per_unit: pointsPerUnit,
    points,
    points_value: pointsValue,
    pointsValue,
    created_at: row.createdAt ?? row.created_at,
  };
};

const mapSaleRow = (sale) => {
  if (!sale) {
    return null;
  }

  const orderNumber = normalizeOrderNumber(
    sale.orderNumber ?? sale.order_number ?? sale.pedido ?? null,
  );

  const points = sale.points != null ? Number(sale.points) : 0;
  const pointsValue = pointsToBrl(points);
  const skuDetails = Array.isArray(sale.items)
    ? sale.items.map((detail) => mapSaleSkuDetailRow(detail)).filter(Boolean)
    : [];

  const dateValue =
    sale.date instanceof Date ? sale.date.toISOString().slice(0, 10) : sale.date ?? null;

  const commissionDecimal =
    sale.commission instanceof Prisma.Decimal
      ? Number(sale.commission)
      : Number(sale.commission ?? 0);

  return {
    id: sale.id,
    influencer_id: sale.influencerId ?? sale.influencer_id,
    cycle_id: sale.cycleId ?? sale.cycle_id ?? null,
    order_number: orderNumber,
    orderNumber,
    cupom: sale.influencer?.coupon ?? sale.cupom ?? null,
    nome: sale.influencer?.name ?? sale.nome ?? null,
    date: dateValue,
    gross_value: Number(sale.grossValue ?? 0),
    discount: Number(sale.discount ?? 0),
    net_value: Number(sale.netValue ?? 0),
    commission: commissionDecimal,
    points,
    points_value: pointsValue,
    pointsValue,
    sku_details: skuDetails,
    skuDetails,
    commission_rate:
      sale.influencer?.commissionRate != null
        ? Number(sale.influencer.commissionRate)
        : sale.commission_rate != null
          ? Number(sale.commission_rate)
          : 0,
    status: sale.status ?? "pending",
    created_at: sale.createdAt ?? sale.created_at ?? null,
  };
};

const fetchSaleWithDetails = async (id, tx = prisma) => {
  const sale = await tx.sale.findUnique({
    where: { id },
    include: {
      influencer: {
        select: { coupon: true, name: true, commissionRate: true },
      },
      items: true,
    },
  });
  return mapSaleRow(sale);
};

const validateSaleStatus = (value, fallback) => {
  if (value == null || value === "") {
    return fallback ?? null;
  }
  const normalized = String(value).trim().toLowerCase();
  if (!SALE_STATUSES.has(normalized)) {
    return { error: { error: "Status invalido. Use pending, approved ou rejected." } };
  }
  return normalized;
};

export const previewImport = async (text) => analyzeSalesImport(text);

export const confirmImport = async (text) => {
  const analysis = await analyzeSalesImport(text);
  if (analysis.error) {
    return { error: { status: 400, payload: { error: analysis.error } } };
  }
  if (!analysis.totalCount) {
    return { error: { status: 400, payload: { error: "Nenhuma venda encontrada para importar." } } };
  }

  const validRows = analysis.rows.filter((row) => !row.errors?.length && row.influencerId);
  if (!validRows.length) {
    return {
      error: {
        status: 409,
        payload: { error: "Nenhum pedido pronto para importacao.", analysis },
      },
    };
  }

  const createdSales = await prisma.$transaction(async (tx) => {
    const created = [];
    for (const row of validRows) {
      const date = row.date;
      const cycle = (await ensureCycleForDate(date, tx)) ?? null;
      const orderNumber = row.orderNumber ?? null;

      const createdSale = await tx.sale.create({
        data: {
          influencerId: row.influencerId,
          orderNumber,
          date: date ? dateStringToUtcDate(date) : new Date(),
          cycleId: cycle?.id ?? null,
          grossValue: toDecimal(0),
          discount: toDecimal(0),
          netValue: toDecimal(0),
          commission: toDecimal(pointsToBrl(row.points)),
          points: Number(row.points ?? 0),
          status: "pending",
        },
      });

      if (Array.isArray(row.skuDetails) && row.skuDetails.length) {
        await tx.saleSkuPoint.createMany({
          data: row.skuDetails
            .filter((detail) => detail && detail.sku)
            .map((detail) => ({
              saleId: createdSale.id,
              sku: detail.sku,
              quantity: Number(detail.quantity ?? 0),
              pointsPerUnit: Number(detail.pointsPerUnit ?? 0),
              points: Number(detail.points ?? 0),
            })),
        });
      }

      await touchCycle(cycle?.id ?? null, tx);

      const mapped = await fetchSaleWithDetails(createdSale.id, tx);
      created.push(mapped);
    }
    return created;
  });

  const ignored = Math.max(analysis.totalCount - validRows.length, 0);

  return {
    result: {
      inserted: createdSales.length,
      ignored,
      rows: createdSales,
      summary: analysis.summary,
    },
  };
};

export const createSale = async (body) => {
  const normalized = await normalizeSaleBody(body || {});
  if (normalized.error) {
    return { error: { status: 400, payload: normalized.error } };
  }

  const { data } = normalized;
  const influencer = await loadInfluencerByCoupon(data.cupom);
  if (!influencer) {
    return { error: { status: 404, payload: { error: "Cupom nao encontrado." } } };
  }

  if (data.orderNumber) {
    const existingSale = await prisma.sale.findUnique({
      where: { orderNumber: data.orderNumber },
      select: { id: true },
    });
    if (existingSale) {
      return {
        error: { status: 409, payload: { error: "Ja existe uma venda com esse numero de pedido." } },
      };
    }
  }

  const sale = await prisma.$transaction(async (tx) => {
    const cycle = (await ensureCycleForDate(data.date, tx)) ?? null;

    const created = await tx.sale.create({
      data: {
        influencerId: influencer.id,
        orderNumber: data.orderNumber,
        date: dateStringToUtcDate(data.date),
        cycleId: cycle?.id ?? null,
        grossValue: toDecimal(0),
        discount: toDecimal(0),
        netValue: toDecimal(0),
        commission: toDecimal(pointsToBrl(data.points)),
        points: Number(data.points),
        status: "pending",
      },
    });

    if (Array.isArray(data.items) && data.items.length) {
      await tx.saleSkuPoint.createMany({
        data: data.items.map((item) => ({
          saleId: created.id,
          sku: item.sku,
          quantity: Number(item.quantity ?? 0),
          pointsPerUnit: Number(item.pointsPerUnit ?? 0),
          points: Number(item.points ?? 0),
        })),
      });
    }

    await touchCycle(cycle?.id ?? null, tx);

    return fetchSaleWithDetails(created.id, tx);
  });

  return { sale };
};

export const updateSale = async (saleId, body) => {
  const id = Number(saleId);
  if (!Number.isInteger(id) || id <= 0) {
    return { error: { status: 400, payload: { error: "ID invalido." } } };
  }

  const existingSale = await prisma.sale.findUnique({
    where: { id },
    select: { id: true, orderNumber: true, cycleId: true, status: true },
  });
  if (!existingSale) {
    return { error: { status: 404, payload: { error: "Venda nao encontrada." } } };
  }

  const normalized = await normalizeSaleBody(body || {});
  if (normalized.error) {
    return { error: { status: 400, payload: normalized.error } };
  }

  const { data } = normalized;
  const influencer = await loadInfluencerByCoupon(data.cupom);
  if (!influencer) {
    return { error: { status: 404, payload: { error: "Cupom nao encontrado." } } };
  }

  if (data.orderNumber) {
    const conflictingSale = await prisma.sale.findUnique({
      where: { orderNumber: data.orderNumber },
      select: { id: true },
    });
    if (conflictingSale && conflictingSale.id !== id) {
      return {
        error: { status: 409, payload: { error: "Ja existe uma venda com esse numero de pedido." } },
      };
    }
  }

  const statusResult = validateSaleStatus(body?.status ?? body?.saleStatus, existingSale.status);
  if (statusResult?.error) {
    return { error: { status: 400, payload: statusResult.error } };
  }
  const nextStatus = typeof statusResult === "string" ? statusResult : existingSale.status ?? "pending";

  const sale = await prisma.$transaction(async (tx) => {
    const cycle = (await ensureCycleForDate(data.date, tx)) ?? null;
    const previousCycleId = existingSale.cycleId ?? null;

    await tx.sale.update({
      where: { id },
      data: {
        influencerId: influencer.id,
        orderNumber: data.orderNumber,
        date: dateStringToUtcDate(data.date),
        cycleId: cycle?.id ?? null,
        grossValue: toDecimal(0),
        discount: toDecimal(0),
        netValue: toDecimal(0),
        commission: toDecimal(pointsToBrl(data.points)),
        points: Number(data.points),
        status: nextStatus,
      },
    });

    await tx.saleSkuPoint.deleteMany({ where: { saleId: id } });
    if (Array.isArray(data.items) && data.items.length) {
      await tx.saleSkuPoint.createMany({
        data: data.items.map((item) => ({
          saleId: id,
          sku: item.sku,
          quantity: Number(item.quantity ?? 0),
          pointsPerUnit: Number(item.pointsPerUnit ?? 0),
          points: Number(item.points ?? 0),
        })),
      });
    }

    await touchCycle(cycle?.id ?? null, tx);
    if (previousCycleId && previousCycleId !== cycle?.id) {
      await touchCycle(previousCycleId, tx);
    }

    return fetchSaleWithDetails(id, tx);
  });

  return { sale };
};

export const deleteSale = async (saleId) => {
  const id = Number(saleId);
  if (!Number.isInteger(id) || id <= 0) {
    return { error: { status: 400, payload: { error: "ID invalido." } } };
  }

  const existingSale = await prisma.sale.findUnique({
    where: { id },
    select: { id: true, cycleId: true },
  });
  if (!existingSale) {
    return { error: { status: 404, payload: { error: "Venda nao encontrada." } } };
  }

  await prisma.$transaction(async (tx) => {
    await tx.saleSkuPoint.deleteMany({ where: { saleId: id } });
    await tx.sale.delete({ where: { id } });
    await touchCycle(existingSale.cycleId, tx);
  });

  return { result: { message: "Venda removida com sucesso." } };
};

export const listSalesByInfluencer = async (influencer) => {
  if (!influencer?.id) {
    return [];
  }
  const sales = await prisma.sale.findMany({
    where: { influencerId: influencer.id },
    include: {
      influencer: { select: { coupon: true, name: true, commissionRate: true } },
      items: true,
    },
    orderBy: [
      { date: "desc" },
      { id: "desc" },
    ],
  });
  return sales.map((sale) => mapSaleRow(sale)).filter(Boolean);
};

export const getSalesSummary = async (influencer) => {
  if (!influencer?.id) {
    return {
      influencer_id: null,
      cupom: null,
      commission_rate: 0,
      total_points: 0,
      total_points_value: 0,
      point_value_brl: POINT_VALUE_BRL,
    };
  }

  const summary = await prisma.sale.aggregate({
    where: { influencerId: influencer.id, status: "approved" },
    _sum: { points: true },
  });

  const totalPoints = Number(summary._sum.points ?? 0);
  return {
    influencer_id: influencer.id,
    cupom: influencer.coupon ?? influencer.cupom ?? null,
    commission_rate:
      influencer.commissionRate != null
        ? Number(influencer.commissionRate)
        : influencer.commission_rate != null
          ? Number(influencer.commission_rate)
          : 0,
    total_points: totalPoints,
    total_points_value: pointsToBrl(totalPoints),
    point_value_brl: POINT_VALUE_BRL,
  };
};
