# Lecture commune des marchés · 22 novembre 2026

Restauration : version publique 147, commit `ebad88d7b237b94e367a044fed4f96eb4d060e25`. Le propriétaire demande de réunir AHledger et Blizzard et de supprimer le choix de fournisseur dans les articles. Les archives, identifiants du panier, marchés, planificateurs et secrets ne changent pas.

## Règles

- Les recherches publiques utilisent automatiquement `source=combined`. Les anciens liens `source=ahledger` ne divisent plus l’interface. Les lecteurs techniques par fournisseur restent disponibles pour les contrôles, sans lancer de collecte.
- Les historiques réunissent les enregistrements par marché, objet, fournisseur, type et date source. Les corrections canoniques remplacent seulement la version précédente de la même observation. Les données absentes restent absentes, un stock nul reste nul et les dates des scans ne deviennent pas des dates de calcul.
- Les deux fournisseurs ne sont ni additionnés pour produire un stock ni moyennés pour produire un prix unique. Le prix courant correspond à une observation complète, la plus récente compatible ; Blizzard est prioritaire à date égale. Une archive de remplacement garde sa source et sa date.
- Les graphiques, tableaux et exports présentent les deux provenances. Une courbe s’interrompt au changement de fournisseur et dans les lacunes ; les variations et la volatilité utilisent uniquement des relevés du fournisseur du prix courant.
- Une paire simulée achat–revente appartient au même fournisseur. Dans un test de créneau, une date locale contribue une fois : paire Blizzard complète en priorité, sinon paire AHledger complète. Le classement peut réunir des scénarios documentés par les deux sources et indique leur provenance. Les tensions comparent un stock et une référence du même fournisseur ; aucune nouvelle confirmation n’est créée par la lecture commune.
- L’ancien périmètre AHledger KR/TW reste attribué dans l’historique et les exports. Il n’est pas utilisé comme cours courant de Corée seule, ni dans les simulations ou le classement de ce marché. Taïwan, Blackwater, régions, règles et factions ne sont pas fusionnés.
- Sombrelune propose un historique prix/stock commun et conserve le coût d’un lot de carnet détaillé comme mesure différente. Une médiane ne remplace pas le coût réel d’achat d’une quantité donnée.
- Les épisodes historiques, semaines closes, archives Population et contenus éditoriaux datés sont conservés. Les conditions de conservation de chaque fournisseur continuent à s’appliquer. La collecte Blizzard horaire existante reste inchangée ; aucune collecte AHledger n’est réactivée.

## Vérification

`tests/combined-market.mjs` couvre les prix simultanés contradictoires, le vrai zéro de stock, la moyenne manquante, la préférence à date égale, le remplacement par une archive datée, une source indisponible, KR/TW, l’absence de marges/variations/tensions traversant les sources et le comptage unique d’une date. Les tests existants des Rythmes, lecteurs, Observatoire, Sombrelune, Faveurs, bulletin et conservation sont également exécutés.

Après publication : vérifier la suppression des sélecteurs, les anciennes séries et les nouveaux scans dans la même recherche, le changement de marché et d’objet, les filtres de période, les trois langues, les exports et la cohérence des tableaux et graphiques. Le succès de publication ne remplace pas ces contrôles.
