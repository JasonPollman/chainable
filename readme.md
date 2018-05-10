# chainable
> Creates "chainable", proxied things.

**This module isn't inherently useful by itself, but is a base for creating other useful things.**

`chainable` uses `Proxy` objects to create "chainables". Chainables are simply a set of objects
strung together using Proxy traps. For example:

```js
import Chainable from '@jasonpollman/chainable';

const chainable = Chainable();
console.log(chainable.x.y.z); // Prints 'x.y.z'.
```

There's a number of practical uses for chainables:
- Creating a fetch library where the user uses dot notation to specify a url endpoint
- Creating a SQL generator (i.e. `select('COL1', 'COL2').from('MY_TABLE').where(...)`)
- [Insert imagination...]

The *point*, if you're wondering, is all about the resulting `string` evaluation of a chainable.
The user will make some references `a.b.c`, etc. and it's up to the implementor to determine how
to process the chainable's `toString` value.

## Install
```bash
$ npm install @jasonpollman/chainable --save
```

## About Chainables

### Tokens
Each `chainable` object contains a set of `tokens` that represent its ancestry of "gets".

For example, in:
```js
import Chainable from '@jasonpollman/chainable';

const chainable = Chainable();
const baz = chainable.foo.bar.baz;
```
`baz`'s tokens are `['foo', 'bar', 'baz']`.
Note the initial reference to the chainable (`chainable`) isn't included in the tokens.

### toString
Each chainable has a `.toString` method that will join these tokens using the chainable's `separator`
property.

```js
console.log(baz.toString()); // Prints "foo.bar.baz"
```

By default a chainable's separator property is `.` (a period).

### Storing References
Chainables can be sub-referenced since each time a property is accessed a *new* chainable object
is created. For example:

```js
import Chainable from '@jasonpollman/chainable';

const chainable = Chainable();

console.log(chainable.foo.bar.baz);
// Prints "foo.bar.baz"

const foo = chainable.foo;
const bar = chainable.bar;
console.log(bar.baz);
// Prints "foo.bar.baz", but now I can also do...

console.log(bar.quxx);
// Prints "foo.bar.quxx".
```

### Adding Value
**When a user attempts to access a chainable's property, if it exists on the chainable object (or its prototype) the original value is returned**. If the property doesn't exist a new chainable is
returned (therefore creating the "chained dot notation" behavior).

This is useful, since we can *extend* our chainable with methods. For example, if I wanted to
create an HTTP module using `node-fetch` I could do:

```js
// Note this is a contrived example...

import fetch from 'node-fetch';
import Chainable from '@jasonpollman/chainable';

const api = Chainable({
  // Prefixed to the `toString` method
  prefix: 'http://my-api.com',
  // The "glue" that joins the tokens in the `toString` method
  separator: '/',
  // Implement all methods that each endpoint can call...
  get({ headers, query } = {}) {
    return fetch(...);
  },
  post({ headers, body } = {}) {
    return fetch(...);
  }
});

await api.foo.bar.baz.get();
// Makes a GET request to http://my-api.com/foo/bar/baz

await api.foo.bar.baz.post({ body: JSON.stringify({ ... }) });
// Makes a POST request to http://my-api.com/foo/bar/baz
```

## API

### `chainable({Object} options) => {Proxy}`
**Default Export**    
Creates a chainable proxy object using the supplied options.

```js
import Chainable from '@jasonpollman/chainable';

const chainable = Chainable({ /* options */ });
```

**Options:**

| Property             | Type                   | Default      | Description |
| -------------------- | ---------------------- | ------------ | ----------- |
| prefix               | string\|function\|null | `null`       | A string to prepend to the chainable's `toString` result. |
| suffix               | string\|function\|null | `null`       | A string to append to the chainable's `toString` result. |
| sanitize             | function               | `_.identity` | A function used to sanitize each tokens before converting it to string. |
| separator            | string\|function       | `.`          | The "glue" to use when all of the chainable's tokens are joined. |
| functionalChainlinks | boolean                | `false`      | If `true` chainable links will be functions, not objects and can invoked. |
| handleLinkInvocation | function               | `_.noop`     | The function that's called when a chainable is invoked, only applies when `functionalChainlinks` is true |

### `chainableGeneratorWithDefaults({Object} defaults) => {function}`
Creates a new chainable generator with the supplied defaults. That is, a function that will
combine the given `defaults` with the options provided to the returned function. This is intended
for creating libraries. Using the example above (an api), we can export an api but not specify
the "host" (prefix):

```js
import { chainableGeneratorWithDefaults } from '@jasonpollman/chainable';

const APIBase = chainableGeneratorWithDefaults({
  separator: '/',
  get({ headers, query } = {}) {
    return fetch(...);
  },
  post({ headers, body } = {}) {
    return fetch(...);
  }
});

export default (host) => {
  return APIBase({ prefix: host });
}
```

## Limitations
**This module requires native `Proxy`. A polyfill won't work!**   
Since properties must exist on an object in order for them to be intercepted, replicating
this functionality using purely JavaScript is (AFAIK) impossible.

*Therefore...*

For now, `chainables` are limited to Node 6+ and will work in Chrome/Firefox.
But hey, if you don't care about IE, go for it.