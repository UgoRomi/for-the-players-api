const { CustomError, error404 } = require("../../utils/error-consts")
const { teamInvitePending } = require("./consts")
const mongoose = require("mongoose")

const Invite = mongoose.model("Invites")

const inviteExistsById = async (inviteId) => {
	const invite = await Invite.findById(inviteId)

	if (!invite) throw new CustomError(error404, "Invite does not exist")
}

const inviteIsPending = async (inviteId) => {
	const invite = await Invite.findById(inviteId).lean()
	if (invite.status !== teamInvitePending)
		throw Error("This invite has already been replied to")
}

module.exports = {
	inviteExistsById,
	inviteIsPending,
}
