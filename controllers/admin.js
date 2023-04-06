var bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const Usermodal = require("../models/user");
const Transactionmodal = require("../models/Transaction");
const Adminmodal = require("../models/Admin");
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
          const userdata1 = await findAllRecord(Usermodal, {
            isValid: !false,
          });
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
      console.log(req.body);

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
};
