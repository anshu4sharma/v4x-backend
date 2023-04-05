"use strict";
const mongoose = require("mongoose");
var bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const user = new mongoose.Schema(
  {
    walletaddress: { type: String, trim: true, unique: true },
    email: { type: String, trim: true },
    username: { type: String, default: null, unique: true },
    leval: { type: Number, default: 0 },
    Rank: { type: String, default: "DIRECT" },
    password: { type: String, trim: true },
    isValid: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    iswalletActive: { type: Boolean, default: true },
    refferalId: { type: String, trim: true, unique: true },
    refferalBy: { type: String, trim: true },
    Airdropped: { type: Number, default: 10 },
    teamtotalstack: { type: Number, default: 0 },
    AirdroppedActive: { type: Boolean, default: false },
    referredUser: [String],
    note: {
      accountBlock: { type: String, default: "sss" },
      walletBlock: { type: String, default: "" },
    },
  },
  {
    timestamps: true,
  }
);
user.pre("save", async function (next) {
  this.isModified("password") &&
    (this.password = await bcrypt.hash(this.password, 10));
  next();
});
module.exports = mongoose.model("user", user);
