# Mana Mechanica — collectes et protocoles

## Prix : API Blizzard directe

Le [workflow Blizzard](.github/workflows/tensions.yml) lance un cycle horaire à la minute 17 UTC. Le collecteur vise six départs par heure pour les 36 maisons disponibles : Europe à :24 et :28, Amériques à :32 et :36, Corée à :43 et Taïwan à :48. Chaque maison utilise tout le panier publié (674 objets au 28 novembre 2026). Les reprises à 15 minutes libèrent le collecteur pour les autres lots. Un bilan commun aux six lots détermine l’alerte. GitHub peut retarder un départ. La couverture se vérifie dans les archives par heure source.

- Exécution : `node scripts/blizzard/update-watchlist.mjs --stdin`, accès par stdin protégé.
- Vérifications : `node --test tests/blizzard-collector.mjs tests/blizzard-listing-metrics.mjs`.
- [Protocole Blizzard horaire](docs/blizzard-hourly-protocol.md).

Les secrets Blizzard restent dans Sites. Le runner utilise le secret applicatif GitHub existant pour obtenir un jeton éphémère par le broker authentifié. Aucun secret dans les fichiers, arguments ou sorties. Les grands JSON sont traités en mémoire ; seuls les résultats bornés du panier sont archivés.

## Carnet Sombrelune

Le workflow [.github/workflows/darkmoon-depth.yml](.github/workflows/darkmoon-depth.yml) vérifie et conserve le carnet Europe Normal Alliance, distinct des simples résumés de prix. [Protocole](docs/darkmoon-market-protocol.md).

## Population

[Protocole Population](docs/population-census-protocol.md) : Blizzard direct en cours de qualification ; WoWStats, Classic Armory et aotc conservés pour leurs archives et apports utiles non couverts. Une seule tâche quotidienne existante, aucun workflow GitHub Population et aucune seconde tâche de secours.

## Archives et articles

- [Conservation et accès aux historiques](docs/history-preservation-20261122.md) : les observations AHledger, Population et éditions closes restent disponibles avec leurs sources et dates.
- [Rythmes de l’hôtel des ventes](docs/auction-rhythms-protocol.md).
- [Versions FR, EN et ES](docs/editorial-localization-protocol.md).
- [Migration et catalogue historique](docs/hourly-watchlist-20261121.md), conservés comme documentation datée.

Les nouvelles données Blizzard suivent leur fenêtre de conservation propre ; elle n’est pas appliquée rétroactivement aux archives AHledger. Les sources ne sont pas mélangées pour calculer une variation ou une confirmation.

## Exécutions et maintenance

Les deux workflows ci-dessus sont les seuls workflows actifs. Les anciens scripts AHledger appelant `/api/tensions/refresh` ont été retirés ; ils restent récupérables dans l’historique Git. Aucun lecteur d’archives ni relevé n’a été supprimé.

Un échec réel reste un échec et conserve les valeurs précédentes avec leur date. [Diagnostic des notifications d’échec](docs/automation-cleanup-20261122.md). Les réglages de messagerie et de notification ne sont pas modifiés.

Pour une nouvelle règle, vérifier son périmètre, les sources, articles et protocoles concernés, appliquer uniquement les changements utiles et contrôler la persistance après publication. Préserver les statuts de publication et les archives.
