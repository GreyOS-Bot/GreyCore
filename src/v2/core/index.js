module.exports = {

    constants: {

        InstallationStatus:
            require("./constants/InstallationStatus"),

        ValidationAction:
            require("./constants/ValidationAction")

    },

    context: {

        InstallationContext:
            require("./context/InstallationContext")

    },

    services: {

        installationContext:
            require("./services/InstallationContextService")

    },

    policies: {

    validation:
        require("./policies/ValidationPolicy")

    },

};