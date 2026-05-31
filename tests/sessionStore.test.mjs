import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

class MemoryStorage {
  values = new Map();

  getItem(key) {
    return this.values.get(key) ?? null;
  }

  setItem(key, value) {
    this.values.set(key, value);
  }

  removeItem(key) {
    this.values.delete(key);
  }
}

Object.defineProperty(globalThis, "sessionStorage", {
  configurable: true,
  value: new MemoryStorage(),
});

const source = fs.readFileSync(new URL("../src/lib/sessionStore.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
  fileName: "sessionStore.ts",
});

const module = { exports: {} };
vm.runInNewContext(outputText, {
  console,
  exports: module.exports,
  module,
  sessionStorage: globalThis.sessionStorage,
});

const {
  getSelectedController,
  getSessionRobotData,
  isSessionControllerAvailable,
  normalizeSessionSelection,
  setSessionRobotData,
} = module.exports;

assert.equal(normalizeSessionSelection(" unknown "), null);
assert.equal(normalizeSessionSelection("ps5joystick"), "ps5joystick");

setSessionRobotData({
  robot: "69",
  controller: "unknown",
  mode: "train",
});

assert.equal(getSelectedController(), null);
const restored = getSessionRobotData();
assert.equal(restored.robot, "69");
assert.equal(restored.controller, null);
assert.equal(restored.mode, "train");

setSessionRobotData({
  robot: "69",
  controller: "ps5joystick",
  mode: "train",
});
setSessionRobotData({
  robot: "69",
  controller: null,
  mode: "train",
});

assert.equal(getSelectedController(), null);

assert.equal(
  isSessionControllerAvailable("ps5joystick", [
    { id: "ps5joystick" },
  ]),
  true,
);
assert.equal(
  isSessionControllerAvailable("PS5Joystick", [
    { id: "ps5joystick" },
  ]),
  true,
);
assert.equal(
  isSessionControllerAvailable("ps5joystick", [
    { id: "ps5-joystick" },
  ]),
  true,
);
assert.equal(
  isSessionControllerAvailable("oculus", [
    { id: "ps5joystick" },
  ]),
  false,
);
assert.equal(
  isSessionControllerAvailable("unknown", [
    { id: "ps5joystick" },
  ]),
  false,
);
assert.equal(isSessionControllerAvailable("ps5joystick", []), false);
