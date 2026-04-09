const express = require("express");
const pool = require("../config/db");

const router = express.Router();

function validateAddress(payload) {
  const required = ["receiverName", "receiverPhone", "province", "city", "district", "detailAddress"];
  for (const key of required) {
    if (!payload[key] || String(payload[key]).trim() === "") {
      return `${key} 不能为空`;
    }
  }
  return null;
}

router.get("/", async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `
      SELECT id, receiver_name, receiver_phone, province, city, district, detail_address, postal_code, tag, is_default
      FROM addresses
      WHERE user_id = ?
      ORDER BY is_default DESC, id DESC
      `,
      [req.userId]
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const err = validateAddress(req.body);
    if (err) return res.status(400).json({ message: err });

    const {
      receiverName,
      receiverPhone,
      province,
      city,
      district,
      detailAddress,
      postalCode = null,
      tag = null,
      isDefault = 0
    } = req.body;

    if (Number(isDefault) === 1) {
      await pool.query("UPDATE addresses SET is_default = 0 WHERE user_id = ?", [req.userId]);
    }

    const [result] = await pool.query(
      `
      INSERT INTO addresses
      (user_id, receiver_name, receiver_phone, province, city, district, detail_address, postal_code, tag, is_default)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        req.userId,
        receiverName,
        receiverPhone,
        province,
        city,
        district,
        detailAddress,
        postalCode,
        tag,
        Number(isDefault) === 1 ? 1 : 0
      ]
    );

    res.status(201).json({ id: result.insertId, message: "地址已创建" });
  } catch (error) {
    next(error);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!id || Number.isNaN(id)) return res.status(400).json({ message: "地址ID非法" });

    const err = validateAddress(req.body);
    if (err) return res.status(400).json({ message: err });

    const [exists] = await pool.query("SELECT id FROM addresses WHERE id = ? AND user_id = ? LIMIT 1", [id, req.userId]);
    if (!exists.length) return res.status(404).json({ message: "地址不存在" });

    const {
      receiverName,
      receiverPhone,
      province,
      city,
      district,
      detailAddress,
      postalCode = null,
      tag = null,
      isDefault = 0
    } = req.body;

    if (Number(isDefault) === 1) {
      await pool.query("UPDATE addresses SET is_default = 0 WHERE user_id = ?", [req.userId]);
    }

    await pool.query(
      `
      UPDATE addresses
      SET receiver_name = ?, receiver_phone = ?, province = ?, city = ?, district = ?, detail_address = ?, postal_code = ?, tag = ?, is_default = ?
      WHERE id = ? AND user_id = ?
      `,
      [
        receiverName,
        receiverPhone,
        province,
        city,
        district,
        detailAddress,
        postalCode,
        tag,
        Number(isDefault) === 1 ? 1 : 0,
        id,
        req.userId
      ]
    );

    res.json({ message: "地址已更新" });
  } catch (error) {
    next(error);
  }
});

router.patch("/:id/default", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!id || Number.isNaN(id)) return res.status(400).json({ message: "地址ID非法" });

    const [exists] = await pool.query("SELECT id FROM addresses WHERE id = ? AND user_id = ? LIMIT 1", [id, req.userId]);
    if (!exists.length) return res.status(404).json({ message: "地址不存在" });

    await pool.query("UPDATE addresses SET is_default = 0 WHERE user_id = ?", [req.userId]);
    await pool.query("UPDATE addresses SET is_default = 1 WHERE id = ? AND user_id = ?", [id, req.userId]);
    res.json({ message: "默认地址已更新" });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!id || Number.isNaN(id)) return res.status(400).json({ message: "地址ID非法" });
    const [result] = await pool.query("DELETE FROM addresses WHERE id = ? AND user_id = ?", [id, req.userId]);
    if (result.affectedRows === 0) return res.status(404).json({ message: "地址不存在" });
    res.json({ message: "地址已删除" });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
