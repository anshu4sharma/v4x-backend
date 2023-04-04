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
const {
  successResponse,
  badRequestResponse,
  errorResponse,
  notFoundResponse,
} = require("../middleware/response");
const Token = require("../models/Token");
const { tokenverify } = require("../middleware/token");
exports.admin = {
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
  userblock: async (req, res) => {
    try {
      const { usename, note } = req.body;
      if (req.headers.authorization) {
        let { err, decoded } = await tokenverify(
          req.headers.authorization.split(" ")[1]
        );
        if (decoded) {
          decoded = await cloneDeep(decoded);
          await updateRecord(
            Usermodal,
            {
              username: usename,
              note: { accountBlock: note["accountBlock"] },
            },
            {
              isActive: false,
            }
          );
          successResponse(res, {
            message: "user block",
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
