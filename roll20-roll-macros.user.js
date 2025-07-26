// ==UserScript==
// @name         Roll20 Macro Injector
// @namespace    http://tampermonkey.net/
// @version      2025-07-04
// @description  Adds a macro menu to the chat bar
// @author       mothmind
// @match        https://app.roll20.net/editor/
// @grant        none
// @updateURL    https://raw.githubusercontent.com/mothmind/userscripts/main/roll20-roll-macros.user.js
// @downloadURL  https://raw.githubusercontent.com/mothmind/userscripts/main/roll20-roll-macros.user.js
// ==/UserScript==

(function () {
  ("use strict");

  class Dice {
    /** @param {number} sides @param {number} num */
    constructor(sides, num = 1) {
      this.sides = sides;
      this.num = num;
      let roll = 0;
      for (let i = 0; i < num; i++) {
        roll += Math.floor(Math.random() * sides) + 1;
      }
      this.roll = roll;
      this.label = `\`\`${this.num}d${this.sides}🎲${this.roll}\`\``;
    }
  }

  /** @type {Record<string, () => string | Promise<string>>} */
  const macroRecord = {
    "Microwaver Effect": () => {
      const content = (() => {
        switch (rollDie(6)) {
          case 1:
            return "1 - Cyberoptics short for [[1d6]] turns.";
          case 2:
            return "2 - Neural pulse! If character has interface plugs, reflex boosts, or other hardwiring, REF stat reduced by [[1d6/2]] until repaired.";
          case 3:
            return "3 - Cyberaudio shorts for [[1d6]] turns.";
          case 4: {
            const limbPriority = [];
            const pushLimb = (limbName) =>
              !limbPriority.includes(limbName) && limbPriority.push(limbName);
            while (limbPriority.length !== 4) {
              switch (rollDie(6)) {
                case 1:
                case 2:
                  pushLimb("Right Arm");
                  continue;
                case 3:
                  pushLimb("Left Leg");
                  continue;
                case 4:
                  pushLimb("Right Leg");
                  continue;
                case 5:
                case 6:
                  pushLimb("Left Arm");
                  continue;
                default:
                  return "🚨D6 ROLLED A 7 OR SOMETHING!!!🚨";
              }
            }
            return `4 - Cyberlimb malfunction: Lose all use of cyberlimb for [[1d10]] turns.\nLimb affected is the first of the following: ${limbPriority.join(
              ", "
            )}`;
          }
          case 5:
            return "5 - Total Neural breakdown! Character reduced to twitching, epileptic fit for [[1d6/3]] turns.";
          case 6:
            return "6 - No effect.";
          default:
            return "🚨D6 ROLLED A 7 OR SOMETHING!!!🚨";
        }
      })();
      return `&{template:default} {{name=Microwaver}} {{Roll=🎲${content}}}`;
    },
    "Vehicle Damage": async () => {
      const details = await getMultiInputModal({
        "Shots Hit": "number",
        "Weapon Penetration Value": "number",
        "Vehicle Armor Value": "number",
        "Vehicle Body": "number",
        "Vehicle Has Turret": "checkbox",
        "Vehicle Is AV": "checkbox",
        "Firing Angle": ["Front", "Top", "Side", "Back", "Bottom"],
        "Range Penalty": ["None/Explosive", "Long", "Extreme"],
      });
      /**
       * @typedef {"Front" | "Top" | "Side" | "Back" | "Bottom"} FiringAngle
       * @typedef {"None/Explosive" | "Long" | "Extreme"} Range
       */

      const shotsHit = parseInt(details["Shots Hit"]);
      const armor = parseInt(details["Vehicle Armor Value"]);
      const body = parseInt(details["Vehicle Body"]);
      const pen = parseInt(details["Weapon Penetration Value"]);
      const hasTurret = details["Has Turret"] === "on";
      const isAV = details["Is AV"] === "on";
      /** @type {FiringAngle} */
      // @ts-ignore
      const firingAngle = details["Firing Angle"];
      /** @type {Range} */
      // @ts-ignore
      const range = details["Range"];

      const rangeMod = getRangeMod(range);
      const flankMod = getFlankMod(firingAngle, isAV);

      /** @type {Record<string, number>} */
      const locationHitCount = {};
      for (let i = 0; i < +shotsHit; i++) {
        const location = getLocation(firingAngle, hasTurret);
        const finalLocation =
          location === "Turret" || location === "Hull"
            ? `${location} (${getSubLocation(
                firingAngle,
                location === "Turret"
              )})`
            : location;
        locationHitCount[finalLocation] =
          (locationHitCount[finalLocation] || 0) + 1;
      }

      const damageRolls = Object.fromEntries(
        Object.entries(locationHitCount).map(([loc, count]) => {
          const baseDamage = Math.round(
            pen * rangeMod * (Math.floor(shotsHit / 10) * 0.5 + 1)
          );
          const effectiveArmor = Math.ceil(armor * flankMod);
          const armorDamage = baseDamage - Math.ceil(armor * flankMod);
          const dmg = new Dice(10);
          const bodyDamage = Math.max(
            0,
            dmg.roll + baseDamage * count - armor - body
          );

          return [
            loc,
            `${baseDamage} Pen x${count} hits + ${
              dmg.label
            } against ${effectiveArmor} AV and ${body} Body\n${(() => {
              if (armorDamage <= 0 || bodyDamage <= 0) {
                const hitDie = new Dice(10);
                const coinFlip = new Dice(2);
                return `**Surface Hit**\n${
                  hitDie.roll > 6
                    ? hitDie.label + " > 6: No Damage"
                    : pen > 2 || coinFlip.roll === 1
                    ? coinFlip.label + " Random exposed equipment destroyed."
                    : coinFlip.label +
                      " Random exposed equipment damaged, repairable."
                }`;
              }
              if (bodyDamage <= 5) {
                let details = "";
                if (loc.includes("Fuel"))
                  details =
                    "25% chance of catching fire, dealing 3d6 to each crew member each turn until extinguished. Each turn it burns, 25% chance of explosion, destroying the vehicle. Both chances reduced to 5% if fire/damage control system installed.";
                else if (loc.includes("Crew"))
                  details =
                    "Crew members take 4d6 damage to random location. Body armor will reduce this damage.";
                else if (loc.includes("Empty Space"))
                  details = "Fuck all happens, haha.";
                else {
                  const destroyed = new Dice(10);
                  details =
                    destroyed.roll < 3
                      ? destroyed.label +
                        " Equipment/weapon/system is destroyed and must be replaced."
                      : destroyed.label +
                        " Equipment/weapon/system is damaged and will not function again until repaired.";
                }
                return `**Minor Damage - ${loc}**\n${details}`;
              } else if (bodyDamage <= 9) {
                let details = "";
                if (loc.includes("Fuel"))
                  details =
                    "50% chance of catching fire, dealing 3d6 to each crew member each turn until extinguished. Each turn it burns, 25% chance of explosion, destroying the vehicle. Both chances reduced to 10% if fire/damage control system installed.";
                else if (loc.includes("Crew"))
                  details =
                    "Crew members take 6d6 damage to random location. Body armor will reduce this damage.";
                else if (loc.includes("Empty Space"))
                  details = "Fuck all happens, haha.";
                else if (loc.includes("Engine")) {
                  const explosion = new Dice(2);
                  const destroyed = new Dice(10);
                  details =
                    explosion.roll === 1
                      ? explosion.label +
                        " Engine explosion! Vehicle is destroyed."
                      : explosion.roll === 1
                      ? destroyed.label +
                        " Engine is damaged and will not function again until repaired."
                      : destroyed.label +
                        " Engine is destroyed and must be replaced.";
                } else if (loc.includes("Ammo")) {
                  const explosion = new Dice(2);
                  const destroyed = new Dice(10);
                  const suffix =
                    destroyed.roll === 1
                      ? destroyed.label +
                        " Cargo/Ammo is damaged and will not function again until repaired."
                      : destroyed.label +
                        " Cargo/Ammo is destroyed and must be replaced.";
                  details =
                    explosion.roll === 1
                      ? explosion.label +
                        " Ammo explosion! Vehicle is destroyed. If applicable. Otherwise: " +
                        suffix
                      : suffix;
                } else {
                  const destroyed = new Dice(10);
                  details =
                    destroyed.roll === 1
                      ? destroyed.label +
                        " Equipment/weapon/system is damaged and will not function again until repaired."
                      : destroyed.label +
                        " Equipment/weapon/system is destroyed and must be replaced.";
                }
                return `**Major Damage - ${loc}**\n${details}`;
              } else {
                let details = "";
                if (loc.includes("Fuel"))
                  details =
                    "50% chance of catching fire, dealing 3d6 to each crew member each turn until extinguished. Each turn it burns, 25% chance of explosion, destroying the vehicle. Both chances reduced to 30% if fire/damage control system installed.";
                else if (loc.includes("Crew"))
                  details =
                    "Crew members take 10d6 damage to random location. Body armor will reduce this damage.";
                else if (loc.includes("Empty Space"))
                  details = "Fuck all happens, haha. Damn.";
                else if (loc.includes("Engine")) {
                  const explosion = new Dice(10);
                  details =
                    explosion.roll === 1
                      ? explosion.label +
                        " Engine is destroyed and must be replaced."
                      : explosion.label +
                        " Engine explosion! Vehicle is destroyed.";
                } else if (loc.includes("Ammo")) {
                  const explosion = new Dice(10);
                  const suffix =
                    "Cargo/Ammo is destroyed and must be replaced.";
                  details =
                    explosion.roll === 1
                      ? explosion.label + " " + suffix
                      : explosion.label +
                        " Ammo explosion! Vehicle is destroyed. If applicable. Otherwise: " +
                        suffix;
                } else {
                  details =
                    "Equipment/weapon/system is destroyed and must be replaced.";
                }
                return `**Catastrophic Damage - ${loc}**\n${details}`;
              }
            })()}`,
          ];
        })
      );

      return `&{template:default} {{name=Vehicle Damage}} ${Object.entries(
        damageRolls
      )
        .map(([loc, details]) => `{{${loc}=${details}}}`)
        .join(" ")}`;

      /** @param {Range} range */
      function getRangeMod(range) {
        switch (range) {
          case "Long":
            return 0.75;
          case "Extreme":
            return 0.5;
          default:
            return 1;
        }
      }

      /** @param {FiringAngle} firingAngle @param {boolean} isAV */
      function getFlankMod(firingAngle, isAV) {
        switch (firingAngle) {
          case "Side":
            return 0.75;
          case "Top":
          case "Back":
            return 0.5;
          case "Bottom":
            return isAV ? 1 : 0.5;
          default:
            return 1;
        }
      }

      /** @param {FiringAngle} firingAngle @param {boolean} hasTurret */
      function getLocation(firingAngle, hasTurret) {
        switch (rollDie(10) + getLocationMod(firingAngle)) {
          case -1:
          case 0:
            return "Fuel";
          case 1:
          case 2:
          case 3:
            return "Motive Gear";
          case 4:
          case 5:
          case 6:
          case 7:
            return "Hull";
          case 8:
          case 9:
          case 10:
          case 11:
          case 12:
            return hasTurret ? "Turret" : "Hull";
          default:
            throw new Error("Unexpected roll result for location.");
        }
      }
      /** @param {FiringAngle} firingAngle */
      function getLocationMod(firingAngle) {
        switch (firingAngle) {
          case "Front":
            return 0;
          case "Top":
            return 2;
          case "Side":
            return -1;
          case "Back":
          case "Bottom":
            return -2;
          default:
            return 0; // Fallback for unexpected values
        }
      }
      /** @param {FiringAngle} firingAngle @param {boolean} isTurret */
      function getSubLocation(firingAngle, isTurret) {
        switch (rollDie(10) + getSubLocationMod(firingAngle)) {
          case 0:
          case 1:
          case 2:
            return "Cargo/Ammo";
          case 3:
          case 4:
            return isTurret ? "Crew" : "Engine";
          case 5:
          case 6:
          case 7:
            return "Crew";
          case 8:
            return "Equipment";
          case 9:
            return "Weapon";
          case 10:
          case 11:
            return isTurret ? "Weapon" : "Empty Space";
          default:
            throw new Error("Unexpected roll result for sub-location.");
        }
      }
      /** @param {FiringAngle} firingAngle */
      function getSubLocationMod(firingAngle) {
        switch (firingAngle) {
          case "Front":
            return 1;
          case "Back":
            return -1;
          default:
            return 0; // Fallback for unexpected values
        }
      }
    },
    "Error Out": () => {
      throw new Error("This macro is not implemented yet!");
    },
  };

  if (!document.getElementById("moth-modal-style")) {
    const style = document.createElement("style");
    style.id = "moth-modal-style";
    style.textContent = `
.moth-modal {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: #EEE;
  color: #222;
  padding: 20px;
  border: 2px solid #888;
  border-radius: 8px;
  z-index: 99999;
  box-shadow: 0 0 10px black;
  min-width: 260px;
  text-align: center;
}
.moth-modal button {
  display: block;
  width: 100%;
  margin: 5px 0px;
  padding: 6px;
  background: rgb(68, 68, 68);
  color: rgb(238, 238, 238);
  border: 1px solid rgb(102, 102, 102);
  border-radius: 4px;
  cursor: pointer;
}
.moth-modal button.close-btn {
  position: absolute;
  width: auto;
  top: 10px;
  right: 10px;
  background: transparent;
  color: #222;
  border: none;
  cursor: pointer;
  font-size: 16px;
}
.moth-multi-input-modal {
  text-align: left;
  display: grid;
  grid-template-columns: 3fr 1fr;
  gap: 4px 8px;
  align-items: start;
}
.moth-multi-input-modal label {
  grid-column: 1;
}
.moth-multi-input-modal select, .moth-multi-input-modal input {
  width: 100%;
  grid-column: 1 / span 2;
}
.moth-multi-input-modal input[type="checkbox"], .moth-multi-input-modal input[type="number"] {
  grid-column: 2;
}
#macro-menu-button {
  margin-left: 4px;
  padding: 2px 6px;
  font-size: 12px;
  cursor: pointer;
  border: 1px solid #BBB;
  border-radius: 2px;
}
  `;
    document.head.appendChild(style);
  }
  waitForChatElements(injectMacroMenu);

  function rollDie(sides) {
    return Math.floor(Math.random() * sides) + 1;
  }

  function waitForChatElements(callback) {
    const interval = setInterval(() => {
      const sendButton = document.getElementById("chatSendBtn");
      const chatContainer = document.getElementById("textchat-input");

      if (sendButton && chatContainer) {
        clearInterval(interval);
        callback(sendButton, chatContainer);
      }
    }, 500);
  }

  function injectMacroMenu(sendButton, chatContainer) {
    if (document.getElementById("macro-menu-button")) return; // Prevent duplicate injection

    const button = document.createElement("button");
    button.id = "macro-menu-button";
    button.textContent = "⚙ Moth Macros";

    chatContainer.appendChild(button);

    button.addEventListener("click", openMacroModal);
  }

  function openMacroModal() {
    if (document.getElementById("macroModal")) return;

    const modal = document.createElement("div");
    modal.id = "macroModal";
    modal.className = "moth-modal";

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "✖";
    closeBtn.className = "close-btn";
    closeBtn.addEventListener("click", () => modal.remove());
    modal.appendChild(closeBtn);

    const title = document.createElement("h3");
    title.textContent = "Macro Menu";
    modal.appendChild(title);

    Object.entries(macroRecord).forEach(([name, func]) => {
      const btn = document.createElement("button");
      btn.textContent = name;

      btn.addEventListener("click", async () => {
        /** @type {HTMLTextAreaElement | null} */
        const input = document.querySelector("textarea.ui-autocomplete-input");
        const sendButton = document.getElementById("chatSendBtn");
        if (input && sendButton) {
          input.value = await func();
          input.dispatchEvent(new Event("input", { bubbles: true }));
          sendButton.click();
          modal.remove();
        } else {
          console.error("Could not find chat input or send button.");
          modal.remove();
        }
      });

      modal.appendChild(btn);
    });

    document.body.appendChild(modal);
  }
  /**
   * Shows a modal with multiple input fields.
   * @template {Record<string, "number" | "text" | "checkbox" | string[]>} T
   * @param {T} inputs
   * @returns {Promise<{[K in keyof T]: string}>} resolves to { [label]: value }
   */
  function getMultiInputModal(inputs) {
    return new Promise((resolve) => {
      const modal = document.createElement("div");
      modal.className = "moth-modal moth-multi-input-modal";

      const fields = {};

      Object.entries(inputs).forEach(([inputName, inputType]) => {
        const label = document.createElement("div");
        label.textContent = inputName;
        modal.appendChild(label);

        let input;
        if (Array.isArray(inputType)) {
          input = document.createElement("select");
          inputType.forEach((opt) => {
            const option = document.createElement("option");
            option.value = opt;
            option.textContent = opt;
            input.appendChild(option);
          });
        } else {
          input = document.createElement("input");
          input.type = inputType;
        }
        modal.appendChild(input);
        fields[inputName] = input;
      });

      const okBtn = document.createElement("button");
      okBtn.textContent = "OK";
      modal.appendChild(okBtn);

      const cancelBtn = document.createElement("button");
      cancelBtn.textContent = "Cancel";
      modal.appendChild(cancelBtn);

      function closeModal(result) {
        modal.remove();
        resolve(result);
      }

      okBtn.onclick = () => {
        const result = {};
        for (const key in fields) {
          result[key] = fields[key].value;
        }
        closeModal(result);
      };
      cancelBtn.onclick = () => closeModal(null);

      document.body.appendChild(modal);
      // Focus first input
      const firstInput = Object.values(fields)[0];
      if (firstInput) firstInput.focus();
    });
  }
})();
