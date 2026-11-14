const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const baseDir = path.resolve(__dirname, '..');
const videosDir = path.join(baseDir, 'videos');
if (!fs.existsSync(videosDir)) {
  fs.mkdirSync(videosDir, { recursive: true });
}

// Convert screenshots to base64
const scenes = [
  {
    num: 1,
    title: "1. Otentikasi Akun & Login Google",
    desc: "Masuk akun dengan aileen@mutiarabangsa.sch.id atau Mode Tamu.",
    file: "screenshots/01_login_auth_screen.png"
  },
  {
    num: 2,
    title: "2. Pemilihan Toko & Quick Budget Meter",
    desc: "Memilih gerai belanja (Superindo) dan memantau pagu saldo.",
    file: "screenshots/02_homepage_tab_belanja.png"
  },
  {
    num: 3,
    title: "3. Kalkulasi Diskon Kompound 50% + 20%",
    desc: "Promo wajan Rp 100.000 menjadi Rp 40.000 (Hemat Rp 60.000).",
    file: "screenshots/03_input_diskon_kompound.png"
  },
  {
    num: 4,
    title: "4. Pengelolaan Troli & Kuantitas (+/-)",
    desc: "Penggandaan kuantitas item dan tombol tambah melayang (FAB).",
    file: "screenshots/04_keranjang_troli_items.png"
  },
  {
    num: 5,
    title: "5. Peringatan Bahaya Over Budget (> 100%)",
    desc: "Banner bahaya merah pekat memperingatkan defisit anggaran.",
    file: "screenshots/05_safety_cap_overbudget.png"
  },
  {
    num: 6,
    title: "6. Tab Riwayat Struk & Belanja Ulang",
    desc: "Melihat arsip struk digital dan menduplikasi belanjaan.",
    file: "screenshots/06_tab_riwayat_struk.png"
  },
  {
    num: 7,
    title: "7. Fluktuasi Harga Komoditas Realtime",
    desc: "Komparasi tren harga sembako naik, turun, dan stabil.",
    file: "screenshots/07_tab_fluktuasi_harga.png"
  }
];

const scenesData = scenes.map(s => {
  const buf = fs.readFileSync(path.join(baseDir, s.file));
  return {
    ...s,
    b64: 'data:image/png;base64,' + buf.toString('base64')
  };
});

// HTML page that renders the video using Canvas + MediaRecorder
const recorderHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Video Generator</title>
  <style>
    body { margin: 0; background: #000; overflow: hidden; }
    canvas { display: block; margin: auto; }
  </style>
</head>
<body>
  <canvas id="c" width="1280" height="720"></canvas>
  <script>
    const scenes = ${JSON.stringify(scenesData)};
    const canvas = document.getElementById('c');
    const ctx = canvas.getContext('2d');

    // Preload images
    const loadedImages = [];
    let loadedCount = 0;

    scenes.forEach((s, idx) => {
      const img = new Image();
      img.onload = () => {
        loadedCount++;
        if (loadedCount === scenes.length) {
          startRecording();
        }
      };
      img.src = s.b64;
      loadedImages[idx] = img;
    });

    function drawFrame(sceneIdx, progress) {
      const scene = scenes[sceneIdx];
      const img = loadedImages[sceneIdx];

      // Dark background gradient
      const grad = ctx.createLinearGradient(0, 0, 1280, 720);
      grad.addColorStop(0, '#0a0f0d');
      grad.addColorStop(1, '#111827');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1280, 720);

      // Top Header Bar
      ctx.fillStyle = '#0f766e';
      ctx.fillRect(0, 0, 1280, 60);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px "Plus Jakarta Sans", sans-serif, Arial';
      ctx.fillText('🛒 GroceryTracker • Video Walkthrough Demo', 40, 38);

      ctx.fillStyle = '#a7f3d0';
      ctx.font = '16px "Plus Jakarta Sans", sans-serif, Arial';
      ctx.fillText('Aileen Pheeby Angelica (12C / 01) • SMA Mutiara Bangsa 2', 760, 38);

      // Phone Frame mockup on center-left
      const phoneW = 300;
      const phoneH = 580;
      const phoneX = 140;
      const phoneY = 90;

      // Outer phone shell
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.roundRect(phoneX - 10, phoneY - 10, phoneW + 20, phoneH + 20, 24);
      ctx.fill();
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Screen inside phone
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(phoneX, phoneY, phoneW, phoneH, 16);
      ctx.clip();
      ctx.drawImage(img, phoneX, phoneY, phoneW, phoneH);

      // Animated touch ripple effect
      if (progress > 0.3 && progress < 0.7) {
        const rippleProgress = (progress - 0.3) / 0.4;
        const rippleR = 10 + rippleProgress * 40;
        const alpha = 1 - rippleProgress;
        ctx.strokeStyle = 'rgba(16, 185, 129, ' + alpha + ')';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(phoneX + phoneW / 2, phoneY + phoneH * 0.65, rippleR, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();

      // Right Explanation Panel
      const panelX = 490;
      const panelY = 90;
      const panelW = 730;
      const panelH = 580;

      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.roundRect(panelX, panelY, panelW, panelH, 16);
      ctx.fill();
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Step Tag
      ctx.fillStyle = '#059669';
      ctx.beginPath();
      ctx.roundRect(panelX + 40, panelY + 40, 140, 34, 8);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText('LANGKAH ' + scene.num + ' / 7', panelX + 56, panelY + 63);

      // Title
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText(scene.title, panelX + 40, panelY + 120);

      // Description
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '20px sans-serif';
      ctx.fillText(scene.desc, panelX + 40, panelY + 165);

      // Feature Detail Box
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(panelX + 40, panelY + 210, panelW - 80, 240, 12);
      ctx.fill();
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 17px sans-serif';
      ctx.fillText('STATUS SISTEM & SINKRONISASI:', panelX + 65, panelY + 245);

      ctx.fillStyle = '#e2e8f0';
      ctx.font = '16px sans-serif';
      ctx.fillText('• Akun Pengguna   : aileen@mutiarabangsa.sch.id', panelX + 65, panelY + 285);
      ctx.fillText('• Layanan Cloud   : Firebase Firestore & WebSocket Realtime (WSS)', panelX + 65, panelY + 325);
      ctx.fillText('• Reaktivitas UI  : 0 ms Instant Local Computation & State Cache', panelX + 65, panelY + 365);
      ctx.fillText('• Keamanan Dana   : Three-Tier Safety Cap Dynamic Color Warning', panelX + 65, panelY + 405);

      // Bottom timeline in panel
      ctx.fillStyle = '#334155';
      ctx.fillRect(panelX + 40, panelY + 500, panelW - 80, 8);

      const totalProgress = (sceneIdx + progress) / scenes.length;
      ctx.fillStyle = '#10b981';
      ctx.fillRect(panelX + 40, panelY + 500, (panelW - 80) * totalProgress, 8);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px sans-serif';
      ctx.fillText('Progress Video Walkthrough: ' + Math.round(totalProgress * 100) + '%', panelX + 40, panelY + 535);
    }

    function startRecording() {
      const stream = canvas.captureStream(30);
      const recorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 2500000
      });

      const chunks = [];
      recorder.ondataavailable = e => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const reader = new FileReader();
        reader.onload = () => {
          // Send to server
          fetch('/save-video', {
            method: 'POST',
            body: reader.result,
            headers: { 'Content-Type': 'application/octet-stream' }
          }).then(() => {
            window.__DONE__ = true;
          });
        };
        reader.readAsArrayBuffer(blob);
      };

      recorder.start();

      let currentScene = 0;
      let frameInScene = 0;
      const framesPerScene = 75; // 2.5 seconds per scene @ 30fps

      const timer = setInterval(() => {
        const progress = frameInScene / framesPerScene;
        drawFrame(currentScene, progress);

        frameInScene++;
        if (frameInScene >= framesPerScene) {
          frameInScene = 0;
          currentScene++;
          if (currentScene >= scenes.length) {
            clearInterval(timer);
            // final hold frame
            setTimeout(() => {
              recorder.stop();
            }, 300);
          }
        }
      }, 1000 / 30);
    }
  </script>
</body>
</html>
`;

// Start local HTTP server to serve the recorder and accept the video file
const server = http.createServer((req, res) => {
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(recorderHtml);
  } else if (req.url === '/save-video' && req.method === 'POST') {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      const buffer = Buffer.concat(chunks);
      const outPath = path.join(videosDir, 'walkthrough.webm');
      fs.writeFileSync(outPath, buffer);
      console.log('Video saved successfully to:', outPath, 'Size:', buffer.length, 'bytes');
      res.writeHead(200);
      res.end('OK');

      setTimeout(() => {
        process.exit(0);
      }, 1000);
    });
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(4829, () => {
  console.log('Video recording server listening on http://localhost:4829');

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const args = [
    '--headless=new',
    '--disable-gpu',
    '--window-size=1280,720',
    'http://localhost:4829'
  ];

  console.log('Launching headless Chrome to render video...');
  const child = spawn(chromePath, args);

  child.on('error', (err) => {
    console.error('Failed to start Chrome:', err);
  });
});
