const mongoose = require("mongoose")
const { CustomError, error404 } = require("../../utils/error-consts")
const { userStatusVerified, userStatusBanned } = require("./consts")
const User = mongoose.model("User")

const checkUniqueEmail = async (email) => {
	const userAlreadyExists = await User.findOne({
		email,
	})
	if (userAlreadyExists) throw Error("Email already in use")
}

const checkIfUserExists = async (email) => {
	const userAlreadyExists = await User.findOne({
		email,
	})
	if (!userAlreadyExists) throw Error("Email not in use")
}

const checkUserNotVerified = async (userId) => {
	const user = await User.findById(userId)
	if (!user) return new CustomError(error404, "User does not exist")

	if (user.status === userStatusVerified) throw Error("User already verified")
	if (user.status === userStatusBanned) throw Error("User is banned")
}

module.exports = {
	checkUniqueEmail,
	checkIfUserExists,
	checkUserNotVerified,
}
