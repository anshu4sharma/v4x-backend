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
const { findAllRecord, updateRecord } = require("./library/commonQueries");
const Walletmodal = require("./models/Wallet");
const Stakingbonus = require("./models/Stakingbonus");

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

const every24hours = "0 59 23 * * *";
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
      let price = 10;
      if (reword.TotaldaysTosendReword !== 0) {
        await Stakingbonus({
          userId: reword.userId,
          rewordId: reword._id,
          Amount: reword.DailyReword / price,
          V4xTokenPrice: price,
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
              reword.TotalRewordRecived - reword.DailyReword / price,
            TotaldaysTosendReword: reword.TotaldaysTosendReword - 1,
            $inc: { Totalsend: 1 },
          }
        );
        await updateRecord(
          Walletmodal,
          {
            userId: reword.userId,
          },
          { $inc: { mainWallet: reword.DailyReword / price } }
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