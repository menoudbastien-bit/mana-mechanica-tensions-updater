Mise à jour de méthode : la collecte courante passe à l’API Blizzard directe. Voir [le protocole Blizzard horaire](blizzard-hourly-protocol.md). Les sections antérieures restent datées et conservées comme historique de méthode ; elles ne doivent plus déclencher le collecteur AHledger. Blackwater reste séparé, KR et TW distincts, les marchés indisponibles sans substitution.

# Accès direct Blizzard pour Mana Mechanica — vérification du 22 novembre 2026

## État vérifié

L’application Mana Mechanica est créée. Ses deux identifiants sont configurés comme secrets serveur masqués : BLIZZARD_CLIENT_ID et BLIZZARD_CLIENT_SECRET. La version existante 138 du site a été redéployée avec la révision d’environnement 6 ; aucun code de collecte ni catalogue publié n’a été remplacé.

Le test OAuth client_credentials du 22 novembre 2026 a reçu HTTP 200. Le jeton a été utilisé uniquement en mémoire pour un diagnostic en lecture seule. Ni identifiants, ni secret, ni jeton ne sont publiés dans le dépôt ou dans les fichiers client.

Le diagnostic a découvert le panier public courant : **446 ID, AHL446-v6**. Entre 16:18:24 et 16:18:27 UTC, les cinq routes suivantes ont répondu HTTP 200, avec le namespace de réponse dynamic-forever-eu :

- /data/wow/ruleset/index
- /data/wow/ruleset/2
- /data/wow/ruleset/2/auctions/
- /data/wow/ruleset/2/auctions/111
- /data/wow/ruleset/2/auctions/111/commodities

L’objet ruleset porte id=2 et le nom Normal. L’index contient plusieurs maisons nommées Alliance Auction House ; le nom et le chemin ne suffisent donc pas à attribuer définitivement la maison 111 au marché AHledger forever.normal.alliance.eu. Le diagnostic conserve **mappingStatus=candidate_unverified** et **admittedToObservatory=false**.

Les deux flux d’annonces ont été reçus avec la même date source Last-Modified : **22 novembre 2026 à 15:23:32 UTC**, puis récupérés vers 16:18:25 UTC. Ces 55 minutes d’ancienneté ne mesurent pas une périodicité. Les en-têtes annoncent **Cache-Control: public, max-age=86400** pour les annonces et leur index, contre 30 secondes pour les rulesets. **max-age décrit la durée de réutilisation d’une réponse en cache, pas la cadence de génération des snapshots ni une interdiction de revalidation avant 24 heures.** La consigne antérieure imposant une attente absolue de 24 heures était trop restrictive et est remplacée par les contrôles ci-dessous.

La sortie détaillée du premier diagnostic a été tronquée ; les compteurs de couverture par objet ne sont donc pas conservés ni affirmés. Aucun nouvel appel du même snapshot n’a été lancé pour les reproduire pendant sa fraîcheur annoncée. Le script émet désormais un audit compact, avec des compteurs de couverture et sans annonces individuelles. Voir [l’audit du test](audits/blizzard-direct-api-probe-20261122.json).

## Cadence des snapshots et interprétation du cache

Les opérateurs d’Auction House TK et de GoldScout décrivent des snapshots Blizzard Forever **environ une fois par heure**. Auction House TK situe habituellement leur disponibilité vers :17 pour US et :18–:19 pour EU. Ce sont des observations d’exploitants, pas une garantie officielle Blizzard ni une mesure effectuée par Mana Mechanica sur toutes les maisons. Le diagnostic unique ne confirme aucune cadence pour KR, TW ou chaque maison neutre.

Sources primaires consultées le 22 novembre :
- https://auctionhouse.tk.gg/data/ — sections Where the data comes from et Using it fairly ;
- https://us.forums.blizzard.com/en/wow/t/i-made-a-free-addon-that-tells-you-what-your-character-should-farm-for-gold/2409046 — présentation par l’auteur de GoldScout ;
- https://www.rfc-editor.org/rfc/rfc9111.html#section-5.2.2.1 — signification HTTP de max-age.

Le futur pilote peut viser un contrôle horaire avec revalidation conditionnelle contrôlée, dans les limites autorisées : If-None-Match lorsqu’un ETag est fourni, sinon If-Modified-Since avec Last-Modified. Réutiliser les réponses en cache par défaut, respecter Cache-Control et Retry-After et ne pas multiplier les variantes d’URL pour contourner le cache. Une revalidation peut encore recevoir une réponse intermédiaire inchangée ; elle ne garantit pas la dernière génération à l’origine.

Un HTTP 304, ou un HTTP 200 avec le même snapshot, ne crée jamais une nouvelle observation indépendante. Pour mesurer la cadence, comparer des réponses successives de la même région/maison/type : date source, Date/Age, heure de récupération et empreinte de contenu. Conserver séparément heure du contrôle, heure de la source et heure d’intégration au site. Un contenu différent sous une même date source est une version corrigée, pas un scan distinct présumé.

La collecte de production reste horaire via AHledger. Le diagnostic ponctuel Blizzard ne l’a pas remplacée et aucun nouveau planificateur n’est activé par cette précision. Les pages publiques continuent de distinguer cadence de collecte et fraîcheur effective ; aucune page n’annonce une cadence Blizzard mesurée par Mana Mechanica.

## Exécution et contrôles

Le diagnostic est isolé sous scripts/diagnostics/ et n’est relié à aucun cron, endpoint public ou workflow de production. Son ajout ne déclenche pas le workflow des scripts/observatory/. Les identifiants sont lus sur l’entrée standard masquée, jamais dans les arguments de commande, un fichier, le dépôt ou les journaux. Il n’existe pas de commande documentée invitant à coller un secret dans l’historique du terminal.

Tests hors réseau :

```sh
node --test scripts/diagnostics/blizzard-listing-metrics.test.mjs
node --check scripts/diagnostics/blizzard-market-probe.mjs
```

Résultat : **10 tests de métriques réussis**, plus vérification du rejet d’une entrée d’identifiants malformée sans en réafficher le contenu ni appeler le réseau. Le diagnostic réseau réel a précédé les durcissements de validation et de sortie ; ceux-ci n’ont pas justifié de relire des réponses encore fraîches.

Le script suit les liens reçus sur eu.api.blizzard.com uniquement, refuse les redirections, impose le namespace Forever EU, les schémas ruleset/auctions, les identités attendues et des dates source lisibles au plus cinq minutes dans le futur. Un refus HTTP ou une limitation arrête le diagnostic ; Retry-After est enregistré sans boucle automatique de reprise. Date, Age, Expires et échéance indicative de fraîcheur sont enregistrés pour les prochains diagnostics. Cette échéance est une estimation de réutilisation du cache, pas un délai minimal obligatoire entre requêtes ; ce script ponctuel n’implémente ni cache persistant ni planificateur de revalidation.

Les métriques utilisent les quantités réellement fournies :
- commodities : unit_price est déjà un prix unitaire ;
- enchères ordinaires : buyout avec quantity=1 est chiffrable ; quantity>1 conserve le stock mais exclut le prix tant que sa sémantique unitaire Forever n’est pas confirmée ;
- les annonces sans buyout, quantités nulles, absentes ou invalides restent distinctes ;
- un objet absent du flux n’est pas transformé en stock nul ;
- les doublons d’ID d’annonce identiques sont dédupliqués ; les contradictions interrompent le calcul ;
- minimum, médiane pondérée et moyenne pondérée portent sur les unités chiffrables ; les sommes et fractions exactes utilisent BigInt sérialisé en chaînes ;
- les variantes d’un item.id sont comptées et leur regroupement est explicite. Deux flux de dates différentes ne forment pas un snapshot commun.

Ces quantités sont des annonces disponibles, pas des ventes. Le calcul d’un prix ne valide ni l’identité du marché ni son admission dans l’Observatoire.

## Conditions avant intégration

1. Confirmer la maison 111 avec des identifiants d’enchères indépendamment observés en jeu sur Europe Normal Alliance. Quelques prix proches ou le nom Alliance ne suffisent pas.
2. Mesurer la fréquence réelle des snapshots et les revalidations permises, en distinguant le rythme horaire rapporté par les exploitants de notre propre validation. Étendre ensuite la cartographie région/ruleset/faction séparément, sans déduire les 32 marchés AHledger de cette seule maison. EU, US, KR et TW restent distincts ; CN demande un accès régional spécifique.
3. Clarifier conservation, publication, attribution et éventuelle monétisation avant une archive permanente. Les conditions API Blizzard contiennent une limite de 30 jours formulée pour les données ; aucune exception explicite vérifiée pour nos historiques anonymes ou agrégats n’est établie.
4. Préparer un pilote distinct, avec cache, idempotence, contrôles de fraîcheur et limites mémoire adaptés au serveur. Le diagnostic Node qui lit les flux complets n’est pas un collecteur Cloudflare Worker prêt à déployer.
5. Relire les pages FR/EN/ES concernées lors de tout changement effectif de source. La relecture de public/observatory-article.js, public/method.js, public/observatory.js et public/tensions.js confirme que leur présentation AHledger reste cohérente avec l’état actuel : aucune migration n’est annoncée.

Aucune route d’historique rétrospectif Blizzard n’a été établie. Ne pas reconstituer des heures manquées avec un prix actuel. Aucun import dans RAW_AHledger, le classeur ou l’archive de production n’a été effectué par ce diagnostic ; la collecte horaire AHledger et les articles publiés restent en place.

## Extension du pilote aux hôtels des ventes neutres

Le 22 novembre 2026, l’utilisateur demande si les hôtels des ventes neutres peuvent également être importés. Ils sont ajoutés au périmètre de validation du pilote, séparément d’Alliance et Horde.

L’index européen réellement reçu à 16:18 UTC contient cinq entrées nommées Blackwater Auction House : **116, 117, 118, 121 et 125**. Les notes de première main du développeur les décrivent comme les maisons gobelines neutres : https://mhuijskens.com/WoWForever/Api/ (section Auction houses). Leur présence dans l’index est confirmée ; **leurs annonces et prix n’ont pas été interrogés par notre diagnostic**.

Avant import :
- conserver région, namespace et ID de maison ; distinguer la règle demandée dans l’URL de la règle effectivement validée ;
- conserver la catégorie Neutral / Blackwater sans rattacher les valeurs à Alliance ou Horde et sans inventer une clé de marché AHledger ;
- confirmer les correspondances région/règle/maison ; cinq ID ne prouvent ni cinq lieux distincts ni cinq marchés indépendants ;
- rechercher les doublons de flux exposés sous plusieurs règles avant toute comparaison ou agrégation ;
- lire les annonces et commodities avec leurs dates source respectives, puis appliquer les mêmes contrôles de prix unitaires, quantités, cache et conservation ;
- ne pas transformer une erreur, un champ absent ou une réponse incomplète en prix ou quantité nuls.

Le panier courant peut être utilisé pour ce pilote, sans présumer que ses 446 objets auront un prix neutre disponible. Les archives et sélecteurs du site ne pourront intégrer Neutral qu’après ces validations. Cet élargissement documentaire n’active aucun nouveau cron et n’importe aucune donnée dans le classeur ou la production.

## Historique des vérifications

À 09:54:32 UTC le 22 novembre, un GET non authentifié du ruleset index avait répondu HTTP 404 avec un corps vide. Cela ne prouvait ni l’absence de l’API, ni son fonctionnement authentifié. La création du client a ensuite été confirmée dans le portail propriétaire. À 16:12 UTC, OAuth et les index région/ruleset authentifiés ont répondu HTTP 200 ; le région index renvoie la région 93. Le test d’annonces de 16:18 UTC décrit ci-dessus établit maintenant l’accès technique.

## Sources

- Exemple officiel OAuth : https://github.com/Blizzard/node-signature-generator
- Conditions API : https://www.blizzard.com/en-us/legal/a2989b50-5f16-43b1-abec-2ae17cc09dd6/blizzard-developer-api-terms-of-use
- FAQ officielle : https://us.forums.blizzard.com/en/blizzard/t/data-protection-notice-and-faq/609
- Question sur la conservation AH, sans réponse officielle lors de l’enquête : https://us.forums.blizzard.com/en/blizzard/t/does-the-30-day-retention-rule-apply-to-auction-house-price/60763
- Retour technique de développeur, non annonce Blizzard : https://us.forums.blizzard.com/en/blizzard/t/wow-forever-api-what-works-so-far-plus-a-ts-client/60334
- Notes datées du 5 novembre : https://mhuijskens.com/WoWForever/Api/
- Mapping externe : https://auctionhouse.tk.gg/data/
- Méthode de confirmation en jeu : https://wowfah.com/about
