"use strict";
const mongoose = require("mongoose");
var bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const user = new mongoose.Schema(
  {
    walletaddress: { type: String, trim: true, unique: true },
    email: { type: String, trim: true },
    username: { type: String, default: null },
    password: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    isValid: { type: Boolean, default: false },
    refferalId: { type: String, trim: true },
    refferalBy: { type: String, trim: true },
    Airdropped: { type: Number, default: 10 },
    AirdroppedActive: { type: Boolean, default: false },
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
