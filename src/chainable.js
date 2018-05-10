import _ from 'lodash';
import fp from 'lodash/fp';

/**
 * The default options for a new chain link.
 * These will all be cast as functions so that users
 * can provide functional options if desired.
 * @type {Object}
 */
const defaultChainlinkOptions = {
  prefix: null,
  suffix: null,
  sanitize: _.identity,
  separator: '.',
  handleLinkInvocation: _.noop,
};

/**
 * The functional negation of _.isString
 * @function
 */
const isNotString = _.negate(_.isString);

/**
 * Filters an array by removing all occurrences of `null` and `undefined`.
 * @function
 */
const removeNilValues = fp.filter(fp.negate(fp.isNil));

/**
 * Converts non-function values to a function.
 * @function
 */
const maybeCastFunction = thing => (_.isFunction(thing) ? thing : _.constant(thing));

/**
 * Converts all chainlink options to functions.
 * @function
 */
const functionalizeChainlinkOptions = fp.compose(
  fp.mapValues(maybeCastFunction),
  fp.pick(_.keys(defaultChainlinkOptions)),
);

/**
 * Gets the string representation of a chainlink.
 * @returns {string} This chainlink's string value.
 */
function chainlinkToString() {
  const {
    prefix,
    suffix,
    sanitize,
    separator,
  } = this;

  const expanded = [prefix(this), ...this.tokens.map(sanitize), suffix(this)];
  return removeNilValues(expanded).join(separator(this));
}

/**
 * Creates a method that's called when the associated chainlink is invoked.
 * @param {Object} properties The chainlink's property set.
 * @returns {function} The chainlink's invocable base.
 */
function handleChainlinkInvocation(properties) {
  return function chainlink() {
    this.handleLinkInvocation.call(this, { ...properties });
    return this;
  };
}

/**
 * Creates a new chainlink.
 * @param {Object} options Chainlink creation options.
 * @returns {Object|function} The new chainlink.
 */
function makeChainlink({
  tokens = [],
  functionalChainlinks = false,
  ...options
} = {}) {
  const chainlinkOptionsWithDefaults = _.defaults(options, defaultChainlinkOptions);

  // The set of properties the chainlink will contain.
  // The "base" of the chainlink can be either an object or function
  // if `functionalChainlinks` is true, chainlinks will be functions
  // and will be callable (left up the the user to implement).
  const properties = {
    property: null,

    ...chainlinkOptionsWithDefaults,
    ...functionalizeChainlinkOptions(chainlinkOptionsWithDefaults),

    tokens,
    toString: chainlinkToString,

    // Intentional: to prevent node from borking out when using a function
    // as a base and attempting to util.inspect or console.log the function.
    inspect: undefined,
  };

  const base = functionalChainlinks ? handleChainlinkInvocation(properties) : {};
  return Object.assign(base, properties);
}

/**
 * Creates a new Proxy object for the given chainlink.
 * @param {Object|function} chainlink The chainlink to create the proxy for.
 * @param {function} makeChildlink A function to create a childlink if the
 * desired property doesn't exist on the current chainlink.
 * @returns
 * @export
 */
function proxifyChainlink(chainlink, makeChildlink) {
  return new Proxy(chainlink, {
    /**
     * A proxy trap that will return the requested property if it exists on
     * the target's prototype, or return a "child chainlink" if not. Here,
     * we don't care about non-string properties, since we can't handle
     * them anyways (the user using x.y.z will always produce a string).
     * @param {Object} target The chainable object which is being accessed.
     * @param {string|Symbol} key The name of the property being accessed.
     * @returns {any} The actual value of target[key] or a child chainlink.
     */
    get(target, key) {
      if (key in target || isNotString(key)) return target[key];

      return makeChildlink({
        ...chainlink,
        property: key,
        tokens: [...chainlink.tokens, key],
      });
    },
  });
}

/**
 * Generates chainables and their proxy objects.
 * @param {Object} settings The settings used to create the chainable.
 * @param {function} childlinkGenerator The method used to create children of this link.
 * This is used by `chainableGeneratorWithDefaults` to mixin default options.
 * @returns {Proxy} The chainable's proxy object.
 * @export
 */
export function chainableGenerator(settings = {}, childlinkGenerator = chainableGenerator) {
  const options = _.isString(settings) ? { prefix: settings } : settings;
  return proxifyChainlink(makeChainlink(options), childlinkGenerator);
}

/**
 * Creates a function that will create chainable objects
 * @param {Object} defaults The default options for this chainable object.
 * @returns {function} A function that will create new chainable objects, with
 * the supplied defaults mixed in with the options provided to the function.
 */
export function chainableGeneratorWithDefaults(defaults = {}) {
  const childlinkGenerator = chainableGeneratorWithDefaults(defaults);
  return settings => chainableGenerator(_.defaults(settings, defaults), childlinkGenerator);
}

// Creates the default chainable creation function
// that takes in options and returns a chainable proxy.
export default _.partial(chainableGenerator, _, chainableGenerator);
