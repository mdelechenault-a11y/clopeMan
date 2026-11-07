# ClopeMan 🦸🚭

Petite web app (PWA) pour iPhone qui aide à arrêter de fumer, avec un ton de BD de super-héros.

## Ce qu'elle affiche

- ⏱️ Le temps écoulé depuis la dernière cigarette, à la seconde près, plus un « niveau » de héros qui monte avec le temps
- 💶 L'argent économisé et 🚭 le nombre de cigarettes évitées (avec un compte à rebours jusqu'à la prochaine)
- ⏳ La vie regagnée (environ 20 min par cigarette, d'après une étude de l'UCL de 2024)
- 🔥 Un bouton **« Envie de fumer ? »** : un chrono de 3 minutes et des mini-jeux pour tenir le coup, avec un compteur d'envies vaincues :
  - 🏃 **Clope Run** : le héros court et saute par-dessus les clopes, cendriers et paquets (double saut), en ramassant des €
  - 💦 **Pshhht !** : une goutte d'eau masquée éteint les clopes qui tombent du ciel (bonus triple jet et vies)
  - 👊 **Écrase-clopes** : 40 secondes pour écraser les clopes qui sortent des cendriers, sans toucher aux pommes
  - 🧘 **Mode zen** : respiration guidée et conseils
- 🍷 Les sorties que l'argent économisé permet de s'offrir (ciné à 2, bowling avec son enfant, resto en amoureux…) et dans combien de temps pour ce qui est encore verrouillé
- 🎯 Un objectif personnel avec sa barre de progression (par défaut : un bon resto en amoureux, 150 €)
- 🫁 Les étapes de récupération du corps (sources : OMS, Tabac Info Service)
- 📈 Des projections à 1 mois, 1 an et 10 ans

Tout est stocké en local sur le téléphone (`localStorage`) : pas de compte, pas de serveur.

## Installer sur iPhone

1. Héberger le dossier (par exemple avec GitHub Pages : *Settings → Pages → Deploy from a branch*).
2. Ouvrir l'URL dans **Safari**.
3. Bouton Partager → **« Sur l'écran d'accueil »**.

L'appli s'ouvre alors en plein écran, comme une vraie appli, et fonctionne aussi hors connexion.

## Développement

Pas de build : `index.html`, `games.js` (les mini-jeux), `sw.js` et `manifest.webmanifest`. Pour tester en local :

```sh
python3 -m http.server 8000
```
