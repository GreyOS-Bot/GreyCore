const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const {
    getImageAttachment,
    isImageAttachment
} = require(
    "../src/events/handlers/messageCreate/uploads/ImageAttachment"
);

test(
    "les images sans content type restent accept\u00e9es pour les avatars",
    async () => {
        const attachment = {
            name:
                "avatar.gif"
        };

        assert.equal(
            isImageAttachment(attachment),
            true
        );

        const message = {
            attachments: {
                size: 1,
                first: () => attachment
            },
            reply: async () => {
                throw new Error(
                    "Une image valide ne doit pas \u00eatre refus\u00e9e."
                );
            }
        };

        const received =
            await getImageAttachment(
                message,
                {
                    missingMessage:
                        "missing",
                    invalidMessage:
                        "invalid"
                }
            );

        assert.equal(
            received,
            attachment
        );
    }
);

test(
    "un fichier non image reste refus\u00e9 sans content type",
    async () => {
        const replies = [];

        const received =
            await getImageAttachment(
                {
                    attachments: {
                        size: 1,
                        first: () => ({
                            name:
                                "document.pdf"
                        })
                    },
                    reply: async message =>
                        replies.push(message)
                },
                {
                    missingMessage:
                        "missing",
                    invalidMessage:
                        "invalid"
                }
            );

        assert.equal(received, null);
        assert.deepEqual(replies, ["invalid"]);
    }
);
