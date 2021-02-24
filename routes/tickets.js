const { body, param } = require("express-validator");
const router = require("express").Router();
const mongoose = require("mongoose");
const { checkJWT, checkValidation } = require("../utils/custom-middlewares");
const { ticketCategories } = require("../models/ticket/consts");
const { teamRoleLeader } = require("../models/team/consts");
const { ticketCategoryDispute } = require("../models/ticket/consts");
const { ticketStatusDeleted } = require("../models/ticket/consts");
const { ticketStatusSolved } = require("../models/ticket/consts");
const { ticketStatuses } = require("../models/ticket/consts");
const { checkIfTicketExists } = require("../models/ticket/utils");
const { userPermissionTicket } = require("../models/user/consts");
const { ticketStatusNew } = require("../models/ticket/consts");

const Tickets = mongoose.model("Tickets");
const Tournaments = mongoose.model("Tournaments");
const Users = mongoose.model("Users");
const Teams = mongoose.model("Teams");
const Matches = mongoose.model("Matches");

router.post(
  "/",
  checkJWT(),
  [
    body("subject").notEmpty({ ignore_whitespace: true }).trim().escape(),
    body("description").notEmpty({ ignore_whitespace: true }).trim().escape(),
    body("category").optional().isIn(ticketCategories),
    body("matchId").optional().isMongoId(),
    body("tournamentId").optional().isMongoId(),
  ],
  checkValidation,
  async (req, res, next) => {
    try {
      const { subject, tournamentId, matchId, category } = req.body;
      const messages = [
        {
          message: req.body.description,
          userId: req.user.id,
        },
      ];

      if (req.params.category === ticketCategoryDispute) {
        const match = await Matches.findById(matchId, "teamOne teamTwo").lean();
        await Tickets.create({
          subject,
          tournamentId,
          matchId,
          teamOne: match.teamOne._id,
          teamTwo: match.teamTwo._id,
          category,
          messages,
          status: ticketStatusNew,
        });
        return res.status(201).json();
      }

      await Tickets.create({
        subject,
        userId: req.user.id,
        category,
        messages,
        status: ticketStatusNew,
      });
      return res.status(201).json();
    } catch (e) {
      next(e);
    }
  }
);

router.get("/", checkJWT(), async (req, res, next) => {
  try {
    const userTeams = await Teams.find({
      members: { $elemMatch: { userId: req.user.id, role: teamRoleLeader } },
    });
    const tickets = await Tickets.find({
      $or: [
        { userId: req.user.id },
        { teamOneId: { $in: userTeams.map((team) => team._id) } },
        { teamTwoId: { $in: userTeams.map((team) => team._id) } },
      ],
    }).lean();

    return res.status(200).json(tickets);
  } catch (e) {
    next(e);
  }
});

router.get(
  "/:ticketId",
  checkJWT(),
  [param("ticketId").isMongoId().bail().custom(checkIfTicketExists).bail()],
  checkValidation,
  async (req, res, next) => {
    try {
      // Get the ticket
      const ticket = await Tickets.findById(
        req.params.ticketId,
        "subject createdAt messages category matchId tournamentId attachments status"
      ).lean();

      if (ticket.category === ticketCategoryDispute) {
        // Getting the tournament teams and name
        const tournament = await Tournaments.findById(
          ticket.tournamentId.toString(),
          "name"
        ).lean();
        const match = await Matches.findById(ticket.matchId.toString()).lean();
        const teamOne = await Teams.findById(
          match.teamOne.toString(),
          "name"
        ).lean();
        const teamTwo = await Teams.findById(
          match.teamTwo.toString(),
          "name"
        ).lean();

        if (match) {
          const acceptedDate = match.acceptedAt;
          ticket.tournament = {
            name: tournament.name,
            _id: ticket.tournamentId,
          };
          delete ticket.tournamentId;
          ticket.match = {
            _id: ticket.matchId,
            teamOne: {
              name: teamOne.name,
              _id: teamOne._id,
            },
            teamTwo: {
              name: teamTwo.name,
              _id: teamTwo._id,
            },
            acceptedDate,
          };
          delete ticket.matchId;
        }
      }

      ticket.messages = await Promise.all(
        ticket.messages.map(async (message) => {
          delete message.updatedAt;
          const user = await Users.findById(message.userId, "username").lean();
          message.user = {
            _id: message.userId,
            username: user.username,
          };
          delete message.userId;
          return message;
        })
      );

      return res.status(200).json(ticket);
    } catch (e) {
      next(e);
    }
  }
);

router.patch(
  "/:ticketId",
  checkJWT(userPermissionTicket),
  [
    param("ticketId").isMongoId().bail().custom(checkIfTicketExists),
    body("status").isIn(ticketStatuses),
  ],
  checkValidation,
  async (req, res, next) => {
    try {
      await Tickets.findOneAndUpdate(
        { _id: req.params.ticketId },
        { status: req.body.status }
      );
      return res.status(200).json();
    } catch (e) {
      next(e);
    }
  }
);

router.post(
  "/:ticketId/messages",
  checkJWT(),
  [
    param("ticketId").isMongoId().bail().custom(checkIfTicketExists),
    body("message").isString(),
    body("fromAdminPanel").isBoolean(),
  ],
  checkValidation,
  async (req, res, next) => {
    try {
      const ticket = await Tickets.findOne({
        _id: req.params.ticketId,
      }).lean();
      if (
        ticket.status === ticketStatusSolved ||
        ticket.status === ticketStatusDeleted
      ) {
        return res.status(403).json({
          errorMessage: "Ticket already closed",
        });
      }

      let { message, fromAdminPanel } = req.body;

      const user = await Users.findById(req.user.id).lean();
      if (!user.permissions.includes(userPermissionTicket))
        fromAdminPanel = false;

      await Tickets.updateOne(
        { _id: req.params.ticketId },
        {
          $push: {
            messages: {
              message,
              userId: req.user.id,
              fromAdminPanel,
            },
          },
        }
      );
      return res.status(201).json();
    } catch (e) {
      next(e);
    }
  }
);

module.exports = router;
