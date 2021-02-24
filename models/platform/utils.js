const mongoose = require('mongoose');

const Platforms = mongoose.model('Platforms');

const checkIfPlatformExists = async (platformId) => {
  const platformExists = await Platforms.findOne({
    _id: platformId,
  });

  if (!platformExists) throw Error('Platform does not exists');
};

const checkUniqueName = async (platformName) => {
  const platformExists = await Platforms.findOne({
    name: platformName,
  });

  if (platformExists)
    throw Error(`Platform named ${platformName} already exists`);
};

module.exports = {
  checkIfPlatformExists,
  checkUniqueName,
};
