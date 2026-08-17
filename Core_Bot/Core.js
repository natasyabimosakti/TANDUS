// babon_core.js
window.initBabonLogic = function (namagroup19, Comment19) {


    // --- 1. ANTI-THROTTLE & KEEP-ALIVE (Solusi Tab Background) ---a
    (function () {
        // Memaksa properti visibility agar selalu 'visible'
        Object.defineProperty(document, 'visibilityState', { value: 'visible', writable: true });
        Object.defineProperty(document, 'hidden', { value: false, writable: true });
        Object.defineProperty(document, 'hasFocus', { value: () => true, writable: true });

        // Blokir event listener yang mencoba mendeteksi perpindahan tab
        const origAddEventListener = EventTarget.prototype.addEventListener;
        EventTarget.prototype.addEventListener = function (type, listener, options) {
            if (['visibilitychange', 'blur', 'focus', 'pagehide', 'webkitvisibilitychange'].includes(type)) return;
            return origAddEventListener.call(this, type, listener, options);
        };

        setInterval(() => {
            if (document.hidden !== false) {
                Object.defineProperty(document, 'hidden', { value: false, writable: true });
                Object.defineProperty(document, 'visibilityState', { value: 'visible', writable: true });
                window.dispatchEvent(new Event('mousemove'));
            }
        }, 100); // Heartbeat stabil menjaga status 'visible' palsu
    })();



    // Menentukan URL berdasarkan variabel global pasar (dari @require)
    var baseURL = `http://127.0.0.1:8080/${Comment19}.json`;
    var URLGROUP = baseURL;

    if (typeof pasar !== 'undefined') {
        if (pasar === "SG") {
            URLGROUP = `http://127.0.0.1:8080/${Comment19}_SG.json`;
        } else if (pasar === "SD") {
            URLGROUP = `http://127.0.0.1:8080/${Comment19}_SD.json`;
        }
    }
    var nama_FB_Global = "Unknown"
    var keyword = ["P4S4RAN", "P4S4RAN SGP", "PASARAN SDY", "T-BAK", "ROOM", "R**M", "𝗥𝗢𝗢𝗠", "LOMBA", "𝗟𝗢𝗠𝗕𝗔", "𝐋𝐎𝗠𝗕𝐀", "LIMBA", "ROM", "R00M", "login", "𝐑𝐎𝐎𝐌", "nemo", "l0mb4", "lomb4", "l0mba", "𝗥𝟬𝟬𝗠", "𝗟𝟬𝗠𝗕𝗔", "𝘙𝘖𝘖𝘔", "hatori", "klikh4tori001", "🅻🅾🅼🅱🅰"]
    var Backlist = ["pemenang lomba", "rekap", "natidulu", "room lomba freebet", "result", "juara lomba", "r3k4p", "r3kap", "rek4p", "undang"]
    var URLADMIN = "http://127.0.0.1:8080/Admin_group_Baru.json";
    var TELEGRAM_TOKEN = '8841941027:-qJTrFa4';
    var TELEGRAM_CHAT_ID = '-1002717306025';
    let adminList = [];
    var SCRIPT_NAME = Comment19
    let isAdminListReady = false; // Flag penanda kesiapan data
    var refresh = 500; // Percepat durasi animasi tarik layar agar selesai dalam 200ms
    var refreshNonUser = 500;
    let commentDone = false; // Flag untuk menghentikan aksi jika bot sudah selesai bertugas
    let lastRefreshFeedState = "20"; // Menyimpan ID postingan terakhir untuk mendeteksi perubahan feed
    let lastObservedUrl = location.href;
    const LOCAL_KEY = "cachedAdminList";
    const VERSION_KEY = "cachedAdminVersion";
    let watchdogTimer = null; // Timer untuk mencegah bot macet jika refresh gagal
    var commentToPost = ""; // Dikosongkan agar tidak mengirim komentar default sebelum data siap
    let botObserver = null; // Observer utama untuk memantau feed
    var grouptToPost = '';
    var groupNames = [];
    var CommentList = [];
    let countA = 0;
    let sedangProses = false;
    let sedangKlikUrutkan = false;
    let lastMessageSent = "";
    var sudahkirim = false
    var observersudahjalam = false;
    var observers = null
    var groups = [];
    var skiper = false;
    var now = Date.now();
    var EXPIRATION_MS = 5 * 60 * 1000;
    var currentFeedState = "";
    var cekurlutama = ""
    var ceksimulasi = false;
    const fastOpts = { bubbles: true, cancelable: true };
    const mDown = new MouseEvent("mousedown", fastOpts);
    const mUp = new MouseEvent("mouseup", fastOpts);
    // 1. CACHE NATIVE SETTER: Pindahkan ke luar agar tidak dihitung dalam blok waktu komentari
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set ||
        Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;

    // 2. OPTIMISASI GLOBAL: Matikan logger Facebook agar proses click() menjadi instan (< 0.1ms)
    function Optimisasi() {
        if (window.WebLiteClientLogger) window.WebLiteClientLogger.logEvent = () => null;
        if (window.MarauderLogger) window.MarauderLogger.logEvent = () => null;
        if (window.WebLitePipe) {
            window.WebLitePipe.callAfterScreenRendered = (f) => f();
            window.WebLitePipe.setFirstResponseComplete();
        }
        // Bypass GWT scheduler untuk mempercepat flush data socket
        const gwt = window.GWT || window.$gwt;
        if (gwt) gwt.scheduleDeferred = (task) => typeof task === 'function' ? task() : task?.execute?.();
    }
    Optimisasi();
    // Gunakan unsafeWindow jika kamu bermain di Tampermonkey/Violentmonkey



    console.log(cekurlutama)
    let myObservere = null;
    let masterObserver = null;
    var obs3 = false;
    function initMasterObserver() {
        if (obs3) return;
        obs3 = true;
        if (masterObserver) return;

        masterObserver = new MutationObserver((mutations) => {
            // 1. Logika Dialog (Selalu cek state elemen saat ini)
            const dialog = document.querySelector('[role="dialog"]');
            const presentation = document.querySelector('[role="presentation"]');
            const dialogVscroller = document.querySelector(".dialog-vscroller");

            sedangKlikUrutkan = !!(presentation || dialogVscroller);
            sedangProses = !!dialog;

            // 2. Logika Mutasi Nodes
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType !== 1) continue;

                    // Cek Masalah & Status Post
                    cekMasalah();
                    cekMasalah2();
                    cekLogout();

                    const textLower = node.textContent?.toLowerCase() || "";
                    const isSuccess = textLower.includes('diposting') || textLower.includes('berhasil') || (node.querySelector && node.querySelector(".snackbar-container")) || (node.classList && node.classList.contains("snackbar-container"));
                    if (!commentDone && isSuccess) {
                        commentDone = true;
                        Blockafter()
                        setTimeout(() => {
                            if (masterObserver) masterObserver.disconnect();
                            location.href = "about:blank";
                        }, 5000);
                        break; // Hentikan pemrosesan node lain dalam batch yang sama
                    }

                    // Cek Aktivitas Terbaru (Hanya di halaman grup)
                    if (!commentDone && cekurlutama.includes("group")) {
                        const text = node.textContent || "";
                        if (text.includes("Aktivitas terbaru") || text.includes("Aktivitas terkini")) {
                            const tombol = node.querySelectorAll("[role='button']");
                            if (tombol.length >= 2) {
                                tombol.forEach(btn => {
                                    if (countA < 3) {
                                        if (btn.textContent.includes("Postingan baru")) {
                                            btn.click();
                                            countA++;
                                        }
                                    } else {
                                        setTimeout(() => {
                                            if (btn.textContent.includes("Aktivitas terbaru") || btn.textContent.includes("Aktivitas terkini")) {
                                                btn.click();
                                                countA = 0;
                                            }
                                        }, 100);
                                    }
                                });
                            }
                        }
                    }
                }
            }
        });

        masterObserver.observe(document.body, { childList: true, subtree: true });
        console.log("🛠️ Master Observer diaktifkan.");
    }

    async function tungguGroupAsync() {
        const start = Date.now();
        while (Date.now() - start < 15000) { // 15 detik timeout
            const result = getCommentForGroup();
            if (result && result.comment && result.groupName) {
                commentToPost = Random(result.comment);
                grouptToPost = result.groupName;
                window.commentToPost = commentToPost; // Pastikan variabel global terupdate
                console.log("✅ Nama grup : " + grouptToPost + " | Comment : " + commentToPost);
                groups = groupNames.map(groupId => ({ groupId, defaultValue: false }));
                await manageGroups();

                return { commentToPost, grouptToPost };
            }
            await new Promise(r => setTimeout(r, 500));
        }
        console.warn("⚠️ Timeout tunggu grup.");
        return null;
    }

    function Random(comment) {
        const numberRegex = /\d{2}/g;
        const rawNumbers = [...comment.matchAll(numberRegex)];
        const validNumbers = rawNumbers.filter(match => {
            const i = match.index;
            const before = comment[i - 1] || '';
            const after = comment[i + 2] || '';
            return !(/[a-z0-9]/i.test(before)) && !(/[a-z]/i.test(after));
        });
        if (validNumbers.length < 2) return comment;
        const lastCount = Math.min(3, validNumbers.length);
        const lastNums = validNumbers.slice(-lastCount);
        const separators = [];
        for (let i = 0; i < lastCount - 1; i++) {
            separators.push(comment.slice(lastNums[i].index + 2, lastNums[i + 1].index));
        }
        const angka = lastNums.map(x => x[0]);
        function shuffleArray(arr) {
            const copy = [...arr];
            for (let i = copy.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [copy[i], copy[j]] = [copy[j], copy[i]];
            }
            return copy;
        }
        const rotated = lastCount === 2 ? [angka[1], angka[0]] : shuffleArray(angka);
        const start = comment.slice(0, lastNums[0].index);
        const end = comment.slice(lastNums[lastCount - 1].index + 2);
        let result = start;
        for (let i = 0; i < lastCount; i++) {
            result += rotated[i];
            if (i < lastCount - 1) result += separators[i];
        }
        result += end;
        return result;
    }






    async function fetchGroupsFromGitHub() {
        return new Promise((resolve, reject) => {
            function loadGroup(urlToFetch) {
                GM_xmlhttpRequest({
                    method: "GET",
                    url: urlToFetch,
                    onload: function (response) {
                        // Cek HTTP status code untuk fallback (contoh: 404 Not Found)
                        if (response.status !== 200 && urlToFetch !== baseURL) {
                            console.log("⚠️ Fallback ke baseURL karena " + urlToFetch + " tidak ditemukan.");
                            return loadGroup(baseURL);
                        }

                        try {
                            const data = JSON.parse(response.responseText);

                            data.forEach((item) => {
                                if (item.group && item.comment) {
                                    groupNames.push(normalizeToBasicLatin(item.group).toLowerCase());
                                    CommentList.push(item.comment);
                                }
                            });

                            if (namagroup19 && Comment19) {
                                groupNames.push(normalizeToBasicLatin(namagroup19).toLowerCase());
                                CommentList.push(Comment19);
                            }

                            console.log("✅ Group list berhasil diambil dari " + urlToFetch + ":", groupNames.length);
                            resolve();

                        } catch (e) {
                            if (urlToFetch !== baseURL) {
                                console.log("⚠️ JSON invalid dari " + urlToFetch + ", fallback ke baseURL.");
                                return loadGroup(baseURL);
                            }
                            console.error("❌ Gagal parse JSON grup:", e);
                            reject(e);
                        }
                    },
                    onerror: function (err) {
                        if (urlToFetch !== baseURL) {
                            console.log("⚠️ Error jaringan dari " + urlToFetch + ", fallback ke baseURL.");
                            return loadGroup(baseURL);
                        }
                        console.error("❌ Gagal ambil grup:", err);
                        reject(err);
                    }
                });
            }

            // Mulai fetch dari URL utama
            loadGroup(URLGROUP);
        });
    }










    function getCommentForGroup() {
        const commentMap = {};
        let ceknamagroup = "";
        let ceknamagroup1 = "";
        let ceknamagroup2 = "";
        let ceknamagroup3 = "";
        let ceknamagroup4 = "";
        let ceknamagroup5 = "";
        for (let i = 0; i < groupNames.length; i++) {
            commentMap[groupNames[i]] = normalizeToBasicLatin(CommentList[i]);
        }
        if (cekurlutama.includes("user")) {
            ceknamagroup = document.querySelectorAll("[data-action-id][role='link'][data-focusable='true']")[0]?.textContent || '';
            ceknamagroup1 = document.querySelectorAll("[data-action-id][role='link']")[0]?.textContent || '';
            ceknamagroup2 = document.querySelectorAll("[data-action-id][role='link'][data-focusable='true']")[1]?.textContent || '';
            ceknamagroup3 = document.querySelectorAll("[data-action-id][role='link'][data-focusable='true']")[2]?.textContent || '';
            ceknamagroup4 = document.querySelectorAll("[data-action-id][role='link'][data-focusable='true']")[3]?.textContent || '';
            ceknamagroup5 = document.querySelectorAll("[data-action-id][role='link'][data-focusable='true']")[4]?.textContent || '';

        } else {
            ceknamagroup = document.getElementsByClassName("fixed-container")[0]?.textContent || '';
            ceknamagroup1 = document.getElementsByClassName('native-text')[5]?.textContent || '';
            ceknamagroup2 = document.getElementsByClassName('native-text')[6]?.textContent || '';
            ceknamagroup3 = document.getElementsByClassName('native-text')[7]?.textContent || '';
            ceknamagroup4 = document.getElementsByClassName('native-text')[8]?.textContent || '';
            ceknamagroup5 = document.querySelectorAll("[data-action-id][role='link'][data-focusable='true']")[0]?.textContent || '';
        }


        const allGroups = [
            normalizeToBasicLatin(ceknamagroup).toLowerCase(),
            normalizeToBasicLatin(ceknamagroup1).toLowerCase(),
            normalizeToBasicLatin(ceknamagroup2).toLowerCase(),
            normalizeToBasicLatin(ceknamagroup3).toLowerCase(),
            normalizeToBasicLatin(ceknamagroup4).toLowerCase(),
            normalizeToBasicLatin(ceknamagroup5).toLowerCase()
        ];

        for (let groupName in commentMap) {
            if (allGroups.some(text => text.includes(groupName))) {

                return { groupName, comment: commentMap[groupName] };
            }
        }
        return null;
    }

    function klikTombolByText(teks) {
        const tombol = Array.from(document.querySelectorAll('[role="button"], [tabindex="0"]'))
            .find(el => el.textContent.trim() === teks);
        if (tombol) {
            currentFeedState = tombol.getAttribute("data-action-id")
            if (lastRefreshFeedState == currentFeedState) return;
            if (skiper || document.querySelector(".loading-overlay")) return;
            tombol.click();
            lastRefreshFeedState = currentFeedState
            return true;
        }
        return false;
    }

    function normalizeToBasicLatin(str) {
        return str.replace(/[\u{1D400}-\u{1D7FF}]/gu, (ch) => {
            const boldA = 0x1D400;
            const normalA = 0x41; // ASCII A
            let code = ch.codePointAt(0);
            if (code >= boldA && code <= boldA + 25) {
                return String.fromCharCode(normalA + (code - boldA));
            }
            return ch;
        });
    }

    function fetchAdminListFromGitHub() {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: "GET",
                url: URLADMIN,
                onload: function (response) {
                    try {
                        const data = JSON.parse(response.responseText);
                        const latestVersion = data.version;
                        const admins = data.admins;

                        const currentVersion = localStorage.getItem(VERSION_KEY);
                        if (currentVersion !== latestVersion) {
                            console.log("⬆️ New admin version found:", latestVersion);
                            localStorage.setItem(LOCAL_KEY, JSON.stringify(admins));
                            localStorage.setItem(VERSION_KEY, latestVersion);
                            adminList = admins;
                        } else {
                            console.log("⏩ Admin list is up-to-date (version:", currentVersion + ")");
                            adminList = JSON.parse(localStorage.getItem(LOCAL_KEY)) || [];
                        }

                        isAdminListReady = true; // Set ke true setelah data berhasil diolah
                        console.log("%c👥 Daftar Admin Berhasil Dimuat:", "color: #fffa77; font-weight: bold;", adminList);
                        resolve(adminList); // ✅ resolve setelah data siap
                    } catch (e) {
                        console.error("❌ Failed to parse remote admin list:", e);
                        reject(e);
                    }
                },
                onerror: function (err) {
                    console.error("❌ Failed to load admin list from GitHub:", err);
                    reject(err);
                }
            });
        });
    }






    function parsePost(artikels) {


        const postingan = artikels.textContent || "";
        const texts = postingan
        const namafb = artikels.getElementsByTagName("span")[0];
        const author = namafb?.textContent?.toLowerCase() || "";
        const isadminer = artikels.querySelector("[data-focusable]");
        const adminText = isadminer?.textContent?.toLowerCase() || "";
        const isBaru = texts.includes("Baru saja") || texts.includes("Baru");
        const isMenit = /\b(?:[0-9]|1[0-5])\s*menit\b/.test(texts);


        const isAdmins = isAdminFast(author) || adminText.includes("admin") || adminText.includes("moderator");
        if (!isAdmins) return false;
        if (!(isBaru || isMenit)) return false;
        if (CekBacklist(postingan.toLowerCase())) {
            return false;
        }
        if (!CekKeyword(postingan.toLowerCase())) return false;
        window.focus();
        return true;
    }


    function parsePost2(artikels) {

        const postingan = artikels.textContent || "";
        const texts = postingan
        const isBaru = texts.includes("Baru saja") || texts.includes("Baru");
        const isMenit = /\b(?:[0-9]|1[0-5])\s*menit\b/.test(texts);

        if (!(isBaru || isMenit)) return false;
        if (CekBacklist(postingan.toLowerCase())) {
            console.log("❌ ada Backlist")
            return false;
        }
        if (!CekKeyword(postingan.toLowerCase())) return false;

        return true;
    }


    function CekBacklist(postinganBL) {
        for (const DataBacklist of Backlist) {
            const kata = DataBacklist.toLowerCase()
            if (postinganBL.toLowerCase().includes(kata)) {
                return true;
            }
        }
        return false;
    }

    function CekKeyword(postingan) {
        for (const DataKeyword of keyword) {
            const kata = DataKeyword.toLowerCase()
            if (postingan.toLowerCase().includes(kata)) {
                return true;
            }
        }
        return false;
    }
    function cleanName(s) {
        return s
            .normalize("NFKD")
            .replace(/\p{Diacritic}/gu, '')
            .replace(/[\u200B-\u200F\u202A-\u202E]/g, '')
            .replace(/[\uE000-\uF8FF]/g, '')
            .replace(/\s+/g, '')
            .toLowerCase();
    }



    function isAdminFast(name) {
        const cleanedName = cleanName(name);
        return adminList.some(a => cleanedName.includes(cleanName(a)));
    }


    function simulateHumanPullToRefresh(distance = 800) {

        if (skiper || document.querySelector(".loading-overlay") || ceksimulasi == true) return;
        ceksimulasi = true;
        if (document.hidden) {
            window.scrollTo(0, 0); // Scroll instan jika di background untuk efisiensi
        } else {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }
        // Gunakan penamaan variabel yang sangat unik agar tidak bentrok
        const _startX = window.innerWidth / 2;
        const _startY = 150;
        const _steps = 25;
        const _duration = refresh;
        const _identifier = Date.now();

        // 1. Fungsi pembantu untuk membuat Touch Event
        const createTouchEvent = (type, x, y) => {
            const touchObj = new Touch({
                identifier: _identifier,
                target: document.body,
                clientX: x,
                clientY: y,
                pageY: y,
                radiusX: 2.5,
                radiusY: 2.5,
                force: 0.5,
            });

            return new TouchEvent(type, {
                cancelable: true,
                bubbles: true,
                touches: [touchObj],
                targetTouches: [touchObj],
                changedTouches: [touchObj]
            });
        };

        // 2. Kirim Touch Start
        document.dispatchEvent(createTouchEvent('touchstart', _startX, _startY));

        // 3. Jalankan Gerakan Menarik (Interval)
        // Gunakan MessageChannel sebagai pengganti setInterval untuk bypass background throttling
        let _currentStep = 0;
        const channel = new MessageChannel();

        const stepLoop = () => {
            _currentStep++;
            const _currentY = _startY + (distance * (_currentStep / _steps));

            document.dispatchEvent(createTouchEvent('touchmove', _startX, _currentY));

            if (_currentStep < _steps) {
                channel.port2.postMessage(null);
            } else {
                document.dispatchEvent(createTouchEvent('touchend', _startX, _currentY));
                console.log("✅ Background Pull-to-Refresh Selesai.");
            }
        };

        channel.port1.onmessage = stepLoop;
        document.dispatchEvent(createTouchEvent('touchstart', _startX, _startY));
        channel.port2.postMessage(null); // Mulai loop
        ceksimulasi = false;
    }





    var obs4 = false;

    function BOTMODE() {
        if (obs4) return;
        obs4 = true;
        if (skiper) return;
        var TXT_SELA = ".multi-line-floating-textbox, .internal-input";
        var timble = false;
        if (!botObserver) {
            botObserver = new MutationObserver(async (mutationsList) => {

                for (const mutation of mutationsList) {
                    for (const node of mutation.addedNodes) {
                        document.title = "Done"

                        const descendants = document.querySelectorAll?.('[data-tracking-duration-id]');

                        // Deteksi nama akun hanya jika belum terisi
                        if (document.querySelectorAll('[aria-label="Lain kali"]')[0]) {
                            document.querySelectorAll('[aria-label="Lain kali"]')[0].click();
                        }
                        if (!descendants || commentDone) return;

                        if (node.nodeType !== 1) continue;
                        if (descendants) {
                            for (let i = 0, len = descendants.length; i < len; i++) {
                                var el = descendants[i]
                                if (commentDone) return;
                                const isUserPage = cekurlutama.includes("user");
                                const isValid = isUserPage ? parsePost2(el) : parsePost(el);
                                const textComponents = el.querySelectorAll('[data-type="text"]');
                                if (isValid) {
                                    skiper = true;
                                    if (textComponents.length > 0) {
                                        const target = textComponents[textComponents.length - 1];
                                        if (target) {
                                            // Spam klik 3 kali secara instan dengan event mouse lengkap agar trigger lebih pasti
                                            skiper = true;
                                            target.click();
                                            console.time("Data Ditemukan Sampai Prosess")
                                        }
                                    }
                                    return;
                                }
                            }
                        }

                    }
                }
            });

            botObserver.observe(document.body, { childList: true, subtree: true });
        }


    }

    // --- 2. BACKGROUND POLLER (Bypass Throttling) ---
    const pollerChannel = new MessageChannel();
    pollerChannel.port1.onmessage = () => { if (!commentDone) komentari(); };

    const TXT_SEL = ".multi-line-floating-textbox, .internal-input";
    const BTN_SEL = ".textbox-submit-button, [aria-label='Posting komentar']";


    function handlePostSuccess() {
        Promise.all([
            GM.setValue("group_" + grouptToPost, true),
            GM.setValue("group_" + grouptToPost + "_expire", Date.now() + EXPIRATION_MS)
        ]).then(() => {
            console.log("✅ SESSION SAVED");
            setTimeout(() => {
                const statusElements = document.querySelectorAll(
                    '[aria-label*="posting" i], [aria-label*="mengirim" i], [aria-label*="ditolak" i], [aria-label*="menunggu" i]'
                );
                statusElements.forEach(statusEl => {
                    const commentContainer = statusEl.closest('[data-mcomponent="MContainer"]');
                    if (commentContainer) {
                        const nameContainer = commentContainer.querySelector('div[data-mcomponent="TextArea"]');
                        if (nameContainer) {
                            sendToTelegram(`💥 Nama:Memposting tok Ora Kelar2 nang ${grouptToPost}`)
                        }
                    }
                });
            }, 12000);

            setTimeout(() => {
                location.href = "about:blank";
            }, 20000);
        });

    }
    var obs5 = false;
    function komentari() {
        if (obs5) return;
        obs5 = true;
        if (commentDone || !commentToPost) return;

        if (!myObservere) {
            myObservere = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                    for (const node of mutation.addedNodes) {

                        if (commentDone || node.nodeType !== 1) continue;

                        const textarea = document.querySelector(TXT_SEL);
                        const sendBtn = document.querySelector(BTN_SEL);


                        if (textarea && sendBtn) {

                            commentDone = true;
                            console.time("Kirim Komentar");
                            if (nativeSetter) nativeSetter.call(textarea, commentToPost);
                            else textarea.value = commentToPost;
                            sendBtn.disabled = false;
                            sendBtn.dispatchEvent(mDown);
                            sendBtn.click();
                            console.timeEnd("Kirim Komentar");
                            console.timeEnd("Data Ditemukan Sampai Prosess")
                            Blockafter()
                            window.focus();
                            if (window.runBypassTurbo) window.runBypassTurbo();
                            handlePostSuccess();
                            if (myObservere) { myObservere.disconnect(); myObservere = null; }
                            if (botObserver) botObserver.disconnect();
                            return true;
                        }

                    }
                }
            });
            myObservere.observe(document.body, { childList: true, subtree: true });
        }

        // --- HEARTBEAT BACKGROUND ---
        // MessageChannel melewati limitasi background throttling browser.
        // Ini memastikan bot tetap melakukan polling re-check meski tab tidak aktif.
        pollerChannel.port2.postMessage(null);
    }

    setInterval(async () => {
        if (cekurlutama !== lastObservedUrl) {
            const oldUrl = lastObservedUrl;
            lastObservedUrl = cekurlutama
            const isTargetPage = lastObservedUrl.includes("group") || lastObservedUrl.includes("user");
            const wasTargetPage = oldUrl.includes("group") || oldUrl.includes("user");

            if (isTargetPage) {
                console.log("%c🔄 URL Berubah: Mencocokkan ulang commentToPost...", "color: #00ffff; font-weight: bold;");
                await start()

            } else if (wasTargetPage && !isTargetPage) {
                // Jika meninggalkan halaman grup, hentikan aktivitas bot
                commentToPost = "";
                console.log("%c⏹️ Meninggalkan Halaman Target.", "color: #ff4444;");
            }
        }
    }, 1000); // Cek setiap 1 detik (sangat ringan dibandingkan per-packet)


    function MsgError(message) {
        const notif = document.createElement("div");
        notif.textContent = message;
        notif.style.position = "fixed";
        notif.style.bottom = "30px";
        notif.style.left = "4px";
        notif.style.padding = "10px 20px";
        notif.style.backgroundColor = "green";
        notif.style.color = "white";
        notif.style.borderRadius = "5px";
        notif.style.zIndex = 9999;
        notif.style.fontSize = "16px";
        document.body.appendChild(notif);
        ;
    }
    async function cekMasalah() {
        if (sudahkirim) return;
        let errorText = "";

        // 1. Cek SEMUA dialog (Karena FB sering punya dialog tersembunyi/loading)
        const dialogs = document.querySelectorAll("[role='dialog']");
        for (const dialog of dialogs) {
            const text = dialog.textContent ? dialog.textContent.toLowerCase() : "";
            if (text.includes("masalah") && text.includes("coba lagi")) {
                errorText = text;
                break;
            }
        }

        // 2. Fallback deteksi via H2 jika cara di atas gagal
        if (!errorText) {
            const errorHeaders = document.querySelectorAll("h2");
            for (const el of errorHeaders) {
                const text = el.textContent ? el.textContent.toLowerCase() : "";
                if (text.includes("ada masalah")) {
                    const parentText = el.parentElement ? el.parentElement.textContent.toLowerCase() : text;
                    if (parentText.includes("coba lagi")) {
                        errorText = parentText;
                        break;
                    }
                }
            }
        }

        if (!errorText) return;

        const cleanText = errorText.trim();

        MsgError(SCRIPT_NAME)
        if (masterObserver) masterObserver.disconnect();
        adamasalah(cleanText);
    }
    window.runBypassTurbo = function () {
        try {
            const gwt = window.GWT || window.$gwt;
            if (gwt) {
                gwt.scheduleDeferred = (task) => {
                    if (typeof task === 'function') task();
                    else if (task && typeof task.execute === 'function') task.execute();
                };
                gwt.runAsync = (id, cb) => { if (cb && cb.onSuccess) cb.onSuccess(); };


                if (typeof gwt.flushDeferredCommands === 'function') {
                    gwt.flushDeferredCommands();
                }
            }
            if (window.WebLitePipe && typeof window.WebLitePipe.setFlushComplete === 'function') {
                window.WebLitePipe.setFlushComplete(0);
            }
            if (typeof window.FKc === "function") window.FKc = (a) => a;

            const dispatcher = window.Dispatcher || window.AppDispatcher;
            if (dispatcher && typeof dispatcher.flush === 'function') {
                dispatcher.flush();
            }

            const logger = window.WebLiteClientLogger || window.MarauderLogger;
            if (logger) logger.logEvent = () => null;

            console.log("⚡ Turbo Triggered: Verifikasi dibypass & Socket dipaksa flush!");
        } catch (e) {
            console.error("⚠️ Turbo Error (Handled):", e);
        }
    };
    async function cekMasalah2() {
        if (sudahkirim) return;

        const elem = document.querySelectorAll("[data-long-click-action-id]");
        if (!elem || elem.length === 0) return;

        const targetEl = Array.from(elem).find(el => el.textContent?.includes("Menunggu"));

        if (targetEl) {
            sudahkirim = true;
            if (masterObserver) {
                masterObserver.disconnect();
            }

            const text = targetEl.textContent;
            const before = text.split("Menunggu")[0].trim() || "Seseorang";

            MsgError(SCRIPT_NAME);
            console.log(`⚠️ Masalah terdeteksi: Menunggu persetujuan ${before}`);
        }
    }
    async function cekLogout() {
        try {

            setTimeout(() => {
                if (document.getElementsByTagName("div").length < 10) {
                    sendToTelegram("?? Facebook BLANK.");
                }
            }, 2000)
        } catch (e) {
            console.warn("? Error saat cek logout:", e);
        }
    }
    function Blockafter() {

        const block = document.createElement('div');

        // 2. Beri gaya yang mencolok dan posisi melayang (fixed)
        block.style.width = '300px';
        block.style.height = '300px';
        block.style.backgroundColor = 'blue';
        block.id = "babon-blocker";
        block.style.position = 'fixed';
        block.style.top = '0px';
        block.style.left = '00px';
        block.style.zIndex = '9999'; // Agar selalu di depan

        // 3. Masukkan ke halaman
        document.body.appendChild(block);

    }

    function getFacebookName() {
        var targetId = "";

        const html = document.documentElement.innerHTML;

        // Regex untuk mencari userid
        const regexUserId = /"userid":(\d+)/;
        const match = html.match(regexUserId);

        if (match && match[1]) {
            const userId = match[1];
            console.log(`%c[Otomatis] Berhasil menemukan User ID: ${userId}`, 'color: #00ff00; font-weight: bold; font-size: 16px;');
            targetId = userId
        }
        return new Promise((resolve, reject) => {
            if (window.top !== window.self) {
                resolve("Unknown");
                return;
            }

            const url = `https://www.facebook.com/profile.php?id=${targetId}`;
            console.log(`[Script] 🔍 Memaksa cari via Desktop (www) untuk ID: ${targetId}...`);

            GM_xmlhttpRequest({
                method: "GET",
                url: url,
                withCredentials: true,
                anonymous: false,
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                    "Sec-Fetch-Site": "same-origin",
                    "Sec-Fetch-Mode": "navigate",
                    "Upgrade-Insecure-Requests": "1"
                },
                onload: function (response) {
                    if (response.status !== 200) {
                        console.warn(`Gagal mengakses profil. Status: ${response.status}`);
                        resolve("Unknown");
                        return;
                    }

                    const html = response.responseText;
                    let userName = "";

                    let jsonMatch = html.match(/"__(?:isProfile|typename)":"(?:User|Page)","name":"([^"]+)"/) ||
                        html.match(/"name":"([^"]+)","__isProfile":"(?:User|Page)"/);
                    if (jsonMatch) userName = jsonMatch[1];

                    if (!userName || userName.trim() === "Facebook") {
                        let metaMatch = html.match(/<meta property="og:title" content="([^"]+)"/i);
                        if (metaMatch) userName = metaMatch[1];
                    }

                    if (!userName || userName.trim() === "Facebook") {
                        let titleMatch = html.match(/<title>([\s\S]*?)<\/title>/i);
                        if (titleMatch) userName = titleMatch[1];
                    }

                    if (userName) {
                        try {
                            userName = JSON.parse('"' + userName.replace(/"/g, '\\"') + '"');
                        } catch (e) { }

                        userName = userName.replace(/ \| Facebook$/i, '')
                            .replace(/ - Facebook$/i, '')
                            .trim();
                    }

                    if (!userName || userName === "Facebook" || userName.includes("Log in")) {
                        console.warn("Gagal mendapatkan nama.");
                        resolve("Unknown");
                    } else {
                        // PENTING: Gunakan resolve() untuk menggantikan return
                        resolve(userName);
                    }
                },
                onerror: function (error) {
                    console.warn(`Request Error: ${error}`);
                    resolve("Unknown");
                }
            });
        });
    }

    function kirimDataKeLokal(payloadObj) {
        try {
            GM_xmlhttpRequest({
                method: "POST",
                url: "http://localhost:3001/api/data",
                headers: {
                    "Content-Type": "application/json"
                },
                data: JSON.stringify(payloadObj),
                timeout: 3000,

                onload: function (response) {
                    console.log("[kirimDataKeLokal] Status:", response.status, "Respon:", response.responseText);
                },
                onerror: function (err) {
                    console.log("[kirimDataKeLokal] Error koneksi:", err);
                },
                ontimeout: function () {
                },
                onabort: function () {
                }
            });
        } catch (e) {
        }
    }

    async function sendToTelegram(message, forceAccountName = null) {
        var tekoprofile = ""
        if (document.querySelector(".chrome-toast-profile")) {
            tekoprofile = document.querySelector(".chrome-toast-profile").textContent || "";
        }

        if (sudahkirim) return;
        sudahkirim = true;

        let NamaFbku = forceAccountName || nama_FB_Global;
        if (!NamaFbku) {
            NamaFbku = await getFacebookName();
            nama_FB_Global = NamaFbku;
        }

        const fullMessage = `👤 [${tekoprofile || 'Unknown'}]\n👤 [${NamaFbku || 'Unknown'}]\n🤖 [${SCRIPT_NAME}]\n${message}`;
        const normalizedMessage = normalizeText(fullMessage);
        kirimDataKeLokal({
            "type": "Error",
            "profile": tekoprofile,
            "account": {
                [SCRIPT_NAME]: NamaFbku
            },
            "masalah": message
        });
        const lastSent = await GM.getValue("lastTelegramMessage", "");
        const normalizedLast = normalizeText(lastSent);

        const lastTime = await GM.getValue("lastTelegramTime", 0);
        const now = Date.now();
        const COOLDOWN = 5 * 60 * 1000;

        const distance = levenshtein(normalizedMessage, normalizedLast);
        const similarity = 1 - distance / Math.max(normalizedMessage.length, normalizedLast.length);

        const SIMILARITY_THRESHOLD = 0.95;

        if (similarity >= SIMILARITY_THRESHOLD && (now - lastTime < COOLDOWN)) {
            console.log("?? Duplikat dicegah (mirip & <5 menit):", similarity);
            return;
        }
        // Membuat tombol inline dengan status awal "Kosong" (⬜)
        const replyMarkup = JSON.stringify({
            inline_keyboard: [[{ text: "⬜ Tandai Selesai", callback_data: "mark_checked" }]]
        });

        GM_xmlhttpRequest({
            method: "GET",
            url: `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage?chat_id=${TELEGRAM_CHAT_ID}&text=${encodeURIComponent(fullMessage)}&reply_markup=${encodeURIComponent(replyMarkup)}`,
            onload: function (res) {
                const response = JSON.parse(res.responseText);
                if (response.ok) {
                    console.log("✅ Pesan terkirim ke Telegram.");
                    GM.setValue("lastTelegramMessage", fullMessage);
                    GM.setValue("lastTelegramTime", now);
                    GM.setValue("lastTelegramSame", now);
                }
            },
            onerror: function (err) {
                console.error("? Gagal kirim ke Telegram:", err);
            }
        });
    }


    function normalizeText(text) {
        return text
            .trim()
            .replace(/\s+/g, ' ')
            .toLowerCase();
    }

    function levenshtein(a, b) {
        const matrix = Array.from({ length: b.length + 1 }, (_, i) => [i]);
        for (let j = 1; j <= a.length; j++) matrix[0][j] = j;

        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b[i - 1] === a[j - 1]) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        return matrix[b.length][a.length];
    }





    async function manageGroups() {
        if (window.isManaging) return;
        window.isManaging = true;
        const now = Date.now();
        for (const { groupId, defaultValue } of groups) {
            const key = `group_${groupId}`;
            const expireKey = `${key}_expire`;
            const expireAt = await GM.getValue(expireKey, 0);

            console.log(`🔹 Grup: ${groupId} | now: ${now} | expireAt: ${expireAt}`);

            if (now > expireAt) {
                await GM.setValue(key, defaultValue);
                await GM.setValue(expireKey, now + EXPIRATION_MS);
            }
        }

        const groupKey = `group_${grouptToPost}`;
        if (groupKey === "group_") {
            window.isManaging = false;
            return;
        }
        const sudahKomentar = await GM.getValue(groupKey, false);
        if (sudahKomentar) {
            window.isManaging = false;
            console.log(`Sudah Komentar  ${now}`)
            location.href = "about:blank";
            return;
        }
        window.isManaging = false;
    }







    async function start() {


        // Mencegah inisialisasi jika bukan halaman target
        if (!cekurlutama.includes("group") && !cekurlutama.includes("user")) return;

        console.log("%c📡 Memulai sinkronisasi data...", "color: #00ffff; font-weight: bold;");

        // Tunggu admin list dan group list (yang juga mengisi commentToPost) selesai
        // Promise.all memastikan kedua proses berjalan secara paralel namun kita menunggu keduanya selesai

        await Promise.all([
            fetchAdminListFromGitHub(),
            fetchGroupsFromGitHub(),
            tungguGroupAsync()

        ]);
        initMasterObserver();

        // --- VALIDASI KETAT: Tunggu commentToPost benar-benar terisi sebelum lanjut ---
        if (!commentToPost) {
            console.log("%c⏳ Menunggu identitas grup terdeteksi untuk mengisi commentToPost...", "color: #ffa500;");
            if (cekurlutama.includes("user")) {
                const baseUrl = cekurlutama.split('/user/')[0];
                document.location.href = baseUrl;
            }

            while (!commentToPost) {
                const res = getCommentForGroup();
                if (res) {
                    commentToPost = Random(res.comment);
                    grouptToPost = res.groupName;
                    window.commentToPost = commentToPost;
                    await manageGroups()
                    break;
                }
                await new Promise(r => setTimeout(r, 1000));
            }
        }

        console.log("%c✅ Inisialisasi Selesai. Data & Comment Siap: " + commentToPost, "color: #00ff00; font-weight: bold;");
        console.log("url adalah " + cekurlutama)
        // 1. Tunggu sampai document.body tersedia dan tidak dalam status 'loading'
        while (document.readyState === 'loading') {
            await new Promise(r => setTimeout(r, 100));
        }

        // 2. Berikan jeda tambahan (Safety Buffer) sekitar 1.5 detik
        // Agar engine internal Facebook selesai melakukan binding event listener
        await new Promise(r => setTimeout(r, 1500));
        console.log("%c🚀 Memulai Trigger Awal (Refresh)...", "color: #00ff00; font-weight: bold;");

        // 1. Heartbeat Interaction: Klik/Refresh berkala agar proses tetap hidup


        BOTMODE(); // Trigger manual pertama kali
        komentari()
        MsgError(SCRIPT_NAME)

        const heartbeat = () => {
            // 1. Berhenti jika postingan ditemukan atau proses komentar sudah selesai
            if (commentDone || skiper) return;

            if (Date.now() - now > 240000) {
                refresh = 5000;
                refreshNonUser = 5000;
            }

            // 2. Deteksi Perubahan: Cukup bandingkan ID postingan teratas.
            // Karena setiap refresh ID akan berubah, ini cara tercepat untuk mendeteksi pembaruan data.
            const isUserPage = cekurlutama.includes("user");
            const JumlahKontent = document.querySelectorAll('[data-tracking-duration-id]').length;
            if (isUserPage) {
                // Metode User: Pantau atribut postingan (berubah saat Pull-to-Refresh)
                const topPost1 = document.querySelector('[data-tracking-duration-id]');
                currentFeedState = topPost1?.querySelector("[data-fd-action]")?.getAttribute("data-fd-action");
                if (currentFeedState == lastRefreshFeedState) {
                    setTimeout(heartbeat, refreshNonUser);
                    return;
                }
            }

            if (document.querySelector(".loading-overlay")) {
                lastRefreshFeedState = "re"
                setTimeout(heartbeat, refreshNonUser);
                return;
            }
            if (document.querySelectorAll("[data-tracking-duration-id]").length > 0) {
                if (isUserPage && JumlahKontent > 2) {
                    simulateHumanPullToRefresh();
                } else {
                    // HAPUS OBFUSCATE (unicode \u{f1953}, dsb) karena sangat rawan berubah.
                    // Gunakan teks native yang selalu ada di FB Lite.
                    const ikonTombolTarget = ['\u{f1953}', '\u{f3159}', 'URUTKAN'];
                    ikonTombolTarget.forEach(ikon => {
                        klikTombolByText(ikon);
                    });
                }
            }
            setTimeout(heartbeat, refreshNonUser);
        };
        heartbeat();
    }


    async function adamasalah(reason) {
        console.log("[Sistem] Mengirim laporan error 'Ada Masalah' ke Telegram...");

        // Eksekusi fungsi Telegram (sendToTelegram akan otomatis memanggil getFacebookName jika nama kosong)
        try {
            await sendToTelegram(`😫 Ada "Masalah Coba Lagi"`);
        } catch (telError) {
            console.error("[Telegram Error]", telError.message);
        }

        setTimeout(() => {
            location.href = "https://m.facebook.com/bookmarks/";
        }, 10000);
    }


    // --- 3. INITIALIZATION FLOW ---
    (async () => {
        const targetWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

        function ambilDataWlsec() {
            let targetUrl = "URL tidak ditemukan";

            try {
                if (targetWindow.__wlsec && targetWindow.__wlsec.json_struct) {
                    const jsonStruct = JSON.parse(targetWindow.__wlsec.json_struct);
                    targetUrl = jsonStruct?.requestedUrlFromWww || targetUrl;

                    cekurlutama = targetUrl

                    console.log("Berhasil mendapatkan URL:", cekurlutama);
                    // Tulis kode kamu selanjutnya di sini setelah URL berhasil didapat
                    // ...
                    start()

                    return true; // Hentikan perulangan jika berhasil
                }
            } catch (error) {
                // Kita silent saja karena kita tahu ini akan sering terjadi di awal loading
            }
            return false;
        }

        // Lakukan pengecekan berkala setiap 500ms sampai datanya muncul
        const intervalCek = setInterval(() => {
            const sukses = ambilDataWlsec();
            if (sukses) {
                clearInterval(intervalCek); // Stop ngecek jika sudah ketemu
            }
        }, 500);

        // Batasi pencarian maksimal 10 detik agar tidak membebani browser jika data memang tidak ada
        setTimeout(() => {
            clearInterval(intervalCek);
        }, 10000);
        nama_FB_Global = await getFacebookName();
        let ToastProfile = "";
        for (let i = 0; i < 15; i++) { // Tunggu maksimal 3 detik (15 x 200ms)
            const toast = document.querySelector(".chrome-toast-profile");
            if (toast && toast.textContent) {
                ToastProfile = toast.textContent.trim();
                break;
            }
            await new Promise(r => setTimeout(r, 300));
        }
        kirimDataKeLokal({
            "type": "Online",
            "profile": ToastProfile,
            "account": {
                [SCRIPT_NAME]: nama_FB_Global
            }
        });
        console.log(`✅ Berhasil ${ToastProfile} ${nama_FB_Global}`)
        let attempts = 0;
        const interval = setInterval(() => {
            attempts++;
            const button = Array.from(document.querySelectorAll('div[role="button"][aria-label]'))
                .find(el => {
                    const label = el.getAttribute('aria-label')?.toLowerCase() || "";
                    const isJoin = label.includes('gabung grup') || label.includes('join');
                    const isDisabled = el.getAttribute('aria-disabled') === 'true';
                    return isJoin && !label.includes('batalkan') && !isDisabled;
                });


            const keywords = ["permanent", "menangguhkan", "Ajukan Banding"];

            const elements = document.querySelectorAll('[aria-label]');
            let ariaLabelSebelumnya = null;
            let ditemukan = false;

            for (let i = 0; i < elements.length; i++) {
                const currentLabel = elements[i].getAttribute('aria-label').toLowerCase();
                const isMatch = keywords.some(keyword => currentLabel.includes(keyword));
                if (isMatch) {
                    ditemukan = true;
                    if (i > 0) {
                        ariaLabelSebelumnya = elements[i - 1].getAttribute('aria-label');
                    } else {
                        ariaLabelSebelumnya = "Cocok di elemen pertama";
                    }
                    break;
                }
            }
            const isAgeRestricted = document.body.innerText.includes("usia 18+");

            if (isAgeRestricted) {
                clearInterval(interval);
                const pesanError = `Batasan Usia 18+, Facebook ini Tidak dapat di gunakan`;
                sendToTelegram(pesanError, ariaLabelSebelumnya);
                return; // Stop eksekusi agar tidak lanjut nge-klik tombol
            }

            if (ditemukan) {
                clearInterval(interval);
                const pesanError = `👉 Apes. Ajukan Banding`;
                sendToTelegram(pesanError);
                return; // Stop eksekusi agar tidak lanjut nge-klik tombol
            }

            if (button && typeof button.click === 'function') {
                if (button.textContent.includes("gabung") && !button.textContent.includes("batalkan")) {
                    console.log('✅ Tombol ditemukan, klik sekarang...');
                    button.click();
                }
            } else if (attempts >= 10) {
                console.log('❌ Tombol tidak ditemukan setelah 10 kali percobaan. Berhenti.');
                clearInterval(interval);
            }
        }, 2000); // Coba setiap 1 detik
    })();
};
