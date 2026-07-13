// reporte.js — cargar 6 reportes por tabs, filtros, acciones (soft delete), exportar PDF/Excel
fetch("/components/sidebar.html")
  .then(r => r.text())
  .then(html => {
    document.getElementById("sidebar-container").innerHTML = html;
    const s = document.createElement("script");
    s.src = "/js/sidebar.js";
    document.body.appendChild(s);
  });

fetch("/components/topbar.html")
  .then(r => r.text())
  .then(html => {
    document.getElementById("topbar-container").innerHTML = html;
    document.getElementById("topbarTitle").textContent = "Reportes del Sistema";
  });

const ESTADOS = { APROBADA: "bg-success", PENDIENTE: "bg-warning text-dark", RECHAZADA: "bg-danger" };

// ==================== REPORTE 1: Por Periodo ====================
async function cargarR1() {
  const periodo = new Date().getFullYear();
  const grado = document.getElementById("r1FilterGrado")?.value || "";
  const seccion = document.getElementById("r1FilterSeccion")?.value || "";
  try {
    const params = new URLSearchParams({ periodo });
    if (grado) params.append("grado", grado);
    if (seccion) params.append("seccion", seccion);
    const [stats, data] = await Promise.all([
      apiFetch("/reportes/stats?" + params.toString()),
      apiFetch("/reportes/matriculas?" + params.toString())
    ]);
    if (stats) {
      document.getElementById("r1KpiTotal").textContent = stats.total_matriculas || 0;
      document.getElementById("r1KpiAprobadas").textContent = stats.aprobadas || 0;
      document.getElementById("r1KpiPendientes").textContent = stats.pendientes || 0;
      document.getElementById("r1KpiRechazadas").textContent = stats.rechazadas || 0;
    }
    const tbody = document.getElementById("r1Body");
    if (data && data.length) {
      tbody.innerHTML = data.map((r, i) => {
        const idx = String(i + 1).padStart(3, "0");
        const badge = ESTADOS[r.estado] || "bg-secondary";
        return `<tr>
          <td class="ps-4 text-muted">${idx}</td>
          <td class="fw-medium">${r.alumno || "-"}</td>
          <td>${r.dni || "-"}</td>
          <td>${r.grado || "-"}</td>
          <td>${r.seccion || "-"}</td>
          <td><span class="badge ${badge} px-3 badge-estado">${r.estado || "-"}</span></td>
          <td>${r.fechaRegistro ? new Date(r.fechaRegistro).toLocaleDateString("es-PE") : "-"}</td>
        </tr>`;
      }).join("");
      document.getElementById("r1Info").textContent = data.length + " registros - Pagina 1 de 1";
    } else {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4">No hay datos disponibles</td></tr>';
      document.getElementById("r1Info").textContent = "0 registros";
    }
  } catch (e) {
    console.error("Error R1:", e);
    showErrorAlert("Error al cargar Reporte 1.");
  }
}

// ==================== REPORTE 2: Productividad del Personal ====================
async function cargarR2() {
  const periodo = new Date().getFullYear();
  const desde = document.getElementById("r2Desde")?.value || "";
  const hasta = document.getElementById("r2Hasta")?.value || "";
  try {
    const params = new URLSearchParams({ periodo });
    if (desde) params.append("desde", desde);
    if (hasta) params.append("hasta", hasta);
    const result = await apiFetch("/reportes/productividad?" + params.toString());
    if (result) {
      document.getElementById("r2KpiTotal").textContent = result.totalMatriculas || 0;
      document.getElementById("r2KpiAdmins").textContent = result.totalAdmins || 0;
      document.getElementById("r2KpiMax").textContent = result.maxTotal || 0;
      document.getElementById("r2KpiMaxAdmin").textContent = result.maxAdmin || "";
      document.getElementById("r2KpiMin").textContent = result.minTotal || 0;
      document.getElementById("r2KpiMinAdmin").textContent = result.minAdmin || "";

      const tbody = document.getElementById("r2Body");
      if (result.data && result.data.length) {
        const filas = result.data.map(r => {
          const total = Number(r.total);
          const aprobadas = Number(r.aprobadas);
          const pct = total > 0 ? ((aprobadas / total) * 100).toFixed(1) : 0;
          return `<tr>
            <td class="ps-4 fw-semibold">${r.admin}</td>
            <td>${total}</td>
            <td class="text-success fw-semibold">${r.aprobadas}</td>
            <td class="text-warning fw-semibold">${r.pendientes}</td>
            <td class="text-danger fw-semibold">${r.rechazadas}</td>
            <td>
              <div class="d-flex align-items-center gap-2">
                <div class="progress flex-grow-1" style="height:20px; max-width:100px">
                  <div class="progress-bar ${pct >= 70 ? 'bg-success' : pct >= 40 ? 'bg-warning' : 'bg-danger'}" style="width:${pct}%"></div>
                </div>
                <small class="text-muted">${pct}%</small>
              </div>
            </td>
          </tr>`;
        });
        filas.push(`<tr class="table-secondary fw-bold">
          <td class="ps-4">PROMEDIO</td>
          <td>${result.promedioTotal}</td>
          <td class="text-success">${result.promedioAprobadas}</td>
          <td colspan="3"></td>
        </tr>`);
        tbody.innerHTML = filas.join("");
      } else {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">No hay datos de productividad</td></tr>';
      }
    }
  } catch (e) {
    console.error("Error R2:", e);
    showErrorAlert("Error al cargar Reporte 2.");
  }
}

// ==================== REPORTE 3: Alumnos sin Matrícula ====================
async function cargarR3() {
  try {
    const data = await apiFetch("/reportes/sin-matricula");
    const tbody = document.getElementById("r3Body");
    document.getElementById("r3KpiTotal").textContent = data ? data.length : 0;
    if (data && data.length) {
      tbody.innerHTML = data.map(r => {
        const fnac = r.fechaNacimiento ? new Date(r.fechaNacimiento).toLocaleDateString("es-PE") : "-";
        return `<tr>
          <td class="ps-4 fw-medium">${r.alumno || "-"}</td>
          <td>${r.dni_alumno || "-"}</td>
          <td>${fnac}</td>
          <td>${r.apoderado || "-"}</td>
          <td>${r.dni_apoderado || "-"}</td>
          <td>${r.telefono_apoderado || "-"}</td>
        </tr>`;
      }).join("");
    } else {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">Todos los alumnos tienen matrícula activa</td></tr>';
    }
  } catch (e) {
    console.error("Error R3:", e);
    showErrorAlert("Error al cargar Reporte 3.");
  }
}

// ==================== REPORTE 4: Eliminadas ====================
async function cargarR4() {
  try {
    const data = await apiFetch("/reportes/eliminadas?periodo=" + new Date().getFullYear());
    const tbody = document.getElementById("r4Body");
    document.getElementById("r4KpiTotal").textContent = data ? data.length : 0;
    if (data && data.length) {
      tbody.innerHTML = data.map(r => {
        const badge = ESTADOS[r.estadoAnterior] || "bg-secondary";
        const fechaReg = r.fechaRegistro ? new Date(r.fechaRegistro).toLocaleDateString("es-PE") : "-";
        const fechaElim = r.fechaEliminacion ? new Date(r.fechaEliminacion).toLocaleString("es-PE") : "-";
        return `<tr>
          <td class="ps-4 text-muted">${r.idMatricula}</td>
          <td class="fw-medium">${r.alumno || "-"}</td>
          <td><span class="badge ${badge} badge-estado">${r.estadoAnterior || "-"}</span></td>
          <td>${fechaReg}</td>
          <td>${fechaElim}</td>
          <td>${r.eliminadoPorNombre || "-"}</td>
          <td class="no-print">
            <div class="d-flex justify-content-center gap-1">
              <button class="btn btn-sm btn-outline-success" title="Restaurar" onclick="restaurarMatricula(${r.idMatricula})"><i class="bi bi-arrow-counterclockwise"></i></button>
              <button class="btn btn-sm btn-outline-danger" title="Eliminar permanentemente" onclick="eliminarPermanentemente(${r.idMatricula})"><i class="bi bi-trash"></i></button>
            </div>
          </td>
        </tr>`;
      }).join("");
    } else {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4">No hay matriculas eliminadas</td></tr>';
    }
  } catch (e) {
    console.error("Error R4:", e);
    showErrorAlert("Error al cargar Reporte 4.");
  }
}

async function restaurarMatricula(id) {
  document.getElementById("r4ConfirmMsg").textContent = "¿Restaurar esta matrícula? Volverá a aparecer en los reportes activos.";
  document.getElementById("r4ConfirmBtn").className = "btn btn-sm btn-success";
  document.getElementById("r4ConfirmBtn").onclick = async function () {
    const res = await apiFetch("/matriculas/" + id + "/restaurar", { method: "PUT" });
    if (res && !res.error) {
      bootstrap.Modal.getInstance(document.getElementById("r4ConfirmModal")).hide();
      showSuccessAlert("Matrícula restaurada correctamente.");
      cargarR4();
      cargarR1();
    } else {
      showErrorAlert(res?.error || "Error al restaurar");
    }
  };
  new bootstrap.Modal(document.getElementById("r4ConfirmModal")).show();
}

async function eliminarPermanentemente(id) {
  document.getElementById("r4ConfirmMsg").textContent = "¿Eliminar permanentemente? Esta acción NO se puede deshacer.";
  document.getElementById("r4ConfirmBtn").className = "btn btn-sm btn-danger";
  document.getElementById("r4ConfirmBtn").onclick = async function () {
    const res = await apiFetch("/matriculas/" + id + "/permanente", { method: "DELETE" });
    if (res && !res.error) {
      bootstrap.Modal.getInstance(document.getElementById("r4ConfirmModal")).hide();
      showSuccessAlert("Matrícula eliminada permanentemente.");
      cargarR4();
    } else {
      showErrorAlert(res?.error || "Error al eliminar");
    }
  };
  new bootstrap.Modal(document.getElementById("r4ConfirmModal")).show();
}

// ==================== REPORTE 5: Estadisticas ====================
async function cargarR5() {
  try {
    const result = await apiFetch("/reportes/cumplimiento?periodo=" + new Date().getFullYear());
    if (result) {
      document.getElementById("r5Realizadas").textContent = result.totalRealizadas || 0;
      document.getElementById("r5Capacidad").textContent = result.totalCapacidad || 0;
      document.getElementById("r5Porcentaje").textContent = (result.porcentajeGlobal || 0) + "%";
      const tbody = document.getElementById("r5Body");
      if (result.data && result.data.length) {
        tbody.innerHTML = result.data.map(r => {
          const pct = Number(r.porcentaje);
          let obs = "";
          if (pct >= 80) obs = '<span class="badge bg-success">Sobresaliente</span>';
          else if (pct >= 50) obs = '<span class="badge bg-warning text-dark">Aceptable</span>';
          else obs = '<span class="badge bg-danger">Insuficiente</span>';
          return `<tr>
            <td class="ps-4 fw-semibold">${r.grado}</td>
            <td class="fw-bold text-success">${r.realizadas}</td>
            <td>${r.capacidad}</td>
            <td>
              <div class="d-flex align-items-center gap-2">
                <div class="progress flex-grow-1" style="height:20px;max-width:120px">
                  <div class="progress-bar ${pct >= 80 ? 'bg-success' : pct >= 50 ? 'bg-warning' : 'bg-danger'}" style="width:${pct}%"></div>
                </div>
                <small class="text-muted">${pct}%</small>
              </div>
            </td>
            <td>${obs}</td>
          </tr>`;
        }).join("");
      } else {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">No hay datos disponibles</td></tr>';
      }
    }
  } catch (e) {
    console.error("Error R5:", e);
    showErrorAlert("Error al cargar Reporte 5.");
  }
}

// ==================== REPORTE 6: Vacantes ====================
async function cargarR6() {
  try {
    const data = await apiFetch("/reportes/vacantes");
    if (data && data.totales) {
      const t = data.totales;
      const ocupPct = t.total_vacantes > 0 ? ((t.ocupadas / t.total_vacantes) * 100).toFixed(1) : 0;
      document.getElementById("r6TotalCap").textContent = t.total_vacantes || 0;
      document.getElementById("r6Disponibles").textContent = t.disponibles || 0;
      document.getElementById("r6Ocupadas").textContent = t.ocupadas || 0;
      document.getElementById("r6Porcentaje").textContent = ocupPct + "%";
    }
    const tbody = document.getElementById("r6Body");
    if (data && data.secciones && data.secciones.length) {
      tbody.innerHTML = data.secciones.map(s => {
        const pct = s.capacidad > 0 ? ((s.ocupadas / s.capacidad) * 100).toFixed(1) : 0;
        let barClass = "bg-primary";
        if (pct >= 80) barClass = "bg-danger";
        else if (pct >= 60) barClass = "bg-warning";
        return `<tr>
          <td class="ps-4 fw-semibold">${s.grado}</td>
          <td>${s.seccion}</td>
          <td>${s.capacidad}</td>
          <td class="text-success fw-semibold">${s.vacantes}</td>
          <td>${s.ocupadas}</td>
            <td>
            <div class="d-flex align-items-center gap-2">
              <div class="progress flex-grow-1" style="height:20px; max-width:120px">
                <div class="progress-bar ${barClass}" style="width:${pct}%"></div>
              </div>
              <small class="text-muted">${pct}%</small>
            </div>
          </td>
        </tr>`;
      }).join("");
    } else {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">No hay datos disponibles</td></tr>';
    }
  } catch (e) {
    console.error("Error R6:", e);
    showErrorAlert("Error al cargar Reporte 6.");
  }
}

// ==================== EXPORTAR PDF (Reporte 1) ====================
async function exportarPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF("p", "mm", "a4");
  const azul = [10, 22, 40];
  const gris = [245, 247, 251];

  // ==================== HEADER SIMÉTRICO: 3 bloques en fila ====================
  // Bloque izquierdo: Logo arriba + texto debajo
  try {
    const logo = new Image();
    logo.src = "/images/logo.png";
    await new Promise(function (r) { logo.onload = r; logo.onerror = r; });
    doc.addImage(logo, "PNG", 22, 8, 18, 18);
  } catch (e) {}

  doc.setTextColor(...azul);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("I.E. PEDRO LABARTHE", 31, 28, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(100);
  doc.text("Institucion Educativa Pedro Labarthe", 31, 32, { align: "center" });
  doc.text("Sistema de Gestion de Matriculas", 31, 36, { align: "center" });

  // Bloque centro: Título
  doc.setTextColor(40);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Reporte de Matriculas", 105, 16, { align: "center" });
  doc.setFontSize(10);
  doc.setTextColor(...azul);
  doc.text("Periodo Academico 2026", 105, 25, { align: "center" });

  // Bloque derecho: Caja metadatos
  const raw = sessionStorage.getItem("user") || localStorage.getItem("user");
  const user = raw ? JSON.parse(raw) : {};
  const fechaHoy = new Date();
  const fechaStr = String(fechaHoy.getDate()).padStart(2, "0") + "/" + String(fechaHoy.getMonth() + 1).padStart(2, "0") + "/" + fechaHoy.getFullYear();

  const bx = 153, by = 10, bw = 43, bh = 20;
  doc.setDrawColor(180);
  doc.setLineWidth(0.3);
  doc.roundedRect(bx, by, bw, bh, 2, 2, "S");
  doc.setFontSize(6);
  const meta = [
    ["Fecha: ", fechaStr],
    ["Generado por: ", user.name || "Admin"],
    ["Cargo: ", user.role || "Administrador"],
    ["Periodo: ", "2026"]
  ];
  let my = by + 4.5;
  meta.forEach(function (m) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(60);
    doc.text(m[0], bx + 3, my);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text(m[1], bx + 22, my);
    my += 3.8;
  });

  // ==================== LÍNEA SEPARADORA ====================
  doc.setDrawColor(180);
  doc.setLineWidth(0.4);
  doc.line(14, 40, 196, 40);

  // ==================== SECCIÓN 1: RESUMEN GENERAL ====================
  doc.setTextColor(...azul);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("1. RESUMEN GENERAL", 14, 47);

  showNotification("loading", "Exportando PDF...", "Generando el documento.", 0);
  const stats = await apiFetch("/reportes/stats") || {};

  // Tabla de 4 columnas con fondos pastel
  var tblX = 14, tblW = 182, cellW = tblW / 4;
  var hdrY = 51, hdrH = 8, dataH = 10;

  // Header azul marino
  doc.setFillColor(...azul);
  doc.rect(tblX, hdrY, tblW, hdrH, "F");
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  ["TOTAL MATRICULAS", "APROBADAS", "PENDIENTES", "RECHAZADAS"].forEach(function (label, i) {
    doc.text(label, tblX + cellW * i + cellW / 2, hdrY + 5.5, { align: "center" });
  });

  // Fila de datos con fondos pastel
  var pastelBg = [[255, 255, 255], [209, 231, 221], [255, 243, 205], [248, 215, 218]];
  var valores = [String(stats.total_matriculas || 0), String(stats.aprobadas || 0), String(stats.pendientes || 0), String(stats.rechazadas || 0)];
  var dataY = hdrY + hdrH;

  valores.forEach(function (val, i) {
    doc.setFillColor(...pastelBg[i]);
    doc.rect(tblX + cellW * i, dataY, cellW, dataH, "F");
    doc.setDrawColor(200);
    doc.setLineWidth(0.2);
    doc.rect(tblX + cellW * i, dataY, cellW, dataH, "S");
    doc.setTextColor(40);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(val, tblX + cellW * i + cellW / 2, dataY + 7, { align: "center" });
  });

  // ==================== SECCIÓN 2: DETALLE DE MATRÍCULAS ====================
  var sec2Y = dataY + dataH + 8;
  doc.setTextColor(...azul);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("2. DETALLE DE MATRICULAS", 14, sec2Y);

  const filas = [];
  document.querySelectorAll("#tablaR1 tbody tr").forEach(function (tr) {
    const tds = tr.querySelectorAll("td");
    if (tds.length >= 7) {
      filas.push(Array.from(tds).map(function (td) { return td.innerText.trim(); }));
    }
  });

  doc.autoTable({
    startY: sec2Y + 4,
    head: [["N\u00b0", "Alumno", "DNI", "Grado", "Seccion", "Estado", "Fecha"]],
    body: filas,
    theme: "grid",
    headStyles: { fillColor: azul, textColor: 255, halign: "center", fontStyle: "bold", fontSize: 8.5 },
    styles: { fontSize: 8, cellPadding: 3, valign: "middle", textColor: 40 },
    alternateRowStyles: { fillColor: gris },
  });

  // ==================== PIE DE PÁGINA ====================
  var paginas = doc.internal.getNumberOfPages();
  for (var i = 1; i <= paginas; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text("Pagina " + i + " de " + paginas, 105, 290, { align: "center" });
  }

  doc.save("Reporte_Matriculas_2026.pdf");
  document.querySelectorAll(".notif-stack .notif").forEach(function (d) {
    if (typeof removeNotification === "function") removeNotification(d);
    else d.remove();
  });
  showSuccessAlert("PDF exportado correctamente.");
}

// ==================== HELPER: Header PDF ====================
function buildPdfHeader(doc, titulo) {
  var azul = [10, 22, 40];
  try {
    var logo = new Image();
    logo.src = "/images/logo.png";
    doc.addImage(logo, "PNG", 22, 8, 18, 18);
  } catch (e) {}
  doc.setTextColor(10, 22, 40);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("I.E. PEDRO LABARTHE", 31, 28, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(100);
  doc.text("Institucion Educativa Pedro Labarthe", 31, 32, { align: "center" });
  doc.text("Sistema de Gestion de Matriculas", 31, 36, { align: "center" });

  doc.setTextColor(40);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(titulo, 105, 16, { align: "center" });
  doc.setFontSize(10);
  doc.setTextColor(10, 22, 40);
  var anio = new Date().getFullYear();
  doc.text("Periodo Academico " + anio, 105, 25, { align: "center" });

  var raw = sessionStorage.getItem("user") || localStorage.getItem("user");
  var user = raw ? JSON.parse(raw) : {};
  var fechaHoy = new Date();
  var fechaStr = String(fechaHoy.getDate()).padStart(2, "0") + "/" + String(fechaHoy.getMonth() + 1).padStart(2, "0") + "/" + fechaHoy.getFullYear();
  var bx = 153, by = 10, bw = 43, bh = 20;
  doc.setDrawColor(180);
  doc.setLineWidth(0.3);
  doc.roundedRect(bx, by, bw, bh, 2, 2, "S");
  doc.setFontSize(6);
  var meta = [["Fecha: ", fechaStr], ["Generado por: ", user.name || "Admin"], ["Cargo: ", user.role || "Administrador"], ["Periodo: ", String(anio)]];
  var my = by + 4.5;
  meta.forEach(function (m) {
    doc.setFont("helvetica", "bold"); doc.setTextColor(60); doc.text(m[0], bx + 3, my);
    doc.setFont("helvetica", "normal"); doc.setTextColor(100); doc.text(m[1], bx + 22, my);
    my += 3.8;
  });
  doc.setDrawColor(180); doc.setLineWidth(0.4); doc.line(14, 40, 196, 40);
  return 44;
}

function buildPdfFooter(doc) {
  var paginas = doc.internal.getNumberOfPages();
  for (var i = 1; i <= paginas; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text("Pagina " + i + " de " + paginas, 105, 290, { align: "center" });
  }
}

// ==================== EXPORTAR PDF (Reporte 2: Productividad) ====================
async function exportarPDF_R2() {
  var { jsPDF } = window.jspdf;
  var doc = new jsPDF("p", "mm", "a4");
  var azul = [10, 22, 40];
  var gris = [245, 247, 251];
  var startY = buildPdfHeader(doc, "Reporte de Productividad");

  showNotification("loading", "Exportando PDF...", "Generando el documento.", 0);

  var result = await apiFetch("/reportes/productividad?periodo=" + new Date().getFullYear()) || {};

  doc.setTextColor(10, 22, 40);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("1. RESUMEN GENERAL", 14, startY + 3);

  var tblX = 14, tblW = 182, cellW = tblW / 4;
  var hdrY = startY + 7, hdrH = 8, dataH = 10;

  doc.setFillColor(...azul);
  doc.rect(tblX, hdrY, tblW, hdrH, "F");
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  ["TOTAL MATRICULAS", "ADMINISTRADORS", "PROM. TOTAL", "PROM. APROBADAS"].forEach(function (label, i) {
    doc.text(label, tblX + cellW * i + cellW / 2, hdrY + 5.5, { align: "center" });
  });

  var pastelBg = [[255, 255, 255], [219, 234, 254], [209, 231, 221], [255, 243, 205]];
  var valores = [String(result.totalMatriculas || 0), String(result.totalAdmins || 0), String(result.promedioTotal || 0), String(result.promedioAprobadas || 0)];
  var dataY = hdrY + hdrH;
  valores.forEach(function (val, i) {
    doc.setFillColor(...pastelBg[i]);
    doc.rect(tblX + cellW * i, dataY, cellW, dataH, "F");
    doc.setDrawColor(200); doc.setLineWidth(0.2);
    doc.rect(tblX + cellW * i, dataY, cellW, dataH, "S");
    doc.setTextColor(40); doc.setFont("helvetica", "bold"); doc.setFontSize(14);
    doc.text(val, tblX + cellW * i + cellW / 2, dataY + 7, { align: "center" });
  });

  var sec2Y = dataY + dataH + 8;
  doc.setTextColor(10, 22, 40);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("2. DETALLE POR ADMINISTRADOR", 14, sec2Y);

  var filas = [];
  document.querySelectorAll("#r2Body tr").forEach(function (tr) {
    var tds = tr.querySelectorAll("td");
    if (tds.length >= 5) {
      filas.push(Array.from(tds).map(function (td) { return td.innerText.trim(); }));
    }
  });

  doc.autoTable({
    startY: sec2Y + 4,
    head: [["Administrador", "Registradas", "Aprobadas", "Pendientes", "Rechazadas", "% Exito"]],
    body: filas,
    theme: "grid",
    headStyles: { fillColor: azul, textColor: 255, halign: "center", fontStyle: "bold", fontSize: 8.5 },
    styles: { fontSize: 8, cellPadding: 3, valign: "middle", textColor: 40 },
    alternateRowStyles: { fillColor: gris },
  });

  buildPdfFooter(doc);
  doc.save("Reporte_Productividad_" + new Date().getFullYear() + ".pdf");
  document.querySelectorAll(".notif-stack .notif").forEach(function (d) {
    if (typeof removeNotification === "function") removeNotification(d); else d.remove();
  });
  showSuccessAlert("PDF exportado correctamente.");
}

// ==================== EXPORTAR PDF (Reporte 4: Eliminadas) ====================
async function exportarPDF_R4() {
  var { jsPDF } = window.jspdf;
  var doc = new jsPDF("p", "mm", "a4");
  var azul = [10, 22, 40];
  var gris = [245, 247, 251];
  var startY = buildPdfHeader(doc, "Reporte de Eliminadas");

  showNotification("loading", "Exportando PDF...", "Generando el documento.", 0);

  doc.setTextColor(10, 22, 40);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("MATRICULAS ELIMINADAS", 14, startY + 3);

  var filas = [];
  document.querySelectorAll("#r4Body tr").forEach(function (tr) {
    var tds = tr.querySelectorAll("td");
    if (tds.length >= 6) {
      filas.push(Array.from(tds).map(function (td) { return td.innerText.trim(); }));
    }
  });

  doc.autoTable({
    startY: startY + 7,
    head: [["ID", "Alumno", "Estado Anterior", "Fecha Registro", "Fecha Eliminacion", "Eliminado Por"]],
    body: filas,
    theme: "grid",
    headStyles: { fillColor: azul, textColor: 255, halign: "center", fontStyle: "bold", fontSize: 8.5 },
    styles: { fontSize: 8, cellPadding: 3, valign: "middle", textColor: 40 },
    alternateRowStyles: { fillColor: gris },
  });

  buildPdfFooter(doc);
  doc.save("Reporte_Eliminadas_" + new Date().getFullYear() + ".pdf");
  document.querySelectorAll(".notif-stack .notif").forEach(function (d) {
    if (typeof removeNotification === "function") removeNotification(d); else d.remove();
  });
  showSuccessAlert("PDF exportado correctamente.");
}

// ==================== EXPORTAR PDF (Reporte 5: Cumplimiento) ====================
async function exportarPDF_R5() {
  var { jsPDF } = window.jspdf;
  var doc = new jsPDF("p", "mm", "a4");
  var azul = [10, 22, 40];
  var gris = [245, 247, 251];
  var startY = buildPdfHeader(doc, "Reporte de Cumplimiento");

  showNotification("loading", "Exportando PDF...", "Generando el documento.", 0);

  var result = await apiFetch("/reportes/cumplimiento?periodo=" + new Date().getFullYear()) || {};

  doc.setTextColor(10, 22, 40);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("1. RESUMEN GLOBAL", 14, startY + 3);

  var tblX = 14, tblW = 182, cellW = tblW / 3;
  var hdrY = startY + 7, hdrH = 8, dataH = 10;

  doc.setFillColor(...azul);
  doc.rect(tblX, hdrY, tblW, hdrH, "F");
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  ["REALIZADAS", "CAPACIDAD TOTAL", "% CUMPLIMIENTO"].forEach(function (label, i) {
    doc.text(label, tblX + cellW * i + cellW / 2, hdrY + 5.5, { align: "center" });
  });

  var pastelBg = [[209, 231, 221], [219, 234, 254], [255, 243, 205]];
  var valores = [String(result.totalRealizadas || 0), String(result.totalCapacidad || 0), (result.porcentajeGlobal || 0) + "%"];
  var dataY = hdrY + hdrH;
  valores.forEach(function (val, i) {
    doc.setFillColor(...pastelBg[i]);
    doc.rect(tblX + cellW * i, dataY, cellW, dataH, "F");
    doc.setDrawColor(200); doc.setLineWidth(0.2);
    doc.rect(tblX + cellW * i, dataY, cellW, dataH, "S");
    doc.setTextColor(40); doc.setFont("helvetica", "bold"); doc.setFontSize(14);
    doc.text(val, tblX + cellW * i + cellW / 2, dataY + 7, { align: "center" });
  });

  var sec2Y = dataY + dataH + 8;
  doc.setTextColor(10, 22, 40);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("2. CUMPLIMIENTO POR GRADO", 14, sec2Y);

  var filas = [];
  document.querySelectorAll("#r5Body tr").forEach(function (tr) {
    var tds = tr.querySelectorAll("td");
    if (tds.length >= 5) {
      filas.push(Array.from(tds).map(function (td) { return td.innerText.trim(); }));
    }
  });

  doc.autoTable({
    startY: sec2Y + 4,
    head: [["Grado", "Realizadas", "Capacidad", "% Cumplimiento", "Observacion"]],
    body: filas,
    theme: "grid",
    headStyles: { fillColor: azul, textColor: 255, halign: "center", fontStyle: "bold", fontSize: 8.5 },
    styles: { fontSize: 8, cellPadding: 3, valign: "middle", textColor: 40 },
    alternateRowStyles: { fillColor: gris },
  });

  buildPdfFooter(doc);
  doc.save("Reporte_Cumplimiento_" + new Date().getFullYear() + ".pdf");
  document.querySelectorAll(".notif-stack .notif").forEach(function (d) {
    if (typeof removeNotification === "function") removeNotification(d); else d.remove();
  });
  showSuccessAlert("PDF exportado correctamente.");
}

// ==================== EXPORTAR PDF (Reporte 6: Vacantes) ====================
async function exportarPDF_R6() {
  var { jsPDF } = window.jspdf;
  var doc = new jsPDF("p", "mm", "a4");
  var azul = [10, 22, 40];
  var gris = [245, 247, 251];
  var startY = buildPdfHeader(doc, "Reporte de Vacantes");

  showNotification("loading", "Exportando PDF...", "Generando el documento.", 0);

  var data = await apiFetch("/reportes/vacantes") || {};

  doc.setTextColor(10, 22, 40);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("1. RESUMEN DE VACANTES", 14, startY + 3);

  if (data.totales) {
    var t = data.totales;
    var tblX = 14, tblW = 182, cellW = tblW / 4;
    var hdrY = startY + 7, hdrH = 8, dataH = 10;

    doc.setFillColor(...azul);
    doc.rect(tblX, hdrY, tblW, hdrH, "F");
    doc.setTextColor(255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    ["CAPACIDAD TOTAL", "DISPONIBLES", "OCUPADAS", "% OCUPACION"].forEach(function (label, i) {
      doc.text(label, tblX + cellW * i + cellW / 2, hdrY + 5.5, { align: "center" });
    });

    var ocupPct = t.total_vacantes > 0 ? ((t.ocupadas / t.total_vacantes) * 100).toFixed(1) : 0;
    var pastelBg = [[255, 255, 255], [209, 231, 221], [219, 234, 254], [255, 243, 205]];
    var valores = [String(t.total_vacantes || 0), String(t.disponibles || 0), String(t.ocupadas || 0), ocupPct + "%"];
    var dataY = hdrY + hdrH;
    valores.forEach(function (val, i) {
      doc.setFillColor(...pastelBg[i]);
      doc.rect(tblX + cellW * i, dataY, cellW, dataH, "F");
      doc.setDrawColor(200); doc.setLineWidth(0.2);
      doc.rect(tblX + cellW * i, dataY, cellW, dataH, "S");
      doc.setTextColor(40); doc.setFont("helvetica", "bold"); doc.setFontSize(14);
      doc.text(val, tblX + cellW * i + cellW / 2, dataY + 7, { align: "center" });
    });

    var sec2Y = dataY + dataH + 8;
    doc.setTextColor(10, 22, 40);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("2. DETALLE POR SECCION", 14, sec2Y);

    var filas = [];
    document.querySelectorAll("#r6Body tr").forEach(function (tr) {
      var tds = tr.querySelectorAll("td");
      if (tds.length >= 6) {
        filas.push(Array.from(tds).map(function (td) { return td.innerText.trim(); }));
      }
    });

    doc.autoTable({
      startY: sec2Y + 4,
      head: [["Grado", "Seccion", "Capacidad", "Disponibles", "Ocupadas", "% Ocupacion"]],
      body: filas,
      theme: "grid",
      headStyles: { fillColor: azul, textColor: 255, halign: "center", fontStyle: "bold", fontSize: 8.5 },
      styles: { fontSize: 8, cellPadding: 3, valign: "middle", textColor: 40 },
      alternateRowStyles: { fillColor: gris },
    });
  }

  buildPdfFooter(doc);
  doc.save("Reporte_Vacantes_" + new Date().getFullYear() + ".pdf");
  document.querySelectorAll(".notif-stack .notif").forEach(function (d) {
    if (typeof removeNotification === "function") removeNotification(d); else d.remove();
  });
  showSuccessAlert("PDF exportado correctamente.");
}

// ==================== EXPORTAR EXCEL (Reporte 1) ====================
function exportarExcel() {
  const wb = XLSX.utils.book_new();
  const data = [
    ["REPORTE DE MATRICULAS"],
    ["I.E. PEDRO LABARTHE"],
    ["Periodo Academico 2026"],
    [],
    ["N\u00b0", "Alumno", "DNI", "Grado", "Seccion", "Estado", "Fecha"],
  ];

  document.querySelectorAll("#tablaR1 tbody tr").forEach((tr) => {
    const tds = tr.querySelectorAll("td");
    if (tds.length >= 7) {
      const fila = [];
      tds.forEach((td) => {
        const badge = td.querySelector(".badge");
        fila.push(badge ? badge.textContent.trim() : td.textContent.trim());
      });
      data.push(fila);
    }
  });

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws["!cols"] = [{ wch: 8 }, { wch: 35 }, { wch: 18 }, { wch: 22 }, { wch: 12 }, { wch: 18 }, { wch: 18 }];
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 6 } },
  ];

  const azul = "0A1628";
  const blanco = "FFFFFF";
  const gris = "F5F7FA";

  ws["A1"].s = { font: { bold: true, sz: 18, color: { rgb: blanco } }, fill: { fgColor: { rgb: azul } }, alignment: { horizontal: "center" } };
  ws["A2"].s = { font: { bold: true, sz: 13 }, alignment: { horizontal: "center" } };
  ws["A3"].s = { font: { italic: true, sz: 11, color: { rgb: "666666" } }, alignment: { horizontal: "center" } };

  ["A5","B5","C5","D5","E5","F5","G5"].forEach((cell) => {
    ws[cell].s = { font: { bold: true, color: { rgb: blanco } }, fill: { fgColor: { rgb: azul } }, alignment: { horizontal: "center" } };
  });

  for (let i = 6; i <= data.length; i++) {
    const colorFila = i % 2 === 0 ? gris : "FFFFFF";
    ["A","B","C","D","E","F","G"].forEach((col) => {
      const celda = col + i;
      if (ws[celda]) {
        ws[celda].s = { fill: { fgColor: { rgb: colorFila } } };
      }
    });
  }

  XLSX.utils.book_append_sheet(wb, ws, "Reporte Matriculas");
  XLSX.writeFile(wb, "Reporte_Matriculas_2026.xlsx");
  showSuccessAlert("Excel exportado correctamente.");
}

// ==================== CARGAR TODO ====================
cargarR1();

function limpiarFiltrosR1() {
  document.getElementById("r1FilterGrado").value = "";
  document.getElementById("r1FilterSeccion").value = "";
  cargarR1();
}

// Lazy load por tab
document.querySelectorAll('#reportesTab button[data-bs-toggle="tab"]').forEach(tab => {
  tab.addEventListener("shown.bs.tab", function (e) {
    const target = e.target.getAttribute("data-bs-target");
    if (target === "#r2") cargarR2();
    else if (target === "#r3") cargarR3();
    else if (target === "#r4") cargarR4();
    else if (target === "#r5") cargarR5();
    else if (target === "#r6") cargarR6();
  });
});

// Event listeners para filtros de fecha del Reporte 2
document.getElementById("r2Desde")?.addEventListener("change", cargarR2);
document.getElementById("r2Hasta")?.addEventListener("change", cargarR2);

// Set default date range (first day of current month to today)
(function() {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const fmt = d => d.toISOString().split("T")[0];
  document.getElementById("r2Desde").value = fmt(first);
  document.getElementById("r2Hasta").value = fmt(now);
})();
