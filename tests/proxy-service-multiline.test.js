const test = require("node:test");
const assert = require("node:assert/strict");

const {
    parseProxy
} = require("../src/services/proxyService");

test(
    "un proxy conserve les espaces et paragraphes du dialogue",
    () => {
        assert.deepEqual(
            parseProxy(
                "Reya: blablabla\n\nblablabla"
            ),
            {
                character: "Reya",
                content:
                    "blablabla\n\nblablabla"
            }
        );
    }
);
