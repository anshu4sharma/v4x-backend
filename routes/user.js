const express = require("express");
const router = express.Router();
const stackController = require("../controllers/Staking");

router.get("/allstacking", (req, res) => {
  return stackController.stack.gelallstack(req, res);
});
router.get("/gelUserWallate", (req, res) => {
  return stackController.stack.gelUserWallate(req, res);
});

module.exports = router;


// /user/allstacking