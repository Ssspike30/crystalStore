const express = require("express");
const pool = require("../config/db");
const { loadRuntimeConfig } = require("../utils/runtimeConfig");

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const runtimeConfig = await loadRuntimeConfig(pool);
    res.json({
      wristMinCm: runtimeConfig.wristMinCm,
      wristMaxCm: runtimeConfig.wristMaxCm,
      shippingFee: runtimeConfig.shippingFee,
      paymentChannel: runtimeConfig.paymentChannel
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
