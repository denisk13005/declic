# Site burnstreak.com sur le VPS

Le contenu du site vient de `docs/` (une seule source). `scripts/website/build.mjs` le transforme en
site prêt pour le VPS (`dist-website/`), et `deploy/website/deploy.sh` l'envoie.

| Adresse | Contenu |
|---|---|
| `https://burnstreak.com/` | page de présentation (`docs/app/index.html`) |
| `https://burnstreak.com/confidentialite/` | politique de confidentialité + mentions légales (`docs/index.html`) |
| `https://burnstreak.com/conditions/` | CGU (`docs/terms.html`) |

`www.burnstreak.com`, `burnstreak.fr`, `burnstreak.app` (et leurs `www.`) redirigent vers `https://burnstreak.com`.

VPS : OVH `ubuntu@141.227.133.101` (héberge aussi lapi-backend et budget : ne jamais toucher au site `regulpark` ni faire `pm2 restart all`).

---

## 1. Acheter les noms de domaine (une fois)

Chez un registrar français, par exemple OVHcloud ou Gandi : **burnstreak.com** + **burnstreak.fr**.
Au nom de la société (eg consulting). Activer le renouvellement automatique.

## 2. DNS (chez le registrar)

Pour **chacun** des domaines (.com, .fr, .app) :

| Type | Nom | Valeur |
|---|---|---|
| A | `@` | `141.227.133.101` |
| A | `www` | `141.227.133.101` |
| AAAA | `@` et `www` | adresse IPv6 du VPS (seulement si le VPS en a une) |

Supprimer les enregistrements A/AAAA « parking » créés par défaut par le registrar.
Vérifier (quelques minutes à quelques heures) : `nslookup burnstreak.com` doit renvoyer l'IP du VPS.

## 3. Préparer le VPS (une fois, en SSH)

```bash
sudo mkdir -p /var/www/burnstreak/site
sudo chown -R $USER:$USER /var/www/burnstreak
echo ok > /var/www/burnstreak/site/index.html
```

Config Nginx **provisoire** (HTTP seul, le temps d'obtenir le certificat) :

```bash
sudo tee /etc/nginx/sites-available/burnstreak >/dev/null <<'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name burnstreak.com www.burnstreak.com burnstreak.fr www.burnstreak.fr burnstreak.app www.burnstreak.app;
    root /var/www/burnstreak/site;
}
EOF
sudo ln -s /etc/nginx/sites-available/burnstreak /etc/nginx/sites-enabled/burnstreak
sudo nginx -t && sudo systemctl reload nginx
```

Certificat HTTPS (un seul certificat pour les 6 adresses) :

```bash
sudo apt install certbot   # si absent
sudo certbot certonly --webroot -w /var/www/burnstreak/site \
  -d burnstreak.com -d www.burnstreak.com -d burnstreak.fr -d www.burnstreak.fr \
  -d burnstreak.app -d www.burnstreak.app
```

Puis la config **définitive** : copier le contenu de `deploy/website/nginx-burnstreak.conf` dans
`/etc/nginx/sites-available/burnstreak` (à la place de la config provisoire), et :

```bash
sudo nginx -t && sudo systemctl reload nginx
sudo certbot renew --dry-run   # vérifie que le renouvellement automatique marchera
```

## 4. Compléter l'hébergeur (mention légale obligatoire)

Dans `scripts/website/build.mjs`, remplir `HOSTING` avec le nom, l'adresse et le site du
fournisseur du VPS (ex. OVH SAS, 2 rue Kellermann, 59100 Roubaix, France). Sans ça, la
construction du site s'arrête volontairement.

## 5. Mettre le site en ligne (à chaque modification)

Depuis Git Bash, à la racine du projet :

```bash
VPS=regulpark bash deploy/website/deploy.sh   # alias SSH existant (= ubuntu@141.227.133.101)
```

## 6. Référencement Google (une fois)

1. https://search.google.com/search-console → **Ajouter une propriété** → type **Domaine** →
   `burnstreak.com` → ajouter l'enregistrement **TXT** proposé dans le DNS du registrar.
2. **Sitemaps** → envoyer `https://burnstreak.com/sitemap.xml`.
3. **Inspection de l'URL** → `https://burnstreak.com/` → **Demander l'indexation**.

## 7. Basculer les liens vers le nouveau domaine (une fois le site en ligne)

- Play Console : URL de la politique de confidentialité (Contenu de l'appli) + lien de
  suppression de compte (Sécurité des données) + site web de la fiche.
- App Store Connect : URL de la politique de confidentialité, URL d'assistance, URL marketing.
- App (prochain build) : `src/constants/legal.ts` et `src/constants/links.ts`.
- GitHub Pages : seulement **après** tout ça, transformer `docs/index.html`, `docs/terms.html`
  et `docs/app/index.html` en pages de redirection vers burnstreak.com (les anciens liens restent valables).
