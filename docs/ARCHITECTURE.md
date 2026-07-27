# Greycore — Architecture

## Principe général

Greycore est une application de gestion de personnages intégrée à Discord.

L’architecture doit séparer :

- les événements Discord ;
- le routage ;
- les interactions ;
- la logique métier ;
- l’accès à la base de données ;
- les vues.

---

# Flux général

```text
Discord
↓
Event
↓
Router
↓
Interaction
↓
Service
↓
Manager
↓
SQLite