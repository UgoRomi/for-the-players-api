const router = require("express").Router();

/**
 * @apiDefine AuthRequiredRoute
 *
 * @apiHeader {String} Authorization                                        The JWT of the logged user
 */

/**
 * @apiDefine SingleFullGameResponse
 *
 * @apiSuccess {Number}   ID                                                The game's ID
 * @apiSuccess {String}   name                                              The game's name
 * @apiSuccess {Number}   max_players_per_team                              The maximum number of players a team can have in this game
 * @apiSuccess {Number}   added_by                                          The ID of the user who added this game
 * @apiSuccess {Number}   added_at                                          Unix timestamp of then the game was added
 * @apiSuccess {Object[]} platforms                                         The list of platforms to which the game is linked
 * @apiSuccess {Boolean}  platforms.show                                    If the game can be shown to the user in this platform
 * @apiSuccess {Number}   platforms.added_by                                The ID of the user who added this game to this platform
 * @apiSuccess {Number}   platforms.added_at                                Unix timestamp of then the game was added to this platform
 */

/**
 * @apiDefine MultipleFullGamesResponse
 *
 * @apiSuccess {Object[]} games                                             The list of games returned
 * @apiSuccess {Number}   games.ID                                          The game's ID
 * @apiSuccess {String}   games.name                                        The game's name
 * @apiSuccess {Number}   games.max_players_per_team                        The maximum number of players a team can have in this game
 * @apiSuccess {Number}   games.added_by                                    The ID of the user who added this game
 * @apiSuccess {Number}   games.added_at                                    Unix timestamp of then the game was added
 * @apiSuccess {Object[]} games.platforms                                   The list of platforms to which the game is linked
 * @apiSuccess {Boolean}  games.platforms.show                              If the game can be shown to the user in this platform
 * @apiSuccess {Number}   games.platforms.added_by                          The ID of the user who added this game to this platform
 * @apiSuccess {Number}   games.platforms.added_at                          Unix timestamp of then the game was added to this platform
 */

/**
 * @apiDefine SingleLightGameResponse
 *
 * @apiSuccess {Number}   ID                                                The game's ID
 * @apiSuccess {String}   name                                              The game's name
 * @apiSuccess {Number}   max_players_per_team                              The maximum number of players a team can have in this game
 * @apiSuccess {Number[]} platforms                                         The list of IDs of the platforms in which the game is available
 */

/**
 * @apiDefine MultipleLightGamesResponse
 *
 * @apiSuccess {Object[]} games                                             The list of games returned
 * @apiSuccess {Number}   games.ID                                          The game's ID
 * @apiSuccess {String}   games.name                                        The game's name
 * @apiSuccess {Number}   games.max_players_per_team                        The maximum number of players a team can have in this game
 * @apiSuccess {Number[]} games.platforms                                   The list of IDs of the platforms in which the game is available
 */

/**
 * @api {get} /games/available                                             Lists all available games
 * @apiName List Available
 * @apiDescription Returns the list of all the games that have "show=true" in the DB
 * @apiGroup Games
 *
 * @apiUse AuthRequiredRoute
 *
 * @apiUse MultipleLightGamesResponse
 *
 */
router.get("/available", (req, res) => {});

/**
 * @api {get} /games/available/:platformID                                 Lists all available games for the given platform
 * @apiName List available games in platform
 * @apiDescription Returns the list of all the games that have "show=true" in the DB for the given platform
 * @apiGroup Games
 *
 * @apiUse AuthRequiredRoute
 *
 * @apiParam {Number}       platformID                                      The ID of the platform of which the API should return games
 *
 * @apiUse MultipleLightGamesResponse
 *
 */
router.get("/available/:platformID", (req, res) => {});

/**
 * @api {get} /games/:gameID                                               Info about a particular game
 * @apiName Game Details
 * @apiDescription Returns the detail of a single game. If the user has the "view_all_games" permission
 * it also shows the platforms in which the game has show=false
 * @apiGroup Games
 *
 * @apiUse AuthRequiredRoute
 *
 * @apiParam {Number}       gameID                                          The ID of the game to show
 *
 * @apiUse SingleFullGameResponse
 *
 */
router.get("/:gameID", (req, res) => {});

/**
 * @api {patch} /games/:gameID                                               Updates an already existing game
 * @apiPermission update_game
 * @apiName Update
 * @apiDescription Updates an already existing game
 * @apiGroup Games
 *
 * @apiUse AuthRequiredRoute
 *
 * @apiParam {Number}   gameID                                              The ID of the game to update
 * @apiParam {String}   [name]                                              The game's name
 * @apiParam {Number}   [max_players_per_team]                              The maximum number of players a team can have in this game
 * @apiParam {Object[]} [platforms]                                         The list of platforms in which the game is available
 * @apiParam {Boolean}  platforms.show                                      If the games should be shown as available to the users for the given platform
 *
 * @apiUse SingleFullGameResponse
 *
 */
router.patch("/:gameID", (req, res) => {
  // Only mods and admins can access
});

/**
 * @api {delete} /games/:gameID                                               Deletes an existing game
 * @apiPermission delete_game
 * @apiName Delete
 * @apiDescription Deletes an existing game
 * @apiGroup Games
 *
 * @apiUse AuthRequiredRoute
 *
 * @apiParam {Number}   gameID                                              The ID of the game to delete
 *
 */
router.delete("/:gameID", (req, res) => {
  // Only mods and admins can access
});

/**
 * @api {get} /games                                                       Lists all games, available and not
 * @apiPermission view_all_games
 * @apiName List all games
 * @apiGroup Games
 *
 * @apiUse AuthRequiredRoute
 *
 * @apiUse MultipleFullGamesResponse
 *
 */
router.get("/", (req, res) => {});

/**
 * @api {post} /games                                                      Adds a new game
 * @apiPermission add_game
 * @apiName Add
 * @apiDescription Add a new game
 * @apiGroup Games
 *
 * @apiUse AuthRequiredRoute
 *
 * @apiParam {String} name                                                  The game's name
 * @apiParam {Number} max_players_per_team                                  The maximum number of players a team can have in this game
 * @apiParam {Object[]} [platforms]                                         The list of platforms in which the game is available
 * @apiParam {Boolean}  platforms.show                                      If the game should be shown as available to the user for the given platform
 *
 */
router.post("/", (req, res) => {
  // Only mods and admins can access
});

module.exports = router;
