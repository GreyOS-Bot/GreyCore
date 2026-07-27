const test =
    require("node:test");
const assert =
    require("node:assert/strict");

const {
    stubModule
} = require("./helpers/moduleStub");

test(
    "les contacts téléphone gardent création, recherche et réglages après leur découpe",
    () => {
        const contacts =
            new Map();
        const phoneDetails =
            new Map([
                [
                    1,
                    {
                        id:
                            1,
                        phone_number:
                            "555-0001",
                        character_name:
                            "Alba"
                    }
                ],
                [
                    2,
                    {
                        id:
                            2,
                        phone_number:
                            "555-0002",
                        character_name:
                            "Billie"
                    }
                ]
            ]);

        let nextContactId =
            100;

        const repository = {
            runInTransaction:
                operation =>
                    operation(),
            getById:
                contactId =>
                    contacts.get(
                        Number(contactId)
                    )
                    || null,
            getForPhone:
                phoneId =>
                    Array.from(
                        contacts.values()
                    )
                        .filter(
                            contact =>
                                Number(
                                    contact.phone_id
                                ) ===
                                Number(phoneId)
                        )
                        .sort(
                            (
                                contactA,
                                contactB
                            ) =>
                                Number(
                                    contactB.favorite
                                )
                                -
                                Number(
                                    contactA.favorite
                                )
                        ),
            getFavoriteForPhone:
                phoneId =>
                    repository
                        .getForPhone(
                            phoneId
                        )
                        .filter(
                            contact =>
                                Number(
                                    contact.favorite
                                ) === 1
                        ),
            getBlockedForPhone:
                phoneId =>
                    repository
                        .getForPhone(
                            phoneId
                        )
                        .filter(
                            contact =>
                                Number(
                                    contact.blocked
                                ) === 1
                        ),
            getByLinkedPhone:
                (
                    ownerPhoneId,
                    linkedPhoneId
                ) =>
                    Array.from(
                        contacts.values()
                    ).find(
                        contact =>
                            Number(
                                contact.phone_id
                            ) ===
                                Number(
                                    ownerPhoneId
                                )
                            && Number(
                                contact
                                    .linked_phone_id
                            ) ===
                                Number(
                                    linkedPhoneId
                                )
                    )
                    || null,
            getExternal:
                (
                    ownerPhoneId,
                    displayName,
                    phoneNumber
                ) =>
                    Array.from(
                        contacts.values()
                    ).find(
                        contact =>
                            Number(
                                contact.phone_id
                            ) ===
                                Number(
                                    ownerPhoneId
                                )
                            && !contact
                                .linked_phone_id
                            && contact
                                .display_name
                                .toLowerCase() ===
                                displayName
                                    .toLowerCase()
                            && (
                                contact
                                    .phone_number
                                || null
                            ) ===
                                (
                                    phoneNumber
                                    || null
                                )
                    )
                    || null,
            getPhoneById:
                phoneId =>
                    phoneDetails.get(
                        Number(phoneId)
                    )
                    || null,
            getPhoneDetails:
                phoneId =>
                    phoneDetails.get(
                        Number(phoneId)
                    )
                    || null,
            updateGreycoreContact:
                data => {
                    Object.assign(
                        contacts.get(
                            Number(
                                data.contactId
                            )
                        ),
                        {
                            display_name:
                                data.displayName,
                            phone_number:
                                data.phoneNumber,
                            contact_type:
                                "greycore",
                            updated_at:
                                data.updatedAt
                        }
                    );
                },
            insertGreycoreContact:
                data => {
                    const id =
                        nextContactId++;

                    contacts.set(
                        id,
                        {
                            id,
                            phone_id:
                                Number(
                                    data.ownerPhoneId
                                ),
                            linked_phone_id:
                                Number(
                                    data.linkedPhoneId
                                ),
                            contact_type:
                                "greycore",
                            display_name:
                                data.displayName,
                            phone_number:
                                data.phoneNumber,
                            favorite:
                                data.favorite,
                            pinned:
                                data.pinned,
                            blocked:
                                data.blocked,
                            interaction_count:
                                0,
                            notes:
                                null
                        }
                    );

                    return id;
                },
            updateExternalContact:
                data => {
                    Object.assign(
                        contacts.get(
                            Number(
                                data.contactId
                            )
                        ),
                        {
                            contact_type:
                                data.contactType,
                            favorite:
                                data.favorite,
                            pinned:
                                data.pinned,
                            blocked:
                                data.blocked,
                            notes:
                                data.notes,
                            updated_at:
                                data.updatedAt
                        }
                    );
                },
            insertExternalContact:
                data => {
                    const id =
                        nextContactId++;

                    contacts.set(
                        id,
                        {
                            id,
                            phone_id:
                                Number(
                                    data.ownerPhoneId
                                ),
                            linked_phone_id:
                                null,
                            contact_type:
                                data.contactType,
                            display_name:
                                data.displayName,
                            phone_number:
                                data.phoneNumber,
                            favorite:
                                data.favorite,
                            pinned:
                                data.pinned,
                            blocked:
                                data.blocked,
                            interaction_count:
                                0,
                            notes:
                                data.notes
                        }
                    );

                    return id;
                },
            updateContact:
                data => {
                    Object.assign(
                        contacts.get(
                            Number(
                                data.contactId
                            )
                        ),
                        {
                            display_name:
                                data.displayName,
                            phone_number:
                                data.phoneNumber,
                            favorite:
                                data.favorite,
                            pinned:
                                data.pinned,
                            blocked:
                                data.blocked,
                            notes:
                                data.notes,
                            updated_at:
                                data.updatedAt
                        }
                    );
                },
            registerInteraction:
                (
                    contactId,
                    occurredAt
                ) => {
                    const contact =
                        contacts.get(
                            Number(contactId)
                        );

                    contact.interaction_count +=
                        1;
                    contact.last_interaction_at =
                        occurredAt;
                },
            search:
                (
                    ownerPhoneId,
                    query,
                    limit
                ) =>
                    repository
                        .getForPhone(
                            ownerPhoneId
                        )
                        .filter(
                            contact =>
                                !contact.blocked
                                && (
                                    contact
                                        .display_name
                                        .toLowerCase()
                                        .includes(
                                            query
                                                .toLowerCase()
                                        )
                                    || contact
                                        .phone_number
                                        ?.includes(
                                            query
                                        )
                                )
                        )
                        .slice(
                            0,
                            limit
                        ),
            deleteById:
                contactId =>
                    contacts.delete(
                        Number(contactId)
                    )
        };

        stubModule(
            "src/v2/managers/phoneContact/PhoneContactRepository.js",
            repository
        );

        const manager =
            require(
                "../src/v2/managers/PhoneContactV2Manager"
            );

        const publicMethods = [
            "getById",
            "getForPhone",
            "getFavoriteForPhone",
            "getBlockedForPhone",
            "getByLinkedPhone",
            "getExternal",
            "createGreycoreContact",
            "createExternalContact",
            "ensureGreycoreContact",
            "ensureMutualGreycoreContacts",
            "update",
            "setFavorite",
            "setPinned",
            "setBlocked",
            "registerInteraction",
            "search",
            "delete",
            "getPhoneById",
            "getPhoneDetails"
        ];

        for (
            const method
            of publicMethods
        ) {
            assert.equal(
                typeof manager[method],
                "function",
                method
            );
        }

        const greycoreContact =
            manager
                .createGreycoreContact(
                    1,
                    2,
                    {
                        favorite:
                            true
                    }
                );

        assert.equal(
            greycoreContact
                .display_name,
            "Billie"
        );

        assert.equal(
            greycoreContact.favorite,
            1
        );

        const refreshedContact =
            manager
                .createGreycoreContact(
                    1,
                    2,
                    {
                        displayName:
                            "  B.  "
                    }
                );

        assert.equal(
            refreshedContact.id,
            greycoreContact.id
        );

        assert.equal(
            refreshedContact
                .display_name,
            "B."
        );

        const mutualContacts =
            manager
                .ensureMutualGreycoreContacts(
                    1,
                    2
                );

        assert.equal(
            mutualContacts.contactA.id,
            greycoreContact.id
        );

        assert.equal(
            mutualContacts
                .contactB
                .phone_id,
            2
        );

        const externalContact =
            manager
                .createExternalContact(
                    1,
                    {
                        displayName:
                            "  Le Taxi  ",
                        phoneNumber:
                            " 555-TAXI ",
                        contactType:
                            "inconnu",
                        notes:
                            "  Nuit  "
                    }
                );

        assert.equal(
            externalContact
                .contact_type,
            "external"
        );

        assert.equal(
            externalContact
                .display_name,
            "Le Taxi"
        );

        assert.equal(
            externalContact.notes,
            "Nuit"
        );

        manager.setPinned(
            externalContact.id,
            true
        );

        manager.setFavorite(
            externalContact.id,
            true
        );

        manager.registerInteraction(
            externalContact.id,
            "2026-07-26T12:00:00.000Z"
        );

        assert.equal(
            manager.getById(
                externalContact.id
            ).pinned,
            1
        );

        assert.equal(
            manager.getById(
                externalContact.id
            ).interaction_count,
            1
        );

        assert.equal(
            manager.search(
                1,
                "taxi"
            )[0].id,
            externalContact.id
        );

        manager.setBlocked(
            externalContact.id,
            true
        );

        assert.equal(
            manager.getBlockedForPhone(
                1
            ).length,
            1
        );

        assert.equal(
            manager.search(
                1,
                "taxi"
            ).length,
            0
        );

        const deleted =
            manager.delete(
                externalContact.id
            );

        assert.equal(
            deleted.id,
            externalContact.id
        );

        assert.equal(
            manager.getById(
                externalContact.id
            ),
            null
        );

        assert.throws(
            () =>
                manager
                    .createGreycoreContact(
                        1,
                        1
                    ),
            /lui-même/
        );

        assert.throws(
            () =>
                manager
                    .createExternalContact(
                        1,
                        {
                            displayName:
                                "   "
                        }
                    ),
            /nom du contact/
        );
    }
);
