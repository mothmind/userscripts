// ==UserScript==
// @name         NAI Autogenerate
// @namespace    http://tampermonkey.net/
// @version      2024-04-26.1
// @description  Adds a button to autoclick the generate button if available
// @author       mothmind
// @match        https://novelai.net/image
// @icon         https://www.google.com/s2/favicons?sz=64&domain=novelai.net
// @grant        none
// @updateURL    https://raw.githubusercontent.com/mothmind/userscripts/main/novelai-autogen.user.js
// @downloadURL  https://raw.githubusercontent.com/mothmind/userscripts/main/novelai-autogen.user.js
// ==/UserScript==

(function () {
  "use strict";
  // Your code here...
  const checkedBoxIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" viewBox="0 0 448 512"><!--!Font Awesome Free 6.5.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><path d="M64 32C28.7 32 0 60.7 0 96V416c0 35.3 28.7 64 64 64H384c35.3 0 64-28.7 64-64V96c0-35.3-28.7-64-64-64H64zM337 209L209 337c-9.4 9.4-24.6 9.4-33.9 0l-64-64c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0l47 47L303 175c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9z"/></svg>`;
  const uncheckedBoxIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" viewBox="0 0 448 512"><!--!Font Awesome Free 6.5.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><path d="M0 96C0 60.7 28.7 32 64 32H384c35.3 0 64 28.7 64 64V416c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V96z"/></svg>`;
  const bindInterval = setInterval(() => {
    const buttons = [...document.querySelectorAll("button")].filter((b) =>
      b.textContent.includes("Generate")
    );
    if (!buttons.length || buttons[0].disabled || buttons[1].disabled) return;
    clearInterval(bindInterval);

    const inputs = [];
    const autogenButtons = [];
    console.log(buttons);
    buttons.forEach((button) => {
      const clone = button.cloneNode();
      clone.innerHTML = "Enable Autogen " + uncheckedBoxIcon;
      clone.style = "margin-top: 16px; width: 100%";
      const div = document.createElement("div");
      div.style =
        "display: flex; flex-direction: row; width: 100%; margin-top: 16px; border: 1px #EEE solid;border-radius:8px; padding: 6px;";
      const label = document.createElement("label");
      label.textContent = "Autogen Count";
      const input = document.createElement("input");
      input.type = "number";
      input.value = "-1";
      input.min = "-1";
      div.appendChild(label);
      div.appendChild(input);
      button.after(clone);
      button.after(div);

      inputs.push(input);
      autogenButtons.push(clone);
    });

    let interval = 0;
    function triggerAutogen() {
      const gensRemaining = Math.max(...inputs.map((i) => +i.value));
      console.log(gensRemaining);
      if (gensRemaining === 0) return toggleAutogen();
      if (buttons[0].disabled === true) return;
      if (gensRemaining > 0)
        inputs.forEach((i) => {
          i.value = gensRemaining - 1;
        });
      buttons[0].click();
    }

    function toggleAutogen() {
      if (interval === 0) {
        // Need to enable
        interval = setInterval(triggerAutogen, 1000);
        for (let b of autogenButtons) {
          b.innerHTML = "Disable Autogen " + checkedBoxIcon;
        }
      } else {
        // Need to disable
        clearInterval(interval);
        interval = 0;
        for (let b of autogenButtons) {
          b.innerHTML = "Enable Autogen " + uncheckedBoxIcon;
        }
      }
    }

    for (let b of autogenButtons) {
      b.addEventListener("click", toggleAutogen);
    }
  }, 100);
})();
