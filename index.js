require("dotenv").config();
require("./config/db");
const express = require("express");
const cors = require("cors");
const swaggerJson = require("./swagger/swagger.json");
const schedule = require("node-schedule");
const swaggerUi = require("swagger-ui-express");

const app = express();
app.use(cors());
const routes = require("./routes/index");
const Usermodal = require("./models/user");
const Stakingmodal = require("./models/Staking");
const {
  findAllRecord,
  updateRecord,
  findOneRecord,
} = require("./library/commonQueries");
const Walletmodal = require("./models/Wallet");
const Web3 = require("web3");
const Stakingbonus = require("./models/Stakingbonus");
const V4Xpricemodal = require("./models/V4XLiveRate");
const Passive = require("./models/Passive");
const Mainwallatesc = require("./models/Mainwallate");
const env = require("./env");
const { success, failed } = require("./helper");
const Achivement = require("./models/Achivement");
const { ObjectId } = require("mongodb");
const Mailgun = require("mailgun-js");

const infraUrl = env.globalAccess.rpcUrl;
const ContractAbi = env.contract.V4XAbi.abi;

const ContractAddress = env.globalAccess.V4XContract;

const ContractAbiForBUSD = env.contract.busdAbi.abi;

const ContractAddressForBUSD = env.globalAccess.busdContract;

const PrivateKey = env.privateKey;

const web3 = new Web3(infraUrl);
app.use(
  express.json({
    limit: "1024mb",
  })
);
app.use(
  express.urlencoded({
    limit: "1024mb",
    extended: true,
  })
);

const init0 = async (to_address, token_amount) => {
  const myContractForBUSD = new web3.eth.Contract(
    JSON.parse(ContractAbiForBUSD),

    ContractAddressForBUSD
  );

  const tx = myContractForBUSD.methods.transfer(
    to_address,
    token_amount.toString()
  );

  const data = tx.encodeABI();

  try {
    const accountInstance = await web3.eth.accounts.signTransaction(
      {
        to: myContractForBUSD.options.address,

        data,

        value: "0x0",

        gas: 500000,
      },

      PrivateKey
    );

    const receipt = await web3.eth.sendSignedTransaction(
      accountInstance.rawTransaction
    );

    return [true, receipt.transactionHash];
  } catch (error) {
    return [false, JSON.stringify(error)];
  }
};

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

const transInfo = async (Hash) => {
  try {
    const hash = await web3.eth.getTransactionReceipt(Hash);
    return [true, hash];
  } catch (error) {
    return [false, error];
  }
};
app.use("/api", routes);
app.use("/swagger", swaggerUi.serve, swaggerUi.setup(swaggerJson));
// const every24hours = "*/2 * * * *";
const every24hours = "0 0 * * *";
schedule.scheduleJob(every24hours, async () => {
  try {
    const Userdata = await findAllRecord(Usermodal, {});
    for (const user of Userdata) {
      const Userdata1 = await findAllRecord(Stakingmodal, {
        userId: user._id,
        Active: true,
      });
      for (const reword of Userdata1) {
        const price = await findAllRecord(V4Xpricemodal, {});
        if (reword !== undefined) {
          if (reword.TotaldaysTosendReword !== 0) {
            await updateRecord(
              Walletmodal,
              {
                userId: reword.userId,
              },
              { $inc: { mainWallet: reword.DailyReword / price[0].price } }
            ).then(async (res) => {
              await Mainwallatesc({
                userId: reword.userId,
                Note: "You Got Staking Bonus Income.",
                Amount: reword.DailyReword,
                type: 1,
                balace: res.mainWallet,
                Active: true,
              }).save();
              await Stakingbonus({
                userId: reword.userId,
                rewordId: reword._id,
                Amount: reword.DailyReword,
                Note: "You Got Staking Bonus Income.",
                Active: true,
              }).save();
              await updateRecord(
                Stakingmodal,
                {
                  _id: reword._id,
                },
                {
                  TotalRewordRecived:
                    reword.TotalRewordRecived -
                    reword.DailyReword / price[0].price,
                  TotaldaysTosendReword: reword.TotaldaysTosendReword - 1,
                  $inc: { Totalsend: 1 },
                }
              );
            });
          } else {
            await Stakingbonus({
              userId: reword.userId,
              rewordId: reword._id,
              Amount: 0,
              Note: "you staking plan period is completed. You have received your bonus as per the return.",
              Active: !false,
            }).save();
            await updateRecord(
              Stakingmodal,
              {
                userId: reword.userId,
              },
              {
                Active: !true,
              }
            );
          }
        }
      }
    }
  } catch (error) {
    console.log(error);
  }
});
schedule.scheduleJob(every24hours, async () => {
  try {
    const Userdata = await findAllRecord(Usermodal, {});
    for (const user of Userdata) {
      if (user?.Rank !== "DIRECT") {
        await Usermodal.aggregate([
          {
            $match: {
              username: user.username,
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
              stackingdata: 1,
              username: 1,
              Rank: 1,
              level: 1,
            },
          },
          {
            $unwind: {
              path: "$refers_to",
              preserveNullAndEmptyArrays: true,
            },
          },
        ]).then(async (res) => {
          if (res.length > 0) {
            if (res[0]?.Rank !== "DIRECT") {
              if (res[0]?.total) {
                for (const d of res[0]?.stackingdata) {
                  if (
                    new Date(d.createdAt) >=
                    new Date("2023-04-22T14:00:10.770Z")
                  ) {
                    if (d.Active === true) {
                      const Refflevalncome = await findOneRecord(Usermodal, {
                        _id: d.userId,
                      });
                      if (user?.mystack >= 50) {
                        let data = {
                          userId: user._id,
                          username: Refflevalncome?.username,
                          Note: "V4X COIN WILL BE CREDITED IN PASSIVE CLUB WALLET",
                          Amount:
                            (d.DailyReword * res[0]?.Rank === "EXECUTIVE"
                              ? 5
                              : res[0]?.Rank === "MANAGER"
                              ? 7
                              : res[0]?.Rank === "SENIOR MANAGER"
                              ? 10
                              : res[0]?.Rank === "BUSINESS HEAD"
                              ? 11
                              : res[0]?.Rank === "GOLD MANAGER"
                              ? 12
                              : res[0]?.Rank === "GOLD MANAGER"
                              ? 13
                              : res[0]?.Rank === "CROWN 1"
                              ? 14
                              : res[0]?.Rank === "CROWN 2"
                              ? 15
                              : res[0]?.Rank === "CROWN 3"
                              ? 16
                              : 18) / 100,
                        };
                        await updateRecord(
                          Walletmodal,
                          {
                            userId: user._id,
                          },
                          {
                            $inc: {
                              mainWallet:
                                (d.DailyReword * res[0]?.Rank === "EXECUTIVE"
                                  ? 5
                                  : res[0]?.Rank === "MANAGER"
                                  ? 7
                                  : res[0]?.Rank === "SENIOR MANAGER"
                                  ? 10
                                  : res[0]?.Rank === "BUSINESS HEAD"
                                  ? 11
                                  : res[0]?.Rank === "GOLD MANAGER"
                                  ? 12
                                  : res[0]?.Rank === "GOLD MANAGER"
                                  ? 13
                                  : res[0]?.Rank === "CROWN 1"
                                  ? 14
                                  : res[0]?.Rank === "CROWN 2"
                                  ? 15
                                  : res[0]?.Rank === "CROWN 3"
                                  ? 16
                                  : 18) / 100,
                            },
                          }
                        ).then(async (res) => {
                          await Mainwallatesc({
                            userId: user._id,
                            Note: `V4X COIN WILL BE CREDITED IN PASSIVE CLUB WALLET ${Refflevalncome?.username}`,
                            Amount:
                              (d.DailyReword * res[0]?.Rank === "EXECUTIVE"
                                ? 5
                                : res[0]?.Rank === "MANAGER"
                                ? 7
                                : res[0]?.Rank === "SENIOR MANAGER"
                                ? 10
                                : res[0]?.Rank === "BUSINESS HEAD"
                                ? 11
                                : res[0]?.Rank === "GOLD MANAGER"
                                ? 12
                                : res[0]?.Rank === "GOLD MANAGER"
                                ? 13
                                : res[0]?.Rank === "CROWN 1"
                                ? 14
                                : res[0]?.Rank === "CROWN 2"
                                ? 15
                                : res[0]?.Rank === "CROWN 3"
                                ? 16
                                : 18) / 100,
                            type: 1,
                            balace: res?.mainWallet,
                            Active: true,
                          }).save();
                        });
                        await Passive(data).save();
                      }
                    }
                  }
                }
              }
            }
          }
        });
      }
    }
  } catch (error) {
    console.log(error);
  }
});
schedule.scheduleJob("0 */4 * * *", async () => {
  try {
    const Userdata = await findAllRecord(Usermodal, {});
    for (const user of Userdata) {
      await Usermodal.aggregate([
        {
          $match: {
            username: user.username,
          },
        },
      ]).then(async (res) => {
        if (res.length > 0) {
          if (res[0]?.Rank == "DIRECT") {
            const Refflevalncome = await findAllRecord(Usermodal, {
              refferalBy: res[0].username,
              Rank: "DIRECT",
              createdAt: { $gt: new Date("2023-04-22T14:00:10.770Z") },
            });
            if (Refflevalncome.length >= 4) {
              console.log(res[0]);
              await updateRecord(
                Usermodal,
                {
                  _id: res[0]._id,
                  Rank: "DIRECT",
                  teamtotalstack: { $gt: 2499 },
                },
                { Rank: "EXECUTIVE" }
              );
              const da = await findAllRecord(Usermodal, {
                _id: res[0]._id,
                Rank: "EXECUTIVE",
                teamtotalstack: { $gt: 2499 },
              });
              if (da.length > 0) {
                console.log("res[0]", res[0]);
                let data = {
                  userId: res[0]._id,
                  Note: "50 BUSD = V4X COIN WILL BE CREDITED IN ACHEIVER WALLET",
                  Amount: 50,
                };
                await updateRecord(
                  Walletmodal,
                  {
                    userId: res[0]._id,
                  },
                  {
                    $inc: {
                      mainWallet: 50,
                    },
                  }
                ).then(async (res) => {
                  await Mainwallatesc({
                    userId: res.userId,
                    Note: "50 BUSD = V4X COIN WILL BE CREDITED IN ACHEIVER WALLET",
                    Amount: 50,
                    type: 1,
                    balace: res?.mainWallet,
                    Active: true,
                  }).save();
                  await Achivement(data).save();
                });
              }
            }
          } else if (res[0]?.Rank == "EXECUTIVE") {
            const Refflevalncome1 = await findAllRecord(Usermodal, {
              refferalBy: res[0].username,
              Rank: "EXECUTIVE",
              teamtotalstack: { $gt: 9999 },
              createdAt: { $gt: new Date("2023-04-22T14:00:10.770Z") },
            });
            if (Refflevalncome1.length >= 2) {
              await updateRecord(
                Usermodal,
                {
                  _id: res[0]._id,
                  Rank: "EXECUTIVE",
                  teamtotalstack: { $gt: 9999 },
                },
                { Rank: "MANAGER" }
              );
              const da = await findAllRecord(Usermodal, {
                _id: res[0]._id,
                Rank: "MANAGER",
                teamtotalstack: { $gt: 9999 },
              });
              if (da.length > 0) {
                let data = {
                  userId: res[0]._id,
                  Note: "100 BUSD = V4X COIN WILL BE CREDITED IN ACHEIVER WALLET",
                  Amount: 100,
                };
                await updateRecord(
                  Walletmodal,
                  {
                    userId: res[0]._id,
                  },
                  {
                    $inc: {
                      mainWallet: 100,
                    },
                  }
                ).then(async (res) => {
                  await Mainwallatesc({
                    userId: res.userId,
                    Note: "100 BUSD = V4X COIN WILL BE CREDITED IN ACHEIVER WALLET",
                    Amount: 100,
                    type: 1,
                    balace: res?.mainWallet,
                    Active: true,
                  }).save();
                });
                await Achivement(data).save();
              }
            }
          } else if (res[0]?.Rank == "MANAGER") {
            const Refflevalncome2 = await findAllRecord(Usermodal, {
              refferalBy: res[0].username,
              Rank: "MANAGER",
              teamtotalstack: { $gt: 39999 },
              createdAt: { $gt: new Date("2023-04-22T14:00:10.770Z") },
            });
            if (Refflevalncome2.length >= 2) {
              await updateRecord(
                Usermodal,
                {
                  _id: res[0]._id,
                  Rank: "MANAGER",
                  teamtotalstack: { $gt: 39999 },
                },
                { Rank: "SENIOR MANAGER" }
              );
              const da = await findAllRecord(Usermodal, {
                _id: res[0]._id,
                Rank: "SENIOR MANAGER",
                teamtotalstack: { $gt: 39999 },
              });
              if (da.length > 0) {
                let data = {
                  userId: res[0]._id,
                  Note: "250 BUSD = V4X COIN WILL BE CREDITED IN ACHEIVER WALLET",
                  Amount: 250,
                };
                await updateRecord(
                  Walletmodal,
                  {
                    userId: res[0]._id,
                  },
                  {
                    $inc: {
                      mainWallet: 250,
                    },
                  }
                ).then(async (res) => {
                  await Mainwallatesc({
                    userId: res.userId,
                    Note: "250 BUSD = V4X COIN WILL BE CREDITED IN ACHEIVER WALLET",
                    Amount: 250,
                    type: 1,
                    balace: res?.mainWallet,
                    Active: true,
                  }).save();
                });
                await Achivement(data).save();
              }
            }
          } else if (res[0]?.Rank == "SENIOR MANAGER") {
            const Refflevalncome3 = await findAllRecord(Usermodal, {
              refferalBy: res[0].username,
              Rank: "SENIOR MANAGER",
              teamtotalstack: { $gt: 159999 },
              createdAt: { $gt: new Date("2023-04-22T14:00:10.770Z") },
            });
            if (Refflevalncome3.length >= 2) {
              await updateRecord(
                Usermodal,
                {
                  _id: res[0]._id,
                  Rank: "SENIOR MANAGER",
                  teamtotalstack: { $gt: 159999 },
                },
                { Rank: "BUSINESS HEAD" }
              );

              const da = await findAllRecord(Usermodal, {
                _id: res[0]._id,
                Rank: "BUSINESS HEAD",
                teamtotalstack: { $gt: 159999 },
              });

              if (da.length > 0) {
                let data = {
                  userId: res[0]._id,
                  Note: "500 BUSD = V4X COIN WILL BE CREDITED IN ACHEIVER WALLET",
                  Amount: 500,
                };
                await updateRecord(
                  Walletmodal,
                  {
                    userId: res[0]._id,
                  },
                  {
                    $inc: {
                      mainWallet: 500,
                    },
                  }
                ).then(async (res) => {
                  await Mainwallatesc({
                    userId: res.userId,
                    Note: "500 BUSD = V4X COIN WILL BE CREDITED IN ACHEIVER WALLET",
                    Amount: 250,
                    type: 1,
                    balace: res?.mainWallet,
                    Active: true,
                  }).save();
                });
                await Achivement(data).save();
              }
            }
          } else if (res[0]?.Rank == "BUSINESS HEAD") {
            const Refflevalncome4 = await findAllRecord(Usermodal, {
              refferalBy: res[0].username,
              Rank: "BUSINESS HEAD",
              teamtotalstack: { $gt: 499999 },
              createdAt: { $gt: new Date("2023-04-22T14:00:10.770Z") },
            });
            if (Refflevalncome4.length >= 2) {
              await updateRecord(
                Usermodal,
                {
                  _id: res[0]._id,
                  Rank: "BUSINESS HEAD",
                  teamtotalstack: { $gt: 499999 },
                },
                { Rank: "GOLD MANAGER" }
              );
              const da = await findAllRecord(Usermodal, {
                _id: res[0]._id,
                Rank: "GOLD MANAGER",
                teamtotalstack: { $gt: 499999 },
              });

              if (da.length > 0) {
                let data = {
                  userId: res[0]._id,
                  Note: "1,500 BUSD = V4X COIN WILL BE CREDITED IN ACHEIVER WALLET",
                  Amount: 1500,
                };
                await updateRecord(
                  Walletmodal,
                  {
                    userId: res[0]._id,
                  },
                  {
                    $inc: {
                      mainWallet: 1500,
                    },
                  }
                ).then(async (res) => {
                  await Mainwallatesc({
                    userId: res.userId,
                    Note: "1500 BUSD = V4X COIN WILL BE CREDITED IN ACHEIVER WALLET",
                    Amount: 1500,
                    type: 1,
                    balace: res?.mainWallet,
                    Active: true,
                  }).save();
                });
                await Achivement(data).save();
              }
            }
          } else if (res[0]?.Rank == "GOLD MANAGER") {
            const Refflevalncome5 = await findAllRecord(Usermodal, {
              refferalBy: res[0].username,
              Rank: "GOLD MANAGER",
              teamtotalstack: { $gt: 999999 },
              createdAt: { $gt: new Date("2023-04-22T14:00:10.770Z") },
            });
            if (Refflevalncome5.length >= 2) {
              await updateRecord(
                Usermodal,
                {
                  _id: res[0]._id,
                  Rank: "GOLD MANAGER",
                  teamtotalstack: { $gt: 999999 },
                },
                { Rank: "DIAMOND MANAGER" }
              );

              const da = await findAllRecord(Usermodal, {
                _id: res[0]._id,
                Rank: "DIAMOND MANAGER",
                teamtotalstack: { $gt: 999999 },
              });
              if (da.length > 0) {
                await updateRecord(
                  Walletmodal,
                  {
                    userId: res[0]._id,
                  },
                  { $inc: { mainWallet: 5000 } }
                ).then(async (res) => {
                  await Mainwallatesc({
                    userId: res.userId,
                    Note: "5000 BUSD = V4X COIN WILL BE CREDITED IN ACHEIVER WALLET",
                    Amount: 5000,
                    type: 1,
                    balace: res?.mainWallet,
                    Active: true,
                  }).save();
                });
                let data = {
                  userId: res._id,
                  Note: "5,000 BUSD = V4X COIN WILL BE CREDITED IN ACHEIVER WALLET",
                  Amount: 5000,
                };
                await Achivement(data).save();
              }
            }
          } else if (res[0]?.Rank == "DIAMOND MANAGER") {
            const Refflevalncome6 = await findAllRecord(Usermodal, {
              refferalBy: res[0].username,
              Rank: "DIAMOND MANAGER",
              teamtotalstack: { $gt: 2999999 },
              createdAt: { $gt: new Date("2023-04-22T14:00:10.770Z") },
            });
            if (Refflevalncome6.length >= 2) {
              await updateRecord(
                Usermodal,
                {
                  _id: res[0]._id,
                  Rank: "DIAMOND MANAGER",
                  teamtotalstack: { $gt: 2999999 },
                },
                { Rank: "CROWN 1" }
              );
              const da = await findAllRecord(Usermodal, {
                _id: res[0]._id,
                Rank: "CROWN 1",
                teamtotalstack: { $gt: 2999999 },
              });
              if (da.length > 0) {
                await updateRecord(
                  Walletmodal,
                  {
                    userId: res[0]?._id,
                  },
                  { $inc: { mainWallet: 15000 } }
                ).then(async (res) => {
                  await Mainwallatesc({
                    userId: res.userId,
                    Note: "15000 BUSD = V4X COIN WILL BE CREDITED IN ACHEIVER WALLET",
                    Amount: 15000,
                    type: 1,
                    balace: res?.mainWallet,
                    Active: true,
                  }).save();
                });
                let data = {
                  userId: res[0]._id,
                  Note: "15,000 BUSD = V4X COIN WILL BE CREDITED IN ACHEIVER WALLET",
                  Amount: 15000,
                };
                await Achivement(data).save();
              }
            }
          } else if (res[0]?.Rank == "CROWN 1") {
            const Refflevalncome7 = await findAllRecord(Usermodal, {
              refferalBy: user.username,
              Rank: "CROWN 1",
              teamtotalstack: { $gt: 2999999 },
              createdAt: { $gt: new Date("2023-04-22T14:00:10.770Z") },
            });
            if (Refflevalncome7.length >= 2) {
              await updateRecord(
                Usermodal,
                {
                  _id: res[0]._id,
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
                  userId: res[0]._id,
                  Note: "75,000 BUSD = BMW CAR",
                  Amount: 75000,
                };
                // await updateRecord(
                //   Walletmodal,
                //   {
                //     userId: ReffData?._id,
                //   },
                //   { $inc: { mainWallet: 75000 } }
                // );
                await updateRecord(
                  Walletmodal,
                  {
                    userId: res[0]._id,
                  },
                  { $inc: { mainWallet: 75000 } }
                ).then(async (res) => {
                  await Mainwallatesc({
                    userId: res.userId,
                    Note: "75000 BUSD = V4X COIN WILL BE CREDITED IN ACHEIVER WALLET",
                    Amount: 75000,
                    type: 1,
                    balace: res?.mainWallet,
                    Active: true,
                  }).save();
                });
                await Achivement(data).save();
              }
            }
          } else if (res[0]?.Rank == "CROWN 2") {
            const Refflevalncome8 = await findAllRecord(Usermodal, {
              refferalBy: res[0].username,
              Rank: "CROWN 2",
              teamtotalstack: { $gt: 9999999 },
              createdAt: { $gt: new Date("2023-04-22T14:00:10.770Z") },
            });
            if (Refflevalncome8.length >= 2) {
              await updateRecord(
                Usermodal,
                {
                  userId: res._id,
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
                  userId: res._id,
                  Note: "1,50,000 BUSD = SECOND HOME IN UAE / INDIA/ MALASIYA",
                  Amount: 150000,
                };
                await Achivement(data).save();
              }
            }
          } else if (res[0]?.Rank == "CROWN 3") {
            const Refflevalncome9 = await findAllRecord(Usermodal, {
              refferalBy: res[0].username,
              Rank: "CROWN 3",
              teamtotalstack: { $gt: 14999999 },
              createdAt: { $gt: new Date("2023-04-22T14:00:10.770Z") },
            });
            if (Refflevalncome9.length >= 2) {
              await updateRecord(
                Usermodal,
                {
                  _id: res[0]._id,
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
                  userId: res.userId,
                  Note: "5,00,000 BUSD = BENTLEY CAR",
                  Amount: 500000,
                };
                await Achivement(data).save();
              }
            }
          }
        }
      });
    }
  } catch (error) {
    console.log(error);
  }
});
schedule.scheduleJob(every24hours, async () => {
  try {
    const Userdata = await findAllRecord(Usermodal, {});
    for (const user of Userdata) {
      if (user.isValid !== true) {
        await Usermodal.findByIdAndDelete({ _id: user._id });
      }
    }
  } catch (error) {
    console.log(error);
  }
});
app.post("/mail", (req, res) => {
  const DOMAIN = "donotreply.v4x.org";
  const mg = Mailgun({
    apiKey: "afd2a109fddce998ef411c7ac33c3e0c-81bd92f8-5473abd7",
    domain: DOMAIN,
  });
  const data = {
    from: "verify@ablcexchange.io",
    to: "anshusharma6327@gmail.com",
    subject: "Hello from anshu sahrma ",
    text: "Testing asdasd asd.  some Mailgun awesomness!",
  };
  mg.messages().send(data, function (error, body) {
    console.log(body);
    console.log(error);
    if (!error) {
      res.status(200).send({ message: "Mail send" });
    }
  });
});
app.get("/", async (req, res) => {
  // let id = "643452844a58667086970d29";
  await updateRecord(
    Stakingmodal,
    { userId: "64440bb8b53164f35dca4596" },
    {
      TotaldaysTosendReword: 730 - 6,
      Totalsend: 6,
    }
  );
  await updateRecord(
    Walletmodal,
    {
      userId: "64353e6ec27f7f626362cc26",
    },
    {
      mainWallet: 1.36986301369863,
    }
  );
  // }
  // await Stakingmodal.findByIdAndDelete({_id:''})
  // const Userdata = await findAllRecord(Usermodal, {});
  // for (const user of Userdata) {
  // const Userdata1 = await Stakingmodal.find({
  //   userId: id,
  // }).then(async (res) => {
  //   if (res) {
  //     console.log(res);
  //     for (const reword of res) {
  //       const Userdata1 = await Stakingmodal.find({
  //         rewordId: reword.id,
  //       });
  //       console.log("res=====>>", Userdata1);
  //     }
  //   }
  // if (res.length > 1) {
  //
  // });
  // }
  // await updateRecord(
  //   Walletmodal,
  //   {
  //     userId: id,
  //   },
  //   {
  //     mainWallet:
  //       Userdata1[Userdata1.length - 1].Amount +
  //       Userdata1[Userdata1.length - 1].balace,
  //   }
  // );
  res.send({
    status: "working",
  });
});
app.post("/payment", async (req, res) => {
  try {
    const to_address = req.body.to_address;

    var token_amount = req.body.token_amount;

    var wallet_type = req.body.wallet_type;

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

    if (wallet_type == 1) {
      //...send BUSD.....//

      const res1 = await init0(to_address, token_amount);

      var results = res1[0]
        ? success("Transaction success", res1)
        : failed("Transaction failed", res1);

      res.send(results);
    } else {
      //...send ABLC.....//
      const res1 = await init1(to_address, parseInt(token_amount));

      var results = res1[0]
        ? success("Transaction success", res1)
        : failed("Transaction failed", res1);

      res.send(results);
    }
  } catch (error) {
    return errorResponse(error, res);
  }
});

// app.get("/", async (req, res) => {
//   // let id = "643452844a58667086970d29";
//   await updateRecord(
//     Stakingmodal,
//     { _id: "64355bf1c27f7f626362d05b" },
//     {
//       TotaldaysTosendReword: 730 - 15,
//       Totalsend: 15,
//     }
//   );
// await Stakingmodal.findByIdAndDelete({_id:''})
// const Userdata = await findAllRecord(Usermodal, {});
// for (const user of Userdata) {
// const Userdata1 = await Stakingmodal.find({
//   userId: id,
// }).then(async (res) => {
//   if (res) {
//     console.log(res);
//     for (const reword of res) {
//       const Userdata1 = await Stakingmodal.find({
//         rewordId: reword.id,
//       });
//       console.log("res=====>>", Userdata1);
//     }
//   }
// if (res.length > 1) {
//   await updateRecord(
//     Walletmodal,
//     {
//       userId: user._id,
//     },
//     {
//       mainWallet: res[res.length - 1].Amount + res[res.length - 1].balace,
//     }
//   );
// }
// });
// }
// await updateRecord(
//   Walletmodal,
//   {
//     userId: id,
//   },
//   {
//     mainWallet:
//       Userdata1[Userdata1.length - 1].Amount +
//       Userdata1[Userdata1.length - 1].balace,
//   }
// );
//   res.send({
//     status2: "done",
//   });
// });
function isFloat(n) {
  return Number(n) == n && n % 1 !== 0;
}
const LOCALPORT = process.env.PORT || 8080;

app.listen(LOCALPORT, () => {
  console.log(`http://localhost:${LOCALPORT} is listening...`);
});
