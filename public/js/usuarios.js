// usuarios.js — CRUD de usuarios (admin): listar, crear, editar, eliminar con paginación
let modoModal = 'nuevo';
let filaActual = null;
const PAGE_SIZE = 10;

function validarPassword(pass) {
  const faltan = [];
  if (pass.length < 8) faltan.push("mínimo 8 caracteres");
  if (!/[a-z]/.test(pass)) faltan.push("una minúscula");
  if (!/[A-Z]/.test(pass)) faltan.push("una mayúscula");
  if (!/[0-9]/.test(pass)) faltan.push("un número");
  if (!/[^A-Za-z0-9]/.test(pass)) faltan.push("un carácter especial");
  return faltan;
}

function actualizarRequisitosPass(val) {
  const reqs = [
    { id: 'req-len',     test: val.length >= 8 },
    { id: 'req-lower',   test: /[a-z]/.test(val) },
    { id: 'req-upper',   test: /[A-Z]/.test(val) },
    { id: 'req-num',     test: /[0-9]/.test(val) },
    { id: 'req-special', test: /[^A-Za-z0-9]/.test(val) },
  ];
  reqs.forEach(r => {
    const el = document.getElementById(r.id);
    if (el) {
      el.querySelector('i').className = r.test ? 'bi bi-check-circle-fill text-success' : 'bi bi-circle text-muted';
      el.style.color = r.test ? '#1e8a49' : '';
    }
  });
}
let paginaActual = 1;
let totalPaginas = 1;
let usuariosCache = [];

fetch("/components/sidebar.html")
  .then(r => r.text())
  .then(html => {
    document.getElementById("sidebar-container").innerHTML = html;
    const s = document.createElement("script");
    s.src = "/js/sidebar.js";
    document.body.appendChild(s);
  });

async function cargarUsuarios(pagina) {
  try {
    const data = await apiFetch("/usuarios");
    if (!data) return;
    usuariosCache = Array.isArray(data) ? data : [];
    paginaActual = pagina || 1;
    totalPaginas = Math.max(1, Math.ceil(usuariosCache.length / PAGE_SIZE));
    if (paginaActual > totalPaginas) paginaActual = totalPaginas;
    renderTabla();
  } catch (e) {
    console.error("Error cargando usuarios:", e);
    document.getElementById("tbodyUsuarios").innerHTML =
      '<tr><td class="ps-4 text-muted" colspan="6">Error al cargar usuarios.</td></tr>';
  }
}

function renderTabla() {
  const tbody = document.getElementById("tbodyUsuarios");
  const inicio = (paginaActual - 1) * PAGE_SIZE;
  const fin = inicio + PAGE_SIZE;
  const pagina = usuariosCache.slice(inicio, fin);

  if (!pagina.length) {
    tbody.innerHTML = '<tr><td class="ps-4 text-muted" colspan="6">No hay usuarios registrados.</td></tr>';
  } else {
    tbody.innerHTML = pagina.map((u, i) => {
      const num = String(u.id || inicio + i + 1).padStart(3, "0");
      const nombreCompleto = [u.apellido, u.nombre].filter(Boolean).join(", ");
      const badgeClass = u.rol && u.rol.toUpperCase() === "ADMIN" ? "text-bg-dark" : "text-bg-warning";
      return `
        <tr data-id="${u.id}">
          <td class="ps-4 text-muted">${num}</td>
          <td class="fw-medium">${nombreCompleto}</td>
          <td>${u.dni || "—"}</td>
          <td class="text-muted">${u.correo || "—"}</td>
          <td><span class="badge ${badgeClass} px-3">${u.rol || "—"}</span></td>
          <td>
            <div class="d-flex gap-2">
              <button class="btn btn-sm btn-outline-secondary" title="Ver"
                onclick="abrirModal('ver', this)"><i class="bi bi-eye"></i></button>
              <button class="btn btn-sm btn-outline-primary" title="Editar"
                onclick="abrirModal('editar', this)"><i class="bi bi-pencil-square"></i></button>
              <button class="btn btn-sm btn-outline-danger" title="Eliminar"
                onclick="confirmarEliminar(this)"><i class="bi bi-trash"></i></button>
            </div>
          </td>
        </tr>
      `;
    }).join("");
  }

  actualizarContador();
  renderPaginacion();
}

function renderPaginacion() {
  document.getElementById("pageInfo").textContent =
    `Página ${paginaActual} de ${totalPaginas}`;

  const ul = document.getElementById("pagination");
  let html = "";

  const prevDisabled = paginaActual <= 1;
  html += `<li class="page-item ${prevDisabled ? "disabled" : ""}">
    <a class="page-link text-dark bg-light border-secondary-subtle" ${prevDisabled ? "" : 'onclick="irPagina(' + (paginaActual - 1) + ')"'}>«</a>
  </li>`;

  for (let p = 1; p <= totalPaginas; p++) {
    const active = p === paginaActual;
    html += `<li class="page-item ${active ? "active" : ""}">
      <a class="page-link ${active ? "bg-dark border-dark" : "text-dark bg-light border-secondary-subtle"}" ${active ? "" : 'onclick="irPagina(' + p + ')"'}>${p}</a>
    </li>`;
  }

  const nextDisabled = paginaActual >= totalPaginas;
  html += `<li class="page-item ${nextDisabled ? "disabled" : ""}">
    <a class="page-link text-dark bg-light border-secondary-subtle" ${nextDisabled ? "" : 'onclick="irPagina(' + (paginaActual + 1) + ')"'}>»</a>
  </li>`;

  ul.innerHTML = html;
}

function irPagina(pag) {
  if (pag < 1 || pag > totalPaginas) return;
  paginaActual = pag;
  renderTabla();
}

async function abrirModal(modo, btn) {
  document.querySelectorAll('.notif-stack .notif').forEach(function(d) {
    if (typeof removeNotification === 'function') removeNotification(d);
    else d.remove();
  });
  document.querySelectorAll('#modalUsuario .field, #modalUsuario [data-fv]').forEach(function(el) {
    el.classList.remove('field-success', 'field-error', 'field-warning');
    var h = el.querySelector('.field-hint');
    if (h) h.textContent = '';
    var w = el.querySelector('.input-wrap');
    if (w) { w.style.borderColor = '#ccc'; w.style.background = '#fff'; }
    var ic = el.querySelector('.input-icon');
    if (ic) ic.textContent = '';
  });

  modoModal = modo;
  filaActual = btn ? btn.closest('tr') : null;
  const modal = new bootstrap.Modal(document.getElementById('modalUsuario'));
  const readonly = modo === 'ver';

  const titulos = { nuevo: 'Nuevo usuario', ver: 'Detalle del usuario', editar: 'Editar usuario' };
  document.getElementById('modalTitulo').textContent = titulos[modo];

  document.getElementById('bloquePass').style.display = modo === 'nuevo' ? 'block' : 'none';
  document.getElementById('bloqueRol').style.display = modo === 'ver' ? 'none' : 'block';
  document.getElementById('btnGuardar').style.display = modo === 'ver' ? 'none' : 'inline-block';

  if (modo === 'nuevo') {
    limpiarModal();
  } else {
    const celdas = filaActual.querySelectorAll('td');
    const nombreCompleto = celdas[1].textContent.trim().split(', ');
    document.getElementById('m_apellido').value = nombreCompleto[0] || '';
    document.getElementById('m_nombre').value = nombreCompleto[1] || '';
    document.getElementById('m_dni').value = celdas[2].textContent.trim();
    document.getElementById('m_correo').value = celdas[3].textContent.trim();
    try {
      const id = filaActual.dataset.id;
      const userData = await apiFetch("/usuarios/" + id);
      if (userData && !userData.error) {
        document.getElementById('m_rol').value = userData.rol;
        document.getElementById('m_tel').value = userData.telefono || '';
        document.getElementById('m_parentesco').value = userData.parentesco || '';
        document.getElementById('m_dir').value = userData.direccion || '';

        const bloqueHijos = document.getElementById('bloqueHijosAdmin');
        const hijosLista = document.getElementById('hijosListaAdmin');
        if (modo === 'ver' && userData.rol === 'APODERADO' && userData.hijos) {
          bloqueHijos.classList.remove('d-none');
          if (userData.hijos.length === 0) {
            hijosLista.innerHTML = '<p class="text-muted small mb-0">No tiene hijos registrados.</p>';
          } else {
            hijosLista.innerHTML = userData.hijos.map(h => {
              const estadoBadge = badgeEstado(h.estado);
              const edad = calcularEdad(h.fechaNacimiento);
              return `
                <div class="d-flex justify-content-between align-items-start py-1 border-bottom">
                  <div>
                    <b>${h.nombre} ${h.apellido}</b><br/>
                    <small class="text-muted">DNI: ${h.dni || "—"} | ${edad}</small>
                  </div>
                  <span class="badge ${estadoBadge}">${h.estado || "Sin matrícula"}</span>
                </div>
              `;
            }).join('');
          }
        } else {
          bloqueHijos.classList.add('d-none');
        }
      }
    } catch (e) {
      console.error("Error cargando datos extra del usuario:", e);
    }
  }

  if (modo === 'editar') {
    ['m_nombre', 'm_apellido', 'm_dni'].forEach(id => {
      document.getElementById(id).readOnly = true;
    });
    ['m_parentesco', 'm_rol'].forEach(id => {
      document.getElementById(id).disabled = true;
    });
    ['m_correo', 'm_tel', 'm_dir'].forEach(id => {
      const el = document.getElementById(id);
      el.readOnly = false;
      if (el.tagName === 'SELECT') el.disabled = false;
    });
  } else {
    ['m_nombre', 'm_apellido', 'm_dni', 'm_tel', 'm_correo', 'm_dir'].forEach(id => {
      document.getElementById(id).readOnly = readonly;
    });
    ['m_parentesco', 'm_rol'].forEach(id => {
      document.getElementById(id).disabled = readonly;
    });
  }

  var rolVal = document.getElementById('m_rol').value;
  toggleCamposApoderado(rolVal === 'APODERADO');

  modal.show();
  document.getElementById('m_pass')?.addEventListener('input', function () {
    actualizarRequisitosPass(this.value);
  });
}

function toggleCamposApoderado(mostrar) {
  ['m_dni', 'm_tel', 'm_parentesco', 'm_dir'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const col = el.parentElement;
    if (col) col.style.display = mostrar ? '' : 'none';
    if (!mostrar) el.value = '';
  });
}

document.getElementById('m_rol')?.addEventListener('change', function() {
  toggleCamposApoderado(this.value === 'APODERADO');
});

function limpiarModal() {
  document.querySelectorAll('#modalUsuario input, #modalUsuario select').forEach(el => {
    if (el.type === 'password' || el.tagName === 'SELECT' || el.type === 'text' || el.type === 'email') {
      el.value = '';
    }
    if (typeof clearField === 'function') clearField(el);
  });
}

async function guardarUsuario() {
  const correo = document.getElementById('m_correo').value.trim();
  const telefono = document.getElementById('m_tel').value.trim();
  const direccion = document.getElementById('m_dir').value.trim();

  if (modoModal === 'nuevo') {
    const nombre = document.getElementById('m_nombre').value.trim();
    const apellido = document.getElementById('m_apellido').value.trim();
    const dni = document.getElementById('m_dni').value.trim();
    const rol = document.getElementById('m_rol').value;
    const parentesco = document.getElementById('m_parentesco').value;

    if (!nombre || !apellido || !dni || !correo || !rol) {
      showErrorAlert('Completa todos los campos obligatorios (*)'); return;
    }
    const pass = document.getElementById('m_pass').value;
    const pass2 = document.getElementById('m_pass2').value;
    const errs = validarPassword(pass);
    if (errs.length) { showErrorAlert('La contrasena debe tener: ' + errs.join(", ") + '.'); return; }
    if (pass !== pass2) { showErrorAlert('Las contrasenas no coinciden.'); return; }

    const body = { nombre, apellido, dni, correo, rol, telefono, parentesco, direccion, contrasena: pass };

    try {
      var result = await apiFetch("/auth/register", { method: "POST", body: JSON.stringify(body) });
      if (!result || result.error) {
        showErrorAlert((result && result.error) || 'Error al registrar el usuario');
        return;
      }
      showSuccessAlert('Usuario registrado correctamente.');
      bootstrap.Modal.getInstance(document.getElementById('modalUsuario')).hide();
      await cargarUsuarios(paginaActual);
    } catch (e) {
      console.error("Error guardando usuario:", e);
      showErrorAlert('Error al guardar el usuario.');
    }
    return;
  }

  if (modoModal === 'editar') {
    if (!correo) {
      showErrorAlert('El correo es obligatorio.'); return;
    }
    const id = filaActual ? filaActual.dataset.id : null;
    const body = { correo, telefono, direccion };
    try {
      var result = await apiFetch("/usuarios/" + id, { method: "PUT", body: JSON.stringify(body) });
      if (!result || result.error) {
        showErrorAlert((result && result.error) || 'Error al actualizar el usuario');
        return;
      }
      showSuccessAlert('Usuario actualizado correctamente.');
      bootstrap.Modal.getInstance(document.getElementById('modalUsuario')).hide();
      await cargarUsuarios(paginaActual);
    } catch (e) {
      console.error("Error guardando usuario:", e);
      showErrorAlert('Error al guardar el usuario.');
    }
  }
}

async function confirmarEliminar(btn) {
  const fila = btn.closest('tr');
  const nombre = fila.querySelectorAll('td')[1].textContent.trim();
  if (!confirm(`¿Deseas eliminar al usuario "${nombre}"? Esta acción no se puede deshacer.`)) return;

  const id = fila.dataset.id;
  try {
    await apiFetch("/usuarios/" + id, { method: "DELETE" });
    showSuccessAlert('Usuario eliminado correctamente.');
    await cargarUsuarios(paginaActual);
  } catch (e) {
    console.error("Error eliminando usuario:", e);
    showErrorAlert('Error al eliminar el usuario.');
  }
}

function filtrarTabla() {
  const q = document.getElementById('inputBuscar').value.toLowerCase();
  const rol = document.getElementById('selectRol').value.toLowerCase();
  let visible = 0;
  document.querySelectorAll('#tablaUsuarios tbody tr').forEach(tr => {
    const texto = tr.textContent.toLowerCase();
    const badgeText = tr.querySelector('.badge')?.textContent.toLowerCase() || '';
    const matchQ = texto.includes(q);
    const matchRol = !rol || badgeText.includes(rol.toLowerCase());
    tr.style.display = matchQ && matchRol ? '' : 'none';
    if (matchQ && matchRol) visible++;
  });
  document.getElementById('contadorRegistros').textContent = `Mostrando ${visible} registros`;
}

function limpiarFiltros() {
  document.getElementById('inputBuscar').value = '';
  document.getElementById('selectRol').value = '';
  filtrarTabla();
}

function actualizarContador() {
  const total = document.querySelectorAll('#tablaUsuarios tbody tr').length;
  document.getElementById('contadorRegistros').textContent = `Mostrando ${total} registros (${usuariosCache.length} totales)`;
}

cargarUsuarios(1);
