// ==UserScript==
// @name         Auto Switch Account
// @namespace    http://tampermonkey.net/
// @version      3.103
// @description  try to take over the world!
// @updateURL    https://raw.githubusercontent.com/natasyabimosakti/Novi91/main/AutoSwitch.js
// @downloadURL  https://raw.githubusercontent.com/natasyabimosakti/Novi91/main/AutoSwitch.js
// @author       You
// @match        http*://*/*
// @run-at       document-end
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        GM.setValue
// @grant        GM.getValue
// @grant        window.close
// @grant        GM_xmlhttpRequest
// @connect      api.telegram.org
// ==/UserScript==

(function () {
    'use strict';
    const delay = (ms) => new Promise(r => setTimeout(r, ms));
    function normalize(s) {
        return s ? s.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").trim() : "";
    }
    function fbLiteClick(el) {
        if (!el) return;
        console.log("🖱️ Mengirim event klik ke:", el.getAttribute('aria-label') || el.textContent);
        const events = ['mousedown', 'mouseup', 'click'];
        events.forEach(evtType => {
            try {
                const event = new MouseEvent(evtType, {
                    bubbles: true,
                    cancelable: true
                });
                el.dispatchEvent(event);
            } catch (e) {
                if (evtType === 'click') el.click();
            }
        });
    }
    async function updateCurrentAccount() {
        const profileEl = document.querySelector('[aria-label*="Lihat profil Anda"]');
        if (profileEl) {
            const label = profileEl.getAttribute('aria-label');
            const name = label.split(',')[0].trim();
            const normName = normalize(name);

            console.log("👤 Akun aktif:", name);
            await GM.setValue("useAccount", normName);

            let lastList = await GM.getValue("lastAccount", "");
            let accounts = lastList ? lastList.split(",").map(a => a.trim()) : [];
            if (!accounts.includes(normName)) {
                accounts.push(normName);
                await GM.setValue("lastAccount", accounts.join(","));
                console.log("📝 Akun baru ditambahkan ke rotasi.");
            }
        }
    }
    async function autoLogout() {

        console.log("🔍 Memulai proses logout...");
        await updateCurrentAccount();

        // Scroll ke bawah agar tombol Keluar terlihat/termuat
        window.scrollTo(0, document.body.scrollHeight);
        await delay(2000);
       if(!document.URL.includes("bookmarks")) return;
        const logoutBtn = document.querySelector('div[role="button"][aria-label="Keluar"]');

        if (logoutBtn) {
            fbLiteClick(logoutBtn);
            for (let i = 0; i < 15; i++) {
                await delay(1000);
                const yaBtn = Array.from(document.querySelectorAll('div[role="button"]')).find(el => {
                    // 1. Cek aria-label (untuk variasi HTML pertama)
                    const label = el.getAttribute('aria-label');
                    if (label && label.trim().toLowerCase() === "ya") return true;
                    const text = el.textContent.trim().toLowerCase();
                    if (text === "ya") return true;

                    return false;
                });

                if (yaBtn) {
                    console.log("🆗 Konfirmasi 'Ya' ditemukan, mengeksekusi klik...");
                    fbLiteClick(yaBtn);
                    return;
                }
            }
        } else {
            console.warn("⚠️ Tombol Keluar tidak ditemukan di halaman ini.");
        }
    }
    async function pickAccount() {
        const accountNodes = Array.from(document.querySelectorAll('div[data-bloks-name="bk.components.Flexbox"][role="button"][aria-label]'));
        if (accountNodes.length === 0) return;

        const blacklist = ["pengaturan", "gunakan", "buat", "tambah", "login", "bantuan", "keluar", "sandi", "password"];
        let candidates = accountNodes.map(el => ({
            el: el,
            name: normalize(el.getAttribute("aria-label"))
        })).filter(c => c.name && !blacklist.some(word => c.name.includes(word)));
        console.log("👥 Daftar rotasi akun:", candidates.map(c => c.name));
        let lastAccount = normalize(await GM.getValue("useAccount", ""));
        let chosen = null;

        if (lastAccount) {
            let lastIdx = candidates.findIndex(c => c.name === lastAccount);
            if (lastIdx !== -1 && lastIdx < candidates.length - 1) {
                chosen = candidates[lastIdx + 1];
            } else {
                chosen = candidates[0];
            }
        } else {
            chosen = candidates[0];
        }

        if (chosen) {
            console.log("🚀 Login ke akun berikutnya:", chosen.name);
            await GM.setValue("useAccount", chosen.name);
            chosen.el.focus();
            await delay(500);
            if (document.URL.includes("login")) return;
            fbLiteClick(chosen.el);
        }
    }
    async function main() {
        const url = location.href;
        if (url.includes("bookmarks")) {
            await delay(5000);
            await autoLogout();
        }
        // Cek apakah di halaman daftar akun (tidak ada feed)
        else if (!document.querySelector("[data-tracking-duration-id]") ) {
            await delay(7000); 
            await pickAccount();
        }
    }

    main();
    setInterval(() => {
        const adaMasalah = document.querySelector("[role='dialog']")?.textContent?.toLowerCase().includes("ada masalah");
        if (adaMasalah ||
            document.body.textContent.toLocaleLowerCase().includes("kesalahan sistem") ||
            document.body.textContent.toLocaleLowerCase().includes("masalah login")) {
            document.location.href = "https://www.facebook.com/bookmarks"
        }
    }, 700);

})();
