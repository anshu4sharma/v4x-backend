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
const Mailgun = require("mailgun-js");
let transport = nodemailer.createTransport({
  port: 587,
  host: "smtp.mailgun.org",
  secure: true,
  auth: {
    user: process.env.MAIL_ID,
    pass: process.env.MAIL_PASSWORD,
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
                  const DOMAIN = "donotreply@v4x.org";
                  const mg = Mailgun({
                    apiKey:
                      "afd2a109fddce998ef411c7ac33c3e0c-81bd92f8-5473abd7",
                    domain: DOMAIN,
                  });
                  const data111 = {
                    from: "donotreply@v4x.org",
                    to: req.body.email,
                    subject: "main varification",
                    html: data,
                  };
                  mg.messages().send(data111, function (error, body) {
                    if (error) {
                      badRequestResponse(res, {
                        message: `Email not send error something is wrong ${err}`,
                      });
                    } else {
                      successResponse(res, {
                        message:
                          "varification link has been send to your email address..!!",
                      });
                    }
                  });
                }
              );
            } else {
              var digits = "0123456789";
              let OTP = "";
              for (let i = 0; i < 5; i++) {
                OTP += digits[Math.floor(Math.random() * 10)];
              }
              let usernumber = OTP;
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
                    const DOMAIN = "donotreply.v4x.org";
                    const mg = Mailgun({
                      apiKey:
                        "afd2a109fddce998ef411c7ac33c3e0c-81bd92f8-5473abd7",
                      domain: DOMAIN,
                    });
                    const mailOptions = {
                      from: "donotreply@v4x.org", // Sender address
                      to: req.body.email, // List of recipients
                      subject: "verification by v4x", // Subject line
                      html: data,
                    };
                    mg.messages().send(mailOptions, async function (err, info) {
                      if (err) {
                        return badRequestResponse(res, {
                          message: `Email not send error something is wrong ${error}`,
                        });
                      } else {
                        return successResponse(res, {
                          message:
                            "Verification link has been sent successfully on your email!",
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
          updateRecord(
            Usermodal,
            { email: decoded.profile.email },
            {
              isValid: true,
            }
          );
          ejs.renderFile(
            __dirname + "/welcome.ejs",
            {
              name: "v4xverifyuser@gmail.com",
            },
            async function (err, data) {
              const DOMAIN = "donotreply.v4x.org";
              const mg = Mailgun({
                apiKey: "afd2a109fddce998ef411c7ac33c3e0c-81bd92f8-5473abd7",
                domain: DOMAIN,
              });
              const mailOptions = {
                from: "donotreply@v4x.org", // Sender address
                to: decoded.profile.email, // List of recipients
                subject: "verification by v4x", // Subject line
                html: data,
              };
              mg.messages().send(mailOptions, async function (err, info) {
                if (err) {
                  return badRequestResponse(res, {
                    message: `Email not send error something is wrong ${error}`,
                  });
                } else {
                  res.redirect("https://v4x.org/login?login#");
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
              console.log(user);
              const accessToken = await token(Usermodal, user);

              const Wallet = await findOneRecord(Walletmodal, {
                userId: user._id,
              });
              if (!Wallet) {
                await Walletmodal({ userId: user._id }).save();
              }
              return successResponse(res, {
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
            from: "donotreply@v4x.org",
            action_url: accessToken.token,
          },
          async function (err, data) {
            const DOMAIN = "donotreply.v4x.org";
            const mg = Mailgun({
              apiKey: "afd2a109fddce998ef411c7ac33c3e0c-81bd92f8-5473abd7",
              domain: DOMAIN,
            });
            const mailOptions = {
              from: "donotreply@v4x.org", // Sender address
              to: req.body.email, // List of recipients
              subject: "verification by v4x", // Subject line
              html: data,
            };
            mg.messages().send(mailOptions, async function (err, info) {
              if (err) {
                return badRequestResponse(res, {
                  message: `Email not send error something is wrong ${error}`,
                });
              } else {
                return successResponse(res, {
                  message:
                    "varification link has been send to your email address..!!",
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
