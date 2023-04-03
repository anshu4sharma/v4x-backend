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
const Communitymodal = require("../models/Community");

let levalreword = [
  {
    LEVELS: 1,
    INCOME: 4,
    DIRECTS: 1,
  },
  {
    LEVELS: 2,
    INCOME: 3,
    DIRECTS: 1,
  },
  {
    LEVELS: 3,
    INCOME: 2,
    DIRECTS: 2,
  },
  {
    LEVELS: 4,
    INCOME: 1,
    DIRECTS: 2,
  },
  {
    LEVELS: 5,
    INCOME: 0.5,
    DIRECTS: 3,
  },
  {
    LEVELS: 6,
    INCOME: 0.5,
    DIRECTS: 3,
  },
  {
    LEVELS: 7,
    INCOME: 0.5,
    DIRECTS: 4,
  },
  {
    LEVELS: 8,
    INCOME: 0.5,
    DIRECTS: 4,
  },
  {
    LEVELS: 9,
    INCOME: 0.5,
    DIRECTS: 5,
  },
  {
    LEVELS: 10,
    INCOME: 0.5,
    DIRECTS: 5,
  },
  {
    LEVELS: 11,
    INCOME: 0.5,
    DIRECTS: 6,
  },
  {
    LEVELS: 12,
    INCOME: 0.5,
    DIRECTS: 6,
  },
  {
    LEVELS: 13,
    INCOME: 0.5,
    DIRECTS: 7,
  },
  {
    LEVELS: 14,
    INCOME: 0.5,
    DIRECTS: 7,
  },
  {
    LEVELS: 15,
    INCOME: 1,
    DIRECTS: 8,
  },
  {
    LEVELS: 16,
    INCOME: 2,
    DIRECTS: 8,
  },
  {
    LEVELS: 17,
    INCOME: 2,
    DIRECTS: 8,
  },
  {
    LEVELS: 18,
    INCOME: 2,
    DIRECTS: 8,
  },
];
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
              const ReffData2 = await findAllRecord(Usermodal, {
                refferalBy: ReffData.refferalId,
                isValid: true,
              });
              updateRecord(
                Usermodal,
                { _id: ReffData._id },
                {
                  leval: Number(
                    ReffData2.length == 1
                      ? 2
                      : ReffData2.length == 2
                      ? 4
                      : ReffData2.length == 3
                      ? 6
                      : ReffData2.length == 4
                      ? 8
                      : ReffData2.length == 5
                      ? 10
                      : ReffData2.length == 6
                      ? 12
                      : ReffData2.length == 7
                      ? 14
                      : ReffData2.length == 8
                      ? 16
                      : 18
                  ),
                }
              );
              const leval = await findOneRecord(Usermodal, {
                _id: ReffData._id,
                isValid: true,
              });
              let dataleval = levalreword.filter((e) => {
                if (e.LEVELS <= leval.leval) {
                  return e.INCOME;
                }
              });
              let totalNumber = 0,
                i = -1;
              while (++i < dataleval.length) {
                totalNumber += dataleval[i].INCOME;
              }
              let data = {
                userId: leval._id,
                Note: `You Got Level ${leval.leval} Income`,
                Usernameby: decoded.profile.username,
                Amount: (req.body.Amount * totalNumber) / 100,
              };
              await Communitymodal(data).save();
              return successResponse(res, {
                message: "staking complaint successfully",
              });
            } else {
              validarionerrorResponse(res, {
                message:
                  "please check your mian wallet balance do not have infoe amount to stake!",
              });
            }
          } else if (req.body.WalletType == "ewalletstacking") {
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
                WalletType: "V4X wallet",
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
              const ReffData2 = await findAllRecord(Usermodal, {
                refferalBy: ReffData.refferalId,
                isValid: true,
              });
              updateRecord(
                Usermodal,
                { _id: ReffData._id },
                {
                  leval: Number(
                    ReffData2.length == 1
                      ? 2
                      : ReffData2.length == 2
                      ? 4
                      : ReffData2.length == 3
                      ? 6
                      : ReffData2.length == 4
                      ? 8
                      : ReffData2.length == 5
                      ? 10
                      : ReffData2.length == 6
                      ? 12
                      : ReffData2.length == 7
                      ? 14
                      : ReffData2.length == 8
                      ? 16
                      : 18
                  ),
                }
              );
              const leval = await findOneRecord(Usermodal, {
                _id: ReffData._id,
                isValid: true,
              });
              let dataleval = levalreword.filter((e) => {
                if (e.LEVELS <= leval.leval) {
                  return e.INCOME;
                }
              });
              let totalNumber = 0,
                i = -1;
              while (++i < dataleval.length) {
                totalNumber += dataleval[i].INCOME;
              }
              let data = {
                userId: leval._id,
                Note: `You Got Level ${leval.leval} Income`,
                Usernameby: decoded.profile.username,
                Amount: (req.body.Amount * totalNumber) / 100,
              };
              await Communitymodal(data).save();
              return successResponse(res, {
                message: "staking complaint successfully",
              });
            } else {
              validarionerrorResponse(res, {
                message:
                  "please check your v4xWallet balance do not have infoe amount to stake!",
              });
            }
          } else {
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
              WalletType: "Dapp wallet",
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
            const ReffData = await findOneRecord(Usermodal, {
              refferalId: decoded.profile.refferalBy,
              isValid: true,
            });
            const ReffData2 = await findAllRecord(Usermodal, {
              refferalBy: ReffData.refferalId,
              isValid: true,
            });
            updateRecord(
              Usermodal,
              { _id: ReffData._id },
              {
                leval: Number(
                  ReffData2.length == 1
                    ? 2
                    : ReffData2.length == 2
                    ? 4
                    : ReffData2.length == 3
                    ? 6
                    : ReffData2.length == 4
                    ? 8
                    : ReffData2.length == 5
                    ? 10
                    : ReffData2.length == 6
                    ? 12
                    : ReffData2.length == 7
                    ? 14
                    : ReffData2.length == 8
                    ? 16
                    : 18
                ),
              }
            );
            const leval = await findOneRecord(Usermodal, {
              _id: ReffData._id,
              isValid: true,
            });
            let dataleval = levalreword.filter((e) => {
              if (e.LEVELS <= leval.leval) {
                return e.INCOME;
              }
            });
            let totalNumber = 0,
              i = -1;
            while (++i < dataleval.length) {
              totalNumber += dataleval[i].INCOME;
            }
            let data = {
              userId: leval._id,
              Note: `You Got Level ${leval.leval} Income`,
              Usernameby: decoded.profile.username,
              Amount: (req.body.Amount * totalNumber) / 100,
            };
            await Communitymodal(data).save();
            return successResponse(res, {
              message: "staking complaint successfully",
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
          await findAllRecord(Usermodal, {
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
          ]);
          const Stakingbonusdata = await findAllRecord(Stakingbonus, {
            Active: false,
          });

          let lockendamount = 0,
            i = -1;
          while (++i < Stakingbonusdata.length) {
            lockendamount += Stakingbonusdata[i]["Amount"];
            await updateRecord(
              Walletmodal,
              {
                userId: decoded.profile._id,
              },
              {
                lockendamount: Number(
                  lockendamount - Stakingbonusdata[i]["Amount"]
                ),
              }
            );
          }
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
  getCommunityincome: async (req, res) => {
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
          let data = await findAllRecord(Communitymodal, {
            userId: decoded.profile._id,
          });
          return successResponse(res, {
            message: "Community Building Programe Income get successfully",
            data: data,
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
