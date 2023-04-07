var bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const Usermodal = require("../models/user");
const wallatemodal = require("../models/Wallet");
const Transactionmodal = require("../models/Transaction");
const V4Xpricemodal = require("../models/V4XLiveRate");
const Adminmodal = require("../models/Admin");
const Walletmodal = require("../models/Wallet");
const Sopprtmodal = require("../models/Ticket");
var ejs = require("ejs");
const jwt = require("jsonwebtoken");
const {
  decodeUris,
  cloneDeep,
  findOneRecord,
  updateRecord,
  findAllRecord,
} = require("../library/commonQueries");
const {
  successResponse,
  badRequestResponse,
  errorResponse,
  notFoundResponse,
} = require("../middleware/response");
// const Token = require("../models/Token");
const { tokenverify } = require("../middleware/token");
const token = require("../middleware/token");
exports.admin = {
  signIn: async (req, res) => {
    try {
      req.body = decodeUris(req.body);
      const user = await findOneRecord(Adminmodal, { email: req.body.email });
      if (!user) {
        notFoundResponse(res, { message: "User Not Found!" });
      } else {
        const match = req.body.password === user.password;
        console.log("user", user);
        console.log("match", match);
        if (!match) {
          badRequestResponse(res, { message: "Password is incorrect!" });
        } else {
          const profile = await Adminmodal.findOne({
            email: req.body.email,
          }).select({
            password: 0,
          });
          const token = jwt.sign({ profile }, "3700 0000 0000 002", {
            expiresIn: "24hr",
          });
          successResponse(res, {
            message: "Login successfully",
            token: token,
            profile: user,
          });
        }
      }
    } catch (error) {
      return errorResponse(error, res);
    }
  },
  alluserdata: async (req, res) => {
    try {
      if (req.headers.authorization) {
        let { err, decoded } = await tokenverify(
          req.headers.authorization.split(" ")[1]
        );
        if (decoded) {
          decoded = await cloneDeep(decoded);
          const userdata1 = await findAllRecord(Usermodal, {});
          successResponse(res, {
            message: "all user data get",
            data: userdata1,
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
  alltranfor: async (req, res) => {
    try {
      if (req.headers.authorization) {
        let { err, decoded } = await tokenverify(
          req.headers.authorization.split(" ")[1]
        );
        if (decoded) {
          decoded = await cloneDeep(decoded);
          const userdata1 = await Transactionmodal.aggregate([
            {
              $lookup: {
                from: "users",
                localField: "userId",
                foreignField: "_id",
                as: "result",
              },
            },
            {
              $lookup: {
                from: "users",
                localField: "fromaccountusername",
                foreignField: "_id",
                as: "result1",
              },
            },
            {
              $unwind: {
                path: "$result",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $unwind: {
                path: "$result1",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $project: {
                toaccunt: "$result.username",
                fromaccunt: "$result1.username",
                tranforWallet: 1,
                Amount: 1,
                createdAt: 1,
                updatedAt: 1,
              },
            },
          ]);

          successResponse(res, {
            message: "all user data get",
            data: userdata1,
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
  userblock: async (req, res) => {
    try {
      const { usename, note } = req.body;
      let { err, decoded } = await tokenverify(
        req.headers.authorization.split(" ")[1]
      );
      if (decoded) {
        decoded = await cloneDeep(decoded);
        let a = await findOneRecord(Usermodal, {
          username: usename,
        });
        if (a.isActive === false) {
          await updateRecord(
            Usermodal,
            {
              username: usename,
            },
            {
              isActive: !false,
              note: note,
            }
          );
          return successResponse(res, {
            message: "user unblock",
          });
        } else {
          await updateRecord(
            Usermodal,
            {
              username: usename,
            },
            {
              isActive: false,
              note: note,
            }
          );
          return successResponse(res, {
            message: "user block",
          });
        }
      } else {
        return badRequestResponse(res, {
          message: "No token provided.",
        });
      }
    } catch (error) {
      return errorResponse(error, res);
    }
  },
  userwallateblock: async (req, res) => {
    try {
      const { usename, note } = req.body;
      let { err, decoded } = await tokenverify(
        req.headers.authorization.split(" ")[1]
      );
      if (decoded) {
        decoded = await cloneDeep(decoded);
        console.log(usename);
        let a = await findOneRecord(Usermodal, {
          username: usename,
        });
        console.log(req.body);
        if (a?.iswalletActive === false) {
          await updateRecord(
            wallatemodal,
            {
              userId: a._id,
            },
            {
              iswalletActive: !false,
            }
          );
          return successResponse(res, {
            message: "wallate unblock",
          });
        } else {
          await updateRecord(
            Usermodal,
            {
              userId: a._id,
            },
            {
              iswalletActive: false,
            }
          );
          return successResponse(res, {
            message: "wallate block",
          });
        }
      } else {
        return badRequestResponse(res, {
          message: "No token provided.",
        });
      }
    } catch (error) {
      return errorResponse(error, res);
    }
  },
  priceV4X: async (req, res) => {
    try {
      const { price } = req.body;
      let { err, decoded } = await tokenverify(
        req.headers.authorization.split(" ")[1]
      );
      if (decoded) {
        decoded = await cloneDeep(decoded);
        if (price > 0) {
          await updateRecord(
            V4Xpricemodal,
            {},
            {
              price: price,
            }
          );
          return successResponse(res, {
            message: "V4X price chenge successfully!",
          });
        } else {
          return badRequestResponse(res, {
            message: "anter valid amount!",
          });
        }
        // console.log(usename);
        // let data = await findOneRecord(Usermodal, {
        //   username: usename,
        // });
      } else {
        return badRequestResponse(res, {
          message: "No token provided.",
        });
      }
    } catch (error) {
      return errorResponse(error, res);
    }
  },
  amontsend: async (req, res) => {
    try {
      let { err, decoded } = await tokenverify(
        req.headers.authorization.split(" ")[1]
      );
      if (decoded) {
        decoded = await cloneDeep(decoded);
        let data = await findOneRecord(Usermodal, {
          username: req.body.username,
        });
        await updateRecord(
          Walletmodal,
          {
            userId: data._id,
          },
          { $inc: { mainWallet: req.body.price } }
        );
        return successResponse(res, {
          message: "V4X price chenge successfully!",
        });
      } else {
        return badRequestResponse(res, {
          message: "No token provided.",
        });
      }
    } catch (error) {
      return errorResponse(error, res);
    }
  },
  supportdata: async (req, res) => {
    try {
      let { err, decoded } = await tokenverify(
        req.headers.authorization.split(" ")[1]
      );
      if (decoded) {
        decoded = await cloneDeep(decoded);
        const userdata1 = await Sopprtmodal.aggregate([
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
        ]);
        return successResponse(res, {
          message: "V4X price chenge successfully!",
          data: userdata1,
        });
      } else {
        return badRequestResponse(res, {
          message: "No token provided.",
        });
      }
    } catch (error) {
      return errorResponse(error, res);
    }
  },
};
