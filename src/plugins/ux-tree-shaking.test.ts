import assert from "node:assert/strict";
import { test } from "vitest";
import { runInNewContext } from "node:vm";
import { uxPureFactories } from "./ux-tree-shaking";

const transform = uxPureFactories().transform as (code: string, id: string) => { code: string } | undefined;
const id = "/node_modules/@clidey/ux/dist/index.js";
const source = `
import * as React from "react";
import { forwardRef as ref, createContext as context } from "react";
const marker = "asChild";
function register(component) { return component[marker] = true, component; }
const Button = React.forwardRef(function Button() { return "button"; });
register(Button);
const Input = ref(function Input() { return "input"; });
register(Input), globalThis.ready = true;
const Context = context({ value: 1 });
function nested(React) { return React.forwardRef(() => "local"); }
globalThis.result = { Button, Input, Context, nested };
`;

test("preserves component identities and asChild registration", () => {
  const transformed = transform(source, id)!.code;
  const evaluate = (code: string) => {
    const React = { forwardRef: (render: unknown) => render, createContext: (value: unknown) => value };
    const sandbox: any = { React, ref: React.forwardRef, context: React.createContext };
    runInNewContext(code.replace(/^import .*;$/gm, ""), sandbox);
    return sandbox;
  };
  for (const code of [source, transformed]) {
    const { result, ready } = evaluate(code);
    assert.equal(ready, true);
    assert.equal(result.Button(), "button");
    assert.equal(result.Input(), "input");
    assert.equal(result.Button.asChild, true);
    assert.equal(result.Input.asChild, true);
    assert.equal(result.Context.value, 1);
  }
  assert.match(transformed, /\/\* @__PURE__ \*\/ register\(/);
  assert.match(transformed, /function nested\(React\) \{ return React.forwardRef/);
});

test("leaves unrelated dependencies unchanged", () => {
  assert.equal(transform(source, "/other/index.js"), undefined);
});

test("does not treat a registration with other effects as pure", () => {
  const changed = source.replace("return component[marker]", "globalThis.effect = true; return component[marker]");
  const transformed = transform(changed, id)!.code;
  assert.match(transformed, /register\(Button\);/);
  assert.doesNotMatch(transformed, /\/\* @__PURE__ \*\/ register/);
});
