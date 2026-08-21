const test = require("node:test");
const assert = require("node:assert/strict");
const { createIsolatedDatabase } = require("./helpers/isolatedDatabase");

test("les lieux d’un forum sont synchronisés puis classés rapidement", () => {
    const isolated = createIsolatedDatabase({ initializeSchema: true });
    try {
        delete require.cache[require.resolve("../src/v2/repositories/PublicPlaceRepository")];
        const repository = require("../src/v2/repositories/PublicPlaceRepository");
        repository.upsertMany("guild", "forum", [
            { id: "restaurant", name: "Chez Alba", archived: false },
            { id: "garage", name: "Garage Nord", archived: true }
        ]);
        assert.equal(repository.getByForum("guild", "forum").length, 2);
        repository.setCategory("guild", "restaurant", "restaurant");
        assert.equal(
            repository.getByForum("guild", "forum").find(place => place.channel_id === "restaurant").category,
            "restaurant"
        );
        assert.deepEqual(
            repository.getPublishedForGuild("guild").map(place => place.channel_id),
            ["restaurant"]
        );
    } finally {
        isolated.cleanup();
    }
});

test("les annuaires volumineux utilisent un seul embed paginé", () => {
    const places = Array.from({ length: 180 }, (_, index) => ({
        channel_id: String(100000000000000000n + BigInt(index)),
        name: `Lieu professionnel ${index.toString().padStart(3, "0")} avec un nom détaillé`,
        category: "restaurant"
    }));
    const playerView = require("../src/v2/views/player/PlayerPublicPlacesView")
        .build("guild", places);
    assert.equal(playerView.embeds.length, 1);
    assert.ok(playerView.components.some(row => row.components.some(component =>
        component.data.custom_id?.startsWith("v2_player_public_places_page:")
    )));
});
