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
const Achivement = require("./models/Achivement");
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

const every24hours = "*/10 * * * *";
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
// const every24hours1 = "0 58 23 * * *";
const every24hours1 = "*/10 * * * *";
schedule.scheduleJob(every24hours1, async () => {
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
        const ReffData = await findAllRecord(Usermodal, {
          refferalBy: res[0].username,
          Rank: "DIRECT",
        });
        if (ReffData.length >= 4) {
          let data = await updateRecord(
            Usermodal,
            {
              _id: user._id,
              Rank: "DIRECT",
              teamtotalstack: { $gt: 2499 },
            },
            { Rank: "EXECUTIVE" }
          );
          const da = await findAllRecord(Usermodal, {
            _id: user._id,
            Rank: "EXECUTIVE",
            teamtotalstack: { $gt: 2499 },
          });
          if (da.length > 0) {
            let data = {
              userId: user._id,
              Note: "50 BUSD = V4X COIN WILL BE CREDITED IN ACHEIVER WALLET",
              Amount: 50,
            };
            await updateRecord(
              Walletmodal,
              {
                userId: user._id,
              },
              { $inc: { mainWallet: 50 } }
            );
            await Achivement(data).save();
          }
        }
      } else if (res[0]?.Rank == "EXECUTIVE") {
        const ReffData1 = await findAllRecord(Usermodal, {
          refferalBy: user.username,
          Rank: "EXECUTIVE",
        });
        if (ReffData1.length >= 2) {
          await updateRecord(
            Usermodal,
            {
              _id: user._id,
              Rank: "EXECUTIVE",
              teamtotalstack: { $gt: 9999 },
            },
            { Rank: "MANAGER" }
          );
          const da = await findAllRecord(Usermodal, {
            _id: user._id,
            Rank: "MANAGER",
            teamtotalstack: { $gt: 9999 },
          });
          if (da.length > 0) {
            let data = {
              userId: user._id,
              Note: "100 BUSD = V4X COIN WILL BE CREDITED IN ACHEIVER WALLET",
              Amount: 100,
            };
            await updateRecord(
              Walletmodal,
              {
                userId: user._id,
              },
              { $inc: { mainWallet: 100 } }
            );
            await Achivement(data).save();
          }
        }
      } else if (res[0]?.Rank == "MANAGER") {
        const ReffData2 = await findAllRecord(Usermodal, {
          refferalBy: user.username,
          Rank: "MANAGER",
        });
        if (ReffData2.length >= 2) {
          await updateRecord(
            Usermodal,
            {
              _id: user._id,
              Rank: "MANAGER",
              teamtotalstack: { $gt: 39999 },
            },
            { Rank: "SENIOR MANAGER" }
          );
          const da = await findAllRecord(Usermodal, {
            _id: user._id,
            Rank: "SENIOR MANAGER",
            teamtotalstack: { $gt: 39999 },
          });
          if (da.length > 0) {
            let data = {
              userId: user._id,
              Note: "250 BUSD = V4X COIN WILL BE CREDITED IN ACHEIVER WALLET",
              Amount: 250,
            };
            await updateRecord(
              Walletmodal,
              {
                userId: user._id,
              },
              { $inc: { mainWallet: 250 } }
            );
            await Achivement(data).save();
          }
        }
      } else if (res[0]?.Rank == "SENIOR MANAGER") {
        const ReffData3 = await findAllRecord(Usermodal, {
          refferalBy: user.username,
          Rank: "SENIOR MANAGER",
        });
        if (ReffData3.length >= 2) {
          await updateRecord(
            Usermodal,
            {
              _id: user._id,
              Rank: "SENIOR MANAGER",
              teamtotalstack: { $gt: 159999 },
            },
            { Rank: "BUSINESS HEAD" }
          );

          const da = await findAllRecord(Usermodal, {
            _id: user._id,
            Rank: "BUSINESS HEAD",
            teamtotalstack: { $gt: 159999 },
          });

          if (da.length > 0) {
            await updateRecord(
              Walletmodal,
              {
                userId: user._id,
              },
              { $inc: { mainWallet: 500 } }
            );
            let data = {
              userId: user._id,
              Note: "500 BUSD = V4X COIN WILL BE CREDITED IN ACHEIVER WALLET",
              Amount: 500,
            };
            await updateRecord(
              Walletmodal,
              {
                userId: user._id,
              },
              { $inc: { mainWallet: 159999 } }
            );
            await Achivement(data).save();
          }
        }
      } else if (res[0]?.Rank == "BUSINESS HEAD") {
        const ReffData4 = await findAllRecord(Usermodal, {
          refferalBy: user.username,
          Rank: "BUSINESS HEAD",
          teamtotalstack: { $gt: 499999 },
        });
        if (ReffData4.length >= 2) {
          await updateRecord(
            Usermodal,
            {
              _id: user._id,
              Rank: "BUSINESS HEAD",
              teamtotalstack: { $gt: 499999 },
            },
            { Rank: "GOLD MANAGER" }
          );
          const da = await findAllRecord(Usermodal, {
            _id: user._id,
            Rank: "GOLD MANAGER",
            teamtotalstack: { $gt: 499999 },
          });

          if (da.length > 0) {
            await updateRecord(
              Walletmodal,
              {
                userId: user._id,
              },
              { $inc: { mainWallet: 1500 } }
            );
            let data = {
              userId: user._id,
              Note: "1,500 BUSD = V4X COIN WILL BE CREDITED IN ACHEIVER WALLET",
              Amount: 1500,
            };
            await Achivement(data).save();
          }
        }
      } else if (res[0]?.Rank == "GOLD MANAGER") {
        const ReffData5 = await findAllRecord(Usermodal, {
          refferalBy: user.username,
          Rank: "GOLD MANAGER",
        });
        if (ReffData5.length >= 2) {
          await updateRecord(
            Usermodal,
            {
              _id: user._id,
              Rank: "GOLD MANAGER",
              teamtotalstack: { $gt: 999999 },
            },
            { Rank: "DIAMOND MANAGER" }
          );

          const da = await findAllRecord(Usermodal, {
            _id: user._id,
            Rank: "DIAMOND MANAGER",
            teamtotalstack: { $gt: 999999 },
          });
          if (da.length > 0) {
            await updateRecord(
              Walletmodal,
              {
                userId: user._id,
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
        const ReffData6 = await findAllRecord(Usermodal, {
          refferalBy: user.username,
          Rank: "DIAMOND MANAGER",
        });
        if (ReffData6.length >= 2) {
          await updateRecord(
            Usermodal,
            {
              _id: user._id,
              Rank: "DIAMOND MANAGER",
              teamtotalstack: { $gt: 2999999 },
            },
            { Rank: "CROWN 1" }
          );
          const da = await findAllRecord(Usermodal, {
            _id: user._id,
            Rank: "CROWN 1",
            teamtotalstack: { $gt: 2999999 },
          });
          if (da.length > 0) {
            await updateRecord(
              Walletmodal,
              {
                userId: user._id,
              },
              { $inc: { mainWallet: 15000 } }
            );
            let data = {
              userId: user._id,
              Note: "15,000 BUSD = V4X COIN WILL BE CREDITED IN ACHEIVER WALLET",
              Amount: 15000,
            };
            await updateRecord(
              Walletmodal,
              {
                userId: user._id,
              },
              { $inc: { mainWallet: 15000 } }
            );
            await Achivement(data).save();
          }
        }
      } else if (res[0]?.Rank == "CROWN 1") {
        const ReffData7 = await findAllRecord(Usermodal, {
          refferalBy: user.username,
          Rank: "CROWN 1",
        });
        if (ReffData7.length >= 2) {
          await updateRecord(
            Usermodal,
            {
              _id: user._id,
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
              userId: user._id,
              Note: "75,000 BUSD = BMW CAR",
              Amount: 75000,
            };
            await updateRecord(
              Walletmodal,
              {
                userId: user._id,
              },
              { $inc: { mainWallet: 75000 } }
            );
            await Achivement(data).save();
          }
        }
      } else if (res[0]?.Rank == "CROWN 2") {
        const ReffData8 = await findAllRecord(Usermodal, {
          refferalBy: user.username,
          Rank: "CROWN 2",
        });
        if (ReffData8.length >= 2) {
          await updateRecord(
            Usermodal,
            {
              _id: user._id,
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
              userId: user._id,
              Note: "1,50,000 BUSD = SECOND HOME IN UAE / INDIA/ MALASIYA",
              Amount: 150000,
            };
            await Achivement(data).save();
          }
        }
      } else if (res[0]?.Rank == "CROWN 3") {
        const ReffData9 = await findAllRecord(Usermodal, {
          refferalBy: user.username,
          Rank: "CROWN 3",
        });
        if (ReffData9.length >= 2) {
          await updateRecord(
            Usermodal,
            {
              _id: user._id,
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
              userId: user._id,
              Note: "5,00,000 BUSD = BENTLEY CAR",
              Amount: 500000,
            };
            await Achivement(data).save();
          }
        }
      }
    });
  }
});
schedule.scheduleJob(every24hours1, async () => {
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
              const ReffData = await findOneRecord(Usermodal, {
                _id: d.userId,
              });
              let data = {
                userId: user._id,
                username: ReffData?.username,
                Note: "V4X COIN WILL BE CREDITED IN PASSIVE CLUB WALLET",
                Amount: (d.DailyReword * 5) / 100,
              };
              await Passive(data).save();
            }
          }
        }
      }
      if (res[0]?.Rank === "MANAGER") {
        if (res[0]?.total) {
          for (const d of res[0]?.stackingdata) {
            if (d.Active === true) {
              const ReffData = await findOneRecord(Usermodal, {
                _id: d.userId,
              });
              let data = {
                userId: user._id,
                username: ReffData?.username,
                Note: "V4X COIN WILL BE CREDITED IN PASSIVE CLUB WALLET",
                Amount: (d.DailyReword * 7) / 100,
              };
              await Passive(data).save();
            }
          }
        }
      }
      if (res[0]?.Rank === "SENIOR MANAGER") {
        if (res[0]?.total) {
          for (const d of res[0]?.stackingdata) {
            if (d.Active === true) {
              const ReffData = await findOneRecord(Usermodal, {
                _id: d.userId,
              });
              let data = {
                userId: user._id,
                username: ReffData?.username,
                Note: "V4X COIN WILL BE CREDITED IN PASSIVE CLUB WALLET",
                Amount: (d.DailyReword * 10) / 100,
              };
              await Passive(data).save();
            }
          }
        }
      }
      if (res[0]?.Rank === "BUSINESS HEAD") {
        if (res[0]?.total) {
          for (const d of res[0]?.stackingdata) {
            if (d.Active === true) {
              const ReffData = await findOneRecord(Usermodal, {
                _id: d.userId,
              });
              let data = {
                userId: user._id,
                username: ReffData?.username,
                Note: "V4X COIN WILL BE CREDITED IN PASSIVE CLUB WALLET",
                Amount: (d.DailyReword * 11) / 100,
              };
              await Passive(data).save();
            }
          }
        }
      }
      if (res[0]?.Rank === "GOLD MANAGER") {
        if (res[0]?.total) {
          for (const d of res[0]?.stackingdata) {
            if (d.Active === true) {
              const ReffData = await findOneRecord(Usermodal, {
                _id: d.userId,
              });
              let data = {
                userId: user._id,
                username: ReffData?.username,
                Note: "V4X COIN WILL BE CREDITED IN PASSIVE CLUB WALLET",
                Amount: (d.DailyReword * 12) / 100,
              };
              await Passive(data).save();
            }
          }
        }
      }
      if (res[0]?.Rank === "DIAMOND MANAGER") {
        if (res[0]?.total) {
          for (const d of res[0]?.stackingdata) {
            if (d.Active === true) {
              const ReffData = await findOneRecord(Usermodal, {
                _id: d.userId,
              });
              let data = {
                userId: user._id,
                username: ReffData?.username,
                Note: "V4X COIN WILL BE CREDITED IN PASSIVE CLUB WALLET",
                Amount: (d.DailyReword * 13) / 100,
              };
              await Passive(data).save();
            }
          }
        }
      }
      if (res[0]?.Rank === "CROWN 1") {
        if (res[0]?.total) {
          for (const d of res[0]?.stackingdata) {
            if (d.Active === true) {
              const ReffData = await findOneRecord(Usermodal, {
                _id: d.userId,
              });
              let data = {
                userId: user._id,
                username: ReffData?.username,
                Note: "V4X COIN WILL BE CREDITED IN PASSIVE CLUB WALLET",
                Amount: (d.DailyReword * 14) / 100,
              };
              await Passive(data).save();
            }
          }
        }
      }
      if (res[0]?.Rank === "CROWN 2") {
        if (res[0]?.total) {
          if (d.Active === true) {
            const ReffData = await findOneRecord(Usermodal, {
              _id: d.userId,
            });
            let data = {
              userId: user._id,
              username: ReffData?.username,
              Note: "V4X COIN WILL BE CREDITED IN PASSIVE CLUB WALLET",
              Amount: (d.DailyReword * 15) / 100,
            };
            await Passive(data).save();
          }
        }
      }
      if (res[0]?.Rank === "CROWN 3") {
        if (res[0]?.total) {
          for (const d of res[0]?.stackingdata) {
            console.log("res.stackingdata", res[0]);
            if (d.Active === true) {
              const ReffData = await findOneRecord(Usermodal, {
                _id: d.userId,
              });
              let data = {
                userId: user._id,
                username: ReffData?.username,
                Note: "500 BUSD = V4X COIN WILL BE CREDITED IN ACHEIVER WALLET",
                Amount: (d.DailyReword * 16) / 100,
              };
              await Passive(data).save();
            }
          }
        }
      }
      if (res[0]?.Rank === "AMBASSADOR") {
        if (res[0]?.total) {
          for (const d of res[0]?.stackingdata) {
            if (d.Active === true) {
              const ReffData = await findOneRecord(Usermodal, {
                _id: d.userId,
              });
              let data = {
                userId: user._id,
                username: ReffData?.username,
                Note: "V4X COIN WILL BE CREDITED IN PASSIVE CLUB WALLET",
                Amount: (d.DailyReword * 18) / 100,
              };
              await Passive(data).save();
            }
          }
        }
      }
    });
  }
});

// const every1hours = "*/3 * * * * *";
// schedule.scheduleJob(every1hours, async () => {
//   let a = await Usermodal.aggregate([
//     {
//       $match: {
//         username: "V4X10021",
//         isActive: true,
//       },
//     },
//     {
//       $graphLookup: {
//         from: "users",
//         startWith: "$refferalId",
//         connectFromField: "refferalId",
//         connectToField: "refferalBy",
//         as: "refers_to",
//       },
//     },
//     {
//       $lookup: {
//         from: "stakings",
//         localField: "refers_to._id",
//         foreignField: "userId",
//         as: "amount",
//       },
//     },
//     {
//       $lookup: {
//         from: "stakings",
//         localField: "refers_to._id",
//         foreignField: "userId",
//         as: "stackingdata",
//       },
//     },
//     {
//       $lookup: {
//         from: "stakings",
//         localField: "_id",
//         foreignField: "userId",
//         as: "stackingdata1",
//       },
//     },
//     {
//       $match: {
//         amount: {
//           $ne: [],
//         },
//         at: {
//           $ne: [],
//         },
//       },
//     },
//     {
//       $project: {
//         total: {
//           $reduce: {
//             input: "$amount",
//             initialValue: 0,
//             in: {
//               $add: ["$$value", "$$this.Amount"],
//             },
//           },
//         },
//         tatalDailyReword: {
//           $reduce: {
//             input: "$stackingdata1",
//             initialValue: 0,
//             in: {
//               $add: ["$$value", "$$this.DailyReword"],
//             },
//           },
//         },
//         mytotalstack: {
//           $reduce: {
//             input: "$amount",
//             initialValue: 0,
//             in: {
//               $add: ["$$value", "$$this.Amount"],
//             },
//           },
//         },
//         stackingdata: 1,
//         username: 1,
//         Rank: 1,
//         level: 1,
//         stackingdata1: 1,
//       },
//     },
//     {
//       $unwind: {
//         path: "$refers_to",
//         preserveNullAndEmptyArrays: true,
//       },
//     },
//   ]);
//   console.log(a);
// });
