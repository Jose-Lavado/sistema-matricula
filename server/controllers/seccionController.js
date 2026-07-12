// libreria: winston — Logger (equivalente a Logback en Java)
// seccionController.js — listar secciones, vacantes por grado, totales, actualizar vacantes
const Seccion = require("../models/Seccion");
const logger = require("../services/logger");
const { registrarUsoClase } = require("../metrics/prometheus");

const seccionController = {
  listar: async (req, res) => {
    try {
      registrarUsoClase("Seccion", "findAll");
      const { grado } = req.query;
      let secciones;
      if (grado) {
        secciones = (await Seccion.findAll()).filter(s => s.grado === grado);
      } else {
        secciones = await Seccion.findAll();
      }
      return res.json(secciones);
    } catch (err) {
      logger.error(err);
      return res.status(500).json({ message: "Error al listar secciones." });
    }
  },

  vacantesPorGrado: async (req, res) => {
    try {
      const datos = await Seccion.findVacantesPorGrado();
      return res.json(datos);
    } catch (err) {
      logger.error(err);
      return res.status(500).json({ message: "Error al obtener vacantes." });
    }
  },

  totales: async (req, res) => {
    try {
      const totales = await Seccion.getTotales();
      return res.json(totales);
    } catch (err) {
      logger.error(err);
      return res.status(500).json({ message: "Error al obtener totales." });
    }
  },

  actualizarVacantes: async (req, res) => {
    try {
      registrarUsoClase("Seccion", "actualizarVacantes");
      const { id } = req.params;
      const { vacantes } = req.body;
      const seccion = await Seccion.findById(id);
      if (!seccion) return res.status(404).json({ message: "Sección no encontrada." });
      await seccion.actualizarVacantes(vacantes);
      return res.json({ message: "Vacantes actualizadas." });
    } catch (err) {
      if (err.message && err.message.startsWith("El total no puede")) {
        return res.status(400).json({ message: err.message });
      }
      logger.error(err);
      return res.status(500).json({ message: "Error al actualizar vacantes." });
    }
  },
};

module.exports = seccionController;
