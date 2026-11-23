
window.initBabonLogic = function (namagroup19, Comment19) {

    'use strict';
    if (window.__BABON_BOT_ACTIVE__) {
        console.warn("⚠️ [Bot] Script sudah berjalan di tab ini, mencegah duplikasi instance!");
        return;
    }
    window.__BABON_BOT_ACTIVE__ = true;

    let socket = null;
    var KomentDone = false;
    const CEK_KONEKSI_SETIAP = 3000; // Patroli setiap 3 detik (3000 ms)

    // --- PENGUNCI ANTI-DOUBLE PER AKUN FACEBOOK (< 0.1 ms) ---
    // Menyertakan ID akun (__user / c_user) agar 4 akun FB berbeda tetap bisa komentar semua,
    // sedangkan 2 tab dengan AKUN FB YANG SAMA di grup/post yang sama dicegah agar tidak double komentar.
    const MY_TAB_ID = Math.random().toString(36).substring(2, 10);
    function getCurrentAccountId() {
        if (typeof __user !== 'undefined' && __user) return __user;
        const m = document.cookie.match(/c_user=(\d+)/);
        return (m && m[1]) ? m[1] : MY_TAB_ID;
    }
    function isWinnerTab(targetKeyStr) {
        const globalTimeMs = Date.now();
        const accId = getCurrentAccountId();
        const cleanKey = (targetKeyStr || bot_GlobalGroupName || groupID || namagroup19 || "DEFAULT").toString().replace(/\s+/g, '_');
        const lockKey = `FB_WIN_LOCK_${accId}_${cleanKey}`;
        const myToken = MY_TAB_ID + "|" + globalTimeMs + "|" + performance.now();

        const lockData = localStorage.getItem(lockKey);
        if (lockData) {
            const parts = lockData.split("|");
            const ownerTab = parts[0];
            const lockTime = parseInt(parts[1], 10);
            if (ownerTab === MY_TAB_ID) return true;
            if (globalTimeMs - lockTime < 20000) return false;
        }
        localStorage.setItem(lockKey, myToken);
        if (localStorage.getItem(lockKey) !== myToken) return false;
        return true;
    }

    function hubungkanSocket() {
        // CEGAH SPAM KONEKSI:
        // Jika socket masih ada dan statusnya sedang menyambung (CONNECTING)
        // atau sudah tersambung (OPEN), batalkan pembuatan socket baru.
        if (socket && (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN)) {
            return;
        }

        console.log("🔄 [Socket] Mencoba terhubung ke ws://localhost:8081...");
        socket = new WebSocket('ws://localhost:8081');

        socket.onopen = function () {
            console.log("🟢 [Socket] Terhubung ke Server Node.js (Port 8081)");
            updateSocketUI(true);
        };

        // ==========================================
        // BAGIAN PENERIMA (RECEIVER) - KOMPATIBEL MULTI-AKUN
        // ==========================================
        socket.onmessage = async function (event) {
            if (KomentDone) return;
            updateActivityUI("⬇️ Menerima Pesan...", "#00ffff");
            const rawMessage = event.data;

            let data = {};
            let lines = rawMessage.split('\n');

            lines.forEach(line => {
                if (line.trim() === "") return;
                let colonIdx = line.indexOf(':');
                if (colonIdx !== -1) {
                    let key = line.substring(0, colonIdx).trim();
                    let value = line.substring(colonIdx + 1).trim();
                    data[key] = value;
                }
            });

            const incomingGroup = data["Group"] || "";
            const incomingFeedbackId = data["Feedback_Id"] || "";
            const incomingGroupId = data["Group_Id"] || "";
            const incomingPostId = data["Post_Id"] || "";

            if (!incomingFeedbackId && !incomingPostId) return;

            // Pastikan groupID lokal sudah diekstrak dari URL meskipun tab belum scroll
            if (!groupID) {
                const gMatch = window.location.href.match(/\/groups\/(\d+)/);
                if (gMatch && gMatch[1]) groupID = gMatch[1];
            }

            // Coba update nama grup & komentar sekarang juga bila belum terisi
            if (!bot_GlobalGroupName || !bot_GlobalBotComment) {
                try { autoUpdateGroupAndComment(); } catch (e) { }
            }

            // Pencocokan fleksibel: cocok via Group_Id, URL grup, ATAU nama grup (case-insensitive & includes)
            const normIncoming = incomingGroup ? normalizeToBasicLatin(incomingGroup).toLowerCase().trim() : "";
            const normLocal = bot_GlobalGroupName ? normalizeToBasicLatin(bot_GlobalGroupName).toLowerCase().trim() : "";

            const isGroupIdMatch = Boolean(incomingGroupId && groupID && String(incomingGroupId) === String(groupID));
            const isSameGroupInUrl = Boolean(incomingGroupId && window.location.href.includes(String(incomingGroupId)));
            const isGroupNameMatch = Boolean(normIncoming && normLocal && (
                normIncoming === normLocal ||
                normIncoming.includes(normLocal) ||
                normLocal.includes(normIncoming)
            ));

            if (isGroupIdMatch || isSameGroupInUrl || isGroupNameMatch) {
                // Jika listComments masih proses loading dari server lokal, tunggu singkat maksimal 3 detik
                for (let wait = 0; wait < 30 && !bot_GlobalBotComment; wait++) {
                    if (listComments.length > 0) {
                        const checkName = normLocal || normIncoming;
                        if (checkName) {
                            for (let c of listComments) {
                                if (c.group && (checkName.includes(c.group) || c.group.includes(checkName))) {
                                    bot_GlobalBotComment = Random(normalizeToBasicLatin(c.comment));
                                    bot_GlobalGroupName = c.group;
                                    break;
                                }
                            }
                        }
                        if (!bot_GlobalBotComment) {
                            try { autoUpdateGroupAndComment(); } catch (e) { }
                        }
                    }
                    if (!bot_GlobalBotComment) {
                        await new Promise(r => setTimeout(r, 100));
                    }
                }

                if (KomentDone) return;

                // WAJIB pakai feedback_id (pfbid) asli dari Facebook (numeric feedback:<id> ditolak FB dengan code 1675002)
                if (!incomingFeedbackId) return;

                console.log(`⚡ [Socket Relay] Sinyal cocok! Menembak komentar...`);
                console.log(`➡️ Nama Grup   : ${incomingGroup} (Lokal: ${bot_GlobalGroupName})`);
                console.log(`➡️ Post ID     : ${incomingPostId || "-"}`);
                console.log(`➡️ Feedback ID : ${incomingFeedbackId}`);
                console.log(`➡️ Group ID    : ${incomingGroupId || groupID}`);

                sendKomentar(incomingFeedbackId, incomingGroupId || groupID, bot_GlobalBotComment, null, incomingPostId);
            }
        };

        socket.onclose = function () {
            updateSocketUI(false);
        };

        socket.onerror = function (error) {
            updateSocketUI(false);
        };
    }

    // 1. Panggil pertama kali saat halaman dimuat
    hubungkanSocket();

    // 2. SISTEM WATCHDOG (setInterval)
    // Berjalan terus-menerus di latar belakang setiap 3 detik
    setInterval(() => {
        // Jika socket tidak ada, atau statusnya terputus (CLOSED), panggil ulang
        if (!socket || socket.readyState === WebSocket.CLOSED) {
            hubungkanSocket();
        }
    }, CEK_KONEKSI_SETIAP);


    function kirimSocket(namaGrup, idFeedback, idGrup, postId = null) {
        if (socket && socket.readyState === WebSocket.OPEN) {
            updateActivityUI("⬆️ Mengirim Pesan...", "#ffff00");
            let pesanTeks = `Group: ${namaGrup}\nFeedback_Id: ${idFeedback}\nGroup_Id: ${idGrup}`;
            if (postId && /^\d+$/.test(String(postId).trim())) {
                pesanTeks += `\nPost_Id: ${String(postId).trim()}`;
            }
            socket.send(pesanTeks);
        } else {
            console.error("❌ [Socket] Gagal mengirim! Server sedang offline.");
        }
    }



    // ==========================================================================================
    // UI INDIKATOR DASHBOARD (Socket & Aktivitas)
    // ==========================================================================================
    let uiDashboard = null;
    let uiGeneralDot = null;
    let uiSocketStatus = null;
    let uiActivityStatus = null;
    let uiKomentarStatus = null;

    function initDashboard() {
        if (uiDashboard) return;
        if (!document.body) {
            setTimeout(initDashboard, 500);
            return;
        }

        uiDashboard = document.createElement("div");
        uiDashboard.id = "bot-dashboard";
        uiDashboard.style.position = "fixed";
        uiDashboard.style.top = "10px";
        uiDashboard.style.left = "0px"; // Mepet kiri
        uiDashboard.style.padding = "0px";
        uiDashboard.style.backgroundColor = "transparent";
        uiDashboard.style.zIndex = "999999";
        uiDashboard.style.display = "flex";
        uiDashboard.style.flexDirection = "column"; // Disusun ke bawah
        uiDashboard.style.gap = "4px"; // Jarak antar indikator
        uiDashboard.style.pointerEvents = "none"; // Biar tidak menghalangi klik

        // Gunakan writing-mode dan text-orientation agar teks menurun huruf demi huruf!
        const boxStyle = "display:flex; justify-content:center; align-items:center; width:18px; padding:8px 0; border-radius:0 5px 5px 0; color:#000; font-size:10px; font-weight:bold; font-family:sans-serif; writing-mode: vertical-rl; text-orientation: upright; text-transform: uppercase;";

        uiDashboard.innerHTML = `
            <div id="ui-dot" style="${boxStyle} background:red; box-shadow: 0 0 5px red;">PAYLOAD</div>
            <div id="ui-socket" style="${boxStyle} background:red; box-shadow: 0 0 5px red;">SOCKET</div>
            <div id="ui-activity" style="${boxStyle} background:gray;">WS ACT</div>
            <div id="ui-komentar" style="${boxStyle} background:gray;">KOMENTAR</div>
        `;

        document.body.appendChild(uiDashboard);

        uiGeneralDot = document.getElementById("ui-dot");
        uiSocketStatus = document.getElementById("ui-socket");
        uiActivityStatus = document.getElementById("ui-activity");
        uiKomentarStatus = document.getElementById("ui-komentar");
    }

    function updateStatusDot(color) {
        if (!uiDashboard) initDashboard();
        if (uiGeneralDot) {
            uiGeneralDot.style.backgroundColor = color;
            uiGeneralDot.style.boxShadow = `0 0 5px ${color}`;
        }
    }

    function updateSocketUI(isConnected) {
        if (!uiDashboard) initDashboard();
        if (uiSocketStatus) {
            let color = isConnected ? "#00ff00" : "red";
            uiSocketStatus.style.backgroundColor = color;
            uiSocketStatus.style.boxShadow = `0 0 5px ${color}`;
        }
    }

    function updateActivityUI(msg, color = "#fff") {
        if (!uiDashboard) initDashboard();
        if (uiActivityStatus) {
            uiActivityStatus.style.backgroundColor = color;
            uiActivityStatus.style.boxShadow = `0 0 5px ${color}`;
            clearTimeout(window.activityTimer);
            window.activityTimer = setTimeout(() => {
                if (uiActivityStatus) {
                    uiActivityStatus.style.backgroundColor = "gray";
                    uiActivityStatus.style.boxShadow = "none";
                }
            }, 3000);
        }
    }

    function updateKomentarUI(msg, color) {
        if (!uiDashboard) initDashboard();
        if (uiKomentarStatus) {
            uiKomentarStatus.style.backgroundColor = color;
            uiKomentarStatus.style.boxShadow = `0 0 5px ${color}`;

            // Kembalikan ke abu-abu setelah beberapa detik jika bukan sedang loading (yellow)
            if (color !== "yellow") {
                clearTimeout(window.komentarTimer);
                window.komentarTimer = setTimeout(() => {
                    if (uiKomentarStatus) {
                        uiKomentarStatus.style.backgroundColor = "gray";
                        uiKomentarStatus.style.boxShadow = "none";
                    }
                }, 5000);
            }
        }
    }

    initDashboard();
    updateStatusDot("red");

    // ==========================================================================================
    // DATA DARI SERVER LOKAL (ADMIN & KOMENTAR)
    // ==========================================================================================
    var listAdmins = [];
    var listComments = [];
    var groupNames = [];
    var CommentList = [];
    var URLADMIN = "http://127.0.0.1:8080/Admin_group_Baru.json";
    const LOCAL_KEY = "cachedAdminList";
    const VERSION_KEY = "cachedAdminVersion";
    let isAdminListReady = false;

    var List_Keyword = ["ROOM", "R**M", "𝗥𝗢𝗢𝗠", "LOMBA", "𝗟𝗢𝗠𝗕𝗔", "𝐋𝐎𝐌𝐁𝐀", "LIMBA", "ROM", "R00M", "login", "𝐑𝐎𝐎𝐌", "nemo", "l0mb4", "lomb4", "l0mba", "𝗥𝟬𝟬𝗠", "𝗟𝟬𝗠𝗕𝗔", "𝘙𝘖𝘖𝘔", "hatori", "klikh4tori001", "🅻🅾🅼🅱🅰"]
    var List_Backlist = ["pemenang lomba", "rekap", "natidulu", "room lomba freebet", "prediksi", "result", "juara lomba", "r3k4p", "r3kap", "rek4p", "undang"]
    // Variabel Global Terbuka agar fungsi lain di dalam script ini bisa mengaksesnya
    var bot_GlobalGroupName = "";
    var bot_GlobalBotComment = "";

    var baseURL = `http://127.0.0.1:8080/${Comment19}.json`;
    var URLGROUP = baseURL;

    if (typeof pasar !== 'undefined') {
        if (pasar === "SG") {
            URLGROUP = `http://127.0.0.1:8080/${Comment19}_SG.json`;
        } else if (pasar === "SD") {
            URLGROUP = `http://127.0.0.1:8080/${Comment19}_SD.json`;
        }
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
        return listAdmins.some(a => cleanedName.includes(cleanName(a)));
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

    // 1. Ambil Data Admin (Sama seperti Core.js: dengan sistem caching versi localStorage)
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
                            listAdmins = admins;
                        } else {
                            console.log("⏩ Admin list is up-to-date (version:", currentVersion + ")");
                            listAdmins = JSON.parse(localStorage.getItem(LOCAL_KEY)) || [];
                        }

                        isAdminListReady = true;
                        console.log("%c👥 Daftar Admin Berhasil Dimuat:", "color: #fffa77; font-weight: bold;", listAdmins);
                        resolve(listAdmins);
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

    // 2. Ambil Data Grup & Komentar (Sama seperti Core.js: mendukung fallback baseURL & namagroup19)
    async function fetchGroupsFromGitHub() {
        return new Promise((resolve, reject) => {
            function loadGroup(urlToFetch) {
                GM_xmlhttpRequest({
                    method: "GET",
                    url: urlToFetch,
                    onload: async function (response) {
                        // Cek HTTP status code untuk fallback (contoh: 404 Not Found)
                        if (response.status !== 200 && urlToFetch !== baseURL) {
                            console.log("⚠️ Fallback ke baseURL karena " + urlToFetch + " tidak ditemukan.");
                            return loadGroup(baseURL);
                        }

                        try {
                            const data = JSON.parse(response.responseText);

                            data.forEach((item) => {
                                if (item.group && item.comment) {
                                    const normGroup = normalizeToBasicLatin(item.group).toLowerCase();
                                    groupNames.push(normGroup);
                                    CommentList.push(item.comment);
                                    listComments.push({ group: normGroup, comment: item.comment });
                                }
                            });

                            if (namagroup19 && Comment19) {
                                const normGroup19 = normalizeToBasicLatin(namagroup19).toLowerCase();
                                groupNames.push(normGroup19);
                                CommentList.push(Comment19);
                                listComments.push({ group: normGroup19, comment: Comment19 });
                            }

                            console.log("✅ Group list berhasil diambil dari " + urlToFetch + ":", groupNames.length);

                            // Daftarkan semua grup dari JSON ke Storage (jika belum ada)
                            let storage = await GM.getValue("BOT_GROUP_STATUS", {});
                            let changed = false;
                            for (let c of listComments) {
                                if (c.group && !storage[c.group]) {
                                    storage[c.group] = { status: false, timestamp: Math.floor(Date.now() / 1000) };
                                    changed = true;
                                }
                            }
                            if (changed) {
                                await GM.setValue("BOT_GROUP_STATUS", storage);
                                console.log("%c[Bot] Seluruh grup dari JSON telah didaftarkan ke Storage lokal.", "color: #00ff00;");
                            }

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

    fetchAdminListFromGitHub();
    fetchGroupsFromGitHub();

    // ==========================================================================================
    // SISTEM MANAJEMEN STATUS GRUP (Antri & Cegah Spam)
    // ==========================================================================================
    async function manageGroupStorage(groupName) {
        if (!groupName) return;

        let storage = await GM.getValue("BOT_GROUP_STATUS", {});
        let currentTime = Math.floor(Date.now() / 1000);
        let isChanged = false;

        // 1. Bersihkan status grup yang sudah kadaluarsa (Lebih dari 1 menit / 60 detik)
        for (let gName in storage) {
            if (storage[gName].status === true && (currentTime - storage[gName].timestamp > 60)) {
                storage[gName].status = false;
                isChanged = true;
            }
        }

        // 2. Daftarkan grup saat ini jika belum ada di database
        if (!storage[groupName]) {
            storage[groupName] = { status: false, timestamp: Math.floor(Date.now() / 1000) };
            isChanged = true;
        }

        if (isChanged) {
            await GM.setValue("BOT_GROUP_STATUS", storage);
        }

        // 3. Pengecekan Blokir: Jika grup ini berstatus true dan belum 1 menit, langsung putuskan koneksi!
        if (storage[groupName].status === true) {
            let sisaWaktu = 60 - (currentTime - storage[groupName].timestamp);
            if (sisaWaktu > 0) {
                console.warn(`%c[Bot] Grup "${groupName}" sedang dalam masa Cooldown (sisa ${sisaWaktu} detik)! Mengalihkan ke about:blank untuk mencegah spam...`, "color: #ff0000; font-weight: bold; font-size: 16px;");
                window.location.href = "about:blank";
                return;
            }
        }
    }

    // Fungsi untuk menandai bahwa grup ini baru saja berhasil dieksekusi (dipanggil dari script luar)
    async function markGroupAsDone(groupName) {
        if (!groupName) return;
        let storage = await GM.getValue("BOT_GROUP_STATUS", {});
        storage[groupName] = {
            status: true,
            timestamp: Math.floor(Date.now() / 1000)
        };
        await GM.setValue("BOT_GROUP_STATUS", storage);
        console.log(`%c[Bot] Status Grup "${groupName}" dikunci (TRUE) selama 1 menit ke depan!`, "color: #00ff00; font-weight: bold;");
    }

    // ==========================================================================================
    // AUTO-UPDATE NAMA GRUP & KOMENTAR (Berjalan otomatis di background)
    // ==========================================================================================
    function autoUpdateGroupAndComment() {
        let fallbackGroupName = null;
        try {
            let href = window.location.href;
            let isGroupUrl = href.includes('/groups/');
            // Cek apakah ini halaman sub-menu grup (seperti profil user di dalam grup, tab member, dll)
            // Di halaman ini, H1 dan Title berubah menjadi nama orang, bukan nama grup!
            let isSubPage = href.match(/\/groups\/[^\/]+\/(user|members|about|media|files)/);
            let isMainGroupPage = isGroupUrl && !isSubPage;

            if (isMainGroupPage) {
                // PRIORITAS 1 (KHUSUS BERANDA GRUP): Ekstrak langsung dari elemen H1
                let h1 = document.querySelector('h1');
                if (h1 && h1.innerText) {
                    fallbackGroupName = h1.innerText.trim();
                }

                // PRIORITAS 2 (KHUSUS BERANDA GRUP): Ekstrak dari Title Tab Browser
                if (!fallbackGroupName || fallbackGroupName === "") {
                    let docTitle = document.title || "";
                    // Buang angka notif misal "(3) " atau "(20+) "
                    docTitle = docTitle.replace(/^\(\d+\+?\)\s*/, "");
                    if (docTitle.includes("| Facebook")) {
                        fallbackGroupName = docTitle.split("|")[0].trim();
                    } else if (docTitle.trim() !== "Facebook") {
                        fallbackGroupName = docTitle.trim();
                    }
                }
            }

            // PRIORITAS 3 (UNTUK HALAMAN PROFIL / SUB-PAGE): Ambil dari Link Postingan
            if (!fallbackGroupName || fallbackGroupName === "Facebook") {
                // Ambil ID grup dari global variable (hasil sadapan payload)
                let currentGroupId = groupID;
                if (!currentGroupId && isGroupUrl) {
                    let urlMatch = href.match(/\/groups\/(\d+)/);
                    if (urlMatch) currentGroupId = urlMatch[1];
                }

                if (currentGroupId) {
                    // Cari semua tag <a> yang menuju ke grup tersebut
                    let links = document.querySelectorAll(`a[href*="/groups/${currentGroupId}"]`);
                    for (let link of links) {
                        let href = link.getAttribute("href");
                        let text = link.innerText.trim();

                        // Validasi ketat: Href harus menuju root grup (boleh pakai parameter ?__cft__)
                        // Tapi TIDAK BOLEH menuju halaman member/user (contoh: /groups/123/members/)
                        if (href.match(new RegExp(`/groups/${currentGroupId}/?(\\?.*)?$`))) {
                            // Abaikan teks sampah buatan sistem Facebook
                            if (text && text.length > 2 && text !== "Grup Publik" && text !== "Facebook") {
                                fallbackGroupName = text;
                                break; // Ketemu! Hentikan pencarian
                            }
                        }
                    }
                }
            }
        } catch (e) { }

        let newGroupName = fallbackGroupName || "";

        // Cek secara proaktif setiap 2 detik. Update variabel global jika ada perubahan nama grup ATAU komentar belum terisi.
        if (newGroupName && (newGroupName !== bot_GlobalGroupName || !bot_GlobalBotComment)) {
            bot_GlobalBotComment = null;

            if (listComments.length > 0) {
                let gNameNormalized = normalizeToBasicLatin(newGroupName).toLowerCase();
                for (let c of listComments) {
                    if (c.group) {
                        let keyword = normalizeToBasicLatin(c.group).toLowerCase().trim();
                        // Perbandingan: Apakah NAMA GRUP ASLI mengandung KEYWORD dari JSON / namagroup19?
                        if (gNameNormalized.includes(keyword)) {
                            bot_GlobalBotComment = Random(normalizeToBasicLatin(c.comment));
                            bot_GlobalGroupName = c.group; // Ganti nama grup asli dengan nama resmi dari JSON!
                            console.log(`%c[Bot] Grup terdeteksi: "${newGroupName}" -> Keyword "${keyword}" cocok! Menggunakan nama JSON: "${bot_GlobalGroupName}"`, "color:#00ff00; font-weight:bold;");
                            console.log(`%c[Bot] Komentar Disiapkan: ${bot_GlobalBotComment}`, "color:#00ffff;");

                            // Jalankan Security Pengecekan Cooldown menggunakan NAMA RESMI GRUP JSON!
                            manageGroupStorage(bot_GlobalGroupName);

                            break; // Hentikan pencarian jika sudah ketemu
                        }
                    }
                }

                if (!bot_GlobalBotComment) {
                    bot_GlobalGroupName = newGroupName;
                    console.warn(`[Bot] Nama grup terdeteksi "${bot_GlobalGroupName}", tapi TIDAK ADA KEYWORD yang cocok di JSON.`);
                }
            } else {
                bot_GlobalGroupName = newGroupName;
            }

            // HENTIKAN INTERVAL HANYA JIKA KOMENTAR & NAMA GRUP SUDAH COCOK DARI JSON / namagroup19
            if (bot_GlobalBotComment && typeof groupCheckInterval !== "undefined") {
                clearInterval(groupCheckInterval);
                console.log("%c[Bot] Interval pencarian nama grup dihentikan.", "color: #aaaaaa; font-style: italic;");
            }
        }
    }

    // Jalankan pengecekan setiap 2 detik di background agar nama grup & komentar selalu tersedia!
    let groupCheckInterval = setInterval(autoUpdateGroupAndComment, 2000);
    let RAW_PAYLOAD_DARI_FACEBOOK = "";
    let lastCapturedFuncName = "";

    // Ekstrak token sesi dari SEMUA request GraphQL (agar semua 4 FB selalu punya token segar)
    function extractSessionTokensFromBody(bodyStr) {
        if (!bodyStr || !bodyStr.includes("&")) return;
        try {
            const sp = new URLSearchParams(bodyStr);
            const setIf = (key, cur) => {
                const v = sp.get(key);
                return (v !== null && v.trim() !== "") ? v.trim() : cur;
            };
            av = setIf('av', av);
            __user = setIf('__user', __user);
            fb_dtsg = setIf('fb_dtsg', fb_dtsg);
            jazoest = setIf('jazoest', jazoest);
            __aaid = setIf('__aaid', __aaid);
            __a = setIf('__a', __a);
            __hs = setIf('__hs', __hs);
            dpr = setIf('dpr', dpr);
            __ccg = setIf('__ccg', __ccg);
            __rev = setIf('__rev', __rev);
            __s = setIf('__s', __s);
            __hsi = setIf('__hsi', __hsi);
            __dyn = setIf('__dyn', __dyn);
            __csr = setIf('__csr', __csr);
            __hsdp = setIf('__hsdp', __hsdp);
            __hblp = setIf('__hblp', __hblp);
            __sjsp = setIf('__sjsp', __sjsp);
            __comet_req = setIf('__comet_req', __comet_req);
            lsd = setIf('lsd', lsd);
            __spin_r = setIf('__spin_r', __spin_r);
            __spin_b = setIf('__spin_b', __spin_b);
            __spin_t = setIf('__spin_t', __spin_t);
            __jssesw = setIf('__jssesw', __jssesw);
            server_timestamps = setIf('server_timestamps', server_timestamps);
        } catch (e) { }
    }

    // Fungsi Pengecek Payload Universal
    function checkAndParsePayload(bodyStr) {
        if (!bodyStr || typeof bodyStr !== 'string') return;

        // SELALU ekstrak token sesi dari request GraphQL apa pun
        extractSessionTokensFromBody(bodyStr);

        let matchDocId = bodyStr.match(/doc_id=(\d+)/);
        if (matchDocId && matchDocId[1].length > 5 && bodyStr.includes("variables=")) {
            let funcName = (bodyStr.split("fb_api_req_friendly_name=")[1] || "").split("&")[0];

            // Blokir semua Mutation dan query non-feed (JoinForum, RecAffordance, Composer, Typeahead, Hovercard, dll)
            if (
                !funcName ||
                funcName.includes("Mutation") ||
                funcName.includes("Hovercard") ||
                funcName.includes("Notification") ||
                funcName.includes("Chat") ||
                funcName.includes("Typing") ||
                funcName.includes("Composer") ||
                funcName.includes("Typeahead") ||
                funcName.includes("RecAffordance") ||
                funcName.includes("Comment")
            ) {
                return;
            }

            // Filter KETAT: HANYA kunci query Feed Pagination (jangan tertimpa query groupID biasa!)
            const isFeedQuery = (
                funcName.includes("FeedPagination") ||
                funcName.includes("StoriesPagination") ||
                funcName.includes("PostsFeedPagination") ||
                funcName.includes("GroupFeedPagination") ||
                funcName === "GroupsCometFeedRegularStoriesPaginationQuery" ||
                funcName === "ProfileCometContextualProfileGroupPostsFeedPaginationQuery" ||
                (bodyStr.includes("%22feedLocation%22") && (bodyStr.includes("%22feedCursor%22") || bodyStr.includes("%22cursor%22")))
            );

            if (isFeedQuery) {
                RAW_PAYLOAD_DARI_FACEBOOK = bodyStr;

                // Mencegah console penuh (Spam). Hanya log jika jenis query berubah.
                if (funcName !== lastCapturedFuncName) {
                    console.log(`%c[Bot] 🕵️‍♂️ Radar otomatis mengunci Payload: ${funcName}`, "color: #ffaa00; font-style: italic;");
                    lastCapturedFuncName = funcName;
                }

                // Susun ulang secara diam-diam di latar belakang (tanpa log)
                parseOriginalPayload(true);
            }
        }
    }

    // Variabel Header Dinamis yang disadap otomatis dari request Facebook asli
    var capturedAsbdId = "359341";
    var capturedEntryNonce = "";
    var capturedNavChain = "";

    function captureFbHeaders(headersObj) {
        if (!headersObj) return;
        try {
            const readHeader = (name) => {
                if (typeof Headers !== 'undefined' && headersObj instanceof Headers) {
                    return headersObj.get(name);
                }
                if (Array.isArray(headersObj)) {
                    const found = headersObj.find(([k]) => k && k.toLowerCase() === name);
                    return found ? found[1] : null;
                }
                for (let k in headersObj) {
                    if (k.toLowerCase() === name) return headersObj[k];
                }
                return null;
            };
            const asbd = readHeader('x-asbd-id');
            const nonce = readHeader('x-fb-entry-nonce');
            const navChain = readHeader('x-fb-navigation-chain');
            if (asbd) capturedAsbdId = asbd;
            if (nonce) capturedEntryNonce = nonce;
            if (navChain) capturedNavChain = navChain;
        } catch (e) { }
    }

    // 1. Sadap via window.fetch
    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
        let url = args[0];
        let options = args[1];

        if (url && typeof url === 'string' && url.includes('/api/graphql/')) {
            if (options && options.headers) {
                captureFbHeaders(options.headers);
            }
            if (options && options.body) {
                let bodyStr = (typeof options.body === 'string') ? options.body :
                    (options.body instanceof URLSearchParams) ? options.body.toString() : "";
                checkAndParsePayload(bodyStr);
            }
        }
        return originalFetch.apply(this, args);
    };

    // 2. Sadap via XMLHttpRequest (XHR)
    const originalXHROpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url) {
        this._bot_url = url; // simpan url sementara
        return originalXHROpen.apply(this, arguments);
    };

    const originalXHRSetHeader = XMLHttpRequest.prototype.setRequestHeader;
    XMLHttpRequest.prototype.setRequestHeader = function (header, value) {
        if (header && typeof header === 'string') {
            const lower = header.toLowerCase();
            if (lower === 'x-asbd-id' && value) capturedAsbdId = value;
            else if (lower === 'x-fb-entry-nonce' && value) capturedEntryNonce = value;
            else if (lower === 'x-fb-navigation-chain' && value) capturedNavChain = value;
        }
        return originalXHRSetHeader.apply(this, arguments);
    };

    const originalXHRSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function (body) {
        if (this._bot_url && typeof this._bot_url === 'string' && this._bot_url.includes('/api/graphql/')) {
            if (body) {
                let bodyStr = (typeof body === 'string') ? body :
                    (body instanceof URLSearchParams) ? body.toString() : "";
                checkAndParsePayload(bodyStr);
            }
        }
        return originalXHRSend.apply(this, arguments);
    };

    // ==========================================================================================
    // DEKLARASI VARIABEL PAYLOAD (SATU PER SATU)
    // ==========================================================================================

    // --- 1. DATA TARGET & QUERY ---
    var groupID = ""; // Target Group ID
    var profileID = ""; // Target Profile ID
    var doc_id = ""; // ekstrak dari payload asli
    var fb_api_req_friendly_name = ""; // ekstrak dari payload asli
    var __crn = ""; // ekstrak dari payload asli

    // Objek ini akan menyimpan seluruh parameter JSON "variables" bawaan asli dari Payload
    var baseVariables = {};

    // --- 2. SESSION DATA BROWSER & TOKEN ---
    // (Akan otomatis terekstrak dari payload ATAU dari DOM halaman)
    var av = "";
    var __user = "";
    var fb_dtsg = ""; // Auto extract DOM
    var jazoest = ""; // Auto extract DOM

    // --- 3. DATA STATIS DEVICE / BROWSER ---
    var __aaid = ""; // ekstrak dari payload asli
    var __a = ""; // ekstrak dari payload asli
    var __req = ""; // Otomatis di-increment saat generate payload
    var __hs = ""; // ekstrak dari payload asli
    var dpr = ""; // ekstrak dari payload asli
    var __ccg = ""; // ekstrak dari payload asli
    var __rev = ""; // ekstrak dari payload asli
    var __s = ""; // Session / Tab ID dari FB.
    var __hsi = "";  // ekstrak dari payload asli
    var __dyn = ""; // ekstrak dari payload asli
    var __csr = ""; // ekstrak dari payload asli
    var __hsdp = ""; // ekstrak dari payload asli
    var __hblp = ""; // ekstrak dari payload asli
    var __sjsp = ""; // ekstrak dari payload asli
    var __comet_req = ""; // ekstrak dari payload asli
    var lsd = ""; // ekstrak dari payload asli
    var __spin_r = ""; // ekstrak dari payload asli
    var __spin_b = ""; // ekstrak dari payload asli
    var __spin_t = ""; // ekstrak dari payload asli
    var __jssesw = ""; // ekstrak dari payload asli
    var server_timestamps = ""; // ekstrak dari payload asli

    // Fitur UI Boolean ditiadakan dari script hardcode, 
    // karena kita sekarang mengambil "variables" seutuhnya dari RAW_PAYLOAD_DARI_FACEBOOK
    // agar 100% kompatibel dengan SEMUA jenis API GraphQL Facebook.



    // 1. Ekstrak data dari Text Payload Asli Facebook
    function parseOriginalPayload(isSilent = false) {
        const text = RAW_PAYLOAD_DARI_FACEBOOK.trim();
        if (!text) return;

        let parsed = {};

        // Deteksi apakah formatnya URL-encoded atau Baris-Baru / Key-Value
        if (text.includes("fb_api_req_friendly_name=") && text.includes("&")) {
            const searchParams = new URLSearchParams(text);
            for (let [key, value] of searchParams.entries()) {
                parsed[key] = value;
            }
        } else {
            const lines = text.split(/\r?\n/);
            for (let i = 0; i < lines.length; i++) {
                let line = lines[i].trim();
                if (!line) continue;

                // Jika formatnya 'Key: Value' (Copy dari tab network - Headers)
                if (line.includes(":") && !line.startsWith("{")) {
                    let parts = line.split(/:(.+)/);
                    if (parts.length > 1) {
                        parsed[parts[0].trim()] = parts[1].trim();
                        continue;
                    }
                }

                // Jika formatnya selang-seling (Key di baris atas, Value di baris bawah)
                if (i + 1 < lines.length) {
                    parsed[line] = lines[i + 1].trim();
                    i++; // Lompat ke baris key berikutnya
                }
            }
        }

        // Fungsi bantu: Assign jika valid dan tidak kosong (string kosong "" jangan ditimpa agar fallback DOM bekerja)
        const assignVar = (key, fallback) => {
            if (parsed[key] !== undefined && parsed[key].trim() !== "") return parsed[key].trim();
            return fallback;
        };

        // --- Assign nilai yang berhasil di-ekstrak ke variabel global ---
        doc_id = assignVar('doc_id', doc_id);
        fb_api_req_friendly_name = assignVar('fb_api_req_friendly_name', fb_api_req_friendly_name);
        __crn = assignVar('__crn', __crn);

        av = assignVar('av', av);
        __user = assignVar('__user', __user);
        fb_dtsg = assignVar('fb_dtsg', fb_dtsg);
        jazoest = assignVar('jazoest', jazoest);
        __aaid = assignVar('__aaid', __aaid);
        __a = assignVar('__a', __a);
        __req = assignVar('__req', __req);
        __hs = assignVar('__hs', __hs);
        dpr = assignVar('dpr', dpr);
        __ccg = assignVar('__ccg', __ccg);
        __rev = assignVar('__rev', __rev);
        __s = assignVar('__s', __s);
        __hsi = assignVar('__hsi', __hsi);
        __dyn = assignVar('__dyn', __dyn);
        __csr = assignVar('__csr', __csr);
        __hsdp = assignVar('__hsdp', __hsdp);
        __hblp = assignVar('__hblp', __hblp);
        __sjsp = assignVar('__sjsp', __sjsp);
        __comet_req = assignVar('__comet_req', __comet_req);
        lsd = assignVar('lsd', lsd);
        __spin_r = assignVar('__spin_r', __spin_r);
        __spin_b = assignVar('__spin_b', __spin_b);
        __spin_t = assignVar('__spin_t', __spin_t);
        __jssesw = assignVar('__jssesw', __jssesw);
        server_timestamps = assignVar('server_timestamps', server_timestamps);

        // --- Assign nilai spesifik dari dalam object JSON Variables ---
        if (parsed.variables) {
            try {
                baseVariables = JSON.parse(parsed.variables);

                // Cari apakah ada target ID di dalam json variables
                if (baseVariables.groupID) groupID = baseVariables.groupID;
                else if (baseVariables.id) groupID = baseVariables.id; // Di query tertentu namanya 'id'

                if (baseVariables.profileID) profileID = baseVariables.profileID;
                else if (baseVariables.memberID) profileID = baseVariables.memberID; // Di query tertentu namanya 'memberID'

            } catch (e) {
                console.warn("[Bot] Gagal mengekstrak JSON variables.");
            }
        }

        // Nilai-nilai di atas akan disimpan dan dipakai saat generate payload
        if (!isSilent) {
            console.log("[Bot] Parsing Payload Selesai. Hasil Ekstrak: ", { doc_id, __req, __hs, fb_dtsg });
        }
    }

    // 2. Ekstrak data (fb_dtsg, lsd, jazoest, __rev, __hs, dll) dari Source Halaman jika belum ada di Payload
    function autoExtractTokens() {
        try {
            const href = window.location.href;
            const gMatch = href.match(/\/groups\/(\d+)/);
            if (gMatch && gMatch[1] && !groupID) groupID = gMatch[1];

            // Ambil c_user langsung dari cookie (paling cepat & akurat)
            const cookieUser = document.cookie.match(/c_user=(\d+)/);
            if (cookieUser && cookieUser[1]) {
                if (!__user) __user = cookieUser[1];
                if (!av) av = cookieUser[1];
            }

            let html = document.documentElement.innerHTML;

            // Regex lebih kejam untuk mencari token yang tersembunyi
            let dtsgMatch = html.match(/"DTSGInitialData",\[\],{"token":"([^"]+)"/);
            if (!dtsgMatch) dtsgMatch = html.match(/"DTSGInitData",\[\],{"token":"([^"]+)"/);
            if (!dtsgMatch) dtsgMatch = html.match(/"fb_dtsg":"([^"]+)"/);
            if (!dtsgMatch) dtsgMatch = html.match(/name="fb_dtsg"\s*value="([^"]+)"/i);

            let jazoestMatch = html.match(/jazoest=(\d+)/);
            if (!jazoestMatch) jazoestMatch = html.match(/"jazoest":"(\d+)"/);
            if (!jazoestMatch) jazoestMatch = html.match(/name="jazoest"\s*value="(\d+)"/i);

            let lsdMatch = html.match(/"LSD"\s*,\s*\[\]\s*,\s*\{\s*"token"\s*:\s*"([^"]+)"\}/) ||
                html.match(/"lsd":"([^"]+)"/) ||
                html.match(/name="lsd"\s*value="([^"]+)"/i);

            let userMatch = html.match(/"ACCOUNT_ID":"(\d+)"/) || html.match(/"USER_ID":"(\d+)"/);
            let revMatch = html.match(/"client_revision":(\d+)/) || html.match(/"__spin_r":(\d+)/);
            let spinTMatch = html.match(/"__spin_t":(\d+)/);
            let spinBMatch = html.match(/"__spin_b":"([^"]+)"/);
            let hsMatch = html.match(/"haste_session":"([^"]+)"/);
            let hsiMatch = html.match(/"hsi":"(\d+)"/);

            if (dtsgMatch && !fb_dtsg) fb_dtsg = dtsgMatch[1];
            if (jazoestMatch && !jazoest) jazoest = jazoestMatch[1];
            // Fallback kalkulasi deterministik jazoest dari fb_dtsg (rumus resmi FB: "2" + sum(charCode))
            if (!jazoest && fb_dtsg) {
                let sum = 0;
                for (let i = 0; i < fb_dtsg.length; i++) sum += fb_dtsg.charCodeAt(i);
                jazoest = "2" + sum;
            }
            if (lsdMatch && !lsd) lsd = lsdMatch[1];
            if (revMatch) {
                if (!__rev) __rev = revMatch[1];
                if (!__spin_r) __spin_r = revMatch[1];
            }
            if (spinTMatch && !__spin_t) __spin_t = spinTMatch[1];
            if (spinBMatch && !__spin_b) __spin_b = spinBMatch[1];
            if (hsMatch && !__hs) __hs = hsMatch[1];
            if (hsiMatch && !__hsi) __hsi = hsiMatch[1];

            // Fallback: Jika di payload tidak ada av/__user, ambil dari DOM
            if (userMatch) {
                if (!__user) __user = userMatch[1];
                if (!av) av = userMatch[1];
            }
        } catch (e) {
            console.warn("[Bot] Gagal auto-extract token dari DOM.");
        }
    }

    // ==========================================================================================
    // URUTAN INISIALISASI
    // ==========================================================================================
    parseOriginalPayload();
    autoExtractTokens();

    // Setup untuk Auto-Increment
    let currentReqNum = parseInt(__req, 36) || 1; // Konversi __req awal (misal: "17") ke base36

    // Fitur Auto-Scroll Pancingan
    // Menggulir ke bawah secara otomatis untuk memaksa Facebook menembakkan GraphQL Feed
    function triggerAutoScroll() {
        if (!RAW_PAYLOAD_DARI_FACEBOOK) {
            console.log("%c[Bot] 🎣 Memancing Payload GraphQL dengan Auto-Scroll...", "color: #00ff00; font-weight: bold;");

            // Scroll sedikit ke bawah untuk men-trigger lazy load Facebook
            window.scrollBy({ top: 1500, behavior: 'smooth' });

            // Periksa apakah umpan berhasil dan kembalikan ke atas
            setTimeout(() => {
                if (RAW_PAYLOAD_DARI_FACEBOOK) {
                    console.log("%c[Bot] 🎣 Umpan berhasil! Radar telah mengunci target.", "color: #00ff00; font-weight: bold;");
                    updateStatusDot("#24fc03");

                    window.scrollTo({ top: 0, behavior: 'smooth' });
                } else {
                    // Coba sekali lagi jika internetnya lambat
                    window.scrollBy({ top: 1500, behavior: 'smooth' });
                    updateStatusDot("red");

                }
            }, 1500);
        }
    }

    // Jalankan pancingan 2.5 detik setelah halaman dimuat (menunggu DOM selesai render)
    setTimeout(triggerAutoScroll, 2500);

    // ==========================================================================================
    // FUNGSI UTAMA BOT 
    // ==========================================================================================

    /**
     * EKSTRAKTOR POSTINGAN (Super Cepat)
     * Akan mencari data postingan dari JSON yang rumit menjadi array of objects yang rapi.
     */
    async function extractPostsFromJson(responseData) {
        let posts = [];
        let totalParsedPosts = 0; // Pelacak jumlah postingan yang berhasil dibaca mesin
        let foundGroupName = null;
        let foundGroupId = null;
        let processedPostIds = new Set(); // Mencegah duplikasi post yang sama di-parse berkali-kali

        // Catatan: bot_GlobalGroupName dan bot_GlobalBotComment sudah di-update secara otomatis 
        // oleh fungsi `autoUpdateGroupAndComment` yang berjalan di background setiap 2 detik.

        function parseStoryNode(node) {
            // Cegah duplikasi jika post_id sama
            if (node.post_id) {
                if (processedPostIds.has(node.post_id)) return;
                processedPostIds.add(node.post_id);
            }

            let extracted = {
                post_id: node.post_id || null,
                creation_time: node.creation_time || null,
                author_name: null,
                author_id: null,
                group_name: foundGroupName || bot_GlobalGroupName, // Gunakan variabel lokal scope
                group_id: foundGroupId || groupID,
                text: null,
                url: node.url || null,
                feedback_id: node.feedback?.id || node.comet_sections?.feedback?.story?.feedback?.id || null,
                tracking: node.encrypted_tracking || node.tracking || node.comet_sections?.feedback?.story?.encrypted_tracking || null
            };

            // OPTIMASI Ekstrak Waktu Pembuatan (Terkadang Facebook menyembunyikannya dengan nama berbeda atau di cabang lain)
            if (!extracted.creation_time) {
                let qT = [node];
                while (qT.length > 0) {
                    let curr = qT.pop();
                    if (curr && typeof curr === 'object') {
                        // Mencari berbagai variasi key waktu di Facebook
                        let timeValue = curr.creation_time || curr.publish_time || curr.original_creation_time || curr.timestamp_in_sec;

                        if (timeValue && (typeof timeValue === 'number' || typeof timeValue === 'string')) {
                            // Validasi apakah angkanya masuk akal sebagai Unix Timestamp (10 digit)
                            let timeStr = timeValue.toString();
                            if (timeStr.length === 10 && !isNaN(timeStr)) {
                                extracted.creation_time = parseInt(timeStr);
                                break;
                            }
                        }
                        for (let k in curr) {
                            if (typeof curr[k] === 'object' && curr[k] !== null) qT.push(curr[k]);
                        }
                    }
                }
            }

            // Ekstrak Pembuat Postingan
            if (node.actors && node.actors.length > 0) {
                extracted.author_name = node.actors[0].name || null;
                extracted.author_id = node.actors[0].id || null;
            }

            // Ekstrak Teks Postingan (Mendukung berbagai struktur JSON FB yang super dalam)
            try {
                if (node.message && node.message.text) {
                    extracted.text = node.message.text;
                } else if (node.comet_sections?.content?.story?.comet_sections?.message?.story?.message?.text) {
                    extracted.text = node.comet_sections.content.story.comet_sections.message.story.message.text;
                } else if (node.comet_sections?.message_container?.story?.message?.text) {
                    extracted.text = node.comet_sections.message_container.story.message.text;
                } else {
                    // OPTIMASI BFS TEXT SEARCH (< 0.1ms)
                    // Pencarian teks tanpa stringify dan tanpa recursive dalam, yang akan langsung berhenti saat ketemu teks pertama
                    let q = [node.comet_sections || node];
                    while (q.length > 0) {
                        let curr = q.pop();
                        if (curr && typeof curr === 'object') {
                            if (curr.__typename === "TextWithEntities" && typeof curr.text === 'string' && curr.text.length > 0) {
                                extracted.text = curr.text;
                                break;
                            }
                            // Masukkan child ke queue
                            for (let k in curr) {
                                if (typeof curr[k] === 'object' && curr[k] !== null) q.push(curr[k]);
                            }
                        }
                    }
                }
            } catch (e) { }

            // Ekstrak URL
            if (!extracted.url) {
                extracted.url = node.url || node.comet_sections?.context_layout?.story?.url || null;
            }

            // Ekstrak ID Group dari dalam node
            if (!extracted.group_id && node.feedback?.associated_group?.id) {
                extracted.group_id = node.feedback.associated_group.id;
            }

            // Fallback Ultimate untuk URL jika Facebook tidak mengirimkannya di struktur yang kita ketahui
            if (!extracted.url && extracted.group_id && extracted.post_id) {
                extracted.url = `https://www.facebook.com/groups/${extracted.group_id}/permalink/${extracted.post_id}/`;
            }

            // ---------------------------------------------------------
            // COCOKKAN DATA DENGAN SERVER LOKAL
            // ---------------------------------------------------------

            // 1. Cek apakah Author adalah Admin
            let isInsideUserProfile = window.location.href.includes('/user/') || window.location.href.includes('profile.php');

            if (isInsideUserProfile) {
                // Jika sedang di dalam halaman Profil User, OTOMATIS set is_admin jadi true
                extracted.is_admin = true;
            } else {
                // Jika di luar profil (Beranda grup), lakukan pengecekan nama dengan keyword admin (sama seperti Core.js: isAdminFast)
                extracted.is_admin = false;
                if (extracted.author_name && listAdmins.length > 0) {
                    extracted.is_admin = isAdminFast(extracted.author_name);
                }
            }

            // 2. Terapkan Komentar yang sudah ditemukan di awal
            extracted.bot_comment = bot_GlobalBotComment;

            // 3. Cek apakah postingan baru (Kurang dari 10 menit)
            extracted.postingan_baru = false;
            if (extracted.creation_time) {
                let currentTime = Math.floor(Date.now() / 1000);
                // 600 detik = 10 menit
                if (currentTime - extracted.creation_time <= 600) {
                    extracted.postingan_baru = true;
                }
            }

            // 4. FILTERING TEKS POSTINGAN (Whitelist & Blacklist)
            let isValidPost = false;

            // Tandai bahwa bot berhasil menemukan dan membedah wujud fisik postingan ini
            if (extracted.post_id || extracted.text) {
                totalParsedPosts++;
            }

            if (extracted.text) {
                // NORMALISASI FONT & CASE-INSENSITIVE:
                // normalize("NFKD") akan membongkar font-font aneh/aesthetic di FB (Bold, Italic, dll) menjadi teks biasa
                // toLowerCase() akan mengubah semuanya menjadi huruf kecil agar "ROOM" == "room"
                let textLower = extracted.text.normalize("NFKD").toLowerCase();

                // Cek apakah mengandung setidaknya 1 kata dari List_Keyword (Whitelist)
                let hasKeyword = List_Keyword.some(kw => textLower.includes(kw.normalize("NFKD").toLowerCase()));

                // Cek apakah TIDAK mengandung kata dari List_Backlist (Blacklist)
                let hasBlacklist = List_Backlist.some(bl => textLower.includes(bl.normalize("NFKD").toLowerCase()));

                if (hasKeyword && !hasBlacklist) {
                    isValidPost = true;
                }
            }

            // 5. PENYARINGAN AKHIR (Admin & Postingan Baru)
            // Hanya masukkan jika:
            // 1. Lolos filter teks Whitelist/Blacklist (isValidPost = true)
            // 2. Author adalah Admin ATAU sedang berada di Profil User (is_admin = true)
            // 3. Postingan berumur < 10 menit (postingan_baru = true)
            if (isValidPost && extracted.is_admin && extracted.postingan_baru && (extracted.post_id || extracted.text)) {
                posts.push(extracted);
            }
        }

        // =======================================================================
        // OPTIMASI TINGKAT DEWA: BFS PRUNING TREE (Kecepatan Cahaya)
        // Kita tidak akan menelusuri isi dalam postingan (mengabaikan jutaan key tak berguna).
        // Begitu kita menemukan wadah "edges" atau "nodes", bot mem-parsingnya dan BERHENTI masuk lebih dalam!
        // =======================================================================
        function fastFindPosts(rootObj) {
            let stack = [rootObj];
            while (stack.length > 0) {
                let obj = stack.pop();
                if (!obj || typeof obj !== 'object') continue;

                // Tangkap identitas grup secara dinamis
                if (obj.__typename === "Group") {
                    if (obj.name) foundGroupName = obj.name;
                    if (obj.id) foundGroupId = obj.id;
                }
                if (obj.associated_group) {
                    if (obj.associated_group.name) foundGroupName = obj.associated_group.name;
                    if (obj.associated_group.id) foundGroupId = obj.associated_group.id;
                }

                // JIKA OBJEK INI ADALAH POSTINGAN ITU SENDIRI (Format Streaming JSON Lines) -> PARSE & CUT TREE!
                if (obj.__typename === "Story" || (obj.post_id && typeof obj.post_id === 'string' && (obj.actors || obj.comet_sections || obj.message))) {
                    parseStoryNode(obj);
                    continue; // CUT TREE!
                }

                // JIKA KETEMU ARRAY POSTINGAN -> PARSE SEMUA & CUT TREE!
                if (Array.isArray(obj.edges)) {
                    for (let i = 0; i < obj.edges.length; i++) {
                        // WAJIB langsung gunakan .node sebagai root agar post_id, creation_time, dan actors tidak hilang!
                        let st = obj.edges[i].node;
                        if (st) parseStoryNode(st);
                    }
                    continue; // CUT TREE! Abaikan ribuan child object di dalam edges
                }
                if (Array.isArray(obj.nodes)) {
                    for (let i = 0; i < obj.nodes.length; i++) {
                        let st = obj.nodes[i];
                        if (st) parseStoryNode(st);
                    }
                    continue; // CUT TREE!
                }

                if (Array.isArray(obj)) {
                    for (let i = 0; i < obj.length; i++) {
                        if (typeof obj[i] === 'object' && obj[i] !== null) stack.push(obj[i]);
                    }
                    continue;
                }

                for (let key in obj) {
                    if (typeof obj[key] === 'object' && obj[key] !== null) stack.push(obj[key]);
                }
            }
        }

        // Jalankan pencarian ultra cepat
        fastFindPosts(responseData);

        // Pendaftaran Grup Dinamis (Menggunakan Nama Grup Final yang sudah divalidasi JSON)
        setTimeout(async () => {
            let storage = await GM.getValue("BOT_GROUP_STATUS", {});
            let changed = false;
            let finalGroupName = bot_GlobalGroupName || foundGroupName;
            if (finalGroupName && !storage[finalGroupName]) {
                storage[finalGroupName] = { status: false, timestamp: Date.now() / 1000 };
                changed = true;
            }
            if (changed) await GM.setValue("BOT_GROUP_STATUS", storage);
        }, 100);

        // Cek Status Grup (Double Check sebelum melempar data ke script luar)
        let storage = await GM.getValue("BOT_GROUP_STATUS", {});
        let currentName = bot_GlobalGroupName || foundGroupName;
        let gData = currentName ? storage[currentName] : null;
        if (gData && gData.status && (Date.now() / 1000 - gData.timestamp < 60)) {
            console.warn(`[Bot] Grup "${currentName}" sudah diproses (cooldown). Redirecting...`);
            window.location.href = "about:blank";
            return [];
        }

        // Finalisasi: Pastikan group ID dan Group Name terisi untuk setiap postingan
        posts.forEach(p => {
            if (!p.group_name) {
                p.group_name = foundGroupName || bot_GlobalGroupName || "Nama Grup Tidak Tersedia";
            }
            if (!p.group_id && foundGroupId) {
                p.group_id = foundGroupId;
            }
        });

        posts.totalParsed = totalParsedPosts;
        return posts;
    }

    /**
     * GENERATOR PAYLOAD CEPAT (< 5ms)
     */
    function generateFastPayload() {
        // 1. Auto Increment __req (Format Base36 FB: 17, 18, 19, 1a, 1b...)
        const currentReqStr = (currentReqNum++).toString(36);

        // 2. Suntikkan nilai Target ID dinamis yang baru ke dalam baseVariables (jika ada)
        if (baseVariables.groupID !== undefined) baseVariables.groupID = groupID;
        if (baseVariables.id !== undefined) baseVariables.id = groupID;

        if (baseVariables.profileID !== undefined) baseVariables.profileID = profileID;
        if (baseVariables.memberID !== undefined) baseVariables.memberID = profileID;

        if (baseVariables.contextualProfileContext) {
            baseVariables.contextualProfileContext.associated_context_id = groupID;
        }

        // PAKSA FACEBOOK MENGIRIM 10 POSTINGAN SEKALIGUS (BUKAN 1)
        // Hapus `feedCursor` atau `cursor` agar Facebook tidak mengembalikan postingan lama!
        // Tanpa cursor, Facebook akan selalu mengembalikan POSTINGAN TERBARU (Halaman 1)
        delete baseVariables.feedCursor;
        delete baseVariables.cursor;

        if (baseVariables.postsToLoad !== undefined) {
            baseVariables.postsToLoad = 5;
        }

        const variablesStr = encodeURIComponent(JSON.stringify(baseVariables));

        // 3. Return gabungan utuh dengan fb_dtsg dan jazoest segar!
        return `av=${av}&__aaid=${__aaid || "0"}&__user=${__user}&__a=${__a || "1"}&__req=${currentReqStr}&__hs=${encodeURIComponent(__hs)}&dpr=${dpr || "1"}&__ccg=${__ccg || "EXCELLENT"}&__rev=${__rev}&__s=${encodeURIComponent(__s)}&__hsi=${__hsi}&__dyn=${__dyn}&__csr=${__csr}&__hsdp=${__hsdp}&__hblp=${__hblp}&__sjsp=${__sjsp}&__comet_req=${__comet_req || "15"}&fb_dtsg=${encodeURIComponent(fb_dtsg)}&jazoest=${jazoest}&lsd=${encodeURIComponent(lsd)}&__spin_r=${__spin_r}&__spin_b=${__spin_b || "trunk"}&__spin_t=${__spin_t}${__jssesw ? `&__jssesw=${__jssesw}` : ""}&__crn=${encodeURIComponent(__crn)}&fb_api_caller_class=RelayModern&fb_api_req_friendly_name=${fb_api_req_friendly_name}&server_timestamps=${server_timestamps || "true"}&variables=${variablesStr}&doc_id=${doc_id}`;
    }

    /**
     * EKSEKUSI FETCH
     */
    async function doFetchAction() {
        const bodyPayload = generateFastPayload();

        // Cek keamanan token sebelum kirim
        if (!fb_dtsg || !jazoest) {
            console.error("[Bot Error] fb_dtsg atau jazoest kosong! Facebook akan menolak request (Error 1357004).");
        }

        try {
            const fetchHeaders = {
                "accept": "*/*",
                "content-type": "application/x-www-form-urlencoded",
                "x-asbd-id": capturedAsbdId || "359341",
                "x-fb-friendly-name": fb_api_req_friendly_name,
                "x-fb-lsd": lsd
            };
            if (capturedEntryNonce) fetchHeaders["x-fb-entry-nonce"] = capturedEntryNonce;
            if (capturedNavChain) fetchHeaders["x-fb-navigation-chain"] = capturedNavChain;

            const response = await fetch("https://www.facebook.com/api/graphql/", {
                method: "POST",
                headers: fetchHeaders,
                body: bodyPayload
            });

            // Facebook selalu merespons dengan prefix "for (;;);" untuk mencegah JSON Hijacking.
            // Kita harus membacanya sebagai text dulu, memotong prefix tersebut, baru di-parse.
            const rawText = await response.text();
            const cleanText = rawText.replace("for (;;);", "").trim();

            // Facebook kadang merespons dengan format JSON Lines (beberapa JSON dipisah baris baru)
            // Terutama untuk Query yang berat / menggunakan fitur @defer atau @stream
            const lines = cleanText.split(/\r?\n/);
            const results = [];

            for (let line of lines) {
                if (line.trim() !== "") {
                    try {
                        results.push(JSON.parse(line));
                    } catch (err) {
                        console.warn("[Bot] Abaikan baris invalid JSON:", line.substring(0, 50) + "...");
                    }
                }
            }

            // Kembalikan 1 objek jika cuma ada 1 balasan, atau Array jika ada banyak balasan (streaming)
            return results.length === 1 ? results[0] : results;
        } catch (error) {
            console.error("[Bot] Terjadi kesalahan saat operasi:", error);
            return null;
        }
    }

    /**
     * FUNGSI KIRIM KOMENTAR SUPER CEPAT (< 5ms)
     * Disesuaikan 100% dengan capture manual useCometUFICreateCommentMutation terbaru
     * + Auto-Fallback jika terkena code 1446013 (pfbid lintas-akun / replikasi post baru)
     */
    async function sendKomentar(feedbackId, customGroupId = groupID, customCommentText = bot_GlobalBotComment, customTracking = null, postId = null, fallbackFeedbackId = null, attempt = 0) {
        if (KomentDone) {
            console.log("[Bot] Komentar sudah terkirim!");
            return;
        }
        if (!customCommentText) {
            customCommentText = bot_GlobalBotComment;
        }
        if (!feedbackId || !customCommentText) {
            console.error("[Bot] Parameter feedbackId atau commentText kosong!", { feedbackId, customCommentText });
            return null;
        }

        // Pastikan token sesi (fb_dtsg, jazoest, lsd, __user, __rev, __hs) selalu terisi meskipun tab ini belum sempat auto-scroll
        if (!fb_dtsg || !jazoest || !lsd || !__user || !av) {
            autoExtractTokens();
        }

        // Cek anti-double PER AKUN FB (hanya pada attempt pertama; retry dari tab yang sama tetap diizinkan karena pemilik lock sama)
        const lockKeyId = postId || feedbackId;
        if (!isWinnerTab(lockKeyId)) {
            KomentDone = true;
            console.warn("🛑 [Anti-Double] Tab lain dengan akun FB yang sama sudah menembak komentar! Membatalkan tab ini...");
            location.href = "about:blank";
            return null;
        }

        KomentDone = true;

        let isProfile = window.location.href.includes('/user/') || window.location.href.includes('profile.php');
        let finalGroupId = customGroupId || groupID;

        const generateUUID = () => {
            if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        };
        console.log("Mengirim komentar", "#f1e906ff");

        const navChain = capturedNavChain || (isProfile
            ? `ProfileCometContextualProfileRoot.react,comet.profile.contextual_profile,via_cold_start,${Date.now()},${Math.floor(100000 + Math.random() * 899999)},,,`
            : `CometGroupDiscussionRoot.react,comet.group,via_cold_start,${Date.now()},${Math.floor(100000 + Math.random() * 899999)},2361831622,,`);

        const trackingArr = [];
        if (customTracking && typeof customTracking === 'string') {
            trackingArr.push(customTracking);
        }
        trackingArr.push(JSON.stringify({
            "assistant_caller": "comet_above_composer",
            "conversation_guide_session_id": null,
            "conversation_guide_shown": null
        }));

        let commentVariables = {
            "feedLocation": isProfile ? "GROUP_MEMBER_BIO_FEED" : "GROUP",
            "feedbackSource": isProfile ? 1 : 0,
            "groupID": finalGroupId,
            "input": {
                "actor_id": __user,
                "client_mutation_id": Math.floor(Math.random() * 9 + 1).toString(),
                "attachments": null,
                "feedback_id": feedbackId,
                "formatting_style": null,
                "is_inline_vote_enabled_for_qna": false,
                "message": {
                    "ranges": [],
                    "text": customCommentText
                },
                "attribution_id_v2": navChain,
                "vod_video_timestamp": null,
                "is_tracking_encrypted": true,
                "tracking": trackingArr,
                "feedback_source": isProfile ? "NEWS_FEED" : "PROFILE",
                "idempotence_token": "client:" + generateUUID(),
                "session_id": generateUUID()
            },
            "inviteShortLinkKey": null,
            "renderLocation": null,
            "scale": 1,
            "useDefaultActor": false,
            "focusCommentID": null,
            "translationType": "AUTO_TRANSLATE",
            "canUseNicknameOnComet": false,
            "__relay_internal__pv__groups_comet_use_glvrelayprovider": false,
            "__relay_internal__pv__CometUFICommentActionLinksRewriteEnabledrelayprovider": true,
            "__relay_internal__pv__IsWorkUserrelayprovider": false,
            "__relay_internal__pv__CometUFICommentAvatarStickerAnimatedImagerelayprovider": false,
            "__relay_internal__pv__CometUFICommentActionLinkStableIDsrelayprovider": false,
            "__relay_internal__pv__CometUFICommentAutoTranslationTyperelayprovider": "AUTO_TRANSLATE"
        };

        const currentReqStr = (currentReqNum++).toString(36);
        const variablesStr = encodeURIComponent(JSON.stringify(commentVariables));
        const commentDocId = "29145340888419828"; // Doc ID terbaru useCometUFICreateCommentMutation

        // Atur parameter route berdasarkan posisi saat ini
        const reqCrn = isProfile ? "comet.fbweb.CometContextualProfileRoute" : "comet.fbweb.CometGroupDiscussionRoute";

        const bodyPayload = `av=${av}&__aaid=${__aaid || "0"}&__user=${__user}&__a=${__a || "1"}&__req=${currentReqStr}&__hs=${encodeURIComponent(__hs)}&dpr=${dpr || "1"}&__ccg=${__ccg || "EXCELLENT"}&__rev=${__rev}&__s=${encodeURIComponent(__s)}&__hsi=${__hsi}&__dyn=${__dyn}&__csr=${__csr}&__hsdp=${__hsdp}&__hblp=${__hblp}&__sjsp=${__sjsp}&__comet_req=${__comet_req || "15"}&fb_dtsg=${encodeURIComponent(fb_dtsg)}&jazoest=${jazoest}&lsd=${encodeURIComponent(lsd)}&__spin_r=${__spin_r}&__spin_b=${__spin_b || "trunk"}&__spin_t=${__spin_t}${__jssesw ? `&__jssesw=${__jssesw}` : ""}&__crn=${encodeURIComponent(reqCrn)}&fb_api_caller_class=RelayModern&fb_api_req_friendly_name=useCometUFICreateCommentMutation&server_timestamps=true&variables=${variablesStr}&doc_id=${commentDocId}`;

        const commentHeaders = {
            "accept": "*/*",
            "content-type": "application/x-www-form-urlencoded",
            "x-asbd-id": capturedAsbdId || "359341",
            "x-fb-friendly-name": "useCometUFICreateCommentMutation",
            "x-fb-lsd": lsd,
            "x-fb-navigation-chain": navChain
        };
        if (capturedEntryNonce) {
            commentHeaders["x-fb-entry-nonce"] = capturedEntryNonce;
        }

        try {
            console.log(`%c[Bot] 💬 Mengirim komentar: "${customCommentText}"`, "color: #00ffff;");
            updateKomentarUI("⏳ Sedang Mengirim...", "yellow");
            const response = await fetch("https://www.facebook.com/api/graphql/", {
                method: "POST",
                headers: commentHeaders,
                body: bodyPayload
            });
            const text = await response.text();
            const cleanResp = text.replace(/^for\s*\(;;\);/, "").trim();
            let hasError = false;
            let errorCode = null;
            try {
                const firstLine = cleanResp.split(/\r?\n/)[0];
                const parsedResp = JSON.parse(firstLine);
                if (parsedResp && parsedResp.errors && parsedResp.errors.length > 0) {
                    hasError = true;
                    const err0 = parsedResp.errors[0];
                    errorCode = err0.code;
                    console.error(`[Bot] ❌ Facebook menolak komentar (code ${err0.code}): ${err0.summary || err0.message}`, parsedResp.errors);
                }
            } catch (parseErr) { }

            if (hasError) {
                // AUTO-RETRY KHUSUS CODE 1446013 (postingan baru < 1 detik belum selesai replikasi di shard server akun ini)
                if (errorCode === 1446013 && attempt < 3) {
                    const retryDelay = attempt === 0 ? 700 : (attempt === 1 ? 1500 : 2500);
                    console.warn(`🔄 [Bot Auto-Retry] Code 1446013 terdeteksi (percobaan #${attempt + 1}/3). Menunggu ${retryDelay}ms agar shard FB sinkron lalu tembak ulang...`);
                    KomentDone = false;
                    await new Promise(r => setTimeout(r, retryDelay));

                    // Pada percobaan ke-2+, coba Self-Fetch feed akun ini sendiri agar mendapat feedback_id & tracking segar
                    if (attempt >= 1 && doc_id && Object.keys(baseVariables).length > 0) {
                        const selfRaw = await doFetchAction();
                        if (selfRaw) {
                            const selfPosts = await extractPostsFromJson(selfRaw);
                            if (selfPosts && selfPosts.length > 0) {
                                const ownPost = selfPosts.find(p => postId && String(p.post_id) === String(postId)) || selfPosts[0];
                                if (ownPost && ownPost.feedback_id) {
                                    console.log(`🎯 [Bot Auto-Retry] Self-Fetch berhasil mendapat post! Menembak ulang...`);
                                    return sendKomentar(ownPost.feedback_id, ownPost.group_id || finalGroupId, customCommentText, ownPost.tracking, ownPost.post_id, null, attempt + 1);
                                }
                            }
                        }
                    }

                    // Coba tembak ulang dengan feedback_id (pfbid) yang sama setelah delay replikasi
                    return sendKomentar(feedbackId, finalGroupId, customCommentText, customTracking, postId, null, attempt + 1);
                }

                updateKomentarUI("", "red");
                return text;
            }

            console.log("%c[Bot] ✅ Respon Komentar Diterima!", "color: #00ff00;");
            console.log("Berhasil", "#00ff04ff");
            updateKomentarUI("", "#00ff00"); // Ubah indikator jadi Hijau!

            // Catat di storage (GM_setValue) agar grup ini tidak dikomentari lagi selama 1 menit!
            if (bot_GlobalGroupName) {
                await markGroupAsDone(bot_GlobalGroupName);
            }
            setTimeout(() => {
                location.href = "about:blank";
            }, 10000);

            return text;
        } catch (e) {
            console.error("[Bot] Gagal komentar:", e);
            updateKomentarUI("", "red"); // Ubah indikator jadi Merah!
            return null;
        }


    }

    // ==========================================================================================
    // SISTEM PEMICU AMAN (ANTI-DETEKSI)
    // ==========================================================================================
    // Menghapus penggunaan 'window' agar variabel bot tidak bisa dideteksi oleh sistem keamanan Facebook.
    // Semua fungsi sekarang terkurung aman di dalam Closure (IIFE).

    // Fungsi ini tidak diekspos ke window, sehingga 100% siluman.
    // Anda bisa memanggil fungsi ini dari dalam script ini (misalnya dengan interval atau trigger lain).
    function getFacebookName() {
        var targetId = "";

        const html = document.documentElement.innerHTML;

        // 1. Coba ambil dari Cookie (Paling Akurat)
        const matchCookie = document.cookie.match(/c_user=(\d+)/);
        if (matchCookie && matchCookie[1]) {
            targetId = matchCookie[1];
        } else {
            // 2. Fallback: Cari dari variabel global di dalam HTML script
            const matchHtml = html.match(/"(?:USER_ID|ACCOUNT_ID|actorID)":"?(\d+)"?/);
            if (matchHtml && matchHtml[1]) {
                targetId = matchHtml[1];
            }
        }

        if (targetId) {
            console.log(`%c[Otomatis] Berhasil menemukan User ID: ${targetId}`, 'color: #00ff00; font-weight: bold; font-size: 16px;');
        } else {
            console.warn("[Script] Tidak bisa menemukan User ID di halaman ini.");
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
    const mineFacebookPosts = async function () {
        let isLooping = true;


        let nama_FB_Global = await getFacebookName();
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
                [Comment19]: nama_FB_Global
            }
        });

        let waitPayloadTicks = 0;
        while (isLooping && !KomentDone) {
            // CEK KEAMANAN: Jangan eksekusi jika payload belum tertangkap!
            if (!doc_id || Object.keys(baseVariables).length === 0) {
                waitPayloadTicks++;
                console.warn("%c[Bot] ⚠️ Payload belum tertangkap! Menunggu auto-scroll menyelesaikan tugasnya...", "color: #ff5555; font-size: 14px; font-weight: bold;");
                updateStatusDot("red");
                // Retry pancingan auto-scroll setiap 3 detik agar tab background/lambat tidak macet
                if (waitPayloadTicks % 3 === 0) {
                    window.scrollBy({ top: 1500, behavior: 'smooth' });
                }
                await new Promise(resolve => setTimeout(resolve, 1000)); // Tunggu 1 detik sebelum cek lagi
                continue;
            }
            if (KomentDone) break;
            updateStatusDot("yellow");

            try {
                // 1. Jalankan Fetch
                let t0 = performance.now();
                let hasil = await doFetchAction();
                if (KomentDone) break;
                if (!hasil) {
                    updateStatusDot("red");
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    continue;
                }
                let t1 = performance.now();

                // 2. Ekstrak Data
                let t2 = performance.now();
                let semuaPostingan = await extractPostsFromJson(hasil);
                if (KomentDone) break;
                let t3 = performance.now();

                updateStatusDot("#24fc03");

                // 3. Broadcast instan ke FB lain + tembak komentar SEBELUM logging console
                if (semuaPostingan.length > 0) {
                    const targetPost = semuaPostingan[0];
                    const broadcastGroupName = bot_GlobalGroupName || targetPost.group_name;
                    const broadcastGroupId = targetPost.group_id || groupID;

                    kirimSocket(broadcastGroupName, targetPost.feedback_id, broadcastGroupId, targetPost.post_id);
                    sendKomentar(targetPost.feedback_id, broadcastGroupId, bot_GlobalBotComment, targetPost.tracking, targetPost.post_id);

                    console.log(`%c[Bot] Ekstraksi Selesai! Membedah ${semuaPostingan.totalParsed || semuaPostingan.length} postingan, ${semuaPostingan.length} lolos filter.`, "color: #00ff00; font-weight: bold;");
                    console.table(semuaPostingan);

                    // Laporan Kecepatan (Waktu Eksekusi)
                    console.log(`%c[Bot] 🚀 Laporan Kecepatan Eksekusi:`, "color: #ffff00; font-weight: bold;");
                    console.log(`   - Waktu Tunggu Server (Network) : ${(t1 - t0).toFixed(2)} ms`);
                    console.log(`   - Waktu Ekstraksi JSON (Parsing): ${(t3 - t2).toFixed(2)} ms`);

                    return semuaPostingan; // Berhasil! Return array dan loop otomatis berhenti
                } else {
                    console.log("[Bot] Belum ada postingan yang lolos filter. Mencari ulang dalam 0.5 detik...");
                    await new Promise(resolve => setTimeout(resolve, 500)); // Jeda agar tidak spam server
                    continue; // Ulangi loop
                }

            } catch (error) {
                console.error("[Bot] Terjadi kesalahan saat operasi:", error);
                updateStatusDot("red");
                await new Promise(resolve => setTimeout(resolve, 2000)); // Jeda lebih lama jika error
            }
        }
    }

    mineFacebookPosts()
};
