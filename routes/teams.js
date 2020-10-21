const router = require("express").Router();

/**
 * @apiDefine AuthRequiredRoute
 *
 * @apiHeader {String} Authorization        The JWT of the logged user
 */

/**
 * @apiDefine SingleTeamNonDetailedResponse
 *
 * @apiSuccess {Number} ID                  Team's ID
 * @apiSuccess {String} dame                Team's name
 * @apiSuccess {String} image               Team's image
 * @apiSuccess {Number}                     Amount of members in the team
 * @apiSuccess {Number} max_members         Maximum amount of members that can be in the team
 */

/**
 * @api {get} /teams/:gameID                List all
 * @apiName List all teams
 * @apiDescription List all teams for the given name
 * @apiGroup Teams
 *
 * @apiUse AuthRequiredRoute
 *
 * @apiUse MultipleFullGamesResponse
 *
 */
router.get("/:gameID", (req, res) => {});

module.exports = router;
