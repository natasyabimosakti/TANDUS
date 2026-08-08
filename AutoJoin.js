// ==UserScript==
// @name         AUTO  JOIN
// @namespace    http://tampermonkey.net/
// @version      3.15
// @description  try to take over the world!
// @updateURL    https://raw.githubusercontent.com/natasyabimosakti/Novi91/main/AutoJoin.js
// @downloadURL  https://raw.githubusercontent.com/natasyabimosakti/Novi91/main/AutoJoin.js
// @author       You
// @match        http*://*/*
// @run-at       document-end
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant       GM.setValue
// @grant       GM.getValue
// @grant       window.close
// ==/UserScript==

(function() {
    'use strict';

    const interval = setInterval(() => {
        const button = Array.from(document.querySelectorAll('div[role="button"][aria-label]'))
            .find(el => el.getAttribute('aria-label')?.toLowerCase().includes('gabung grup')||el.getAttribute('aria-label')?.toLowerCase().includes('join'));

        if (button) {
            console.log('✅ Tombol ditemukan, klik sekarang...');
            button.click();
            clearInterval(interval); // Stop loop setelah klik
        }
    }, 1000); // Coba setiap 1 detik
})();
