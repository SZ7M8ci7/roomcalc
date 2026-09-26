const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseNamed, formatNamed, createStore, validateState } = require('./room_state');

const records = [
    { key: 'name:壁', name: '壁', quantity: '2', max: 2, owned: true, must: false },
    { key: 'name:机（白）', name: '机（白）', quantity: '0', max: 40, owned: false, must: true },
    { key: 'custom:x', name: '名前,と"引用"\n改行', quantity: '3', max: 99, owned: true, must: false }
];
test('English aliases accept case differences and reject duplicate Japanese/English rows', () => {
    const bilingual = records.map(r => ({ ...r, aliases: r.name === '壁' ? ['Ramshackle Wall'] : [] }));
    assert.deepEqual(parseNamed('ramshackle wall\t1', bilingual, 'invite'), [{ key: 'name:壁', quantity: '1' }]);
    assert.throws(() => parseNamed('壁\t1\nRamshackle Wall\t2', bilingual, 'invite'), /重複/);
    assert.throws(() => parseNamed('Ramshackle Wall\t1', bilingual.concat({ key:'other', name:'別の壁',aliases:['Ramshackle Wall'] }), 'invite'), /同名/);
});
function state(mode = 'invite', quantity = '2') {
    return { version: 1, mode, inventory: [{ key: 'name:壁', name: '壁', quantity, owned: true, must: false }],
        settings: { proctype: '3', rankInput: '40', trynum: '1', seed: '-1' }, characters: ['riddle'], customFurniture: [] };
}
function memory() {
    const data = new Map();
    return { data, fail: false, getItem(k) { return data.has(k) ? data.get(k) : null; },
        setItem(k, v) { if (this.fail) throw new Error('quota'); data.set(k, v); } };
}

test('name export round-trips zero, booleans and quoted multiline custom names', () => {
    for (const mode of ['invite', 'comfort']) {
        const plan = parseNamed(formatNamed(records, mode), records, mode);
        assert.equal(plan.length, 3);
        assert.equal(mode === 'invite' ? plan[1].quantity : plan[1].owned, mode === 'invite' ? '0' : false);
        assert.equal(plan[2].key, 'custom:x');
    }
});
test('CSV, BOM, CRLF and Japanese parentheses are accepted', () => {
    assert.deepEqual(parseNamed('\uFEFF家具名,所持数\r\n"机(白)",4\r\n壁,0', records, 'invite'),
        [{ key: 'name:机（白）', quantity: '4' }, { key: 'name:壁', quantity: '0' }]);
});
test('unknown, duplicate and invalid quantities reject the entire plan without mutation', () => {
    const before = JSON.stringify(records);
    for (const text of ['壁\t1\n不明\t0', '壁\t1\n壁\t2', '壁\t-1', '壁\t3', '壁\t1.5', '壁\t', '壁\t1e1', '壁\t1\t2', '"壁\t1']) {
        assert.throws(() => parseNamed(text, records, 'invite'));
    }
    assert.equal(JSON.stringify(records), before);
});
test('ambiguous normalized names cannot be silently matched', () => {
    assert.throws(() => parseNamed('机(白)\t1', records.concat({ key: 'other', name: '机(白)', max: 40 }), 'invite'), /同名/);
});
test('owned mode supports explicit false and does not change required flags', () => {
    assert.deepEqual(parseNamed('壁\t無\n机（白）\ttrue', records, 'comfort'),
        [{ key: 'name:壁', owned: false }, { key: 'name:机（白）', owned: true }]);
    assert.throws(() => parseNamed('壁\t2', records, 'comfort'), /所持有無/);
    assert.throws(() => parseNamed('壁\tconstructor', records, 'comfort'), /所持有無/);
    assert.throws(() => parseNamed('家具名\t所持有無', records, 'comfort'), /ありません/);
});
test('named versions survive autosave changes, rename, overwrite and deletion', () => {
    const storage = memory(), store = createStore(storage, 'invite');
    const first = store.manual(null, '最初', state()), second = store.manual(null, '次', state('invite', '1'));
    store.saveAuto(state('invite', '0'));
    assert.equal(store.slots()[0].state.inventory[0].quantity, '2');
    store.manual(first.id, '名前変更');
    assert.equal(store.slots()[0].state.inventory[0].quantity, '2');
    store.manual(first.id, '名前変更', state('invite', '1'));
    assert.equal(store.slots()[0].state.inventory[0].quantity, '1');
    assert.throws(() => store.manual(null, '次', state()), /同じ保存名/);
    store.remove(second.id);
    assert.equal(store.slots().length, 1);
    assert.equal(store.auto().state.inventory[0].quantity, '0');
});
test('storage failure leaves the previous manual and auto versions intact', () => {
    const storage = memory(), store = createStore(storage, 'invite');
    const slot = store.manual(null, '保持', state()); store.saveAuto(state());
    const before = JSON.stringify([...storage.data]); storage.fail = true;
    assert.throws(() => store.manual(slot.id, '保持', state('invite', '0')), /quota/);
    assert.throws(() => store.saveAuto(state('invite', '0')), /quota/);
    assert.throws(() => store.remove(slot.id), /quota/);
    assert.equal(JSON.stringify([...storage.data]), before);
});
test('comfort and invite use isolated stores; empty draft quantities round-trip', () => {
    const storage = memory(), invite = createStore(storage, 'invite'), comfort = createStore(storage, 'comfort');
    invite.saveAuto(state('invite', '')); comfort.saveAuto(state('comfort'));
    assert.equal(invite.auto().state.inventory[0].quantity, '');
    assert.equal(comfort.auto().state.mode, 'comfort');
    assert.throws(() => validateState(state('comfort'), 'invite'));
});
test('corrupt saved data is rejected and remains untouched', () => {
    const storage = memory(), store = createStore(storage, 'invite');
    storage.setItem('room-state:v1:invite:auto', '{broken');
    assert.throws(() => store.auto());
    assert.equal(storage.getItem('room-state:v1:invite:auto'), '{broken');
    const invalid = state(); invalid.inventory.push(invalid.inventory[0]);
    assert.throws(() => store.saveAuto(invalid));
    const settings = state(); settings.settings.proctype = '7';
    assert.throws(() => store.saveAuto(settings));
});

test('autosave keeps the last five distinct changes and stable history IDs across reloads', () => {
    const storage = memory(), store = createStore(storage, 'invite');
    for (let i = 0; i < 7; i++) store.saveAuto(state('invite', String(i)));
    const history = store.autoHistory();
    assert.deepEqual(history.map(e => e.state.inventory[0].quantity), ['6', '5', '4', '3', '2']);
    assert.equal(new Set(history.map(e => e.id)).size, 5);
    store.saveAuto(state('invite', '6')); // input/change must not consume two slots.
    assert.deepEqual(store.autoHistory(), history);
    assert.deepEqual(createStore(storage, 'invite').autoHistory(), history);
    const restored = history[3];
    store.saveAuto(restored.state);
    assert.equal(store.auto().state.inventory[0].quantity, '3');
    assert.equal(store.autoHistory()[1].state.inventory[0].quantity, '6');
    assert.equal(store.autoHistory()[4].id, restored.id);
});

test('legacy single autosave is kept as history when the next change is saved', () => {
    const storage = memory(), store = createStore(storage, 'invite');
    const legacy = { savedAt: '2026-09-26T10:00:00.000Z', state: state() };
    storage.setItem('room-state:v1:invite:auto', JSON.stringify(legacy));
    const before = storage.getItem('room-state:v1:invite:auto');
    assert.deepEqual(store.auto().state, legacy.state);
    const originalId = store.auto().id;
    store.saveAuto(state());
    assert.equal(storage.getItem('room-state:v1:invite:auto'), before);
    store.saveAuto(state('invite', '1'));
    assert.equal(store.autoHistory().length, 2);
    assert.equal(store.autoHistory()[1].id, originalId);
    assert.deepEqual(store.autoHistory()[1].state, legacy.state);
});

test('full autosave history and manual slots survive a failed sixth write', () => {
    const storage = memory(), store = createStore(storage, 'invite');
    store.manual(null, '保持', state());
    for (let i = 0; i < 5; i++) store.saveAuto(state('invite', String(i)));
    const before = JSON.stringify([...storage.data]);
    storage.fail = true;
    assert.throws(() => store.saveAuto(state('invite', '8')), /quota/);
    assert.equal(JSON.stringify([...storage.data]), before);
});

test('corruption in an older autosave stops writes without discarding history', () => {
    const storage = memory(), store = createStore(storage, 'invite');
    store.saveAuto(state('invite', '1')); store.saveAuto(state('invite', '2'));
    const history = store.autoHistory(); history[1].state.mode = 'comfort';
    storage.setItem('room-state:v1:invite:auto', JSON.stringify(history));
    const before = storage.getItem('room-state:v1:invite:auto');
    assert.throws(() => store.auto());
    assert.throws(() => store.saveAuto(state('invite', '3')));
    assert.equal(storage.getItem('room-state:v1:invite:auto'), before);
});
