// utils.js — funciones auxiliares: calcularEdad, formatearFecha, badgeEstado, validarTexto
function calcularEdad(fechaNacimiento) {
  if (!fechaNacimiento) return "—";
  const n = new Date(fechaNacimiento);
  const h = new Date();
  if (n > h) return "—";
  let e = h.getFullYear() - n.getFullYear();
  const d = h.getMonth() - n.getMonth();
  if (d < 0 || (d === 0 && h.getDate() < n.getDate())) e--;
  return e + " años";
}

function formatearFecha(fecha) {
  if (!fecha) return "—";
  return new Date(fecha).toLocaleDateString("es-PE");
}

function badgeEstado(estado) {
  const map = {
    "APROBADA": "bg-success",
    "PENDIENTE": "bg-warning text-dark",
    "RECHAZADA": "bg-danger",
  };
  return map[estado] || "bg-secondary";
}

// Validación de texto — solo permite letras (elimina dígitos en inputs con clase "solo-letras")
document.addEventListener("input", function(e) {
  if (e.target.classList.contains("solo-letras")) {
    e.target.value = e.target.value.replace(/[0-9]/g, "");
  }
});
