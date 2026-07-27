class PageRouter {

    constructor() {

        this.routes = new Map();

    }

    register(route, handler) {

        this.routes.set(route, handler);

    }

    resolve(route) {

        return this.routes.get(route);

    }

    parse(customId) {

        const parts = customId.split(":");

        return {

            route:
                parts.slice(0, -1).join(":"),

            parameter:
                parts.at(-1)

        };

    }

}

module.exports =
    new PageRouter();