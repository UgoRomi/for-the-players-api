const router = require("express").Router();
const { body, param } = require("express-validator");
const mongoose = require("mongoose");
const EloRank = require("elo-rank");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const {
  userPermissionTournament,
  userStatusBanned,
} = require("../models/user/consts");
const { userExistsById, checkUserEmailInUse } = require("../models/user/utils");
const { types } = require("../models/tournament/consts");
const { checkJWT, checkValidation } = require("../utils/custom-middlewares");
const { checkTournamentExists } = require("../models/tournament/utils");
const { checkTeamExists } = require("../models/team/utils");
const { checkIfPlatformExists } = require("../models/platform/utils");
const { checkIfValidImageData } = require("../utils/custom-validators");
const { convertToMongoId } = require("../utils/custom-sanitizers");
const { calculateMatchStatus } = require("../models/tournament/utils");
const { matchStatusTie } = require("../models/tournament/consts");
const { ladderType } = require("../models/tournament/consts");
const { matchStatusTeamOne } = require("../models/tournament/consts");
const { matchStatusTeamTwo } = require("../models/tournament/consts");
const { checkUniqueName } = require("../models/game/utils");
const { userPermissionUser } = require("../models/user/consts");
const { userPermissionTicket } = require("../models/user/consts");
const { checkMatchExists } = require("../models/match/utils");
const { checkIfGameExists } = require("../models/game/utils");
const { toISO } = require("../utils/custom-sanitizers");
const { checkImgInput } = require("../utils/helpers");
const { userStatuses } = require("../models/user/consts");
const { checkUniqueUsernamePatch } = require("../models/user/utils");
const {
  teamSubmittedMatchResultLoss,
  teamSubmittedMatchResultWin,
} = require("../models/match/consts");

const Tournaments = mongoose.model("Tournaments");
const Tickets = mongoose.model("Tickets");
const Users = mongoose.model("Users");
const Matches = mongoose.model("Matches");
const Teams = mongoose.model("Teams");

const elo = new EloRank();

// Login from admin panel
router.post(
  "/login",
  [
    body("email")
      .notEmpty({ ignore_whitespace: true })
      .trim()
      .escape()
      .isEmail()
      .normalizeEmail()
      .custom(checkUserEmailInUse),
    body("password").not().isEmpty({ ignore_whitespace: true }).trim().escape(),
  ],
  checkValidation,
  async (req, res, next) => {
    try {
      const { email, password } = req.body;
      const userOnDB = await Users.findOne({ email }).lean();

      // If the password is wrong
      if (!bcrypt.compareSync(password, userOnDB.password))
        return res.status(400).json({ error: "Password does not match" });

      if (userOnDB.status === userStatusBanned)
        return res.status(400).json({ error: "User is banned" });

      if (userOnDB.permissions.length === 0)
        return res.status(400).json({ error: "User is not an admin" });

      const token = jwt.sign(
        {
          email,
          id: userOnDB._id,
        },
        process.env.JWT_SECRET
      );
      return res.json({ token, status: userOnDB.status });
    } catch (e) {
      next(e);
    }
  }
);

// Tournament's match
router.patch(
  "/tournaments/:tournamentId/matches/:matchId",
  checkJWT(userPermissionTournament),
  [
    param("tournamentId")
      .isMongoId()
      .bail()
      .custom(checkTournamentExists)
      .bail(),
    param("matchId").isMongoId().bail().custom(checkMatchExists).bail(),
    body("winningTeamId").isMongoId().bail().custom(checkTeamExists).bail(),
  ],
  checkValidation,
  async (req, res, next) => {
    try {
      const tournament = await Tournaments.findById(
        req.params.tournamentId,
        "type"
      ).lean();
      const match = await Matches.findById(req.params.matchId).lean();
      const teamOne = await Teams.findById(match.teamOne.toString()).lean();
      const teamTwo = await Teams.findById(match.teamTwo.toString()).lean();
      const teams = [teamOne, teamTwo];

      if (
        ![match.teamOne.toString(), match.teamTwo.toString()].includes(
          req.body.winningTeamId
        )
      ) {
        return res.status(404).json({
          errorMessage: "This team isn't in this match",
        });
      }

      const teamOneWon = match.teamOne.toString() === req.body.winningTeamId;
      match.teamOneResult = teamOneWon
        ? teamSubmittedMatchResultWin
        : teamSubmittedMatchResultLoss;
      match.teamTwoResult = teamOneWon
        ? teamSubmittedMatchResultLoss
        : teamSubmittedMatchResultWin;
      const matchesStatus = await calculateMatchStatus([match], teams);
      const matchStatus = matchesStatus[0].status;
      await Matches.replaceOne({ _id: match._id }, match);

      // Elo doesn't update in case of a tie
      if (tournament.type === ladderType && matchStatus !== matchStatusTie) {
        // UPDATE ELO
        const expectedScoreTeamOne = elo.getExpected(teamOne.elo, teamTwo.elo);
        const expectedScoreTeamTwo = elo.getExpected(teamTwo.elo, teamOne.elo);

        // +true equals 1
        // +false equals 0

        // Update teamOne
        const teamOneNewElo = elo.updateRating(
          expectedScoreTeamOne,
          +(matchStatus === matchStatusTeamOne),
          teamOne.elo
        );
        await Teams.updateOne(
          { _id: teamOne._id.toString() },
          { elo: teamOneNewElo }
        );

        // Update teamTwo
        const teamTwoNewElo = elo.updateRating(
          expectedScoreTeamTwo,
          +(matchStatus === matchStatusTeamTwo),
          teamTwo.elo
        );
        await Teams.updateOne(
          { _id: teamTwo._id.toString() },
          { elo: teamTwoNewElo }
        );
      } else {
        // UPDATE POINTS
        let teamOnePoints = teamOne.points;
        let teamTwoPoints = teamTwo.points;
        switch (matchStatus) {
          case matchStatusTie:
            teamOnePoints += 1;
            teamTwoPoints += 1;
            break;
          case matchStatusTeamOne:
            teamOnePoints += 3;
            break;
          case matchStatusTeamTwo:
            teamTwoPoints += 3;
            break;
        }
        await Teams.updateOne(
          { _id: teamOne._id.toString() },
          { points: teamOnePoints }
        );
        await Teams.updateOne(
          { _id: teamTwo._id.toString() },
          { points: teamTwoPoints }
        );
      }

      return res.status(200).json({});
    } catch (e) {
      next(e);
    }
  }
);

/**
 * Update user
 */
router.patch(
  "/users/:userId",
  checkJWT(userPermissionUser),
  [
    param("userId").isMongoId().bail().custom(userExistsById),
    body("status").optional().isIn(userStatuses),
    body("email").optional().isEmail().normalizeEmail(),
    body("username")
      .optional()
      .isString()
      .trim()
      .escape()
      .custom(checkUniqueUsernamePatch),
    body("password").optional().isString().trim().escape(),
  ],
  checkValidation,
  async (req, res, next) => {
    try {
      const updateObj = {};
      const { status, email, username, password } = req.body;

      if (status) updateObj.status = status;
      if (email) updateObj.email = email;
      if (username) updateObj.username = username;
      if (password) updateObj.password = password;

      await Users.updateOne({ _id: req.params.userId }, { $set: updateObj });

      return res.status(200).json();
    } catch (e) {
      next(e);
    }
  }
);

/**
 * List all tickets
 */
router.get(
  "/tickets",
  checkJWT(userPermissionTicket),
  async (req, res, next) => {
    try {
      const tickets = await Tickets.find({}).sort({ updatedAt: -1 }).lean();

      return res.status(200).json(tickets);
    } catch (e) {
      next(e);
    }
  }
);

/**
 * Update a single team
 */
router.patch(
  "/tournaments/:tournamentId",
  checkJWT(userPermissionTournament),
  [
    param("tournamentId")
      .isMongoId()
      .bail()
      .custom(checkTournamentExists)
      .bail(),
    body("name")
      .optional()
      .notEmpty({ ignore_whitespace: true })
      .trim()
      .escape(),
    // .custom(checkUniqueName),
    body("game")
      .optional()
      .notEmpty({ ignore_whitespace: true })
      .customSanitizer(convertToMongoId)
      .custom(checkIfGameExists),
    body("platform")
      .optional()
      .notEmpty({ ignore_whitespace: true })
      .customSanitizer(convertToMongoId)
      .custom(checkIfPlatformExists),
    body("show").isBoolean(),
    body("startsOn")
      .optional()
      .notEmpty({ ignore_whitespace: true })
      .isDate()
      .customSanitizer(toISO),
    body("endsOn")
      .optional()
      .notEmpty({ ignore_whitespace: true })
      .isDate()
      .customSanitizer(toISO),
    body("rulesets").optional().isArray(),
    body("type").optional().isIn(types),
    body("imgUrl").optional().isURL(),
    body("imgBase64").optional().isBase64().custom(checkIfValidImageData),
    body("open").optional().isBoolean(),
    body("minTeamSizePerMatch").optional().isInt(),
    body("maxTeamSizePerMatch").optional().isInt(),
  ],
  checkValidation,
  async (req, res, next) => {
    try {
      const tournamentToUpdate = await Tournaments.findById(
        req.params.tournamentId
      ).lean();
      if (req.body.name) tournamentToUpdate.name = req.body.name;

      if (req.body.game) tournamentToUpdate.game = req.body.game;

      if (req.body.platform) tournamentToUpdate.platform = req.body.platform;

      if (req.body.show) tournamentToUpdate.show = req.body.show;

      if (req.body.startsOn) tournamentToUpdate.startsOn = req.body.startsOn;

      if (req.body.endsOn) tournamentToUpdate.endsOn = req.body.endsOn;

      if (req.body.rulesets) tournamentToUpdate.rulesets = req.body.rulesets;

      if (req.body.type) tournamentToUpdate.type = req.body.type;

      if (req.body.open) tournamentToUpdate.open = req.body.open;

      if (req.body.minTeamSizePerMatch)
        tournamentToUpdate.minTeamSizePerMatch = req.body.minTeamSizePerMatch;

      if (req.body.maxTeamSizePerMatch)
        tournamentToUpdate.maxTeamSizePerMatch = req.body.maxTeamSizePerMatch;

      if (req.body.imgBase64 || req.body.imgUrl)
        tournamentToUpdate.imgUrl = await checkImgInput(req.body);

      await Tournaments.updateOne(
        {
          _id: req.params.tournamentId,
        },
        tournamentToUpdate
      );

      return res.status(200).json();
    } catch (e) {
      next(e);
    }
  }
);

router.post(
  "/tournaments",
  checkJWT(userPermissionTournament),
  [
    body("name")
      .notEmpty({ ignore_whitespace: true })
      .trim()
      .escape()
      .custom(checkUniqueName),
    body("game")
      .notEmpty({ ignore_whitespace: true })
      .customSanitizer(convertToMongoId)
      .custom(checkIfGameExists),
    body("platform")
      .notEmpty({ ignore_whitespace: true })
      .customSanitizer(convertToMongoId)
      .custom(checkIfPlatformExists),
    body("show").isBoolean(),
    body("startsOn")
      .notEmpty({ ignore_whitespace: true })
      .isDate()
      .customSanitizer(toISO),
    body("endsOn")
      .notEmpty({ ignore_whitespace: true })
      .isDate()
      .customSanitizer(toISO),
    body("rulesets").isArray(),
    body("type").isIn(types),
    body("imgUrl").optional().isURL(),
    body("imgBase64").isBase64().custom(checkIfValidImageData),
    body("open").isBoolean(),
    body("minTeamSizePerMatch").optional().isInt(),
    body("maxTeamSizePerMatch").optional().isInt(),
    body("rules").optional().isString(),
    body("challongeId").optional().isInt(),
  ],
  checkValidation,
  async (req, res, next) => {
    try {
      const {
        name,
        game,
        platform,
        show,
        startsOn,
        endsOn,
        rulesets,
        type,
        open,
        minTeamSizePerMatch,
        maxTeamSizePerMatch,
        rules,
        challongeId,
      } = req.body;

      const imageURL = await checkImgInput(req.body);
      const newTournament = {
        name,
        game,
        platform,
        show,
        startsOn,
        endsOn,
        rulesets,
        type,
        imgUrl: imageURL,
        createdBy: req.user.id,
        open,
        challongeId,
      };

      if (minTeamSizePerMatch)
        newTournament.minTeamSizePerMatch = minTeamSizePerMatch;
      if (maxTeamSizePerMatch)
        newTournament.maxTeamSizePerMatch = maxTeamSizePerMatch;
      if (rules) newTournament.rules = rules;

      await Tournaments.create(newTournament);
      return res.status(201).json();
    } catch (e) {
      next(e);
    }
  }
);

module.exports = router;
