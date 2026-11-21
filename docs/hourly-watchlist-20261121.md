# Watchlist et collecte horaire · 21 novembre 2026

Point de restauration : publication 130, source `fc58c8589c582a0d6c6a4e69d3ee15a8ace6eff6`, et copie complète du classeur avant modification. Les publications et brouillons existants conservent leur statut.

## Catalogue

Le catalogue de l’article privé « Quel palier fait bouger le marché ? » et son Google Sheet comptent 406 ID distincts. Le site public en suivait 146, dont 106 appartiennent à ce catalogue. L’union conserve les 40 autres références et ajoute 300 objets : **446 ID**. Le panel de palier reste à 406 ; les 40 références conservées ne sont pas ajoutées artificiellement à ses décomptes par niveau. Version centrale : `AHL446-v6`.

`content/observatory/basket.json` reste la définition commune. Ses ID servent à l’Observatoire, aux états de tensions, aux sélecteurs des Rythmes et au bloc courant du bulletin. Les semaines closes conservent leur panel et leurs calculs. Le bloc courant est isolé par marché et sépare couverture des prix, fraîcheur et historique suffisant pour une tension. Les 300 ajouts ont une date d’entrée propre au site. Aucun signal n’est antidaté.

Les icônes sont dans la bibliothèque locale, avec provenance et SHA-256. Les noms et fiches d’objet existants sont réutilisés ; les fiches partielles signalent leurs limites. 70 noms espagnols et un nom français des ajouts restent dans la langue documentée de la source. Aucune statistique d’objet ni explication économique n’est inventée.

## Collectes

- GitHub : `.github/workflows/tensions.yml`, cron `0 * * * *`, UTC, sans agent de langage. GitHub peut retarder un départ : vérifier le calcul enregistré plutôt que l’horaire prévu.
- Serveur : endpoint AHledger `tooltip/{market}?items=…`, 100 ID au maximum par requête, soit cinq appels pour 446 références. Le `observedAt` propre à chaque objet date l’observation ; la date globale d’une table ne s’y substitue jamais. La réponse doit contenir le même marché, des ID attendus et aucun doublon.
- 32 marchés Forever annoncés par AHledger, dont la Corée. Défaut Europe Normal Alliance, puis autres ID dans l’ordre. Les marchés sont traités séquentiellement, avec 20 secondes entre eux. Une absence de scan, notamment sur certains marchés, n’est pas une population d’offres nulle.
- Les données historiques nécessaires au détecteur viennent de l’archive existante. Chaque nouveau scan est archivé une fois. Les dates, épisodes, confirmations distinctes et anciens relevés restent conservés. Les requêtes par objet et par marché pour sept jours complets à chaque heure ont été remplacées par ces lots.
- Les délais de cache sont respectés. Une réponse 403/401 du fournisseur ou une limitation 429 arrête les autres lots de cette opération. Les erreurs restent enregistrées. Un scan qui régresse ne remplace pas la dernière observation valide. Un POST perdu exige une relecture avant une seule nouvelle tentative éventuelle.

Les fenêtres restent 6, 12, 24 et 48 heures. Les seuils provisoires (+15% et 5 cuivres, −25% et 10 unités, stock initial 20, prix médian 10 cuivres, couverture 75%) et la fraîcheur maximale de six heures sont conservés. La cadence horaire ne garantit ni un nouveau scan ni une confirmation.

## Classeur de recherche

Le même panier 446 est collecté pour `forever.normal.alliance.eu` uniquement. Les 40 références conservées du site entrent au relevé 80, sans prix rétroactif. Lignes du panier 7:452 ; réglages 456:482 ; dernières lignes de suivi 553:592. Les 79 dates prévues historiques ont été figées et comparées à la sauvegarde. Le relevé 80 reste prévu le 21 novembre à 03:00 Europe/Zurich ; les suivants sont horaires. Les dates des scans et de collecte restent en UTC.

La capacité du brut passe à 360000 lignes ; les formules du suivi utilisent la borne 360001. Le sélecteur graphique utilise des libellés nom+ID uniques pour éviter la confusion entre noms identiques. La tâche existante est réutilisée, sans doublon. Ses consignes demandent de consigner les bilans dans le classeur et de terminer sans message ni notification.

## Articles et données

Les trois versions de l’Observatoire décrivent la cadence et le nouveau panier. Les Rythmes réutilisent 446 ID et 70 890 points exacts archivés pour 402 objets Europe Normal Alliance, dont 1967 points supplémentaires vérifiés depuis le classeur. Les minima absents de cet extrait restent absents. Le comparatif lit au plus 100000 observations serveur et signale une archive tronquée. Les horizons et comparaisons manquant de couverture restent exploratoires.

Le bulletin ajoute une lecture courante de `/api/tensions` sous les filtres, avec recherche, dates source et calcul séparées, icônes et liens vers les deux autres outils. Ses éditions closes ne sont pas recalculées avec les offres actuelles.

## Limites et contrôles

L’API anonyme est limitée à 30 appels par minute. Les lots rendent viable le parcours horaire de 32 marchés ; la collecte de l’unique marché du classeur reste bornée séparément. Le script historique de préparation du bulletin est limité à cinq requêtes simultanées et 2,1 secondes entre départs et ne demande plus `30 d` sans accès autorisé.

AHledger annonce une modification des droits de conservation à partir du 10 décembre 2026. Vérifier l’autorisation d’archivage avant cette échéance ; l’augmentation de cadence n’accorde aucun nouveau droit. Maintenir « Prices from AHledger » près des données. Sources : https://ahledger.com/developers.

Tests : union des ID, lots de 100 et cinq requêtes pour 446, données manquantes/zéros, isolation des marchés, régression temporelle, déduplication/épisodes, catalogue et médias locaux, toutes les périodes graphiques, bloc courant du bulletin et cohérence FR/EN/ES. Vérifier après publication les sauvegardes réelles de chaque marché et les nouveaux recensements, sans déduire un succès du seul cron.
