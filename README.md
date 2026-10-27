# Ryllaka Halloween V4 — GitHub Pages + Formspree

**Site statique :** HTML, CSS et JavaScript. Aucun serveur Cloudflare, aucune installation de Node.js nécessaire.

## Ce qui a changé en V4

- Validation des codes gagnants dans le navigateur : un code erroné affiche **« Code invalide »** et ne révèle pas le formulaire de réclamation.
- Les **9 codes existants sont conservés**, à raison de 3 codes pour chacun des 3 cadeaux. Un code de lot fixe **ne permet pas de choisir un autre lot** dans l'interface.
- **2 codes universels supplémentaires** ont été créés : ils permettent de choisir un seul des 3 cadeaux sur la page de réclamation.
- Les options de couleur / taille sont **juste sous l'image du lot**. Le visuel change lorsque le coloris change : T-shirt Noir / Charbon / Bleu marine ; tapis Nuit / Aurore. Le mug est fixe.
- Le champ Pays est désormais un **champ de texte libre**, mais l'expédition reste limitée à la **zone éligible à définir dans le règlement**.
- Le formulaire transmet la référence du code, le lot choisi, les options, l'adresse et l'e-mail à Formspree ; configurez Formspree pour recevoir des notifications à `postmaster@lotaku.fr`.

## Déployer sur GitHub (sans Node.js)

1. Téléchargez et décompressez l'archive **site V4**.
2. Téléversez **le contenu du dossier** à la racine du dépôt GitHub Pages : `index.html`, `reclamer.html`, `assets/`, `.nojekyll`, etc. Remplacez les fichiers V3 par ceux de la V4 ; ne mélangez pas les deux versions.
3. Dans GitHub : `Settings → Pages → Build and deployment → Deploy from a branch` ; choisissez `main` et `/(root)`, puis `Save`.
4. Dans `Settings → Pages → Custom domain`, entrez `ryllaka.lotaku.fr`. Chez OVH, le CNAME `ryllaka` doit pointer vers `VOTRE-COMPTE.github.io`. Le fichier `CNAME` est inclus. Activez HTTPS quand le certificat est prêt.
5. Sur https://formspree.io, créez un formulaire et paramétrez **postmaster@lotaku.fr** comme destinataire des notifications. Validez l'adresse si Formspree le demande.
6. Dans `assets/formspree-config.js`, remplacez `https://formspree.io/f/REMPLACER` par **votre** URL `https://formspree.io/f/xxxxxxxx`.
7. Testez un code invalide, un code lié au T-shirt, un au mug, un au tapis, et un code universel. Vérifiez la taille/couleur, l'aperçu, le champ pays et l'e-mail reçu **avec de fausses coordonnées**.
8. Avant de récolter des adresses réelles, complétez les **mentions légales**, la **politique de confidentialité** et le **règlement**, notamment l'identité de l'organisateur, les dates, les zones d'éligibilité, les durées de conservation et les sous-traitants.

## Codes : dossier privé séparé de l'archive du site

Les **11 codes réels** (9 existants + 2 nouveaux universels) sont dans le fichier distinct :

`CODES-PRIVES-ryllaka-halloween-2026-V4.txt`

**NE PAS téléverser ce fichier sur GitHub.** Il ne fait pas partie du ZIP public. `assets/code-validation.js` ne contient que les **empreintes SHA-256** et les types de cadeaux, pas les codes eux-mêmes.

### Limites essentielles de GitHub Pages

La validation est **locale au navigateur**. Même avec des empreintes SHA-256 non réversibles en pratique pour ces codes longs, un visiteur technique peut contourner le JavaScript ou envoyer une réclamation à Formspree sans passer par le site. GitHub Pages **ne peut pas imposer un contrôle serveur**, **empêcher l'usage répété d'un code** ni **garantir l'identité du gagnant**.

**Pour chaque notification Formspree, vous devez donc vérifier manuellement** :

1. La référence exacte présente dans le fichier privé, et la personne qui l'a reçue en message privé.
2. Le lot associé : T-shirt, tapis ou mug ; pour `universal`, le lot choisi par le gagnant.
3. Que le code n'a jamais déjà servi (marquez chaque code comme **utilisé** dans votre liste privée).
4. Les disponibilités et les pays réellement expédiables chez Printful, avant de payer/valider la commande.

**Seulement trois cadeaux au total sont prévus** : n'utilisez les autres codes qu'en réserve. Le nombre de codes n'augmente pas le nombre de lots. Aucun paiement n'est demandé aux gagnants et le site ne passe pas de commande Printful.

## Informations personnelles

Les coordonnées sont envoyées par HTTPS à Formspree, et ne sont pas enregistrées sur GitHub. En revanche, les informations saisies dans le formulaire **peuvent être transmises même avec un code détourné**, faute de validation serveur : contrôlez toujours avant de commander. Paramétrez la durée de conservation chez Formspree, et supprimez les copies dans votre messagerie après le délai annoncé. Les données ne doivent jamais être publiées dans le dépôt.

## Tester localement

La page d'accueil et la roue peuvent fonctionner en ouvrant `index.html`. La vérification des codes via Web Crypto SHA-256 demande un contexte sûr : **ouvrez le site en HTTPS sur GitHub Pages**, ou servez localement sur `http://localhost` (par exemple avec un serveur statique). L'envoi Formspree réclame sa configuration et une connexion réseau.
