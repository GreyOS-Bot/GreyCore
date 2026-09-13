# Phase 3I — cutover Context final

## Entity : définition et instance

`NarrativeEntitiesV2` reste le catalogue Guild-wide. L’identité, le nom, l’avatar,
la couleur, la description, les déclencheurs, les expressions et les modèles de
messages y sont partagés. Phase 3I n’introduit aucun override par Context.

`NarrativeEntityInstancesV2` est le runtime. Une définition possède au plus une
instance par Context. La Guild, le Context et la définition sont immuables. Les
scopes, welcomes, événements, destinations et runs sont rattachés à l’instance et
au Context persisté. Aucun héritage Parent/Child et aucun déplacement lors d’un
changement de Context par défaut ne sont effectués.

Un broadcast manuel choisit explicitement un Context puis une instance. Les
destinations sont limitées aux scopes de cette instance ; une opération ne traverse
jamais implicitement plusieurs Contexts.

## GreyFate

GreyFate référence explicitement une `entity_definition_id` configurée pour la
Guild. Chaque opération résout ensuite l’instance active de cette définition dans
le `duo.context_id`. Aucun nom spécial ni première Entity ne sert de fallback dans
le runtime complet.

Les réponses de quête rechargent et revalident duo, Guild, Context, thread, acteur
et étape active persistée avant l’envoi. Le `contextId` est transmis à GreyFate. L’identité d’une
soumission est stable et dérivée de l’interaction Discord, du duo et de l’étape ;
elle n’utilise pas l’heure courante.

## ProxyMessages

Les colonnes additives `installation_id` et `context_id` complètent l’identité
globale `character_id`. Tout nouveau message de personnage issu du runtime V2 doit
correspondre à une Installation de la même Guild, du même Context et du même
Character. Les modifications et suppressions rechargent ce scope avant effet.

Le backfill historique ne retient que la chaîne déterministe salon → Scene active
→ Context → Installation unique. Les lignes ambiguës conservent des colonnes NULL
et restent legacy-compatibles ; aucun Context par défaut et aucune première
Installation ne sont choisis.

Sur la base historique contrôlée pour le checkpoint, les 128 ProxyMessages sont
ambigus : ils restent volontairement non attribués (`installation_id` et
`context_id` à NULL). Ce résultat est une conservation legacy attendue, pas une
erreur de migration.

## Public Places

`ContextPublicPlacesV2` est le runtime contextuel. Les listes et mutations portent
la Guild et le Context exacts. Les écritures sont refusées dans un Context inactif.
`GuildPublicPlacesV2` reste le registre legacy et n’est pas alimenté par les
nouvelles écritures.

La migration copie un lieu historique uniquement lorsque sa Guild possède
exactement un Context. Sinon, il reste legacy-only. Il n’est jamais dupliqué dans
tous les Contexts et le Context par défaut n’est jamais utilisé comme preuve.

## Éléments volontairement Guild-wide

Les automatisations d’approbation de personnages et la limite de création de
personnages restent Guild-wide, avec les permissions `automations/read` et
`automations/write`. La timeline de Scene continue de dériver son Context de la
Scene. Aucun nouveau scope n’est ajouté à ces domaines.

## Migration, compatibilité et rollback

Les migrations 3I sont additives et idempotentes. Les données Entity ne sont
migrées que lorsque tous leurs scopes, welcomes et destinations d’événements
résolvent un unique Context. Les historiques impossibles à attribuer restent dans
les tables legacy, sans double-write.

Un rollback applicatif de 3I vers 3H conserve donc les anciennes tables et leurs
données. En revanche, les nouvelles données écrites uniquement dans les tables
runtime 3I ne doivent pas être supposées visibles par l’ancien runtime. Il faut
conserver la base complète et remettre 3I en service pour les relire ; aucune
reconstruction destructive n’est requise.
