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
