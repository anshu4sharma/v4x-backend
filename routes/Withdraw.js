const express = require("express");
const router = express.Router();
const validator = require("../validator/validator");
const WithdrawController = require("../controllers/Withdraw");

router.get("/stackingbouns", (req, res) => {
  return WithdrawController.Withdraw.Withdrawotpsend(req, res);
});
router.post("/checkotp", (req, res) => {
  return WithdrawController.Withdraw.Withdrawotpcheck(req, res);
});
router.get("/mainWallet", (req, res) => {
  return WithdrawController.Withdraw.MainWallet(req, res);
});
router.get("/v4xWallet", (req, res) => {
  return WithdrawController.Withdraw.V4xWallet(req, res);
});
router.get("/Withdrdata", (req, res) => {
  return WithdrawController.Withdraw.Withdrdata(req, res);
});

module.exports = router;
