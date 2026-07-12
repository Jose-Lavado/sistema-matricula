// libreria: winston — Logger (equivalente a Logback en Java)
// matriculaController.js — CRUD matrículas, cambio de estado, cambio de sección, historial, stats
const Matricula = require("../models/Matricula");
const pool = require("../config/db");
const logger = require("../services/logger");
const { registrarMatricula, registrarUsoClase } = require("../metrics/prometheus");

const matriculaController = {
  listar: async (req, res) => {
    try {
      const { grado, estado, search, fecha, alumno_id, anio, page, order } = req.query;
      const pageNum = Math.max(1, parseInt(page) || 1);
      const limit = 10;
      const offset = (pageNum - 1) * limit;
      const result = await Matricula.findAll({ grado, estado, search, fecha, alumno_id, anio, limit, offset, order });
      return res.json({ data: result.data, pagination: { totalPages: result.totalPages } });
    } catch (err) {
      logger.error(err);
      return res.status(500).json({ message: "Error al listar matrículas." });
    }
  },

  obtener: async (req, res) => {
    try {
      const matricula = await Matricula.consultar(req.params.id);
      if (!matricula) return res.status(404).json({ message: "Matrícula no encontrada." });
      return res.json(matricula);
    } catch (err) {
      logger.error(err);
      return res.status(500).json({ message: "Error al obtener matrícula." });
    }
  },

  crear: async (req, res) => {
    try {
      const { idAlumno, alumno_id, grado, idSeccion } = req.body;
      const idAlumnoFinal = idAlumno || alumno_id;

      if (!idAlumnoFinal) {
        return res.status(400).json({ message: "ID de alumno requerido." });
      }

      const [dup] = await pool.query(
        `SELECT idMatricula, estado FROM Matricula
         WHERE idAlumno = ? AND periodoAcademico = YEAR(CURDATE()) AND fechaEliminacion IS NULL`,
        [idAlumnoFinal]
      );
      if (dup.length > 0) {
        if (dup[0].estado === "RECHAZADA") {
          return res.status(400).json({ message: "El alumno fue rechazado previamente. Se notificó al administrador para revisión.", codigo: "RECHAZADO" });
        }
        const msgs = {
          PENDIENTE: "El alumno ya tiene una matrícula en proceso de aprobación.",
          APROBADA: "El alumno ya tiene una matrícula activa para el periodo actual.",
        };
        return res.status(400).json({ message: msgs[dup[0].estado] || "El alumno ya está matriculado." });
      }

      const mat = new Matricula({ idUsuario: req.user.id });
      const id = await mat.registrar(idAlumnoFinal, grado, idSeccion || null);
      registrarMatricula("crear", "exitoso");
      registrarUsoClase("Matricula", "registrar");
      const creada = await Matricula.consultar(id);
      return res.status(201).json({ message: "Matrícula registrada.", matricula: creada });
    } catch (err) {
      if (err.message === "No hay vacantes disponibles") {
        return res.status(400).json({ message: err.message });
      }
      logger.error(err);
      return res.status(500).json({ message: "Error al registrar matrícula." });
    }
  },

  cambiarEstado: async (req, res) => {
    try {
      const { estado } = req.body;
      const data = await Matricula.consultar(req.params.id);
      if (!data) return res.status(404).json({ message: "Matrícula no encontrada." });

      const mat = new Matricula(data);
      await mat.cambiarEstado(estado, req.user.id, `Cambio a ${estado}`);
      registrarMatricula(estado.toLowerCase(), "exitoso");
      registrarUsoClase("Matricula", "cambiarEstado");
      return res.json({ message: "Estado actualizado.", estado });
    } catch (err) {
      logger.error(err);
      return res.status(500).json({ message: "Error al cambiar estado." });
    }
  },

  actualizarSeccion: async (req, res) => {
    try {
      const { idSeccion } = req.body;
      if (!idSeccion) return res.status(400).json({ message: "Sección requerida." });
      const data = await Matricula.consultar(req.params.id);
      if (!data) return res.status(404).json({ message: "Matrícula no encontrada." });
      const mat = new Matricula(data);
      await mat.cambiarSeccion(idSeccion);
      return res.json({ message: "Sección actualizada." });
    } catch (err) {
      if (err.message === "No hay vacantes disponibles") {
        return res.status(400).json({ message: err.message });
      }
      logger.error(err);
      return res.status(500).json({ message: "Error al actualizar sección." });
    }
  },

  eliminar: async (req, res) => {
    try {
      const mat = new Matricula();
      await mat.eliminar(req.params.id, req.user.id);
      return res.json({ message: "Matrícula eliminada (registro lógico)." });
    } catch (err) {
      if (err.message && err.message.startsWith("No se puede eliminar")) {
        return res.status(400).json({ message: err.message });
      }
      logger.error(err);
      return res.status(500).json({ message: "Error al eliminar matrícula." });
    }
  },

  restaurar: async (req, res) => {
    try {
      const mat = new Matricula();
      await mat.restaurar(req.params.id);
      return res.json({ message: "Matrícula restaurada." });
    } catch (err) {
      if (err.message && err.message.startsWith("Matrícula no encontrada")) {
        return res.status(400).json({ message: err.message });
      }
      logger.error(err);
      return res.status(500).json({ message: "Error al restaurar matrícula." });
    }
  },

  eliminarFisicamente: async (req, res) => {
    try {
      const mat = new Matricula();
      await mat.eliminarFisicamente(req.params.id);
      return res.json({ message: "Matrícula eliminada permanentemente." });
    } catch (err) {
      if (err.message && err.message.startsWith("Matrícula no encontrada")) {
        return res.status(400).json({ message: err.message });
      }
      logger.error(err);
      return res.status(500).json({ message: "Error al eliminar matrícula permanentemente." });
    }
  },

  historial: async (req, res) => {
    try {
      const data = await Matricula.consultar(req.params.id);
      if (!data) return res.status(404).json({ message: "Matrícula no encontrada." });
      const mat = new Matricula(data);
      const historial = await mat.obtenerHistorialCambios();
      return res.json(historial);
    } catch (err) {
      logger.error(err);
      return res.status(500).json({ message: "Error al obtener historial." });
    }
  },

  stats: async (req, res) => {
    try {
      const stats = await Matricula.getStats();
      return res.json(stats);
    } catch (err) {
      logger.error(err);
      return res.status(500).json({ message: "Error al obtener estadísticas." });
    }
  },

  solicitarRevision: async (req, res) => {
    try {
      const { idAlumno } = req.body;
      const store = require("../services/NotificacionStore");
      let nombreAlumno = "desconocido";
      if (idAlumno) {
        const [alumno] = await pool.query(
          "SELECT nombre, apellido FROM Alumno WHERE idAlumno = ?", [idAlumno]
        );
        if (alumno.length) nombreAlumno = `${alumno[0].nombre} ${alumno[0].apellido}`;
      }
      store.agregar({
        mensaje: `Solicitud de revisión: ${nombreAlumno} (rechazado previamente) desea reinscribirse`,
        tipo: "warning",
        rol: "Administrador",
      });
      return res.json({ message: "Notificación enviada al administrador." });
    } catch (err) {
      logger.error(err);
      return res.status(500).json({ message: "Error al solicitar revisión." });
    }
  },
};

module.exports = matriculaController;
