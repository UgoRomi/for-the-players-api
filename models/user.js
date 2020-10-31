const Model = require("../objection-setup")
const bcrypt = require("bcrypt")
const { userStatuses } = require("./utils/consts")

class User extends Model {
	static get tableName() {
		return "users"
	}

	async $beforeInsert(queryContext) {
		await super.$beforeInsert(queryContext)
		this.password = bcrypt.hashSync(
			this.password,
			parseInt(process.env.PASSWORD_SALT_ROUNDS)
		)
		this.status = userStatuses[0]
	}
}

module.exports = User
