const BFX = require('bitfinex-api-node');
const config = require('./config');

const RSI = require('./RSI.js');



module.exports = 

    class LiveTradingPair {
 
        
        constructor(candleKey){

            if(LiveTradingPair.activePairs == null)
                LiveTradingPair.activePairs = new Array();
            this.currentPrice = 0;
            this.currentRSI = 0;
            this.candleKey = candleKey;

            this.observers = [];
            

            this.bfx = new BFX({
                apiKey: config.bitfinex.key,
                apiSecret: config.bitfinex.secret,
                ws: {
                  autoReconnect: true,
                  seqAudit: true,
                  packetWDDelay: 10 * 1000,
                },
              });
              
              this.ws = this.bfx.ws(2, {
                manageCandles: true, // enable candle dataset persistence/management
                transform: true, // converts ws data arrays to Candle models (and others)
              });
              
              this.rest = this.bfx.rest(2, {
                transform: true,
              });

              this.initWebSocket(this.candleKey);
        }
        
        subscribe(fn) {
            this.observers.push(fn);
        }

        unsubscribe(fn) {
            this.observers = this.observers.filter((subscriber) => subscriber !== fn);
          }

        broadcast(data) {
            this.observers.forEach((subscriber) => subscriber(data));
        }

        initWebSocket(candleKey) {
    
            this.ws.on('error', (err) => { console.log(err); });
            this.ws.on('close', () => console.log('closed'));
    
            this.ws.on('open', () => {
                this.ws.auth.bind(this.ws);
                this.ws.subscribeCandles(candleKey);
                let msg = `Class ${this.constructor.name}: Websocket opened for ${candleKey}`;
                console.log(msg);
            });

            LiveTradingPair.activePairs.push(this);
    
            this.ws.onCandle({ key: candleKey }, (candles) => {
                this.currentPrice = candles[0].close; // current candle close is most accurate price vs. ticker
                
                this.currentRSI = RSI.rsiCalculation(candles.map(x => x.close).reverse());
                var map = new Map();
                map.set('key', this.candleKey);
                map.set('price', this.currentPrice); 
                map.set('RSI', this.currentRSI); 
                this.broadcast(map);             
            });
    
            this.ws.open();
        }

    }
