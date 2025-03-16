const { app, BrowserWindow } = require('electron');

function createWindow() {
    const win = new BrowserWindow({
        width: 1000,
        height: 700,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false // ⚠ Tắt để tránh lỗi truyền dữ liệu giữa main & renderer
        }
    });

    win.loadFile('src/view/index.html'); // ⚠ Kiểm tra đường dẫn có đúng không
}

app.whenReady().then(createWindow);
