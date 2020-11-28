const { teamInvites, teamInvitePending } = require("./consts")
const { Schema, model, ObjectId } = require("mongoose")

const inviteSchema = new Schema({
	userId: { type: ObjectId, ref: "Users", required: true },
	tournamentId: { type: ObjectId, ref: "Users", required: true },
	teamName: { type: String, required: true },
	status: {
		type: String,
		enum: teamInvites,
		default: teamInvitePending,
		required: true,
	},
})
const inviteModel = model("Invites", inviteSchema)

module.exports = inviteModel
