/* ============================================================
   HISTORIAL DE FACTURAS - HRS
============================================================ */

let facturasOriginales = [];
let chartMensual = null;

window.onload = () => {
    cargarHistorial();
};

/* --- CARGAR HISTORIAL --- */
function cargarHistorial() {
    facturasOriginales = JSON.parse(localStorage.getItem("facturas_hrs")) || [];
    mostrarFacturasEnTabla(facturasOriginales);
}

/* --- MOSTRAR TABLA --- */
function mostrarFacturasEnTabla(facturas) {

    const tbody = document.getElementById("facturasHistorialBody");

    if (facturas.length === 0) {
        tbody.innerHTML = `
        <tr>
            <td colspan="7" class="text-center text-muted py-4">
                <small>No hay facturas registradas</small>
            </td>
        </tr>`;
        actualizarEstadisticas();
        generarGraficoMensual();
        return;
    }

    tbody.innerHTML = facturas.map((factura, index) => {

        const tipo = factura.numero.startsWith("FC-") ? "Factura" : "Recibo";

        return `
        <tr>
            <td class="fw-bold">${factura.numero}</td>
            <td>${tipo}</td>
            <td>${factura.cliente}</td>
            <td>${factura.fecha}</td>
            <td>${factura.mes || factura.fecha.substring(0,7)}</td>
            <td class="fw-bold">$ ${parseFloat(factura.total).toFixed(2)}</td>
            <td class="text-center">
                <button class="btn btn-danger btn-sm" onclick="eliminarFactura(${index})">
                    🗑️
                </button>
            </td>
        </tr>
        `;
    }).join("");

    actualizarEstadisticas();
    generarGraficoMensual();
}

/* --- FILTROS --- */
function aplicarFiltros() {

    const cliente = document.getElementById("filtroCliente").value.toLowerCase();
    const tipo = document.getElementById("filtroTipo").value;
    const mes = document.getElementById("filtroMes").value;

    let filtradas = facturasOriginales.filter(f => {

        let cumpleCliente = f.cliente.toLowerCase().includes(cliente);

        let cumpleTipo =
            !tipo ||
            (tipo === "Factura" && f.numero.startsWith("FC-")) ||
            (tipo === "Recibo" && f.numero.startsWith("RC-"));

        let mesFactura = f.mes || f.fecha.substring(0, 7);
        let cumpleMes = !mes || mesFactura.startsWith(mes);

        return cumpleCliente && cumpleTipo && cumpleMes;
    });

    mostrarFacturasEnTabla(filtradas);
}

function limpiarFiltros() {
    document.getElementById("filtroCliente").value = "";
    document.getElementById("filtroTipo").value = "";
    document.getElementById("filtroMes").value = "";
    mostrarFacturasEnTabla(facturasOriginales);
}

/* --- ELIMINAR --- */
function eliminarFactura(index) {
    facturasOriginales.splice(index, 1);
    localStorage.setItem("facturas_hrs", JSON.stringify(facturasOriginales));
    mostrarFacturasEnTabla(facturasOriginales);
}

/* --- EXPORTAR EXCEL --- */
function exportarHistorialExcel() {

    if (facturasOriginales.length === 0) return;

    const ws = XLSX.utils.json_to_sheet(facturasOriginales);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Historial");

    XLSX.writeFile(wb, "Historial_Facturas.xlsx");
}

/* --- BORRAR TODO --- */
function abrirConfirmacionBorrar() {
    new bootstrap.Modal(document.getElementById("confirmarBorrarModal")).show();
}

function confirmarBorrarHistorial() {
    facturasOriginales = [];
    localStorage.setItem("facturas_hrs", JSON.stringify([]));
    bootstrap.Modal.getInstance(document.getElementById("confirmarBorrarModal")).hide();
    mostrarFacturasEnTabla([]);
}

/* --- ESTADÍSTICAS --- */
function actualizarEstadisticas() {

    const facturas = facturasOriginales.filter(f => f.numero.startsWith("FC-"));
    const recibos = facturasOriginales.filter(f => f.numero.startsWith("RC-"));

    const montoTotal = facturasOriginales.reduce(
        (sum, f) => sum + parseFloat(f.total || 0),
        0
    );

    document.getElementById("statsFacturas").textContent = facturas.length;
    document.getElementById("statsRecibos").textContent = recibos.length;
    document.getElementById("statsMontoTotal").textContent = "$ " + montoTotal.toFixed(2);
    document.getElementById("statsTotal").textContent = facturasOriginales.length;
}

/* ============================================================
   📊 GRÁFICO TOTAL POR MES
============================================================ */

function generarGraficoMensual() {

    const totalesPorMes = {};

    facturasOriginales.forEach(f => {

        let mes = f.mes || f.fecha.substring(0, 7);

        if (!totalesPorMes[mes]) {
            totalesPorMes[mes] = 0;
        }

        totalesPorMes[mes] += parseFloat(f.total || 0);
    });

    const meses = Object.keys(totalesPorMes).sort();
    const valores = meses.map(m => totalesPorMes[m]);

    const canvas = document.getElementById("graficoFacturacionMes");
    if (!canvas) return;

    if (chartMensual) chartMensual.destroy();

    chartMensual = new Chart(canvas, {
        type: "bar",
        data: {
            labels: meses,
            datasets: [{
                label: "Total facturado ($)",
                data: valores,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}
