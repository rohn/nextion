'use strict';

exports.__esModule = true;
exports.Nextion = undefined;

var _events = require('events');

var _system = require('./system');

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

var _fp = require('lodash/fp');

var _fp2 = _interopRequireDefault(_fp);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * @ignore
 */
const debug = (0, _debug2.default)('nextion:Nextion');

/**
 * Applies defaults to an object
 * @param {NextionOptions} obj - Defaults are applied to this object
 * @returns {NextionOptions} Options w/ defaults applied
 * @function
 * @private
 */
const applyDefaults = _fp2.default.defaults({
  // XXX: does nothing yet
  enhanced: true
});

/**
 * High-level abstraction for interacting with a Nextion device.
 * @extends {EventEmitter}
 */
class Nextion extends _events.EventEmitter {
  /**
   * Begins listening for data via a {@link UART} instance.
   * @param {UART} uart - {@link UART} instance
   * @param {Object|Function} [opts] - Options or `connectListener`
   * @param {Function} [connectListener] - Callback to run when listening for
   *   Nextion data
   * @emits {error} When binding via `uart` fails
   * @throws {ReferenceError} When `uart` is missing
   */
  constructor(uart, opts = {}, connectListener = _fp2.default.noop) {
    if (!uart) {
      throw new ReferenceError('Invalid parameters; Use Nextion.from(), Nextion.fromSerial(), or Nextion.fromPort()');
    }

    super();

    if (_fp2.default.isFunction(opts)) {
      connectListener = opts;
      opts = {};
    }

    this.on('connected', () => {
      debug('Nextion ready!');
      connectListener();
    });

    /**
     * Options
     * @type {Object}
     * @private
     */
    this.opts = applyDefaults(opts);

    /**
     * Internal UART instance
     * @type {UART}
     * @private
     */
    this.uart = uart;

    // when a Nextion event occurs, re-emit it with event name
    uart.on('event', result => {
      debug(`Emitting event "${result.name}"`);
      this.emit(result.name, result.data);
    }).on('disconnected', () => {
      debug('Nextion disconnected!');
    }).bind().then(() => {
      this.emit('connected');
    }).catch(err => {
      this.emit('error', err);
    });

    /**
     * System-level Nextion commands
     * @type {System}
     */
    this.system = new _system.System(uart);

    debug('Instantiated');
  }

  /**
   * Sets a local or global variable on the current page to a value
   * @param {string} name - Name of variable
   * @param {*} [value] - New variable value
   * @returns {Promise<ResponseResult<*>,Error>} Result
   */
  setValue(name, value) {
    // return this.uart.write(name + '=' + value); //rohn
    return this.uart.setValue(name, value);
  }

  /**
     Sets a page active
   */
  setPage (page) {
    console.log('page => ', `page ${page}`);
    return this.uart.request(`page ${page}`);
  }

  bringToFront(objName) {
    console.log('ref objname => ', `ref ${objName}`);
    return this.uart.request(`ref ${objName}`);
  }

  setScreenBrightness(value) {
    return this.uart.request(`dim=${value}`);
  }

  /**
     Show/hide an element
   */
   setVisible(name, visible) {
     return this.uart.request(`vis ${name},${visible ? '1' : '0'}`);
   }

  /**
   * Sets a the value of a local component
   * @param {string} name - Name of component
   * @param {*} [value] - New component value
   * @returns {Promise<ResponseResult<*>,Error>} Result
   */
  setComponentValue(name, value) {
    return this.setVariableValue(`${name}.val`, value);
  }

  /**
   * Get a value
   * @param {string} name - Name; can be `varName.val` or `component.txt`, etc.
   * @returns {Promise<ResponseResult<StringData|NumericData>,Error>} String or
   *   numeric data response (depending on variable's type)
   */
  getValue(name) {
    return this.uart.getValue(name);
  }

  /**
   * Closes connection to Nextion device.
   * @returns {Promise<Nextion>} This instance
   */
  close() {
    return this.uart.unbind().then(() => {
      return this;
    });
  }
}

exports.Nextion = Nextion;
Nextion.prototype.setVariableValue = Nextion.prototype.setValue;
//# sourceMappingURL=nextion.js.map
