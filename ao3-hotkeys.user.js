// ==UserScript==
// @name         Ao3 Hotkeys
// @namespace    http://tampermonkey.net/
// @version      2025-07-16.04
// @description  Adds hotkeys for bold and italic text in AO3 editor
// @author       mothmind
// @match        https://archiveofourown.org/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=archiveofourown.org
// @grant        none
// @updateURL    https://raw.githubusercontent.com/mothmind/userscripts/main/ao3-hotkeys.user.js
// @downloadURL  https://raw.githubusercontent.com/mothmind/userscripts/main/ao3-hotkeys.user.js
// ==/UserScript==

(function () {
  "use strict";

  const observer = new MutationObserver((mutations, obs) => {
    const editor = document.querySelector("textarea.mce-editor");
    if (editor) {
      console.log("[AO3 Hotkeys] Editor detected. Binding events...");
      attachHotkeys(editor);
      obs.disconnect();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  setTimeout(hackThePlanet, 1000);

  function attachHotkeys(editor) {
    editor.addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.key === "b") {
        e.preventDefault();
        wrapSelection(editor, "<b>", "</b>");
      }

      if (e.ctrlKey && e.key === "i") {
        e.preventDefault();
        wrapSelection(editor, "<em>", "</em>");
      }
    });
  }
  function wrapSelection(textarea, before, after) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = textarea.value.substring(start, end);
    const newText = before + selected + after;

    textarea.setRangeText(newText, start, end, "end");
    textarea.focus();
  }
  async function hackThePlanet() {
    const header = document.getElementById("header");
    if (!header) return;
    const txt = header.querySelector("span");
    const img = header.querySelector("img");
    const sup = header.querySelector("sup");
    /** @type {HTMLHeadingElement | null} */
    const heading = header.querySelector("h1.heading");
    if (!txt || !img || !sup || !heading) {
      return;
    }

    const original = txt.innerText;
    const newText = "The moth has added hotkeys ";
    const initHeight = window.getComputedStyle(heading).height;

    sup.innerText = "";

    await deleteText(txt, original);

    txt.style.fontFamily = "'Courier New', monospace";
    txt.style.letterSpacing = "1px";
    txt.style.textShadow = "0 0 8px lime";
    txt.style.color = "#0F0";
    heading.style.backgroundColor = "#000";
    heading.style.height = initHeight;
    heading.style.paddingRight = "1rem";
    img.src = "https://mothsgonewild.com/images/nom.png";
    img.style.marginRight = "1rem";

    await typeText(txt, newText);
    sup.style.color = "#0F0";
    sup.innerText = "(AO3)";
  }
  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  async function deleteText(el, text) {
    for (let i = text.length; i >= 0; i--) {
      el.innerText = text.substring(0, i);
      await sleep(50);
    }
  }
  async function typeText(el, text) {
    for (let i = 0; i <= text.length; i++) {
      el.innerText = text.substring(0, i);
      await sleep(75);
    }
  }
})();
