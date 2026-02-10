import { jsPDF } from "jspdf";
import type { ComprobanteType, LineItem } from "./types";

const MESES = [
  "ENE", "FEB", "MAR", "ABR", "MAY", "JUN",
  "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"
];

function formatDDMMYY(d: Date): string {
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = String(d.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
}

function formatFechaTexto(d: Date): string {
  const mes = MESES[d.getMonth()];
  const dia = d.getDate();
  const anio = d.getFullYear();
  return `${mes} ${dia}, ${anio}`;
}

/** Rango de mes tipo "01/12-31/12" a partir de YYYY-MM */
function monthToRange(ym: string): string {
  if (!/^\d{4}-\d{2}$/.test(ym)) return ym;
  const [y, m] = ym.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  return `01/${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}/${String(m).padStart(2, "0")}`;
}

function formatUSD(n: number): string {
  return `USD ${n.toFixed(2).replace(".", ",")}`;
}

export type FacturaPdfData = {
  number: string;
  type: ComprobanteType;
  clientName: string;
  date: Date;
  items: LineItem[];
  subtotal: number;
  discounts: number;
  total: number;
};

const EMISOR = {
  nombre: "HRS GROUP S.A",
  direccion: "Juan de Salazar 1857",
  ciudad: "Asunción - Paraguay",
  telefono: "Teléfono: (+595) 993 358 387",
  email: "sales@hashrate.space",
  ruc: "RUC EMISOR: 80144251-6",
};

const MARGIN = 18;
const PAGE_W = 210;

// Anchos de columnas de la tabla (mm)
const COL_DESC = 95;
const COL_PRECIO = 32;
const COL_CANT = 22;
const COL_TOTAL = 38;
const TABLE_LEFT = MARGIN;
const ROW_H = 7;
const HEADER_ROW_H = 8;

export function generateFacturaPdf(data: FacturaPdfData): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const now = data.date;
  const vencimiento = new Date(now);
  vencimiento.setDate(vencimiento.getDate() + 7);

  let y = 14;

  // ---------- Línea superior: descripción del servicio (como en referencia) ----------
  const firstItem = data.items[0];
  const servicioTitulo = firstItem
    ? `Servicio ${firstItem.serviceName.toLowerCase()} - ${firstItem.month ? monthToRange(firstItem.month) : ""}`.trim()
    : "Servicio";
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(servicioTitulo, MARGIN, y);
  y += 4;

  // ---------- Fila principal: izquierda = emisor, derecha = tipo + número + FECHA + TOTAL ----------
  const tipoLabel = data.type === "Factura" ? "FACTURA CREDITO" : "RECIBO";
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(EMISOR.nombre, MARGIN, y);
  doc.setFontSize(11);
  doc.text(`${tipoLabel} - ${data.number}`, PAGE_W - MARGIN, y, { align: "right" });
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(EMISOR.direccion, MARGIN, y);
  doc.text("FECHA", PAGE_W - MARGIN, y, { align: "right" });
  y += 5;

  doc.text(EMISOR.ciudad, MARGIN, y);
  doc.text(formatFechaTexto(now), PAGE_W - MARGIN, y, { align: "right" });
  y += 5;

  doc.text(EMISOR.telefono, MARGIN, y);
  doc.setFont("helvetica", "bold");
  doc.text(`TOTAL ${formatUSD(data.total)}`, PAGE_W - MARGIN, y, { align: "right" });
  doc.setFont("helvetica", "normal");
  y += 5;

  doc.text(EMISOR.email, MARGIN, y);
  doc.text(EMISOR.ruc, PAGE_W - MARGIN, y, { align: "right" });
  y += 10;

  // ---------- Bloque dos columnas CLIENTE (como en referencia) ----------
  const col2X = MARGIN + (PAGE_W - 2 * MARGIN) / 2;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("CLIENTE:", MARGIN, y);
  doc.text("CLIENTE:", col2X, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(data.clientName, MARGIN + 18, y);
  doc.text(data.clientName, col2X + 18, y);
  y += 12;

  // ---------- Tabla con bordes: DESCRIPCION | PRECIO | CANTIDAD | TOTAL ----------
  const tableTop = y;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.rect(TABLE_LEFT, tableTop, COL_DESC + COL_PRECIO + COL_CANT + COL_TOTAL, HEADER_ROW_H);
  doc.text("DESCRIPCION", TABLE_LEFT + 2, tableTop + 5.5);
  doc.text("PRECIO", TABLE_LEFT + COL_DESC + 2, tableTop + 5.5);
  doc.text("CANTIDAD", TABLE_LEFT + COL_DESC + COL_PRECIO + 2, tableTop + 5.5);
  doc.text("TOTAL", TABLE_LEFT + COL_DESC + COL_PRECIO + COL_CANT + 2, tableTop + 5.5);

  // Líneas verticales del encabezado
  doc.line(TABLE_LEFT + COL_DESC, tableTop, TABLE_LEFT + COL_DESC, tableTop + HEADER_ROW_H);
  doc.line(TABLE_LEFT + COL_DESC + COL_PRECIO, tableTop, TABLE_LEFT + COL_DESC + COL_PRECIO, tableTop + HEADER_ROW_H);
  doc.line(TABLE_LEFT + COL_DESC + COL_PRECIO + COL_CANT, tableTop, TABLE_LEFT + COL_DESC + COL_PRECIO + COL_CANT, tableTop + HEADER_ROW_H);

  y = tableTop + HEADER_ROW_H;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  // Filas de ítems
  for (const it of data.items) {
    const lineTotal = (it.price - it.discount) * it.quantity;
    const desc = it.month ? `${it.serviceName} - ${it.month}` : it.serviceName;
    doc.rect(TABLE_LEFT, y, COL_DESC + COL_PRECIO + COL_CANT + COL_TOTAL, ROW_H);
    doc.text(desc.substring(0, 52), TABLE_LEFT + 2, y + 4.5);
    doc.text(formatUSD(it.price), TABLE_LEFT + COL_DESC + 2, y + 4.5);
    doc.text(String(it.quantity), TABLE_LEFT + COL_DESC + COL_PRECIO + 2, y + 4.5);
    doc.text(formatUSD(lineTotal), TABLE_LEFT + COL_DESC + COL_PRECIO + COL_CANT + 2, y + 4.5);
    doc.line(TABLE_LEFT + COL_DESC, y, TABLE_LEFT + COL_DESC, y + ROW_H);
    doc.line(TABLE_LEFT + COL_DESC + COL_PRECIO, y, TABLE_LEFT + COL_DESC + COL_PRECIO, y + ROW_H);
    doc.line(TABLE_LEFT + COL_DESC + COL_PRECIO + COL_CANT, y, TABLE_LEFT + COL_DESC + COL_PRECIO + COL_CANT, y + ROW_H);
    y += ROW_H;
  }

  // Fila descuento
  if (data.discounts > 0) {
    const descDescuento = data.items.length === 1 && data.items[0]?.month
      ? `Descuento HASHRATE - ${data.items[0].serviceName} - ${data.items[0].month ? monthToRange(data.items[0].month) : ""}`.trim()
      : "Descuento HASHRATE";
    doc.rect(TABLE_LEFT, y, COL_DESC + COL_PRECIO + COL_CANT + COL_TOTAL, ROW_H);
    doc.text(descDescuento.substring(0, 52), TABLE_LEFT + 2, y + 4.5);
    doc.text("- " + formatUSD(data.discounts), TABLE_LEFT + COL_DESC + 2, y + 4.5);
    doc.text("1", TABLE_LEFT + COL_DESC + COL_PRECIO + 2, y + 4.5);
    doc.text("- " + formatUSD(data.discounts), TABLE_LEFT + COL_DESC + COL_PRECIO + COL_CANT + 2, y + 4.5);
    doc.line(TABLE_LEFT + COL_DESC, y, TABLE_LEFT + COL_DESC, y + ROW_H);
    doc.line(TABLE_LEFT + COL_DESC + COL_PRECIO, y, TABLE_LEFT + COL_DESC + COL_PRECIO, y + ROW_H);
    doc.line(TABLE_LEFT + COL_DESC + COL_PRECIO + COL_CANT, y, TABLE_LEFT + COL_DESC + COL_PRECIO + COL_CANT, y + ROW_H);
    y += ROW_H;
  }

  y += 6;

  // ---------- Fechas emisión y vencimiento (como en referencia) ----------
  doc.setFontSize(9);
  doc.text(`FECHA DE EMISIÓN: ${formatDDMMYY(now)}`, MARGIN, y);
  y += 6;
  doc.text(`FECHA DE VENCIMIENTO: ${formatDDMMYY(vencimiento)}`, MARGIN, y);
  y += 10;

  // ---------- Total destacado (abajo a la derecha) ----------
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(`TOTAL ${formatUSD(data.total)}`, PAGE_W - MARGIN, y, { align: "right" });

  return doc;
}
