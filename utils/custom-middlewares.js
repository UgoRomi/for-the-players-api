const { validationResult } = require("express-validator");
const _ = require("lodash");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const { error404 } = require("./error-consts");
const {
  userStatusBanned,
  userStatusNotVerified,
} = require("../models/user/consts");

const User = mongoose.model("Users");

const checkValidation = (req, res, next) => {
  const validationErrors = validationResult(req);
  if (!validationErrors.isEmpty()) {
    const errors = validationErrors.array();
    if (errors.some((error) => _.isObject(error.msg))) {
      const firstError = errors.find((error) => _.isObject(error.msg)).msg;
      switch (firstError.name) {
        case error404:
          return res.status(404).json({ errorMessage: firstError.message });
      }
    }
    return res.status(400).json({ errors: validationErrors.array() });
  }
  next();
};

const checkJWT = (requiredPermissions, mustBeVerified = true) => {
  return async (req, res, next) => {
    try {
      if (!_.has(req.headers, "authorization"))
        return res
          .status(401)
          .json({ errorMessage: "'Authorization' header not found" });
      const authHeader = req.headers.authorization;
      if (!authHeader)
        return res
          .status(401)
          .json({ errorMessage: "'Authorization' header is empty" });

      const bearerToken = authHeader.split("Bearer ").pop();
      if (!bearerToken)
        return res
          .status(401)
          .json({ errorMessage: "'Authorization' header wrongly formatted" });

      let decodedToken;
      try {
        decodedToken = jwt.verify(bearerToken, process.env.JWT_SECRET);
      } catch (e) {
        return res.status(401).json({ errorMessage: "Invalid Bearer token" });
      }

      if (!decodedToken)
        return res.status(401).json({ errorMessage: "Invalid Bearer token" });

      const user = await User.findOne({
        email: decodedToken.email,
      }).lean();
      if (!user)
        return res.status(401).json({ errorMessage: "Invalid Bearer token" });

      if (user.status === userStatusBanned)
        return res.status(403).json({ errorMessage: "User is banned" });

      if (mustBeVerified && user.status === userStatusNotVerified)
        return res.status(403).json({ errorMessage: "User not verified" });

      const permissions =
        requiredPermissions && _.isString(requiredPermissions)
          ? [requiredPermissions]
          : requiredPermissions;

      if (
        permissions &&
        permissions.length > 0 &&
        (!user.permissions ||
          !permissions.every((permission) =>
            user.permissions.includes(permission)
          ))
      )
        return res
          .status(403)
          .json({ errorMessage: "Insufficient permissions" });

      req.user = {
        email: decodedToken.email,
        id: decodedToken.id,
        permissions: user.permissions,
      };
      return next();
    } catch (e) {
      return next(e);
    }
  };
};

module.exports = {
  checkValidation,
  checkJWT,
};
