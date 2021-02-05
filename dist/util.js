'use strict';

exports.__esModule = true;
exports.isUnsignedInteger = exports.isValidPort = exports.toHex = exports.MAX_INT = undefined;

var _fp = require('lodash/fp');

var _fp2 = _interopRequireDefault(_fp);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Largest unsigned integer Nextion can handle (I think)
 * @type {number}
 * @private
 */
const MAX_INT = exports.MAX_INT = 4294967295;

/**
 * Converts decimal to a string hexadecimal representation beginning with `0x`.
 * @param {number} num - Number to convert
 * @type {Function}
 * @private
 * @returns {string} Hexadecimal representation of number
 */
const toHex = exports.toHex = _fp2.default.pipe(num => num.toString(16), _fp2.default.padCharsStart('0x0', 4));

/**
 * Returns `true` if `value` quacks like a {@link Serialport} object.
 * @type {Function}
 * @param {*} value - Value to test
 * @private
 * @returns {boolean} Result
 */
const isValidPort = exports.isValidPort = _fp2.default.allPass([_fp2.default.isObject, _fp2.default.pipe(_fp2.default.property('on'), _fp2.default.isFunction), _fp2.default.pipe(_fp2.default.property('write'), _fp2.default.isFunction), _fp2.default.pipe(_fp2.default.property('drain'), _fp2.default.isFunction)]);

/**
 * Returns `true` if unsigned integer and <= 4294967295.
 * @param {*} value - Value to test
 * @private
 * @returns {boolean} Result
 */
const isUnsignedInteger = exports.isUnsignedInteger = _fp2.default.allPass([_fp2.default.isNumber, _fp2.default.isFinite, _fp2.default.isInteger, _fp2.default.gte(_fp2.default, 0), _fp2.default.lte(_fp2.default, MAX_INT)]);
//# sourceMappingURL=util.js.map