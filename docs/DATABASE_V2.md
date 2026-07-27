# Greycore — Database V2

## Objectif

La Database V2 transforme Greycore en une plateforme de gestion de personnages RP multi-serveurs.

Un personnage n’appartient plus directement à un serveur Discord.

Il appartient à son utilisateur, possède une ou plusieurs continuités RP, puis peut être déployé sur plusieurs serveurs où Greycore est installé.

Cette nouvelle architecture doit permettre :

- de créer un personnage une seule fois ;
- de l’utiliser sur plusieurs serveurs ;
- de poursuivre la même histoire sur plusieurs villes ou serveurs ;
- de créer une nouvelle version du personnage repartant de zéro ;
- de conserver les personnages déjà créés ;
- de gérer les validations séparément sur chaque serveur ;
- d’activer ou désactiver des modules selon les besoins de chaque serveur ;
- de préparer l’import, l’export et une future interface web.

---

# 1. Hiérarchie générale

```text
Utilisateur Discord
└── Bibliothèque de personnages
    └── Personnage global
        ├── Continuité principale
        │   ├── Installation sur le serveur A
        │   └── Installation sur le serveur B
        │
        └── Continuité alternative
            └── Installation sur le serveur C
```

## Utilisateur Discord

L’utilisateur est identifié par son compte Discord.

Il possède une bibliothèque personnelle contenant tous ses personnages, indépendamment des serveurs sur lesquels ils sont utilisés.

## Personnage global

Le personnage global représente l’identité permanente du personnage.

Il contient notamment :

- le propriétaire Discord ;
- le nom utilisé pour le proxy ;
- l’avatar principal ;
- le prénom et le nom de référence ;
- le statut actif ou archivé ;
- les dates de création et de mise à jour.

Le personnage global n’est lié à aucun serveur précis.

## Continuité RP

Une continuité représente une version de l’histoire du personnage.

Exemples :

- Canon Greyline ;
- Nouvelle vie à Bayline ;
- Univers alternatif ;
- Reboot complet ;
- Version post-apocalyptique.

Chaque continuité possède son propre vécu RP.

## Installation serveur

Une installation correspond au déploiement d’une continuité sur un serveur Discord précis.

Elle contient uniquement les informations propres à ce serveur :

- validation locale ;
- accès au proxy ;
- visibilité ;
- rôles Discord ;
- permissions locales ;
- suivi staff ;
- date d’installation ;
- dernière activité.

---

# 2. Répartition des données

## Données globales

Les données globales suivent toujours le personnage.

Elles comprennent :

- le propriétaire Discord ;
- le nom utilisé pour le proxy ;
- l’avatar principal ;
- le prénom de référence ;
- le nom de référence ;
- le statut actif ou archivé ;
- la galerie d’avatars future ;
- les données techniques ;
- les dates de création et de mise à jour.

## Données de continuité

Chaque continuité possède ses propres données RP.

Elle peut contenir :

- le prénom utilisé dans cette continuité ;
- le nom utilisé dans cette continuité ;
- l’âge ;
- le gang ou l’organisation ;
- l’histoire ;
- les relations ;
- les rencontres ;
- les états ;
- les tenues ;
- le téléphone ;
- les conversations ;
- le journal ;
- l’inventaire futur ;
- les propriétés futures ;
- les véhicules futurs ;
- les événements importants ;
- les souvenirs ;
- les statistiques RP.

## Données d’installation

Chaque installation contient les informations propres à un serveur.

Elle comprend notamment :

- le serveur Discord ;
- la continuité utilisée ;
- le statut de validation ;
- la personne ayant validé ;
- la date de validation ;
- le motif de refus ;
- l’autorisation d’utiliser le proxy ;
- la visibilité locale ;
- les rôles Discord éventuels ;
- le message de suivi staff ;
- la date d’installation ;
- la dernière activité locale ;
- les éventuelles restrictions du serveur.

---

# 3. Modes de déploiement

Lorsqu’un joueur souhaite utiliser un personnage sur un nouveau serveur, Greycore lui propose deux possibilités.

## Continuer son histoire

Le joueur sélectionne une continuité existante.

Le personnage conserve notamment :

- son âge ;
- son histoire ;
- son organisation ;
- ses relations ;
- ses rencontres ;
- ses états ;
- ses tenues ;
- son téléphone ;
- ses conversations ;
- son journal ;
- son inventaire futur ;
- ses propriétés futures ;
- son historique RP.

Une nouvelle installation est créée sur le serveur concerné.

Le personnage doit toutefois respecter la validation et les règles propres à ce nouveau serveur.

## Repartir de zéro

Greycore crée une nouvelle continuité à partir des informations globales du personnage.

La nouvelle continuité conserve seulement :

- le nom utilisé pour le proxy ;
- l’avatar principal ;
- le prénom de référence ;
- le nom de référence.

La nouvelle continuité ne possède initialement :

- aucune relation ;
- aucune rencontre ;
- aucun état ;
- aucune tenue de continuité ;
- aucun téléphone ;
- aucune conversation ;
- aucun journal ;
- aucun inventaire ;
- aucune propriété ;
- aucun véhicule ;
- aucune validation antérieure ;
- aucun historique RP.

Le joueur complète ensuite les informations propres à cette nouvelle continuité.

---

# 4. Table `Users`

La table `Users` représente les utilisateurs Discord connus de Greycore.

```sql
CREATE TABLE IF NOT EXISTS Users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    discord_user_id TEXT NOT NULL UNIQUE,

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
```

## Rôle

Cette table permet de ne plus utiliser directement l’identifiant Discord comme propriétaire dans toutes les tables métier.

Elle prépare également :

- une future interface web ;
- plusieurs comptes liés ;
- les préférences utilisateur ;
- l’import et l’export ;
- les statistiques globales ;
- la gestion d’abonnements futurs.

---

# 5. Table `Characters`

La table `Characters` représente les personnages globaux.

```sql
CREATE TABLE IF NOT EXISTS Characters (
    id TEXT PRIMARY KEY,

    owner_user_id INTEGER NOT NULL,

    proxy_name TEXT NOT NULL,

    avatar_url TEXT,

    base_firstname TEXT,
    base_lastname TEXT,

    is_archived INTEGER NOT NULL DEFAULT 0,

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY(owner_user_id)
        REFERENCES Users(id)
        ON DELETE CASCADE,

    UNIQUE(owner_user_id, proxy_name)
);
```

## Rôle

Cette table contient uniquement l’identité permanente du personnage.

Elle ne doit plus contenir :

- de `guild_id` ;
- de statut de validation ;
- de gang ;
- d’histoire RP locale ;
- de relations ;
- d’états ;
- de rencontres ;
- de téléphone lié directement au serveur.

## Contraintes

Un même utilisateur ne peut pas posséder deux personnages avec le même nom de proxy.

Deux utilisateurs différents peuvent posséder des personnages portant le même nom.

---

# 6. Table `CharacterContinuities`

La table `CharacterContinuities` représente les différentes versions RP d’un personnage.

```sql
CREATE TABLE IF NOT EXISTS CharacterContinuities (
    id TEXT PRIMARY KEY,

    character_id TEXT NOT NULL,

    name TEXT NOT NULL,

    mode TEXT NOT NULL DEFAULT 'original',

    source_continuity_id TEXT,

    firstname TEXT,
    lastname TEXT,

    age INTEGER,

    gang TEXT,

    story TEXT,

    is_archived INTEGER NOT NULL DEFAULT 0,

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY(character_id)
        REFERENCES Characters(id)
        ON DELETE CASCADE,

    FOREIGN KEY(source_continuity_id)
        REFERENCES CharacterContinuities(id)
        ON DELETE SET NULL,

    UNIQUE(character_id, name)
);
```

## Valeurs possibles pour `mode`

```text
original
continued
reset
copied
imported
```

## Signification

### `original`

Première continuité créée pour le personnage.

### `continued`

Continuité directement poursuivie depuis une continuité existante.

Dans la plupart des cas, aucune nouvelle continuité n’est nécessaire pour poursuivre exactement la même histoire sur un autre serveur.

### `reset`

Nouvelle version du personnage repartant de zéro.

### `copied`

Nouvelle continuité créée à partir d’une autre continuité avec copie partielle de certaines données.

### `imported`

Continuité provenant d’un import futur.

---

# 7. Table `CharacterGuildInstallations`

La table `CharacterGuildInstallations` représente le déploiement d’une continuité sur un serveur.

```sql
CREATE TABLE IF NOT EXISTS CharacterGuildInstallations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    character_id TEXT NOT NULL,

    continuity_id TEXT NOT NULL,

    guild_id TEXT NOT NULL,

    status TEXT NOT NULL DEFAULT 'draft',

    visibility TEXT NOT NULL DEFAULT 'private',

    proxy_enabled INTEGER NOT NULL DEFAULT 0,

    validated_by TEXT,

    validated_at TEXT,

    rejection_reason TEXT,

    installed_at TEXT NOT NULL,

    updated_at TEXT NOT NULL,

    last_activity_at TEXT,

    FOREIGN KEY(character_id)
        REFERENCES Characters(id)
        ON DELETE CASCADE,

    FOREIGN KEY(continuity_id)
        REFERENCES CharacterContinuities(id)
        ON DELETE CASCADE,

    FOREIGN KEY(guild_id)
        REFERENCES Guilds(id)
        ON DELETE CASCADE,

    UNIQUE(continuity_id, guild_id)
);
```

## Valeurs possibles pour `status`

```text
draft
pending
approved
rejected
suspended
archived
```

## Signification

### `draft`

Le personnage est installé, mais sa préparation n’est pas terminée.

### `pending`

Une demande de validation a été envoyée au staff.

### `approved`

Le personnage est validé sur ce serveur.

### `rejected`

La demande a été refusée.

### `suspended`

L’utilisation du personnage est temporairement bloquée sur ce serveur.

### `archived`

L’installation n’est plus active sur ce serveur.

## Règle principale

Une même continuité ne peut être installée qu’une seule fois sur un même serveur.

La même continuité peut toutefois être installée sur plusieurs serveurs différents.

---

# 8. Table `ContinuityOutfits`

Les tenues doivent appartenir à une continuité.

```sql
CREATE TABLE IF NOT EXISTS ContinuityOutfits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    continuity_id TEXT NOT NULL,

    image_url TEXT NOT NULL,

    title TEXT,

    description TEXT,

    is_current INTEGER NOT NULL DEFAULT 1,

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY(continuity_id)
        REFERENCES CharacterContinuities(id)
        ON DELETE CASCADE
);
```

## Règle

Une continuité peut posséder plusieurs tenues enregistrées.

Une seule tenue doit être considérée comme actuelle à un instant donné.

Le nom et la description restent facultatifs.

---

## Extension — Biens V2

Les biens sont rattachés à une continuité et à un serveur : ils peuvent donc différer d’une continuité à l’autre.

`AssetTypesV2` contient les catégories configurées par le serveur. GreyCore installe les catégories Véhicule, Propriété, Entreprise, Animal et Autre bien, puis le staff peut en ajouter.

`ContinuityAssetsV2` contient les biens, leur nom, leur description, leurs caractéristiques et, si besoin, un lien d’image. Un bien possède un seul propriétaire à la fois.

`ContinuityAssetTransfersV2` conserve chaque transfert entre deux continuités afin de préserver l’historique RP.

---

# 9. Table `ContinuityPhones`

Le téléphone appartient à une continuité.

```sql
CREATE TABLE IF NOT EXISTS ContinuityPhones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    continuity_id TEXT NOT NULL UNIQUE,

    phone_number TEXT NOT NULL UNIQUE,

    is_active INTEGER NOT NULL DEFAULT 1,

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY(continuity_id)
        REFERENCES CharacterContinuities(id)
        ON DELETE CASCADE
);
```

## Règle

Une continuité poursuivie conserve son téléphone.

Une continuité repartant de zéro reçoit un nouveau téléphone.

Le numéro n’est pas directement lié à un serveur.

---

# 10. Table `PhoneConversations`

Les conversations doivent être liées aux téléphones des continuités.

```sql
CREATE TABLE IF NOT EXISTS PhoneConversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    phone_a_id INTEGER NOT NULL,

    phone_b_id INTEGER NOT NULL,

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY(phone_a_id)
        REFERENCES ContinuityPhones(id)
        ON DELETE CASCADE,

    FOREIGN KEY(phone_b_id)
        REFERENCES ContinuityPhones(id)
        ON DELETE CASCADE,

    UNIQUE(phone_a_id, phone_b_id)
);
```

## Règle

Le plus petit identifiant doit toujours être enregistré dans `phone_a_id`.

Cela évite la création de deux conversations inversées entre les mêmes téléphones.

---

# 11. Table `PhoneMessages`

Les messages appartiennent à une conversation.

```sql
CREATE TABLE IF NOT EXISTS PhoneMessages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    conversation_id INTEGER NOT NULL,

    sender_phone_id INTEGER NOT NULL,

    content TEXT NOT NULL,

    public_guild_id TEXT,

    public_channel_id TEXT,

    webhook_message_id TEXT,

    created_at TEXT NOT NULL,

    FOREIGN KEY(conversation_id)
        REFERENCES PhoneConversations(id)
        ON DELETE CASCADE,

    FOREIGN KEY(sender_phone_id)
        REFERENCES ContinuityPhones(id)
        ON DELETE CASCADE
);
```

## Rôle

Le contenu du SMS suit la continuité.

Les champs `public_guild_id` et `public_channel_id` indiquent uniquement où le SMS a été affiché publiquement.

---

# 12. Table `ContinuityRelationships`

Les relations doivent appartenir aux continuités.

```sql
CREATE TABLE IF NOT EXISTS ContinuityRelationships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    continuity_a_id TEXT NOT NULL,

    continuity_b_id TEXT NOT NULL,

    relationship_type_id INTEGER NOT NULL,

    created_by TEXT NOT NULL,

    created_at TEXT NOT NULL,

    FOREIGN KEY(continuity_a_id)
        REFERENCES CharacterContinuities(id)
        ON DELETE CASCADE,

    FOREIGN KEY(continuity_b_id)
        REFERENCES CharacterContinuities(id)
        ON DELETE CASCADE,

    FOREIGN KEY(relationship_type_id)
        REFERENCES RelationshipTypes(id)
        ON DELETE CASCADE
);
```

## Règle

Une relation relie deux continuités, pas simplement deux personnages globaux.

Reya peut donc avoir une relation avec Tiago dans une continuité, mais ne pas le connaître dans une autre.

---

# 13. Table `PendingContinuityRelationships`

Les demandes de relation doivent également cibler des continuités.

```sql
CREATE TABLE IF NOT EXISTS PendingContinuityRelationships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    requester_continuity_id TEXT NOT NULL,

    target_continuity_id TEXT NOT NULL,

    relationship_type_id INTEGER NOT NULL,

    requested_by TEXT NOT NULL,

    target_owner_id TEXT NOT NULL,

    status TEXT NOT NULL DEFAULT 'pending',

    created_at TEXT NOT NULL,

    responded_at TEXT,

    responded_by TEXT,

    FOREIGN KEY(requester_continuity_id)
        REFERENCES CharacterContinuities(id)
        ON DELETE CASCADE,

    FOREIGN KEY(target_continuity_id)
        REFERENCES CharacterContinuities(id)
        ON DELETE CASCADE,

    FOREIGN KEY(relationship_type_id)
        REFERENCES RelationshipTypes(id)
        ON DELETE CASCADE
);
```

---

# 14. Table `ContinuityEncounters`

Les rencontres appartiennent à une continuité.

```sql
CREATE TABLE IF NOT EXISTS ContinuityEncounters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    continuity_a_id TEXT NOT NULL,

    continuity_b_id TEXT,

    external_name TEXT,

    location TEXT,

    note TEXT,

    occurred_at TEXT NOT NULL,

    created_by TEXT NOT NULL,

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY(continuity_a_id)
        REFERENCES CharacterContinuities(id)
        ON DELETE CASCADE,

    FOREIGN KEY(continuity_b_id)
        REFERENCES CharacterContinuities(id)
        ON DELETE CASCADE
);
```

## Règle

Une rencontre peut concerner :

- une autre continuité Greycore ;
- un personnage externe saisi manuellement.

---

# 15. Table `ContinuityStates`

Les états appartiennent à une continuité.

```sql
CREATE TABLE IF NOT EXISTS ContinuityStates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    continuity_id TEXT NOT NULL,

    state_type_id INTEGER NOT NULL,

    note TEXT,

    started_at TEXT NOT NULL,

    ended_at TEXT,

    created_by TEXT NOT NULL,

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY(continuity_id)
        REFERENCES CharacterContinuities(id)
        ON DELETE CASCADE,

    FOREIGN KEY(state_type_id)
        REFERENCES StateTypes(id)
        ON DELETE CASCADE
);
```

## Règle

Une continuité ne peut pas posséder deux fois le même état actif.

---

# 16. Table `CharacterInstallationMessages`

Le suivi staff appartient à l’installation serveur.

```sql
CREATE TABLE IF NOT EXISTS CharacterInstallationMessagesV2 (
    installation_id INTEGER PRIMARY KEY,

    guild_id TEXT NOT NULL,

    channel_id TEXT NOT NULL,

    message_id TEXT NOT NULL,

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY(installation_id)
        REFERENCES CharacterGuildInstallations(id)
        ON DELETE CASCADE,

    FOREIGN KEY(guild_id)
        REFERENCES Guilds(id)
        ON DELETE CASCADE
);
```

## Règle

Chaque installation peut posséder un seul message de progression staff.

---

# 17. Modules activables

Les modules sont configurés au niveau du serveur.

Les données ne sont jamais supprimées lorsqu’un module est désactivé.

## Table `GuildModules`

```sql
CREATE TABLE IF NOT EXISTS GuildModules (
    guild_id TEXT NOT NULL,

    module_key TEXT NOT NULL,

    is_enabled INTEGER NOT NULL DEFAULT 1,

    updated_at TEXT NOT NULL,

    PRIMARY KEY(guild_id, module_key),

    FOREIGN KEY(guild_id)
        REFERENCES Guilds(id)
        ON DELETE CASCADE
);
```

## Modules prévus

```text
phone
relationships
encounters
states
outfit
journal
inventory
properties
vehicles
```

## Règles

- Un module désactivé disparaît des interfaces.
- Les commandes liées au module doivent également être bloquées.
- Les données existantes restent conservées.
- La réactivation restaure l’accès au module.

---

# 18. Bibliothèque de personnages

La bibliothèque appartient à l’utilisateur.

Elle doit permettre :

- d’afficher tous ses personnages ;
- d’ouvrir un personnage global ;
- de consulter ses continuités ;
- de consulter ses installations ;
- de créer une continuité ;
- de déployer une continuité ;
- d’archiver un personnage ;
- d’exporter un personnage ;
- d’importer un personnage.

## Navigation future

```text
/personnage bibliothèque
```

ou :

```text
/mes personnages
```

Affichage prévu :

```text
📚 Bibliothèque de Sky Dkr

👤 Reya
Continuités : 2
Installations actives : 3

👤 Tiago
Continuités : 1
Installations actives : 1

👤 Nero
Continuités : 1
Aucune installation active
```

---

# 19. Parcours de déploiement

## Étape 1

Le joueur choisit un personnage dans sa bibliothèque.

## Étape 2

Greycore demande :

```text
Comment souhaitez-vous utiliser ce personnage ?

🌍 Continuer son histoire
🔄 Repartir de zéro
```

## Étape 3 — Continuer

Le joueur choisit une continuité existante.

Greycore crée une nouvelle installation sur le serveur.

## Étape 3 — Repartir de zéro

Greycore crée une nouvelle continuité.

Le joueur choisit un nom pour cette continuité.

Exemples :

- Nouvelle ville ;
- Univers alternatif ;
- Version Greyline ;
- Reboot complet.

## Étape 4

Greycore crée l’installation locale.

## Étape 5

Le joueur complète éventuellement les informations propres à la continuité.

## Étape 6

Le joueur ajoute ou vérifie l’avatar.

## Étape 7

Le joueur demande la validation du staff.

## Étape 8

Après validation, le proxy devient utilisable sur ce serveur.

---

# 20. Règles du proxy

Le proxy doit fonctionner à partir d’une installation serveur.

Pour envoyer :

```text
Reya: Bonjour
```

Greycore doit vérifier :

1. que le personnage appartient à l’utilisateur ;
2. qu’une continuité est installée sur le serveur ;
3. que l’installation est active ;
4. que le proxy est autorisé ;
5. que le nom utilisé correspond au personnage ou à un alias autorisé.

Le proxy doit utiliser :

- le nom global ou un alias local ;
- l’avatar global ;
- éventuellement une configuration locale future.

Une installation suspendue ou archivée ne doit pas pouvoir utiliser le proxy.

---

# 21. Validation locale

La validation appartient uniquement à l’installation.

Le staff d’un serveur peut :

- valider une installation ;
- refuser une installation ;
- suspendre une installation ;
- archiver une installation ;
- demander des corrections.

Le staff ne peut pas :

- supprimer le personnage global ;
- modifier une autre continuité ;
- gérer les installations d’un autre serveur ;
- accéder aux données privées non utilisées sur son serveur.

---

# 22. Permissions

## Propriétaire

Le propriétaire peut :

- créer un personnage ;
- modifier son identité globale ;
- créer une continuité ;
- modifier ses continuités ;
- déployer une continuité ;
- archiver ses personnages ;
- gérer les modules de ses personnages ;
- supprimer ses propres données selon les règles prévues.

## Staff serveur

Le staff peut :

- consulter les installations de son serveur ;
- valider ou refuser ;
- suspendre un proxy ;
- gérer les types d’états ;
- gérer les types de relations ;
- configurer les modules ;
- consulter les synthèses staff futures.

## Autres utilisateurs

Les autres utilisateurs peuvent uniquement consulter les informations publiques autorisées.

Ils ne peuvent jamais :

- modifier un personnage tiers ;
- ajouter un état à un personnage tiers ;
- ajouter une rencontre à un personnage tiers ;
- supprimer un personnage tiers ;
- modifier une tenue tierce ;
- accepter une relation à la place du propriétaire concerné.

---

# 23. Migration V1 vers V2

Aucune donnée existante ne doit être supprimée pendant la migration.

## Étape 1 — Sauvegarde

Créer une copie complète de la base V1 avant toute migration.

Exemple :

```text
greycore-backup-before-v2.db
```

## Étape 2 — Création des tables V2

Créer toutes les nouvelles tables sans modifier les tables V1.

## Étape 3 — Migration des utilisateurs

Pour chaque `owner_id` présent dans `Characters` :

- créer ou retrouver un utilisateur dans `Users` ;
- conserver l’identifiant Discord.

## Étape 4 — Migration des personnages

Pour chaque personnage V1 :

- créer un personnage global ;
- conserver son identifiant actuel lorsque possible ;
- transférer son nom de proxy ;
- transférer son avatar ;
- transférer son propriétaire ;
- transférer ses dates.

## Étape 5 — Migration des profils

Pour chaque personnage :

- créer une continuité originale ;
- utiliser le nom `Continuité principale` ou le nom du serveur d’origine ;
- transférer le prénom ;
- transférer le nom ;
- transférer l’âge ;
- transférer le gang ;
- transférer l’histoire.

## Étape 6 — Migration des installations

Pour chaque personnage V1 :

- créer une installation sur son ancien serveur ;
- transférer le statut de validation ;
- transférer la visibilité ;
- transférer la personne ayant validé ;
- transférer la date de validation ;
- transférer le motif de refus ;
- activer le proxy selon l’ancien statut.

## Étape 7 — Migration des téléphones

Pour chaque téléphone V1 :

- retrouver la continuité du personnage ;
- créer un téléphone de continuité ;
- conserver le numéro existant ;
- rattacher les conversations et messages.

## Étape 8 — Migration des relations

Pour chaque relation V1 :

- retrouver les continuités principales des deux personnages ;
- créer la relation entre ces deux continuités ;
- conserver le type et la date.

## Étape 9 — Migration des rencontres

Pour chaque rencontre V1 :

- rattacher la rencontre à la continuité principale ;
- conserver le personnage lié ou le nom externe ;
- conserver le lieu ;
- conserver la note ;
- conserver la date.

## Étape 10 — Migration des états

Pour chaque état V1 :

- rattacher l’état à la continuité principale ;
- conserver le type ;
- conserver la note ;
- conserver les dates de début et de fin.

## Étape 11 — Migration des tenues

Pour chaque tenue V1 :

- rattacher la tenue à la continuité principale ;
- conserver l’image ;
- conserver le nom ;
- conserver la description ;
- conserver le statut actuel ;
- conserver les dates.

## Étape 12 — Migration des suivis staff

Pour chaque message d’installation V1 :

- retrouver la nouvelle installation ;
- rattacher le salon et le message à cette installation.

## Étape 13 — Vérification

Comparer notamment :

- nombre d’utilisateurs ;
- nombre de personnages ;
- nombre de profils ;
- nombre de continuités ;
- nombre d’installations ;
- nombre de téléphones ;
- nombre de conversations ;
- nombre de relations ;
- nombre de rencontres ;
- nombre d’états ;
- nombre de tenues.

## Étape 14 — Activation

Le bot ne doit utiliser la V2 qu’après validation complète des données migrées.

## Étape 15 — Conservation temporaire

Les anciennes tables V1 doivent rester présentes pendant une période de sécurité.

Elles ne seront supprimées qu’après plusieurs sauvegardes et tests concluants.

---

# 24. Table de correspondance de migration

Une table temporaire peut être utilisée pour conserver les correspondances entre les anciennes et nouvelles données.

```sql
CREATE TABLE IF NOT EXISTS MigrationV1ToV2 (
    entity_type TEXT NOT NULL,

    old_id TEXT NOT NULL,

    new_id TEXT NOT NULL,

    migrated_at TEXT NOT NULL,

    PRIMARY KEY(entity_type, old_id)
);
```

## Exemples de `entity_type`

```text
user
character
continuity
installation
phone
relationship
encounter
state
outfit
```

Cette table facilitera :

- les vérifications ;
- les corrections ;
- les reprises de migration ;
- les audits ;
- les retours arrière.

---

# 25. Sécurité de migration

La migration doit être idempotente.

Cela signifie qu’elle doit pouvoir être relancée sans créer de doublons.

Elle doit utiliser :

- des transactions SQLite ;
- des vérifications d’existence ;
- une table de correspondance ;
- des logs détaillés ;
- une sauvegarde préalable.

En cas d’erreur, la transaction concernée doit être annulée.

---

# 26. Index recommandés

```sql
CREATE INDEX IF NOT EXISTS idx_characters_owner
ON Characters(owner_user_id);

CREATE INDEX IF NOT EXISTS idx_continuities_character
ON CharacterContinuities(character_id);

CREATE INDEX IF NOT EXISTS idx_installations_guild
ON CharacterGuildInstallations(guild_id);

CREATE INDEX IF NOT EXISTS idx_installations_character
ON CharacterGuildInstallations(character_id);

CREATE INDEX IF NOT EXISTS idx_installations_continuity
ON CharacterGuildInstallations(continuity_id);

CREATE INDEX IF NOT EXISTS idx_outfits_continuity
ON ContinuityOutfits(continuity_id);

CREATE INDEX IF NOT EXISTS idx_states_continuity
ON ContinuityStates(continuity_id);

CREATE INDEX IF NOT EXISTS idx_encounters_continuity_a
ON ContinuityEncounters(continuity_a_id);

CREATE INDEX IF NOT EXISTS idx_relationships_continuity_a
ON ContinuityRelationships(continuity_a_id);

CREATE INDEX IF NOT EXISTS idx_relationships_continuity_b
ON ContinuityRelationships(continuity_b_id);

CREATE INDEX IF NOT EXISTS idx_phone_messages_conversation
ON PhoneMessages(conversation_id);
```

---

# 27. Règles de suppression

## Suppression d’un utilisateur

La suppression d’un utilisateur entraîne la suppression de :

- ses personnages ;
- ses continuités ;
- ses installations ;
- ses modules liés ;
- ses données RP.

Une confirmation forte sera obligatoire.

## Suppression d’un personnage global

La suppression entraîne la suppression de :

- toutes ses continuités ;
- toutes ses installations ;
- tous ses téléphones ;
- toutes ses tenues ;
- toutes ses relations ;
- toutes ses rencontres ;
- tous ses états ;
- son journal futur ;
- ses propriétés futures.

Une étape d’archivage devra être privilégiée avant la suppression définitive.

## Archivage d’un personnage

L’archivage :

- conserve toutes les données ;
- désactive les nouvelles installations ;
- empêche l’utilisation du proxy ;
- permet une restauration future.

## Suppression d’une continuité

La suppression entraîne la suppression des données liées à cette continuité.

Une confirmation doit afficher le nombre de données concernées.

## Suppression d’une installation

La suppression d’une installation ne supprime pas la continuité.

Elle retire simplement le personnage du serveur concerné.

---

# 28. Terminologie retenue

## Personnage

Identité globale appartenant à un utilisateur.

## Continuité

Version RP précise du personnage.

## Installation

Présence d’une continuité sur un serveur.

## Déployer

Ajouter une continuité à un serveur.

## Continuer

Utiliser une continuité existante.

## Repartir de zéro

Créer une nouvelle continuité vide à partir de l’identité globale.

## Archiver

Désactiver sans supprimer les données.

## Bibliothèque

Ensemble des personnages appartenant à un utilisateur.

---

# 29. Ordre de développement recommandé

## Phase 1 — Fondations

- créer les tables V2 ;
- créer les modèles V2 ;
- créer les managers V2 ;
- créer le système de migration ;
- tester sur une copie de la base.

## Phase 2 — Bibliothèque

- afficher les personnages globaux ;
- afficher les continuités ;
- afficher les installations ;
- créer une continuité ;
- archiver un personnage.

## Phase 3 — Déploiement multi-serveurs

- commande ou interface de déploiement ;
- choix Continuer ou Repartir de zéro ;
- création de l’installation ;
- validation locale ;
- activation du proxy.

## Phase 4 — Migration des modules

- profil ;
- proxy ;
- téléphone ;
- relations ;
- rencontres ;
- états ;
- outfit ;
- installation staff.

## Phase 5 — Modules activables

- configuration serveur ;
- affichage conditionnel des boutons ;
- blocage des commandes ;
- conservation des données désactivées.

## Phase 6 — Stabilisation

- tests multi-utilisateurs ;
- tests multi-serveurs ;
- tests de validation ;
- tests de permissions ;
- tests de suppression ;
- sauvegardes ;
- logs ;
- documentation.

---

# 30. Résultat attendu

Après la mise en place de la Database V2, un utilisateur pourra :

1. créer un personnage une seule fois ;
2. le retrouver dans sa bibliothèque ;
3. créer plusieurs continuités ;
4. utiliser la même continuité sur plusieurs serveurs ;
5. poursuivre son histoire dans une nouvelle ville ;
6. créer une version alternative repartant de zéro ;
7. conserver son avatar et son identité ;
8. recevoir une validation différente sur chaque serveur ;
9. conserver ses données sans dépendre d’un serveur unique ;
10. archiver, exporter ou importer ses personnages plus tard.

Greycore deviendra ainsi une plateforme de gestion de personnages RP multi-serveurs, et non plus uniquement un bot lié à un serveur Discord.
