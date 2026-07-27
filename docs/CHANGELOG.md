# Greycore — Changelog

Toutes les évolutions importantes de Greycore sont consignées dans ce fichier.

---

# Version en développement

## Général

### Ajouté

- Un guide de première installation est envoyé dans le serveur lorsque GreyCore le rejoint.
- La commande `/aide` rend la documentation accessible par rubrique : démarrage, personnages, relations, états, téléphone et biens.
- Les membres ayant accès au salon de validation sont automatiquement reconnus comme staff pour les commandes d’états et de relations.
- La liste `/personnages liste` est accessible à tous les membres et se consulte par première lettre afin de vérifier les prénoms déjà utilisés ; les actions d’archivage, restauration et suppression restent staff.
- `/config modules` permet désormais au staff d’activer ou désactiver visuellement les modules du serveur sans effacer leurs données ; les modules désactivés sont masqués dans les fiches.
- `/config validation` peut utiliser un salon existant ou créer un salon privé `📋・validations` avec le rôle staff choisi.

## Téléphone

### Ajouté

- L’ouverture d’une conversation privée ajoute automatiquement les deux personnages à leurs répertoires et rafraîchit leurs informations GreyCore sans doublon.
- Les conversations téléphoniques acceptent désormais les MMS : images et GIF, avec légende facultative, historique et notification directe.

## Biens

### Ajouté

- Les personnages disposent d’un module Biens depuis leur fiche : véhicules, propriétés, entreprises, animaux et autres biens.
- Chaque serveur reçoit des catégories par défaut ; le staff peut créer ses propres catégories depuis l’interface.
- Un bien peut être modifié, supprimé ou transféré à un autre personnage jouable du même serveur, avec conservation de son historique de transfert.

## Personnages

### Ajouté

- Les changements de fiche et d’avatar d’un personnage déjà validé sont désormais soumis au staff ; les données actuellement validées restent visibles et utilisables jusqu’à la décision.
- Création de personnages joués, PNJ, Random et personnages réservés.
- Fiches complètes avec nom, prénom, âge, gang et histoire.
- Avatars personnalisés.
- Menu de gestion du personnage.
- Validation par le staff.
- Motifs de refus.
- Suivi automatique de l’installation dans un salon staff dès le début de la création.
- Carte de progression unique mise à jour après l’avatar puis lors de la validation.
- Chaque carte de validation staff propose un historique privé des demandes, refus, nouvelles soumissions et décisions.
- Le propriétaire d’un personnage reçoit un message privé lorsqu’un autre joueur lui transfère un bien, avec un lien vers le salon concerné.
- Les propriétaires et le staff peuvent consulter l’historique des transferts depuis la fiche d’un bien.
- L’accueil de la bibliothèque permet maintenant d’ouvrir directement un personnage, sans devoir naviguer entre deux écrans.
- La configuration du salon d’erreurs envoie un message de test immédiat ; les erreurs rattrapées par les routeurs principaux sont aussi remontées au staff.
- Installation multi-serveurs accessible depuis un bouton direct avec guide intégré.
- Numéro de téléphone attribué automatiquement.

### Modifié

- La commande personnelle devient `/mes personnages`, afin de la distinguer clairement de la liste publique du serveur `/personnages liste`.
- Les Random, PNJ réservés et personnages Réservé staff suivent désormais une création simplifiée ; les PJ et PNJ personnels conservent leur fiche complète.
- Les Random validés peuvent être joués par tous ; les PNJ réservés et personnages Réservé staff sont désormais limités au staff du serveur.
- Le bouton de relation « Modifier » est devenu « Modifier les détails » pour distinguer l’édition des précisions de la suppression du lien.
- La bibliothèque a été simplifiée : les actions indisponibles ont été retirées et « Mon univers » devient « Accueil ».
- Le bouton Modifier a été déplacé dans le Menu.
- La fiche principale est devenue le Hub du personnage.
- La couleur manuelle doit disparaître du nouveau parcours de création.
- Le parcours de création est en cours de refonte.

### Corrigé

- L’absence de types de relation affiche désormais la marche à suivre pour le staff et un retour direct vers les relations.
- Correction de la suppression aléatoire des messages proxy.
- Les fiches des autres joueurs sont désormais en lecture seule.
- Correction de l’ouverture de l’histoire depuis une fiche de personnage.
- Correction de l’ouverture des formulaires Identité et Informations depuis une fiche de personnage.
- Le bouton de consultation d’histoire en double a été retiré de la fiche personnage.
- La bibliothèque et les fiches personnelles sont explicitement privées : leurs manipulations ne sont visibles que par leur utilisateur.
- Le bouton Fermer ne peut plus affecter l’interface personnelle d’un autre utilisateur.
- Lorsqu’un serveur disparaît, ses installations sont nettoyées et les continuités qui ne sont plus utilisées ailleurs sont supprimées.
- « Voir la fiche » retrouve un personnage GreyCore depuis un proxy externe portant le même nom, notamment PluralKit.
- Sécurisation de la suppression interne des messages.
- Correction des boutons dépassant la limite Discord.
- Correction des emojis invalides.
- Correction du rafraîchissement après validation.
- Interdiction d’envoyer un SMS avec un personnage appartenant à une autre personne.

---

## Téléphone

### Ajouté

- Téléphones liés aux personnages.
- Numéros GreyTel au format `555-XXXX`.
- Conversations enregistrées.
- Historique des SMS.
- Envoi de SMS dans le salon courant.
- Webhooks utilisant le nom et l’avatar du personnage.
- Réponses rapides.
- Ouverture rapide d’une conversation.
- Notifications privées entre propriétaires différents.
- Commande `/phone`.
- Recherche de destinataires.
- Création guidée de conversations de groupe, avec recherche et retrait des membres.
- Envoi de SMS de groupe et notification de chaque participant GreyCore.

### Corrigé

- Réduction des `customId` trop longs.
- Utilisation d’identifiants numériques pour les téléphones et les messages.
- Vérification des propriétaires avant l’envoi.
- Les notifications de nouveau SMS ouvrent directement le message concerné dans son salon.
- Correction automatique des anciennes données d’appels qui bloquaient la fin d’un appel manqué.
- Les appels en attente ne basculent plus automatiquement en appel manqué.
- Les boutons d’appel reçus en message privé fonctionnent aussi après un redémarrage du bot.
- Les cartes de validation affichent le pseudo du membre du staff au lieu de son identifiant Discord.
- La Bibliothèque explique comment installer un personnage sur le serveur courant.
- L’accès au salon de validation permet de valider ou refuser les demandes qui y sont publiées.

---

## Relations

### Ajouté

- Relations symétriques et asymétriques.
- Ajout de relations depuis la fiche.
- Installation groupée des relations par défaut.
- Affichage inversé selon le personnage consulté.

### Corrigé

- Ajout du routage manquant du bouton Ajouter.
- Ajout des gestionnaires de sélection du personnage et du type.
- Les relations entre deux personnages du même propriétaire sont créées directement, sans demande inutile.

---

## États

### Ajouté

- Types d’états configurables.
- Ajout et suppression d’états.
- Couleurs et emojis personnalisables.

---

## Rencontres

### Ajouté

- Rencontres entre personnages Greycore.
- Rencontres avec des personnages externes.
- Suppression de rencontres.
- Affichage croisé entre les personnages concernés.
