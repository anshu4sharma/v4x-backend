const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin");

router.get("/allusers", (req, res) => {
  return adminController.admin.alluserdata(req, res);
});
router.post("/adminuserblock", (req, res) => {
  return adminController.admin.userblock(req, res);
});
module.exports = router;