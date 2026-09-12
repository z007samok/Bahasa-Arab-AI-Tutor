// Global Variables
let API_KEY = localStorage.getItem('gemini_api_key');
let GEMINI_URL = "";
let databaseBab = [];
let babAktif = "";
let perkataanFasa4 = "كَتَبَ";

// Fungsi yang dijalankan semasa aplikasi mula-mula dibuka
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
        alert("Tahniah! API Key disimpan.");
        aktifkanApp();
    } else {
        alert("Sila masukkan API Key yang sah.");
    }
}

function hapusKey() {
    localStorage.removeItem('gemini_api_key');
    location.reload();
}

function aktifkanApp() {
    document.getElementById('setup-api').style.display = 'none';
    GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;
    muatTurunData(); 
}

function muatTurunData() {
    fetch('data.json')
        .then(res => res.json())
        .then(data => {
            databaseBab = data.senarai_bab;
            binaMenuUtama();
        })
        .catch(err => console.error("Gagal muat data.json:", err));
}

// Paparan Menu Berkategori
function binaMenuUtama() {
    const bekas = document.getElementById('senarai-butang');
    bekas.innerHTML = '';
    const senaraiKategori = [...new Set(databaseBab.map(b => b.kategori || "Umum"))];

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
            const btn = document.createElement('button');
            btn.innerText = bab.tajuk;
            btn.style.cssText = "padding: 10px 14px; font-size: 0.95em; border-radius: 8px; border: 1px solid #2980b9; background-color: #3498db; color: white; cursor: pointer;";
            btn.onclick = () => paparKandungan(bab.id);
            gridButang.appendChild(btn);
        });

        kotakKategori.appendChild(gridButang);
        bekas.appendChild(kotakKategori);
    });
}

function paparKandungan(id) {
    const bab = databaseBab.find(b => b.id === id);
    babAktif = bab.tajuk;
    document.getElementById('section-menu').style.display = 'none';
    document.getElementById('section-kandungan').style.display = 'block';
    document.getElementById('section-fasa2').style.display = 'none';
    document.getElementById('section-fasa3').style.display = 'none';
    document.getElementById('section-fasa4').style.display = 'none';
    document.getElementById('tajuk-aktif').innerText = bab.tajuk;
    document.getElementById('teks-penerangan').innerText = bab.penerangan;
}

// FASA 2: Contoh Al-Quran + Terjemahan BM
async function pergiKeFasa2() {
    // Sembunyikan semua seksyen lain
    document.getElementById('section-kandungan').style.display = 'none';
    document.getElementById('section-fasa3').style.display = 'none';
    document.getElementById('section-fasa4').style.display = 'none'; // <-- Tambah/pastikan baris ini ada
    
    // Tunjukkan seksyen Fasa 2
    document.getElementById('section-fasa2').style.display = 'block';

    const loading = document.getElementById('loading-ai');
    const hasil = document.getElementById('hasil-ai');
    
    // Elakkan menjana semula jika data ayat sudah sedia ada
    if (hasil.innerHTML.trim() !== "") {
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
        
        const data = await response.json();
        const text = data.candidates[0].content.parts[0].text.replace(/```json|```/g, '').trim();
        const json = JSON.parse(text);

        perkataanFasa4 = json.word || "كَتَبَ";
        loading.innerText = "";
        hasil.innerHTML = `
            <div style="font-size: 2.2em; direction: rtl; margin-bottom: 12px; font-family: 'Amiri', serif; line-height: 1.6;">${json.ayat}</div>
            <p style="color: #2c3e50; font-size: 1.05em; margin-bottom: 10px;"><strong>Maksud:</strong> <em>"${json.terjemahan}"</em></p>
            <p><strong>Surah:</strong> ${json.surah}</p>
            <hr style="border: 0; border-top: 1px solid #e0d0b0; margin: 15px 0;">
            <p><strong>Perkataan:</strong> <span style="color: #d35400; font-weight: bold; font-size: 1.3em;">${json.word}</span></p>
            <p><strong>Kata Dasar:</strong> ${json.root}</p>
            <p><strong>Wazan:</strong> ${json.wazan}</p>
            <p><strong>Fungsi:</strong> ${json.function}</p>
        `;
    } catch (err) {
        loading.innerText = "Ralat: " + err.message;
    }
}

// FASA 3: Kuiz (Guna fetch GEMINI_URL terus)
async function janaKuiz(teksAnalisis) {
    const quizContainer = document.getElementById('quiz-container');
    const quizContent = document.getElementById('quiz-content');
    const loading = document.getElementById('loading-kuiz');
    const btnFasa4 = document.getElementById('btn-fasa4');
    
    document.getElementById('section-fasa2').style.display = 'none';
    document.getElementById('section-fasa3').style.display = 'block';
    quizContainer.style.display = 'none';
    if (btnFasa4) btnFasa4.style.display = 'none';
    loading.innerText = "AI sedang membina kuiz...";

    const prompt = `Bina 3 soalan objektif dlm BM berdasarkan: ${teksAnalisis}. Respon JSON SAHAJA: [{"soalan": "...", "pilihan": ["A", "B", "C"], "jawapan": 0, "penjelasan": "..."}]`;

    try {
        const response = await fetch(GEMINI_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        const data = await response.json();
        const text = data.candidates[0].content.parts[0].text.replace(/```json|```/g, '').trim();
        const soalanArray = JSON.parse(text);

        loading.innerText = "";
        quizContainer.style.display = 'block';
        if (btnFasa4) btnFasa4.style.display = 'inline-block';
        
        quizContent.innerHTML = "";
        soalanArray.forEach((s, i) => {
            let html = `<p><strong>${i+1}. ${s.soalan}</strong></p>`;
            s.pilihan.forEach((p, pi) => {
                html += `<button onclick="semakJawapan(${i}, ${pi}, ${s.jawapan}, '${s.penjelasan.replace(/'/g, "\\'")}', this)" style="display:block; width:100%; text-align:center; background:white; color:black; border:1px solid #ccc; margin:10px 0; padding:15px; font-size:1.8em; border-radius:8px; cursor:pointer;">${p}</button>`;
            });
            quizContent.innerHTML += `<div id="q-${i}" style="margin-bottom:20px;">${html}<div id="fb-${i}"></div></div>`;
        });
    } catch (err) {
        loading.innerText = "Gagal menjana kuiz: " + err.message;
    }
}

function semakJawapan(si, pi, bi, pen, btn) {
    const fb = document.getElementById(`fb-${si}`);
    if (pi === bi) {
        btn.style.backgroundColor = "#d4edda";
        fb.innerHTML = "✅ " + pen;
    } else {
        btn.style.backgroundColor = "#f8d7da";
        fb.innerHTML = "❌ Salah.";
    }
}

function pergiKeFasa3() {
    janaKuiz(document.getElementById('hasil-ai').innerText);
}

// FASA 4: Audio & Sebutan
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
    document.getElementById('section-fasa4').style.display = 'none';
    document.getElementById('section-menu').style.display = 'block';
}

function kembaliKeMenu() {
    document.getElementById('section-kandungan').style.display = 'none';
    document.getElementById('section-menu').style.display = 'block';
}

function dengarSebutan() {
    if (!('speechSynthesis' in window)) return alert("Audio tidak disokong.");
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
        statusDiv.innerHTML = "<span style='color:red;'>Gunakan Google Chrome untuk fungsi suara.</span>";
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
            statusDiv.innerHTML = `<span style='color:red;'>❌ Kurang Tepat: <strong>${suaraDiterima}</strong>. Cuba lagi!</span>`;
        }
    };

    pengecam.onerror = (e) => statusDiv.innerHTML = `<span style='color:red;'>Ralat: ${e.error}</span>`;
    pengecam.onend = () => { if (btnRekod) btnRekod.innerText = "🎤 Uji Sebutan Saya"; };
    pengecam.start();
}
