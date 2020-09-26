const router = require('express').Router()

/**
 * @api {post} /auth/register Register a new user
 * @apiName Register
 * @apiGroup Auth
 *
 * @apiParam {String} username          The new user's username
 * @apiParam {String} Email             The new user's email
 * @apiParam {String} Password          The new user's password
 *
 * @apiSuccess {String} username        Username of the newly registered user.
 * @apiSuccess {String} email           Email of the newly registered user.
 */
router.post('register', (req, res) => {
    console.log('register called')
})