const { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } = require("prom-client");

const register = new Registry();

collectDefaultMetrics({ register });

const clasesUso = new Counter({
  name: "matricula_clases_uso_total",
  help: "Numero de veces que se invoca cada clase del backend",
  labelNames: ["clase", "metodo"],
  registers: [register],
});

const accesosUsuarios = new Counter({
  name: "matricula_accesos_usuarios_total",
  help: "Conteo de accesos de usuarios al sistema",
  labelNames: ["tipo", "resultado"],
  registers: [register],
});

const httpRequests = new Counter({
  name: "matricula_http_requests_total",
  help: "Total de peticiones HTTP recibidas",
  labelNames: ["method", "route", "status"],
  registers: [register],
});

const httpRequestDuration = new Histogram({
  name: "matricula_http_request_duration_seconds",
  help: "Duracion de las peticiones HTTP en segundos",
  labelNames: ["method", "route"],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  registers: [register],
});

const matriculasOperaciones = new Counter({
  name: "matricula_operaciones_total",
  help: "Total de operaciones de matricula realizadas",
  labelNames: ["operacion", "resultado"],
  registers: [register],
});

const activeConnections = new Gauge({
  name: "matricula_active_connections",
  help: "Numero de conexiones activas a la base de datos",
  registers: [register],
});

function registrarUsoClase(clase, metodo) {
  clasesUso.inc({ clase, metodo });
}

function registrarAcceso(tipo, resultado) {
  accesosUsuarios.inc({ tipo, resultado });
}

function registrarMatricula(operacion, resultado) {
  matriculasOperaciones.inc({ operacion, resultado });
}

module.exports = {
  register,
  registrarUsoClase,
  registrarAcceso,
  registrarMatricula,
  clasesUso,
  accesosUsuarios,
  httpRequests,
  httpRequestDuration,
  matriculasOperaciones,
  activeConnections,
};
