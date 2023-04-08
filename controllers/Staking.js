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
                await updateRecord(
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
                ).then(async () => {
                  const Refflevalncome = await findOneRecord(Usermodal, {
                    username: decoded.profile.username,
                    isValid: true,
                  });

                  if (!Refflevalncome) {
                    return;
                  }
                  const Refflevalncome1 = await findOneRecord(Usermodal, {
                    username: Refflevalncome.refferalBy,
                    isValid: true,
                  });
                  if (!Refflevalncome1) {
                    return;
                  }
                  console.log("Refflevalncome1",Refflevalncome1);
                  if (Refflevalncome1.leval >= 1) {
                    if (Refflevalncome1.mystack >= 100) {
                      let data1 = {
                        userId: Refflevalncome1._id,
                        Note: `You Got Level ${1} Income`,
                        Usernameby: decoded.profile.username,
                        Amount: (req.body.Amount * 4) / 100,
                      };
                      await Communitymodal(data1).save();

                      console.log("===============>11", {
                        Refflevalncome1,
                        data1,
                      });
                    }
                  }
                  const Refflevalncome2 = await findOneRecord(Usermodal, {
                    username: Refflevalncome1.refferalBy,
                    isValid: true,
                  });
                  if (!Refflevalncome2) {
                    return;
                  }
                  if (Refflevalncome2.leval >= 2) {
                    if (Refflevalncome2.mystack >= 100) {
                      let data2 = {
                        userId: Refflevalncome2._id,
                        Note: `You Got Level ${2} Income`,
                        Usernameby: decoded.profile.username,
                        Amount: (req.body.Amount * 3) / 100,
                      };
                      await Communitymodal(data2).save();

                      console.log("===============>22", {
                        Refflevalncome2,
                        data2,
                      });
                    }
                  }
                  const Refflevalncome3 = await findOneRecord(Usermodal, {
                    username: Refflevalncome2.refferalBy,
                    isValid: true,
                  });
                  if (!Refflevalncome3) {
                    return;
                  }
                  if (Refflevalncome3.leval >= 3) {
                    if (Refflevalncome3.mystack >= 100) {
                      let data3 = {
                        userId: Refflevalncome3._id,
                        Note: `You Got Level ${3} Income`,
                        Usernameby: decoded.profile.username,
                        Amount: (req.body.Amount * 2) / 100,
                      };
                      await Communitymodal(data3).save();

                      console.log("===============>33", {
                        Refflevalncome3,
                        data3,
                      });
                    }
                  }
                  const Refflevalncome4 = await findOneRecord(Usermodal, {
                    username: Refflevalncome3.refferalBy,
                    isValid: true,
                  });
                  if (!Refflevalncome4) {
                    return;
                  }
                  if (Refflevalncome4.leval >= 4) {
                    if (Refflevalncome4.mystack >= 100) {
                      let data4 = {
                        userId: Refflevalncome4._id,
                        Note: `You Got Level ${4} Income`,
                        Usernameby: decoded.profile.username,
                        Amount: (req.body.Amount * 1) / 100,
                      };
                      await Communitymodal(data4).save();

                      console.log("===============>44", {
                        Refflevalncome4,
                        data4,
                      });
                    }
                  }
                  const Refflevalncome5 = await findOneRecord(Usermodal, {
                    username: Refflevalncome4.refferalBy,
                    isValid: true,
                  });
                  if (!Refflevalncome5) {
                    return;
                  }
                  if (Refflevalncome5.leval >= 5) {
                    if (Refflevalncome5.mystack >= 100) {
                      let data5 = {
                        userId: Refflevalncome5._id,
                        Note: `You Got Level ${5} Income`,
                        Usernameby: decoded.profile.username,
                        Amount: (req.body.Amount * 0.5) / 100,
                      };
                      await Communitymodal(data5).save();

                      console.log("===============>55", {
                        Refflevalncome5,
                        data5,
                      });
                    }
                  }
                  const Refflevalncome6 = await findOneRecord(Usermodal, {
                    username: Refflevalncome5.refferalBy,
                    isValid: true,
                  });
                  if (!Refflevalncome6) {
                    return;
                  }
                  if (Refflevalncome6.leval >= 6) {
                    if (Refflevalncome6.mystack >= 100) {
                      let data6 = {
                        userId: Refflevalncome6._id,
                        Note: `You Got Level ${6} Income`,
                        Usernameby: decoded.profile.username,
                        Amount: (req.body.Amount * 0.5) / 100,
                      };
                      await Communitymodal(data6).save();

                      console.log("===============>66", {
                        Refflevalncome6,
                        data6,
                      });
                    }
                  }
                  const Refflevalncome7 = await findOneRecord(Usermodal, {
                    username: Refflevalncome6.refferalBy,
                    isValid: true,
                  });
                  if (!Refflevalncome7) {
                    return;
                  }
                  if (Refflevalncome7.leval >= 7) {
                    if (Refflevalncome7.mystack >= 100) {
                      let data7 = {
                        userId: Refflevalncome7._id,
                        Note: `You Got Level ${7} Income`,
                        Usernameby: decoded.profile.username,
                        Amount: (req.body.Amount * 0.5) / 100,
                      };
                      await Communitymodal(data7).save();

                      console.log("===============>77", {
                        Refflevalncome7,
                        data7,
                      });
                    }
                  }
                  const Refflevalncome8 = await findOneRecord(Usermodal, {
                    username: Refflevalncome7.refferalBy,
                    isValid: true,
                  });
                  if (!Refflevalncome8) {
                    return;
                  }
                  if (Refflevalncome8.leval >= 8) {
                    if (Refflevalncome8.mystack >= 100) {
                      let data8 = {
                        userId: Refflevalncome8._id,
                        Note: `You Got Level ${8} Income`,
                        Usernameby: decoded.profile.username,
                        Amount: (req.body.Amount * 0.5) / 100,
                      };
                      await Communitymodal(data8).save();

                      console.log("===============>88", {
                        Refflevalncome8,
                        data8,
                      });
                    }
                  }
                  const Refflevalncome9 = await findOneRecord(Usermodal, {
                    username: Refflevalncome8.refferalBy,
                    isValid: true,
                  });
                  if (!Refflevalncome9) {
                    return;
                  }
                  if (Refflevalncome9.leval >= 9) {
                    if (Refflevalncome9.mystack >= 100) {
                      let data9 = {
                        userId: Refflevalncome9._id,
                        Note: `You Got Level ${9} Income`,
                        Usernameby: decoded.profile.username,
                        Amount: (req.body.Amount * 0.5) / 100,
                      };
                      await Communitymodal(data9).save();

                      console.log("===============>99", {
                        Refflevalncome9,
                        data9,
                      });
                    }
                  }
                  const Refflevalncome10 = await findOneRecord(Usermodal, {
                    username: Refflevalncome9.refferalBy,
                    isValid: true,
                  });
                  if (!Refflevalncome10) {
                    return;
                  }

                  if (Refflevalncome10.leval >= 10) {
                    if (Refflevalncome10.mystack >= 100) {
                      let data10 = {
                        userId: Refflevalncome10._id,
                        Note: `You Got Level ${10} Income`,
                        Usernameby: decoded.profile.username,
                        Amount: (req.body.Amount * 0.5) / 100,
                      };
                      await Communitymodal(data10).save();

                      console.log("===============>1010", {
                        Refflevalncome10,
                        data10,
                      });
                    }
                  }
                  const Refflevalncome11 = await findOneRecord(Usermodal, {
                    username: Refflevalncome10.refferalBy,
                    isValid: true,
                  });
                  if (!Refflevalncome11) {
                    return;
                  }

                  if (Refflevalncome11.leval >= 11) {
                    if (Refflevalncome11.mystack >= 100) {
                      let data11 = {
                        userId: Refflevalncome11._id,
                        Note: `You Got Level ${11} Income`,
                        Usernameby: decoded.profile.username,
                        Amount: (req.body.Amount * 0.5) / 100,
                      };
                      await Communitymodal(data11).save();

                      console.log("===============>1111", {
                        Refflevalncome11,
                        data11,
                      });
                    }
                  }
                  const Refflevalncome12 = await findOneRecord(Usermodal, {
                    username: Refflevalncome11.refferalBy,
                    isValid: true,
                  });
                  if (!Refflevalncome12) {
                    return;
                  }
                  if (Refflevalncome12.leval >= 12) {
                    if (Refflevalncome12.mystack >= 100) {
                      let data12 = {
                        userId: Refflevalncome12._id,
                        Note: `You Got Level ${12} Income`,
                        Usernameby: decoded.profile.username,
                        Amount: (req.body.Amount * 0.5) / 100,
                      };
                      await Communitymodal(data12).save();

                      console.log("===============>1212", {
                        Refflevalncome12,
                        data12,
                      });
                    }
                  }
                  const Refflevalncome13 = await findOneRecord(Usermodal, {
                    username: Refflevalncome12.refferalBy,
                    isValid: true,
                  });
                  if (!Refflevalncome13) {
                    return;
                  }
                  if (Refflevalncome13.leval >= 13) {
                    if (Refflevalncome13.mystack >= 100) {
                      let data13 = {
                        userId: Refflevalncome13._id,
                        Note: `You Got Level ${13} Income`,
                        Usernameby: decoded.profile.username,
                        Amount: (req.body.Amount * 0.5) / 100,
                      };
                      await Communitymodal(data13).save();

                      console.log("===============>1313", {
                        Refflevalncome13,
                        data13,
                      });
                    }
                  }
                  const Refflevalncome14 = await findOneRecord(Usermodal, {
                    username: Refflevalncome13.refferalBy,
                    isValid: true,
                  });
                  if (!Refflevalncome14) {
                    return;
                  }
                  if (Refflevalncome14.leval >= 14) {
                    if (Refflevalncome14.mystack >= 100) {
                      let data14 = {
                        userId: Refflevalncome14._id,
                        Note: `You Got Level ${14} Income`,
                        Usernameby: decoded.profile.username,
                        Amount: (req.body.Amount * 0.5) / 100,
                      };
                      await Communitymodal(data14).save();

                      console.log("===============>1414", {
                        Refflevalncome14,
                        data14,
                      });
                    }
                  }
                  const Refflevalncome15 = await findOneRecord(Usermodal, {
                    username: Refflevalncome14.refferalBy,
                    isValid: true,
                  });
                  if (!Refflevalncome15) {
                    return;
                  }
                  if (Refflevalncome15.leval >= 15) {
                    if (Refflevalncome15.mystack >= 100) {
                      let data15 = {
                        userId: Refflevalncome15._id,
                        Note: `You Got Level ${15} Income`,
                        Usernameby: decoded.profile.username,
                        Amount: (req.body.Amount * 1) / 100,
                      };
                      await Communitymodal(data15).save();

                      console.log("===============>1515", {
                        Refflevalncome15,
                        data15,
                      });
                    }
                  }
                  const Refflevalncome16 = await findOneRecord(Usermodal, {
                    username: Refflevalncome15.refferalBy,
                    isValid: true,
                  });
                  if (!Refflevalncome16) {
                    return;
                  }
                  if (Refflevalncome16.leval >= 16) {
                    if (Refflevalncome16.mystack >= 100) {
                      let data16 = {
                        userId: Refflevalncome16._id,
                        Note: `You Got Level ${16} Income`,
                        Usernameby: decoded.profile.username,
                        Amount: (req.body.Amount * 2) / 100,
                      };
                      await Communitymodal(data16).save();

                      console.log("===============>1616", {
                        Refflevalncome16,
                        data16,
                      });
                    }
                  }
                  const Refflevalncome17 = await findOneRecord(Usermodal, {
                    username: Refflevalncome16.refferalBy,
                    isValid: true,
                  });
                  if (!Refflevalncome17) {
                    return;
                  }
                  if (Refflevalncome17.leval >= 17) {
                    if (Refflevalncome17.mystack >= 100) {
                      let data17 = {
                        userId: Refflevalncome17._id,
                        Note: `You Got Level ${17} Income`,
                        Usernameby: decoded.profile.username,
                        Amount: (req.body.Amount * 3) / 100,
                      };
                      await Communitymodal(data17).save();

                      console.log("===============>1717", {
                        Refflevalncome17,
                        data17,
                      });
                    }
                  }
                  const Refflevalncome18 = await findOneRecord(Usermodal, {
                    username: Refflevalncome17.refferalBy,
                    isValid: true,
                  });
                  if (!Refflevalncome18) {
                    return;
                  }
                  if (Refflevalncome18.leval >= 18) {
                    if (Refflevalncome18.mystack >= 100) {
                      let data18 = {
                        userId: Refflevalncome18._id,
                        Note: `You Got Level ${18} Income`,
                        Usernameby: decoded.profile.username,
                        Amount: (req.body.Amount * 4) / 100,
                      };
                      await Communitymodal(data18).save();
                      console.log("===============>1818", {
                        Refflevalncome18,
                        data18,
                      });
                    }
                  }
                });
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
                    username: decoded.profile.username,
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
                    as: "amount2",
                  },
                },
                {
                  $lookup: {
                    from: "stakings",
                    localField: "_id",
                    foreignField: "userId",
                    as: "amount",
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
                    email: 1,
                    username: 1,
                    level: 4,
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
                    { teamtotalstack: e[0].total1, mystack: e[0].total }
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
          }
          if (req.body.WalletType == "ewalletstacking") {
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
                const ReffData2 = await findAllRecord(Usermodal, {
                  refferalBy: ReffData.username,
                  isValid: true,
                });
                await updateRecord(
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
                ).then(async () => {
                  const Refflevalncome = await findOneRecord(Usermodal, {
                    username: decoded.profile.username,
                    isValid: true,
                  });

                  if (!Refflevalncome) {
                    return;
                  }
                  const Refflevalncome1 = await findOneRecord(Usermodal, {
                    username: Refflevalncome.refferalBy,
                    isValid: true,
                  });
                  if (!Refflevalncome1) {
                    return;
                  }
                  console.log("Refflevalncome1",Refflevalncome1);
                  if (Refflevalncome1.leval >= 1) {
                    if (Refflevalncome1.mystack >= 100) {
                      let data1 = {
                        userId: Refflevalncome1._id,
                        Note: `You Got Level ${1} Income`,
                        Usernameby: decoded.profile.username,
                        Amount: (req.body.Amount * 4) / 100,
                      };
                      await Communitymodal(data1).save();

                      console.log("===============>11", {
                        Refflevalncome1,
                        data1,
                      });
                    }
                  }
                  const Refflevalncome2 = await findOneRecord(Usermodal, {
                    username: Refflevalncome1.refferalBy,
                    isValid: true,
                  });
                  if (!Refflevalncome2) {
                    return;
                  }
                  if (Refflevalncome2.leval >= 2) {
                    if (Refflevalncome2.mystack >= 100) {
                      let data2 = {
                        userId: Refflevalncome2._id,
                        Note: `You Got Level ${2} Income`,
                        Usernameby: decoded.profile.username,
                        Amount: (req.body.Amount * 3) / 100,
                      };
                      await Communitymodal(data2).save();

                      console.log("===============>22", {
                        Refflevalncome2,
                        data2,
                      });
                    }
                  }
                  const Refflevalncome3 = await findOneRecord(Usermodal, {
                    username: Refflevalncome2.refferalBy,
                    isValid: true,
                  });
                  if (!Refflevalncome3) {
                    return;
                  }
                  if (Refflevalncome3.leval >= 3) {
                    if (Refflevalncome3.mystack >= 100) {
                      let data3 = {
                        userId: Refflevalncome3._id,
                        Note: `You Got Level ${3} Income`,
                        Usernameby: decoded.profile.username,
                        Amount: (req.body.Amount * 2) / 100,
                      };
                      await Communitymodal(data3).save();

                      console.log("===============>33", {
                        Refflevalncome3,
                        data3,
                      });
                    }
                  }
                  const Refflevalncome4 = await findOneRecord(Usermodal, {
                    username: Refflevalncome3.refferalBy,
                    isValid: true,
                  });
                  if (!Refflevalncome4) {
                    return;
                  }
                  if (Refflevalncome4.leval >= 4) {
                    if (Refflevalncome4.mystack >= 100) {
                      let data4 = {
                        userId: Refflevalncome4._id,
                        Note: `You Got Level ${4} Income`,
                        Usernameby: decoded.profile.username,
                        Amount: (req.body.Amount * 1) / 100,
                      };
                      await Communitymodal(data4).save();

                      console.log("===============>44", {
                        Refflevalncome4,
                        data4,
                      });
                    }
                  }
                  const Refflevalncome5 = await findOneRecord(Usermodal, {
                    username: Refflevalncome4.refferalBy,
                    isValid: true,
                  });
                  if (!Refflevalncome5) {
                    return;
                  }
                  if (Refflevalncome5.leval >= 5) {
                    if (Refflevalncome5.mystack >= 100) {
                      let data5 = {
                        userId: Refflevalncome5._id,
                        Note: `You Got Level ${5} Income`,
                        Usernameby: decoded.profile.username,
                        Amount: (req.body.Amount * 0.5) / 100,
                      };
                      await Communitymodal(data5).save();

                      console.log("===============>55", {
                        Refflevalncome5,
                        data5,
                      });
                    }
                  }
                  const Refflevalncome6 = await findOneRecord(Usermodal, {
                    username: Refflevalncome5.refferalBy,
                    isValid: true,
                  });
                  if (!Refflevalncome6) {
                    return;
                  }
                  if (Refflevalncome6.leval >= 6) {
                    if (Refflevalncome6.mystack >= 100) {
                      let data6 = {
                        userId: Refflevalncome6._id,
                        Note: `You Got Level ${6} Income`,
                        Usernameby: decoded.profile.username,
                        Amount: (req.body.Amount * 0.5) / 100,
                      };
                      await Communitymodal(data6).save();

                      console.log("===============>66", {
                        Refflevalncome6,
                        data6,
                      });
                    }
                  }
                  const Refflevalncome7 = await findOneRecord(Usermodal, {
                    username: Refflevalncome6.refferalBy,
                    isValid: true,
                  });
                  if (!Refflevalncome7) {
                    return;
                  }
                  if (Refflevalncome7.leval >= 7) {
                    if (Refflevalncome7.mystack >= 100) {
                      let data7 = {
                        userId: Refflevalncome7._id,
                        Note: `You Got Level ${7} Income`,
                        Usernameby: decoded.profile.username,
                        Amount: (req.body.Amount * 0.5) / 100,
                      };
                      await Communitymodal(data7).save();

                      console.log("===============>77", {
                        Refflevalncome7,
                        data7,
                      });
                    }
                  }
                  const Refflevalncome8 = await findOneRecord(Usermodal, {
                    username: Refflevalncome7.refferalBy,
                    isValid: true,
                  });
                  if (!Refflevalncome8) {
                    return;
                  }
                  if (Refflevalncome8.leval >= 8) {
                    if (Refflevalncome8.mystack >= 100) {
                      let data8 = {
                        userId: Refflevalncome8._id,
                        Note: `You Got Level ${8} Income`,
                        Usernameby: decoded.profile.username,
                        Amount: (req.body.Amount * 0.5) / 100,
                      };
                      await Communitymodal(data8).save();

                      console.log("===============>88", {
                        Refflevalncome8,
                        data8,
                      });
                    }
                  }
                  const Refflevalncome9 = await findOneRecord(Usermodal, {
                    username: Refflevalncome8.refferalBy,
                    isValid: true,
                  });
                  if (!Refflevalncome9) {
                    return;
                  }
                  if (Refflevalncome9.leval >= 9) {
                    if (Refflevalncome9.mystack >= 100) {
                      let data9 = {
                        userId: Refflevalncome9._id,
                        Note: `You Got Level ${9} Income`,
                        Usernameby: decoded.profile.username,
                        Amount: (req.body.Amount * 0.5) / 100,
                      };
                      await Communitymodal(data9).save();

                      console.log("===============>99", {
                        Refflevalncome9,
                        data9,
                      });
                    }
                  }
                  const Refflevalncome10 = await findOneRecord(Usermodal, {
                    username: Refflevalncome9.refferalBy,
                    isValid: true,
                  });
                  if (!Refflevalncome10) {
                    return;
                  }

                  if (Refflevalncome10.leval >= 10) {
                    if (Refflevalncome10.mystack >= 100) {
                      let data10 = {
                        userId: Refflevalncome10._id,
                        Note: `You Got Level ${10} Income`,
                        Usernameby: decoded.profile.username,
                        Amount: (req.body.Amount * 0.5) / 100,
                      };
                      await Communitymodal(data10).save();

                      console.log("===============>1010", {
                        Refflevalncome10,
                        data10,
                      });
                    }
                  }
                  const Refflevalncome11 = await findOneRecord(Usermodal, {
                    username: Refflevalncome10.refferalBy,
                    isValid: true,
                  });
                  if (!Refflevalncome11) {
                    return;
                  }

                  if (Refflevalncome11.leval >= 11) {
                    if (Refflevalncome11.mystack >= 100) {
                      let data11 = {
                        userId: Refflevalncome11._id,
                        Note: `You Got Level ${11} Income`,
                        Usernameby: decoded.profile.username,
                        Amount: (req.body.Amount * 0.5) / 100,
                      };
                      await Communitymodal(data11).save();

                      console.log("===============>1111", {
                        Refflevalncome11,
                        data11,
                      });
                    }
                  }
                  const Refflevalncome12 = await findOneRecord(Usermodal, {
                    username: Refflevalncome11.refferalBy,
                    isValid: true,
                  });
                  if (!Refflevalncome12) {
                    return;
                  }
                  if (Refflevalncome12.leval >= 12) {
                    if (Refflevalncome12.mystack >= 100) {
                      let data12 = {
                        userId: Refflevalncome12._id,
                        Note: `You Got Level ${12} Income`,
                        Usernameby: decoded.profile.username,
                        Amount: (req.body.Amount * 0.5) / 100,
                      };
                      await Communitymodal(data12).save();

                      console.log("===============>1212", {
                        Refflevalncome12,
                        data12,
                      });
                    }
                  }
                  const Refflevalncome13 = await findOneRecord(Usermodal, {
                    username: Refflevalncome12.refferalBy,
                    isValid: true,
                  });
                  if (!Refflevalncome13) {
                    return;
                  }
                  if (Refflevalncome13.leval >= 13) {
                    if (Refflevalncome13.mystack >= 100) {
                      let data13 = {
                        userId: Refflevalncome13._id,
                        Note: `You Got Level ${13} Income`,
                        Usernameby: decoded.profile.username,
                        Amount: (req.body.Amount * 0.5) / 100,
                      };
                      await Communitymodal(data13).save();

                      console.log("===============>1313", {
                        Refflevalncome13,
                        data13,
                      });
                    }
                  }
                  const Refflevalncome14 = await findOneRecord(Usermodal, {
                    username: Refflevalncome13.refferalBy,
                    isValid: true,
                  });
                  if (!Refflevalncome14) {
                    return;
                  }
                  if (Refflevalncome14.leval >= 14) {
                    if (Refflevalncome14.mystack >= 100) {
                      let data14 = {
                        userId: Refflevalncome14._id,
                        Note: `You Got Level ${14} Income`,
                        Usernameby: decoded.profile.username,
                        Amount: (req.body.Amount * 0.5) / 100,
                      };
                      await Communitymodal(data14).save();

                      console.log("===============>1414", {
                        Refflevalncome14,
                        data14,
                      });
                    }
                  }
                  const Refflevalncome15 = await findOneRecord(Usermodal, {
                    username: Refflevalncome14.refferalBy,
                    isValid: true,
                  });
                  if (!Refflevalncome15) {
                    return;
                  }
                  if (Refflevalncome15.leval >= 15) {
                    if (Refflevalncome15.mystack >= 100) {
                      let data15 = {
                        userId: Refflevalncome15._id,
                        Note: `You Got Level ${15} Income`,
                        Usernameby: decoded.profile.username,
                        Amount: (req.body.Amount * 1) / 100,
                      };
                      await Communitymodal(data15).save();

                      console.log("===============>1515", {
                        Refflevalncome15,
                        data15,
                      });
                    }
                  }
                  const Refflevalncome16 = await findOneRecord(Usermodal, {
                    username: Refflevalncome15.refferalBy,
                    isValid: true,
                  });
                  if (!Refflevalncome16) {
                    return;
                  }
                  if (Refflevalncome16.leval >= 16) {
                    if (Refflevalncome16.mystack >= 100) {
                      let data16 = {
                        userId: Refflevalncome16._id,
                        Note: `You Got Level ${16} Income`,
                        Usernameby: decoded.profile.username,
                        Amount: (req.body.Amount * 2) / 100,
                      };
                      await Communitymodal(data16).save();

                      console.log("===============>1616", {
                        Refflevalncome16,
                        data16,
                      });
                    }
                  }
                  const Refflevalncome17 = await findOneRecord(Usermodal, {
                    username: Refflevalncome16.refferalBy,
                    isValid: true,
                  });
                  if (!Refflevalncome17) {
                    return;
                  }
                  if (Refflevalncome17.leval >= 17) {
                    if (Refflevalncome17.mystack >= 100) {
                      let data17 = {
                        userId: Refflevalncome17._id,
                        Note: `You Got Level ${17} Income`,
                        Usernameby: decoded.profile.username,
                        Amount: (req.body.Amount * 3) / 100,
                      };
                      await Communitymodal(data17).save();

                      console.log("===============>1717", {
                        Refflevalncome17,
                        data17,
                      });
                    }
                  }
                  const Refflevalncome18 = await findOneRecord(Usermodal, {
                    username: Refflevalncome17.refferalBy,
                    isValid: true,
                  });
                  if (!Refflevalncome18) {
                    return;
                  }
                  if (Refflevalncome18.leval >= 18) {
                    if (Refflevalncome18.mystack >= 100) {
                      let data18 = {
                        userId: Refflevalncome18._id,
                        Note: `You Got Level ${18} Income`,
                        Usernameby: decoded.profile.username,
                        Amount: (req.body.Amount * 4) / 100,
                      };
                      await Communitymodal(data18).save();
                      console.log("===============>1818", {
                        Refflevalncome18,
                        data18,
                      });
                    }
                  }
                });
              }
              await updateRecord(
                Walletmodal,
                { userId: decoded.profile._id },
                { v4xWallet: WalletData.v4xWallet - req.body.Amount }
              );
              const price = await findAllRecord(V4Xpricemodal, {});
              await Stakingmodal({
                userId: decoded.profile._id,
                WalletType: "E-Wallet",
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
                    username: decoded.profile.username,
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
                    as: "amount2",
                  },
                },
                {
                  $lookup: {
                    from: "stakings",
                    localField: "_id",
                    foreignField: "userId",
                    as: "amount",
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
                    email: 1,
                    username: 1,
                    level: 4,
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
                    { teamtotalstack: e[0].total1, mystack: e[0].total }
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
          }
          // if (req.body.WalletType == "ewalletstacking") {
          //   if (
          //     WalletData.v4xWallet >=
          //     req.body.Amount * req.body.V4xTokenPrice
          //   ) {
          //     const ReffData = await findOneRecord(Usermodal, {
          //       username: decoded.profile.refferalBy,
          //       isValid: true,
          //     });

          //     if (ReffData !== null) {
          //       const price = await findAllRecord(V4Xpricemodal, {});
          //       await updateRecord(
          //         Walletmodal,
          //         {
          //           userId: ReffData._id,
          //         },
          //         {
          //           $inc: {
          //             mainWallet: (req.body.Amount * price[0].price * 10) / 100,
          //           },
          //         }
          //       );
          //       await Stakingbonus({
          //         userId: ReffData._id,
          //         ReffId: decoded.profile._id,
          //         Amount: (req.body.Amount * price[0].price * 10) / 100,
          //         Note: `You Got Refer and Earn Income From ${decoded.profile.username}`,
          //         Active: true,
          //       }).save();
          //       const ReffData2 = await findAllRecord(Usermodal, {
          //         refferalBy: ReffData.username,
          //         isValid: true,
          //       });
          //       updateRecord(
          //         Usermodal,
          //         { _id: ReffData._id },
          //         {
          //           leval: Number(
          //             ReffData2.length == 1
          //               ? 2
          //               : ReffData2.length == 2
          //               ? 4
          //               : ReffData2.length == 3
          //               ? 6
          //               : ReffData2.length == 4
          //               ? 8
          //               : ReffData2.length == 5
          //               ? 10
          //               : ReffData2.length == 6
          //               ? 12
          //               : ReffData2.length == 7
          //               ? 14
          //               : ReffData2.length == 8
          //               ? 16
          //               : 18
          //           ),
          //         }
          //       );
          //       const perentusers = await Usermodal.aggregate([
          //         {
          //           $match: {
          //             username: decoded.profile.username,
          //           },
          //         },
          //         {
          //           $graphLookup: {
          //             from: "users",
          //             startWith: "$refferalBy",
          //             connectFromField: "refferalBy",
          //             connectToField: "username",
          //             as: "refers_to",
          //           },
          //         },
          //         {
          //           $lookup: {
          //             from: "stakings",
          //             localField: "refers_to._id",
          //             foreignField: "userId",
          //             as: "amount",
          //           },
          //         },
          //         {
          //           $match: {
          //             amount: {
          //               $ne: [],
          //             },
          //           },
          //         },
          //         {
          //           $project: {
          //             total: {
          //               $reduce: {
          //                 input: "$amount",
          //                 initialValue: 0,
          //                 in: {
          //                   $add: ["$$value", "$$this.Amount"],
          //                 },
          //               },
          //             },
          //             walletaddress: 1,
          //             email: 1,
          //             password: 1,
          //             isActive: 1,
          //             isValid: 1,
          //             refferalId: 1,
          //             createdAt: 1,
          //             refferalBy: 1,
          //             updatedAt: 1,
          //             level: 4,
          //             username: 1,
          //             referredUser: 1,
          //             refers_to: 1,
          //           },
          //         },
          //       ]);
          //       for (
          //         let index = 0;
          //         index < perentusers[0]?.refers_to.length;
          //         index++
          //       ) {
          //         const element = perentusers[0].refers_to[index];
          //         const element1 = levalreword[index];
          //         const laval = index + 1;
          //         console.log("===================>>>>", {
          //           user: element,
          //           reword: element1,
          //           laval,
          //         });
          //         await updateRecord(
          //           Walletmodal,
          //           {
          //             userId: element._id,
          //             isValid: true,
          //           },
          //           {
          //             $inc: {
          //               mainWallet: (req.body.Amount * element1.INCOME) / 100,
          //             },
          //           }
          //         );
          //         let data = {
          //           userId: element._id,
          //           Note: `You Got Level ${laval} Income`,
          //           Usernameby: decoded.profile.username,
          //           Amount: (req.body.Amount * element1?.INCOME) / 100,
          //         };
          //         await Communitymodal(data).save();
          //       }
          //     }
          //     updateRecord(
          //       Walletmodal,
          //       { userId: decoded.profile._id },
          //       { v4xWallet: WalletData.v4xWallet - req.body.Amount }
          //     );
          //     const price = await findAllRecord(V4Xpricemodal, {});
          //     await Stakingmodal({
          //       userId: decoded.profile._id,
          //       WalletType: "V4X E-wallet",
          //       DailyReword:
          //         req.body.Amount <= 2500
          //           ? Number(req.body.Amount / 730) * 2
          //           : req.body.Amount >= 2550 && req.body.Amount <= 10000
          //           ? Number(req.body.Amount / 730) * 2.25
          //           : req.body.Amount >= 10050 && req.body.Amount <= 25000
          //           ? Number(req.body.Amount / 730) * 2.5
          //           : Number(req.body.Amount / 730) * 3,
          //       bonusAmount:
          //         req.body.Amount <= 2500
          //           ? 200
          //           : req.body.Amount >= 2550 && req.body.Amount <= 10000
          //           ? 225
          //           : req.body.Amount >= 10050 && req.body.Amount <= 25000
          //           ? 250
          //           : 300,
          //       Amount: req.body.Amount,
          //       TotalRewordRecived:
          //         req.body.Amount <= 2500
          //           ? req.body.Amount * 2
          //           : req.body.Amount >= 2550 && req.body.Amount <= 10000
          //           ? req.body.Amount * 2.25
          //           : req.body.Amount >= 10050 && req.body.Amount <= 25000
          //           ? req.body.Amount * 2.5
          //           : req.body.Amount * 3,
          //       V4xTokenPrice: price[0].price,
          //     }).save();
          //     await Usermodal.aggregate([
          //       {
          //         $match: {
          //           username: decoded.profile.username,
          //         },
          //       },
          //       {
          //         $graphLookup: {
          //           from: "users",
          //           startWith: "$username",
          //           connectFromField: "username",
          //           connectToField: "refferalBy",
          //           as: "refers_to",
          //         },
          //       },
          //       {
          //         $lookup: {
          //           from: "stakings",
          //           localField: "refers_to._id",
          //           foreignField: "userId",
          //           as: "amount2",
          //         },
          //       },
          //       {
          //         $lookup: {
          //           from: "stakings",
          //           localField: "_id",
          //           foreignField: "userId",
          //           as: "amount",
          //         },
          //       },
          //       {
          //         $match: {
          //           amount: {
          //             $ne: [],
          //           },
          //         },
          //       },
          //       {
          //         $project: {
          //           total: {
          //             $reduce: {
          //               input: "$amount",
          //               initialValue: 0,
          //               in: {
          //                 $add: ["$$value", "$$this.Amount"],
          //               },
          //             },
          //           },
          //           total1: {
          //             $reduce: {
          //               input: "$amount2",
          //               initialValue: 0,
          //               in: {
          //                 $add: ["$$value", "$$this.Amount"],
          //               },
          //             },
          //           },
          //           email: 1,
          //           username: 1,
          //           level: 4,
          //           refers_to: 1,
          //         },
          //       },
          //       {
          //         $unwind: {
          //           path: "$refers_to",
          //           preserveNullAndEmptyArrays: true,
          //         },
          //       },
          //     ]).then(async (e) => {
          //       if (e.length > 0) {
          //         console.log("e[0]=====>", e[0]);
          //         await updateRecord(
          //           Usermodal,
          //           { _id: e[0]._id },
          //           { teamtotalstack: e[0].total1, mystack: e[0].total }
          //         );
          //       }
          //     });
          //     return successResponse(res, {
          //       message: "staking complaint successfully",
          //     });
          //   } else {
          //     validarionerrorResponse(res, {
          //       message:
          //         "please check your v4xWallet balance do not have infoe amount to stake!",
          //     });
          //   }
          // } else {
          //   const price = await findAllRecord(V4Xpricemodal, {});
          //   const ReffData = await findOneRecord(Usermodal, {
          //     username: decoded.profile.refferalBy,
          //     isValid: true,
          //   });
          //   const ReffData2 = await findAllRecord(Usermodal, {
          //     refferalBy: ReffData.username,
          //     isValid: true,
          //   });
          //   if (ReffData2?.length > 0) {
          //     await updateRecord(
          //       Walletmodal,
          //       {
          //         userId: ReffData._id,
          //       },
          //       {
          //         $inc: {
          //           mainWallet: (req.body.Amount * price[0].price * 10) / 100,
          //         },
          //       }
          //     );
          //     await Stakingbonus({
          //       userId: ReffData._id,
          //       ReffId: decoded.profile._id,
          //       Amount: (req.body.Amount * price[0].price * 10) / 100,
          //       Note: `You Got Refer and Earn Income From ${decoded.profile.username}`,
          //       Active: true,
          //     }).save();
          //     await Stakingmodal({
          //       userId: decoded.profile._id,
          //       WalletType: "Dapp wallet",
          //       DailyReword:
          //         Number(req.body.Amount / 730) * req.body.Amount <= 2500
          //           ? Number(req.body.Amount / 730) * 2
          //           : req.body.Amount >= 2550 && req.body.Amount <= 10000
          //           ? Number(req.body.Amount / 730) * 2.25
          //           : req.body.Amount >= 10050 && req.body.Amount <= 25000
          //           ? Number(req.body.Amount / 730) * 2.5
          //           : Number(req.body.Amount / 730) * 3,
          //       bonusAmount:
          //         req.body.Amount <= 2500
          //           ? 200
          //           : req.body.Amount >= 2550 && req.body.Amount <= 10000
          //           ? 225
          //           : req.body.Amount >= 10050 && req.body.Amount <= 25000
          //           ? 250
          //           : 300,
          //       Amount: req.body.Amount,
          //       TotalRewordRecived:
          //         req.body.Amount <= 2500
          //           ? req.body.Amount * 2
          //           : req.body.Amount >= 2550 && req.body.Amount <= 10000
          //           ? req.body.Amount * 2.25
          //           : req.body.Amount >= 10050 && req.body.Amount <= 25000
          //           ? req.body.Amount * 2.5
          //           : req.body.Amount * 3,
          //       V4xTokenPrice: price[0].price,
          //     }).save();
          //     updateRecord(
          //       Walletmodal,
          //       { userId: decoded.profile._id },
          //       { v4xWallet: WalletData.v4xWallet - req.body.Amount }
          //     );
          //   }
          //   if (ReffData2.length > 0) {
          //     updateRecord(
          //       Usermodal,
          //       { _id: ReffData._id },
          //       {
          //         leval: Number(
          //           ReffData2.length == 1
          //             ? 2
          //             : ReffData2.length == 2
          //             ? 4
          //             : ReffData2.length == 3
          //             ? 6
          //             : ReffData2.length == 4
          //             ? 8
          //             : ReffData2.length == 5
          //             ? 10
          //             : ReffData2.length == 6
          //             ? 12
          //             : ReffData2.length == 7
          //             ? 14
          //             : ReffData2.length == 8
          //             ? 16
          //             : 18
          //         ),
          //       }
          //     );
          //     // let data = {
          //     //   userId: leval._id,
          //     //   Note: `You Got Level ${leval.leval} Income`,
          //     //   Usernameby: decoded.profile.username,
          //     //   Amount: (req.body.Amount * totalNumber) / 100,
          //     // };
          //     // await Communitymodal(data).save();
          //   }
          //   // const leval = await findOneRecord(Usermodal, {
          //   //   _id: ReffData._id,
          //   //   isValid: true,
          //   // });
          //   // let dataleval = levalreword.filter((e) => {
          //   //   if (e.LEVELS <= leval.leval) {
          //   //     return e.INCOME;
          //   //   }
          //   // });
          //   // let totalNumber = 0,
          //   //   i = -1;
          //   // while (++i < dataleval.length) {
          //   //   totalNumber += dataleval[i].INCOME;
          //   // }
          //   return successResponse(res, {
          //     message: "staking complaint successfully",
          //   });
          // }
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
                // username: 0,
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
          await Usermodal.aggregate([
            {
              $match: {
                username: decoded.profile.username,
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
                as: "amount2",
              },
            },
            {
              $lookup: {
                from: "stakings",
                localField: "_id",
                foreignField: "userId",
                as: "amount",
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
                email: 1,
                username: 1,
                level: 4,
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
                { teamtotalstack: e[0].total1, mystack: e[0].total }
              );
            }
          });
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
                    { $inc: { v4xWallet: req.body.Amount } }
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
