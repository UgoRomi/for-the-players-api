const { userStatuses } = require("../models/utils/consts")

exports.up = async function (knex) {
	const usersExists = await knex.schema.hasTable("users")
	if (!usersExists)
		await knex.schema.createTable("users", (table) => {
			table.increments("id").primary()
			table.string("username")
			table.string("password")
			table.dateTime("date_joined")
			table.enu("status", userStatuses, {
				useNative: true,
				enumName: "user_statuses_type",
			})
		})

	const permissionsExists = await knex.schema.hasTable("permissions")
	if (!permissionsExists)
		await knex.schema.createTable("permissions", (table) => {
			table.increments("id").primary()
			table.string("permission")
		})

	const usersPermissionsExists = await knex.schema.hasTable("users_permissions")
	if (!usersPermissionsExists)
		await knex.schema.createTable("users_permissions", (table) => {
			table.integer("user_id").references("id").inTable("users")
			table.integer("permission_id").references("id").inTable("permissions")
		})
}

exports.down = function (knex) {}
