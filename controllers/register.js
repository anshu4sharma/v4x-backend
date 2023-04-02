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
        refferalId: req.body.refferalBy,
      });
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
                name: "prashantvadhvana@gmail.com",
                action_url: `http://localhost:8080/api/registration/signUp/varify:${accessToken}`,
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
            const isCreated = await Usermodal(req.body).save();
            if (!isCreated) {
              return badRequestResponse(res, {
                message: "Failed to create register!",
              });
            } else {
              const profile = await Usermodal.findById(isCreated._id).select({
                password: 0,
              });
              const accessToken = jwt.sign({ profile }, "3700 0000 0000 002", {
                expiresIn: "1hr",
              });
              ejs.renderFile(
                __dirname + "/mail.ejs",
                {
                  name: "prashantvadhvana@gmail.com",
                  action_url: `http://localhost:8080/api/registration/signUp/varify:${accessToken}`,
                },
                async function (err, data) {
                  const mailOptions = {
                    from: "prashantvadhavana.vision@gmail.com", // Sender address
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
          let allUser = await Usermodal.find({
            isValid: true,
          });
          let usernumber = 10018 + allUser.length;
          let finalusename = "V4X" + usernumber;
          console.log("usernumber", finalusename);
          await updateRecord(
            Usermodal,
            { email: decoded.profile.email },
            { username: finalusename }
          ).then(() => {
            res.redirect("http://localhost:3000/");
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
  signIn: async (req, res) => {
    try {
      req.body = decodeUris(req.body);
      const user = await findOneRecord(Usermodal, { email: req.body.email });
      if (!user) {
        notFoundResponse(res, { message: "User Not Found!" });
      } else {
        const match = await bcrypt.compare(req.body.password, user.password);
        if (!match) {
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
            name: "prashantvadhvana@gmail.com",
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
};
