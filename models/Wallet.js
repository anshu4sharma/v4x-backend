const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const Wallet = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "user",
    },
    mainWallet: {
      type: Number,
      default: 0,
    },
    v4xWallet: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Wallet", Wallet);
