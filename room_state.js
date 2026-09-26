/* Named inventory interchange and independent manual/autosave slots for both tools. */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.RoomState = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';
    const normalize = value => value.normalize('NFKC').replace(/\s+/g, '').toLowerCase();
    const clone = value => JSON.parse(JSON.stringify(value));

    function parseTable(text) {
        const delimiter = text.split(/\r?\n/, 1)[0].includes('\t') ? '\t' : ',';
        const rows = [];
        let row = [], cell = '', quoted = false, closed = false;
        text = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
        for (let i = 0; i <= text.length; i++) {
            const c = text[i];
            if (quoted) {
                if (c === undefined) throw new Error('引用符（"）が閉じられていません。');
                if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
                else if (c === '"') { quoted = false; closed = true; }
                else cell += c;
            } else if (c === delimiter || c === '\n' || c === undefined) {
                row.push(cell); cell = ''; closed = false;
                if (c !== delimiter) {
                    if (row.some(value => value.trim() !== '')) rows.push(row);
                    row = [];
                }
            } else if (c === '"' && cell === '' && !closed) quoted = true;
            else {
                if (closed || c === '"') throw new Error('引用符（"）の位置を確認してください。');
                cell += c;
            }
        }
        return rows;
    }

    function formatNamed(records, mode) {
        const quote = s => /[\t\n\r"]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
        return ['家具名\t' + (mode === 'invite' ? '所持数' : '所持有無')].concat(records.map(r =>
            quote(r.name) + '\t' + (mode === 'invite' ? r.quantity : (r.owned ? '有' : '無')))).join('\n');
    }

    // Return a plan; callers only mutate after every row passes validation.
    function parseNamed(text, records, mode) {
        const rows = parseTable(text);
        let firstLine = 1;
        if (rows[0] && rows[0][0].trim() === '家具名' && ['所持数', '所持有無'].includes((rows[0][1] || '').trim())) {
            if (rows[0].length !== 2) throw new Error('見出しは「家具名」と「所持数／所持有無」の2列にしてください。');
            rows.shift(); firstLine++;
        }
        if (!rows.length) throw new Error('取り込む家具がありません。');
        const names = new Map(), seen = new Set(), plan = [], errors = [];
        records.forEach(r => {
            new Set([r.name].concat(r.aliases || []).filter(Boolean).map(normalize)).forEach(key => {
                if (!names.has(key)) names.set(key, []);
                names.get(key).push(r);
            });
        });
        rows.forEach((row, i) => {
            const prefix = (i + firstLine) + '行目：';
            if (row.length !== 2) { errors.push(prefix + '家具名と値の2列にしてください。'); return; }
            const name = row[0].trim(), value = row[1].trim();
            const matches = names.get(normalize(name)) || [];
            if (matches.length !== 1) {
                errors.push(prefix + '「' + name + '」' + (matches.length ? 'は同名の家具が複数あります。' : 'が見つかりません。'));
                return;
            }
            const record = matches[0];
            if (seen.has(record.key)) { errors.push(prefix + '「' + name + '」が重複しています。'); return; }
            seen.add(record.key);
            if (mode === 'invite') {
                if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) > record.max) {
                    errors.push(prefix + '「' + name + '」の所持数は0～' + record.max + 'の整数にしてください。');
                } else plan.push({ key: record.key, quantity: String(Number(value)) });
            } else {
                const bool = { '有': true, '無': false, '1': true, '0': false, 'true': true, 'false': false }[value.toLowerCase()];
                if (typeof bool !== 'boolean') errors.push(prefix + '所持有無は「有／無」または「1／0」にしてください。');
                else plan.push({ key: record.key, owned: bool });
            }
        });
        if (errors.length) throw new Error(errors.join('\n'));
        return plan;
    }

    function validateState(state, mode) {
        if (!state || state.version !== 1 || state.mode !== mode || !Array.isArray(state.inventory) ||
            !state.settings || typeof state.settings !== 'object' || !Array.isArray(state.characters)) {
            throw new Error('保存データの形式が正しくありません。');
        }
        const keys = new Set();
        if (!['0', '1', '2', '3'].includes(state.settings.proctype) ||
            state.characters.some(value => typeof value !== 'string') ||
            Object.values(state.settings).some(value => typeof value !== 'string')) {
            throw new Error('保存された計算設定が不正です。');
        }
        state.inventory.forEach(r => {
            if (!r || typeof r.key !== 'string' || typeof r.name !== 'string' || keys.has(r.key) ||
                (mode === 'invite' ? typeof r.quantity !== 'string' : typeof r.owned !== 'boolean' || typeof r.must !== 'boolean')) {
                throw new Error('保存された家具データが不正です。');
            }
            keys.add(r.key);
        });
        if (mode === 'invite' && (!Array.isArray(state.customFurniture) || state.customFurniture.some(r =>
            !r || typeof r.id !== 'string' || typeof r.name !== 'string' || typeof r.category !== 'string'))) {
            throw new Error('保存された手入力家具データが不正です。');
        }
        return state;
    }

    function createStore(storage, mode) {
        const prefix = 'room-state:v1:' + mode + ':';
        function read(key, fallback) {
            const raw = storage.getItem(prefix + key);
            return raw === null ? fallback : JSON.parse(raw);
        }
        function slots() {
            const value = read('slots', []);
            if (!Array.isArray(value) || value.some(r => !r || typeof r.id !== 'string' || typeof r.name !== 'string')) {
                throw new Error('保存枠のデータが不正です。既存データは変更していません。');
            }
            return value;
        }
        function manual(id, name, state) {
            const all = slots();
            name = name.trim();
            if (!name) throw new Error('保存名を入力してください。');
            if (all.some(s => s.id !== id && s.name === name)) throw new Error('同じ保存名があります。別の名前にするか、その枠を選んで上書きしてください。');
            const previous = id ? all.find(s => s.id === id) : null;
            if (id && !previous) throw new Error('保存枠が見つかりません。選び直してください。');
            if (state) validateState(state, mode);
            const entry = { id: id || (Date.now().toString(36) + '-' + Math.random().toString(36).slice(2)), name,
                savedAt: state ? new Date().toISOString() : previous.savedAt, state: state || previous.state };
            const next = previous ? all.map(s => s.id === id ? entry : s) : all.concat(entry);
            storage.setItem(prefix + 'slots', JSON.stringify(next));
            return clone(entry);
        }
        function autoHistory() {
            const value = read('auto', null);
            // Read the former single slot as the first history entry without a destructive migration.
            const entries = value === null ? [] : Array.isArray(value) ? value : [value];
            const ids = new Set();
            if (entries.length > 5) throw new Error('自動保存履歴の件数が不正です。');
            return entries.map(entry => {
                if (!entry || typeof entry.savedAt !== 'string' || !Number.isFinite(Date.parse(entry.savedAt))) {
                    throw new Error('自動保存履歴のデータが不正です。');
                }
                validateState(entry.state, mode);
                const id = entry.id || 'legacy-' + entry.savedAt;
                if (typeof id !== 'string' || ids.has(id)) throw new Error('自動保存履歴の識別子が不正です。');
                ids.add(id);
                return Object.assign({}, entry, { id });
            });
        }
        return {
            slots, manual, autoHistory,
            remove(id) {
                const all = slots();
                if (!all.some(s => s.id === id)) throw new Error('保存枠が見つかりません。');
                storage.setItem(prefix + 'slots', JSON.stringify(all.filter(s => s.id !== id)));
            },
            auto() {
                return autoHistory()[0] || null;
            },
            saveAuto(state) {
                validateState(state, mode);
                const history = autoHistory();
                if (history.length && JSON.stringify(history[0].state) === JSON.stringify(state)) return history[0];
                const entry = { id: Date.now().toString(36) + '-' + Math.random().toString(36).slice(2),
                    savedAt: new Date().toISOString(), state };
                storage.setItem(prefix + 'auto', JSON.stringify([entry].concat(history).slice(0, 5)));
                return entry;
            }
        };
    }

    function initialize(options) {
        const { mode, table } = options;
        const el = id => document.getElementById(id);
        const settingsIds = ['rankInput', 'trynum', 'seed'].concat(mode === 'invite' ? ['dom_grade', 'theme_grade'] : []);
        let store, suspended = false, ready = false, lastState = '', failed = false;
        const time = value => new Date(value).toLocaleString('ja-JP');
        const autoId = '__autosave__';
        const message = (text, error = false) => {
            el('state-message').textContent = text;
            el('state-message').classList.toggle('state-error', error);
        };
        function records() {
            return table.rows().nodes().toArray().map(node => {
                const data = table.row(node).data();
                if (mode === 'invite') {
                    const input = node.querySelector('input[name="max_num"]');
                    const customId = input.dataset.customId;
                    const name = customId ? data[2].replace(/ \[カスタム\]$/, '') : data[2];
                    return { key: customId ? 'custom:' + customId : 'name:' + name, name, input, aliases: [node.dataset.englishName],
                        quantity: input.value, max: Number(input.max) };
                }
                const input = node.querySelector('input[name="select[]"]');
                const mustInput = node.querySelector('input[name="mustselect[]"]');
                return { key: 'name:' + data[3], name: data[3], input, mustInput, aliases: [node.dataset.englishName], owned: input.checked, must: mustInput.checked };
            });
        }
        function capture() {
            const inventory = records().map(r => mode === 'invite' ?
                { key: r.key, name: r.name, quantity: r.quantity } : { key: r.key, name: r.name, owned: r.owned, must: r.must });
            const settings = Object.fromEntries(settingsIds.map(id => [id, el(id).value]));
            settings.proctype = document.querySelector('input[name="proctype"]:checked').value;
            return { version: 1, mode, inventory, settings,
                characters: Array.from(document.querySelectorAll('#charaList input:checked')).map(input => input.value),
                customFurniture: mode === 'invite' ? options.getCustom() : [] };
        }
        function apply(state) {
            validateState(state, mode);
            suspended = true;
            try {
                if (mode === 'invite') options.setCustom(state.customFurniture);
                const saved = new Map(state.inventory.map(r => [r.key, r]));
                let restored = 0;
                records().forEach(r => {
                    const value = saved.get(r.key);
                    if (!value) return;
                    if (mode === 'invite') r.input.value = value.quantity;
                    else { r.input.checked = value.owned; r.mustInput.checked = value.must; }
                    restored++;
                });
                settingsIds.forEach(id => { if (typeof state.settings[id] === 'string') el(id).value = state.settings[id]; });
                document.querySelectorAll('input[name="proctype"]').forEach(r => { r.checked = r.value === state.settings.proctype; });
                document.querySelectorAll('#charaList input').forEach(r => { r.checked = state.characters.includes(r.value); });
                if (options.onCharacters) options.onCharacters();
                table.draw(false);
                return state.inventory.length - restored;
            } finally { suspended = false; }
        }
        function showAuto() {
            el('autosave-status').textContent = '';
            el('autosave-status').classList.remove('state-error');
            refresh();
        }
        function changed() {
            if (!ready || suspended) return;
            try {
                const state = capture(), serialized = JSON.stringify(state);
                if (!failed && serialized === lastState) return;
                store.saveAuto(state);
                lastState = serialized; failed = false;
                showAuto();
            } catch (error) {
                failed = true;
                el('autosave-status').textContent = '自動保存できませんでした。状態操作から出力して保管してください。';
                el('autosave-status').classList.add('state-error');
                message(el('autosave-status').textContent, true);
            }
        }
        function refresh(selectedId) {
            const select = el('saved-states');
            const id = selectedId || select.value || autoId;
            const history = store.autoHistory();
            select.replaceChildren();
            history.forEach((entry, index) => select.add(new Option(
                '自動保存 ' + (index === 0 ? '最新' : index + '回前') + '（' + time(entry.savedAt) + '）', autoId + ':' + entry.id)));
            if (!history.length) select.add(new Option('自動保存（まだ保存されていません）', autoId));
            store.slots().forEach(s => select.add(new Option(s.name + '（' + time(s.savedAt) + '）', s.id)));
            select.value = id;
            if (!select.value) select.selectedIndex = 0;
            const isAuto = select.value.startsWith(autoId);
            el('state-restore').disabled = !select.value || (isAuto && !history.length);
            ['state-overwrite', 'state-rename', 'state-delete'].forEach(button => { el(button).disabled = !select.value || isAuto; });
        }
        function selected(allowAuto = false) {
            if (el('saved-states').value.startsWith(autoId)) {
                if (!allowAuto) throw new Error('自動保存枠は自動で更新されます。名前付きの保存枠を選択してください。');
                const id = el('saved-states').value.slice(autoId.length + 1);
                const auto = store.autoHistory().find(entry => entry.id === id);
                if (!auto) throw new Error('自動保存された状態がありません。');
                return Object.assign({ name: '自動保存（' + time(auto.savedAt) + '）' }, auto);
            }
            const result = store.slots().find(s => s.id === el('saved-states').value);
            if (!result) throw new Error('保存枠を選択してください。');
            return result;
        }
        function action(fn) {
            return async () => {
                try { await fn(); }
                catch (error) { message(error.message + '\n保存できない場合は、状態操作から出力して保管してください。', true); }
            };
        }
        function confirmAction(text, label) {
            return new Promise(resolve => {
                const dialog = document.createElement('dialog');
                dialog.className = 'state-confirm';
                dialog.setAttribute('aria-label', '保存状態の操作確認');
                const description = document.createElement('p');
                description.textContent = text;
                const cancel = document.createElement('button'), accept = document.createElement('button');
                cancel.type = accept.type = 'button';
                cancel.textContent = 'キャンセル'; cancel.autofocus = true;
                accept.textContent = label;
                cancel.addEventListener('click', () => dialog.close('cancel'));
                accept.addEventListener('click', () => dialog.close('accept'));
                dialog.addEventListener('close', () => { const ok = dialog.returnValue === 'accept'; dialog.remove(); resolve(ok); }, { once: true });
                dialog.append(description, cancel, accept);
                document.body.append(dialog);
                dialog.showModal();
            });
        }
        function restore(entry) {
            const missing = apply(entry.state);
            changed();
            message('復元しました。' + (missing ? '現在の家具一覧にない' + missing + '件は反映していません。' : ''));
        }
        el('state-new').addEventListener('click', action(() => {
            const entry = store.manual(null, el('state-name').value, capture());
            refresh(entry.id); message('「' + entry.name + '」を保存しました。');
        }));
        el('saved-states').addEventListener('change', action(() => {
            refresh();
            el('state-name').value = el('saved-states').value && !el('saved-states').value.startsWith(autoId) ? selected().name : '';
        }));
        el('state-overwrite').addEventListener('click', action(async () => {
            const slot = selected();
            if (!await confirmAction('「' + slot.name + '」を現在の状態で上書きしますか？', '上書きする')) return;
            store.manual(slot.id, slot.name, capture()); refresh(slot.id); message('上書き保存しました。');
        }));
        el('state-rename').addEventListener('click', action(() => {
            const slot = selected();
            store.manual(slot.id, el('state-name').value); refresh(slot.id); message('保存名を変更しました。');
        }));
        el('state-restore').addEventListener('click', action(async () => {
            const slot = selected(true);
            if (await confirmAction('「' + slot.name + '」を復元して現在の状態を置き換えますか？', '復元する')) restore(slot);
        }));
        el('state-delete').addEventListener('click', action(async () => {
            const slot = selected();
            if (!await confirmAction('保存枠「' + slot.name + '」を削除しますか？', '削除する')) return;
            store.remove(slot.id); refresh(); message('保存枠を削除しました。現在の入力内容はそのままです。');
        }));
        // Capture phase runs before DataTables can detach a filtered input on change.
        const observe = event => {
            const target = event.target;
            if (target.matches('#myTable tbody input, #rankInput, #trynum, #seed, input[name="proctype"], #dom_grade, #theme_grade, #charaList input')) changed();
        };
        document.addEventListener('input', observe, true);
        document.addEventListener('change', observe, true);
        window.addEventListener('beforeunload', event => {
            if (failed) { event.preventDefault(); event.returnValue = ''; }
        });

        function migrateLegacy() {
            let found = false;
            if (mode === 'invite') {
                // The former cache also stored numeric calculation settings.
                ['trynum', 'seed'].forEach(id => {
                    const value = window.localStorage.getItem(id);
                    if (value !== null && value !== '') { el(id).value = value; found = true; }
                });
            }
            records().forEach(r => {
                if (mode === 'invite') {
                    const value = window.localStorage.getItem(r.input.id);
                    if (value !== null && value !== '') { r.input.value = value; found = true; }
                } else {
                    [r.input, r.mustInput].forEach(input => {
                        const old = input.id.replace('二人掛けソファ', '二人掛けのソファ').replace('体育館の前景', '体育館の全景')
                            .replace('ベーシックな', 'ベーシックなな').replace('オンボロ風の小さい机', 'オンボロ風の小さな机');
                        const current = window.localStorage.getItem(input.id), prior = window.localStorage.getItem(old);
                        if (current !== null || prior !== null) { input.checked = (current ?? prior) === 'true'; found = true; }
                    });
                }
            });
            if (found && !store.slots().length) store.manual(null, '以前のキャッシュ', capture());
            return found;
        }
        try {
            store = createStore(window.localStorage, mode);
            refresh();
            const auto = store.auto();
            if (auto) { apply(auto.state); lastState = JSON.stringify(capture()); showAuto(); }
            else { if (migrateLegacy()) { refresh(); message('以前のキャッシュを引き継ぎました。'); } }
            ready = true;
            el('state-new').disabled = false;
            if (!auto) changed();
        } catch (error) {
            // Do not overwrite malformed/unreadable data with the initial UI defaults.
            message('保存データを読み込めませんでした。既存の保存内容を保護するため自動保存を停止しています。\n' + error.message, true);
            el('autosave-status').textContent = '自動保存停止中：保存データを確認してください。';
            el('autosave-status').classList.add('state-error');
        }

        function exportNamed() {
            el('text-stats').value = formatNamed(records(), mode);
            el('transfer-message').textContent = '全' + records().length + '件を出力しました（絞り込み対象外も含みます）。';
        }
        function importNamed() {
            const all = records();
            const plan = parseNamed(el('text-stats').value, all, mode);
            const map = new Map(all.map(r => [r.key, r]));
            plan.forEach(item => {
                const r = map.get(item.key);
                if (mode === 'invite') r.input.value = item.quantity;
                else r.input.checked = item.owned;
            });
            table.draw(false); changed();
            el('transfer-message').textContent = plan.length + '件を取り込みました。記載のない家具・その他の設定は変更していません。';
        }
        function exportLegacy(seed, resetFilter) {
            resetFilter();
            const lines = [seed, Date.now(), el('rankInput').value,
                document.querySelector('input[name="proctype"]:checked').value, el('trynum').value];
            if (mode === 'invite') {
                lines.push(Array.from(document.querySelectorAll('#charaList input:checked')).map(r => r.value).join(','));
                lines.push(el('dom_grade').value, el('theme_grade').value);
                const numbers = Array.from(document.querySelectorAll('input[type="number"]'));
                if (numbers.some(r => !/^(\d{1,2}|-1)$/.test(r.value))) {
                    throw new Error('従来形式では空欄や3桁以上の数値を出力できません。家具名付き形式を使うか、数値を確認してください。');
                }
                lines.push(numbers.map(r => r.value.padStart(2, '0')).join(''));
            } else {
                const all = records().sort((a, b) => Number(a.input.value) - Number(b.input.value));
                lines.push(all.map(r => (r.owned ? '1' : '0') + (r.must ? '1' : '0')).join(''));
            }
            el('text-stats').value = lines.join('\n');
            el('transfer-message').textContent = '従来形式で出力しました。';
        }
        function importLegacy(resetFilter) {
            const lines = el('text-stats').value.trim().split(/\r?\n/);
            const expected = mode === 'invite' ? 9 : 6;
            if (lines.length !== expected || !/^\d+$/.test(lines[2]) || !/^\d+$/.test(lines[4]) ||
                !['0', '1', '2', '3'].includes(lines[3]) || Number(lines[2]) < 2 || Number(lines[2]) > 100 ||
                Number(lines[4]) < 1 || Number(lines[4]) > 10000) {
                throw new Error('従来形式の行数または計算設定が不正です。');
            }
            // Validate before changing filters, quantities, characters, or settings.
            const all = records().sort((a, b) => Number(a.input.value) - Number(b.input.value));
            let numbers, values;
            if (mode === 'invite') {
                numbers = [el('set_val')].concat(records().map(r => r.input),
                    ['rankInput', 'trynum', 'seed', 'theme1Value', 'theme2Value', 'dormValue', 'squares'].map(el));
                const grades = ['normal', 'good', 'great', 'excellent'];
                if (!grades.includes(lines[6]) || !grades.includes(lines[7]) || lines[8].length !== numbers.length * 2 ||
                    !/^(\d{2}|-1)+$/.test(lines[8])) {
                    throw new Error('家具件数または値が現在の従来形式と一致しません。家具名付き形式で取り込んでください。');
                }
                values = lines[8].match(/.{2}/g).map(Number);
                if (numbers.some((input, i) => values[i] < Number(input.min || 0) || (input.max && values[i] > Number(input.max)))) {
                    throw new Error('範囲外の数値があります。現在の入力は変更していません。');
                }
            } else if (lines[5].length !== all.length * 2 || !/^[01]+$/.test(lines[5])) {
                throw new Error('家具件数または所持情報が現在の従来形式と一致しません。家具名付き形式で取り込んでください。');
            }
            suspended = true;
            try {
                resetFilter();
                if (mode === 'invite') {
                    numbers.forEach((input, i) => { input.value = values[i]; });
                    document.querySelectorAll('#charaList input').forEach(r => { r.checked = lines[5].split(',').includes(r.value); });
                    el('dom_grade').value = lines[6]; el('theme_grade').value = lines[7];
                    options.onCharacters();
                } else all.forEach((r, i) => { r.input.checked = lines[5][2 * i] === '1'; r.mustInput.checked = lines[5][2 * i + 1] === '1'; });
                el('rankInput').value = lines[2]; el('trynum').value = lines[4];
                document.querySelectorAll('input[name="proctype"]').forEach(r => { r.checked = r.value === lines[3]; });
                table.draw(false);
            } finally { suspended = false; }
            changed();
            el('transfer-message').textContent = '従来形式から復元しました。';
        }
        function transfer(fn) {
            el('transfer-message').classList.remove('state-error');
            try { fn(); }
            catch (error) {
                el('transfer-message').textContent = '取り込み／出力できませんでした。\n' + error.message;
                el('transfer-message').classList.add('state-error');
            }
        }
        return { changed, capture, apply, records, exportNamed: () => transfer(exportNamed), importNamed: () => transfer(importNamed),
            exportLegacy: (seed, reset) => transfer(() => exportLegacy(seed, reset)), importLegacy: reset => transfer(() => importLegacy(reset)),
            transaction(fn) { suspended = true; try { fn(); } finally { suspended = false; } changed(); },
            transfer };
    }
    return { parseTable, parseNamed, formatNamed, validateState, createStore, initialize };
});
