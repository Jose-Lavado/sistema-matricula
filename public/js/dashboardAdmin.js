// dashboardAdmin.js — panel admin: stats, vacantes, últimas matrículas, cambio de estado
let estadoEditId = null;
let detailId = null;

function abrevGrado(grado) {
  return grado ? grado.split(" ")[0] : "—";
}

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
    document.getElementById("topbarTitle").textContent = "Panel Administrativo";
  });

async function cargarDashboard() {
  try {
    const stats = await apiFetch("/matriculas/stats");
    if (stats) {
      document.getElementById("statAlumnos").textContent = stats.total_alumnos || 0;
      document.getElementById("statMatriculas").textContent = stats.total_matriculas || 0;
      document.getElementById("statPendientes").textContent = stats.pendientes || 0;
    }

    const totales = await apiFetch("/secciones/totales");
    if (totales) {
      document.getElementById("statVacantes").textContent = totales.disponibles || 0;
    }

    const vacantes = await apiFetch("/secciones/vacantes");
    if (vacantes) {
      const container = document.getElementById("vacantesContainer");
      if (container) {
        container.innerHTML = vacantes.map(v => {
          const pct = v.total > 0 ? Math.round((v.ocupadas / v.total) * 100) : 0;
          let barClass = "bg-success";
          if (pct >= 90) barClass = "bg-danger";
          else if (pct >= 70) barClass = "bg-warning";
          return `
            <div class="mb-3">
              <div class="d-flex justify-content-between mb-1">
                <span>${v.grado}</span><small class="text-muted">${v.ocupadas}/${v.total}</small>
              </div>
              <div class="progress"><div class="progress-bar ${barClass}" style="width:${pct}%"></div></div>
            </div>
          `;
        }).join("") + `
          <div class="mt-3 small text-secondary">
            <div class="d-flex align-items-center gap-2 mb-1">
              <div class="bg-danger rounded-circle" style="width:9px;height:9px"></div>
              <span>+90% — cupos críticos</span>
            </div>
            <div class="d-flex align-items-center gap-2 mb-1">
              <div class="bg-warning rounded-circle" style="width:9px;height:9px"></div>
              <span>70-89% — disponibilidad baja</span>
            </div>
            <div class="d-flex align-items-center gap-2">
              <div class="bg-success rounded-circle" style="width:9px;height:9px"></div>
              <span>&lt;70% — disponibilidad normal</span>
            </div>
          </div>`;
      }
    }

    const matriculas = await apiFetch("/matriculas");
    if (matriculas && matriculas.data && matriculas.data.length) {
      const tbody = document.getElementById("ultimasMatriculas");
      if (tbody) {
        tbody.innerHTML = matriculas.data.slice(0, 5).map(m => {
          const estadoBadge = badgeEstado(m.estado);
          return `
            <tr>
              <td class="fw-semibold">${m.alumno || "—"}</td>
              <td>${m.apoderado || "—"}</td>
              <td>${abrevGrado(m.grado)} - ${m.seccion || "—"}</td>
              <td class="text-center"><span class="badge rounded-pill ${estadoBadge}">${m.estado}</span></td>
              <td class="text-center">
                <div class="d-flex justify-content-center gap-1">
                  <button class="btn btn-sm btn-outline-secondary" title="Ver" onclick="verDetalle(${m.id})"><i class="bi bi-eye"></i></button>
                  <button class="btn btn-sm btn-outline-warning p-0" style="width:30px;height:30px" title="Cambiar estado" onclick="abrirModalEstado(${m.id},'${m.estado}')"><i class="bi bi-toggle-on"></i></button>
                </div>
              </td>
            </tr>
          `;
        }).join("");
      }
    }
  } catch (e) {
    console.error("Error cargando dashboard:", e);
    showErrorAlert("Error al cargar los datos del panel.");
  }
}

function verDetalle(id) {
  detailId = id;
  apiFetch("/matriculas/" + id).then(m => {
    document.getElementById("detNumero").textContent = "#" + String(m.id).padStart(3, "0");
    document.getElementById("detAlumno").textContent = m.alumno || "-";
    document.getElementById("detDni").textContent = m.dni_alumno || "-";
    document.getElementById("detEdad").textContent = calcularEdad(m.fechaNacimiento);
    document.getElementById("detApoderado").textContent = m.apoderado || "-";
    document.getElementById("detGrado").textContent = (m.grado || "") + (m.seccion ? " " + m.seccion : "");
    let badgeClass = "bg-success text-white";
    let txt = m.estado || "-";
    if (m.estado === "PENDIENTE") badgeClass = "bg-warning text-dark";
    else if (m.estado === "RECHAZADA") badgeClass = "bg-danger text-white";
    document.getElementById("detEstado").innerHTML = '<span class="badge rounded-pill ' + badgeClass + ' px-2 py-1">' + txt + "</span>";
    new bootstrap.Modal(document.getElementById("detailModal")).show();
  }).catch(() => {
    showErrorAlert("Error al obtener detalle");
  });
}

function seleccionarEstado(el) {
  document.querySelectorAll(".estado-option").forEach(o => {
    o.classList.remove("selected", "selected-aprobada", "selected-pendiente", "selected-rechazada");
  });
  el.classList.add("selected");
  const val = el.dataset.value;
  el.classList.add("selected-" + val.toLowerCase());
  document.getElementById("estadoSelected").value = val;
}

function abrirModalEstado(id, estadoActual) {
  estadoEditId = id;
  document.querySelectorAll(".estado-option").forEach(o => {
    o.classList.remove("selected", "selected-aprobada", "selected-pendiente", "selected-rechazada");
    if (o.dataset.value === estadoActual) {
      o.classList.add("selected");
      o.classList.add("selected-" + estadoActual.toLowerCase());
      document.getElementById("estadoSelected").value = estadoActual;
    }
  });
  new bootstrap.Modal(document.getElementById("estadoModal")).show();
}

function guardarCambioEstado() {
  const nuevoEstado = document.getElementById("estadoSelected").value;
  if (!nuevoEstado) { showErrorAlert("Selecciona un estado."); return; }
  apiFetch("/matriculas/" + estadoEditId + "/estado", {
    method: "PUT",
    body: JSON.stringify({ estado: nuevoEstado })
  }).then(() => {
    bootstrap.Modal.getInstance(document.getElementById("estadoModal")).hide();
    showSuccessAlert("Estado de matrícula actualizado.");
    cargarDashboard();
  }).catch(() => {
    showErrorAlert("Error al cambiar estado");
  });
}

cargarDashboard();
setInterval(cargarDashboard, 3000);