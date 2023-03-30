const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const Staking = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    WalletType: {
      type: String,
      default: 0,
      required: true,
    },
    TotaldaysTosendReword: {
      type: Number,
      default: 730,
      required: true,
    },
    DailyReword: {
      type: Number,
      required: true,
    },
    Amount: {
      type: Number,
      default: 0,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Staking", Staking);
