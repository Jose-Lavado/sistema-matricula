// Seccion.js — vacantes, asignación automática por edad, distribución round-robin
const pool = require("../config/db");

const ORDEN_SECCIONES = { A: 0, B: 1, C: 2, D: 3 };
const SECCIONES_POR_ORDEN = ["A", "B", "C", "D"];

class Seccion {
  constructor(data = {}) {
    this.idSeccion = data.idSeccion || null;
    this.grado = data.grado || "";
    this.seccion = data.seccion || "";
    this.vacantes = data.vacantes || 0;
  }

  verificarVacante() {
    return this.vacantes > 0;
  }

  static async asignarAutomatico(grado, idAlumno) {
    if (!grado) {
      const [alumno] = await pool.query(
        "SELECT idApoderado FROM Alumno WHERE idAlumno = ?", [idAlumno]
      );
      if (alumno.length === 0) return null;
      grado = await determinarGradoPorEdad(alumno[0].idAlumno);
    }

    const [secciones] = await pool.query(
      "SELECT * FROM Seccion WHERE grado = ? ORDER BY seccion", [grado]
    );
    if (secciones.length === 0) return null;

    const [ultimaMatricula] = await pool.query(
      `SELECT s.seccion FROM Matricula m
       JOIN Seccion s ON m.idSeccion = s.idSeccion
       WHERE s.grado = ?
       ORDER BY m.fechaRegistro DESC
       LIMIT 1`, [grado]
    );

    let startIdx = 0;
    if (ultimaMatricula.length > 0) {
      startIdx = (ORDEN_SECCIONES[ultimaMatricula[0].seccion] + 1) % secciones.length;
    }

    for (let i = 0; i < secciones.length; i++) {
      const idx = (startIdx + i) % secciones.length;
      const sec = secciones[idx];
      if (sec.vacantes > 0) {
        return sec;
      }
    }

    return null;
  }

  async actualizarVacantes(cantidad) {
    const [[{ ocupadas }]] = await pool.query(
      `SELECT COALESCE(COUNT(*), 0) AS ocupadas FROM Matricula
       WHERE idSeccion = ? AND periodoAcademico = YEAR(CURDATE()) AND estado = 'APROBADA'`,
      [this.idSeccion]
    );
    if (cantidad < ocupadas) {
      throw new Error("La capacidad no puede ser menor que las matrículas aprobadas (" + ocupadas + ").");
    }
    const nuevasVacantes = cantidad - ocupadas;
    await pool.query(
      "UPDATE Seccion SET capacidad = ?, vacantes = ? WHERE idSeccion = ?",
      [cantidad, nuevasVacantes, this.idSeccion]
    );
    this.vacantes = nuevasVacantes;
  }

  static async findAll() {
    const [rows] = await pool.query(`
      SELECT s.idSeccion AS id, s.grado, s.seccion, s.vacantes,
        s.capacidad,
        COALESCE(a.ocupadas, 0) AS ocupadas
      FROM Seccion s
      LEFT JOIN (
        SELECT idSeccion, COUNT(*) AS ocupadas
        FROM Matricula
        WHERE periodoAcademico = YEAR(CURDATE()) AND estado = 'APROBADA'
        GROUP BY idSeccion
      ) a ON s.idSeccion = a.idSeccion
      ORDER BY s.grado, s.seccion
    `);
    return rows.map(r => ({
      id: r.id, grado: r.grado, seccion: r.seccion,
      vacantes: Number(r.vacantes),
      ocupadas: Number(r.ocupadas),
      total: Number(r.vacantes),
      capacidad: Number(r.capacidad),
    }));
  }

  static async findById(id) {
    const [rows] = await pool.query("SELECT * FROM Seccion WHERE idSeccion = ?", [id]);
    return rows.length ? new Seccion(rows[0]) : null;
  }

  static async findVacantesPorGrado() {
    const [rows] = await pool.query(`
      SELECT s.grado,
        SUM(s.vacantes) AS disponibles,
        COALESCE(SUM(a.ocupadas), 0) AS ocupadas,
        SUM(s.capacidad) AS total
      FROM Seccion s
      LEFT JOIN (
        SELECT idSeccion, COUNT(*) AS ocupadas
        FROM Matricula
        WHERE periodoAcademico = YEAR(CURDATE()) AND estado = 'APROBADA'
        GROUP BY idSeccion
      ) a ON s.idSeccion = a.idSeccion
      GROUP BY s.grado
      ORDER BY s.grado
    `);
    return rows.map(r => ({
      grado: r.grado,
      disponibles: Number(r.disponibles),
      ocupadas: Number(r.ocupadas),
      total: Number(r.total),
      capacidad: Number(r.total),
    }));
  }

  static async getTotales() {
    const [rows] = await pool.query(`
      SELECT
        SUM(s.vacantes) AS disponibles,
        COALESCE(SUM(a.ocupadas), 0) AS ocupadas,
        SUM(s.capacidad) AS total_vacantes,
        (SELECT COUNT(*) FROM Seccion WHERE vacantes <= 3) AS criticas
      FROM Seccion s
      LEFT JOIN (
        SELECT idSeccion, COUNT(*) AS ocupadas
        FROM Matricula
        WHERE periodoAcademico = YEAR(CURDATE()) AND estado = 'APROBADA'
        GROUP BY idSeccion
      ) a ON s.idSeccion = a.idSeccion
    `);
    const r = rows[0];
    return {
      disponibles: Number(r.disponibles),
      ocupadas: Number(r.ocupadas),
      total_vacantes: Number(r.total_vacantes),
      criticas: Number(r.criticas),
    };
  }
}

async function determinarGradoPorEdad(idAlumno) {
  const [rows] = await pool.query(
    "SELECT TIMESTAMPDIFF(YEAR, fechaNacimiento, CURDATE()) AS edad FROM Alumno WHERE idAlumno = ?",
    [idAlumno]
  );
  if (rows.length === 0) return null;
  const edad = rows[0].edad;
  if (edad <= 11) return "1° Secundaria";
  if (edad === 12) return "1° Secundaria";
  if (edad === 13) return "2° Secundaria";
  if (edad === 14) return "3° Secundaria";
  if (edad === 15) return "4° Secundaria";
  return "5° Secundaria";
}

module.exports = Seccion;
