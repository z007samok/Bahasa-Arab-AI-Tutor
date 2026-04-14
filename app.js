// Global Variables
let API_KEY = localStorage.getItem('gemini_api_key');
let GEMINI_URL = "";

// Fungsi yang dijalankan semasa aplikasi mula-mula dibuka
window.onload = function() {
    if (!API_KEY) {
        // Jika tiada key, tunjuk kotak input
        document.getElementById('setup-api').style.display = 'block';
    } else {
        // Jika sudah ada, terus aktifkan aplikasi
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

function aktifkanApp() {
    document.getElementById('setup-api').style.display = 'none';
    GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;
    
    // TUKAR BARIS DI BAWAH INI:
    binaMenuUtama(); 
}

// Fungsi untuk 'Reset' jika anda ingin tukar key di masa depan (Opsional)
function hapusKey() {
    localStorage.removeItem('gemini_api_key');
    location.reload();
}

let databaseBab = [];
let babAktif = "";

// 1. Ambil data bab dari JSON
fetch('data.json')
    .then(response => response.json())
    .then(data => {
        databaseBab = data.senarai_bab;
        binaMenuUtama();
    });

function binaMenuUtama() {
    const bekasButang = document.getElementById('senarai-butang');
    bekasButang.innerHTML = '';
    databaseBab.forEach(bab => {
        const btn = document.createElement('button');
        btn.innerText = bab.tajuk;
        btn.onclick = () => paparKandungan(bab.id);
        bekasButang.appendChild(btn);
    });
}

function paparKandungan(id) {
    const bab = databaseBab.find(b => b.id === id);
    babAktif = bab.tajuk;
    document.getElementById('section-menu').style.display = 'none';
    document.getElementById('section-kandungan').style.display = 'block';
    document.getElementById('section-fasa2').style.display = 'none'; // Sembunyi fasa 2 dulu
    
    document.getElementById('tajuk-aktif').innerText = bab.tajuk;
    document.getElementById('teks-penerangan').innerText = bab.penerangan;

    // Bina butang kaitan
    const bekasKaitan = document.getElementById('butang-kaitan');
    bekasKaitan.innerHTML = '';
    bab.kaitan.forEach(idKaitan => {
        const babTerkait = databaseBab.find(b => b.id === idKaitan);
        if (babTerkait) {
            const btn = document.createElement('button');
            btn.innerText = "Lihat juga: " + babTerkait.tajuk;
            btn.style.backgroundColor = "#e67e22";
            btn.onclick = () => paparKandungan(idKaitan);
            bekasKaitan.appendChild(btn);
        }
    });
}

// ---------------- FASA 2: LOGIK AI GEMINI ----------------

async function pergiKeFasa2() {
    document.getElementById('section-kandungan').style.display = 'none';
    document.getElementById('section-fasa2').style.display = 'block';
    document.getElementById('loading-ai').innerText = "Sedang mencari contoh dari Al-Quran...";
    document.getElementById('hasil-ai').innerHTML = "";
    
    // Sembunyikan bekas kuiz lama jika ada
    document.getElementById('quiz-container').style.display = 'none';

    const prompt = `Berikan satu ayat Al-Quran pendek yang mengandungi contoh ${babAktif}. 
    Berikan respon dalam format JSON sahaja: 
    {"ayat": "teks ayat", "surah": "nama surah", "word": "perkataan berkaitan", "root": "kata dasar", "wazan": "pola", "function": "fungsi nahu"}`;

    try {
        const response = await fetch(GEMINI_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        const data = await response.json();
        const textResponse = data.candidates[0].content.parts[0].text;
        const cleanJson = JSON.parse(textResponse.replace(/```json|```/g, ''));

        document.getElementById('loading-ai').innerText = "";
        
        // Simpan analisis teks untuk kegunaan kuiz
        const analisisTeks = `Ayat: ${cleanJson.ayat}. Perkataan: ${cleanJson.word}. Fungsi: ${cleanJson.function}`;
        
        document.getElementById('hasil-ai').innerHTML = `
            <div style="font-size: 1.8em; direction: rtl; margin-bottom: 15px; font-family: 'Amiri', serif;">${cleanJson.ayat}</div>
            <p><strong>Surah:</strong> ${cleanJson.surah}</p>
            <hr>
            <p><strong>Perkataan:</strong> <span style="color: #e67e22; font-size: 1.2em;">${cleanJson.word}</span></p>
            <p><strong>Kata Dasar:</strong> ${cleanJson.root}</p>
            <p><strong>Wazan:</strong> ${cleanJson.wazan}</p>
            <p><strong>Fungsi:</strong> ${cleanJson.function}</p>
            <button onclick='janaKuiz("${analisisTeks.replace(/"/g, "'")}")' style="margin-top:15px; background-color: #27ae60;">Jana Kuiz Kefahaman</button>
        `;
        
    } catch (error) {
        document.getElementById('loading-ai').innerText = "Ralat memanggil AI. Sila semak API Key.";
        console.error(error);
    }
}

// --- FASA 3: PENJANAAN KUIZ ---

async function janaKuiz(teksAnalisis) {
    const quizContainer = document.getElementById('quiz-container');
    const quizContent = document.getElementById('quiz-content');
    
    if (!quizContainer || !quizContent) return;

    quizContainer.style.display = 'block';
    quizContent.innerHTML = "Sedang menjana kuiz...";

    const promptKuiz = "Berdasarkan analisis ini: " + teksAnalisis + ", bina 3 soalan objektif ringkas dlm Bahasa Melayu. Berikan JSON sahaja: [{\"soalan\": \"...\", \"pilihan\": [\"A\", \"B\", \"C\"], \"jawapan\": 0}]";

    try {
        const response = await fetch(GEMINI_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: promptKuiz }] }]
            })
        });

        const data = await response.json();
        const rawJson = data.candidates[0].content.parts[0].text.replace(/```json|```/g, "");
        const soalanArray = JSON.parse(rawJson);

        paparkanKuiz(soalanArray);
    } catch (err) {
        quizContent.innerHTML = "Gagal menjana kuiz. Sila cuba lagi.";
        console.error(err);
    }
}

function paparkanKuiz(soalanArray) {
    const quizContent = document.getElementById('quiz-content');
    quizContent.innerHTML = ""; 

    soalanArray.forEach((s, index) => {
        let html = "<p><strong>Soalan " + (index + 1) + ":</strong> " + s.soalan + "</p>";
        s.pilihan.forEach((p, pIndex) => {
            html += "<button onclick=\"semakJawapanBaru(" + index + "," + pIndex + "," + s.jawapan + ", this)\" style=\"display:block; margin: 5px 0; padding: 10px; width: 100%; text-align: left;\">" + p + "</button>";
        });
        quizContent.innerHTML += "<div style='margin-bottom:20px;'>" + html + "</div>";
    });
}

function semakJawapanBaru(sIndex, pilihIndex, betulIndex, btn) {
    if (pilihIndex === betulIndex) {
        btn.style.backgroundColor = "#c3e6cb";
        alert("Betul! 🎉");
    } else {
        btn.style.backgroundColor = "#f5c6cb";
        alert("Salah, cuba lagi! ❌");
    }
}

// Jambatan untuk butang lama di HTML
function pergiKeFasa3() {
    const hasilAI = document.getElementById('hasil-ai');
    if (hasilAI) {
        janaKuiz(hasilAI.innerText);
    }
}
}
