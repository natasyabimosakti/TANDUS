
window.initBabonLogic = function (namagroup19, Comment19) {

    'use strict';
    let socket = null;
    var KomentDone = false;
    const CEK_KONEKSI_SETIAP = 3000; // Patroli setiap 3 detik (3000 ms)

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
        // BAGIAN PENERIMA (RECEIVER)
        // ==========================================
        socket.onmessage = function (event) {
            updateActivityUI("⬇️ Menerima Pesan...", "#00ffff");
            const rawMessage = event.data;

            let data = {};
            let lines = rawMessage.split('\n');

            lines.forEach(line => {
                if (line.trim() === "") return;
                let parts = line.split(':');
                if (parts.length >= 2) {
                    let key = parts.shift().trim();
                    let value = parts.join(':').trim();
                    data[key] = value;
                }
            });

            if (data["Group"] == bot_GlobalGroupName && data["Feedback_Id"] && data["Group_Id"]) {
                sendKomentar(data["Feedback_Id"], data["Group_Id"]);
                console.log(`✅ [Socket] Variabel berhasil diekstrak!`);
                console.log(`➡️ Nama Grup   : ${data["Group"]}`);
                console.log(`➡️ Feedback ID : ${data["Feedback_Id"]}`);
                console.log(`➡️ Group ID    : ${data["Group_Id"]}`);

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


    function kirimSocket(namaGrup, idFeedback, idGrup) {
        if (socket && socket.readyState === WebSocket.OPEN) {
            updateActivityUI("⬆️ Mengirim Pesan...", "#ffff00");
            const pesanTeks = `Group: ${namaGrup}\nFeedback_Id: ${idFeedback}\nGroup_Id: ${idGrup}`;
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


    // Mengambil data dari localhost ketika bot pertama kali dimuat
    function fetchDataLokal() {
        // 1. Ambil Data Admin
        GM_xmlhttpRequest({
            method: "GET",
            url: "http://127.0.0.1:8080/admin_group_baru.json",
            onload: function (response) {
                try {
                    let data = JSON.parse(response.responseText);
                    if (data.admins && Array.isArray(data.admins)) {
                        listAdmins = data.admins;
                        console.log("%c[Bot] Berhasil memuat " + listAdmins.length + " data admin dari server lokal.", "color: #00ff00;");
                    }
                } catch (e) {
                    console.error("[Bot] Gagal parse JSON Admin Lokal:", e);
                }
            }
        });

        // 2. Ambil Data Komentar berdasarkan NAMESCRIPT
        GM_xmlhttpRequest({
            method: "GET",
            url: URLGROUP,
            onload: async function (response) {
                try {
                    listComments = JSON.parse(response.responseText);
                    console.log("%c[Bot] Berhasil memuat " + listComments.length + " template komentar dari server lokal.", "color: #00ff00;");

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
                } catch (e) {
                    console.error("[Bot] Gagal parse JSON Komentar Lokal:", e);
                }
            }
        });
    }

    fetchDataLokal();

    // ==========================================================================================
    // SISTEM MANAJEMEN STATUS GRUP (Antri & Cegah Spam)
    // ==========================================================================================
    async function manageGroupStorage(groupName) {
        if (!groupName) return;

        let storage = await GM.getValue("BOT_GROUP_STATUS", {});
        let currentTime = Math.floor(Date.now() / 1000);
        let isChanged = false;

        // 1. Bersihkan status grup yang sudah kadaluarsa (Lebih dari 5 menit / 300 detik)
        for (let gName in storage) {
            if (storage[gName].status === true && (currentTime - storage[gName].timestamp > 300)) {
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

        // 3. Pengecekan Blokir: Jika grup ini berstatus true dan belum 5 menit, langsung putuskan koneksi!
        if (storage[groupName].status === true) {
            let sisaWaktu = 300 - (currentTime - storage[groupName].timestamp);
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
        console.log(`%c[Bot] Status Grup "${groupName}" dikunci (TRUE) selama 5 menit ke depan!`, "color: #00ff00; font-weight: bold;");
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

        // Cek secara proaktif setiap 2 detik. Update variabel global HANYA JIKA ada perubahan nama grup.
        if (newGroupName && newGroupName !== bot_GlobalGroupName) {
            bot_GlobalBotComment = null;

            if (listComments.length > 0) {
                let gNameUpper = newGroupName.toUpperCase();
                for (let c of listComments) {
                    if (c.group) {
                        let keyword = c.group.toUpperCase().trim();
                        // Perbandingan: Apakah NAMA GRUP ASLI mengandung KEYWORD dari JSON?
                        if (gNameUpper.includes(keyword)) {
                            bot_GlobalBotComment = c.comment;
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

            // HENTIKAN INTERVAL KARENA NAMA GRUP SUDAH BERHASIL DITEMUKAN (Sesuai Permintaan)
            if (typeof groupCheckInterval !== "undefined") {
                clearInterval(groupCheckInterval);
                console.log("%c[Bot] Interval pencarian nama grup dihentikan.", "color: #aaaaaa; font-style: italic;");
            }
        }
    }

    // Jalankan pengecekan setiap 2 detik di background agar nama grup & komentar selalu tersedia!
    let groupCheckInterval = setInterval(autoUpdateGroupAndComment, 2000);
    let RAW_PAYLOAD_DARI_FACEBOOK = "";
    let lastCapturedFuncName = "";

    // Fungsi Pengecek Payload Universal
    function checkAndParsePayload(bodyStr) {
        if (!bodyStr || typeof bodyStr !== 'string') return;

        let matchDocId = bodyStr.match(/doc_id=(\d+)/);
        if (matchDocId && matchDocId[1].length > 5 && bodyStr.includes("variables=")) {
            let funcName = (bodyStr.split("fb_api_req_friendly_name=")[1] || "").split("&")[0];

            // Blokir payload yang tidak relevan (seperti Hovercard saat mouse digerakkan)
            if (funcName.includes("Hovercard") || funcName.includes("Notification") || funcName.includes("Chat") || funcName.includes("Typing")) {
                return;
            }

            // Filter ketat: Pastikan request Feed / Profile / Group
            if (bodyStr.includes("%22feedLocation%22") || bodyStr.includes("%22feedCursor%22") || bodyStr.includes("%22groupID%22") || bodyStr.includes("FeedPagination") || bodyStr.includes("ProfileCometContextualProfileGroupPostsFeedPaginationQuery")) {

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

    // 1. Sadap via window.fetch
    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
        let url = args[0];
        let options = args[1];

        if (url && typeof url === 'string' && url.includes('/api/graphql/')) {
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

    // 2. Ekstrak data (fb_dtsg, dsb) dari Source Halaman jika tidak ada di Payload
    function autoExtractTokens() {
        try {
            let html = document.documentElement.innerHTML;

            // Regex lebih kejam untuk mencari token yang tersembunyi
            let dtsgMatch = html.match(/"DTSGInitialData",\[\],{"token":"([^"]+)"/);
            if (!dtsgMatch) dtsgMatch = html.match(/"DTSGInitData",\[\],{"token":"([^"]+)"/);
            if (!dtsgMatch) dtsgMatch = html.match(/"fb_dtsg":"([^"]+)"/);
            if (!dtsgMatch) dtsgMatch = html.match(/name="fb_dtsg"\s*value="([^"]+)"/i);

            let jazoestMatch = html.match(/jazoest=([^&"]+)/);
            if (!jazoestMatch) jazoestMatch = html.match(/"jazoest":"([^"]+)"/);
            if (!jazoestMatch) jazoestMatch = html.match(/name="jazoest"\s*value="([^"]+)"/i);

            let userMatch = html.match(/"ACCOUNT_ID":"([^"]+)"/);
            if (!userMatch) userMatch = html.match(/"USER_ID":"([^"]+)"/);

            if (dtsgMatch && !fb_dtsg) fb_dtsg = dtsgMatch[1];
            if (jazoestMatch && !jazoest) jazoest = jazoestMatch[1];

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
                feedback_id: node.feedback?.id || node.comet_sections?.feedback?.story?.feedback?.id || null
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
                // Jika di luar profil (Beranda grup), lakukan pengecekan nama dengan keyword admin
                extracted.is_admin = false;
                if (extracted.author_name && listAdmins.length > 0) {
                    let authorLower = extracted.author_name.toLowerCase();

                    extracted.is_admin = listAdmins.some(adminName => {
                        let keyword = adminName.trim().toLowerCase();
                        if (keyword.length === 0) return false;

                        // KEMBALI KE METODE LAMA: Substring Match
                        // Sengaja dipakai agar keyword seperti "artha" bisa memicu "Dinda Artha Le"
                        return authorLower.includes(keyword);
                    });
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
        if (gData && gData.status && (Date.now() / 1000 - gData.timestamp < 300)) {
            console.warn(`[Bot] Grup "${currentName}" sudah diproses (cooldown). Redirecting...`);
            window.location.href = "about:blank";
            return [];
        }

        // Finalisasi: Pastikan group ID dan Group Name terisi untuk setiap postingan
        posts.forEach(p => {
            if (!p.group_name) {
                p.group_name = foundGroupName || fallbackGroupName || "Nama Grup Tidak Tersedia";
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
        return `av=${av}&__user=${__user}&__a=${__a}&__req=${currentReqStr}&__hs=${__hs}&dpr=${dpr}&__ccg=${__ccg}&__rev=${__rev}&__s=${__s}&__hsi=${__hsi}&__dyn=${__dyn}&__csr=${__csr}&__hsdp=${__hsdp}&__hblp=${__hblp}&__sjsp=${__sjsp}&__comet_req=${__comet_req}&fb_dtsg=${encodeURIComponent(fb_dtsg)}&jazoest=${jazoest}&lsd=${lsd}&__spin_r=${__spin_r}&__spin_b=${__spin_b}&__spin_t=${__spin_t}&__jssesw=${__jssesw}&__crn=${__crn}&server_timestamps=${server_timestamps}&fb_api_caller_class=RelayModern&fb_api_req_friendly_name=${fb_api_req_friendly_name}&variables=${variablesStr}&doc_id=${doc_id}`;
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
            const response = await fetch("https://www.facebook.com/api/graphql/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "X-FB-Friendly-Name": fb_api_req_friendly_name,
                    "X-ASBD-ID": "129477", // Standar ID Web Facebook
                    "X-FB-LSD": lsd // Menggunakan LSD token
                },
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
     */
    async function sendKomentar(feedbackId, customGroupId = groupID, customCommentText = bot_GlobalBotComment) {
        if (KomentDone) {
            console.log("[Bot] Komentar sudah terkirim!");
            return;
        }
        KomentDone = true;
        if (!feedbackId || !customCommentText) {
            console.error("[Bot] Parameter feedbackId atau commentText kosong!");
            return null;
        }

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

        let commentVariables = {
            "feedLocation": isProfile ? "GROUP_MEMBER_BIO_FEED" : "GROUP",
            "feedbackSource": isProfile ? 1 : 0,
            "groupID": finalGroupId,
            "input": {
                "actor_id": __user,
                "client_mutation_id": Math.round(Math.random() * 10).toString(),
                "attachments": null,
                "feedback_id": feedbackId,
                "formatting_style": null,
                "is_inline_vote_enabled_for_qna": false,
                "message": {
                    "ranges": [],
                    "text": customCommentText
                },
                "attribution_id_v2": isProfile
                    ? "ProfileCometContextualProfileRoot.react,comet.profile.contextual_profile,via_cold_start,1787636995385,195908,,,"
                    : "CometGroupDiscussionRoot.react,comet.group,via_cold_start,1787636170888,950762,2361831622,,",
                "vod_video_timestamp": null,
                "is_tracking_encrypted": true,
                "tracking": [],
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
            "__relay_internal__pv__CometUFICommentAvatarStickerAnimatedImagerelayprovider": false,
            "__relay_internal__pv__IsWorkUserrelayprovider": false,
            "__relay_internal__pv__CometUFICommentAutoTranslationTyperelayprovider": "AUTO_TRANSLATE"
        };

        const currentReqStr = (currentReqNum++).toString(36);
        const variablesStr = encodeURIComponent(JSON.stringify(commentVariables));
        const commentDocId = "27687311557628355"; // Standar ID Doc untuk CreateCommentMutation

        // Atur parameter route berdasarkan posisi saat ini
        const reqCrn = isProfile ? "comet.fbweb.CometContextualProfileRoute" : "comet.fbweb.CometGroupDiscussionRoute";

        const bodyPayload = `av=${av}&__user=${__user}&__a=${__a}&__req=${currentReqStr}&__hs=${__hs}&dpr=${dpr}&__ccg=${__ccg}&__rev=${__rev}&__s=${__s}&__hsi=${__hsi}&__dyn=${__dyn}&__csr=${__csr}&__hsdp=${__hsdp}&__hblp=${__hblp}&__sjsp=${__sjsp}&__comet_req=${__comet_req}&fb_dtsg=${encodeURIComponent(fb_dtsg)}&jazoest=${jazoest}&lsd=${lsd}&__spin_r=${__spin_r}&__spin_b=${__spin_b}&__spin_t=${__spin_t}&__jssesw=${__jssesw}&__crn=${reqCrn}&server_timestamps=true&fb_api_caller_class=RelayModern&fb_api_req_friendly_name=useCometUFICreateCommentMutation&variables=${variablesStr}&doc_id=${commentDocId}`;
        try {
            console.log(`%c[Bot] 💬 Mengirim komentar: "${customCommentText}"`, "color: #00ffff;");
            updateKomentarUI("⏳ Sedang Mengirim...", "yellow");
            const response = await fetch("https://www.facebook.com/api/graphql/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "X-FB-Friendly-Name": "useCometUFICreateCommentMutation",
                    "X-ASBD-ID": "129477",
                    "X-FB-LSD": lsd
                },
                body: bodyPayload
            });
            const text = await response.text();
            console.log("%c[Bot] ✅ Respon Komentar Diterima!", "color: #00ff00;");
            console.log("Berhasil", "#00ff04ff");
            updateKomentarUI("", "#00ff00"); // Ubah indikator jadi Hijau!

            // Catat di storage (GM_setValue) agar grup ini tidak dikomentari lagi selama 5 menit!
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

        while (isLooping) {
            // CEK KEAMANAN: Jangan eksekusi jika payload belum tertangkap!
            if (!doc_id || Object.keys(baseVariables).length === 0) {
                console.warn("%c[Bot] ⚠️ Payload belum tertangkap! Menunggu auto-scroll menyelesaikan tugasnya...", "color: #ff5555; font-size: 14px; font-weight: bold;");
                updateStatusDot("red");
                await new Promise(resolve => setTimeout(resolve, 1000)); // Tunggu 1 detik sebelum cek lagi
                continue;
            }
            updateStatusDot("yellow");

            try {
                // 1. Jalankan Fetch
                let t0 = performance.now();
                let hasil = await doFetchAction();
                if (!hasil) {
                    updateStatusDot("red");
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    continue;
                }
                let t1 = performance.now();

                // 2. Ekstrak Data
                let t2 = performance.now();
                let semuaPostingan = await extractPostsFromJson(hasil);
                let t3 = performance.now();

                updateStatusDot("#24fc03");

                // 3. Tampilkan di Console
                if (semuaPostingan.length > 0) {
                    console.log(`%c[Bot] Ekstraksi Selesai! Membedah ${semuaPostingan.totalParsed || semuaPostingan.length} postingan, ${semuaPostingan.length} lolos filter.`, "color: #00ff00; font-weight: bold;");
                    console.table(semuaPostingan);
                    kirimSocket(semuaPostingan[0].group_name, semuaPostingan[0].feedback_id, semuaPostingan[0].group_id);
                    sendKomentar(semuaPostingan[0].feedback_id, semuaPostingan[0].group_id);

                    // Laporan Kecepatan (Waktu Eksekusi)
                    console.log(`%c[Bot] 🚀 Laporan Kecepatan Eksekusi:`, "color: #ffff00; font-weight: bold;");
                    console.log(`   - Waktu Tunggu Server (Network) : ${(t1 - t0).toFixed(2)} ms`);
                    console.log(`   - Waktu Ekstraksi JSON (Parsing): ${(t3 - t2).toFixed(2)} ms`);

                    return semuaPostingan; // Berhasil! Return array dan loop otomatis berhenti
                } else {
                    console.log("[Bot] Belum ada postingan yang lolos filter. Mencari ulang dalam 0.5 detik...");
                    await new Promise(resolve => setTimeout(resolve, 500)); // Jeda 1 detik agar tidak spam server
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
