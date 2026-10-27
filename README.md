# 🎃 Ryllaka — Halloween Giveaway 2026 (version 2)

Mini-site pour `https://ryllaka.lotaku.fr` : **GitHub Pages** pour les pages publiques, **Cloudflare Workers + D1** pour sécuriser les codes et formulaires, **Resend** pour transmettre les coordonnées de chaque gagnant à `postmaster@lotaku.fr`. Aucune commande Printful n'est déclenchée automatiquement.

## Fichiers

- `site/` : accueil sombre, trois catégories de lots et leurs variantes, saisie de code, formulaire gagnant, roue, espace organisateur, pages juridiques.
- `worker/src.js` : vérification des codes à usage unique, gestion des données et envoi d'e-mail via Resend.
- `worker/migrations/` : schéma SQLite D1 initial + **migration 0002**, qui permet plusieurs codes par catégorie et ajoute tailles/couleurs et statut de notification.
- `worker/test.mjs` : tests d'intégration locaux sans réseau ; lancer `node --disable-warning=ExperimentalWarning test.mjs` avec Node 22+.
- `build_pages.py` : régénère les fichiers HTML de `site/` lorsque tu changes leur contenu.
- `docs/CHECKLIST-AVANT-LANCEMENT.md` : contrôles avant le direct.

**Les neuf vrais codes ne figurent PAS dans ce projet et ne doivent JAMAIS être ajoutés à GitHub.** Ils sont livrés séparément dans `CODES-PRIVES-ryllaka-halloween-2026.txt` avec cette conversation. Trois codes pour chaque produit. Le fichier doit rester confidentiel ; seuls les codes envoyés individuellement aux gagnants doivent circuler.

## 1. Déployer GitHub Pages

1. Créer un dépôt GitHub `ryllaka-halloween`, puis copier le **contenu** du projet complet à la racine. **NE PAS copier le fichier privé des codes dans le dépôt.**
2. Mettre en ligne sur la branche `main`.
3. GitHub → `Settings → Pages → Source: GitHub Actions`. Le workflow `.github/workflows/pages.yml` publie uniquement `site/`.
4. GitHub Pages → domaine personnalisé : `ryllaka.lotaku.fr`. Le fichier `site/CNAME` contient ce domaine.
5. DNS OVH → CNAME `ryllaka` vers `<ton-compte-github>.github.io` (exact identifiant GitHub), en évitant tout autre enregistrement contradictoire pour ce sous-domaine.
6. Activer `Enforce HTTPS` quand GitHub a provisionné le certificat.

GitHub Pages ne possède aucun secret de code ni aucune adresse de gagnant. **Attention** : les fichiers publiés dans un dépôt public GitHub restent visibles dans les sources du dépôt, même si le workflow ne les publie pas dans Pages. Le fichier des codes doit être exclu du dépôt lui-même.

## 2. Déployer Cloudflare Worker et base D1

Installer Node.js, puis dans `worker/` :

```sh
npm install
npx wrangler login
npx wrangler d1 create ryllaka-halloween --jurisdiction eu
```

Cloudflare donne un `database_id` : mettre son UUID à la place de `REMPLACER-PAR-UUID-D1` dans `worker/wrangler.jsonc`. La juridiction EU dépend de la disponibilité Cloudflare ; vérifier sa disponibilité et le paramétrage du compte.

```sh
npx wrangler d1 migrations apply ryllaka-halloween --remote
```

**Important lors d'une mise à jour de la V1 :** cette commande exécute aussi `0002_variants_email_and_multiple_codes.sql`, qui supprime la restriction « un seul code par lot », conserve les anciens codes et ajoute `color`, `email_status` et `email_attempted_at`. Toujours sauvegarder D1 avant une migration en production.

Créer un jeton administrateur localement, par exemple :

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
npx wrangler secret put ADMIN_TOKEN
```

Colle le jeton aléatoire (minimum 32 caractères) lorsqu'il est demandé par Wrangler. **Le conserver dans un gestionnaire de mots de passe, jamais sur GitHub.**

## 3. Activer les e-mails (OBLIGATOIRE avant l'ouverture des formulaires)

L'envoi d'e-mails ne fonctionne **pas** depuis GitHub Pages seul. Le Worker utilise l'API transactionnelle **Resend** côté serveur ; aucune clé privée ne se trouve dans le navigateur.

1. Créer un compte Resend : https://resend.com/ ; vérifier tarifs et conditions selon le compte.
2. Ajouter et **vérifier un domaine d'expédition** dans Resend, par exemple `send.lotaku.fr`. Ajouter les enregistrements DNS fournis par Resend **dans OVH** ; il n'est pas nécessaire de déménager le DNS principal vers Cloudflare pour cette option.
3. Dans `worker/wrangler.jsonc`, `NOTIFY_TO` est déjà `postmaster@lotaku.fr`, et `MAIL_FROM` est par défaut `Ryllaka Halloween <halloween@send.lotaku.fr>`. **Si tu choisis un autre domaine vérifié**, mettre `MAIL_FROM` à jour.
4. Générer une clé API Resend autorisée à envoyer les e-mails, puis ajouter le secret au Worker :

```sh
npx wrangler secret put RESEND_API_KEY
npx wrangler deploy
```

Le Worker enverra **un e-mail contenant le lot, la taille, le coloris, le nom, l'adresse et l'e-mail du gagnant** à `postmaster@lotaku.fr`. Le champ de réponse de l'e-mail utilise l'adresse du gagnant. Aucun e-mail publicitaire n'est envoyé au gagnant.

Si Resend échoue, la réclamation reste sauvegardée dans D1 et apparaît en administration avec le statut `failed`. Le bouton **« Renvoyer l'e-mail »** permet de relancer l'envoi. L'API emploie une clé d'idempotence pour limiter les doublons lors des reprises (durée garantie par le prestataire : 24 h). **Surveille la boîte e-mail** et vérifie que l'e-mail est délivré, pas seulement accepté par l'API. Les données reçues en boîte mail doivent être supprimées lorsqu'elles ne sont plus nécessaires.

Sans `RESEND_API_KEY`, `MAIL_FROM` et `NOTIFY_TO`, le Worker refusera de finaliser la réclamation : il ne prétendra jamais avoir envoyé une notification inexistante.

## 4. Relier le site au Worker

Après `npx wrangler deploy`, Wrangler indique l'URL du Worker (typiquement `https://ryllaka-halloween-api.<sous-domaine>.workers.dev`). Modifier `site/assets/config.js` pour remplacer `https://REMPLACER-VOTRE-WORKER.workers.dev` par cette URL exacte, puis pousser sur GitHub pour republier les pages.

Le Worker n'accepte depuis un navigateur que l'origine déclarée `PUBLIC_ORIGIN` (`https://ryllaka.lotaku.fr` par défaut). Les tests de formulaires sont donc à faire sur le domaine final. Ne pas déployer un Worker en acceptant toutes les origines.

## 5. Importer les neuf codes déjà générés

1. Ouvrir la page `https://ryllaka.lotaku.fr/organisateur.html`.
2. Entrer le `ADMIN_TOKEN` du Worker dans le champ privé ; il n'est pas sauvegardé par le site.
3. Ouvrir le fichier **distinct et confidentiel** `CODES-PRIVES-ryllaka-halloween-2026.txt` et copier les neuf lignes au format `lot;RYL-…` (les lignes commençant par `#` sont des commentaires ignorés).
4. Les coller dans **« Importer les neuf codes privés »**, puis valider. L'API importe uniquement l'empreinte de chaque code.
5. Vérifier **« Voir les codes générés »** : trois codes T-shirt, trois tapis, trois mugs. Si une ligne échoue, l'importation peut être reprise ; les doublons sont automatiquement refusés.
6. Envoyer **un seul code** correspondant au bon lot à chaque gagnant par MP. **Un code ne sert qu'une fois.** Les codes non attribués peuvent servir de réserve, mais les neuf codes permettraient au total neuf réclamations si tous étaient distribués.

L'organisateur peut aussi générer d'autres codes dans le panneau tant qu'il y a moins de trois codes non utilisés et non révoqués par catégorie. Les codes générés automatiquement s'affichent une seule fois.

**Important :** le règlement doit préciser si les neuf codes représentent neuf cadeaux réellement offerts (trois par catégorie), ou si une partie est gardée en réserve pour seulement trois lots ; ne jamais distribuer neuf codes en promettant trois produits.

## 6. Choix des articles sur le formulaire

| Cadeau | Options | Obligatoire |
|---|---|---|
| T-shirt | Tailles S, M, L, XL, 2XL, 3XL, 4XL, 5XL ; couleurs Noir, Charbon, Bleu marine | Taille **et** couleur |
| Tapis de souris | Nuit ou Aurore | Couleur |
| Mug | Modèle blanc unique | Aucun autre choix |

Pour les trois catégories, le **nom, l'adresse, le code postal, la ville et l'e-mail du gagnant sont obligatoires**. Le téléphone est facultatif. La livraison est pour l'instant limitée à la France, DROM inclus sous réserve que Printful prenne en charge le produit et la destination. **Vérifier notamment la disponibilité réelle des T-shirts 3XL à 5XL selon le coloris, dans Printful.** Le site ne vérifie pas les stocks en direct.

Aucune commande ni aucun prélèvement Printful n'est automatique ; l'e-mail contient les champs à recopier dans la commande manuelle.

## 7. Pages légales et précautions RGPD

Les pages `site/reglement.html`, `site/mentions-legales.html` et `site/confidentialite.html` sont **des modèles**. Compléter les éléments d'identification du responsable, les dates, conditions d'âge, territoire, éventuelles limites de participation, **quantité exacte de lots**, valeurs indicatives, délai de réclamation, règles du tirage et recours.

La politique de confidentialité mentionne l'hébergement Cloudflare, l'envoi d'une copie des coordonnées à la boîte `postmaster@lotaku.fr` via **Resend**, et le transfert à Printful. Confirmer les rôles des parties, contrats avec les sous-traitants, éventuels transferts internationaux et délais de rétention. L'effacement D1 au bout de 90 jours **n'efface pas** les e-mails reçus dans la boîte postale ni les logs du prestataire.

L'inscription à une publicité ou newsletter ne doit pas être imposée en échange d'un lot. L'adresse e-mail n'est demandée que pour gérer la livraison.

## 8. Tester avant de publier

Test local du serveur sans accès Cloudflare, sans envoi effectif de courrier :

```sh
cd worker
node --disable-warning=ExperimentalWarning test.mjs
```

Ce test couvre : neuf codes, validation et usage unique, rejet des tailles/coloris invalides, e-mail obligatoire, envoi fictif à la bonne boîte, échec de notification et relance administrateur.

Test réel à faire **après déploiement** : un formulaire complété avec une adresse **de test**, vérifier l'arrivée effective du mail dans `postmaster@lotaku.fr`, sa lisibilité et sa présence en administration, puis supprimer la réclamation test. Ne pas utiliser un des neuf vrais codes pour cette vérification sans prévoir sa révocation ou le remplacement correspondant.

**Ce projet n'est pas encore relié à tes comptes GitHub, Cloudflare ou Resend. Aucun e-mail réel n'a été envoyé par moi.**
