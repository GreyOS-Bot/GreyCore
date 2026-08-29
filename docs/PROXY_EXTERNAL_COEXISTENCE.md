# Coexistence du Proxy GreyCore avec les proxies externes

## Garanties locales

GreyCore protège ses propres traitements concurrents avec un claim indexé par
l’identifiant Discord du message utilisateur original. Les événements
`messageCreate` et `messageUpdate` GreyCore portant ce même identifiant ne
peuvent donc pas créer deux proxies GreyCore concurrents.

Après avoir publié son webhook, GreyCore tente de supprimer le message
original. Si ce message a déjà disparu, GreyCore compense uniquement le message
webhook qu’il vient lui-même de créer. Si cette compensation ne peut pas être
confirmée, il conserve les informations nécessaires au diagnostic au lieu de
supprimer aveuglément leur trace.

Le gestionnaire de webhooks sélectionne uniquement un webhook dont le
propriétaire est le client GreyCore et dont le nom canonique est
`Greycore Proxy`. Les webhooks tiers ne sont jamais réutilisés comme webhooks
GreyCore. Les messages entrants émis par un bot ou un webhook sont arrêtés avant
le traitement Proxy.

## Limite inter-bots

Ces garanties assurent l’idempotence GreyCore ↔ GreyCore. Elles ne constituent
pas une coordination transactionnelle avec PluralKit ou un autre moteur de
proxy.

Avec les seuls événements Discord, GreyCore ne peut pas :

- savoir à l’avance si PluralKit recevra ou traitera un message ;
- relier de manière déterministe un message utilisateur original au message
  webhook que PluralKit pourrait créer ;
- identifier sans ambiguïté un doublon externe à partir d’un nom, d’un avatar,
  du contenu ou de la proximité temporelle ;
- supprimer automatiquement un message externe supposé être un doublon sans
  risque de faux positif.

GreyCore ne supprime donc jamais automatiquement un webhook tiers qu’il suppose
être un doublon. La coexistence reste possible tant que les deux moteurs ne
reconnaissent pas le même message. Pour garantir qu’un seul moteur agit, il faut
éviter de configurer GreyCore et un proxy externe avec exactement les mêmes
syntaxes ou tags.

## Phase 2 Config

La politique de priorité du proxy est reportée à la Phase 2 Config. Une future
configuration administrée pourra choisir explicitement entre GreyCore et un
proxy externe. Aucun réglage, stockage, client API ou comportement automatique
de ce type n’est introduit dans la Phase 1.
