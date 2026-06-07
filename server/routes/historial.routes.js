// /api/historial — historial de cambios de una matrícula (protegido)
const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/verifyToken");
const historialController = require("../controllers/historialController");

router.get("/matricula/:idMatricula", verifyToken, historialController.obtenerPorMatricula);

module.exports = router;
