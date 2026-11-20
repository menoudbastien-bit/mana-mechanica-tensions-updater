# Traductions du site public

La version publique de Mana Mechanica utilise le français, l’anglais et l’espagnol. Chaque article publié doit conserver son contenu, ses identifiants, ses dates de relevé, ses chiffres, ses sources, ses images et les conditions qui limitent ses conclusions dans les trois langues.

## Compléter une traduction

1. Inventorier les documents effectivement publiés depuis le CMS public et le catalogue du Codex. Vérifier le corps des articles et leurs outils interactifs. Un titre localisé peut encore renvoyer à un corps dans une autre langue.
2. Traduire depuis la publication actuelle. Conserver les liens et les identifiants des objets, recettes et quêtes. Réutiliser les noms localisés de la bibliothèque du site. Lorsqu’ils manquent, conserver le nom documenté de la source.
3. Publier chaque traduction avec son propre identifiant de langue. Faire pointer le sélecteur de langue, le Codex, les liens associés et les adresses canoniques vers cette version. L’âge des observations de marché dépend toujours de la source.
4. Vérifier la structure, les sources et les chiffres de la traduction. Comparer les résultats des calculateurs entre langues avec les mêmes données. Tester les filtres, les messages d’erreur et les liens publics. Préserver les brouillons éditoriaux distincts.

## Vérification du 20 novembre 2026

Les publications ont été relues pour Mind & Method, l’esprit de WoW Forever, S’enrichir, l’Observatoire des prix, la Foire de Sombrelune, les Rythmes de l’hôtel des ventes, l’analyse de population, le bulletin de marché, Zarko et les actualités des 30 octobre et 7 novembre. Elles possèdent leurs versions FR, EN et ES.

Le guide des faveurs marchandes était proposé en français avec des renvois depuis les autres langues. Les versions EN et ES complètent maintenant le texte, les filtres, les avertissements du catalogue et le calculateur. Les textes d’interface et les notes du catalogue sont enregistrés dans les dictionnaires de traduction de la même source Sites. Les données économiques et les mécanismes de calcul restent communs aux trois langues. Les noms localisés disponibles viennent de la bibliothèque d’objets vérifiés.

Les deux ateliers de couture sont des brouillons privés. Le chapitre Journey annoncé ne possède aucune publication CMS. Leur état fait partie de l’inventaire de contrôle.

## Vérifications techniques

- `node --test tests/merchant-favors-localization.mjs tests/merchant-favors.mjs tests/codex-navigation.mjs tests/local-media.mjs` dans le dépôt du Site.
- Vérification de la publication distincte par langue, de la déduplication et de la conservation des brouillons existants.
- Comparaison des liens de l’article et des champs numériques du catalogue. Comparaison du calcul d’un parcours avec les mêmes stocks dans les trois langues.
- Relecture des réponses publiques du guide et du catalogue du Codex après déploiement. Vérification de l’affichage dans le navigateur lorsque l’environnement le permet.
