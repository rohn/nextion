'use strict';

exports.__esModule = true;
exports.System = exports.SYSTEM_VARIABLES = undefined;

var _fp = require('lodash/fp');

var _fp2 = _interopRequireDefault(_fp);

var _events = require('events');

var _util = require('./util');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * These are the names of the internal system variables.
 * @type {string[]}
 * @private
 */
const SYSTEM_VARIABLES = exports.SYSTEM_VARIABLES = ['sys0', 'sys1', 'sys2'];

/**
 * System-level Nextion device functionality.
 * @extends {EventEmitter}
 */
class System extends _events.EventEmitter {
  /**
   * Creates a {@link System} instance.
   * @param {UART} uart - UART instance.
   */
  constructor(uart) {
    super();

    this.uart = uart;
  }

  /**
   * Sets value of system variable.
   * @param {string} name - Name of system variable; either `sys0`, `sys1`, or
   *   `sys2`.
   * @param {number} value - Must be an unsigned integer less than or equal to
   *   `4294967295`.
   * @returns {Promise<ResponseResult,TypeError>} Response or {@link TypeError}
   *   if invalid `name` or `value`
   */
  setSystemVariable(name, value) {
    return Promise.resolve().then(() => {
      if (!_fp2.default.includes(name, SYSTEM_VARIABLES)) {
        throw new TypeError(`"name" must be one of: ${SYSTEM_VARIABLES.join(', ')}, but found "${name}"`);
      }
      if (!(0, _util.isUnsignedInteger)(value)) {
        throw new TypeError(`"value" must be an unsigned integer <= ${_util.MAX_INT}; got ${value}`);
      }
      return this.uart.setValue(name, value);
    });
  }

  /**
   * Sets the range of results returned by {@link System#random}.
   * @param {number} [min=0] - Unsigned integer; no greater than `max`
   * @param {number} [max=4294967295] - Unsigned integer; no less than `min`
   * @returns {Promise.<ResponseResult,TypeError>} Response or {@link
    *   TypeError} if invalid `min` or `max` value
   */
  setRandomRange(min = 0, max = 1) {
    return Promise.resolve().then(() => {
      if (!(0, _util.isUnsignedInteger)(min)) {
        throw new TypeError(`"min" must be an unsigned integer <= ${_util.MAX_INT}`);
      }
      if (!(0, _util.isUnsignedInteger)(max)) {
        throw new TypeError(`"max" must be an unsigned integer <= ${_util.MAX_INT}`);
      }
      if (min > max) {
        throw new TypeError('"min" cannot be greater than "max"');
      }

      return this.uart.request(`ranset ${min},${max}`);
    });
  }

  /**
   * Gets a random value, optionally setting the allowed range via {@link
    * System#setRandomRange}.
   * @param {number} [min=0] - Unsigned integer; no greater than `max`
   * @param {number} [max=0] - Unsigned integer; no less than `min`
   * @returns {Promise<ResponseResult,TypeError>} Result or error if invalid
   *   range supplied
   */
  random(min = 0, max = 0) {
    return Promise.resolve(() => {
      if (min || max) {
        return this.setRandomRange(min, max);
      }
    }).then(() => this.uart.request('rand'));
  }

  /**
   * Set sleep timer when not touched.
   * @param {number} ms - Sleep after `ms` milliseconds of no touching. Rounded
   *   to closest second.
   * @returns {Promise.<ResponseResult, Error>} Result
   */
  setNoTouchSleepTimer(ms = 0) {
    return this.uart.setValue('thsp', Math.floor(ms / 1000));
  }

  /**
   * Puts Nextion to sleep.
   * @see {@link System#wake}
   * @param {boolean} [shouldSleep=true] Sleep if `true`; wake if `false`.
   * @returns {Promise.<ResponseResult, Error>} Result
   */
  sleep(shouldSleep = true) {
    return this.uart.setValue('sleep', shouldSleep);
  }

  /**
   * Wakes Nextion from sleep.
   * @see {@link System#sleep}
   * @returns {Promise.<ResponseResult, Error>} Result
   */
  wake() {
    return this.sleep(false);
  }
}
exports.System = System;
//# sourceMappingURL=system.js.map