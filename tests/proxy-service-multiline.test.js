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

test(
    "un point peut remplacer les deux-points du proxy",
    () => {
        assert.deepEqual(
            parseProxy(
                "Reya. Premier paragraphe\n\nDeuxième paragraphe"
            ),
            {
                character: "Reya",
                content:
                    "Premier paragraphe\n\nDeuxième paragraphe"
            }
        );
    }
);
