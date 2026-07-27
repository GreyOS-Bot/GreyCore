class Outfit {
    constructor(data) {
        this.id = data.id;

        this.characterId =
            data.characterId;

        this.imageUrl =
            data.imageUrl;

        this.title =
            data.title;

        this.description =
            data.description;

        this.isCurrent =
            Boolean(data.isCurrent);

        this.createdAt =
            data.createdAt;

        this.updatedAt =
            data.updatedAt;
    }
}

module.exports = Outfit;