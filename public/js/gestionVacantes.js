// gestionVacantes.js — visualizar y editar vacantes por sección con indicadores de nivel
let currentEditId = null;

function getLevel(ocupadas, total) {
  const pct = total > 0 ? ocupadas / total : 0;
  if (pct >= 0.9) return { cls: "critico", badge: "badge-critico", label: "Crítico", color: "#e74c3c" };
  if (pct >= 0.7) return { cls: "bajo", badge: "badge-bajo", label: "Bajo", color: "var(--gold)" };
  return { cls: "ok", badge: "badge-ok", label: "OK", color: "#27ae60" };
}

function openEdit(id, grado, sec, ocu, total) {
  currentEditId = id;
  document.getElementById("editId").value = id;
  document.getElementById("editGrado").value = grado;
  document.getElementById("editSec").value = sec;
  document.getElementById("editOcu").value = ocu;
  document.getElementById("editTotal").value = total;
  document.getElementById("editTitle").textContent = `Editar Vacantes – ${grado} Sección ${sec}`;
  new bootstrap.Modal(document.getElementById("editModal")).show();
}

async function saveEdit() {
  const ocu = parseInt(document.getElementById("editOcu").value);
  const total = parseInt(document.getElementById("editTotal").value);
  if (total < ocu) {
    showErrorAlert("El total no puede ser menor a las matrículas registradas.");
    return;
  }
  const id = currentEditId;
  const res = await apiFetch("/secciones/" + id + "/vacantes", {
    method: "PUT",
    body: JSON.stringify({ vacantes: total })
  });
  if (res && !res.error) {
    bootstrap.Modal.getInstance(document.getElementById("editModal")).hide();
    showSuccessAlert("Vacantes actualizadas correctamente.");
    cargarSecciones();
  } else {
    showErrorAlert(res?.error || "Error al actualizar vacantes.");
  }
}

async function cargarTotales() {
  const totals = await apiFetch("/secciones/totales");
  if (totals) {
    document.getElementById("totalVacantes").textContent = totals.total_vacantes || 0;
    document.getElementById("disponibles").textContent = totals.disponibles || 0;
    document.getElementById("ocupadas").textContent = totals.ocupadas || 0;
    document.getElementById("criticas").textContent = totals.criticas || 0;
  }
}

async function cargarSecciones() {
  const secciones = await apiFetch("/secciones");
  if (!secciones || !secciones.length) {
    document.getElementById("gradosContainer").innerHTML =
      '<p class="text-muted text-center py-4">No se encontraron secciones.</p>';
    return;
  }

  const grupos = {};
  secciones.forEach(sec => {
    const g = sec.grado;
    if (!grupos[g]) grupos[g] = [];
    grupos[g].push(sec);
  });

  const container = document.getElementById("gradosContainer");
  container.innerHTML = "";

  const orden = Object.keys(grupos).sort((a, b) => {
    const n = s => parseInt(s.match(/\d+/)?.[0] || 0);
    return n(a) - n(b);
  });

  orden.forEach(grado => {
    const items = grupos[grado];
    const totalCupos = items.reduce((s, i) => s + i.capacidad, 0);
    const totalOcu = items.reduce((s, i) => s + i.ocupadas, 0);

    let headerBadge, headerBadgeClass;
    const algunCritico = items.some(i => i.capacidad > 0 && i.ocupadas / i.capacidad >= 0.9);
    const algunBajo = items.some(i => i.capacidad > 0 && i.ocupadas / i.capacidad >= 0.7 && i.ocupadas / i.capacidad < 0.9);
    if (algunCritico || algunBajo) {
      headerBadge = "Baja disponibilidad";
      headerBadgeClass = "bg-warning bg-opacity-25 text-warning border border-warning border-opacity-25";
    } else {
      headerBadge = "Disponible";
      headerBadgeClass = "bg-success bg-opacity-25 text-success border border-success border-opacity-25";
    }

    let html = '<div class="grado-section">';
    html += `<div class="grado-header">
      <div><h6>${grado}</h6><small>${items.length} secciones · ${totalCupos} cupos total</small></div>
      <span class="badge ${headerBadgeClass}" style="font-size:.75rem">${headerBadge}</span>
    </div>`;
    html += '<div class="secciones-grid">';

    items.forEach(sec => {
      const lvl = getLevel(sec.ocupadas, sec.capacidad);
      const pct = sec.capacidad > 0 ? Math.round((sec.ocupadas / sec.capacidad) * 100) : 0;
      html += `<div class="sec-card ${lvl.cls}">
        <span class="badge-nivel ${lvl.badge}">${lvl.label}</span>
        <div class="sec-letter">${sec.seccion}</div>
        <div class="sec-label">Sección</div>
        <div class="vacante-bar">
          <div class="vacante-fill" style="width:${pct}%;background:${lvl.color}"></div>
        </div>
        <div class="sec-nums">
          <span class="ocu">${sec.ocupadas} ocupadas</span><span class="tot">${sec.total} disponible</span>
        </div>
        <button class="sec-edit-btn" onclick="openEdit('${sec.id}','${grado}','${sec.seccion}',${sec.ocupadas},${sec.capacidad})">
          <i class="bi bi-pencil"></i>Editar
        </button>
      </div>`;
    });

    html += '</div></div>';
    container.innerHTML += html;
  });
}

cargarTotales();
cargarSecciones();

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
    document.getElementById("topbarTitle").textContent = "Gestión de Vacantes";
  });
