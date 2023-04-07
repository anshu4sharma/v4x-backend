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
const Achivementmodal = require("../models/Achivement");
const Passivemodal = require("../models/Passive");
const V4Xpricemodal = require("../models/V4XLiveRate");

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
                username: decoded.profile.refferalBy,
                isValid: true,
              });
              if (ReffData !== null) {
                const price = await findAllRecord(V4Xpricemodal, {});
                await updateRecord(
                  Walletmodal,
                  {
                    userId: ReffData._id,
                  },
                  {
                    $inc: {
                      mainWallet: (req.body.Amount * price[0].price * 10) / 100,
                    },
                  }
                );
                await Stakingbonus({
                  userId: ReffData._id,
                  ReffId: decoded.profile._id,
                  Amount: (req.body.Amount * price[0].price * 10) / 100,
                  Note: `You Got Refer and Earn Income From ${decoded.profile.username}`,
                  Active: true,
                }).save();

                updateRecord(
                  Walletmodal,
                  { userId: decoded.profile._id },
                  { mainWallet: WalletData.mainWallet - req.body.Amount }
                );
                const ReffData2 = await findAllRecord(Usermodal, {
                  refferalBy: ReffData.username,
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
                if (leval.leval > 0) {
                  await updateRecord(
                    Walletmodal,
                    {
                      userId: leval._id,
                      isValid: true,
                    },
                    {
                      $inc: {
                        mainWallet: (req.body.Amount * totalNumber) / 100,
                      },
                    }
                  );
                  let data = {
                    userId: leval._id,
                    Note: `You Got Level ${leval.leval} Income`,
                    Usernameby: decoded.profile.username,
                    Amount: (req.body.Amount * totalNumber) / 100,
                  };
                  await Communitymodal(data).save();
                }
              }

              await updateRecord(
                Walletmodal,
                { userId: decoded.profile._id },
                { mainWallet: WalletData.mainWallet - req.body.Amount }
              );

              const price = await findAllRecord(V4Xpricemodal, {});
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
                V4xTokenPrice: price[0].price,
              }).save();
              
              await Usermodal.aggregate([
                {
                  $match: {
                    email: decoded.profile.email,
                  },
                },
                {
                  $graphLookup: {
                    from: "users",
                    startWith: "$username",
                    connectFromField: "username",
                    connectToField: "refferalBy",
                    as: "refers_to",
                  },
                },
                {
                  $lookup: {
                    from: "stakings",
                    localField: "refers_to._id",
                    foreignField: "userId",
                    as: "amount",
                  },
                },
                {
                  $lookup: {
                    from: "stakings",
                    localField: "_id",
                    foreignField: "userId",
                    as: "amount2",
                  },
                },
                {
                  $match: {
                    amount: {
                      $ne: [],
                    },
                  },
                },
                {
                  $project: {
                    total: {
                      $reduce: {
                        input: "$amount",
                        initialValue: 0,
                        in: {
                          $add: ["$$value", "$$this.Amount"],
                        },
                      },
                    },
                    total1: {
                      $reduce: {
                        input: "$amount2",
                        initialValue: 0,
                        in: {
                          $add: ["$$value", "$$this.Amount"],
                        },
                      },
                    },
                    walletaddress: 1,
                    email: 1,
                    password: 1,
                    isActive: 1,
                    isValid: 1,
                    username: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    level: 4,
                    referredUser: 1,
                    refers_to: 1,
                  },
                },
                {
                  $unwind: {
                    path: "$refers_to",
                    preserveNullAndEmptyArrays: true,
                  },
                },
              ]).then(async (e) => {
                if (e.length > 0) {
                  console.log("e[0]=====>", e[0]);
                  await updateRecord(
                    Usermodal,
                    { _id: e[0]._id },
                    { teamtotalstack: e[0].total, mystack: e[0].total1 }
                  );
                }
              });
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
                username: decoded.profile.refferalBy,
                isValid: true,
              });
              
             
              if (ReffData !== null) {
                const price = await findAllRecord(V4Xpricemodal, {});
                await updateRecord(
                  Walletmodal,
                  {
                    userId: ReffData._id,
                  },
                  {
                    $inc: {
                      mainWallet: (req.body.Amount * price[0].price * 10) / 100,
                    },
                  }
                );
                await Stakingbonus({
                  userId: ReffData._id,
                  ReffId: decoded.profile._id,
                  Amount: (req.body.Amount * price[0].price * 10) / 100,
                  Note: `You Got Refer and Earn Income From ${decoded.profile.username}`,
                  Active: true,
                }).save();

                updateRecord(
                  Walletmodal,
                  { userId: decoded.profile._id },
                  { mainWallet: WalletData.mainWallet - req.body.Amount }
                );
                const ReffData2 = await findAllRecord(Usermodal, {
                  refferalBy: ReffData.username,
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
                if (leval.leval > 0) {
                  await updateRecord(
                    Walletmodal,
                    {
                      userId: leval._id,
                      isValid: true,
                    },
                    {
                      $inc: {
                        mainWallet: (req.body.Amount * totalNumber) / 100,
                      },
                    }
                  );
                  let data = {
                    userId: leval._id,
                    Note: `You Got Level ${leval.leval} Income`,
                    Usernameby: decoded.profile.username,
                    Amount: (req.body.Amount * totalNumber) / 100,
                  };
                  await Communitymodal(data).save();
                }
              }
              updateRecord(
                Walletmodal,
                { userId: decoded.profile._id },
                { v4xWallet: WalletData.v4xWallet - req.body.Amount }
              );
              const price = await findAllRecord(V4Xpricemodal, {});
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
                V4xTokenPrice: price[0].price,
              }).save();
              await Usermodal.aggregate([
                {
                  $match: {
                    email: decoded.profile.email,
                  },
                },
                {
                  $graphLookup: {
                    from: "users",
                    startWith: "$username",
                    connectFromField: "username",
                    connectToField: "refferalBy",
                    as: "refers_to",
                  },
                },
                {
                  $lookup: {
                    from: "stakings",
                    localField: "refers_to._id",
                    foreignField: "userId",
                    as: "amount",
                  },
                },
                {
                  $lookup: {
                    from: "stakings",
                    localField: "_id",
                    foreignField: "userId",
                    as: "amount2",
                  },
                },
                {
                  $match: {
                    amount: {
                      $ne: [],
                    },
                  },
                },
                {
                  $project: {
                    total: {
                      $reduce: {
                        input: "$amount",
                        initialValue: 0,
                        in: {
                          $add: ["$$value", "$$this.Amount"],
                        },
                      },
                    },
                    total1: {
                      $reduce: {
                        input: "$amount2",
                        initialValue: 0,
                        in: {
                          $add: ["$$value", "$$this.Amount"],
                        },
                      },
                    },
                    walletaddress: 1,
                    email: 1,
                    password: 1,
                    isActive: 1,
                    isValid: 1,
                    username: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    level: 4,
                    referredUser: 1,
                    refers_to: 1,
                  },
                },
                {
                  $unwind: {
                    path: "$refers_to",
                    preserveNullAndEmptyArrays: true,
                  },
                },
              ]).then(async (e) => {
                if (e.length > 0) {
                  console.log("e[0]=====>", e[0]);
                  await updateRecord(
                    Usermodal,
                    { _id: e[0]._id },
                    { teamtotalstack: e[0].total, mystack: e[0].total1 }
                  );
                }
              });
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
            const price = await findAllRecord(V4Xpricemodal, {});
            await updateRecord(
              Walletmodal,
              {
                userId: ReffData._id,
              },
              {
                $inc: {
                  mainWallet: (req.body.Amount * price[0].price * 10) / 100,
                },
              }
            );
            await Stakingbonus({
              userId: ReffData._id,
              ReffId: decoded.profile._id,
              Amount: (req.body.Amount * price[0].price * 10) / 100,
              Note: `You Got Refer and Earn Income From ${decoded.profile.username}`,
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
              V4xTokenPrice: price[0].price,
            }).save();
            updateRecord(
              Walletmodal,
              { userId: decoded.profile._id },
              { v4xWallet: WalletData.v4xWallet - req.body.Amount }
            );
            const ReffData = await findOneRecord(Usermodal, {
              username: decoded.profile.refferalBy,
              isValid: true,
            });
            const ReffData2 = await findAllRecord(Usermodal, {
              refferalBy: ReffData.username,
              isValid: true,
            });
            if (ReffData2.length > 0) {
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
              let data = {
                userId: leval._id,
                Note: `You Got Level ${leval.leval} Income`,
                Usernameby: decoded.profile.username,
                Amount: (req.body.Amount * totalNumber) / 100,
              };
              await Communitymodal(data).save();
            }
            // const leval = await findOneRecord(Usermodal, {
            //   _id: ReffData._id,
            //   isValid: true,
            // });
            // let dataleval = levalreword.filter((e) => {
            //   if (e.LEVELS <= leval.leval) {
            //     return e.INCOME;
            //   }
            // });
            // let totalNumber = 0,
            //   i = -1;
            // while (++i < dataleval.length) {
            //   totalNumber += dataleval[i].INCOME;
            // }
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
          const price = await findAllRecord(V4Xpricemodal, {});
          return successResponse(res, {
            message: "staking data get successfully",
            data: StakingData,
            V4Xtokenprice: price[0].price,
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
          let data = await Usermodal.aggregate([
            {
              $match: {
                email: decoded.profile.email,
              },
            },
            {
              $graphLookup: {
                from: "users",
                startWith: "$username",
                connectFromField: "username",
                connectToField: "refferalBy",
                as: "referBY",
              },
            },
            {
              $project: {
                referredUser: 0,
                walletaddress: 0,
                password: 0,
                isActive: 0,
                isValid: 0,
                username: 0,
                createdAt: 0,
                updatedAt: 0,
                __v: 0,
                email: 0,
                referredUser: 0,
                AirdroppedActive: 0,
                Airdropped: 0,
              },
            },
          ]);
          let data1 = await Usermodal.aggregate([
            {
              $match: {
                refferalBy: decoded.profile.username,
              },
            },
            {
              $project: {
                referredUser: 0,
                walletaddress: 0,
                password: 0,
                isActive: 0,
                isValid: 0,
                username: 0,
                createdAt: 0,
                updatedAt: 0,
                __v: 0,
                referredUser: 0,
                AirdroppedActive: 0,
                Airdropped: 0,
              },
            },
          ]);
          // const Stakingbonusdata = await findAllRecord(Stakingbonus, {
          //   Active: false,
          // });
          // let lockendamount = 0,
          //   i = -1;
          // while (++i < Stakingbonusdata.length) {
          //   lockendamount += Stakingbonusdata[i]["Amount"];
          //   await updateRecord(
          //     Walletmodal,
          //     {
          //       userId: decoded.profile._id,
          //     },
          //     {
          //       lockendamount: Number(
          //         lockendamount - Stakingbonusdata[i]["Amount"]
          //       ),
          //     }
          //   );
          // }
          const price = await findAllRecord(V4Xpricemodal, {});
          return successResponse(res, {
            message: "wallet data get successfully",
            data: StakingData,
            profile: decoded.profile,
            ReffData: data,
            ReffData1: data1,
            V4Xtokenprice: price[0].price,
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
                if (req.body.Username1 !== "") {
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
                  let abc = await Usermodal.find({
                    username: req.body.Username1,
                  });
                  await updateRecord(
                    Walletmodal,
                    {
                      userId: abc[0]._id,
                    },
                    { $inc: { mainWallet: req.body.Amount } }
                  );
                  return successResponse(res, {
                    message: "transactions have been sent successfully",
                  });
                }
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

                if (req.body.Username1 !== "") {
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
                  let abc = await Usermodal.find({
                    username: req.body.Username1,
                  });
                  await updateRecord(
                    Walletmodal,
                    {
                      userId: abc[0]._id,
                    },
                    { $inc: { v4xWallet: req.body.Amount } }
                  );
                  return successResponse(res, {
                    message: "transactions have been sent successfully",
                  });
                }
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
  getAchievementincome: async (req, res) => {
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
          let data = await findAllRecord(Achivementmodal, {
            userId: decoded.profile._id,
          });
          return successResponse(res, {
            message: "Achievement Income get successfully",
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
  gePassiveincome: async (req, res) => {
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
          let data = await findAllRecord(Passivemodal, {
            userId: decoded.profile._id,
          });
          return successResponse(res, {
            message: "Achievement Income get successfully",
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
  indaireactteam: async (req, res) => {
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
          let data = await Usermodal.aggregate([
            {
              $match: {
                refferalBy: decoded.profile.username,
              },
            },
            {
              $project: {
                referredUser: 0,
                password: 0,
                isActive: 0,
                isValid: 0,
                username: 0,
                updatedAt: 0,
                __v: 0,
                referredUser: 0,
                AirdroppedActive: 0,
                Airdropped: 0,
              },
            },
          ]);
          return successResponse(res, {
            message: "wallet data get successfully",
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
  daireactteam: async (req, res) => {
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
          let data = await Usermodal.aggregate([
            {
              $match: {
                refferalBy: decoded.profile.username,
              },
            },
            {
              $graphLookup: {
                from: "users",
                startWith: "$username",
                connectFromField: "username",
                connectToField: "refferalBy",
                as: "referBY",
              },
            },
            {
              $project: {
                referredUser: 0,
                walletaddress: 0,
                password: 0,
                isActive: 0,
                isValid: 0,
                username: 0,
                createdAt: 0,
                updatedAt: 0,
                __v: 0,
                email: 0,
                referredUser: 0,
                AirdroppedActive: 0,
                Airdropped: 0,
              },
            },
          ]);
          return successResponse(res, {
            message: "wallet data get successfully",
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
  allincome: async (req, res) => {
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
          const StakingData = await findOneRecord(Usermodal, {
            email: decoded.profile.email,
          });
          let data1 = await Communitymodal.aggregate([
            {
              $match: {
                userId: StakingData._id,
              },
            },
          ]);
          let data2 = await Achivementmodal.aggregate([
            {
              $match: {
                userId: StakingData._id,
              },
            },
          ]);
          let data3 = await Passivemodal.aggregate([
            {
              $match: {
                userId: StakingData._id,
              },
            },
          ]);
          let data4 = await Passivemodal.aggregate([
            {
              $match: {
                userId: StakingData._id,
              },
            },
          ]);
          const data = data1.concat(data2, data3, data4);
          return successResponse(res, {
            message: "wallet data get successfully",
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
  userallincome: async (req, res) => {
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
          const StakingData = await findOneRecord(Usermodal, {
            email: decoded.profile.email,
          });
          let data1 = await Communitymodal.find({});
          let data2 = await Achivementmodal.find({});
          let data3 = await Passivemodal.find({});
          let data4 = await Passivemodal.find({});
          const data = data1.concat(data2, data3, data4);
          return successResponse(res, {
            message: "wallet data get successfully",
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
};
