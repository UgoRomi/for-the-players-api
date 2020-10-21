exports.up = async function (knex) {
	await knex.schema.alterTable("users", (tableBuilder) => {
		tableBuilder.timestamps(true, true)
		tableBuilder.dropColumn("date_joined")
	})
}

exports.down = function (knex) {}
