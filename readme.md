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
| sanitize             | function               | `_.identity` | A function that provides an opportunity to sanitize the `toString` result when all links are joined. |
| sanitizeLinks        | function               | `_.identity` | A function called on each token, providing the chance to sanitize it. |
| separator            | string\|function       | `.`          | The "glue" to use when all of the chainable's tokens are joined. |
| invocableLinks       | boolean                | `false`      | If `true` chainable links will be functions, not objects and can invoked. |
| handleLinkInvocation | function               | `_.noop`     | The function that's called when a chainable is invoked, only applies when `invocableLinks` is true |

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

## Invocable Chainables
**Chainable objects can be invocable (functions) too.**    
By default `{}` is the template used to create new chainable objects, however if you pass
`invocableLinks` as true and supply a `handleLinkInvocation` function, you can control
what happens when a chainable link is invoked.

```js
import Chainable from '@jasonpollman/chainable';

const chainable = Chainable({
  invocableLinks: true,
  handleLinkInvocation: (link, value) => {
    console.log(`Property ${link.property} invoked with ${value}!`);
  },
})

chainable.foo(1).bar(2).baz(3);
// Prints:
// "Property foo invoked with 1!"
// "Property bar invoked with 2!"
// "Property baz invoked with 3!"
```

The `handleLinkInvocation` is called with the chainable object as the first argument. All remaining
arguments are passed as supplied to the link call.

**There is a caveat to invocable chainables:** They will always return another chainable.
Therefore, the return value from your `handleLinkInvocation` method is ignored and cannot be awaited.

You can determine the property that was invoked using the `link.property` property.

## Limitations
**This module requires native `Proxy`. A polyfill won't work!**   
Since properties must exist on an object in order for them to be intercepted, replicating
this functionality using purely JavaScript is (AFAIK) impossible.

*Therefore...*

For now, `chainables` are limited to Node 6+ and will work in Chrome/Firefox.
But hey, if you don't care about IE, go for it.