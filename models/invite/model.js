const { teamInvites, teamInvitePending } = require("./consts")
const { Schema, model, ObjectId } = require("mongoose")

const inviteSchema = new Schema({
	userId: { type: ObjectId, ref: "User", required: true },
	tournamentId: { type: ObjectId, ref: "User", required: true },
	teamName: { type: string, required: true },
	status: {
		type: string,
		enum: teamInvites,
		default: teamInvitePending,
		required: true,
	},
})
const inviteModel = model("Invites", inviteSchema)

module.exports = inviteModel
