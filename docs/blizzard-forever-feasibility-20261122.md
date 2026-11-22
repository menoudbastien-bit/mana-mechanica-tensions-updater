# Accès direct Blizzard pour Mana Mechanica — investigation du 22 novembre 2026

## Conclusion et vérification effective

La piste est techniquement crédible, d'après les développeurs qui ont testé les routes Forever et les producteurs de sites qui les utilisent. Elle n'est pas encore validée pour notre application par une réponse Blizzard authentifiée.

La configuration de production Mana Mechanica ne contient actuellement aucun identifiant client Blizzard. Le 22 novembre 2026 à 09:54:32 UTC, un GET sans authentification sur :

`https://eu.api.blizzard.com/data/wow/ruleset/index?namespace=dynamic-forever-eu&locale=en_GB`

a répondu HTTP 404, corps vide. Cette réponse ne prouve ni l'absence de l'API, ni son fonctionnement avec un jeton valide. Aucun prix Blizzard n'a été importé. Aucun compte, client OAuth, abonnement ou accord n'a été créé ou accepté.

## Authentification requise

Déclarer l'application Mana Mechanica sur https://develop.battle.net/access/clients, avec son URL réelle et son usage. Le flux OAuth client_credentials échange identifiant et secret contre un jeton d'application. Les secrets doivent rester côté serveur, hors dépôt, JavaScript public, logs et conversation.

Les noms de secrets proposés sont BLIZZARD_CLIENT_ID et BLIZZARD_CLIENT_SECRET. Leur configuration est nécessaire au test authentifié. Leur absence ne constitue pas une panne du collecteur AHledger.

## Routes candidates et identité des marchés

Les retours de développeurs décrivent le namespace dynamic-forever-eu et les routes :

- /data/wow/ruleset/index
- /data/wow/ruleset/{id}
- /data/wow/ruleset/{id}/auctions/
- /data/wow/ruleset/{id}/auctions/{houseId}
- /data/wow/ruleset/{id}/auctions/{houseId}/commodities

La première documentation du 5 novembre utilise encore /auctions/index. Découvrir le lien actuel dans la réponse plutôt que figer cette différence comme un contrat officiel stable.

Les mêmes maisons peuvent apparaître sous plusieurs rulesets. Le chemin ruleset/2 ne suffit donc pas à prouver un marché Normal. TK.gg propose 111 pour Alliance Normal, 114 pour Horde Normal et 117 pour le neutre ; les groupes RP et RP-PvP restent inférés. Ces correspondances externes doivent être validées avant admission.

EU, US, KR et TW doivent rester distincts. CN nécessite un accès régional à vérifier. Aucune correspondance automatique des 32 marchés AHledger n'est admise.

## Protocole proposé pour le premier test

1. Obtenir le jeton sans l'imprimer, puis récupérer index régional, rulesets et liens des maisons. Contrôler host, namespace et type de document.
2. Commencer uniquement par EU Normal Alliance. Valider son identité avec des enchères réellement identifiées sur ce marché ; une ressemblance de quelques prix est insuffisante.
3. Lire les deux catégories d'annonces. Conserver unités, prix du lot ou prix unitaire selon leur définition, variantes, heure source Last-Modified et heure de récupération. Exclure les annonces sans buyout des statistiques de prix.
4. Calculer sur l'ensemble complet les minimums, médianes pondérées, moyennes pondérées et quantités du panier courant de 446 ID. Les calculs restent des prix affichés, pas des ventes.
5. Comparer plusieurs snapshots avec les sources existantes à dates comparables. Contrôler doublons, zéros réels, absences, lots, quantités et variantes.
6. Garder le test dans une archive source distincte. Aucun remplacement d'anciennes observations, aucune fusion interrégionale. Respecter Cache-Control, Last-Modified/ETag et Retry-After ; ne pas compter une réponse inchangée comme nouveau scan.

Aucune route d'historique rétrospectif n'a été établie : prévoir une série à partir des snapshots effectivement reçus, sans inventer les créneaux manqués.

## Conservation et publication

Les conditions API Blizzard contiennent une limite de conservation de 30 jours formulée pour toutes les données. La FAQ officielle explique surtout la protection des données des joueurs, mais aucune exception explicite pour nos historiques anonymes ou agrégats de prix n'a été trouvée. La question spécifique du 21 novembre est sans réponse officielle lors de cette enquête.

Cela ne constitue ni une autorisation d'archivage illimité ni une décision juridique définitive sur ce cas. Clarifier la conservation des snapshots et des statistiques dérivées avant de concevoir une archive permanente. Examiner également l'usage déclaré, l'attribution, la redistribution et une éventuelle monétisation.

Cette investigation ne modifie ni le workflow de production, ni la tâche horaire du classeur, ni les articles publiés. La source actuelle reste AHledger ; aucune page ne doit annoncer une migration accomplie.

## Sources examinées

- Exemple officiel OAuth Blizzard : https://github.com/Blizzard/node-signature-generator
- Conditions API : https://www.blizzard.com/en-us/legal/a2989b50-5f16-43b1-abec-2ae17cc09dd6/blizzard-developer-api-terms-of-use
- FAQ officielle : https://us.forums.blizzard.com/en/blizzard/t/data-protection-notice-and-faq/609
- Question historique AH sans réponse officielle : https://us.forums.blizzard.com/en/blizzard/t/does-the-30-day-retention-rule-apply-to-auction-house-price/60763
- Retours techniques de l'auteur du client, pas une annonce Blizzard : https://us.forums.blizzard.com/en/blizzard/t/wow-forever-api-what-works-so-far-plus-a-ts-client/60334
- Notes datées du 5 novembre : https://mhuijskens.com/WoWForever/Api/
- Mapping externe et limites : https://auctionhouse.tk.gg/data/
- Méthode de confirmation des maisons : https://wowfah.com/about
