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
      const { periodo, desde, hasta } = req.query;
      const anio = periodo || new Date().getFullYear();

      let fechaMatriculaWhere = "";
      const fechaMatParams = [];
      if (desde && hasta) {
        fechaMatriculaWhere = "AND m.fechaRegistro BETWEEN ? AND ?";
        fechaMatParams.push(desde, hasta + " 23:59:59");
      } else if (desde) {
        fechaMatriculaWhere = "AND m.fechaRegistro >= ?";
        fechaMatParams.push(desde);
      } else if (hasta) {
        fechaMatriculaWhere = "AND m.fechaRegistro <= ?";
        fechaMatParams.push(hasta + " 23:59:59");
      }

      const [data, totalRow, adminCount] = await Promise.all([
        Matricula.getProductividad(anio, desde, hasta),
        pool.query(`SELECT COUNT(*) AS total FROM Matricula m WHERE m.periodoAcademico = ? AND m.fechaEliminacion IS NULL AND m.estado = 'APROBADA' ${fechaMatriculaWhere}`, [anio, ...fechaMatParams]),
        pool.query("SELECT COUNT(*) AS total FROM Usuario WHERE rol = 'ADMIN'")
      ]);
      const totalMatriculas = totalRow[0][0].total;
      const totalAdmins = adminCount[0][0].total;

      let maxAdmin = "-";
      let maxTotal = 0;
      let minAdmin = "-";
      let minTotal = Infinity;
      let sumaTotal = 0;
      let sumaAprobadas = 0;
      let adminsConDatos = 0;
      if (data && data.length) {
        data.forEach(r => {
          const t = Number(r.total);
          const a = Number(r.aprobadas);
          if (t > maxTotal) { maxTotal = t; maxAdmin = r.admin; }
          if (t < minTotal) { minTotal = t; minAdmin = r.admin; }
          sumaTotal += t;
          sumaAprobadas += a;
          if (t > 0) adminsConDatos++;
        });
        if (minTotal === Infinity) minTotal = 0;
      }
      const promedioTotal = adminsConDatos > 0 ? Number((sumaTotal / adminsConDatos).toFixed(1)) : 0;
      const promedioAprobadas = adminsConDatos > 0 ? Number((sumaAprobadas / adminsConDatos).toFixed(1)) : 0;

      return res.json({ data, totalMatriculas, totalAdmins, maxAdmin, maxTotal, minAdmin, minTotal, promedioTotal, promedioAprobadas });
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

  sinMatricula: async (req, res) => {
    try {
      const [rows] = await pool.query(`
        SELECT
          a.idAlumno,
          a.dni AS dni_alumno,
          CONCAT(a.nombre, ' ', a.apellido) AS alumno,
          a.genero,
          a.fechaNacimiento,
          CONCAT(u.nombre, ' ', u.apellido) AS apoderado,
          ap.dni AS dni_apoderado,
          ap.telefono AS telefono_apoderado
        FROM Alumno a
        INNER JOIN Apoderado ap ON a.idApoderado = ap.idApoderado
        INNER JOIN Usuario u ON ap.idUsuario = u.idUsuario
        LEFT JOIN Matricula m ON a.idAlumno = m.idAlumno
        WHERE m.idMatricula IS NULL
        ORDER BY a.nombre
      `);
      return res.json(rows);
    } catch (err) {
      logger.error(err);
      return res.status(500).json({ message: "Error al obtener alumnos sin matrícula." });
    }
  },


};

module.exports = reporteController;