const test = require("node:test");
const assert = require("node:assert/strict");

const outfitView = require(
    "../src/v2/views/outfit/OutfitV2View"
);

test(
    "une tenue avec image durable est envoyee en piece jointe",
    () => {
        const response = outfitView.build(
            {
                id: "character",
                proxy_name: "Iria"
            },
            {
                id: "continuity"
            },
            {
                id: 42,
                image_url:
                    "https://expired.example/image.png",
                image_data:
                    Buffer.from("image"),
                image_filename:
                    "look.webp",
                title: "Look test"
            }
        );

        assert.equal(
            response.files[0].name,
            "greycore-outfit-42.webp"
        );
        assert.deepEqual(
            response.attachments,
            []
        );
        assert.equal(
            response.embeds[0]
                .toJSON()
                .image.url,
            "attachment://greycore-outfit-42.webp"
        );
    }
);
