class InstallationContext {

    constructor(data = {}) {

        this.installation =
            data.installation || null;

        this.character =
            data.character || null;

        this.continuity =
            data.continuity || null;

        this.owner =
            data.owner || null;

        this.guild =
            data.guild || null;

        this.requester =
            data.requester || null;

        this.avatar =
            data.avatar || null;

        this.validation =
            data.validation || {};

    }

    get status() {

        return this.installation?.status;

    }

    get installationId() {

        return this.installation?.id;

    }

    get characterId() {

        return this.character?.id;

    }

    get continuityId() {

        return this.continuity?.id;

    }

    get ownerId() {

        return this.owner?.id;

    }

    get guildId() {

        return this.guild?.id;

    }

    get proxyName() {

        return this.character?.proxy_name;

    }

    get avatarUrl() {

        return (

            this.installation?.local_avatar_url ||

            this.character?.avatar_url ||

            null

        );

    }

}

module.exports = InstallationContext;