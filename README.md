<h1 align="center">
Undercover word game
</h1>

<h4 align="center">The <a href="https://www.yanstarstudio.com/de/undercover-game" target="_blank">Undercover</a> word exposing game for the web!</h4>

<p align="center">
    <a href="https://undercover.localplayer.dev/">
        <img src="https://img.shields.io/badge/Play-now-blue.svg?style=shields"
            alt="Gitter">
  </a>
  <a href="https://github.com/antebrl/undercover-word-game/actions/workflows/deploy.yml">
    <img src="https://github.com/antebrl/undercover-word-game/actions/workflows/deploy.yml/badge.svg"
         alt="Gitter">
  </a>
</p>

<!-- Add a gif video here -->
<!-- ![screenshot](https://raw.githubusercontent.com/amitmerchant1990/electron-markdownify/master/app/img/markdownify.gif) -->


> ### About this fork
>
> Upstream connects players with **peer-to-peer WebRTC**. That needs a TURN
> relay server to get through typical home, office and mobile networks, and
> every free no-signup TURN service has since shut down -- so in practice
> joining only worked when everybody sat on the same network, and failed with
> no explanation otherwise.
>
> This fork replaces the peer-to-peer transport with an **encrypted relay over
> public MQTT-over-WebSocket brokers**. Players only need an ordinary outgoing
> internet connection, which works on phone data, hotel wifi and office wifi
> alike. Nothing to sign up for, nothing to pay, nothing to self-host.
>
> Also changed: short 6-character room codes instead of long peer ids,
> auto-rejoin after a reload (your word and seat are kept), a grace period so
> a player who drops mid-round is not eliminated, and joining that fails with
> an actual reason instead of hanging.
>
> See [How multiplayer works](#how-multiplayer-works) and
> [Deploy your own copy](#deploy-your-own-copy).

This is a web-version of the popular [Undercover App](https://play.google.com/store/apps/details?id=com.yanstarstudio.joss.undercover). I made this, so that you can play Undercover remotely with your friends. [Play the game yourself](https://undercover.localplayer.dev/) together with your friends or with seperate browser tabs.

Undercover is a social deduction word game similar to **Werewolf** or **Among Us**.

## Explanation 
A small group of Impostors has appeared in the game. They have a different word than the others and must hide. Civilians have to discover them.


### Roles and Goals
There are 3 groups in the game: Civilians, Undercover and Mr.White. The majority of the residents are the peace-loving Civilians. There are up to two groups of Impostors: Undercover and Mr.White.

<p align="center">
  <img src="./docs/ressources/civilians-explanation.png" width="300">
  <img src="./docs/ressources/undercover-explanation.png" width="300">
  <img src="./docs/ressources/mrwhite-explanation.png" width="300">
</p>

----
### Get your secret word
At the beginning of the game, everyone receives a secret word. Each game uses a pair of secret words. Remember to keep your secret word hidden from the others.

Civilians receive the same secret word. Undercovers receive a word slightly different from the Civilians'. Mr.Whites don't receive any word. At this moment, you don’t know if you are a Civilian or an Undercover.

----
### Gameplay
**Description Phase** <br>
As soon as everyone has received their secret word, a random player is assigned to start describing their word. One by one, everyone describes their word using a word or phrase. Mr.White needs to improvise, since he/she doesn't have a word.

Use this phase to disclose enough info to find your allies but hide the specifics from Mr.White.

**Discussion Phase** <br>
Once the round of description is complete, players discuss and debate about who they think are the Impostors or the Civilians.

Civilians and Undercovers should use this phase to gather more clues to discover their own identity, build alliances and identify enemies. Meanwhile, for Mr.White, it is the best time to dig deeper on the Civilians' secret word.

Remember the bottom line: don't expose yourself unnecessarily  too early! Use your charm to tilt the odds in your favour.

**Elimination Phase** <br>
When the discussion phase ends, all remaining players vote for one player they want to oust. Remember, players that were already ousted can't cast their votes anymore.

The player with the most votes will be ousted from the game! Unless the voted player turns out to be Mr.White! In this case, he/she still has 1 chance to guess the Civilian word. If he/she guesses the Civilian word correctly, Mr.White wins immediately!

If the victory condition of the game is not met after the elimination phase, repeat the above 3 phases until one of the groups (Civilian, Undercover or Mr.White) wins the game.

----
### Victory
1. **Civilians** win if they eliminate all Undercovers and Mr.Whites.
2. The **Impostors** (Undercovers and/or Mr.Whites) win if they survive until only 1 Civilian is left.
3. **Mr.White** also wins if they guess the Civilians’ word correctly.

## Run it locally

```sh
# Step 1: Clone the repository.
git clone https://github.com/lfiathan/undercover-word-game.git
cd undercover-word-game

# Step 2: Install dependencies.
npm i

# Step 3: Start the dev server.
npm run dev
```

Access at http://localhost:8080. Open a few browser tabs to play against
yourself: each tab is its own player.

## Deploy your own copy

The game is a static site, so GitHub Pages hosts it for free -- no server, no
account beyond GitHub itself.

1. Fork this repository.
2. In your fork: **Settings -> Pages -> Build and deployment -> Source** ->
   pick **GitHub Actions**.
3. In your fork: **Actions** tab -> enable workflows (GitHub disables them on
   new forks).
4. Push any commit, or run the **Deploy** workflow manually from the Actions
   tab.

Your game lands at `https://<your-username>.github.io/undercover-word-game/`.
The workflow works out the base path from the repository name, so there is
nothing to edit. For a custom domain, add a `public/CNAME` file containing the
domain and the build switches to serving from the root.

## Languages

English, German, French and **Indonesian**, chosen in two independent places:

- **Interface language** -- the switcher at the top right. Per player, stored on
  their own device, so everyone reads the menus in the language they prefer.
- **Game words** -- a picker on the Game Setup screen, host only. It decides
  which pack the secret words are dealt from, and every player sees which one
  is selected. So an English-speaking host can deal Indonesian words, and a
  player whose phone is in Indonesian still gets the same word as everyone else.

The word language is fixed once a game starts; it can be changed again from the
setup screen before the next game.

| Pack | Pairs |
| --- | --- |
| English | 474 |
| Deutsch | 463 |
| Français | 467 |
| Bahasa Indonesia | 423 |

Pairs are written per language rather than translated, because the game only
works when the two words are close enough to confuse: `nasi goreng` /
`nasi uduk`, `lembur` / `cuti`, `Brezel` / `Brötchen`, `croissant` /
`pain au chocolat`.

New languages go in `src/i18n/locales/<code>/`, then get registered in
`src/i18n/index.ts` and `src/components/LanguageSwitcher.tsx`.

## Look and feel

The interface is a dark violet theme built on Tailwind tokens in
`src/index.css` (surfaces, brand gradients, glows) so the screens stay
consistent: one card treatment, one button language, large tap targets, and
layouts that are designed for a phone first. `public/og.html` is the source for
the link-preview image -- open it at 1200x630 and screenshot it to regenerate
`public/og-image.jpg`.

## How multiplayer works

One player hosts: their browser owns the game state, deals the secret words and
decides what happens. Everyone else sends intents ("I vote for Ana") and renders
what the host sends back. No server runs any game logic.

Messages travel over public MQTT brokers via WebSocket. The client connects to
**all** configured brokers at once and publishes to each of them, so two players
only need one broker in common -- a broker that is down, blocked by a firewall
or rate limiting us does not break the room. Duplicates are filtered by message
id. Defaults, all free and account-free:

| Broker | URL |
| --- | --- |
| HiveMQ | `wss://broker.hivemq.com:8884/mqtt` |
| EMQX | `wss://broker.emqx.io:8084/mqtt` |
| Mosquitto | `wss://test.mosquitto.org:8081/` |

Reliability details worth knowing:

- **State is versioned.** Every peer reports the newest version it has seen on
  each heartbeat, and the host resends to anyone who falls behind, so a dropped
  message heals itself within seconds.
- **Reloading keeps your seat.** Your identity lives in `sessionStorage`, and
  the host recognises a returning player instead of seating a duplicate.
- **Dropping out mid-round is not elimination.** The host holds a vanished
  player's seat (and their word) for 45 seconds before removing them.
- **The host is the single point of failure.** If the host closes their tab the
  game is over for everyone, same as upstream.

### Configuration

Optional build-time environment variables:

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_MQTT_BROKERS` | the three brokers above | Comma separated broker URLs, e.g. your own Mosquitto |
| `VITE_TOPIC_PREFIX` | `ucw1` | Topic namespace |
| `VITE_ROOM_SALT` | built-in string | Key-derivation salt; change it to isolate your deployment |

### Privacy

Public brokers are public: anyone can subscribe to a wildcard topic and watch
traffic go by. So nothing readable is published. From the room code the client
derives, in one slow PBKDF2 pass (310k iterations, SHA-256):

- the **topic id** the room talks on, and
- an **AES-256-GCM key** that every payload is encrypted with.

A sniffer sees an opaque topic carrying opaque bytes. Recovering the key means
brute forcing the 6-character code space through that KDF for each guess, which
costs GPU-hours per room -- plenty for party-game secret words, and the room is
gone by then. Use `VITE_MQTT_BROKERS` with your own broker if you want stronger
guarantees than that.

One thing this fork does *not* fix, inherited from upstream: the host broadcasts
the full game state, so every player's browser holds everyone's roles and words.
The UI hides them, but a player who opens devtools can cheat. Play with friends.

## Credits

The game, the artwork and all the original code are by
[antebrl/undercover-word-game](https://github.com/antebrl/undercover-word-game) --
please star the upstream project. This fork only swaps the network transport and
the room-joining flow. The game concept is
[Undercover by Yanstar Studio](https://www.yanstarstudio.com/de/undercover-game).

## Contribute & Support
Contributions such as adding new word-pairs and translations are always welcomed.