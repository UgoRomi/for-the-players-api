const { formatISO, addSeconds } = require('date-fns');
const mongoose = require('mongoose');
const FormData = require('form-data');
const got = require('got');
const isAfter = require('date-fns/isAfter');
const sub = require('date-fns/sub');

const ImgurToken = mongoose.model('ImgurTokens');

const getImgurToken = async () => {
  const requestBody = new FormData();
  requestBody.append('refresh_token', process.env.IMGURL_REFRESH_TOKEN);
  requestBody.append('client_id', process.env.IMGURL_CLIENT_ID);
  requestBody.append('client_secret', process.env.IMGURL_CLIENT_SECRET);
  requestBody.append('grant_type', 'refresh_token');
  const { body } = await got.post('https://api.imgur.com/oauth2/token', {
    body: requestBody,
  });
  const { access_token, expires_in } = JSON.parse(body);
  await ImgurToken.create({
    token: access_token,
    expiresOn: formatISO(addSeconds(new Date(), expires_in)),
  });
  return access_token;
};

const uploadImageToImgur = async (authToken, imageBase64) => {
  const requestBody = new FormData();
  requestBody.append('image', imageBase64);
  requestBody.append('type', 'base64');

  const response = await got.post('https://api.imgur.com/3/upload', {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
    body: requestBody,
  });
  return JSON.parse(response.body).data.link;
};

const checkImgInput = async (body) => {
  let imageURL;
  if (body.imgUrl) {
    imageURL = body.imgUrl;
  } else {
    const imgurTokenDoc = await ImgurToken.findOne({
      expiresOn: {
        $gte: formatISO(new Date()),
      },
    }).lean();
    let imgurToken = imgurTokenDoc?.token;
    if (!imgurToken) {
      imgurToken = await getImgurToken();
    }
    imageURL = await uploadImageToImgur(imgurToken, body.imgBase64);
  }
  return imageURL;
};

const getCurrentDateTime = () =>
  new Date(
    Date().toLocaleString('en-US', {
      timeZone: 'Europe/Rome',
    }),
  );

// Find the IDs of all the teams this team played with in the last 30 minutes
const getRecentTeamsPlayedWith = (matches, teamId) =>
  matches
    .filter(
      (match) =>
        (match.teamOne?.toString() === teamId ||
          match.teamTwo?.toString() === teamId) &&
        isAfter(match.acceptedAt, sub(getCurrentDateTime(), { minutes: 150 })),
    )
    .map((match) => {
      if (match.teamOne?.toString() === teamId) return match.teamTwo.toString();
      return match.teamOne.toString();
    });

module.exports = {
  getImgurToken,
  uploadImageToImgur,
  checkImgInput,
  getCurrentDateTime,
  getRecentTeamsPlayedWith,
};
