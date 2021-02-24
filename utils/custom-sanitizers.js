const { formatISO, parseISO } = require("date-fns");
const mongoose = require("mongoose");

const convertToMongoId = (id) => {
  return mongoose.Types.ObjectId(id);
};

const toISO = (date) => {
  if (date instanceof Date) return formatISO(date);
  return parseISO(date);
};

module.exports = {
  convertToMongoId,
  toISO,
};
