const YEAR = new Date().getFullYear();
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

// Seed data to populate the tracker if LocalStorage is empty
const seedData = {
    "Arrays & Hashing": [
        {
            "pattern": "Core Basics",
            "problems": [
                { "id": 1, "problem_number": 217, "title": "Contains Duplicate", "completed": false },
                { "id": 2, "problem_number": 242, "title": "Valid Anagram", "completed": false }
            ]
        },
        {
            "pattern": "Two Pointers",
            "problems": [
                { "id": 3, "problem_number": 1, "title": "Two Sum", "completed": false }
            ]
        }
    ],
    "Sliding Window": [
        {
            "pattern": "Fixed Window",
            "problems": [
                { "id": 4, "problem_number": 121, "title": "Best Time to Buy and Sell Stock", "completed": false }
            ]
        }
    ]
};

// Global state container
let appData = {};

function init() {
    loadData();
    render(appData);
}

// 1. Load Data from LocalStorage or use Seed
function loadData() {
    const stored = localStorage.getItem('leetcode-tracker-data');
    if (stored) {
        appData = JSON.parse(stored);
    } else {
        appData = seedData;
        saveData();
    }
}

// 2. Save Data to LocalStorage
function saveData() {
    localStorage.setItem('leetcode-tracker-data', JSON.stringify(appData));
}

// 3. Handle Toggles
function toggleProblem(id, status) {
    // Find the problem in our nested structure
    for (const category in appData) {
        appData[category].forEach(pattern => {
            const problem = pattern.problems.find(p => p.id === id);
            if (problem) {
                problem.completed = status;
                
                // Set completion date to TODAY for the heatmap
                if (status) {
                    problem.completedDate = new Date().toISOString().split('T')[0];
                } else {
                    delete problem.completedDate;
                }
            }
        });
    }
    
    saveData();
    render(appData);
}

// --- RENDER LOGIC ---

function render(data) {
    let total = 0, solved = 0, masteredPatterns = 0;
    let history = {}; 

    const container = document.getElementById('q-container');
    container.innerHTML = '';

    for (const [categoryName, patterns] of Object.entries(data)) {
        let catTotal = 0, catSolved = 0;
        
        const catGroup = document.createElement('div');
        catGroup.className = 'category-group';
        
        const catHeader = document.createElement('div');
        catHeader.className = 'cat-title';
        catGroup.appendChild(catHeader);

        patterns.forEach(pat => {
            const pTotal = pat.problems.length;
            const pSolved = pat.problems.filter(p => p.completed).length;
            if(pTotal > 0 && pTotal === pSolved) masteredPatterns++;

            const patBlock = document.createElement('div');
            patBlock.className = 'pattern-block';
            
            const isMastered = pTotal === pSolved && pTotal > 0;
            patBlock.innerHTML = `
                <div class="pattern-header ${isMastered ? 'mastered' : ''}" onclick="toggleList(this)">
                    <div style="display:flex; align-items:center;">
                        <span class="pattern-complete-icon">★</span>
                        <span class="pattern-name">${pat.pattern}</span>
                    </div>
                    <span class="pattern-meta">${pSolved} / ${pTotal}</span>
                </div>
            `;

            const qList = document.createElement('div');
            qList.className = 'qn-list';

            pat.problems.forEach(p => {
                total++; catTotal++;
                if(p.completed) {
                    solved++; catSolved++;
                    if(p.completedDate) {
                        if(!history[p.completedDate]) history[p.completedDate] = [];
                        history[p.completedDate].push(p);
                    }
                }

                const row = document.createElement('div');
                row.className = `qn-item ${p.completed ? 'completed' : ''}`;
                
                const chk = document.createElement('div');
                chk.className = `checkbox ${p.completed ? 'checked' : ''}`;
                // Note: We pass !p.completed to toggle it
                chk.onclick = () => toggleProblem(p.id, !p.completed);

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

        const catPct = catTotal === 0 ? 0 : (catSolved/catTotal)*100;
        catHeader.innerHTML = `
            <span>${categoryName}</span>
            <div class="cat-progress-bar"><div class="cat-progress-fill" style="width:${catPct}%"></div></div>
            <span class="cat-stats">${catSolved}/${catTotal}</span>
        `;
        container.appendChild(catGroup);
    }

    updateDashboard(total, solved, masteredPatterns, history);
    renderCalendar(history);
}

function updateDashboard(total, solved, mastered, history) {
    document.getElementById('d-solved').innerText = solved;
    document.getElementById('d-total').innerText = `/ ${total}`;
    document.getElementById('d-mastered').innerText = mastered;

    const pct = total === 0 ? 0 : Math.round((solved / total) * 100);
    const offset = 213 - (213 * pct) / 100; 
    document.getElementById('prog-circle').style.strokeDashoffset = offset;
    document.getElementById('prog-text').innerText = `${pct}%`;

    const dates = Object.keys(history).sort();
    document.getElementById('h-active').innerText = dates.length;
    
    let currStreak = 0;
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Check if we did something today
    if(history[todayStr]) {
        currStreak = 1;
        let check = new Date(todayStr);
        while(true) {
            check.setDate(check.getDate()-1);
            const checkStr = check.toISOString().split('T')[0];
            if(history[checkStr]) currStreak++;
            else break;
        }
    }
    document.getElementById('h-curr').innerText = currStreak;
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
    if(tab === 'questions') btns[0].classList.add('active');
    else btns[1].classList.add('active');
}

function renderCalendar(history) {
    const calHead = document.getElementById('cal-head');
    const calBody = document.getElementById('cal-body');
    calHead.innerHTML = ''; calBody.innerHTML = '';

    const hTr = document.createElement('tr');
    hTr.appendChild(document.createElement('th'));
    for(let i=1; i<=31; i++) {
        const th = document.createElement('th');
        th.innerText = i;
        hTr.appendChild(th);
    }
    calHead.appendChild(hTr);

    for(let m=0; m<12; m++) {
        const tr = document.createElement('tr');
        const th = document.createElement('td');
        th.className = 'row-head';
        th.innerText = MONTHS[m];
        tr.appendChild(th);

        for(let d=1; d<=31; d++) {
            const td = document.createElement('td');
            if(d > DAYS_IN_MONTH[m]) {
                td.className = 'invalid';
            } else {
                td.className = 'day';
                const dateKey = `${YEAR}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
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

// Start the app
init();