# Greybot and GreyCore characters

The local file `C:\Greycore\data\greycore.sqlite` is a development database.
It is ignored by Git and is not synchronized with the VPS.

The production database used by GreyCore on the VPS is:

```text
/home/greyos/apps/GreyCore/data/greycore.sqlite
```

Greybot must run on the VPS and read that shared database. In Greybot's `.env`:

```text
GREYCORE_DATABASE_PATH=/home/greyos/apps/GreyCore/data/greycore.sqlite
```

Greybot can use GreyCore's read-only character contract:

```js
const {
    getPlayableCharactersForGuild
} = require(
    "/home/greyos/apps/GreyCore/src/integrations/GreybotCharacterSource"
);

const characters = getPlayableCharactersForGuild(guildId);
```

Each item includes `id`, `guild_id`, `owner_id`, `name`, and `avatar`. Only
approved, installed, proxy-enabled, non-archived player characters are
returned. Greybot can then filter `owner_id` using the QBQ participants.

Do not copy the database between the PC and VPS. Both bots must use the same
production file on the VPS.
