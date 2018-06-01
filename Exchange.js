const BFX = require('bitfinex-api-node');
const config = require('./config');



const RSI = require('./RSI.js');
const Position = require('./Position.js');



module.exports = 

    class LiveTradingPair {
 
        
        constructor(candleKey, trailing){

            /* create array for all instanced pairs */
            if(LiveTradingPair.activePairs == null)
                LiveTradingPair.activePairs = new Array();

            this.currentPrice = 0;
            this.currentRSI = 0;
            this.sumProfit = 0;

            this.blockOpeningNewPosition = false;
            this.candleKey = candleKey;
            this.trailing = trailing;

            this.observers = [];
            this.activePosition = null;
            

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
        
        toString()
        {
            return `TradingPair with key ${this.candleKey}`;
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

        addProfit(amount){
            this.sumProfit += amount;
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
                map.set('key', `candleUpdate`);
                map.set('context', this);
                map.set('price', this.currentPrice); 
                map.set('RSI', this.currentRSI); 
                this.broadcast(map);       
                this.checkMarketSituation();
                if(this.activePosition != null)
                    this.activePosition.update();      
            });
    
            this.ws.open();
        }

        onPositionClosed(closedPosition)
        {
            this.sumProfit += closedPosition.profit;
            this.activePosition = null;
            var map = new Map();
            map.set('key', 'closedPos');
            map.set('context', this);
            map.set('pos', closedPosition);           
            this.broadcast(map);
        }


        checkMarketSituation() {
            if (this.blockOpeningNewPosition &&
                (this.currentRSI < config.indicators.rsi.longValue &&
                this.currentRSI > config.indicators.rsi.shortValue)) {
                    this.blockOpeningNewPosition = false;
            }

            if (this.currentRSI >= config.indicators.rsi.longValue 
                && this.activePosition == null 
                 && !this.blockOpeningNewPosition) {
                    // open long position
                    var newPos = new Position(this,
                        'long',0.1, 
                        this.currentPrice, 
                        config.trading.takeProfitPerc,
                        config.trading.stopLossPerc,
                        this.trailing);

                    this.activePosition = newPos;
                    this.blockOpeningNewPosition = true;
                    newPos.open();
                    var map = new Map();
                    map.set('key', 'newPos');
                    map.set('context', this);
                    map.set('pos', newPos); 
                    this.broadcast(map);       
            }

            else if (this.currentRSI <= config.indicators.rsi.shortValue &&
                this.activePosition == null  &&
                !this.blockOpeningNewPosition) {
                // open short position
                var newPos = new Position(this,
                    'short',0.1, 
                    this.currentPrice, 
                    config.trading.takeProfitPerc,
                    config.trading.stopLossPerc,
                    this.trailing);

                this.activePosition = newPos;
                this.blockOpeningNewPosition = true;
                newPos.open();
                var map = new Map();
                map.set('key', 'newPos');
                map.set('context', this);
                map.set('pos', newPos); 
                this.broadcast(map);     
            }
        }
    }

