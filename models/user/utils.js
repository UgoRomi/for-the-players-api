const mongoose = require("mongoose")
const { CustomError, error404 } = require("../../utils/error-consts")
const { userStatusVerified, userStatusBanned } = require("./consts")
const User = mongoose.model("Users")

const checkUniqueEmail = async (email) => {
	const userAlreadyExists = await User.findOne({
		email,
	})
	if (userAlreadyExists) throw Error("Email already in use")
}

const checkUserEmailInUse = async (email) => {
	const userAlreadyExists = await User.findOne({
		email,
	})
	if (!userAlreadyExists) throw Error("Email not in use")
}

const checkUserNotVerified = async (userId) => {
	const user = await User.findById(userId)
	if (!user) throw new CustomError(error404, "User does not exist")

	if (user.status === userStatusVerified) throw Error("User already verified")
	if (user.status === userStatusBanned) throw Error("User is banned")
}

const userExistsById = async (userId) => {
	const user = await User.findById(userId)
	if (!user) throw new CustomError(error404, "User does not exist")
}

const multipleUsersExistById = async (usersIds) => {
	usersIds.forEach((userId) => userExistsById(userId))
}

module.exports = {
	checkUniqueEmail,
	checkUserEmailInUse,
	checkUserNotVerified,
	userExistsById,
	multipleUsersExistById,
}
