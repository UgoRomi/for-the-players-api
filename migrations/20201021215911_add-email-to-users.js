exports.up = async function (knex) {
	const usersExist = await knex.schema.hasTable("users")
	if (!usersExist) return
	await knex.schema.alterTable("users", (tableBuilder) => {
		tableBuilder.string("email")
	})
}

exports.down = function (knex) {}
