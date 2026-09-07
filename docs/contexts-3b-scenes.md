# Phase 3B — Scenes context-scoped

## Contrat

Guild reste la frontière de sécurité et d’installation ; Context est la frontière
narrative. Chaque scène créée par les API 3B possède un Context actif de sa Guild.
Un Context explicite invalide, étranger ou inactif est refusé, jamais remplacé par
le défaut. Sans Context, les API interactives utilisent le défaut de la Guild.
Une scène conserve définitivement son rattachement initial, même si le défaut change.
Les scènes d’un parent ne sont pas héritées par son enfant.

## Cartographie auditée

| Structure/parcours | Classification | Traitement 3B |
| --- | --- | --- |
| `ScenesV2` ; manager/repository SceneAssistant ; création, reprise, déplacement, clôture | RUNTIME SCENE RECORD | `context_id` persistant ; listes et opérations isolées |
| `SceneAssistantCyclesV2` | RUNTIME SCENE RECORD legacy | Rattachement et filtrage Context, API conservées ; le suivi moderne utilise `ScenesV2` |
| `SceneStartProposalsV2` ; réaction 🎬 | RUNTIME workflow préparatoire | Context capturé à la proposition puis utilisé à la création |
| `SceneChannelsV2` | EXTERNAL LINK dépendant de scène | Context de la scène, copié par backfill/trigger ; un seul lien actif par salon conservé |
| `SceneParticipantsV2`, `SceneClosurePromptsV2`, `SceneClosureVotesV2` | RUNTIME dépendant de scène | Context de la scène, copié par backfill/trigger ; droits naturels inchangés |
| `SceneTimelineWarningsV2` | DERIVED / VIEW | Pas de migration de personnage ; vue `SceneTimelineWarningContextsV2` expose les deux rattachements ; nouveaux avertissements uniquement entre scènes du même Context |
| `GuildSceneAssistantSettingsV2`, `GuildSceneAssistantScopesV2`, `GuildSceneTriggerExpressionsV2` | CONFIGURATION GUILD | Inchangées : activation, seuils, inactivité, zones et expressions globales |
| `SceneAssistantChannelPromptsV2` | DERIVED / VIEW | Anti-spam par salon, reste Guild/salon ; ce n’est pas une scène |
| `GuildPublicPlacesV2` ; annuaire/synchronisation des forums | CONFIGURATION GUILD | Inchangés ; les scènes ouvertes dans ces lieux passent par les mêmes API Context |
| `GreyFateDuos` | EXTERNAL LINK / runtime externe | Context persistant, validé indépendamment du défaut courant |
| `GreyFateEvents`, opérations/claims, rapport de soirée | EXTERNAL LINK / DERIVED | Portée événement/Guild conservée ; protocole et idempotence inchangés |
| Pages joueur/Staff, `/scene`, SceneInteractionHandler, SceneInactivityService | DERIVED / VIEW / orchestration | Lisent le Context résolu ; permissions métier conservées |

## Migration et bootstrap

`schemaV2SceneAssistant` appelle la migration après la création additive des tables
Scenes. GreyFate l’appelle aussi après son initialisation de schéma, qui peut être
différée. Le code partagé est dans `v2/repositories/SceneContextMigration` afin de
respecter la frontière d’architecture V2. Le DDL 3A de Contexts est inchangé, partagé
dans `ContextSchema` ; `database/schemaContexts` reste son point d’entrée compatible.

Une transaction SQLite **IMMEDIATE** contient création conditionnelle des colonnes,
résolution/ensureDefault des seules Guilds ayant des lignes à rattacher, backfill,
index et triggers. Aucune suppression, renumérotation, reconstruction ni remise à
zéro. Une seconde exécution laisse les rattachements et les Contexts inchangés.
Les tests couvrent aussi deux connexions concurrentes et un échec provoqué qui
annule ensemble le DDL et les données du backfill.

Colonnes `context_id` ajoutées à : Scenes, cycles legacy, propositions de démarrage,
liens de salons, participants, prompts/votes de clôture et duos GreyFate.
Les associations reçoivent toujours le Context de leur scène, pas celui de l’acteur.
Les triggers refusent les rattachements explicites incohérents ; les rattachements
des scènes/cycles/duos déjà établis sont immuables.

### Compatibilité descendante

Les colonnes sont nullables au niveau SQLite pour permettre à l’ancien code de les
ignorer. Les API de création 3B renseignent toujours une valeur valide. Un INSERT
effectué par un ancien binaire peut rester sans Context jusqu’au prochain bootstrap
3B ; cette possibilité n’est pas un chemin de création offert par le code 3B.
Les triggers complètent les INSERTs historiques des associations à partir de la scène.
Le format des tables et leurs identifiants existants sont conservés.

**Rollback futur : code + DB pré-3B ensemble.** La compatibilité additive du format
SQLite ne garantit pas la compatibilité métier : l'ancien code effectue des lectures
Guild-only et ignore les frontières narratives. Dès que plusieurs Contexts portent
des données, un rollback code seul mélangerait ces données. Le runbook de déploiement
devra donc prévoir une sauvegarde cohérente pré-3B et sa restauration avec le code
correspondant. Aucune opération de sauvegarde/restauration ou production n'est exécutée ici.

## Résolution et API

- `createScene({ guildId, contextId?, channelId, ... })` : résolution stricte et
  création + lien dans une transaction ; conflit inter-Context de salon sans effet partiel.
- `getScenes(guildId, contextId?)`, `getActiveScenes(guildId, contextId?)`,
  `getActiveSceneByChannel(guildId, channelId, contextId?)` : filtrage exact.
- `getScene(id, { guildId, contextId?, write? })` : lookup sécurisé ; `write: true`
  exige aussi un Context actif. `getScene(id)` reste une primitive interne non filtrée,
  à ne pas utiliser seule pour autoriser une interaction.
- Mutations par ID : portée explicite `{ guildId, contextId }`, ou défaut lorsque
  la portée n’est pas fournie. Les handlers revalident Guild/Context avant effets ;
  les repositories revalident avant écriture.
- Le suivi automatique d’un message résout le Context depuis le **lien actif
  persistant** de la scène au salon, puis effectue la lecture filtrée et les mutations
  dans ce Context. Il ne dérive rien d’un nom de salon ou d’un module hardcodé.
  Un changement de défaut n’interrompt donc pas le comptage d’une scène existante.
- Le balayage d’inactivité conserve le Context de chaque scène et le revalide après
  les attentes Discord, avant un nouveau prompt.

## Interactions et droits

Les nouveaux boutons publics de scène contiennent l’ID de scène et son Context
compactés pour respecter les 100 caractères Discord. Ce n’est pas une autorisation :
les droits participant/créateur et les contrôles Guild/Context sont réévalués.
Les anciens identifiants restent routés, avec résolution du défaut quand ils ne
portent pas de Context.

Les étapes privées start/resume/move utilisent des drafts aléatoires liés à la Guild,
à l’utilisateur, à l’action et au Context, valables dix minutes. Le submit revalide
indépendamment le Context et les droits métier. Aucun Context courant global par
utilisateur ; plusieurs fenêtres n’écrasent pas leur sélection respective.
Après redémarrage ou expiration, l’utilisateur doit rouvrir l’interface.
Chaque stockage est borné à 32 drafts par couple Guild/utilisateur et 4096 au total,
avec éviction des plus anciens. Les drafts privés sont aussi liés au salon et
consommés synchroniquement avant dispatch. Le bouton Staff de nouveau cycle consomme
son jeton avant mutation ; les consultations restent réutilisables jusqu'à expiration.
Les déplacements recontrôlent les droits naturels ou `scenes/write` après les lectures
Discord et avant la transition atomique. La suppression d'un droit entre ouverture
et submit, ou pendant ces lectures, ne permet pas la mutation.

Staff Scenes affiche le Context sélectionné et son ID, propose les Contexts actifs
par pages de 25, et filtre ses scènes. Diagnostic et nouveau cycle portent la même
sélection. Les commandes de configuration restent explicitement globales à la Guild.

`scenes/read` permet cette consultation, `scenes/write` les mutations prévues ;
créateur, participant et duo conservent leurs accès naturels. Aucun nouveau domaine
de permission, aucune permission Context et aucun accès d’administration des
Contexts : leur création/édition/défaut restent root-only comme en 3A.

## GreyFate — arbitrage confirmé

Le duo externe reçoit son Context au premier enregistrement. Une réémission du même
duo garde ce rattachement ; un changement explicite ou une autre Guild/soirée est
refusé. START/CONTINUE/CLOSE contrôlent le duo persistant et son Context actif avant
leurs effets, et le routeur le contrôle avant `deferUpdate()`.

**Aucune `ScenesV2` n’est créée automatiquement pour un duo.** Le callback externe,
ses clés d’opération, son anti-replay et son cycle de vie restent inchangés.
Le rapport historique d’une soirée reste un rapport d’événement Guild-scoped,
distinct d’une liste de `ScenesV2` dans un Context.
Le Context vient de `duo.contextId`, sinon `payload.contextId`, sinon du duo déjà
persisté, sinon du défaut initial. Les valeurs explicites sont validées dans la Guild
et doivent être actives ; elles ne peuvent pas réassigner un duo existant. Les duos
historiques sans rattachement sont backfillés au bootstrap de leur repository.
Il n'existe actuellement aucun lien métier GreyFate → ScenesV2 à synchroniser.

## Revue finale : accès résiduels et transactions

| Accès | Classe | Justification |
| --- | --- | --- |
| Configuration/scopes/expressions, Setup/ConfigurationOverview, annuaire Public Places | SAFE GUILD CONFIG | Pas de contenu Scene agrégé ; permissions Guild strictes conservées |
| `/scene` statut/diagnostic, PlayerRouter, anciennes routes sans Context | LEGACY COMPAT | Les signatures anciennes résolvent le défaut puis filtrent exactement, jamais toute la Guild |
| `getScene(id)` interne, prompts/votes par Scene ID | LEGACY COMPAT | Primitives internes ; les handlers revalident Guild/Context et droits avant effets |
| `getBoundSceneContext`, occupation d'un salon | LEGACY COMPAT | Routage système depuis le lien persistant unique ; l'exclusivité physique du salon n'est pas une liste narrative |
| Propositions de démarrage en attente / récupération d'une réaction | LEGACY COMPAT | Un workflow par Guild/salon/message ; création depuis le Context de la proposition persistée |
| Balayage d'inactivité global | LEGACY COMPAT | Maintenance système de chaque Scene dans son propre Context actif ; aucune agrégation UI |
| Rapport GreyFate et claims d'opération | LEGACY COMPAT | Historique événement/Guild externe, distinct du catalogue de Scenes |

Aucun accès identifié BUG CROSS-CONTEXT ne reste. La recherche de scène active d'un
personnage et les avertissements de simultanéité sont limités au Context exact ;
Characters eux-mêmes restent Guild-scoped. Aucun appel à une chaîne d'héritage
n'agrège les Scenes.

Création + lien, déplacement et fermeture conservent leurs transactions atomiques.
Le lien direct et les trois mutations de cycles legacy placent maintenant validation
et écriture dans une transaction IMMEDIATE ; les UPSERTs legacy filtrent aussi leur
Context. Deux connexions visant des Contexts différents sur un même cycle donnent un
seul gagnant, sans modifier le compteur de l'autre. Les associations refusent un
Context effacé/incohérent ou une Guild différente de celle de leur Scene.

La reprise au démarrage ne réattribue aucun Context : bootstrap idempotent, balayage
d'inactivité, claims GreyFate persistants et résolution des références Discord
conservent les identifiants existants. Le balayage abandonne une Scene déplacée,
fermée ou redevenue active pendant les attentes Discord, avant nouveau prompt et
avant sa persistance. Le mécanisme de reprise Phone reste hors périmètre et inchangé.

## Indexes ajoutés

- `idx_ScenesV2_context` : `(guild_id, context_id, status)`.
- `idx_SceneAssistantCyclesV2_context`, `idx_SceneStartProposalsV2_context`,
  `idx_GreyFateDuos_context` : `(guild_id, context_id)`.
- `idx_scene_channels_v2_scene_active` : `(scene_id)` pour `unlinked_at IS NULL`.

Les huit colonnes ajoutées référencent toutes `Contexts(id) ON DELETE RESTRICT` ;
les triggers complètent la cohérence Guild/Scene et l'immuabilité. Les PK/FK métier
historiques restent présentes. Un test `EXPLAIN QUERY PLAN` vérifie que la lecture
Staff utilise l'index Context et l'index des liens actifs, sans scan de toutes les
Scenes de la Guild ni de tous les liens.

## Limites délibérées

- Un seul lien actif de scène par salon Discord, tous Contexts confondus : la
  contrainte existante est conservée. Les cycles legacy restent uniques par salon.
- Les lieux publics, zones, expressions et seuils ne proposent pas de variantes
  par Context en 3B ; ce sujet reste à un lot ultérieur.
- Un Context inactif reste lisible par les API historiques explicites, mais ne
  permet aucune création/mutation. La sélection Staff expose seulement les actifs.
- Characters, Continuities, Phone, Assets, Relationships, State Types, Entities et
  Automations ne reçoivent aucune colonne Context dans ce lot.
- Ni héritage des scènes, ni déploiement, ni Phase 3C.

## Recette

Tests dédiés : `contexts-scenes`, `contexts-scenes-migration`,
`contexts-scenes-bootstrap`, `contexts-scenes-staff`. Ils couvrent création,
isolation, IDs forgés, défaut changé, Context inactif, associations, atomicité,
bootstrap application x2, intégrité, concurrence, UI et droits Staff, drafts et duo
externe sans création de scène. Les assertions métier historiques restent présentes ;
les adaptations de fixtures/mocks explicitent seulement le nouveau contrat Context.

Recette finale du 7 septembre 2026 après revue : **27 tests dédiés 3B** (18 initiaux
+ 9 ajoutés pendant la revue), ciblés **156/156**, suite complète **766/766**
(baseline 739), aucun échec/skip/todo ; syntaxe **39/39**. Guardrails d'import,
frontières V2, bootstrap x2, intégrité et `git diff --check` OK. Node local v24.18.0.
Les 40 fichiers du lot se répartissent en 25 runtime, 14 tests et cette documentation.

Corrections finales : drafts bornés et non rejouables ; transactions des cycles
legacy et liens directs ; cohérence SQL des associations ; revalidation des droits
après lectures Discord ; abandon des snapshots d'inactivité devenus obsolètes ;
indexes de lecture ciblés. Les tests ajoutés couvrent aussi la persistance GreyFate
après changement de défaut, l'ACK perdu, le retry entrant et la concurrence SQLite.

Décision de revue : **B — CHECKPOINT READY**. P0 = 0, P1 = 0, P2 = 0.
P3 documenté : les fenêtres expirées, évincées ou perdues après redémarrage doivent
être rouvertes ; aucun effet sur l'isolation, la sécurité ou la migration.
Publication autorisée uniquement sur la branche Phase 3. Aucun déploiement, aucune
PR et aucun travail 3C ne font partie de ce checkpoint.
