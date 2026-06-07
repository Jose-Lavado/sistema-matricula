// perfilApoderado.js — perfil del apoderado: editar datos de contacto y cambiar contraseña
fetch("/components/sidebar.html")
  .then(r => r.text())
  .then(html => {
    document.getElementById("sidebar-container").innerHTML = html;
    const s = document.createElement("script");
    s.src = "/js/sidebar.js";
    document.body.appendChild(s);
  });

function togglePass(inputId, iconId) {
  const inp = document.getElementById(inputId);
  const ico = document.getElementById(iconId);
  if (inp.type === 'password') { inp.type = 'text'; ico.className = 'bi bi-eye-slash'; }
  else { inp.type = 'password'; ico.className = 'bi bi-eye'; }
}

function checkStrength(val) {
  const bar = document.getElementById('strengthBar');
  const label = document.getElementById('strengthLabel');
  const reqs = [
    { id: 'req-len', test: val.length >= 8 },
    { id: 'req-lower', test: /[a-z]/.test(val) },
    { id: 'req-upper', test: /[A-Z]/.test(val) },
    { id: 'req-num', test: /[0-9]/.test(val) },
    { id: 'req-special', test: /[^A-Za-z0-9]/.test(val) },
  ];
  let score = 0;
  reqs.forEach(r => {
    score += r.test ? 1 : 0;
    const el = document.getElementById(r.id);
    el.querySelector('i').className = r.test ? 'bi bi-check-circle-fill text-success' : 'bi bi-circle text-muted';
    el.style.color = r.test ? '#1e8a49' : '';
  });
  const colors = ['#e74c3c', '#e67e22', '#f1c40f', '#27ae60'];
  const labels = ['Muy débil', 'Débil', 'Aceptable', 'Fuerte'];
  bar.style.width = (score * 20) + '%';
  bar.style.background = colors[score - 1] || '#dee2e6';
  label.textContent = score ? labels[score - 1] : 'Escribe tu nueva contraseña';
  label.style.color = colors[score - 1] || '#aaa';
}

function getInitials(name) {
  if (!name) return '??';
  return name.split(' ').filter(w => w.length > 0).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

document.addEventListener("DOMContentLoaded", async () => {
  const session = JSON.parse(sessionStorage.getItem("user") || "{}");

  try {
    const user = await apiFetch("/usuarios/" + session.id);
    if (!user) return;

    const fullName = user.nombre + ' ' + (user.apellido || '');
    const initials = getInitials(fullName);

    document.getElementById('avatarCircle').textContent = initials;
    document.getElementById('displayName').textContent = fullName;

    document.getElementById('identityName').value = fullName;
    document.getElementById('identityDni').value = user.dni || '—';
    document.getElementById('identityParentesco').value = user.parentesco || '—';

    document.getElementById('correo').value = user.correo || user.email || '';
    document.getElementById('telefono').value = user.telefono || '';
    document.getElementById('direccion').value = user.direccion || '';
  } catch (e) {
    console.error("Error al cargar perfil:", e);
  }
});

async function guardarContacto() {
  const correo = document.getElementById('correo').value.trim();
  const tel = document.getElementById('telefono').value.trim();
  const dir = document.getElementById('direccion').value.trim();

  if (!correo || !tel || !dir) {
    showErrorAlert('Completa todos los campos de contacto.');
    return;
  }

  const session = JSON.parse(sessionStorage.getItem("user") || "{}");

  try {
    const res = await apiFetch("/usuarios/" + session.id, {
      method: "PUT",
      body: JSON.stringify({ correo, telefono: tel, direccion: dir }),
    });

    if (res && !res.error) {
      showSuccessAlert('Datos de contacto actualizados correctamente.');
    } else {
      showErrorAlert('Error al guardar los datos.');
    }
  } catch (e) {
    showErrorAlert('Error de conexión al guardar.');
    console.error(e);
  }
}

async function cambiarPassword() {
  const passwordActual = document.getElementById('passActual').value;
  const passwordNuevo = document.getElementById('passNueva').value;
  const confirma = document.getElementById('passConfirm').value;

  if (!passwordActual) { showErrorAlert('Ingresa tu contraseña actual.'); return; }
  const errs = [];
  if (passwordNuevo.length < 8) errs.push("mínimo 8 caracteres");
  if (!/[a-z]/.test(passwordNuevo)) errs.push("una minúscula");
  if (!/[A-Z]/.test(passwordNuevo)) errs.push("una mayúscula");
  if (!/[0-9]/.test(passwordNuevo)) errs.push("un número");
  if (!/[^A-Za-z0-9]/.test(passwordNuevo)) errs.push("un carácter especial");
  if (errs.length) { showErrorAlert('La contraseña debe tener: ' + errs.join(", ") + '.'); return; }
  if (passwordNuevo !== confirma) { showErrorAlert('Las contraseñas no coinciden.'); return; }

  const session = JSON.parse(sessionStorage.getItem("user") || "{}");

  try {
    const res = await apiFetch("/usuarios/" + session.id + "/password", {
      method: "PUT",
      body: JSON.stringify({ passwordActual, passwordNuevo }),
    });

    if (res && !res.error) {
      document.getElementById('passActual').value = '';
      document.getElementById('passNueva').value = '';
      document.getElementById('passConfirm').value = '';
      document.getElementById('strengthBar').style.width = '0%';
      document.getElementById('strengthBar').style.background = '#dee2e6';
      document.getElementById('strengthLabel').textContent = 'Escribe tu nueva contraseña';
      document.getElementById('strengthLabel').style.color = '#aaa';
      showSuccessAlert('Contraseña actualizada correctamente.');
    } else {
      showErrorAlert(res?.error || 'Error al actualizar contraseña.');
    }
  } catch (e) {
    showErrorAlert('Error de conexión.');
    console.error(e);
  }
}
