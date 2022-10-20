/* eslint-disable no-unused-vars */
import { scaleUtc, scaleLinear } from 'd3-scale';
import { utcFormat } from 'd3-time-format';

const durationSecond = 1000;
const durationMinute = durationSecond * 60;
const durationHour = durationMinute * 60;
const durationDay = durationHour * 24;
const durationWeek = durationDay * 7;
const durationYear = durationDay * 365;

const formatSecond = utcFormat('%Y %b %d (%I:%M:%S %p)');
const formatMinute = utcFormat('%Y %b %d (%I:%M %p)');
const formatHour = utcFormat('%Y %b %d (%I %p)');
const formatDay = utcFormat('%Y %b %d');
const formatWeek = utcFormat('%Y %b');
const formatMonth = utcFormat('%Y');
const formatYear = utcFormat('');

const ZOOM_LEVEL_YEAR = 0;
const ZOOM_LEVEL_WEEK = 1;
const ZOOM_LEVEL_DAY = 2;
const ZOOM_LEVEL_SAMPLE = 3;
const ZOOM_LEVEL_FINEST = 4;

function timeFormat(date, timeDelta) {
  return (timeDelta < durationSecond ? formatSecond
    : timeDelta < durationMinute ? formatMinute
      : timeDelta < durationHour ? formatHour
        : timeDelta < durationDay ? formatDay
          : timeDelta < durationWeek ? formatWeek
            : timeDelta < durationYear ? formatMonth
              : formatYear)(date);
}

// const tickHeight = 10;
// const textHeight = 10;
const betweenTickAndText = 10;
const betweenCenterTickAndText = 20;

const PRIMARY = 0x337AB7;
const PRIMARY_DARK = 0x406a94;

const COLORS = [0x337AB7, 0xEC6836, 0xe9d36c];

const UnixTimeTrack = (HGC, ...args) => {
  if (!new.target) {
    throw new Error(
      'Uncaught TypeError: Class constructor cannot be invoked without "new"',
    );
  }

  // HiGlass Code
  const { PIXI } = HGC.libraries;

  class UnixTimeTrackClass extends HGC.tracks.TiledPixiTrack {
    constructor(
      scene, trackConfig, dataConfig, handleTilesetInfoReceived, animate,
    ) {
      super(
        scene,
        dataConfig,
        handleTilesetInfoReceived,
        trackConfig.options,
        animate,
      );
      this.zoomLevel = 0;
      this.axisTexts = [];
      this.endpointsTexts = [];
      this.axisTextFontFamily = 'Arial';
      this.axisTextFontSize = 12;
      this.timeScale = this._xScale;
      this.features = trackConfig.feature;
      this.trackConfig = trackConfig;
      console.log(this.trackConfig);
      this.myYScale = null;
      this.context = new PIXI.Text(
        'sample',
        {
          fontSize: `${this.axisTextFontSize}px`,
          fontFamily: this.axisTextFontFamily,
          fill: 'black',
        },
      );
      this.context.anchor.y = 0.4;
      this.context.anchor.x = 0.5;
      this.pMain.addChild(this.context);

      this.zoomText = new PIXI.Text(
        '',
        {
          fontSize: '16px',
          fontFamily: this.axisTextFontFamily,
          fill: 'black',
        },
      );

      this.maxY = 0;
      this.minY = 0;

      this.axisLow = new PIXI.Text(
        '',
        {
          fontSize: this.axisTextFontSize,
          fontFamily: this.axisTextFontFamily,
          fill: 'black',
        },
      );
      
      this.axisHigh = new PIXI.Text(
        '',
        {
          fontSize: this.axisTextFontSize,
          fontFamily: this.axisTextFontFamily,
          fill: 'black',
        },
      );

      this.pMain.addChild(this.zoomText);
      this.pMain.addChild(this.axisHigh);
      this.pMain.addChild(this.axisLow);

      this.zoomText.x = 16;
      this.zoomText.y = this.position[1] + 120;
      this.zoomText.text = `${this.features} [${this.trackConfig.visual}]`;
    }

    initTile() {
    }

    getMouseOverHtml(trackX) {
      const dataX = this._xScale.invert(trackX) * 1000;
      
      let found = null;
      let min = Number.MAX_VALUE;

      this.visibleTiles.forEach((visible) => {
        if (visible.tileId in this.fetchedTiles) {
          const fetched = this.fetchedTiles[visible.tileId];
          const { samples } = fetched.tileData;

          samples.forEach((sample) => {
            if (Math.abs(sample.start - dataX) < min) {
              min = Math.abs(sample.start - dataX);
              found = sample;
            }
          });
        }
      });

      if (found) {
        if (found.max) {
          return `${this.features}: ${found.max[this.features]}`;
        } else if (found.individuals) {
          let foundPoint = null;

          found.individuals.sparse.forEach((point) => {
            const t = point[0];
            if (Math.abs(t - dataX) < min) {
              min = Math.abs(t - dataX);
              foundPoint = point;
            }
          });

          if (foundPoint) {
            return `${foundPoint[found.individuals.header.indexOf(this.features[0])]}`;
          }
        }
      }
      
      return undefined;
    }

    updateTimeScale() {
      const linearScale = this._xScale.copy();
      const timeScale = scaleUtc()
        .domain(linearScale.domain().map(d => d * 1000))
        .range(linearScale.range());
      this.timeScale = timeScale;
      return timeScale;
    }

    createAxisTexts() {
      const ticks = this.timeScale.ticks();
      const tickFormat = this.timeScale.tickFormat();

      let i = 0;

      while (i < ticks.length) {
        const tick = ticks[i];

        while (this.axisTexts.length <= i) {
          const newText = new PIXI.Text(
            tick,
            {
              fontSize: `${this.axisTextFontSize}px`,
              fontFamily: this.axisTextFontFamily,
              fill: 'black',
            },
          );
          this.axisTexts.push(newText);
          this.pMain.addChild(newText);
        }

        this.axisTexts[i].text = tickFormat(tick);
        this.axisTexts[i].anchor.y = 0.5;
        this.axisTexts[i].anchor.x = 0.5;
        i++;
      }

      while (this.axisTexts.length > ticks.length) {
        const lastText = this.axisTexts.pop();
        this.pMain.removeChild(lastText);
      }
    }

    drawTicks(tickStartY, tickEndY) {
      this.timeScale.ticks().forEach((tick, i) => {
        const xPos = this.position[0] + this.timeScale(tick);

        this.pMain.moveTo(xPos, this.position[1] + tickStartY);
        this.pMain.lineTo(xPos, this.position[1] + tickEndY);

        this.axisTexts[i].x = xPos;
        this.axisTexts[i].y = this.position[1] + tickEndY + betweenTickAndText;
      });
    }

    drawContext(tickStartY, tickEndY) {
      const ticks = this.timeScale.ticks();
      const center = (+this.timeScale.domain()[1] + +this.timeScale.domain()[0]) / 2;
      const tickDiff = +ticks[1] - +ticks[0];

      const xPos = this.position[0] + this.timeScale(center);
      this.context.text = timeFormat(center, tickDiff);
      this.context.x = xPos;
      this.context.y = this.position[1] + tickEndY + betweenCenterTickAndText;
      if (this.context.text !== ' ') {
        this.pMain.moveTo(xPos, this.position[1] + tickStartY);
        this.pMain.lineTo(xPos, this.position[1] + tickEndY);
      }
    }

    draw() {
      const graphics = this.pMain;
      graphics.clear();
      graphics.lineStyle(1, PRIMARY_DARK, 1);

      const { features } = this;

      this.maxY = Number.MIN_SAFE_INTEGER;
      this.minY = Number.MAX_SAFE_INTEGER;

      this.visibleTiles.forEach((visible) => {
        if (visible.tileId in this.fetchedTiles) {
          const fetched = this.fetchedTiles[visible.tileId];
          const {
            samples,
          }
           = fetched.tileData;

          if (samples && samples.length > 0) {
            samples.forEach((sample) => {
              if (sample.max) {
                features.forEach((feature) => {
                  // eslint-disable-next-line no-unused-vars
                  const [q0, q1, q2, q3, q4] = sample.quantile[feature];

                  if (q0 < this.minY) {
                    this.minY = q0;
                  }
                  if (q4 > this.maxY) {
                    this.maxY = q4;
                  }
                });
              } else if (sample.individuals) {
                const feature = this.features[0];
                const key = sample.individuals.header.indexOf(feature);
                sample.individuals.sparse.forEach((point) => {
                  const valeu = point[key];

                  if (valeu < this.minY) {
                    this.minY = valeu;
                  }
                  if (valeu > this.maxY) {
                    this.maxY = valeu;
                  }
                });
              }
            });
          }
        }
      });

      this.myYScale = scaleLinear().domain([this.maxY, this.minY])
        .range([this.position[1] + 30, this.position[1] + 130]);

      this.visibleTiles.forEach((visible) => {
        if (visible.tileId in this.fetchedTiles) {
          const fetched = this.fetchedTiles[visible.tileId];
          const {
            samples, bounds,
          }
           = fetched.tileData;

          if (samples && samples.length > 0) {
            samples.forEach((sample) => {
              if (sample.max) {
                if (this.trackConfig.visual === 'boxplot') {
                  const x = this.timeScale((sample.end + sample.start) / 2);
                  const w = this.timeScale(sample.end) - this.timeScale(sample.start);
  
                  const [q0, q1, q2, q3, q4] = sample.quantile[features[0]];
  
                  
                  const p = Math.min(1, Math.floor(w / 10));
  
                  graphics.beginFill(PRIMARY, 1);
                  graphics.drawRect(
                    x - ((w - (p * 2)) / 2),
                    this.myYScale(q1),
                    w - (p * 2),
                    this.myYScale(q3) - this.myYScale(q1),
                  );
  
                  graphics.moveTo(x - (w / 2) + p + 0.5, this.myYScale(q2));
                  graphics.lineTo(x + (w / 2) - p + 0.5, this.myYScale(q2));
  
                  graphics.moveTo(x + 0.5, this.myYScale(q1));
                  graphics.lineTo(x + 0.5, this.myYScale(q0));
  
                  graphics.moveTo(x + 0.5, this.myYScale(q3));
                  graphics.lineTo(x + 0.5, this.myYScale(q4));
  
                  if (w >= 10) {
                    graphics.moveTo(x + 0.5 - 3, this.myYScale(q0));
                    graphics.lineTo(x + 0.5 + 3, this.myYScale(q0));
  
                    graphics.moveTo(x + 0.5 - 3, this.myYScale(q4));
                    graphics.lineTo(x + 0.5 + 3, this.myYScale(q4));
                  }
                } else {
                  const visual = this.trackConfig.mark ? this.trackConfig.mark : 'line';

                  if (visual === 'line') {
                    const w = this.timeScale(sample.end) - this.timeScale(sample.start);
                    const p = Math.min(1, Math.floor(w / 10));
                    const x = this.timeScale((sample.end + sample.start) / 2);
  
                    features.forEach((feature, i) => {
                      const [q0, q1, q2, q3, q4] = sample.quantile[feature];
  
                      graphics.beginFill(COLORS[i]);
                      graphics.lineStyle(2, COLORS[i], 1);
  
                      graphics.moveTo(x - (w / 2) + p + 0.5, this.myYScale(q2));
                      graphics.lineTo(x + (w / 2) - p + 0.5, this.myYScale(q2));
                    });
                  } else if (visual === 'bar') {
                    const w = this.timeScale(sample.end) - this.timeScale(sample.start);
                    const p = Math.min(1, Math.floor(w / 10));
                    const x = this.timeScale((sample.end + sample.start) / 2);
  
                    const [q0, q1, q2, q3, q4] = sample.quantile[features[0]];
                    
                    graphics.beginFill(PRIMARY, 1);
                    graphics.lineStyle(1, PRIMARY_DARK, 1);

                    graphics.drawRect(
                      x - ((w - (p * 2)) / 2),
                      this.myYScale(q2),
                      w - (p * 2),
                      this.myYScale(this.minY) - this.myYScale(q2),
                    );
                  }
                }
              } else if (sample.individuals) {
                const hi = sample.individuals.header.indexOf(features[0]);

                graphics.beginFill(PRIMARY, 1);
                graphics.lineStyle(1, PRIMARY_DARK, 1);

                sample.individuals.sparse.forEach((point) => {
                  const x = this.timeScale(point[0]);
                  const y = this.myYScale(point[hi]);
                  graphics.drawCircle(x, y, 4);
                });
              }
            });

            // graphics.drawRect((this.timeScale(start)),
            //   this.position[1], this.timeScale(end) - this.timeScale(start), 100);
          }
        }
      });

      graphics.lineStyle(1, 0x000000, 0.15);
      graphics.endFill();


      graphics.drawRect(this.position[0], this.myYScale(this.maxY),
        this.dimensions[0],
        this.myYScale(this.minY) - this.myYScale(this.maxY));

      console.log(this);

      const tickHeight = 8;
      const textHeight = 0;
      const tickStartY = (this.dimensions[1] - tickHeight - textHeight - betweenTickAndText) / 2;
      const tickEndY = tickStartY + tickHeight;

      this.zoomText.y = this.position[1] + 4;
      this.zoomText.x = 300 + 16;
      
      this.updateTimeScale();
      this.drawY(graphics);
      // this.createAxisTexts();
      // this.drawTicks(tickStartY, tickEndY);
      // this.drawContext(tickStartY, tickEndY);
    }

    drawY(graphics) {
      this.axisLow.x = 34;
      this.axisHigh.x = 34;

      const multiple = 0.01;
      this.minY = Math.floor((this.minY + Math.floor(multiple / 2)) / multiple) * multiple;
      this.maxY = Math.floor((this.maxY + Math.floor(multiple / 2)) / multiple) * multiple;

      this.axisLow.y = this.myYScale(this.minY) - 7;
      this.axisHigh.y = this.myYScale(this.maxY) - 7;

      this.axisLow.text = this.minY.toFixed(2);
      this.axisHigh.text = this.maxY.toFixed(2);

      graphics.lineStyle(1, 0x000000, 1);
      graphics.moveTo(16, this.myYScale(this.minY));
      graphics.lineTo(32, this.myYScale(this.minY));

      graphics.moveTo(16, this.myYScale(this.maxY));
      graphics.lineTo(32, this.myYScale(this.maxY));
    }

    tileToLocalId(tile) {
      return tile;
    }

    tileToRemoteId(tile) {
      // eslint-disable-next-line no-unused-vars
      const [_, z, x, y] = tile.split('.');
      return `${z}.${x}.${y}`;
    }

    calculateVisibleTiles() {
      this.calculateZoomLevel();

      const resolution = this.tilesetInfo.resolutions[this.zoomLevel];
      
      const minX = this.tilesetInfo.min_pos[0];
      const maxX = this.tilesetInfo.max_pos[0];

      const epsilon = 0.000001;
      const tileWidth = resolution;

      const lowerBound = Math.max(
        0,
        Math.floor((this.timeScale.domain()[0] - minX) / tileWidth),
      );
      const upperBound = Math.max(0, Math.ceil(
        Math.min(maxX, this.timeScale.domain()[1] - minX - epsilon) / tileWidth,
      ));

      const tiles = [];
      for (let i = lowerBound; i <= upperBound; i++) {
        tiles.push(`michael.${this.zoomLevel}.${i}.${0}`);
      }

      this.setVisibleTiles(tiles);
    }

    calculateZoomLevel() {
      const [l, r] = this.timeScale.domain();
      const days = (r - l) / (1000 * 60 * 60 * 24);

      if (days > 150) {
        this.zoomLevel = ZOOM_LEVEL_YEAR;
        // this.zoomText.text = 'resolution: YEAR';
      } else if (days > 14) {
        this.zoomLevel = ZOOM_LEVEL_WEEK;
        // this.zoomText.text = 'resolution: WEEK';
      } else if (days > 2) {
        this.zoomLevel = ZOOM_LEVEL_DAY;
        // this.zoomText.text = 'resolution: DAY';
      } else if (days >= 0.2) {
        this.zoomLevel = ZOOM_LEVEL_SAMPLE;
      } else {
        this.zoomLevel = ZOOM_LEVEL_FINEST;
      }
    }

    /* --------------------------- Getter / Setter ---------------------------- */

    zoomed(newXScale, newYScale) {
      this.xScale(newXScale);
      this.yScale(newYScale);

      if (!this.tilesetInfo) {
        return;
      }

      this.calculateZoomLevel();
      this.calculateVisibleTiles();

      this.refreshTiles();

      this.draw();
    }
  }

  return new UnixTimeTrackClass(...args);
};

UnixTimeTrack.config = {
  type: 'unix-time-track',
  datatype: [],
  orientation: '1d-horizontal',
  name: 'UnixTime',
  availableOptions: [
  ],
  defaultOptions: {
  },
};

export default UnixTimeTrack;
