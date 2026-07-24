class AtessPowerFlowCard extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: "open" });

    this._config = null;
    this._hass = null;
    this._rendered = false;
    this._elements = {};
  }

  setConfig(config) {
    if (!config) {
      throw new Error("ATESS Power Flow Card configuration is required.");
    }

    if (!config.entities) {
      throw new Error("The entities section is required.");
    }

    this._config = {
      title: "ATESS Energy Flow",
      subtitle: "Grid rectifier · DC bus · Battery · HPS150",
      site_name: "LOAD",

      image_version: "1",

      images: {
        rectifier: "/local/atess-dashboard/rectifier.png",
        battery: "/local/atess-dashboard/battery-rack.png",
        inverter: "/local/atess-dashboard/hps150.png",
        load: "/local/atess-dashboard/alutip-logo.png",
      },

      power_units: {
        grid: "W",
        battery: "W",
        load: "kW",
      },

      energy_units: {
        grid_daily: "kWh",
        battery_charge: "kWh",
        battery_discharge: "kWh",
        load_daily: "kWh",
      },

      battery_positive_means: "discharging",
      deadband_w: 100,

      ...config,

      images: {
        rectifier: "/local/atess-dashboard/rectifier.png",
        battery: "/local/atess-dashboard/battery-rack.png",
        inverter: "/local/atess-dashboard/hps150.png",
        load: "/local/atess-dashboard/alutip-logo.png",
        ...(config.images || {}),
      },

      power_units: {
        grid: "W",
        battery: "W",
        load: "kW",
        ...(config.power_units || {}),
      },

      energy_units: {
        grid_daily: "kWh",
        battery_charge: "kWh",
        battery_discharge: "kWh",
        load_daily: "kWh",
        ...(config.energy_units || {}),
      },
    };

    this._renderCard();
  }

  set hass(hass) {
    this._hass = hass;

    if (!this._rendered && this._config) {
      this._renderCard();
    }

    if (this._rendered) {
      this._updateValues();
    }
  }

  getCardSize() {
    return 9;
  }

  static getStubConfig() {
    return {
      title: "ATESS Energy Flow",
      subtitle: "Grid rectifier · DC bus · Battery · HPS150",
      site_name: "Site load",

      entities: {
        grid_power: "",
        grid_daily_energy: "",

        battery_power: "",
        battery_soc: "",
        battery_voltage: "",
        battery_current: "",
        battery_temperature: "",
        battery_daily_charge: "",
        battery_daily_discharge: "",

        load_power: "",
        load_daily_energy: "",

        voltage_l1: "",
        voltage_l2: "",
        voltage_l3: "",

        current_l1: "",
        current_l2: "",
        current_l3: "",
      },
    };
  }

  _renderCard() {
    if (!this._config) {
      return;
    }

    const imageVersion = this._config.image_version || "1";

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
        }

        ha-card {
          box-sizing: border-box;
          width: 100%;
          overflow: hidden;
          border-radius: 22px;
          background:
            linear-gradient(
              145deg,
              rgba(255, 255, 255, 0.99),
              rgba(241, 244, 247, 0.99)
            );
          box-shadow: 0 12px 35px rgba(0, 0, 0, 0.14);
          color: #263238;
        }

        .dashboard {
          container-type: inline-size;
          box-sizing: border-box;
          width: 100%;
          padding: 24px;
          font-family: var(--paper-font-body1_-_font-family);
        }

        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 20px;
        }

        .header-title-area {
          min-width: 0;
        }

        .title {
          overflow: hidden;
          color: #263238;
          font-size: 25px;
          font-weight: 750;
          line-height: 1.2;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .subtitle {
          overflow: hidden;
          margin-top: 4px;
          color: #71808a;
          font-size: 13px;
          line-height: 1.25;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .system-status {
          display: flex;
          flex: 0 0 auto;
          align-items: center;
          gap: 8px;
          padding: 8px 13px;
          border: 1px solid #d6dde1;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.8);
          font-size: 13px;
          font-weight: 700;
          white-space: nowrap;
        }

        .status-dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: #9e9e9e;
        }

        .status-dot.active {
          background: #43a047;
          box-shadow: 0 0 8px rgba(67, 160, 71, 0.7);
        }

        /*
         * Desktop:
         *
         * ESKOM → RECTIFIER → DC BUS ↔ BATTERY
         *                         ↓
         *                       HPS150 → LOAD
         */

        .flow-layout {
          display: grid;
          grid-template-columns:
            minmax(115px, 0.9fr)
            minmax(42px, 0.3fr)
            minmax(145px, 1.05fr)
            minmax(42px, 0.3fr)
            minmax(145px, 1.05fr)
            minmax(42px, 0.3fr)
            minmax(160px, 1.2fr);
          grid-template-rows:
            minmax(235px, auto)
            58px
            minmax(300px, auto);
          align-items: center;
          gap: 8px;
        }

        .equipment {
          position: relative;
          z-index: 2;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          min-width: 0;
          padding: 14px 10px;
          border: 1px solid rgba(150, 165, 175, 0.38);
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.93);
          box-shadow: 0 7px 18px rgba(45, 55, 65, 0.09);
          text-align: center;
          contain: layout paint;
        }

        .equipment-title {
          margin-bottom: 8px;
          color: #3e4a52;
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.55px;
        }

        .equipment-image,
        .load-logo {
          display: block;
          flex: 0 0 auto;
          max-width: 100%;
          opacity: 1;
          visibility: visible;
          object-fit: contain;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          image-rendering: auto;
          transition: none !important;
          animation: none !important;
          pointer-events: none;
          user-select: none;
          -webkit-user-select: none;
          -webkit-user-drag: none;
        }

        .grid-box {
          grid-column: 1;
          grid-row: 1;
        }

        .rectifier-box {
          grid-column: 3;
          grid-row: 1;
        }

        .dc-box {
          grid-column: 5;
          grid-row: 1;
        }

        .battery-box {
          grid-column: 7;
          grid-row: 1;
        }

        .hps-box {
          grid-column: 5;
          grid-row: 3;
        }

        .load-box {
          grid-column: 7;
          grid-row: 3;
        }

        .grid-icon {
          --mdc-icon-size: 74px;
          margin: 6px 0 11px;
          color: #e53935;
        }

        .dc-icon {
          --mdc-icon-size: 68px;
          margin: 9px 0 14px;
          color: #0084ad;
        }

        .rectifier-image {
          width: 135px;
          height: 95px;
          margin: 4px 0 10px;
          transform: translateZ(0);
        }

        .hps-image {
          width: 185px;
          height: 215px;
          margin: -12px 0 -3px;
          object-fit: contain;
          transform: scale(1.18) translateZ(0);
          transform-origin: center;
        }

        .battery-image {
          width: 135px;
          height: 155px;
          margin: 1px 0 5px;
          transform: translateZ(0);
        }

        .load-logo {
          width: 150px;
          max-height: 100px;
          margin-bottom: 10px;
          transform: translateZ(0);
        }

        .main-reading {
          color: #15232b;
          font-size: 19px;
          font-weight: 800;
          line-height: 1.2;
        }

        .load-reading {
          color: #e53935;
          font-size: 22px;
        }

        .minor-reading {
          margin-top: 5px;
          color: #72818a;
          font-size: 11px;
        }

        .battery-soc {
          position: absolute;
          top: 42px;
          right: 11px;
          z-index: 3;
          padding: 5px 8px;
          border-radius: 12px;
          background: #0084ad;
          color: white;
          font-size: 15px;
          font-weight: 800;
          box-shadow: 0 3px 9px rgba(0, 132, 173, 0.3);
        }

        .battery-status {
          margin-top: 5px;
          font-size: 11px;
          font-weight: 700;
        }

        .status-charge {
          color: #43a047;
        }

        .status-discharge {
          color: #0084ad;
        }

        .status-idle {
          color: #8b969c;
        }

        .battery-details {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 4px 9px;
          margin-top: 7px;
          color: #62717a;
          font-size: 10px;
        }

        .three-phase {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 7px;
          margin-top: 6px;
          font-size: 9px;
          font-weight: 650;
        }

        .current-row {
          margin-top: 3px;
          color: #6d7a82;
        }

        /*
         * Flow-line grid positions.
         */

        .grid-rectifier-line {
          grid-column: 2;
          grid-row: 1;
          align-self: center;
          width: 100%;
          height: 8px;
        }

        .rectifier-dc-line {
          grid-column: 4;
          grid-row: 1;
          align-self: center;
          width: 100%;
          height: 8px;
        }

        .battery-dc-line {
          grid-column: 6;
          grid-row: 1;
          align-self: center;
          width: 100%;
          height: 8px;
        }

        .dc-hps-line {
          grid-column: 5;
          grid-row: 2;
          align-self: stretch;
          justify-self: center;
          width: 8px;
          height: 100%;
        }

        .hps-load-line {
          grid-column: 6;
          grid-row: 3;
          align-self: center;
          width: 100%;
          height: 8px;
        }

        @keyframes flow-forward {
          from {
            background-position: 0 0;
          }

          to {
            background-position: 36px 0;
          }
        }

        @keyframes flow-reverse {
          from {
            background-position: 36px 0;
          }

          to {
            background-position: 0 0;
          }
        }

        @keyframes flow-down {
          from {
            background-position: 0 0;
          }

          to {
            background-position: 0 36px;
          }
        }

        @keyframes flow-up {
          from {
            background-position: 0 36px;
          }

          to {
            background-position: 0 0;
          }
        }

        .flow-line {
          position: relative;
          z-index: 1;
          overflow: hidden;
          border-radius: 10px;
          background: #cbd2d6;
          will-change: background-position;
        }

        .flow-line.horizontal {
          height: 8px;
        }

        .flow-line.vertical {
          width: 8px;
        }

        .grid-flow.active {
          background-image:
            repeating-linear-gradient(
              90deg,
              #e53935 0,
              #e53935 15px,
              rgba(229, 57, 53, 0.2) 15px,
              rgba(229, 57, 53, 0.2) 29px
            );
          background-size: 36px 8px;
        }

        .grid-flow.vertical.active {
          background-image:
            repeating-linear-gradient(
              180deg,
              #e53935 0,
              #e53935 15px,
              rgba(229, 57, 53, 0.2) 15px,
              rgba(229, 57, 53, 0.2) 29px
            );
          background-size: 8px 36px;
        }

        .load-flow.active {
          background-image:
            repeating-linear-gradient(
              90deg,
              #e53935 0,
              #e53935 15px,
              rgba(229, 57, 53, 0.2) 15px,
              rgba(229, 57, 53, 0.2) 29px
            );
          background-size: 36px 8px;
        }

        .load-flow.vertical.active {
          background-image:
            repeating-linear-gradient(
              180deg,
              #e53935 0,
              #e53935 15px,
              rgba(229, 57, 53, 0.2) 15px,
              rgba(229, 57, 53, 0.2) 29px
            );
          background-size: 8px 36px;
        }

        .charge-flow.active {
          background-image:
            repeating-linear-gradient(
              90deg,
              #43a047 0,
              #43a047 15px,
              rgba(67, 160, 71, 0.2) 15px,
              rgba(67, 160, 71, 0.2) 29px
            );
          background-size: 36px 8px;
        }

        .discharge-flow.active {
          background-image:
            repeating-linear-gradient(
              90deg,
              #0084ad 0,
              #0084ad 15px,
              rgba(0, 132, 173, 0.2) 15px,
              rgba(0, 132, 173, 0.2) 29px
            );
          background-size: 36px 8px;
        }

        .forward {
          animation: flow-forward 1.8s linear infinite;
        }

        .reverse {
          animation: flow-reverse 1.8s linear infinite;
        }

        .downward {
          animation: flow-down 1.8s linear infinite;
        }

        .upward {
          animation: flow-up 1.8s linear infinite;
        }

        /*
         * Daily-energy summary.
         */

        .energy-summary {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
          margin-top: 20px;
        }

        .summary-item {
          box-sizing: border-box;
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
          min-height: 65px;
          padding: 11px 13px;
          border: 1px solid rgba(150, 165, 175, 0.3);
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.82);
        }

        .summary-item ha-icon {
          --mdc-icon-size: 25px;
          flex: 0 0 auto;
          color: #0084ad;
        }

        .summary-content {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .summary-label {
          color: #7a878e;
          font-size: 10px;
          line-height: 1.15;
          white-space: normal;
        }

        .summary-value {
          overflow: hidden;
          margin-top: 3px;
          color: #263238;
          font-size: 13px;
          font-weight: 800;
          line-height: 1.2;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        /*
         * Tablet layout:
         *
         * RECTIFIER ← ESKOM
         *     ↓
         * DC BUS   ↔ BATTERY
         *     ↓
         * HPS150   → LOAD
         */

        @container (max-width: 760px) {
          .dashboard {
            padding: 14px;
          }

          .header {
            align-items: flex-start;
            margin-bottom: 14px;
          }

          .title {
            font-size: 20px;
          }

          .subtitle {
            font-size: 11px;
          }

          .system-status {
            padding: 6px 9px;
            font-size: 10px;
          }

          .flow-layout {
            grid-template-columns:
              minmax(0, 1fr)
              34px
              minmax(0, 1fr);
            grid-template-rows:
              minmax(210px, auto)
              42px
              minmax(235px, auto)
              42px
              minmax(300px, auto);
            gap: 5px;
          }

          .rectifier-box {
            grid-column: 1;
            grid-row: 1;
          }

          .grid-rectifier-line {
            grid-column: 2;
            grid-row: 1;
            align-self: center;
            width: 100%;
            height: 8px;
          }

          .grid-box {
            grid-column: 3;
            grid-row: 1;
          }

          /*
           * The element retains its horizontal class because it is
           * horizontal in desktop mode. This more-specific selector
           * overrides that class and makes it vertical here.
           */

          .flow-line.horizontal.rectifier-dc-line {
            grid-column: 1;
            grid-row: 2;
            align-self: stretch;
            justify-self: center;
            width: 8px !important;
            height: 100% !important;
            min-height: 42px;
            border-radius: 10px;
          }

          .flow-line.horizontal.rectifier-dc-line.active {
            background-image:
              repeating-linear-gradient(
                180deg,
                #e53935 0,
                #e53935 15px,
                rgba(229, 57, 53, 0.2) 15px,
                rgba(229, 57, 53, 0.2) 29px
              ) !important;
            background-size: 8px 36px !important;
            animation: flow-down 1.8s linear infinite !important;
          }

          .dc-box {
            grid-column: 1;
            grid-row: 3;
          }

          .battery-dc-line {
            grid-column: 2;
            grid-row: 3;
            align-self: center;
            width: 100%;
            height: 8px;
          }

          .battery-box {
            grid-column: 3;
            grid-row: 3;
          }

          .dc-hps-line {
            grid-column: 1;
            grid-row: 4;
            align-self: stretch;
            justify-self: center;
            width: 8px;
            height: 100%;
          }

          .hps-box {
            grid-column: 1;
            grid-row: 5;
          }

          .hps-load-line {
            grid-column: 2;
            grid-row: 5;
            align-self: center;
            width: 100%;
            height: 8px;
          }

          .load-box {
            grid-column: 3;
            grid-row: 5;
          }

          /*
           * On tablet/mobile, Eskom is to the right of the rectifier.
           * Grid import therefore runs from right to left.
           */

          .grid-rectifier-line.forward {
            animation-name: flow-reverse;
          }

          .rectifier-image {
            width: 105px;
            height: 76px;
          }

          .hps-image {
            width: 145px;
            height: 190px;
            margin: -10px 0 -3px;
            transform: scale(1.16) translateZ(0);
          }

          .battery-image {
            width: 100px;
            height: 130px;
          }

          .load-logo {
            width: 120px;
            max-height: 80px;
          }

          .energy-summary {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 8px;
            margin-top: 14px;
          }
        }

        /*
         * Phone layout.
         */

        @container (max-width: 520px) {
          .dashboard {
            padding: 9px;
          }

          .header {
            gap: 6px;
            margin-bottom: 10px;
          }

          .header-title-area {
            min-width: 0;
          }

          .title {
            font-size: 17px;
          }

          .subtitle {
            display: none;
          }

          .system-status {
            gap: 5px;
            padding: 4px 7px;
            font-size: 8px;
          }

          .status-dot {
            width: 7px;
            height: 7px;
          }

          .flow-layout {
            grid-template-columns:
              minmax(0, 1fr)
              18px
              minmax(0, 1fr);
            grid-template-rows:
              155px
              24px
              175px
              24px
              215px;
            gap: 3px;
          }

          .equipment {
            padding: 6px 3px;
            border-radius: 12px;
          }

          .equipment-title {
            margin-bottom: 3px;
            font-size: 8px;
            letter-spacing: 0.2px;
          }

          .main-reading {
            font-size: 13px;
          }

          .load-reading {
            font-size: 15px;
          }

          .minor-reading {
            margin-top: 3px;
            font-size: 7px;
          }

          .grid-icon {
            --mdc-icon-size: 40px;
            margin: 2px 0 5px;
          }

          .dc-icon {
            --mdc-icon-size: 38px;
            margin: 3px 0 6px;
          }

          .rectifier-image {
            width: 66px;
            height: 47px;
            margin: 1px 0 5px;
          }

          .battery-image {
            width: 60px;
            height: 82px;
          }

          .hps-image {
            width: 100px;
            height: 135px;
            margin: -8px 0 -1px;
            transform: scale(1.18) translateZ(0);
          }

          .load-logo {
            width: 75px;
            max-height: 50px;
          }

          .battery-soc {
            top: 23px;
            right: 4px;
            padding: 2px 5px;
            font-size: 8px;
          }

          .battery-status {
            margin-top: 2px;
            font-size: 8px;
          }

          .battery-details {
            gap: 1px 3px;
            margin-top: 3px;
            font-size: 6px;
          }

          .three-phase {
            gap: 3px;
            margin-top: 4px;
            font-size: 6px;
          }

          .flow-line.horizontal {
            height: 6px;
          }

          .flow-line.vertical,
          .dc-hps-line {
            width: 6px;
          }

          /*
           * Phone-specific rectifier-to-DC-bus dimensions.
           */

          .flow-line.horizontal.rectifier-dc-line {
            width: 6px !important;
            height: 100% !important;
            min-height: 24px;
          }

          .flow-line.horizontal.rectifier-dc-line.active {
            background-size: 6px 36px !important;
          }

          .energy-summary {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 5px;
            margin-top: 9px;
          }

          .summary-item {
            gap: 5px;
            min-height: 49px;
            padding: 6px;
            border-radius: 10px;
          }

          .summary-item ha-icon {
            --mdc-icon-size: 18px;
          }

          .summary-label {
            font-size: 7px;
          }

          .summary-value {
            font-size: 10px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .flow-line {
            animation: none !important;
          }
        }
      </style>

      <ha-card>
        <div class="dashboard">

          <div class="header">
            <div class="header-title-area">
              <div class="title"></div>
              <div class="subtitle"></div>
            </div>

            <div class="system-status">
              <span class="status-dot"></span>
              <span class="status-text">System idle</span>
            </div>
          </div>

          <div class="flow-layout">

            <div class="equipment grid-box">
              <div class="equipment-title">ESKOM</div>

              <ha-icon
                class="grid-icon"
                icon="mdi:transmission-tower">
              </ha-icon>

              <div class="main-reading grid-power">--</div>
              <div class="minor-reading grid-daily">Today: --</div>
            </div>

            <div
              class="
                flow-line
                horizontal
                grid-flow
                grid-rectifier-line
              ">
            </div>

            <div class="equipment rectifier-box">
              <div class="equipment-title">RECTIFIER</div>

              <img
                class="equipment-image rectifier-image"
                src="${this._withVersion(
                  this._config.images.rectifier,
                  imageVersion
                )}"
                alt="Grid rectifier"
                loading="eager"
                decoding="sync"
                fetchpriority="high"
                draggable="false">

              <div class="main-reading rectifier-power">--</div>
              <div class="minor-reading">AC grid → DC bus</div>
            </div>

            <div
              class="
                flow-line
                horizontal
                grid-flow
                rectifier-dc-line
              ">
            </div>

            <div class="equipment dc-box">
              <div class="equipment-title">DC BUS</div>

              <ha-icon
                class="dc-icon"
                icon="mdi:current-dc">
              </ha-icon>

              <div class="main-reading dc-voltage">--</div>
              <div class="minor-reading dc-current">--</div>
            </div>

            <div
              class="
                flow-line
                horizontal
                battery-dc-line
              ">
            </div>

            <div class="equipment battery-box">
              <div class="equipment-title">BATTERY</div>

              <img
                class="equipment-image battery-image"
                src="${this._withVersion(
                  this._config.images.battery,
                  imageVersion
                )}"
                alt="Battery rack"
                loading="eager"
                decoding="sync"
                fetchpriority="high"
                draggable="false">

              <div class="battery-soc">--%</div>

              <div class="main-reading battery-power">--</div>

              <div class="battery-status status-idle">
                Idle
              </div>

              <div class="battery-details">
                <span class="battery-voltage">--</span>
                <span class="battery-current">--</span>
                <span class="battery-temperature">--</span>
              </div>
            </div>

            <div
              class="
                flow-line
                vertical
                load-flow
                dc-hps-line
              ">
            </div>

            <div class="equipment hps-box">
              <div class="equipment-title">ATESS HPS150</div>

              <img
                class="equipment-image hps-image"
                src="${this._withVersion(
                  this._config.images.inverter,
                  imageVersion
                )}"
                alt="ATESS HPS150"
                loading="eager"
                decoding="sync"
                fetchpriority="high"
                draggable="false">

              <div class="main-reading inverter-power">--</div>

              <div class="three-phase voltage-row">
                <span class="voltage-l1">--</span>
                <span class="voltage-l2">--</span>
                <span class="voltage-l3">--</span>
              </div>

              <div class="three-phase current-row">
                <span class="current-l1">--</span>
                <span class="current-l2">--</span>
                <span class="current-l3">--</span>
              </div>
            </div>

            <div
              class="
                flow-line
                horizontal
                load-flow
                hps-load-line
              ">
            </div>

            <div class="equipment load-box">
              <img
                class="load-logo"
                src="${this._withVersion(
                  this._config.images.load,
                  imageVersion
                )}"
                alt="${this._escapeHtml(this._config.site_name)}"
                loading="eager"
                decoding="sync"
                fetchpriority="high"
                draggable="false">

              <div class="equipment-title load-title"></div>

              <div class="main-reading load-reading load-power">
                --
              </div>

              <div class="minor-reading load-daily">
                Today: --
              </div>
            </div>

          </div>

          <div class="energy-summary">

            ${this._summaryBlock(
              "mdi:transmission-tower-import",
              "Grid import",
              "summary-grid"
            )}

            ${this._summaryBlock(
              "mdi:battery-arrow-down",
              "Battery charged",
              "summary-charge"
            )}

            ${this._summaryBlock(
              "mdi:battery-arrow-up",
              "Battery discharged",
              "summary-discharge"
            )}

            ${this._summaryBlock(
              "mdi:factory",
              "Load energy",
              "summary-load"
            )}

          </div>

        </div>
      </ha-card>
    `;

    this._cacheElements();

    this._elements.title.textContent =
      this._config.title;

    this._elements.subtitle.textContent =
      this._config.subtitle;

    this._elements.loadTitle.textContent =
      this._config.site_name;

    this._rendered = true;

    if (this._hass) {
      this._updateValues();
    }
  }

  _cacheElements() {
    const $ = (selector) =>
      this.shadowRoot.querySelector(selector);

    this._elements = {
      title: $(".title"),
      subtitle: $(".subtitle"),
      loadTitle: $(".load-title"),

      statusDot: $(".status-dot"),
      statusText: $(".status-text"),

      gridPower: $(".grid-power"),
      gridDaily: $(".grid-daily"),
      rectifierPower: $(".rectifier-power"),

      dcVoltage: $(".dc-voltage"),
      dcCurrent: $(".dc-current"),

      batterySoc: $(".battery-soc"),
      batteryPower: $(".battery-power"),
      batteryStatus: $(".battery-status"),
      batteryVoltage: $(".battery-voltage"),
      batteryCurrent: $(".battery-current"),
      batteryTemperature: $(".battery-temperature"),

      inverterPower: $(".inverter-power"),
      loadPower: $(".load-power"),
      loadDaily: $(".load-daily"),

      voltageL1: $(".voltage-l1"),
      voltageL2: $(".voltage-l2"),
      voltageL3: $(".voltage-l3"),

      currentL1: $(".current-l1"),
      currentL2: $(".current-l2"),
      currentL3: $(".current-l3"),

      summaryGrid: $(".summary-grid"),
      summaryCharge: $(".summary-charge"),
      summaryDischarge: $(".summary-discharge"),
      summaryLoad: $(".summary-load"),

      gridRectifierLine: $(".grid-rectifier-line"),
      rectifierDcLine: $(".rectifier-dc-line"),
      batteryDcLine: $(".battery-dc-line"),
      dcHpsLine: $(".dc-hps-line"),
      hpsLoadLine: $(".hps-load-line"),
    };
  }

  _updateValues() {
    if (
      !this._hass ||
      !this._config ||
      !this._rendered
    ) {
      return;
    }

    const entities = this._config.entities;

    const gridPowerW = this._powerToWatts(
      this._number(entities.grid_power),
      this._config.power_units.grid
    );

    const batteryPowerW = this._powerToWatts(
      this._number(entities.battery_power),
      this._config.power_units.battery
    );

    const loadPowerW = this._powerToWatts(
      this._number(entities.load_power),
      this._config.power_units.load
    );

    const batterySoc =
      this._number(entities.battery_soc);

    const batteryVoltage =
      this._number(entities.battery_voltage);

    const batteryCurrent =
      this._number(entities.battery_current);

    const batteryTemperature =
      this._number(entities.battery_temperature);

    const dailyGridKwh = this._energyToKwh(
      this._number(entities.grid_daily_energy),
      this._config.energy_units.grid_daily
    );

    const dailyChargeKwh = this._energyToKwh(
      this._number(entities.battery_daily_charge),
      this._config.energy_units.battery_charge
    );

    const dailyDischargeKwh = this._energyToKwh(
      this._number(entities.battery_daily_discharge),
      this._config.energy_units.battery_discharge
    );

    const dailyLoadKwh = this._energyToKwh(
      this._number(entities.load_daily_energy),
      this._config.energy_units.load_daily
    );

    const deadband =
      Number(this._config.deadband_w) || 100;

    const gridActive =
      Math.abs(gridPowerW) > deadband;

    const loadActive =
      Math.abs(loadPowerW) > deadband;

    const positiveMeansDischarge =
      this._config.battery_positive_means ===
      "discharging";

    const batteryCharging =
      positiveMeansDischarge
        ? batteryPowerW < -deadband
        : batteryPowerW > deadband;

    const batteryDischarging =
      positiveMeansDischarge
        ? batteryPowerW > deadband
        : batteryPowerW < -deadband;

    this._setText(
      this._elements.gridPower,
      this._formatPower(gridPowerW)
    );

    this._setText(
      this._elements.rectifierPower,
      this._formatPower(gridPowerW)
    );

    this._setText(
      this._elements.gridDaily,
      `Today: ${this._formatEnergy(dailyGridKwh)}`
    );

    this._setText(
      this._elements.dcVoltage,
      `${batteryVoltage.toFixed(1)} V`
    );

    this._setText(
      this._elements.dcCurrent,
      `${Math.abs(batteryCurrent).toFixed(1)} A`
    );

    this._setText(
      this._elements.batterySoc,
      `${batterySoc.toFixed(0)}%`
    );

    this._setText(
      this._elements.batteryPower,
      this._formatPower(batteryPowerW)
    );

    this._setText(
      this._elements.batteryVoltage,
      `${batteryVoltage.toFixed(1)} V`
    );

    this._setText(
      this._elements.batteryCurrent,
      `${batteryCurrent.toFixed(1)} A`
    );

    this._setText(
      this._elements.batteryTemperature,
      `${batteryTemperature.toFixed(1)} °C`
    );

    this._setText(
      this._elements.inverterPower,
      this._formatPower(loadPowerW)
    );

    this._setText(
      this._elements.loadPower,
      this._formatPower(loadPowerW)
    );

    this._setText(
      this._elements.loadDaily,
      `Today: ${this._formatEnergy(dailyLoadKwh)}`
    );

    this._setText(
      this._elements.voltageL1,
      `${this._number(
        entities.voltage_l1
      ).toFixed(1)} V`
    );

    this._setText(
      this._elements.voltageL2,
      `${this._number(
        entities.voltage_l2
      ).toFixed(1)} V`
    );

    this._setText(
      this._elements.voltageL3,
      `${this._number(
        entities.voltage_l3
      ).toFixed(1)} V`
    );

    this._setText(
      this._elements.currentL1,
      `${this._number(
        entities.current_l1
      ).toFixed(1)} A`
    );

    this._setText(
      this._elements.currentL2,
      `${this._number(
        entities.current_l2
      ).toFixed(1)} A`
    );

    this._setText(
      this._elements.currentL3,
      `${this._number(
        entities.current_l3
      ).toFixed(1)} A`
    );

    this._setText(
      this._elements.summaryGrid,
      this._formatEnergy(dailyGridKwh)
    );

    this._setText(
      this._elements.summaryCharge,
      this._formatEnergy(dailyChargeKwh)
    );

    this._setText(
      this._elements.summaryDischarge,
      this._formatEnergy(dailyDischargeKwh)
    );

    this._setText(
      this._elements.summaryLoad,
      this._formatEnergy(dailyLoadKwh)
    );

    const systemActive =
      gridActive ||
      loadActive ||
      batteryCharging ||
      batteryDischarging;

    this._elements.statusDot.classList.toggle(
      "active",
      systemActive
    );

    let statusText = "System idle";

    if (gridActive) {
      statusText = "Rectifier active";
    } else if (batteryDischarging) {
      statusText = "Battery supplying";
    } else if (batteryCharging) {
      statusText = "Battery charging";
    } else if (loadActive) {
      statusText = "Load active";
    }

    this._setText(
      this._elements.statusText,
      statusText
    );

    this._setFlow(
      this._elements.gridRectifierLine,
      gridActive,
      "grid-flow",
      "forward",
      "grid-rectifier-line"
    );

    this._setFlow(
      this._elements.rectifierDcLine,
      gridActive,
      "grid-flow",
      "forward",
      "rectifier-dc-line"
    );

    this._setFlow(
      this._elements.dcHpsLine,
      loadActive,
      "load-flow",
      "downward",
      "dc-hps-line"
    );

    this._setFlow(
      this._elements.hpsLoadLine,
      loadActive,
      "load-flow",
      "forward",
      "hps-load-line"
    );

    this._elements.batteryDcLine.className =
      "flow-line horizontal battery-dc-line";

    if (batteryCharging) {
      this._elements.batteryDcLine.classList.add(
        "active",
        "charge-flow",
        "forward"
      );

      this._elements.batteryStatus.className =
        "battery-status status-charge";

      this._setText(
        this._elements.batteryStatus,
        "Charging"
      );
    } else if (batteryDischarging) {
      this._elements.batteryDcLine.classList.add(
        "active",
        "discharge-flow",
        "reverse"
      );

      this._elements.batteryStatus.className =
        "battery-status status-discharge";

      this._setText(
        this._elements.batteryStatus,
        "Discharging"
      );
    } else {
      this._elements.batteryStatus.className =
        "battery-status status-idle";

      this._setText(
        this._elements.batteryStatus,
        "Idle"
      );
    }
  }

  _setFlow(
    element,
    active,
    flowClass,
    directionClass,
    positionClass
  ) {
    if (!element) {
      return;
    }

    const orientation =
      element.classList.contains("vertical")
        ? "vertical"
        : "horizontal";

    element.className = [
      "flow-line",
      orientation,
      flowClass,
      positionClass,
    ]
      .filter(Boolean)
      .join(" ");

    if (active) {
      element.classList.add(
        "active",
        directionClass
      );
    }
  }

  _setText(element, value) {
    if (
      element &&
      element.textContent !== value
    ) {
      element.textContent = value;
    }
  }

  _number(entityId) {
    if (
      !entityId ||
      !this._hass?.states?.[entityId]
    ) {
      return 0;
    }

    const value = Number(
      this._hass.states[entityId].state
    );

    return Number.isFinite(value)
      ? value
      : 0;
  }

  _powerToWatts(value, unit) {
    switch (
      String(unit || "W").toLowerCase()
    ) {
      case "mw":
        return value * 1000000;

      case "kw":
        return value * 1000;

      default:
        return value;
    }
  }

  _energyToKwh(value, unit) {
    switch (
      String(unit || "kWh").toLowerCase()
    ) {
      case "wh":
        return value / 1000;

      case "mwh":
        return value * 1000;

      default:
        return value;
    }
  }

  _formatPower(valueWatts) {
    const value = Math.abs(valueWatts);

    if (value >= 1000000) {
      return `${(
        value / 1000000
      ).toFixed(2)} MW`;
    }

    if (value >= 1000) {
      return `${(
        value / 1000
      ).toFixed(1)} kW`;
    }

    return `${value.toFixed(0)} W`;
  }

  _formatEnergy(valueKwh) {
    const value = Math.abs(valueKwh);

    if (value >= 1000) {
      return `${(
        value / 1000
      ).toFixed(2)} MWh`;
    }

    return `${value.toFixed(1)} kWh`;
  }

  _withVersion(url, version) {
    if (!url) {
      return "";
    }

    return url.includes("?")
      ? `${url}&v=${encodeURIComponent(version)}`
      : `${url}?v=${encodeURIComponent(version)}`;
  }

  _summaryBlock(icon, label, valueClass) {
    return `
      <div class="summary-item">
        <ha-icon icon="${icon}"></ha-icon>

        <div class="summary-content">
          <span class="summary-label">
            ${label}
          </span>

          <span class="summary-value ${valueClass}">
            --
          </span>
        </div>
      </div>
    `;
  }

  _escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
}

if (!customElements.get("atess-power-flow-card")) {
  customElements.define(
    "atess-power-flow-card",
    AtessPowerFlowCard
  );
}

window.customCards =
  window.customCards || [];

if (
  !window.customCards.some(
    (card) =>
      card.type === "atess-power-flow-card"
  )
) {
  window.customCards.push({
    type: "atess-power-flow-card",
    name: "ATESS Power Flow Card",
    description:
      "Responsive ATESS power-flow dashboard with grid rectifier and battery.",
    preview: true,
  });
}

console.info(
  "%c ATESS POWER FLOW CARD %c v1.3.0 ",
  "color: white; background: #0084ad; font-weight: 700;",
  "color: #0084ad; background: white; font-weight: 700;"
);class AtessPowerFlowCard extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: "open" });

    this._config = null;
    this._hass = null;
    this._rendered = false;
    this._elements = {};
  }

  setConfig(config) {
    if (!config) {
      throw new Error(
        "ATESS Power Flow Card configuration is required."
      );
    }

    if (!config.entities) {
      throw new Error(
        "The entities section is required."
      );
    }

    this._config = {
      title: "ATESS Energy Flow",
      subtitle:
        "Grid rectifier · DC bus · Battery · HPS150",
      site_name: "LOAD",

      image_version: "1",

      images: {
        rectifier:
          "/local/atess-dashboard/rectifier.png",
        battery:
          "/local/atess-dashboard/battery-rack.png",
        inverter:
          "/local/atess-dashboard/hps150.png",
        load:
          "/local/atess-dashboard/alutip-logo.png",
      },

      power_units: {
        grid: "W",
        battery: "W",
        load: "kW",
      },

      energy_units: {
        grid_daily: "kWh",
        battery_charge: "kWh",
        battery_discharge: "kWh",
        load_daily: "kWh",
      },

      temperature_unit: "°C",

      /*
       * Set this to 0.01 when the power-factor entity
       * reports values such as 98 instead of 0.98.
       */
      power_factor_scale: 1,

      battery_positive_means: "discharging",
      deadband_w: 100,

      /*
       * Each option can be set to false in the card YAML.
       * Optional measurements are also hidden automatically
       * when their entity field is blank.
       */
      show: {
        subtitle: true,

        grid_daily_energy: true,

        battery_soc_gauge: true,
        battery_voltage: true,
        battery_current: true,
        battery_temperature: true,

        inverter_phase_voltages: true,
        inverter_phase_currents: true,
        inverter_ac_temperature: true,
        inverter_dc_temperature: true,
        inverter_ambient_temperature: true,

        load_power_factor: true,
        load_daily_energy: true,

        energy_summary: true,
        summary_grid_import: true,
        summary_battery_charge: true,
        summary_battery_discharge: true,
        summary_load: true,
      },

      ...config,

      images: {
        rectifier:
          "/local/atess-dashboard/rectifier.png",
        battery:
          "/local/atess-dashboard/battery-rack.png",
        inverter:
          "/local/atess-dashboard/hps150.png",
        load:
          "/local/atess-dashboard/alutip-logo.png",
        ...(config.images || {}),
      },

      power_units: {
        grid: "W",
        battery: "W",
        load: "kW",
        ...(config.power_units || {}),
      },

      energy_units: {
        grid_daily: "kWh",
        battery_charge: "kWh",
        battery_discharge: "kWh",
        load_daily: "kWh",
        ...(config.energy_units || {}),
      },

      show: {
        subtitle: true,

        grid_daily_energy: true,

        battery_soc_gauge: true,
        battery_voltage: true,
        battery_current: true,
        battery_temperature: true,

        inverter_phase_voltages: true,
        inverter_phase_currents: true,
        inverter_ac_temperature: true,
        inverter_dc_temperature: true,
        inverter_ambient_temperature: true,

        load_power_factor: true,
        load_daily_energy: true,

        energy_summary: true,
        summary_grid_import: true,
        summary_battery_charge: true,
        summary_battery_discharge: true,
        summary_load: true,

        ...(config.show || {}),
      },
    };

    this._renderCard();
  }

  set hass(hass) {
    this._hass = hass;

    if (!this._rendered && this._config) {
      this._renderCard();
    }

    if (this._rendered) {
      this._updateValues();
    }
  }

  getCardSize() {
    return 10;
  }

  static getStubConfig() {
    return {
      title: "ATESS Energy Flow",
      site_name: "Site load",

      entities: {
        grid_power: "",
        grid_daily_energy: "",

        battery_power: "",
        battery_soc: "",
        battery_voltage: "",
        battery_current: "",
        battery_temperature: "",
        battery_daily_charge: "",
        battery_daily_discharge: "",

        load_power: "",
        load_daily_energy: "",
        load_power_factor: "",

        voltage_l1: "",
        voltage_l2: "",
        voltage_l3: "",

        current_l1: "",
        current_l2: "",
        current_l3: "",

        inverter_ac_temperature: "",
        inverter_dc_temperature: "",
        inverter_ambient_temperature: "",
      },
    };
  }

  _renderCard() {
    if (!this._config) {
      return;
    }

    const imageVersion =
      this._config.image_version || "1";

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;

          --atess-card-background:
            var(
              --card-background-color,
              var(--ha-card-background, #ffffff)
            );

          --atess-primary-background:
            var(--primary-background-color, #f1f4f7);

          --atess-primary-text:
            var(--primary-text-color, #263238);

          --atess-secondary-text:
            var(--secondary-text-color, #71808a);

          --atess-divider:
            var(--divider-color, rgba(150, 165, 175, 0.35));

          --atess-accent:
            var(--primary-color, #0084ad);

          --atess-grid:
            var(--error-color, #e53935);

          --atess-success:
            var(--success-color, #43a047);

          --atess-warning:
            var(--warning-color, #f5a000);
        }

        ha-card {
          box-sizing: border-box;
          width: 100%;
          overflow: hidden;
          border-radius: 22px;
          color: var(--atess-primary-text);

          background:
            linear-gradient(
              145deg,
              var(--atess-card-background),
              var(--atess-primary-background)
            );

          box-shadow:
            var(
              --ha-card-box-shadow,
              0 12px 35px rgba(0, 0, 0, 0.14)
            );
        }

        .dashboard {
          container-type: inline-size;
          box-sizing: border-box;
          width: 100%;
          padding: 24px;
          font-family:
            var(--paper-font-body1_-_font-family);
        }

        .hidden {
          display: none !important;
        }

        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 20px;
        }

        .header-title-area {
          min-width: 0;
        }

        .title {
          overflow: hidden;
          color: var(--atess-primary-text);
          font-size: 25px;
          font-weight: 750;
          line-height: 1.2;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .subtitle {
          overflow: hidden;
          margin-top: 4px;
          color: var(--atess-secondary-text);
          font-size: 13px;
          line-height: 1.25;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .system-status {
          display: flex;
          flex: 0 0 auto;
          align-items: center;
          gap: 8px;
          padding: 8px 13px;
          border: 1px solid var(--atess-divider);
          border-radius: 20px;
          color: var(--atess-primary-text);
          background: var(--atess-card-background);
          font-size: 13px;
          font-weight: 700;
          white-space: nowrap;
        }

        .status-dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: var(--disabled-text-color, #9e9e9e);
        }

        .status-dot.active {
          background: var(--atess-success);
          box-shadow:
            0 0 8px
            color-mix(
              in srgb,
              var(--atess-success) 70%,
              transparent
            );
        }

        /*
         * Desktop:
         *
         * ESKOM → RECTIFIER → DC BUS ↔ BATTERY
         *                         ↓
         *                       HPS150 → LOAD
         */

        .flow-layout {
          display: grid;

          grid-template-columns:
            minmax(115px, 0.9fr)
            minmax(42px, 0.3fr)
            minmax(145px, 1.05fr)
            minmax(42px, 0.3fr)
            minmax(155px, 1.08fr)
            minmax(42px, 0.3fr)
            minmax(175px, 1.25fr);

          grid-template-rows:
            minmax(255px, auto)
            58px
            minmax(345px, auto);

          align-items: center;
          gap: 8px;
        }

        .equipment {
          position: relative;
          z-index: 2;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          min-width: 0;
          padding: 16px 12px;
          border: 1px solid var(--atess-divider);
          border-radius: 18px;
          color: var(--atess-primary-text);
          background: var(--atess-card-background);
          box-shadow:
            0 7px 18px rgba(45, 55, 65, 0.09);
          text-align: center;
          contain: layout paint;
        }

        .equipment-title {
          margin-bottom: 8px;
          color: var(--atess-primary-text);
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.55px;
        }

        .equipment-image,
        .load-logo {
          display: block;
          flex: 0 0 auto;
          max-width: 100%;
          opacity: 1;
          visibility: visible;
          object-fit: contain;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          image-rendering: auto;
          transition: none !important;
          animation: none !important;
          pointer-events: none;
          user-select: none;
          -webkit-user-select: none;
          -webkit-user-drag: none;
        }

        .grid-box {
          grid-column: 1;
          grid-row: 1;
        }

        .rectifier-box {
          grid-column: 3;
          grid-row: 1;
        }

        .dc-box {
          grid-column: 5;
          grid-row: 1;
        }

        .battery-box {
          grid-column: 7;
          grid-row: 1;
          padding-right: 65px;
        }

        .hps-box {
          grid-column: 5;
          grid-row: 3;
        }

        .load-box {
          grid-column: 7;
          grid-row: 3;
        }

        .grid-icon {
          --mdc-icon-size: 74px;
          margin: 6px 0 11px;
          color: var(--atess-grid);
        }

        .dc-icon {
          --mdc-icon-size: 68px;
          margin: 9px 0 14px;
          color: var(--atess-accent);
        }

        .rectifier-image {
          width: 135px;
          height: 95px;
          margin: 4px 0 10px;
          transform: translateZ(0);
        }

        .hps-image {
          width: 190px;
          height: 220px;
          margin: -12px 0 -3px;
          object-fit: contain;
          transform: scale(1.18) translateZ(0);
          transform-origin: center;
        }

        .battery-image {
          width: 135px;
          height: 155px;
          margin: 1px 0 5px;
          transform: translateZ(0);
        }

        .load-logo {
          width: 150px;
          max-height: 100px;
          margin-bottom: 10px;
          transform: translateZ(0);
        }

        .main-reading {
          color: var(--atess-primary-text);
          font-size: 19px;
          font-weight: 800;
          line-height: 1.2;
        }

        .load-reading {
          color: var(--atess-grid);
          font-size: 22px;
        }

        .minor-reading {
          margin-top: 7px;
          color: var(--atess-secondary-text);
          font-size: 16px;
          font-weight: 600;
          line-height: 1.25;
        }

        /*
         * Larger extra measurements.
         */

        .extra-data {
          color: var(--atess-secondary-text);
          font-size: 17px;
          font-weight: 650;
          line-height: 1.35;
        }

        .detail-label {
          color: var(--atess-secondary-text);
          font-size: 13px;
          font-weight: 600;
        }

        .detail-value {
          color: var(--atess-primary-text);
          font-size: 17px;
          font-weight: 750;
        }

        /*
         * Battery SOC gauge.
         */

        .soc-gauge {
          position: absolute;
          top: 48px;
          right: 13px;
          z-index: 4;
          width: 38px;
          height: 145px;
          overflow: hidden;
          border: 2px solid var(--atess-divider);
          border-radius: 20px;
          background: var(--atess-primary-background);
          box-shadow:
            inset 0 0 8px rgba(0, 0, 0, 0.08),
            0 4px 10px rgba(0, 0, 0, 0.12);
        }

        .soc-gauge-fill {
          position: absolute;
          right: 0;
          bottom: 0;
          left: 0;
          height: 0%;
          border-radius: 16px;
          background:
            linear-gradient(
              180deg,
              var(--soc-color-top, #55c878),
              var(--soc-color-bottom, #24964a)
            );

          transition:
            height 900ms cubic-bezier(0.22, 1, 0.36, 1),
            background 500ms ease;

          will-change: height;
        }

        .soc-gauge-fill::after {
          position: absolute;
          top: -8px;
          right: 0;
          left: 0;
          height: 16px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.28);
          content: "";
          animation: soc-shimmer 2.4s ease-in-out infinite;
        }

        .soc-gauge-value {
          position: absolute;
          top: 50%;
          right: 0;
          left: 0;
          z-index: 2;
          color: #ffffff;
          font-size: 11px;
          font-weight: 850;
          line-height: 1;
          text-align: center;
          text-shadow:
            0 1px 3px rgba(0, 0, 0, 0.65);
          transform: translateY(-50%);
        }

        .soc-gauge-label {
          position: absolute;
          right: 0;
          bottom: -23px;
          left: 0;
          color: var(--atess-secondary-text);
          font-size: 10px;
          font-weight: 750;
          text-align: center;
        }

        .soc-gauge.charging {
          animation:
            soc-breathe 2.2s ease-in-out infinite;
        }

        @keyframes soc-shimmer {
          0%,
          100% {
            opacity: 0.25;
            transform: translateY(0);
          }

          50% {
            opacity: 0.65;
            transform: translateY(5px);
          }
        }

        @keyframes soc-breathe {
          0%,
          100% {
            box-shadow:
              inset 0 0 8px rgba(0, 0, 0, 0.08),
              0 4px 10px rgba(0, 0, 0, 0.12);
          }

          50% {
            box-shadow:
              inset 0 0 8px rgba(0, 0, 0, 0.08),
              0 0 14px
              color-mix(
                in srgb,
                var(--atess-success) 55%,
                transparent
              );
          }
        }

        .battery-status {
          margin-top: 6px;
          font-size: 14px;
          font-weight: 750;
        }

        .status-charge {
          color: var(--atess-success);
        }

        .status-discharge {
          color: var(--atess-accent);
        }

        .status-idle {
          color: var(--atess-secondary-text);
        }

        .battery-details {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, auto));
          justify-content: center;
          gap: 5px 14px;
          margin-top: 9px;
        }

        .battery-detail {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        /*
         * Inverter measurements.
         */

        .phase-section {
          display: flex;
          flex-direction: column;
          gap: 6px;
          width: 100%;
          margin-top: 10px;
        }

        .phase-row {
          display: grid;
          grid-template-columns:
            repeat(3, minmax(0, 1fr));
          gap: 7px;
          width: 100%;
        }

        .phase-value {
          padding: 5px 3px;
          border: 1px solid var(--atess-divider);
          border-radius: 8px;
          color: var(--atess-primary-text);
          background: var(--atess-primary-background);
          font-size: 16px;
          font-weight: 750;
          line-height: 1.2;
        }

        .temperature-grid {
          display: grid;
          grid-template-columns:
            repeat(3, minmax(0, 1fr));
          gap: 7px;
          width: 100%;
          margin-top: 10px;
        }

        .temperature-item {
          min-width: 0;
          padding: 6px 3px;
          border: 1px solid var(--atess-divider);
          border-radius: 8px;
          background: var(--atess-primary-background);
        }

        .temperature-label {
          display: block;
          color: var(--atess-secondary-text);
          font-size: 11px;
          font-weight: 650;
        }

        .temperature-value {
          display: block;
          margin-top: 2px;
          color: var(--atess-primary-text);
          font-size: 16px;
          font-weight: 800;
          white-space: nowrap;
        }

        /*
         * Load details.
         */

        .load-details {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 7px;
          margin-top: 9px;
        }

        .power-factor {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 6px 10px;
          border: 1px solid var(--atess-divider);
          border-radius: 10px;
          background: var(--atess-primary-background);
        }

        .power-factor-label {
          color: var(--atess-secondary-text);
          font-size: 14px;
          font-weight: 650;
        }

        .power-factor-value {
          color: var(--atess-primary-text);
          font-size: 18px;
          font-weight: 850;
        }

        /*
         * Flow positions.
         */

        .grid-rectifier-line {
          grid-column: 2;
          grid-row: 1;
          align-self: center;
          width: 100%;
          height: 8px;
        }

        .rectifier-dc-line {
          grid-column: 4;
          grid-row: 1;
          align-self: center;
          width: 100%;
          height: 8px;
        }

        .battery-dc-line {
          grid-column: 6;
          grid-row: 1;
          align-self: center;
          width: 100%;
          height: 8px;
        }

        .dc-hps-line {
          grid-column: 5;
          grid-row: 2;
          align-self: stretch;
          justify-self: center;
          width: 8px;
          height: 100%;
        }

        .hps-load-line {
          grid-column: 6;
          grid-row: 3;
          align-self: center;
          width: 100%;
          height: 8px;
        }

        @keyframes flow-forward {
          from {
            background-position: 0 0;
          }

          to {
            background-position: 36px 0;
          }
        }

        @keyframes flow-reverse {
          from {
            background-position: 36px 0;
          }

          to {
            background-position: 0 0;
          }
        }

        @keyframes flow-down {
          from {
            background-position: 0 0;
          }

          to {
            background-position: 0 36px;
          }
        }

        @keyframes flow-up {
          from {
            background-position: 0 36px;
          }

          to {
            background-position: 0 0;
          }
        }

        .flow-line {
          position: relative;
          z-index: 1;
          overflow: hidden;
          border-radius: 10px;
          background: var(--atess-divider);
          will-change: background-position;
        }

        .flow-line.horizontal {
          height: 8px;
        }

        .flow-line.vertical {
          width: 8px;
        }

        .grid-flow.active {
          background-image:
            repeating-linear-gradient(
              90deg,
              var(--atess-grid) 0,
              var(--atess-grid) 15px,
              transparent 15px,
              transparent 29px
            );

          background-size: 36px 8px;
        }

        .grid-flow.vertical.active {
          background-image:
            repeating-linear-gradient(
              180deg,
              var(--atess-grid) 0,
              var(--atess-grid) 15px,
              transparent 15px,
              transparent 29px
            );

          background-size: 8px 36px;
        }

        .load-flow.active {
          background-image:
            repeating-linear-gradient(
              90deg,
              var(--atess-grid) 0,
              var(--atess-grid) 15px,
              transparent 15px,
              transparent 29px
            );

          background-size: 36px 8px;
        }

        .load-flow.vertical.active {
          background-image:
            repeating-linear-gradient(
              180deg,
              var(--atess-grid) 0,
              var(--atess-grid) 15px,
              transparent 15px,
              transparent 29px
            );

          background-size: 8px 36px;
        }

        .charge-flow.active {
          background-image:
            repeating-linear-gradient(
              90deg,
              var(--atess-success) 0,
              var(--atess-success) 15px,
              transparent 15px,
              transparent 29px
            );

          background-size: 36px 8px;
        }

        .discharge-flow.active {
          background-image:
            repeating-linear-gradient(
              90deg,
              var(--atess-accent) 0,
              var(--atess-accent) 15px,
              transparent 15px,
              transparent 29px
            );

          background-size: 36px 8px;
        }

        .forward {
          animation:
            flow-forward 1.8s linear infinite;
        }

        .reverse {
          animation:
            flow-reverse 1.8s linear infinite;
        }

        .downward {
          animation:
            flow-down 1.8s linear infinite;
        }

        .upward {
          animation:
            flow-up 1.8s linear infinite;
        }

        /*
         * Energy summary.
         */

        .energy-summary {
          display: grid;
          grid-template-columns:
            repeat(4, minmax(0, 1fr));
          gap: 10px;
          margin-top: 20px;
        }

        .summary-item {
          box-sizing: border-box;
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
          min-height: 72px;
          padding: 11px 13px;
          border: 1px solid var(--atess-divider);
          border-radius: 14px;
          color: var(--atess-primary-text);
          background: var(--atess-card-background);
        }

        .summary-item ha-icon {
          --mdc-icon-size: 27px;
          flex: 0 0 auto;
          color: var(--atess-accent);
        }

        .summary-content {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .summary-label {
          color: var(--atess-secondary-text);
          font-size: 13px;
          font-weight: 600;
          line-height: 1.15;
          white-space: normal;
        }

        .summary-value {
          overflow: hidden;
          margin-top: 4px;
          color: var(--atess-primary-text);
          font-size: 17px;
          font-weight: 850;
          line-height: 1.2;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        /*
         * Tablet/narrow layout.
         */

        @container (max-width: 760px) {
          .dashboard {
            padding: 14px;
          }

          .header {
            align-items: flex-start;
            margin-bottom: 14px;
          }

          .title {
            font-size: 20px;
          }

          .subtitle {
            font-size: 11px;
          }

          .system-status {
            padding: 6px 9px;
            font-size: 10px;
          }

          .flow-layout {
            grid-template-columns:
              minmax(0, 1fr)
              34px
              minmax(0, 1fr);

            grid-template-rows:
              minmax(225px, auto)
              42px
              minmax(260px, auto)
              42px
              minmax(390px, auto);

            gap: 5px;
          }

          .rectifier-box {
            grid-column: 1;
            grid-row: 1;
          }

          .grid-rectifier-line {
            grid-column: 2;
            grid-row: 1;
            align-self: center;
            width: 100%;
            height: 8px;
          }

          .grid-box {
            grid-column: 3;
            grid-row: 1;
          }

          /*
           * Desktop orientation is horizontal.
           * This selector forces the connection vertical.
           */

          .flow-line.horizontal.rectifier-dc-line {
            grid-column: 1;
            grid-row: 2;
            align-self: stretch;
            justify-self: center;
            width: 8px !important;
            height: 100% !important;
            min-height: 42px;
          }

          .flow-line.horizontal.rectifier-dc-line.active {
            background-image:
              repeating-linear-gradient(
                180deg,
                var(--atess-grid) 0,
                var(--atess-grid) 15px,
                transparent 15px,
                transparent 29px
              ) !important;

            background-size:
              8px 36px !important;

            animation:
              flow-down 1.8s linear infinite !important;
          }

          .dc-box {
            grid-column: 1;
            grid-row: 3;
          }

          .battery-dc-line {
            grid-column: 2;
            grid-row: 3;
            align-self: center;
            width: 100%;
            height: 8px;
          }

          .battery-box {
            grid-column: 3;
            grid-row: 3;
            padding-right: 52px;
          }

          .dc-hps-line {
            grid-column: 1;
            grid-row: 4;
            align-self: stretch;
            justify-self: center;
            width: 8px;
            height: 100%;
          }

          .hps-box {
            grid-column: 1;
            grid-row: 5;
          }

          .hps-load-line {
            grid-column: 2;
            grid-row: 5;
            align-self: center;
            width: 100%;
            height: 8px;
          }

          .load-box {
            grid-column: 3;
            grid-row: 5;
          }

          .grid-rectifier-line.forward {
            animation-name: flow-reverse;
          }

          .rectifier-image {
            width: 105px;
            height: 76px;
          }

          .hps-image {
            width: 145px;
            height: 190px;
            margin: -10px 0 -3px;
            transform:
              scale(1.16) translateZ(0);
          }

          .battery-image {
            width: 100px;
            height: 130px;
          }

          .load-logo {
            width: 120px;
            max-height: 80px;
          }

          .soc-gauge {
            top: 44px;
            right: 9px;
            width: 31px;
            height: 125px;
          }

          .soc-gauge-value {
            font-size: 9px;
          }

          .extra-data {
            font-size: 14px;
          }

          .detail-label {
            font-size: 11px;
          }

          .detail-value {
            font-size: 14px;
          }

          .phase-value {
            font-size: 13px;
          }

          .temperature-label {
            font-size: 9px;
          }

          .temperature-value {
            font-size: 13px;
          }

          .power-factor-label {
            font-size: 12px;
          }

          .power-factor-value {
            font-size: 15px;
          }

          .energy-summary {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
            gap: 8px;
            margin-top: 14px;
          }
        }

        /*
         * Phone layout.
         */

        @container (max-width: 520px) {
          .dashboard {
            padding: 9px;
          }

          .header {
            gap: 6px;
            margin-bottom: 10px;
          }

          .title {
            font-size: 17px;
          }

          .subtitle {
            display: none;
          }

          .system-status {
            gap: 5px;
            padding: 4px 7px;
            font-size: 8px;
          }

          .status-dot {
            width: 7px;
            height: 7px;
          }

          .flow-layout {
            grid-template-columns:
              minmax(0, 1fr)
              18px
              minmax(0, 1fr);

            grid-template-rows:
              170px
              24px
              205px
              24px
              320px;

            gap: 3px;
          }

          .equipment {
            padding: 7px 4px;
            border-radius: 12px;
          }

          .equipment-title {
            margin-bottom: 4px;
            font-size: 9px;
            letter-spacing: 0.2px;
          }

          .main-reading {
            font-size: 14px;
          }

          .load-reading {
            font-size: 17px;
          }

          .minor-reading {
            margin-top: 4px;
            font-size: 11px;
          }

          .grid-icon {
            --mdc-icon-size: 40px;
            margin: 2px 0 5px;
          }

          .dc-icon {
            --mdc-icon-size: 38px;
            margin: 3px 0 6px;
          }

          .rectifier-image {
            width: 66px;
            height: 47px;
            margin: 1px 0 5px;
          }

          .battery-box {
            padding-right: 42px;
          }

          .battery-image {
            width: 64px;
            height: 88px;
          }

          .hps-image {
            width: 105px;
            height: 140px;
            margin: -8px 0 -1px;
            transform:
              scale(1.18) translateZ(0);
          }

          .load-logo {
            width: 75px;
            max-height: 50px;
          }

          .soc-gauge {
            top: 35px;
            right: 5px;
            width: 27px;
            height: 105px;
            border-width: 1px;
          }

          .soc-gauge-value {
            font-size: 8px;
          }

          .soc-gauge-label {
            bottom: -18px;
            font-size: 7px;
          }

          .battery-status {
            margin-top: 3px;
            font-size: 10px;
          }

          .battery-details {
            grid-template-columns: 1fr;
            gap: 3px;
            margin-top: 5px;
          }

          .detail-label {
            font-size: 8px;
          }

          .detail-value {
            font-size: 11px;
          }

          .phase-section {
            gap: 4px;
            margin-top: 6px;
          }

          .phase-row {
            gap: 3px;
          }

          .phase-value {
            padding: 4px 1px;
            border-radius: 6px;
            font-size: 10px;
          }

          .temperature-grid {
            grid-template-columns: 1fr;
            gap: 4px;
            margin-top: 6px;
          }

          .temperature-item {
            padding: 4px 3px;
          }

          .temperature-label {
            font-size: 8px;
          }

          .temperature-value {
            font-size: 11px;
          }

          .power-factor {
            gap: 4px;
            padding: 4px 6px;
          }

          .power-factor-label {
            font-size: 9px;
          }

          .power-factor-value {
            font-size: 12px;
          }

          .flow-line.horizontal {
            height: 6px;
          }

          .flow-line.vertical,
          .dc-hps-line {
            width: 6px;
          }

          .flow-line.horizontal.rectifier-dc-line {
            width: 6px !important;
            height: 100% !important;
            min-height: 24px;
          }

          .flow-line.horizontal.rectifier-dc-line.active {
            background-size:
              6px 36px !important;
          }

          .energy-summary {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
            gap: 5px;
            margin-top: 9px;
          }

          .summary-item {
            gap: 6px;
            min-height: 57px;
            padding: 7px;
            border-radius: 10px;
          }

          .summary-item ha-icon {
            --mdc-icon-size: 20px;
          }

          .summary-label {
            font-size: 9px;
          }

          .summary-value {
            font-size: 12px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .flow-line,
          .soc-gauge,
          .soc-gauge-fill::after {
            animation: none !important;
          }

          .soc-gauge-fill {
            transition: none !important;
          }
        }
      </style>

      <ha-card>
        <div class="dashboard">

          <div class="header">
            <div class="header-title-area">
              <div class="title"></div>
              <div class="subtitle"></div>
            </div>

            <div class="system-status">
              <span class="status-dot"></span>
              <span class="status-text">
                System idle
              </span>
            </div>
          </div>

          <div class="flow-layout">

            <!-- ESKOM -->

            <div class="equipment grid-box">
              <div class="equipment-title">
                ESKOM
              </div>

              <ha-icon
                class="grid-icon"
                icon="mdi:transmission-tower">
              </ha-icon>

              <div class="main-reading grid-power">
                --
              </div>

              <div class="minor-reading grid-daily">
                Today: --
              </div>
            </div>

            <!-- GRID TO RECTIFIER -->

            <div
              class="
                flow-line
                horizontal
                grid-flow
                grid-rectifier-line
              ">
            </div>

            <!-- RECTIFIER -->

            <div class="equipment rectifier-box">
              <div class="equipment-title">
                RECTIFIER
              </div>

              <img
                class="
                  equipment-image
                  rectifier-image
                "
                src="${this._withVersion(
                  this._config.images.rectifier,
                  imageVersion
                )}"
                alt="Grid rectifier"
                loading="eager"
                decoding="sync"
                fetchpriority="high"
                draggable="false">

              <div class="main-reading rectifier-power">
                --
              </div>

              <div class="minor-reading">
                AC grid → DC bus
              </div>
            </div>

            <!-- RECTIFIER TO DC BUS -->

            <div
              class="
                flow-line
                horizontal
                grid-flow
                rectifier-dc-line
              ">
            </div>

            <!-- DC BUS -->

            <div class="equipment dc-box">
              <div class="equipment-title">
                DC BUS
              </div>

              <ha-icon
                class="dc-icon"
                icon="mdi:current-dc">
              </ha-icon>

              <div class="main-reading dc-voltage">
                --
              </div>

              <div class="extra-data dc-current">
                --
              </div>
            </div>

            <!-- BATTERY FLOW -->

            <div
              class="
                flow-line
                horizontal
                battery-dc-line
              ">
            </div>

            <!-- BATTERY -->

            <div class="equipment battery-box">
              <div class="equipment-title">
                BATTERY
              </div>

              <img
                class="
                  equipment-image
                  battery-image
                "
                src="${this._withVersion(
                  this._config.images.battery,
                  imageVersion
                )}"
                alt="Battery rack"
                loading="eager"
                decoding="sync"
                fetchpriority="high"
                draggable="false">

              <div class="soc-gauge">
                <div class="soc-gauge-fill"></div>

                <div class="soc-gauge-value">
                  --%
                </div>

                <div class="soc-gauge-label">
                  SOC
                </div>
              </div>

              <div class="main-reading battery-power">
                --
              </div>

              <div class="battery-status status-idle">
                Idle
              </div>

              <div class="battery-details">

                <div class="battery-detail battery-voltage-item">
                  <span class="detail-label">
                    Voltage
                  </span>

                  <span class="detail-value battery-voltage">
                    --
                  </span>
                </div>

                <div class="battery-detail battery-current-item">
                  <span class="detail-label">
                    Current
                  </span>

                  <span class="detail-value battery-current">
                    --
                  </span>
                </div>

                <div class="battery-detail battery-temperature-item">
                  <span class="detail-label">
                    Temperature
                  </span>

                  <span class="detail-value battery-temperature">
                    --
                  </span>
                </div>

              </div>
            </div>

            <!-- DC BUS TO HPS -->

            <div
              class="
                flow-line
                vertical
                load-flow
                dc-hps-line
              ">
            </div>

            <!-- ATESS HPS -->

            <div class="equipment hps-box">
              <div class="equipment-title">
                ATESS HPS150
              </div>

              <img
                class="
                  equipment-image
                  hps-image
                "
                src="${this._withVersion(
                  this._config.images.inverter,
                  imageVersion
                )}"
                alt="ATESS HPS150"
                loading="eager"
                decoding="sync"
                fetchpriority="high"
                draggable="false">

              <div class="main-reading inverter-power">
                --
              </div>

              <div class="phase-section">

                <div class="phase-row phase-voltage-row">
                  <span class="phase-value voltage-l1">
                    --
                  </span>

                  <span class="phase-value voltage-l2">
                    --
                  </span>

                  <span class="phase-value voltage-l3">
                    --
                  </span>
                </div>

                <div class="phase-row phase-current-row">
                  <span class="phase-value current-l1">
                    --
                  </span>

                  <span class="phase-value current-l2">
                    --
                  </span>

                  <span class="phase-value current-l3">
                    --
                  </span>
                </div>

              </div>

              <div class="temperature-grid">

                <div class="temperature-item ac-temperature-item">
                  <span class="temperature-label">
                    AC Temp
                  </span>

                  <span class="temperature-value ac-temperature">
                    --
                  </span>
                </div>

                <div class="temperature-item dc-temperature-item">
                  <span class="temperature-label">
                    DC Temp
                  </span>

                  <span class="temperature-value dc-temperature">
                    --
                  </span>
                </div>

                <div class="temperature-item ambient-temperature-item">
                  <span class="temperature-label">
                    Ambient
                  </span>

                  <span class="temperature-value ambient-temperature">
                    --
                  </span>
                </div>

              </div>
            </div>

            <!-- HPS TO LOAD -->

            <div
              class="
                flow-line
                horizontal
                load-flow
                hps-load-line
              ">
            </div>

            <!-- LOAD -->

            <div class="equipment load-box">
              <img
                class="load-logo"
                src="${this._withVersion(
                  this._config.images.load,
                  imageVersion
                )}"
                alt="${this._escapeHtml(
                  this._config.site_name
                )}"
                loading="eager"
                decoding="sync"
                fetchpriority="high"
                draggable="false">

              <div class="equipment-title load-title">
              </div>

              <div class="main-reading load-reading load-power">
                --
              </div>

              <div class="load-details">

                <div class="power-factor">
                  <span class="power-factor-label">
                    Power factor
                  </span>

                  <span class="power-factor-value">
                    --
                  </span>
                </div>

                <div class="minor-reading load-daily">
                  Today: --
                </div>

              </div>
            </div>

          </div>

          <!-- ENERGY SUMMARY -->

          <div class="energy-summary">

            ${this._summaryBlock(
              "mdi:transmission-tower-import",
              "Grid import",
              "summary-grid",
              "summary-grid-item"
            )}

            ${this._summaryBlock(
              "mdi:battery-arrow-down",
              "Battery charged",
              "summary-charge",
              "summary-charge-item"
            )}

            ${this._summaryBlock(
              "mdi:battery-arrow-up",
              "Battery discharged",
              "summary-discharge",
              "summary-discharge-item"
            )}

            ${this._summaryBlock(
              "mdi:factory",
              "Load energy",
              "summary-load",
              "summary-load-item"
            )}

          </div>
        </div>
      </ha-card>
    `;

    this._cacheElements();

    this._elements.title.textContent =
      this._config.title;

    this._elements.subtitle.textContent =
      this._config.subtitle;

    this._elements.loadTitle.textContent =
      this._config.site_name;

    this._rendered = true;

    if (this._hass) {
      this._updateValues();
    }
  }

  _cacheElements() {
    const $ = (selector) =>
      this.shadowRoot.querySelector(selector);

    this._elements = {
      title: $(".title"),
      subtitle: $(".subtitle"),
      loadTitle: $(".load-title"),

      statusDot: $(".status-dot"),
      statusText: $(".status-text"),

      gridPower: $(".grid-power"),
      gridDaily: $(".grid-daily"),
      rectifierPower: $(".rectifier-power"),

      dcVoltage: $(".dc-voltage"),
      dcCurrent: $(".dc-current"),

      batteryPower: $(".battery-power"),
      batteryStatus: $(".battery-status"),
      batteryVoltage: $(".battery-voltage"),
      batteryCurrent: $(".battery-current"),
      batteryTemperature:
        $(".battery-temperature"),

      batteryVoltageItem:
        $(".battery-voltage-item"),

      batteryCurrentItem:
        $(".battery-current-item"),

      batteryTemperatureItem:
        $(".battery-temperature-item"),

      socGauge: $(".soc-gauge"),
      socGaugeFill: $(".soc-gauge-fill"),
      socGaugeValue: $(".soc-gauge-value"),

      inverterPower: $(".inverter-power"),

      voltageL1: $(".voltage-l1"),
      voltageL2: $(".voltage-l2"),
      voltageL3: $(".voltage-l3"),

      currentL1: $(".current-l1"),
      currentL2: $(".current-l2"),
      currentL3: $(".current-l3"),

      phaseVoltageRow:
        $(".phase-voltage-row"),

      phaseCurrentRow:
        $(".phase-current-row"),

      acTemperature:
        $(".ac-temperature"),

      dcTemperature:
        $(".dc-temperature"),

      ambientTemperature:
        $(".ambient-temperature"),

      acTemperatureItem:
        $(".ac-temperature-item"),

      dcTemperatureItem:
        $(".dc-temperature-item"),

      ambientTemperatureItem:
        $(".ambient-temperature-item"),

      temperatureGrid:
        $(".temperature-grid"),

      loadPower: $(".load-power"),
      loadDaily: $(".load-daily"),

      powerFactor:
        $(".power-factor"),

      powerFactorValue:
        $(".power-factor-value"),

      energySummary:
        $(".energy-summary"),

      summaryGridItem:
        $(".summary-grid-item"),

      summaryChargeItem:
        $(".summary-charge-item"),

      summaryDischargeItem:
        $(".summary-discharge-item"),

      summaryLoadItem:
        $(".summary-load-item"),

      summaryGrid:
        $(".summary-grid"),

      summaryCharge:
        $(".summary-charge"),

      summaryDischarge:
        $(".summary-discharge"),

      summaryLoad:
        $(".summary-load"),

      gridRectifierLine:
        $(".grid-rectifier-line"),

      rectifierDcLine:
        $(".rectifier-dc-line"),

      batteryDcLine:
        $(".battery-dc-line"),

      dcHpsLine:
        $(".dc-hps-line"),

      hpsLoadLine:
        $(".hps-load-line"),
    };
  }

  _updateValues() {
    if (
      !this._hass ||
      !this._config ||
      !this._rendered
    ) {
      return;
    }

    const entities =
      this._config.entities;

    const gridPowerW =
      this._powerToWatts(
        this._number(
          entities.grid_power
        ),
        this._config.power_units.grid
      );

    const batteryPowerW =
      this._powerToWatts(
        this._number(
          entities.battery_power
        ),
        this._config.power_units.battery
      );

    const loadPowerW =
      this._powerToWatts(
        this._number(
          entities.load_power
        ),
        this._config.power_units.load
      );

    const batterySoc =
      this._clamp(
        this._number(
          entities.battery_soc
        ),
        0,
        100
      );

    const batteryVoltage =
      this._number(
        entities.battery_voltage
      );

    const batteryCurrent =
      this._number(
        entities.battery_current
      );

    const batteryTemperature =
      this._number(
        entities.battery_temperature
      );

    const acTemperature =
      this._number(
        entities.inverter_ac_temperature
      );

    const dcTemperature =
      this._number(
        entities.inverter_dc_temperature
      );

    const ambientTemperature =
      this._number(
        entities.inverter_ambient_temperature
      );

    const powerFactor =
      this._number(
        entities.load_power_factor
      ) *
      Number(
        this._config.power_factor_scale || 1
      );

    const dailyGridKwh =
      this._energyToKwh(
        this._number(
          entities.grid_daily_energy
        ),
        this._config
          .energy_units
          .grid_daily
      );

    const dailyChargeKwh =
      this._energyToKwh(
        this._number(
          entities.battery_daily_charge
        ),
        this._config
          .energy_units
          .battery_charge
      );

    const dailyDischargeKwh =
      this._energyToKwh(
        this._number(
          entities.battery_daily_discharge
        ),
        this._config
          .energy_units
          .battery_discharge
      );

    const dailyLoadKwh =
      this._energyToKwh(
        this._number(
          entities.load_daily_energy
        ),
        this._config
          .energy_units
          .load_daily
      );

    const deadband =
      Number(
        this._config.deadband_w
      ) || 100;

    const gridActive =
      Math.abs(gridPowerW) >
      deadband;

    const loadActive =
      Math.abs(loadPowerW) >
      deadband;

    const positiveMeansDischarge =
      this._config
        .battery_positive_means ===
      "discharging";

    const batteryCharging =
      positiveMeansDischarge
        ? batteryPowerW < -deadband
        : batteryPowerW > deadband;

    const batteryDischarging =
      positiveMeansDischarge
        ? batteryPowerW > deadband
        : batteryPowerW < -deadband;

    /*
     * Main readings.
     */

    this._setText(
      this._elements.gridPower,
      this._formatPower(gridPowerW)
    );

    this._setText(
      this._elements.rectifierPower,
      this._formatPower(gridPowerW)
    );

    this._setText(
      this._elements.gridDaily,
      `Today: ${this._formatEnergy(
        dailyGridKwh
      )}`
    );

    this._setText(
      this._elements.dcVoltage,
      `${batteryVoltage.toFixed(1)} V`
    );

    this._setText(
      this._elements.dcCurrent,
      `${Math.abs(
        batteryCurrent
      ).toFixed(1)} A`
    );

    this._setText(
      this._elements.batteryPower,
      this._formatPower(
        batteryPowerW
      )
    );

    this._setText(
      this._elements.batteryVoltage,
      `${batteryVoltage.toFixed(1)} V`
    );

    this._setText(
      this._elements.batteryCurrent,
      `${batteryCurrent.toFixed(1)} A`
    );

    this._setText(
      this._elements.batteryTemperature,
      this._formatTemperature(
        batteryTemperature
      )
    );

    this._setText(
      this._elements.inverterPower,
      this._formatPower(loadPowerW)
    );

    this._setText(
      this._elements.loadPower,
      this._formatPower(loadPowerW)
    );

    this._setText(
      this._elements.loadDaily,
      `Today: ${this._formatEnergy(
        dailyLoadKwh
      )}`
    );

    /*
     * Phase voltages.
     */

    this._setText(
      this._elements.voltageL1,
      `${this._number(
        entities.voltage_l1
      ).toFixed(1)} V`
    );

    this._setText(
      this._elements.voltageL2,
      `${this._number(
        entities.voltage_l2
      ).toFixed(1)} V`
    );

    this._setText(
      this._elements.voltageL3,
      `${this._number(
        entities.voltage_l3
      ).toFixed(1)} V`
    );

    /*
     * Phase currents.
     */

    this._setText(
      this._elements.currentL1,
      `${this._number(
        entities.current_l1
      ).toFixed(1)} A`
    );

    this._setText(
      this._elements.currentL2,
      `${this._number(
        entities.current_l2
      ).toFixed(1)} A`
    );

    this._setText(
      this._elements.currentL3,
      `${this._number(
        entities.current_l3
      ).toFixed(1)} A`
    );

    /*
     * Inverter temperatures.
     */

    this._setText(
      this._elements.acTemperature,
      this._formatTemperature(
        acTemperature
      )
    );

    this._setText(
      this._elements.dcTemperature,
      this._formatTemperature(
        dcTemperature
      )
    );

    this._setText(
      this._elements.ambientTemperature,
      this._formatTemperature(
        ambientTemperature
      )
    );

    /*
     * Power factor.
     */

    this._setText(
      this._elements.powerFactorValue,
      this._formatPowerFactor(
        powerFactor
      )
    );

    /*
     * Battery SOC gauge.
     */

    this._setText(
      this._elements.socGaugeValue,
      `${batterySoc.toFixed(0)}%`
    );

    this._elements
      .socGaugeFill
      .style
      .height =
      `${batterySoc}%`;

    this._updateSocColour(
      batterySoc
    );

    this._elements
      .socGauge
      .classList
      .toggle(
        "charging",
        batteryCharging
      );

    /*
     * Summary values.
     */

    this._setText(
      this._elements.summaryGrid,
      this._formatEnergy(
        dailyGridKwh
      )
    );

    this._setText(
      this._elements.summaryCharge,
      this._formatEnergy(
        dailyChargeKwh
      )
    );

    this._setText(
      this._elements.summaryDischarge,
      this._formatEnergy(
        dailyDischargeKwh
      )
    );

    this._setText(
      this._elements.summaryLoad,
      this._formatEnergy(
        dailyLoadKwh
      )
    );

    /*
     * Optional measurement visibility.
     */

    this._setVisible(
      this._elements.subtitle,
      this._config.show.subtitle !== false
    );

    this._setVisible(
      this._elements.gridDaily,
      this._isEnabled(
        "grid_daily_energy",
        entities.grid_daily_energy
      )
    );

    this._setVisible(
      this._elements.socGauge,
      this._isEnabled(
        "battery_soc_gauge",
        entities.battery_soc
      )
    );

    this._setVisible(
      this._elements.batteryVoltageItem,
      this._isEnabled(
        "battery_voltage",
        entities.battery_voltage
      )
    );

    this._setVisible(
      this._elements.batteryCurrentItem,
      this._isEnabled(
        "battery_current",
        entities.battery_current
      )
    );

    this._setVisible(
      this._elements.batteryTemperatureItem,
      this._isEnabled(
        "battery_temperature",
        entities.battery_temperature
      )
    );

    this._setVisible(
      this._elements.phaseVoltageRow,
      this._config
        .show
        .inverter_phase_voltages !== false &&
      Boolean(
        entities.voltage_l1 ||
        entities.voltage_l2 ||
        entities.voltage_l3
      )
    );

    this._setVisible(
      this._elements.phaseCurrentRow,
      this._config
        .show
        .inverter_phase_currents !== false &&
      Boolean(
        entities.current_l1 ||
        entities.current_l2 ||
        entities.current_l3
      )
    );

    this._setVisible(
      this._elements.acTemperatureItem,
      this._isEnabled(
        "inverter_ac_temperature",
        entities.inverter_ac_temperature
      )
    );

    this._setVisible(
      this._elements.dcTemperatureItem,
      this._isEnabled(
        "inverter_dc_temperature",
        entities.inverter_dc_temperature
      )
    );

    this._setVisible(
      this._elements.ambientTemperatureItem,
      this._isEnabled(
        "inverter_ambient_temperature",
        entities.inverter_ambient_temperature
      )
    );

    const anyTemperatureVisible =
      this._isVisible(
        this._elements.acTemperatureItem
      ) ||
      this._isVisible(
        this._elements.dcTemperatureItem
      ) ||
      this._isVisible(
        this._elements.ambientTemperatureItem
      );

    this._setVisible(
      this._elements.temperatureGrid,
      anyTemperatureVisible
    );

    this._setVisible(
      this._elements.powerFactor,
      this._isEnabled(
        "load_power_factor",
        entities.load_power_factor
      )
    );

    this._setVisible(
      this._elements.loadDaily,
      this._isEnabled(
        "load_daily_energy",
        entities.load_daily_energy
      )
    );

    this._setVisible(
      this._elements.energySummary,
      this._config
        .show
        .energy_summary !== false
    );

    this._setVisible(
      this._elements.summaryGridItem,
      this._isEnabled(
        "summary_grid_import",
        entities.grid_daily_energy
      )
    );

    this._setVisible(
      this._elements.summaryChargeItem,
      this._isEnabled(
        "summary_battery_charge",
        entities.battery_daily_charge
      )
    );

    this._setVisible(
      this._elements.summaryDischargeItem,
      this._isEnabled(
        "summary_battery_discharge",
        entities.battery_daily_discharge
      )
    );

    this._setVisible(
      this._elements.summaryLoadItem,
      this._isEnabled(
        "summary_load",
        entities.load_daily_energy
      )
    );

    /*
     * Header status.
     */

    const systemActive =
      gridActive ||
      loadActive ||
      batteryCharging ||
      batteryDischarging;

    this._elements
      .statusDot
      .classList
      .toggle(
        "active",
        systemActive
      );

    let statusText =
      "System idle";

    if (gridActive) {
      statusText =
        "Rectifier active";
    } else if (batteryDischarging) {
      statusText =
        "Battery supplying";
    } else if (batteryCharging) {
      statusText =
        "Battery charging";
    } else if (loadActive) {
      statusText =
        "Load active";
    }

    this._setText(
      this._elements.statusText,
      statusText
    );

    /*
     * Flow lines.
     */

    this._setFlow(
      this._elements.gridRectifierLine,
      gridActive,
      "grid-flow",
      "forward",
      "grid-rectifier-line"
    );

    this._setFlow(
      this._elements.rectifierDcLine,
      gridActive,
      "grid-flow",
      "forward",
      "rectifier-dc-line"
    );

    this._setFlow(
      this._elements.dcHpsLine,
      loadActive,
      "load-flow",
      "downward",
      "dc-hps-line"
    );

    this._setFlow(
      this._elements.hpsLoadLine,
      loadActive,
      "load-flow",
      "forward",
      "hps-load-line"
    );

    /*
     * Battery flow:
     *
     * Negative battery power = charging.
     * Positive battery power = discharging.
     */

    this._elements
      .batteryDcLine
      .className =
      "flow-line horizontal battery-dc-line";

    if (batteryCharging) {
      this._elements
        .batteryDcLine
        .classList
        .add(
          "active",
          "charge-flow",
          "forward"
        );

      this._elements
        .batteryStatus
        .className =
        "battery-status status-charge";

      this._setText(
        this._elements.batteryStatus,
        "Charging"
      );
    } else if (batteryDischarging) {
      this._elements
        .batteryDcLine
        .classList
        .add(
          "active",
          "discharge-flow",
          "reverse"
        );

      this._elements
        .batteryStatus
        .className =
        "battery-status status-discharge";

      this._setText(
        this._elements.batteryStatus,
        "Discharging"
      );
    } else {
      this._elements
        .batteryStatus
        .className =
        "battery-status status-idle";

      this._setText(
        this._elements.batteryStatus,
        "Idle"
      );
    }
  }

  _setFlow(
    element,
    active,
    flowClass,
    directionClass,
    positionClass
  ) {
    if (!element) {
      return;
    }

    const orientation =
      element.classList.contains("vertical")
        ? "vertical"
        : "horizontal";

    element.className = [
      "flow-line",
      orientation,
      flowClass,
      positionClass,
    ]
      .filter(Boolean)
      .join(" ");

    if (active) {
      element.classList.add(
        "active",
        directionClass
      );
    }
  }

  _updateSocColour(soc) {
    let top;
    let bottom;

    if (soc <= 20) {
      top = "#ef5350";
      bottom = "#c62828";
    } else if (soc <= 40) {
      top = "#ffb74d";
      bottom = "#ef6c00";
    } else if (soc <= 70) {
      top = "#ffee58";
      bottom = "#f9a825";
    } else {
      top = "#66d489";
      bottom = "#24964a";
    }

    this._elements
      .socGaugeFill
      .style
      .setProperty(
        "--soc-color-top",
        top
      );

    this._elements
      .socGaugeFill
      .style
      .setProperty(
        "--soc-color-bottom",
        bottom
      );
  }

  _isEnabled(
    showKey,
    entityId
  ) {
    return (
      this._config.show[showKey] !== false &&
      Boolean(entityId)
    );
  }

  _setVisible(
    element,
    visible
  ) {
    if (!element) {
      return;
    }

    element.classList.toggle(
      "hidden",
      !visible
    );
  }

  _isVisible(element) {
    return (
      element &&
      !element.classList.contains(
        "hidden"
      )
    );
  }

  _setText(
    element,
    value
  ) {
    if (
      element &&
      element.textContent !== value
    ) {
      element.textContent =
        value;
    }
  }

  _number(entityId) {
    if (
      !entityId ||
      !this._hass?.states?.[entityId]
    ) {
      return 0;
    }

    const value =
      Number(
        this._hass
          .states[entityId]
          .state
      );

    return Number.isFinite(value)
      ? value
      : 0;
  }

  _powerToWatts(
    value,
    unit
  ) {
    switch (
      String(
        unit || "W"
      ).toLowerCase()
    ) {
      case "mw":
        return value * 1000000;

      case "kw":
        return value * 1000;

      default:
        return value;
    }
  }

  _energyToKwh(
    value,
    unit
  ) {
    switch (
      String(
        unit || "kWh"
      ).toLowerCase()
    ) {
      case "wh":
        return value / 1000;

      case "mwh":
        return value * 1000;

      default:
        return value;
    }
  }

  _formatPower(valueWatts) {
    const value =
      Math.abs(valueWatts);

    if (value >= 1000000) {
      return `${(
        value / 1000000
      ).toFixed(2)} MW`;
    }

    if (value >= 1000) {
      return `${(
        value / 1000
      ).toFixed(1)} kW`;
    }

    return `${value.toFixed(0)} W`;
  }

  _formatEnergy(valueKwh) {
    const value =
      Math.abs(valueKwh);

    if (value >= 1000) {
      return `${(
        value / 1000
      ).toFixed(2)} MWh`;
    }

    return `${value.toFixed(1)} kWh`;
  }

  _formatTemperature(value) {
    return `${value.toFixed(1)} ${
      this._config.temperature_unit || "°C"
    }`;
  }

  _formatPowerFactor(value) {
    if (!Number.isFinite(value)) {
      return "--";
    }

    return value.toFixed(3);
  }

  _clamp(
    value,
    minimum,
    maximum
  ) {
    return Math.min(
      maximum,
      Math.max(
        minimum,
        value
      )
    );
  }

  _withVersion(
    url,
    version
  ) {
    if (!url) {
      return "";
    }

    return url.includes("?")
      ? `${url}&v=${encodeURIComponent(
          version
        )}`
      : `${url}?v=${encodeURIComponent(
          version
        )}`;
  }

  _summaryBlock(
    icon,
    label,
    valueClass,
    itemClass
  ) {
    return `
      <div class="summary-item ${itemClass}">
        <ha-icon icon="${icon}"></ha-icon>

        <div class="summary-content">
          <span class="summary-label">
            ${label}
          </span>

          <span class="summary-value ${valueClass}">
            --
          </span>
        </div>
      </div>
    `;
  }

  _escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
}

if (
  !customElements.get(
    "atess-power-flow-card"
  )
) {
  customElements.define(
    "atess-power-flow-card",
    AtessPowerFlowCard
  );
}

window.customCards =
  window.customCards || [];

if (
  !window.customCards.some(
    (card) =>
      card.type ===
      "atess-power-flow-card"
  )
) {
  window.customCards.push({
    type: "atess-power-flow-card",
    name: "ATESS Power Flow Card",
    description:
      "Responsive ATESS power-flow dashboard.",
    preview: true,
  });
}

console.info(
  "%c ATESS POWER FLOW CARD %c v1.4.0 ",
  "color: white; background: #0084ad; font-weight: 700;",
  "color: #0084ad; background: white; font-weight: 700;"
);