# Phase 3C — installations de personnages par Context

## Modèle

`CharactersV2` reste la bibliothèque globale d’identités d’un utilisateur.
`CharacterContinuitiesV2` reste la bibliothèque globale des histoires et incarnations.
`CharacterGuildInstallationsV2` est la présence d’une Continuity sur une Guild et porte
désormais son `context_id` exact.

Le Context est placé sur l’installation parce que ni l’identité ni son histoire ne sont
créées par une Guild. Une même identité peut jouer dans plusieurs Contexts avec des
Continuities distinctes. L’unicité historique `(continuity_id, guild_id)` est conservée :
une même Continuity ne peut donc pas être installée dans deux Contexts d’une même Guild.

## Résolution et persistance

Une création avec `contextId` vérifie que le Context existe, appartient à la Guild et est
actif. Une création sans `contextId` utilise le Context par défaut. Le choix est persisté
dès le draft et n’est jamais recalculé lors des validations, rejets, changements d’avatar,
de visibilité, de proxy ou d’activité. Changer le défaut ne déplace aucune installation.

Le bootstrap 3C est additif et idempotent. Il ajoute la colonne, remplit les installations
historiques avec le défaut de leur Guild et ne crée un défaut que pour une Guild ayant une
installation à migrer. Des triggers protègent l’appartenance Guild/Context et
l’immutabilité. Les INSERT SQL historiques omettant la colonne sont liés au défaut dans
la même instruction afin de préserver la compatibilité des producteurs internes anciens.

## APIs et usages

- Bibliothèque globale sûre : lectures de `CharactersV2`, `CharacterContinuitiesV2`,
  `getByCharacter`, `getByContinuity`.
- Administration Guild-wide sûre : `getByGuild`, historique et supervision explicites.
- Runtime Context-aware : `getByGuildAndContext`,
  `getPlayableCharactersForGuildAndContext`, `getByContinuityGuildAndContext`,
  `requireInContext` et résolution proxy lorsqu’une scène active fournit son Context.

## Implémenté en 3C

- Le roster Staff Characters possède une sélection paginée de Context, liée à la Guild et
  à l’utilisateur par un token expirant. La permission `characters/read` est revalidée à
  chaque sélection et navigation. Les validations restent volontairement Guild-wide.
- Le répertoire Player est un roster runtime : il utilise le Context par défaut en
  l’absence de Scene ou d’interface imposant un autre Context. Les écrans de bibliothèque,
  archives et Continuities restent globaux.
- Le proxy résout le Context de la Scene active ; hors Scene, l’absence de scope explicite
  conserve le contrat historique/default. Deux Continuities d’un même Character ne se
  mélangent pas entre Contexts.
- Les primitives `requireInGuild`, `requireInContext`,
  `requireInstallationInSceneContext` et `requireInstallationForGreyFate` centralisent les
  gardes direct-ID. Les interfaces de validation Guild-wide rechargent l’installation et
  contrôlent sa Guild ; une interface Context-scoped peut imposer le Context exact.
- Les statistiques Staff existantes restent Guild-wide car elles décrivent l’équilibre du
  serveur, tandis que les compteurs/listes d’installations de la page principale sont
  Context-scoped et nomment le Context affiché.

Les droits restent Guild-scoped (`characters/read`, `characters/write`, droits naturels,
owner/Admin et bridge de validation Phase 2). Un Context limite la donnée cible ; il ne
constitue jamais une permission et le bridge de validation n’est pas une autorité Context.

## Cohérence avec Scenes et GreyFate

Les scènes et GreyFate portent déjà un `context_id` immuable depuis 3B. Tout appel runtime
qui dispose d’une scène doit utiliser `requireInContext` ou les lectures Context-aware ;
une installation d’un autre Context est refusée, sans fallback, déplacement ni héritage
parent. Le roster proxy d’une scène est filtré par son Context exact.

## Domaines non migrés

Phone, Relationships, Assets, Bank, States, Entities et Automations ne reçoivent aucune
colonne Context en 3C. Leurs bibliothèques restent globales. Leurs futurs parcours runtime
devront transmettre le Context jusqu’aux variantes de roster avant de proposer une
installation ; c’est une dette P3, sans changement de leur sémantique dans ce lot.

## Différé à un futur lot (P3)

Phone, Relationships, Assets, Bank, States, Entities et Automations ne disposent pas
encore d’un moteur Context propre. Lorsqu’aucune frontière Context n’existe dans leur
entrée actuelle, leur comportement historique est conservé. Cette dette ne donne aucun
droit Context et ne doit pas être utilisée pour résoudre une installation runtime.

## Rollback futur

Comme pour 3B, revenir à un code antérieur exige de restaurer conjointement une sauvegarde
pré-3C ou d’accepter que l’ancien code ignore les colonnes et indexes additifs. Aucun DROP
n’est nécessaire pour exploiter la DB avec le code 3C. Un rollback complet de schéma
nécessiterait un rebuild SQLite hors ligne et n’est volontairement pas exécuté ici.
