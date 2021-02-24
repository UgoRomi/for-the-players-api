const mongoose = require('mongoose');
const { CustomError } = require('../../utils/error-consts');
const { error403 } = require('../../utils/error-consts');
const { error404 } = require('../../utils/error-consts');
const { userStatusVerified, userStatusBanned } = require('./consts');

const User = mongoose.model('Users');

const checkUniqueEmail = async (email) => {
  const userAlreadyExists = await User.findOne({
    email,
  });
  if (userAlreadyExists) throw Error('Email already in use');
};

const checkUniqueUsername = async (username, { req }) => {
  const userAlreadyExists = await User.findOne({
    username,
  }).lean();

  // If this validator is called on an endpoint that does not require authentication (sign up)
  if (!req.user) if (userAlreadyExists) throw Error('Username already in use');

  // If the validator is called on an endpoint that requires authentication check that the user im checking on is not the same as the logged one
  if (userAlreadyExists && userAlreadyExists._id.toString() !== req.user.id)
    if (userAlreadyExists) throw Error('Username already in use');
};

const checkUserEmailInUse = async (email) => {
  const userAlreadyExists = await User.findOne({
    email,
  });
  if (!userAlreadyExists) throw Error('Email not in use');
};

const checkUserNotVerified = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new CustomError(error404, 'User does not exist');

  if (user.status === userStatusVerified) throw Error('User already verified');
  if (user.status === userStatusBanned) throw Error('User is banned');
};

const userExistsById = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new CustomError(error404, 'User does not exist');
};

const isLoggedInUser = async (userId, { req }) => {
  if (userId !== req.user.id)
    throw new CustomError(
      error403,
      'You are trying to access a resource of another user',
    );
};

const multipleUsersExistById = async (usersIds) => {
  usersIds.forEach((userId) => userExistsById(userId));
};

const checkUniqueUsernamePatch = async (username, { req }) => {
  const userAlreadyExists = await User.findOne({
    username,
    _id: { $ne: req.params.userId },
  }).lean();
  // If this validator is called on an endpoint that does not require authentication (sign up)
  if (userAlreadyExists) throw Error('Username already in use');
};

module.exports = {
  checkUniqueEmail,
  checkUniqueUsername,
  checkUserEmailInUse,
  checkUserNotVerified,
  userExistsById,
  multipleUsersExistById,
  isLoggedInUser,
  checkUniqueUsernamePatch,
};
