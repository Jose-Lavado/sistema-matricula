// Apoderado.js — extiende Usuario: registrar hijos, solicitar matrículas, consultar estado
const pool = require("../config/db");
const Usuario = require("./Usuario");

class Apoderado extends Usuario {
  constructor(data = {}) {
    super(data);
    this.idApoderado = data.idApoderado || null;
    this.dni = data.dni || "";
    this.telefono = data.telefono || "";
    this.direccion = data.direccion || "";
    this.parentesco = data.parentesco || "";
  }

  // Registrar apoderado — INSERT en Usuario + Apoderado (transacción)
  async registrarApoderado(datos) {
    const { nombre, apellido, correo, contrasena, dni, telefono, direccion, parentesco } = datos;
    const hashed = require("bcryptjs").hashSync(contrasena, 10);
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [u] = await conn.query(
        "INSERT INTO Usuario (nombre, apellido, correo, contrasena, rol) VALUES (?, ?, ?, ?, 'APODERADO')",
        [nombre, apellido, correo, hashed]
      );
      const [a] = await conn.query(
        "INSERT INTO Apoderado (idUsuario, dni, telefono, direccion, parentesco) VALUES (?, ?, ?, ?, ?)",
        [u.insertId, dni, telefono, direccion, parentesco]
      );
      await conn.commit();
      return { idUsuario: u.insertId, idApoderado: a.insertId };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  // Registrar alumno — INSERT en Alumno
  async registrarAlumno(alumno) {
    const { nombre, apellido, dni, fechaNacimiento, genero } = alumno;
    const [result] = await pool.query(
      `INSERT INTO Alumno (idApoderado, nombre, apellido, dni, fechaNacimiento, genero)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [this.idApoderado, nombre, apellido, dni, fechaNacimiento, genero]
    );
    return result.insertId;
  }

  // Buscar alumno por DNI
  async buscarAlumno(dni) {
    const [rows] = await pool.query(
      "SELECT * FROM Alumno WHERE dni = ? AND idApoderado = ?",
      [dni, this.idApoderado]
    );
    return rows.length ? rows[0] : null;
  }

  // Solicitar matrícula — valida duplicados, asigna sección, INSERT Matricula
  async solicitarMatricula(idAlumno, grado) {
    const Seccion = require("./Seccion");
    const notificador = require("../services/Notificador");
    const HistorialCambio = require("./HistorialCambio");

    const [dup] = await pool.query(
      `SELECT idMatricula, estado FROM Matricula
       WHERE idAlumno = ? AND periodoAcademico = YEAR(CURDATE())`,
      [idAlumno]
    );
    if (dup.length > 0) {
      if (dup[0].estado === "RECHAZADA") {
        throw new Error("RECHAZADO");
      }
      const msgs = {
        PENDIENTE: "El alumno ya tiene una matrícula en proceso de aprobación.",
        APROBADA: "El alumno ya tiene una matrícula activa para el periodo actual.",
      };
      throw new Error(msgs[dup[0].estado] || "El alumno ya está matriculado.");
    }

    const seccion = await Seccion.asignarAutomatico(grado, idAlumno);
    if (!seccion) throw new Error("No hay vacantes disponibles");
    const [result] = await pool.query(
      `INSERT INTO Matricula (idAlumno, idSeccion, idUsuario, periodoAcademico, estado)
       VALUES (?, ?, ?, YEAR(CURDATE()), 'PENDIENTE')`,
      [idAlumno, seccion.idSeccion, this.idUsuario]
    );
    const idMatricula = result.insertId;
    const hist = new HistorialCambio();
    await hist.registrarCambio(idMatricula, this.idUsuario, "PENDIENTE", "PENDIENTE", "Matrícula registrada por apoderado");
    notificador.notificar("matricula_creada", { idMatricula, estado: "PENDIENTE" });
    return { idMatricula, seccion };
  }

  // Consultar estado de una matrícula
  async consultarEstadoMatricula(idMatricula) {
    const [rows] = await pool.query(
      "SELECT estado FROM Matricula WHERE idMatricula = ?", [idMatricula]
    );
    return rows.length ? rows[0].estado : null;
  }

  // Obtener apoderado por idUsuario (JOIN Usuario + Apoderado)
  static async findByIdUsuario(id) {
    const [rows] = await pool.query(
      `SELECT u.*, a.idApoderado, a.dni, a.telefono, a.direccion, a.parentesco
       FROM Usuario u
       JOIN Apoderado a ON u.idUsuario = a.idUsuario
       WHERE u.idUsuario = ?`, [id]
    );
    return rows.length ? new Apoderado(rows[0]) : null;
  }

  // Buscar apoderado por DNI
  static async findByDni(dni) {
    const [rows] = await pool.query(
      `SELECT u.*, a.idApoderado, a.dni, a.telefono, a.direccion, a.parentesco
       FROM Usuario u
       JOIN Apoderado a ON u.idUsuario = a.idUsuario
       WHERE a.dni = ?`, [dni]
    );
    return rows.length ? new Apoderado(rows[0]) : null;
  }

  // Obtener hijos con matrícula activa (INNER JOIN)
  async getHijos() {
    const [rows] = await pool.query(
      `SELECT a.*, m.idMatricula, m.estado, m.fechaRegistro, s.grado, s.seccion
       FROM Alumno a
       INNER JOIN Matricula m ON a.idAlumno = m.idAlumno AND m.periodoAcademico = YEAR(CURDATE())
       LEFT JOIN Seccion s ON m.idSeccion = s.idSeccion
       WHERE a.idApoderado = ?
       ORDER BY a.nombre`, [this.idApoderado]
    );
    return rows;
  }

  // Obtener todos los hijos (LEFT JOIN, incluye sin matrícula)
  async getTodosHijos() {
    const [rows] = await pool.query(
      `SELECT a.*, m.idMatricula, m.estado, m.fechaRegistro, s.grado, s.seccion
       FROM Alumno a
       LEFT JOIN Matricula m ON a.idAlumno = m.idAlumno AND m.periodoAcademico = YEAR(CURDATE())
       LEFT JOIN Seccion s ON m.idSeccion = s.idSeccion
       WHERE a.idApoderado = ?
       ORDER BY a.nombre`, [this.idApoderado]
    );
    return rows;
  }

  // Obtener hijos por idApoderado
  static async getHijosByIdApoderado(idApoderado) {
    const [rows] = await pool.query(
      `SELECT a.*, m.idMatricula, m.estado, m.fechaRegistro, s.grado, s.seccion
       FROM Alumno a
       INNER JOIN Matricula m ON a.idAlumno = m.idAlumno AND m.periodoAcademico = YEAR(CURDATE())
       LEFT JOIN Seccion s ON m.idSeccion = s.idSeccion
       WHERE a.idApoderado = ?
       ORDER BY a.nombre`, [idApoderado]
    );
    return rows;
  }
}

module.exports = Apoderado;
