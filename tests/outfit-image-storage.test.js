const test = require("node:test");
const assert = require("node:assert/strict");

const storage = require(
    "../src/v2/services/outfits/OutfitImageStorageService"
);

test(
    "l'image d'une tenue est copiee avant expiration du lien Discord",
    async context => {
        const originalFetch = global.fetch;

        global.fetch = async url => {
            assert.equal(
                url,
                "https://cdn.example/look.png"
            );

            return {
                ok: true,
                arrayBuffer:
                    async () => Buffer
                        .from("image-data"),
                headers: {
                    get: () => "image/png"
                }
            };
        };

        context.after(
            () => {
                global.fetch = originalFetch;
            }
        );

        const image = await storage.download({
            name: "look.png",
            url: "https://cdn.example/look.png"
        });

        assert.deepEqual(
            image.data,
            Buffer.from("image-data")
        );
        assert.equal(image.filename, "look.png");
        assert.equal(image.contentType, "image/png");
    }
);
