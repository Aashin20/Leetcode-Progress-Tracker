const API_URL = process.env.API_URL;

const YEAR = new Date().getFullYear();
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

let appData = {};



async function init() {
    await loadData();
}

async function loadData() {
    try {
        const response = await fetch(`${API_URL}/data`);
        if (!response.ok) throw new Error("Failed to fetch data");
        appData = await response.json();
        renderList(appData);
        recalcStats();
    } catch (error) {
        console.error("Error loading data:", error);
    }
}

async function toggleProblem(id, currentStatus) {
    const newStatus = !currentStatus;
    const todayStr = new Date().toISOString().split('T')[0];
    const row = document.getElementById(`p-${id}`);
    const checkbox = document.getElementById(`chk-${id}`);
    if (row && checkbox) {
        if (newStatus) {
            row.classList.add('completed');
            checkbox.classList.add('checked');
        } else {
            row.classList.remove('completed');
            checkbox.classList.remove('checked');
        }
        checkbox.onclick = () => toggleProblem(id, newStatus);
    }
    updateLocalState(id, newStatus, todayStr);
    recalcStats();
    try {
        await fetch(`${API_URL}/toggle`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ problem_id: id, status: newStatus })
        });
    } catch (error) {
        console.error("Sync error:", error);
    }
}

function updateLocalState(id, status, dateStr) {
    for (const category in appData) {
        if (Array.isArray(appData[category])) {
            appData[category].forEach(pattern => {
                const problem = pattern.problems.find(p => p.id === id);
                if (problem) {
                    problem.completed = status;
                    if (status) {
                        if (!problem.completed_at) problem.completed_at = dateStr;
                    } else {
                        problem.completed_at = null;
                    }
                    updatePatternCount(pattern, problem.completed);
                }
            });
        }
    }
}

function updatePatternCount(pattern, isCompleted) {}

function renderList(data) {
    const container = document.getElementById('q-container');
    container.innerHTML = '';
    for (const [categoryName, patterns] of Object.entries(data)) {
        if (!Array.isArray(patterns)) continue;
        const catGroup = document.createElement('div');
        catGroup.className = 'category-group';
        const catHeader = document.createElement('div');
        catHeader.className = 'cat-title';
        catHeader.innerText = categoryName;
        catGroup.appendChild(catHeader);
        patterns.forEach(pat => {
            const pTotal = pat.problems.length;
            const pSolved = pat.problems.filter(p => p.completed).length;
            const patBlock = document.createElement('div');
            patBlock.className = 'pattern-block';
            patBlock.innerHTML = `
                <div class="pattern-header" onclick="toggleList(this)">
                    <div style="display:flex; align-items:center;">
                        <span class="pattern-name">${pat.pattern}</span>
                    </div>
                    <span class="pattern-meta">${pTotal} Qs</span>
                </div>
            `;
            const qList = document.createElement('div');
            qList.className = 'qn-list';
            pat.problems.forEach(p => {
                const row = document.createElement('div');
                row.id = `p-${p.id}`;
                row.className = `qn-item ${p.completed ? 'completed' : ''}`;
                const chk = document.createElement('div');
                chk.id = `chk-${p.id}`;
                chk.className = `checkbox ${p.completed ? 'checked' : ''}`;
                chk.onclick = () => toggleProblem(p.id, p.completed);
                row.innerHTML = `<span class="qn-id">#${p.problem_number}</span>`;
                row.insertBefore(chk, row.firstChild);
                const title = document.createElement('span');
                title.className = 'qn-title';
                title.innerText = p.title;
                row.appendChild(title);
                qList.appendChild(row);
            });
            patBlock.appendChild(qList);
            catGroup.appendChild(patBlock);
        });
        container.appendChild(catGroup);
    }
}

function recalcStats() {
    let total = 0, solved = 0, masteredPatterns = 0;
    let history = {};
    for (const [categoryName, patterns] of Object.entries(appData)) {
        if (!Array.isArray(patterns)) continue;
        patterns.forEach(pat => {
            const pTotal = pat.problems.length;
            let pSolved = 0;
            pat.problems.forEach(p => {
                total++;
                if (p.completed) {
                    solved++;
                    pSolved++;
                    if (p.completed_at) {
                        const cleanDate = p.completed_at.split('T')[0];
                        if (!history[cleanDate]) history[cleanDate] = [];
                        history[cleanDate].push(p);
                    }
                }
            });
            if (pTotal > 0 && pTotal === pSolved) masteredPatterns++;
        });
    }
    document.getElementById('d-solved').innerText = solved;
    document.getElementById('d-total').innerText = `/ ${total}`;
    document.getElementById('d-mastered').innerText = masteredPatterns;
    const pct = total === 0 ? 0 : Math.round((solved / total) * 100);
    const offset = 213 - (213 * pct) / 100;
    document.getElementById('prog-circle').style.strokeDashoffset = offset;
    document.getElementById('prog-text').innerText = `${pct}%`;
    const dates = Object.keys(history).sort();
    document.getElementById('h-active').innerText = dates.length;
    let currStreak = 0;
    const todayStr = new Date().toISOString().split('T')[0];
    if (history[todayStr]) {
        currStreak = 1;
        let check = new Date(todayStr);
        while (true) {
            check.setDate(check.getDate() - 1);
            const checkStr = check.toISOString().split('T')[0];
            if (history[checkStr]) currStreak++;
            else break;
        }
    }
    document.getElementById('h-curr').innerText = currStreak;
    renderCalendar(history);
}

function toggleList(header) {
    const list = header.nextElementSibling;
    list.style.display = list.style.display === 'none' ? 'block' : 'none';
}

function switchTab(tab) {
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(`view-${tab}`).classList.add('active');
    const btns = document.querySelectorAll('.nav-btn');
    if (tab === 'questions') btns[0].classList.add('active');
    else btns[1].classList.add('active');
}

function renderCalendar(history) {
    const calHead = document.getElementById('cal-head');
    const calBody = document.getElementById('cal-body');
    calHead.innerHTML = ''; calBody.innerHTML = '';
    const hTr = document.createElement('tr');
    hTr.appendChild(document.createElement('th'));
    for (let i = 1; i <= 31; i++) {
        const th = document.createElement('th');
        th.innerText = i;
        hTr.appendChild(th);
    }
    calHead.appendChild(hTr);
    for (let m = 0; m < 12; m++) {
        const tr = document.createElement('tr');
        const th = document.createElement('td');
        th.className = 'row-head';
        th.innerText = MONTHS[m];
        tr.appendChild(th);
        for (let d = 1; d <= 31; d++) {
            const td = document.createElement('td');
            if (d > DAYS_IN_MONTH[m]) {
                td.className = 'invalid';
            } else {
                td.className = 'day';
                const dateKey = `${YEAR}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const solvedToday = history[dateKey] || [];
                if (solvedToday.length > 0) {
                    const c = solvedToday.length;
                    td.classList.add(c >= 3 ? 'l-3' : (c === 2 ? 'l-2' : 'l-1'));
                    td.innerText = c;
                    td.onclick = () => showModal(dateKey, solvedToday);
                }
            }
            tr.appendChild(td);
        }
        calBody.appendChild(tr);
    }
}

function showModal(date, items) {
    document.getElementById('modal-bg').style.display = 'flex';
    document.getElementById('m-date').innerText = date;
    const ul = document.getElementById('m-list');
    ul.innerHTML = '';
    items.forEach(i => {
        const li = document.createElement('li');
        li.innerText = `${i.problem_number}. ${i.title}`;
        ul.appendChild(li);
    });
}

init();