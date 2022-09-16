import { scaleUtc } from 'd3-scale';
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

function timeFormat(date, timeDelta) {
  return (timeDelta < durationSecond ? formatSecond
    : timeDelta < durationMinute ? formatMinute
      : timeDelta < durationHour ? formatHour
        : timeDelta < durationDay ? formatDay
          : timeDelta < durationWeek ? formatWeek
            : timeDelta < durationYear ? formatMonth
              : formatYear)(date);
}

const tickHeight = 10;
const textHeight = 10;
const betweenTickAndText = 10;
const betweenCenterTickAndText = 20;

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
          fill: 'red',
        },
      );
      
      this.pMain.addChild(this.zoomText);

      this.zoomText.x = 16;
      this.zoomText.y = 120;
    }

    initTile() {
    }

    getMouseOverHtml(trackX) {
      const dataX = this._xScale.invert(trackX);
      
      let found = null;
      let min = Number.MAX_VALUE;

      this.visibleTiles.forEach((visible) => {
        if (visible.tileId in this.fetchedTiles) {
          const fetched = this.fetchedTiles[visible.tileId];
          const { samples } = fetched.tileData;
          samples.forEach((sample) => {
            if (Math.abs(sample[0] - dataX) < min) {
              min = Math.abs(sample[0] - dataX);
              found = sample;
            }
          });
        }
      });

      if (found) {
        return `${found[1]}`;
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
      graphics.lineStyle(1, 0x000000, 1);

      this.visibleTiles.forEach((visible) => {
        if (visible.tileId in this.fetchedTiles) {
          const fetched = this.fetchedTiles[visible.tileId];
          const { samples } = fetched.tileData;
          samples.forEach((sample) => {
            graphics.drawRect(this.timeScale(sample[0]) - 1,
              80 - (sample[1] * 20), 2, sample[1] * 20);
          });
        }
      });

      const tickStartY = (this.dimensions[1] - tickHeight - textHeight - betweenTickAndText) / 2;
      const tickEndY = tickStartY + tickHeight;

      this.updateTimeScale();
      this.createAxisTexts();
      this.drawTicks(tickStartY, tickEndY);
      this.drawContext(tickStartY, tickEndY);
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

      if (days > 365) {
        this.zoomLevel = ZOOM_LEVEL_YEAR;
        this.zoomText.text = 'resolution: YEAR';
      } else if (days > 14) {
        this.zoomLevel = ZOOM_LEVEL_WEEK;
        this.zoomText.text = 'resolution: WEEK';
      } else {
        this.zoomLevel = ZOOM_LEVEL_DAY;
        this.zoomText.text = 'resolution: DAY';
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
