// matriculaAdmin.js — formulario de matrícula (admin): buscar apoderado, alumno nuevo o reinscripción
let tipoActual = null, padreOk = false, padreData = null, alumnoOk = false, alumnoData = null, selectedSeccionId = null;

fetch("/components/sidebar.html")
  .then(function (r) { return r.text(); })
  .then(function (html) {
    document.getElementById("sidebar-container").innerHTML = html;
    var s = document.createElement("script");
    s.src = "/js/sidebar.js";
    document.body.appendChild(s);
  });

function actualizarProgreso() {
  var section = document.getElementById('progressSection');
  if (!section) return;
  var fill = document.getElementById('progressFill');
  var caption = document.getElementById('progressCaption');

  var total = tipoActual === 'nuevo' ? 8 : 4;
  var ok = 0;

  if (padreOk) ok++;
  if (tipoActual === 'nuevo') {
    if (document.getElementById('an_nombre').value.trim()) ok++;
    if (document.getElementById('an_apellido').value.trim()) ok++;
    if (document.getElementById('an_dni').value.trim().length === 8) ok++;
    if (document.getElementById('an_fnac').value) ok++;
    if (document.querySelector('input[name="an_sexo"]:checked')) ok++;
    if (document.getElementById('m_grado').value) ok++;
    if (selectedSeccionId) ok++;
  } else {
    if (alumnoOk) ok++;
    if (document.getElementById('m_grado').value) ok++;
    if (selectedSeccionId) ok++;
  }

  section.classList.toggle('hidden', total === 0);
  fill.style.width = (ok / total * 100) + '%';
  caption.textContent = ok + ' de ' + total + ' campos completados';
}

document.addEventListener('click', function (e) {
  if (e.target.closest('.sex-opt') && document.querySelector('input[name="an_sexo"]')) {
    actualizarProgreso();
  }
});

function selTipo(tipo) {
  tipoActual = tipo; padreOk = false; padreData = null; alumnoOk = false; alumnoData = null; selectedSeccionId = null;
  document.getElementById('btnNuevo').classList.toggle('selected', tipo === 'nuevo');
  document.getElementById('btnReinscrito').classList.toggle('selected', tipo === 'reinscrito');

  ['padreFound', 'padreError'].forEach(function (id) { document.getElementById(id).classList.add('hidden'); });
  document.getElementById('padreData').classList.add('hidden');
  document.getElementById('p_dni').value = '';
  document.getElementById('bloquePadre').classList.remove('hidden');

  ['bloqueAlumnoNuevo', 'bloqueAlumnoReinscrito', 'bloqueMatricula'].forEach(function (id) {
    document.getElementById(id).classList.add('hidden');
  });
  document.getElementById('res-tipo').textContent = tipo === 'nuevo' ? 'Alumno nuevo' : 'Reinscripción';
  actualizarProgreso();
}

async function buscarPadre() {
  var dni = document.getElementById('p_dni').value.trim();
  ['padreFound', 'padreError'].forEach(function (id) { document.getElementById(id).classList.add('hidden'); });
  document.getElementById('padreData').classList.add('hidden');
  ['bloqueAlumnoNuevo', 'bloqueAlumnoReinscrito', 'bloqueMatricula'].forEach(function (id) {
    document.getElementById(id).classList.add('hidden');
  });
  padreOk = false; alumnoOk = false; selectedSeccionId = null;

  if (dni.length !== 8) { showErrorAlert('Ingresa un DNI válido de 8 dígitos.'); return; }

  var data = await apiFetch("/apoderados/dni/" + dni);
  if (!data || data.error) {
    document.getElementById('pErrorMsg').textContent = (data && data.error) || 'No se encontró ningún apoderado con ese DNI registrado.';
    document.getElementById('padreError').classList.remove('hidden');
    return;
  }

  var nombreCompleto = (data.nombre || '') + ' ' + (data.apellido || '');
  var ini = nombreCompleto.split(' ').map(function (w) { return w[0]; }).slice(0, 2).join('');
  document.getElementById('pAvatar').textContent = ini;
  document.getElementById('pNombre').textContent = nombreCompleto;
  document.getElementById('pDetalle').textContent = 'DNI: ' + dni + ' · ' + data.parentesco + ' · ' + (data.telefono || data.tel || '');
  document.getElementById('padreFound').classList.remove('hidden');

  document.getElementById('p_nombre_ro').value = nombreCompleto;
  document.getElementById('p_dni_ro').value = dni;
  document.getElementById('p_parentesco_ro').value = data.parentesco;
  document.getElementById('p_tel_ro').value = data.telefono || data.tel || '';
  document.getElementById('p_dir_ro').value = data.direccion || data.dir || '';
  document.getElementById('padreData').classList.remove('hidden');

  document.getElementById('res-padre').textContent = (data.nombre || '') + ' ' + (data.apellido || '');

  try {
    var hijos = await apiFetch("/apoderados/" + data.idApoderado + "/hijos");
    var hijosContainer = document.getElementById('padreHijos');
    var hijosList = document.getElementById('padreHijosList');
    if (hijos && hijos.length) {
      hijosList.innerHTML = hijos.map(function(h) {
        var estado = h.idMatricula ? '<span class="badge ' + badgeEstado(h.estado) + ' rounded-pill" style="font-size:.7rem;">' + (h.estado || 'Matriculado') + '</span>' : '<span class="badge bg-secondary rounded-pill" style="font-size:.7rem;">Sin matrícula</span>';
        return '<div class="d-flex justify-content-between align-items-center py-1 border-bottom border-light">' +
          '<span class="fw-medium">' + (h.nombre || '') + ' ' + (h.apellido || '') + '</span>' +
          '<span><small class="text-muted me-2">DNI: ' + (h.dni || '') + '</small>' + estado + '</span>' +
          '</div>';
      }).join('');
      hijosContainer.classList.remove('hidden');
    } else {
      hijosList.innerHTML = '<span class="text-muted small">No tiene hijos registrados.</span>';
      hijosContainer.classList.remove('hidden');
    }
  } catch (e) {
    console.error("Error cargando hijos:", e);
  }
  document.getElementById('res-pdni').textContent = dni;
  document.getElementById('res-parentesco').textContent = data.parentesco;
  padreOk = true;
  padreData = data;

  if (tipoActual === 'nuevo') {
    document.getElementById('bloqueAlumnoNuevo').classList.remove('hidden');
    document.getElementById('bloqueMatricula').classList.remove('hidden');
    document.getElementById('res-alumno').textContent = '(completa los datos del alumno)';
  } else {
    document.getElementById('bloqueAlumnoReinscrito').classList.remove('hidden');
    ['alumnoFound', 'alumnoError'].forEach(function (id) { document.getElementById(id).classList.add('hidden'); });
    document.getElementById('ar_dni').value = '';
  }
  actualizarProgreso();
}

async function buscarAlumno() {
  var dni = document.getElementById('ar_dni').value.trim();
  ['alumnoFound', 'alumnoError'].forEach(function (id) { document.getElementById(id).classList.add('hidden'); });
  document.getElementById('bloqueMatricula').classList.add('hidden');
  alumnoOk = false;

  if (dni.length !== 8) { showErrorAlert('Ingresa un DNI de 8 dígitos.'); return; }

  var data = await apiFetch("/alumnos/dni/" + dni);
  if (!data || data.error) {
    document.getElementById('aErrorMsg').textContent = (data && data.error) || 'No se encontró ningún alumno con ese DNI en el sistema.';
    document.getElementById('alumnoError').classList.remove('hidden');
    return;
  }

  if (data.matriculado) {
    if (data.estadoMatricula === 'RECHAZADA') {
      document.getElementById('aErrorMsg').textContent = 'El alumno fue rechazado previamente. Puede cambiar su estado a PENDIENTE desde Gestión de Matrículas.';
      document.getElementById('alumnoError').classList.remove('hidden');
      return;
    }
    const msgs = {
      PENDIENTE: 'Este alumno ya tiene una matrícula en proceso de aprobación.',
      APROBADA: 'Este alumno ya tiene una matrícula activa para el periodo 2026.',
    };
    document.getElementById('aErrorMsg').textContent = msgs[data.estadoMatricula] || 'El alumno ya está matriculado.';
    document.getElementById('alumnoError').classList.remove('hidden');
    return;
  }

  var nombreCompleto = (data.nombre || '') + ' ' + (data.apellido || '');
  var ini = nombreCompleto.split(' ').map(function (w) { return w[0]; }).slice(0, 2).join('');
  document.getElementById('aAvatar').textContent = ini;
  document.getElementById('aNombre').textContent = nombreCompleto;
  document.getElementById('aDetalle').textContent = 'DNI: ' + dni + ' · Nac: ' + (data.fechaNacimiento ? new Date(data.fechaNacimiento).toISOString().split("T")[0] : '');
  document.getElementById('alumnoFound').classList.remove('hidden');
  document.getElementById('res-alumno').textContent = nombreCompleto;
  alumnoOk = true;
  alumnoData = data;
  document.getElementById('bloqueMatricula').classList.remove('hidden');
  actualizarProgreso();
}

async function cargarSecciones() {
  var grado = document.getElementById('m_grado').value;
  var block = document.getElementById('seccionBlock');
  selectedSeccionId = null;

  if (!grado) {
    block.classList.add('hidden');
    return;
  }

  block.classList.remove('hidden');
  actualizarProgreso();

  var secciones = await apiFetch("/secciones?grado=" + encodeURIComponent(grado));
  var grid = document.getElementById('seccionGrid');
  if (!secciones || !secciones.length) {
    grid.innerHTML = '<span class="text-muted small">No hay secciones disponibles para este grado.</span>';
    return;
  }

  grid.innerHTML = secciones.map(function(s) {
    var lleno = s.vacantes <= 0;
    return '<div class="seccion-btn border rounded-3 px-3 py-2 text-center ' + (lleno ? 'seccion-llena' : 'bg-white') + '" ' +
           'data-id="' + s.id + '" data-lleno="' + lleno + '" ' +
           'onclick="' + (lleno ? '' : 'seleccionarSeccion(this)') + '" ' +
           'style="cursor:' + (lleno ? 'not-allowed' : 'pointer') + ';min-width:80px;' + (lleno ? 'opacity:0.4;' : '') + '">' +
      '<div class="fw-bold" style="color:#0a1628;font-size:1rem;">' + s.seccion + '</div>' +
      '<small class="' + (lleno ? 'text-danger' : 'text-success') + '">' + s.vacantes + ' vacante' + (s.vacantes !== 1 ? 's' : '') + '</small>' +
    '</div>';
  }).join('');
}

function seleccionarSeccion(el) {
  document.querySelectorAll('#seccionGrid .seccion-btn').forEach(function(b) {
    b.classList.remove('selected');
    b.style.borderColor = '';
  });
  el.classList.add('selected');
  el.style.borderColor = '#d4a017';
  selectedSeccionId = el.dataset.id;
  document.getElementById('res-sec').textContent = document.getElementById('m_grado').value + ' - ' + el.querySelector('.fw-bold').textContent;
  actualizarProgreso();
}

function actualizarResumen() {
  document.getElementById('res-grado').textContent = document.getElementById('m_grado').value || '—';
  if (tipoActual === 'nuevo') {
    var n = (document.getElementById('an_nombre').value + ' ' + document.getElementById('an_apellido').value).trim();
    document.getElementById('res-alumno').textContent = n || '(completa los datos del alumno)';
  }
}

async function confirmar() {
  if (!padreOk) { showErrorAlert('Busca y verifica al apoderado primero.'); return; }

  var alumnoId = null;

  if (tipoActual === 'nuevo') {
    if (!document.getElementById('an_nombre').value.trim() ||
      !document.getElementById('an_apellido').value.trim() ||
      !document.getElementById('an_dni').value.trim() ||
      document.getElementById('an_dni').value.trim().length !== 8 ||
      !document.getElementById('an_fnac').value ||
      !document.querySelector('input[name="an_sexo"]:checked')) {
      showErrorAlert('Completa todos los datos obligatorios del alumno, incluido el DNI (8 dígitos).'); return;
    }

    var dni = document.getElementById('an_dni').value.trim();

    var dup = await apiFetch("/alumnos/duplicado/" + dni);
    if (dup && dup.existe) {
      showErrorAlert('Ya existe un alumno registrado con ese DNI en el sistema.'); return;
    }

    var payload = {
      idApoderado: padreData ? padreData.idApoderado : null,
      nombre: document.getElementById('an_nombre').value.trim(),
      apellido: document.getElementById('an_apellido').value.trim(),
      dni: dni,
      fechaNacimiento: document.getElementById('an_fnac').value,
      genero: document.querySelector('input[name="an_sexo"]:checked').value
    };

    var nuevo = await apiFetch("/alumnos", { method: "POST", body: JSON.stringify(payload) });
    if (!nuevo || nuevo.error) { showErrorAlert(nuevo?.error || 'Error al registrar el alumno. Intenta de nuevo.'); return; }
    alumnoId = nuevo.idAlumno;
  }

  if (tipoActual === 'reinscrito' && !alumnoOk) { showErrorAlert('Busca y verifica al alumno.'); return; }

  if (!document.getElementById('m_grado').value) { showErrorAlert('Selecciona el grado.'); return; }
  if (!selectedSeccionId) { showErrorAlert('Selecciona una sección.'); return; }

  var matriculaPayload = {
    idAlumno: tipoActual === 'nuevo' ? alumnoId : (alumnoData ? alumnoData.idAlumno : null),
    grado: document.getElementById('m_grado').value,
    idSeccion: selectedSeccionId
  };

  var result = await apiFetch("/matriculas", { method: "POST", body: JSON.stringify(matriculaPayload) });
  if (!result || result.error) {
    showErrorAlert(result?.error || 'Error al registrar la matrícula. Intenta de nuevo.');
    return;
  }

  showSuccessAlert('Matrícula registrada correctamente. Estado: Pendiente de aprobación.');
  setTimeout(function () { window.location.href = '/pages/gestionMatriculas.html'; }, 2000);
}
