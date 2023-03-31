const { Db } = require("mongodb");
const {
  decodeUris,
  cloneDeep,
  findOneRecord,
  updateRecord,
  hardDeleteRecord,
  updateRecordValue,
  findAllRecord,
} = require("../library/commonQueries");
const {
  successResponse,
  badRequestResponse,
  errorResponse,
  notFoundResponse,
  validarionerrorResponse,
} = require("../middleware/response");
const { tokenverify } = require("../middleware/token");
const Stakingmodal = require("../models/Staking");
const Walletmodal = require("../models/Wallet");
const Usermodal = require("../models/user");
const Stakingbonus = require("../models/Stakingbonus");
exports.stack = {
  Buystack: async (req, res) => {
    try {
      if (req.headers.authorization) {
        let { err, decoded } = await tokenverify(
          req.headers.authorization.split(" ")[1]
        );
        if (err) {
          notFoundResponse(res, {
            message: "user not found",
          });
        }
        if (decoded) {
          decoded = await cloneDeep(decoded);
          const WalletData = await findOneRecord(Walletmodal, {
            userId: decoded.profile._id,
          });
          if (req.body.WalletType == "Mainwalletstacking") {
            if (WalletData.mainWallet >= req.body.Amount) {
              const ReffData = await findOneRecord(Usermodal, {
                refferalId: decoded.profile.refferalBy,
                isValid: true,
              });
              await updateRecord(
                Walletmodal,
                {
                  userId: ReffData._id,
                },
                { $inc: { mainWallet: (req.body.Amount * 10) / 100 } }
              );
              await Stakingbonus({
                userId: ReffData._id,
                ReffId: decoded.profile._id,
                Amount: (req.body.Amount * 10) / 100,
                Note: `You Got Airdrop V4x token through Refer And Earn Income from ${decoded.profile.username}`,
                Active: true,
              }).save();
              updateRecord(
                Walletmodal,
                { userId: decoded.profile._id },
                { mainWallet: WalletData.mainWallet - req.body.Amount }
              );
              await Stakingmodal({
                userId: decoded.profile._id,
                WalletType: "Main wallet",
                DailyReword: Number(req.body.Amount / 730).toFixed(3) * 2,
                Amount: req.body.Amount,
                TotalRewordRecived: req.body.Amount * 2,
                V4xTokenPrice: req.body.V4xTokenPrice,
              }).save();
              updateRecord(
                Walletmodal,
                { userId: decoded.profile._id },
                { mainWallet: WalletData.mainWallet - req.body.Amount }
              );
              return successResponse(res, {
                message: "staking complaint successfully",
              });
            } else {
              validarionerrorResponse(res, {
                message:
                  "please check your mian wallet balance do not have infoe amount to stake!",
              });
            }
          } else {
            if (WalletData.v4xWallet >= req.body.Amount) {
              const ReffData = await findOneRecord(Usermodal, {
                refferalId: decoded.profile.refferalBy,
                isValid: true,
              });
              await updateRecord(
                Walletmodal,
                {
                  userId: ReffData._id,
                },
                { $inc: { mainWallet: (req.body.Amount * 10) / 100 } }
              );
              await Stakingbonus({
                userId: ReffData._id,
                ReffId: decoded.profile._id,
                Amount: (req.body.Amount * 10) / 100,
                Note: `You Got Airdrop V4x token through Refer And Earn Income from ${decoded.profile.username}`,
                Active: true,
              }).save();
              await Stakingmodal({
                userId: decoded.profile._id,
                WalletType: "v4x wallet",
                DailyReword: Number(req.body.Amount / 730).toFixed(3) * 2,
                Amount: req.body.Amount,
                Amount: req.body.Amount,
                TotalRewordRecived: req.body.Amount * 2,
                V4xTokenPrice: req.body.V4xTokenPrice,
              }).save();
              updateRecord(
                Walletmodal,
                { userId: decoded.profile._id },
                { v4xWallet: WalletData.v4xWallet - req.body.Amount }
              );
              return successResponse(res, {
                message: "staking complaint successfully",
              });
            } else {
              validarionerrorResponse(res, {
                message:
                  "please check your v4xWallet balance do not have infoe amount to stake!",
              });
            }
          }
        }
      } else {
        badRequestResponse(res, {
          message: "No token provided.",
        });
      }
    } catch (error) {
      return errorResponse(error, res);
    }
  },
  gelallstack: async (req, res) => {
    try {
      if (req.headers.authorization) {
        let { err, decoded } = await tokenverify(
          req.headers.authorization.split(" ")[1]
        );
        if (err) {
          notFoundResponse(res, {
            message: "user not found",
          });
        }
        if (decoded) {
          decoded = await cloneDeep(decoded);
          const StakingData = await findAllRecord(Stakingmodal, {
            userId: decoded.profile._id,
          });
          return successResponse(res, {
            message: "staking data get successfully",
            data: StakingData,
          });
        }
      } else {
        badRequestResponse(res, {
          message: "No token provided.",
        });
      }
    } catch (error) {
      return errorResponse(error, res);
    }
  },
  gelUserWallate: async (req, res) => {
    try {
      if (req.headers.authorization) {
        let { err, decoded } = await tokenverify(
          req.headers.authorization.split(" ")[1]
        );
        if (err) {
          notFoundResponse(res, {
            message: "user not found",
          });
        }
        if (decoded) {
          decoded = await cloneDeep(decoded);
          const StakingData = await findAllRecord(Walletmodal, {
            userId: decoded.profile._id,
          });
          return successResponse(res, {
            message: "staking data get successfully",
            data: StakingData,
            profile: decoded.profile,
          });
        }
      } else {
        badRequestResponse(res, {
          message: "No token provided.",
        });
      }
    } catch (error) {
      return errorResponse(error, res);
    }
  },
  getstackbouns: async (req, res) => {
    try {
      if (req.headers.authorization) {
        let { err, decoded } = await tokenverify(
          req.headers.authorization.split(" ")[1]
        );
        if (err) {
          notFoundResponse(res, {
            message: "user not found",
          });
        }
        if (decoded) {
          decoded = await cloneDeep(decoded);
          const StakingData = await findAllRecord(Stakingbonus, {
            userId: decoded.profile._id,
          });
          return successResponse(res, {
            message: "staking data get successfully",
            data: StakingData,
            profile: decoded.profile,
          });
        }
      } else {
        badRequestResponse(res, {
          message: "No token provided.",
        });
      }
    } catch (error) {
      return errorResponse(error, res);
    }
  },  
};
