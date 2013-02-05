/*globals require, module, __dirname */

/**
 * Module dependencies.
 */
var fs = require("fs"), noop = function() {};

/**
 * Expose constructor.
 */
module.exports = Database;

/**
 * Initialize a new `Database` at the given `path`.
 *
 * @param {String} path
 * @api public
 */
function Database(path) {
  this.path = path;
}

/**
 * Save data.
 *
 * @param {Function} fn
 * @api public
 */
Database.prototype.save = function(fn){
  var data = JSON.stringify(this);
  fs.writeFile(this.path, data, fn || noop);
  return this;
};

/**
 * Load data.
 *
 * @param {Function} fn
 * @api public
 */
Database.prototype.load = function(fn) {
  var self = this, data, keys, len, i;

  if (!fn) {
    fn = noop;
  }

  fs.readFile(this.path, "utf8", function(err, json){
    if (err) {
      return fn(err);
    }

    data = JSON.parse(json);
    keys = Object.keys(data);
    len = keys.length;

    for (i = 0; i < len; i += 1) {
      self[keys[i]] = data[keys[i]];
    }

    fn();
  });

  return this;
};

