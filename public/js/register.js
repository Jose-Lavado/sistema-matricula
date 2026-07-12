// register.js — formulario de registro con validación de campos en tiempo real
document.getElementById("togglePwd").addEventListener("click", () => {
  const pwd = document.getElementById("contrasena");
  const icon = document.getElementById("eyeIcon");
  const esTexto = pwd.type === "password";
  pwd.type = esTexto ? "text" : "password";
  icon.classList.toggle("fa-eye", !esTexto);
  icon.classList.toggle("fa-eye-slash", esTexto);
});

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

function validarPassword(pass) {
  const faltan = [];
  if (pass.length < 8) faltan.push("mínimo 8 caracteres");
  if (!/[a-z]/.test(pass)) faltan.push("una minúscula");
  if (!/[A-Z]/.test(pass)) faltan.push("una mayúscula");
  if (!/[0-9]/.test(pass)) faltan.push("un número");
  if (!/[^A-Za-z0-9]/.test(pass)) faltan.push("un carácter especial");
  return faltan;
}

function validarCampo(input) {
  var val = input.value.trim();
  var id = input.id;
  switch (id) {
    case "dni":
      if (!val) return validateField(input, "error", "DNI requerido");
      if (val.length !== 8) return validateField(input, "error", "Debe tener 8 dígitos");
      return validateField(input, "success", "DNI válido");
    case "telefono":
      if (!val) return validateField(input, "error", "Teléfono requerido");
      if (val.length < 7) return validateField(input, "error", "Debe tener al menos 7 dígitos");
      return validateField(input, "success", "Teléfono válido");
    case "correo":
      if (!val) return validateField(input, "error", "Correo requerido");
      if (!val.includes("@") || !val.includes(".")) return validateField(input, "error", "Formato de correo inválido");
      return validateField(input, "success", "Correo válido");
    case "contrasena":
      actualizarRequisitosPass(val);
      if (!val) return validateField(input, "error", "Contraseña requerida");
      const errs = validarPassword(val);
      if (errs.length) return validateField(input, "error", "Falta: " + errs.join(", "));
      return validateField(input, "success", "Contraseña segura");
    case "nombre":
    case "apellido":
    case "direccion":
      if (!val) return validateField(input, "error", "Campo requerido");
      if (val.length < 2) return validateField(input, "error", "Mínimo 2 caracteres");
      return validateField(input, "success", "Correcto");
    case "parentesco":
      if (!val) return validateField(input, "error", "Selecciona un parentesco");
      return validateField(input, "success", "Correcto");
  }
}

document.querySelectorAll("#registerForm input, #registerForm select").forEach(function(el) {
  el.addEventListener("blur", function() { validarCampo(this); });
  el.addEventListener("input", function() {
    if (el.id === "contrasena") validarCampo(this);
    else if (this.value.trim()) validarCampo(this);
  });
});

document.getElementById("registerForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const nombre = document.getElementById("nombre").value.trim();
  const apellido = document.getElementById("apellido").value.trim();
  const correo = document.getElementById("correo").value.trim().toLowerCase();
  const contrasena = document.getElementById("contrasena").value;
  const dni = document.getElementById("dni").value.trim();
  const telefono = document.getElementById("telefono").value.trim() || null;
  const direccion = document.getElementById("direccion").value.trim() || null;
  const parentesco = document.getElementById("parentesco").value;

  if (!nombre || !apellido || !correo || !contrasena || !dni || !telefono || !direccion || !parentesco) {
    showNotification("error", "Campos incompletos", "Completa todos los campos obligatorios.");
    return;
  }
  const errPass = validarPassword(contrasena);
  if (errPass.length) {
    showNotification("error", "Contraseña inválida", "Debe tener: " + errPass.join(", ") + ".");
    return;
  }
  if (dni.length !== 8) {
    showNotification("error", "DNI inválido", "Debe tener 8 dígitos.");
    return;
  }
  if (telefono.length < 7) {
    showNotification("error", "Teléfono inválido", "Ingresa un teléfono válido.");
    return;
  }

  const btn = document.getElementById("btnSubmit");
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Registrando...`;
  showNotification("loading", "Registrando", "Guardando información... por favor espere.");

  try {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, apellido, correo, contrasena, dni, telefono, direccion, parentesco }),
    });

    const data = await res.json();

    if (!res.ok) {
      showNotification("error", "Error al registrar", data.message || "Error al registrar.");
      return;
    }

    showNotification("success", "Cuenta creada", "Redirigiendo al inicio de sesión...");
    setTimeout(() => { window.location.href = "/pages/login.html"; }, 2000);
  } catch (err) {
    showNotification("error", "Error de conexión", "No se pudo conectar con el servidor. Intenta de nuevo.");
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-user-plus me-2"></i>Crear cuenta';
  }
});
