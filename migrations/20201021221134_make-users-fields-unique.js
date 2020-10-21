exports.up = async function (knex) {
	const usersExist = await knex.schema.hasTable("users")
	if (!usersExist) return
	await knex.schema.alterTable("users", (tableBuilder) => {
		tableBuilder.unique(["email"])
	})
}

exports.down = function (knex) {}
