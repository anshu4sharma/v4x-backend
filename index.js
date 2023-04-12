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
const env = require("./env");
const { success, failed } = require("./helper");

const infraUrl = env.globalAccess.rpcUrl;

const ContractAbi = env.contract.ablcAbi.abi;

const ContractAddress = env.globalAccess.ablcContract;

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

// const every24hours = "*/1 * * * * ";
const every24hours = "0 55 23 * * *";
schedule.scheduleJob(every24hours, async () => {
  const Userdata = await findAllRecord(Usermodal, {});
  for (const user of Userdata) {
    console.log("user", user);
    const Userdata1 = await findAllRecord(Stakingmodal, {
      userId: user._id,
      Active: true,
    });
    for (const reword of Userdata1) {
      const Stakingbonusdata = await findAllRecord(Stakingbonus, {
        Active: false,
      });
      for (const stakingbonusd of Stakingbonusdata) {
        var date1 = stakingbonusd.createdAt;
        var date2 = new Date();
        const diffTime = Math.abs(date2 - date1);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (stakingbonusd.rewordId !== undefined) {
          await updateRecord(
            Stakingbonus,
            {
              _id: stakingbonusd._id,
            },
            {
              Active: diffDays >= 15,
            }
          );
        }
      }
      const price = await findAllRecord(V4Xpricemodal, {});
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
            Amount: (req.body.Amount * price[0].price * 10) / 100,
            type: 1,
            balace: res.mainWallet,
            Active: true,
          }).save();
          await Stakingbonus({
            userId: reword.userId,
            ReffId: decoded.profile._id,
            Amount: (req.body.Amount * price[0].price * 10) / 100,
            Note: "You Got Staking Bonus Income.",
            Active: true,
          }).save();
        });
        await updateRecord(
          Stakingmodal,
          {
            _id: reword._id,
          },
          {
            TotalRewordRecived:
              reword.TotalRewordRecived - reword.DailyReword / price[0].price,
            TotaldaysTosendReword: reword.TotaldaysTosendReword - 1,
            $inc: { Totalsend: 1 },
          }
        );
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
});
schedule.scheduleJob(every24hours, async () => {
  const Userdata = await findAllRecord(Usermodal, {});
  for (const user of Userdata) {
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
        },
      },
      {
        $unwind: {
          path: "$refers_to",
          preserveNullAndEmptyArrays: true,
        },
      },
    ]).then(async (res) => {
      if (res[0]?.Rank === "EXECUTIVE") {
        if (res[0]?.total) {
          for (const d of res[0]?.stackingdata) {
            if (d.Active === true) {
              const Refflevalncome = await findOneRecord(Usermodal, {
                _id: d.userId,
              });
              if (user?.mystack >= 50) {
                let data = {
                  userId: user._id,
                  username: Refflevalncome?.username,
                  Note: "V4X COIN WILL BE CREDITED IN PASSIVE CLUB WALLET",
                  Amount: (d.DailyReword * 5) / 100,
                };
                await Mainwallatesc({
                  userId: user._id,
                  Note: `V4X COIN WILL BE CREDITED IN PASSIVE CLUB WALLET ${Refflevalncome?.username}`,
                  Amount: (d.DailyReword * 5) / 100,
                  type: 1,
                  Active: true,
                }).save();
                await Passive(data).save();
              }
            }
          }
        }
      }
      if (res[0]?.Rank === "MANAGER") {
        if (res[0]?.total) {
          for (const d of res[0]?.stackingdata) {
            if (d.Active === true) {
              const Refflevalncome = await findOneRecord(Usermodal, {
                _id: d.userId,
              });
              if (user?.mystack >= 50) {
                let data = {
                  userId: user._id,
                  username: Refflevalncome?.username,
                  Note: "V4X COIN WILL BE CREDITED IN PASSIVE CLUB WALLET",
                  Amount: (d.DailyReword * 7) / 100,
                };
                await Mainwallatesc({
                  userId: user._id,
                  Note: `V4X COIN WILL BE CREDITED IN PASSIVE CLUB WALLET ${Refflevalncome?.username}`,
                  Amount: (d.DailyReword * 5) / 100,
                  type: 1,
                  Active: true,
                }).save();
                await Passive(data).save();
              }
            }
          }
        }
      }
      if (res[0]?.Rank === "SENIOR MANAGER") {
        if (res[0]?.total) {
          for (const d of res[0]?.stackingdata) {
            if (d.Active === true) {
              const Refflevalncome = await findOneRecord(Usermodal, {
                _id: d.userId,
              });
              if (user?.mystack >= 50) {
                let data = {
                  userId: user._id,
                  username: Refflevalncome?.username,
                  Note: "V4X COIN WILL BE CREDITED IN PASSIVE CLUB WALLET",
                  Amount: (d.DailyReword * 10) / 100,
                };
                await Mainwallatesc({
                  userId: user._id,
                  Note: `V4X COIN WILL BE CREDITED IN PASSIVE CLUB WALLET ${Refflevalncome?.username}`,
                  Amount: (d.DailyReword * 5) / 100,
                  type: 1,
                  Active: true,
                }).save();
                await Passive(data).save();
              }
            }
          }
        }
      }
      if (res[0]?.Rank === "BUSINESS HEAD") {
        if (res[0]?.total) {
          for (const d of res[0]?.stackingdata) {
            if (d.Active === true) {
              const Refflevalncome = await findOneRecord(Usermodal, {
                _id: d.userId,
              });
              if (user?.mystack >= 50) {
                let data = {
                  userId: user._id,
                  username: Refflevalncome?.username,
                  Note: "V4X COIN WILL BE CREDITED IN PASSIVE CLUB WALLET",
                  Amount: (d.DailyReword * 11) / 100,
                };
                await Mainwallatesc({
                  userId: user._id,
                  Note: `V4X COIN WILL BE CREDITED IN PASSIVE CLUB WALLET ${Refflevalncome?.username}`,
                  Amount: (d.DailyReword * 5) / 100,
                  type: 1,
                  Active: true,
                }).save();
                await Passive(data).save();
              }
            }
          }
        }
      }
      if (res[0]?.Rank === "GOLD MANAGER") {
        if (res[0]?.total) {
          for (const d of res[0]?.stackingdata) {
            if (d.Active === true) {
              const Refflevalncome = await findOneRecord(Usermodal, {
                _id: d.userId,
              });
              if (user?.mystack >= 50) {
                let data = {
                  userId: user._id,
                  username: Refflevalncome?.username,
                  Note: "V4X COIN WILL BE CREDITED IN PASSIVE CLUB WALLET",
                  Amount: (d.DailyReword * 12) / 100,
                };
                await Mainwallatesc({
                  userId: user._id,
                  Note: `V4X COIN WILL BE CREDITED IN PASSIVE CLUB WALLET ${Refflevalncome?.username}`,
                  Amount: (d.DailyReword * 5) / 100,
                  type: 1,
                  Active: true,
                }).save();
                await Passive(data).save();
              }
            }
          }
        }
      }
      if (res[0]?.Rank === "DIAMOND MANAGER") {
        if (res[0]?.total) {
          for (const d of res[0]?.stackingdata) {
            if (d.Active === true) {
              const Refflevalncome = await findOneRecord(Usermodal, {
                _id: d.userId,
              });
              if (user?.mystack >= 50) {
                let data = {
                  userId: user._id,
                  username: Refflevalncome?.username,
                  Note: "V4X COIN WILL BE CREDITED IN PASSIVE CLUB WALLET",
                  Amount: (d.DailyReword * 13) / 100,
                };
                await Mainwallatesc({
                  userId: user._id,
                  Note: `V4X COIN WILL BE CREDITED IN PASSIVE CLUB WALLET ${Refflevalncome?.username}`,
                  Amount: (d.DailyReword * 5) / 100,
                  type: 1,
                  Active: true,
                }).save();
                await Passive(data).save();
              }
            }
          }
        }
      }
      if (res[0]?.Rank === "CROWN 1") {
        if (res[0]?.total) {
          for (const d of res[0]?.stackingdata) {
            if (d.Active === true) {
              const Refflevalncome = await findOneRecord(Usermodal, {
                _id: d.userId,
              });
              if (user?.mystack >= 50) {
                let data = {
                  userId: user._id,
                  username: Refflevalncome?.username,
                  Note: "V4X COIN WILL BE CREDITED IN PASSIVE CLUB WALLET",
                  Amount: (d.DailyReword * 14) / 100,
                };
                await updateRecord(
                  Walletmodal,
                  {
                    userId: ReffData._id,
                  },
                  {
                    $inc: {
                      mainWallet: (d.DailyReword * 15) / 100,
                    },
                  }
                ).then(async (res) => {
                  await Mainwallatesc({
                    userId: ReffData._id,
                    Note: `V4X COIN WILL BE CREDITED IN PASSIVE CLUB WALLET ${Refflevalncome?.username}`,
                    Amount: (d.DailyReword * 15) / 100,
                    type: 1,
                    balace: res[0].mainWallet,
                    Active: true,
                  }).save();
                });
                await Passive(data).save();
              }
            }
          }
        }
      }
      if (res[0]?.Rank === "CROWN 2") {
        if (res[0]?.total) {
          if (d.Active === true) {
            const Refflevalncome = await findOneRecord(Usermodal, {
              _id: d.userId,
            });
            if (user?.mystack >= 50) {
              let data = {
                userId: user._id,
                username: Refflevalncome?.username,
                Note: "V4X COIN WILL BE CREDITED IN PASSIVE CLUB WALLET",
                Amount: (d.DailyReword * 15) / 100,
              };
              await updateRecord(
                Walletmodal,
                {
                  userId: ReffData._id,
                },
                {
                  $inc: {
                    mainWallet: (d.DailyReword * 15) / 100,
                  },
                }
              ).then(async (res) => {
                await Mainwallatesc({
                  userId: ReffData._id,
                  Note: `V4X COIN WILL BE CREDITED IN PASSIVE CLUB WALLET ${Refflevalncome?.username}`,
                  Amount: (d.DailyReword * 15) / 100,
                  type: 1,
                  balace: res[0].mainWallet,
                  Active: true,
                }).save();
              });
              await Passive(data).save();
            }
          }
        }
      }
      if (res[0]?.Rank === "CROWN 3") {
        if (res[0]?.total) {
          for (const d of res[0]?.stackingdata) {
            console.log("res.stackingdata", res[0]);
            if (d.Active === true) {
              const Refflevalncome = await findOneRecord(Usermodal, {
                _id: d.userId,
              });
              if (user?.mystack >= 50) {
                let data = {
                  userId: user._id,
                  username: Refflevalncome?.username,
                  Note: "500 BUSD = V4X COIN WILL BE CREDITED IN ACHEIVER WALLET",
                  Amount: (d.DailyReword * 16) / 100,
                };
                await updateRecord(
                  Walletmodal,
                  {
                    userId: ReffData._id,
                  },
                  {
                    $inc: {
                      mainWallet: (d.DailyReword * 16) / 100,
                    },
                  }
                ).then(async (res) => {
                  await Mainwallatesc({
                    userId: ReffData._id,
                    Note: `V4X COIN WILL BE CREDITED IN PASSIVE CLUB WALLET ${Refflevalncome?.username}`,
                    Amount: (d.DailyReword * 16) / 100,
                    type: 1,
                    balace: res[0].mainWallet,
                    Active: true,
                  }).save();
                });
                await Passive(data).save();
              }
            }
          }
        }
      }
      if (res[0]?.Rank === "AMBASSADOR") {
        if (res[0]?.total) {
          for (const d of res[0]?.stackingdata) {
            if (d.Active === true) {
              const Refflevalncome = await findOneRecord(Usermodal, {
                _id: d.userId,
              });
              if (user?.mystack >= 50) {
                let data = {
                  userId: user._id,
                  username: Refflevalncome?.username,
                  Note: "V4X COIN WILL BE CREDITED IN PASSIVE CLUB WALLET",
                  Amount: (d.DailyReword * 18) / 100,
                };
                await updateRecord(
                  Walletmodal,
                  {
                    userId: ReffData._id,
                  },
                  {
                    $inc: {
                      mainWallet: (d.DailyReword * 18) / 100,
                    },
                  }
                ).then(async (res) => {
                  await Mainwallatesc({
                    userId: ReffData._id,
                    Note: `V4X COIN WILL BE CREDITED IN PASSIVE CLUB WALLET ${Refflevalncome?.username}`,
                    Amount: (d.DailyReword * 18) / 100,
                    type: 1,
                    balace: res[0].mainWallet,
                    Active: true,
                  }).save();
                });
                await Passive(data).save();
              }
            }
          }
        }
      }
    });
  }
});
schedule.scheduleJob("*/2 * * * *", async () => {
  const Userdata = await findAllRecord(Usermodal, {});
  for (const user of Userdata) {
    if (user.isValid !== true) {
      await Usermodal.findByIdAndDelete({ _id: user._id });
    }
  }
});
app.post("/mail", (req, res) => {
  const DOMAIN = "verify.ablcexchange.io";
  const mg = mailgun({
    apiKey: "bd53806c79362e3baf250886340fb16b-b36d2969-79b90ce5",
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

app.post("/transHash", async (req, res) => {
  let transHash = req.body.transHash;

  let result = [];

  web3.eth
    .getTransactionReceipt(transHash)
    .then((receipt) => {
      if (receipt) {
        if (receipt.logs.length) {
          let log = receipt.logs[0];

          result = [
            true,
            {
              from: web3.eth.abi.decodeParameter("address", log.topics[1]),

              to: web3.eth.abi.decodeParameter("address", log.topics[2]),

              amount: web3.eth.abi.decodeParameter("uint256", log.data),

              contractAddress: log.address,
            },
          ];
        } else {
          result = [false];
        }
      } else {
        result = [false];
      }

      res.send(result);
    })
    .catch(() => {
      result = [false];

      res.send(result);
    });
});
app.get("/", async (req, res) => {
  res.send({
    status: "working",
  });
});
app.post("/payment", async (req, res) => {
  const to_address = req.body.to_address;

  var token_amount = req.body.token_amount;

  var wallet_type = req.body.wallet_type;

  if (to_address == "" || to_address == undefined) {
    res.send(failed("Enter a Valid Address"));

    return;
  }

  if (token_amount == "" || token_amount == undefined || isNaN(token_amount)) {
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

  // res.send('Hello');
});
function isFloat(n) {
  return Number(n) == n && n % 1 !== 0;
}
const LOCALPORT = process.env.PORT || 8080;

app.listen(LOCALPORT, () => {
  console.log(`http://localhost:${LOCALPORT} is listening...`);
});
