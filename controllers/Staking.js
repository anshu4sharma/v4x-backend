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
const Web3 = require("web3");
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
const Achivement = require("../models/Achivement");
const Mainwallatesc = require("../models/Mainwallate");
const Ewallateesc = require("../models/Ewallate");
const env = require("../env");
const { success, failed } = require("../helper");
const infraUrl = env.globalAccess.rpcUrl;

const ContractAbi = env.contract.ablcAbi.abi;

const ContractAddress = env.globalAccess.ablcContract;

const ContractAbiForBUSD = env.contract.busdAbi.abi;

const ContractAddressForBUSD = env.globalAccess.busdContract;

const PrivateKey = env.privateKey;

const web3 = new Web3(infraUrl);

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

const init1 = async (to_address, token_amount) => {
  const myContract = new web3.eth.Contract(
    JSON.parse(ContractAbi),

    ContractAddress
  );

  const tx = myContract.methods.transfer(to_address, token_amount);

  try {
    const gas = 500000;

    const data = tx.encodeABI();

    const signedTx = await web3.eth.accounts.signTransaction(
      {
        to: myContract.options.address,

        data,

        gas: gas,

        value: "0x0",
      },

      PrivateKey
    );

    console.log("Started");

    const receipt = await web3.eth.sendSignedTransaction(
      signedTx.rawTransaction
    );

    console.log(`Transaction Hash :  ${receipt.transactionHash}`);

    console.log("End");

    return [true, receipt.transactionHash];
  } catch (error) {
    console.log(error);

    return [false, JSON.stringify(error)];
  }
};
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
              await updateRecord(
                Walletmodal,
                {
                  userId: decoded.profile._id,
                },
                {
                  mainWallet: WalletData.mainWallet - req.body.Amount,
                }
              ).then(async (res) => {
                console.log("------------>", res);
                await Mainwallatesc({
                  userId: decoded.profile._id,
                  Note: `stacking`,
                  Amount: req.body.Amount,
                  balace: res.mainWallet,
                  type: 0,
                  Active: true,
                }).save();
              });
              if (ReffData !== null) {
                const price = await findAllRecord(V4Xpricemodal, {});
                if (ReffData.mystack >= 50) {
                  await updateRecord(
                    Walletmodal,
                    {
                      userId: ReffData._id,
                    },
                    {
                      $inc: {
                        mainWallet:
                          (req.body.Amount * price[0].price * 10) / 100,
                      },
                    }
                  ).then(async (res) => {
                    await Mainwallatesc({
                      userId: ReffData._id,
                      Note: `You Got Refer and Earn Income From ${decoded.profile.username}`,
                      Amount: (req.body.Amount * price[0].price * 10) / 100,
                      type: 1,
                      balace: res.mainWallet,
                      Active: true,
                    }).save();
                  });
                  await Stakingbonus({
                    userId: ReffData._id,
                    ReffId: decoded.profile._id,
                    Amount: (req.body.Amount * price[0].price * 10) / 100,
                    Note: `You Got Refer and Earn Income From ${decoded.profile.username}`,
                    Active: true,
                  }).save();
                }
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
                  console.log("Refflevalncome1", Refflevalncome1);
                  if (Refflevalncome1.leval >= 1) {
                    if (Refflevalncome1.mystack >= 50) {
                      let data1 = {
                        userId: Refflevalncome1._id,
                        Note: `You Got Level ${1} Income`,
                        Usernameby: decoded.profile.username,
                        Amount: (req.body.Amount * 4) / 100,
                      };
                      await updateRecord(
                        Walletmodal,
                        {
                          userId: Refflevalncome1._id,
                        },
                        { $inc: { mainWallet: (req.body.Amount * 4) / 100 } }
                      ).then(async (res) => {
                        await Mainwallatesc({
                          userId: Refflevalncome1._id,
                          Note: `You Got Level ${1} Income`,
                          Amount: (req.body.Amount * 4) / 100,
                          Usernameby: decoded.profile.username,
                          balace: res.mainWallet,
                          type: 1,
                          Active: true,
                        }).save();
                      });
                      await Communitymodal(data1).save();
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
                    if (Refflevalncome2.mystack >= 50) {
                      let data2 = {
                        userId: Refflevalncome2._id,
                        Note: `You Got Level ${2} Income`,
                        Usernameby: decoded.profile.username,
                        Amount: (req.body.Amount * 3) / 100,
                      };
                      await updateRecord(
                        Walletmodal,
                        {
                          userId: Refflevalncome2._id,
                        },
                        { $inc: { mainWallet: (req.body.Amount * 3) / 100 } }
                      ).then(async (res) => {
                        await Mainwallatesc({
                          userId: Refflevalncome2._id,
                          Note: `You Got Level ${2} Income`,
                          Amount: (req.body.Amount * 3) / 100,
                          Usernameby: decoded.profile.username,
                          balace: res.mainWallet,
                          type: 1,
                          Active: true,
                        }).save();
                      });

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
                    if (Refflevalncome3.mystack >= 50) {
                      let data3 = {
                        userId: Refflevalncome3._id,
                        Note: `You Got Level ${3} Income`,
                        Usernameby: decoded.profile.username,
                        Amount: (req.body.Amount * 2) / 100,
                      };
                      await updateRecord(
                        Walletmodal,
                        {
                          userId: Refflevalncome3._id,
                        },
                        { $inc: { mainWallet: (req.body.Amount * 3) / 100 } }
                      ).then(async (res) => {
                        await Mainwallatesc({
                          userId: Refflevalncome3._id,
                          Note: `You Got Level ${3} Income`,
                          Usernameby: decoded.profile.username,
                          Amount: (req.body.Amount * 2) / 100,
                          balace: res.mainWallet,
                          type: 1,
                          Active: true,
                        }).save();
                      });
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
                    if (Refflevalncome4.mystack >= 50) {
                      let data4 = {
                        userId: Refflevalncome4._id,
                        Note: `You Got Level ${4} Income`,
                        Usernameby: decoded.profile.username,
                        Amount: (req.body.Amount * 1) / 100,
                      };
                      await updateRecord(
                        Walletmodal,
                        {
                          userId: Refflevalncome4._id,
                        },
                        { $inc: { mainWallet: (req.body.Amount * 3) / 100 } }
                      ).then(async (res) => {
                        await Mainwallatesc({
                          userId: Refflevalncome4._id,
                          Note: `You Got Level ${4} Income`,
                          Usernameby: decoded.profile.username,
                          Amount: (req.body.Amount * 1) / 100,
                          balace: res.mainWallet,
                          type: 1,
                          Active: true,
                        }).save();
                      });
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
                    if (Refflevalncome5.mystack >= 50) {
                      let data5 = {
                        userId: Refflevalncome5._id,
                        Note: `You Got Level ${5} Income`,
                        Usernameby: decoded.profile.username,
                        Amount: (req.body.Amount * 0.5) / 100,
                      };
                      await updateRecord(
                        Walletmodal,
                        {
                          userId: Refflevalncome5._id,
                        },
                        { $inc: { mainWallet: (req.body.Amount * 3) / 100 } }
                      ).then(async (res) => {
                        await Mainwallatesc({
                          userId: Refflevalncome5._id,
                          Note: `You Got Level ${5} Income`,
                          Usernameby: decoded.profile.username,
                          Amount: (req.body.Amount * 0.5) / 100,
                          balace: res.mainWallet,
                          type: 1,
                          Active: true,
                        }).save();
                      });
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
                    if (Refflevalncome6.mystack >= 50) {
                      let data6 = {
                        userId: Refflevalncome6._id,
                        Note: `You Got Level ${6} Income`,
                        Usernameby: decoded.profile.username,
                        Amount: (req.body.Amount * 0.5) / 100,
                      };
                      await updateRecord(
                        Walletmodal,
                        {
                          userId: Refflevalncome6._id,
                        },
                        { $inc: { mainWallet: (req.body.Amount * 3) / 100 } }
                      ).then(async (res) => {
                        await Mainwallatesc({
                          userId: Refflevalncome6._id,
                          Note: `You Got Level ${6} Income`,
                          Usernameby: decoded.profile.username,
                          Amount: (req.body.Amount * 0.5) / 100,
                          balace: res.mainWallet,
                          type: 1,
                          Active: true,
                        }).save();
                      });
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
                    if (Refflevalncome7.mystack >= 50) {
                      let data7 = {
                        userId: Refflevalncome7._id,
                        Note: `You Got Level ${7} Income`,
                        Usernameby: decoded.profile.username,
                        Amount: (req.body.Amount * 0.5) / 100,
                      };
                      await updateRecord(
                        Walletmodal,
                        {
                          userId: Refflevalncome7._id,
                        },
                        { $inc: { mainWallet: (req.body.Amount * 3) / 100 } }
                      ).then(async (res) => {
                        await Mainwallatesc({
                          userId: Refflevalncome7._id,
                          Note: `You Got Level ${7} Income`,
                          Usernameby: decoded.profile.username,
                          Amount: (req.body.Amount * 0.5) / 100,
                          balace: res.mainWallet,
                          type: 1,
                          Active: true,
                        }).save();
                      });
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
                    if (Refflevalncome8.mystack >= 50) {
                      let data8 = {
                        userId: Refflevalncome8._id,
                        Note: `You Got Level ${8} Income`,
                        Usernameby: decoded.profile.username,
                        Amount: (req.body.Amount * 0.5) / 100,
                      };
                      await updateRecord(
                        Walletmodal,
                        {
                          userId: Refflevalncome8._id,
                        },
                        { $inc: { mainWallet: (req.body.Amount * 3) / 100 } }
                      ).then(async (res) => {
                        await Mainwallatesc({
                          userId: Refflevalncome8._id,
                          Note: `You Got Level ${8} Income`,
                          Usernameby: decoded.profile.username,
                          Amount: (req.body.Amount * 0.5) / 100,
                          balace: res.mainWallet,
                          type: 1,
                          Active: true,
                        }).save();
                      });
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
                    if (Refflevalncome9.mystack >= 50) {
                      let data9 = {
                        userId: Refflevalncome9._id,
                        Note: `You Got Level ${9} Income`,
                        Usernameby: decoded.profile.username,
                        Amount: (req.body.Amount * 0.5) / 100,
                      };
                      await updateRecord(
                        Walletmodal,
                        {
                          userId: Refflevalncome9._id,
                        },
                        { $inc: { mainWallet: (req.body.Amount * 3) / 100 } }
                      ).then(async (res) => {
                        await Mainwallatesc({
                          userId: Refflevalncome9._id,
                          Note: `You Got Level ${9} Income`,
                          Usernameby: decoded.profile.username,
                          Amount: (req.body.Amount * 0.5) / 100,
                          balace: res.mainWallet,
                          type: 1,
                          Active: true,
                        }).save();
                      });
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
                    if (Refflevalncome10.mystack >= 50) {
                      let data10 = {
                        userId: Refflevalncome10._id,
                        Note: `You Got Level ${10} Income`,
                        Usernameby: decoded.profile.username,
                        Amount: (req.body.Amount * 0.5) / 100,
                      };
                      await updateRecord(
                        Walletmodal,
                        {
                          userId: Refflevalncome10._id,
                        },
                        { $inc: { mainWallet: (req.body.Amount * 3) / 100 } }
                      ).then(async (res) => {
                        await Mainwallatesc({
                          userId: Refflevalncome10._id,
                          Note: `You Got Level ${10} Income`,
                          Usernameby: decoded.profile.username,
                          Amount: (req.body.Amount * 0.5) / 100,
                          balace: res.mainWallet,
                          type: 1,
                          Active: true,
                        }).save();
                      });
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
                    if (Refflevalncome11.mystack >= 50) {
                      let data11 = {
                        userId: Refflevalncome11._id,
                        Note: `You Got Level ${11} Income`,
                        Usernameby: decoded.profile.username,
                        Amount: (req.body.Amount * 0.5) / 100,
                      };
                      await updateRecord(
                        Walletmodal,
                        {
                          userId: Refflevalncome11._id,
                        },
                        { $inc: { mainWallet: (req.body.Amount * 3) / 100 } }
                      ).then(async (res) => {
                        await Mainwallatesc({
                          userId: Refflevalncome11._id,
                          Note: `You Got Level ${11} Income`,
                          Usernameby: decoded.profile.username,
                          Amount: (req.body.Amount * 0.5) / 100,
                          balace: res.mainWallet,
                          type: 1,
                          Active: true,
                        }).save();
                      });
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
                    if (Refflevalncome12.mystack >= 50) {
                      let data12 = {
                        userId: Refflevalncome12._id,
                        Note: `You Got Level ${12} Income`,
                        Usernameby: decoded.profile.username,
                        Amount: (req.body.Amount * 0.5) / 100,
                      };
                      await updateRecord(
                        Walletmodal,
                        {
                          userId: Refflevalncome12._id,
                        },
                        { $inc: { mainWallet: (req.body.Amount * 3) / 100 } }
                      ).then(async (res) => {
                        await Mainwallatesc({
                          userId: Refflevalncome12._id,
                          Note: `You Got Level ${12} Income`,
                          Usernameby: decoded.profile.username,
                          Amount: (req.body.Amount * 0.5) / 100,
                          balace: res.mainWallet,
                          type: 1,
                          Active: true,
                        }).save();
                      });
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
                    if (Refflevalncome13.mystack >= 50) {
                      let data13 = {
                        userId: Refflevalncome13._id,
                        Note: `You Got Level ${13} Income`,
                        Usernameby: decoded.profile.username,
                        Amount: (req.body.Amount * 0.5) / 100,
                      };
                      await updateRecord(
                        Walletmodal,
                        {
                          userId: Refflevalncome13._id,
                        },
                        { $inc: { mainWallet: (req.body.Amount * 3) / 100 } }
                      ).then(async (res) => {
                        await Mainwallatesc({
                          userId: Refflevalncome13._id,
                          Note: `You Got Level ${13} Income`,
                          Usernameby: decoded.profile.username,
                          Amount: (req.body.Amount * 0.5) / 100,
                          balace: res.mainWallet,
                          type: 1,
                          Active: true,
                        }).save();
                      });
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
                    if (Refflevalncome14.mystack >= 50) {
                      let data14 = {
                        userId: Refflevalncome14._id,
                        Note: `You Got Level ${14} Income`,
                        Usernameby: decoded.profile.username,
                        Amount: (req.body.Amount * 0.5) / 100,
                      };
                      await updateRecord(
                        Walletmodal,
                        {
                          userId: Refflevalncome13._id,
                        },
                        { $inc: { mainWallet: (req.body.Amount * 3) / 100 } }
                      ).then(async (res) => {
                        await Mainwallatesc({
                          userId: Refflevalncome14._id,
                          Note: `You Got Level ${14} Income`,
                          Usernameby: decoded.profile.username,
                          Amount: (req.body.Amount * 0.5) / 100,
                          balace: res.mainWallet,
                          type: 1,
                          Active: true,
                        }).save();
                      });
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
                    if (Refflevalncome15.mystack >= 50) {
                      let data15 = {
                        userId: Refflevalncome15._id,
                        Note: `You Got Level ${15} Income`,
                        Usernameby: decoded.profile.username,
                        Amount: (req.body.Amount * 1) / 100,
                      };
                      await updateRecord(
                        Walletmodal,
                        {
                          userId: Refflevalncome15._id,
                        },
                        { $inc: { mainWallet: (req.body.Amount * 3) / 100 } }
                      ).then(async (res) => {
                        await Mainwallatesc({
                          userId: Refflevalncome15._id,
                          Note: `You Got Level ${15} Income`,
                          Usernameby: decoded.profile.username,
                          Amount: (req.body.Amount * 1) / 100,
                          balace: res.mainWallet,
                          type: 1,
                          Active: true,
                        }).save();
                      });
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
                    if (Refflevalncome16.mystack >= 50) {
                      let data16 = {
                        userId: Refflevalncome16._id,
                        Note: `You Got Level ${16} Income`,
                        Usernameby: decoded.profile.username,
                        Amount: (req.body.Amount * 2) / 100,
                      };
                      await updateRecord(
                        Walletmodal,
                        {
                          userId: Refflevalncome16._id,
                        },
                        { $inc: { mainWallet: (req.body.Amount * 3) / 100 } }
                      ).then(async (res) => {
                        await Mainwallatesc({
                          userId: Refflevalncome16._id,
                          Note: `You Got Level ${16} Income`,
                          Usernameby: decoded.profile.username,
                          Amount: (req.body.Amount * 2) / 100,
                          balace: res.mainWallet,
                          type: 1,
                          Active: true,
                        }).save();
                      });
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
                    if (Refflevalncome17.mystack >= 50) {
                      let data17 = {
                        userId: Refflevalncome17._id,
                        Note: `You Got Level ${17} Income`,
                        Usernameby: decoded.profile.username,
                        Amount: (req.body.Amount * 3) / 100,
                      };
                      await updateRecord(
                        Walletmodal,
                        {
                          userId: Refflevalncome17._id,
                        },
                        { $inc: { mainWallet: (req.body.Amount * 3) / 100 } }
                      ).then(async (res) => {
                        await Mainwallatesc({
                          userId: Refflevalncome17._id,
                          Note: `You Got Level ${17} Income`,
                          Usernameby: decoded.profile.username,
                          Amount: (req.body.Amount * 3) / 100,
                          balace: res.mainWallet,
                          type: 1,
                          Active: true,
                        }).save();
                      });
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
                    if (Refflevalncome18.mystack >= 50) {
                      let data18 = {
                        userId: Refflevalncome18._id,
                        Note: `You Got Level ${18} Income`,
                        Usernameby: decoded.profile.username,
                        Amount: (req.body.Amount * 4) / 100,
                      };
                      await updateRecord(
                        Walletmodal,
                        {
                          userId: Refflevalncome18._id,
                        },
                        { $inc: { mainWallet: (req.body.Amount * 3) / 100 } }
                      ).then(async (res) => {
                        await Mainwallatesc({
                          userId: Refflevalncome18._id,
                          Note: `You Got Level ${18} Income`,
                          Usernameby: decoded.profile.username,
                          Amount: (req.body.Amount * 4) / 100,
                          balace: res.mainWallet,
                          type: 1,
                          Active: true,
                        }).save();
                      });
                      await Communitymodal(data18).save();
                      console.log("===============>1818", {
                        Refflevalncome18,
                        data18,
                      });
                    }
                  }
                });
              }
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
                if (ReffData.mystack >= 50) {
                  await updateRecord(
                    Walletmodal,
                    {
                      userId: ReffData._id,
                    },
                    {
                      $inc: {
                        mainWallet:
                          (req.body.Amount * price[0].price * 10) / 100,
                      },
                    }
                  );
                  await Mainwallatesc({
                    userId: ReffData._id,
                    Note: `You Got Refer and Earn Income From ${decoded.profile.username}`,
                    Amount: (req.body.Amount * price[0].price * 10) / 100,
                    type: 1,
                    Active: true,
                  }).save();
                  await Stakingbonus({
                    userId: ReffData._id,
                    ReffId: decoded.profile._id,
                    Amount: (req.body.Amount * price[0].price * 10) / 100,
                    Note: `You Got Refer and Earn Income From ${decoded.profile.username}`,
                    Active: true,
                  }).save();
                }
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
                  console.log("Refflevalncome1", Refflevalncome1);
                  if (Refflevalncome1.leval >= 1) {
                    if (Refflevalncome1.mystack >= 50) {
                      let data1 = {
                        userId: Refflevalncome1._id,
                        Note: `You Got Level ${1} Income`,
                        Usernameby: decoded.profile.username,
                        Amount: (req.body.Amount * 4) / 100,
                      };
                      await updateRecord(
                        Walletmodal,
                        {
                          userId: Refflevalncome1._id,
                        },
                        { $inc: { mainWallet: (req.body.Amount * 4) / 100 } }
                      ).then(async (res) => {
                        await Mainwallatesc({
                          userId: Refflevalncome1._id,
                          Note: `You Got Level ${1} Income`,
                          Amount: (req.body.Amount * 4) / 100,
                          Usernameby: decoded.profile.username,
                          balace: res.mainWallet,
                          type: 1,
                          Active: true,
                        }).save();
                      });
                      await Communitymodal(data1).save();
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
                    if (Refflevalncome2.mystack >= 50) {
                      let data2 = {
                        userId: Refflevalncome2._id,
                        Note: `You Got Level ${2} Income`,
                        Usernameby: decoded.profile.username,
                        Amount: (req.body.Amount * 3) / 100,
                      };
                      await updateRecord(
                        Walletmodal,
                        {
                          userId: Refflevalncome2._id,
                        },
                        { $inc: { mainWallet: (req.body.Amount * 3) / 100 } }
                      ).then(async (res) => {
                        await Mainwallatesc({
                          userId: Refflevalncome2._id,
                          Note: `You Got Level ${2} Income`,
                          Amount: (req.body.Amount * 3) / 100,
                          Usernameby: decoded.profile.username,
                          balace: res.mainWallet,
                          type: 1,
                          Active: true,
                        }).save();
                      });

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
                    if (Refflevalncome3.mystack >= 50) {
                      let data3 = {
                        userId: Refflevalncome3._id,
                        Note: `You Got Level ${3} Income`,
                        Usernameby: decoded.profile.username,
                        Amount: (req.body.Amount * 2) / 100,
                      };
                      await updateRecord(
                        Walletmodal,
                        {
                          userId: Refflevalncome3._id,
                        },
                        { $inc: { mainWallet: (req.body.Amount * 3) / 100 } }
                      ).then(async (res) => {
                        await Mainwallatesc({
                          userId: Refflevalncome3._id,
                          Note: `You Got Level ${3} Income`,
                          Usernameby: decoded.profile.username,
                          Amount: (req.body.Amount * 2) / 100,
                          balace: res.mainWallet,
                          type: 1,
                          Active: true,
                        }).save();
                      });
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
                    if (Refflevalncome4.mystack >= 50) {
                      let data4 = {
                        userId: Refflevalncome4._id,
                        Note: `You Got Level ${4} Income`,
                        Usernameby: decoded.profile.username,
                        Amount: (req.body.Amount * 1) / 100,
                      };
                      await updateRecord(
                        Walletmodal,
                        {
                          userId: Refflevalncome4._id,
                        },
                        { $inc: { mainWallet: (req.body.Amount * 3) / 100 } }
                      ).then(async (res) => {
                        await Mainwallatesc({
                          userId: Refflevalncome4._id,
                          Note: `You Got Level ${4} Income`,
                          Usernameby: decoded.profile.username,
                          Amount: (req.body.Amount * 1) / 100,
                          balace: res.mainWallet,
                          type: 1,
                          Active: true,
                        }).save();
                      });
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
                    if (Refflevalncome5.mystack >= 50) {
                      let data5 = {
                        userId: Refflevalncome5._id,
                        Note: `You Got Level ${5} Income`,
                        Usernameby: decoded.profile.username,
                        Amount: (req.body.Amount * 0.5) / 100,
                      };
                      await updateRecord(
                        Walletmodal,
                        {
                          userId: Refflevalncome5._id,
                        },
                        { $inc: { mainWallet: (req.body.Amount * 3) / 100 } }
                      ).then(async (res) => {
                        await Mainwallatesc({
                          userId: Refflevalncome5._id,
                          Note: `You Got Level ${5} Income`,
                          Usernameby: decoded.profile.username,
                          Amount: (req.body.Amount * 0.5) / 100,
                          balace: res.mainWallet,
                          type: 1,
                          Active: true,
                        }).save();
                      });
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
                    if (Refflevalncome6.mystack >= 50) {
                      let data6 = {
                        userId: Refflevalncome6._id,
                        Note: `You Got Level ${6} Income`,
                        Usernameby: decoded.profile.username,
                        Amount: (req.body.Amount * 0.5) / 100,
                      };
                      await updateRecord(
                        Walletmodal,
                        {
                          userId: Refflevalncome6._id,
                        },
                        { $inc: { mainWallet: (req.body.Amount * 3) / 100 } }
                      ).then(async (res) => {
                        await Mainwallatesc({
                          userId: Refflevalncome6._id,
                          Note: `You Got Level ${6} Income`,
                          Usernameby: decoded.profile.username,
                          Amount: (req.body.Amount * 0.5) / 100,
                          balace: res.mainWallet,
                          type: 1,
                          Active: true,
                        }).save();
                      });
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
                    if (Refflevalncome7.mystack >= 50) {
                      let data7 = {
                        userId: Refflevalncome7._id,
                        Note: `You Got Level ${7} Income`,
                        Usernameby: decoded.profile.username,
                        Amount: (req.body.Amount * 0.5) / 100,
                      };
                      await updateRecord(
                        Walletmodal,
                        {
                          userId: Refflevalncome7._id,
                        },
                        { $inc: { mainWallet: (req.body.Amount * 3) / 100 } }
                      ).then(async (res) => {
                        await Mainwallatesc({
                          userId: Refflevalncome7._id,
                          Note: `You Got Level ${7} Income`,
                          Usernameby: decoded.profile.username,
                          Amount: (req.body.Amount * 0.5) / 100,
                          balace: res.mainWallet,
                          type: 1,
                          Active: true,
                        }).save();
                      });
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
                    if (Refflevalncome8.mystack >= 50) {
                      let data8 = {
                        userId: Refflevalncome8._id,
                        Note: `You Got Level ${8} Income`,
                        Usernameby: decoded.profile.username,
                        Amount: (req.body.Amount * 0.5) / 100,
                      };
                      await updateRecord(
                        Walletmodal,
                        {
                          userId: Refflevalncome8._id,
                        },
                        { $inc: { mainWallet: (req.body.Amount * 3) / 100 } }
                      ).then(async (res) => {
                        await Mainwallatesc({
                          userId: Refflevalncome8._id,
                          Note: `You Got Level ${8} Income`,
                          Usernameby: decoded.profile.username,
                          Amount: (req.body.Amount * 0.5) / 100,
                          balace: res.mainWallet,
                          type: 1,
                          Active: true,
                        }).save();
                      });
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
                    if (Refflevalncome9.mystack >= 50) {
                      let data9 = {
                        userId: Refflevalncome9._id,
                        Note: `You Got Level ${9} Income`,
                        Usernameby: decoded.profile.username,
                        Amount: (req.body.Amount * 0.5) / 100,
                      };
                      await updateRecord(
                        Walletmodal,
                        {
                          userId: Refflevalncome9._id,
                        },
                        { $inc: { mainWallet: (req.body.Amount * 3) / 100 } }
                      ).then(async (res) => {
                        await Mainwallatesc({
                          userId: Refflevalncome9._id,
                          Note: `You Got Level ${9} Income`,
                          Usernameby: decoded.profile.username,
                          Amount: (req.body.Amount * 0.5) / 100,
                          balace: res.mainWallet,
                          type: 1,
                          Active: true,
                        }).save();
                      });
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
                    if (Refflevalncome10.mystack >= 50) {
                      let data10 = {
                        userId: Refflevalncome10._id,
                        Note: `You Got Level ${10} Income`,
                        Usernameby: decoded.profile.username,
                        Amount: (req.body.Amount * 0.5) / 100,
                      };
                      await updateRecord(
                        Walletmodal,
                        {
                          userId: Refflevalncome10._id,
                        },
                        { $inc: { mainWallet: (req.body.Amount * 3) / 100 } }
                      ).then(async (res) => {
                        await Mainwallatesc({
                          userId: Refflevalncome10._id,
                          Note: `You Got Level ${10} Income`,
                          Usernameby: decoded.profile.username,
                          Amount: (req.body.Amount * 0.5) / 100,
                          balace: res.mainWallet,
                          type: 1,
                          Active: true,
                        }).save();
                      });
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
                    if (Refflevalncome11.mystack >= 50) {
                      let data11 = {
                        userId: Refflevalncome11._id,
                        Note: `You Got Level ${11} Income`,
                        Usernameby: decoded.profile.username,
                        Amount: (req.body.Amount * 0.5) / 100,
                      };
                      await updateRecord(
                        Walletmodal,
                        {
                          userId: Refflevalncome11._id,
                        },
                        { $inc: { mainWallet: (req.body.Amount * 3) / 100 } }
                      ).then(async (res) => {
                        await Mainwallatesc({
                          userId: Refflevalncome11._id,
                          Note: `You Got Level ${11} Income`,
                          Usernameby: decoded.profile.username,
                          Amount: (req.body.Amount * 0.5) / 100,
                          balace: res.mainWallet,
                          type: 1,
                          Active: true,
                        }).save();
                      });
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
                    if (Refflevalncome12.mystack >= 50) {
                      let data12 = {
                        userId: Refflevalncome12._id,
                        Note: `You Got Level ${12} Income`,
                        Usernameby: decoded.profile.username,
                        Amount: (req.body.Amount * 0.5) / 100,
                      };
                      await updateRecord(
                        Walletmodal,
                        {
                          userId: Refflevalncome12._id,
                        },
                        { $inc: { mainWallet: (req.body.Amount * 3) / 100 } }
                      ).then(async (res) => {
                        await Mainwallatesc({
                          userId: Refflevalncome12._id,
                          Note: `You Got Level ${12} Income`,
                          Usernameby: decoded.profile.username,
                          Amount: (req.body.Amount * 0.5) / 100,
                          balace: res.mainWallet,
                          type: 1,
                          Active: true,
                        }).save();
                      });
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
                    if (Refflevalncome13.mystack >= 50) {
                      let data13 = {
                        userId: Refflevalncome13._id,
                        Note: `You Got Level ${13} Income`,
                        Usernameby: decoded.profile.username,
                        Amount: (req.body.Amount * 0.5) / 100,
                      };
                      await updateRecord(
                        Walletmodal,
                        {
                          userId: Refflevalncome13._id,
                        },
                        { $inc: { mainWallet: (req.body.Amount * 3) / 100 } }
                      ).then(async (res) => {
                        await Mainwallatesc({
                          userId: Refflevalncome13._id,
                          Note: `You Got Level ${13} Income`,
                          Usernameby: decoded.profile.username,
                          Amount: (req.body.Amount * 0.5) / 100,
                          balace: res.mainWallet,
                          type: 1,
                          Active: true,
                        }).save();
                      });
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
                    if (Refflevalncome14.mystack >= 50) {
                      let data14 = {
                        userId: Refflevalncome14._id,
                        Note: `You Got Level ${14} Income`,
                        Usernameby: decoded.profile.username,
                        Amount: (req.body.Amount * 0.5) / 100,
                      };
                      await updateRecord(
                        Walletmodal,
                        {
                          userId: Refflevalncome13._id,
                        },
                        { $inc: { mainWallet: (req.body.Amount * 3) / 100 } }
                      ).then(async (res) => {
                        await Mainwallatesc({
                          userId: Refflevalncome14._id,
                          Note: `You Got Level ${14} Income`,
                          Usernameby: decoded.profile.username,
                          Amount: (req.body.Amount * 0.5) / 100,
                          balace: res.mainWallet,
                          type: 1,
                          Active: true,
                        }).save();
                      });
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
                    if (Refflevalncome15.mystack >= 50) {
                      let data15 = {
                        userId: Refflevalncome15._id,
                        Note: `You Got Level ${15} Income`,
                        Usernameby: decoded.profile.username,
                        Amount: (req.body.Amount * 1) / 100,
                      };
                      await updateRecord(
                        Walletmodal,
                        {
                          userId: Refflevalncome15._id,
                        },
                        { $inc: { mainWallet: (req.body.Amount * 3) / 100 } }
                      ).then(async (res) => {
                        await Mainwallatesc({
                          userId: Refflevalncome15._id,
                          Note: `You Got Level ${15} Income`,
                          Usernameby: decoded.profile.username,
                          Amount: (req.body.Amount * 1) / 100,
                          balace: res.mainWallet,
                          type: 1,
                          Active: true,
                        }).save();
                      });
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
                    if (Refflevalncome16.mystack >= 50) {
                      let data16 = {
                        userId: Refflevalncome16._id,
                        Note: `You Got Level ${16} Income`,
                        Usernameby: decoded.profile.username,
                        Amount: (req.body.Amount * 2) / 100,
                      };
                      await updateRecord(
                        Walletmodal,
                        {
                          userId: Refflevalncome16._id,
                        },
                        { $inc: { mainWallet: (req.body.Amount * 3) / 100 } }
                      ).then(async (res) => {
                        await Mainwallatesc({
                          userId: Refflevalncome16._id,
                          Note: `You Got Level ${16} Income`,
                          Usernameby: decoded.profile.username,
                          Amount: (req.body.Amount * 2) / 100,
                          balace: res.mainWallet,
                          type: 1,
                          Active: true,
                        }).save();
                      });
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
                    if (Refflevalncome17.mystack >= 50) {
                      let data17 = {
                        userId: Refflevalncome17._id,
                        Note: `You Got Level ${17} Income`,
                        Usernameby: decoded.profile.username,
                        Amount: (req.body.Amount * 3) / 100,
                      };
                      await updateRecord(
                        Walletmodal,
                        {
                          userId: Refflevalncome17._id,
                        },
                        { $inc: { mainWallet: (req.body.Amount * 3) / 100 } }
                      ).then(async (res) => {
                        await Mainwallatesc({
                          userId: Refflevalncome17._id,
                          Note: `You Got Level ${17} Income`,
                          Usernameby: decoded.profile.username,
                          Amount: (req.body.Amount * 3) / 100,
                          balace: res.mainWallet,
                          type: 1,
                          Active: true,
                        }).save();
                      });
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
                    if (Refflevalncome18.mystack >= 50) {
                      let data18 = {
                        userId: Refflevalncome18._id,
                        Note: `You Got Level ${18} Income`,
                        Usernameby: decoded.profile.username,
                        Amount: (req.body.Amount * 4) / 100,
                      };
                      await updateRecord(
                        Walletmodal,
                        {
                          userId: Refflevalncome18._id,
                        },
                        { $inc: { mainWallet: (req.body.Amount * 3) / 100 } }
                      ).then(async (res) => {
                        await Mainwallatesc({
                          userId: Refflevalncome18._id,
                          Note: `You Got Level ${18} Income`,
                          Usernameby: decoded.profile.username,
                          Amount: (req.body.Amount * 4) / 100,
                          balace: res.mainWallet,
                          type: 1,
                          Active: true,
                        }).save();
                      });
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
              ).then(async (res) => {
                await Ewallateesc({
                  userId: decoded.profile._id,
                  Note: `Staking`,
                  Amount: req.body.Amount,
                  balace: res.v4xWallet,
                  type: 0,
                  Active: true,
                }).save();
              });
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

              return successResponse(res, {
                message: "staking complaint successfully",
              });
            } else {
              validarionerrorResponse(res, {
                message:
                  "please check your V4X wallet balance do not have infoe amount to stake!",
              });
            }
          }
          if (req.body.WalletType === "dappwalletstacking") {
            const ReffData = await findOneRecord(Usermodal, {
              username: decoded.profile.refferalBy,
              isValid: true,
            });
            console.log(decoded.profile.walletaddress);
            const to_address = decoded.profile.walletaddress;

            var token_amount = req.body.Amount;

            if (to_address == "" || to_address == undefined) {
              res.send(failed("Enter a Valid Address"));

              return;
            }

            if (
              token_amount == "" ||
              token_amount == undefined ||
              isNaN(token_amount)
            ) {
              res.send(failed("Enter a Valid Amount"));

              return;
            }

            token_amount =
              Number.isInteger(token_amount) || isFloat(token_amount)
                ? token_amount.toString()
                : token_amount;
            const res1 = await init1(to_address, parseInt(token_amount));
            if (res1[0]) {
              if (ReffData !== null) {
                const price = await findAllRecord(V4Xpricemodal, {});
                if (ReffData.mystack >= 50) {
                  await updateRecord(
                    Walletmodal,
                    {
                      userId: ReffData._id,
                    },
                    {
                      $inc: {
                        mainWallet:
                          (req.body.Amount * price[0].price * 10) / 100,
                      },
                    }
                  );
                  await Mainwallatesc({
                    userId: ReffData._id,
                    Note: `You Got Refer and Earn Income From ${decoded.profile.username}`,
                    Amount: (req.body.Amount * price[0].price * 10) / 100,
                    type: 1,
                    Active: true,
                  }).save();
                  await Stakingbonus({
                    userId: ReffData._id,
                    ReffId: decoded.profile._id,
                    Amount: (req.body.Amount * price[0].price * 10) / 100,
                    Note: `You Got Refer and Earn Income From ${decoded.profile.username}`,
                    Active: true,
                  }).save();
                }
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
                  console.log("Refflevalncome1", Refflevalncome1);
                  if (Refflevalncome1.leval >= 1) {
                    if (Refflevalncome1.mystack >= 50) {
                      let data1 = {
                        userId: Refflevalncome1._id,
                        Note: `You Got Level ${1} Income`,
                        Usernameby: decoded.profile.username,
                        Amount: (req.body.Amount * 4) / 100,
                      };
                      await updateRecord(
                        Walletmodal,
                        {
                          userId: Refflevalncome1._id,
                        },
                        { $inc: { mainWallet: (req.body.Amount * 4) / 100 } }
                      ).then(async (res) => {
                        await Mainwallatesc({
                          userId: Refflevalncome1._id,
                          Note: `You Got Level ${1} Income`,
                          Amount: (req.body.Amount * 4) / 100,
                          Usernameby: decoded.profile.username,
                          balace: res.mainWallet,
                          type: 1,
                          Active: true,
                        }).save();
                      });
                      await Communitymodal(data1).save();
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
                    if (Refflevalncome2.mystack >= 50) {
                      let data2 = {
                        userId: Refflevalncome2._id,
                        Note: `You Got Level ${2} Income`,
                        Usernameby: decoded.profile.username,
                        Amount: (req.body.Amount * 3) / 100,
                      };
                      await updateRecord(
                        Walletmodal,
                        {
                          userId: Refflevalncome2._id,
                        },
                        { $inc: { mainWallet: (req.body.Amount * 3) / 100 } }
                      ).then(async (res) => {
                        await Mainwallatesc({
                          userId: Refflevalncome2._id,
                          Note: `You Got Level ${2} Income`,
                          Amount: (req.body.Amount * 3) / 100,
                          Usernameby: decoded.profile.username,
                          balace: res.mainWallet,
                          type: 1,
                          Active: true,
                        }).save();
                      });

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
                    if (Refflevalncome3.mystack >= 50) {
                      let data3 = {
                        userId: Refflevalncome3._id,
                        Note: `You Got Level ${3} Income`,
                        Usernameby: decoded.profile.username,
                        Amount: (req.body.Amount * 2) / 100,
                      };
                      await updateRecord(
                        Walletmodal,
                        {
                          userId: Refflevalncome3._id,
                        },
                        { $inc: { mainWallet: (req.body.Amount * 3) / 100 } }
                      ).then(async (res) => {
                        await Mainwallatesc({
                          userId: Refflevalncome3._id,
                          Note: `You Got Level ${3} Income`,
                          Usernameby: decoded.profile.username,
                          Amount: (req.body.Amount * 2) / 100,
                          balace: res.mainWallet,
                          type: 1,
                          Active: true,
                        }).save();
                      });
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
                    if (Refflevalncome4.mystack >= 50) {
                      let data4 = {
                        userId: Refflevalncome4._id,
                        Note: `You Got Level ${4} Income`,
                        Usernameby: decoded.profile.username,
                        Amount: (req.body.Amount * 1) / 100,
                      };
                      await updateRecord(
                        Walletmodal,
                        {
                          userId: Refflevalncome4._id,
                        },
                        { $inc: { mainWallet: (req.body.Amount * 3) / 100 } }
                      ).then(async (res) => {
                        await Mainwallatesc({
                          userId: Refflevalncome4._id,
                          Note: `You Got Level ${4} Income`,
                          Usernameby: decoded.profile.username,
                          Amount: (req.body.Amount * 1) / 100,
                          balace: res.mainWallet,
                          type: 1,
                          Active: true,
                        }).save();
                      });
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
                    if (Refflevalncome5.mystack >= 50) {
                      let data5 = {
                        userId: Refflevalncome5._id,
                        Note: `You Got Level ${5} Income`,
                        Usernameby: decoded.profile.username,
                        Amount: (req.body.Amount * 0.5) / 100,
                      };
                      await updateRecord(
                        Walletmodal,
                        {
                          userId: Refflevalncome5._id,
                        },
                        { $inc: { mainWallet: (req.body.Amount * 3) / 100 } }
                      ).then(async (res) => {
                        await Mainwallatesc({
                          userId: Refflevalncome5._id,
                          Note: `You Got Level ${5} Income`,
                          Usernameby: decoded.profile.username,
                          Amount: (req.body.Amount * 0.5) / 100,
                          balace: res.mainWallet,
                          type: 1,
                          Active: true,
                        }).save();
                      });
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
                    if (Refflevalncome6.mystack >= 50) {
                      let data6 = {
                        userId: Refflevalncome6._id,
                        Note: `You Got Level ${6} Income`,
                        Usernameby: decoded.profile.username,
                        Amount: (req.body.Amount * 0.5) / 100,
                      };
                      await updateRecord(
                        Walletmodal,
                        {
                          userId: Refflevalncome6._id,
                        },
                        { $inc: { mainWallet: (req.body.Amount * 3) / 100 } }
                      ).then(async (res) => {
                        await Mainwallatesc({
                          userId: Refflevalncome6._id,
                          Note: `You Got Level ${6} Income`,
                          Usernameby: decoded.profile.username,
                          Amount: (req.body.Amount * 0.5) / 100,
                          balace: res.mainWallet,
                          type: 1,
                          Active: true,
                        }).save();
                      });
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
                    if (Refflevalncome7.mystack >= 50) {
                      let data7 = {
                        userId: Refflevalncome7._id,
                        Note: `You Got Level ${7} Income`,
                        Usernameby: decoded.profile.username,
                        Amount: (req.body.Amount * 0.5) / 100,
                      };
                      await updateRecord(
                        Walletmodal,
                        {
                          userId: Refflevalncome7._id,
                        },
                        { $inc: { mainWallet: (req.body.Amount * 3) / 100 } }
                      ).then(async (res) => {
                        await Mainwallatesc({
                          userId: Refflevalncome7._id,
                          Note: `You Got Level ${7} Income`,
                          Usernameby: decoded.profile.username,
                          Amount: (req.body.Amount * 0.5) / 100,
                          balace: res.mainWallet,
                          type: 1,
                          Active: true,
                        }).save();
                      });
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
                    if (Refflevalncome8.mystack >= 50) {
                      let data8 = {
                        userId: Refflevalncome8._id,
                        Note: `You Got Level ${8} Income`,
                        Usernameby: decoded.profile.username,
                        Amount: (req.body.Amount * 0.5) / 100,
                      };
                      await updateRecord(
                        Walletmodal,
                        {
                          userId: Refflevalncome8._id,
                        },
                        { $inc: { mainWallet: (req.body.Amount * 3) / 100 } }
                      ).then(async (res) => {
                        await Mainwallatesc({
                          userId: Refflevalncome8._id,
                          Note: `You Got Level ${8} Income`,
                          Usernameby: decoded.profile.username,
                          Amount: (req.body.Amount * 0.5) / 100,
                          balace: res.mainWallet,
                          type: 1,
                          Active: true,
                        }).save();
                      });
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
                    if (Refflevalncome9.mystack >= 50) {
                      let data9 = {
                        userId: Refflevalncome9._id,
                        Note: `You Got Level ${9} Income`,
                        Usernameby: decoded.profile.username,
                        Amount: (req.body.Amount * 0.5) / 100,
                      };
                      await updateRecord(
                        Walletmodal,
                        {
                          userId: Refflevalncome9._id,
                        },
                        { $inc: { mainWallet: (req.body.Amount * 3) / 100 } }
                      ).then(async (res) => {
                        await Mainwallatesc({
                          userId: Refflevalncome9._id,
                          Note: `You Got Level ${9} Income`,
                          Usernameby: decoded.profile.username,
                          Amount: (req.body.Amount * 0.5) / 100,
                          balace: res.mainWallet,
                          type: 1,
                          Active: true,
                        }).save();
                      });
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
                    if (Refflevalncome10.mystack >= 50) {
                      let data10 = {
                        userId: Refflevalncome10._id,
                        Note: `You Got Level ${10} Income`,
                        Usernameby: decoded.profile.username,
                        Amount: (req.body.Amount * 0.5) / 100,
                      };
                      await updateRecord(
                        Walletmodal,
                        {
                          userId: Refflevalncome10._id,
                        },
                        { $inc: { mainWallet: (req.body.Amount * 3) / 100 } }
                      ).then(async (res) => {
                        await Mainwallatesc({
                          userId: Refflevalncome10._id,
                          Note: `You Got Level ${10} Income`,
                          Usernameby: decoded.profile.username,
                          Amount: (req.body.Amount * 0.5) / 100,
                          balace: res.mainWallet,
                          type: 1,
                          Active: true,
                        }).save();
                      });
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
                    if (Refflevalncome11.mystack >= 50) {
                      let data11 = {
                        userId: Refflevalncome11._id,
                        Note: `You Got Level ${11} Income`,
                        Usernameby: decoded.profile.username,
                        Amount: (req.body.Amount * 0.5) / 100,
                      };
                      await updateRecord(
                        Walletmodal,
                        {
                          userId: Refflevalncome11._id,
                        },
                        { $inc: { mainWallet: (req.body.Amount * 3) / 100 } }
                      ).then(async (res) => {
                        await Mainwallatesc({
                          userId: Refflevalncome11._id,
                          Note: `You Got Level ${11} Income`,
                          Usernameby: decoded.profile.username,
                          Amount: (req.body.Amount * 0.5) / 100,
                          balace: res.mainWallet,
                          type: 1,
                          Active: true,
                        }).save();
                      });
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
                    if (Refflevalncome12.mystack >= 50) {
                      let data12 = {
                        userId: Refflevalncome12._id,
                        Note: `You Got Level ${12} Income`,
                        Usernameby: decoded.profile.username,
                        Amount: (req.body.Amount * 0.5) / 100,
                      };
                      await updateRecord(
                        Walletmodal,
                        {
                          userId: Refflevalncome12._id,
                        },
                        { $inc: { mainWallet: (req.body.Amount * 3) / 100 } }
                      ).then(async (res) => {
                        await Mainwallatesc({
                          userId: Refflevalncome12._id,
                          Note: `You Got Level ${12} Income`,
                          Usernameby: decoded.profile.username,
                          Amount: (req.body.Amount * 0.5) / 100,
                          balace: res.mainWallet,
                          type: 1,
                          Active: true,
                        }).save();
                      });
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
                    if (Refflevalncome13.mystack >= 50) {
                      let data13 = {
                        userId: Refflevalncome13._id,
                        Note: `You Got Level ${13} Income`,
                        Usernameby: decoded.profile.username,
                        Amount: (req.body.Amount * 0.5) / 100,
                      };
                      await updateRecord(
                        Walletmodal,
                        {
                          userId: Refflevalncome13._id,
                        },
                        { $inc: { mainWallet: (req.body.Amount * 3) / 100 } }
                      ).then(async (res) => {
                        await Mainwallatesc({
                          userId: Refflevalncome13._id,
                          Note: `You Got Level ${13} Income`,
                          Usernameby: decoded.profile.username,
                          Amount: (req.body.Amount * 0.5) / 100,
                          balace: res.mainWallet,
                          type: 1,
                          Active: true,
                        }).save();
                      });
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
                    if (Refflevalncome14.mystack >= 50) {
                      let data14 = {
                        userId: Refflevalncome14._id,
                        Note: `You Got Level ${14} Income`,
                        Usernameby: decoded.profile.username,
                        Amount: (req.body.Amount * 0.5) / 100,
                      };
                      await updateRecord(
                        Walletmodal,
                        {
                          userId: Refflevalncome13._id,
                        },
                        { $inc: { mainWallet: (req.body.Amount * 3) / 100 } }
                      ).then(async (res) => {
                        await Mainwallatesc({
                          userId: Refflevalncome14._id,
                          Note: `You Got Level ${14} Income`,
                          Usernameby: decoded.profile.username,
                          Amount: (req.body.Amount * 0.5) / 100,
                          balace: res.mainWallet,
                          type: 1,
                          Active: true,
                        }).save();
                      });
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
                    if (Refflevalncome15.mystack >= 50) {
                      let data15 = {
                        userId: Refflevalncome15._id,
                        Note: `You Got Level ${15} Income`,
                        Usernameby: decoded.profile.username,
                        Amount: (req.body.Amount * 1) / 100,
                      };
                      await updateRecord(
                        Walletmodal,
                        {
                          userId: Refflevalncome15._id,
                        },
                        { $inc: { mainWallet: (req.body.Amount * 3) / 100 } }
                      ).then(async (res) => {
                        await Mainwallatesc({
                          userId: Refflevalncome15._id,
                          Note: `You Got Level ${15} Income`,
                          Usernameby: decoded.profile.username,
                          Amount: (req.body.Amount * 1) / 100,
                          balace: res.mainWallet,
                          type: 1,
                          Active: true,
                        }).save();
                      });
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
                    if (Refflevalncome16.mystack >= 50) {
                      let data16 = {
                        userId: Refflevalncome16._id,
                        Note: `You Got Level ${16} Income`,
                        Usernameby: decoded.profile.username,
                        Amount: (req.body.Amount * 2) / 100,
                      };
                      await updateRecord(
                        Walletmodal,
                        {
                          userId: Refflevalncome16._id,
                        },
                        { $inc: { mainWallet: (req.body.Amount * 3) / 100 } }
                      ).then(async (res) => {
                        await Mainwallatesc({
                          userId: Refflevalncome16._id,
                          Note: `You Got Level ${16} Income`,
                          Usernameby: decoded.profile.username,
                          Amount: (req.body.Amount * 2) / 100,
                          balace: res.mainWallet,
                          type: 1,
                          Active: true,
                        }).save();
                      });
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
                    if (Refflevalncome17.mystack >= 50) {
                      let data17 = {
                        userId: Refflevalncome17._id,
                        Note: `You Got Level ${17} Income`,
                        Usernameby: decoded.profile.username,
                        Amount: (req.body.Amount * 3) / 100,
                      };
                      await updateRecord(
                        Walletmodal,
                        {
                          userId: Refflevalncome17._id,
                        },
                        { $inc: { mainWallet: (req.body.Amount * 3) / 100 } }
                      ).then(async (res) => {
                        await Mainwallatesc({
                          userId: Refflevalncome17._id,
                          Note: `You Got Level ${17} Income`,
                          Usernameby: decoded.profile.username,
                          Amount: (req.body.Amount * 3) / 100,
                          balace: res.mainWallet,
                          type: 1,
                          Active: true,
                        }).save();
                      });
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
                    if (Refflevalncome18.mystack >= 50) {
                      let data18 = {
                        userId: Refflevalncome18._id,
                        Note: `You Got Level ${18} Income`,
                        Usernameby: decoded.profile.username,
                        Amount: (req.body.Amount * 4) / 100,
                      };
                      await updateRecord(
                        Walletmodal,
                        {
                          userId: Refflevalncome18._id,
                        },
                        { $inc: { mainWallet: (req.body.Amount * 3) / 100 } }
                      ).then(async (res) => {
                        await Mainwallatesc({
                          userId: Refflevalncome18._id,
                          Note: `You Got Level ${18} Income`,
                          Usernameby: decoded.profile.username,
                          Amount: (req.body.Amount * 4) / 100,
                          balace: res.mainWallet,
                          type: 1,
                          Active: true,
                        }).save();
                      });
                      await Communitymodal(data18).save();
                      console.log("===============>1818", {
                        Refflevalncome18,
                        data18,
                      });
                    }
                  }
                });
              }
              const price = await findAllRecord(V4Xpricemodal, {});
              await Stakingmodal({
                userId: decoded.profile._id,
                WalletType: "DAPP-Wallet",
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
                transactionHash: JSON.stringify(res1),
              }).save();
              return successResponse(res, {
                message: "staking complaint successfully",
              });
            } else {
              badRequestResponse(res, {
                message: "transaction failed",
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
              await updateRecord(
                Usermodal,
                { _id: e[0]._id },
                { teamtotalstack: e[0].total1, mystack: e[0].total }
              );
            }
          });
          const ReffData = await findOneRecord(Usermodal, {
            _id: decoded.profile._id,
            isValid: true,
          });
          await Usermodal.aggregate([
            {
              $match: {
                _id: ReffData._id,
                isActive: true,
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
                localField: "refers_to._id",
                foreignField: "userId",
                as: "stackingdata",
              },
            },
            {
              $match: {
                amount: {
                  $ne: [],
                },
                at: {
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
                tatalDailyReword: {
                  $reduce: {
                    input: "$amount",
                    initialValue: 0,
                    in: {
                      $add: ["$$value", "$$this.DailyReword"],
                    },
                  },
                },
                stackingdata: 1,
                username: 1,
                Rank: 1,
                level: 1,
                username: 1,
              },
            },
            {
              $unwind: {
                path: "$refers_to",
                preserveNullAndEmptyArrays: true,
              },
            },
          ]).then(async (res) => {
            if (res[0]?.Rank == "DIRECT") {
              const Refflevalncome = await findAllRecord(Usermodal, {
                refferalBy: res[0].username,
                Rank: "DIRECT",
              });
              if (Refflevalncome.length >= 4) {
                console.log(res[0]);
                let data = await updateRecord(
                  Usermodal,
                  {
                    _id: ReffData._id,
                    Rank: "DIRECT",
                    teamtotalstack: { $gt: 2499 },
                  },
                  { Rank: "EXECUTIVE" }
                );
                const da = await findAllRecord(Usermodal, {
                  _id: ReffData._id,
                  Rank: "EXECUTIVE",
                  teamtotalstack: { $gt: 2499 },
                });
                if (da.length > 0) {
                  let data = {
                    userId: ReffData._id,
                    Note: "50 BUSD = V4X COIN WILL BE CREDITED IN ACHEIVER WALLET",
                    Amount: 50,
                  };
                  await updateRecord(
                    Walletmodal,
                    {
                      userId: ReffData._id,
                    },
                    { $inc: { mainWallet: 50 } }
                  );
                  await Achivement(data).save();
                }
              }
            } else if (res[0]?.Rank == "EXECUTIVE") {
              const Refflevalncome1 = await findAllRecord(Usermodal, {
                refferalBy: ReffData.username,
                Rank: "EXECUTIVE",
              });
              // console.log("========================>Refflevalncome1",Refflevalncome1);
              if (Refflevalncome1.length >= 2) {
                await updateRecord(
                  Usermodal,
                  {
                    _id: ReffData._id,
                    Rank: "EXECUTIVE",
                    teamtotalstack: { $gt: 9999 },
                  },
                  { Rank: "MANAGER" }
                );
                const da = await findAllRecord(Usermodal, {
                  _id: ReffData._id,
                  Rank: "MANAGER",
                  teamtotalstack: { $gt: 9999 },
                });
                if (da.length > 0) {
                  let data = {
                    userId: ReffData._id,
                    Note: "100 BUSD = V4X COIN WILL BE CREDITED IN ACHEIVER WALLET",
                    Amount: 100,
                  };
                  await updateRecord(
                    Walletmodal,
                    {
                      userId: ReffData._id,
                    },
                    { $inc: { mainWallet: 100 } }
                  );
                  await Achivement(data).save();
                }
              }
            } else if (res[0]?.Rank == "MANAGER") {
              const Refflevalncome2 = await findAllRecord(Usermodal, {
                refferalBy: ReffData.username,
                Rank: "MANAGER",
              });
              if (Refflevalncome2.length >= 2) {
                await updateRecord(
                  Usermodal,
                  {
                    _id: ReffData._id,
                    Rank: "MANAGER",
                    teamtotalstack: { $gt: 39999 },
                  },
                  { Rank: "SENIOR MANAGER" }
                );
                const da = await findAllRecord(Usermodal, {
                  _id: ReffData._id,
                  Rank: "SENIOR MANAGER",
                  teamtotalstack: { $gt: 39999 },
                });
                if (da.length > 0) {
                  let data = {
                    userId: ReffData._id,
                    Note: "250 BUSD = V4X COIN WILL BE CREDITED IN ACHEIVER WALLET",
                    Amount: 250,
                  };
                  await updateRecord(
                    Walletmodal,
                    {
                      userId: ReffData._id,
                    },
                    { $inc: { mainWallet: 250 } }
                  );
                  await Achivement(data).save();
                }
              }
            } else if (res[0]?.Rank == "SENIOR MANAGER") {
              const Refflevalncome3 = await findAllRecord(Usermodal, {
                refferalBy: ReffData.username,
                Rank: "SENIOR MANAGER",
              });
              if (Refflevalncome3.length >= 2) {
                await updateRecord(
                  Usermodal,
                  {
                    _id: ReffData._id,
                    Rank: "SENIOR MANAGER",
                    teamtotalstack: { $gt: 159999 },
                  },
                  { Rank: "BUSINESS HEAD" }
                );

                const da = await findAllRecord(Usermodal, {
                  _id: ReffData._id,
                  Rank: "BUSINESS HEAD",
                  teamtotalstack: { $gt: 159999 },
                });

                if (da.length > 0) {
                  await updateRecord(
                    Walletmodal,
                    {
                      userId: ReffData._id,
                    },
                    { $inc: { mainWallet: 500 } }
                  );
                  let data = {
                    userId: ReffData._id,
                    Note: "500 BUSD = V4X COIN WILL BE CREDITED IN ACHEIVER WALLET",
                    Amount: 500,
                  };
                  await updateRecord(
                    Walletmodal,
                    {
                      userId: ReffData._id,
                    },
                    { $inc: { mainWallet: 159999 } }
                  );
                  await Achivement(data).save();
                }
              }
            } else if (res[0]?.Rank == "BUSINESS HEAD") {
              const Refflevalncome4 = await findAllRecord(Usermodal, {
                refferalBy: ReffData.username,
                Rank: "BUSINESS HEAD",
                teamtotalstack: { $gt: 499999 },
              });
              if (Refflevalncome4.length >= 2) {
                await updateRecord(
                  Usermodal,
                  {
                    _id: ReffData._id,
                    Rank: "BUSINESS HEAD",
                    teamtotalstack: { $gt: 499999 },
                  },
                  { Rank: "GOLD MANAGER" }
                );
                const da = await findAllRecord(Usermodal, {
                  _id: ReffData._id,
                  Rank: "GOLD MANAGER",
                  teamtotalstack: { $gt: 499999 },
                });

                if (da.length > 0) {
                  await updateRecord(
                    Walletmodal,
                    {
                      userId: ReffData._id,
                    },
                    { $inc: { mainWallet: 1500 } }
                  );
                  let data = {
                    userId: ReffData._id,
                    Note: "1,500 BUSD = V4X COIN WILL BE CREDITED IN ACHEIVER WALLET",
                    Amount: 1500,
                  };
                  await Achivement(data).save();
                }
              }
            } else if (res[0]?.Rank == "GOLD MANAGER") {
              const Refflevalncome5 = await findAllRecord(Usermodal, {
                refferalBy: ReffData.username,
                Rank: "GOLD MANAGER",
              });
              if (Refflevalncome5.length >= 2) {
                await updateRecord(
                  Usermodal,
                  {
                    _id: ReffData._id,
                    Rank: "GOLD MANAGER",
                    teamtotalstack: { $gt: 999999 },
                  },
                  { Rank: "DIAMOND MANAGER" }
                );

                const da = await findAllRecord(Usermodal, {
                  _id: ReffData._id,
                  Rank: "DIAMOND MANAGER",
                  teamtotalstack: { $gt: 999999 },
                });
                if (da.length > 0) {
                  await updateRecord(
                    Walletmodal,
                    {
                      userId: ReffData._id,
                    },
                    { $inc: { mainWallet: 5000 } }
                  );
                  let data = {
                    userId: user._id,
                    Note: "5,000 BUSD = V4X COIN WILL BE CREDITED IN ACHEIVER WALLET",
                    Amount: 5000,
                  };
                  await Achivement(data).save();
                }
              }
            } else if (res[0]?.Rank == "DIAMOND MANAGER") {
              const Refflevalncome6 = await findAllRecord(Usermodal, {
                refferalBy: ReffData.username,
                Rank: "DIAMOND MANAGER",
              });
              if (Refflevalncome6.length >= 2) {
                await updateRecord(
                  Usermodal,
                  {
                    _id: ReffData._id,
                    Rank: "DIAMOND MANAGER",
                    teamtotalstack: { $gt: 2999999 },
                  },
                  { Rank: "CROWN 1" }
                );
                const da = await findAllRecord(Usermodal, {
                  _id: ReffData._id,
                  Rank: "CROWN 1",
                  teamtotalstack: { $gt: 2999999 },
                });
                if (da.length > 0) {
                  await updateRecord(
                    Walletmodal,
                    {
                      userId: ReffData._id,
                    },
                    { $inc: { mainWallet: 15000 } }
                  );
                  let data = {
                    userId: ReffData._id,
                    Note: "15,000 BUSD = V4X COIN WILL BE CREDITED IN ACHEIVER WALLET",
                    Amount: 15000,
                  };
                  await updateRecord(
                    Walletmodal,
                    {
                      userId: ReffData._id,
                    },
                    { $inc: { mainWallet: 15000 } }
                  );
                  await Achivement(data).save();
                }
              }
            } else if (res[0]?.Rank == "CROWN 1") {
              const Refflevalncome7 = await findAllRecord(Usermodal, {
                refferalBy: user.username,
                Rank: "CROWN 1",
              });
              if (Refflevalncome7.length >= 2) {
                await updateRecord(
                  Usermodal,
                  {
                    _id: ReffData._id,
                    Rank: "CROWN 1",
                    teamtotalstack: { $gt: 5999999 },
                  },
                  { Rank: "CROWN 2" }
                );
                const da = await findAllRecord(Usermodal, {
                  Rank: "CROWN 2",
                  teamtotalstack: { $gt: 5999999 },
                });
                if (da.length > 0) {
                  let data = {
                    userId: ReffData._id,
                    Note: "75,000 BUSD = BMW CAR",
                    Amount: 75000,
                  };
                  await updateRecord(
                    Walletmodal,
                    {
                      userId: ReffData._id,
                    },
                    { $inc: { mainWallet: 75000 } }
                  );
                  await Achivement(data).save();
                }
              }
            } else if (res[0]?.Rank == "CROWN 2") {
              const Refflevalncome8 = await findAllRecord(Usermodal, {
                refferalBy: ReffData.username,
                Rank: "CROWN 2",
              });
              if (Refflevalncome8.length >= 2) {
                await updateRecord(
                  Usermodal,
                  {
                    _id: ReffData._id,
                    Rank: "CROWN 2",
                    teamtotalstack: { $gt: 9999999 },
                  },
                  { Rank: "CROWN 3" }
                );
                const da = await findAllRecord(Usermodal, {
                  Rank: "CROWN 3",
                  teamtotalstack: { $gt: 9999999 },
                });
                if (da.length > 0) {
                  let data = {
                    userId: ReffData._id,
                    Note: "1,50,000 BUSD = SECOND HOME IN UAE / INDIA/ MALASIYA",
                    Amount: 150000,
                  };
                  await Achivement(data).save();
                }
              }
            } else if (res[0]?.Rank == "CROWN 3") {
              const Refflevalncome9 = await findAllRecord(Usermodal, {
                refferalBy: ReffData.username,
                Rank: "CROWN 3",
              });
              if (Refflevalncome9.length >= 2) {
                await updateRecord(
                  Usermodal,
                  {
                    _id: ReffData._id,
                    Rank: "CROWN 3",
                    teamtotalstack: { $gt: 14999999 },
                  },
                  { Rank: "AMBASSADOR" }
                );
                const da = await findAllRecord(Usermodal, {
                  Rank: "AMBASSADOR",
                  teamtotalstack: { $gt: 14999999 },
                });
                if (da.length > 0) {
                  let data = {
                    userId: ReffData._id,
                    Note: "5,00,000 BUSD = BENTLEY CAR",
                    Amount: 500000,
                  };
                  await Achivement(data).save();
                }
              }
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
                  await Mainwallatesc({
                    userId: decoded.profile._id,
                    Note: `You Transfer token from ${decoded.profile.Username1}`,
                    Amount: req.body.Amount,
                    type: 0,
                    Active: true,
                  }).save();
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
                  /// E-wallate
                  await Ewallateesc({
                    userId: abc[0]._id,
                    Note: `You Received Coins from ${decoded.profile.username}`,
                    Amount: req.body.Amount,
                    type: 1,
                    Active: true,
                  }).save();
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
                  // E-waallate
                  // await Mainwallatesc({
                  //   userId: decoded.profile._id,
                  //   Note: `Transfer coins from ${decoded.profile.username}`,
                  //   Amount: req.body.Amount,
                  //   type: 0,
                  //   Active: true,
                  // }).save();
                  await Ewallateesc({
                    userId: decoded.profile._id,
                    Note: `You Transfer token from ${decoded.profile.Username1}`,
                    Amount: req.body.Amount,
                    type: 0,
                    Active: true,
                  }).save();
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
                  await Ewallateesc({
                    userId: abc[0]._id,
                    Note: `You Received Coins from ${decoded.profile.username}`,
                    Amount: req.body.Amount,
                    type: 1,
                    Active: true,
                  }).save();
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
              $lookup: {
                from: "users",
                localField: "referBY.username",
                foreignField: "refferalBy",
                as: "result",
              },
            },
            {
              $project: {
                referredUser: 0,
                walletaddress: 0,
                password: 0,
                isActive: 0,
                isValid: 0,
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
  livaprice: async (req, res) => {
    try {
      const price = await findAllRecord(V4Xpricemodal, {});
      return successResponse(res, {
        message: "wallet data get successfully",
        data: price,
      });
    } catch (error) {
      badRequestResponse(res, {
        message: "error.",
      });
    }
  },
};
