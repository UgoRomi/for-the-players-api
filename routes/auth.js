const router = require("express").Router();

/**
 * @api {post} /auth/register Register a new user
 * @apiName Register
 * @apiGroup Auth
 *
 * @apiParam {String} username          The new user's username
 * @apiParam {String} email             The new user's email
 * @apiParam {String} password          The new user's password
 *
 * @apiSuccess {String} username        Username of the newly registered user
 * @apiSuccess {String} email           Email of the newly registered user
 */
router.post("/register", (req, res) => {
  res.json({ message: "register called" });
});

/**
 * @api {post} /auth/login Login
 * @apiName Login
 * @apiGroup Auth
 *
 * @apiParam {String} email             The user's email
 * @apiParam {String} password          The user's password
 *
 * @apiSuccess {String} jwt             JWT for the session
 */
router.post("/login", (req, res) => {
  res.json({ message: "login called" });
});

/**
 * @api {post} /auth/forgot-password Forgot Password
 * @apiName Forgot Password
 * @apiGroup Auth
 *
 * @apiParam {String} email             The user's email
 */
router.post("/forgot-password", (req, res) => {
  res.json({ message: "forgot-password called" });
});

module.exports = router;
