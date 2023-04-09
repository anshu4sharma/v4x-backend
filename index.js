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
const Stakingbonus = require("./models/Stakingbonus");
const V4Xpricemodal = require("./models/V4XLiveRate");
const Passive = require("./models/Passive");

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

app.use("/api", routes);
app.use("/swagger", swaggerUi.serve, swaggerUi.setup(swaggerJson));

const LOCALPORT = process.env.PORT || 8080;

app.listen(LOCALPORT, () => {
  console.log(`http://localhost:${LOCALPORT} is listening...`);
});

// const every24hours = "*/1 * * * * ";
const every24hours = "0 58 23 * * *";
schedule.scheduleJob(every24hours, async () => {
  const Userdata = await findAllRecord(Usermodal, {});
  for (const user of Userdata) {
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
        await Stakingbonus({
          userId: reword.userId,
          rewordId: reword._id,
          Amount: reword.DailyReword / price[0].price,
          V4xTokenPrice: price[0].price,
          Note: "You Got Staking Bonus Income.",
          Active: false,
        }).save();
        await Mainwallatesc({
          userId: reword.userId,
          Note: "You Got Staking Bonus Income.",
          Amount: reword.DailyReword / price[0].price,
          type: 1,
          Active: true,
        }).save();
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
        await updateRecord(
          Walletmodal,
          {
            userId: reword.userId,
          },
          { $inc: { mainWallet: reword.DailyReword / price[0].price } }
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
    });
  }
});
