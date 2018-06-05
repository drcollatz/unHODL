# unHODL
This is a high frequency trading bot based on strong market trends, margin and low but frequent profits.

# Installation

- install node.js
- `npm install -g nodemon` (sudo?)
- `npm install -g eslint` (sudo?)
- install at least ESLint and Prettier (with "prettier.eslintIntegration": true)  extension in VS Code
- `npm install`
- adapt config.js settings
- `node app.js`

# Docker (optional)

- `docker build -t drcollatz/unhodl .`
- or for production environment: `docker build --build-arg buildmode="--only=prod" -t drcollatz/unhodl .`
- `docker run drcollatz/unhodl`

# Configuration

## Telegram Bot

- talk to https://t.me/BotFather
- ask BotFather for /newbot
- create your bot
- create config.js from config.example.js
- note your Token (in config.js) 
- open and start your bot
- talk to https://t.me/id_chatbot
- note your ChatID (in config.js)

## Bitfinex API

- tbd

# Helpful

### Installing git on QNAP

- download QPKG package from here and install via app center: http://pkg.entware.net/binaries/other/Entware-ng_0.97.qpkg
- opkg update
- opkg install git
- opkg install git-http

