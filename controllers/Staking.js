const { Types } = require("mongoose");
const { ObjectId } = Types;
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
const Transactionmodal = require("../models/Transaction");
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
            if (
              WalletData.mainWallet >=
              req.body.Amount * req.body.V4xTokenPrice
            ) {
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
                DailyReword:
                  req.body.Amount <= 2500
                    ? Number(req.body.Amount / 730) * 2
                    : req.body.Amount >= 2550 && req.body.Amount <= 10000
                    ? Number(req.body.Amount / 730) * 2.25
                    : req.body.Amount >= 10050 && req.body.Amount <= 25000
                    ? Number(req.body.Amount / 730) * 2.5
                    : Number(req.body.Amount / 730) * 3,
                bonusAmount:
                  req.body.Amount <= 2500
                    ? 200
                    : req.body.Amount >= 2550 && req.body.Amount <= 10000
                    ? 225
                    : req.body.Amount >= 10050 && req.body.Amount <= 25000
                    ? 250
                    : 300,
                Amount: req.body.Amount,
                TotalRewordRecived:
                  req.body.Amount <= 2500
                    ? req.body.Amount * 2
                    : req.body.Amount >= 2550 && req.body.Amount <= 10000
                    ? req.body.Amount * 2.25
                    : req.body.Amount >= 10050 && req.body.Amount <= 25000
                    ? req.body.Amount * 2.5
                    : req.body.Amount * 3,
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
            if (
              WalletData.v4xWallet >=
              req.body.Amount * req.body.V4xTokenPrice
            ) {
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
                DailyReword:
                  Number(req.body.Amount / 730) * req.body.Amount <= 2500
                    ? Number(req.body.Amount / 730) * 2
                    : req.body.Amount >= 2550 && req.body.Amount <= 10000
                    ? Number(req.body.Amount / 730) * 2.25
                    : req.body.Amount >= 10050 && req.body.Amount <= 25000
                    ? Number(req.body.Amount / 730) * 2.5
                    : Number(req.body.Amount / 730) * 3,
                bonusAmount:
                  req.body.Amount <= 2500
                    ? 200
                    : req.body.Amount >= 2550 && req.body.Amount <= 10000
                    ? 225
                    : req.body.Amount >= 10050 && req.body.Amount <= 25000
                    ? 250
                    : 300,
                Amount: req.body.Amount,
                TotalRewordRecived:
                  req.body.Amount <= 2500
                    ? req.body.Amount * 2
                    : req.body.Amount >= 2550 && req.body.Amount <= 10000
                    ? req.body.Amount * 2.25
                    : req.body.Amount >= 10050 && req.body.Amount <= 25000
                    ? req.body.Amount * 2.5
                    : req.body.Amount * 3,
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
          const ReffData = await findAllRecord(Usermodal, {
            refferalBy: decoded.profile.refferalId,
            isValid: true,
          });
          let data = await Usermodal.aggregate([
            {
              $match: {
                refferalBy: decoded.profile.refferalId,
              },
            },
            {
              $lookup: {
                from: "users",
                let: {
                  rId: "$refferalId",
                },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [{ $eq: ["$refferalBy", "$$rId"] }],
                      },
                    },
                  },
                ],
                as: "referBY",
              },
            },
            {
              $lookup: {
                from: "stakings",
                let: {
                  rId: "$_id",
                },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [{ $eq: ["$userId", "$$rId"] }],
                      },
                    },
                  },
                ],
                as: "stackingdata",
              },
            },
          ]);
          console.log("data===>>><<<.>>>", data);
          return successResponse(res, {
            message: "wallet data get successfully",
            data: StakingData,
            profile: decoded.profile,
            ReffData: data,
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
  Transfercoin: async (req, res) => {
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
          let data = await findOneRecord(Walletmodal, {
            userId: decoded.profile._id,
          });
          if (req.body.Amount > 0) {
            if (req.body.Wallet === "Main Wallet") {
              if (data.mainWallet >= req.body.Amount) {
                let amount = Number(data.mainWallet - req.body.Amount);
                let tdata = {
                  userId: new ObjectId(decoded.profile._id),
                  tranforWallet: req.body.Wallet,
                  fromaccountusername: new ObjectId(req.body.Username),
                  Amount: Number(req.body.Amount),
                };
                await Transactionmodal(tdata).save();
                await updateRecord(
                  Walletmodal,
                  {
                    userId: decoded.profile._id,
                  },
                  {
                    mainWallet: amount,
                  }
                );
                await updateRecord(
                  Walletmodal,
                  {
                    userId: new ObjectId(req.body.Username),
                  },
                  { $inc: { v4xWallet: req.body.Amount } }
                );
                return successResponse(res, {
                  message: "transactions have been sent successfully",
                });
              } else {
                validarionerrorResponse(res, {
                  message:
                    "please check your mian wallet balance do not have infoe amount to Transfer!",
                });
              }
            } else {
              if (data.v4xWallet >= req.body.Amount) {
                let amount = Number(data.v4xWallet - req.body.Amount);
                let tdata = {
                  userId: new ObjectId(decoded.profile._id),
                  tranforWallet: req.body.Wallet,
                  fromaccountusername: new ObjectId(req.body.Username),
                  Amount: Number(req.body.Amount),
                };
                await Transactionmodal(tdata).save();
                await updateRecord(
                  Walletmodal,
                  {
                    userId: decoded.profile._id,
                  },
                  {
                    v4xWallet: amount,
                  }
                );
                await updateRecord(
                  Walletmodal,
                  {
                    userId: new ObjectId(req.body.Username),
                  },
                  { $inc: { v4xWallet: req.body.Amount } }
                );
                return successResponse(res, {
                  message: "transactions have been sent successfully",
                });
              } else {
                validarionerrorResponse(res, {
                  message:
                    "please check your V4X wallet balance do not have infoe amount to Transfer!",
                });
              }
            }
          } else {
            badRequestResponse(res, {
              message: "plase enter valid amount.",
            });
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
  getTransfercoinasync: async (req, res) => {
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
          const ReffData = await findAllRecord(Usermodal, {
            _id: decoded.profile._id,
          });
          let data = await Transactionmodal.aggregate([
            {
              $match: {
                userId: ReffData[0]._id,
              },
            },
            {
              $lookup: {
                from: "users",
                localField: "fromaccountusername",
                foreignField: "_id",
                as: "username",
              },
            },
            {
              $project: {
                tranforWallet: 1,
                Amount: 1,
                "username.username": 1,
                createdAt: 1,
              },
            },
          ]);

          let reciveddata = await Transactionmodal.aggregate([
            {
              $match: {
                fromaccountusername: ReffData[0]._id,
              },
            },
            {
              $lookup: {
                from: "users",
                localField: "userId",
                foreignField: "_id",
                as: "username",
              },
            },
            {
              $project: {
                tranforWallet: 1,
                Amount: 1,
                "username.username": 1,
                createdAt: 1,
              },
            },
          ]);
          console.log("reciveddata", reciveddata);
          return successResponse(res, {
            message: "Transfer data get successfully",
            data: data,
            reciveddata: reciveddata,
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
