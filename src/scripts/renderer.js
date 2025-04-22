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
let mstEdges = null; // Sẽ chứa các cạnh của cây khung tối thiểu

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

    // Vẽ tất cả các cạnh
    edges.forEach(edge => {
        drawEdge(edge, "gray"); // Vẽ các cạnh không thuộc MST bằng màu xám
    });

    // Vẽ các cạnh thuộc MST (nếu có)
    if (mstEdges) {
        mstEdges.forEach(edge => {
            drawEdge(edge, "red"); // Vẽ các cạnh thuộc MST bằng màu đỏ
        });
    }

    // Vẽ các đỉnh
    nodes.forEach(drawNode);

    // Vẽ cạnh tạm thời (nếu đang vẽ cạnh)
    if (tempEdge) {
        ctx.beginPath();
        ctx.moveTo(tempEdge.x1, tempEdge.y1);
        ctx.lineTo(tempEdge.x2, tempEdge.y2);
        ctx.strokeStyle = "gray";
        ctx.stroke();
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
function drawEdge(edge, color) {
    const { start, end, weight, curveOffset } = edge;
    ctx.beginPath();
    
    if (curveOffset !== 0) {
        // Vẽ đường cong
        const midX = (start.x + end.x) / 2;
        const midY = (start.y + end.y) / 2;
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const normalX = -dy;
        const normalY = dx;
        const length = Math.sqrt(normalX * normalX + normalY * normalY);
        const unitX = normalX / length;
        const unitY = normalY / length;
        const curveX = midX + unitX * curveOffset;
        const curveY = midY + unitY * curveOffset;

        ctx.moveTo(start.x, start.y);
        ctx.quadraticCurveTo(curveX, curveY, end.x, end.y);

        // Vẽ trọng số
        const textX = (start.x + end.x + curveOffset * unitX) / 2;
        const textY = (start.y + end.y + curveOffset * unitY) / 2;
        ctx.strokeStyle = color;
        ctx.stroke();
        ctx.fillStyle = "black";
        ctx.font = "bold 14px Arial";
        ctx.fillText(weight.toString(), textX, textY);
    } else {
        // Vẽ đường thẳng
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);

        // Vẽ trọng số
        const textX = (start.x + end.x) / 2;
        const textY = (start.y + end.y) / 2;
        ctx.strokeStyle = color;
        ctx.stroke();
        ctx.fillStyle = "black";
        ctx.font = "bold 14px Arial";
        ctx.fillText(weight.toString(), textX, textY);
    }
}
document.addEventListener("DOMContentLoaded", () => {
    const resetButton = document.getElementById("resetGraph");

    if (resetButton) {
        resetButton.addEventListener("click", () => {
            nodes = [];
            edges = [];
            mstEdges = []; // Xóa các cạnh của MST
            drawGraph();
            clearFileContent(); // Thêm dòng này
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
            clearFileContent(); // Thêm dòng này
            const content = e.target.result;
            updateFileContentDisplay(content);
            parseGraphData(content);
            fileInput.value = ""; // Reset để có thể nhập lại cùng file
        };
        reader.readAsText(file);
    };
}
function clearFileContent() {
    document.getElementById("fileContent").textContent = "";
}
function updateFileContentDisplay(content) {
    document.getElementById("fileContent").textContent = content;
}

function parseGraphData(content) {
    nodes = [];
    edges = [];
    const nodeMap = new Map();
    const edgeMap = new Map(); // Để theo dõi các cạnh giữa các cặp đỉnh

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

        const start = nodeMap.get(startId);
        const end = nodeMap.get(endId);

        // Tạo một khóa duy nhất cho cặp đỉnh này
        const edgeKey = startId < endId ? `${startId}-${endId}` : `${endId}-${startId}`;

        // Kiểm tra xem đã có cạnh nào giữa hai đỉnh này chưa
        if (!edgeMap.has(edgeKey)) {
            edgeMap.set(edgeKey, []);
        }

        // Tính toán curveOffset dựa trên số lượng cạnh hiện có
        const existingEdges = edgeMap.get(edgeKey);
        const curveOffset = existingEdges.length > 0 ? 
            (existingEdges.length + 1) * 35 * (existingEdges.length % 2 === 0 ? 1 : -1) : 0;

        // Thêm cạnh mới vào danh sách
        const newEdge = { start, end, weight, curveOffset };
        existingEdges.push(newEdge);
        edges.push(newEdge);
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

let currentAlgorithm = "";

// Xử lý sự kiện cho các nút thuật toán
document.querySelectorAll(".algo-btn").forEach(button => {
    button.addEventListener("click", () => {
        document.querySelectorAll(".algo-btn").forEach(btn => btn.classList.remove("active"));
        button.classList.add("active");
        currentAlgorithm = button.getAttribute("data-algo");
        document.getElementById("startAlgorithm").disabled = false;
    });
});

// Xử lý sự kiện cho nút bắt đầu thuật toán
document.getElementById("startAlgorithm").addEventListener("click", () => {
    if (currentAlgorithm === "kruskal") {
        runKruskal();
    } else if (currentAlgorithm === "prim") {
        runPrim();
    }
    // Thêm các thuật toán khác nếu cần
});

// Hàm thực hiện thuật toán Prim
function runPrim() {
    console.log("Bắt đầu chạy thuật toán Prim");
    mstEdges = primMST(nodes, edges);
    if (mstEdges.length > 0) {
        console.log("Tìm thấy cây khung nhỏ nhất với", mstEdges.length, "cạnh");
        // Vẽ lại đồ thị với các cạnh MST màu đỏ
        drawGraph();
        updateMSTWeight(mstEdges);
    } else {
        console.log("Không tìm thấy cây khung nhỏ nhất hoặc đồ thị không liên thông");
    }
}

// Hàm thực hiện thuật toán Kruskal
function runKruskal() {
    mstEdges = kruskalMST(nodes, edges);
    drawGraph();
    updateMSTWeight(mstEdges);
}

// Hàm tìm đại diện của một tập hợp (sử dụng trong Kruskal)
function find(parent, i) {
    if (parent[i] === i) {
        return i;
    }
    return find(parent, parent[i]);
}

// Hàm hợp nhất hai tập hợp (sử dụng trong Kruskal)
function union(parent, rank, x, y) {
    let xroot = find(parent, x);
    let yroot = find(parent, y);

    if (rank[xroot] < rank[yroot]) {
        parent[xroot] = yroot;
    } else if (rank[xroot] > rank[yroot]) {
        parent[yroot] = xroot;
    } else {
        parent[yroot] = xroot;
        rank[xroot]++;
    }
}

// Thuật toán Kruskal
function kruskalMST(nodes, edges) {
    let result = [];
    let i = 0;
    let e = 0;
    edges.sort((a, b) => a.weight - b.weight);

    let parent = {};
    let rank = {};

    nodes.forEach(node => {
        parent[node.id] = node.id;
        rank[node.id] = 0;
    });

    while (e < nodes.length - 1 && i < edges.length) {
        let edge = edges[i++];
        let x = find(parent, edge.start.id);
        let y = find(parent, edge.end.id);

        if (x !== y) {
            e++;
            result.push(edge);
            union(parent, rank, x, y);
        }
    }

    return result;
}

// Thuật toán Prim
function primMST(nodes, edges) {
    console.log("Bắt đầu thuật toán Prim");
    console.log("Số lượng đỉnh:", nodes.length);
    console.log("Số lượng cạnh:", edges.length);

    let result = [];
    let included = new Set();
    let adjacencyList = {};

    // Tạo danh sách kề
    nodes.forEach(node => {
        adjacencyList[node.id] = [];
    });
    edges.forEach(edge => {
        adjacencyList[edge.start.id].push({node: edge.end, weight: edge.weight, originalEdge: edge});
        adjacencyList[edge.end.id].push({node: edge.start, weight: edge.weight, originalEdge: edge});
    });

    console.log("Danh sách kề:", adjacencyList);

    // Bắt đầu từ nút đầu tiên
    if (nodes.length > 0) {
        included.add(nodes[0].id);
        console.log("Bắt đầu từ đỉnh:", nodes[0].id);
    } else {
        console.log("Không có đỉnh nào trong đồ thị");
        return result;
    }

    while (included.size < nodes.length) {
        let minEdge = null;
        let minWeight = Infinity;

        included.forEach(nodeId => {
            adjacencyList[nodeId].forEach(neighbor => {
                if (!included.has(neighbor.node.id) && neighbor.weight < minWeight) {
                    minEdge = neighbor.originalEdge;
                    minWeight = neighbor.weight;
                }
            });
        });

        if (minEdge) {
            console.log("Thêm cạnh:", minEdge.start.id, "->", minEdge.end.id, "với trọng số", minEdge.weight);
            result.push(minEdge);
            included.add(included.has(minEdge.start.id) ? minEdge.end.id : minEdge.start.id);
        } else {
            console.log("Không tìm thấy cạnh phù hợp. Đồ thị có thể không liên thông.");
            break;
        }
    }

    console.log("Kết quả Prim:", result);
    return result;
}

function updateMSTWeight(mstEdges) {
    const totalWeight = mstEdges.reduce((sum, edge) => sum + edge.weight, 0);
    document.getElementById('mstWeight').textContent = totalWeight;
}
