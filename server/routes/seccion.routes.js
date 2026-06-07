// /api/secciones — listar, vacantes por grado, totales, actualizar vacantes (protegido)
const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/verifyToken");
const verifyRole = require("../middleware/verifyRole");
const seccionController = require("../controllers/seccionController");

router.get("/", verifyToken, seccionController.listar);
router.get("/vacantes", verifyToken, seccionController.vacantesPorGrado);
router.get("/totales", verifyToken, seccionController.totales);
router.put("/:id/vacantes", verifyToken, verifyRole("Administrador"), seccionController.actualizarVacantes);

module.exports = router;
