// ==========================================
// 1. PEMBOLEH UBAH GLOBAL & STATUS
// ==========================================
let API_KEY = localStorage.getItem('gemini_api_key');
let GEMINI_URL = "";
let databaseBab = [];
let babAktif = "";
let babAktifId = "";
let perkataanFasa4 = "كَتَبَ";

let skorKuizSemasa = 0;
let jumlahSoalanDijawab = 0;
let kuizSemasaCache = [];

// ==========================================
// 2. INISIALISASI & PENGURUSAN API KEY
// ==========================================
window.onload = function() {
    if (!API_KEY) {
        document.getElementById('setup-api').style.display = 'block';
    } else {
        aktifkanApp();
    }
};

function simpanKey() {
    const inputKey = document.getElementById('api-input').value.trim();
    if (inputKey.length > 20 && inputKey.startsWith('AIza')) {
        localStorage.setItem('gemini_api_key', inputKey);
        API_KEY = inputKey;
        alert("Tahniah! API Key berjaya disimpan.");
        aktifkanApp();
    } else {
        alert("Sila masukkan API Key Gemini yang sah.");
    }
}

function hapusKey() {
    localStorage.removeItem('gemini_api_key');
    location.reload();
}

function aktifkanApp() {
    document.getElementById('setup-api').style.display = 'none';
    // Model jimat kuota (500 permintaan/hari)
    GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${API_KEY}`;
    muatTurunData(); 
}

function muatTurunData() {
    fetch('data.json')
        .then(res => res.json())
        .then(data => {
            databaseBab = data.senarai_bab;
            binaMenuUtama();
        })
        .catch(err => console.error("Gagal membaca data.json:", err));
}

// Fungsi Bantuan Pembersihan Respons JSON AI
function ekstrakJSON(teksRaw) {
    const match = teksRaw.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (!match) throw new Error("Format respons AI tidak sah.");
    return JSON.parse(match[0]);
}

// ==========================================
// 3. MENU UTAMA & PENJEJAK KEMAJUAN (✅)
// ==========================================
function binaMenuUtama() {
    const bekas = document.getElementById('senarai-butang');
    bekas.innerHTML = '';
    const senaraiKategori = [...new Set(databaseBab.map(b => b.kategori || "Umum"))];
    const babSelesai = JSON.parse(localStorage.getItem('bab_selesai_list') || '[]');

    senaraiKategori.forEach(kat => {
        const kotakKategori = document.createElement('div');
        kotakKategori.style.cssText = "margin-bottom: 25px; text-align: left;";

        const tajukKat = document.createElement('h3');
        tajukKat.innerText = "📌 " + kat;
        tajukKat.style.cssText = "color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 6px; margin-bottom: 12px;";
        kotakKategori.appendChild(tajukKat);

        const gridButang = document.createElement('div');
        gridButang.style.cssText = "display: flex; flex-wrap: wrap; gap: 10px;";

        databaseBab.filter(b => (b.kategori || "Umum") === kat).forEach(bab => {
            const sudahSelesai = babSelesai.includes(bab.id);
            const btn = document.createElement('button');
            btn.innerText = (sudahSelesai ? "✅ " : "") + bab.tajuk;
            
            const warnaBg = sudahSelesai ? "#27ae60" : "#3498db";
            const borderBg = sudahSelesai ? "#1e8449" : "#2980b9";

            btn.style.cssText = `padding: 10px 14px; font-size: 0.95em; border-radius: 8px; border: 1px solid ${borderBg}; background-color: ${warnaBg}; color: white; cursor: pointer; transition: 0.2s;`;
            btn.onclick = () => paparKandungan(bab.id);
            gridButang.appendChild(btn);
        });

        kotakKategori.appendChild(gridButang);
        bekas.appendChild(kotakKategori);
    });
}

// ==========================================
// 4. FASA 1: PENERANGAN & TOPIK BERKAITAN
// ==========================================
function paparKandungan(id) {
    const bab = databaseBab.find(b => b.id === id);
    if (!bab) return;

    babAktif = bab.tajuk;
    babAktifId = bab.id;
    
    document.getElementById('section-menu').style.display = 'none';
    document.getElementById('section-fasa2').style.display = 'none';
    document.getElementById('section-fasa3').style.display = 'none';
    document.getElementById('section-fasa4').style.display = 'none';
    document.getElementById('section-kandungan').style.display = 'block';
    
    document.getElementById('tajuk-aktif').innerText = bab.tajuk;
    document.getElementById('teks-penerangan').innerText = bab.penerangan;

    // Menjana butang topik berkaitan berdasarkan array 'kaitan' dalam data.json
    const bekasKaitan = document.getElementById('butang-kaitan');
    if (bekasKaitan) {
        bekasKaitan.innerHTML = '';
        const senaraiIdKaitan = bab.kaitan || [];
        
        senaraiIdKaitan.forEach(idKaitan => {
            const babKaitan = databaseBab.find(b => b.id === idKaitan);
            if (babKaitan) {
                const btn = document.createElement('button');
                btn.innerText = babKaitan.tajuk;
                btn.style.cssText = "padding: 8px 14px; font-size: 0.85em; background-color: #4b6584; color: white; border-radius: 6px; margin: 4px; border: none; cursor: pointer;";
                btn.onclick = () => paparKandungan(babKaitan.id);
                bekasKaitan.appendChild(btn);
            }
        });
    }
}

function kembaliKeMenu() {
    document.getElementById('section-kandungan').style.display = 'none';
    document.getElementById('section-menu').style.display = 'block';
}

// ==========================================
// 5. FASA 2: CONTOH AL-QURAN & KAD I'RAB
// ==========================================
function formatPaparanFasa2(json) {
    perkataanFasa4 = json.word || "كَتَبَ";
    return `
        <div style="font-size: 2.2em; direction: rtl; text-align: center; margin-bottom: 15px; font-family: 'Amiri', 'Traditional Arabic', serif; line-height: 1.8; color: #1a252f;">
            ${json.ayat}
        </div>
        <p style="color: #2c3e50; font-size: 1.05em; margin-bottom: 8px; text-align: center;">
            <strong>Maksud:</strong> <em>"${json.terjemahan}"</em>
        </p>
        <p style="text-align: center; color: #7f8c8d; font-size: 0.9em; margin-bottom: 15px;">
            <strong>Surah:</strong> ${json.surah}
        </p>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; margin-top: 15px;">
            <div style="background: #ffffff; padding: 12px; border-radius: 8px; border-left: 4px solid #e67e22; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                <small style="color: #7f8c8d; font-weight: bold;">KALIMAH SASARAN</small>
                <div style="font-size: 1.4em; color: #d35400; font-weight: bold; direction: rtl;">${json.word}</div>
            </div>
            <div style="background: #ffffff; padding: 12px; border-radius: 8px; border-left: 4px solid #3498db; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                <small style="color: #7f8c8d; font-weight: bold;">KATA DASAR (ROOT)</small>
                <div style="font-size: 1.2em; color: #2980b9; font-weight: bold;">${json.root}</div>
            </div>
            <div style="background: #ffffff; padding: 12px; border-radius: 8px; border-left: 4px solid #9b59b6; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                <small style="color: #7f8c8d; font-weight: bold;">WAZAN / TIMBANGAN</small>
                <div style="font-size: 1.1em; color: #8e44ad; font-weight: bold;">${json.wazan}</div>
            </div>
            <div style="background: #ffffff; padding: 12px; border-radius: 8px; border-left: 4px solid #2ecc71; box-shadow: 0 2px 4px rgba(0,0,0,0.05); grid-column: span 1 / -1;">
                <small style="color: #7f8c8d; font-weight: bold;">KEDUDUKAN NAHU / FUNGSI</small>
                <div style="font-size: 1em; color: #27ae60; margin-top: 4px;">${json.function}</div>
            </div>
        </div>

        <div style="text-align: right; margin-top: 12px;">
            <button onclick="salinNotaFasa2()" style="background-color: #7f8c8d; padding: 6px 12px; font-size: 0.85em; border-radius: 5px;">📋 Salin Nota Analisis</button>
        </div>
    `;
}

function salinNotaFasa2() {
    const teks = document.getElementById('hasil-ai').innerText;
    navigator.clipboard.writeText(teks).then(() => {
        alert("Nota analisis berjaya disalin ke papan keratan (clipboard)!");
    });
}

async function pergiKeFasa2() {
    document.getElementById('section-kandungan').style.display = 'none';
    document.getElementById('section-fasa3').style.display = 'none';
    document.getElementById('section-fasa4').style.display = 'none';
    document.getElementById('section-fasa2').style.display = 'block';

    const loading = document.getElementById('loading-ai');
    const hasil = document.getElementById('hasil-ai');
    
    // Semakan Memori Tempatan (LocalStorage Cache)
    const kunciMemori = 'quran_cache_' + babAktif;
    const dataLama = localStorage.getItem(kunciMemori);

    if (dataLama) {
        loading.innerText = "";
        hasil.innerHTML = formatPaparanFasa2(JSON.parse(dataLama));
        return;
    }

    loading.innerText = "Mencari contoh dalam Al-Quran...";
    hasil.innerHTML = "";

    const prompt = `Berikan satu keratan ayat Al-Quran pendek mengandungi topik: "${babAktif}". Respon JSON SAHAJA tanpa teks lain:
{"ayat": "teks ayat berserta baris", "terjemahan": "terjemahan dalam bahasa melayu", "surah": "Nama: No Ayat", "word": "kalimah sasaran", "root": "kata dasar", "wazan": "wazan", "function": "penerangan tatabahasa"}`;

    try {
        const response = await fetch(GEMINI_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        
        if (response.status === 429) {
            throw new Error("Had seminit (15 RPM) tercapai. Sila tunggu 60 saat.");
        }

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error ? data.error.message : "Ralat API.");
        }

        const json = ekstrakJSON(data.candidates[0].content.parts[0].text);
        localStorage.setItem(kunciMemori, JSON.stringify(json));
        loading.innerText = "";
        hasil.innerHTML = formatPaparanFasa2(json);
    } catch (err) {
        loading.innerText = "Ralat: " + err.message;
    }
}

// ==========================================
// 6. FASA 3: KUIZ PINTAR & PENGIRAAN SKOR
// ==========================================
async function janaKuiz(teksAnalisis) {
    const quizContainer = document.getElementById('quiz-container');
    const loading = document.getElementById('loading-kuiz');
    const btnFasa4 = document.getElementById('btn-fasa4');
    
    document.getElementById('section-fasa2').style.display = 'none';
    document.getElementById('section-fasa3').style.display = 'block';
    quizContainer.style.display = 'none';
    if (btnFasa4) btnFasa4.style.display = 'none';

    skorKuizSemasa = 0;
    jumlahSoalanDijawab = 0;

    // Semakan cache kuiz
    const kunciCacheKuiz = 'quiz_cache_' + babAktif;
    const dataKuizTersimpan = localStorage.getItem(kunciCacheKuiz);

    if (dataKuizTersimpan) {
        kuizSemasaCache = JSON.parse(dataKuizTersimpan);
        paparSoalanKuiz(kuizSemasaCache);
        return;
    }

    loading.innerText = "AI sedang membina kuiz objektif...";

    const prompt = `Bina 3 soalan objektif dlm BM berdasarkan: ${teksAnalisis}. Respon JSON SAHAJA: [{"soalan": "...", "pilihan": ["A", "B", "C"], "jawapan": 0, "penjelasan": "..."}]`;

    try {
        const response = await fetch(GEMINI_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        if (response.status === 429) {
            throw new Error("Had seminit (15 RPM) tercapai. Sila tunggu 60 saat.");
        }

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error ? data.error.message : "Ralat API.");
        }

        const soalanArray = ekstrakJSON(data.candidates[0].content.parts[0].text);
        localStorage.setItem(kunciCacheKuiz, JSON.stringify(soalanArray));
        kuizSemasaCache = soalanArray;

        paparSoalanKuiz(soalanArray);
    } catch (err) {
        loading.innerText = "Gagal menjana kuiz: " + err.message;
    }
}

function paparSoalanKuiz(soalanArray) {
    const quizContainer = document.getElementById('quiz-container');
    const quizContent = document.getElementById('quiz-content');
    const loading = document.getElementById('loading-kuiz');
    
    loading.innerText = "";
    quizContainer.style.display = 'block';
    quizContent.innerHTML = "";

    soalanArray.forEach((s, i) => {
        const kotakSoalan = document.createElement('div');
        kotakSoalan.id = `q-${i}`;
        kotakSoalan.style.cssText = "margin-bottom: 25px; padding: 15px; background: white; border-radius: 8px; border: 1px solid #e0e0e0;";

        const tajukSoalan = document.createElement('p');
        tajukSoalan.innerHTML = `<strong>Soalan ${i + 1}:</strong> ${s.soalan}`;
        tajukSoalan.style.fontSize = "1.05em";
        kotakSoalan.appendChild(tajukSoalan);

        const bekasPilihan = document.createElement('div');
        bekasPilihan.id = `pilihan-box-${i}`;

        s.pilihan.forEach((p, pi) => {
            const btnJawapan = document.createElement('button');
            btnJawapan.innerText = p;
            btnJawapan.style.cssText = "display: block; width: 100%; text-align: left; background: #f8f9fa; color: #333; border: 1px solid #ced4da; margin: 8px 0; padding: 12px 16px; font-size: 1em; border-radius: 6px; cursor: pointer;";
            btnJawapan.onclick = () => semakJawapan(i, pi, s.jawapan, s.penjelasan, btnJawapan);
            bekasPilihan.appendChild(btnJawapan);
        });

        kotakSoalan.appendChild(bekasPilihan);

        const feedbackDiv = document.createElement('div');
        feedbackDiv.id = `fb-${i}`;
        feedbackDiv.style.cssText = "margin-top: 10px; font-weight: 500;";
        kotakSoalan.appendChild(feedbackDiv);

        quizContent.appendChild(kotakSoalan);
    });

    const kotakSkor = document.createElement('div');
    kotakSkor.id = "kotak-skor-akhir";
    kotakSkor.style.cssText = "display: none; text-align: center; padding: 15px; border-radius: 8px; margin-top: 20px;";
    quizContent.appendChild(kotakSkor);
}

function semakJawapan(soalanIndex, jawapanDipilih, jawapanBetul, penjelasan, butangDitekan) {
    const bekasPilihan = document.getElementById(`pilihan-box-${soalanIndex}`);
    const semuaButang = bekasPilihan.querySelectorAll('button');
    const fb = document.getElementById(`fb-${soalanIndex}`);

    semuaButang.forEach(b => b.disabled = true);

    if (jawapanDipilih === jawapanBetul) {
        butangDitekan.style.backgroundColor = "#d4edda";
        butangDitekan.style.borderColor = "#28a745";
        fb.innerHTML = `<span style="color: #28a745;">✅ Tepat!</span> ${penjelasan}`;
        skorKuizSemasa++;
    } else {
        butangDitekan.style.backgroundColor = "#f8d7da";
        butangDitekan.style.borderColor = "#dc3545";
        semuaButang[jawapanBetul].style.backgroundColor = "#d4edda";
        fb.innerHTML = `<span style="color: #dc3545;">❌ Kurang Tepat.</span> ${penjelasan}`;
    }

    jumlahSoalanDijawab++;

    if (jumlahSoalanDijawab === 3) {
        paparkanKeputusanKuiz();
    }
}

function paparkanKeputusanKuiz() {
    const kotakSkor = document.getElementById('kotak-skor-akhir');
    const btnFasa4 = document.getElementById('btn-fasa4');
    kotakSkor.style.display = "block";

    if (skorKuizSemasa >= 2) {
        kotakSkor.style.backgroundColor = "#e8f8f5";
        kotakSkor.style.border = "2px solid #2ecc71";
        kotakSkor.innerHTML = `
            <h3 style="color: #27ae60; margin-bottom: 5px;">🎉 Markah: ${skorKuizSemasa} / 3</h3>
            <p style="color: #2c3e50; margin: 0;">Tahniah, kefahaman anda mantap! Sila teruskan ke latihan sebutan.</p>
        `;
        if (btnFasa4) btnFasa4.style.display = 'inline-block';
    } else {
        kotakSkor.style.backgroundColor = "#fef9e7";
        kotakSkor.style.border = "2px solid #f39c12";
        kotakSkor.innerHTML = `
            <h3 style="color: #d35400; margin-bottom: 5px;">Markah: ${skorKuizSemasa} / 3</h3>
            <p style="color: #7f8c8d; margin-bottom: 10px;">Cuba lagi untuk memantapkan pemahaman konsep tatabahasa ini.</p>
            <button onclick="ulangKuiz()" style="padding: 8px 16px; background-color: #e67e22; color: white; border: none; border-radius: 6px; cursor: pointer;">🔄 Ulang Kuiz</button>
        `;
        if (btnFasa4) btnFasa4.style.display = 'none';
    }
}

function ulangKuiz() {
    skorKuizSemasa = 0;
    jumlahSoalanDijawab = 0;
    paparSoalanKuiz(kuizSemasaCache);
}

function pergiKeFasa3() {
    janaKuiz(document.getElementById('hasil-ai').innerText);
}

// ==========================================
// 7. FASA 4: SEBUTAN, AUDIO & PENYELESAIAN
// ==========================================
function pergiKeFasa4() {
    document.getElementById('section-fasa3').style.display = 'none';
    document.getElementById('section-fasa4').style.display = 'block';
    document.getElementById('fasa4-kalimah').innerText = perkataanFasa4;
    document.getElementById('status-sebutan').innerHTML = "";
}

function kembaliKeFasa3() {
    document.getElementById('section-fasa4').style.display = 'none';
    document.getElementById('section-fasa3').style.display = 'block';
}

function kembaliKeMenuUtamaDariFasa4() {
    const bab = databaseBab.find(b => b.tajuk === babAktif);
    if (bab) {
        let babSelesai = JSON.parse(localStorage.getItem('bab_selesai_list') || '[]');
        if (!babSelesai.includes(bab.id)) {
            babSelesai.push(bab.id);
            localStorage.setItem('bab_selesai_list', JSON.stringify(babSelesai));
        }
    }

    document.getElementById('section-fasa4').style.display = 'none';
    document.getElementById('section-menu').style.display = 'block';
    binaMenuUtama();
}

function dengarSebutan() {
    if (!('speechSynthesis' in window)) return alert("Sintesis audio tidak disokong oleh pelayar ini.");
    window.speechSynthesis.cancel();
    const sebutan = new SpeechSynthesisUtterance(perkataanFasa4);
    sebutan.lang = 'ar-SA';
    sebutan.rate = 0.8;
    window.speechSynthesis.speak(sebutan);
}

function mulaRakamSebutan() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const statusDiv = document.getElementById('status-sebutan');
    const btnRekod = document.getElementById('btn-rekod');

    if (!SpeechRecognition) {
        statusDiv.innerHTML = "<span style='color:red;'>Sila gunakan pelayar Google Chrome untuk pengecaman suara.</span>";
        return;
    }

    const pengecam = new SpeechRecognition();
    pengecam.lang = 'ar-SA';

    pengecam.onstart = function() {
        if (btnRekod) btnRekod.innerText = "Mendengar... 🔴";
        statusDiv.innerHTML = "<span style='color:#e67e22;'>Sila sebut perkataan sekarang...</span>";
    };

    pengecam.onresult = function(event) {
        const suaraDiterima = event.results[0][0].transcript.trim();
        const buangBaris = (t) => t.replace(/[\u064B-\u065F\u0670]/g, '').trim();

        if (buangBaris(suaraDiterima).includes(buangBaris(perkataanFasa4))) {
            statusDiv.innerHTML = `<span style='color:green;'>✅ Sebutan Tepat: <strong>${suaraDiterima}</strong></span>`;
        } else {
            statusDiv.innerHTML = `<span style='color:red;'>❌ Kurang Tepat: <strong>${suaraDiterima}</strong>. Cuba sebut sekali lagi!</span>`;
        }
    };

    pengecam.onerror = (e) => statusDiv.innerHTML = `<span style='color:red;'>Ralat: ${e.error}</span>`;
    pengecam.onend = () => { if (btnRekod) btnRekod.innerText = "🎤 Uji Sebutan Saya"; };
    pengecam.start();
}
