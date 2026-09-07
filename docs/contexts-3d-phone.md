# Phase 3D — Phone scoped par Installation

## Modèle constaté

Le modèle historique rattache `ContinuityPhonesV2` à une Continuity globale. Le numéro y est unique mondialement et les contacts, conversations, messages et appels référencent cet identifiant. Une même Continuity pouvant être installée dans plusieurs Guilds, cette racine ne constitue plus une autorité runtime sûre.

## Modèle canonique 3D

`InstallationPhonesV2` est la racine runtime. Une ligne appartient à une Installation immuable et recopie son `guild_id`, son `context_id` et sa `continuity_id`, vérifiés par triggers. Une Installation possède au plus une instance et un numéro est unique dans `(guild_id, context_id)`.

Les tables `InstallationPhone*V2` portent les contacts, conversations, messages et appels actifs. Les conversations et appels persistent leur Guild et leur Context. Les gardes centrales refusent un Phone, contact, conversation ou appel provenant d’un autre scope.

## Migration et archive legacy

La migration est additive et idempotente. Elle ne supprime, ne renomme et ne reconstruit aucune table historique.

- Une instance active est créée pour chaque Installation possédant un Phone historique.
- Le numéro historique peut être réutilisé dans plusieurs Guilds/Contexts.
- Une Continuity sans Installation ne provoque aucune création artificielle.
- Une Continuity multi-Installation produit plusieurs instances actives, mais son historique n’est jamais dupliqué.
- Contacts, conversations, messages et appels ne sont copiés vers le runtime que lorsque chaque Phone impliqué se résout vers une seule Installation et le même `(guild_id, context_id)`.
- Toute donnée non déterministe reste dans les tables historiques, répertoriée par `InstallationPhoneLegacyArchiveV2` et accessible par l’API read-only `getLegacyArchive`.

Les tables historiques sont exclues de la résolution de numéro, des destinataires, des notifications et des écritures du nouveau runtime.

## Compatibilité et résolution

Les nouvelles actions utilisent une Installation sélectionnée. Une valeur de Context explicite invalide ou cross-Guild échoue sans fallback. Les anciens parcours peuvent résoudre le Context par défaut avant de choisir une Installation, mais une ligne Phone, conversation ou appel déjà créée conserve toujours son Context persisté.

Un Context inactif reste consultable en lecture historique. Toute nouvelle mutation y est refusée. Il n’existe aucun héritage Parent/Child et un changement de Context par défaut ne déplace aucune donnée.

## Numéros, contacts, SMS et appels

Les numéros sont résolus par `(guild_id, context_id, phone_number)`. Contacts et blocages sont propres au Phone d’Installation. Les conversations, SMS et appels exigent des participants appartenant à la même Guild et au même Context. Les transitions d’appel rechargent l’appel et revalident le participant avant mutation.

Le délai officiel reste `RINGING_CALL_MAXIMUM_AGE_SECONDS = 43200`. Le cleanup stale reste globalement sûr parce que chaque appel runtime persiste son scope et est muté uniquement par son identifiant et son statut.

## Staff, permissions et intégrations

Le Context est une frontière de données, jamais une permission. Les permissions existantes `phone/read` et `phone/write`, ainsi que les droits naturels du propriétaire, restent inchangées. Une surface Staff runtime doit fournir et revalider la Guild et le Context sélectionnés.

Une ouverture depuis une Scene doit transmettre le `scene.context_id` et choisir une Installation du même Context. Aucune intégration GreyFate, Relationship, Asset, Bank, State, Entity ou Automation n’est ajoutée par 3D.

## Indexes

Les indexes couvrent les résolutions `(guild_id, context_id, phone_number)`, les Phones actifs par scope, les contacts propriétaires, les conversations par scope, les messages par conversation et les appels par scope/statut/participant.

## Rollback

Le rollback **3D vers 3C** consiste à revenir au code pré-3D. Les nouvelles tables additives peuvent rester en place sans être utilisées. Les anciennes tables n’ayant pas été modifiées, elles conservent l’intégralité des données et permettent ce rollback. Leur suppression éventuelle est explicitement hors Phase 3D.

Ce cas est distinct d’un rollback **global de la Phase 3 vers la Phase 2** : les changements 3B/3C peuvent alors imposer un retour coordonné du code et de la base. La présence des tables additives 3D ne rend pas, à elle seule, ce rollback global automatiquement sûr.
