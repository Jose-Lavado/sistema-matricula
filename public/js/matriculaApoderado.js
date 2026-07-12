// matriculaApoderado.js — formulario de matrícula (apoderado): alumno nuevo o reinscripción
let tipoActual = null;
let alumnoOk = false;
let alumnoIdReinscripcion = null;
let apoderadoData = null;

fetch("/components/sidebar.html")
  .then(r => r.text())
  .then(html => {
    document.getElementById("sidebar-container").innerHTML = html;
    const s = document.createElement("script");
    s.src = "/js/sidebar.js";
    document.body.appendChild(s);
  });

document.addEventListener("DOMContentLoaded", async () => {
  const user = JSON.parse(sessionStorage.getItem("user") || "{}");
  if (user) {
    try {
      const data = await apiFetch("/apoderados/perfil");
      if (data && !data.error) {
        apoderadoData = data;
        renderApoderado(data);
      } else {
        renderApoderado({ nombre: user.name || "&mdash;", documento: user.documento || "&mdash;", parentesco: user.parentesco || "&mdash;", telefono: user.telefono || "&mdash;" });
      }
    } catch (e) {
      renderApoderado({ nombre: user.name || "&mdash;", documento: user.documento || "&mdash;", parentesco: user.parentesco || "&mdash;", telefono: user.telefono || "&mdash;" });
    }
  }
});

function renderApoderado(data) {
  apoderadoData = data;
  var nombreCompleto = (data.nombre || "") + " " + (data.apellido || "");
  document.getElementById("apoderadoContainer").innerHTML = `
    <div class="row g-2">
      <div class="col-sm-6">
        <small class="text-muted d-block">Apoderado</small>
        <span class="fw-semibold">${nombreCompleto.trim() || "—"}</span>
      </div>
      <div class="col-sm-3">
        <small class="text-muted d-block">Parentesco</small>
        <span class="fw-semibold">${data.parentesco || "—"}</span>
      </div>
      <div class="col-sm-3">
        <small class="text-muted d-block">DNI</small>
        <span class="fw-semibold">${data.dni || "—"}</span>
      </div>
      <div class="col-sm-6">
        <small class="text-muted d-block">Teléfono</small>
        <span class="fw-semibold">${data.telefono || "—"}</span>
      </div>
    </div>
  `;
  document.getElementById("res-apoderado").textContent = nombreCompleto.trim() || "—";
  document.getElementById("res-dni-apoderado").textContent = data.dni || "—";
  document.getElementById("res-parentesco").textContent = data.parentesco || "—";
}

function actualizarProgreso() {
  var section = document.getElementById('progressSection');
  if (!section) return;
  var fill = document.getElementById('progressFill');
  var caption = document.getElementById('progressCaption');

  var total = tipoActual === 'nuevo' ? 6 : 2;
  var ok = 0;

  if (tipoActual === 'nuevo') {
    if (document.getElementById('n_nombre').value.trim()) ok++;
    if (document.getElementById('n_apellido').value.trim()) ok++;
    if (document.getElementById('n_dni').value.trim().length === 8) ok++;
    if (document.getElementById('n_fnac').value) ok++;
    if (document.querySelector('input[name="n_sexo"]:checked')) ok++;
    if (document.getElementById('m_grado').value) ok++;
  } else {
    if (alumnoOk) ok++;
    if (document.getElementById('m_grado').value) ok++;
  }

  section.classList.toggle('hidden', total === 0);
  fill.style.width = (ok / total * 100) + '%';
  caption.textContent = ok + ' de ' + total + ' campos completados';
}

document.addEventListener('click', function (e) {
  if (e.target.closest('.sex-opt') && document.querySelector('input[name="n_sexo"]')) {
    actualizarProgreso();
  }
});

function selTipo(tipo) {
  tipoActual = tipo;
  document.getElementById("btnNuevo").classList.toggle("selected", tipo === "nuevo");
  document.getElementById("btnReinscrito").classList.toggle("selected", tipo === "reinscrito");
  document.getElementById("bloqueNuevo").classList.toggle("hidden", tipo !== "nuevo");
  document.getElementById("bloqueReinscrito").classList.toggle("hidden", tipo !== "reinscrito");

  if (tipo === "nuevo") {
    alumnoOk = false;
    alumnoIdReinscripcion = null;
    document.getElementById("bloquePadre").classList.remove("hidden");
    document.getElementById("bloqueMatricula").classList.remove("hidden");
    document.getElementById("res-tipo").textContent = "Alumno nuevo";
    document.getElementById("res-alumno").textContent = "(completa los datos del alumno)";
  } else {
    document.getElementById("bloquePadre").classList.add("hidden");
    document.getElementById("bloqueMatricula").classList.add("hidden");
    document.getElementById("alumnoFound").classList.add("hidden");
    document.getElementById("alumnoError").classList.add("hidden");
    alumnoOk = false;
    alumnoIdReinscripcion = null;
  }
  actualizarProgreso();
}

async function buscarAlumno() {
  const dni = document.getElementById("r_dni").value.trim();
  document.getElementById("alumnoFound").classList.add("hidden");
  document.getElementById("alumnoError").classList.add("hidden");
  document.getElementById("bloquePadre").classList.add("hidden");
  document.getElementById("bloqueMatricula").classList.add("hidden");
  alumnoOk = false;
  alumnoIdReinscripcion = null;

  if (dni.length !== 8) { showErrorAlert("Ingresa un DNI válido de 8 dígitos."); return; }

  const data = await apiFetch("/alumnos/buscar?dni=" + dni);
  const errMsg = document.getElementById("errorMsg");

  if (!data || data.error) {
    errMsg.textContent = data?.error || "No se encontró ningún alumno con ese DNI en el sistema.";
    document.getElementById("alumnoError").classList.remove("hidden");
    return;
  }
  if (data.matriculado) {
    if (data.estadoMatricula === "RECHAZADA") {
      errMsg.textContent = "Este alumno fue rechazado previamente. Se notificó al administrador para revisión.";
      document.getElementById("alumnoError").classList.remove("hidden");
      apiFetch("/matriculas/solicitar-revision", {
        method: "POST",
        body: JSON.stringify({ idAlumno: data.idAlumno }),
      }).catch(() => {});
      return;
    }
    const msgs = {
      PENDIENTE: "Este alumno ya tiene una matrícula en proceso de aprobación.",
      APROBADA: "Este alumno ya cuenta con una matrícula activa para el periodo 2026.",
    };
    errMsg.textContent = msgs[data.estadoMatricula] || "El alumno ya está matriculado.";
    document.getElementById("alumnoError").classList.remove("hidden");
    return;
  }

  alumnoIdReinscripcion = data.idAlumno || data.id || data._id;

  const iniciales = (data.nombre + " " + (data.apellido || "")).split(" ").map(w => w[0]).slice(0, 2).join("");
  document.getElementById("afAvatar").textContent = iniciales;
  document.getElementById("afNombre").textContent = data.nombre + " " + (data.apellido || "");
  document.getElementById("afDetalle").textContent = "DNI: " + dni + " · Nac: " + (data.fechaNacimiento ? new Date(data.fechaNacimiento).toISOString().split("T")[0] : "—");
  document.getElementById("alumnoFound").classList.remove("hidden");

  document.getElementById("res-tipo").textContent = "Reinscripción";
  document.getElementById("res-alumno").textContent = data.nombre + " " + (data.apellido || "");
  document.getElementById("bloquePadre").classList.remove("hidden");
  document.getElementById("bloqueMatricula").classList.remove("hidden");
  alumnoOk = true;
  actualizarProgreso();
}

function actualizarResumen() {
  const g = document.getElementById("m_grado").value;
  document.getElementById("res-grado").textContent = g || "—";
  if (tipoActual === "nuevo") {
    const n = (document.getElementById("n_nombre").value + " " + document.getElementById("n_apellido").value).trim();
    document.getElementById("res-alumno").textContent = n || "(completa los datos del alumno)";
  }
}

async function confirmarMatricula() {
  if (!tipoActual) { showErrorAlert("Selecciona el tipo de matrícula."); return; }

  let alumnoId = null;

  if (tipoActual === "nuevo") {
    const nombre = document.getElementById("n_nombre").value.trim();
    const apellido = document.getElementById("n_apellido").value.trim();
    const fnac = document.getElementById("n_fnac").value;
    const dni = document.getElementById("n_dni").value.trim();
    const sexo = document.querySelector("input[name=n_sexo]:checked");

    if (!nombre || !apellido || !dni || dni.length !== 8 || !fnac) {
      showErrorAlert("Completa todos los datos obligatorios del alumno, incluido el DNI (8 dígitos).");
      return;
    }
    if (!sexo) {
      showErrorAlert("Selecciona el género del alumno.");
      return;
    }

    const dup = await apiFetch("/alumnos/duplicado/" + dni);
    if (dup && dup.existe) {
      showErrorAlert("El DNI " + dni + " ya está registrado en el sistema.");
      return;
    }

    const payload = { idApoderado: apoderadoData?.idApoderado, nombre, apellido, dni, fechaNacimiento: fnac, genero: sexo.value };
    const creado = await apiFetch("/alumnos", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (!creado || creado.error) {
      showErrorAlert(creado?.error || "Error al crear el alumno. Intenta de nuevo.");
      return;
    }
    alumnoId = creado.idAlumno;
  }

  if (tipoActual === "reinscrito") {
    if (!alumnoOk || !alumnoIdReinscripcion) {
      showErrorAlert("Busca y verifica al alumno primero.");
      return;
    }
    alumnoId = alumnoIdReinscripcion;
  }

  const grado = document.getElementById("m_grado").value;
  if (!grado) { showErrorAlert("Selecciona el grado."); return; }

  const solicitud = {
    tipo: tipoActual === "nuevo" ? "nuevo" : "reinscripcion",
    alumno_id: alumnoId,
    grado: grado,
  };

  const result = await apiFetch("/apoderados/solicitar-matricula", {
    method: "POST",
    body: JSON.stringify(solicitud),
  });

  if (result && !result.error) {
    showSuccessAlert("Solicitud de matrícula enviada correctamente. Estado: Pendiente de aprobación.");
    setTimeout(() => { window.location.href = "/pages/dashboardApoderado.html"; }, 2000);
  } else {
    showErrorAlert("Error al registrar la matrícula: " + (result?.error || "sin respuesta"));
  }
}
