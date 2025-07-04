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
  "use strict";

  /** @type {Record<string, () => string>} */
  const macroRecord = {
    Microwaver: () => {
      const preface = "&{template:default} {{name=Microwaver}} {{Roll=🎲";
      const sufface = "}}";
      switch (rollDie(6)) {
        case 1:
          return preface + "1 - Cyberoptics short for [[1d6]] turns." + sufface;
        case 2:
          return (
            preface +
            "2 - Neural pulse! If character has interface plugs, reflex boosts, or other hardwiring, REF stat reduced by [[1d6/2]] until repaired." +
            sufface
          );
        case 3:
          return preface + "3 - Cyberaudio shorts for [[1d6]] turns." + sufface;
        case 4: {
          const limbPriority = [];
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
            function pushLimb(limbName) {
              if (!limbPriority.includes(limbName)) limbPriority.push(limbName);
            }
          }
          return (
            preface +
            `4 - Cyberlimb malfunction: Lose all use of cyberlimb for [[1d10]] turns.\nLimb affected is the first of the following: ${limbPriority.join(
              ", "
            )}` +
            sufface
          );
        }
        case 5:
          return (
            preface +
            "5 - Total Neural breakdown! Character reduced to twitching, epileptic fit for [[1d6/3]] turns." +
            sufface
          );
        case 6:
          return preface + "6 - No effect." + sufface;
        default:
          return "🚨D6 ROLLED A 7 OR SOMETHING!!!🚨";
      }
    },
    "Healing Light": () => "/me casts ✨Healing Light✨\n/roll [[2d8+3]]",
  };

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
    // Prevent duplicate injection
    if (document.getElementById("macroMenuButton")) return;

    const button = document.createElement("button");
    button.id = "macroMenuButton";
    button.textContent = "⚙ Moth Macros";
    button.style.marginLeft = "4px";
    button.style.padding = "2px 6px";
    button.style.fontSize = "12px";
    button.style.cursor = "pointer";
    button.style.border = "1px solid #BBB";
    button.style.borderRadius = "2px";

    chatContainer.appendChild(button);

    button.addEventListener("click", openModal);
  }

  function openModal() {
    if (document.getElementById("macroModal")) return;

    const modal = document.createElement("div");
    modal.id = "macroModal";
    modal.style.position = "fixed";
    modal.style.top = "50%";
    modal.style.left = "50%";
    modal.style.transform = "translate(-50%, -50%)";
    modal.style.background = "#EEE";
    modal.style.color = "#eee";
    modal.style.padding = "20px";
    modal.style.border = "2px solid #888";
    modal.style.borderRadius = "8px";
    modal.style.zIndex = "99999";
    modal.style.boxShadow = "0 0 10px black";
    modal.style.minWidth = "200px";

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "✖";
    closeBtn.style.float = "right";
    closeBtn.style.background = "transparent";
    closeBtn.style.color = "#222";
    closeBtn.style.border = "none";
    closeBtn.style.cursor = "pointer";
    closeBtn.style.fontSize = "16px";
    closeBtn.addEventListener("click", () => modal.remove());
    modal.appendChild(closeBtn);

    const title = document.createElement("h3");
    title.textContent = "Macro Menu";
    title.style.marginTop = "0";
    modal.appendChild(title);

    Object.entries(macroRecord).forEach(([name, func]) => {
      const btn = document.createElement("button");
      btn.textContent = name;
      btn.style.display = "block";
      btn.style.width = "100%";
      btn.style.margin = "5px 0";
      btn.style.padding = "6px";
      btn.style.background = "#444";
      btn.style.color = "#eee";
      btn.style.border = "1px solid #666";
      btn.style.borderRadius = "4px";
      btn.style.cursor = "pointer";

      btn.addEventListener("click", () => {
        /** @type {HTMLTextAreaElement | null} */
        const input = document.querySelector("textarea.ui-autocomplete-input");
        const sendButton = document.getElementById("chatSendBtn");
        if (input && sendButton) {
          input.value = func();
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
})();
