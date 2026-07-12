// gestionMatriculas.js — listar, filtrar, cambiar estado/sección y eliminar matrículas
let estadoEditId = null;

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
    document.getElementById("topbarTitle").textContent = "Gestión de Matrículas";
  });

let currentPage = 1;
let totalPages = 1;
let deleteId = null;
let detailId = null;

function getQueryString() {
  const params = new URLSearchParams();
  const search = document.getElementById("filterSearch").value.trim();
  const grado = document.getElementById("filterGrado").value;
  const seccion = document.getElementById("filterSeccion").value;
  const estado = document.getElementById("filterEstado").value;
  if (search) params.append("search", search);
  if (grado) params.append("grado", grado);
  if (seccion) params.append("seccion", seccion);
  if (estado) params.append("estado", estado);
  params.append("page", currentPage);
  params.append("order", "asc");
  return "?" + params.toString();
}

function cargarMatriculas() {
  const qs = getQueryString();
  apiFetch("/matriculas" + qs).then(data => {
    const tbody = document.getElementById("matriculaBody");
    if (!data || !data.data || data.data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">No se encontraron matrículas</td></tr>';
      return;
    }
    let html = "";
    data.data.forEach(function (m) {
      let badgeClass = badgeEstado(m.estado);

      html += "<tr>";
      html += '<td class="text-muted">' + String(m.id).padStart(3, "0") + "</td>";
      html += '<td class="fw-semibold">' + (m.alumno || "-") + "</td>";
      html += "<td>" + (m.apoderado || "-") + "</td>";
      html += "<td>" + (m.grado || "-") + "</td>";
      html += "<td>" + (m.seccion || "-") + "</td>";
      html += "<td>" + formatearFecha(m.fecha) + "</td>";
      html += '<td><span class="badge rounded-pill ' + badgeClass + ' px-2 py-1">' + m.estado + "</span></td>";
      html += '<td><div class="d-flex justify-content-center gap-1">';
      html += '<button class="btn btn-sm btn-outline-secondary" title="Ver" onclick="verDetalle(' + m.id + ')"><i class="bi bi-eye"></i></button>';
      html += '<button class="btn btn-sm btn-outline-primary" title="Editar sección/grado" onclick="abrirModalSeccion(' + m.id + ')"><i class="bi bi-pencil-square"></i></button>';
      html += '<button class="btn btn-sm btn-outline-warning p-0" style="width:30px;height:30px" title="Toggle estado" onclick="abrirModalEstado(' + m.id + ",'" + m.estado + "'" + ')"><i class="bi bi-toggle-on"></i></button>';
      html += '<button class="btn btn-sm btn-outline-danger" title="Eliminar" onclick="confirmarEliminar(' + m.id + ')"><i class="bi bi-trash"></i></button>';
      html += '<button class="btn btn-sm" style="color:#6f42c1;border-color:#6f42c1;background:rgba(111,66,193,0.06)" title="Historial" onclick="verHistorial(' + m.id + ', \'' + (m.alumno || '').replace(/'/g, "\\'") + '\', \'' + (m.grado || '') + '\')"><i class="bi bi-clock-history"></i></button>';
      html += "</div></td>";
      html += "</tr>";
    });
    tbody.innerHTML = html;

    if (data.pagination) {
      totalPages = data.pagination.totalPages || 1;
    }
    actualizarPaginacion();
  }).catch(() => {
    document.getElementById("matriculaBody").innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">Error al cargar datos</td></tr>';
  });
}

function actualizarPaginacion() {
  document.getElementById("pageInfo").textContent = "Página " + currentPage + " de " + totalPages;
  const pagination = document.getElementById("pagination");
  let html = "";
  const prevDisabled = currentPage <= 1 ? "disabled" : "";
  html += '<li class="page-item ' + prevDisabled + '" id="prevPage"><a class="page-link text-dark bg-light border-secondary-subtle" onclick="irPagina(' + (currentPage - 1) + ')">«</a></li>';
  for (let i = 1; i <= totalPages; i++) {
    const active = i === currentPage ? "active" : "";
    html += '<li class="page-item ' + active + '"><a class="page-link ' + (active ? "bg-dark border-dark" : "text-dark bg-light border-secondary-subtle") + '" onclick="irPagina(' + i + ')">' + i + "</a></li>";
  }
  const nextDisabled = currentPage >= totalPages ? "disabled" : "";
  html += '<li class="page-item ' + nextDisabled + '" id="nextPage"><a class="page-link text-dark bg-light border-secondary-subtle" onclick="irPagina(' + (currentPage + 1) + ')">»</a></li>';
  pagination.innerHTML = html;
}

function irPagina(p) {
  if (p < 1 || p > totalPages) return;
  currentPage = p;
  cargarMatriculas();
}

function limpiarFiltros() {
  document.getElementById("filterSearch").value = "";
  document.getElementById("filterGrado").value = "";
  document.getElementById("filterSeccion").value = "";
  document.getElementById("filterEstado").value = "";
  currentPage = 1;
  cargarMatriculas();
}

document.getElementById("filterSearch").addEventListener("input", function () {
  currentPage = 1;
  cargarMatriculas();
});
document.getElementById("filterGrado").addEventListener("change", function () {
  currentPage = 1;
  cargarMatriculas();
});
document.getElementById("filterSeccion").addEventListener("change", function () {
  currentPage = 1;
  cargarMatriculas();
});
document.getElementById("filterEstado").addEventListener("change", function () {
  currentPage = 1;
  cargarMatriculas();
});

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
  document.getElementById("estadoDescripcion").value = "";
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
  const descripcion = document.getElementById("estadoDescripcion").value.trim();
  apiFetch("/matriculas/" + estadoEditId + "/estado", {
    method: "PUT",
    body: JSON.stringify({ estado: nuevoEstado, descripcion: descripcion || "Cambio a " + nuevoEstado })
  }).then(() => {
    bootstrap.Modal.getInstance(document.getElementById("estadoModal")).hide();
    showSuccessAlert("Estado de matrícula actualizado.");
    cargarMatriculas();
  }).catch(() => {
    showErrorAlert("Error al cambiar estado");
  });
}

let seccionEditId = null;

function abrirModalSeccion(id) {
  seccionEditId = id;
  document.getElementById("secGrado").value = "";
  document.getElementById("secSeccionBlock").style.display = "none";
  document.getElementById("secSecciones").innerHTML = "";
  document.getElementById("secSeccionSelected").value = "";
  apiFetch("/matriculas/" + id).then(m => {
    document.getElementById("secAlumno").textContent = m.alumno || "—";
    document.getElementById("secGradoActual").textContent = (m.grado || "") + " - " + (m.seccion || "");
    new bootstrap.Modal(document.getElementById("seccionModal")).show();
  }).catch(() => {
    showErrorAlert("Error al obtener datos");
  });
}

async function cargarSeccionesModal() {
  const grado = document.getElementById("secGrado").value;
  const block = document.getElementById("secSeccionBlock");
  const container = document.getElementById("secSecciones");
  document.getElementById("secSeccionSelected").value = "";
  if (!grado) { block.style.display = "none"; return; }
  const secciones = await apiFetch("/secciones");
  if (!secciones) return;
  const filtradas = secciones.filter(s => s.grado === grado && s.vacantes > 0);
  if (!filtradas.length) {
    container.innerHTML = '<span class="text-danger small">No hay vacantes disponibles en este grado.</span>';
    block.style.display = "block";
    return;
  }
  container.innerHTML = filtradas.map(s =>
    '<div class="sec-opt" data-id="' + s.id + '" onclick="seleccionarSeccion(this)">' + s.seccion + '<br><small class="text-muted">' + s.vacantes + ' vac</small></div>'
  ).join("");
  block.style.display = "block";
}

function seleccionarSeccion(el) {
  document.querySelectorAll(".sec-opt").forEach(o => o.classList.remove("selected"));
  el.classList.add("selected");
  document.getElementById("secSeccionSelected").value = el.dataset.id;
}

function guardarCambioSeccion() {
  const idSeccion = document.getElementById("secSeccionSelected").value;
  if (!idSeccion) { showErrorAlert("Selecciona una sección."); return; }
  apiFetch("/matriculas/" + seccionEditId + "/seccion", {
    method: "PUT",
    body: JSON.stringify({ idSeccion: parseInt(idSeccion) })
  }).then(() => {
    bootstrap.Modal.getInstance(document.getElementById("seccionModal")).hide();
    showSuccessAlert("Sección / grado actualizado correctamente.");
    cargarMatriculas();
  }).catch(() => {
    showErrorAlert("Error al actualizar sección");
  });
}

function anularMatricula() {
  if (!detailId) return;
  if (!confirm("¿Anular esta matrícula?")) return;
  apiFetch("/matriculas/" + detailId + "/estado", { method: "PUT", body: JSON.stringify({ estado: "RECHAZADA" }) }).then(() => {
    bootstrap.Modal.getInstance(document.getElementById("detailModal")).hide();
    cargarMatriculas();
  }).catch(() => {
    showErrorAlert("Error al anular matrícula");
  });
}

function confirmarEliminar(id) {
  deleteId = id;
  document.getElementById("confirmMsg").textContent = "¿Está seguro de eliminar esta matrícula?";
  document.getElementById("confirmBtn").onclick = async function () {
    const res = await apiFetch("/matriculas/" + deleteId, { method: "DELETE" });
    if (res && !res.error) {
      showSuccessAlert("Matrícula eliminada correctamente.");
      bootstrap.Modal.getInstance(document.getElementById("confirmModal")).hide();
      cargarMatriculas();
    } else {
      showErrorAlert(res?.error || "Error al eliminar");
    }
  };
  new bootstrap.Modal(document.getElementById("confirmModal")).show();
}

async function verHistorial(idMatricula, alumnoNombre, grado) {
  document.getElementById("histAlumno").textContent = alumnoNombre;
  document.getElementById("histGrado").textContent = grado;
  document.getElementById("histMatId").textContent = "#" + String(idMatricula).padStart(3, "0");
  document.getElementById("historialTimeline").innerHTML = '<div class="text-center text-muted py-4">Cargando...</div>';
  new bootstrap.Modal(document.getElementById("historialModal")).show();
  try {
    const data = await apiFetch("/historial/matricula/" + idMatricula);
    const container = document.getElementById("historialTimeline");
    if (data && data.length) {
      container.innerHTML = data.map(h => {
        const cls = (h.estadoNuevo || "").toLowerCase();
        const fecha = h.fechaCambio ? new Date(h.fechaCambio).toLocaleString("es-PE") : "-";
        return `<div class="timeline-item ${cls}">
          <div class="tl-fecha">${fecha}</div>
          <div><span class="tl-badge ${cls}">${h.estadoNuevo}</span></div>
          ${h.descripcion ? '<div class="tl-desc">' + h.descripcion + '</div>' : ''}
          <div class="tl-usuario"><i class="bi bi-person-fill me-1"></i>${h.usuario || "-"}</div>
        </div>`;
      }).join("");
    } else {
      container.innerHTML = '<div class="text-center text-muted py-4"><i class="bi bi-clock-history fs-1 d-block mb-2"></i>Sin historial de cambios</div>';
    }
  } catch (e) {
    document.getElementById("historialTimeline").innerHTML = '<div class="text-center text-danger py-4">Error al cargar historial</div>';
  }
}

cargarMatriculas();
