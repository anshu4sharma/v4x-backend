const express = require("express");
const router = express.Router();
const validator = require("../validator/validator");
const registerController = require("../controllers/register");
const StakingController = require("../controllers/Staking");

router.post("/signUp", validator.signUp, (req, res) => {
  return registerController.register.signUp(req, res);
});
router.post("/signUp1", validator.signUp, (req, res) => {
  return registerController.register.signUp(req, res);
});
router.get("/signUp/varify:Token", (req, res) => {
  return registerController.register.mailVarify(req, res);
});
router.post("/signIn", validator.signIn, (req, res) => {
  return registerController.register.signIn(req, res);
});
router.put("/forgotPassword", (req, res) => {
  return registerController.register.forgotPassword(req, res);
});
router.post("/changepassword", (req, res) => {
  return registerController.register.changePassword(req, res);
});
router.post("/addTicket", (req, res) => {
  return registerController.register.addTicket(req, res);
});
router.get("/livaprice", (req, res) => {
  return StakingController.stack.livaprice(req, res);
});

module.exports = router;
