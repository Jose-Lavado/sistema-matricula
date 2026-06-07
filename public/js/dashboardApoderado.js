// dashboardApoderado.js — panel del apoderado: ver hijos y estado de matrículas
fetch("/components/sidebar.html")
  .then(r => r.text())
  .then(html => {
    document.getElementById("sidebar-container").innerHTML = html;
    const s = document.createElement("script");
    s.src = "/js/sidebar.js";
    document.body.appendChild(s);
  });

function verDetalleHijo(idMatricula) {
  if (!idMatricula) { showErrorAlert("Este alumno aún no tiene matrícula."); return; }
  apiFetch("/matriculas/" + idMatricula).then(m => {
    document.getElementById("detNumero").textContent = "#" + String(m.id).padStart(3, "0");
    document.getElementById("detAlumno").textContent = m.alumno || "-";
    document.getElementById("detDni").textContent = m.dni_alumno || "-";
    document.getElementById("detEdad").textContent = calcularEdad(m.fechaNacimiento);
    document.getElementById("detApoderado").textContent = m.apoderado || "-";
    document.getElementById("detGrado").textContent = m.estado === "APROBADA" ? (m.grado || "") + (m.seccion ? " " + m.seccion : "") : "Pendiente";
    document.getElementById("detFecha").textContent = formatearFecha(m.fecha);
    let badgeClass = badgeEstado(m.estado), txt = m.estado || "-";
    document.getElementById("detEstado").innerHTML = '<span class="badge ' + badgeClass + '">' + txt + "</span>";
    new bootstrap.Modal(document.getElementById("detailModal")).show();
  }).catch(() => {
    showErrorAlert("Error al obtener detalle de matrícula");
  });
}

async function abrirModalHijos() {
  try {
    const body = document.getElementById("hijosModalBody");
    body.innerHTML = '<p class="text-muted">Cargando...</p>';
    const [perfil, hijos] = await Promise.all([
      apiFetch("/apoderados/perfil"),
      apiFetch("/apoderados/todos-hijos")
    ]);
    if (!hijos || hijos.length === 0) {
      body.innerHTML = '<p class="text-muted mb-0">No tienes hijos registrados.</p>';
    } else {
      body.innerHTML = hijos.map(h => {
        const estadoBadge = badgeEstado(h.estado);
        const seccionStr = h.estado === "APROBADA" && h.grado ? `${h.grado} – ${h.seccion || ""}` : "—";
        const edad = calcularEdad(h.fechaNacimiento);
        const fechaStr = formatearFecha(h.fechaRegistro);
        const numMatricula = h.idMatricula ? "#" + String(h.idMatricula).padStart(3, "0") : "—";
        return `
          <div class="hijo-card mb-2">
            <div class="d-flex justify-content-between align-items-start">
              <div>
                <b>${h.nombre} ${h.apellido}</b><br/>
                <small class="text-muted">DNI: ${h.dni || "—"} | ${edad} | ${seccionStr} | ${fechaStr}</small>
              </div>
              <div class="text-end">
                <div class="text-muted small">${numMatricula}</div>
                <span class="badge ${estadoBadge}">${h.estado || "Sin matrícula"}</span>
              </div>
            </div>
          </div>
        `;
      }).join("");
    }
    new bootstrap.Modal(document.getElementById("hijosModal")).show();
  } catch (e) {
    console.error("Error cargando hijos:", e);
    showErrorAlert("Error al cargar los datos de tus hijos.");
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const user = JSON.parse(sessionStorage.getItem("user") || "{}");
  const el = document.getElementById("topbarUserName");
  if (el && user.name) {
    el.textContent = user.name.split(" ")[0];
  }

  const greeting = document.getElementById("welcomeGreeting");
  if (greeting) {
    if (user.parentesco === "MADRE") {
      greeting.textContent = "Bienvenida";
    } else if (user.parentesco === "PADRE") {
      greeting.textContent = "Bienvenido";
    } else {
      greeting.textContent = "Bienvenido/a";
    }
  }

  cargarHijos();
  setInterval(cargarHijos, 3000);
});

async function cargarHijos() {
  try {
    const hijos = await apiFetch("/apoderados/hijos");
    const container = document.getElementById("hijosContainer");
    if (container) {
      if (!hijos || hijos.length === 0) {
        container.innerHTML = '<p class="text-muted small mb-0">No tienes hijos matriculados aún.</p>';
      } else {
        container.innerHTML = hijos.map(h => {
          const estadoBadge = badgeEstado(h.estado);
          const seccionStr = h.estado === "APROBADA" && h.grado ? `${h.grado} – ${h.seccion || ""}` : "—";
          const fechaStr = formatearFecha(h.fechaRegistro);
          return `
            <div class="hijo-card mb-2">
              <div class="d-flex justify-content-between align-items-start">
                <div>
                  <b>${h.nombre} ${h.apellido}</b><br/>
                  <small class="text-muted">DNI: ${h.dni || "—"} | ${seccionStr}</small>
                </div>
                <div class="text-end">
                  <div class="d-flex align-items-center gap-2 justify-content-end">
                    <span class="badge ${estadoBadge}">${h.estado}</span>
                  </div>
                  ${fechaStr ? `<small class="text-muted d-block mt-1">Registrado: ${fechaStr}</small>` : ""}
                </div>
              </div>
            </div>
          `;
        }).join("");
      }
    }
  } catch (e) {
    console.error("Error cargando hijos:", e);
    showErrorAlert("Error al cargar los datos de tus hijos.");
  }
}
