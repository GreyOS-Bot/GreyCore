const test = require("node:test");
const assert = require("node:assert/strict");

const {
    stubModule
} = require("./helpers/moduleStub");

test(
    "/annonce est réservé au staff et ouvre son formulaire",
    async () => {
        stubModule(
            "src/v2/core/services/StaffCommandAccessService.js",
            {
                requireStaffCommandAccess:
                    async () => true
            }
        );

        const commandPath =
            require.resolve(
                "../src/commands/annonce"
            );
        delete require.cache[commandPath];
        const command = require(
            "../src/commands/annonce"
        );

        let modal;
        await command.execute({
            showModal: async value => {
                modal = value.toJSON();
            }
        });

        assert.equal(
            modal.custom_id,
            "v2_announcement_submit"
        );
        assert.equal(
            modal.components.length,
            3
        );
    }
);

test(
    "l'annonce publie le texte et autorise seulement la mention demandée",
    async () => {
        stubModule(
            "src/v2/core/services/AdministrativePermissionAccessService.js",
            {
                canWrite: () => true
            }
        );
        stubModule(
            "src/v2/core/services/InteractionResponseService.js",
            {
                deferPrivate: async () => {},
                editOrReplyError: async () => {}
            }
        );

        const routerPath =
            require.resolve(
                "../src/v2/router/modals/AnnouncementModalRouter"
            );
        delete require.cache[routerPath];
        const router = require(
            "../src/v2/router/modals/AnnouncementModalRouter"
        );

        let sent;
        let reply;
        const values = {
            announcement_mention: "@everyone",
            announcement_title: "Nouveautés",
            announcement_message: "Le nouveau module est disponible."
        };

        const handled = await router({
            isModalSubmit: () => true,
            customId: "v2_announcement_submit",
            fields: {
                getTextInputValue: id => values[id]
            },
            user: {
                username: "Morgane"
            },
            channel: {
                send: async payload => {
                    sent = payload;
                    return {
                        url: "https://discord.test/annonce"
                    };
                }
            },
            editReply: async payload => {
                reply = payload;
            }
        });

        assert.equal(handled, true);
        assert.equal(sent.content, "@everyone");
        assert.deepEqual(
            sent.allowedMentions,
            { parse: ["everyone"] }
        );
        assert.equal(
            sent.embeds[0].data.title,
            "Nouveautés"
        );
        assert.match(
            reply.content,
            /discord\.test\/annonce/
        );
    }
);
