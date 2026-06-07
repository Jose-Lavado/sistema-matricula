// libreria: winston — Logger (equivalente a Logback en Java)
// apoderadoController.js — perfil, buscar por DNI, solicitar matrícula, listar hijos
const Apoderado = require("../models/Apoderado");
const logger = require("../services/logger");

const apoderadoController = {
  perfil: async (req, res) => {
    try {
      const apoderado = await Apoderado.findByIdUsuario(req.user.id);
      if (!apoderado) return res.status(404).json({ message: "Apoderado no encontrado." });
      return res.json({
        idApoderado: apoderado.idApoderado,
        idUsuario: apoderado.idUsuario,
        nombre: apoderado.nombre,
        apellido: apoderado.apellido,
        correo: apoderado.correo,
        dni: apoderado.dni,
        telefono: apoderado.telefono,
        direccion: apoderado.direccion,
        parentesco: apoderado.parentesco,
      });
    } catch (err) {
      logger.error(err);
      return res.status(500).json({ message: "Error al obtener perfil." });
    }
  },

  buscarPorDni: async (req, res) => {
    try {
      const { dni } = req.params;
      const apoderado = await Apoderado.findByDni(dni);
      if (!apoderado) return res.status(404).json({ message: "Apoderado no encontrado." });
      return res.json({
        idApoderado: apoderado.idApoderado,
        idUsuario: apoderado.idUsuario,
        nombre: apoderado.nombre,
        apellido: apoderado.apellido,
        correo: apoderado.correo,
        dni: apoderado.dni,
        telefono: apoderado.telefono,
        direccion: apoderado.direccion,
        parentesco: apoderado.parentesco,
      });
    } catch (err) {
      logger.error(err);
      return res.status(500).json({ message: "Error al buscar apoderado." });
    }
  },

  solicitarMatricula: async (req, res) => {
    try {
      const { idAlumno, alumno_id, grado } = req.body;
      const idAlumnoFinal = idAlumno || alumno_id;
      const apoderado = await Apoderado.findByIdUsuario(req.user.id);
      if (!apoderado) return res.status(404).json({ message: "Apoderado no encontrado." });

      apoderado.idUsuario = req.user.id;
      const result = await apoderado.solicitarMatricula(idAlumnoFinal, grado);
      const seccionLabel = result.seccion ? `${result.seccion.grado} - ${result.seccion.seccion}` : "Asignación automática";
      return res.status(201).json({ message: "Matrícula solicitada.", ...result });
    } catch (err) {
      if (err.message === "No hay vacantes disponibles") {
        return res.status(400).json({ message: err.message });
      }
      if (err.message === "RECHAZADO") {
        const store = require("../services/NotificacionStore");
        const pool = require("../config/db");
        try {
          const [alumno] = await pool.query(
            "SELECT nombre, apellido FROM Alumno WHERE idAlumno = ?", [idAlumnoFinal]
          );
          const nombreAlumno = alumno.length ? `${alumno[0].nombre} ${alumno[0].apellido}` : "desconocido";
          store.agregar({
            mensaje: `Solicitud de revisión: ${nombreAlumno} (rechazado previamente) desea reinscribirse`,
            tipo: "warning",
            rol: "Administrador",
          });
        } catch (_) {}
        return res.status(400).json({ message: "El alumno fue rechazado previamente. Se notificó al administrador para revisión.", codigo: "RECHAZADO" });
      }
      logger.error(err);
      return res.status(500).json({ message: "Error al solicitar matrícula." });
    }
  },

  getHijos: async (req, res) => {
    try {
      const apoderado = await Apoderado.findByIdUsuario(req.user.id);
      if (!apoderado) return res.status(404).json({ message: "Apoderado no encontrado." });
      const hijos = await apoderado.getHijos();
      return res.json(hijos);
    } catch (err) {
      logger.error(err);
      return res.status(500).json({ message: "Error al obtener hijos." });
    }
  },

  getTodosHijos: async (req, res) => {
    try {
      const apoderado = await Apoderado.findByIdUsuario(req.user.id);
      if (!apoderado) return res.status(404).json({ message: "Apoderado no encontrado." });
      const hijos = await apoderado.getTodosHijos();
      return res.json(hijos);
    } catch (err) {
      logger.error(err);
      return res.status(500).json({ message: "Error al obtener hijos." });
    }
  },

  getHijosById: async (req, res) => {
    try {
      const { id } = req.params;
      const hijos = await Apoderado.getHijosByIdApoderado(id);
      return res.json(hijos);
    } catch (err) {
      logger.error(err);
      return res.status(500).json({ message: "Error al obtener hijos." });
    }
  },
};

module.exports = apoderadoController;
