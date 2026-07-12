// libreria: winston — Logger (equivalente a Logback en Java)
// alumnoController.js — listar, buscar por DNI, crear, verificar duplicados
const Alumno = require("../models/Alumno");
const logger = require("../services/logger");
const { registrarUsoClase } = require("../metrics/prometheus");

const alumnoController = {
  listar: async (req, res) => {
    try {
      registrarUsoClase("Alumno", "findAll");
      const alumnos = await Alumno.findAll();
      return res.json(alumnos);
    } catch (err) {
      logger.error(err);
      return res.status(500).json({ message: "Error al listar alumnos." });
    }
  },

  buscarPorDniQuery: async (req, res) => {
    try {
      const { dni } = req.query;
      if (!dni) return res.status(400).json({ message: "DNI requerido." });
      const alumno = await Alumno.findByDni(dni);
      if (!alumno) return res.status(404).json({ message: "Alumno no encontrado." });
      return res.json(alumno);
    } catch (err) {
      logger.error(err);
      return res.status(500).json({ message: "Error al buscar alumno." });
    }
  },

  buscarPorDni: async (req, res) => {
    try {
      const { dni } = req.params;
      const alumno = await Alumno.findByDni(dni);
      if (!alumno) return res.status(404).json({ message: "Alumno no encontrado." });
      return res.json(alumno);
    } catch (err) {
      logger.error(err);
      return res.status(500).json({ message: "Error al buscar alumno." });
    }
  },

  crear: async (req, res) => {
    try {
      registrarUsoClase("Alumno", "crear");
      const { idApoderado, nombre, apellido, dni, fechaNacimiento, genero } = req.body;

      if (!idApoderado) {
        return res.status(400).json({ message: "Debes seleccionar un apoderado primero." });
      }

      const alumno = new Alumno();
      const existe = await alumno.validarDuplicados(dni);
      if (existe) return res.status(400).json({ message: "El DNI ya está registrado." });

      if (!alumno.validarDatos(nombre, dni)) {
        return res.status(400).json({ message: "Datos del alumno no válidos." });
      }

      if (fechaNacimiento && !alumno.validarFechaNacimiento(fechaNacimiento)) {
        return res.status(400).json({ message: "La fecha de nacimiento no es válida (no puede ser futura)." });
      }

      const Admin = require("../models/Admin");
      const admin = new Admin();
      const id = await admin.registrarAlumno({ idApoderado, nombre, apellido, dni, fechaNacimiento, genero });
      return res.status(201).json({ message: "Alumno registrado.", idAlumno: id });
    } catch (err) {
      logger.error(err);
      return res.status(500).json({ message: "Error al registrar alumno." });
    }
  },

  verificarDuplicado: async (req, res) => {
    try {
      const { dni } = req.params;
      const alumno = new Alumno();
      const existe = await alumno.validarDuplicados(dni);
      return res.json({ existe });
    } catch (err) {
      return res.status(500).json({ message: "Error al verificar DNI." });
    }
  },
};

module.exports = alumnoController;
