// HistorialCambio.js — registra y consulta el historial de cambios de cada matrícula
const pool = require("../config/db");

class HistorialCambio {
  constructor(data = {}) {
    this.idHistorial = data.idHistorial || null;
    this.idMatricula = data.idMatricula || null;
    this.idUsuario = data.idUsuario || null;
    this.estadoAnterior = data.estadoAnterior || "";
    this.estadoNuevo = data.estadoNuevo || "";
    this.descripcion = data.descripcion || "";
    this.fechaCambio = data.fechaCambio || null;
  }

  async registrarCambio(idMatricula, idUsuario, estadoAnterior, estadoNuevo, descripcion) {
    const [result] = await pool.query(
      `INSERT INTO Historial_Cambios (idMatricula, idUsuario, estadoAnterior, estadoNuevo, descripcion)
       VALUES (?, ?, ?, ?, ?)`,
      [idMatricula, idUsuario, estadoAnterior, estadoNuevo, descripcion]
    );
    this.idHistorial = result.insertId;
    return result.insertId;
  }

  obtenerDescripcion() {
    return this.descripcion || `Cambio de ${this.estadoAnterior} a ${this.estadoNuevo}`;
  }

  static async obtenerPorMatricula(idMatricula) {
    const [rows] = await pool.query(
      `SELECT hc.*, CONCAT(u.nombre, ' ', u.apellido) AS usuario
       FROM Historial_Cambios hc
       JOIN Usuario u ON hc.idUsuario = u.idUsuario
       WHERE hc.idMatricula = ?
       ORDER BY hc.fechaCambio DESC`, [idMatricula]
    );
    return rows;
  }
}

module.exports = HistorialCambio;
