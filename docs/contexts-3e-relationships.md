# Phase 3E — Relationships scoped par Context

## Pourquoi un cutover additif

`ContinuityRelationshipsV2` possède historiquement une unicité globale matérialisée par un auto-index SQLite. Cet auto-index ne peut pas être retiré par une migration additive. La Phase 3E ne reconstruit donc aucune table historique : `ContinuityRelationshipsV2` et `PendingContinuityRelationshipsV2` deviennent des sources de migration et archives read-only.

## Runtime canonique

`InstallationRelationshipsV2` et `PendingInstallationRelationshipsV2` sont les seules autorités runtime. Chaque ligne relie deux Installations de la même Guild et du même Context. Les Character et Continuity restent globaux et sont dérivés des Installations par jointure. `RelationshipTypes` reste une configuration Guild-wide réutilisable dans tous les Contexts.

La paire conserve son orientation métier dans `installation_a_id`/`installation_b_id`. Une paire canonique low/high garantit en base que A–B et B–A ne peuvent pas coexister activement pour le même type et le même Context. Une relation terminée reste historique et n’empêche pas un nouveau cycle. Guild, Context, Installations, paire et type sont immuables.

## Migration et legacy

Une relation ou demande legacy est copiée uniquement lorsque ses deux Continuities se résolvent vers une unique paire d’Installations de même Guild et même Context. Les notes, dates, statuts, auteurs, réponses et l’orientation sont conservés. `legacy_relationship_id` et `legacy_request_id`, uniques et nullable, rendent le bootstrap idempotent.

Une ligne absente, cross-Context ou autrement ambiguë reste exactement une fois dans le legacy. Elle n’est ni dupliquée, ni déplacée vers le Context par défaut, ni rendue acceptable dans le runtime. Les lectures legacy sont explicitement nommées et ne sont jamais mélangées aux listes actives.

## Player, Staff et arbre familial

Les surfaces Player partent de l’Installation courante. Cibles, listes, demandes et mutations restent dans son Context exact. L’arbre familial direct et multi-hop lit uniquement les relations runtime du même couple Guild + Context ; les relations Parent et legacy ne sont pas héritées.

Les types restent administrés à l’échelle de la Guild. Les statistiques de relations runtime utilisent les nouvelles tables. Les permissions existantes `relationships/read` et `relationships/write`, ainsi que les droits naturels, restent inchangées : le Context est une frontière de données, pas un nouveau domaine de permission.

Un Context inactif reste lisible pour l’historique autorisé, mais refuse toute création ou acceptation. Changer le Context par défaut ne déplace jamais une relation ou une demande persistée.

Chaque mutation par identifiant recharge la relation ou la demande runtime et revalide la Guild, le Context et les droits naturels avant effet. Les Installations référencées sont protégées par `ON DELETE RESTRICT` afin qu’une suppression ne puisse pas effacer silencieusement le lore ; le workflow normal continue de privilégier l’archivage.

## Rollback

Le rollback 3E vers 3D est code-only : les tables additives peuvent rester ignorées et le legacy demeure intact. Un rollback global de la Phase 3 vers la Phase 2 reste un sujet distinct qui peut nécessiter une coordination code/base à cause des phases antérieures.

Les réattributions manuelles de lignes legacy ambiguës, les types spécifiques à un Context et l’agrégation historique runtime+legacy restent hors 3E.
