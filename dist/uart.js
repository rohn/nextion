'use strict';

exports.__esModule = true;
exports.UART = exports.REQUEST_TIMEOUT = exports.DEFAULT_RETURN_COMMAND_RESULT = exports.DEFAULT_BAUD_RATE = undefined;

var _events = require('events');

var _serialport = require('serialport');

var _serialport2 = _interopRequireDefault(_serialport);

var _fp = require('lodash/fp');

var _fp2 = _interopRequireDefault(_fp);

var _pMapSeries = require('p-map-series');

var _pMapSeries2 = _interopRequireDefault(_pMapSeries);

var _pify = require('pify');

var _pify2 = _interopRequireDefault(_pify);

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

var _protocol = require('./protocol');

var _util = require('./util');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Factory default baud rate of Nextion is 9600
 * @private
 * @type {number}
 */
const DEFAULT_BAUD_RATE = exports.DEFAULT_BAUD_RATE = 9600;

/**
 * This tells the Nextion to return a command result even if command succeeded
 * @private
 * @type {string}
 */
const DEFAULT_RETURN_COMMAND_RESULT = exports.DEFAULT_RETURN_COMMAND_RESULT = 'always';

/**
 * Timeout in ms we should wait for response from Nextion for various requests
 * @private
 * @type {number}
 */
const REQUEST_TIMEOUT = exports.REQUEST_TIMEOUT = 1000;

/**
 * We use this to find a reasonable serial port
 * @private
 * @type {RegExp}
 */
const PORT_GUESS_REGEX = /usb|acm|^com/i;

/**
 * @ignore
 */
const trace = (0, _debug2.default)('trace:nextion:UART');

/**
 * @ignore
 */
const debug = (0, _debug2.default)('nextion:UART');

/**
 * Applies defaults to an object
 * @param {NextionOptions} obj - Defaults are applied to this object
 * @returns {NextionOptions} Options w/ defaults applied
 * @function
 * @private
 */
const applyDefaults = _fp2.default.defaults({
  returnCommandResult: DEFAULT_RETURN_COMMAND_RESULT,
  baudRate: DEFAULT_BAUD_RATE
});

/**
 * Whether or not to expect the Nextion device to return success/failure codes
 * after each serial command.  Defaults to "always".
 * @typedef {string|boolean|number} ReturnCommandResultValue
 * @private
 */

/**
 * Wraps a SerialPort or similar object; provides convenience methods for
 * interaction with a Nextion over UART.
 * @emits {error} When {@link UART#port} emits `error` or is unexpectedly
 *   disconnected, or when we receive unknown data from the device.
 * @emits {close} When {@link UART#close} successfully completes
 * @extends {EventEmitter}
 */
class UART extends _events.EventEmitter {
  /**
   * Sets some default options
   * @param {EventEmitter|Duplex} port - Serial port interface
   * @param {NextionOptions} [opts={}] - Options
   */
  constructor(port, opts = {}) {
    super();

    if (!(0, _util.isValidPort)(port)) {
      throw new TypeError('"port" must be a Serialport-like object');
    }

    /**
     * Options
     * @type {NextionOptions}
     * @private
     */
    this.opts = applyDefaults(opts);

    /**
     * Internal serial port object
     * @type {Serialport|Duplex|*}
     * @private
     */
    this.port = port;

    /**
     * `true` once we've successfully began listening via {@link UART#bind}.
     * @type {boolean}
     */
    this.ready = false;

    this.on('data', data => {
      try {
        const result = (0, _protocol.read)(data);
        if (result.type === 'event') {
          debug(`Event "${result.name}" (${result.codeByte}); data:`, result.data);
          this.emit('event', result);
        } else if (this.listenerCount('response')) {
          debug(`Response "${result.name}" (${result.codeByte})`);
          this.emit('response', result);
        }
      } catch (err) {
        this.emit('error', err);
      }
    }).on('connect', () => {
      this.ready = true;
    }).on('close', () => {
      this.ready = false;
    });
  }

  /**
   * Asserts readiness of port
   * @returns {Promise<void,Error>} Rejected if port not ready
   * @private
   */
  checkPort() {
    return new Promise((resolve, reject) => {
      if (!this.ready) {
        reject(new Error('Device not ready!'));
      }
      resolve();
    });
  }

  /**
   * Set variable `variableName` to value `value`.
   * Boolean values `true` and `false` become `1` and `0`, respectively.
   * @param {string} variableName - Name of variable, component, system var,
   *   page, etc.
   * @param {*} [value] - Will be coerced to a string.
   * @returns {Promise<ResponseResult, Error>} Result of setting value, or
   *   {@link Error} if device is not ready.
   */
  setValue(variableName, value) {
    return this.checkPort().then(() => {
      if (value === true) {
        value = 1;
      } else if (value === false) {
        value = 0;
      }
      return this.request(`${variableName}=${value}`);
    });
  }

  /**
   * Gets a value
   * @param {string} name - Name; can be `varName.val` or `component.txt`, etc.
   * @returns {Promise<ResponseResult<StringData|NumericData>,Error>} String or
   *   numeric data response (depending on variable's type)
   */
  getValue(name) {
    return this.checkPort().then(() => this.request(`get ${String(name).trim()}`));
  }

  /**
   * Wraps port's `write()` in a {@link Promise}
   * @param {Buffer} data - Data to write
   * @returns {Promise<UART, TypeError>} UART instance, or {@link TypeError} if
   *   `data` is not a {@link Buffer}.
   * @private
   */
  write(data) {
    return new Promise((resolve, reject) => {
      if (!Buffer.isBuffer(data)) {
        return reject(new TypeError('Expected Buffer'));
      }
      trace('Writing:', data);
      this.port.write(data, err => {
        if (err) {
          return reject(err);
        }
        this.port.drain(err => {
          if (err) {
            return reject(err);
          }
          resolve();
        });
      });
    }).then(() => {
      trace('Wrote:', data || '(empty string)');
      return this;
    });
  }

  /**
   * Sends a raw command; does not wait for response.
   * @param {string} [command] - Raw ASCII command, or nothing at all
   * @todo this might need a semaphore.
   * @returns {Promise<UART>} This UART instance
   */
  send(command = '') {
    trace('Sending:', command);
    return this.write(Buffer.concat([Buffer.from(command), _protocol.delimiterBuffer])).then(() => {
      trace('Sent:', command || '(empty string)');
      return this;
    });
  }

  /**
   * Makes a request to a Nextion device, expecting a response.
   * @param {string[]|string} commands - Command(s) to execute
   * @param {number} [timeout=1000] - How long to wait for response (in ms)
   * @returns {Promise<ResponseResult[]|ResponseResult,Error>} Result or array
   *   of results, or {@link Error} if device is not ready.
   */
  request(commands = [], timeout = REQUEST_TIMEOUT) {
    return this.checkPort().then(() => {
      commands = [].concat(commands);
      return (0, _pMapSeries2.default)(commands, command => {
        debug('Beginning request');
        return new Promise((resolve, reject) => {
          const handler = result => {
            debug('Received', result);
            clearTimeout(t);
            return resolve(result);
          };

          this.once('response', handler);

          const t = setTimeout(() => {
            this.removeListener('response', handler);
            reject(new Error(`Timeout of ${timeout}ms exceeded`));
          }, timeout);

          this.send(command).catch(err => {
            this.removeListener('response', handler);
            reject(err);
          });
        });
      });
    }).then(results => commands.length === 1 ? results.shift() : results);
  }

  /**
   * Begins listening for data on the open serial port.
   * If an event is emitted from the Nextion device, an event with a
   * human-readable name will be emitted, along with any extra data, if
   * present.
   * Errors bubble up from the serial port object thru the UART instance.
   * @param {EventEmitter|Duplex} [port] - `Serialport`-like
   *   object to listen for data and errors on.  Defaults to {@link UART#port}.
   * @returns {Promise<UART>} This UART instance
   */
  bind(port) {
    port = port || this.port;
    let nextDelimiterIndex = 0;
    let buf = [];
    port.on('data', data => {
      trace('Received raw data:', data);
      // this is torn from serialport's byte delimiter parser, considering
      // we aren't ensured a Serialport object.
      Array.from(data).forEach(byte => {
        buf.push(byte);
        if (_fp2.default.last(buf) === _protocol.delimiter[nextDelimiterIndex]) {
          nextDelimiterIndex++;
        }
        if (nextDelimiterIndex === _protocol.delimiter.length) {
          buf = Buffer.from(buf);
          this.emit('data', buf);
          buf = [];
          nextDelimiterIndex = 0;
        }
      });
    }).on('error', err => {
      this.emit('error', err);
    }).on('close', () => {
      this.emit('disconnect');
      this.port = null;
      delete this.port;
    }).on('disconnect', err => {
      this.emit('error', err);
    });

    debug('Configuring device...');
    return this.send('sleep=0').then(() => this.setReturnCommandResult(this.opts.returnCommandResult)).then(() => {
      this.emit('connect');
      return this;
    });
  }

  /**
   * Tell the Nextion device to wait (default) or not wait for responses when
   * requests are made.
   * @param {string|number|boolean} [value='always'] - `false`, `0` or `'none'`
   *   to disable waiting for responses; `true`, `1` or `'always'` to enable
   *   waiting for responses.
   * @private
   * @returns {Promise<UART>} This UART instance
   */
  setReturnCommandResult(value = 'always') {
    let commandValue;

    switch (value) {
      case false:
      case 0:
      // falls through
      case 'none':
        commandValue = 0;
        break;
      case 3:
      case true:
      // falls through
      case 'always':
      default:
        commandValue = 3;
    }

    return this.send(`bkcmd=${commandValue}`).then(() => {
      this.opts.returnCommandResult = value;
      debug(`returnCommandResult is now "${value}"`);
      return this;
    });
  }

  /**
   * Stops listening on the serial port, closes it, destroys the reference,
   * kills a kitten, etc.
   * Use {@link Nextion#close} instead.
   * @returns {Promise<UART>} This UART instance
   */
  unbind() {
    const port = this.port;
    this.port = null;
    delete this.port;
    if (_fp2.default.isFunction(port.close)) {
      return (0, _pify2.default)(port.close.bind(port))().then(() => {
        this.emit('disconnect');
        return this;
      });
    }
    this.emit('disconnect');
    return Promise.resolve(this);
  }

  /**
   * Given a {@link Serialport}-like object, create a {@link UART} wrapper.
   * Synchronous, but returns a {@link Promise} for consistency.
   * @param {Serialport|Duplex|*} serialPort - {@link Serialport}-like object
   * @param {NextionOptions} [opts={}] - Options
   * @returns {Promise<UART>} New {@link UART} instance
   */
  static fromSerial(serialPort, opts = {}) {
    return Promise.resolve(new UART(serialPort, opts));
  }

  /**
   * Given a serial port name or path, or object containing one, create a
   * {@link Serialport} instance, open the serial port, then return a {@link
    * UART} instance. If no port name is present, we'll try to autodetect the
   * port.
   * @param {string|NextionOptions} [portName] - Serial port name or path, or
   *   options
   * @param {NextionOptions} [opts={}] - Options
   * @returns {Promise<UART>} New {@link UART} instance
   */
  static fromPort(portName, opts = {}) {
    if (_fp2.default.isObject(portName)) {
      opts = portName;
      portName = portName.port;
    }

    opts = applyDefaults(opts);

    if (portName) {
      return new Promise((resolve, reject) => {
        debug(`Opening port "${portName}" with opts`, opts);
        const serialPort = new _serialport2.default(portName, opts, err => {
          if (err) {
            return reject(err);
          }
          resolve(serialPort);
        });
      }).then(serialPort => {
        debug(`Opened connection to port "${portName}"`);
        return UART.fromSerial(serialPort, _fp2.default.assign(opts, { portName }));
      });
    } else {
      return UART.findPort().then(portName => {
        if (!portName) {
          throw new Error('Could not find a serial device!');
        }
        return UART.fromPort(portName, opts);
      });
    }
  }

  /**
   * Convenience wrapper of {@link UART.fromPort} and {@link UART.fromSerial}.
   * @param {string|Duplex|Serialport} [port] - Port name or object
   * @param {NextionOptions} [opts] - Options
   * @returns {Promise<UART>} New {@link UART} instance
   */
  static from(port, opts = {}) {
    return (0, _util.isValidPort)(port) ? UART.fromSerial(port, opts) : UART.fromPort(port, opts);
  }

  /**
   * Tries to find a device on a serial/COM port.
   * @returns {Promise<string|void>} - Name/path of promising serial port, if
   *   any
   * @private
   */
  static findPort() {
    return (0, _pify2.default)(_serialport2.default.list)().then(_fp2.default.pipe(_fp2.default.pluck('comName'), _fp2.default.filter(portName => PORT_GUESS_REGEX.test(portName)), _fp2.default.head));
  }
}
exports.UART = UART;
//# sourceMappingURL=uart.js.map
