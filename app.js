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
    // Bina URL menggunakan model 2.5 Flash yang kita sahkan tadi
    GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;
    
    // Panggil fungsi asal untuk paparkan senarai bab
    muatTurunData(); 
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

    // Prompt untuk mencari ayat berkaitan bab
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
        document.getElementById('hasil-ai').innerHTML = `
            <div style="font-size: 1.5em; direction: rtl; margin-bottom: 10px;">${cleanJson.ayat}</div>
            <p><strong>Surah:</strong> ${cleanJson.surah}</p>
            <hr>
            <p><strong>Perkataan:</strong> ${cleanJson.word}</p>
            <p><strong>Kata Dasar:</strong> ${cleanJson.root}</p>
            <p><strong>Wazan:</strong> ${cleanJson.wazan}</p>
            <p><strong>Fungsi:</strong> ${cleanJson.function}</p>
        `;
    } catch (error) {
        document.getElementById('loading-ai').innerText = "Ralat memanggil AI. Sila semak API Key.";
    }
}

// Tambah fungsi ini di bawah fungsi pergiKeFasa2() yang sedia ada

async function pergiKeFasa3() {
    document.getElementById('section-fasa2').style.display = 'none';
    document.getElementById('section-fasa3').style.display = 'block';
    document.getElementById('loading-kuiz').innerText = "AI sedang membina soalan untuk anda...";
    document.getElementById('soalan-container').style.display = 'none';
    document.getElementById('maklum-balas').innerText = "";

    const prompt = `Bina satu soalan objektif (3 pilihan jawapan) dalam Bahasa Melayu mengenai topik: ${babAktif}. 
    Berikan respon dalam format JSON sahaja: 
    {"soalan": "teks soalan", "pilihan": ["A", "B", "C"], "jawapan_betul": "indeks jawapan 0-2", "penjelasan": "sebab kenapa itu jawapannya"}`;

    try {
        const response = await fetch(GEMINI_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        const data = await response.json();
        const textResponse = data.candidates[0].content.parts[0].text;
        const quizData = JSON.parse(textResponse.replace(/```json|```/g, ''));

        document.getElementById('loading-kuiz').innerText = "";
        document.getElementById('soalan-container').style.display = 'block';
        document.getElementById('teks-soalan').innerText = quizData.soalan;

        const containerPilihan = document.getElementById('pilihan-jawapan');
        containerPilihan.innerHTML = "";

        quizData.pilihan.forEach((pilihan, index) => {
            const btn = document.createElement('button');
            btn.innerText = pilihan;
            btn.style.display = "block";
            btn.style.width = "100%";
            btn.style.textAlign = "left";
            btn.onclick = () => semakJawapan(index, quizData);
            containerPilihan.appendChild(btn);
        });

    } catch (error) {
        document.getElementById('loading-kuiz').innerText = "Gagal menjana kuiz. Cuba lagi.";
    }
}

function semakJawapan(indexDipilih, dataKuiz) {
    const feedback = document.getElementById('maklum-balas');
    if (indexDipilih == dataKuiz.jawapan_betul) {
        feedback.innerHTML = `<span style="color: green;">Betul!</span> ${dataKuiz.penjelasan}`;
        document.getElementById('btn-fasa4').style.display = "inline-block"; // Tunjuk butang ke Fasa 4
    } else {
        feedback.innerHTML = `<span style="color: red;">Salah.</span> Cuba fikirkan semula berkaitan ${babAktif}.`;
    }
}

function kembaliKeMenu() {
    document.getElementById('section-menu').style.display = 'block';
    document.getElementById('section-kandungan').style.display = 'none';
    document.getElementById('section-fasa2').style.display = 'none';
}
