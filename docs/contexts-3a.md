# Contexts — fondation 3A

Guild reste la frontière d'installation, sécurité et Discord. Context représente une
frontière RP générique appartenant à une Guild. Aucun domaine existant n'est migré.

Le bootstrap ajoute Contexts et ses index sans créer de lignes. La résolution sans
identifiant crée à la demande un défaut nommé « Contexte par défaut ». Une résolution
explicite invalide ou d'une autre Guild échoue, sans repli. Le premier Context créé
devient défaut ; les changements de défaut sont transactionnels et indexés uniques.
Les lectures de liste n'effectuent aucune création.

Les mutations métier passent par ContextService : validation de clé et parent,
détection des cycles, scope obligatoire. Le repository contient seulement la
persistance et les transactions. Les contraintes SQL protègent aussi l'unicité et
la référence parent dans une même Guild lorsque les foreign keys sont activées.

parent_context_id et lineage(guildId, id), ordonné racine -> enfant, préparent les
futurs héritages. Aucun héritage automatique de configuration, permissions, visibilité,
locks, flags ou scopes n'est appliqué. Ces moteurs devront définir leurs règles
explicites et leurs audits dans les lots suivants. Les permissions restent guild-scoped.

L'UI staff revalide owner/Admin avant chaque lecture et mutation, y compris au submit.
Elle expose liste paginée, création, nom/description et défaut. Le parent est disponible
par API métier ; aucune UI d'héritage n'est introduite. Pas de suppression, ni API de
désactivation tant que les dépendances des prochains domaines ne sont pas définies.
is_active est préparé dans le modèle et la résolution refuse un contexte inactif.

Les éditions de nom/description utilisent la dernière écriture ; il n'y a pas encore
de verrou optimiste ou de journal d'audit Context. Les APIs exigent toujours guildId.

## Garanties vérifiées au checkpoint

getDefault et listByGuild sont des lectures pures. ensureDefault et resolve sans
contextId sont explicitement susceptibles de créer le défaut. Un contextId vide
est invalide et ne déclenche pas de fallback. Les clés acceptées restent minuscules,
sans espaces et longues de 1 à 64 caractères : les espaces sont refusés, pas retirés
silencieusement, et la casse n'est jamais convertie.

BEGIN IMMEDIATE sérialise ensureDefault et les mutations sur plusieurs connexions
SQLite. Deux demandes concurrentes retournent le même identifiant ; le délai SQLite
reste applicable en cas de verrou prolongé. Une erreur pendant setDefault annule
l'intégralité de la transaction. Un contexte inactif est refusé comme nouveau défaut.

La DB garantit clé/default uniques, default actif, self-parent interdit et FK de Guild
et parent (foreign_keys activé). Les cycles indirects et le caractère actif du parent
sont contrôlés par le service. lineage possède aussi une protection défensive contre
un cycle provenant d'écritures SQL externes. Les repositories restent des primitives
internes de persistance : les consommateurs métier utilisent ContextService.
