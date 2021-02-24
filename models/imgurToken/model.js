const { Schema, model } = require('mongoose');

const imgurTokenSchema = new Schema({
  token: { type: String, unique: true, required: true },
  expiresOn: { type: Date, required: true },
});

const imgurToken = model('ImgurTokens', imgurTokenSchema);
module.exports = imgurToken;
