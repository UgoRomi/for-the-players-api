const User = require("../user")

const checkUniqueEmail = async (email) => {
	const userAlreadyExists = await User.query().findOne({
		email,
	})
	if (userAlreadyExists) throw Error("Email already in use")
}

module.exports = {
	checkUniqueEmail,
}
