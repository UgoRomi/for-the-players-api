const checkIfValidImageData = async (imgBase64, { req }) => {
  if (req.body.imgUrl) return;

  if (!imgBase64) throw Error('\'imgBase64\' or \'imgUrl\' must have a value');
};

module.exports = {
  checkIfValidImageData,
};
