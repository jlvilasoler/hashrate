import { jsPDF } from "jspdf";
import type { ComprobanteType, LineItem } from "./types";

/** Colores HRS (verde marca) */
const HRS_GREEN = { r: 0, g: 166, b: 82 };

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

/** Convierte YYYY-MM a MM-YYYY para mostrar en descripción */
function ymToMonthYear(ym: string): string {
  if (!/^\d{4}-\d{2}$/.test(ym)) return ym;
  const [y, m] = ym.split("-");
  return `${m}-${y}`;
}

function monthToRange(ym: string): string {
  if (!/^\d{4}-\d{2}$/.test(ym)) return ym;
  const [y, m] = ym.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  return `01/${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}/${String(m).padStart(2, "0")}`;
}

function formatUSD(n: number): string {
  return `${n.toFixed(2).replace(".", ",")} USD`;
}

/** Número con USD al final (ej. "100,00 USD") para la línea TOTAL abajo */
function formatTotalUSD(n: number): string {
  return `${n.toFixed(2).replace(".", ",")} USD`;
}

export type FacturaPdfData = {
  number: string;
  type: ComprobanteType;
  clientName: string;
  clientPhone?: string;
  clientEmail?: string;
  clientAddress?: string;
  clientCity?: string;
  date: Date;
  items: LineItem[];
  subtotal: number;
  discounts: number;
  total: number;
};

export type FacturaPdfImages = {
  logoBase64?: string;
};

const EMISOR = {
  nombre: "HRS GROUP S.A",
  direccion: "Juan de Salazar 1857",
  ciudad: "Asunción - Paraguay",
  telefono: "Teléfono: (+595) 993 358 387",
  email: "sales@hashrate.space",
  ruc: "RUC EMISOR: 80144251-6",
  web: "https://hashrate.space",
};

const MARGIN = 18;
const PAGE_W = 210;
const PAGE_H = 297;
const COL_DESC = 95;
const COL_PRECIO = 32;
const COL_CANT = 22;
const COL_TOTAL = 38;
const TABLE_W = COL_DESC + COL_PRECIO + COL_CANT + COL_TOTAL;
const ROW_H = 9;
const HEADER_ROW_H = 10;
/** Gris suave para bordes de la tabla (estilo moderno) */
const TABLE_BORDER = { r: 226, g: 232, b: 240 };
/** Radio solo para las 4 esquinas extremas de la tabla (mm) */
const TABLE_RADIUS = 2;
/** Logo hashrate: arriba a la izquierda; tamaño un poco más grande, misma proporción */
const LOGO_WIDTH_MM = 57.75;
const LOGO_HEIGHT_MM = 16.2;

/**
 * Genera el PDF de la factura con diseño HRS a color:
 * logo arriba a la izquierda, colores verde marca, tabla con encabezado verde.
 * Los textos se rellenan con data del formulario.
 */
export function generateFacturaPdf(data: FacturaPdfData, images?: FacturaPdfImages): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const now = data.date;
  const vencimiento = new Date(now);
  vencimiento.setDate(vencimiento.getDate() + 7);

  const yTop = 10;
  const CONTENT_WIDTH = 174;
  const contentLeft = (PAGE_W - CONTENT_WIDTH) / 2;
  const contentRight = contentLeft + CONTENT_WIDTH;
  const tableLeft = (PAGE_W - TABLE_W) / 2;
  const LOGO_RIGHT = contentLeft + LOGO_WIDTH_MM + 5;

  // ---------- Logo hashrate (arriba, dentro del área centrada) ----------
  if (images?.logoBase64) {
    try {
      doc.addImage(images.logoBase64, "PNG", contentLeft - 5, yTop, LOGO_WIDTH_MM, LOGO_HEIGHT_MM); // 0,5 cm a la izquierda
    } catch {
      // sin logo
    }
  }

  // ---------- Misma información pero al lado derecho del logo (arriba de la hoja) ----------
  // Orden: izquierda = emisor, derecha = FACTURA CREDITO + VIA CLIENTE + FECHA + TOTAL + RUC
  let y = yTop;
  const tipoLabel = data.type === "Factura" ? "FACTURA CREDITO" : "RECIBO";
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(EMISOR.nombre, LOGO_RIGHT, y);
  doc.setFontSize(11);
  doc.text(`${tipoLabel} - ${data.number}`, contentRight, y, { align: "right" });
  y += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(EMISOR.direccion, LOGO_RIGHT, y);
  doc.text("VIA CLIENTE", contentRight, y, { align: "right" });
  y += 5;

  doc.text(EMISOR.ciudad, LOGO_RIGHT, y);
  doc.text("FECHA", contentRight, y, { align: "right" });
  y += 5;

  doc.text(EMISOR.telefono, LOGO_RIGHT, y);
  doc.text(formatFechaTexto(now), contentRight, y, { align: "right" });
  y += 5;

  doc.text(EMISOR.email, LOGO_RIGHT, y);
  doc.text(EMISOR.ruc, contentRight, y, { align: "right" });
  y += 5;
  // bajar hasta debajo del encabezado (logo o texto, el que baje más) + margen
  y = Math.max(yTop + LOGO_HEIGHT_MM, y) + 8;
  y += 20; // bajar 2 cm el bloque cliente + tabla (2 cm más arriba que antes)

  // ---------- Bloque CLIENTE (arriba de la tabla verde); alineado al margen izquierdo de la tabla ----------
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text("CLIENTE:", tableLeft, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.text(data.clientName, tableLeft, y);
  y += 5;
  doc.setFontSize(9);
  if (data.clientPhone) {
    doc.text(data.clientPhone, tableLeft, y);
    y += 4.5;
  }
  if (data.clientEmail) {
    doc.text(data.clientEmail, tableLeft, y);
    y += 4.5;
  }
  if (data.clientAddress) {
    doc.text(data.clientAddress, tableLeft, y);
    y += 4.5;
  }
  if (data.clientCity) {
    doc.text(data.clientCity.toUpperCase(), tableLeft, y);
    y += 4.5;
  }
  y += 10;
  y += 8; // separación antes de la tabla
  const tableTop = y;

  // ---------- Tabla: encabezado verde; solo los 2 extremos de arriba redondeados, resto rectos ----------
  const centerPrecio = tableLeft + COL_DESC + COL_PRECIO / 2;
  const centerCant = tableLeft + COL_DESC + COL_PRECIO + COL_CANT / 2;
  const centerTotal = tableLeft + COL_DESC + COL_PRECIO + COL_CANT + COL_TOTAL / 2;
  const numDiscountRows = data.items.filter((it) => it.discount > 0).length;
  const numDataRows = data.items.length + numDiscountRows;
  const tableTotalH = HEADER_ROW_H + numDataRows * ROW_H;
  const R = TABLE_RADIUS;
  const k = 0.5522847498; // Bezier para arco 90°

  const pathTableOutline = [
    { op: "m" as const, c: [tableLeft + R, tableTop] },
    { op: "l" as const, c: [tableLeft + TABLE_W - R, tableTop] },
    { op: "c" as const, c: [tableLeft + TABLE_W - R + R * k, tableTop, tableLeft + TABLE_W, tableTop + R - R * k, tableLeft + TABLE_W, tableTop + R] },
    { op: "l" as const, c: [tableLeft + TABLE_W, tableTop + tableTotalH] },
    { op: "l" as const, c: [tableLeft, tableTop + tableTotalH] },
    { op: "l" as const, c: [tableLeft, tableTop + R] },
    { op: "c" as const, c: [tableLeft, tableTop + R - R * k, tableLeft + R - R * k, tableTop, tableLeft + R, tableTop] },
    { op: "h" as const, c: [] },
  ];
  const pathHeader = [
    { op: "m" as const, c: [tableLeft + R, tableTop] },
    { op: "l" as const, c: [tableLeft + TABLE_W - R, tableTop] },
    { op: "c" as const, c: [tableLeft + TABLE_W - R + R * k, tableTop, tableLeft + TABLE_W, tableTop + R - R * k, tableLeft + TABLE_W, tableTop + R] },
    { op: "l" as const, c: [tableLeft + TABLE_W, tableTop + HEADER_ROW_H] },
    { op: "l" as const, c: [tableLeft, tableTop + HEADER_ROW_H] },
    { op: "l" as const, c: [tableLeft, tableTop + R] },
    { op: "c" as const, c: [tableLeft, tableTop + R - R * k, tableLeft + R - R * k, tableTop, tableLeft + R, tableTop] },
    { op: "h" as const, c: [] },
  ];

  doc.setDrawColor(TABLE_BORDER.r, TABLE_BORDER.g, TABLE_BORDER.b);
  doc.path(pathTableOutline);
  doc.stroke();

  doc.setFillColor(HRS_GREEN.r, HRS_GREEN.g, HRS_GREEN.b);
  doc.path(pathHeader);
  doc.fill();

  doc.setDrawColor(TABLE_BORDER.r, TABLE_BORDER.g, TABLE_BORDER.b);
  doc.line(tableLeft + COL_DESC, tableTop, tableLeft + COL_DESC, tableTop + tableTotalH);
  doc.line(tableLeft + COL_DESC + COL_PRECIO, tableTop, tableLeft + COL_DESC + COL_PRECIO, tableTop + tableTotalH);
  doc.line(tableLeft + COL_DESC + COL_PRECIO + COL_CANT, tableTop, tableLeft + COL_DESC + COL_PRECIO + COL_CANT, tableTop + tableTotalH);
  doc.line(tableLeft, tableTop + HEADER_ROW_H, tableLeft + TABLE_W, tableTop + HEADER_ROW_H);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text("DESCRIPCION", tableLeft + 3, tableTop + 6.5);
  doc.text("PRECIO", centerPrecio, tableTop + 6.5, { align: "center" });
  doc.text("CANTIDAD", centerCant, tableTop + 6.5, { align: "center" });
  doc.text("TOTAL", centerTotal, tableTop + 6.5, { align: "center" });
  doc.setTextColor(0, 0, 0);

  y = tableTop + HEADER_ROW_H;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);

  for (const it of data.items) {
    const lineTotalServicio = it.price * it.quantity;
    const desc = it.month ? `${it.serviceName} - ${ymToMonthYear(it.month)}` : it.serviceName;
    doc.text(desc.substring(0, 52), tableLeft + 3, y + 5.5);
    doc.text(formatUSD(it.price), centerPrecio, y + 5.5, { align: "center" });
    doc.text(String(it.quantity), centerCant, y + 5.5, { align: "center" });
    doc.text(formatUSD(lineTotalServicio), centerTotal, y + 5.5, { align: "center" });
    if (y + ROW_H < tableTop + tableTotalH) {
      doc.line(tableLeft, y + ROW_H, tableLeft + TABLE_W, y + ROW_H);
    }
    y += ROW_H;

    if (it.discount > 0) {
      const discountAmount = it.discount * it.quantity;
      const serviceLabel = it.serviceKey === "A" ? "L7" : it.serviceKey === "B" ? "L9" : "S21";
      const descDescuento = `Descuento HASHRATE ${serviceLabel}`;
      doc.text(descDescuento, tableLeft + 3, y + 5.5);
      doc.text("- " + formatUSD(discountAmount), centerPrecio, y + 5.5, { align: "center" });
      doc.text("1", centerCant, y + 5.5, { align: "center" });
      doc.text("- " + formatUSD(discountAmount), centerTotal, y + 5.5, { align: "center" });
      if (y + ROW_H < tableTop + tableTotalH) {
        doc.line(tableLeft, y + ROW_H, tableLeft + TABLE_W, y + ROW_H);
      }
      y += ROW_H;
    }
  }

  y += 6;

  // ---------- Fechas: mismo lenguaje visual que la tabla (solo 2 esquinas superiores redondeadas, mismo ancho y borde) ----------
  const yFechas = PAGE_H / 2 + 12 + 50 + 30;
  const datesBlockH = 14;
  const datesBlockTop = yFechas - datesBlockH / 2;
  const datesColW = TABLE_W / 2;
  const leftCenterX = tableLeft + datesColW / 2;
  const rightCenterX = tableLeft + datesColW + datesColW / 2;
  const Rd = TABLE_RADIUS;
  const kd = 0.5522847498;

  const pathDatesHeaderGreen = [
    { op: "m" as const, c: [tableLeft + Rd, datesBlockTop] },
    { op: "l" as const, c: [tableLeft + TABLE_W - Rd, datesBlockTop] },
    { op: "c" as const, c: [tableLeft + TABLE_W - Rd + Rd * kd, datesBlockTop, tableLeft + TABLE_W, datesBlockTop + Rd - Rd * kd, tableLeft + TABLE_W, datesBlockTop + Rd] },
    { op: "l" as const, c: [tableLeft + TABLE_W, datesBlockTop + datesBlockH / 2] },
    { op: "l" as const, c: [tableLeft, datesBlockTop + datesBlockH / 2] },
    { op: "l" as const, c: [tableLeft, datesBlockTop + Rd] },
    { op: "c" as const, c: [tableLeft, datesBlockTop + Rd - Rd * kd, tableLeft + Rd - Rd * kd, datesBlockTop, tableLeft + Rd, datesBlockTop] },
    { op: "h" as const, c: [] },
  ];
  const pathDatesOutline = [
    { op: "m" as const, c: [tableLeft + Rd, datesBlockTop] },
    { op: "l" as const, c: [tableLeft + TABLE_W - Rd, datesBlockTop] },
    { op: "c" as const, c: [tableLeft + TABLE_W - Rd + Rd * kd, datesBlockTop, tableLeft + TABLE_W, datesBlockTop + Rd - Rd * kd, tableLeft + TABLE_W, datesBlockTop + Rd] },
    { op: "l" as const, c: [tableLeft + TABLE_W, datesBlockTop + datesBlockH] },
    { op: "l" as const, c: [tableLeft, datesBlockTop + datesBlockH] },
    { op: "l" as const, c: [tableLeft, datesBlockTop + Rd] },
    { op: "c" as const, c: [tableLeft, datesBlockTop + Rd - Rd * kd, tableLeft + Rd - Rd * kd, datesBlockTop, tableLeft + Rd, datesBlockTop] },
    { op: "h" as const, c: [] },
  ];

  doc.setFillColor(HRS_GREEN.r, HRS_GREEN.g, HRS_GREEN.b);
  doc.path(pathDatesHeaderGreen);
  doc.fill();

  doc.setDrawColor(TABLE_BORDER.r, TABLE_BORDER.g, TABLE_BORDER.b);
  doc.path(pathDatesOutline);
  doc.stroke();

  doc.line(tableLeft, datesBlockTop + datesBlockH / 2, tableLeft + TABLE_W, datesBlockTop + datesBlockH / 2);

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("FECHA DE EMISIÓN:", leftCenterX, datesBlockTop + 5, { align: "center" });
  doc.text("FECHA DE VENCIMIENTO:", rightCenterX, datesBlockTop + 5, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  const datesDataRowTop = datesBlockTop + datesBlockH / 2;
  const datesDataRowH = datesBlockH / 2;
  const datesRowCenterY = datesDataRowTop + datesDataRowH / 2;
  const fs = doc.getFontSize();
  const baselineOffset = fs * 0.12;
  const datesBaselineY = datesRowCenterY + baselineOffset;
  const dateEmisionStr = formatDDMMYY(now);
  const dateVencStr = formatDDMMYY(vencimiento);
  const wEmision = doc.getTextWidth(dateEmisionStr);
  const wVenc = doc.getTextWidth(dateVencStr);
  doc.text(dateEmisionStr, leftCenterX - wEmision / 2, datesBaselineY);
  doc.text(dateVencStr, rightCenterX - wVenc / 2, datesBaselineY);

  // ---------- TOTAL al pie: recuadro corto, borde derecho alineado con la tabla de arriba ----------
  const totalTableRight = tableLeft + TABLE_W;
  const TOTAL_ROW_H = 10;
  const TOTAL_BOX_W = 58;
  const TOTAL_LABEL_W = 24;
  const totalBoxLeft = totalTableRight - TOTAL_BOX_W;
  const yTotal = PAGE_H - MARGIN;
  const totalBoxTop = yTotal - TOTAL_ROW_H;
  const totalBoxBottom = totalBoxTop + TOTAL_ROW_H;
  const Rt = TABLE_RADIUS;
  const kt = 0.5522847498;

  const pathTotalOutline = [
    { op: "m" as const, c: [totalBoxLeft, totalBoxTop] },
    { op: "l" as const, c: [totalTableRight, totalBoxTop] },
    { op: "l" as const, c: [totalTableRight, totalBoxBottom - Rt] },
    { op: "c" as const, c: [totalTableRight, totalBoxBottom - Rt + Rt * kt, totalTableRight - Rt + Rt * kt, totalBoxBottom, totalTableRight - Rt, totalBoxBottom] },
    { op: "l" as const, c: [totalBoxLeft + Rt, totalBoxBottom] },
    { op: "c" as const, c: [totalBoxLeft + Rt - Rt * kt, totalBoxBottom, totalBoxLeft, totalBoxBottom - Rt + Rt * kt, totalBoxLeft, totalBoxBottom - Rt] },
    { op: "l" as const, c: [totalBoxLeft, totalBoxTop] },
    { op: "h" as const, c: [] },
  ];
  const pathTotalLabelGreen = [
    { op: "m" as const, c: [totalBoxLeft, totalBoxTop] },
    { op: "l" as const, c: [totalBoxLeft + TOTAL_LABEL_W, totalBoxTop] },
    { op: "l" as const, c: [totalBoxLeft + TOTAL_LABEL_W, totalBoxBottom] },
    { op: "l" as const, c: [totalBoxLeft + Rt, totalBoxBottom] },
    { op: "c" as const, c: [totalBoxLeft + Rt - Rt * kt, totalBoxBottom, totalBoxLeft, totalBoxBottom - Rt + Rt * kt, totalBoxLeft, totalBoxBottom - Rt] },
    { op: "l" as const, c: [totalBoxLeft, totalBoxTop] },
    { op: "h" as const, c: [] },
  ];

  doc.setFillColor(HRS_GREEN.r, HRS_GREEN.g, HRS_GREEN.b);
  doc.path(pathTotalLabelGreen);
  doc.fill();

  doc.setDrawColor(TABLE_BORDER.r, TABLE_BORDER.g, TABLE_BORDER.b);
  doc.path(pathTotalOutline);
  doc.stroke();
  doc.line(totalBoxLeft + TOTAL_LABEL_W, totalBoxTop, totalBoxLeft + TOTAL_LABEL_W, totalBoxBottom);

  const totalLabelCenterX = totalBoxLeft + TOTAL_LABEL_W / 2;
  const totalAmountRight = totalTableRight - 4;
  const totalCenterY = totalBoxTop + TOTAL_ROW_H / 2;
  const totalBaselineY = totalCenterY + doc.getFontSize() * 0.12;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text("TOTAL", totalLabelCenterX, totalBaselineY, { align: "center" });

  doc.setTextColor(0, 0, 0);
  doc.text(formatTotalUSD(data.total), totalAmountRight, totalBaselineY, { align: "right" });

  return doc;
}

/**
 * Carga una imagen desde la URL pública y la devuelve en base64 para usar en el PDF.
 */
export function loadImageAsBase64(url: string): Promise<string> {
  return fetch(url)
    .then((r) => r.blob())
    .then(
      (blob) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const dataUrl = reader.result as string;
            resolve(dataUrl);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        })
    );
}
