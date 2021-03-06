
'use strict';

/**
 * Module dependencies
 */

var eventhash = require('eventhash');

/**
 * Location ref
 */

var loc = window.location;

/**
 * Running flag
 */

var running;

/**
 * Expose router
 */

module.exports = hsh;

/**
 * Router
 *
 * @param {String} path
 * @param {Function} fn
 * @api public
 */

function hsh(path, fn) {
  if (typeof path === 'function') {
    return hsh('*', path);
  }

  if (typeof fn === 'function') {
    var route = new Route(path, fn);
    hsh.callbacks.push(route.callback());
  } else if (typeof path === 'string') {
    hsh.show(path);
  } else {
    hsh.start();
  }
}

/**
 * Expose path prefix
 */

hsh.prefix = '';

/**
 * Expose current path
 */

hsh.current = null;

/**
 * Expose callbacks
 */

hsh.callbacks = [];

/**
 * Show defined context
 *
 * @param {String} path
 * @api public
 */

hsh.show = function(path) {
  var ctx = new Context(path);
  hsh.current = path;
  execute(ctx);
};

/**
 * Internal redirect /index -> /#/index
 *
 * @param {String} path
 * @api public
 */

hsh.redirect = function(path) {
  if (typeof path === 'string') loc.hash = hsh.prefix + path;
};

/**
 * External redirect /index -> /index
 *
 * @param {String} path
 * @api public
 */

hsh.redirectExternal = function(path) {
  if (typeof path === 'string') loc = path;
};

/**
 * Start listener
 *
 * @api public
 */

hsh.start = function() {
  if (running) return;
  running = true;
  eventhash(onhashchange)();
};

/**
 * Hash change handler
 *
 * @api private
 */

function onhashchange() {
  var path = loc.hash.match(prefixRegExp());
  if (!path) return hsh.redirect(hsh.prefix + '/');
  hsh.show(path[1]);
}

/**
 * Generate RegExp via prefix
 *
 * @return {RegExp}
 * @api private
 */

function prefixRegExp() {
  return new RegExp([
    '^#',
    hsh.prefix.replace(/(\(|\)|\[|\]|\\|\.|\^|\$|\||\?|\+)/g, '\\$1'),
    '(.+)$'
  ].join(''));
}

/**
 * Execute context
 *
 * @param {Object} ctx
 * @api private
 */

function execute(ctx) {
  var i = 0;

  function next() {
    var fn = hsh.callbacks[i++];
    if (!fn) return;
    fn(ctx, next);
  }

  next();
}

/**
 * Context
 *
 * @param  {String} path
 * @return {Object}
 * @api private
 */

function Context(path) {
  this.path = path;
  this.params = {};
}

/**
 * Route
 *
 * @param {String} path
 * @param {Function} fn
 * @api private
 */

function Route(path, fn) {
  this.path = path;
  this.regexp = pathToRegExp(path);
  this.keys = pathToKeys(path);
  this.fn = fn;
}

/**
 * Route callback
 *
 * @return {Function}
 * @api private
 */

Route.prototype.callback = function() {
  var self = this;
  return function(ctx, next) {
    if (self.match(ctx.path, ctx.params)) return self.fn(ctx, next);
    next();
  };
};

/**
 * Route match
 *
 * @param  {String} path
 * @param  {Object} params
 * @return {Boolean}
 * @api private
 */

Route.prototype.match = function(path, params) {
  var pathParams = path.match(this.regexp);
  if (!pathParams) return false;

  for (var i = 0, len = pathParams.length; i < len - 1; i++) {
    params[this.keys[i] || i] = pathParams[i + 1];
  }

  return true;
};

/**
 * Convert path to RegExp
 *
 * @param  {String} path
 * @return {String}
 * @api private
 */

function pathToRegExp(path) {
  if (path instanceof RegExp) return path;
  if (path === '*') return new RegExp('^.*$');

  var pathExp = '^';
  path = path.split('/').splice(1, path.length);

  for (var i = 0, len = path.length; i < len; i++) {
    pathExp += '\\/' + path[i]
      .replace(/(\(|\)|\[|\]|\\|\.|\^|\$|\||\?|\+)/g, '\\$1')
      .replace(/([*])/g, '.*')
      .replace(/(:\w+)/g, '(.+)');
  }

  pathExp += '$';
  return new RegExp(pathExp);
}

/**
 * Convert path to keys array
 *
 * @param  {String} path
 * @return {Array}
 * @api private
 */

function pathToKeys(path) {
  if (path instanceof RegExp) return [];
  var params = path.match(/:(\w+)/g) || [];

  for (var i = 0, len = params.length; i < len; i++) {
    params[i] = params[i].substr(1);
  }

  return params;
}
