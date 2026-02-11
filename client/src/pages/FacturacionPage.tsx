import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getClients } from "../lib/api";
import { serviceCatalog } from "../lib/constants";
import { generateFacturaPdf, loadImageAsBase64 } from "../lib/generateFacturaPdf";
import { loadInvoices, saveInvoices } from "../lib/storage";
import type { Client, ComprobanteType, Invoice, LineItem } from "../lib/types";
import "../styles/facturacion.css";

function todayLocale() {
  return new Date().toLocaleDateString();
}

function genId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function nextNumber(type: ComprobanteType, invoices: Invoice[]) {
  const prefix = type === "Factura" ? "FC-" : "RC-";
  const filtered = invoices.filter((i) => i.number.startsWith(prefix));
  const next =
    filtered.length === 0
      ? 1001
      : Math.max(
          ...filtered.map((i) => {
            const n = Number(i.number.split("-")[1]);
            return Number.isFinite(n) ? n : 0;
          })
        ) + 1;
  return `${prefix}${next}`;
}

function calcTotals(items: LineItem[]) {
  const subtotal = items.reduce((s, it) => s + it.price * it.quantity, 0);
  const discounts = items.reduce((s, it) => s + it.discount * it.quantity, 0);
  const total = subtotal - discounts;
  return { subtotal, discounts, total };
}

export function FacturacionPage() {
  const [type, setType] = useState<ComprobanteType>("Factura");
  const [clientQuery, setClientQuery] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<number | "">("");
  const [items, setItems] = useState<LineItem[]>([]);

  useEffect(() => {
    getClients()
      .then((r) => setClients((r.clients ?? []) as Client[]))
      .catch(() => setClients([]));
  }, []);

  const invoices = useMemo(() => loadInvoices(), []);
  const number = useMemo(() => nextNumber(type, invoices), [type, invoices]);
  const totals = useMemo(() => calcTotals(items), [items]);

  const visibleClients = useMemo(() => {
    const q = clientQuery.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) => `${c.code} - ${c.name}`.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
    );
  }, [clients, clientQuery]);

  const selectedClient = useMemo(
    () => (selectedClientId !== "" ? clients.find((c) => c.id === selectedClientId) ?? null : null),
    [clients, selectedClientId]
  );

  function addItem() {
    const def = serviceCatalog.A;
    setItems((prev) => [
      ...prev,
      {
        serviceKey: "A",
        serviceName: def.name,
        month: "",
        quantity: 1,
        price: def.price,
        discount: 0
      }
    ]);
  }

  function updateItem(idx: number, patch: Partial<LineItem>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function exportExcel() {
    const hist = loadInvoices();
    if (hist.length === 0) return;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Historial");
    ws.columns = [
      { header: "Número", key: "number", width: 14 },
      { header: "Tipo", key: "type", width: 10 },
      { header: "Cliente", key: "clientName", width: 30 },
      { header: "Fecha", key: "date", width: 14 },
      { header: "Mes", key: "month", width: 10 },
      { header: "Subtotal", key: "subtotal", width: 12 },
      { header: "Descuentos", key: "discounts", width: 12 },
      { header: "Total", key: "total", width: 12 }
    ];
    hist.forEach((inv) => ws.addRow(inv));
    ws.getRow(1).font = { bold: true };
    wb.xlsx.writeBuffer().then((buf) => saveAs(new Blob([buf]), "HRS_Historial.xlsx"));
  }

  async function generatePdfAndSave() {
    if (!selectedClient) {
      alert("Debe seleccionar un cliente válido.");
      return;
    }
    if (items.length === 0) {
      alert("La factura no tiene ítems cargados.");
      return;
    }
    if (items.some((it) => !it.month)) {
      alert("Por favor, indique el mes para todos los ítems.");
      return;
    }

    const { subtotal, discounts, total } = calcTotals(items);
    const dateNow = new Date();
    const dateStr = todayLocale();
    const month = items[0]!.month;

    let logoBase64: string | undefined;
    try {
      logoBase64 = await loadImageAsBase64("/images/LOGO-HASHRATE.png");
    } catch {
      //
    }

    const doc = generateFacturaPdf(
      {
        number,
        type,
        clientName: selectedClient.name,
        clientPhone: selectedClient.phone,
        clientEmail: selectedClient.email,
        clientAddress: selectedClient.address,
        clientCity: selectedClient.city,
        date: dateNow,
        items,
        subtotal,
        discounts,
        total
      },
      { logoBase64 }
    );
    const safeName = selectedClient.name.replace(/[^\w\s-]/g, "").replace(/\s+/g, " ").trim() || "cliente";
    doc.save(`${number}_${safeName}.pdf`);

    const inv: Invoice = {
      id: genId(),
      number,
      type,
      clientName: selectedClient.name,
      date: dateStr,
      month,
      subtotal,
      discounts,
      total,
      items
    };
    const hist = loadInvoices();
    hist.push(inv);
    saveInvoices(hist);
    setItems([]);
  }

  return (
    <div className="fact-page">
      <div className="container">
        <header className="fact-topbar">
          <h1>Facturación</h1>
          <Link to="/" className="fact-back">
            ← Volver al inicio
          </Link>
        </header>

        <div className="fact-layout">
          {/* Panel configuración */}
          <aside className="fact-sidebar">
            <div className="fact-card">
              <div className="fact-card-header">Nueva factura</div>
              <div className="fact-card-body">
                <div className="fact-field">
                  <label className="fact-label">Tipo de comprobante</label>
                  <select
                    className="fact-select"
                    value={type}
                    onChange={(e) => setType(e.target.value as ComprobanteType)}
                  >
                    <option value="Factura">Factura</option>
                    <option value="Recibo">Recibo</option>
                  </select>
                </div>
                <div className="fact-field">
                  <label className="fact-label">Número</label>
                  <input className="fact-input" readOnly value={number} />
                </div>
                <div className="fact-field">
                  <label className="fact-label">Cliente</label>
                  <input
                    className="fact-input"
                    type="text"
                    placeholder="Buscar por nombre o código..."
                    value={clientQuery}
                    onChange={(e) => setClientQuery(e.target.value)}
                  />
                  <select
                    className="fact-select"
                    size={8}
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value === "" ? "" : Number(e.target.value))}
                    style={{ marginTop: "0.5rem" }}
                  >
                    <option value="">Seleccione cliente</option>
                    {visibleClients.map((c) => (
                      <option key={c.id ?? c.code} value={c.id ?? ""}>
                        {c.code} - {c.name}
                      </option>
                    ))}
                  </select>
                  {clients.length === 0 && (
                    <small className="text-muted d-block mt-1">Cargá clientes en la hoja Clientes.</small>
                  )}
                </div>
              </div>
            </div>
          </aside>

          {/* Contenido principal */}
          <main className="fact-main">
            <div className="fact-card">
              <div className="fact-card-body">
                <div className="fact-section-header">
                  <h2 className="fact-section-title">Detalle de servicios</h2>
                  <button type="button" className="fact-btn-add" onClick={addItem}>
                    + Agregar ítem
                  </button>
                </div>

                <div className="fact-table-wrap">
                  <table className="fact-table">
                    <thead>
                      <tr>
                        <th>Servicio</th>
                        <th className="fact-cell-center">Mes</th>
                        <th className="fact-cell-center">Cant.</th>
                        <th className="fact-cell-center">Precio</th>
                        <th className="fact-cell-center">Desc.</th>
                        <th className="fact-cell-center">Total</th>
                        <th style={{ width: 48 }} />
                      </tr>
                    </thead>
                    <tbody>
                      {items.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="fact-empty">
                            <div className="fact-empty-icon">📋</div>
                            <div className="fact-empty-text">Agregá tu primer ítem para armar la factura</div>
                          </td>
                        </tr>
                      ) : (
                        items.map((it, idx) => {
                          const lineTotal = (it.price - it.discount) * it.quantity;
                          return (
                            <tr key={idx}>
                              <td>
                                <select
                                  className="fact-select"
                                  style={{ padding: "0.4rem 0.6rem", fontSize: "0.8125rem" }}
                                  value={it.serviceKey}
                                  onChange={(e) => {
                                    const key = e.target.value as LineItem["serviceKey"];
                                    const def = serviceCatalog[key];
                                    updateItem(idx, { serviceKey: key, serviceName: def.name, price: def.price });
                                  }}
                                >
                                  <option value="A">{serviceCatalog.A.name}</option>
                                  <option value="B">{serviceCatalog.B.name}</option>
                                  <option value="C">{serviceCatalog.C.name}</option>
                                </select>
                              </td>
                              <td className="fact-cell-center">
                                <input
                                  type="month"
                                  className="fact-input"
                                  style={{ padding: "0.4rem 0.6rem", fontSize: "0.8125rem", width: "100%" }}
                                  value={it.month}
                                  onChange={(e) => updateItem(idx, { month: e.target.value })}
                                />
                              </td>
                              <td className="fact-cell-center">
                                <input
                                  type="number"
                                  className="fact-input"
                                  style={{ padding: "0.4rem", fontSize: "0.8125rem", width: "4rem", textAlign: "center" }}
                                  min={1}
                                  value={it.quantity}
                                  onChange={(e) => updateItem(idx, { quantity: Math.max(1, Number(e.target.value || 1)) })}
                                />
                              </td>
                              <td className="fact-cell-center">
                                <input readOnly value={it.price} style={{ width: "3.25rem" }} />
                              </td>
                              <td className="fact-cell-center">
                                <input
                                  type="number"
                                  className="fact-input"
                                  style={{ padding: "0.4rem", fontSize: "0.8125rem", width: "4rem", textAlign: "center" }}
                                  min={0}
                                  value={it.discount}
                                  onChange={(e) => updateItem(idx, { discount: Math.max(0, Number(e.target.value || 0)) })}
                                />
                              </td>
                              <td className="fact-cell-center fact-cell-total">
                                <input readOnly value={lineTotal.toFixed(2)} style={{ width: "3.5rem" }} />
                              </td>
                              <td className="fact-cell-center">
                                <button type="button" className="fact-btn-remove" onClick={() => removeItem(idx)} title="Quitar ítem">
                                  ×
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {items.length > 0 && (
                  <>
                    <div className="fact-totals">
                      <div className="fact-total-box fact-total-sub">
                        <span className="fact-total-label">Subtotal</span>
                        <span className="fact-total-value">$ {totals.subtotal.toFixed(2)}</span>
                      </div>
                      <div className="fact-total-box fact-total-disc">
                        <span className="fact-total-label">Descuentos</span>
                        <span className="fact-total-value">− $ {totals.discounts.toFixed(2)}</span>
                      </div>
                      <div className="fact-total-box fact-total-final">
                        <span className="fact-total-label">Total</span>
                        <span className="fact-total-value">$ {totals.total.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="fact-actions">
                      <button type="button" className="fact-btn fact-btn-secondary" onClick={exportExcel}>
                        Exportar Excel
                      </button>
                      <button type="button" className="fact-btn fact-btn-primary" onClick={generatePdfAndSave}>
                        Generar PDF
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
