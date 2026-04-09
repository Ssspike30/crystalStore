const express = require("express");
const pool = require("../config/db");
const { normalizeRequiredText, normalizeOptionalText } = require("../utils/validation");

const router = express.Router();

function buildDefaultNickname(openid) {
  const suffix = openid.slice(-6);
  return `测试用户-${suffix}`;
}

router.post("/mock-login", async (req, res, next) => {
  try {
    const openidCheck = normalizeRequiredText(req.body.mockOpenId, "mockOpenId", 64);
    if (!openidCheck.ok) {
      return res.status(400).json({ message: openidCheck.message });
    }

    const openid = openidCheck.value;
    const nicknameCheck = normalizeOptionalText(req.body.nickname, "nickname", 64);
    if (!nicknameCheck.ok) {
      return res.status(400).json({ message: nicknameCheck.message });
    }
    const avatarCheck = normalizeOptionalText(req.body.avatarUrl, "avatarUrl", 512);
    if (!avatarCheck.ok) {
      return res.status(400).json({ message: avatarCheck.message });
    }
    const unionidCheck = normalizeOptionalText(req.body.unionid, "unionid", 64);
    if (!unionidCheck.ok) {
      return res.status(400).json({ message: unionidCheck.message });
    }
    const phoneCheck = normalizeOptionalText(req.body.phone, "phone", 20);
    if (!phoneCheck.ok) {
      return res.status(400).json({ message: phoneCheck.message });
    }

    const [rows] = await pool.query(
      `
      SELECT id, openid, unionid, nickname, avatar_url, phone, status
      FROM users
      WHERE openid = ?
      LIMIT 1
      `,
      [openid]
    );

    const nextNickname = nicknameCheck.value || (rows.length && rows[0].nickname) || buildDefaultNickname(openid);
    const nextAvatarUrl = avatarCheck.value || (rows.length && rows[0].avatar_url) || null;
    const nextUnionid = unionidCheck.value || (rows.length && rows[0].unionid) || null;
    const nextPhone = phoneCheck.value || (rows.length && rows[0].phone) || null;

    let userId;
    let status = "active";
    if (!rows.length) {
      const [result] = await pool.query(
        `
        INSERT INTO users (openid, unionid, nickname, avatar_url, phone, status)
        VALUES (?, ?, ?, ?, ?, 'active')
        `,
        [openid, nextUnionid, nextNickname, nextAvatarUrl, nextPhone]
      );
      userId = result.insertId;
    } else {
      userId = rows[0].id;
      status = rows[0].status || "active";
      const changed =
        rows[0].nickname !== nextNickname ||
        rows[0].avatar_url !== nextAvatarUrl ||
        rows[0].unionid !== nextUnionid ||
        rows[0].phone !== nextPhone;

      if (changed) {
        await pool.query(
          `
          UPDATE users
          SET nickname = ?, avatar_url = ?, unionid = ?, phone = ?
          WHERE id = ?
          `,
          [nextNickname, nextAvatarUrl, nextUnionid, nextPhone, userId]
        );
      }
    }

    res.status(rows.length ? 200 : 201).json({
      userId,
      profile: {
        openid,
        unionid: nextUnionid,
        nickname: nextNickname,
        avatarUrl: nextAvatarUrl,
        phone: nextPhone,
        status
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
