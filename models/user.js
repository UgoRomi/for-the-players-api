const Model = require("../objection-setup")

class User extends Model {
	static get tableName() {
		return "users"
	}
}

module.exports = User
