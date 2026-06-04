// ---------- IN-MEMORY DATABASE ----------
let monsters = [
    { id: 1, name: "Goblin", hp: 18, gold: 12 },
    { id: 2, name: "Dragon", hp: 95, gold: 250 },
    { id: 3, name: "Skeleton", hp: 22, gold: 8 }
];
let chests = [
    { id: 1, location: "Entrance", gold_amount: 50 },
    { id: 2, location: "Treasury", gold_amount: 180 },
    { id: 3, location: "Hidden cave", gold_amount: 75 }
];
let heroes = [
    { id: 1, name: "Warrior", weapon: "Greatsword" },
    { id: 2, name: "Mage", weapon: "Staff" }
];

let nextMonsterId = 4;
let nextChestId = 4;
let nextHeroId = 3;

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function renderWorld() {
    const monstersDiv = document.getElementById('monstersContainer');
    if (monstersDiv) {
        if (monsters.length === 0) monstersDiv.innerHTML = '<div class="card" style="opacity:0.6;">🌀 No monsters — add some with INSERT!</div>';
        else {
            monstersDiv.innerHTML = monsters.map(m => `
                <div class="card">
                    <h4>👾 ${escapeHtml(m.name)} <span class="badge">❤️ ${m.hp}</span></h4>
                    <p>💰 ${m.gold} gold</p>
                    <p style="font-size:10px;">#${m.id}</p>
                </div>
            `).join('');
        }
    }
    const chestsDiv = document.getElementById('chestsContainer');
    if (chestsDiv) {
        if (chests.length === 0) chestsDiv.innerHTML = '<div class="card chest-card">📭 No chests. INSERT some treasures!</div>';
        else {
            chestsDiv.innerHTML = chests.map(c => `
                <div class="card chest-card">
                    <h4>📦 ${escapeHtml(c.location)}</h4>
                    <p>🪙 ${c.gold_amount} gold</p>
                </div>
            `).join('');
        }
    }
    const heroesDiv = document.getElementById('heroesContainer');
    if (heroesDiv) {
        if (heroes.length === 0) heroesDiv.innerHTML = '<div class="card hero-card">⚔️ Recruit heroes using INSERT INTO heroes ...</div>';
        else {
            heroesDiv.innerHTML = heroes.map(h => `
                <div class="card hero-card">
                    <h4>🛡️ ${escapeHtml(h.name)}</h4>
                    <p>⚔️ ${escapeHtml(h.weapon)}</p>
                </div>
            `).join('');
        }
    }
}

function showResult(data, isError = false, successMsg = null) {
    const area = document.getElementById('resultArea');
    if (isError) {
        area.innerHTML = `<div class="error">❌ ${escapeHtml(data)}</div>`;
        return;
    }
    if (successMsg) {
        area.innerHTML = `<div class="success">✅ ${escapeHtml(successMsg)}</div>`;
        return;
    }
    if (data && Array.isArray(data) && data.length > 0) {
        const columns = Object.keys(data[0]);
        let html = '<div class="result-table"><table><thead><tr>';
        columns.forEach(col => html += `<th>${escapeHtml(col)}</th>`);
        html += '</tr></thead><tbody>';
        data.forEach(row => {
            html += '<tr>';
            columns.forEach(col => {
                let val = row[col];
                if (val === undefined) val = 'NULL';
                html += `<td>${escapeHtml(String(val))}</td>`;
            });
            html += '</tr>';
        });
        html += '</tbody></table></div>';
        area.innerHTML = html;
    } else if (data && Array.isArray(data) && data.length === 0) {
        area.innerHTML = '<div>📭 (empty result set) — no rows returned.</div>';
    } else {
        area.innerHTML = '<div>⚡ Command executed successfully.</div>';
    }
}

// SQL executor (simplified but covers SELECT, INSERT, UPDATE, DELETE)
function executeSQL(sql) {
    sql = sql.trim();
    if (!sql) return { error: "Empty query" };
    const upper = sql.toUpperCase();
    
    if (upper.startsWith("SELECT")) {
        const fromMatch = sql.match(/FROM\s+(\w+)/i);
        if (!fromMatch) return { error: "Missing FROM clause. Example: SELECT * FROM monsters" };
        const tableName = fromMatch[1].toLowerCase();
        let data = null;
        if (tableName === 'monsters') data = [...monsters];
        else if (tableName === 'chests') data = [...chests];
        else if (tableName === 'heroes') data = [...heroes];
        else return { error: `Unknown table: ${tableName}. Available: monsters, chests, heroes` };
        
        const whereMatch = sql.match(/WHERE\s+(\w+)\s*=\s*('([^']*)'|(\d+))/i);
        if (whereMatch) {
            const column = whereMatch[1].toLowerCase();
            let value = whereMatch[3] !== undefined ? whereMatch[3] : (whereMatch[4] ? parseInt(whereMatch[4]) : null);
            if (value !== null) {
                data = data.filter(row => {
                    let rowVal = row[column];
                    if (typeof value === 'number') return rowVal === value;
                    else return String(rowVal).toLowerCase() === String(value).toLowerCase();
                });
            } else return { error: "WHERE value format: column = 'text' or column = 123" };
        }
        return { success: true, data: data };
    }
    else if (upper.startsWith("INSERT")) {
        const insertMatch = sql.match(/INSERT\s+INTO\s+(\w+)\s+VALUES\s*\(\s*(.*?)\s*\)/i);
        if (!insertMatch) return { error: "Syntax: INSERT INTO table VALUES (val1, val2, ...)" };
        const tableName = insertMatch[1].toLowerCase();
        const valuesStr = insertMatch[2];
        let values = [];
        let current = '';
        let inQuote = false;
        for (let ch of valuesStr) {
            if (ch === "'" && !inQuote) inQuote = true;
            else if (ch === "'" && inQuote) inQuote = false;
            else if (ch === ',' && !inQuote) {
                values.push(current.trim());
                current = '';
            } else current += ch;
        }
        values.push(current.trim());
        values = values.map(v => {
            v = v.trim();
            if (v.startsWith("'") && v.endsWith("'")) return v.slice(1, -1);
            if (!isNaN(v) && v !== '') return Number(v);
            return v;
        });
        
        if (tableName === 'monsters') {
            if (values.length < 3) return { error: "monsters need: name, hp, gold" };
            const [name, hp, gold] = values;
            if (typeof name !== 'string' || typeof hp !== 'number' || typeof gold !== 'number')
                return { error: "HP and gold must be numbers" };
            const newId = nextMonsterId++;
            monsters.push({ id: newId, name, hp, gold });
            renderWorld();
            return { success: true, message: `Added monster "${name}" (HP:${hp}, Gold:${gold})` };
        } 
        else if (tableName === 'chests') {
            if (values.length < 2) return { error: "chests need: location, gold_amount" };
            const [location, gold_amount] = values;
            if (typeof location !== 'string' || typeof gold_amount !== 'number')
                return { error: "gold_amount must be numeric." };
            const newId = nextChestId++;
            chests.push({ id: newId, location, gold_amount });
            renderWorld();
            return { success: true, message: `Added chest at "${location}" with ${gold_amount} gold!` };
        }
        else if (tableName === 'heroes') {
            if (values.length < 2) return { error: "heroes need: name, weapon" };
            const [name, weapon] = values;
            const newId = nextHeroId++;
            heroes.push({ id: newId, name, weapon });
            renderWorld();
            return { success: true, message: `Hero "${name}" wielding ${weapon} joined the party!` };
        }
        else return { error: `Cannot INSERT into ${tableName}.` };
    }
    else if (upper.startsWith("UPDATE")) {
        const updateMatch = sql.match(/UPDATE\s+(\w+)\s+SET\s+(\w+)\s*=\s*(?:'([^']*)'|(\d+))\s+WHERE\s+(\w+)\s*=\s*(?:'([^']*)'|(\d+))/i);
        if (!updateMatch) return { error: "UPDATE syntax: UPDATE monsters SET hp = 50 WHERE name = 'goblin'" };
        const tableName = updateMatch[1].toLowerCase();
        const setColumn = updateMatch[2].toLowerCase();
        let setValue = updateMatch[3] !== undefined ? updateMatch[3] : (updateMatch[4] ? parseInt(updateMatch[4]) : null);
        const whereColumn = updateMatch[5].toLowerCase();
        let whereValue = updateMatch[6] !== undefined ? updateMatch[6] : (updateMatch[7] ? parseInt(updateMatch[7]) : null);
        if (setValue === null || whereValue === null) return { error: "Values must be string in quotes or number." };
        
        let targetArray = null;
        if (tableName === 'monsters') targetArray = monsters;
        else if (tableName === 'chests') targetArray = chests;
        else if (tableName === 'heroes') targetArray = heroes;
        else return { error: `Unknown table ${tableName}` };
        
        let updatedCount = 0;
        for (let row of targetArray) {
            let rowWhereVal = row[whereColumn];
            let match = (typeof whereValue === 'number') ? (rowWhereVal === whereValue) : (String(rowWhereVal).toLowerCase() === String(whereValue).toLowerCase());
            if (match) {
                if (setColumn in row) {
                    row[setColumn] = setValue;
                    updatedCount++;
                } else return { error: `Column "${setColumn}" does not exist.` };
            }
        }
        if (updatedCount === 0) return { error: `No rows matched WHERE ${whereColumn} = ${whereValue}` };
        renderWorld();
        return { success: true, message: `Updated ${updatedCount} row(s) in ${tableName}.` };
    }
    else if (upper.startsWith("DELETE")) {
        const deleteMatch = sql.match(/DELETE\s+FROM\s+(\w+)\s+WHERE\s+(\w+)\s*=\s*(?:'([^']*)'|(\d+))/i);
        if (!deleteMatch) return { error: "DELETE syntax: DELETE FROM monsters WHERE name = 'goblin'" };
        const tableName = deleteMatch[1].toLowerCase();
        const whereColumn = deleteMatch[2].toLowerCase();
        let whereValue = deleteMatch[3] !== undefined ? deleteMatch[3] : (deleteMatch[4] ? parseInt(deleteMatch[4]) : null);
        if (whereValue === null) return { error: "WHERE value required." };
        
        let targetArray = null;
        if (tableName === 'monsters') targetArray = monsters;
        else if (tableName === 'chests') targetArray = chests;
        else if (tableName === 'heroes') targetArray = heroes;
        else return { error: `Unknown table ${tableName}` };
        
        const initialLen = targetArray.length;
        const newArray = targetArray.filter(row => {
            let rowVal = row[whereColumn];
            if (typeof whereValue === 'number') return rowVal !== whereValue;
            else return String(rowVal).toLowerCase() !== String(whereValue).toLowerCase();
        });
        const deleted = initialLen - newArray.length;
        if (deleted === 0) return { error: `No matching rows to delete.` };
        if (tableName === 'monsters') monsters = newArray;
        else if (tableName === 'chests') chests = newArray;
        else if (tableName === 'heroes') heroes = newArray;
        renderWorld();
        return { success: true, message: `🗑️ Deleted ${deleted} row(s) from ${tableName}.` };
    }
    else {
        return { error: "Command not recognized. Try SELECT, INSERT, UPDATE, DELETE." };
    }
}

function runSQL() {
    const sql = document.getElementById('sqlInput').value;
    const result = executeSQL(sql);
    if (result.error) showResult(result.error, true);
    else if (result.success && result.data !== undefined) showResult(result.data, false);
    else if (result.success && result.message) showResult(null, false, result.message);
    else showResult("✅ Query executed. Check world changes!", false);
}

function resetWorld() {
    monsters = [
        { id: 1, name: "Goblin", hp: 18, gold: 12 },
        { id: 2, name: "Dragon", hp: 95, gold: 250 },
        { id: 3, name: "Skeleton", hp: 22, gold: 8 }
    ];
    chests = [
        { id: 1, location: "Entrance", gold_amount: 50 },
        { id: 2, location: "Treasury", gold_amount: 180 },
        { id: 3, location: "Hidden cave", gold_amount: 75 }
    ];
    heroes = [
        { id: 1, name: "Warrior", weapon: "Greatsword" },
        { id: 2, name: "Mage", weapon: "Staff" }
    ];
    nextMonsterId = 4;
    nextChestId = 4;
    nextHeroId = 3;
    renderWorld();
    showResult(null, false, "🌍 World reset to original dungeon!");
}

function showExamples() {
    const examples = `-- === SQL Dungeon Examples ===
-- 1. View all monsters
SELECT * FROM monsters;

-- 2. Add a new monster
INSERT INTO monsters VALUES ('Troll', 65, 45);

-- 3. Update chest gold
UPDATE chests SET gold_amount = 300 WHERE location = 'Treasury';

-- 4. Delete weak monster
DELETE FROM monsters WHERE name = 'Skeleton';

-- 5. Show heroes with specific weapon
SELECT * FROM heroes WHERE weapon = 'Staff';

-- 6. Add a treasure chest
INSERT INTO chests VALUES ('Dragon Lair', 550);`;
    document.getElementById('sqlInput').value = examples;
    showResult(null, false, "📜 Example queries loaded! Edit and click RUN.");
}

// Spell Book modal logic
const spellModal = document.getElementById('spellBookModal');
const openBtn = document.getElementById('spellBookBtn');
const closeBtn = document.getElementById('closeSpellBook');

openBtn.onclick = () => {
    spellModal.style.display = 'flex';
};
closeBtn.onclick = () => {
    spellModal.style.display = 'none';
};
window.onclick = (e) => {
    if (e.target === spellModal) spellModal.style.display = 'none';
};

// Attach event listeners
document.getElementById('runBtn').addEventListener('click', runSQL);
document.getElementById('resetBtn').addEventListener('click', resetWorld);
document.getElementById('helpBtn').addEventListener('click', showExamples);

// Initial render
renderWorld();
showResult("🐉 Welcome! Click the SPELL BOOK to study commands, then type them yourself. No copy-paste — practice makes perfect!", false);
