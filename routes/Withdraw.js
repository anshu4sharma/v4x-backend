const express = require("express");
const router = express.Router();
const validator = require("../validator/validator");
const WithdrawController = require("../controllers/Withdraw");

router.get("/stackingbouns", (req, res) => {
  return WithdrawController.Withdraw.Withdrawotpsend(req, res);
});

module.exports = router;