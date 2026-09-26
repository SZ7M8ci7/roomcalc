// Only reads the bundled dictionary. Visitors never query the external wiki.
function initializeFurnitureNames(table, nameColumn, englishColumn) {
    const search = document.getElementById('filter-col' + (englishColumn + 1));
    const displayColumn = furnitureColumn(table, englishColumn).index();
    $(search).on('keyup change', function () { table.column(displayColumn).search(this.value).draw(); });
    return $.ajax({ url: 'furniture_english.json', dataType: 'json', cache: false }).done(function (dictionary) {
        if (dictionary.schema_version !== 1 || !dictionary.entries) return;
        table.rows().every(function () {
            const row = this.node(), data = this.data();
            const entry = dictionary.entries[data[nameColumn]];
            if (!entry || typeof entry.english !== 'string') return;
            // Keep untrusted source text out of HTML and preserve existing input nodes.
            const text = document.createElement('span');
            text.textContent = entry.english;
            table.cell(row, displayColumn).data(text.innerHTML);
            row.dataset.englishName = entry.english;
        });
        table.draw(false);
    }).fail(function () {
        document.getElementById('english-name-status').textContent = '英語名を読み込めませんでした。日本語名で引き続き利用できます。';
    });
}
