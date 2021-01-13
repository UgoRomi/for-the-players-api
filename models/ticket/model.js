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
		subject: { type: String, unique: false, required: true },
		category: { type: String, required: true },
		matchId: { type: ObjectId, required: false, ref: "Matches" },
		tournamentId: { type: ObjectId, required: false, ref: "Tournaments" },
		attachments: { type: Array, required: true },
		status: {
			type: String,
			required: true,
			default: ticketStatusNew,
			enum: ticketStatuses,
		},
		userId: { type: ObjectId, required: true, ref: "Users" },
		userIdTwo: { type: ObjectId, required: false, ref: "Users" }, //Only in case of disputes
		messages: [messagesSchema],
	},
	{ timestamps: true }
)

const tickets = model("Tickets", ticketsSchema)

module.exports = tickets
