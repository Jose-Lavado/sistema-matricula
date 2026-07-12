// libreria: winston — Logger (equivalente a Logback en Java)
// libreria: exceljs — Generación de reportes Excel (equivalente a Apache POI)
// libreria: fs-extra — Escritura de archivos Excel (equivalente a Apache Commons IO)
// reporteController.js — GET /reportes/matriculas (lista) y /reportes/stats (estadísticas)
// reporteController.js — reportes del sistema de matrículas
const Matricula = require("../models/Matricula");
const Seccion = require("../models/Seccion");
const Admin = require("../models/Admin");
const pool = require("../config/db");
const logger = require("../services/logger");
const ExcelJS = require("exceljs");
const fse = require("fs-extra");
const path = require("path");

const reporteController = {
  matriculas: async (req, res) => {
    try {
      const { periodo, grado, seccion } = req.query;
      const admin = new Admin();
      const data = await admin.generarReporte("matriculas", periodo || new Date().getFullYear(), grado, seccion);
      return res.json(data);
    } catch (err) {
      logger.error(err);
      return res.status(500).json({ message: "Error al generar reporte." });
    }
  },

  descargarExcel: async (req, res) => {
    try {
      const { periodo } = req.query;
      const anio = periodo || new Date().getFullYear();
      const admin = new Admin();
      const data = await admin.generarReporte("matriculas", anio);

      const workbook = new ExcelJS.Workbook();
      workbook.creator = "Sistema de Matrícula";
      workbook.created = new Date();
      const sheet = workbook.addWorksheet(`Matrículas ${anio}`);

      sheet.columns = [
        { header: "ID", key: "idMatricula", width: 10 },
        { header: "Alumno", key: "alumno", width: 30 },
        { header: "DNI", key: "dni", width: 15 },
        { header: "Grado", key: "grado", width: 10 },
        { header: "Sección", key: "seccion", width: 10 },
        { header: "Estado", key: "estado", width: 15 },
        { header: "Fecha Registro", key: "fechaRegistro", width: 20 },
        { header: "Apoderado", key: "apoderado", width: 30 },
      ];

      sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
      sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4472C4" } };

      data.forEach((row) => {
        sheet.addRow(row);
      });

      const dir = path.join(__dirname, "..", "..", "reportes");
      await fse.ensureDir(dir);
      const filePath = path.join(dir, `matriculas_${anio}.xlsx`);
      await workbook.xlsx.writeFile(filePath);

      logger.info(`Reporte Excel generado: ${filePath}`);
      res.download(filePath);
    } catch (err) {
      logger.error("Error al generar Excel:", err);
      return res.status(500).json({ message: "Error al generar archivo Excel." });
    }
  },

  stats: async (req, res) => {
    try {
      const { periodo, grado, seccion } = req.query;
      const stats = await Matricula.getStats(periodo, grado, seccion);
      return res.json(stats);
    } catch (err) {
      logger.error(err);
      return res.status(500).json({ message: "Error al obtener stats." });
    }
  },

  productividad: async (req, res) => {
    try {
      const { periodo } = req.query;
      const anio = periodo || new Date().getFullYear();
      const [data, totalRow, adminCount] = await Promise.all([
        Matricula.getProductividad(anio),
        pool.query("SELECT COUNT(*) AS total FROM Matricula WHERE periodoAcademico = ? AND fechaEliminacion IS NULL", [anio]),
        pool.query("SELECT COUNT(*) AS total FROM Usuario WHERE rol = 'ADMIN'")
      ]);
      const totalMatriculas = totalRow[0][0].total;
      const totalAdmins = adminCount[0][0].total;
      const productividad = totalAdmins > 0 ? (totalMatriculas / totalAdmins).toFixed(1) : 0;
      return res.json({ data, totalMatriculas, totalAdmins, productividad: Number(productividad) });
    } catch (err) {
      logger.error(err);
      return res.status(500).json({ message: "Error al obtener productividad." });
    }
  },

  eliminadas: async (req, res) => {
    try {
      const { periodo } = req.query;
      const anio = periodo || new Date().getFullYear();
      const data = await Matricula.getEliminadas(anio);
      return res.json(data);
    } catch (err) {
      logger.error(err);
      return res.status(500).json({ message: "Error al obtener matrículas eliminadas." });
    }
  },

  cumplimiento: async (req, res) => {
    try {
      const { periodo } = req.query;
      const anio = periodo || new Date().getFullYear();
      const data = await Matricula.getCumplimiento(anio);
      const totalRealizadas = data.reduce((s, r) => s + Number(r.realizadas), 0);
      const totalCapacidad = data.reduce((s, r) => s + Number(r.capacidad), 0);
      const porcentajeGlobal = totalCapacidad > 0 ? (totalRealizadas / totalCapacidad * 100).toFixed(1) : 0;
      return res.json({ data, totalRealizadas, totalCapacidad, porcentajeGlobal: Number(porcentajeGlobal) });
    } catch (err) {
      logger.error(err);
      return res.status(500).json({ message: "Error al obtener cumplimiento." });
    }
  },

  vacantes: async (req, res) => {
    try {
      const secciones = await Seccion.findAll();
      const totales = await Seccion.getTotales();
      return res.json({ secciones, totales });
    } catch (err) {
      logger.error(err);
      return res.status(500).json({ message: "Error al obtener vacantes." });
    }
  },
};

module.exports = reporteController;