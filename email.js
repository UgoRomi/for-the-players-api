const nodemailer = require("nodemailer")

const transporter = nodemailer.createTransport({
	host: "smtp.ethereal.email",
	port: 587,
	auth: {
		user: "paris.bradtke26@ethereal.email",
		pass: "88ctqUHAwNFCvmqHwY",
	},
})

module.exports = transporter