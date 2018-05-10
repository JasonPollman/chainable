import _ from 'lodash';
import sinon from 'sinon';
import { expect } from 'chai';
import chainable, { chainableGeneratorWithDefaults } from '../src/chainable';

describe('chainable', () => {
  it('Should be a function', () => {
    expect(chainable).to.be.a('function');
  });

  it('Should create a new chainable (no options supplied)', () => {
    const example = chainable();
    expect(example).to.be.an('object');
    expect(example.prefix()).to.equal(null);
    expect(example.suffix()).to.equal(null);
    expect(example.separator()).to.equal('.');
    expect(example.sanitize).to.equal(_.identity);
    expect(example.handleLinkInvocation).to.equal(_.noop);
    expect(example.a.b.c.toString()).to.be.equal('a.b.c');
  });

  it('Should create a new chainable (no options supplied, sub-referencing)', () => {
    const example = chainable();
    expect(example).to.be.an('object');

    const { a } = example;
    expect(a.toString()).to.equal('a');

    const { b } = a;
    expect(b.toString()).to.equal('a.b');

    const { b2 } = a;
    expect(b2.toString()).to.equal('a.b2');

    const { c } = a;
    expect(c.toString()).to.equal('a.c');

    const { d } = b;
    expect(d.toString()).to.equal('a.b.d');
  });

  it('Should create a new chainable (sub-referencing, with prefix)', () => {
    const example = chainable({
      prefix: 'foo',
    });

    expect(example).to.be.an('object');

    const { a } = example;
    expect(a.toString()).to.equal('foo.a');

    const { b } = a;
    expect(b.toString()).to.equal('foo.a.b');

    const { b2 } = a;
    expect(b2.toString()).to.equal('foo.a.b2');

    const { c } = a;
    expect(c.toString()).to.equal('foo.a.c');

    const { d } = b;
    expect(d.toString()).to.equal('foo.a.b.d');
  });

  it('Should create a new chainable (sub-referencing, with prefix and suffix)', () => {
    const example = chainable({
      prefix: 'foo',
      suffix: 'bar',
    });

    expect(example).to.be.an('object');

    const { a } = example;
    expect(a.toString()).to.equal('foo.a.bar');

    const { b } = a;
    expect(b.toString()).to.equal('foo.a.b.bar');

    const { b2 } = a;
    expect(b2.toString()).to.equal('foo.a.b2.bar');

    const { c } = a;
    expect(c.toString()).to.equal('foo.a.c.bar');

    const { d } = b;
    expect(d.toString()).to.equal('foo.a.b.d.bar');
  });

  it('Should create a new chainable (with extender)', () => {
    const example = chainable({
      prefix: 'foo',
      suffix: 'bar',
      chuck: () => ({ norris: true }),
    });

    expect(example).to.be.an('object');

    const { a } = example;
    expect(a.toString()).to.equal('foo.a.bar');

    const { b } = a;
    expect(b.toString()).to.equal('foo.a.b.bar');

    const { b2 } = a;
    expect(b2.toString()).to.equal('foo.a.b2.bar');

    const { c } = a;
    expect(c.toString()).to.equal('foo.a.c.bar');

    const { d } = b;
    expect(d.toString()).to.equal('foo.a.b.d.bar');

    _.each([a, b, c, d], item => expect(item.chuck()).to.eql({ norris: true }));
  });

  it('Should create a new chainable (custom separator)', () => {
    const example = chainable({
      prefix: 'foo',
      suffix: 'bar',
      separator: '/',
    });

    expect(example).to.be.an('object');

    const { a } = example;
    expect(a.toString()).to.equal('foo/a/bar');

    const { b } = a;
    expect(b.toString()).to.equal('foo/a/b/bar');

    const { b2 } = a;
    expect(b2.toString()).to.equal('foo/a/b2/bar');

    const { c } = a;
    expect(c.toString()).to.equal('foo/a/c/bar');

    const { d } = b;
    expect(d.toString()).to.equal('foo/a/b/d/bar');
  });

  it('Should create a new chainable (custom separator, with sanitze defined)', () => {
    const example = chainable({
      prefix: 'foo',
      suffix: 'bar',
      separator: '/',
      sanitize: value => value.replace(/\//g, '-'),
    });

    expect(example).to.be.an('object');

    const { a } = example;
    expect(a.toString()).to.equal('foo-a-bar');

    const { b } = a;
    expect(b.toString()).to.equal('foo-a-b-bar');
  });

  it('Should create a new chainable (custom separator, with sanitzeLinks defined)', () => {
    const example = chainable({
      prefix: 'foo',
      suffix: 'bar',
      separator: '/',
      sanitize: value => value.replace(/\//g, '-'),
      sanitizeLinks: link => link.replace(/([ab])/g, ($0, $1) => $1.toUpperCase()),
    });

    expect(example).to.be.an('object');

    const { a } = example;
    expect(a.toString()).to.equal('foo-A-bar');

    const { b } = a;
    expect(b.toString()).to.equal('foo-A-B-bar');
  });

  it('Should create a new chainable (functional links)', () => {
    const example = chainable({
      invocableLinks: true,
    });

    expect(example.a().b().c().toString()).to.equal('a.b.c');
    expect(example.a().b().toString()).to.equal('a.b');

    const { c } = example.a.b;
    expect(c().toString()).to.equal('a.b.c');
  });

  it('Should create a new chainable (functional links, custom handler)', () => {
    const example = chainable({
      invocableLinks: true,
      handleLinkInvocation: ({
        tokens,
        prefix,
        suffix,
        property,
        sanitize,
        separator,
        sanitizeLinks,
        handleLinkInvocation,
      }) => {
        expect(property).to.be.oneOf(['a', 'b', 'c']);
        expect(prefix()).to.equal(null);
        expect(suffix()).to.equal(null);
        expect(separator()).to.equal('.');
        expect(sanitize).to.equal(_.identity);
        expect(sanitizeLinks).to.equal(_.identity);
        expect(handleLinkInvocation).to.be.a('function');
        expect(tokens.length).to.gte(1);
      },
    });

    expect(example.a().b().c().toString()).to.equal('a.b.c');
    expect(example.a().b().toString()).to.equal('a.b');

    const { c } = example.a.b;
    expect(c().toString()).to.equal('a.b.c');
  });

  it('Should create a new chainable (functional links, custom handler, 2)', () => {
    const example = chainable({
      invocableLinks: true,
      handleLinkInvocation: ({
        tokens,
        prefix,
        suffix,
        property,
        sanitize,
        separator,
        sanitizeLinks,
        handleLinkInvocation,
      }) => {
        expect(property).to.be.oneOf(['a', 'b', 'c']);
        expect(prefix()).to.equal(null);
        expect(suffix()).to.equal(null);
        expect(separator()).to.equal('.');
        expect(sanitizeLinks).to.equal(_.identity);
        expect(sanitize).to.equal(_.identity);
        expect(handleLinkInvocation).to.be.a('function');
        expect(tokens.length).to.gte(1);
        tokens.push('hello');
      },
    });

    expect(example.a().b().c().toString()).to.equal('a.hello.b.hello.c.hello');
    expect(example.a().b().toString()).to.equal('a.hello.b.hello');
  });

  it('Should create a new chainable (with string input)', () => {
    const example = chainable('foo');
    expect(example.a.b.c.toString()).to.equal('foo.a.b.c');
  });

  describe('chainableGeneratorWithDefaults', () => {
    it('Should be a function', () => {
      expect(chainableGeneratorWithDefaults).to.be.a('function');
    });

    it('Should create a chainable factory the given defaults (no default provided)', () => {
      const fooChainable = chainableGeneratorWithDefaults();

      expect(fooChainable).to.be.a('function');
      const foo = fooChainable({ suffix: 'bar' });
      expect(foo[1][2][3].toString()).to.equal('1.2.3.bar');
    });

    it('Should create a chainable factory the given defaults', () => {
      const fooChainable = chainableGeneratorWithDefaults({
        prefix: 'foo',
      });

      expect(fooChainable).to.be.a('function');
      const foo = fooChainable({ suffix: 'bar' });
      expect(foo[1][2][3].toString()).to.equal('foo.1.2.3.bar');
    });

    it('Should create a chainable factory the given defaults (with extender)', () => {
      const fooChainable = chainableGeneratorWithDefaults({
        prefix: 'foo',
        hello: () => 'world!',
      });

      expect(fooChainable).to.be.a('function');
      const foo = fooChainable({ suffix: 'bar' });
      expect(foo[1][2][3].hello()).to.equal('world!');
    });

    it('Should create a chainable factory the given defaults (with async extender)', async () => {
      const fooChainable = chainableGeneratorWithDefaults({
        prefix: 'foo',
        hello: () => Promise.resolve('world!'),
      });

      expect(fooChainable).to.be.a('function');
      const foo = fooChainable({ suffix: 'bar' });
      const promise = foo.hello();

      expect(promise.then).to.be.a('function');
      expect(await promise).to.equal('world!');
    });
  });

  describe('Examples', () => {
    it('Should work as expected', () => {
      const stub = sinon.stub(console, 'log');

      const instance = chainable({
        invocableLinks: true,
        handleLinkInvocation: (properties, value) => {
          // eslint-disable-next-line no-console
          console.log(`Property ${properties.property} invoked with ${value}!`);
        },
      });

      try {
        expect(instance.foo(1).bar(2).baz(3).toString()).to.equal('foo.bar.baz');
        expect(stub.getCall(0).args[0]).to.equal('Property foo invoked with 1!');
        expect(stub.getCall(1).args[0]).to.equal('Property bar invoked with 2!');
        expect(stub.getCall(2).args[0]).to.equal('Property baz invoked with 3!');
      } finally {
        stub.restore();
      }
    });
  });
});
