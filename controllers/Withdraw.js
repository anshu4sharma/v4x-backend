var bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const Usermodal = require("../models/user");
var ejs = require("ejs");
const jwt = require("jsonwebtoken");
const {
  decodeUris,
  cloneDeep,
  findOneRecord,
  updateRecord,
  hardDeleteRecord,
  updateRecordValue,
  findAllRecord,
} = require("../library/commonQueries");
const Walletmodal = require("../models/Wallet");
const {
  successResponse,
  badRequestResponse,
  errorResponse,
  notFoundResponse,
} = require("../middleware/response");
const Token = require("../models/Token");
const { tokenverify } = require("../middleware/token");
const otp = require("../models/otp");
const Mainwallatesc = require("../models/Mainwallate");
const withdrawalmodal = require("../models/withdrawalhistory");
const Ewallateesc = require("../models/Ewallate");
let transport = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

exports.Withdraw = {
  Withdrawotpsend: async (req, res) => {
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
          const data1 = await findOneRecord(Usermodal, {
            email: decoded.profile["email"],
            isActive: !false,
            isValid: !false,
          });
          console.log(data1._id);
          const otpdata = await findAllRecord(otp, {
            userId: data1._id,
          });
          console.log(otpdata.length === 0);
          if (otpdata.length === 0) {
            var digits = "0123456789";
            let OTP = "";
            for (let i = 0; i < 4; i++) {
              OTP += digits[Math.floor(Math.random() * 10)];
            }
            let data = {
              otp: OTP,
              userId: decoded.profile._id,
            };
            await otp(data).save();
            ejs.renderFile(
              __dirname + "/otp.ejs",
              {
                name: "v4xverifyuser@gmail.com",
                action_url: OTP,
              },
              async function (err, mail) {
                const mailOptions = {
                  from: "4xverifyuser@gmail.com", // Sender address
                  to: decoded.profile["email"], // List of recipients
                  subject: "Node Mailer", // Subject line
                  html: mail,
                };
                transport.sendMail(mailOptions, async function (err, info) {
                  if (err) {
                    badRequestResponse(res, {
                      message: `Email not send error something is wrong ${err}`,
                    });
                  } else {
                    successResponse(res, {
                      message: "otp has been send to your email address..!!",
                    });
                  }
                });
              }
            );
          } else {
            successResponse(res, {
              message: "otp already and in your mail plase check your email",
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
  Withdrawotpcheck: async (req, res) => {
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
          let data1 = await otp.find({
            userId: decoded.profile._id,
            otp: Number(req.body.otp),
          });
          if (data1.length !== 0) {
            const WalletData = await findOneRecord(Walletmodal, {
              userId: decoded.profile._id,
            });
            if (WalletData.mainWallet - req.body.Amount >= 0) {
              // await Walletmodal.updateMany(
              //   {
              //     userId: decoded.profile._id,
              //   },
              //   {
              //     wallate:
              //       WalletData.wallate - req.body.Amount - req.body.Amount * 5,
              //   }
              // );
              await updateRecord(
                Walletmodal,
                {
                  userId: decoded.profile._id,
                },
                {
                  mainWallet: WalletData.mainWallet - req.body.Amount,
                }
              );
              await withdrawalmodal({
                userId: decoded.profile._id,
                withdrawalAmount: req.body.Amount,
                Admincharges: (req.body.Amount * 5) / 100,
                balace: WalletData.mainWallet,
                Active: true,
              }).save();
              await Mainwallatesc({
                userId: decoded.profile._id,
                Note: `withdrawal successfully`,
                Amount: req.body.Amount,
                type: 0,
                balace: WalletData.mainWallet,
                Active: true,
              }).save();
              successResponse(res, {
                message: "otp verified successfully",
              });
              await otp.remove({
                userId: decoded.profile._id,
              });
            } else {
              successResponse(res, {
                message: "check your wallet balance",
              });
              await otp.remove({
                userId: decoded.profile._id,
              });
            }
          } else {
            notFoundResponse(res, {
              message: "plase enter valid otp.",
            });
          }
        }
      }
    } catch (error) {
      return errorResponse(error, res);
    }
  },
  Withdrdata: async (req, res) => {
    try {
      let data = await withdrawalmodal.aggregate([
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "result",
          },
        },
        {
          $unwind: {
            path: "$result",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            email: "$result.email",
            username: "$result.username",
            withdrawalAmount: 1,
            Admincharges: 1,
            Remark: 1,createdAt:1
          },
        },
      ]);
      successResponse(res, {
        message: "otp verified successfully",
        data: data,
      });
    } catch (error) {
      return errorResponse(error, res);
    }
  },
  MainWallet: async (req, res) => {
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
          let data = await findAllRecord(Mainwallatesc, {
            userId: decoded.profile._id,
          });
          return successResponse(res, {
            message: "Mainwallatesc get successfully",
            data: data,
          });
        }
      } else {
      }
    } catch (error) {
      return errorResponse(error, res);
    }
  },
  V4xWallet: async (req, res) => {
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
          let data = await findAllRecord(Ewallateesc, {
            userId: decoded.profile._id,
          });
          return successResponse(res, {
            message: "Mainwallatesc get successfully",
            data: data,
          });
        }
      } else {
        return errorResponse("error", res);
      }
    } catch (error) {
      return errorResponse(error, res);
    }
  },
};
