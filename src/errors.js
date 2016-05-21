exports.notFound = function notFound(key) {
  return new Error(key + " not found in the cache");
};
