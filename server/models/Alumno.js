// Alumno.js — CRUD alumnos, validación de DNI, búsqueda por DNI, cálculo de edad
const pool = require("../config/db");

class Alumno {
  constructor(data = {}) {
    this.idAlumno = data.idAlumno || null;
    this.idApoderado = data.idApoderado || null;
    this.nombre = data.nombre || "";
    this.apellido = data.apellido || "";
    this.dni = data.dni || "";
    this.fechaNacimiento = data.fechaNacimiento || null;
    this.genero = data.genero || "";
  }

  async validarDuplicados(dni) {
    const [rows] = await pool.query(
      "SELECT idAlumno FROM Alumno WHERE dni = ?", [dni]
    );
    return rows.length > 0;
  }

  validarDatos(nombre, dni) {
    if (!nombre || nombre.trim().length < 2) return false;
    if (!dni || !/^\d{8}$/.test(dni)) return false;
    return true;
  }

  calcularEdad() {
    if (!this.fechaNacimiento) return 0;
    const hoy = new Date();
    const nac = new Date(this.fechaNacimiento);
    let edad = hoy.getFullYear() - nac.getFullYear();
    const m = hoy.getMonth() - nac.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
    return edad;
  }

  static async findById(id) {
    const [rows] = await pool.query("SELECT * FROM Alumno WHERE idAlumno = ?", [id]);
    return rows.length ? new Alumno(rows[0]) : null;
  }

  static async findByDni(dni) {
    const [rows] = await pool.query(
      `SELECT a.*, CONCAT(u.nombre, ' ', u.apellido) AS apoderado_nombre,
              ap.dni AS apoderado_dni, ap.parentesco,
              CASE WHEN EXISTS (
                SELECT 1 FROM Matricula m
                WHERE m.idAlumno = a.idAlumno
                AND m.periodoAcademico = YEAR(CURDATE())
              ) THEN TRUE ELSE FALSE END AS matriculado,
              (SELECT m.estado FROM Matricula m
               WHERE m.idAlumno = a.idAlumno
               AND m.periodoAcademico = YEAR(CURDATE())
               ORDER BY m.fechaRegistro DESC
               LIMIT 1) AS estadoMatricula
       FROM Alumno a
       JOIN Apoderado ap ON a.idApoderado = ap.idApoderado
       JOIN Usuario u ON ap.idUsuario = u.idUsuario
       WHERE a.dni = ?`, [dni]
    );
    return rows.length ? rows[0] : null;
  }

  static async findAll() {
    const [rows] = await pool.query(
      `SELECT a.*, CONCAT(u.nombre, ' ', u.apellido) AS apoderado_nombre
       FROM Alumno a
       JOIN Apoderado ap ON a.idApoderado = ap.idApoderado
       JOIN Usuario u ON ap.idUsuario = u.idUsuario
       ORDER BY a.nombre`
    );
    return rows;
  }
}

module.exports = Alumno;