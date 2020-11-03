// Status
const userStatusNotVerified = "NOT_VERIFIED"
const userStatusVerified = "VERIFIED"
const userStatusBanned = "BANNED"
const userStatuses = [
	userStatusNotVerified,
	userStatusVerified,
	userStatusBanned,
]

// Permissions
const userPermissionCreateGame = "CREATE_GAME"
const userPermissions = [userPermissionCreateGame]

module.exports = {
	userStatuses,
	userStatusNotVerified,
	userStatusBanned,
	userPermissionCreateGame,
	userPermissions,
}
