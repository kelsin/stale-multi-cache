// Main Cache Interface

function Cache(stores) {
  if(stores === undefined) {
    stores = [];
  }

  this.stores = stores;
};

Cache.prototype.getStores = function getStores() {
  return this.stores;
};

module.exports = Cache;
