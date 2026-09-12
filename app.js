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
        <!-- 1. AYAT AL-QURAN -->
        <div style="font-size: 2.2em; direction: rtl; text-align: center; margin-bottom: 15px; font-family: 'Amiri', 'Traditional Arabic', serif; line-height: 1.8; color: #1a252f; padding: 15px; background: #fdfefe; border-radius: 10px; border: 1px solid #e5e7e9;">
            ${json.ayat}
        </div>
        <p style="text-align: center; color: #7f8c8d; font-size: 0.9em; margin-bottom: 20px;">
            <strong>Surah:</strong> ${json.surah}
        </p>

        <!-- 2. PERBANDINGAN TERJEMAHAN (SINTAKSIS) -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; border-top: 3px solid #95a5a6;">
                <small style="color: #7f8c8d; font-weight: bold; display: block; margin-bottom: 5px;">Terjemahan Harfiyyah (Literal K-P-O)</small>
                <em style="color: #2c3e50; font-size: 0.95em;">"${json.terjemahan_harfiyyah}"</em>
            </div>
            <div style="background: #f0f8ff; padding: 15px; border-radius: 8px; border-top: 3px solid #3498db;">
                <small style="color: #7f8c8d; font-weight: bold; display: block; margin-bottom: 5px;">Terjemahan Maknawiyyah (Kontekstual S-K-O)</small>
                <em style="color: #154360; font-size: 0.95em;">"${json.terjemahan_maknawiyyah}"</em>
            </div>
        </div>
        
        <hr style="border: 0; border-top: 1px dashed #bdc3c7; margin: 20px 0;">

        <!-- 3. KAD ANALISIS NAHU & SARAF -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px;">
            
            <!-- Analisis Perkataan -->
            <div style="background: #ffffff; padding: 15px; border-radius: 8px; border-left: 4px solid #e67e22; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                <small style="color: #7f8c8d; font-weight: bold;">KALIMAH SASARAN</small>
                <div style="font-size: 1.5em; color: #d35400; font-weight: bold; direction: rtl;">${json.word}</div>
                <div style="margin-top: 8px; font-size: 0.9em; color: #27ae60;"><strong>Fungsi:</strong> ${json.function}</div>
                <div style="margin-top: 4px; font-size: 0.9em; color: #8e44ad;"><strong>Wazan:</strong> ${json.wazan}</div>
            </div>

            <!-- Tokenisasi Saraf (Visual Pemecahan) -->
            <div style="background: #ffffff; padding: 15px; border-radius: 8px; border-left: 4px solid #3498db; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                <small style="color: #7f8c8d; font-weight: bold; display: block; margin-bottom: 10px;">PECAHAN MORFOLOGI (SARAF)</small>
                <div style="display: flex; direction: rtl; justify-content: center; gap: 8px; font-size: 1.3em; font-weight: bold;">
                    <span style="background: #ffeaa7; color: #d35400; padding: 2px 8px; border-radius: 4px;" title="Awalan">${json.pecahan_saraf.awalan}</span>
                    <span style="background: #74b9ff; color: #0984e3; padding: 2px 8px; border-radius: 4px;" title="Kata Dasar">${json.pecahan_saraf.dasar}</span>
                    <span style="background: #ffeaa7; color: #d35400; padding: 2px 8px; border-radius: 4px;" title="Akhiran">${json.pecahan_saraf.akhiran}</span>
                </div>
            </div>

            <!-- Hubungan Nahu (Attention Mechanism) -->
            <div style="background: #ffffff; padding: 15px; border-radius: 8px; border-left: 4px solid #2ecc71; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                <small style="color: #7f8c8d; font-weight: bold; display: block; margin-bottom: 10px;">RANTAIAN NAHU</small>
                <div style="display: flex; align-items: center; justify-content: center; gap: 10px; direction: rtl;">
                    <span style="background: #e8f8f5; color: #27ae60; padding: 4px 10px; border-radius: 4px; border: 1px solid #a3e4d7;">${json.pasangan_nahu.perkataan_amil}</span>
                    <span style="color: #bdc3c7;">←</span>
                    <span style="background: #fef5e7; color: #e67e22; padding: 4px 10px; border-radius: 4px; border: 1px solid #f8c471;">${json.pasangan_nahu.perkataan_sasaran}</span>
                </div>
                <small style="display: block; text-align: center; margin-top: 8px; color: #95a5a6;">(Amil memepengaruhi Sasaran)</small>
            </div>
        </div>

        <!-- 4. RUANG SEMANTIK (KELUARGA KATA) -->
        <div style="background: #fdf2e9; padding: 15px; border-radius: 8px; border: 1px solid #fae5d3; text-align: center;">
            <small style="color: #d35400; font-weight: bold; display: block; margin-bottom: 10px;">RANGKAIAN SEMANTIK (Keluarga Akar Kata: ${json.pecahan_saraf.dasar})</small>
            <div style="display: flex; flex-wrap: wrap; gap: 8px; justify-content: center;">
                ${json.keluarga_kata.map(kata => `<span style="background: white; color: #e67e22; padding: 6px 12px; border-radius: 20px; font-size: 0.9em; border: 1px solid #f5cba7;">${kata}</span>`).join('')}
            </div>
        </div>

        <div style="text-align: right; margin-top: 15px;">
            <button onclick="salinNotaFasa2()" style="background-color: #7f8c8d; padding: 8px 15px; font-size: 0.9em; border-radius: 5px;">📋 Salin Nota Lengkap</button>
        </div>
    `;
}

async function pergiKeFasa2() {
    document.getElementById('section-kandungan').style.display = 'none';
    document.getElementById('section-fasa3').style.display = 'none';
    document.getElementById('section-fasa4').style.display = 'none';
    document.getElementById('section-fasa2').style.display = 'block';

    const loading = document.getElementById('loading-ai');
    const hasil = document.getElementById('hasil-ai');
    
    // NOTA PENTING: Kunci cache ditukar kepada 'quran_cache_v2_' 
    // supaya sistem mengambil format JSON baharu yang lengkap, bukan memori lama.
    const kunciMemori = 'quran_cache_v2_' + babAktif;
    const dataLama = localStorage.getItem(kunciMemori);

    if (dataLama) {
        loading.innerText = "";
        hasil.innerHTML = formatPaparanFasa2(JSON.parse(dataLama));
        return;
    }

    loading.innerText = "Menganalisis Saraf, Nahu, & Semantik Al-Quran...";
    hasil.innerHTML = "";

    const prompt = `Berikan satu keratan ayat Al-Quran pendek mengandungi topik: "${babAktif}". Respon JSON SAHAJA tanpa teks lain, dengan struktur tepat seperti berikut:
    {
        "ayat": "teks ayat berserta baris",
        "terjemahan_harfiyyah": "terjemahan lurus/literal perkataan demi perkataan",
        "terjemahan_maknawiyyah": "terjemahan struktur Melayu (kontekstual)",
        "surah": "Nama: No Ayat",
        "word": "kalimah sasaran dalam ayat",
        "pecahan_saraf": {"awalan": "imbuhan awal atau tiada", "dasar": "huruf akar kata asas (root)", "akhiran": "imbuhan akhir atau tiada"},
        "pasangan_nahu": {"perkataan_amil": "perkataan sebelumnya yg memberi kesan nahu", "perkataan_sasaran": "kalimah sasaran tadi"},
        "keluarga_kata": ["kata serumpun 1 (maksud)", "kata serumpun 2 (maksud)", "kata serumpun 3 (maksud)"],
        "wazan": "wazan kalimah sasaran",
        "function": "penerangan tatabahasa ringkas"
    }`;

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
// ==========================================
// 8. FASA 5: LATIHAN MENGARANG & PENYEMAKAN AI
// ==========================================
function pergiKeFasa5() {
    document.getElementById('section-fasa4').style.display = 'none';
    document.getElementById('section-fasa5').style.display = 'block';
    document.getElementById('fasa5-topik').innerText = babAktif;
    document.getElementById('input-karangan').value = "";
    document.getElementById('hasil-semakan').innerHTML = "";
}

function kembaliKeFasa4Dari5() {
    document.getElementById('section-fasa5').style.display = 'none';
    document.getElementById('section-fasa4').style.display = 'block';
}

function kembaliKeMenuUtamaDariFasa5() {
    // Rekod bab sebagai selesai
    const bab = databaseBab.find(b => b.tajuk === babAktif);
    if (bab) {
        let babSelesai = JSON.parse(localStorage.getItem('bab_selesai_list') || '[]');
        if (!babSelesai.includes(bab.id)) {
            babSelesai.push(bab.id);
            localStorage.setItem('bab_selesai_list', JSON.stringify(babSelesai));
        }
    }

    document.getElementById('section-fasa5').style.display = 'none';
    document.getElementById('section-menu').style.display = 'block';
    binaMenuUtama();
}

async function semakKarangan() {
    const inputAyat = document.getElementById('input-karangan').value.trim();
    if (!inputAyat) {
        alert("Sila taip ayat bahasa Arab anda terlebih dahulu.");
        return;
    }

    const loading = document.getElementById('loading-fasa5');
    const hasil = document.getElementById('hasil-semakan');
    
    loading.innerText = "AI sedang menyemak struktur Nahu dan Saraf ayat anda...";
    hasil.innerHTML = "";

    const prompt = `Anda adalah seorang guru bahasa Arab. Pelajar sedang belajar bab "${babAktif}". 
    Pelajar telah membina ayat ini: "${inputAyat}".
    Semak ketepatan struktur ayat ini, terutamanya sama ada ia menepati hukum nahu bagi bab "${babAktif}".
    
    Sila balas dalam format JSON SAHAJA seperti struktur ini:
    {
        "status": "Tepat / Ada Kesilapan",
        "ayat_pembetulan": "Tulis semula ayat dengan baris (tashkeel) yang betul 100%. Jika sudah betul, kekalkan.",
        "ulasan_guru": "Penerangan ringkas dalam Bahasa Melayu kenapa ia betul atau salah dari sudut nahu.",
        "skor": 100
    }`;

    try {
        // Matikan butang sementara AI berfikir
        const butangSemak = event.target;
        butangSemak.disabled = true;

        const response = await fetch(GEMINI_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        butangSemak.disabled = false;

        if (response.status === 429) throw new Error("Had API tercapai. Tunggu sebentar.");
        
        const data = await response.json();
        if (!response.ok) throw new Error("Ralat pelayan AI.");

        const json = ekstrakJSON(data.candidates[0].content.parts[0].text);
        
        // Render kad maklum balas UI
        const warnaStatus = json.skor > 50 ? "#27ae60" : "#e74c3c";
        const ikonStatus = json.skor > 50 ? "✅" : "💡";

        hasil.innerHTML = `
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 5px solid ${warnaStatus};">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #dee2e6; padding-bottom: 10px; margin-bottom: 15px;">
                    <h3 style="margin: 0; color: ${warnaStatus};">${ikonStatus} Status: ${json.status}</h3>
                    <div style="background: ${warnaStatus}; color: white; padding: 5px 15px; border-radius: 20px; font-weight: bold;">Skor: ${json.skor}/100</div>
                </div>
                
                <small style="color: #7f8c8d; font-weight: bold;">AYAT SEBENAR (DENGAN BARIS):</small>
                <div style="font-size: 2em; direction: rtl; font-family: 'Amiri', serif; color: #2c3e50; margin: 10px 0;">
                    ${json.ayat_pembetulan}
                </div>
                
                <small style="color: #7f8c8d; font-weight: bold; margin-top: 15px; display: block;">ULASAN GURU AI:</small>
                <p style="color: #34495e; font-size: 1.05em; line-height: 1.5; margin-top: 5px;">
                    ${json.ulasan_guru}
                </p>
            </div>
        `;
        loading.innerText = "";

    } catch (err) {
        loading.innerText = "Gagal menyemak: " + err.message;
        document.querySelector('button[onclick="semakKarangan()"]').disabled = false;
    }
}
