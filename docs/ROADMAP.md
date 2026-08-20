# Greycore — Roadmap

Dernière mise à jour : juillet 2026

## Légende

- ✅ Terminé et vérifié
- 🔄 En cours de refonte ou de stabilisation
- 🧪 Présent, mais tests supplémentaires nécessaires
- ⬜ Prévu après la refonte
- 💡 Idée à étudier plus tard

---

## 0 — Socle technique et refonte

### Terminé

- ✅ Point d’entrée unique pour toutes les interactions Discord
- ✅ Routeurs séparés pour les boutons, formulaires et sélections
- ✅ Routeur dédié à la navigation entre les pages
- ✅ Routeurs métier séparés : personnages, profils, relations, rencontres, états, tenues, téléphone, bibliothèque et validation
- ✅ Autocomplétion gérée directement par chaque commande
- ✅ Événements `messageCreate`, `messageUpdate` et `messageDelete` réduits à de simples points d’entrée
- ✅ Gestionnaires séparés pour les téléversements d’avatars et de tenues
- ✅ Gestionnaire proxy compatible avec les personnages V1 et V2
- ✅ Modification, suppression et ouverture de fiche compatibles V1/V2
- ✅ Migration automatique du registre des messages proxy
- ✅ Initialisation unique, explicite et idempotente de la base de données
- ✅ Chargement complet des 14 commandes et des 5 événements
- ✅ Suite permanente de 111 tests isolés, lancée avec `npm test`
- ✅ Gestionnaire Rencontres découpé en utilitaires, vues, formulaires, création et gestion
- ✅ Gestionnaire Relations découpé en utilitaires, notifications, vues, formulaires, demandes et gestion
- ✅ Recherche Téléphone découpée en sources contacts, GreyCore, conversations et classement
- ✅ Conversations Téléphone découpées en stockage, création, participants et lecture
- ✅ Contacts Téléphone découpés en stockage, création, recherche et réglages
- ✅ Appels Téléphone découpés en stockage, lecture, création, transitions et messages
- ✅ Façade Téléphone découpée en cycle de vie, conversations, SMS et appels
- ✅ Synchronisation des interfaces d’appel découpée en résolution, affichage et sessions
- ✅ Édition du Profil découpée en accès, formulaires, normalisation et enregistrement
- ✅ Gestion des Tenues découpée en accès, image, formulaires, vues et actions
- ✅ Validation découpée en soumission, notifications, vues et correction après refus
- ✅ Types d’état V2 séparés du gestionnaire historique avec leur propre dépôt de données
- ✅ Installations séparées entre dépôt SQL et règles métier
- ✅ Personnages et continuités séparés entre dépôts SQL et règles métier
- ✅ Nettoyage transactionnel des correspondances V1/V2 lors des suppressions
- ✅ Rencontres séparées entre dépôt SQL et règles métier
- ✅ Validation métier des dates et participants des rencontres
- ✅ Relations séparées entre types, demandes, transactions et relations actives
- ✅ Compatibilité de schéma Relations déplacée vers l’initialisation de la base
- ✅ États actifs séparés entre dépôt SQL et règles métier
- ✅ Profils séparés entre dépôt SQL et règles métier
- ✅ Tenues séparées entre dépôt SQL et transactions métier
- ✅ Validation staff alimentée par le profil courant, avec repli sur les anciennes données
- ✅ Utilisateurs, réglages, modules et messages staff séparés en dépôts dédiés
- ✅ Bibliothèque, SMS et recherche Téléphone séparés des accès SQL
- ✅ Dépôts Téléphone rangés hors des gestionnaires, avec compatibilité interne conservée
- ✅ Création, déploiement multi-serveurs et tableau de bord séparés de la base
- ✅ Transactions complètes de création et de déploiement isolées dans une unité de travail
- ✅ Schéma SMS complété avec le type de message et migration sans perte
- ✅ Réparation automatique des anciennes références Téléphone devenues invalides
- ✅ Type réel du personnage conservé sur toutes les fiches (PJ, PNJ, Random et réservés)
- ✅ Audit automatique : aucun accès SQL dans les gestionnaires, services ou interactions V2
- ✅ Services SMS, appels et notifications replacés dans le cœur Téléphone V2
- ✅ Frontières V1/V2 contrôlées automatiquement, avec compatibilité proxy conservée
- ✅ Service central de réponses Discord privées, compatible serveur et messages privés
- ✅ Permission personnage commune aux parcours V1, V2 et staff
- ✅ Fiches des autres joueurs consultables en lecture seule, sans commandes de modification
- ✅ Réponses privées et erreurs du parcours Téléphone harmonisées
- ✅ Téléphone protégé contre les identifiants de personnage, de téléphone et de conversation falsifiés
- ✅ Validation limitée au staff du serveur exact de l’installation
- ✅ Soumission d’installation limitée au propriétaire du personnage
- ✅ Permission serveur commune, compatible avec les différents formats Discord
- ✅ Suppressions globales réservées au propriétaire du personnage
- ✅ États, rencontres et relations non jouables avant validation de l’installation
- ✅ Types d’état isolés par serveur
- ✅ Test permanent interdisant le retour des réponses privées écrites en dur
- ✅ Journaux V2 centralisés avec heure, niveau et composant
- ✅ Contrôle permanent contre les textes mal encodés

### Découpes terminées

- ✅ Découper `EncounterV2Handler` en vues, actions et services
- ✅ Découper `RelationshipV2Handler` en vues, demandes et gestion
- ✅ Découper les grands gestionnaires du téléphone
  - ✅ `PhoneSearchV2Manager`
  - ✅ `PhoneConversationV2Manager`
  - ✅ `PhoneContactV2Manager`
  - ✅ `PhoneCallV2Manager`
  - ✅ `PhoneV2Manager`
  - ✅ `PhoneCallUIManager`
- ✅ Découper `ProfileEditHandler`
- ✅ Découper `OutfitV2Handler`
- ✅ Découper le parcours de validation et de correction après refus
- ✅ Séparer les requêtes SQL des règles métier
  - ✅ Types d’état
  - ✅ Installations
  - ✅ Personnages et continuités
  - ✅ Rencontres
  - ✅ Relations
  - ✅ États actifs, profils et tenues
  - ✅ Bibliothèque et suivi des messages d’installation
  - ✅ Utilisateurs, réglages et modules serveur
  - ✅ Téléphone et services d’orchestration

### Stabilisation du socle

- ✅ Centraliser les réponses d’erreur Discord
- ✅ Auditer les permissions de toutes les actions sensibles
- ✅ Uniformiser `flags: MessageFlags.Ephemeral`
- ✅ Nettoyer les anciens textes mal encodés
- ✅ Uniformiser les journaux techniques
- ✅ Isoler les dépendances V1 restantes aux frontières de compatibilité
- ⬜ Étendre les tests aux 20 formulaires, 13 sélections et boutons métier

---

## 1 — Personnages, validation et installations

### Terminé

- ✅ Création des différents types de personnages
- ✅ Nom du proxy clairement demandé pendant la création
- ✅ Avatar demandé avant l’envoi au staff
- ✅ Profil, identité, informations et histoire
- ✅ Validation ou refus par le staff
- ✅ Motif de refus et correction du profil
- ✅ Notification du joueur après la décision du staff
- ✅ Personnage non jouable avant validation
- ✅ Suivi dans le salon staff dès le début de la création
- ✅ Carte staff unique mise à jour lors de l’avatar puis de la validation
- ✅ Étapes visibles : informations, avatar, envoi et décision du staff
- ✅ Gestion des installations depuis la fiche
- ✅ Installation sur un nouveau serveur
- ✅ Choix entre personnage complet et nouvelle continuité
- ✅ Nouvelle continuité avec données RP séparées
- ✅ Validation staff sur le nouveau serveur
- ✅ Guide intégré pour l’installation multi-serveurs
- ✅ Bouton direct et parcours guidé pour installer sur le serveur courant
- ✅ Avatar initial copié vers la nouvelle installation
- ✅ Changements d’avatar ultérieurs propres à chaque serveur
- ✅ Suppression d’une installation serveur sans supprimer sa continuité
- ✅ Cycle automatisé refus, correction, nouvelle soumission et validation
- ✅ Tests automatisés des deux modes d’installation multi-serveurs
- ✅ Validation staff des changements de fiche et d’avatar, avec conservation des données visibles jusqu’à la décision
- ✅ Suppression d’une continuité et de ses données
- ✅ Suppression d’un personnage

### À stabiliser avant bêta

- 🧪 Parcours complet avec plusieurs serveurs réels
- ✅ Refus puis nouvelle soumission d’une installation
- 🧪 Suppression avec plusieurs continuités
- 🧪 Tous les boutons Retour du parcours personnage
- ✅ Audit complet des permissions propriétaire/staff

### Après la refonte

- ⬜ Archivage et restauration
- ⬜ Duplication
- ⬜ Import et export
- ⬜ Historique des modifications

---

## 2 — Relations, rencontres et états

### Relations

- ✅ Affichage, ajout, modification et suppression
- ✅ Types symétriques et asymétriques
- ✅ Installation des types par défaut
- ✅ Recherche par nom avec autocomplétion
- ✅ Résultats triés par ordre alphabétique
- ✅ Demande envoyée au propriétaire du personnage ciblé
- ✅ Création directe sans demande entre deux personnages du même propriétaire
- ✅ Acceptation ou refus par le propriétaire
- ✅ Notification du demandeur après la décision
- ✅ Notes de relation
- ✅ Protection contre la modification d’une relation appartenant à un autre personnage
- ⬜ Historique des changements

### Rencontres

- ✅ Affichage
- ✅ Rencontre avec un personnage Greycore
- ✅ Rencontre avec un personnage externe
- ✅ Modification
- ✅ Suppression avec confirmation
- ⬜ Date personnalisée
- ⬜ Chronologie et filtres
- ⬜ Intégration au journal

### États

- ✅ Affichage, ajout, modification et suppression
- ✅ Types configurables
- ✅ Installation des types par défaut
- ✅ Suppression administrative sécurisée
- ⬜ Durée et expiration automatique
- ⬜ Historique
- ⬜ Notifications

---

## 3 — Téléphone et communication

### Fonctionnel

- ✅ Numéro automatique
- ✅ Ouverture depuis la fiche et commande `/phone`
- ✅ Autocomplétion des personnages jouables du propriétaire
- ✅ Conversations et historique des SMS
- ✅ Recherche d’un destinataire
- ✅ Envoi et réponse rapide
- ✅ Publication avec le nom et l’avatar local du personnage
- ✅ Notifications privées
- ✅ Conversations de groupe : création guidée, recherche et retrait des membres, SMS et notifications
- ✅ Mise à niveau automatique des anciennes données d’appels
- ✅ Protection contre l’utilisation d’un personnage tiers
- ✅ Répertoire GreyCore automatique et synchronisé lors de l’ouverture d’une conversation privée
- ✅ MMS : images et GIF, légende facultative, historique et notifications

### Présent, à stabiliser

- 🧪 Contacts
- 🧪 Historique des appels
- 🧪 Appels privés et actions pendant l’appel
- 🧪 Recherche téléphonique avancée (sécurité et classement vérifiés)
- 🧪 Paramètres de conversation

### Plus tard

- ⬜ Commande rapide `/sms`
- ⬜ Messages vocaux
- ⬜ Réactions aux messages
- ⬜ Numéros et contacts système

---

## 4 — Tenues et vie du personnage

### Tenues

- 🧪 Tenue actuelle
- 🧪 Ajout et remplacement du visuel
- 🧪 Titre et description
- 🧪 Gestion depuis la fiche
- ⬜ Historique complet
- ⬜ Activation par module

### Biens

- ✅ Biens rattachés à une continuité et au serveur courant
- ✅ Catégories par défaut : véhicules, propriétés, entreprises, animaux et autres biens
- ✅ Catégories supplémentaires créées par le staff
- ✅ Ajout, consultation, modification et suppression depuis la fiche
- ✅ Transfert vers un autre personnage jouable et historique du transfert conservé
- ✅ Consultation en lecture seule des biens d’un autre joueur
- ✅ Envoi direct d’une image plutôt qu’un lien
- ⬜ Copropriétaires
- ✅ Historique des transferts consultable depuis la fiche d’un bien

### Modules futurs

- ⬜ Journal et chronologie
- ⬜ Banque et argent
- ⬜ Famille et réputation
- ⬜ Casier judiciaire
- ⬜ Dossier médical
- ⬜ Agenda et localisation
- ⬜ Organisations et gangs

---

## 5 — Administration et préparation bêta

- ✅ Validation staff
- ✅ Suivi des installations
- ✅ Paramètres et modules par serveur, configurables visuellement avec `/config modules`
- 🧪 File de validations staff avec `/validations attente`
- ✅ Historique des décisions, accessible depuis chaque carte de validation staff
- ⬜ Permissions détaillées
- 🧪 Configuration du salon de validation : salon existant ou création privée guidée avec rôle staff
- ✅ Journaux d’erreurs exploitables
- ✅ Sauvegarde automatisée de la base
- ⬜ Test avec plusieurs joueurs et plusieurs serveurs
- ⬜ Test des webhooks sur Discord
- ⬜ Test de migration depuis une sauvegarde V1
- ⬜ Déploiement de préproduction
- ⬜ Déploiement sur le VPS

---

## 6 — Feuille de route de la bêta fermée

### Avant d’inviter les joueurs

- ✅ Les parcours principaux sont couverts par 135 tests automatisés.
- ⬜ Redéployer les commandes Discord, puis redémarrer le bot avec la dernière version.
- ⬜ Effectuer une recette complète sur un serveur de test : création et validation d’un personnage, continuité, relations, états, téléphone, groupe, MMS, biens et permissions staff.
- ⬜ Vérifier les deux parcours de configuration : choisir un salon de validation existant ou en créer un privé avec un rôle staff.
- ⬜ Faire un essai avec 2 à 5 vrais utilisateurs, dont une personne ne disposant pas des droits staff.
- ⬜ Préparer une sauvegarde récupérable de la base avant chaque mise à jour du bot.

### Pendant la bêta sur un serveur

- 🧪 Centraliser les retours, captures et erreurs dans un canal staff.
- 🧪 Reproduire chaque problème signalé, corriger puis ajouter un test lorsque c’est pertinent.
- 🧪 Surveiller particulièrement les droits d’accès, les installations multi-serveurs et les notifications privées.
- 🧪 Mesurer la stabilité réelle du bot avant d’ajouter de gros modules supplémentaires.

### Conditions de passage à une bêta plus large

- ⬜ Une ou deux semaines sans perte de données ni erreur bloquante.
- ⬜ Sauvegardes automatisées et procédure de restauration testée.
- ⬜ Journaux d’erreurs consultables et consignes de support pour le staff.
- ⬜ Documentation d’installation et d’administration relue par une personne extérieure au projet.

---

## Ordre recommandé des prochaines étapes

1. ✅ Découper le gestionnaire Rencontres.
2. ✅ Découper le gestionnaire Relations.
3. ✅ Refondre les grands gestionnaires du téléphone.
4. ✅ Découper les gestionnaires Profil et Tenues.
5. ✅ Auditer les permissions des actions sensibles.
6. ✅ Finaliser la centralisation des réponses privées et des erreurs.
7. ✅ Nettoyer les textes mal encodés et les anciens journaux.
8. ✅ Étendre la suite de tests aux parcours de validation et d’installation.
9. ✅ Terminer la séparation SQL résiduelle.
10. Déployer les commandes, puis effectuer la recette Discord sur un serveur fermé.
11. Tester avec quelques joueurs et consigner les retours de bêta.
12. Mettre en place les sauvegardes avant tout déploiement durable.
13. Étendre les tests automatisés selon les cas découverts pendant la recette.
14. Reprendre ensuite les détails d’interface et les nouvelles fonctionnalités.
