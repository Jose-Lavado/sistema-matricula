// libreria: winston — Logger (equivalente a Logback en Java)
// historialController.js — GET historial de cambios por ID de matrícula
const HistorialCambio = require("../models/HistorialCambio");
const logger = require("../services/logger");

const historialController = {
  obtenerPorMatricula: async (req, res) => {
    try {
      const historial = await HistorialCambio.obtenerPorMatricula(req.params.idMatricula);
      return res.json(historial);
    } catch (err) {
      logger.error(err);
      return res.status(500).json({ message: "Error al obtener historial." });
    }
  },
};

module.exports = historialController;
