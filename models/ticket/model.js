const { ticketCategories } = require("./consts")
const { ticketStatuses } = require("./consts")
const { ticketStatusNew } = require("./consts")
const { Schema, model, ObjectId } = require("mongoose")

const messagesSchema = new Schema(
	{
		message: { type: String, required: true },
		userId: { type: ObjectId, required: true, ref: "Users" },
		fromAdminPanel: { type: Boolean, required: true, default: false },
	},
	{ timestamps: true }
)

const ticketsSchema = new Schema(
	{
		subject: { type: String, required: true },
		category: { type: String, required: true, enum: ticketCategories },
		// matchId, tournamentId, teamOneId and teamTwoId are only used in disputes
		matchId: { type: ObjectId, ref: "Matches" },
		tournamentId: { type: ObjectId, ref: "Tournaments" },
		teamOneId: { type: ObjectId, ref: "Teams" },
		teamTwoId: { type: ObjectId, ref: "Teams" },
		// userId is used everywhere but disputes
		userId: { type: ObjectId, ref: "Users" },
		attachments: { type: Array, required: true },
		status: {
			type: String,
			required: true,
			default: ticketStatusNew,
			enum: ticketStatuses,
		},
		messages: [messagesSchema],
	},
	{ timestamps: true }
)

const tickets = model("Tickets", ticketsSchema)

module.exports = tickets
