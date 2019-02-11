/***************************************************************************************
 * *    Title: omit-deep
 * *    Author: Jon Schlinkert - jon.schlinkert@sellside.com 
 * *    Modified: Gibran Rodriguez - gibran@everdays.com
 * *    Code version: 0.3.0
 * *    Availability: https://github.com/jonschlinkert/omit-deep
 * *
 * ***************************************************************************************/

var isObject = require('is-plain-object');
var unset = require('unset-value');

module.exports = function omitDeep(value, keys) {
  if (typeof value === 'undefined') {
    return {};
  }

  if (Array.isArray(value)) {
    for (var i = 0; i < value.length; i++) {
      value[i] = omitDeep(value[i], keys);
    }
    return value;
  }

  if (!isObject(value)) {
    return value;
  }

  if (typeof keys === 'string') {
    keys = [keys];
  }

  if (!Array.isArray(keys)) {
    return value;
  }

  for (var j = 0; j < keys.length; j++) {
     unset(value, keys[j]);
  }

  for (var key in value) {
    if (value.hasOwnProperty(key)) {
	var valueKeys =  value[key] && Object.keys(value[key])
        value[key] = omitDeep(value[key], keys);
    }
   if( value[key] && Object.entries(value[key]).length  === 0 &&
       keys.some(v => valueKeys && valueKeys.includes(v))) delete value[key]
  }

  return value;
};
