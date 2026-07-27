class Page {

    create({

        embed,

        components = []

    }) {

        return {

            embeds: [embed],

            components

        };

    }

}

module.exports =
    new Page();