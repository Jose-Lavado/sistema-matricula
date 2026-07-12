// libreria: winston — Logger estructurado (equivalente a Logback en Java)
const winston = require("winston");

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),
    winston.format((info) => {
      delete info.password;
      delete info.token;
      delete info.nuevaContrasena;
      delete info.contrasena;
      return info;
    })(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: "logs/error.log", level: "error", maxsize: 5242880, maxFiles: 5 }),
    new winston.transports.File({ filename: "logs/combined.log", maxsize: 5242880, maxFiles: 5 }),
    new winston.transports.Console({ format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )}),
  ],
});

module.exports = logger;
