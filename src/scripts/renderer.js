// 🎯 Lấy phần tử canvas và context
const canvas = document.getElementById("graphCanvas");
const ctx = canvas.getContext("2d");
const modeSelector = document.getElementById("modeSelector");
const Swal = require("sweetalert2");

let nodes = []; // Danh sách đỉnh
let edges = []; // Danh sách cạnh
let isDraggingNode = false;
let isDrawingEdge = false;
let selectedNode = null;
let tempEdge = null;

const NODE_RADIUS = 25;

canvas.addEventListener("mousedown", async (event) => {
    const x = event.offsetX;
    const y = event.offsetY;
    let clickedNode = getNodeAt(x, y);
    let clickedEdge = getEdgeAt(x, y);

    if (getCurrentMode() === "drawNode") {
        if (clickedNode) {
            selectedNode = clickedNode;
            isDraggingNode = true;
        } else {
            if (getCurrentMode() === "drawNode") {
    if (clickedNode) {
        selectedNode = clickedNode;
        isDraggingNode = true;
    } else {
        const { value: nodeName } = await Swal.fire({
            title: "Nhập tên đỉnh",
            input: "text",
            inputAttributes: { maxlength: 2 },
            showCancelButton: true,
            confirmButtonText: "OK",
            cancelButtonText: "Hủy",
            preConfirm: (name) => {
                if (!/^(?:[A-Z]|[1-9][0-9]?)$/.test(name)) {
                    Swal.showValidationMessage("Chỉ chấp nhận chữ cái A-Z hoặc số từ 1-99!");
                }
                return name;
            }
        });

        if (nodeName) {
            nodes.push({ x, y, id: nodeName });
            drawGraph();
        }
    }
}

            drawGraph();
        }
    }

    if (getCurrentMode() === "drawEdge") {
        if (clickedNode) {
            selectedNode = clickedNode;
            isDrawingEdge = true;
            tempEdge = { x1: x, y1: y, x2: x, y2: y };
        }
    }

    if (getCurrentMode()=== "deleteNode" && clickedNode) {
        deleteNode(clickedNode);
        drawGraph();
    }

   if (getCurrentMode() === "deleteEdge" && clickedEdge) {
        deleteEdge(clickedEdge);
        drawGraph();
    }

    // 📌 Chỉnh sửa trọng số cạnh
    if (getCurrentMode() === "editWeight" && clickedEdge) {
        const { value: newWeight } = await Swal.fire({
            title: "Chỉnh sửa trọng số",
            input: "number",
            inputAttributes: { min: "1" },
            inputValue: clickedEdge.weight, // Hiển thị trọng số hiện tại
            showCancelButton: true,
            confirmButtonText: "Cập nhật",
            cancelButtonText: "Hủy"
        });

        if (newWeight) {
            clickedEdge.weight = parseInt(newWeight); // Cập nhật trọng số mới
            drawGraph();
        }
    }
});

// 📌 Sự kiện mousemove
canvas.addEventListener("mousemove", (event) => {
    const x = event.offsetX;
    const y = event.offsetY;

    if (isDraggingNode && selectedNode) {
        selectedNode.x = x;
        selectedNode.y = y;
        drawGraph();
    }

    if (isDrawingEdge && selectedNode) {
        tempEdge = { x1: selectedNode.x, y1: selectedNode.y, x2: x, y2: y };
        drawGraph();
    }
});

// 📌 Sự kiện mouseup
canvas.addEventListener("mouseup", async (event) => {
    const x = event.offsetX;
    const y = event.offsetY;

    if (isDraggingNode) {
        isDraggingNode = false;
        selectedNode = null;
    }

    if (isDrawingEdge) {
        let targetNode = getNodeAt(x, y);
        if (targetNode && targetNode !== selectedNode) {
            const { value: weight } = await Swal.fire({
                title: "Nhập trọng số cạnh",
                input: "number",
                inputAttributes: { min: "1" },
                showCancelButton: true,
                confirmButtonText: "OK",
                cancelButtonText: "Hủy"
            });

            if (weight) {
                addEdge(selectedNode, targetNode, parseInt(weight));
            }
        }
        isDrawingEdge = false;
        selectedNode = null;
        tempEdge = null;
        drawGraph();
    }
});

// 📌 Hàm lấy đỉnh tại vị trí click
function getNodeAt(x, y) {
    return nodes.find(node => Math.hypot(node.x - x, node.y - y) < NODE_RADIUS);
}

// 📌 Hàm kiểm tra điểm có nằm trên cạnh không (chính xác hơn)
function isPointOnEdge(x, y, edge) {
    const { start, end, curveOffset } = edge;

    // Tính toán điểm điều khiển của đường cong
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const normalX = -dy;
    const normalY = dx;
    const length = Math.hypot(normalX, normalY);
    const curveX = midX + (normalX / length) * curveOffset;
    const curveY = midY + (normalY / length) * curveOffset;

    // Kiểm tra khoảng cách từ điểm click đến đường cong
    let t = 0;
    while (t <= 1) {
        let px = (1 - t) * (1 - t) * start.x + 2 * (1 - t) * t * curveX + t * t * end.x;
        let py = (1 - t) * (1 - t) * start.y + 2 * (1 - t) * t * curveY + t * t * end.y;
        if (Math.hypot(px - x, py - y) < 6) {
            return true; // Nếu khoảng cách gần đường cong thì chọn cạnh này
        }
        t += 0.02; // Kiểm tra từng bước nhỏ trên đường cong
    }
    return false;
}

// 📌 Hàm lấy cạnh tại vị trí click
function getEdgeAt(x, y) {
    return edges.find(edge => isPointOnEdge(x, y, edge));
}

// 📌 Hàm thêm cạnh
function addEdge(start, end, weight) {
    let existingEdges = edges.filter(edge =>
        (edge.start === start && edge.end === end) || (edge.start === end && edge.end === start)
    );

    let curveOffset = existingEdges.length > 0 ? (existingEdges.length + 1) * 35 * (existingEdges.length % 2 === 0 ? 1 : -1) : 0;

    edges.push({ start, end, weight, curveOffset });

    drawGraph();
}

// 📌 Hàm xóa đỉnh
function deleteNode(node) {
    edges = edges.filter(edge => edge.start !== node && edge.end !== node);
    nodes = nodes.filter(n => n !== node);
}

// 📌 Hàm xóa cạnh
function deleteEdge(edge) {
    edges = edges.filter(e => e !== edge);

    let relatedEdges = edges.filter(e =>
        (e.start === edge.start && e.end === edge.end) ||
        (e.start === edge.end && e.end === edge.start)
    );

    relatedEdges.forEach((e, index) => {
        e.curveOffset = (index + 1) * 35 * (index % 2 === 0 ? 1 : -1);
    });

    drawGraph();
}

// 📌 Hàm vẽ lại đồ thị
function drawGraph() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    edges.forEach(drawEdge);
    nodes.forEach(drawNode);

    if (tempEdge) {
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(tempEdge.x1, tempEdge.y1);
        ctx.lineTo(tempEdge.x2, tempEdge.y2);
        ctx.strokeStyle = "gray";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.setLineDash([]);
    }
}

// 📌 Hàm vẽ đỉnh
function drawNode(node) {
    ctx.beginPath();
    ctx.arc(node.x, node.y, NODE_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = "white";
    ctx.fill();
    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "black";
    ctx.font = "14px Arial";
    ctx.fillText(node.id, node.x - 5, node.y + 5);
}

// 📌 Hàm vẽ cạnh cong
function drawEdge(edge) {
    ctx.beginPath();

    const { start, end, weight, curveOffset } = edge;
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const normalX = -dy;
    const normalY = dx;
    const length = Math.hypot(normalX, normalY);
    const curveX = midX + (normalX / length) * curveOffset;
    const curveY = midY + (normalY / length) * curveOffset;

    ctx.moveTo(start.x, start.y);
    ctx.quadraticCurveTo(curveX, curveY, end.x, end.y);
    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "red";
    ctx.font = "bold 14px Arial";
    ctx.fillText(weight, curveX, curveY);
}
document.addEventListener("DOMContentLoaded", () => {
    const resetButton = document.getElementById("resetGraph");

    if (resetButton) {
        resetButton.addEventListener("click", () => {
            nodes = [];
            edges = [];
            drawGraph();
        });
    }
});


// 📌 Hàm nhập file
function importGraph() {
    const fileInput = document.getElementById("fileInput");
    fileInput.click();

    fileInput.onchange = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            parseGraphData(content);
            fileInput.value = ""; // Reset để có thể nhập lại cùng file
        };
        reader.readAsText(file);
    };
}


function parseGraphData(content) {
    nodes = [];
    edges = [];
    const nodeMap = new Map(); 

    const lines = content.split("\n").map(line => line.trim()).filter(line => line);

    lines.forEach(line => {
        const parts = line.split(" ").map(Number);
        if (parts.length !== 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
            console.error("Lỗi dữ liệu dòng:", line);
            return;
        }
        const [startId, endId, weight] = parts;

        if (!nodeMap.has(startId)) {
            nodeMap.set(startId, { id: startId, x: Math.random() * 600 + 50, y: Math.random() * 400 + 50 });
        }
        if (!nodeMap.has(endId)) {
            nodeMap.set(endId, { id: endId, x: Math.random() * 600 + 50, y: Math.random() * 400 + 50 });
        }

        edges.push({ 
            start: nodeMap.get(startId), 
            end: nodeMap.get(endId), 
            weight, 
            curveOffset: 0 
        });
    });

    nodes = Array.from(nodeMap.values());
    drawGraph();
}


// 📌 Hàm xuất file
function exportGraph() {
    let content = "";
    edges.forEach(edge => {
        content += `${edge.start.id} ${edge.end.id} ${edge.weight}\n`;
    });

    const blob = new Blob([content], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "graph.txt";
    a.click();
}
canvas.addEventListener("mousedown", (event) => {
    const mode = getCurrentMode();
    
    if (mode === "drawNode") {
        canvas.style.cursor = "crosshair";
    } else if (mode === "drawEdge") {
        canvas.style.cursor = "pointer";
    } else if (mode === "deleteNode" || mode === "deleteEdge") {
        canvas.style.cursor = "not-allowed";
    } else {
        canvas.style.cursor = "default";
    }

    // Đảm bảo cập nhật lại font chữ khi vẽ lên canvas
    const ctx = canvas.getContext("2d");
    ctx.font = "16px Arial"; // Đảm bảo font chữ nhất quán
});

canvas.addEventListener("mouseup", () => {
    canvas.style.cursor = "default";
});

document.querySelectorAll(".mode-btn").forEach(button => {
    button.addEventListener("click", () => {
        document.querySelectorAll(".mode-btn").forEach(btn => btn.classList.remove("active"));
        button.classList.add("active");
        currentMode = button.getAttribute("data-mode");
        document.getElementById("modeIndicator").innerText = `Chế độ: ${button.innerText}`;
    });
});
