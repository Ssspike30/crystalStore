const express = require("express");
const pool = require("../config/db");

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `
      SELECT id, sku_code, name, color, size_mm, unit_price
      FROM beads
      WHERE is_active = 1
      ORDER BY sort_order ASC, id ASC
      `
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
