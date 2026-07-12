// Admin.js — extiende Usuario: gestionar usuarios, matrículas, vacantes, reportes
const pool = require("../config/db");
const Usuario = require("./Usuario");

class Admin extends Usuario {
  constructor(data = {}) {
    super(data);
    this.idAdmin = data.idAdmin || null;
  }

  // Registrar admin — INSERT en Usuario + Admin (transacción)
  async registrarAdmin(datos) {
    const { nombre, apellido, correo, contrasena } = datos;
    const hashed = require("bcryptjs").hashSync(contrasena, 10);
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [u] = await conn.query(
        "INSERT INTO Usuario (nombre, apellido, correo, contrasena, rol) VALUES (?, ?, ?, ?, 'ADMIN')",
        [nombre, apellido, correo, hashed]
      );
      const [a] = await conn.query(
        "INSERT INTO Admin (idUsuario) VALUES (?)",
        [u.insertId]
      );
      await conn.commit();
      return { idUsuario: u.insertId, idAdmin: a.insertId };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  // Eliminar usuario
  async eliminarUsuario(idUsuario) {
    await Usuario.delete(idUsuario);
  }

  // Actualizar vacantes de una sección
  async gestionarVacantes(idSeccion, vacantes) {
    await pool.query(
      "UPDATE Seccion SET vacantes = ? WHERE idSeccion = ?",
      [vacantes, idSeccion]
    );
  }

  // Registrar alumno — INSERT en Alumno
  async registrarAlumno(alumno) {
    const { idApoderado, nombre, apellido, dni, fechaNacimiento, genero } = alumno;
    const [result] = await pool.query(
      `INSERT INTO Alumno (idApoderado, nombre, apellido, dni, fechaNacimiento, genero)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [idApoderado, nombre, apellido, dni, fechaNacimiento, genero]
    );
    return result.insertId;
  }

  // Buscar alumno por DNI (con datos del apoderado)
  async buscarAlumno(dni) {
    const [rows] = await pool.query(
      `SELECT a.*, CONCAT(u.nombre, ' ', u.apellido) AS apoderado
       FROM Alumno a
       JOIN Apoderado ap ON a.idApoderado = ap.idApoderado
       JOIN Usuario u ON ap.idUsuario = u.idUsuario
       WHERE a.dni = ?`, [dni]
    );
    return rows.length ? rows[0] : null;
  }

  // Registrar matrícula — INSERT en Matricula
  async registrarMatricula(data) {
    const { idAlumno, idSeccion, idUsuario, periodoAcademico } = data;
    const [result] = await pool.query(
      `INSERT INTO Matricula (idAlumno, idSeccion, idUsuario, periodoAcademico, estado)
       VALUES (?, ?, ?, ?, 'PENDIENTE')`,
      [idAlumno, idSeccion, idUsuario, periodoAcademico]
    );
    return result.insertId;
  }

  // Actualizar matrícula (campos dinámicos)
  async actualizarMatricula(idMatricula, datos) {
    const campos = Object.keys(datos).map(k => `${k} = ?`).join(", ");
    const valores = Object.values(datos);
    await pool.query(
      `UPDATE Matricula SET ${campos} WHERE idMatricula = ?`,
      [...valores, idMatricula]
    );
  }

  // Eliminar matrícula por ID (soft delete)
  async eliminarMatricula(idMatricula, idUsuarioAdmin) {
    await pool.query(
      "UPDATE Matricula SET fechaEliminacion = NOW(), eliminadoPor = ? WHERE idMatricula = ?",
      [idUsuarioAdmin || null, idMatricula]
    );
  }

  // Consultar matrícula con JOINs (alumno, apoderado, sección)
  async consultarMatricula(idMatricula) {
    const [rows] = await pool.query(
      `SELECT m.*, CONCAT(al.nombre, ' ', al.apellido) AS alumno, al.dni AS dni_alumno,
              CONCAT(u.nombre, ' ', u.apellido) AS apoderado,
              s.grado, s.seccion
       FROM Matricula m
       JOIN Alumno al ON m.idAlumno = al.idAlumno
       JOIN Apoderado ap ON al.idApoderado = ap.idApoderado
       JOIN Usuario u ON ap.idUsuario = u.idUsuario
       JOIN Seccion s ON m.idSeccion = s.idSeccion
       WHERE m.idMatricula = ?`, [idMatricula]
    );
    return rows.length ? rows[0] : null;
  }

  // Validar que una matrícula existe y está PENDIENTE
  async validarMatricula(idMatricula) {
    const [rows] = await pool.query(
      "SELECT * FROM Matricula WHERE idMatricula = ? AND estado = 'PENDIENTE'",
      [idMatricula]
    );
    return rows.length > 0;
  }

  // Generar reporte de matrículas por periodo
  async generarReporte(tipo, periodo) {
    if (tipo === "matriculas") {
      const [rows] = await pool.query(`
        SELECT m.idMatricula,
               CONCAT(al.nombre, ' ', al.apellido) AS alumno,
               al.dni,
               s.grado, s.seccion,
               m.estado, m.fechaRegistro,
               CONCAT(u.nombre, ' ', u.apellido) AS apoderado
        FROM Matricula m
        JOIN Alumno al ON m.idAlumno = al.idAlumno
        JOIN Apoderado ap ON al.idApoderado = ap.idApoderado
        JOIN Usuario u ON ap.idUsuario = u.idUsuario
        JOIN Seccion s ON m.idSeccion = s.idSeccion
        WHERE m.periodoAcademico = ? AND m.fechaEliminacion IS NULL
        ORDER BY m.fechaRegistro DESC
      `, [periodo]);
      return rows;
    }
    return [];
  }

  // Obtener admin por ID (JOIN Usuario + Admin)
  static async findById(id) {
    const [rows] = await pool.query(
      `SELECT u.*, a.idAdmin FROM Usuario u
       JOIN Admin a ON u.idUsuario = a.idUsuario
       WHERE u.idUsuario = ?`, [id]
    );
    return rows.length ? new Admin(rows[0]) : null;
  }
}

module.exports = Admin;
