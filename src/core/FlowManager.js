class FlowManager {

    constructor() {

        this.flows = new Map();

    }

    register(name, flow) {

        this.flows.set(name, flow);

    }

    get(name) {

        return this.flows.get(name);

    }

}

module.exports =
    new FlowManager();