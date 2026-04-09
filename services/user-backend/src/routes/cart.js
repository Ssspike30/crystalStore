const express = require("express");
const pool = require("../config/db");
const { loadRuntimeConfig } = require("../utils/runtimeConfig");
const { validateWristSize, parsePositiveInt, parseNullableBoolean01 } = require("../utils/validation");

const router = express.Router();

async function ensureCart(userId) {
  const [existing] = await pool.query("SELECT id FROM carts WHERE user_id = ? LIMIT 1", [userId]);
  if (existing.length) {
    return existing[0].id;
  }
  const [result] = await pool.query("INSERT INTO carts (user_id) VALUES (?)", [userId]);
  return result.insertId;
}

async function loadCartItems(cartId) {
  const [rows] = await pool.query(
    `
    SELECT ci.id, ci.bead_id, ci.quantity, ci.selected, b.name, b.color, b.size_mm, b.unit_price
    FROM cart_items ci
    JOIN beads b ON b.id = ci.bead_id
    WHERE ci.cart_id = ?
    ORDER BY ci.id ASC
    `,
    [cartId]
  );
  return rows;
}

function sumSelectedDiameter(items, currentItemId = null, nextQuantity = null, nextSelected = null) {
  let total = 0;
  for (const item of items) {
    const quantity = item.id === currentItemId && nextQuantity != null ? nextQuantity : Number(item.quantity);
    const selected = item.id === currentItemId && nextSelected != null ? nextSelected : Number(item.selected);
    if (selected === 1) {
      total += Number(item.size_mm) * quantity;
    }
  }
  return total;
}

router.get("/", async (req, res, next) => {
  try {
    const cartId = await ensureCart(req.userId);
    const items = await loadCartItems(cartId);
    res.json({ cartId, items });
  } catch (error) {
    next(error);
  }
});

router.post("/items", async (req, res, next) => {
  try {
    const beadCheck = parsePositiveInt(req.body.beadId, "beadId");
    if (!beadCheck.ok) {
      return res.status(400).json({ message: beadCheck.message });
    }
    const quantityCheck = parsePositiveInt(req.body.quantity == null ? 1 : req.body.quantity, "quantity");
    if (!quantityCheck.ok) {
      return res.status(400).json({ message: quantityCheck.message });
    }

    const runtimeConfig = await loadRuntimeConfig(pool);
    const wristCheck = validateWristSize(req.body.wristSizeCm, runtimeConfig.wristMinCm, runtimeConfig.wristMaxCm);
    if (!wristCheck.valid) {
      return res.status(400).json({ message: wristCheck.message });
    }

    const cartId = await ensureCart(req.userId);
    const [beadRows] = await pool.query("SELECT id, size_mm FROM beads WHERE id = ? AND is_active = 1 LIMIT 1", [beadCheck.value]);
    if (!beadRows.length) {
      return res.status(404).json({ message: "珠子不存在" });
    }

    const [existingRows] = await pool.query(
      "SELECT id, selected FROM cart_items WHERE cart_id = ? AND bead_id = ? LIMIT 1",
      [cartId, beadCheck.value]
    );
    const [items] = await pool.query(
      `
      SELECT ci.id, ci.quantity, ci.selected, b.size_mm
      FROM cart_items ci
      JOIN beads b ON b.id = ci.bead_id
      WHERE ci.cart_id = ?
      `,
      [cartId]
    );
    const currentTotal = sumSelectedDiameter(items);
    const isSelectedNow = existingRows.length ? Number(existingRows[0].selected) === 1 : true;
    const nextTotal = isSelectedNow ? currentTotal + Number(beadRows[0].size_mm) * quantityCheck.value : currentTotal;
    if (nextTotal > wristCheck.wrist * 10) {
      return res.status(400).json({ message: "珠子累计直径超出腕围上限，禁止添加" });
    }

    await pool.query(
      `
      INSERT INTO cart_items (cart_id, bead_id, quantity, selected)
      VALUES (?, ?, ?, 1)
      ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)
      `,
      [cartId, beadCheck.value, quantityCheck.value]
    );

    res.status(201).json({ message: "已加入购物车" });
  } catch (error) {
    next(error);
  }
});

router.patch("/items/:id", async (req, res, next) => {
  try {
    const itemCheck = parsePositiveInt(req.params.id, "id");
    if (!itemCheck.ok) {
      return res.status(400).json({ message: itemCheck.message });
    }

    const quantity = req.body.quantity == null ? null : Number(req.body.quantity);
    if (quantity != null && (!Number.isInteger(quantity) || quantity <= 0)) {
      return res.status(400).json({ message: "quantity 必须是正整数" });
    }

    const selectedCheck = parseNullableBoolean01(req.body.selected, "selected");
    if (!selectedCheck.ok) {
      return res.status(400).json({ message: selectedCheck.message });
    }

    if (quantity == null && selectedCheck.value == null) {
      return res.status(400).json({ message: "请至少提供 quantity 或 selected" });
    }

    const [currentRows] = await pool.query(
      `
      SELECT ci.id, ci.cart_id, ci.quantity, ci.selected, b.size_mm
      FROM cart_items ci
      JOIN carts c ON c.id = ci.cart_id
      JOIN beads b ON b.id = ci.bead_id
      WHERE ci.id = ? AND c.user_id = ?
      LIMIT 1
      `,
      [itemCheck.value, req.userId]
    );
    if (!currentRows.length) {
      return res.status(404).json({ message: "购物车项不存在" });
    }

    const currentItem = currentRows[0];
    const nextQuantity = quantity == null ? Number(currentItem.quantity) : quantity;
    const nextSelected = selectedCheck.value == null ? Number(currentItem.selected) : selectedCheck.value;

    if (nextSelected === 1) {
      const runtimeConfig = await loadRuntimeConfig(pool);
      const wristCheck = validateWristSize(req.body.wristSizeCm, runtimeConfig.wristMinCm, runtimeConfig.wristMaxCm);
      if (!wristCheck.valid) {
        return res.status(400).json({ message: wristCheck.message });
      }

      const [cartRows] = await pool.query(
        `
        SELECT ci.id, ci.quantity, ci.selected, b.size_mm
        FROM cart_items ci
        JOIN beads b ON b.id = ci.bead_id
        WHERE ci.cart_id = ?
        `,
        [currentItem.cart_id]
      );
      const nextTotal = sumSelectedDiameter(cartRows, currentItem.id, nextQuantity, nextSelected);
      if (nextTotal > wristCheck.wrist * 10) {
        return res.status(400).json({ message: "珠子累计直径超出腕围上限，禁止更新" });
      }
    }

    await pool.query(
      `
      UPDATE cart_items
      SET quantity = ?, selected = ?, updated_at = NOW()
      WHERE id = ?
      `,
      [nextQuantity, nextSelected, currentItem.id]
    );

    res.json({ message: "购物车项已更新" });
  } catch (error) {
    next(error);
  }
});

router.delete("/items/:id", async (req, res, next) => {
  try {
    const itemCheck = parsePositiveInt(req.params.id, "id");
    if (!itemCheck.ok) {
      return res.status(400).json({ message: itemCheck.message });
    }

    const [result] = await pool.query(
      `
      DELETE ci
      FROM cart_items ci
      JOIN carts c ON c.id = ci.cart_id
      WHERE ci.id = ? AND c.user_id = ?
      `,
      [itemCheck.value, req.userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "购物车项不存在" });
    }

    res.json({ message: "购物车项已删除" });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
