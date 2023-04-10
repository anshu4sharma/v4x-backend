var bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
var ejs = require("ejs");
const jwt = require("jsonwebtoken");
const {
  decodeUris,
  cloneDeep,
  findOneRecord,
  updateRecord,
  hardDeleteRecord,
  updateRecordValue,
} = require("../library/commonQueries");
const {
  successResponse,
  badRequestResponse,
  errorResponse,
  notFoundResponse,
  validarionerrorResponse,
} = require("../middleware/response");
const Usermodal = require("../models/user");
const Walletmodal = require("../models/Wallet");
const Token = require("../models/Token");
const {
  token,
  tokenverify,
  Forgetpasswordtoken,
} = require("../middleware/token");
const Ticket = require("../models/Ticket");

const { ticketsend } = require("../services/sendOTP");
const e = require("express");
let transport = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

exports.register = {
  signUp: async (req, res) => {
    try {
      let uniqueRefid = await Date.now().toString(16).slice(2);
      req.body.refferalId = uniqueRefid;
      req.body = decodeUris(req.body);
      console.log(req.body);
      const refferalBygetdata = await findOneRecord(Usermodal, {
        username: req.body.refferalBy,
      });
      const walletaddress = await findOneRecord(Usermodal, {
        walletaddress: req.body.walletaddress,
      });
      if (walletaddress === null) {
        if (refferalBygetdata !== null) {
          const userdata = await findOneRecord(Usermodal, {
            email: req.body.email,
            isActive: !false,
            isValid: !false,
          });
          if (userdata !== null) {
            return badRequestResponse(res, {
              message: "user is already exist.",
            });
          } else {
            await bcrypt.hash(req.body.password, 8).then(async (pass) => {
              await updateRecord(
                Usermodal,
                {
                  email: req.body.email,
                  isActive: !false,
                  isValid: false,
                },
                {
                  walletaddress: req.body.walletaddress,
                  password: pass,
                }
              );
            });
            const data = await findOneRecord(Usermodal, {
              email: req.body.email,
              isActive: !false,
              isValid: false,
            });
            if (data !== null) {
              const profile = await Usermodal.findById(data._id).select({
                password: 0,
              });
              const accessToken = jwt.sign({ profile }, "3700 0000 0000 002", {
                expiresIn: "1hr",
              });
              ejs.renderFile(
                __dirname + "/mail.ejs",
                {
                  name: "v4xverifyuser@gmail.com",
                  action_url: `https://api.v4x.org/api/registration/signUp/varify:${accessToken}`,
                },
                async function (err, mail) {
                  const mailOptions = {
                    from: "noreply.photometaclub@gmail.com", // Sender address
                    to: data["email"], // List of recipients
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
                        message:
                          "Verification link has been send to your email address..!!",
                      });
                    }
                  });
                }
              );
            } else {
              let allUser = await Usermodal.find({});
              let usernumber = 10019 + allUser.length;
              let finalusename = "V4X" + usernumber;
              console.log("usernumber", finalusename);
              const isCreated = await Usermodal({
                ...req.body,
                username: finalusename,
              }).save();
              if (!isCreated) {
                return badRequestResponse(res, {
                  message: "Failed to create register!",
                });
              } else {
                const profile = await Usermodal.findById(isCreated._id).select({
                  password: 0,
                });
                const accessToken = jwt.sign(
                  { profile },
                  "3700 0000 0000 002",
                  {
                    expiresIn: "1hr",
                  }
                );
                ejs.renderFile(
                  __dirname + "/mail.ejs",
                  {
                    name: "v4xverifyuser@gmail.com",
                    action_url: `https://api.v4x.org/api/registration/signUp/varify:${accessToken}`,
                  },
                  async function (err, data) {
                    const mailOptions = {
                      name: "v4xverifyuser@gmail.com",
                      to: isCreated["email"], // List of recipients
                      subject: "Node Mailer", // Subject line
                      html: data,
                    };
                    transport.sendMail(mailOptions, async function (err, info) {
                      if (err) {
                        badRequestResponse(res, {
                          message: `Email not send error something is wrong ${err}`,
                        });
                      } else {
                        successResponse(res, {
                          message:
                            "Verification link has been send to your email address..!!",
                          token: accessToken.token,
                        });
                      }
                    });
                  }
                );
              }
            }
          }
        } else {
          validarionerrorResponse(res, {
            message: `please enter valid  RefferalId.`,
          });
        }
      } else {
        validarionerrorResponse(res, {
          message: `please enter valid  walletaddress.`,
        });
      }
    } catch (error) {
      return errorResponse(error, res);
    }
  },
  mailVarify: async (req, res) => {
    try {
      const { Token } = req.params;
      if (Token) {
        let { err, decoded } = await tokenverify(Token.split(":")[1]);
        if (err) {
          notFoundResponse(res, {
            message: "user not found",
          });
        }
        if (decoded) {
          decoded = await cloneDeep(decoded);
          updateRecord(Usermodal, { email: decoded.profile.email });

          ejs.renderFile(
            __dirname + "/welcome.ejs",
            {
              name: "v4xverifyuser@gmail.com",
            },
            async function (err, data) {
              const mailOptions = {
                from: "prashantvadhavana.vision@gmail.com", // Sender address
                to: decoded.profile.email, // List of recipients
                subject: "Node Mailer", // Subject line
                html: data,
              };
              transport.sendMail(mailOptions, async function (err, info) {
                if (err) {
                  badRequestResponse(res, {
                    message: `Email not send error something is wrong ${err}`,
                  });
                } else {
                  res.redirect("https://v4x.org/");
                }
              });
            }
          );
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
  signIn: async (req, res) => {
    try {
      req.body = decodeUris(req.body);
      const user = await findOneRecord(Usermodal, { email: req.body.email });
      if (!user) {
        notFoundResponse(res, { message: "User Not Found!" });
      } else {
        const match = await bcrypt.compare(req.body.password, user.password);
        if (
          !match &&
          user.password.toString() !== req.body.password.toString()
        ) {
          badRequestResponse(res, { message: "Password is incorrect!" });
        } else {
          if (!user.isActive) {
            badRequestResponse(res, {
              message: "Account is disabled. please contact support!",
            });
          } else {
            if (!user.isValid) {
              badRequestResponse(res, {
                message: "please verify your account",
              });
            } else {
              let allUser = await Usermodal.find({
                isValid: true,
              });
              const accessToken = await token(Usermodal, user);
              await Usermodal.aggregate([
                {
                  $match: {
                    email: req.body.email,
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
                  await updateRecord(
                    Usermodal,
                    { _id: e[0]._id },
                    { teamtotalstack: e[0].total, mystack: e[0].total1 }
                  );
                }
              });
              const Wallet = await findOneRecord(Walletmodal, {
                userId: user._id,
              });
              if (!Wallet) {
                await Walletmodal({ userId: user._id }).save();
              }
              successResponse(res, {
                message: "Login successfully",
                token: accessToken.token,
                profile: user,
              });
            }
          }
        }
      }
    } catch (error) {
      return errorResponse(error, res);
    }
  },
  forgotPassword: async (req, res) => {
    try {
      req.body = decodeUris(req.body);
      const user = await findOneRecord(Usermodal, { email: req.body.email });
      if (!user) {
        notFoundResponse(res, { message: "User Not Found!" });
      } else {
        decoded = await cloneDeep(user);
        const accessToken = await Forgetpasswordtoken(Usermodal, decoded);
        let token = await Token.findOne({ userId: decoded._id });
        if (!token) {
          token = await new Token({
            userId: decoded._id,
            token: accessToken.token,
          }).save();
        } else {
          await updateRecord(
            Token,
            {
              userId: decoded._id,
            },
            {
              token: accessToken.token,
            }
          );
        }
        ejs.renderFile(
          __dirname + "/Forgetpassword.ejs",
          {
            name: "v4xverifyuser@gmail.com",
            action_url: accessToken.token,
          },
          async function (err, data) {
            const mailOptions = {
              from: process.env.GMAIL_USER, // Sender address
              to: decoded["email"], // List of recipients
              subject: "Node Mailer", // Subject line
              html: data,
            };
            await transport.sendMail(mailOptions, function (err, info) {
              if (err) {
                return errorResponse(err, res);
              } else {
                return successResponse(res, {
                  message:
                    "Forgot Password link has been send to your email address..!!",
                });
              }
            });
          }
        );
      }
    } catch (error) {
      return errorResponse(error, res);
    }
  },
  changePassword: async (req, res) => {
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
          let token = await Token.findOne({ userId: decoded.profile._id });
          if (!token) {
            return badRequestResponse(res, {
              message: "token is expires.",
            });
          }
          const { password } = req.body;
          decoded = await cloneDeep(decoded);
          await hardDeleteRecord(Token, {
            userId: decoded.profile._id,
          });
          await bcrypt.hash(password, 8).then((pass) => {
            updateRecord(
              Usermodal,
              { _id: decoded.profile._id },
              {
                password: pass,
              }
            );
            hardDeleteRecord(Token, { _id: decoded.profile._id });
            return successResponse(res, {
              message: "password change successfully",
            });
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
  addTicket: async (req, res) => {
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
          const data = {
            userId: decoded.profile._id,
            description: req.body.description,
            img: req.body.img,
          };
          await Ticket(data)
            .save()
            .then(async (r) => {
              console.log(r._id.toString());
              await ticketsend(
                decoded.profile.email,
                decoded.profile.username,
                decoded.profile._id.toString()
              );
              return successResponse(res, {
                message: "Support Ticket generate successfully",
              });
            });
        }
      }
    } catch (error) {
      return badRequestResponse(res, {
        message: "something went wrong",
      });
    }
  },
};
