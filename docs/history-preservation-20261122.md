# Historiques conservés après le changement de collecte · 22 novembre 2026

Point de restauration identifié : publication publique 143, source `dfc701c00b209a9c3fac5d3dec84e711b23b1fd5`. Le correctif conserve la collecte directe Blizzard et n'effectue aucun POST de données ni suppression de relevés.

## Diagnostic vérifié

La vue par défaut des Rythmes demandait exclusivement Blizzard. Pour l'étoffe de lin #2589 en Europe Normal Alliance, elle ne renvoyait qu'un point ; l'ancienne couche `/api/auction-rhythms?market=forever.normal.alliance.eu&item=2589&source=ahledger` conserve 427 points avant ajout des scans statiques. L'API comparative AHledger conserve 103316 points pour 442 objets. Le changement de source avait donc masqué l'accès aux séries antérieures.

Comparaison Git avec la publication 132, source `266f51b8617d9d829d63d6992007e1e133583fe6` : 444 fichiers `content/weekly-market`, `content/population`, `public/auction-rhythms/archive-eu` et `public/weekly-market/week-02` identiques ; aucun absent. L'archive exacte EU compte 70890 points sur 402 objets. Les éditions du bulletin conservent 11212 points semaine1,295585 points semaine2 et6925 agrégats quotidiens semaine2.

Population : les 120 enregistrements serveur subsistent. Ils représentent72 groupes source/région/mode/date source ;48 lignes sont des consultations répétées du relevé WoWStats du16 novembre, pas48 nouvelles observations indépendantes. L'ancienne vue/export ne donnait que les32 derniers enregistrements fusionnés ; elle ne permettait pas d'examiner tous les détails plus anciens. Les rapports sans histogramme n'étaient pas exposés dans l'API historique.

## Affichage rétabli

- Module partagé `public/retained-market-history.mjs` : historique conservé visible dans les Rythmes, les fenêtres d'objet de l'Observatoire et les graphiques Sombrelune. Lecture de l'archive AHledger, des scans statiques et de Blizzard depuis le Site uniquement ; aucune nouvelle collecte chez un fournisseur.
- Source, date, type (scan/agrégat), premier/dernier point et couverture séparés. Les courbes ne relient jamais deux fournisseurs ou deux types de relevé. Les lots statiques sont fusionnés avant les corrections canoniques serveur. Une consultation répétée ne crée pas un point supplémentaire.
- Choix minimum/médian/moyenne mesurée, quantités, quatre périodes, inspection au clavier/toucher et tableaux/export CSV complets. Zéros de stock réels conservés, champs absents non remplacés. Les courbes denses sont réduites par pixel en gardant les extrêmes ; les valeurs exactes restent dans le tableau/export.
- Le comparatif des Rythmes conserve son fournisseur exclusif et offre un accès aux analyses AHledger précédentes. Les périodes hebdomadaires closes ne sont pas recalculées avec des offres actuelles. Le bulletin et le catalogue des faveurs gardent des liens explicites vers l'historique.
- Les épisodes AHledger sont à nouveau accessibles sous l'analyse des tensions Blizzard, identifiés comme archives ; aucune première détection ou confirmation n'est remise à aujourd'hui.
- Population : explorateur source/jour dans les sept onglets FR/EN/ES. Enregistrements serveur, photographies initiales, archives embarquées et rapports restent identifiables, y compris échantillons vides, chevauchements et consultations répétées. Les données originales complètes se déplient par ligne ; l'export contient `{baseline,history}` sans écraser les anciennes distributions.

La politique des sources Population courantes n'est pas réactivée : une archive retirée n'est pas présentée comme un recensement Blizzard récent. Les limites de conservation des nouveaux snapshots Blizzard restent celles du protocole existant (30 jours), en attendant une autorisation documentée différente. La limite ne s'applique pas rétroactivement à nos archives AHledger. Les conditions Blizzard sont identifiées ici : https://www.blizzard.com/fr-fr/legal/a2989b50-5f16-43b1-abec-2ae17cc09dd6/conditions-d-utilisation-de-l-api-de-developpement-blizzard.

## Vérifications

Tests d'identité marché/objet/fournisseur, scans coïncidents par fournisseur et type, correction canonique prioritaire, déduplication, quantités nulles et zéro, provenance/export, archives Population répétées et échantillons vides. Tests existants des lecteurs, Rythmes, Sombrelune, Population et bulletins. Après publication : vérifier le lin #2589 dans la vue publique par défaut, un second objet/marché, la fenêtre d'objet, les anciens épisodes, l'explorateur Population en FR/EN/ES et les liens des articles ; ne déduire la réussite ni de la seule publication ni des seuls fichiers présents.
